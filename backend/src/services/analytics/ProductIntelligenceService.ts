import mongoose from 'mongoose';
import Order from '../../models/Order';
import Product from '../../models/Product';
import AnalyticsEvent from '../../models/AnalyticsEvent';
import { analyticsCache } from '../../utils/cache/MemoryCache';

export class ProductIntelligenceService {
  /**
   * Retrieves product affinity data (people who bought X also bought Y)
   */
  static async getProductAffinities(productId: string | mongoose.Types.ObjectId, limit = 5) {
    const pId = new mongoose.Types.ObjectId(productId);
    const cacheKey = `affinity_${pId.toString()}_${limit}`;

    return analyticsCache.getOrSet(
      cacheKey,
      async () => {
        // Find all orders containing this product
        const ordersWithProduct = await Order.find({ 'items.productId': pId })
          .select('items.productId')
          .lean();

        if (ordersWithProduct.length === 0) return [];

        const totalOrdersWithProduct = ordersWithProduct.length;
        const cooccurrenceMap = new Map<string, number>();

        // Count co-occurrences of other products
        ordersWithProduct.forEach((order) => {
          const itemIds = order.items.map((item) => item.productId.toString());
          itemIds.forEach((id) => {
            if (id !== pId.toString()) {
              cooccurrenceMap.set(id, (cooccurrenceMap.get(id) || 0) + 1);
            }
          });
        });

        // Calculate confidence and sort
        const affinities = Array.from(cooccurrenceMap.entries())
          .map(([id, count]) => ({
            productB: new mongoose.Types.ObjectId(id),
            cooccurrenceCount: count,
            confidence: (count / totalOrdersWithProduct) * 100,
          }))
          .sort((a, b) => b.confidence - a.confidence)
          .slice(0, limit);

        // Populate product details for the frontend
        const populatedAffinities = await Promise.all(
          affinities.map(async (aff) => {
            const product = await Product.findById(aff.productB)
              .select('title images price category')
              .lean();
            return {
              ...aff,
              productDetails: product,
            };
          }),
        );

        return populatedAffinities;
      },
      3600,
    ); // 1 hour cache
  }

  /**
   * Generates a global affinity matrix for the top N products.
   * Useful for pre-computing in batch jobs.
   */
  static async getProductAffinityMatrix(topN = 50) {
    // 1. Get top N products by sales
    const topProducts = await Order.aggregate([
      { $unwind: '$items' },
      { $group: { _id: '$items.productId', totalSold: { $sum: '$items.quantity' } } },
      { $sort: { totalSold: -1 } },
      { $limit: topN },
    ]);

    const matrix = [];
    for (const p of topProducts) {
      const affinities = await this.getProductAffinities(p._id, 3);
      if (affinities.length > 0) {
        matrix.push({
          productA: p._id,
          affinities,
        });
      }
    }
    return matrix;
  }

  static async getProductAnalytics(
    productId: string | mongoose.Types.ObjectId,
    startDate: Date,
    endDate: Date,
  ) {
    const pId = typeof productId === 'string' ? new mongoose.Types.ObjectId(productId) : productId;

    // Aggregate events for this product
    const events = await AnalyticsEvent.aggregate([
      {
        $match: {
          'metadata.productId': pId.toString(),
          timestamp: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: '$eventType',
          count: { $sum: 1 },
        },
      },
    ]);

    const stats = events.reduce(
      (acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      views: stats['product_view'] || 0,
      clicks: stats['product_click'] || 0,
      cartAdds: stats['cart_add'] || 0,
      wishlistAdds: stats['wishlist_add'] || 0,
      purchases: stats['product_purchase'] || 0,
      conversionRate: stats['product_view']
        ? ((stats['product_purchase'] || 0) / stats['product_view']) * 100
        : 0,
    };
  }
}
