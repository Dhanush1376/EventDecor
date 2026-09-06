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
import AnalyticsEvent from '../../models/AnalyticsEvent';
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

    const [todayOrders, monthOrders] = await Promise.all([
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
    ]);

    // Live Event Aggregations
    const [activeCustomerSessions, funnelEvents, rawTopSearches, rawTrafficSources] =
      await Promise.all([
        AnalyticsEvent.distinct('sessionId', { timestamp: { $gte: firstOfMonth } }),
        AnalyticsEvent.aggregate([
          {
            $match: {
              timestamp: { $gte: firstOfMonth },
              eventType: { $in: ['checkout_started', 'checkout_completed'] },
            },
          },
          { $group: { _id: '$eventType', count: { $sum: 1 } } },
        ]),
        AnalyticsEvent.aggregate([
          {
            $match: {
              timestamp: { $gte: firstOfMonth },
              eventType: 'search_bar_use',
              'metadata.searchQuery': { $exists: true },
            },
          },
          { $group: { _id: '$metadata.searchQuery', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 5 },
          { $project: { _id: 0, query: '$_id', count: 1 } },
        ]),
        AnalyticsEvent.aggregate([
          { $match: { timestamp: { $gte: firstOfMonth }, eventType: 'page_view' } },
          { $group: { _id: '$metadata.referralChannel', visitors: { $addToSet: '$sessionId' } } },
          {
            $project: {
              _id: 0,
              channel: { $ifNull: ['$_id', 'Direct'] },
              visitors: { $size: '$visitors' },
            },
          },
          { $sort: { visitors: -1 } },
          { $limit: 5 },
        ]),
      ]);

    // Funnel Math
    let checkoutStarted = 0;
    let checkoutCompleted = 0;
    funnelEvents.forEach((e: any) => {
      if (e._id === 'checkout_started') checkoutStarted = e.count;
      if (e._id === 'checkout_completed') checkoutCompleted = e.count;
    });

    const cartAbandonmentRate =
      checkoutStarted > 0 ? ((checkoutStarted - checkoutCompleted) / checkoutStarted) * 100 : 0;
    const checkoutCompletionRate =
      checkoutStarted > 0 ? (checkoutCompleted / checkoutStarted) * 100 : 0;

    const activeCustomers = activeCustomerSessions.length;

    // AI Insights Engine
    const aiInsights = [];
    if (cartAbandonmentRate > 70) {
      aiInsights.push({
        type: 'cart_health',
        message: `Cart abandonment is high at ${cartAbandonmentRate.toFixed(1)}%. Consider enabling automated recovery emails.`,
        severity: 'warning',
      });
    } else {
      aiInsights.push({
        type: 'cart_health',
        message: `Checkout completion is solid at ${checkoutCompletionRate.toFixed(1)}%.`,
        severity: 'positive',
      });
    }

    if (todayOrders[0]?.count > 0) {
      aiInsights.push({
        type: 'sales_velocity',
        message: `${todayOrders[0].count} orders processed today. Fulfillment operations are active.`,
        severity: 'info',
      });
    } else {
      aiInsights.push({
        type: 'sales_velocity',
        message: `No orders yet today. Monitor traffic sources to ensure campaigns are running.`,
        severity: 'warning',
      });
    }

    if (rawTrafficSources.length > 0 && rawTrafficSources[0].channel === 'Direct') {
      aiInsights.push({
        type: 'acquisition',
        message: `Direct traffic is your top acquisition channel. Keep nurturing your core audience.`,
        severity: 'positive',
      });
    }

    // Assemble the dynamic snapshot
    const dynamicSnapshot = {
      metrics: {
        activeCustomers,
        cartAbandonmentRate,
        checkoutCompletionRate,
        aiInsights,
        topSearches: rawTopSearches,
        trafficSources: rawTrafficSources,
      },
    };

    res.status(200).json({
      success: true,
      data: {
        revenueToday: todayOrders[0]?.revenue || 0,
        ordersToday: todayOrders[0]?.count || 0,
        revenueThisMonth: monthOrders[0]?.revenue || 0,
        ordersThisMonth: monthOrders[0]?.count || 0,
        snapshot: dynamicSnapshot,
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
    const sortField = (req.query.sortBy as string) || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

    // Filters
    const tier = req.query.tier as string;
    const status = req.query.status as string;

    const query: any = { role: { $in: ['user', 'customer'] } };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    if (tier && tier !== 'All') {
      query.loyaltyTier = tier;
    }

    if (status === 'Verified') {
      query.isVerified = true;
    } else if (status === 'Unverified') {
      query.isVerified = false;
    }

    const sortOptions: any = {};
    sortOptions[sortField] = sortOrder;

    const customers = await User.find(query)
      .select(
        'name email phone loyaltyTier createdAt lastLogin isVerified walletBalance siriCoins addresses',
      )
      .sort(sortOptions)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const total = await User.countDocuments(query);

    const populatedCustomers = await Promise.all(
      customers.map(async (c: any) => {
        try {
          const overview = await CustomerIntelligenceService.getCustomer360(c._id.toString());
          return {
            ...c,
            totalSpent: overview?.overview?.totalSpent || 0,
            orders: overview?.overview?.totalOrders || 0,
            segment:
              overview?.identity?.loyaltyTier === 'Platinum'
                ? 'VIP'
                : overview?.overview?.totalOrders > 0
                  ? 'Regular'
                  : 'New',
            lastOrder: overview?.overview?.totalOrders > 0 ? overview.overview.totalSpent : null,
            health: overview?.scores?.health || 'Unknown',
            city: c.addresses && c.addresses.length > 0 ? c.addresses[0].city : 'Unknown',
          };
        } catch (_err) {
          // Fallback if 360 fails for a user (e.g. missing data)
          return {
            ...c,
            totalSpent: 0,
            orders: 0,
            segment: 'Unknown',
            lastOrder: null,
            health: 'Unknown',
            city: 'Unknown',
          };
        }
      }),
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

export const exportCustomers = async (req: Request, res: Response) => {
  try {
    const search = req.query.search as string;
    const tier = req.query.tier as string;

    const query: any = { role: { $in: ['user', 'customer'] } };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }
    if (tier && tier !== 'All') {
      query.loyaltyTier = tier;
    }

    const customers = await User.find(query)
      .select('name email phone loyaltyTier createdAt isVerified walletBalance siriCoins')
      .sort({ createdAt: -1 })
      .lean();

    const populatedCustomers = await Promise.all(
      customers.map(async (c: any) => {
        try {
          const overview = await CustomerIntelligenceService.getCustomer360(c._id.toString());
          return {
            Name: c.name,
            Email: c.email || '',
            Phone: c.phone || '',
            Orders: overview?.overview?.totalOrders || 0,
            Spent: overview?.overview?.totalSpent || 0,
            Tier: c.loyaltyTier || 'Bronze',
            Joined: c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '',
          };
        } catch (_err) {
          return {
            Name: c.name,
            Email: c.email || '',
            Phone: c.phone || '',
            Orders: 0,
            Spent: 0,
            Tier: c.loyaltyTier || 'Bronze',
            Joined: c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '',
          };
        }
      }),
    );

    res.status(200).json({
      success: true,
      data: populatedCustomers,
    });
  } catch (error) {
    logger.error('Error exporting customers', error);
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
    // eslint-disable-next-line unused-imports/no-unused-vars
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
    // eslint-disable-next-line unused-imports/no-unused-vars
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const updateCustomerNote = async (req: Request, res: Response) => {
  try {
    const note = await CustomerNote.findByIdAndUpdate(req.params.noteId, req.body, { new: true });
    res.status(200).json({ success: true, data: note });
    // eslint-disable-next-line unused-imports/no-unused-vars
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const deleteCustomerNote = async (req: Request, res: Response) => {
  try {
    await CustomerNote.findByIdAndDelete(req.params.noteId);
    res.status(200).json({ success: true, message: 'Note deleted' });
    // eslint-disable-next-line unused-imports/no-unused-vars
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
    // eslint-disable-next-line unused-imports/no-unused-vars
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getSearchIntents = async (req: Request, res: Response) => {
  try {
    const { start, end } = getDateRange(req);
    const data = await SearchIntelligenceService.getSearchIntentBreakdown(start, end);
    res.status(200).json({ success: true, data });
    // eslint-disable-next-line unused-imports/no-unused-vars
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
    // eslint-disable-next-line unused-imports/no-unused-vars
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getAttribution = async (req: Request, res: Response) => {
  try {
    const { start, end } = getDateRange(req);
    const data = await MarketingAttributionService.getAttributionDashboard(start, end);
    res.status(200).json({ success: true, data });
    // eslint-disable-next-line unused-imports/no-unused-vars
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getRecommendations = async (req: Request, res: Response) => {
  try {
    const { start, end } = getDateRange(req);
    const data = await RecommendationEffectivenessService.getEffectivenessDashboard(start, end);
    res.status(200).json({ success: true, data });
    // eslint-disable-next-line unused-imports/no-unused-vars
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
    // eslint-disable-next-line unused-imports/no-unused-vars
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

export const deleteCustomer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    // Protect administrative accounts from deletion via customer page
    if (!['user', 'customer'].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete staff or admin accounts through customer management.',
      });
    }

    // Soft-delete the customer document, automatically moving them to RecycleBin
    const actor = (req as any).user;
    await (user as any).softDelete(
      actor,
      reason || `Customer soft-deleted by admin ${actor?.email || actor?.id || ''}`,
    );

    logger.info(`Customer ${user.name} (${user._id}) soft-deleted and moved to RecycleBin`);

    res.status(200).json({
      success: true,
      message: 'Customer moved to recycle bin successfully',
      data: { customerId: id },
    });
  } catch (error: any) {
    logger.error('Error soft-deleting customer', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to delete customer' });
  }
};
