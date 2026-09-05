import crypto from 'crypto';
import mongoose from 'mongoose';
import handlebars from 'handlebars';
import EmailTemplate from '../models/EmailTemplate';
import EmailCampaign from '../models/EmailCampaign';
import NotificationLog from '../models/NotificationLog';
import NotificationEvent from '../models/NotificationEvent';
import ConsentPreference from '../models/ConsentPreference';
import User from '../models/User';
import logger from '../config/logger';
import { sendEmail as smartSendEmail } from './emailProvider';
import AdminNotification from '../models/AdminNotification';
import { getBackendUrl } from '../utils/getBackendUrl';
import { emailQueue as fallbackQueue } from './emailQueueService';

export let socketEmitAdminNotificationHandler: (notification: any) => void = () => {};
export const setSocketNotificationHandler = (
  handler: typeof socketEmitAdminNotificationHandler,
) => {
  socketEmitAdminNotificationHandler = handler;
};

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
  notificationKey?: string;
}

/**
 * Pushes email to background queue for instant API response.
 * Standardized to use BullMQ for distributed persistence and retries.
 */
export const sendDirectEmail = (options: EmailOptions) => {
  const { emailQueue, isQueuesReady, usingFallback } = require('../jobs/queues');

  const queueReady = isQueuesReady();
  logger.info(
    `[EMAIL TRACE][sendDirectEmail] action=${options.action} queueReady=${queueReady} usingFallback=${usingFallback} notificationKey=${options.notificationKey || 'NONE'}`,
  );

  if (queueReady) {
    const delay = options.scheduledAt
      ? Math.max(0, new Date(options.scheduledAt).getTime() - Date.now())
      : 0;
    emailQueue
      .add('sendEmail', options, { delay })
      .then((job: any) => {
        logger.info(`[EMAIL TRACE][sendDirectEmail] BullMQ job created jobId=${job?.id ?? 'NONE'}`);
      })
      .catch((err: any) => {
        logger.error(`[EMAIL TRACE][sendDirectEmail] BullMQ add failed: ${err?.message}`);
        fallbackQueue.enqueue(options);
      });
  } else {
    logger.info(`[EMAIL TRACE][sendDirectEmail] using fallback queue (direct processor)`);
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

  logger.info(
    `[EMAIL PROCESSOR][01] entered action=${actionVal} notificationKey=${options.notificationKey || 'NONE'} hasRecipient=${!!emailVal} hasSubject=${!!finalSubject} hasHtml=${!!bodyHtml} htmlLen=${bodyHtml?.length ?? 0}`,
  );

  try {
    // 0. DB-Level Idempotency Check (Persistent Event Dedup)
    if (options.notificationKey) {
      try {
        // Check existing record BEFORE attempting upsert for diagnostic clarity
        const existingEvent: any = await NotificationEvent.findOne({
          notificationKey: options.notificationKey,
        }).lean();
        if (existingEvent) {
          logger.info(
            `[EMAIL PROCESSOR][02] idempotency pre-check: key=${options.notificationKey} existingStatus=${existingEvent.status} createdAt=${existingEvent.createdAt} updatedAt=${existingEvent.updatedAt}`,
          );
          if (existingEvent.status === 'sent' || existingEvent.status === 'processing') {
            // Check for stale processing lock (> 5 min)
            const staleCutoff = new Date(Date.now() - 5 * 60 * 1000);
            if (
              existingEvent.status === 'processing' &&
              existingEvent.updatedAt &&
              new Date(existingEvent.updatedAt) < staleCutoff
            ) {
              logger.warn(
                `[EMAIL PROCESSOR][02] STALE processing lock detected for key=${options.notificationKey}, age=${Math.round((Date.now() - new Date(existingEvent.updatedAt).getTime()) / 1000)}s. Reclaiming.`,
              );
              // Reset stale lock to allow re-processing
              await NotificationEvent.updateOne(
                { notificationKey: options.notificationKey, status: 'processing' },
                { $set: { status: 'queued' } },
              );
            } else {
              logger.warn(
                `[EMAIL PROCESSOR][02] SKIPPED — existing record status=${existingEvent.status} for key=${options.notificationKey}`,
              );
              return { status: 'skipped', reason: `already_${existingEvent.status}` };
            }
          }
        } else {
          logger.info(
            `[EMAIL PROCESSOR][02] idempotency pre-check: no existing record for key=${options.notificationKey}`,
          );
        }

        // Atomic lock acquisition: only update if not already processing or sent
        const upsertResult = await NotificationEvent.findOneAndUpdate(
          {
            notificationKey: options.notificationKey,
            status: { $nin: ['sent', 'processing'] },
          },
          {
            $setOnInsert: {
              eventType: typeVal,
              recipientGroup: actionVal,
            },
            $set: { status: 'processing' },
          },
          { upsert: true, returnDocument: 'after' },
        );
        logger.info(
          `[EMAIL PROCESSOR][02] idempotency claim result=CLAIMED newStatus=${upsertResult?.status}`,
        );
      } catch (upsertErr: any) {
        // If E11000 duplicate key error, it means another thread has it locked as 'processing' or it's 'sent'
        if (upsertErr.code === 11000) {
          // Re-query to find out WHY it was blocked
          const blockingRecord = await NotificationEvent.findOne({
            notificationKey: options.notificationKey,
          }).lean();
          logger.warn(
            `[EMAIL PROCESSOR][02] SKIPPED (E11000) — blocked by existing record status=${blockingRecord?.status} key=${options.notificationKey}`,
          );
          return { status: 'skipped', reason: `already_${blockingRecord?.status || 'unknown'}` };
        }
        logger.error(
          `[EMAIL PROCESSOR][02] Failed to upsert NotificationEvent: ${upsertErr.message}`,
        );
      }
    } else {
      logger.info(`[EMAIL PROCESSOR][02] no notificationKey — using legacy 5s dedup`);
      // Fallback 5-second idempotency check for legacy non-deterministic calls
      const fiveSecondsAgo = new Date(Date.now() - 5000);
      const existingLog = await NotificationLog.findOne({
        recipientEmail: emailVal,
        type: typeVal as any,
        action: actionVal,
        createdAt: { $gte: fiveSecondsAgo },
      });

      if (existingLog) {
        logger.warn(`[EMAIL PROCESSOR][02] legacy dedup BLOCKED for action=${actionVal}`);
        return existingLog;
      }
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

    if (!bodyHtml || !bodyHtml.trim()) {
      logger.error(
        `[EMAIL PROCESSOR] BLOCKED — empty HTML body for action=${actionVal} template=${templateNameVal}`,
      );
      throw new Error(`Email body is empty for action=${actionVal}`);
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
    const maxRetries = actionVal === 'cod_otp' || actionVal === 'otp_auth' ? 1 : 3;

    const headers: Record<string, string> = {};
    if (typeVal === 'marketing') {
      headers['List-Unsubscribe'] = `<${unsubscribeLink}>`;
    }

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.info(
          `[EMAIL PROCESSOR][03] calling smartSendEmail attempt=${attempt}/${maxRetries} subjectLen=${finalSubject?.length ?? 0} htmlLen=${bodyHtml?.length ?? 0} hasAttachments=${attachmentsList.length > 0}`,
        );
        info = await smartSendEmail({
          to: emailVal,
          subject: finalSubject,
          html: bodyHtml,
          headers,
          attachments: attachmentsList,
        });
        logger.info(
          `[EMAIL PROCESSOR][04] smartSendEmail SUCCESS messageId=${info?.messageId || 'NONE'} action=${actionVal}`,
        );

        // Mark as successfully sent in idempotency collection
        if (options.notificationKey) {
          await NotificationEvent.updateOne(
            { notificationKey: options.notificationKey },
            { $set: { status: 'sent', sentAt: new Date(), providerMessageId: info?.messageId } },
          ).catch((err) =>
            logger.error(
              `[IDEMPOTENCY] Failed to mark sent for ${options.notificationKey}: ${err.message}`,
            ),
          );
        }

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
  } catch (error: any) {
    if (options.notificationKey) {
      await NotificationEvent.updateOne(
        { notificationKey: options.notificationKey },
        { $set: { status: 'failed', errorLog: error.message } },
      ).catch(() => {});
    }

    logger.error(`[NotificationService] Error sending email to ${emailVal}:`, error);
    throw error; // Propagate error so callers can handle or retry correctly
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
    try {
      const { emitAdminNotification } = require('../socket');
      emitAdminNotification(notification);
    } catch (e) {
      logger.warn('Failed to dynamically load emitAdminNotification', e);
    }

    return notification;
  } catch (error) {
    logger.error('Failed to create admin notification:', error);
  }
};
