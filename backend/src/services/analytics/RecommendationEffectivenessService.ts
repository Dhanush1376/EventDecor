import AnalyticsEvent from '../../models/AnalyticsEvent';
import { analyticsCache } from '../../utils/cache/MemoryCache';

export class RecommendationEffectivenessService {
  /**
   * Tracks the effectiveness of AI recommendations (Shown -> Clicked -> Carted -> Purchased)
   */
  static async getEffectivenessDashboard(startDate: Date, endDate: Date) {
    const cacheKey = `recommendation_dash_${startDate.toISOString()}_${endDate.toISOString()}`;

    return analyticsCache.getOrSet(
      cacheKey,
      async () => {
        const match = { timestamp: { $gte: startDate, $lte: endDate } };

        const shown = await AnalyticsEvent.countDocuments({
          ...match,
          eventType: 'recommendation_shown',
        });
        const clicked = await AnalyticsEvent.countDocuments({
          ...match,
          eventType: 'recommendation_clicked',
        });
        const carted = await AnalyticsEvent.countDocuments({
          ...match,
          eventType: 'recommendation_carted',
        });
        const purchased = await AnalyticsEvent.countDocuments({
          ...match,
          eventType: 'recommendation_purchased',
        });

        // Calculate revenue from recommendations
        const purchases = await AnalyticsEvent.aggregate([
          { $match: { ...match, eventType: 'recommendation_purchased' } },
          { $group: { _id: null, totalRevenue: { $sum: { $toDouble: '$metadata.price' } } } }, // Assuming price is logged
        ]);

        const revenue = purchases.length > 0 ? purchases[0].totalRevenue : 0;

        return {
          funnel: {
            shown,
            clicked,
            carted,
            purchased,
          },
          rates: {
            clickRate: shown > 0 ? (clicked / shown) * 100 : 0,
            cartRate: clicked > 0 ? (carted / clicked) * 100 : 0,
            purchaseRate: carted > 0 ? (purchased / carted) * 100 : 0,
          },
          revenue,
        };
      },
      900,
    ); // 15 min cache
  }

  static async getEffectivenessBySource(startDate: Date, endDate: Date) {
    return AnalyticsEvent.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate, $lte: endDate },
          eventType: {
            $in: [
              'recommendation_shown',
              'recommendation_clicked',
              'recommendation_carted',
              'recommendation_purchased',
            ],
          },
        },
      },
      {
        $group: {
          _id: {
            source: '$metadata.recommendationSource',
            type: '$eventType',
          },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: '$_id.source',
          events: { $push: { k: '$_id.type', v: '$count' } },
        },
      },
      {
        $project: {
          source: { $ifNull: ['$_id', 'unknown'] },
          stats: { $arrayToObject: '$events' },
          _id: 0,
        },
      },
    ]);
  }
}
