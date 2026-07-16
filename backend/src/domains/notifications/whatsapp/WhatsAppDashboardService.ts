import WhatsAppDashboardCache from '../../../models/WhatsAppDashboardCache';
import WhatsAppMessageLog from '../../../models/WhatsAppMessageLog';
import { WhatsAppProviderFactory } from './providers/WhatsAppProviderFactory';
import logger from '../../../config/logger';

export class WhatsAppDashboardService {
  static async incrementStats(
    status: 'sent' | 'failed',
    automationKey: string,
    _latencyMs: number,
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
    logger.debug(`[WhatsAppDashboardService] Refreshing dashboard cache`);
    const today = new Date().toISOString().split('T')[0];
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    try {
      // Aggregate stats from MessageLog for current month
      const stats = await WhatsAppMessageLog.aggregate([
        { $match: { createdAt: { $gte: startOfMonth } } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            delivered: {
              $sum: { $cond: [{ $in: ['$deliveryStatus', ['delivered', 'read']] }, 1, 0] },
            },
            failed: { $sum: { $cond: [{ $eq: ['$deliveryStatus', 'failed'] }, 1, 0] } },
            cancelled: { $sum: { $cond: [{ $eq: ['$deliveryStatus', 'cancelled'] }, 1, 0] } },
            expired: { $sum: { $cond: [{ $eq: ['$deliveryStatus', 'expired'] }, 1, 0] } },
          },
        },
      ]);

      if (stats.length > 0) {
        const { total, delivered, cancelled, expired } = stats[0];
        const validTotal = total - cancelled - expired;
        const deliveryRate = validTotal > 0 ? (delivered / validTotal) * 100 : 0;

        await WhatsAppDashboardCache.findOneAndUpdate(
          { date: today },
          { $set: { deliveryRate: Number(deliveryRate.toFixed(2)) } },
          { upsert: true },
        );
      }
    } catch (err) {
      logger.error(`[WhatsAppDashboardService] Failed to refresh cache`, err);
    }
  }

  static async checkProviderHealth(): Promise<void> {
    logger.debug(`[WhatsAppDashboardService] Checking provider health`);
    const today = new Date().toISOString().split('T')[0];

    try {
      const providers = WhatsAppProviderFactory.getProviderChain();
      const providerStatus: Record<string, any> = {};

      for (const provider of providers) {
        const health = await provider.checkHealth();
        providerStatus[provider.name] = {
          status: health.status,
          lastChecked: health.lastChecked,
          error: health.error,
        };
      }

      await WhatsAppDashboardCache.findOneAndUpdate(
        { date: today },
        { $set: { providerStatus } },
        { upsert: true },
      );
    } catch (err) {
      logger.error(`[WhatsAppDashboardService] Failed to check provider health`, err);
    }
  }
}
