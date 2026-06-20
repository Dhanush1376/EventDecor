import UserInteraction from '../../models/UserInteraction';
import TrendingSnapshot from '../../models/TrendingSnapshot';
import { RecommendationCache } from './recommendationCache';
import logger from '../../config/logger';
import mongoose from 'mongoose';

export interface TrendingItem {
  targetId: string;
  targetType: string;
  score: number;
  velocity: number;
  clickCount: number;
  viewCount: number;
  bookingCount: number;
  wishlistCount: number;
  rank: number;
}

export interface TrendingResult {
  trendingNow: TrendingItem[];
  mostBooked: TrendingItem[];
  popularThisSeason: TrendingItem[];
  topRated: TrendingItem[];
  luxuryTrending: TrendingItem[];
}

/**
 * Calculate trending items for a given target type.
 * Uses velocity-based algorithm: how fast engagement is growing.
 */
export async function calculateTrending(
  targetType: string,
  options: { limit?: number; seasonalContext?: string } = {},
): Promise<TrendingItem[]> {
  const limit = options.limit || 20;
  const now = new Date();
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const prev24h = new Date(now.getTime() - 48 * 60 * 60 * 1000);

  try {
    // Count interactions in last 24h grouped by targetId
    const recentCounts = await UserInteraction.aggregate([
      {
        $match: {
          targetType,
          timestamp: { $gte: last24h },
          eventType: {
            $in: [
              'product_view',
              'product_click',
              'event_view',
              'event_click',
              'gallery_view',
              'gallery_click',
              'showcase_view',
              'wishlist_add',
              'cart_add',
              'purchase',
              'booking',
            ],
          },
        },
      },
      {
        $group: {
          _id: '$targetId',
          totalInteractions: { $sum: 1 },
          clicks: {
            $sum: {
              $cond: [
                { $in: ['$eventType', ['product_click', 'event_click', 'gallery_click']] },
                1,
                0,
              ],
            },
          },
          views: {
            $sum: {
              $cond: [
                {
                  $in: [
                    '$eventType',
                    ['product_view', 'event_view', 'gallery_view', 'showcase_view'],
                  ],
                },
                1,
                0,
              ],
            },
          },
          wishlists: { $sum: { $cond: [{ $eq: ['$eventType', 'wishlist_add'] }, 1, 0] } },
          bookings: { $sum: { $cond: [{ $in: ['$eventType', ['purchase', 'booking']] }, 1, 0] } },
        },
      },
      { $sort: { totalInteractions: -1 } },
      { $limit: limit * 2 }, // Fetch extra to account for velocity filtering
    ]);

    // Count interactions in the previous 24h for velocity calculation
    const previousCounts = await UserInteraction.aggregate([
      {
        $match: {
          targetType,
          timestamp: { $gte: prev24h, $lt: last24h },
          targetId: { $in: recentCounts.map((r) => r._id) },
        },
      },
      {
        $group: {
          _id: '$targetId',
          totalInteractions: { $sum: 1 },
        },
      },
    ]);

    const prevMap = new Map(previousCounts.map((p) => [p._id.toString(), p.totalInteractions]));

    // Calculate velocity and score
    const trendingItems: TrendingItem[] = recentCounts.map((item, _index) => {
      const targetIdStr = item._id.toString();
      const previousTotal = prevMap.get(targetIdStr) || 0;
      const velocity = (item.totalInteractions - previousTotal) / Math.max(previousTotal, 1);

      // Combined score: weighted interaction count + velocity bonus
      const score =
        item.clicks * 3 + item.views * 1 + item.wishlists * 5 + item.bookings * 10 + velocity * 10;

      return {
        targetId: targetIdStr,
        targetType,
        score,
        velocity,
        clickCount: item.clicks,
        viewCount: item.views,
        bookingCount: item.bookings,
        wishlistCount: item.wishlists,
        rank: 0,
      };
    });

    // Sort by score and assign ranks
    trendingItems.sort((a, b) => b.score - a.score);
    trendingItems.forEach((item, idx) => {
      item.rank = idx + 1;
    });

    return trendingItems.slice(0, limit);
  } catch (err: any) {
    logger.error(`[TRENDING ENGINE] Error calculating trending for ${targetType}: ${err.message}`);
    return [];
  }
}

/**
 * Get comprehensive trending feeds for all target types.
 */
export async function getTrendingFeeds(seasonalContext?: string): Promise<TrendingResult> {
  try {
    // Check cache first
    const cached = await RecommendationCache.getTrending('all');
    if (cached) return cached;

    const [products, events, galleries] = await Promise.all([
      calculateTrending('product', { limit: 15, seasonalContext }),
      calculateTrending('event', { limit: 10, seasonalContext }),
      calculateTrending('gallery', { limit: 10, seasonalContext }),
    ]);

    const allItems = [...products, ...events, ...galleries];

    // Sort by different criteria for different feeds
    const trendingNow = [...allItems].sort((a, b) => b.velocity - a.velocity).slice(0, 12);
    const mostBooked = [...allItems].sort((a, b) => b.bookingCount - a.bookingCount).slice(0, 10);

    // Get 30-day most popular for "popular this season"
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const monthlyPopular = await UserInteraction.aggregate([
      {
        $match: {
          timestamp: { $gte: thirtyDaysAgo },
          eventType: {
            $in: [
              'product_view',
              'event_view',
              'gallery_view',
              'purchase',
              'booking',
              'wishlist_add',
            ],
          },
        },
      },
      {
        $group: {
          _id: { targetId: '$targetId', targetType: '$targetType' },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 12 },
    ]);

    const popularThisSeason: TrendingItem[] = monthlyPopular.map((item, idx) => ({
      targetId: item._id.targetId.toString(),
      targetType: item._id.targetType,
      score: item.count,
      velocity: 0,
      clickCount: 0,
      viewCount: item.count,
      bookingCount: 0,
      wishlistCount: 0,
      rank: idx + 1,
    }));

    // Luxury trending: items with high wishlist + booking scores (correlates with premium items)
    const luxuryTrending = [...products]
      .filter((p) => p.wishlistCount + p.bookingCount > 0)
      .sort((a, b) => b.wishlistCount + b.bookingCount * 3 - (a.wishlistCount + a.bookingCount * 3))
      .slice(0, 10);

    const result: TrendingResult = {
      trendingNow,
      mostBooked,
      popularThisSeason,
      topRated: products.slice(0, 10), // Will be enriched with ratings in the orchestrator
      luxuryTrending,
    };

    await RecommendationCache.setTrending('all', result);
    return result;
  } catch (err: any) {
    logger.error(`[TRENDING ENGINE] Error getting trending feeds: ${err.message}`);
    return {
      trendingNow: [],
      mostBooked: [],
      popularThisSeason: [],
      topRated: [],
      luxuryTrending: [],
    };
  }
}

/**
 * Save a trending snapshot for analytics.
 */
export async function saveTrendingSnapshot(
  period: 'hourly' | 'daily' | 'weekly',
  targetType: string,
  seasonalContext: string,
): Promise<void> {
  try {
    const items = await calculateTrending(targetType, { limit: 50 });

    if (items.length === 0) return;

    await TrendingSnapshot.create({
      period,
      targetType: targetType as any,
      rankings: items.map((item) => ({
        targetId: new mongoose.Types.ObjectId(item.targetId),
        score: item.score,
        clickCount: item.clickCount,
        viewCount: item.viewCount,
        bookingCount: item.bookingCount,
        wishlistCount: item.wishlistCount,
        rank: item.rank,
      })),
      seasonalContext,
      snapshotDate: new Date(),
    });

    logger.info(
      `[TRENDING ENGINE] Saved ${period} snapshot for ${targetType} (${items.length} items)`,
    );
  } catch (err: any) {
    logger.error(`[TRENDING ENGINE] Error saving snapshot: ${err.message}`);
  }
}
