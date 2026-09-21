/**
 * Email Provider Service
 * =====================
 * Production-ready email delivery using Brevo HTTP API (port 443 - works on ALL hosting providers including Render free tier).
 *
 * WHY NOT SMTP?
 * - Render.com blocks outbound ports 25, 465, 587 on free tier (SMTP ports) since September 2025.
 * - Gmail SMTP also gets blocked by cloud providers due to IP reputation.
 * - HTTP API (HTTPS port 443) is NEVER blocked - it's regular web traffic.
 *
 * SETUP INSTRUCTIONS:
 * 1. Sign up FREE at https://www.brevo.com (no credit card needed, 300 emails/day)
 * 2. Go to Account → SMTP & API → API Keys → Create new API Key
 * 3. Set environment variable: BREVO_API_KEY=your_key_here
 * 4. Go to Senders & IPs → Senders → Add your Gmail as a verified sender
 * 5. Set SMTP_FROM="Siri Arts & Crafts <your-gmail@gmail.com>"
 *
 * OPTIONAL - Keep SMTP as fallback for local dev:
 * SMTP_USER=your-gmail@gmail.com
 * SMTP_PASS=your-app-password
 */

import logger from '../config/logger';
import dns from 'dns';
import { getStoreConfigSync } from '../config/storeConfig';

// Force Node.js >= 17 to prefer IPv4 first (fixes ENETUNREACH on IPv6 to Gmail SMTP)
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  from?: string;
  fromName?: string;
  attachments?: {
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }[];
  headers?: Record<string, string>;
}

/**
 * Send email via Brevo HTTP API
 */
export const sendViaBrevo = async (payload: EmailPayload): Promise<{ messageId: string }> => {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) throw new Error('BREVO_API_KEY missing');

  const senderEmail =
    payload.from || process.env.BREVO_SENDER_EMAIL || 'noreply@siriartsandcrafts.com';
  const senderName = payload.fromName || getStoreConfigSync().name || 'Siri Arts & Crafts';

  const body: any = {
    sender: { name: senderName, email: senderEmail },
    to: [{ email: payload.to }],
    subject: payload.subject,
    htmlContent: payload.html,
  };

  if (payload.headers && Object.keys(payload.headers).length > 0) {
    body.headers = payload.headers;
  }

  if (payload.attachments && payload.attachments.length > 0) {
    body.attachment = payload.attachments.map((a) => ({
      name: a.filename,
      content:
        typeof a.content === 'string'
          ? Buffer.from(a.content).toString('base64')
          : a.content.toString('base64'),
    }));
  }

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'api-key': apiKey },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Brevo API error (${response.status}): ${errorText}`);
  }

  const result: any = await response.json();
  logger.info(`[BREVO SUCCESS] Email delivered to ${payload.to}. MessageId: ${result.messageId}`);
  return { messageId: result.messageId || 'brevo-sent' };
};

/**
 * Send email via Nodemailer SMTP (works locally, may be blocked on some cloud providers)
 */
let cachedTransporter: any = null;

export const sendViaSMTP = async (payload: EmailPayload): Promise<{ messageId: string }> => {
  const nodemailer = require('nodemailer');
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = Number(process.env.SMTP_PORT) || 587;

  if (!cachedTransporter) {
    cachedTransporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass },
      tls: { rejectUnauthorized: false }, // Helps with some local firewall setups
      // Force IPv4 to prevent ENETUNREACH issues when IPv6 is broken locally
      family: 4,
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 8000,
    });
  }

  const transporter = cachedTransporter;

  const senderEmail = payload.from || process.env.SMTP_USER || 'noreply@siriartsandcrafts.com';
  const senderName = payload.fromName || getStoreConfigSync().name || 'Siri Arts & Crafts';

  const info = await transporter.sendMail({
    from: `"${senderName}" <${senderEmail}>`,
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
    headers: payload.headers,
    attachments: payload.attachments,
  });

  logger.info(`[SMTP SUCCESS] Email sent to ${payload.to}. MessageId: ${info.messageId}`);
  return { messageId: info.messageId };
};

/**
 * Authoritative Recipient Resolution & Test Safety Gate
 * Every email passing through the application boundary must resolve here.
 * When MARKETING_EMAIL_TEST_MODE is enabled, all emails are strictly intercepted
 * and redirected to TEST_MARKETING_RECIPIENT if configured.
 */
export const resolveAuthoritativeRecipient = (
  payload: EmailPayload,
): { resolvedPayload: EmailPayload; isRedirected: boolean; originalRecipient: string } => {
  const isMarketingTestMode = process.env.MARKETING_EMAIL_TEST_MODE === 'true';
  const testRecipient = (process.env.TEST_MARKETING_RECIPIENT || process.env.SMTP_USER || '')
    .trim()
    .toLowerCase();
  const originalRecipient = (payload.to || '').trim().toLowerCase();

  if (isMarketingTestMode && testRecipient && originalRecipient !== testRecipient) {
    const safetyBanner = `
      <div style="background-color: #fef2f2; border: 2px solid #ef4444; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: #991b1b; text-align: left;">
        <div style="font-weight: 700; margin-bottom: 4px;">MARKETING SAFETY GATE ACTIVE</div>
        <div>Original Target Recipient: <strong>${originalRecipient}</strong></div>
        <div style="font-size: 11px; color: #b91c1c; margin-top: 4px;">Development safety mode is active. This message was intercepted and redirected to authorized test inbox: <strong>${testRecipient}</strong>. No actual customer was contacted.</div>
      </div>
    `;

    return {
      resolvedPayload: {
        ...payload,
        to: testRecipient,
        subject: `[TEST MODE] ${payload.subject}`,
        html: `${safetyBanner}${payload.html}`,
        headers: {
          ...payload.headers,
          'X-Marketing-Test-Mode': 'true',
          'X-Original-Recipient': originalRecipient,
        },
      },
      isRedirected: true,
      originalRecipient,
    };
  }

  return {
    resolvedPayload: payload,
    isRedirected: false,
    originalRecipient,
  };
};

/**
 * Get current configured provider status and diagnostics
 */
export const getProviderStatus = () => {
  const hasBrevo = Boolean(process.env.BREVO_API_KEY);
  const hasSMTP = Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
  let activeProvider = 'ethereal_dev';
  if (hasBrevo) {
    activeProvider = 'brevo_https';
  } else if (hasSMTP) {
    activeProvider = 'smtp';
  }

  return {
    activeProvider,
    brevoConfigured: hasBrevo,
    smtpConfigured: hasSMTP,
    nodeEnv: process.env.NODE_ENV || 'development',
    marketingTestMode: process.env.MARKETING_EMAIL_TEST_MODE === 'true',
    testRecipient: (process.env.TEST_MARKETING_RECIPIENT || process.env.SMTP_USER || '').trim(),
  };
};

/**
 * Smart Email Sender: Tries Resend -> SendGrid -> Brevo -> SMTP fallback
 */
export const sendEmail = async (
  rawPayload: EmailPayload,
): Promise<{ messageId: string; redirected?: boolean; originalRecipient?: string }> => {
  const { resolvedPayload, isRedirected, originalRecipient } =
    resolveAuthoritativeRecipient(rawPayload);

  if (isRedirected) {
    logger.warn(
      `[MARKETING SAFETY GATE] Intercepted email to "${originalRecipient}" -> Authoritatively redirected to "${resolvedPayload.to}"`,
    );
  }

  const payload = resolvedPayload;
  const errors: string[] = [];

  if (process.env.BREVO_API_KEY) {
    logger.info(`[EMAIL PROVIDER] selected=BREVO`);
    try {
      const result = await sendViaBrevo(payload);
      logger.info(`[EMAIL PROVIDER][SUCCESS] provider=BREVO messageId=${result.messageId}`);
      return result;
    } catch (err: any) {
      logger.error(`[EMAIL PROVIDER][FAILED] provider=BREVO error=${err.message}`);
      errors.push(`Brevo: ${err.message}`);
    }
  }

  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      return await sendViaSMTP(payload);
    } catch (err: any) {
      logger.error(`SMTP failed: ${err.message}`);
      errors.push(`SMTP: ${err.message}`);
    }
  }

  if (process.env.NODE_ENV !== 'production') {
    logger.warn('[EMAIL] No real email provider configured. Using Ethereal test mail...');
    const nodemailer = require('nodemailer');
    const testAccount = await nodemailer.createTestAccount();
    const transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
    const info = await transporter.sendMail({
      from: `"Siri Arts & Crafts" <noreply@siriartsandcrafts.com>`,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      attachments: payload.attachments,
    });
    logger.info(`[ETHEREAL] Test email preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    return { messageId: info.messageId };
  }

  if (errors.length > 0) {
    throw new Error(`Email delivery failed: ${errors.join(', ')}`);
  }

  throw new Error('No email provider configured! Set BREVO_API_KEY or SMTP_USER/PASS.');
};
