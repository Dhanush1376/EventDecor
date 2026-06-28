import AnalyticsEvent from '../../models/AnalyticsEvent';
import { analyticsCache } from '../../utils/cache/MemoryCache';

export class FunnelAnalyticsService {
  /**
   * Generates a conversion funnel from Homepage -> Order Success
   */
  static async getConversionFunnel(startDate: Date, endDate: Date) {
    const cacheKey = `funnel_${startDate.toISOString()}_${endDate.toISOString()}`;

    return analyticsCache.getOrSet(
      cacheKey,
      async () => {
        const match = { timestamp: { $gte: startDate, $lte: endDate } };

        // We'll count unique sessions for each stage of the funnel
        const funnelStages = [
          { key: 'homepage', eventTypes: ['page_view'], pageMatch: /^\/$/ }, // Homepage
          { key: 'category', eventTypes: ['page_view'], pageMatch: /^\/collections/ },
          { key: 'product', eventTypes: ['page_view'], pageMatch: /^\/product\// },
          { key: 'cart', eventTypes: ['page_view'], pageMatch: /^\/cart/ },
          { key: 'checkout', eventTypes: ['checkout_started'] },
          { key: 'payment', eventTypes: ['checkout_completed'] }, // Payment screen reached
          { key: 'orderSuccess', eventTypes: ['payment_success'] },
        ];

        const funnelData: Record<string, number> = {};

        for (const stage of funnelStages) {
          const query: any = { ...match, eventType: { $in: stage.eventTypes } };
          if (stage.pageMatch) {
            query.page = { $regex: stage.pageMatch };
          }
          // Count unique sessions that reached this stage
          const sessions = await AnalyticsEvent.distinct('sessionId', query);
          funnelData[stage.key] = sessions.length;
        }

        // Calculate drop-offs
        const dropoffs = {
          homepageToCategory: this.calcDropoff(funnelData.homepage, funnelData.category),
          categoryToProduct: this.calcDropoff(funnelData.category, funnelData.product),
          productToCart: this.calcDropoff(funnelData.product, funnelData.cart),
          cartToCheckout: this.calcDropoff(funnelData.cart, funnelData.checkout),
          checkoutToPayment: this.calcDropoff(funnelData.checkout, funnelData.payment),
          paymentToSuccess: this.calcDropoff(funnelData.payment, funnelData.orderSuccess),
        };

        return {
          ...funnelData,
          dropoffs,
          conversionRate:
            funnelData.homepage > 0 ? (funnelData.orderSuccess / funnelData.homepage) * 100 : 0,
        };
      },
      900,
    ); // 15 min cache
  }

  private static calcDropoff(stage1: number, stage2: number) {
    if (stage1 === 0) return 0;
    return ((stage1 - Math.min(stage1, stage2)) / stage1) * 100;
  }
}
