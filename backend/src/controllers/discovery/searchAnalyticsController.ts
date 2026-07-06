import { Request, Response } from 'express';
import UserInteraction from '../../models/UserInteraction';
import logger from '../../config/logger';

/**
 * Track frontend search analytics events.
 * Events: search_started, search_typed, suggestion_clicked, search_executed, search_abandoned, filter_used, zero_results
 */
export async function trackSearchEvent(req: Request, res: Response) {
  try {
    const { eventType, query, metadata } = req.body;

    // Using UserInteraction model to store these events
    await UserInteraction.create({
      userId: (req as any).user?._id || (req as any).user?.id || req.body.sessionId || 'anonymous',
      eventType: eventType as any,
      targetId: metadata?.itemId || null,
      targetType: metadata?.itemType || 'search_event',
      metadata: {
        searchQuery: query,
        ...metadata,
      },
    });

    res.status(200).json({ success: true });
  } catch (err: any) {
    logger.error(`[Search Analytics Track] Error: ${err.message}`);
    // Don't fail the frontend request if tracking fails
    res.status(200).json({ success: false, error: 'Tracking failed silently' });
  }
}

/**
 * Get aggregated search analytics for the Admin Dashboard.
 */
export async function getSearchDashboardStats(req: Request, res: Response) {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [totalSearches, zeroResults, topQueries, clicks] = await Promise.all([
      // Total searches executed
      UserInteraction.countDocuments({
        eventType: 'search_executed',
        timestamp: { $gte: cutoff },
      }),
      // Zero result searches
      UserInteraction.countDocuments({
        eventType: 'search_zero_results',
        timestamp: { $gte: cutoff },
      }),
      // Top queries
      UserInteraction.aggregate([
        {
          $match: {
            eventType: { $in: ['search_executed', 'search'] },
            timestamp: { $gte: cutoff },
            'metadata.searchQuery': { $exists: true, $nin: [null, ''] },
          },
        },
        { $group: { _id: { $toLower: '$metadata.searchQuery' }, count: { $sum: 1 } } },
        { $match: { _id: { $not: /^[0-9a-fA-F]{20,}$/ } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      // Suggestion clicks
      UserInteraction.countDocuments({
        eventType: 'search_suggestion_clicked',
        timestamp: { $gte: cutoff },
      }),
    ]);

    const zeroResultRate = totalSearches > 0 ? (zeroResults / totalSearches) * 100 : 0;
    const clickThroughRate = totalSearches > 0 ? (clicks / totalSearches) * 100 : 0;

    res.status(200).json({
      success: true,
      data: {
        totalSearches,
        zeroResultRate,
        clickThroughRate,
        topQueries: topQueries.map((q) => ({ query: q._id, count: q.count })),
        periodDays: days,
      },
    });
  } catch (err: any) {
    logger.error(`[Search Analytics Dashboard] Error: ${err.message}`);
    res.status(500).json({ success: false, message: 'Failed to fetch search analytics dashboard' });
  }
}
