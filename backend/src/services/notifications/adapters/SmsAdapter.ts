import logger from '../../../config/logger';

export class SmsAdapter {
  public static async send(recipient: any, _payload: any, _priority: string) {
    try {
      if (!recipient.phone) {
        logger.debug('[SMS ADAPTER] No phone number provided. Skipping.');
        return { success: false, reason: 'missing_phone' };
      }

      logger.info(`[SMS ADAPTER] Dispatching SMS to ${recipient.phone}`);

      // Stub: Integration with Twilio/AWS SNS/Msg91
      // const twilio = require('twilio')(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);
      // await twilio.messages.create({
      //   body: payload.shortText,
      //   from: process.env.TWILIO_PHONE_NUMBER,
      //   to: recipient.phone
      // });

      return { success: true, timestamp: new Date() };
    } catch (error) {
      logger.error(`[SMS ADAPTER] Failed to dispatch SMS to ${recipient.phone}:`, error);
      throw error;
    }
  }
}
