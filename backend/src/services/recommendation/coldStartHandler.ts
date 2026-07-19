import Product from '../../models/Product';
import Event from '../../models/Event';
import Gallery from '../../models/Gallery';
import { getTrendingFeeds } from './trendingEngine';
import { getCachedSeasonalContext, computeSeasonalBoost } from './seasonalEngine';
import { RecommendationCache } from './recommendationCache';
import logger from '../../config/logger';

/**
 * Cold start handler — generates recommendations for users with no behavioral history.
 * Uses a combination of trending data, seasonal boosting, popularity, and top-rated items.
 */

export interface ColdStartRecommendation {
  targetId: string;
  targetType: string;
  score: number;
  source: string;
  title?: string;
  image?: string;
  primaryCategory?: string;
  price?: number;
  rentalEnabled?: boolean;
  availabilityMode?: string;
  rentalPricing?: any;
  securityDeposit?: number;
  isDepositRefundable?: boolean;
}

/**
 * Get cold start recommendations (for anonymous or new users).
 * Checks cache first, computes if stale.
 */
export async function getColdStartFeed(
  options: { limit?: number; targetType?: string } = {},
): Promise<ColdStartRecommendation[]> {
  const limit = options.limit || 20;
  const targetType = options.targetType;

  try {
    // Check cache
    const cached = await RecommendationCache.getColdStartFeed();
    if (cached) {
      const filtered = targetType ? cached.filter((i: any) => i.targetType === targetType) : cached;
      return filtered.slice(0, limit);
    }

    const seasonalContext = await getCachedSeasonalContext();
    const feed: ColdStartRecommendation[] = [];

    // 1. Trending products (weighted highest for cold start)
    const trendingFeeds = await getTrendingFeeds(
      seasonalContext.isSeasonallyActive ? seasonalContext.activePeriods[0]?.context : undefined,
    );

    // 2. Featured/popular products from DB
    const [featuredProducts, popularEvents, topGallery] = await Promise.all([
      Product.find({ isActive: true, featured: true })
        .select(
          '_id title imageSrc primaryCategory price oldPrice strikingPrice mrp originalPrice rating tags rentalEnabled availabilityMode rentalPricing securityDeposit isDepositRefundable',
        )
        .populate('primaryCategory', 'name')
        .sort({ rating: -1, reviews: -1 })
        .limit(12)
        .lean(),

      Event.find({ isActive: true })
        .select('_id title image primaryCategory style basePrice features')
        .sort({ basePrice: -1 })
        .limit(8)
        .lean(),

      Gallery.find({ isActive: true })
        .select('_id title image primaryCategory style tags views likes')
        .sort({ views: -1, likes: -1 })
        .limit(8)
        .lean(),
    ]);

    // Score and add featured products
    for (const product of featuredProducts) {
      const seasonalBoost = computeSeasonalBoost(
        product.primaryCategory?.toString(),
        undefined,
        product.tags,
        seasonalContext,
      );

      // Check if this item is trending (bonus)
      const trendingItem = trendingFeeds.trendingNow.find(
        (t) => t.targetId === (product._id as any).toString(),
      );
      const trendingBonus = trendingItem ? trendingItem.score * 0.3 : 0;

      const baseScore = (product.rating || 0) * 2 + (product.featured ? 5 : 0);
      const finalScore = (baseScore + trendingBonus) * seasonalBoost;

      feed.push({
        targetId: (product._id as any).toString(),
        targetType: 'product',
        score: Math.round(finalScore * 100) / 100,
        source: trendingItem ? 'trending+featured' : 'featured',
        title: product.title,
        image: product.imageSrc,
        category: (product.primaryCategory as any)?.name,
        primaryCategory: product.primaryCategory?.toString(),
        price: product.price,
        oldPrice:
          (product as any).oldPrice ||
          (product as any).strikingPrice ||
          (product as any).mrp ||
          (product as any).originalPrice,
        rentalEnabled: product.rentalEnabled,
        availabilityMode: product.availabilityMode,
        rentalPricing: product.rentalPricing,
        securityDeposit: product.securityDeposit,
        isDepositRefundable: product.isDepositRefundable,
      });
    }

    // Score and add popular events
    for (const event of popularEvents) {
      const seasonalBoost = computeSeasonalBoost(
        event.primaryCategory?.toString(),
        event.style,
        event.features,
        seasonalContext,
      );

      const baseScore = 4; // Events are inherently high-value
      const finalScore = baseScore * seasonalBoost;

      feed.push({
        targetId: (event._id as any).toString(),
        targetType: 'event',
        score: Math.round(finalScore * 100) / 100,
        source: 'popular',
        title: event.title,
        image: event.image,
        primaryCategory: event.primaryCategory?.toString(),
        price: event.basePrice,
      });
    }

    // Score and add top gallery items
    for (const gallery of topGallery) {
      const seasonalBoost = computeSeasonalBoost(
        gallery.primaryCategory?.toString(),
        gallery.style,
        gallery.tags,
        seasonalContext,
      );

      const popularityScore =
        Math.log2(Math.max(gallery.views || 1, 1)) + (gallery.likes || 0) * 0.5;
      const finalScore = popularityScore * seasonalBoost;

      feed.push({
        targetId: (gallery._id as any).toString(),
        targetType: 'gallery',
        score: Math.round(finalScore * 100) / 100,
        source: 'popular-gallery',
        title: gallery.title,
        image: gallery.image,
        primaryCategory: gallery.primaryCategory?.toString(),
      });
    }

    // Sort by score, add diversity (don't show 3 of same type in a row)
    feed.sort((a, b) => b.score - a.score);
    const diversified = applyDiversityFilter(feed);

    // Cache the result
    await RecommendationCache.setColdStartFeed(diversified);

    const filtered = targetType
      ? diversified.filter((i) => i.targetType === targetType)
      : diversified;
    return filtered.slice(0, limit);
  } catch (err: any) {
    logger.error(`[COLD START] Error generating cold start feed: ${err.message}`);
    return [];
  }
}

/**
 * Ensure no more than 2 consecutive items of the same target type,
 * and remove items with duplicate titles.
 */
function applyDiversityFilter(items: ColdStartRecommendation[]): ColdStartRecommendation[] {
  const result: ColdStartRecommendation[] = [];
  const deferred: ColdStartRecommendation[] = [];
  const seenTitles = new Set<string>();

  for (const item of items) {
    const titleLower = (item.title || '').toLowerCase().trim();
    if (seenTitles.has(titleLower)) continue;
    seenTitles.add(titleLower);

    // Check if adding this item would create 3+ consecutive same type
    const lastTwo = result.slice(-2);
    const wouldTriple =
      lastTwo.length === 2 &&
      lastTwo[0].targetType === item.targetType &&
      lastTwo[1].targetType === item.targetType;

    if (wouldTriple) {
      deferred.push(item);
    } else {
      result.push(item);
    }
  }

  // Append deferred items at the end
  return [...result, ...deferred];
}
