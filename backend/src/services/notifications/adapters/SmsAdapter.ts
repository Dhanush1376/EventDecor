import logger from '../../../config/logger';

export class SmsAdapter {
  public static async send(recipient: any, _payload: any, _priority: string) {
    try {
      if (!recipient.phone) {
        logger.debug('[SMS ADAPTER] No phone number provided. Skipping.');
        return { success: false, reason: 'missing_phone' };
      }

      // No SMS provider (Twilio/AWS SNS/Msg91) is integrated yet. Report an
      // explicit not-configured result instead of falsely claiming delivery —
      // a fake success would make the system record SMS that were never sent.
      logger.warn(
        `[SMS ADAPTER] SMS provider not configured; cannot deliver to ${recipient.phone}.`,
      );
      return { success: false, reason: 'sms_provider_not_configured' };
    } catch (error) {
      logger.error(`[SMS ADAPTER] Failed to dispatch SMS to ${recipient.phone}:`, error);
      throw error;
    }
  }
}
