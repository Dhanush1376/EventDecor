import WhatsAppCostConfig from '../../../models/WhatsAppCostConfig';
import WhatsAppMessageLog from '../../../models/WhatsAppMessageLog';
import StoreSettings from '../../../models/StoreSettings';
import logger from '../../../config/logger';
import { notificationQueue } from '../../../jobs/queues';

export class WhatsAppCostEngine {
  /**
   * Calculate cost for a message and return the amount and currency.
   */
  static async calculateCost(
    provider: string,
    messageType: string,
    recipientPhone: string,
  ): Promise<{ amount: number; currency: string; countryCode: string }> {
    try {
      // 1. Get country code from phone number
      const countryCode = this.getCountryCodeFromPhone(recipientPhone);

      // 2. Lookup cost config
      const costConfig = await WhatsAppCostConfig.findOne({
        provider,
        countryCode,
        messageType,
      })
        .sort({ effectiveFrom: -1 })
        .lean();

      if (costConfig) {
        return {
          amount: costConfig.costPerMessage,
          currency: costConfig.currency,
          countryCode,
        };
      }

      // Default fallback if not found
      return {
        amount: 0,
        currency: 'USD',
        countryCode,
      };
    } catch (err) {
      logger.error(`[WhatsAppCostEngine] Error calculating cost for ${recipientPhone}`, err);
      return { amount: 0, currency: 'USD', countryCode: 'UNKNOWN' };
    }
  }

  /**
   * Very basic country code extraction.
   * Relies on PhoneNumberService later for robust parsing.
   */
  private static getCountryCodeFromPhone(phone: string): string {
    if (phone.startsWith('+91') || (phone.startsWith('91') && phone.length === 12)) return 'IN';
    if (phone.startsWith('+1') || (phone.startsWith('1') && phone.length === 11)) return 'US';
    if (phone.startsWith('+44') || (phone.startsWith('44') && phone.length === 12)) return 'GB';
    return 'UNKNOWN'; // Fallback
  }

  /**
   * Check budget limits and alert if necessary.
   * Can be called asynchronously after message dispatch.
   */
  static async checkBudgetAlerts(): Promise<void> {
    try {
      const settings = (await StoreSettings.findOne().lean()) as any;
      if (!settings || !settings.whatsapp || !settings.whatsapp.monthlyBudget) return;

      const monthlyBudget = settings.whatsapp.monthlyBudget;
      const alertThresholdPercent = settings.whatsapp.alertThresholdPercent || 80;

      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      // Aggregate spend this month
      const spendStats = await WhatsAppMessageLog.aggregate([
        {
          $match: {
            createdAt: { $gte: startOfMonth },
            deliveryStatus: { $in: ['sent', 'delivered', 'read'] },
          },
        },
        {
          $group: {
            _id: '$costCurrency',
            totalSpend: { $sum: '$costAmount' },
          },
        },
      ]);

      if (spendStats.length > 0) {
        // Assuming single currency (e.g. USD) for simplicity, or sum converted
        const totalSpend = spendStats[0].totalSpend || 0;

        if (totalSpend >= (monthlyBudget * alertThresholdPercent) / 100) {
          logger.warn(
            `[WhatsAppCostEngine] Budget alert! Spend ${totalSpend} has exceeded ${alertThresholdPercent}% of ${monthlyBudget}`,
          );

          await notificationQueue.add('send-notification', {
            title: 'WhatsApp Budget Alert',
            message: `Your WhatsApp spend this month (${totalSpend}) has reached ${alertThresholdPercent}% of your budget (${monthlyBudget}).`,
            type: 'warning',
          });

          if (settings.whatsapp.pauseOnExceed && totalSpend >= monthlyBudget) {
            logger.warn(`[WhatsAppCostEngine] Budget EXCEEDED! Pausing automations if enabled.`);
            // Implement logic to temporarily pause non-critical automations
          }
        }
      }
    } catch (err) {
      logger.error(`[WhatsAppCostEngine] Error checking budget alerts`, err);
    }
  }
}
