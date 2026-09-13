import { sendEmail, getProviderStatus, EmailPayload } from '../emailProvider';
import logger from '../../config/logger';

export interface ISendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export class EmailProviderAbstraction {
  /**
   * Dispatches email payload through active provider pipeline (Brevo HTTPS -> SMTP -> Ethereal)
   */
  static async send(payload: EmailPayload): Promise<ISendEmailResult> {
    try {
      const result = await sendEmail(payload);
      return {
        success: true,
        messageId: result.messageId,
      };
    } catch (err: any) {
      logger.error(`[EmailProviderAbstraction] Send failed: ${err.message}`);
      return {
        success: false,
        error: err.message,
      };
    }
  }

  /**
   * Diagnostic status report for settings dashboard
   */
  static getStatus() {
    return getProviderStatus();
  }

  /**
   * Diagnostic single-recipient test send
   */
  static async sendTestEmail(params: {
    to: string;
    subject: string;
    html: string;
    senderName?: string;
    senderEmail?: string;
  }): Promise<ISendEmailResult> {
    const prefixedSubject = `[TEST] ${params.subject}`;
    const diagnosticBanner = `
      <div style="background-color: #fff8e1; border-bottom: 2px solid #ffb300; padding: 12px 20px; font-family: sans-serif; font-size: 13px; color: #6d4c41; text-align: center;">
        <strong>TEST EMAIL PREVIEW:</strong> This is an internal preview dispatch generated from the Campaign Builder. Links and tracking tokens reflect preview test state.
      </div>
    `;

    return this.send({
      to: params.to,
      subject: prefixedSubject,
      html: `${diagnosticBanner}${params.html}`,
      from: params.senderEmail,
      fromName: params.senderName,
    });
  }
}

export default EmailProviderAbstraction;
