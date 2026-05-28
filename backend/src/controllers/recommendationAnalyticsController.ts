import { Request, Response } from 'express';
import UserInteraction from '../models/UserInteraction';
import UserPreferenceProfile from '../models/UserPreferenceProfile';
import TrendingSnapshot from '../models/TrendingSnapshot';
import { RecommendationCache } from '../services/recommendation/recommendationCache';
import logger from '../config/logger';

/**
 * GET /analytics/recommendations/overview — Overall recommendation system stats.
 */
export const getOverview = async (req: Request, res: Response) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalInteractions,
      uniqueUsers,
      activeProfiles,
      interactionsByType,
      interactionsByDay,
    ] = await Promise.all([
      UserInteraction.countDocuments({ timestamp: { $gte: thirtyDaysAgo } }),
      UserInteraction.distinct('userId', { timestamp: { $gte: thirtyDaysAgo }, userId: { $exists: true } }),
      UserPreferenceProfile.countDocuments({}),
      UserInteraction.aggregate([
        { $match: { timestamp: { $gte: thirtyDaysAgo } } },
        { $group: { _id: '$eventType', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      UserInteraction.aggregate([
        { $match: { timestamp: { $gte: thirtyDaysAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        totalInteractions30d: totalInteractions,
        uniqueTrackedUsers: uniqueUsers.length,
        activeProfiles,
        interactionBreakdown: interactionsByType.map((i) => ({
          eventType: i._id,
          count: i.count,
        })),
        interactionsByDay: interactionsByDay.map((d) => ({
          _id: d._id,
          count: d.count,
        })),
        period: '30 days',
      },
    });
  } catch (err: any) {
    logger.error(`[RECO ANALYTICS] Error in getOverview: ${err.message}`);
    return res.status(500).json({ success: false, message: 'Analytics failed' });
  }
};

/**
 * GET /analytics/recommendations/ctr — Click-through rates.
 */
export const getCTR = async (req: Request, res: Response) => {
  try {
    const days = Math.min(parseInt(req.query.days as string, 10) || 7, 30);
    const types = ['feed', 'similar', 'trending', 'seasonal'];
    const results: any[] = [];

    for (let i = 0; i < days; i++) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const dayData: any = { date };

      for (const type of types) {
        const ctr = await RecommendationCache.getCTR(type, date);
        dayData[type] = {
          impressions: ctr.impressions,
          clicks: ctr.clicks,
          ctr: ctr.impressions > 0 ? Math.round((ctr.clicks / ctr.impressions) * 10000) / 100 : 0,
        };
      }

      results.push(dayData);
    }

    return res.status(200).json({
      success: true,
      data: { days: results },
    });
  } catch (err: any) {
    logger.error(`[RECO ANALYTICS] Error in getCTR: ${err.message}`);
    return res.status(500).json({ success: false, message: 'CTR analytics failed' });
  }
};

/**
 * GET /analytics/recommendations/trending-history — Trending history over time.
 */
export const getTrendingHistory = async (req: Request, res: Response) => {
  try {
    const period = (req.query.period as string) || 'daily';
    const targetType = (req.query.targetType as string) || 'product';
    const limit = Math.min(parseInt(req.query.limit as string, 10) || 14, 60);

    const snapshots = await TrendingSnapshot.find({ period: period as any, targetType: targetType as any })
      .sort({ snapshotDate: -1 })
      .limit(limit)
      .lean();

    return res.status(200).json({
      success: true,
      data: {
        snapshots: snapshots.map((s) => ({
          date: s.snapshotDate,
          seasonalContext: s.seasonalContext,
          topItems: s.rankings.slice(0, 10),
        })),
      },
    });
  } catch (err: any) {
    logger.error(`[RECO ANALYTICS] Error in getTrendingHistory: ${err.message}`);
    return res.status(500).json({ success: false, message: 'Trending history failed' });
  }
};

/**
 * GET /analytics/recommendations/user-interests — Aggregated user interest data.
 */
export const getUserInterests = async (req: Request, res: Response) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [categoryInterests, styleInterests] = await Promise.all([
      UserInteraction.aggregate([
        { $match: { timestamp: { $gte: thirtyDaysAgo }, 'metadata.category': { $exists: true, $ne: null } } },
        { $group: { _id: '$metadata.category', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 20 },
      ]),
      UserInteraction.aggregate([
        { $match: { timestamp: { $gte: thirtyDaysAgo }, 'metadata.style': { $exists: true, $ne: null } } },
        { $group: { _id: '$metadata.style', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 15 },
      ]),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        categoryInterests: categoryInterests.map((c) => ({ category: c._id, interactions: c.count })),
        styleInterests: styleInterests.map((s) => ({ style: s._id, interactions: s.count })),
        period: '30 days',
      },
    });
  } catch (err: any) {
    logger.error(`[RECO ANALYTICS] Error in getUserInterests: ${err.message}`);
    return res.status(500).json({ success: false, message: 'User interests failed' });
  }
};

/**
 * GET /analytics/recommendations/seasonal-demand — Seasonal demand analysis.
 */
export const getSeasonalDemand = async (req: Request, res: Response) => {
  try {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    const demandByWeek = await UserInteraction.aggregate([
      { $match: { timestamp: { $gte: ninetyDaysAgo }, 'metadata.category': { $exists: true } } },
      {
        $group: {
          _id: {
            week: { $isoWeek: '$timestamp' },
            year: { $isoWeekYear: '$timestamp' },
            category: '$metadata.category',
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': -1, '_id.week': -1 } },
      { $limit: 200 },
    ]);

    return res.status(200).json({
      success: true,
      data: {
        weeklyDemand: demandByWeek.map((d) => ({
          week: `${d._id.year}-W${String(d._id.week).padStart(2, '0')}`,
          category: d._id.category,
          interactions: d.count,
        })),
        period: '90 days',
      },
    });
  } catch (err: any) {
    logger.error(`[RECO ANALYTICS] Error in getSeasonalDemand: ${err.message}`);
    return res.status(500).json({ success: false, message: 'Seasonal demand failed' });
  }
};

/**
 * GET /analytics/recommendations/conversion-impact — Booking/purchase conversion from recs.
 */
export const getConversionImpact = async (req: Request, res: Response) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [totalConversions, recoConversions] = await Promise.all([
      UserInteraction.countDocuments({
        eventType: { $in: ['purchase', 'booking'] },
        timestamp: { $gte: thirtyDaysAgo },
      }),
      UserInteraction.countDocuments({
        eventType: { $in: ['purchase', 'booking'] },
        'metadata.source': { $in: ['recommendation', 'trending', 'similar', 'seasonal', 'for-you'] },
        timestamp: { $gte: thirtyDaysAgo },
      }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        totalConversions,
        recoAttributedConversions: recoConversions,
        attributionRate: totalConversions > 0
          ? Math.round((recoConversions / totalConversions) * 10000) / 100
          : 0,
        period: '30 days',
      },
    });
  } catch (err: any) {
    logger.error(`[RECO ANALYTICS] Error in getConversionImpact: ${err.message}`);
    return res.status(500).json({ success: false, message: 'Conversion impact failed' });
  }
};
