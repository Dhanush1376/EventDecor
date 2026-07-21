import logger from '../../../../config/logger';
import { IEmailProvider, EmailSendOptions, EmailSendResult } from '../../types';
import nodemailer from 'nodemailer';

export class SMTPProvider implements IEmailProvider {
  name = 'SMTP';
  private cachedTransporter: any = null;

  isConfigured(): boolean {
    return Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
  }

  async sendEmail(options: EmailSendOptions): Promise<EmailSendResult> {
    if (!this.isConfigured()) {
      return { success: false, provider: this.name, error: new Error('SMTP is not configured') };
    }

    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = Number(process.env.SMTP_PORT) || 587;

    if (!this.cachedTransporter) {
      this.cachedTransporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: { user: smtpUser, pass: smtpPass },
        tls: { rejectUnauthorized: false },
        family: 4,
      } as any);
    }

    const senderEmail = process.env.SMTP_FROM_EMAIL || smtpUser;
    const senderName = options.from || process.env.SMTP_FROM_NAME || 'Siri Arts & Crafts';

    try {
      const info = await this.cachedTransporter.sendMail({
        from: `"${senderName}" <${senderEmail}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        headers: options.headers,
        attachments: options.attachments,
      });

      logger.info(`[SMTP SUCCESS] Email sent to ${options.to}. MessageId: ${info.messageId}`);
      return { success: true, messageId: info.messageId, provider: this.name };
    } catch (error: any) {
      logger.error(`[SMTP FAILED] ${error.message}`);
      return { success: false, provider: this.name, error };
    }
  }
}
