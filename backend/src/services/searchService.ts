import Product from '../models/Product';
import Event from '../models/Event';
import Gallery from '../models/Gallery';
import UserInteraction from '../models/UserInteraction';
import { getCachedSeasonalContext, computeSeasonalBoost } from './recommendation/seasonalEngine';

import logger from '../config/logger';
import { MongoQueryBuilder } from '../utils/MongoQueryBuilder';
import { TRANSLITERATION_MAP, SYNONYM_MAP } from './search/searchDictionaries';
import {
  getQueryInteractionBoosts,
  getPopularProducts,
  getNewArrivals,
} from './search/SearchAnalyticsService';

import { getSearchCache, setSearchCache } from './search/searchCache';
import {
  analyzeQueryWithAI,
  getTransliterationsAndSynonyms,
  generateFuzzyVariants,
  predictCategories,
  getIntentExpansions,
  analyzeQueryLocally,
} from './search/queryParser';
export {
  analyzeQueryWithAI,
  analyzeQueryLocally,
  getTransliterationsAndSynonyms,
  generateFuzzyVariants,
};
export {
  escapeRegex,
  getMatchingProductCategory,
  getMatchingEventCategory,
  getMatchingGalleryCategory,
} from './search/filteringEngine';
import {
  escapeRegex,
  getMatchingProductCategory,
  getMatchingEventCategory,
  getMatchingGalleryCategory,
} from './search/filteringEngine';
import { computeSearchScore, getMatchSource } from './search/rankingEngine';
export { computeSearchScore };

// ── Interface Definitions ──
export interface AutocompleteResult {
  id: string;
  title: string;
  type: 'product' | 'event' | 'gallery' | 'category' | 'suggestion';
  category?: string;
  image?: string;
  price?: number;
  score: number;
  slug?: string;
}

export interface SearchResult {
  id: string;
  title: string;
  type: 'product' | 'event' | 'gallery';
  category?: string;
  style?: string;
  image?: string;
  price?: number;
  rating?: number;
  reviews?: number;
  tags?: string[];
  slug?: string;
  score: number;
  matchSource: string;
}

export interface SearchResponse {
  items: SearchResult[];
  total: number;
  page: number;
  limit: number;
  predictedCategories: string[];
  query: string;
  correctedQuery?: string;
  expertResponse?: string;
  intentSummary?: string;
  isFallback?: boolean;
  recommendations?: {
    bestMatches: SearchResult[];
    popularChoices: SearchResult[];
    budgetFriendly: SearchResult[];
    similarIdeas: SearchResult[];
    trending: SearchResult[];
  };
}

/**
 * Fast, lightweight local search using expanded dictionaries, transliterations, and synonyms.
 */
export async function getAutocomplete(
  query: string,
  options: { limit?: number } = {},
): Promise<{
  suggestions: AutocompleteResult[];
  predictedCategories: string[];
  correctedQuery?: string;
}> {
  const limit = options.limit || 8;
  const normalizedQuery = query.trim().toLowerCase();

  if (normalizedQuery.length < 2) {
    return { suggestions: [], predictedCategories: [] };
  }

  // Check cache
  const cacheKey = `${normalizedQuery}_${limit}`;
  const cached = await getSearchCache<{
    suggestions: AutocompleteResult[];
    predictedCategories: string[];
  }>('ac', cacheKey);
  if (cached) return cached;

  try {
    // Clean budget patterns locally in autocomplete to get clean suggestions matching the core query
    let cleanedQuery = normalizedQuery;
    const priceMaxMatch =
      normalizedQuery.match(
        /(?:under|below|less than|within|budget|price)\s*(?:rs\.?|inr)?\s*(\d+(?:\.\d+)?)\s*(k|lakh)?/i,
      ) ||
      normalizedQuery.match(
        /(\d+(?:\.\d+)?)\s*(k|lakh)?\s*(?:under|below|less than|within|lopala|lopa|kante takkuva|kante thakkuva|takkuva|thakkuva|లోపల|కంటే తక్కువ|తక్కువ)/i,
      );
    if (priceMaxMatch) {
      cleanedQuery = cleanedQuery
        .replace(priceMaxMatch[0], '')
        .replace(
          /(?:under|below|less than|within|budget|price)\s*(?:rs\.?|inr)?\s*(\d+(?:\.\d+)?)\s*(k|lakh)?/gi,
          '',
        )
        .replace(
          /(\d+(?:\.\d+)?)\s*(k|lakh)?\s*(?:under|below|less than|within|lopala|lopa|kante takkuva|kante thakkuva|takkuva|thakkuva|లోపల|కంటే తక్కువ|తక్కువ)/gi,
          '',
        )
        .replace(/\b\d+\s*k\b/gi, '')
        .replace(/\b\d{4,6}\b/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    }

    const baseSearchQuery = cleanedQuery || normalizedQuery;

    // Generate transliterations and synonyms locally for instant speed using cleaned query
    const allTerms = getTransliterationsAndSynonyms(baseSearchQuery);
    const fuzzyTerms = generateFuzzyVariants(baseSearchQuery);
    const searchTerms = [...new Set([...allTerms, ...fuzzyTerms])];
    const _regexPatterns = searchTerms.map((term) => new RegExp(escapeRegex(term), 'i'));

    // Predict intent categories using cleaned query
    const predictedCategories = predictCategories(baseSearchQuery);

    const productQuery = MongoQueryBuilder.create<any>()
      .withRegexFallback(searchTerms, ['title', 'teluguTitle', 'category', 'tags'])
      .build();

    const eventQuery = MongoQueryBuilder.create<any>()
      .withRegexFallback(searchTerms, ['title', 'category', 'style', 'features'])
      .build();

    const _galleryQuery = MongoQueryBuilder.create<any>()
      .withRegexFallback(searchTerms, ['title', 'teluguTitle', 'category', 'tags'])
      .build();

    const [products, events] = await Promise.all([
      Product.find(productQuery)
        .select('_id title teluguTitle imageSrc category price rating slug')
        .sort({ rating: -1, reviews: -1 })
        .limit(5)
        .lean(),

      Event.find(eventQuery)
        .select('_id title category style basePrice slug')
        .sort({ basePrice: -1 })
        .limit(3)
        .lean(),
    ]);

    const suggestions: AutocompleteResult[] = [];

    // Add category suggestions first
    for (const cat of predictedCategories.slice(0, 2)) {
      suggestions.push({
        id: `cat:${cat}`,
        title: cat,
        type: 'category',
        score: 1.2,
      });
    }

    // Add intent expansion suggestions
    const expandedIntents = getIntentExpansions(normalizedQuery);
    if (expandedIntents.length > 0) {
      for (const intent of expandedIntents) {
        suggestions.push({
          id: `intent:${intent}`,
          title: intent,
          type: 'suggestion',
          score: 1.1,
        });
      }
    }

    // Score products
    for (const p of products) {
      suggestions.push({
        id: (p._id as any).toString(),
        title: p.title,
        type: 'product',
        category: p.category,
        image: p.imageSrc,
        price: p.price,
        slug: p.slug,
        score: computeSearchScore(
          p.title,
          p.category,
          p.tags || [],
          baseSearchQuery,
          p.teluguTitle,
        ),
      });
    }

    // Score events
    for (const e of events) {
      suggestions.push({
        id: (e._id as any).toString(),
        title: e.title,
        type: 'event',
        category: e.category,
        image: e.image,
        price: e.basePrice,
        slug: (e as any).slug,
        score: computeSearchScore(e.title, e.category, e.features || [], normalizedQuery),
      });
    }

    // Parse budget limit locally for suggestions sorting
    let budgetLimit: number | null = null;
    if (priceMaxMatch) {
      let val = parseFloat(priceMaxMatch[1]);
      const unit = priceMaxMatch[2]?.toLowerCase();
      if (unit === 'k') val *= 1000;
      else if (unit === 'lakh') val *= 100000;
      budgetLimit = Math.round(val);
    }

    suggestions.sort((a, b) => {
      const typeOrder: Record<string, number> = {
        category: 1,
        product: 2,
        event: 2,
        suggestion: 3,
      };
      const orderA = typeOrder[a.type] || 4;
      const orderB = typeOrder[b.type] || 4;
      if (orderA !== orderB) {
        return orderA - orderB;
      }

      // If we have a budget limit and both are products/events, sort in-budget first, then out-of-budget by price asc
      if (
        budgetLimit !== null &&
        (a.type === 'product' || a.type === 'event') &&
        (b.type === 'product' || b.type === 'event')
      ) {
        const pA = a.price;
        const pB = b.price;
        const aIn = pA === undefined || pA <= budgetLimit;
        const bIn = pB === undefined || pB <= budgetLimit;

        if (aIn && !bIn) return -1;
        if (!aIn && bIn) return 1;
        if (!aIn && !bIn) {
          return (pA ?? Infinity) - (pB ?? Infinity);
        }
      }

      if (b.score !== a.score) return b.score - a.score;
      return (a.slug || a.id).localeCompare(b.slug || b.id);
    });
    const final = suggestions.slice(0, limit);

    // Local spelling/transliteration recommendation for overlay banner
    let correctedQuery: string | undefined;
    const words = normalizedQuery.split(/\s+/);
    const correctedWords = words.map((word) => {
      const trans = TRANSLITERATION_MAP[word];
      if (trans && trans.length > 0) {
        const englishSuggested = trans.find((t) => !/[\u0c00-\u0c7f]/.test(t));
        return englishSuggested || word;
      }
      return word;
    });
    const potentialCorrection = correctedWords.join(' ');
    if (potentialCorrection !== normalizedQuery) {
      correctedQuery = potentialCorrection;
    }

    const result = { suggestions: final, predictedCategories, correctedQuery };
    await setSearchCache('ac', cacheKey, result, 5 * 60 * 1000);

    return result;
  } catch (err: any) {
    logger.error(`[SEARCH Autocomplete] Error: ${err.message}`);
    return { suggestions: [], predictedCategories: [], correctedQuery: undefined };
  }
}

/**
 * Full-text search with fuzzy matching, transliteration, semantic AI analysis, and compound ranking.
 */
export async function searchAll(
  query: string,
  options: {
    category?: string;
    type?: string;
    sort?: string;
    page?: number;
    limit?: number;
    priceMin?: number;
    priceMax?: number;
    spellcheck?: string;
    bypassCorrection?: string;
  } = {},
): Promise<SearchResponse> {
  const page = options.page || 1;
  const limit = Math.min(options.limit || 20, 40);
  const skip = (page - 1) * limit;
  const normalizedQuery = query.trim().toLowerCase();

  if (normalizedQuery.length < 1) {
    return { items: [], total: 0, page, limit, predictedCategories: [], query };
  }

  // Check Cache
  const cacheKey = `${normalizedQuery}:${options.category || ''}:${options.type || ''}:${options.sort || ''}:${page}:${options.priceMin || ''}:${options.priceMax || ''}:${options.spellcheck || ''}:${options.bypassCorrection || ''}`;
  const cached = await getSearchCache<SearchResponse>('full', cacheKey);
  if (cached) return cached;

  try {
    // Stage 1: Analyze query semantic intent using AI / Local Fallback
    const aiAnalysis = await analyzeQueryWithAI(normalizedQuery);
    const shouldSpellcheck = options.spellcheck !== 'false' && options.bypassCorrection !== 'true';

    // Retrieve past interaction boosts for AI search memory mapping
    const interactionBoosts = await getQueryInteractionBoosts(normalizedQuery);

    // Stage 2: Merge terms and build regex patterns
    const searchBaseQuery = aiAnalysis.cleanedQuery || normalizedQuery;
    const terms = [
      searchBaseQuery,
      ...(shouldSpellcheck && aiAnalysis.correctedQuery ? [aiAnalysis.correctedQuery] : []),
      ...aiAnalysis.expandedTerms,
      ...getTransliterationsAndSynonyms(searchBaseQuery),
      ...generateFuzzyVariants(searchBaseQuery),
    ];
    const uniqueTerms = [...new Set(terms.filter((t) => t.length > 1))].slice(0, 15);
    const _regexPatterns = uniqueTerms.map((term) => new RegExp(escapeRegex(term), 'i'));

    const seasonal = await getCachedSeasonalContext();

    // Fetch distinct active categories for all three collections to match against predicted category
    const [dbProductCategories, dbEventCategories, dbGalleryCategories] = await Promise.all([
      Product.distinct('category', { isActive: true }).catch(() => []),
      Event.distinct('category', { isActive: true }).catch(() => []),
      Gallery.distinct('category', { isActive: true }).catch(() => []),
    ]);

    // Apply manual Category filter or predicted intent categories mapped to actual taxonomies
    const hasManualCategory = options.category && options.category !== 'All';
    const activeProductCategory = hasManualCategory
      ? options.category
      : aiAnalysis.category
        ? getMatchingProductCategory(aiAnalysis.category, dbProductCategories)
        : undefined;
    const activeEventCategory = hasManualCategory
      ? options.category
      : aiAnalysis.category
        ? getMatchingEventCategory(aiAnalysis.category, dbEventCategories)
        : undefined;
    const activeGalleryCategory = hasManualCategory
      ? options.category
      : aiAnalysis.category
        ? getMatchingGalleryCategory(aiAnalysis.category, dbGalleryCategories)
        : undefined;

    const items: SearchResult[] = [];
    const searchProducts = !options.type || options.type === 'all' || options.type === 'product';
    const searchEvents = !options.type || options.type === 'all' || options.type === 'event';
    const searchGalleries = options.type === 'gallery';

    const promises: Promise<void>[] = [];

    // Separate manual filters (options) from query budget constraints (aiAnalysis)
    // so we don't strictly filter out out-of-budget fallback items from MongoDB.
    const dbMinPrice = options.priceMin;
    const dbMaxPrice = options.priceMax;

    const _queryBudgetMin =
      options.priceMin === undefined ? aiAnalysis.priceMin || undefined : undefined;
    const queryBudgetMax =
      options.priceMax === undefined ? aiAnalysis.priceMax || undefined : undefined;

    if (searchProducts) {
      const productQuery = MongoQueryBuilder.create<any>()
        .withRegexFallback(uniqueTerms, [
          'title',
          'teluguTitle',
          'category',
          'tags',
          'material',
          'description',
        ])
        .withCategory(activeProductCategory)
        .withPriceRange(dbMinPrice, dbMaxPrice, 'price')
        .withTags(aiAnalysis.colors)
        .build();

      promises.push(
        Product.find(productQuery)
          .select(
            '_id title teluguTitle imageSrc category price rating reviews tags slug material description',
          )
          .limit(100)
          .maxTimeMS(5000)
          .lean()
          .then((products) => {
            for (const p of products) {
              const searchScore = computeSearchScore(
                p.title,
                p.category,
                p.tags || [],
                normalizedQuery,
                p.teluguTitle,
              );
              const seasonalBoost = computeSeasonalBoost(p.category, undefined, p.tags, seasonal);
              const popularityBoost =
                ((p.rating || 0) / 5) * 0.3 + Math.min((p.reviews || 0) / 100, 0.2);

              // Extra boost if matching parsed AI tags/styles
              let aiBoost = 1.0;
              if (aiAnalysis.style && p.description?.toLowerCase().includes(aiAnalysis.style))
                aiBoost += 0.2;
              if (aiAnalysis.tags.some((t) => p.tags?.map((pt) => pt.toLowerCase()).includes(t)))
                aiBoost += 0.25;

              const productIdStr = (p._id as any).toString();
              const interactionBoost = interactionBoosts[productIdStr] || 0;

              items.push({
                id: productIdStr,
                title: p.title,
                type: 'product',
                category: p.category,
                image: p.imageSrc,
                price: p.price,
                rating: p.rating,
                reviews: p.reviews,
                tags: p.tags,
                slug: p.slug,
                score: searchScore * seasonalBoost * aiBoost + popularityBoost + interactionBoost,
                matchSource: getMatchSource(
                  p.title,
                  p.category,
                  p.tags || [],
                  normalizedQuery,
                  p.teluguTitle,
                ),
              });
            }
          }),
      );
    }

    if (searchEvents) {
      const eventQuery = MongoQueryBuilder.create<any>()
        .withRegexFallback(uniqueTerms, ['title', 'category', 'style', 'features', 'description'])
        .withCategory(activeEventCategory)
        .withPriceRange(dbMinPrice, dbMaxPrice, 'basePrice')
        .build();

      promises.push(
        Event.find(eventQuery)
          .select('_id title category style basePrice features image description')
          .limit(100)
          .maxTimeMS(5000)
          .lean()
          .then((events) => {
            for (const e of events) {
              const searchScore = computeSearchScore(
                e.title,
                e.category,
                e.features || [],
                normalizedQuery,
              );
              const seasonalBoost = computeSeasonalBoost(e.category, e.style, e.features, seasonal);

              let aiBoost = 1.0;
              if (aiAnalysis.style && e.style?.toLowerCase().includes(aiAnalysis.style))
                aiBoost += 0.3;
              if (
                aiAnalysis.tags.some((t) => e.features?.map((ef) => ef.toLowerCase()).includes(t))
              )
                aiBoost += 0.25;

              const eventIdStr = (e._id as any).toString();
              const interactionBoost = interactionBoosts[eventIdStr] || 0;

              items.push({
                id: eventIdStr,
                title: e.title,
                type: 'event',
                category: e.category,
                style: e.style,
                image: e.image,
                price: e.basePrice,
                tags: e.features,
                score: searchScore * seasonalBoost * aiBoost + interactionBoost,
                matchSource: getMatchSource(e.title, e.category, e.features || [], normalizedQuery),
              });
            }
          }),
      );
    }

    if (searchGalleries) {
      const galleryQuery = MongoQueryBuilder.create<any>()
        .withRegexFallback(uniqueTerms, ['title', 'teluguTitle', 'category', 'tags', 'description'])
        .withCategory(activeGalleryCategory)
        .build();

      promises.push(
        Gallery.find(galleryQuery)
          .select('_id title teluguTitle image category style tags views likes')
          .limit(100)
          .maxTimeMS(5000)
          .lean()
          .then((galleries) => {
            for (const g of galleries) {
              const searchScore = computeSearchScore(
                g.title,
                g.category,
                g.tags || [],
                normalizedQuery,
                g.teluguTitle,
              );
              const popularityBoost =
                Math.log2(Math.max(g.views || 1, 1)) * 0.05 + Math.min((g.likes || 0) / 50, 0.1);

              let aiBoost = 1.0;
              if (aiAnalysis.style && g.style?.toLowerCase().includes(aiAnalysis.style))
                aiBoost += 0.25;
              if (aiAnalysis.tags.some((t) => g.tags?.map((gt) => gt.toLowerCase()).includes(t)))
                aiBoost += 0.25;

              const galleryIdStr = (g._id as any).toString();
              const interactionBoost = interactionBoosts[galleryIdStr] || 0;

              items.push({
                id: galleryIdStr,
                title: g.title,
                type: 'gallery',
                category: g.category,
                style: g.style,
                image: g.image,
                tags: g.tags,
                score: searchScore * aiBoost + popularityBoost + interactionBoost,
                matchSource: getMatchSource(
                  g.title,
                  g.category,
                  g.tags || [],
                  normalizedQuery,
                  g.teluguTitle,
                ),
              });
            }
          }),
      );
    }

    await Promise.all(promises);

    // Deduplicate items
    const seenIds = new Set<string>();
    const deduplicatedItems: SearchResult[] = [];
    for (const item of items) {
      if (!seenIds.has(item.id)) {
        seenIds.add(item.id);
        deduplicatedItems.push(item);
      }
    }

    let isFallback = false;
    let finalExpertResponse = aiAnalysis.expertResponse;
    let finalIntentSummary = aiAnalysis.intentSummary;

    // Check if we need to load fallbacks (Empty State Prevention)
    if (deduplicatedItems.length === 0) {
      isFallback = true;
      finalIntentSummary = aiAnalysis.intentSummary || 'No exact matches found';
      finalExpertResponse = `I couldn't find exact matches for your search "${query}". However, as an event planning expert, I have gathered some of our most popular items, new arrivals, and collections that you can check out!`;

      // Fetch popular products and new arrivals
      const [popularProducts, newArrivals] = await Promise.all([
        getPopularProducts(10),
        getNewArrivals(10),
      ]);

      // Map popularProducts and newArrivals to SearchResult format
      const popularMapped: SearchResult[] = popularProducts.map((p: any) => ({
        id: p.id,
        title: p.title,
        type: 'product',
        image: p.image,
        price: p.price,
        slug: p.slug,
        score: 1.0,
        matchSource: 'fallback_popular',
      }));

      const newArrivalsMapped: SearchResult[] = newArrivals.map((p: any) => ({
        id: p.id,
        title: p.title,
        type: 'product',
        image: p.image,
        price: p.price,
        slug: p.slug,
        score: 1.0,
        matchSource: 'fallback_new',
      }));

      // In fallback state, populate the recommendations nicely
      const bestMatches = popularMapped.slice(0, 4);
      const popularChoices = popularMapped.slice(4, 8);
      const budgetFriendly = newArrivalsMapped
        .filter((item) => (item.price ?? 0) <= 2000)
        .slice(0, 4);
      const trending = newArrivalsMapped.slice(4, 8);
      const similarIdeas = popularMapped.slice(0, 4);

      const total = 0;
      const paginated: SearchResult[] = [];

      const result: SearchResponse = {
        items: paginated,
        total,
        page,
        limit,
        predictedCategories: [],
        query,
        correctedQuery: undefined,
        expertResponse: finalExpertResponse,
        intentSummary: finalIntentSummary,
        isFallback,
        recommendations: {
          bestMatches,
          popularChoices,
          budgetFriendly,
          similarIdeas,
          trending,
        },
      };

      await setSearchCache('full', cacheKey, result, 10 * 60 * 1000);
      return result;
    }

    // Proximity and budget-aware sorting helper
    const targetBudgetMax = queryBudgetMax;

    const sortItems = (arr: SearchResult[], activeSort?: string) => {
      if (targetBudgetMax === undefined || targetBudgetMax === null) {
        if (activeSort === 'price_asc') {
          arr.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
        } else if (activeSort === 'price_desc') {
          arr.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
        } else if (activeSort === 'rating') {
          arr.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
        } else {
          arr.sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return (a.slug || a.id).localeCompare(b.slug || b.id);
          });
        }
        return arr;
      }

      // Separate into in-budget and out-of-budget
      const inBudget = arr.filter(
        (item) => item.price === undefined || item.price <= targetBudgetMax,
      );
      const outOfBudget = arr.filter(
        (item) => item.price !== undefined && item.price > targetBudgetMax,
      );

      // Sort in-budget using active sort
      if (activeSort === 'price_asc') {
        inBudget.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
      } else if (activeSort === 'price_desc') {
        inBudget.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
      } else if (activeSort === 'rating') {
        inBudget.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
      } else {
        inBudget.sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          return (a.slug || a.id).localeCompare(b.slug || b.id);
        });
      }

      // Sort out-of-budget strictly in ascending order of price (proximity to budget)
      outOfBudget.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));

      return [...inBudget, ...outOfBudget];
    };

    // Sort combined results for flat list (budget-aware)
    const sortedList = sortItems(deduplicatedItems, options.sort);
    deduplicatedItems.length = 0;
    deduplicatedItems.push(...sortedList);

    // Now, build structured recommendations from deduplicatedItems
    // 1. Best Matches: Sort items according to relevance/score with budget awareness
    const itemsSortedByScore = sortItems([...deduplicatedItems]);
    const bestMatches = itemsSortedByScore.slice(0, 4);

    // 2. Popular Choices: Sort items by rating / views / basePrice desc
    const popularChoices = [...deduplicatedItems]
      .sort((a, b) => {
        const popA = (a.rating ?? 0) * 10 + (a.reviews ?? 0);
        const popB = (b.rating ?? 0) * 10 + (b.reviews ?? 0);
        return popB - popA;
      })
      .slice(0, 4);

    // 3. Budget Friendly: items under parsed limit or under ₹2000 (if not), sorted price asc
    const budgetMaxLimit =
      dbMaxPrice !== undefined ? dbMaxPrice : queryBudgetMax !== undefined ? queryBudgetMax : 2000;
    const budgetFriendly = [...deduplicatedItems]
      .filter((a) => a.price !== undefined && a.price <= budgetMaxLimit)
      .sort((a, b) => (a.price ?? 0) - (b.price ?? 0))
      .slice(0, 4);

    // 4. Similar Ideas: items of type 'gallery' (inspirations) or same category
    const similarIdeas = [...deduplicatedItems]
      .filter(
        (a) => a.type === 'gallery' || (aiAnalysis.category && a.category === aiAnalysis.category),
      )
      .slice(0, 4);

    // 5. Trending: items from the itemsSortedByScore that aren't already in bestMatches
    const trending = itemsSortedByScore
      .filter((item) => !bestMatches.some((bm) => bm.id === item.id))
      .slice(0, 4);

    // Helper to backfill from bestMatches if any list is empty
    const backfill = (arr: SearchResult[]) => {
      if (arr.length === 0) return bestMatches.slice(0, 4);
      return arr;
    };

    const finalRecommendations = {
      bestMatches: backfill(bestMatches),
      popularChoices: backfill(popularChoices),
      budgetFriendly: backfill(budgetFriendly),
      similarIdeas: backfill(similarIdeas),
      trending: backfill(trending),
    };

    // Determine if we should present a spelling/translation suggestion
    let correctedQuery: string | undefined;
    if (shouldSpellcheck && aiAnalysis.correctedQuery.toLowerCase() !== normalizedQuery) {
      correctedQuery = aiAnalysis.correctedQuery;
    }

    const total = deduplicatedItems.length;
    const paginated = deduplicatedItems.slice(skip, skip + limit);

    const result: SearchResponse = {
      items: paginated,
      total,
      page,
      limit,
      predictedCategories: aiAnalysis.category ? [aiAnalysis.category] : [],
      query,
      correctedQuery,
      expertResponse: finalExpertResponse,
      intentSummary: finalIntentSummary,
      isFallback,
      recommendations: finalRecommendations,
    };

    await setSearchCache('full', cacheKey, result, 10 * 60 * 1000);
    return result;
  } catch (err: any) {
    logger.error(`[SEARCH Full] Search failed: ${err.message}`);
    return { items: [], total: 0, page, limit, predictedCategories: [], query };
  }
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

      const isDuplicate = Array.from(seen).some(
        (existing) =>
          existing.includes(normalized) ||
          normalized.includes(existing) ||
          levenshteinDistance(existing, normalized) <= 2,
      );

      if (!isDuplicate) {
        seen.add(normalized);
        trending.push({ query: normalized, count: r.count });
      }

      if (trending.length >= limit) break;
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

// ══════════════════════════════════════════════
// INTERNAL HELPERS
// ══════════════════════════════════════════════

/**
 * Expand search tokens with both direct synonyms and script transliterations (multilingual).
 */

/**
 * Maps partial search strings to intent expansions for autocomplete.
 */

/**
 * Generate keyboard character mutation patterns to catch typos.
 */

/**
 * Predict categories from direct matching keywords.
 */

/**
 * Calculates compound relevance weight score for matching items.
 */

/**
 * Find matched field source for visual mapping in overlay.
 */

/**
 * Simple Levenshtein distance for fuzzy queries.
 */
function levenshteinDistance(a: string, b: string): number {
  // Skip computation for very long strings to prevent event loop blocking
  if (a.length > 50 || b.length > 50) return Math.abs(a.length - b.length);
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
  }

  return dp[m][n];
}

/**
 * Helper to escape regex meta characters.
 */

/**
 * Maps a predicted search category to a valid product category.
 */

/**
 * Maps a predicted search category to a valid event category.
 */

/**
 * Maps a predicted search category to a valid gallery category.
 */
