import { Request, Response } from 'express';
import {
  getPersonalizedRecommendations,
  getSimilarRecommendations,
  RecommendationContext,
} from '../services/recommendation/recommendationEngine';
import { getTrendingFeeds } from '../services/recommendation/trendingEngine';
import { getCachedSeasonalContext, computeSeasonalBoost } from '../services/recommendation/seasonalEngine';
import { getUsersAlsoViewed, getComplementaryItems } from '../services/recommendation/similarityEngine';
import { getColdStartFeed } from '../services/recommendation/coldStartHandler';
import { RecommendationCache } from '../services/recommendation/recommendationCache';
import Product from '../models/Product';
import Event from '../models/Event';
import logger from '../config/logger';

/**
 * GET /recommendations/feed — Personalized homepage feed.
 */
export const getFeed = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || (req as any).user?._id || null;
    const sessionId = req.cookies?.reco_session || null;
    const page = (req.query.page as string) || 'homepage';
    const limit = Math.min(parseInt(req.query.limit as string, 10) || 12, 30);
    const offset = parseInt(req.query.offset as string, 10) || 0;
    const targetType = (req.query.targetType as string) || undefined;

    // Check personal feed cache
    if (userId) {
      const cached = await RecommendationCache.getPersonalFeed(userId, page);
      if (cached && offset === 0) {
        return res.status(200).json({ success: true, data: cached, fromCache: true });
      }
    }

    const ctx: RecommendationContext = {
      userId: userId || undefined,
      sessionId: sessionId || undefined,
      page,
      limit,
      offset,
      targetType,
    };

    const result = await getPersonalizedRecommendations(ctx);

    // Cache for authenticated users
    if (userId && offset === 0) {
      await RecommendationCache.setPersonalFeed(userId, page, result);
    }

    // Track impression for CTR
    const today = new Date().toISOString().split('T')[0];
    await RecommendationCache.incrementCTR('feed', today, 'impressions');

    return res.status(200).json({
      success: true,
      data: {
        items: result.items,
        source: result.source,
        seasonal: result.seasonal,
        pagination: {
          offset,
          limit,
          hasMore: result.items.length === limit,
        },
      },
    });
  } catch (err: any) {
    logger.error(`[RECO API] Error in getFeed: ${err.message}`);
    return res.status(500).json({ success: false, message: 'Failed to load recommendations' });
  }
};

/**
 * GET /recommendations/similar/:targetType/:targetId — Similar items.
 */
export const getSimilar = async (req: Request, res: Response) => {
  try {
    const { targetType, targetId } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string, 10) || 8, 20);

    if (!targetType || !targetId) {
      return res.status(400).json({ success: false, message: 'targetType and targetId required' });
    }

    const items = await getSimilarRecommendations(targetType as any, targetId as any, { limit });

    await RecommendationCache.incrementCTR('similar', new Date().toISOString().split('T')[0], 'impressions');

    return res.status(200).json({
      success: true,
      data: { items, targetType, targetId },
    });
  } catch (err: any) {
    logger.error(`[RECO API] Error in getSimilar: ${err.message}`);
    return res.status(500).json({ success: false, message: 'Failed to load similar items' });
  }
};

/**
 * GET /recommendations/trending — Trending items.
 */
export const getTrending = async (req: Request, res: Response) => {
  try {
    const targetType = (req.query.targetType as string) || undefined;
    const feed = (req.query.feed as string) || 'trendingNow';
    const limit = Math.min(parseInt(req.query.limit as string, 10) || 12, 30);

    const trendingFeeds = await getTrendingFeeds();

    // Select the requested feed
    let items: any[];
    switch (feed) {
      case 'mostBooked':
        items = trendingFeeds.mostBooked;
        break;
      case 'popularThisSeason':
        items = trendingFeeds.popularThisSeason;
        break;
      case 'topRated':
        items = trendingFeeds.topRated;
        break;
      case 'luxuryTrending':
        items = trendingFeeds.luxuryTrending;
        break;
      default:
        items = trendingFeeds.trendingNow;
    }

    // Filter by target type if specified
    if (targetType) {
      items = items.filter((item) => item.targetType === targetType);
    }

    // Enrich trending items with full data
    const enriched = await enrichTrendingItems(items.slice(0, limit));

    await RecommendationCache.incrementCTR('trending', new Date().toISOString().split('T')[0], 'impressions');

    return res.status(200).json({
      success: true,
      data: {
        items: enriched,
        feed,
        count: enriched.length,
      },
    });
  } catch (err: any) {
    logger.error(`[RECO API] Error in getTrending: ${err.message}`);
    return res.status(500).json({ success: false, message: 'Failed to load trending items' });
  }
};

/**
 * GET /recommendations/seasonal — Seasonal recommendations.
 */
export const getSeasonal = async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string, 10) || 12, 30);
    const seasonal = await getCachedSeasonalContext();

    if (!seasonal.isSeasonallyActive) {
      // Fall back to general popular items
      const coldItems = await getColdStartFeed({ limit });
      return res.status(200).json({
        success: true,
        data: {
          items: coldItems,
          seasonal,
          isActive: false,
        },
      });
    }

    // Get items boosted by current season
    const boostedCategories = seasonal.activePeriods.flatMap((p) => p.boostedCategories);

    const seasonalProducts = await Product.find({
      isActive: true,
      $or: [
        { category: { $in: boostedCategories.map((c) => new RegExp(c, 'i')) } },
        { tags: { $in: boostedCategories.map((c) => new RegExp(c, 'i')) } },
      ],
    })
      .select('_id title imageSrc category price rating reviews tags slug')
      .sort({ rating: -1, reviews: -1 })
      .limit(limit)
      .lean();

    const items = seasonalProducts.map((p) => ({
      _id: (p._id as any).toString(),
      targetType: 'product',
      title: p.title,
      imageSrc: p.imageSrc,
      category: p.category,
      price: p.price,
      rating: p.rating,
      reviews: p.reviews,
      tags: p.tags,
      slug: p.slug,
      seasonalBoost: computeSeasonalBoost(p.category, undefined, p.tags, seasonal),
    }));

    return res.status(200).json({
      success: true,
      data: {
        items,
        seasonal,
        isActive: true,
      },
    });
  } catch (err: any) {
    logger.error(`[RECO API] Error in getSeasonal: ${err.message}`);
    return res.status(500).json({ success: false, message: 'Failed to load seasonal items' });
  }
};

/**
 * GET /recommendations/for-you — Deep personalized (auth required).
 */
export const getForYou = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || (req as any).user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const limit = Math.min(parseInt(req.query.limit as string, 10) || 12, 30);
    const offset = parseInt(req.query.offset as string, 10) || 0;

    const result = await getPersonalizedRecommendations({
      userId,
      page: 'for-you',
      limit,
      offset,
    });

    return res.status(200).json({
      success: true,
      data: {
        items: result.items,
        source: result.source,
        pagination: { offset, limit, hasMore: result.items.length === limit },
      },
    });
  } catch (err: any) {
    logger.error(`[RECO API] Error in getForYou: ${err.message}`);
    return res.status(500).json({ success: false, message: 'Failed to load personalized recs' });
  }
};

/**
 * GET /recommendations/complete-setup/:targetId — Complementary items.
 */
export const getCompleteSetup = async (req: Request, res: Response) => {
  try {
    const { targetId } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string, 10) || 6, 12);

    // Get source product's category
    const product = await Product.findById(targetId).select('category').lean();
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const items = await getComplementaryItems(product.category as any, [targetId as any], { limit });

    // Enrich with full product data
    const productIds = items.map((i) => i.targetId);
    const fullProducts = await Product.find({ _id: { $in: productIds }, isActive: true })
      .select('_id title imageSrc category price rating reviews slug')
      .lean();

    const enriched = items.map((item) => {
      const full = fullProducts.find((p) => (p._id as any).toString() === item.targetId);
      return full ? {
        _id: item.targetId,
        targetType: 'product',
        score: item.similarityScore,
        source: 'complete-setup',
        title: full.title,
        imageSrc: full.imageSrc,
        category: full.category,
        price: full.price,
        rating: full.rating,
        reviews: full.reviews,
        slug: full.slug,
      } : null;
    }).filter(Boolean);

    return res.status(200).json({ success: true, data: { items: enriched } });
  } catch (err: any) {
    logger.error(`[RECO API] Error in getCompleteSetup: ${err.message}`);
    return res.status(500).json({ success: false, message: 'Failed to load complementary items' });
  }
};

/**
 * GET /recommendations/also-viewed/:targetId — Users also viewed.
 */
export const getAlsoViewed = async (req: Request, res: Response) => {
  try {
    const { targetId } = req.params;
    const targetType = (req.query.targetType as string) || 'product';
    const limit = Math.min(parseInt(req.query.limit as string, 10) || 8, 15);

    const items = await getUsersAlsoViewed(targetId as any, targetType as any, { limit });

    // Enrich with full data
    const enriched = await enrichTrendingItems(
      items.map((i) => ({ targetId: i.targetId, targetType: i.targetType, score: i.similarityScore }))
    );

    return res.status(200).json({ success: true, data: { items: enriched } });
  } catch (err: any) {
    logger.error(`[RECO API] Error in getAlsoViewed: ${err.message}`);
    return res.status(500).json({ success: false, message: 'Failed to load also-viewed items' });
  }
};

/**
 * Helper: Enrich trending/scored items with full database data.
 */
async function enrichTrendingItems(items: any[]): Promise<any[]> {
  if (items.length === 0) return [];

  const productIds = items.filter((i) => i.targetType === 'product').map((i) => i.targetId);
  const eventIds = items.filter((i) => i.targetType === 'event').map((i) => i.targetId);

  const [products, events] = await Promise.all([
    productIds.length > 0
      ? Product.find({ _id: { $in: productIds }, isActive: true })
          .select('_id title imageSrc category price rating reviews tags slug')
          .lean()
      : Promise.resolve([]),
    eventIds.length > 0
      ? Event.find({ _id: { $in: eventIds }, isActive: true })
          .select('_id title image category style basePrice')
          .lean()
      : Promise.resolve([]),
  ]);

  const dataMap = new Map<string, any>();
  products.forEach((p) => dataMap.set((p._id as any).toString(), { ...p, targetType: 'product' }));
  events.forEach((e) => dataMap.set((e._id as any).toString(), { ...e, targetType: 'event' }));

  return items
    .map((item) => {
      const full = dataMap.get(item.targetId);
      if (!full) return null;
      return {
        _id: item.targetId,
        targetType: full.targetType,
        score: item.score || 0,
        velocity: item.velocity,
        source: 'trending',
        title: full.title,
        imageSrc: full.imageSrc,
        image: full.image,
        category: full.category,
        style: full.style,
        price: full.price,
        basePrice: full.basePrice,
        rating: full.rating,
        reviews: full.reviews,
        tags: full.tags,
        slug: full.slug,
      };
    })
    .filter(Boolean);
}
