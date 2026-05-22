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

  const senderEmail = process.env.SMTP_FROM_EMAIL || 'no-reply@siriartsandcrafts.com';
  const senderName = payload.fromName || process.env.SMTP_FROM_NAME || 'Siri Arts & Crafts';

  const body = {
    sender: { name: senderName, email: senderEmail },
    to: [{ email: payload.to }],
    subject: payload.subject,
    htmlContent: payload.html,
    headers: payload.headers,
    attachment: payload.attachments?.map(a => ({
      name: a.filename,
      content: typeof a.content === 'string' ? Buffer.from(a.content).toString('base64') : a.content.toString('base64')
    }))
  };

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', 'api-key': apiKey },
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
export const sendViaSMTP = async (payload: EmailPayload): Promise<{ messageId: string }> => {
  const nodemailer = require('nodemailer');
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = Number(process.env.SMTP_PORT) || 587;

  const transporter = nodemailer.createTransport({
    host: smtpHost, port: smtpPort, secure: smtpPort === 465,
    auth: { user: smtpUser, pass: smtpPass },
  });

  const senderEmail = payload.from || process.env.SMTP_FROM_EMAIL || smtpUser;
  const senderName = payload.fromName || process.env.SMTP_FROM_NAME || 'Siri Arts & Crafts';

  const info = await transporter.sendMail({
    from: `"${senderName}" <${senderEmail}>`,
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
    headers: payload.headers,
    attachments: payload.attachments
  });

  logger.info(`[SMTP SUCCESS] Email sent to ${payload.to}. MessageId: ${info.messageId}`);
  return { messageId: info.messageId };
};

/**
 * Smart Email Sender: Tries Resend -> SendGrid -> Brevo -> SMTP fallback
 */
export const sendEmail = async (payload: EmailPayload): Promise<{ messageId: string }> => {
  if (process.env.BREVO_API_KEY) {
    try { return await sendViaBrevo(payload); } catch (err: any) { logger.warn(`Brevo failed: ${err.message}`); }
  }

  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    try { return await sendViaSMTP(payload); } catch (err: any) { logger.warn(`SMTP failed: ${err.message}`); }
  }

  if (process.env.NODE_ENV !== 'production') {
    logger.warn('[EMAIL] No real email provider configured. Using Ethereal test mail...');
    const nodemailer = require('nodemailer');
    const testAccount = await nodemailer.createTestAccount();
    const transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email', port: 587, secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
    const info = await transporter.sendMail({
      from: `"Siri Arts & Crafts" <${testAccount.user}>`,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      attachments: payload.attachments
    });
    logger.info(`[ETHEREAL] Test email preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    return { messageId: info.messageId };
  }

  throw new Error('No email provider configured! Set RESEND_API_KEY, SENDGRID_API_KEY, BREVO_API_KEY, or SMTP_USER/PASS.');
};
