import Order from '../models/Order';
import Product from '../models/Product';
import User from '../models/User';
import Event from '../models/Event';
import logger from '../config/logger';
import { MemoryCache } from '../utils/MemoryCache';

const analyticsCache = new MemoryCache({ defaultTtlMs: 5 * 60 * 1000 }); // 5-minute cache threshold

class AnalyticsService {
  // Method to programmatically invalidate analytics cache when orders/inventory changes
  static clearCache() {
    logger.info('[ANALYTICS CACHE] Invalidation triggered. Purging stale dashboard statistics cache.');
    analyticsCache.delete('dashboard_stats');
  }

  static async getDashboardStats() {
    const cacheKey = 'dashboard_stats';
    const cached = analyticsCache.get(cacheKey);
    if (cached !== null) {
      logger.info('[ANALYTICS CACHE] Cache Hit. Serving dashboard statistics from in-memory cache.');
      return cached;
    }

    logger.info('Generating fresh analytics dashboard stats from database...');

    const [
      totalSalesData,
      pendingOrders,
      totalCustomers,
      totalProducts,
      totalEvents
    ] = await Promise.all([
      Order.aggregate([
        { $match: { paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]),
      Order.countDocuments({ orderStatus: 'Pending' }),
      User.countDocuments({ role: 'customer' }), // Standard role for storefront customers
      Product.countDocuments({ isActive: true }),
      Event.countDocuments({ isActive: true })
    ]);

    // Monthly Revenue (Last 12 months)
    const monthlyRevenue = await Order.aggregate([
      { $match: { paymentStatus: 'paid' } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          revenue: { $sum: '$total' },
          orders: { $count: {} }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 }
    ]);

    // Category Performance
    const categoryPerformance = await Order.aggregate([
      { $match: { paymentStatus: 'paid' } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.category',
          value: { $sum: '$items.quantity' },
        },
      },
      { $sort: { value: -1 } },
      { $limit: 20 },
    ]);

    const result = {
      stats: {
        totalSales: totalSalesData[0]?.total || 0,
        pendingOrders,
        totalCustomers,
        totalProducts,
        totalEvents
      },
      monthlyRevenue: monthlyRevenue.map(item => ({
        month: `${item._id.year}-${item._id.month}`,
        revenue: item.revenue,
        orders: item.orders
      })),
      categoryPerformance: categoryPerformance.map(item => ({
        name: item._id || 'Uncategorized',
        value: item.value
      }))
    };

    analyticsCache.set(cacheKey, result);
    return result;
  }
}

export default AnalyticsService;
