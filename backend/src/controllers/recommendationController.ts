import { Request, Response } from 'express';

import { getTrendingFeeds } from '../services/recommendation/trendingEngine';
import {
  getCachedSeasonalContext,
  computeSeasonalBoost,
} from '../services/recommendation/seasonalEngine';
import { getColdStartFeed } from '../services/recommendation/coldStartHandler';
import { RecommendationCache } from '../services/recommendation/recommendationCache';
import Product from '../models/Product';
import Event from '../models/Event';
import logger from '../config/logger';
import { escapeRegex } from '../services/searchService';
import { sanitizeOutputStrings } from '../utils/aiSanitizer';
import mongoose from 'mongoose';
import { recommendationQueue, isQueuesReady } from '../jobs/queues';

// Whitelist of valid target types for parameter validation
const VALID_TARGET_TYPES = new Set(['product', 'event', 'gallery', 'showcase']);

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

    // Cache miss for authenticated user or session
    const trendingFeeds = await getTrendingFeeds().catch(() => null);
    let fallbackItems: any[] = [];
    if (trendingFeeds) {
      fallbackItems =
        page === 'homepage'
          ? trendingFeeds.trendingNow.filter((i: any) => i.targetType !== 'gallery')
          : trendingFeeds.trendingNow;
    }
    if (fallbackItems.length === 0) {
      fallbackItems = await getColdStartFeed({ limit: limit + 5 }).catch(() => []);
    }

    const enrichedFallback = await enrichTrendingItems(fallbackItems.slice(0, limit));
    const seasonal = await getCachedSeasonalContext().catch(() => null);

    // Trigger async personalized recommendation build in background
    if (isQueuesReady()) {
      recommendationQueue
        .add('rebuild-user-feed', { userId, sessionId, page }, { priority: 2 })
        .catch((err: any) => {
          logger.error(`[RECO API] Failed to enqueue rebuild-user-feed: ${err.message}`);
        });
    }

    // Track impression for CTR fallback
    const today = new Date().toISOString().split('T')[0];
    await RecommendationCache.incrementCTR('feed', today, 'impressions');

    res.setHeader('X-Content-Type-Options', 'nosniff');
    return res.status(200).json({
      success: true,
      data: {
        items: sanitizeOutputStrings(enrichedFallback),
        source: 'trending-fallback',
        seasonal,
        isFallback: true,
        fromCache: false,
        pagination: {
          offset,
          limit,
          hasMore: false,
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

    // Validate parameters against whitelists
    if (!VALID_TARGET_TYPES.has(targetType as string)) {
      return res.status(400).json({ success: false, message: 'Invalid targetType' });
    }
    if (!mongoose.Types.ObjectId.isValid(targetId as string)) {
      return res.status(400).json({ success: false, message: 'Invalid targetId format' });
    }

    // Check cache
    const cacheKey = targetType === 'event' ? `event:${targetId as string}` : (targetId as string);
    const cached = await RecommendationCache.getSimilar(cacheKey);

    if (cached) {
      const enriched = await enrichTrendingItems(
        cached.map((item: any) => ({
          targetId: item.targetId,
          targetType: item.targetType,
          score: item.similarityScore,
        })),
      );
      return res.status(200).json({
        success: true,
        data: {
          items: sanitizeOutputStrings(enriched.slice(0, limit)),
          targetType,
          targetId,
          fromCache: true,
        },
      });
    }

    // Cache miss: serve category-based fallback instantly
    let fallbackItems: any[] = [];
    if (targetType === 'product') {
      const product = await Product.findById(targetId).select('category').lean();
      if (product) {
        const products = await Product.find({
          category: product.category,
          _id: { $ne: targetId },
          isActive: true,
        })
          .select('_id title imageSrc category price rating reviews slug rentalEnabled availabilityMode rentalPricing securityDeposit isDepositRefundable')
          .limit(limit)
          .lean();
        fallbackItems = products.map((p) => ({
          _id: p._id.toString(),
          targetType: 'product',
          title: p.title,
          imageSrc: p.imageSrc,
          category: p.category,
          price: p.price,
          rating: p.rating,
          reviews: p.reviews,
          slug: p.slug,
          rentalEnabled: p.rentalEnabled,
          availabilityMode: p.availabilityMode,
          rentalPricing: p.rentalPricing,
          securityDeposit: p.securityDeposit,
          isDepositRefundable: p.isDepositRefundable,
        }));
      }
    } else if (targetType === 'event') {
      const event = await Event.findById(targetId).select('category').lean();
      if (event) {
        const events = await Event.find({
          category: event.category,
          _id: { $ne: targetId },
          isActive: true,
        })
          .select('_id title image category style basePrice')
          .limit(limit)
          .lean();
        fallbackItems = events.map((e) => ({
          _id: e._id.toString(),
          targetType: 'event',
          title: e.title,
          image: e.image,
          category: e.category,
          style: e.style,
          basePrice: e.basePrice,
        }));
      }
    }

    // Trigger background calculation
    if (isQueuesReady()) {
      recommendationQueue
        .add('precompute-similar', { targetType, targetId }, { priority: 4 })
        .catch((err: any) => {
          if (!err.message?.includes('max requests limit exceeded')) {
            logger.error(`[RECO API] Failed to enqueue precompute-similar job: ${err.message}`);
          }
        });
    }

    await RecommendationCache.incrementCTR(
      'similar',
      new Date().toISOString().split('T')[0],
      'impressions',
    );

    res.setHeader('X-Content-Type-Options', 'nosniff');
    return res.status(200).json({
      success: true,
      data: {
        items: sanitizeOutputStrings(fallbackItems),
        targetType,
        targetId,
        isFallback: true,
        fromCache: false,
      },
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

    if (items.length === 0) {
      items = await getColdStartFeed({ limit, targetType }).catch(() => []);
    }

    // Enrich trending items with full data
    const enriched = await enrichTrendingItems(items.slice(0, limit));

    await RecommendationCache.incrementCTR(
      'trending',
      new Date().toISOString().split('T')[0],
      'impressions',
    );

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
        { category: { $in: boostedCategories.map((c) => new RegExp(escapeRegex(c), 'i')) } },
        { tags: { $in: boostedCategories.map((c) => new RegExp(escapeRegex(c), 'i')) } },
      ],
    })
      .select('_id title imageSrc category price rating reviews tags slug rentalEnabled availabilityMode rentalPricing securityDeposit isDepositRefundable')
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
      rentalEnabled: p.rentalEnabled,
      availabilityMode: p.availabilityMode,
      rentalPricing: p.rentalPricing,
      securityDeposit: p.securityDeposit,
      isDepositRefundable: p.isDepositRefundable,
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

    // Check personal feed cache
    const cached = await RecommendationCache.getPersonalFeed(userId, 'for-you');
    if (cached && offset === 0) {
      return res.status(200).json({
        success: true,
        data: {
          items: cached.items || cached,
          source: cached.source || 'personalized',
          fromCache: true,
        },
      });
    }

    // Cache miss: serve fast trending fallback
    const trendingFeeds = await getTrendingFeeds().catch(() => null);
    let fallbackItems: any[] = [];
    if (trendingFeeds) {
      fallbackItems = trendingFeeds.trendingNow;
    } else {
      fallbackItems = await getColdStartFeed({ limit: limit + 5 }).catch(() => []);
    }
    const enrichedFallback = await enrichTrendingItems(fallbackItems.slice(0, limit));

    // Trigger async build in background
    if (isQueuesReady()) {
      recommendationQueue
        .add('rebuild-user-feed', { userId, page: 'for-you' }, { priority: 2 })
        .catch((err: any) => {
          logger.error(
            `[RECO API] Failed to enqueue rebuild-user-feed job for you: ${err.message}`,
          );
        });
    }

    return res.status(200).json({
      success: true,
      data: {
        items: sanitizeOutputStrings(enrichedFallback),
        source: 'trending-fallback',
        isFallback: true,
        fromCache: false,
        pagination: { offset, limit, hasMore: false },
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
    const targetType = (req.query.targetType as string) || 'product';
    const limit = Math.min(parseInt(req.query.limit as string, 10) || 6, 12);

    // Check cache
    const cacheKey = targetType === 'event' ? `event:${targetId}` : targetId;
    const cached = await RecommendationCache.getCompleteSetup(cacheKey as string);
    if (cached) {
      return res
        .status(200)
        .json({ success: true, data: { items: cached.slice(0, limit), fromCache: true } });
    }

    // Cache miss: serve fast fallback
    let fallbackItems: any[] = [];
    if (targetType === 'product') {
      const product = await Product.findById(targetId).select('category').lean();
      if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }

      const fallbackProducts = await Product.find({
        category: product.category,
        _id: { $ne: targetId },
        isActive: true,
      })
        .select('_id title imageSrc category price rating reviews slug rentalEnabled availabilityMode rentalPricing securityDeposit isDepositRefundable')
        .limit(limit)
        .lean();

      fallbackItems = fallbackProducts.map((p) => ({
        _id: p._id.toString(),
        targetType: 'product',
        title: p.title,
        imageSrc: p.imageSrc,
        category: p.category,
        price: p.price,
        rating: p.rating,
        reviews: p.reviews,
        slug: p.slug,
        rentalEnabled: p.rentalEnabled,
        availabilityMode: p.availabilityMode,
        rentalPricing: p.rentalPricing,
        securityDeposit: p.securityDeposit,
        isDepositRefundable: p.isDepositRefundable,
      }));
    } else {
      const event = await Event.findById(targetId).select('category').lean();
      if (!event) {
        return res.status(404).json({ success: false, message: 'Event not found' });
      }

      const fallbackEvents = await Event.find({
        category: event.category,
        _id: { $ne: targetId },
        isActive: true,
      })
        .select('_id title image category style basePrice')
        .limit(limit)
        .lean();

      fallbackItems = fallbackEvents.map((e) => ({
        _id: e._id.toString(),
        targetType: 'event',
        title: e.title,
        image: e.image,
        category: e.category,
        style: e.style,
        basePrice: e.basePrice,
      }));
    }

    // Trigger background precomputation
    if (isQueuesReady()) {
      recommendationQueue
        .add('precompute-similar', { targetType, targetId }, { priority: 4 })
        .catch((err: any) => {
          if (!err.message?.includes('max requests limit exceeded')) {
            logger.error(
              `[RECO API] Failed to enqueue precompute-similar job for setup: ${err.message}`,
            );
          }
        });
    }

    return res.status(200).json({
      success: true,
      data: { items: sanitizeOutputStrings(fallbackItems), isFallback: true, fromCache: false },
    });
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

    // Check cache
    const cached = await RecommendationCache.getAlsoViewed(targetId as string);
    if (cached) {
      return res
        .status(200)
        .json({ success: true, data: { items: cached.slice(0, limit), fromCache: true } });
    }

    // Cache miss: serve fast fallback
    let fallbackItems: any[] = [];
    if (targetType === 'product') {
      const product = await Product.findById(targetId).select('category').lean();
      if (product) {
        const products = await Product.find({
          category: product.category,
          _id: { $ne: targetId },
          isActive: true,
        })
          .select('_id title imageSrc category price rating reviews slug rentalEnabled availabilityMode rentalPricing securityDeposit isDepositRefundable')
          .limit(limit)
          .lean();
        fallbackItems = products.map((p) => ({
          _id: p._id.toString(),
          targetType: 'product',
          title: p.title,
          imageSrc: p.imageSrc,
          category: p.category,
          price: p.price,
          rating: p.rating,
          reviews: p.reviews,
          slug: p.slug,
          rentalEnabled: p.rentalEnabled,
          availabilityMode: p.availabilityMode,
          rentalPricing: p.rentalPricing,
          securityDeposit: p.securityDeposit,
          isDepositRefundable: p.isDepositRefundable,
        }));
      }
    } else {
      const event = await Event.findById(targetId).select('category').lean();
      if (event) {
        const events = await Event.find({
          category: event.category,
          _id: { $ne: targetId },
          isActive: true,
        })
          .select('_id title image category style basePrice')
          .limit(limit)
          .lean();
        fallbackItems = events.map((e) => ({
          _id: e._id.toString(),
          targetType: 'event',
          title: e.title,
          image: e.image,
          category: e.category,
          style: e.style,
          basePrice: e.basePrice,
        }));
      }
    }

    // Trigger background precomputation
    if (isQueuesReady()) {
      recommendationQueue
        .add('precompute-similar', { targetType, targetId }, { priority: 4 })
        .catch((err: any) => {
          if (!err.message?.includes('max requests limit exceeded')) {
            logger.error(
              `[RECO API] Failed to enqueue precompute-similar job for also-viewed: ${err.message}`,
            );
          }
        });
    }

    return res.status(200).json({
      success: true,
      data: { items: sanitizeOutputStrings(fallbackItems), isFallback: true, fromCache: false },
    });
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
          .select('_id title imageSrc category price rating reviews tags slug rentalEnabled availabilityMode rentalPricing securityDeposit isDepositRefundable')
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
        rentalEnabled: full.rentalEnabled,
        availabilityMode: full.availabilityMode,
        rentalPricing: full.rentalPricing,
        securityDeposit: full.securityDeposit,
        isDepositRefundable: full.isDepositRefundable,
      };
    })
    .filter(Boolean);
}
