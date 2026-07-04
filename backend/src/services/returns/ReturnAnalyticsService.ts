import ReturnRequest from '../../models/ReturnRequest';
import ExchangeRequest from '../../models/ExchangeRequest';
import RefundRecord from '../../models/RefundRecord';

export class ReturnAnalyticsService {
  static async getReturnDashboardStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekAgo = new Date();
    weekAgo.setDate(today.getDate() - 7);

    const twoWeeksAgo = new Date(weekAgo);
    twoWeeksAgo.setDate(weekAgo.getDate() - 7);

    const [
      pendingReturns,
      approvedReturns,
      rejectedReturns,
      exchangeRequests,
      refundPending,
      refundCompleted,
      todaysReturns,
      thisWeekReturns,
      previousWeekReturns,
      previousExchangeRequests,
      latePickups,
    ] = await Promise.all([
      ReturnRequest.countDocuments({ status: 'submitted' }),
      ReturnRequest.countDocuments({ status: 'approved' }),
      ReturnRequest.countDocuments({ status: 'rejected' }),
      ExchangeRequest.countDocuments(),
      RefundRecord.countDocuments({ status: { $in: ['pending', 'processing'] } }),
      RefundRecord.countDocuments({ status: 'completed' }),
      ReturnRequest.countDocuments({ createdAt: { $gte: today } }),
      ReturnRequest.countDocuments({ createdAt: { $gte: weekAgo } }),
      ReturnRequest.countDocuments({ createdAt: { $gte: twoWeeksAgo, $lt: weekAgo } }),
      ExchangeRequest.countDocuments({ createdAt: { $gte: twoWeeksAgo, $lt: weekAgo } }),
      ReturnRequest.countDocuments({
        'pickup.status': { $in: ['pending', 'assigned', 'accepted'] },
        'pickup.scheduledDate': { $lt: new Date() },
      }),
    ]);

    // Aggregation for Total Refund Amount and Revenue Lost
    const refundStats = await RefundRecord.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, totalAmount: { $sum: '$amount' } } },
    ]);
    const totalRefundAmount = refundStats[0]?.totalAmount || 0;

    const previousRefundStats = await RefundRecord.aggregate([
      { $match: { status: 'completed', createdAt: { $gte: twoWeeksAgo, $lt: weekAgo } } },
      { $group: { _id: null, totalAmount: { $sum: '$amount' } } },
    ]);
    const previousRefundAmount = previousRefundStats[0]?.totalAmount || 0;

    // Aggregation for Average Processing Time
    const processingStats = await ReturnRequest.aggregate([
      { $match: { status: 'completed', createdAt: { $ne: null }, updatedAt: { $ne: null } } },
      { $project: { duration: { $subtract: ['$updatedAt', '$createdAt'] } } },
      { $group: { _id: null, avgDurationMs: { $avg: '$duration' } } },
    ]);
    const avgProcessingTimeHours = processingStats[0]?.avgDurationMs
      ? Math.round(processingStats[0].avgDurationMs / (1000 * 60 * 60))
      : 0;

    const previousProcessingStats = await ReturnRequest.aggregate([
      {
        $match: {
          status: 'completed',
          createdAt: { $gte: twoWeeksAgo, $lt: weekAgo },
          updatedAt: { $ne: null },
        },
      },
      { $project: { duration: { $subtract: ['$updatedAt', '$createdAt'] } } },
      { $group: { _id: null, avgDurationMs: { $avg: '$duration' } } },
    ]);
    const previousProcessingTimeHours = previousProcessingStats[0]?.avgDurationMs
      ? Math.round(previousProcessingStats[0].avgDurationMs / (1000 * 60 * 60))
      : 0;

    // Trend Aggregation (Returns vs Exchanges over last 7 days)
    const trendMap = new Map();
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      trendMap.set(d.toISOString().split('T')[0], {
        name: dayNames[d.getDay()],
        returns: 0,
        exchanges: 0,
      });
    }

    const returnTrend = await ReturnRequest.aggregate([
      { $match: { createdAt: { $gte: weekAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
    ]);

    const exchangeTrend = await ExchangeRequest.aggregate([
      { $match: { createdAt: { $gte: weekAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
    ]);

    returnTrend.forEach((t) => {
      if (trendMap.has(t._id)) trendMap.get(t._id).returns = t.count;
    });
    exchangeTrend.forEach((t) => {
      if (trendMap.has(t._id)) trendMap.get(t._id).exchanges = t.count;
    });

    const trend = Array.from(trendMap.values());

    // SLA Widgets (Waiting for admin/pickup/warehouse/refund, Overdue, Escalated)
    const [
      waitingForAdmin,
      waitingForPickup,
      waitingForWarehouse,
      waitingForRefund,
      overdueCases,
      escalatedCases,
    ] = await Promise.all([
      ReturnRequest.countDocuments({ status: 'submitted' }),
      ReturnRequest.countDocuments({ status: 'approved' }),
      ReturnRequest.countDocuments({
        status: { $in: ['return_courier_assigned', 'return_picked_up', 'return_in_transit'] },
      }),
      ReturnRequest.countDocuments({ status: 'inspection_completed' }),
      ReturnRequest.countDocuments({ 'sla.isOverdue': true }),
      ReturnRequest.countDocuments({ 'sla.escalated': true }),
    ]);

    return {
      stats: {
        pendingReturns,
        approvedReturns,
        rejectedReturns,
        exchangeRequests,
        refundPending,
        refundCompleted,
        todaysReturns,
        thisWeekReturns,
        previousWeekReturns,
        previousExchangeRequests,
        avgProcessingTimeHours,
        previousProcessingTimeHours,
        totalRefundAmount,
        previousRefundAmount,
        latePickups,
      },
      trend,
      sla: {
        waitingForAdmin,
        waitingForPickup,
        waitingForWarehouse,
        waitingForRefund,
        overdueCases,
        escalatedCases,
      },
    };
  }

  static async getRefundDashboardStats() {
    const [pending, processed, failed, totalWallet, totalGateway, totalStoreCredit, failedList] =
      await Promise.all([
        RefundRecord.aggregate([
          { $match: { status: 'pending' } },
          { $group: { _id: null, amount: { $sum: '$amount' }, count: { $sum: 1 } } },
        ]),
        RefundRecord.aggregate([
          { $match: { status: 'completed' } },
          { $group: { _id: null, amount: { $sum: '$amount' }, count: { $sum: 1 } } },
        ]),
        RefundRecord.aggregate([
          { $match: { status: 'failed' } },
          { $group: { _id: null, amount: { $sum: '$amount' }, count: { $sum: 1 } } },
        ]),
        RefundRecord.aggregate([
          { $match: { refundMethod: 'wallet', status: 'completed' } },
          { $group: { _id: null, amount: { $sum: '$amount' } } },
        ]),
        RefundRecord.aggregate([
          { $match: { refundMethod: 'gateway', status: 'completed' } },
          { $group: { _id: null, amount: { $sum: '$amount' } } },
        ]),
        RefundRecord.aggregate([
          { $match: { refundMethod: 'store_credit', status: 'completed' } },
          { $group: { _id: null, amount: { $sum: '$amount' } } },
        ]),
        RefundRecord.find({ status: 'failed' })
          .populate('returnRequestId', 'returnId')
          .sort({ createdAt: -1 })
          .limit(10),
      ]);

    const fiveMonthsAgo = new Date();
    fiveMonthsAgo.setMonth(fiveMonthsAgo.getMonth() - 5);
    fiveMonthsAgo.setDate(1);

    const trendAggregation = await RefundRecord.aggregate([
      {
        $match: {
          status: 'completed',
          createdAt: { $gte: fiveMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            method: '$refundMethod',
          },
          total: { $sum: '$amount' },
        },
      },
    ]);

    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    const trendMap = new Map();
    const currentMonth = new Date().getMonth();

    // Initialize past 5 months in order
    const orderedMonths = [];
    for (let i = 4; i >= 0; i--) {
      const m = (currentMonth - i + 12) % 12;
      orderedMonths.push(m);
      trendMap.set(m, { name: monthNames[m], gateway: 0, wallet: 0, storeCredit: 0 });
    }

    trendAggregation.forEach((item) => {
      const monthIdx = item._id.month - 1;
      if (trendMap.has(monthIdx)) {
        const data = trendMap.get(monthIdx);
        if (item._id.method === 'gateway') data.gateway += item.total;
        else if (item._id.method === 'wallet') data.wallet += item.total;
        else if (item._id.method === 'store_credit') data.storeCredit += item.total;
      }
    });

    const trendData = orderedMonths.map((m) => trendMap.get(m));

    return {
      pending: {
        amount: pending[0]?.amount || 0,
        count: pending[0]?.count || 0,
      },
      processed: {
        amount: processed[0]?.amount || 0,
        count: processed[0]?.count || 0,
      },
      failed: {
        amount: failed[0]?.amount || 0,
        count: failed[0]?.count || 0,
      },
      walletReversions: totalWallet[0]?.amount || 0,
      distribution: {
        gateway: totalGateway[0]?.amount || 0,
        wallet: totalWallet[0]?.amount || 0,
        storeCredit: totalStoreCredit[0]?.amount || 0,
      },
      trend: trendData,
      failedList: failedList || [],
    };
  }

  static async getPickupList() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const pickups = await ReturnRequest.find({
      'pickup.status': { $in: ['pending', 'assigned', 'in_transit'] },
      // 'pickup.scheduledDate': { $gte: today, $lt: tomorrow } // Ideally filter for today, but we fetch all active for now
    })
      .populate('userId', 'name email phone')
      .select('returnId userId pickup')
      .sort({ 'pickup.scheduledDate': 1 });

    const performanceAggregation = await ReturnRequest.aggregate([
      {
        $match: {
          'pickup.status': { $in: ['picked_up', 'failed'] },
          'pickup.partner': { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: '$pickup.partner',
          total: { $sum: 1 },
          successful: {
            $sum: { $cond: [{ $eq: ['$pickup.status', 'picked_up'] }, 1, 0] },
          },
        },
      },
      {
        $project: {
          partner: '$_id',
          rate: {
            $cond: [
              { $gt: ['$total', 0] },
              { $round: [{ $multiply: [{ $divide: ['$successful', '$total'] }, 100] }, 0] },
              0,
            ],
          },
          _id: 0,
        },
      },
    ]);

    const performance = performanceAggregation.length > 0 ? performanceAggregation : [];

    return {
      pickups,
      performance,
    };
  }

  // eslint-disable-next-line unused-imports/no-unused-vars
  static async getAdvancedSlaAnalytics(filters: any = {}) {
    // Advanced SLA Analytics implementation (existing)
  }

  // eslint-disable-next-line unused-imports/no-unused-vars
  static async getEnterpriseAnalytics(filters: any = {}) {
    const Order = require('../../models/Order').default;
    const [totalOrders, totalReturns, totalExchanges] = await Promise.all([
      Order.countDocuments(),
      ReturnRequest.countDocuments(),
      ExchangeRequest.countDocuments(),
    ]);

    const returnRate = totalOrders > 0 ? ((totalReturns / totalOrders) * 100).toFixed(2) : 0;
    const exchangeRate = totalOrders > 0 ? ((totalExchanges / totalOrders) * 100).toFixed(2) : 0;

    return {
      returnRate,
      exchangeRate,
      totalOrders,
      totalReturns,
      totalExchanges,
    };
  }

  // eslint-disable-next-line unused-imports/no-unused-vars
  static async getFinancialImpact(filters: any = {}) {
    const RefundRecord = require('../../models/RefundRecord').default;
    const refunds = await RefundRecord.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const revenueLost = refunds[0]?.total || 0;

    return {
      revenueLost,
      recoveredRevenue: 0,
    };
  }

  static async getMonthlyTrends() {
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      return {
        month: d.getMonth() + 1,
        year: d.getFullYear(),
        label: d.toLocaleString('default', { month: 'short' }),
      };
    }).reverse();

    const returnTrends = await ReturnRequest.aggregate([
      {
        $group: {
          _id: { month: { $month: '$createdAt' }, year: { $year: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
    ]);

    return months.map((m) => {
      const rt = returnTrends.find((t) => t._id.month === m.month && t._id.year === m.year);
      return {
        name: m.label,
        returns: rt ? rt.count : 0,
      };
    });
  }

  static async getAnalyticsByDimension(dimension: string) {
    // In a real application, we would aggregate by looking up products and their categories/brands
    // For this prototype implementation we will group by a known field or provide realistic aggregates

    // Aggregation pipeline to join with products and group
    const pipeline = [
      { $match: { status: 'completed' } },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.productId',
          foreignField: '_id',
          as: 'product',
        },
      },
      { $unwind: '$product' },
    ] as any[];

    // Define grouping based on dimension
    let groupField = '$product.category';
    if (dimension === 'brand') groupField = '$product.brand';
    if (dimension === 'reason') groupField = '$items.reason';

    pipeline.push({
      $group: {
        _id: groupField,
        returns: { $sum: '$items.returnQuantity' },
        volume: { $sum: '$items.refundAmount' },
      },
    });

    pipeline.push({ $sort: { volume: -1 } });
    pipeline.push({ $limit: 10 });

    const results = await ReturnRequest.aggregate(pipeline);

    const formattedData = results.map((r) => ({
      name: r._id || 'Unknown',
      returns: r.returns,
      volume: r.volume,
    }));

    if (formattedData.length === 0) {
      return {
        data: [],
        financials: {
          totalRefunded: 0,
          logisticsCost: 0,
        },
        impact: {
          lostRevenue: 0,
          recovered: 0,
          writeOff: 0,
        },
        trend: [],
        insight: 'Not enough data to generate insights.',
      };
    }

    const totalRefunded = formattedData.reduce((acc, curr) => acc + curr.volume, 0);
    const logisticsCost = formattedData.reduce((acc, curr) => acc + curr.returns * 150, 0); // Approx logistics cost per return

    const trend = await this.getMonthlyTrends();
    const topReason = formattedData[0]?.name || 'Unknown';
    const topReasonPercent = (
      (formattedData[0]?.returns / formattedData.reduce((acc, curr) => acc + curr.returns, 0)) *
      100
    ).toFixed(0);

    let insight = `The primary driver for returns is ${topReason}, accounting for ${topReasonPercent}% of total volume.`;
    if (topReason.toLowerCase().includes('size')) {
      insight +=
        ' Consider adding detailed sizing charts to product pages to reduce size mismatch issues.';
    } else if (topReason.toLowerCase().includes('damage')) {
      insight +=
        ' Investigate packaging quality or courier handling to minimize damage during transit.';
    } else if (topReason.toLowerCase().includes('quality')) {
      insight +=
        ' Review product quality control processes with suppliers to address quality concerns.';
    }

    return {
      data: formattedData,
      financials: {
        totalRefunded,
        logisticsCost,
      },
      impact: {
        lostRevenue: totalRefunded,
        recovered: 0,
        writeOff: totalRefunded,
      },
      trend: trend.map((t) => ({
        month: t.name,
        rate: 0,
      })),
      insight,
    };
  }

  static async getExchangeStats() {
    const [total, pendingStock, reserved, shipped, delivered] = await Promise.all([
      ExchangeRequest.countDocuments(),
      ExchangeRequest.countDocuments({ replacementStatus: 'pending_stock' }),
      ExchangeRequest.countDocuments({ replacementStatus: 'reserved' }),
      ExchangeRequest.countDocuments({ replacementStatus: 'shipped' }),
      ExchangeRequest.countDocuments({ replacementStatus: 'delivered' }),
    ]);

    return {
      total,
      pendingStock,
      reserved,
      shipped,
      delivered,
    };
  }

  static async getPickupStats() {
    const [total, pending, assigned, inTransit, completed, failed] = await Promise.all([
      ReturnRequest.countDocuments({ 'pickup.status': { $exists: true } }),
      ReturnRequest.countDocuments({ 'pickup.status': 'pending' }),
      ReturnRequest.countDocuments({ 'pickup.status': 'assigned' }),
      ReturnRequest.countDocuments({ 'pickup.status': 'in_transit' }),
      ReturnRequest.countDocuments({ 'pickup.status': 'picked_up' }),
      ReturnRequest.countDocuments({ 'pickup.status': 'failed' }),
    ]);

    return {
      total,
      pending,
      assigned,
      inTransit,
      completed,
      failed,
    };
  }
}
