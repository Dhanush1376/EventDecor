import nodemailer from 'nodemailer';
import crypto from 'crypto';
import mongoose from 'mongoose';
import EmailTemplate, { IEmailTemplate } from '../models/EmailTemplate';
import EmailCampaign, { IEmailCampaign } from '../models/EmailCampaign';
import NotificationLog from '../models/NotificationLog';
import ConsentPreference from '../models/ConsentPreference';
import User from '../models/User';
import logger from '../config/logger';

// Reusable Transporter Setup
let transporter: any;
const getTransporter = async () => {
  if (transporter) return transporter;

  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (smtpUser && smtpPass) {
    transporter = nodemailer.createTransport({
      pool: true, // Use SMTP Connection Pooling for fast transactional sends
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
      maxConnections: 5,
      maxMessages: 100,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });
  } else {
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    logger.warn('SMTP credentials not found. Notification service using Ethereal Mail fallback.');
  }
  return transporter;
};

// Rewrite links in HTML to include click tracking
const rewriteLinks = (html: string, token: string): string => {
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
  // Match href="url", ensuring we do not rewrite mailto:, anchors, unsubscribe, or tracking URLs
  return html.replace(/href="([^"]+)"/gi, (match, url) => {
    if (url.startsWith('mailto:') || url.startsWith('#') || url.includes('/api/notifications/track/') || url.includes('/unsubscribe')) {
      return match;
    }
    return `href="${backendUrl}/api/notifications/track/click/${token}?url=${encodeURIComponent(url)}"`;
  });
};

// Append 1x1 tracking pixel to HTML body
const appendTrackingPixel = (html: string, token: string): string => {
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
  const pixelUrl = `${backendUrl}/api/notifications/track/open/${token}`;
  const pixel = `<img src="${pixelUrl}" width="1" height="1" style="display:none !important; visibility:hidden; width:1px; height:1px;" alt="" />`;
  
  if (html.includes('</body>')) {
    return html.replace('</body>', `${pixel}</body>`);
  }
  return html + pixel;
};

const formatShippingAddress = (addr: any): string => {
  if (!addr) return '';
  if (typeof addr === 'string') return addr;
  
  const parts = [
    addr.name,
    addr.address,
    addr.locality,
    addr.landmark ? `(Landmark: ${addr.landmark})` : '',
    `${addr.city}, ${addr.state} - ${addr.pincode}`,
    addr.phone ? `Phone: ${addr.phone}` : ''
  ].filter(Boolean);
  
  return parts.join(', ');
};

// Replace template placeholders (e.g. {{name}}, {{otp}}, {{orderId}}, etc.)
const replacePlaceholders = (templateHtml: string, data: Record<string, any>): string => {
  let result = templateHtml;
  for (const key in data) {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    let value = data[key];
    if (key === 'shippingAddress' && value && typeof value === 'object') {
      value = formatShippingAddress(value);
    }
    result = result.replace(regex, value);
  }
  
  // Clean remaining placeholders if any
  result = result.replace(/{{\s*[\w.-]+\s*}}/g, '');
  return result;
};

export interface EmailOptions {
  email: string;
  subject: string;
  templateName?: string;
  customHtml?: string;
  templateData?: Record<string, any>;
  type: 'marketing' | 'order' | 'account' | 'engagement' | 'system' | 'security';
  action: string;
  userId?: string;
  campaignId?: string;
}

/**
 * Pushes email to background queue for instant API response.
 */
export const sendDirectEmail = (options: EmailOptions) => {
  const { emailQueue } = require('./emailQueueService');
  emailQueue.enqueue(options);
};

/**
 * Direct Email Dispatch with full open/click logging (INTERNAL PROCESSOR)
 */
export const sendDirectEmailProcessor = async (options: EmailOptions) => {
  const { email, subject, templateName, customHtml, templateData = {}, type, action, userId, campaignId } = options;

  try {
    // 0. Idempotency check: prevent sending duplicate emails to the same recipient for the same action within 5 seconds
    const fiveSecondsAgo = new Date(Date.now() - 5000);
    const existingLog = await NotificationLog.findOne({
      recipientEmail: email,
      type: type as any,
      action,
      createdAt: { $gte: fiveSecondsAgo }
    });

    if (existingLog) {
      logger.warn(`[IDEMPOTENCY] Blocked redundant email to ${email} for action: ${action}`);
      return existingLog;
    }

    // 1. Consent preference validation (for Marketing emails only)
    if (type === 'marketing') {
      if (userId) {
        const user = await User.findById(userId);
        if (user && user.notificationPreferences?.marketing === false) {
          logger.info(`Skipped marketing email to registered user ${email} due to subscription opt-out.`);
          return null;
        }
      }
      
      // Also check general consent records
      const consent = await ConsentPreference.findOne({ 
        $or: [{ userId }, { consentToken: email }] 
      });
      if (consent && consent.marketingEmails === false) {
        logger.info(`Skipped marketing email to ${email} due to GDPR consent preferences.`);
        return null;
      }
    }

    // 2. Fetch email template html if templateName is provided
    let bodyHtml = customHtml || '';
    let finalSubject = subject;

    if (templateName) {
      const template = await EmailTemplate.findOne({ name: templateName, isActive: true });
      if (!template) {
        throw new Error(`Email template "${templateName}" not found or disabled.`);
      }
      bodyHtml = template.htmlContent;
      finalSubject = replacePlaceholders(template.subjectLine, templateData);
    }

    // Replace all placeholders inside body
    bodyHtml = replacePlaceholders(bodyHtml, templateData);

    // Add Unsubscribe link to marketing emails
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
    const unsubscribeLink = `${backendUrl}/api/notifications/unsubscribe?email=${encodeURIComponent(email)}`;
    bodyHtml = replacePlaceholders(bodyHtml, { unsubscribe_link: unsubscribeLink });

    // 3. Generate Tracking Token & log notification initial state
    const trackingToken = crypto.randomBytes(24).toString('hex');
    const log = new NotificationLog({
      userId: userId ? new mongoose.Types.ObjectId(userId) : undefined,
      recipientEmail: email,
      campaignId: campaignId ? new mongoose.Types.ObjectId(campaignId) : undefined,
      type,
      action,
      trackingToken,
      status: 'pending',
    });
    await log.save();

    // 4. Inject open-pixel and link click-tracking wrappers
    bodyHtml = appendTrackingPixel(bodyHtml, trackingToken);
    bodyHtml = rewriteLinks(bodyHtml, trackingToken);

    // 5. Send using Transporter
    const mailer = await getTransporter();
    const smtpUser = process.env.SMTP_USER;
    const mailOptions = {
      from: `"Siri Arts Studio" <${smtpUser || 'no-reply@siriartsandcrafts.com'}>`,
      to: email,
      subject: finalSubject,
      html: bodyHtml,
    };

    const maxRetries = 2;
    let success = false;
    let info: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        info = await mailer.sendMail(mailOptions);
        success = true;
        break;
      } catch (err: any) {
        if (attempt === maxRetries) {
          log.status = 'failed';
          log.errorDetails = err.message || 'Delivery attempt failed';
          await log.save();
          throw err;
        }
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }

    // 6. Update log on success
    log.status = 'delivered';
    await log.save();

    if (!smtpUser && info) {
      logger.info(`Test Email delivered! View: ${nodemailer.getTestMessageUrl(info)}`);
    } else {
      logger.info(`Email sent to ${email} (Type: ${type}, Action: ${action})`);
    }

    return log;
  } catch (err: any) {
    logger.error(`Failed to deliver email notifications to ${email}:`, err);
    return null;
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
      filter['notificationPreferences.marketing'] = { $ne: false };
    }

    const users = await User.find(filter).select('_id email name');
    
    // Also include any generic visitors who subscribed directly to marketing emails
    let allEmails = users.map(u => ({ email: u.email, name: u.name, userId: u._id.toString() }));
    
    if (campaign.targetAudience.role === 'all' || !campaign.targetAudience.role) {
      const visitorSubscribers = await ConsentPreference.find({ marketingEmails: true }).select('consentToken');
      visitorSubscribers.forEach(sub => {
        if (!allEmails.some(e => e.email.toLowerCase() === sub.consentToken.toLowerCase())) {
          allEmails.push({
            email: sub.consentToken,
            name: 'Valued Guest',
            userId: ''
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
        })
      );

      // Brief sleep between batches to prevent SMTP throttling
      await new Promise(resolve => setTimeout(resolve, 800));
    }

    // 2. Mark Campaign as complete
    campaign.status = 'sent';
    campaign.sentAt = new Date();
    campaign.stats.sentCount = sentSuccessfully;
    await campaign.save();

    logger.info(`Campaign broadcast complete! Delivered ${sentSuccessfully}/${allEmails.length} emails for "${campaign.title}"`);
  } catch (err: any) {
    logger.error(`Error executing campaign broadcast for "${campaign.title}":`, err);
    campaign.status = 'failed';
    await campaign.save();
  }
};


