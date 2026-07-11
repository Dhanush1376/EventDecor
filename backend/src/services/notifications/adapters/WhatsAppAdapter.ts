import logger from '../../../config/logger';
import { WhatsAppAutomationEngine } from '../../../domains/notifications/whatsapp/WhatsAppAutomationEngine';

export class WhatsAppAdapter {
  public static async send(recipient: any, payload: any, _priority: string) {
    try {
      if (!recipient.phone) {
        logger.debug('[WHATSAPP ADAPTER] No phone number provided. Skipping.');
        return { success: false, reason: 'missing_phone' };
      }

      logger.info(`[WHATSAPP ADAPTER] Forwarding legacy call to WhatsAppAutomationEngine`);

      // We don't have the automationKey here directly from the old adapter pattern,
      // but if the payload contains it, we can pass it through.
      const automationKey = payload.automationKey || 'new_order';

      await WhatsAppAutomationEngine.trigger(automationKey, payload);

      return { success: true, timestamp: new Date() };
    } catch (error) {
      logger.error(`[WHATSAPP ADAPTER] Failed to dispatch WhatsApp to ${recipient?.phone}:`, error);
      throw error;
    }
  }
}
