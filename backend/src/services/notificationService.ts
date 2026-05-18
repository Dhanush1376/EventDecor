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

// Replace template placeholders (e.g. {{name}}, {{otp}}, {{orderId}}, etc.)
const replacePlaceholders = (templateHtml: string, data: Record<string, any>): string => {
  let result = templateHtml;
  for (const key in data) {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    result = result.replace(regex, data[key]);
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

/**
 * Seed standard premium templates for Siri Arts
 */
export const seedDefaultTemplates = async () => {
  try {
    const existingCount = await EmailTemplate.countDocuments();
    if (existingCount > 0) return;

    logger.info('No email templates discovered. Seeding enterprise gold-branded templates...');

    const defaultTemplates = [
      {
        name: 'Welcome Email',
        subjectLine: 'Welcome to Siri Arts & Crafts, {{name}} ✦ Discover Luxury Indian Decor',
        type: 'transactional',
        htmlContent: `
          <div style="background-color: #faf9f6; font-family: 'Playfair Display', 'Didot', 'Georgia', serif; max-width: 600px; margin: 20px auto; padding: 50px 30px; border: 1px solid #efeeeb; border-radius: 16px; color: #2d2b29; box-shadow: 0 15px 40px rgba(115, 92, 0, 0.04); box-sizing: border-box;">
            <div style="margin-bottom: 35px; text-align: center;">
              <div style="font-size: 28px; color: #735c00; margin-bottom: 12px; font-weight: 300;">✦</div>
              <h1 style="color: #735c00; font-size: 26px; font-weight: 300; letter-spacing: 5px; margin: 0; text-transform: uppercase;">Siri Arts</h1>
              <div style="width: 60px; height: 1px; background-color: #735c00; margin: 12px auto 0 auto; opacity: 0.25;"></div>
            </div>
            
            <h2 style="font-size: 20px; font-weight: 400; color: #2d2b29; margin-bottom: 20px; text-align: center;">Welcome to the Atelier of Timeless Artistry</h2>
            
            <p style="color: #7f7663; font-size: 14px; line-height: 1.8; font-weight: 300; font-family: 'Inter', sans-serif; text-align: center; margin-bottom: 30px;">
              Dear {{name}},<br/><br/>
              We are absolutely thrilled to welcome you to <strong>Siri Arts & Crafts</strong>. You are now connected to the premier studio of authentic Indian festive decor, traditional brass urlis, premium pooja setup designs, and luxury event accessories.
            </p>

            <div style="background-color: #fbfaf8; border: 1px solid #d0c5af; border-radius: 12px; padding: 25px; margin-bottom: 35px; text-align: center;">
              <span style="display: block; color: #7f7663; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 10px; font-family: 'Inter', sans-serif;">Exclusively For You</span>
              <h3 style="color: #735c00; font-size: 18px; font-weight: 400; margin: 0 0 12px 0;">10% Welcome Appreciation</h3>
              <p style="color: #7f7663; font-size: 13px; font-family: 'Inter', sans-serif; margin: 0 0 18px 0; font-weight: 300;">Enjoy 10% off your initial event decoration or product acquisition.</p>
              <div style="display: inline-block; background-color: #735c00; color: #ffffff; padding: 8px 18px; border-radius: 6px; font-family: monospace; font-size: 15px; letter-spacing: 2px; font-weight: bold; border: 1px dashed rgba(255,255,255,0.4);">SIRIWELCOME10</div>
            </div>

            <!-- Call To Action -->
            <div style="text-align: center; margin-bottom: 40px;">
              <a href="{{frontend_url}}/events" style="display: inline-block; background-color: #735c00; color: #ffffff; text-decoration: none; padding: 14px 35px; border-radius: 50px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 3px; font-family: 'Inter', sans-serif; box-shadow: 0 5px 15px rgba(115,92,0,0.15);">Explore Collections</a>
            </div>

            <!-- Footer Details -->
            <div style="border-top: 1px solid #efeeeb; padding-top: 25px; text-align: center;">
              <p style="color: #a39c8c; font-size: 11px; line-height: 1.6; font-family: 'Inter', sans-serif; margin: 0 0 15px 0;">
                Siri Arts & Crafts, Ongole - 523001, Andhra Pradesh<br/>
                Need custom consultation? WhatsApp us at +91 98660 06648
              </p>
              <p style="color: #c4bebe; font-size: 10px; font-family: 'Inter', sans-serif; margin: 0;">
                To opt out of future updates, <a href="{{unsubscribe_link}}" style="color: #735c00; text-decoration: underline;">unsubscribe here</a>.
              </p>
            </div>
          </div>
        `
      },
      {
        name: 'Order Confirmation',
        subjectLine: 'Order Successfully Placed! ✦ Siri Arts Studio [{{orderId}}]',
        type: 'transactional',
        htmlContent: `
          <div style="background-color: #faf9f6; font-family: 'Playfair Display', 'Didot', 'Georgia', serif; max-width: 600px; margin: 20px auto; padding: 50px 30px; border: 1px solid #efeeeb; border-radius: 16px; color: #2d2b29; box-shadow: 0 15px 40px rgba(115, 92, 0, 0.04); box-sizing: border-box;">
            <div style="margin-bottom: 35px; text-align: center;">
              <div style="font-size: 28px; color: #735c00; margin-bottom: 12px; font-weight: 300;">✦</div>
              <h1 style="color: #735c00; font-size: 26px; font-weight: 300; letter-spacing: 5px; margin: 0; text-transform: uppercase;">Siri Arts</h1>
              <div style="width: 60px; height: 1px; background-color: #735c00; margin: 12px auto 0 auto; opacity: 0.25;"></div>
            </div>
            
            <h2 style="font-size: 19px; font-weight: 400; color: #2d2b29; margin-bottom: 8px; text-align: center;">Order Confirmed</h2>
            <span style="display: block; color: #7f7663; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 2px; text-align: center; margin-bottom: 30px; font-family: 'Inter', sans-serif;">Receipt Verification ID: {{orderId}}</span>
            
            <p style="color: #7f7663; font-size: 14px; line-height: 1.7; font-weight: 300; font-family: 'Inter', sans-serif; margin-bottom: 25px;">
              Dear Customer,<br/><br/>
              Your signature booking request has been successfully validated. Our master artisans are preparing your order items for dispatch.
            </p>

            <div style="background-color: #fbfaf8; border: 1px solid #d0c5af; border-radius: 12px; padding: 20px; margin-bottom: 30px; font-family: 'Inter', sans-serif;">
              <h3 style="color: #735c00; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 15px 0; border-b: 1px solid rgba(115,92,0,0.1); padding-bottom: 8px;">Order Details</h3>
              <p style="color: #2d2b29; font-size: 13px; margin: 0 0 10px 0;">Total Transaction: <strong>₹{{totalAmount}}</strong></p>
              <p style="color: #2d2b29; font-size: 13px; margin: 0 0 10px 0;">Shipping Destination: <strong>{{shippingAddress}}</strong></p>
              <p style="color: #7f7663; font-size: 11px; margin: 0; font-style: italic;">We'll notify you as soon as your items are dispatched from our atelier.</p>
            </div>

            <!-- Call To Action -->
            <div style="text-align: center; margin-bottom: 40px;">
              <a href="{{frontend_url}}/dashboard?tab=orders" style="display: inline-block; background-color: #735c00; color: #ffffff; text-decoration: none; padding: 14px 35px; border-radius: 50px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 3px; font-family: 'Inter', sans-serif;">Track Order Status</a>
            </div>

            <!-- Footer Details -->
            <div style="border-top: 1px solid #efeeeb; padding-top: 25px; text-align: center;">
              <p style="color: #a39c8c; font-size: 11px; line-height: 1.6; font-family: 'Inter', sans-serif; margin: 0;">
                Siri Arts & Crafts • Traditional Elegance Redefined<br/>
                For real-time assistance, WhatsApp us at +91 98660 06648
              </p>
            </div>
          </div>
        `
      },
      {
        name: 'Festive Offer',
        subjectLine: '✦ Traditional Elegance: 50% Exclusive Festive Decor Offer ✦',
        type: 'marketing',
        htmlContent: `
          <div style="background-color: #faf9f6; font-family: 'Playfair Display', 'Didot', 'Georgia', serif; max-width: 600px; margin: 20px auto; padding: 50px 30px; border: 1px solid #efeeeb; border-radius: 16px; color: #2d2b29; box-shadow: 0 15px 40px rgba(115, 92, 0, 0.04); box-sizing: border-box;">
            <div style="margin-bottom: 35px; text-align: center;">
              <div style="font-size: 28px; color: #735c00; margin-bottom: 12px; font-weight: 300;">✦</div>
              <h1 style="color: #735c00; font-size: 26px; font-weight: 300; letter-spacing: 5px; margin: 0; text-transform: uppercase;">Siri Arts</h1>
              <div style="width: 60px; height: 1px; background-color: #735c00; margin: 12px auto 0 auto; opacity: 0.25;"></div>
            </div>
            
            <h2 style="font-size: 22px; font-weight: 400; color: #2d2b29; margin-bottom: 20px; text-align: center; text-transform: uppercase; letter-spacing: 1px;">The Grand Festive Curation</h2>
            
            <!-- Banner Image/Mockup -->
            <div style="background: linear-gradient(135deg, #735c00, #b2931a); color: #faf9f6; border-radius: 12px; padding: 40px 20px; text-align: center; margin-bottom: 30px;">
              <h1 style="margin: 0; font-size: 45px; font-weight: 300; letter-spacing: 2px;">UP TO 50% OFF</h1>
              <span style="display: block; font-family: 'Inter', sans-serif; font-size: 10px; font-weight: 700; letter-spacing: 4px; text-transform: uppercase; margin-top: 10px; opacity: 0.85;">Limited Seasonal Collection</span>
            </div>

            <p style="color: #7f7663; font-size: 14px; line-height: 1.8; font-weight: 300; font-family: 'Inter', sans-serif; text-align: center; margin-bottom: 35px;">
              Enliven your living spaces and wedding venues with the classic craftsmanship of Siri Arts. Access our catalog of handmade urli containers, intricate backdrop decors, hanging diyas, and premium entrance arches at a fraction of their signature price.
            </p>

            <div style="background-color: #fbfaf8; border: 1px solid #d0c5af; border-radius: 12px; padding: 25px; margin-bottom: 35px; text-align: center; font-family: 'Inter', sans-serif;">
              <h3 style="color: #735c00; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 10px 0;">Use Special Atelier Key</h3>
              <div style="display: inline-block; background-color: #735c00; color: #ffffff; padding: 10px 22px; border-radius: 6px; font-family: monospace; font-size: 18px; letter-spacing: 3px; font-weight: bold;">FESTIVE50</div>
            </div>

            <!-- Call To Action -->
            <div style="text-align: center; margin-bottom: 40px;">
              <a href="{{frontend_url}}/events" style="display: inline-block; background-color: #735c00; color: #ffffff; text-decoration: none; padding: 15px 40px; border-radius: 50px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 3px; font-family: 'Inter', sans-serif; box-shadow: 0 5px 15px rgba(115,92,0,0.15);">Claim Festive Discount</a>
            </div>

            <!-- Footer Details -->
            <div style="border-top: 1px solid #efeeeb; padding-top: 25px; text-align: center;">
              <p style="color: #a39c8c; font-size: 11px; line-height: 1.6; font-family: 'Inter', sans-serif; margin: 0 0 15px 0;">
                Siri Arts & Crafts, Ongole - 523001, Andhra Pradesh<br/>
                For custom decor bookings: WhatsApp +91 98660 06648
              </p>
              <p style="color: #c4bebe; font-size: 10px; font-family: 'Inter', sans-serif; margin: 0;">
                To opt out of future updates, <a href="{{unsubscribe_link}}" style="color: #735c00; text-decoration: underline;">unsubscribe here</a>.
              </p>
            </div>
          </div>
        `
      },
      {
        name: 'Wishlist Reminder',
        subjectLine: 'Items in your Wishlist are selling fast! ✦ Siri Arts Studio',
        type: 'engagement',
        htmlContent: `
          <div style="background-color: #faf9f6; font-family: 'Playfair Display', 'Didot', 'Georgia', serif; max-width: 600px; margin: 20px auto; padding: 50px 30px; border: 1px solid #efeeeb; border-radius: 16px; color: #2d2b29; box-shadow: 0 15px 40px rgba(115, 92, 0, 0.04); box-sizing: border-box;">
            <div style="margin-bottom: 35px; text-align: center;">
              <div style="font-size: 28px; color: #735c00; margin-bottom: 12px; font-weight: 300;">✦</div>
              <h1 style="color: #735c00; font-size: 26px; font-weight: 300; letter-spacing: 5px; margin: 0; text-transform: uppercase;">Siri Arts</h1>
              <div style="width: 60px; height: 1px; background-color: #735c00; margin: 12px auto 0 auto; opacity: 0.25;"></div>
            </div>
            
            <h2 style="font-size: 19px; font-weight: 400; color: #2d2b29; margin-bottom: 20px; text-align: center;">Your Curated Saveds Are Calling</h2>
            
            <p style="color: #7f7663; font-size: 14px; line-height: 1.8; font-weight: 300; font-family: 'Inter', sans-serif; text-align: center; margin-bottom: 30px;">
              Dear {{name}},<br/><br/>
              A quick note to let you know that some of the highly-sought traditional decor elements saved in your <strong>Curated Wishlist</strong> are running extremely low in stocks!
            </p>

            <div style="background-color: #fbfaf8; border: 1px solid #d0c5af; border-radius: 12px; padding: 25px; margin-bottom: 35px; text-align: center;">
              <span style="display: block; color: #735c00; font-size: 20px; font-weight: 300; margin-bottom: 12px;">✦✦✦</span>
              <p style="color: #7f7663; font-size: 13px; font-family: 'Inter', sans-serif; margin: 0 0 18px 0; font-weight: 300;">Secure your items before stocks are exhausted.</p>
            </div>

            <!-- Call To Action -->
            <div style="text-align: center; margin-bottom: 40px;">
              <a href="{{frontend_url}}/dashboard?tab=wishlist" style="display: inline-block; background-color: #735c00; color: #ffffff; text-decoration: none; padding: 14px 35px; border-radius: 50px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 3px; font-family: 'Inter', sans-serif;">Go to My Wishlist</a>
            </div>

            <!-- Footer Details -->
            <div style="border-top: 1px solid #efeeeb; padding-top: 25px; text-align: center;">
              <p style="color: #a39c8c; font-size: 11px; line-height: 1.6; font-family: 'Inter', sans-serif; margin: 0 0 15px 0;">
                Siri Arts & Crafts, Ongole - 523001, Andhra Pradesh
              </p>
              <p style="color: #c4bebe; font-size: 10px; font-family: 'Inter', sans-serif; margin: 0;">
                To opt out of future updates, <a href="{{unsubscribe_link}}" style="color: #735c00; text-decoration: underline;">unsubscribe here</a>.
              </p>
            </div>
          </div>
        `
      },
      {
        name: 'Password Reset',
        subjectLine: 'Reset Your Password ✦ Siri Arts Studio',
        type: 'security',
        htmlContent: `
          <div style="background-color: #faf9f6; font-family: 'Playfair Display', 'Didot', 'Georgia', serif; max-width: 600px; margin: 20px auto; padding: 50px 30px; border: 1px solid #efeeeb; border-radius: 16px; color: #2d2b29; box-shadow: 0 15px 40px rgba(115, 92, 0, 0.04); box-sizing: border-box;">
            <div style="margin-bottom: 35px; text-align: center;">
              <h1 style="color: #735c00; font-size: 26px; font-weight: 300; letter-spacing: 5px; margin: 0; text-transform: uppercase;">Siri Arts</h1>
            </div>
            <h2 style="font-size: 19px; font-weight: 400; color: #2d2b29; margin-bottom: 20px; text-align: center;">Password Reset Request</h2>
            <p style="color: #7f7663; font-size: 14px; line-height: 1.8; font-weight: 300; font-family: 'Inter', sans-serif; text-align: center; margin-bottom: 30px;">
              Dear {{name}},<br/><br/>
              We received a request to reset the password for your account. Click the button below to choose a new password. This link is only valid for 1 hour.
            </p>
            <div style="text-align: center; margin-bottom: 40px;">
              <a href="{{reset_link}}" style="display: inline-block; background-color: #735c00; color: #ffffff; text-decoration: none; padding: 14px 35px; border-radius: 50px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 3px; font-family: 'Inter', sans-serif;">Reset Password</a>
            </div>
            <p style="color: #a39c8c; font-size: 11px; text-align: center; font-family: 'Inter', sans-serif;">If you did not request this, please ignore this email or secure your account immediately.</p>
          </div>
        `
      },
      {
        name: 'Suspicious Login Alert',
        subjectLine: 'Security Alert: New Login Detected ✦ Siri Arts Studio',
        type: 'security',
        htmlContent: `
          <div style="background-color: #faf9f6; font-family: 'Playfair Display', 'Didot', 'Georgia', serif; max-width: 600px; margin: 20px auto; padding: 50px 30px; border: 1px solid #efeeeb; border-radius: 16px; color: #2d2b29; box-shadow: 0 15px 40px rgba(115, 92, 0, 0.04); box-sizing: border-box;">
            <div style="margin-bottom: 35px; text-align: center;">
              <h1 style="color: #735c00; font-size: 26px; font-weight: 300; letter-spacing: 5px; margin: 0; text-transform: uppercase;">Siri Arts</h1>
            </div>
            <h2 style="font-size: 19px; font-weight: 400; color: #b23b3b; margin-bottom: 20px; text-align: center;">New Login Detected</h2>
            <p style="color: #7f7663; font-size: 14px; line-height: 1.8; font-weight: 300; font-family: 'Inter', sans-serif; text-align: center; margin-bottom: 20px;">
              Dear {{name}},<br/><br/>
              We detected a new login to your account from an unrecognized device or location.
            </p>
            <div style="background-color: #fbfaf8; border: 1px solid #d0c5af; border-radius: 12px; padding: 20px; margin-bottom: 30px; font-family: 'Inter', sans-serif;">
              <p style="color: #2d2b29; font-size: 13px; margin: 0 0 10px 0;">Time: <strong>{{loginTime}}</strong></p>
              <p style="color: #2d2b29; font-size: 13px; margin: 0 0 10px 0;">Device/IP: <strong>{{deviceInfo}}</strong></p>
            </div>
            <p style="color: #7f7663; font-size: 13px; font-family: 'Inter', sans-serif; text-align: center;">If this was you, no further action is needed. If you do not recognize this activity, please reset your password immediately.</p>
          </div>
        `
      },
      {
        name: 'Inquiry Submitted',
        subjectLine: 'We Received Your Vision ✦ Siri Arts Studio',
        type: 'engagement',
        htmlContent: `
          <div style="background-color: #faf9f6; font-family: 'Playfair Display', 'Didot', 'Georgia', serif; max-width: 600px; margin: 20px auto; padding: 50px 30px; border: 1px solid #efeeeb; border-radius: 16px; color: #2d2b29; box-shadow: 0 15px 40px rgba(115, 92, 0, 0.04); box-sizing: border-box;">
            <div style="margin-bottom: 35px; text-align: center;">
              <h1 style="color: #735c00; font-size: 26px; font-weight: 300; letter-spacing: 5px; margin: 0; text-transform: uppercase;">Siri Arts</h1>
            </div>
            <h2 style="font-size: 19px; font-weight: 400; color: #2d2b29; margin-bottom: 20px; text-align: center;">Inquiry Received</h2>
            <p style="color: #7f7663; font-size: 14px; line-height: 1.8; font-weight: 300; font-family: 'Inter', sans-serif; text-align: center; margin-bottom: 30px;">
              Dear {{name}},<br/><br/>
              Thank you for reaching out to the Siri Arts & Crafts concierge. Our design team has successfully received your inquiry regarding <strong>{{subject}}</strong>. We will review your vision and respond within 24-48 business hours.
            </p>
            <div style="text-align: center; margin-bottom: 30px;">
              <p style="color: #a39c8c; font-size: 11px; font-family: 'Inter', sans-serif;">For immediate assistance, call us at +91 98660 06648.</p>
            </div>
          </div>
        `
      },
      {
        name: 'Admin Alert',
        subjectLine: 'System Alert: {{actionType}}',
        type: 'system',
        htmlContent: `
          <div style="background-color: #faf9f6; font-family: 'Inter', sans-serif; max-width: 600px; margin: 20px auto; padding: 30px; border-left: 4px solid #735c00; color: #2d2b29;">
            <h2 style="font-size: 16px; font-weight: 700; color: #2d2b29; margin-bottom: 10px; text-transform: uppercase;">Admin Notification</h2>
            <p style="color: #4a4a4a; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
              <strong>Event:</strong> {{actionType}}<br/>
              <strong>Timestamp:</strong> {{timestamp}}
            </p>
            <div style="background-color: #f4f4f4; padding: 15px; border-radius: 6px; font-size: 13px; font-family: monospace; white-space: pre-wrap;">
              {{details}}
            </div>
          </div>
        `
      }
    ];

    await EmailTemplate.insertMany(defaultTemplates);
    logger.info(`Successfully seeded ${defaultTemplates.length} enterprise email templates.`);
  } catch (err) {
    logger.error('Failed to seed default email templates:', err);
  }
};
