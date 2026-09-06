import Order from '../models/Order';
import Product from '../models/Product';
import User from '../models/User';
import Event from '../models/Event';
import logger from '../config/logger';
import { analyticsCache, broadcastCacheDelete } from '../utils/cache/MemoryCache';
import AdminAuditLog from '../models/AdminAuditLog';
import UserInteraction from '../models/UserInteraction';

const formatAuditLogAction = (log: any) => {
  if (log.action && !log.action.startsWith('/')) return log.action;
  const path = (log.path || '').toLowerCase();
  const method = (log.method || 'GET').toUpperCase();
  if (path.includes('/coupons'))
    return method === 'POST'
      ? 'Created discount coupon'
      : method === 'PUT'
        ? 'Updated discount coupon'
        : 'Reviewed coupons & offers';
  if (path.includes('/customer-intelligence') || path.includes('/customers'))
    return 'Viewed customer profile & behavior history';
  if (path.includes('/products'))
    return method === 'POST' ? 'Added new product to catalog' : 'Updated product inventory';
  if (path.includes('/orders'))
    return method === 'PUT' ? 'Updated customer order status' : 'Viewed order details';
  if (path.includes('/analytics')) return 'Generated business performance report';
  if (path.includes('/settings')) return 'Adjusted store operational settings';
  if (path.includes('/backup')) return 'Verified backup center integrity';
  if (path.includes('/events')) return 'Updated event booking catalog';
  if (path.includes('/reviews')) return 'Moderated customer product reviews';
  return `${method} ${path.replace('/api/v1/', '').split('/')[0] || 'System activity'}`;
};

const formatUserInteraction = (item: any) => {
  switch (item.eventType) {
    case 'product_view':
    case 'product_click':
      return item.metadata?.category
        ? `Browsed ${item.metadata.category}`
        : 'Viewed a decor product';
    case 'cart_add':
      return `Added ${item.metadata?.category || 'decor item'} to cart`;
    case 'wishlist_add':
      return 'Saved item to wishlist';
    case 'search':
    case 'search_executed':
      return `Searched store for "${item.metadata?.searchQuery || 'decor'}"`;
    case 'category_explore':
      return `Explored ${item.metadata?.category || 'decor'} category`;
    case 'purchase':
      return 'Completed order checkout';
    default:
      return item.eventType ? item.eventType.replace(/_/g, ' ') : 'Website interaction';
  }
};

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

    const [
      totalSalesData,
      totalOrdersCount,
      pendingOrders,
      totalCustomers,
      totalProducts,
      totalEvents,
    ] = await Promise.all([
      Order.aggregate([
        { $match: { paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]),
      Order.countDocuments(),
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

    // Recent Activity Feed (Orders + User interactions + Humanized Admin actions)
    const [recentOrders, recentInteractions, recentLogs] = await Promise.all([
      Order.find().sort({ createdAt: -1 }).limit(8).select('_id customerName total createdAt'),
      UserInteraction.find()
        .sort({ timestamp: -1 })
        .limit(8)
        .populate('userId', 'name email')
        .lean(),
      AdminAuditLog.find()
        .sort({ createdAt: -1 })
        .limit(6)
        .select('actorRole actorEmail action method path createdAt statusCode'),
    ]);

    const recentActivity = [
      ...recentOrders.map((o: any) => ({
        type: 'order',
        action: `Customer placed order for ₹${Number(o.total || 0).toLocaleString('en-IN')}`,
        user: o.customerName || 'Customer',
        timestamp: o.createdAt,
      })),
      ...recentInteractions.map((i: any) => ({
        type: 'user',
        action: formatUserInteraction(i),
        user: (i.userId as any)?.name || (i.userId as any)?.email?.split('@')[0] || 'Visitor',
        timestamp: i.timestamp || i.createdAt,
      })),
      ...recentLogs.map((l: any) => ({
        type: l.statusCode >= 400 ? 'system' : 'admin',
        action: formatAuditLogAction(l),
        user:
          l.actorRole === 'super_admin'
            ? 'Super Admin'
            : l.actorRole === 'main_admin'
              ? 'Admin'
              : l.actorRole || 'Staff',
        timestamp: l.createdAt,
      })),
    ]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 15);

    const result = {
      stats: {
        totalSales: totalSalesData[0]?.total || 0,
        totalOrders: totalOrdersCount,
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
