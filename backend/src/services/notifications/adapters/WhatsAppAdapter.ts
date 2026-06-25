import logger from '../../../config/logger';

export class WhatsAppAdapter {
  public static async send(recipient: any, _payload: any, _priority: string) {
    try {
      if (!recipient.phone) {
        logger.debug('[WHATSAPP ADAPTER] No phone number provided. Skipping.');
        return { success: false, reason: 'missing_phone' };
      }

      logger.info(`[WHATSAPP ADAPTER] Dispatching WhatsApp message to ${recipient.phone}`);

      // Stub: Integration with WhatsApp Cloud API or Twilio WhatsApp API
      // const axios = require('axios');
      // await axios.post(`https://graph.facebook.com/v15.0/${process.env.WA_PHONE_ID}/messages`, {
      //   messaging_product: "whatsapp",
      //   to: recipient.phone,
      //   type: "template",
      //   template: { name: payload.waTemplateName, language: { code: "en_US" } }
      // }, { headers: { Authorization: `Bearer ${process.env.WA_TOKEN}` }});

      return { success: true, timestamp: new Date() };
    } catch (error) {
      logger.error(`[WHATSAPP ADAPTER] Failed to dispatch WhatsApp to ${recipient.phone}:`, error);
      throw error;
    }
  }
}
