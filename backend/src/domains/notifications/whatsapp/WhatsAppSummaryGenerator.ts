import Order from '../../../models/Order';
import Review from '../../../models/Review';
import User from '../../../models/User';
import Product from '../../../models/Product';
import ReturnRequest from '../../../models/ReturnRequest';
import StoreSettings from '../../../models/StoreSettings';

const PAID_STATUSES = ['captured', 'paid', 'COD Collected'] as const;
const COD_PENDING_STATUSES = ['Pending COD'] as const;

/** Aggregate real business metrics for the given [start, end) window. */
async function buildSummary(start: Date, end: Date, heading: string): Promise<string> {
  const range = { $gte: start, $lt: end };

  const [
    newOrders,
    shippedOrders,
    deliveredOrders,
    revenueAgg,
    paidCount,
    codPendingCount,
    lowStockCount,
    reviewAgg,
    newCustomers,
    returnsRequested,
  ] = await Promise.all([
    Order.countDocuments({ createdAt: range }),
    Order.countDocuments({ orderStatus: 'Processing', updatedAt: range }),
    Order.countDocuments({ orderStatus: 'Delivered', updatedAt: range }),
    Order.aggregate([
      { $match: { createdAt: range, paymentStatus: { $in: PAID_STATUSES } } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]),
    Order.countDocuments({ createdAt: range, paymentStatus: { $in: PAID_STATUSES } }),
    Order.countDocuments({ createdAt: range, paymentStatus: { $in: COD_PENDING_STATUSES } }),
    Product.countDocuments({
      isActive: true,
      $expr: { $lte: [{ $subtract: ['$stock', '$reservedStock'] }, '$lowStockThreshold'] },
    }),
    Review.aggregate([
      { $match: { createdAt: range, isMock: { $ne: true } } },
      { $group: { _id: null, count: { $sum: 1 }, avg: { $avg: '$rating' } } },
    ]),
    User.countDocuments({ createdAt: range, role: { $in: ['user', 'customer'] } }),
    ReturnRequest.countDocuments({ createdAt: range }),
  ]);

  const storeSettings = (await StoreSettings.findOne().lean()) as any;
  const storeName = storeSettings?.general?.storeName || 'Our Store';
  const currency = storeSettings?.general?.currency || 'INR';

  const revenue = revenueAgg[0]?.total || 0;
  const reviewCount = reviewAgg[0]?.count || 0;
  const reviewAvg = reviewAgg[0]?.avg ? reviewAgg[0].avg.toFixed(1) : '—';

  return `📊 *${heading}*
━━━━━━━━━━━━━━━━━━━━━
📦 Orders: ${newOrders} New | ${shippedOrders} Shipped | ${deliveredOrders} Delivered
💰 Revenue: ${currency}${revenue.toLocaleString('en-IN')}
💳 Payments: ${paidCount} Paid | ${codPendingCount} COD Pending
📦 Inventory: ${lowStockCount} Low Stock Alerts
⭐ Reviews: ${reviewCount} New (Avg: ${reviewAvg}★)
👥 Customers: ${newCustomers} New Registrations
🔄 Returns: ${returnsRequested} Requested
━━━━━━━━━━━━━━━━━━━━━
${storeName} • Auto-generated`;
}

export class WhatsAppSummaryGenerator {
  static async generateDailySummary(): Promise<string> {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 1);
    return buildSummary(start, end, `DAILY SUMMARY — ${start.toLocaleDateString('en-IN')}`);
  }

  static async generateWeeklySummary(): Promise<string> {
    const end = new Date();
    const start = new Date(end);
    start.setDate(end.getDate() - 7);
    return buildSummary(start, end, 'WEEKLY SUMMARY (last 7 days)');
  }

  static async generateMonthlySummary(): Promise<string> {
    const end = new Date();
    const start = new Date(end);
    start.setDate(end.getDate() - 30);
    return buildSummary(start, end, 'MONTHLY SUMMARY (last 30 days)');
  }
}
