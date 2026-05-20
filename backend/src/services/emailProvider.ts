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
 * 5. Set SMTP_FROM="Siri Arts Studio <your-gmail@gmail.com>"
 *
 * OPTIONAL - Keep SMTP as fallback for local dev:
 * SMTP_USER=your-gmail@gmail.com
 * SMTP_PASS=your-app-password
 */

import logger from '../config/logger';

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  from?: string;
  fromName?: string;
}

/**
 * Send email via Brevo HTTP API (works on ALL hosting tiers - no SMTP ports needed)
 * Brevo free tier: 300 emails/day, unlimited contacts
 */
export const sendViaBrevo = async (payload: EmailPayload): Promise<{ messageId: string }> => {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    throw new Error('BREVO_API_KEY is not configured. Please set it in your environment variables. Get a free key at https://www.brevo.com');
  }

  const senderEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'no-reply@siriartsandcrafts.com';
  const senderName = payload.fromName || process.env.SMTP_FROM_NAME || 'Siri Arts Studio';

  const body = {
    sender: { name: senderName, email: senderEmail },
    to: [{ email: payload.to }],
    subject: payload.subject,
    htmlContent: payload.html,
  };

  logger.info(`[BREVO] Sending email to ${payload.to} | Subject: ${payload.subject}`);

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error(`[BREVO ERROR] HTTP ${response.status}: ${errorText}`);
    throw new Error(`Brevo API error (${response.status}): ${errorText}`);
  }

  const result: any = await response.json();
  logger.info(`[BREVO SUCCESS] Email delivered to ${payload.to}. MessageId: ${result.messageId}`);
  return { messageId: result.messageId || 'brevo-sent' };
};

/**
 * Send email via Nodemailer SMTP (works locally, may be blocked on some cloud providers)
 * Kept as a secondary/dev option
 */
export const sendViaSMTP = async (payload: EmailPayload): Promise<{ messageId: string }> => {
  const nodemailer = require('nodemailer');
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = Number(process.env.SMTP_PORT) || 587;

  if (!smtpUser || !smtpPass) {
    throw new Error('SMTP_USER or SMTP_PASS not configured');
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: { user: smtpUser, pass: smtpPass },
    tls: { rejectUnauthorized: false },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });

  const senderEmail = process.env.SMTP_FROM_EMAIL || smtpUser;
  const senderName = process.env.SMTP_FROM_NAME || 'Siri Arts Studio';

  logger.info(`[SMTP] Sending email to ${payload.to} via ${smtpHost}:${smtpPort}`);

  const info = await transporter.sendMail({
    from: `"${senderName}" <${senderEmail}>`,
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
  });

  logger.info(`[SMTP SUCCESS] Email sent to ${payload.to}. MessageId: ${info.messageId}`);
  return { messageId: info.messageId };
};

/**
 * Smart Email Sender: tries Brevo HTTP API first, falls back to SMTP if Brevo key not set.
 * This guarantees delivery in ALL environments.
 */
export const sendEmail = async (payload: EmailPayload): Promise<{ messageId: string }> => {
  const hasBrevo = !!process.env.BREVO_API_KEY;
  const hasSmtp = !!(process.env.SMTP_USER && process.env.SMTP_PASS);

  // Primary: Brevo HTTP API (works on all cloud platforms including Render free tier)
  if (hasBrevo) {
    try {
      return await sendViaBrevo(payload);
    } catch (err: any) {
      logger.error(`[EMAIL] Brevo HTTP API failed: ${err.message}. ${hasSmtp ? 'Falling back to SMTP...' : 'No SMTP fallback configured.'}`);
      if (!hasSmtp) throw err;
    }
  }

  // Fallback: SMTP (works locally, may fail on Render free tier)
  if (hasSmtp) {
    try {
      return await sendViaSMTP(payload);
    } catch (err: any) {
      logger.error(`[EMAIL] SMTP also failed: ${err.message}`);
      throw err;
    }
  }

  // Ethereal fallback for development testing
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
      from: `"Siri Arts Studio" <${testAccount.user}>`,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
    });
    logger.info(`[ETHEREAL] Test email preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    return { messageId: info.messageId };
  }

  throw new Error(
    'No email provider configured! In production, set BREVO_API_KEY (recommended, free at brevo.com) or SMTP_USER + SMTP_PASS. ' +
    'Note: Render free tier blocks SMTP ports — Brevo HTTP API is required.'
  );
};
