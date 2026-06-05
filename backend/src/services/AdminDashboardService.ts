import Order from '../models/Order';
import EventBooking from '../models/EventBooking';
import RentalOrder from '../models/RentalOrder';
import RefundRecord from '../models/RefundRecord';
import User from '../models/User';
import PaymentAudit from '../models/PaymentAudit';
import OutboxEvent from '../models/OutboxEvent';
import Product from '../models/Product';
import { analyticsCache } from '../utils/MemoryCache';
import { emailQueue, webhookQueue, refundQueue } from '../jobs/queues';

export class AdminDashboardService {
  /**
   * Generates a comprehensive real-time dashboard metrics overview for the admin portal.
   * Aggregates data across Orders, Rentals, Event Bookings, and Users.
   */
  static async getOverviewMetrics(startDate?: Date, endDate?: Date) {
    const cacheKey = `dashboard_metrics_${startDate?.toISOString() || 'all'}_${endDate?.toISOString() || 'all'}`;

    return analyticsCache.getOrSet(cacheKey, async () => {
      const queryDateFilter = {};
      if (startDate || endDate) {
        const createdAtFilter: any = {};
        if (startDate) createdAtFilter.$gte = startDate;
        if (endDate) createdAtFilter.$lte = endDate;
        (queryDateFilter as any).createdAt = createdAtFilter;
      }

      // 1. Order Metrics
      const orderStats = await Order.aggregate([
        { $match: queryDateFilter },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalRevenue: {
              $sum: {
                $cond: [{ $in: ['$paymentStatus', ['paid', 'COD Collected']] }, '$total', 0],
              },
            },
            pendingOrders: { $sum: { $cond: [{ $eq: ['$orderStatus', 'Pending'] }, 1, 0] } },
            cancelledOrders: { $sum: { $cond: [{ $eq: ['$orderStatus', 'Cancelled'] }, 1, 0] } },
          },
        },
      ]);

      // 2. Rental Metrics
      const rentalStats = await RentalOrder.aggregate([
        { $match: queryDateFilter },
        {
          $group: {
            _id: null,
            totalRentals: { $sum: 1 },
            totalRevenue: {
              $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$totalAmount', 0] },
            },
            activeRentals: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
            lateReturns: { $sum: { $cond: [{ $eq: ['$status', 'overdue'] }, 1, 0] } },
          },
        },
      ]);

      // 3. Event Booking Metrics
      const bookingStats = await EventBooking.aggregate([
        { $match: queryDateFilter },
        {
          $group: {
            _id: null,
            totalBookings: { $sum: 1 },
            totalRevenue: {
              $sum: {
                $cond: [
                  { $in: ['$pricing.paymentStatus', ['paid', 'partial']] },
                  '$pricing.depositAmount',
                  0,
                ],
              },
            },
            upcomingEvents: {
              $sum: { $cond: [{ $in: ['$status', ['confirmed', 'team_assigned']] }, 1, 0] },
            },
          },
        },
      ]);

      // 4. Refund Metrics
      const refundStats = await RefundRecord.aggregate([
        { $match: queryDateFilter },
        {
          $group: {
            _id: null,
            totalRefunds: { $sum: 1 },
            totalRefundAmount: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$amount', 0] },
            },
            pendingRefunds: {
              $sum: { $cond: [{ $in: ['$status', ['pending', 'processing']] }, 1, 0] },
            },
            failedRefunds: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
          },
        },
      ]);

      // 5. User Metrics
      const userStats = await User.aggregate([
        { $match: queryDateFilter },
        {
          $group: {
            _id: null,
            totalNewUsers: { $sum: 1 },
            activeUsers: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
          },
        },
      ]);

      return {
        orders: orderStats[0] || {
          totalOrders: 0,
          totalRevenue: 0,
          pendingOrders: 0,
          cancelledOrders: 0,
        },
        rentals: rentalStats[0] || {
          totalRentals: 0,
          totalRevenue: 0,
          activeRentals: 0,
          lateReturns: 0,
        },
        eventBookings: bookingStats[0] || { totalBookings: 0, totalRevenue: 0, upcomingEvents: 0 },
        refunds: refundStats[0] || {
          totalRefunds: 0,
          totalRefundAmount: 0,
          pendingRefunds: 0,
          failedRefunds: 0,
        },
        users: userStats[0] || { totalNewUsers: 0, activeUsers: 0 },
        generatedAt: new Date(),
      };
    });
  }

  /**
   * Generates real-time enterprise health metrics for SRE / DevOps admin views.
   */
  static async getRealTimeHealthMetrics() {
    // 1. Payment Success Rate (Last 24h)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const paymentStats = await PaymentAudit.aggregate([
      { $match: { createdAt: { $gte: oneDayAgo } } },
      {
        $group: {
          _id: null,
          totalAttempts: { $sum: 1 },
          successful: { $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] } },
        },
      },
    ]);
    const pStats = paymentStats[0] || { totalAttempts: 0, successful: 0 };
    const paymentSuccessRate =
      pStats.totalAttempts > 0 ? Math.round((pStats.successful / pStats.totalAttempts) * 100) : 100;

    // 2. Queue Depths
    const outboxBacklog = await OutboxEvent.countDocuments({
      status: { $in: ['PENDING', 'FAILED'] },
    });

    const pendingRefunds = await RefundRecord.countDocuments({
      status: { $in: ['pending', 'processing'] },
    });

    const emailQueueDepth = (await emailQueue?.getWaitingCount()) || 0;
    const webhookQueueDepth = (await webhookQueue?.getWaitingCount()) || 0;
    const refundQueueDepth = (await refundQueue?.getWaitingCount()) || 0;

    // 3. Inventory Alerts
    const inventoryAlerts = await Product.aggregate([
      {
        $facet: {
          negativeStock: [{ $match: { stock: { $lt: 0 } } }, { $count: 'count' }],
          lowStock: [
            { $match: { $expr: { $lte: ['$stock', '$lowStockThreshold'] } } },
            { $count: 'count' },
          ],
        },
      },
    ]);
    const negativeStockCount = inventoryAlerts[0]?.negativeStock[0]?.count || 0;
    const lowStockCount = inventoryAlerts[0]?.lowStock[0]?.count || 0;

    return {
      systemHealth: {
        paymentSuccessRate24h: paymentSuccessRate,
        outboxBacklogDepth: outboxBacklog,
        pendingRefundsDepth: pendingRefunds,
        emailQueueDepth,
        webhookQueueDepth,
        refundQueueDepth,
      },
      inventoryAlerts: {
        negativeStockProducts: negativeStockCount,
        lowStockProducts: lowStockCount,
      },
      timestamp: new Date(),
    };
  }
}
