import logger from '../../../config/logger';
import { EmailSendOptions, IEmailProvider } from '../types';
import { BrevoProvider } from '../providers/email/BrevoProvider';
import { SMTPProvider } from '../providers/email/SMTPProvider';
import nodemailer from 'nodemailer';

export class EmailAdapter {
  private providers: IEmailProvider[] = [];

  constructor() {
    this.providers.push(new BrevoProvider());
    this.providers.push(new SMTPProvider());
  }

  public async send(recipient: any, payload: any, _priority: string) {
    const options: EmailSendOptions = {
      to: recipient.email,
      subject: payload.subject,
      html: payload.html,
      from: payload.from,
      attachments: payload.attachments,
    };

    if (!recipient.email) {
      logger.debug('[EMAIL ADAPTER] No email provided. Skipping.');
      return { success: false, reason: 'missing_email' };
    }

    const errors: string[] = [];

    // Try providers in order
    for (const provider of this.providers) {
      if (provider.isConfigured()) {
        try {
          const result = await provider.sendEmail(options);
          if (result.success) {
            return { success: true, messageId: result.messageId, provider: provider.name };
          } else {
            logger.warn(`[EMAIL ADAPTER] ${provider.name} failed: ${result.error?.message}`);
            errors.push(`${provider.name}: ${result.error?.message}`);
          }
        } catch (err: any) {
          logger.warn(`[EMAIL ADAPTER] ${provider.name} threw error: ${err.message}`);
          errors.push(`${provider.name}: ${err.message}`);
        }
      }
    }

    // Fallback to Ethereal if not in production and no provider worked
    if (process.env.NODE_ENV !== 'production') {
      logger.warn('[EMAIL ADAPTER] No configured providers succeeded. Falling back to Ethereal.');
      try {
        const testAccount = await nodemailer.createTestAccount();
        const transporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: { user: testAccount.user, pass: testAccount.pass },
        });
        const info = await transporter.sendMail({
          from: `"Siri Arts & Crafts" <${testAccount.user}>`,
          to: options.to,
          subject: options.subject,
          html: options.html,
          attachments: options.attachments,
        });
        logger.info(`[ETHEREAL] Test email preview URL: ${nodemailer.getTestMessageUrl(info)}`);
        return { success: true, messageId: info.messageId, provider: 'Ethereal' };
      } catch (etherealErr: any) {
        errors.push(`Ethereal: ${etherealErr.message}`);
      }
    }

    const failureReason = `All email providers failed: ${errors.join(', ')}`;
    logger.error(`[EMAIL ADAPTER] ${failureReason}`);

    // Simulate dead letter logic / failure propagation
    throw new Error(failureReason);
  }
}
