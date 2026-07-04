import Order from '../models/Order';
import Product from '../models/Product';
import User from '../models/User';
import Event from '../models/Event';
import logger from '../config/logger';
import { analyticsCache, broadcastCacheDelete } from '../utils/cache/MemoryCache';
import AdminAuditLog from '../models/AdminAuditLog';

class AnalyticsService {
  // Method to programmatically invalidate analytics cache when orders/inventory changes
  static clearCache() {
    logger.info(
      '[ANALYTICS CACHE] Invalidation triggered. Purging stale dashboard statistics cache.',
    );
    analyticsCache.delete('dashboard_stats');
    broadcastCacheDelete('analyticsCache', 'dashboard_stats');
  }

  static async getDashboardStats() {
    const cacheKey = 'dashboard_stats';
    const cached = analyticsCache.get(cacheKey);
    if (cached !== null) {
      logger.info(
        '[ANALYTICS CACHE] Cache Hit. Serving dashboard statistics from in-memory cache.',
      );
      return cached;
    }

    logger.info('Generating fresh analytics dashboard stats from database...');

    const [totalSalesData, pendingOrders, totalCustomers, totalProducts, totalEvents] =
      await Promise.all([
        Order.aggregate([
          { $match: { paymentStatus: 'paid' } },
          { $group: { _id: null, total: { $sum: '$total' } } },
        ]),
        Order.countDocuments({ orderStatus: 'Pending' }),
        User.countDocuments({ role: { $in: ['customer', 'user'] } }), // Standard and legacy roles for storefront customers
        Product.countDocuments({ isActive: true }),
        Event.countDocuments({ isActive: true }),
      ]);

    // Monthly Revenue (Last 12 months)
    const monthlyRevenue = await Order.aggregate([
      { $match: { paymentStatus: 'paid' } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          revenue: { $sum: '$total' },
          orders: { $count: {} },
        },
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 },
    ]);

    // Monthly Customers (Last 12 months)
    const monthlyCustomers = await User.aggregate([
      { $match: { role: { $in: ['customer', 'user'] } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          customers: { $count: {} },
        },
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 },
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

    // Recent Activity Feed
    const [recentOrders, recentLogs] = await Promise.all([
      Order.find().sort({ createdAt: -1 }).limit(10).select('_id customerName total createdAt'),
      AdminAuditLog.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .select('actorRole actorEmail action method path createdAt statusCode'),
    ]);

    const recentActivity = [
      ...recentOrders.map((o: any) => ({
        type: 'order',
        action: `Customer Order placed for ₹${o.total}`,
        user: o.customerName || 'Customer',
        timestamp: o.createdAt,
      })),
      ...recentLogs.map((l: any) => ({
        type: l.statusCode >= 400 ? 'system' : 'user',
        action: l.action || l.path || l.method,
        user: l.actorRole || l.actorEmail || 'System',
        timestamp: l.createdAt,
      })),
    ]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 15);

    const result = {
      stats: {
        totalSales: totalSalesData[0]?.total || 0,
        pendingOrders,
        totalCustomers,
        totalProducts,
        totalEvents,
      },
      monthlyRevenue: monthlyRevenue.map((item: any) => ({
        month: `${item._id.year}-${item._id.month}`,
        revenue: item.revenue,
        orders: item.orders,
      })),
      monthlyCustomers: monthlyCustomers.map((item: any) => ({
        month: `${item._id.year}-${item._id.month}`,
        customers: item.customers,
      })),
      categoryPerformance: categoryPerformance.map((item: any) => ({
        name: item._id || 'Uncategorized',
        value: item.value,
      })),
      recentActivity,
    };

    analyticsCache.set(cacheKey, result);
    return result;
  }
}

export default AnalyticsService;
