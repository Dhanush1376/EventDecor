import { Request, Response } from 'express';
import { CustomerIntelligenceService } from '../../services/analytics/CustomerIntelligenceService';
import { SearchIntelligenceService } from '../../services/analytics/SearchIntelligenceService';
import { ProductIntelligenceService } from '../../services/analytics/ProductIntelligenceService';
import { MarketingAttributionService } from '../../services/analytics/MarketingAttributionService';
import { FunnelAnalyticsService } from '../../services/analytics/FunnelAnalyticsService';
import { RecommendationEffectivenessService } from '../../services/analytics/RecommendationEffectivenessService';
import { CohortAnalyticsService } from '../../services/analytics/CohortAnalyticsService';
import CustomerNote from '../../models/CustomerNote';
import AnalyticsSnapshot from '../../models/AnalyticsSnapshot';
import User from '../../models/User';
import Order from '../../models/Order';
import logger from '../../config/logger';

/**
 * Parses date range from query parameters
 */
function getDateRange(req: Request) {
  const { startDate, endDate, range } = req.query;
  const end = endDate ? new Date(endDate as string) : new Date();
  const start = startDate ? new Date(startDate as string) : new Date();

  if (!startDate) {
    if (range === '7d') start.setDate(end.getDate() - 7);
    else if (range === '30d') start.setDate(end.getDate() - 30);
    else if (range === '90d') start.setDate(end.getDate() - 90);
    else start.setDate(end.getDate() - 30); // Default 30 days
  }
  return { start, end };
}

export const getOverview = async (req: Request, res: Response) => {
  try {
    const { start, end } = getDateRange(req);
    // In a real scenario, this would aggregate from multiple services or a pre-computed snapshot
    const latestSnapshot = await AnalyticsSnapshot.findOne({ type: 'daily' })
      .sort({ snapshotDate: -1 })
      .lean();

    // Calculate Revenue Trend (group orders by day)
    const revenueTrendRaw = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
          paymentStatus: { $in: ['paid', 'COD Collected'] },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: '$total' },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    const revenueTrend = revenueTrendRaw.map((r) => ({ date: r._id, value: r.revenue }));

    // Calculate Customer Growth (group users by day)
    const customerGrowthRaw = await User.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          users: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Accumulate total customers for growth chart
    let cumulative = await User.countDocuments({ createdAt: { $lt: start } });
    const customerGrowth = customerGrowthRaw.map((g) => {
      cumulative += g.users;
      return { date: g._id, value: cumulative };
    });

    res.status(200).json({
      success: true,
      data: {
        snapshot: latestSnapshot,
        revenueTrend,
        customerGrowth,
      },
    });
  } catch (error) {
    logger.error('Error fetching CI overview', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getExecutiveSummary = async (req: Request, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [todayOrders, monthOrders, latestSnapshot] = await Promise.all([
      Order.aggregate([
        {
          $match: { createdAt: { $gte: today }, paymentStatus: { $in: ['paid', 'COD Collected'] } },
        },
        { $group: { _id: null, revenue: { $sum: '$total' }, count: { $sum: 1 } } },
      ]),
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: firstOfMonth },
            paymentStatus: { $in: ['paid', 'COD Collected'] },
          },
        },
        { $group: { _id: null, revenue: { $sum: '$total' }, count: { $sum: 1 } } },
      ]),
      AnalyticsSnapshot.findOne({ type: 'daily' }).sort({ snapshotDate: -1 }).lean(),
    ]);

    res.status(200).json({
      success: true,
      data: {
        revenueToday: todayOrders[0]?.revenue || 0,
        ordersToday: todayOrders[0]?.count || 0,
        revenueThisMonth: monthOrders[0]?.revenue || 0,
        ordersThisMonth: monthOrders[0]?.count || 0,
        snapshot: latestSnapshot,
      },
    });
  } catch (error) {
    logger.error('Error fetching executive summary', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getCustomerList = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;

    const query: any = { role: { $in: ['user', 'customer'] } };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const customers = await User.find(query)
      .select('name email phone loyaltyTier createdAt lastLogin isVerified')
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const total = await User.countDocuments(query);

    // Attach basic scores (simplified for list view)
    const populatedCustomers = await Promise.all(
      customers.map(async (c) => ({
        ...c,
        health: await CustomerIntelligenceService.getHealthScore(c._id as any),
        engagement: (await CustomerIntelligenceService.getEngagementScore(c._id as any)).score,
      })),
    );

    res.status(200).json({
      success: true,
      data: populatedCustomers,
      meta: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    logger.error('Error fetching customer list', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getCustomer360 = async (req: Request, res: Response) => {
  try {
    const data = await CustomerIntelligenceService.getCustomer360(req.params.id as string);
    res.status(200).json({ success: true, data });
  } catch (error) {
    logger.error('Error fetching Customer 360', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getCustomerJourney = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const sessionId = req.params.sessionId as string;
    const data = await CustomerIntelligenceService.getCustomerJourneyReplay(id, sessionId);
    res.status(200).json({ success: true, data });
  } catch (error) {
    logger.error('Error fetching journey', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getCustomerTimeline = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const skip = parseInt(req.query.skip as string) || 0;
    const limit = parseInt(req.query.limit as string) || 50;
    const filter = (req.query.filter as string) || 'all';

    const data = await CustomerIntelligenceService.getCustomerTimeline(id, { skip, limit, filter });
    res.status(200).json({ success: true, data });
  } catch (error) {
    logger.error('Error fetching customer timeline', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getCustomerMilestones = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const data = await CustomerIntelligenceService.getCustomerLifetimeMilestones(id);
    res.status(200).json({ success: true, data });
  } catch (error) {
    logger.error('Error fetching milestones', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getCustomerCommunications = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const data = await CustomerIntelligenceService.getCustomerCommunicationHistory(id);
    res.status(200).json({ success: true, data });
  } catch (error) {
    logger.error('Error fetching communications', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Admin Notes
export const getCustomerNotes = async (req: Request, res: Response) => {
  try {
    const notes = await CustomerNote.find({ customerId: req.params.id as string }).sort({
      isPinned: -1,
      createdAt: -1,
    });
    res.status(200).json({ success: true, data: notes });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const addCustomerNote = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const note = await CustomerNote.create({
      customerId: req.params.id as string,
      authorId: user?._id,
      authorName: user?.name,
      authorRole: user?.role,
      content: req.body.content,
      tags: req.body.tags || [],
      isPinned: req.body.isPinned || false,
    });
    res.status(201).json({ success: true, data: note });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const updateCustomerNote = async (req: Request, res: Response) => {
  try {
    const note = await CustomerNote.findByIdAndUpdate(req.params.noteId, req.body, { new: true });
    res.status(200).json({ success: true, data: note });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const deleteCustomerNote = async (req: Request, res: Response) => {
  try {
    await CustomerNote.findByIdAndDelete(req.params.noteId);
    res.status(200).json({ success: true, message: 'Note deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Search Intelligence
export const getSearchDashboard = async (req: Request, res: Response) => {
  try {
    const { start, end } = getDateRange(req);
    const data = await SearchIntelligenceService.getSearchDashboard(start, end);
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getSearchIntents = async (req: Request, res: Response) => {
  try {
    const { start, end } = getDateRange(req);
    const data = await SearchIntelligenceService.getSearchIntentBreakdown(start, end);
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Funnel & Attribution
export const getFunnel = async (req: Request, res: Response) => {
  try {
    const { start, end } = getDateRange(req);
    const data = await FunnelAnalyticsService.getConversionFunnel(start, end);
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getAttribution = async (req: Request, res: Response) => {
  try {
    const { start, end } = getDateRange(req);
    const data = await MarketingAttributionService.getAttributionDashboard(start, end);
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getRecommendations = async (req: Request, res: Response) => {
  try {
    const { start, end } = getDateRange(req);
    const data = await RecommendationEffectivenessService.getEffectivenessDashboard(start, end);
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Product Intelligence
export const getProductAffinities = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const data = await ProductIntelligenceService.getProductAffinities(id);
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getCohorts = async (req: Request, res: Response) => {
  try {
    const data = await CohortAnalyticsService.getRFMCohorts();
    res.status(200).json({ success: true, data });
  } catch (error) {
    logger.error('Error fetching cohorts', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
