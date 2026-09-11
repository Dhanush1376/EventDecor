import Product from '../models/Product';
import Event from '../models/Event';
import Gallery from '../models/Gallery';
import Category from '../models/Category';
import { getCachedSeasonalContext, computeSeasonalBoost } from './recommendation/seasonalEngine';

import logger from '../config/logger';
import { TRANSLITERATION_MAP, SYNONYM_MAP } from './search/searchDictionaries';
import {
  getQueryInteractionBoosts,
  getPopularProducts,
  getNewArrivals,
} from './search/SearchAnalyticsService';

import { getSearchCache, setSearchCache } from './search/searchCache';
import SearchIndex from '../models/SearchIndex';
import SearchPin from '../models/SearchPin';
import {
  getTransliterationsAndSynonyms,
  generateFuzzyVariants,
  predictCategories,
  getSpellCorrectedQuery,
  analyzeQueryLocally,
  analyzeQueryWithAI,
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
  oldPrice?: number;
  stockStatus?: string;
  discount?: number;
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

  if (!normalizedQuery) {
    return { suggestions: [], predictedCategories: [] };
  }

  // Check cache
  const cacheKey = `${normalizedQuery}_${limit}_v3`;
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

    // Check for pinned results
    const pins = await SearchPin.find({ keyword: baseSearchQuery, isActive: true }).populate(
      'pinnedProductIds',
      '_id title teluguTitle imageSrc primaryCategory price rating slug description material stock',
    );
    const pinnedProducts = pins.flatMap((p) => p.pinnedProductIds);
    const pinnedIds = new Set(pinnedProducts.map((p: any) => p._id.toString()));

    const spellCheck = getSpellCorrectedQuery(baseSearchQuery);
    const searchTerms = getTransliterationsAndSynonyms(baseSearchQuery);

    // Generate ngrams for query
    const queryWords = baseSearchQuery.split(/\s+/).filter(Boolean);
    const queryNgrams = queryWords.flatMap((w) => {
      const res = [];
      for (let i = 1; i <= Math.min(w.length, 6); i++) res.push(w.substring(0, i));
      return res;
    });

    const predictedCategories = predictCategories(baseSearchQuery);

    // Query SearchIndex instead of raw models
    // Fetch a larger pool to allow in-memory scoring to bubble up the best matches
    const poolLimit = 50;
    const indexResults = await SearchIndex.find({
      isActive: true,
      entityType: { $ne: 'Gallery' },
      $or: [
        { ngrams: { $in: queryNgrams } },
        { tokens: { $in: searchTerms } },
        { synonymTokens: { $in: searchTerms } },
      ],
    })
      .sort({ popularity: -1, adminBoost: -1 })
      .limit(poolLimit)
      .lean();

    const suggestions: AutocompleteResult[] = [];

    // Add category suggestions first
    for (const rawCat of predictedCategories.slice(0, 2)) {
      const cat = getMatchingProductCategory(rawCat) || rawCat;
      suggestions.push({
        id: `cat:${cat}`,
        title: cat,
        type: 'category',
        score: 1000,
      });
    }

    // Add pinned products
    for (const p of pinnedProducts) {
      suggestions.push({
        id: (p as any)._id.toString(),
        title: (p as any).title,
        type: 'product',
        category: (p as any).primaryCategory?.toString(),
        image: (p as any).imageSrc,
        price: (p as any).price,
        slug: (p as any).slug,
        score: 100, // Highest score for pins
        stockStatus: (p as any).stock > 0 ? 'in_stock' : 'out_of_stock',
      });
    }

    // Add indexed results
    for (const item of indexResults) {
      if (pinnedIds.has(item.entityId.toString())) continue;

      const itemScore =
        computeSearchScore(
          item.title,
          '',
          [],
          baseSearchQuery,
          undefined,
          undefined,
          [],
          item.ngrams,
        ) * (item.adminBoost || 1);

      // Only add items that have a reasonable match score (avoids showing unrelated items that matched a 1-char ngram)
      if (itemScore > 0.3) {
        suggestions.push({
          id: item.entityId.toString(),
          title: item.title,
          type: item.entityType.toLowerCase() as any,
          image: item.image,
          price: item.price,
          slug: item.slug,
          score: itemScore,
        });
      }
    }

    // Sort by score
    suggestions.sort((a, b) => (b.score || 0) - (a.score || 0));

    // Deduplicate suggestions by ID
    const uniqueSuggestions: AutocompleteResult[] = [];
    const seenIds = new Set();
    for (const s of suggestions) {
      if (!seenIds.has(s.id)) {
        seenIds.add(s.id);
        uniqueSuggestions.push(s);
      }
    }

    const finalSuggestions = uniqueSuggestions.slice(0, limit);

    const productIds = finalSuggestions.filter((s) => s.type === 'product').map((s) => s.id);
    if (productIds.length > 0) {
      const products = await Product.find({ _id: { $in: productIds } })
        .select('_id oldPrice')
        .lean();
      const productMap = new Map(
        products.map((p) => [(p as any)._id.toString(), (p as any).oldPrice]),
      );
      for (const s of finalSuggestions) {
        if (s.type === 'product' && productMap.has(s.id)) {
          const oldPrice = productMap.get(s.id);
          if (oldPrice) s.oldPrice = oldPrice;
        }
      }
    }

    const result = {
      suggestions: finalSuggestions,
      predictedCategories,
      correctedQuery: spellCheck.corrected !== baseSearchQuery ? spellCheck.corrected : undefined,
    };
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
    const uniqueTerms = [...new Set(terms.filter((t) => t.length > 0))].slice(0, 15);
    const _regexPatterns = uniqueTerms.map((term) => new RegExp(escapeRegex(term), 'i'));

    const seasonal = await getCachedSeasonalContext();

    // Fetch distinct active categories to match against predicted category
    const [dbProductCategories, dbEventCategories, dbGalleryCategories] = await Promise.all([
      Category.distinct('name', { isActive: true })
        .then((r) => r.map(String))
        .catch(() => [] as string[]),
      Category.distinct('name', { isActive: true })
        .then((r) => r.map(String))
        .catch(() => [] as string[]),
      Category.distinct('name', { isActive: true })
        .then((r) => r.map(String))
        .catch(() => [] as string[]),
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

    // Fetch pins
    const pins = await SearchPin.find({ keyword: normalizedQuery, isActive: true });
    const pinnedProductIds = pins.flatMap((p) => p.pinnedProductIds);

    const queryWords = searchBaseQuery.split(/\s+/).filter(Boolean);
    const wordVariants: string[] = [];
    for (const w of queryWords) {
      const lower = w.toLowerCase();
      wordVariants.push(lower);
      if (lower === 'jewelry') wordVariants.push('jewellery');
      if (lower === 'jewellery') wordVariants.push('jewelry');
      if (lower === 'tray') wordVariants.push('trays');
      if (lower === 'trays') wordVariants.push('tray');
      if (lower === 'bangle') wordVariants.push('bangles');
      if (lower === 'bangles') wordVariants.push('bangle');
    }

    const allUniqueTerms = [...new Set([...uniqueTerms, ...queryWords, ...wordVariants])];
    const searchRegexes = allUniqueTerms.map((t) => new RegExp(escapeRegex(t), 'i'));

    const queryNgrams = queryWords.flatMap((w) => {
      const res = [];
      for (let i = 1; i <= Math.min(w.length, 6); i++) res.push(w.substring(0, i));
      return res;
    });

    const entityTypesToSearch: Array<'Product' | 'Event' | 'Gallery'> = [];
    if (searchProducts) entityTypesToSearch.push('Product');
    if (searchEvents) entityTypesToSearch.push('Event');
    if (searchGalleries) entityTypesToSearch.push('Gallery');

    const indexResults = await SearchIndex.find({
      isActive: true,
      entityType: { $in: entityTypesToSearch },
      $or: [
        { ngrams: { $in: queryNgrams } },
        { tokens: { $in: allUniqueTerms } },
        { synonymTokens: { $in: allUniqueTerms } },
      ],
    }).lean();

    const matchedProductIds = [
      ...indexResults.filter((r) => r.entityType === 'Product').map((r) => r.entityId),
      ...pinnedProductIds,
    ];
    const matchedEventIds = indexResults
      .filter((r) => r.entityType === 'Event')
      .map((r) => r.entityId);
    const matchedGalleryIds = indexResults
      .filter((r) => r.entityType === 'Gallery')
      .map((r) => r.entityId);
    const pinnedSet = new Set(pinnedProductIds.map((id) => id.toString()));

    if (searchProducts) {
      let activeProductCatId: any = undefined;
      if (activeProductCategory) {
        const foundCat = await Category.findOne({
          $or: [
            { name: new RegExp(`^${escapeRegex(activeProductCategory)}$`, 'i') },
            { slug: activeProductCategory.toLowerCase() },
          ],
        })
          .select('_id')
          .lean();
        if (foundCat) activeProductCatId = foundCat._id;
      }

      const productQuery: any = { isActive: true };
      if (dbMinPrice !== undefined || dbMaxPrice !== undefined) {
        productQuery.price = {};
        if (dbMinPrice !== undefined) productQuery.price.$gte = dbMinPrice;
        if (dbMaxPrice !== undefined) productQuery.price.$lte = dbMaxPrice;
      }
      if (aiAnalysis.colors && aiAnalysis.colors.length > 0) {
        productQuery.tags = {
          $in: aiAnalysis.colors.map((c) => new RegExp(escapeRegex(c), 'i')),
        };
      }

      const textOr: any[] = [
        { title: { $in: searchRegexes } },
        { teluguTitle: { $in: searchRegexes } },
        { tags: { $in: searchRegexes } },
        { material: { $in: searchRegexes } },
        { description: { $in: searchRegexes } },
      ];
      if (matchedProductIds.length > 0) {
        textOr.push({ _id: { $in: matchedProductIds } });
      }
      if (activeProductCatId) {
        textOr.push({ primaryCategory: activeProductCatId });
        textOr.push({ secondaryCategories: activeProductCatId } as any);
      }
      productQuery.$or = textOr;

      promises.push(
        Product.find(productQuery)
          .select(
            '_id title teluguTitle imageSrc primaryCategory tags price rating reviews slug description materials stockStatus discount',
          )
          .populate('primaryCategory', 'name')
          .limit(100)
          .maxTimeMS(5000)
          .lean()
          .then((products) => {
            for (const p of products) {
              const catName =
                (p.primaryCategory as any)?.name || (p.primaryCategory as any)?.toString() || '';
              const searchScore = computeSearchScore(
                p.title,
                catName,
                p.tags || [],
                normalizedQuery,
                p.teluguTitle,
                p.description,
                p.material ? [p.material] : [],
              );
              const seasonalBoost = computeSeasonalBoost(catName, undefined, p.tags, seasonal);
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
              const pinBoost = pinnedSet.has(productIdStr) ? 50.0 : 0; // Huge boost for pins

              items.push({
                id: productIdStr,
                title: p.title,
                type: 'product',
                category: catName,
                image: p.imageSrc,
                price: p.price,
                rating: p.rating,
                reviews: p.reviews,
                tags: p.tags,
                slug: p.slug,
                score:
                  searchScore * seasonalBoost * aiBoost +
                  popularityBoost +
                  interactionBoost +
                  pinBoost,
                matchSource: getMatchSource(
                  p.title,
                  catName,
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
      let activeEventCatId: any = undefined;
      if (activeEventCategory) {
        const foundCat = await Category.findOne({
          $or: [
            { name: new RegExp(`^${escapeRegex(activeEventCategory)}$`, 'i') },
            { slug: activeEventCategory.toLowerCase() },
          ],
        })
          .select('_id')
          .lean();
        if (foundCat) activeEventCatId = foundCat._id;
      }

      const eventQuery: any = { isActive: true };
      if (dbMinPrice !== undefined || dbMaxPrice !== undefined) {
        eventQuery.basePrice = {};
        if (dbMinPrice !== undefined) eventQuery.basePrice.$gte = dbMinPrice;
        if (dbMaxPrice !== undefined) eventQuery.basePrice.$lte = dbMaxPrice;
      }

      const eventTextOr: any[] = [
        { title: { $in: searchRegexes } },
        { description: { $in: searchRegexes } },
        { features: { $in: searchRegexes } },
      ];
      if (matchedEventIds.length > 0) {
        eventTextOr.push({ _id: { $in: matchedEventIds } });
      }
      if (activeEventCatId) {
        eventTextOr.push({ primaryCategory: activeEventCatId });
      }
      eventQuery.$or = eventTextOr;

      promises.push(
        Event.find(eventQuery)
          .select('_id title primaryCategory style basePrice features image description')
          .limit(100)
          .maxTimeMS(5000)
          .lean()
          .then((events) => {
            for (const e of events) {
              const searchScore = computeSearchScore(
                e.title,
                e.primaryCategory?.toString(),
                e.features || [],
                normalizedQuery,
                undefined,
                e.description,
              );
              const seasonalBoost = computeSeasonalBoost(
                e.primaryCategory?.toString(),
                e.style,
                e.features,
                seasonal,
              );

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
                category: e.primaryCategory?.toString(),
                style: e.style,
                image: e.image,
                price: e.basePrice,
                tags: e.features,
                score: searchScore * seasonalBoost * aiBoost + interactionBoost,
                matchSource: getMatchSource(
                  e.title,
                  e.primaryCategory?.toString(),
                  e.features || [],
                  normalizedQuery,
                ),
              });
            }
          }),
      );
    }

    if (searchGalleries) {
      let activeGalleryCatId: any = undefined;
      if (activeGalleryCategory) {
        const foundCat = await Category.findOne({
          $or: [
            { name: new RegExp(`^${escapeRegex(activeGalleryCategory)}$`, 'i') },
            { slug: activeGalleryCategory.toLowerCase() },
          ],
        })
          .select('_id')
          .lean();
        if (foundCat) activeGalleryCatId = foundCat._id;
      }

      const galleryQuery: any = { isActive: true };
      const galleryTextOr: any[] = [
        { title: { $in: searchRegexes } },
        { teluguTitle: { $in: searchRegexes } },
        { tags: { $in: searchRegexes } },
        { description: { $in: searchRegexes } },
      ];
      if (matchedGalleryIds.length > 0) {
        galleryTextOr.push({ _id: { $in: matchedGalleryIds } });
      }
      if (activeGalleryCatId) {
        galleryTextOr.push({ primaryCategory: activeGalleryCatId });
      }
      galleryQuery.$or = galleryTextOr;

      promises.push(
        Gallery.find(galleryQuery)
          .select('_id title teluguTitle image primaryCategory style tags views likes')
          .limit(100)
          .maxTimeMS(5000)
          .lean()
          .then((galleries) => {
            for (const g of galleries) {
              const searchScore = computeSearchScore(
                g.title,
                g.primaryCategory?.toString(),
                g.tags || [],
                normalizedQuery,
                g.teluguTitle,
                g.description,
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
                category: g.primaryCategory?.toString(),
                style: g.style,
                image: g.image,
                tags: g.tags,
                score: searchScore * aiBoost + popularityBoost + interactionBoost,
                matchSource: getMatchSource(
                  g.title,
                  g.primaryCategory?.toString(),
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

    const sortItems = (arr: SearchResult[], activeSort?: string): SearchResult[] => {
      const copy = [...arr];
      if (targetBudgetMax === undefined || targetBudgetMax === null) {
        if (activeSort === 'price_asc') {
          copy.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
        } else if (activeSort === 'price_desc') {
          copy.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
        } else if (activeSort === 'rating') {
          copy.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
        } else {
          copy.sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return (a.slug || a.id).localeCompare(b.slug || b.id);
          });
        }
        return copy;
      }

      // Separate into in-budget and out-of-budget
      const inBudget = copy.filter(
        (item) => item.price === undefined || item.price <= targetBudgetMax,
      );
      const outOfBudget = copy.filter(
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

export { getTrendingSearches } from './search/SearchAnalyticsService';

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
