import WhatsAppDashboardCache from '../../../models/WhatsAppDashboardCache';
import logger from '../../../config/logger';

export class WhatsAppDashboardService {
  static async incrementStats(
    status: 'sent' | 'failed',
    automationKey: string,
    latencyMs: number,
  ): Promise<void> {
    const today = new Date().toISOString().split('T')[0];

    // Simplistic atomic update
    const update = {
      $inc: {
        messagesToday: 1,
        messagesThisMonth: 1,
        ...(status === 'failed' ? { failedMessages: 1 } : {}),
        [`automationStats.${automationKey}.sent`]: 1,
        [`automationStats.${automationKey}.${status}`]: 1,
      },
      $set: {
        ...(status === 'sent' ? { lastSentAt: new Date() } : { lastFailedAt: new Date() }),
      },
    };

    try {
      await WhatsAppDashboardCache.findOneAndUpdate({ date: today }, update, {
        upsert: true,
        new: true,
      });
    } catch (err) {
      logger.error(`[WhatsAppDashboardService] Failed to increment stats`, err);
    }
  }

  static async refreshCache(): Promise<void> {
    // Cron job to recalculate delivery rates and latency averages
    logger.debug(`[WhatsAppDashboardService] Refreshing dashboard cache`);
  }

  static async checkProviderHealth(): Promise<void> {
    // Cron job to ping Provider APIs and update health status
    logger.debug(`[WhatsAppDashboardService] Checking provider health`);
  }
}
