import Product from '../../models/Product';
import Event from '../../models/Event';
import Gallery from '../../models/Gallery';
import UserPreferenceProfile from '../../models/UserPreferenceProfile';
import UserInteraction from '../../models/UserInteraction';
import { scoreItemsForUser, scoreItemsForSession, ScoredItem } from './scoringEngine';
import { getTrendingFeeds } from './trendingEngine';
import { getCachedSeasonalContext, computeSeasonalBoost, SeasonalContext } from './seasonalEngine';
import { findSimilarProducts, findSimilarEvents } from './similarityEngine';
import { getColdStartFeed, ColdStartRecommendation } from './coldStartHandler';
import { explorationEngine } from './explorationEngine';
import { escapeRegex } from '../../services/searchService';
import logger from '../../config/logger';

// ── Circuit Breaker State ──
let consecutiveFailures = 0;
let circuitOpenUntil = 0;
const CIRCUIT_FAILURE_THRESHOLD = 3;
const CIRCUIT_COOLDOWN_MS = 60_000; // 60 seconds

// ── Scoring Weights ──
const WEIGHTS = {
  behavioral: 0.3,
  contentSimilarity: 0.2,
  trending: 0.15,
  seasonal: 0.15,
  engagement: 0.1,
  freshness: 0.05,
  diversity: 0.05,
};

export interface RecommendedItem {
  _id: string;
  targetType: string;
  score: number;
  source: string;
  title?: string;
  imageSrc?: string;
  image?: string;
  category?: string;
  style?: string;
  price?: number;
  basePrice?: number;
  rating?: number;
  reviews?: number;
  tags?: string[];
  slug?: string;
}

export interface RecommendationContext {
  userId?: string;
  sessionId?: string;
  page?: string;
  currentItemId?: string;
  currentItemType?: string;
  limit?: number;
  offset?: number;
  targetType?: string;
}

/**
 * Master recommendation orchestrator.
 * Fans out to sub-engines, merges results, applies diversity filters, and returns final ranked list.
 */
export async function getPersonalizedRecommendations(
  ctx: RecommendationContext,
): Promise<{ items: RecommendedItem[]; source: string; seasonal: SeasonalContext | null }> {
  const limit = ctx.limit || 12;
  const offset = ctx.offset || 0;

  try {
    // Circuit breaker: if too many consecutive failures, short-circuit to cold start
    if (Date.now() < circuitOpenUntil) {
      logger.warn('[RECO ENGINE] Circuit breaker OPEN — serving cold-start fallback');
      let coldItems = await getColdStartFeed({ limit: limit + 15, targetType: ctx.targetType });
      if (ctx.page === 'homepage') {
        coldItems = coldItems.filter((item) => item.targetType !== 'gallery');
      }
      const enriched = await enrichItems(coldItems.slice(0, limit));
      return { items: enriched, source: 'circuit-breaker-fallback', seasonal: null };
    }

    // Check if user has a profile (not cold start)
    let userProfile = null;
    if (ctx.userId) {
      userProfile = await UserPreferenceProfile.findOne({ userId: ctx.userId })
        .maxTimeMS(3000)
        .lean();
    }

    const isColdStart = !userProfile || (userProfile.interactionCount || 0) < 3;

    if (isColdStart && !ctx.currentItemId) {
      // Full cold start — use cold start handler
      let coldItems = await getColdStartFeed({
        limit: limit + offset + 15,
        targetType: ctx.targetType,
      });
      if (ctx.page === 'homepage') {
        coldItems = coldItems.filter((item) => item.targetType !== 'gallery');
      }
      const enriched = await enrichItems(coldItems.slice(offset, offset + limit));
      const seasonal = await getCachedSeasonalContext();
      return { items: enriched, source: 'cold-start', seasonal };
    }

    // ── Compute scores from multiple engines in parallel ──
    const seasonal = await getCachedSeasonalContext();

    // Get candidate items from DB
    const candidates = await getCandidateItems(ctx, userProfile);

    if (candidates.length === 0) {
      // Fallback to cold start
      let coldItems = await getColdStartFeed({
        limit: limit + offset + 15,
        targetType: ctx.targetType,
      });
      if (ctx.page === 'homepage') {
        coldItems = coldItems.filter((item) => item.targetType !== 'gallery');
      }
      const enriched = await enrichItems(coldItems.slice(offset, offset + limit));
      return { items: enriched, source: 'cold-start-fallback', seasonal };
    }

    const candidateIds = candidates.map((c) => (c._id as any).toString());

    // Fan out to sub-engines — scoring limit matches candidate count
    const scoringLimit = Math.max(candidateIds.length, 80);
    const results = await Promise.allSettled([
      ctx.userId
        ? scoreItemsForUser(ctx.userId, candidateIds, { limit: scoringLimit })
        : ctx.sessionId
          ? scoreItemsForSession(ctx.sessionId, candidateIds, { limit: scoringLimit })
          : Promise.resolve([] as ScoredItem[]),
      getTrendingFeeds(),
    ]);

    // Extract results with graceful fallback for rejected promises
    const behavioralScores =
      results[0].status === 'fulfilled' ? results[0].value : ([] as ScoredItem[]);
    const trendingFeeds =
      results[1].status === 'fulfilled'
        ? results[1].value
        : {
            trendingNow: [],
            mostBooked: [],
            popularThisSeason: [],
            topRated: [],
            luxuryTrending: [],
          };

    if (results[0].status === 'rejected') {
      logger.warn(
        `[RECO ENGINE] Behavioral scoring failed (non-fatal): ${(results[0] as PromiseRejectedResult).reason?.message}`,
      );
    }
    if (results[1].status === 'rejected') {
      logger.warn(
        `[RECO ENGINE] Trending feeds failed (non-fatal): ${(results[1] as PromiseRejectedResult).reason?.message}`,
      );
    }

    // Build score map
    const behavioralMap = new Map(behavioralScores.map((s) => [s.targetId, s.score]));
    const trendingMap = new Map(
      [...trendingFeeds.trendingNow, ...trendingFeeds.mostBooked].map((t) => [t.targetId, t.score]),
    );

    // Score each candidate
    // Pre-compute category distribution for diversity scoring
    const categoryCounts = new Map<string, number>();
    for (const c of candidates) {
      const cat = (c.primaryCategory || 'other').toLowerCase();
      categoryCounts.set(cat, (categoryCounts.get(cat) || 0) + 1);
    }
    const totalCandidates = candidates.length;

    const scoredItems: (RecommendedItem & { rawScore: number })[] = candidates.map((item) => {
      const id = (item._id as any).toString();
      const itemCategory = item.primaryCategory || '';
      const itemStyle = (item as any).style || '';
      const itemTags = (item as any).tags || [];
      const _itemPrice = (item as any).price || (item as any).basePrice || 0;
      const targetType = (item as any).__targetType || 'product';

      // 1. Behavioral score (normalized 0-1)
      const behavioralScore = behavioralMap.get(id) || 0;
      const normalizedBehavioral = Math.min(behavioralScore / 20, 1); // cap at 20 raw points

      // 2. Content similarity to user profile
      let profileSimilarity = 0;
      if (userProfile) {
        const catAff =
          (userProfile.categoryAffinities as any)?.get?.(itemCategory) ||
          (userProfile.categoryAffinities as any)?.[itemCategory] ||
          0;
        const styleAff =
          (userProfile.styleAffinities as any)?.get?.(itemStyle) ||
          (userProfile.styleAffinities as any)?.[itemStyle] ||
          0;
        profileSimilarity = Math.min((catAff + styleAff) / 2, 1);
      }

      // 3. Trending score (normalized)
      const trendingScore = trendingMap.get(id) || 0;
      const normalizedTrending = Math.min(trendingScore / 50, 1);

      // 4. Seasonal boost
      const seasonalBoost = computeSeasonalBoost(itemCategory, itemStyle, itemTags, seasonal);
      const normalizedSeasonal = (seasonalBoost - 1) / 0.8; // Normalize: 1.0→0, 1.8→1

      // 5. Freshness (newer items get a boost)
      const createdAt = (item as any).createdAt ? new Date((item as any).createdAt).getTime() : 0;
      const daysSinceCreation = (Date.now() - createdAt) / (1000 * 60 * 60 * 24);
      const freshness = Math.max(0, 1 - daysSinceCreation / 90); // Decays over 90 days

      // 6. Engagement (profile-level engagement as boost)
      const engagementBoost = userProfile ? (userProfile.engagementScore || 0) / 100 : 0;

      // 7. Diversity bonus — items from underrepresented categories get a boost
      const catLower = itemCategory.toLowerCase() || 'other';
      const catFrequency = (categoryCounts.get(catLower) || 1) / totalCandidates;
      const diversityBonus = Math.max(0, 1 - catFrequency * 3); // Rare categories get higher bonus

      // Weighted combination (now includes diversity)
      const rawScore =
        normalizedBehavioral * WEIGHTS.behavioral +
        profileSimilarity * WEIGHTS.contentSimilarity +
        normalizedTrending * WEIGHTS.trending +
        normalizedSeasonal * WEIGHTS.seasonal +
        engagementBoost * WEIGHTS.engagement +
        freshness * WEIGHTS.freshness +
        diversityBonus * WEIGHTS.diversity;

      return {
        _id: id,
        targetType,
        score: Math.round(rawScore * 1000) / 1000,
        rawScore,
        source:
          behavioralScore > 0 ? 'personalized' : trendingScore > 0 ? 'trending' : 'content-based',
        title: (item as any).title,
        imageSrc: (item as any).imageSrc,
        image: (item as any).image,
        primaryCategory: itemCategory,
        style: itemStyle,
        price: (item as any).price,
        basePrice: (item as any).basePrice,
        rating: (item as any).rating,
        reviews: (item as any).reviews,
        tags: itemTags,
        slug: (item as any).slug,
      };
    });

    // Apply novelty bonus
    const recentInteractions =
      ctx.userId || ctx.sessionId
        ? await UserInteraction.find({
            ...(ctx.userId ? { userId: ctx.userId } : { sessionId: ctx.sessionId }),
            targetId: { $exists: true },
          })
            .select('targetId')
            .sort({ timestamp: -1 })
            .limit(80)
            .maxTimeMS(3000)
            .lean()
        : [];
    const interactedIds = new Set<string>(
      recentInteractions.map((i: any) => i.targetId?.toString()).filter(Boolean),
    );
    const noveltyBoosted = explorationEngine.applyNoveltyBonus(scoredItems, interactedIds, 0.15);

    // Sort by score
    noveltyBoosted.sort((a, b) => (b.rawScore || 0) - (a.rawScore || 0));

    // Anti-repetition: remove items the user just interacted with
    const excludeIds = new Set(ctx.currentItemId ? [ctx.currentItemId] : []);

    // Deduplicate by both ID and title to prevent duplicates
    const seenIds = new Set<string>();
    const seenTitles = new Set<string>();
    const filtered = noveltyBoosted.filter((item) => {
      if (excludeIds.has(item._id)) return false;
      if (seenIds.has(item._id)) return false;
      seenIds.add(item._id);
      const titleLower = (item.title || '').toLowerCase().trim();
      if (titleLower && seenTitles.has(titleLower)) return false;
      if (titleLower) seenTitles.add(titleLower);
      return true;
    });

    // Splitting the ranked list and the diverse pool for epsilon-greedy balancing
    const rankedExploitItems = filtered.slice(0, limit * 2); // Top scored items
    const diverseExplorePool = applyDiversityFilter(filtered.slice(limit * 2)); // The rest

    // Epsilon-greedy balancing with actual user profile data
    const balancedItems = explorationEngine.balanceList(
      rankedExploitItems,
      diverseExplorePool,
      limit,
      userProfile,
    );

    // Paginate the balanced result
    const paginated = balancedItems.slice(0, limit);

    // Reset circuit breaker on success
    consecutiveFailures = 0;

    return {
      items: paginated.map(({ _rawScore, ...rest }) => rest),
      source: isColdStart ? 'cold-start-hybrid' : 'personalized',
      seasonal,
    };
  } catch (err: any) {
    // Increment circuit breaker counter
    consecutiveFailures++;
    if (consecutiveFailures >= CIRCUIT_FAILURE_THRESHOLD) {
      circuitOpenUntil = Date.now() + CIRCUIT_COOLDOWN_MS;
      logger.error(
        `[RECO ENGINE] Circuit breaker OPENED after ${consecutiveFailures} consecutive failures`,
      );
    }

    logger.error(`[RECO ENGINE] Error generating recommendations: ${err.message}`);
    // Graceful fallback
    let coldItems = await getColdStartFeed({ limit: limit + 15, targetType: ctx.targetType });
    if (ctx.page === 'homepage') {
      coldItems = coldItems.filter((item) => item.targetType !== 'gallery');
    }
    const enriched = await enrichItems(coldItems.slice(0, limit));
    return { items: enriched, source: 'error-fallback', seasonal: null };
  }
}

/**
 * Get candidate items from DB based on context.
 */
async function getCandidateItems(ctx: RecommendationContext, userProfile: any): Promise<any[]> {
  const limit = 60; // Fetch extra candidates for scoring
  const MAX_CANDIDATES = 80; // Hard cap to prevent memory/CPU spikes
  const candidates: any[] = [];

  try {
    if (ctx.targetType === 'event' || ctx.page === 'events') {
      const events = await Event.find({ isActive: true })
        .select('_id title image primaryCategory style basePrice features colorPalette createdAt')
        .sort({ createdAt: -1 })
        .limit(limit)
        .maxTimeMS(3000)
        .lean();
      events.forEach((e) => ((e as any).__targetType = 'event'));
      candidates.push(...events);
    } else if (ctx.targetType === 'gallery' || ctx.page === 'gallery') {
      const galleries = await Gallery.find({ isActive: true })
        .select('_id title image primaryCategory style tags views likes createdAt')
        .sort({ createdAt: -1 })
        .limit(limit)
        .maxTimeMS(3000)
        .lean();
      galleries.forEach((g) => ((g as any).__targetType = 'gallery'));
      candidates.push(...galleries);
    } else {
      // Default: mix of products, events, and galleries (exclude galleries on homepage per request)
      const [products, events, galleries] = await Promise.all([
        Product.find({ isActive: true })
          .select(
            '_id title imageSrc primaryCategory price oldPrice strikingPrice mrp originalPrice rating reviews tags slug featured createdAt rentalEnabled availabilityMode rentalPricing securityDeposit isDepositRefundable',
          )
          .populate('primaryCategory', 'name')
          .sort({ createdAt: -1 })
          .limit(Math.floor(limit * 0.6))
          .lean(),
        Event.find({ isActive: true })
          .select('_id title image primaryCategory style basePrice features createdAt')
          .sort({ createdAt: -1 })
          .limit(Math.floor(limit * 0.4))
          .lean(),
        ctx.page !== 'homepage'
          ? Gallery.find({ isActive: true })
              .select('_id title image primaryCategory style tags views likes createdAt')
              .sort({ views: -1 })
              .limit(Math.floor(limit * 0.25))
              .lean()
          : Promise.resolve([]),
      ]);

      products.forEach((p) => ((p as any).__targetType = 'product'));
      events.forEach((e) => ((e as any).__targetType = 'event'));
      galleries.forEach((g) => ((g as any).__targetType = 'gallery'));

      candidates.push(...products, ...events, ...galleries);
    }

    // If user has preference profile, prioritize fetching items from their top categories
    if (userProfile && userProfile.topCategories?.length > 0) {
      const topCatProducts = await Product.find({
        isActive: true,
        _id: { $nin: candidates.map((c) => c._id) },
        category: {
          $in: userProfile.topCategories.map((c: string) => new RegExp(escapeRegex(c), 'i')),
        },
      })
        .select(
          '_id title imageSrc primaryCategory price oldPrice strikingPrice mrp originalPrice rating reviews tags slug createdAt rentalEnabled availabilityMode rentalPricing securityDeposit isDepositRefundable',
        )
        .populate('primaryCategory', 'name')
        .limit(15)
        .lean();

      topCatProducts.forEach((p) => ((p as any).__targetType = 'product'));
      candidates.push(...topCatProducts);
    }
  } catch (err: any) {
    logger.error(`[RECO ENGINE] Error fetching candidates: ${err.message}`);
  }

  return candidates.slice(0, MAX_CANDIDATES);
}

/**
 * Apply diversity filter: avoid 3+ consecutive same-category items.
 */
function applyDiversityFilter(items: any[]): any[] {
  const result: any[] = [];
  const deferred: any[] = [];

  for (const item of items) {
    const lastTwo = result.slice(-2);
    const wouldTriple =
      lastTwo.length === 2 &&
      lastTwo[0].primaryCategory === item.primaryCategory &&
      lastTwo[1].primaryCategory === item.primaryCategory;

    if (wouldTriple) {
      deferred.push(item);
    } else {
      result.push(item);
    }
  }

  return [...result, ...deferred];
}

/**
 * Enrich cold start items with full DB data.
 */
async function enrichItems(items: ColdStartRecommendation[]): Promise<RecommendedItem[]> {
  return items.map((item) => ({
    _id: item.targetId,
    targetType: item.targetType,
    score: item.score,
    source: item.source,
    title: item.title,
    imageSrc: item.image,
    image: item.image,
    primaryCategory: item.primaryCategory,
    price: item.price,
    rentalEnabled: item.rentalEnabled,
    availabilityMode: item.availabilityMode,
    rentalPricing: item.rentalPricing,
    securityDeposit: item.securityDeposit,
    isDepositRefundable: item.isDepositRefundable,
  }));
}

/**
 * Get similar item recommendations for a specific item.
 */
export async function getSimilarRecommendations(
  targetType: string,
  targetId: string,
  options: { limit?: number } = {},
): Promise<RecommendedItem[]> {
  const limit = options.limit || 8;

  try {
    let similarItems;

    if (targetType === 'product') {
      similarItems = await findSimilarProducts(targetId, { limit });
    } else if (targetType === 'event') {
      similarItems = await findSimilarEvents(targetId, { limit });
    } else {
      return [];
    }

    // Enrich with full data
    const ids = similarItems.map((s) => s.targetId);
    let fullItems: any[] = [];

    if (targetType === 'product') {
      fullItems = await Product.find({ _id: { $in: ids }, isActive: true })
        .select(
          '_id title imageSrc primaryCategory price oldPrice strikingPrice mrp originalPrice rating reviews tags slug rentalEnabled availabilityMode rentalPricing securityDeposit isDepositRefundable',
        )
        .populate('primaryCategory', 'name')
        .lean();
    } else if (targetType === 'event') {
      fullItems = await Event.find({ _id: { $in: ids }, isActive: true })
        .select('_id title image primaryCategory style basePrice')
        .lean();
    }

    const fullMap = new Map(fullItems.map((f) => [(f._id as any).toString(), f]));

    return similarItems
      .filter((s) => fullMap.has(s.targetId))
      .map((s) => {
        const full = fullMap.get(s.targetId)!;
        return {
          _id: s.targetId,
          targetType,
          score: s.similarityScore,
          source: `similar:${s.matchedSignals.join(',')}`,
          title: full.title,
          imageSrc: full.imageSrc,
          image: full.image,
          primaryCategory: full.primaryCategory,
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
      });
  } catch (err: any) {
    logger.error(`[RECO ENGINE] Error in similar recommendations: ${err.message}`);
    return [];
  }
}

/**
 * Enrich targetIds and targetTypes with full database item details.
 */
export async function enrichScoredItems(
  items: { targetId: string; targetType: string; score?: number; source?: string }[],
): Promise<any[]> {
  if (items.length === 0) return [];

  const productIds = items.filter((i) => i.targetType === 'product').map((i) => i.targetId);
  const eventIds = items.filter((i) => i.targetType === 'event').map((i) => i.targetId);

  const [products, events] = await Promise.all([
    productIds.length > 0
      ? Product.find({ _id: { $in: productIds }, isActive: true })
          .select(
            '_id title imageSrc primaryCategory price oldPrice strikingPrice mrp originalPrice rating reviews tags slug rentalEnabled availabilityMode rentalPricing securityDeposit isDepositRefundable',
          )
          .populate('primaryCategory', 'name')
          .lean()
      : Promise.resolve([]),
    eventIds.length > 0
      ? Event.find({ _id: { $in: eventIds }, isActive: true })
          .select('_id title image primaryCategory style basePrice')
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
        source: item.source || 'recommendation',
        title: full.title,
        imageSrc: full.imageSrc,
        image: full.image,
        primaryCategory: full.primaryCategory,
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
