import AnalyticsEvent from '../../models/AnalyticsEvent';
import { analyticsCache } from '../../utils/cache/MemoryCache';

export class MarketingAttributionService {
  /**
   * Generates a dashboard of traffic and revenue grouped by marketing channels.
   */
  static async getAttributionDashboard(startDate: Date, endDate: Date) {
    const cacheKey = `attribution_dash_${startDate.toISOString()}_${endDate.toISOString()}`;

    return analyticsCache.getOrSet(
      cacheKey,
      async () => {
        // Aggregate visitors by channel (using distinct sessions to represent visitors)
        const channelVisitors = await AnalyticsEvent.aggregate([
          {
            $match: {
              timestamp: { $gte: startDate, $lte: endDate },
              'metadata.referralChannel': { $exists: true },
            },
          },
          {
            $group: {
              _id: '$metadata.referralChannel',
              sessions: { $addToSet: '$sessionId' },
            },
          },
          {
            $project: {
              channel: '$_id',
              visitors: { $size: '$sessions' },
              _id: 0,
            },
          },
        ]);

        // To calculate revenue and conversions per channel, we track the 'payment_success' event
        const channelConversions = await AnalyticsEvent.aggregate([
          {
            $match: {
              timestamp: { $gte: startDate, $lte: endDate },
              eventType: 'payment_success',
              'metadata.referralChannel': { $exists: true },
            },
          },
          {
            $group: {
              _id: '$metadata.referralChannel',
              conversions: { $sum: 1 },
              revenue: { $sum: { $toDouble: '$metadata.orderTotal' } }, // Assuming orderTotal is logged in metadata
            },
          },
          {
            $project: {
              channel: '$_id',
              conversions: 1,
              revenue: 1,
              _id: 0,
            },
          },
        ]);

        // Merge the results
        const dashboard = channelVisitors.map((v) => {
          const conv = channelConversions.find((c) => c.channel === v.channel) || {
            conversions: 0,
            revenue: 0,
          };
          return {
            channel: v.channel || 'direct',
            visitors: v.visitors,
            conversions: conv.conversions,
            revenue: conv.revenue,
            conversionRate: v.visitors > 0 ? (conv.conversions / v.visitors) * 100 : 0,
          };
        });

        // Sort by revenue descending
        return dashboard.sort((a, b) => b.revenue - a.revenue);
      },
      900,
    ); // 15 min cache
  }
}
