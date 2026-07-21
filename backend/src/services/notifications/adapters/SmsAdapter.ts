import logger from '../../../config/logger';

export class SmsAdapter {
  private static isConfigured(): boolean {
    return Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);
  }

  public static async send(recipient: any, _payload: any, _priority: string) {
    if (!recipient.phone) {
      logger.debug('[SMS ADAPTER] No phone number provided. Skipping.');
      return { success: false, reason: 'missing_phone' };
    }

    if (!this.isConfigured()) {
      const errorMsg = 'Twilio provider is not configured.';
      logger.warn(`[SMS ADAPTER] ${errorMsg}`);
      // Throw 501-like error
      const error: any = new Error(errorMsg);
      error.statusCode = 501;
      throw error;
    }

    try {
      // Stub: Real Twilio implementation goes here
      logger.info(`[SMS ADAPTER] Sent SMS to ${recipient.phone}`);
      return { success: true };
    } catch (error) {
      logger.error(`[SMS ADAPTER] Failed to dispatch SMS to ${recipient.phone}:`, error);
      throw error;
    }
  }
}
