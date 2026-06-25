import crypto from 'crypto';
import mongoose from 'mongoose';
import handlebars from 'handlebars';
import EmailTemplate from '../models/EmailTemplate';
import EmailCampaign from '../models/EmailCampaign';
import NotificationLog from '../models/NotificationLog';
import ConsentPreference from '../models/ConsentPreference';
import User from '../models/User';
import logger from '../config/logger';
import { sendEmail as smartSendEmail } from './emailProvider';
import AdminNotification from '../models/AdminNotification';
import { emitAdminNotification } from '../socket';
import { getBackendUrl } from '../utils/getBackendUrl';

// Initialize handlebars helpers
handlebars.registerHelper('formatCurrency', function (value) {
  return `₹${Number(value).toLocaleString('en-IN')}`;
});
handlebars.registerHelper('formatDate', function (dateString) {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
});

// Rewrite links in HTML to include click tracking
const rewriteLinks = (html: string, token: string): string => {
  const backendUrl = getBackendUrl();
  // Match href="url", ensuring we do not rewrite mailto:, anchors, unsubscribe, or tracking URLs
  return html.replace(/href="([^"]+)"/gi, (match, url) => {
    if (
      url.startsWith('mailto:') ||
      url.startsWith('#') ||
      url.includes('/api/notifications/track/') ||
      url.includes('/unsubscribe')
    ) {
      return match;
    }
    return `href="${backendUrl}/api/notifications/track/click/${token}?url=${encodeURIComponent(url)}"`;
  });
};

// Append 1x1 tracking pixel to HTML body
const appendTrackingPixel = (html: string, token: string): string => {
  const backendUrl = getBackendUrl();
  const pixelUrl = `${backendUrl}/api/notifications/track/open/${token}`;
  const pixel = `<img src="${pixelUrl}" width="1" height="1" style="display:none !important; visibility:hidden; width:1px; height:1px;" alt="" />`;

  if (html.includes('</body>')) {
    return html.replace('</body>', `${pixel}</body>`);
  }
  return html + pixel;
};

const _formatShippingAddress = (addr: any): string => {
  if (!addr) return '';
  if (typeof addr === 'string') return addr;

  const parts = [
    addr.name,
    addr.address,
    addr.locality,
    addr.landmark ? `(Landmark: ${addr.landmark})` : '',
    `${addr.city}, ${addr.state} - ${addr.pincode}`,
    addr.phone ? `Phone: ${addr.phone}` : '',
  ].filter(Boolean);

  return parts.join(', ');
};

// Replace template placeholders using Handlebars
const replacePlaceholders = (templateHtml: string, data: Record<string, any>): string => {
  try {
    const template = handlebars.compile(templateHtml);
    return template(data);
  } catch (err) {
    logger.error('Error compiling template with Handlebars:', err);
    return templateHtml;
  }
};

export interface EmailOptions {
  email: string;
  subject: string;
  templateName?: string;
  customHtml?: string;
  templateData?: Record<string, any>;
  type: 'marketing' | 'order' | 'account' | 'engagement' | 'system' | 'security';
  channel?: 'email' | 'sms' | 'push' | 'websocket';
  action: string;
  userId?: string;
  campaignId?: string;
  scheduledAt?: Date;
  attachments?: {
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }[];
  to?: string;
  template?: string;
  context?: Record<string, any>;
  generatePdf?: boolean;
}

/**
 * Pushes email to background queue for instant API response.
 * Standardized to use BullMQ for distributed persistence and retries.
 */
export const sendDirectEmail = (options: EmailOptions) => {
  const { emailQueue, isQueuesReady } = require('../jobs/queues');

  if (isQueuesReady()) {
    const delay = options.scheduledAt
      ? Math.max(0, new Date(options.scheduledAt).getTime() - Date.now())
      : 0;
    emailQueue.add('sendEmail', options, { delay }).catch((err: any) => {
      logger.error('Failed to enqueue email to BullMQ:', err);
      // Fallback to local memory queue if BullMQ fails after returning isQueuesReady() = true
      const { emailQueue: fallbackQueue } = require('./emailQueueService');
      fallbackQueue.enqueue(options);
    });
  } else {
    // Fallback to local memory queue if Redis/BullMQ is down
    const { emailQueue: fallbackQueue } = require('./emailQueueService');
    fallbackQueue.enqueue(options);
  }
};

/**
 * Direct Email Dispatch with full open/click logging (INTERNAL PROCESSOR)
 */
export const sendDirectEmailProcessor = async (options: EmailOptions) => {
  // Normalize incoming fields for queue compatibilities
  const emailVal = options.email || options.to || '';
  const templateNameVal = options.templateName || options.template;
  const templateDataVal = options.templateData || options.context || {};
  const typeVal = options.type || 'system';
  const actionVal = options.action || 'background_email';
  const userIdVal = options.userId || (templateDataVal && templateDataVal.userId);
  const attachmentsList = options.attachments ? [...options.attachments] : [];
  const campaignIdVal = options.campaignId;
  const channelVal = options.channel || 'email';
  const scheduledAtVal = options.scheduledAt;

  let bodyHtml = options.customHtml || '';
  let finalSubject = options.subject;

  try {
    // 0. Idempotency check: prevent sending duplicate emails to the same recipient for the same action within 5 seconds
    const fiveSecondsAgo = new Date(Date.now() - 5000);
    const existingLog = await NotificationLog.findOne({
      recipientEmail: emailVal,
      type: typeVal as any,
      action: actionVal,
      createdAt: { $gte: fiveSecondsAgo },
    });

    if (existingLog) {
      logger.warn(`[IDEMPOTENCY] Blocked redundant email to ${emailVal} for action: ${actionVal}`);
      return existingLog;
    }

    // 1. Consent preference validation (for Marketing emails only)
    if (typeVal === 'marketing') {
      if (userIdVal) {
        const user = await User.findById(userIdVal);
        if (user && user.notificationPreferences?.categories?.promotions === false) {
          logger.info(
            `Skipped marketing email to registered user ${emailVal} due to subscription opt-out.`,
          );
          return null;
        }
      }

      // Also check general consent records
      const consent = await ConsentPreference.findOne({
        $or: [{ userId: userIdVal }, { consentToken: emailVal }],
      });
      if (consent && consent.marketingEmails === false) {
        logger.info(`Skipped marketing email to ${emailVal} due to GDPR consent preferences.`);
        return null;
      }
    }

    // 2. Resolve template name if provided
    if (templateNameVal) {
      const template = await EmailTemplate.findOne({ name: templateNameVal, isActive: true });
      if (template) {
        bodyHtml = template.htmlContent;
        finalSubject = replacePlaceholders(template.subjectLine, templateDataVal);
      } else {
        // Fallback: check filesystem .hbs templates
        try {
          const { compileTemplate } = require('../utils/email/templateEngine');
          bodyHtml = compileTemplate(templateNameVal, templateDataVal);
        } catch (fileErr: any) {
          logger.warn(
            `Email template "${templateNameVal}" not found in DB or templates folder: ${fileErr.message}`,
          );
          if (!bodyHtml) {
            bodyHtml = `
              <div style="font-family: sans-serif; padding: 20px;">
                <h2>Notification: ${finalSubject}</h2>
                <p>You have a new system notification.</p>
                <p>Please log in to your account dashboard to review.</p>
              </div>
            `;
          }
        }
      }
    }

    // Replace all placeholders inside body
    bodyHtml = replacePlaceholders(bodyHtml, templateDataVal);

    // Add Unsubscribe link to marketing emails
    const backendUrl = getBackendUrl();
    const unsubscribeLink = `${backendUrl}/api/notifications/unsubscribe?email=${encodeURIComponent(emailVal)}`;
    bodyHtml = replacePlaceholders(bodyHtml, { unsubscribe_link: unsubscribeLink });

    // Enforce our premium card-based SaaS wrapper for plain HTML content
    if (
      bodyHtml &&
      !bodyHtml.trim().toLowerCase().startsWith('<!doctype html') &&
      !bodyHtml.trim().toLowerCase().startsWith('<html')
    ) {
      const { getLuxuryEmailWrapper } = require('../utils/email/emailTemplates');
      bodyHtml = getLuxuryEmailWrapper(finalSubject, bodyHtml);
    }

    // Generate Invoice PDF if requested and order context exists
    if (options.generatePdf && templateDataVal && templateDataVal.orderId) {
      try {
        const { generateInvoicePDF } = require('../utils/pdfGenerator');
        const pdfBuffer = await generateInvoicePDF({
          orderId: templateDataVal.orderId,
          date: templateDataVal.orderDate || new Date(),
          customerName: templateDataVal.customerName || 'Valued Customer',
          shippingAddress: templateDataVal.shippingAddress || '',
          items: templateDataVal.items || [],
          subtotal: Number(templateDataVal.subtotal || 0),
          shipping: Number(templateDataVal.shipping || 0),
          total: Number(templateDataVal.total || 0),
        });
        const invoiceNum = `INV-${templateDataVal.orderId.substring(templateDataVal.orderId.length - 8).toUpperCase()}`;
        attachmentsList.push({
          filename: `${invoiceNum}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        });
      } catch (pdfErr: any) {
        logger.error(
          `Failed to generate invoice PDF inside sendDirectEmailProcessor: ${pdfErr.message}`,
        );
      }
    }

    // 3. Generate Tracking Token & log notification initial state
    const trackingToken = crypto.randomBytes(24).toString('hex');
    const log = new NotificationLog({
      userId: userIdVal ? new mongoose.Types.ObjectId(userIdVal) : undefined,
      recipientEmail: emailVal,
      campaignId: campaignIdVal ? new mongoose.Types.ObjectId(campaignIdVal) : undefined,
      type: typeVal,
      channel: channelVal,
      action: actionVal,
      trackingToken,
      status: 'pending',
      scheduledAt: scheduledAtVal ? new Date(scheduledAtVal) : undefined,
      queuedAt: new Date(),
      retryCount: 0,
    });
    await log.save();

    // 4. Inject open-pixel and link click-tracking wrappers
    bodyHtml = appendTrackingPixel(bodyHtml, trackingToken);
    bodyHtml = rewriteLinks(bodyHtml, trackingToken);

    // 5. Send via smart email provider (Brevo HTTP API → SMTP fallback → Ethereal dev)
    let info: any;
    const maxRetries = 3;

    const headers: Record<string, string> = {};
    if (typeVal === 'marketing') {
      headers['List-Unsubscribe'] = `<${unsubscribeLink}>`;
    }

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        info = await smartSendEmail({
          to: emailVal,
          subject: finalSubject,
          html: bodyHtml,
          headers,
          attachments: attachmentsList,
        });

        log.status = 'sent'; // Marked as sent after handing off to provider
        await log.save();
        break;
      } catch (err: any) {
        if (attempt === maxRetries) {
          log.status = 'failed';
          log.errorDetails = `Failed after ${maxRetries} attempts: ${err.message || 'Unknown error'}`;
          await log.save();
          throw err;
        }
        log.retryCount = attempt;
        log.status = 'retried';
        log.errorDetails = `Attempt ${attempt} failed: ${err.message}`;
        await log.save();

        const backoffMs = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
        logger.warn(
          `[EMAIL RETRY] Attempt ${attempt}/${maxRetries} failed for ${emailVal}: ${err.message}. Retrying in ${backoffMs}ms...`,
        );
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }

    // 6. Update log on success
    log.status = 'delivered'; // We assume delivery handoff success
    await log.save();

    logger.info(
      `[EMAIL DELIVERED] ${emailVal} (Type: ${typeVal}, Action: ${actionVal}, MessageId: ${info?.messageId || 'n/a'})`,
    );

    return log;
  } catch (err: any) {
    logger.error(`Failed to deliver email notifications to ${emailVal}:`, err);
    throw err; // Propagate error so callers can handle or retry correctly
  }
};

/**
 * Handle Scheduled & Unscheduled Campaign Dispatches in the background
 */
export const runCampaignDispatch = async (campaignId: string) => {
  const campaign = await EmailCampaign.findById(campaignId).populate('templateId');
  if (!campaign || campaign.status === 'sending' || campaign.status === 'sent') return;

  campaign.status = 'sending';
  await campaign.save();

  logger.info(`Starting asynchronous campaign dispatch: "${campaign.title}"`);

  try {
    // 1. Build recipient list based on Target Audience rules
    const filter: any = {};
    if (campaign.targetAudience.role && campaign.targetAudience.role !== 'all') {
      filter.role = campaign.targetAudience.role;
    }

    // Opt-in check
    if (campaign.targetAudience.consentedOnly) {
      filter['notificationPreferences.categories.promotions'] = { $ne: false };
    }

    const users = await User.find(filter).select('_id email name');

    // Also include any generic visitors who subscribed directly to marketing emails
    const allEmails = users.map((u) => ({
      email: u.email,
      name: u.name,
      userId: u._id.toString(),
    }));

    if (campaign.targetAudience.role === 'all' || !campaign.targetAudience.role) {
      const visitorSubscribers = await ConsentPreference.find({ marketingEmails: true }).select(
        'consentToken',
      );
      visitorSubscribers.forEach((sub) => {
        if (!allEmails.some((e) => e.email.toLowerCase() === sub.consentToken.toLowerCase())) {
          allEmails.push({
            email: sub.consentToken,
            name: 'Valued Guest',
            userId: '',
          });
        }
      });
    }

    let sentSuccessfully = 0;
    const batchSize = 10; // Batching for performance and rate limits

    for (let i = 0; i < allEmails.length; i += batchSize) {
      const batch = allEmails.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (recipient) => {
          try {
            const log = await sendDirectEmailProcessor({
              email: recipient.email,
              subject: campaign.subject,
              customHtml: campaign.customHtml,
              templateName: campaign.templateId ? (campaign.templateId as any).name : undefined,
              templateData: {
                name: recipient.name,
                title: campaign.title,
              },
              type: 'marketing',
              action: 'campaign_broadcast',
              userId: recipient.userId || undefined,
              campaignId: campaign.id,
            });

            if (log && log.status === 'delivered') {
              sentSuccessfully++;
            }
          } catch (err: any) {
            logger.error(
              `[Campaign Dispatch Error] Failed to send email to ${recipient.email}:`,
              err,
            );
          }
        }),
      );

      // Brief sleep between batches to prevent SMTP throttling
      await new Promise((resolve) => setTimeout(resolve, 800));
    }

    // 2. Mark Campaign as complete
    campaign.status = 'sent';
    campaign.sentAt = new Date();
    campaign.stats.sentCount = sentSuccessfully;
    await campaign.save();

    logger.info(
      `Campaign broadcast complete! Delivered ${sentSuccessfully}/${allEmails.length} emails for "${campaign.title}"`,
    );
  } catch (err: any) {
    logger.error(`Error executing campaign broadcast for "${campaign.title}":`, err);
    campaign.status = 'failed';
    await campaign.save();
  }
};

/**
 * Internal Helper: Create & Emit Admin Notification
 */
export const createAdminNotification = async (payload: {
  title: string;
  message: string;
  type: 'order' | 'custom_request' | 'payment' | 'inquiry' | 'user' | 'system';
  actionLink?: string;
  metadata?: Record<string, any>;
}) => {
  try {
    const notification = new AdminNotification(payload);
    await notification.save();

    // Emit via WebSocket to all connected admins instantly
    emitAdminNotification(notification);

    return notification;
  } catch (error) {
    logger.error('Failed to create admin notification:', error);
  }
};
