import logger from '../../../config/logger';

export class EmailAdapter {
  public static async send(recipient: any, payload: any, priority: string) {
    try {
      const emailProvider = require('../../../emailProvider').default;
      const { html, subject, preheader, attachments } = payload;

      logger.info(`[EMAIL ADAPTER] Enqueueing email to ${recipient.email} - Priority: ${priority}`);

      // In production, this would add to a priority queue
      // For this phase, we directly invoke the provider or existing queue
      await emailProvider.sendEmail({
        to: recipient.email,
        subject,
        html,
        attachments,
      });

      return { success: true, timestamp: new Date() };
    } catch (error) {
      logger.error(`[EMAIL ADAPTER] Failed to send email to ${recipient.email}:`, error);
      throw error;
    }
  }
}
