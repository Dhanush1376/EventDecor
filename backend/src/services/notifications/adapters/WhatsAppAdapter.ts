import logger from '../../../config/logger';

export class WhatsAppAdapter {
  private static isConfigured(): boolean {
    return Boolean(process.env.WHATSAPP_API_KEY && process.env.WHATSAPP_PHONE_ID);
  }

  public static async send(recipient: any, payload: any, priority: string) {
    if (!recipient.phone) {
      logger.debug('[WHATSAPP ADAPTER] No phone number provided. Skipping.');
      return { success: false, reason: 'missing_phone' };
    }

    if (!this.isConfigured()) {
      const errorMsg = 'WhatsApp provider is not configured.';
      logger.warn(`[WHATSAPP ADAPTER] ${errorMsg}`);
      const error: any = new Error(errorMsg);
      error.statusCode = 501;
      throw error;
    }

    try {
      // Stub: Real WhatsApp API implementation goes here
      logger.info(`[WHATSAPP ADAPTER] Sent WhatsApp message to ${recipient.phone}`);
      return { success: true };
    } catch (error) {
      logger.error(`[WHATSAPP ADAPTER] Failed to dispatch WhatsApp to ${recipient.phone}:`, error);
      throw error;
    }
  }
}
