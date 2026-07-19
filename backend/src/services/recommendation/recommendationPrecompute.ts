import Product from '../../models/Product';
import Event from '../../models/Event';
import UserInteraction from '../../models/UserInteraction';
import { getCachedSeasonalContext } from './seasonalEngine';
import {
  findSimilarProducts,
  findSimilarEvents,
  getUsersAlsoViewed,
  getComplementaryItems,
} from './similarityEngine';
import { getColdStartFeed } from './coldStartHandler';
import { RecommendationCache } from './recommendationCache';
import logger from '../../config/logger';
import { getPersonalizedRecommendations, enrichScoredItems } from './recommendationServing';

/**
 * Precompute similar, also viewed, and complementary items for all active catalog items.
 */
export async function precomputeCatalogRecommendations(): Promise<void> {
  try {
    const products = await Product.find({ isActive: true }).select('_id primaryCategory').lean();
    const events = await Event.find({ isActive: true }).select('_id style').lean();

    logger.info(
      `[RECO ENGINE] Starting precomputation for ${products.length} products and ${events.length} events...`,
    );

    let count = 0;

    // 1. Similar Products and Complete the Setup
    for (const p of products) {
      const productId = (p._id as any).toString();

      // Similar products
      await findSimilarProducts(productId, { limit: 12 });

      // Complete setup (complementary)
      const compItems = await getComplementaryItems(
        p.primaryCategory?.toString() || '',
        [productId],
        { limit: 8 },
      );
      const productIds = compItems.map((i) => i.targetId);
      const fullProducts = await Product.find({ _id: { $in: productIds }, isActive: true })
        .select(
          '_id title imageSrc primaryCategory price oldPrice strikingPrice mrp originalPrice rating reviews slug rentalEnabled availabilityMode rentalPricing securityDeposit isDepositRefundable',
        )
        .populate('primaryCategory', 'name')
        .lean();

      const enrichedComp = compItems
        .map((item) => {
          const full = fullProducts.find((prod) => (prod._id as any).toString() === item.targetId);
          return full
            ? {
                _id: item.targetId,
                targetType: 'product',
                score: item.similarityScore,
                source: 'complete-setup',
                title: full.title,
                imageSrc: full.imageSrc,
                primaryCategory: full.primaryCategory,
                price: full.price,
                rating: full.rating,
                reviews: full.reviews,
                slug: full.slug,
                rentalEnabled: full.rentalEnabled,
                availabilityMode: full.availabilityMode,
                rentalPricing: full.rentalPricing,
                securityDeposit: full.securityDeposit,
                isDepositRefundable: full.isDepositRefundable,
              }
            : null;
        })
        .filter(Boolean);

      await RecommendationCache.setCompleteSetup(productId, enrichedComp);

      // Users also viewed
      const alsoViewed = await getUsersAlsoViewed(productId, 'product', { limit: 12 });
      const enrichedAlsoViewed = await enrichScoredItems(
        alsoViewed.map((i) => ({
          targetId: i.targetId,
          targetType: i.targetType,
          score: i.similarityScore,
        })),
      );
      await RecommendationCache.setAlsoViewed(productId, enrichedAlsoViewed);

      count++;
    }

    // 2. Similar Events
    for (const e of events) {
      const eventId = (e._id as any).toString();
      await findSimilarEvents(eventId, { limit: 8 });

      const alsoViewed = await getUsersAlsoViewed(eventId, 'event', { limit: 8 });
      const enrichedAlsoViewed = await enrichScoredItems(
        alsoViewed.map((i) => ({
          targetId: i.targetId,
          targetType: i.targetType,
          score: i.similarityScore,
        })),
      );
      await RecommendationCache.setAlsoViewed(eventId, enrichedAlsoViewed);

      count++;
    }

    logger.info(`[RECO ENGINE] Precomputation complete. Processed ${count} items.`);
  } catch (err: any) {
    logger.error(`[RECO ENGINE] Error during catalog precomputation: ${err.message}`);
  }
}

/**
 * Precompute personalized feeds for active users (active in the last 7 days).
 */
export async function precomputeActiveUsersFeeds(): Promise<number> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  try {
    const activeUserIds = await UserInteraction.distinct('userId', {
      userId: { $exists: true },
      timestamp: { $gte: sevenDaysAgo },
    });

    if (activeUserIds.length === 0) return 0;

    logger.info(`[RECO ENGINE] Precomputing feeds for ${activeUserIds.length} active users...`);

    const { rebuildUserProfile } = require('./userProfileBuilder');

    let count = 0;
    const pages = ['homepage', 'for-you', 'style', 'trending'];
    for (const userId of activeUserIds) {
      if (!userId) continue;

      await rebuildUserProfile(userId.toString());

      for (const page of pages) {
        const result = await getPersonalizedRecommendations({
          userId: userId.toString(),
          page,
          limit: 12,
          offset: 0,
        });
        await RecommendationCache.setPersonalFeed(userId.toString(), page, result);
      }
      count++;

      if (count >= 50) {
        // Limit to top 50 active users to avoid overloading on batch cron runs
        logger.info('[RECO ENGINE] Cap of 50 active users reached for feed precomputation.');
        break;
      }
    }
    logger.info(`[RECO ENGINE] Precomputed feeds for ${count} users.`);
    return count;
  } catch (err: any) {
    logger.error(`[RECO ENGINE] Error precomputing active users feeds: ${err.message}`);
    return 0;
  }
}

/**
 * Initialize recommendation system — warm caches on server start.
 */
export async function initRecommendationSystem(): Promise<void> {
  try {
    logger.info('[RECO ENGINE] Initializing recommendation system...');

    // Clear stale caches to force schema projection updates
    await RecommendationCache.clearAll();

    // Warm seasonal context
    await getCachedSeasonalContext();

    // Warm cold start feed
    await getColdStartFeed({ limit: 20 });

    logger.info('[RECO ENGINE] Recommendation system initialized');

    // In background, start a catalog precomputation if cache is cold
    if (process.env.ENABLE_WORKERS !== 'false' && process.env.NODE_ENV !== 'test') {
      setTimeout(() => {
        logger.info('[RECO ENGINE] Running catalog precomputation in background on startup...');
        precomputeCatalogRecommendations().catch((err) => {
          logger.error(`[RECO ENGINE] Startup catalog precomputation failed: ${err.message}`);
        });
      }, 5000);
    }
  } catch (err: any) {
    logger.error(`[RECO ENGINE] Initialization error (non-fatal): ${err.message}`);
    // Non-fatal — system works without warm caches
  }
}
