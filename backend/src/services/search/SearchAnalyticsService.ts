import UserInteraction from '../../models/UserInteraction';
import Product from '../../models/Product';
import Event from '../../models/Event';
import logger from '../../config/logger';
import { getSearchCache, setSearchCache } from './searchCache';
import { SYNONYM_MAP, TRANSLITERATION_MAP } from './searchDictionaries';
import { predictCategories } from './SearchQueryBuilder';

/**
 * Calculates Levenshtein distance for fuzzy matching deduplication.
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) == a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1),
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

/**
 * Get trending search terms based on user interaction aggregation.
 */
export async function getTrendingSearches(
  options: { limit?: number; days?: number } = {},
): Promise<{ query: string; count: number }[]> {
  const limit = options.limit || 10;
  const days = options.days || 7;

  const cacheKey = `trending_${limit}_${days}`;
  const cached = await getSearchCache<{ query: string; count: number }[]>('trending', cacheKey);
  if (cached) return cached;

  try {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const results = await UserInteraction.aggregate([
      {
        $match: {
          eventType: 'search',
          timestamp: { $gte: cutoff },
          'metadata.searchQuery': { $exists: true, $nin: [null, ''] },
        },
      },
      {
        $group: {
          _id: { $toLower: '$metadata.searchQuery' },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: limit * 2 },
    ]);

    const seen = new Set<string>();
    const trending: { query: string; count: number }[] = [];

    for (const r of results) {
      const normalized = r._id.trim();
      if (normalized.length < 2) continue;

      // Filter out raw MongoDB ObjectIds and other long hex IDs (20+ chars) from trending searches
      if (/^[0-9a-f]{20,}$/i.test(normalized)) continue;

      const isDuplicate = Array.from(seen).some(
        (existing) =>
          existing.includes(normalized) ||
          normalized.includes(existing) ||
          levenshteinDistance(existing, normalized) <= 2,
      );

      if (!isDuplicate) {
        seen.add(normalized);
        trending.push({
          query: normalized
            .split(/\s+/)
            .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
            .join(' '),
          count: r.count,
        });
      }

      if (trending.length >= limit) break;
    }

    // Dynamic database-driven fallbacks to make trending queries fully dynamic when session activity is empty
    if (trending.length < limit) {
      const fallbackProducts = await Product.find({ isActive: true })
        .select('title primaryCategory tags')
        .limit(limit * 3)
        .lean();

      const extraTerms = new Set<string>();
      for (const p of fallbackProducts) {
        if (p.primaryCategory) {
          extraTerms.add(p.primaryCategory.toString());
        }
        if (p.tags && Array.isArray(p.tags)) {
          p.tags.forEach((t) => {
            if (t && t.length > 2) extraTerms.add(t);
          });
        }
        if (p.title) {
          const words = p.title.trim().split(/\s+/);
          if (words.length <= 3) {
            extraTerms.add(p.title);
          } else {
            extraTerms.add(words.slice(0, 2).join(' '));
          }
        }
      }

      for (const term of extraTerms) {
        if (trending.length >= limit) break;
        const normalizedTerm = term.trim();

        if (/^[0-9a-f]{20,}$/i.test(normalizedTerm)) continue;

        const displayTerm = normalizedTerm
          .split(/\s+/)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(' ');

        if (displayTerm.length >= 3 && !seen.has(displayTerm.toLowerCase())) {
          seen.add(displayTerm.toLowerCase());
          trending.push({ query: displayTerm, count: 1 });
        }
      }
    }

    await setSearchCache('trending', cacheKey, trending, 15 * 60 * 1000);
    return trending;
  } catch (err: any) {
    logger.error(`[SEARCH Trending] Error: ${err.message}`);
    return [];
  }
}

/**
 * Get related searches based on synonym matching.
 */
export async function getRelatedSearches(
  query: string,
  options: { limit?: number } = {},
): Promise<string[]> {
  const limit = options.limit || 5;
  const normalized = query.trim().toLowerCase();

  const related: string[] = [];
  const words = normalized.split(/\s+/);

  for (const word of words) {
    const synonyms = SYNONYM_MAP[word] || TRANSLITERATION_MAP[word];
    if (synonyms) {
      for (const syn of synonyms.slice(0, 2)) {
        const suggestion = normalized.replace(word, syn);
        if (suggestion !== normalized) {
          related.push(suggestion);
        }
      }
    }
  }

  const predicted = predictCategories(normalized);
  for (const cat of predicted.slice(0, 2)) {
    related.push(`${cat.toLowerCase()} decor`);
    related.push(`${cat.toLowerCase()} decoration ideas`);
  }

  return [...new Set(related)].slice(0, limit);
}

/**
 * Get popular products based on interaction data.
 */
export async function getPopularProducts(limit: number = 8) {
  const cacheKey = `popular_${limit}`;
  const cached = await getSearchCache<any[]>('trending', cacheKey);
  if (cached) return cached;

  try {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // last 30 days
    const popularIds = await UserInteraction.aggregate([
      {
        $match: {
          targetType: 'product',
          eventType: { $in: ['product_view', 'cart_add', 'purchase'] },
          timestamp: { $gte: cutoff },
        },
      },
      {
        $group: {
          _id: '$targetId',
          score: {
            $sum: {
              $cond: [
                { $eq: ['$eventType', 'purchase'] },
                10,
                { $cond: [{ $eq: ['$eventType', 'cart_add'] }, 5, 1] },
              ],
            },
          },
        },
      },
      { $sort: { score: -1 } },
      { $limit: limit * 2 },
    ]);

    const ids = popularIds.map((p) => p._id);
    const products = await Product.find({ _id: { $in: ids }, isActive: true })
      .select('_id title imageSrc price slug')
      .lean();

    // Sort by original score order
    products.sort((a, b) => {
      const scoreA = popularIds.find((p) => p._id.equals(a._id))?.score || 0;
      const scoreB = popularIds.find((p) => p._id.equals(b._id))?.score || 0;
      return scoreB - scoreA;
    });

    const finalProducts = products.slice(0, limit).map((p) => ({
      id: (p._id as any).toString(),
      title: p.title,
      image: p.imageSrc,
      price: p.price,
      slug: p.slug,
      type: 'product',
    }));

    if (finalProducts.length < limit) {
      const remainingLimit = limit - finalProducts.length;
      const excludedIds = finalProducts.map((p) => p.id);
      const fallbackProducts = await Product.find({
        _id: { $nin: excludedIds },
        isActive: true,
      })
        .sort({ views: -1, rating: -1 })
        .limit(remainingLimit)
        .select('_id title imageSrc price slug')
        .lean();

      fallbackProducts.forEach((p) => {
        finalProducts.push({
          id: (p._id as any).toString(),
          title: p.title,
          image: p.imageSrc,
          price: p.price,
          slug: p.slug,
          type: 'product',
        });
      });
    }

    await setSearchCache('trending', cacheKey, finalProducts, 30 * 60 * 1000);
    return finalProducts;
  } catch (err: any) {
    logger.error(`[SEARCH Analytics] Popular products error: ${err.message}`);
    return [];
  }
}

/**
 * Get new arrivals.
 */
export async function getNewArrivals(limit: number = 8) {
  const cacheKey = `new_arrivals_${limit}`;
  const cached = await getSearchCache<any[]>('trending', cacheKey);
  if (cached) return cached;

  try {
    const products = await Product.find({ isActive: true })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('_id title imageSrc price slug')
      .lean();

    const newArrivals = products.map((p) => ({
      id: (p._id as any).toString(),
      title: p.title,
      image: p.imageSrc,
      price: p.price,
      slug: p.slug,
      type: 'product',
    }));

    await setSearchCache('trending', cacheKey, newArrivals, 60 * 60 * 1000); // 1 hour cache
    return newArrivals;
  } catch (err: any) {
    logger.error(`[SEARCH Analytics] New arrivals error: ${err.message}`);
    return [];
  }
}

/**
 * Normalizes category names to avoid duplicates like "Engagement decoration" and "Engagement".
 */
function _normalizeCategoryName(name: string): string {
  const clean = name.trim();
  const lower = clean.toLowerCase();

  if (
    lower.includes('baby') ||
    lower.includes('seemantham') ||
    lower.includes('srimantham') ||
    lower.includes('shower')
  )
    return 'Baby Shower';
  if (
    lower.includes('house') ||
    lower.includes('gruhapravesam') ||
    lower.includes('gruhapravesh') ||
    lower.includes('griha')
  )
    return 'Housewarming';
  if (
    lower.includes('wedding') ||
    lower.includes('pelli') ||
    lower.includes('kalyanam') ||
    lower.includes('marriage')
  )
    return 'Wedding';
  if (lower.includes('engagement') || lower.includes('nischay') || lower.includes('nischitartham'))
    return 'Engagement';
  if (lower.includes('birthday') || lower.includes('bday')) return 'Birthday';
  if (
    lower.includes('pooja') ||
    lower.includes('puja') ||
    lower.includes('varalakshmi') ||
    lower.includes('satyanarayana')
  )
    return 'Pooja';
  if (lower.includes('haldi')) return 'Haldi';
  if (lower.includes('mehendi') || lower.includes('mehndi')) return 'Mehendi';
  if (lower.includes('sangeet')) return 'Sangeet';
  if (lower.includes('reception')) return 'Reception';
  if (lower.includes('corporate') || lower.includes('office')) return 'Corporate';
  if (
    lower.includes('festival') ||
    lower.includes('diwali') ||
    lower.includes('dussehra') ||
    lower.includes('sankranti')
  )
    return 'Festival';

  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

/**
 * Maps category names to accurate Material Symbols icons dynamically.
 */
function getCategoryIcon(category: string): string {
  const lower = category.toLowerCase();
  if (lower.includes('wedding')) return 'favorite';
  if (lower.includes('birthday')) return 'cake';
  if (lower.includes('engagement') || lower.includes('jewellery') || lower.includes('jewelry'))
    return 'diamond';
  if (lower.includes('pooja') || lower.includes('puja')) return 'self_improvement';
  if (lower.includes('baby')) return 'child_care';
  if (lower.includes('house')) return 'home';
  if (lower.includes('reception') || lower.includes('sangeet')) return 'celebration';
  if (lower.includes('haldi')) return 'local_florist';
  if (lower.includes('mehendi') || lower.includes('mehndi')) return 'front_hand';
  if (lower.includes('coconut')) return 'eco';
  if (lower.includes('bangle')) return 'workspace_premium';
  if (lower.includes('gift') || lower.includes('hamper')) return 'redeem';
  if (lower.includes('tray')) return 'layers';
  if (lower.includes('corporate')) return 'business_center';
  if (lower.includes('festival')) return 'festival';
  return 'category';
}

/**
 * Get dynamic event collections.
 */
export async function getEventCollections(limit: number = 8) {
  const cacheKey = `event_collections_v3_${limit}`;
  const cached = await getSearchCache<any[]>('trending', cacheKey);
  if (cached) return cached;

  try {
    const [productCategories, eventCategories] = await Promise.all([
      Product.distinct('category', { isActive: true }),
      Event.distinct('category', { isActive: true }),
    ]);

    // Use only actual categories in the database
    const combined = Array.from(new Set([...productCategories, ...eventCategories])).filter(
      Boolean,
    );

    // Prioritize key categories based on keyword presence
    const priorityKeywords = [
      'wedding',
      'birthday',
      'engagement',
      'pooja',
      'baby',
      'house',
      'haldi',
      'mehendi',
      'reception',
    ];

    combined.sort((a: any, b: any) => {
      const idxA = priorityKeywords.findIndex((k) => String(a).toLowerCase().includes(k));
      const idxB = priorityKeywords.findIndex((k) => String(b).toLowerCase().includes(k));

      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return String(a).localeCompare(String(b));
    });

    const collections = combined.slice(0, limit).map((c: any) => ({
      title: String(c),
      icon: getCategoryIcon(String(c)),
    }));

    await setSearchCache('trending', cacheKey, collections, 24 * 60 * 60 * 1000); // 24 hours
    return collections;
  } catch (err: any) {
    logger.error(`[SEARCH Analytics] Event collections error: ${err.message}`);
    return [];
  }
}

/**
 * Get aggregated discovery data for the search empty state.
 */
export async function getDiscoveryData() {
  const cacheKey = 'discovery_data_all_v3';
  const cached = await getSearchCache<any>('trending', cacheKey);
  if (cached) return cached;

  try {
    const [trending, popular, newArrivals, collections] = await Promise.all([
      getTrendingSearches({ limit: 10, days: 7 }),
      getPopularProducts(6),
      getNewArrivals(6),
      getEventCollections(8),
    ]);

    const data = {
      trending,
      popularProducts: popular,
      newArrivals,
      eventCollections: collections,
    };

    await setSearchCache('trending', cacheKey, data, 15 * 60 * 1000); // 15 mins
    return data;
  } catch (err: any) {
    logger.error(`[SEARCH Analytics] Discovery data error: ${err.message}`);
    return {
      trending: [],
      popularProducts: [],
      newArrivals: [],
      eventCollections: [],
    };
  }
}

// ── Continuous Learning Cache ──
interface LearnedMapping {
  synonyms: string[];
}
const learnedMappingsCache = new Map<string, LearnedMapping>();

/**
 * Continuous Learning: Periodically analyze search -> product click correlations
 * and auto-strengthen synonym mappings.
 */
export async function learnSearchPatterns(): Promise<void> {
  try {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days
    const interactions = await UserInteraction.aggregate([
      {
        $match: {
          timestamp: { $gte: cutoff },
          eventType: { $in: ['search', 'product_view', 'product_click', 'cart_add', 'purchase'] },
        },
      },
      {
        $sort: { sessionId: 1, timestamp: 1 },
      },
    ]);

    const sessions: Record<string, any[]> = {};
    for (const inter of interactions) {
      if (!sessions[inter.sessionId]) {
        sessions[inter.sessionId] = [];
      }
      sessions[inter.sessionId].push(inter);
    }

    const searchProductPairs: Record<string, Record<string, number>> = {};

    for (const [_sessionId, list] of Object.entries(sessions)) {
      for (let i = 0; i < list.length; i++) {
        const item = list[i];
        if (item.eventType === 'search' && item.metadata?.searchQuery) {
          const query = item.metadata.searchQuery.toLowerCase().trim();
          if (query.length < 3) continue;

          const searchTime = new Date(item.timestamp).getTime();
          for (let j = i + 1; j < list.length; j++) {
            const nextItem = list[j];
            const nextTime = new Date(nextItem.timestamp).getTime();
            if (nextTime - searchTime > 10 * 60 * 1000) break;

            if (
              ['product_view', 'product_click', 'cart_add', 'purchase'].includes(
                nextItem.eventType,
              ) &&
              nextItem.targetType === 'product'
            ) {
              const targetIdStr = nextItem.targetId.toString();
              if (!searchProductPairs[query]) {
                searchProductPairs[query] = {};
              }
              searchProductPairs[query][targetIdStr] =
                (searchProductPairs[query][targetIdStr] || 0) + 1;
            }
          }
        }
      }
    }

    const allTargetIds = new Set<string>();
    for (const targetMap of Object.values(searchProductPairs)) {
      for (const targetId of Object.keys(targetMap)) {
        allTargetIds.add(targetId);
      }
    }

    const products = await Product.find({ _id: { $in: Array.from(allTargetIds) } })
      .select('_id title primaryCategory tags')
      .lean();

    const productMap = new Map<string, any>();
    for (const p of products) {
      productMap.set((p._id as any).toString(), p);
    }

    for (const [query, targetMap] of Object.entries(searchProductPairs)) {
      for (const [targetId, count] of Object.entries(targetMap)) {
        if (count >= 3) {
          const prod = productMap.get(targetId);
          if (prod) {
            const cat = prod.primaryCategory;
            const titleWords = prod.title.toLowerCase().split(/\s+/);
            const queryWords = query.toLowerCase().split(/\s+/);

            const hasOverlap = queryWords.some(
              (qw) => titleWords.includes(qw) || (cat && cat.toLowerCase().includes(qw)),
            );

            if (!hasOverlap) {
              const targetTerm = cat || titleWords[0];
              if (targetTerm) {
                if (!learnedMappingsCache.has(query)) {
                  learnedMappingsCache.set(query, { synonyms: [] });
                }
                const existing = learnedMappingsCache.get(query)!;
                if (!existing.synonyms.includes(targetTerm)) {
                  existing.synonyms.push(targetTerm);
                }
              }
            }
          }
        }
      }
    }
    logger.info(
      `[SEARCH Learning] Learned ${learnedMappingsCache.size} search pattern correlations.`,
    );
  } catch (err: any) {
    logger.error(`[SEARCH Learning] Error in learnSearchPatterns: ${err.message}`);
  }
}

export function getLearnedMappings(): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const [query, data] of learnedMappingsCache.entries()) {
    result[query] = data.synonyms;
  }
  return result;
}

export async function getQueryInteractionBoosts(query: string): Promise<Record<string, number>> {
  const normalized = query.toLowerCase().trim();
  try {
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const sessionsWithSearch = await UserInteraction.distinct('sessionId', {
      eventType: 'search',
      timestamp: { $gte: cutoff },
      'metadata.searchQuery': normalized,
    });

    if (sessionsWithSearch.length === 0) return {};

    const interactions = await UserInteraction.aggregate([
      {
        $match: {
          sessionId: { $in: sessionsWithSearch },
          timestamp: { $gte: cutoff },
          eventType: {
            $in: [
              'product_view',
              'product_click',
              'cart_add',
              'purchase',
              'booking',
              'wishlist_add',
            ],
          },
          targetId: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: '$targetId',
          score: {
            $sum: {
              $cond: [
                { $eq: ['$eventType', 'purchase'] },
                10,
                {
                  $cond: [
                    { $eq: ['$eventType', 'booking'] },
                    10,
                    {
                      $cond: [
                        { $eq: ['$eventType', 'cart_add'] },
                        5,
                        {
                          $cond: [
                            { $eq: ['$eventType', 'wishlist_add'] },
                            3,
                            { $cond: [{ $eq: ['$eventType', 'product_click'] }, 2, 1] },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          },
        },
      },
      { $sort: { score: -1 } },
      { $limit: 15 },
    ]);

    const boosts: Record<string, number> = {};
    if (interactions.length > 0) {
      const maxScore = interactions[0].score || 1;
      for (const item of interactions) {
        boosts[item._id.toString()] = (item.score / maxScore) * 1.5;
      }
    }
    return boosts;
  } catch (err: any) {
    logger.error(`[SEARCH Analytics] Error getting interaction boosts: ${err.message}`);
    return {};
  }
}
