import mongoose from 'mongoose';
import ReturnRequest from '../../models/ReturnRequest';
import ExchangeRequest from '../../models/ExchangeRequest';
import RefundRecord from '../../models/RefundRecord';
import Order from '../../models/Order';

export class FraudDetectionService {
  /**
   * Evaluates the fraud risk for a new return request.
   */
  static async calculateFraudScore(userId: string, returnRequest: any) {
    let score = 0;

    // 1. High value items (+20)
    if (returnRequest.refundBreakdown?.grandTotal > 20000) {
      score += 20;
    }

    // 2. High return frequency
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentReturns = await ReturnRequest.countDocuments({
      userId,
      createdAt: { $gte: thirtyDaysAgo },
    });

    if (recentReturns >= 5) score += 50;
    else if (recentReturns >= 3) score += 30;
    else if (recentReturns >= 1) score += 10;

    // 3. High return percentage
    const allOrders = await Order.countDocuments({ user: userId });
    const allReturns = await ReturnRequest.countDocuments({ userId });

    if (allOrders > 0) {
      const returnRatio = allReturns / allOrders;
      if (returnRatio > 0.8 && allOrders > 2) score += 40;
      else if (returnRatio > 0.5 && allOrders > 4) score += 20;
    }

    // Cap at 100
    return Math.min(100, score);
  }

  /**
   * Retrieves comprehensive return profile for a user.
   */
  static async getUserReturnProfile(userId: string) {
    const [ordersCount, returnsCount, exchangesCount, refunds] = await Promise.all([
      Order.countDocuments({ user: userId }),
      ReturnRequest.countDocuments({ userId }),
      ExchangeRequest.aggregate([
        {
          $lookup: {
            from: 'returnrequests',
            localField: 'returnRequestId',
            foreignField: '_id',
            as: 'req',
          },
        },
        { $match: { 'req.userId': new mongoose.Types.ObjectId(userId) } },
        { $count: 'count' },
      ]),
      RefundRecord.aggregate([
        { $lookup: { from: 'orders', localField: 'entityId', foreignField: '_id', as: 'order' } },
        { $match: { 'order.user': new mongoose.Types.ObjectId(userId) } },
        { $count: 'count' },
      ]),
    ]);

    const exchanges = exchangesCount[0]?.count || 0;
    const refundCount = refunds[0]?.count || 0;

    const returnPercentage = ordersCount > 0 ? ((returnsCount / ordersCount) * 100).toFixed(1) : 0;

    // Calculate a dynamic fraud score based on historical data
    let fraudScore = 0;
    if (returnsCount > 5) fraudScore += 30;
    if (Number(returnPercentage) > 50 && ordersCount > 3) fraudScore += 40;

    return {
      totalOrders: ordersCount,
      totalReturns: returnsCount,
      totalExchanges: exchanges,
      totalRefunds: refundCount,
      returnPercentage: Number(returnPercentage),
      fraudScore: Math.min(100, fraudScore),
      isVIP: ordersCount > 10 && returnsCount < 2,
    };
  }

  /**
   * Retrieves a list of high-risk customers.
   */
  static async getHighRiskCustomers(limit = 10) {
    // A simplified aggregation to find high-risk customers
    // In a real scenario, this might be pre-calculated in a UserStats collection
    // For now, we'll find users with recent high fraud scores on their returns
    const highRiskUsers = await ReturnRequest.aggregate([
      { $match: { fraudScore: { $gte: 50 } } },
      {
        $group: {
          _id: '$userId',
          maxFraudScore: { $max: '$fraudScore' },
          returnCount: { $sum: 1 },
        },
      },
      { $sort: { maxFraudScore: -1 } },
      { $limit: limit },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      {
        $project: {
          _id: '$user._id',
          name: '$user.name',
          email: '$user.email',
          maxFraudScore: 1,
          returnCount: 1,
        },
      },
    ]);

    // Enhance with full profiles
    const customers = await Promise.all(
      highRiskUsers.map(async (u: any) => {
        const profile = await this.getUserReturnProfile(u._id.toString());
        return {
          ...u,
          ...profile,
        };
      }),
    );

    return customers.sort((a, b) => b.fraudScore - a.fraudScore);
  }

  /**
   * Retrieves fraud alerts based on a threshold.
   */
  static async getFraudAlerts(scoreThreshold = 60) {
    const alerts = await ReturnRequest.find({ fraudScore: { $gte: scoreThreshold } })
      .populate('userId', 'name email phone')
      .populate('orderId', 'orderStatus paymentStatus total')
      .sort({ fraudScore: -1, createdAt: -1 })
      .limit(20);

    return alerts.map((alert) => ({
      _id: alert._id,
      returnId: alert.returnId,
      fraudScore: alert.fraudScore,
      createdAt: alert.createdAt,
      user: alert.userId,
      order: alert.orderId,
      reason: `Return request exceeded fraud threshold (Score: ${alert.fraudScore})`,
    }));
  }

  /**
   * Retrieves aggregate fraud metrics.
   */
  static async getFraudMetrics() {
    const [blockedCount, scoreStats, savedStats] = await Promise.all([
      ReturnRequest.countDocuments({ status: 'rejected', fraudScore: { $gte: 80 } }),
      ReturnRequest.aggregate([
        { $match: { fraudScore: { $gt: 0 } } },
        { $group: { _id: null, avgScore: { $avg: '$fraudScore' } } },
      ]),
      ReturnRequest.aggregate([
        { $match: { status: 'rejected', fraudScore: { $gte: 80 } } },
        { $group: { _id: null, savedRevenue: { $sum: '$refundBreakdown.grandTotal' } } },
      ]),
    ]);

    return {
      totalBlocked: blockedCount,
      avgRiskScore: scoreStats[0]?.avgScore ? Math.round(scoreStats[0].avgScore) : 0,
      savedRevenue: savedStats[0]?.savedRevenue || 0,
    };
  }
}
