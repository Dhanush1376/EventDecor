import Product from '../models/Product';
import Event from '../models/Event';
import Gallery from '../models/Gallery';
import UserInteraction from '../models/UserInteraction';
import { getCachedSeasonalContext, computeSeasonalBoost } from './recommendation/seasonalEngine';
import { MemoryCache } from '../utils/MemoryCache';
import logger from '../config/logger';
import redisClient from '../utils/redis';
import { sanitizePromptInput, validateAIResponse } from '../utils/aiSanitizer';
import { MongoQueryBuilder } from '../utils/MongoQueryBuilder';
import {
  TRANSLITERATION_MAP,
  SYNONYM_MAP,
  CATEGORY_KEYWORDS,
  INTENT_EXPANSION_MAP,
  EVENT_KNOWLEDGE_GRAPH,
} from './search/searchDictionaries';
import {
  getLearnedMappings,
  getQueryInteractionBoosts,
  getPopularProducts,
  getNewArrivals,
} from './search/SearchAnalyticsService';

// ── In-memory caches ──
const autocompleteCache = new MemoryCache({ defaultTtlMs: 5 * 60 * 1000, maxKeys: 500 });
const trendingSearchCache = new MemoryCache({ defaultTtlMs: 15 * 60 * 1000, maxKeys: 10 });
const searchResultsCache = new MemoryCache({ defaultTtlMs: 3 * 60 * 1000, maxKeys: 200 });

// ── Redis Cache Helper ──
async function getCachedData<T>(key: string): Promise<T | null> {
  try {
    if (redisClient && redisClient.isReady) {
      const data = await redisClient.get(key);
      if (data) return JSON.parse(data) as T;
    }
  } catch (err: any) {
    logger.warn(`[SEARCH CACHE] Redis get error for key ${key}: ${err.message}`);
  }
  return null;
}

async function setCachedData<T>(key: string, data: T, ttlMs: number): Promise<void> {
  try {
    if (redisClient && redisClient.isReady) {
      const ttlSecs = Math.max(Math.round(ttlMs / 1000), 1);
      await redisClient.set(key, JSON.stringify(data), { EX: ttlSecs });
    }
  } catch (err: any) {
    logger.warn(`[SEARCH CACHE] Redis set error for key ${key}: ${err.message}`);
  }
}

async function getSearchCache<T>(
  cacheType: 'ac' | 'trending' | 'full',
  key: string,
): Promise<T | null> {
  const redisKey = `search:${cacheType}:${key}`;
  const redisCached = await getCachedData<T>(redisKey);
  if (redisCached) return redisCached;

  if (cacheType === 'ac') return autocompleteCache.get<T>(key);
  if (cacheType === 'trending') return trendingSearchCache.get<T>(key);
  return searchResultsCache.get<T>(key);
}

async function setSearchCache<T>(
  cacheType: 'ac' | 'trending' | 'full',
  key: string,
  val: T,
  ttlMs: number,
): Promise<void> {
  const redisKey = `search:${cacheType}:${key}`;
  await setCachedData(redisKey, val, ttlMs);

  if (cacheType === 'ac') autocompleteCache.set(key, val, ttlMs);
  else if (cacheType === 'trending') trendingSearchCache.set(key, val, ttlMs);
  else searchResultsCache.set(key, val, ttlMs);
}

// Expose these for intent expansion
export { TRANSLITERATION_MAP, SYNONYM_MAP, CATEGORY_KEYWORDS };

// Singularization utility to support matching plurals (like "trays" -> "tray")
export function getSingularForm(word: string): string {
  const normalized = word.toLowerCase();
  if (normalized.endsWith('ies') && normalized.length > 5) {
    return normalized.slice(0, -3) + 'y';
  }
  if (normalized.endsWith('s') && !normalized.endsWith('ss') && normalized.length > 3) {
    return normalized.slice(0, -1);
  }
  return normalized;
}

// Classifier to determine if query is "normal" (meaning we can bypass AI API)
export function isNormalSearch(query: string): boolean {
  const normalized = query.toLowerCase().trim();
  if (normalized.length < 3) return true;

  const words = normalized.split(/\s+/);

  // Stop words to ignore
  const stopWords = new Set([
    'for',
    'a',
    'an',
    'the',
    'in',
    'of',
    'with',
    'and',
    'or',
    'to',
    'at',
    'by',
    'is',
    'are',
    'am',
    'want',
    'need',
    'show',
    'find',
    'me',
    'please',
    'i',
  ]);

  // Budget/Price keywords and indicators
  const budgetIndicators = new Set([
    'under',
    'below',
    'less',
    'than',
    'within',
    'budget',
    'rs',
    'inr',
    'k',
    'lakh',
    'lopa',
    'lopala',
    'takkuva',
    'thakkuva',
    'kante',
    'ధర',
    'లోపల',
    'తక్కువ',
    'కంటే',
  ]);

  let knownWordsCount = 0;
  let unknownWordsCount = 0;

  for (const word of words) {
    const cleanWord = word.replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '').trim();
    if (!cleanWord) continue;
    if (stopWords.has(cleanWord)) continue;
    if (budgetIndicators.has(cleanWord)) {
      knownWordsCount++;
      continue;
    }
    // Check if it's a number
    if (/^\d+(\.\d+)?$/.test(cleanWord)) {
      knownWordsCount++;
      continue;
    }

    const singular = getSingularForm(cleanWord);

    const inTrans =
      TRANSLITERATION_MAP[cleanWord] !== undefined || TRANSLITERATION_MAP[singular] !== undefined;
    const inSyn = SYNONYM_MAP[cleanWord] !== undefined || SYNONYM_MAP[singular] !== undefined;
    const inCat = Object.values(CATEGORY_KEYWORDS).some(
      (kws) => kws.includes(cleanWord) || kws.includes(singular),
    );
    const inGraph = Object.values(EVENT_KNOWLEDGE_GRAPH).some(
      (g) =>
        g.aliases.includes(cleanWord) ||
        g.aliases.includes(singular) ||
        g.teluguAliases.includes(cleanWord) ||
        g.teluguAliases.includes(singular) ||
        g.searchTerms.includes(cleanWord) ||
        g.searchTerms.includes(singular),
    );
    const isColor = [
      'red',
      'yellow',
      'gold',
      'golden',
      'white',
      'pink',
      'rose',
      'orange',
      'green',
      'blue',
      'silver',
      'ivory',
      'cream',
      'peach',
      'purple',
      'maroon',
    ].includes(singular);
    const isStyle = [
      'traditional',
      'modern',
      'luxury',
      'minimalist',
      'simple',
      'heritage',
      'ethnic',
      'desi',
      'classical',
      'contemporary',
      'minimal',
      'premium',
      'exclusive',
      'grand',
      'royal',
      'cheap',
    ].includes(singular);

    if (inTrans || inSyn || inCat || inGraph || isColor || isStyle) {
      knownWordsCount++;
    } else {
      unknownWordsCount++;
    }
  }

  // If we have recognized words and very few unrecognized ones, bypass AI.
  if (knownWordsCount > 0 && unknownWordsCount <= 1) {
    return true;
  }

  // If it's pure budget search e.g. "under 1000", that's normal
  if (words.some((w) => budgetIndicators.has(w)) && unknownWordsCount <= 1) {
    return true;
  }

  return false;
}

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

export interface AIAnalysisResult {
  detectedLanguage: string;
  correctedQuery: string;
  category: string | null;
  style: string | null;
  colors: string[];
  tags: string[];
  priceMin: number | null;
  priceMax: number | null;
  expandedTerms: string[];
  expertResponse?: string;
  intentSummary?: string;
  cleanedQuery?: string;
}

// ══════════════════════════════════════════════
// AI QUERY ANALYSIS & FALLBACK
// ══════════════════════════════════════════════

/**
 * Parses query with local heuristics, identifying categories, colors, price ranges, and tags.
 */
export function analyzeQueryLocally(query: string): AIAnalysisResult {
  const normalized = query.toLowerCase().trim();
  const words = normalized.split(/\s+/);

  let priceMax: number | null = null;
  const priceMin: number | null = null;

  // Enhanced Regex to extract budget limit (English, Telugu transliterated, and Telugu native scripts)
  const englishPattern =
    /(?:under|below|less than|within|budget|price)\s*(?:rs\.?|inr)?\s*(\d+(?:\.\d+)?)\s*(k|lakh)?/i;
  const reversePattern =
    /(\d+(?:\.\d+)?)\s*(k|lakh)?\s*(?:under|below|less than|within|lopala|lopa|kante takkuva|kante thakkuva|takkuva|thakkuva|లోపల|కంటే తక్కువ|తక్కువ)/i;

  let priceMaxMatch = normalized.match(englishPattern);
  if (!priceMaxMatch) {
    priceMaxMatch = normalized.match(reversePattern);
  }

  if (priceMaxMatch) {
    let val = parseFloat(priceMaxMatch[1]);
    const unit = priceMaxMatch[2]?.toLowerCase();
    if (unit === 'k') val *= 1000;
    else if (unit === 'lakh') val *= 100000;
    priceMax = Math.round(val);
  } else {
    const kMatch = normalized.match(/(\d+)\s*k/i);
    if (kMatch) {
      priceMax = parseInt(kMatch[1], 10) * 1000;
    } else {
      const numMatch = normalized.match(/(\d{4,6})/); // Match 4-6 digit numbers
      if (numMatch) {
        priceMax = parseInt(numMatch[1], 10);
      }
    }
  }

  // Clean the query from budget-related terms
  let cleanedQuery = normalized;
  if (priceMaxMatch) {
    cleanedQuery = cleanedQuery.replace(priceMaxMatch[0], '');
  }
  cleanedQuery = cleanedQuery.replace(
    /(?:under|below|less than|within|budget|price)\s*(?:rs\.?|inr)?\s*(\d+(?:\.\d+)?)\s*(k|lakh)?/gi,
    '',
  );
  cleanedQuery = cleanedQuery.replace(
    /(\d+(?:\.\d+)?)\s*(k|lakh)?\s*(?:under|below|less than|within|lopala|lopa|kante takkuva|kante thakkuva|takkuva|thakkuva|లోపల|కంటే తక్కువ|తక్కువ)/gi,
    '',
  );
  cleanedQuery = cleanedQuery.replace(/\b\d+\s*k\b/gi, '');
  cleanedQuery = cleanedQuery.replace(/\b\d{4,6}\b/g, ''); // strip remaining numbers
  cleanedQuery = cleanedQuery.replace(/\s+/g, ' ').trim();

  // Detect style
  let style: string | null = null;
  if (
    normalized.includes('traditional') ||
    normalized.includes('heritage') ||
    normalized.includes('ethnic') ||
    normalized.includes('desi') ||
    normalized.includes('classical')
  ) {
    style = 'traditional';
  } else if (
    normalized.includes('modern') ||
    normalized.includes('contemporary') ||
    normalized.includes('minimal')
  ) {
    style = 'modern';
  } else if (
    normalized.includes('luxury') ||
    normalized.includes('premium') ||
    normalized.includes('exclusive') ||
    normalized.includes('grand') ||
    normalized.includes('royal')
  ) {
    style = 'luxury';
  } else if (
    normalized.includes('simple') ||
    normalized.includes('budget') ||
    normalized.includes('cheap')
  ) {
    style = 'simple';
  }

  // Detect category
  let category: string | null = null;
  const expandedFromGraph: string[] = [];

  // 1. Check Event Knowledge Graph first
  for (const [eventName, data] of Object.entries(EVENT_KNOWLEDGE_GRAPH)) {
    if (
      data.aliases.some((alias) => normalized.includes(alias)) ||
      data.teluguAliases.some((alias) => normalized.includes(alias))
    ) {
      category = eventName;
      expandedFromGraph.push(...data.searchTerms, ...data.products.map((p) => p.toLowerCase()));
      break;
    }
  }

  // 2. Check standard Category Keywords
  if (!category) {
    for (const [catName, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      if (keywords.some((kw) => normalized.includes(kw))) {
        category = catName;
        break;
      }
    }
  }

  // Detect colors
  const colorPalette = [
    'red',
    'yellow',
    'gold',
    'golden',
    'white',
    'pink',
    'rose',
    'orange',
    'green',
    'blue',
    'silver',
    'ivory',
    'cream',
    'peach',
    'purple',
    'maroon',
  ];
  const colors = colorPalette.filter((color) => normalized.includes(color));

  // Detect tags
  const potentialTags = [
    'balloons',
    'balloon',
    'flowers',
    'flower',
    'marigold',
    'jasmine',
    'rose',
    'garland',
    'backdrop',
    'stage',
    'entrance',
    'welcome board',
    'coconut',
    'tray',
    'thali',
    'diyas',
    'lamps',
    'lights',
    'lighting',
    'candles',
    'leaves',
    'banana',
    'mango',
    'curtain',
    'drapes',
  ];
  const tags = potentialTags.filter((t) => normalized.includes(t));

  // Basic script-based language check
  const teluguRegex = /[\u0c00-\u0c7f]/;
  const detectedLanguage = teluguRegex.test(query) ? 'telugu' : 'english';

  const expandedTerms = [
    ...new Set([...getTransliterationsAndSynonyms(cleanedQuery), ...expandedFromGraph]),
  ];

  // Construct dynamic expertResponse and intentSummary local fallbacks
  let intentSummary = 'Custom Search';
  let expertResponse =
    "I've searched our collection for traditional Indian crafts and decor matching your request. Here are my top recommendations.";

  const categoryLabel = category ? category : tags[0] ? tags[0] : '';
  const styleLabel = style ? `${style.charAt(0).toUpperCase()}${style.slice(1)}` : '';
  const budgetLabel = priceMax ? `under ₹${priceMax.toLocaleString('en-IN')}` : '';

  if (categoryLabel && budgetLabel) {
    intentSummary = `${styleLabel ? styleLabel + ' ' : ''}${categoryLabel} ${budgetLabel}`;
    expertResponse = `I've put together some beautiful ${styleLabel ? styleLabel.toLowerCase() + ' ' : ''}${categoryLabel.toLowerCase()} selections ${budgetLabel} that fit your budget perfectly. Let me know if you would like to customize these!`;
  } else if (categoryLabel) {
    intentSummary = `${styleLabel ? styleLabel + ' ' : ''}${categoryLabel} Ideas`;
    expertResponse = `Here are some stunning ${styleLabel ? styleLabel.toLowerCase() + ' ' : ''}${categoryLabel.toLowerCase()} decoration ideas for your ceremony. You can filter them by budget using the price controls.`;
  } else if (budgetLabel) {
    intentSummary = `Decorations ${budgetLabel}`;
    expertResponse = `I found some lovely handcrafted props and setups ${budgetLabel}. Check out these budget-friendly recommendations.`;
  }

  return {
    detectedLanguage,
    correctedQuery: query,
    category,
    style,
    colors,
    tags,
    priceMin,
    priceMax,
    expandedTerms,
    expertResponse,
    intentSummary,
    cleanedQuery,
  };
}

/**
 * Call Groq API to perform AI-based semantic parsing of user search queries.
 */
export async function analyzeQueryWithAI(query: string): Promise<AIAnalysisResult> {
  const normalizedQuery = query.toLowerCase().trim();

  const cacheKey = `ai_analysis:${normalizedQuery}`;
  const cached = await getSearchCache<AIAnalysisResult>('full', cacheKey);
  if (cached) return cached;

  if (isNormalSearch(normalizedQuery)) {
    logger.info(`[SEARCH AI] Bypassing AI API for normal query: "${normalizedQuery}"`);
    const localResult = analyzeQueryLocally(normalizedQuery);
    await setSearchCache('full', cacheKey, localResult, 24 * 60 * 60 * 1000);
    return localResult;
  }

  // Sanitize input before AI processing
  const { sanitized: safeQuery, threatScore, blocked } = sanitizePromptInput(normalizedQuery);

  // If input is blocked (high threat score), skip AI entirely
  if (blocked || threatScore >= 5) {
    logger.warn(`[SEARCH AI] Skipping AI analysis due to threat score ${threatScore} for query`);
    const local = analyzeQueryLocally(safeQuery);
    return local;
  }

  if (!process.env.GROQ_API_KEY) {
    const local = analyzeQueryLocally(safeQuery);
    return local;
  }

  try {
    // Use sanitized input in prompt — never embed raw user input
    const prompt = `
    You are an advanced search query analyzer and NLP engine for "Siri Arts & Crafts" (an Indian wedding, festival, and event decoration platform).
    You are designed as a Telugu-first semantic AI search analyzer. The majority of customers search using Telugu, transliterated Telugu (English letters), mixed Telugu-English, or local event terminology.
    Analyze the following user search query and output a structured JSON response.

    Query: "${safeQuery}"

    Linguistic Guidelines:
    1. DETECT LANGUAGE: Identify the language (english, telugu, hinglish, mixed).
    2. TELUGU-FIRST SEMANTIC MAPPING:
       - If the user uses Telugu script (e.g. "పెళ్లి", "శీమంతం"), translate/map to English equivalents ("wedding", "baby shower").
       - If the user uses transliterated Telugu/Hinglish (e.g., "pelli", "seemantham", "pendli", "gruhapravesam", "gruhapravesh", "kobbari bondam", "kumkuma", "pasupu", "satyanarayana vratam", "aksharabhyasam", "langa voni", "thambulam"), map to proper English terms (e.g., pelli/pendli -> wedding, seemantham -> baby shower, gruhapravesam -> housewarming, kobbari bondam -> coconut, pasupu -> haldi/turmeric, thambulam -> return gift/tray).
    3. NO EMPTY EXPANDED TERMS:
       - For Telugu or transliterated queries, NEVER return empty expandedTerms. Always suggest at least 5 related English product keywords and synonyms (e.g., for "pelli" -> ["wedding", "stage decor", "mandap", "garland", "coconut decor", "welcome board", "thambulam"]).
       - If the query matches an event (like Housewarming/Gruhapravesam), expand with related pooja items, torans, mango leaves, and welcome signboards.

    Extraction Guidelines:
    1. category: Map to one of the following exact categories if matching or relevant:
       "Wedding", "Birthday", "Pooja", "Engagement", "Floral", "Traditional", "Modern", "Lighting", "Stage", "Diwali", "Housewarming", "BabyShower", "Anniversary", "Corporate", "NamingCeremony", "HalfSareeFunction", "Haldi", "Mehendi", "Sangeet".
    2. style: (traditional, modern, luxury, minimalist, simple).
    3. colors: Array of color words if mentioned (e.g. red, yellow, gold, white, pink, rose, orange, green, blue).
    4. tags: List of keyword tags (e.g. balloons, flowers, backdrop, garlands, diyas, coconut, tray, welcome board).
    5. priceMax: Extracted budget limit. If query is "under 50k" or "under 50000" or "below 20000", parse the budget (e.g. 50000). Otherwise null.
    6. priceMin: Extracted min budget limit. Otherwise null.
    7. correctedQuery: The corrected version of the query in clean English/Telugu.
    8. expandedTerms: Array of related terms, synonyms, and transliterations (e.g. ["wedding", "stage decor", "mandap", "garland", "coconut", "thambulam"]).
    9. expertResponse: A warm, helpful 1-2 sentence response from an event planner expert explaining what we found based on their query details. For example: "I found some lovely traditional coconut decor designs under ₹1000. These are very affordable options that look beautiful for wedding or housewarming ceremonies!"
    10. intentSummary: A short title summarizing the query (e.g., "Coconut decor under ₹1000", "Traditional Telugu pelli decoration", "Simple birthday setup under ₹5000").

    Your output MUST be a valid JSON object only (do not wrap in markdown code blocks, do not write anything else), matching the format:
    {
      "detectedLanguage": "english | telugu | hinglish | mixed",
      "correctedQuery": "clean corrected query",
      "category": "Wedding" | "Birthday" | "Pooja" | "Engagement" | "Festival" | "Housewarming" | "BabyShower" | null,
      "style": "traditional" | "modern" | "luxury" | "minimalist" | null,
      "colors": ["color1", "color2"],
      "tags": ["tag1", "tag2"],
      "priceMin": number | null,
      "priceMax": number | null,
      "expandedTerms": ["term1", "term2"],
      "expertResponse": "conversational expert response statement",
      "intentSummary": "short intent label summary"
    }
    `;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 800); // 800ms timeout for fast fallback

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.1,
        max_tokens: 300,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Groq responded with ${response.status}`);
    }

    const data: any = await response.json();
    const text = data.choices?.[0]?.message?.content;
    if (text) {
      const rawParsed = JSON.parse(text.trim());

      // Validate AI response against expected schema (prevents arbitrary JSON injection)
      const validated = validateAIResponse(rawParsed);
      if (!validated) {
        logger.warn(
          '[SEARCH AI] AI response failed schema validation, falling back to local parser',
        );
        throw new Error('AI response schema validation failed');
      }

      // Compute cleanedQuery for AI response too!
      let cleanedQuery = normalizedQuery;
      if (validated.priceMax) {
        cleanedQuery = normalizedQuery
          .replace(
            /(?:under|below|less than|within|budget|price)\s*(?:rs\.?|inr)?\s*(\d+(?:\.\d+)?)\s*(k|lakh)?/gi,
            '',
          )
          .replace(
            /(\d+(?:\.\d+)?)\s*(k|lakh)?\s*(?:under|below|less than|within|lopa|lopala|takkuva|thakkuva|kante takkuva|kante thakkuva|లోపల|తక్కువ|కంటే తక్కువ)/gi,
            '',
          )
          .replace(/\b\d+\s*k\b/gi, '')
          .replace(/\b\d{4,6}\b/g, '')
          .replace(/\s+/g, ' ')
          .trim();
      }
      (validated as any).cleanedQuery = cleanedQuery;

      await setSearchCache('full', cacheKey, validated, 24 * 60 * 60 * 1000);
      return validated;
    }
  } catch (err: any) {
    logger.warn(
      `[SEARCH AI] AI query parsing failed: ${err.message}. Falling back to local parser.`,
    );
  }

  const localResult = analyzeQueryLocally(safeQuery);
  await setSearchCache('full', cacheKey, localResult, 60 * 60 * 1000);
  return localResult;
}

// ══════════════════════════════════════════════
// PUBLIC API
// ══════════════════════════════════════════════

/**
 * Get fast autocomplete suggestions for a search query.
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
    const regexPatterns = searchTerms.map((term) => new RegExp(escapeRegex(term), 'i'));

    // Predict intent categories using cleaned query
    const predictedCategories = predictCategories(baseSearchQuery);

    const productQuery = MongoQueryBuilder.create<any>()
      .withRegexFallback(searchTerms, ['title', 'teluguTitle', 'category', 'tags'])
      .build();

    const eventQuery = MongoQueryBuilder.create<any>()
      .withRegexFallback(searchTerms, ['title', 'category', 'style', 'features'])
      .build();

    const galleryQuery = MongoQueryBuilder.create<any>()
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
      return b.score - a.score;
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
    const regexPatterns = uniqueTerms.map((term) => new RegExp(escapeRegex(term), 'i'));

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

    const queryBudgetMin =
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
          arr.sort((a, b) => b.score - a.score);
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
        inBudget.sort((a, b) => b.score - a.score);
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
export function getTransliterationsAndSynonyms(query: string): string[] {
  const normalized = query.toLowerCase().trim();
  const words = normalized.split(/\s+/);
  const expanded = new Set<string>([normalized]);

  for (const word of words) {
    const singular = getSingularForm(word);

    // Check transliterations first
    const trans = TRANSLITERATION_MAP[word] || TRANSLITERATION_MAP[singular];
    if (trans) {
      for (const t of trans) {
        expanded.add(t);
        expanded.add(normalized.replace(word, t));

        // Synonyms for transliteration
        const synonyms = SYNONYM_MAP[t];
        if (synonyms) {
          for (const syn of synonyms) {
            expanded.add(syn);
            expanded.add(normalized.replace(word, syn));
          }
        }
      }
    }

    // Check direct synonyms
    const synonyms = SYNONYM_MAP[word] || SYNONYM_MAP[singular];
    if (synonyms) {
      for (const syn of synonyms) {
        expanded.add(syn);
        expanded.add(normalized.replace(word, syn));

        // Reverse-map synonyms to transliterated keys
        for (const [key, val] of Object.entries(TRANSLITERATION_MAP)) {
          if (val.includes(syn)) {
            expanded.add(key);
            expanded.add(normalized.replace(word, key));
          }
        }
      }
    }
  }

  for (const word of words) {
    const singular = getSingularForm(word);
    if (word.length >= 2) {
      expanded.add(word);
      expanded.add(singular);
      const trans = TRANSLITERATION_MAP[word] || TRANSLITERATION_MAP[singular];
      if (trans) trans.forEach((t) => expanded.add(t));
      const synonyms = SYNONYM_MAP[word] || SYNONYM_MAP[singular];
      if (synonyms) synonyms.forEach((s) => expanded.add(s));
    }
  }

  // Check Event Knowledge Graph
  for (const [eventName, data] of Object.entries(EVENT_KNOWLEDGE_GRAPH)) {
    if (
      data.aliases.some((alias) => normalized.includes(alias)) ||
      data.teluguAliases.some((alias) => normalized.includes(alias))
    ) {
      data.searchTerms.forEach((t) => expanded.add(t));
      data.products.forEach((p) => expanded.add(p.toLowerCase()));
    }
  }

  // Check learned mappings from continuous learning loop
  const learned = getLearnedMappings();
  const learnedSyns = learned[normalized];
  if (learnedSyns) {
    for (const syn of learnedSyns) {
      expanded.add(syn.toLowerCase());
    }
  }

  // Cap total expanded terms to prevent unbounded regex growth
  return Array.from(expanded).slice(0, 30);
}

/**
 * Maps partial search strings to intent expansions for autocomplete.
 */
function getIntentExpansions(query: string): string[] {
  const normalized = query.toLowerCase().trim();
  const intents: string[] = [];

  for (const [key, expansions] of Object.entries(INTENT_EXPANSION_MAP)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      intents.push(...expansions);
    }
  }

  // Check Event Knowledge Graph
  for (const [eventName, data] of Object.entries(EVENT_KNOWLEDGE_GRAPH)) {
    if (
      data.aliases.some((alias) => normalized.includes(alias) || alias.includes(normalized)) ||
      data.teluguAliases.some((alias) => normalized.includes(alias) || alias.includes(normalized))
    ) {
      intents.push(...data.products);
    }
  }

  // Deduplicate and return a subset
  return [...new Set(intents)].slice(0, 4);
}

/**
 * Generate keyboard character mutation patterns to catch typos.
 */
export function generateFuzzyVariants(query: string): string[] {
  if (query.length < 3 || query.length > 50) return []; // Skip for very short or very long inputs

  const variants = new Set<string>();

  // Transpositions
  for (let i = 0; i < query.length - 1; i++) {
    const swapped = query.slice(0, i) + query[i + 1] + query[i] + query.slice(i + 2);
    variants.add(swapped);
  }

  const keyboardMap: Record<string, string[]> = {
    a: ['s', 'q'],
    s: ['a', 'd'],
    d: ['s', 'f'],
    f: ['d', 'g'],
    g: ['f', 'h'],
    h: ['g', 'j'],
    j: ['h', 'k'],
    k: ['j', 'l'],
    l: ['k'],
    q: ['w', 'a'],
    w: ['q', 'e'],
    e: ['w', 'r'],
    r: ['e', 't'],
    t: ['r', 'y'],
    y: ['t', 'u'],
    u: ['y', 'i'],
    i: ['u', 'o'],
    o: ['i', 'p'],
    p: ['o'],
    z: ['x'],
    x: ['z', 'c'],
    c: ['x', 'v'],
    v: ['c', 'b'],
    b: ['v', 'n'],
    n: ['b', 'm'],
    m: ['n'],
  };

  for (let i = 0; i < query.length && variants.size < 6; i++) {
    const char = query[i].toLowerCase();
    const adjacents = keyboardMap[char];
    if (adjacents) {
      for (const adj of adjacents) {
        variants.add(query.slice(0, i) + adj + query.slice(i + 1));
      }
    }
  }

  return Array.from(variants).slice(0, 6);
}

/**
 * Predict categories from direct matching keywords.
 */
function predictCategories(query: string): string[] {
  const words = query.toLowerCase().split(/\s+/);
  const scores = new Map<string, number>();

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0;
    for (const word of words) {
      const singular = getSingularForm(word);
      for (const keyword of keywords) {
        if (keyword === word || keyword === singular) score += 3;
        else if (
          keyword.includes(word) ||
          word.includes(keyword) ||
          keyword.includes(singular) ||
          singular.includes(keyword)
        )
          score += 1;
      }
    }
    if (score > 0) scores.set(category, (scores.get(category) || 0) + score);
  }

  for (const [eventName, data] of Object.entries(EVENT_KNOWLEDGE_GRAPH)) {
    let score = 0;
    for (const word of words) {
      const singular = getSingularForm(word);
      if (
        data.aliases.includes(word) ||
        data.aliases.includes(singular) ||
        data.teluguAliases.includes(word) ||
        data.teluguAliases.includes(singular)
      )
        score += 4;
      else if (
        data.aliases.some(
          (a) =>
            a.includes(word) || word.includes(a) || a.includes(singular) || singular.includes(a),
        )
      )
        score += 2;
    }
    if (score > 0) scores.set(eventName, (scores.get(eventName) || 0) + score);
  }

  return Array.from(scores.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([cat]) => cat)
    .slice(0, 3);
}

/**
 * Calculates compound relevance weight score for matching items.
 */
export function computeSearchScore(
  title: string,
  category: string,
  tags: string[],
  query: string,
  teluguTitle?: string,
): number {
  const normalizedTitle = (title || '').toLowerCase();
  const normalizedTeluguTitle = (teluguTitle || '').toLowerCase();
  const normalizedCategory = (category || '').toLowerCase();
  const normalizedTags = (tags || []).map((t) => t.toLowerCase());
  const queryWords = query.toLowerCase().split(/\s+/);

  let score = 0;

  // Exact matching
  if (normalizedTitle === query || (normalizedTeluguTitle && normalizedTeluguTitle === query)) {
    score += 1.5;
  } else if (
    normalizedTitle.includes(query) ||
    (normalizedTeluguTitle && normalizedTeluguTitle.includes(query))
  ) {
    score += 1.0;
  }

  // Prefix matching
  if (
    normalizedTitle.startsWith(query) ||
    (normalizedTeluguTitle && normalizedTeluguTitle.startsWith(query))
  ) {
    score += 0.4;
  }

  // Word-level occurrences
  for (const word of queryWords) {
    if (normalizedTitle.includes(word)) score += 0.4;
    if (normalizedTeluguTitle && normalizedTeluguTitle.includes(word)) score += 0.5;
  }

  // Category matching
  for (const word of queryWords) {
    if (normalizedCategory.includes(word)) score += 0.3;
  }

  // Tag matching
  for (const word of queryWords) {
    if (normalizedTags.some((t) => t.includes(word))) score += 0.2;
  }

  return Math.min(score, 3.0);
}

/**
 * Find matched field source for visual mapping in overlay.
 */
function getMatchSource(
  title: string,
  category: string,
  tags: string[],
  query: string,
  teluguTitle?: string,
): string {
  const normalizedQuery = query.toLowerCase();

  if ((title || '').toLowerCase().includes(normalizedQuery)) return 'title';
  if (teluguTitle && teluguTitle.toLowerCase().includes(normalizedQuery)) return 'teluguTitle';
  if ((category || '').toLowerCase().includes(normalizedQuery)) return 'category';
  if ((tags || []).some((t) => t.toLowerCase().includes(normalizedQuery))) return 'tags';
  return 'fuzzy';
}

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
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Maps a predicted search category to a valid product category.
 */
export function getMatchingProductCategory(
  predicted: string,
  dbCategories?: string[],
): string | null {
  const categories = dbCategories || [
    'Coconut Decorations',
    'Bangle Trays',
    'Decorative Baskets',
    'Chocolate Trays',
    'Dry Fruit Trays',
    'Engagement Ring Trays',
    'Harathi Plates',
    'Jewellery Trays',
    'Photo Bouquets',
    'Traditional Wedding Decor',
    'Pooja Decoration Sets',
    'Floral Decoration Sets',
    'Return Gift Hampers',
  ];
  const p = predicted.toLowerCase();

  let mapped: string | null = null;
  if (p === 'wedding' || p === 'traditional') {
    mapped = 'Traditional Wedding Decor';
  } else if (p === 'pooja') {
    mapped = 'Pooja Decoration Sets';
  } else if (p === 'engagement') {
    mapped = 'Engagement Ring Trays';
  } else if (p === 'floral') {
    mapped = 'Floral Decoration Sets';
  }

  if (mapped && categories.some((c) => c.toLowerCase() === mapped!.toLowerCase())) {
    return categories.find((c) => c.toLowerCase() === mapped!.toLowerCase())!;
  }

  const match = categories.find((c) => c.toLowerCase().includes(p) || p.includes(c.toLowerCase()));
  return match || null;
}

/**
 * Maps a predicted search category to a valid event category.
 */
export function getMatchingEventCategory(
  predicted: string,
  dbCategories?: string[],
): string | null {
  const categories = dbCategories || [
    'Wedding Ceremony',
    'Engagement Ceremony',
    'Reception Decoration',
    'Traditional Pooja Setup',
  ];
  const p = predicted.toLowerCase();

  let mapped: string | null = null;
  if (p === 'wedding') {
    mapped = 'Wedding Ceremony';
  } else if (p === 'engagement') {
    mapped = 'Engagement Ceremony';
  } else if (p === 'pooja' || p === 'traditional') {
    mapped = 'Traditional Pooja Setup';
  }

  if (mapped && categories.some((c) => c.toLowerCase() === mapped!.toLowerCase())) {
    return categories.find((c) => c.toLowerCase() === mapped!.toLowerCase())!;
  }

  const match = categories.find((c) => c.toLowerCase().includes(p) || p.includes(c.toLowerCase()));
  return match || null;
}

/**
 * Maps a predicted search category to a valid gallery category.
 */
export function getMatchingGalleryCategory(
  predicted: string,
  dbCategories?: string[],
): string | null {
  const categories = dbCategories || [
    'Traditional Wedding Decor',
    'Floral Decoration Sets',
    'Plate Decoration & Packing',
  ];
  const p = predicted.toLowerCase();

  let mapped: string | null = null;
  if (p === 'wedding' || p === 'traditional') {
    mapped = 'Traditional Wedding Decor';
  } else if (p === 'floral') {
    mapped = 'Floral Decoration Sets';
  } else if (p === 'engagement' || p === 'plate') {
    mapped = 'Plate Decoration & Packing';
  }

  if (mapped && categories.some((c) => c.toLowerCase() === mapped!.toLowerCase())) {
    return categories.find((c) => c.toLowerCase() === mapped!.toLowerCase())!;
  }

  const match = categories.find((c) => c.toLowerCase().includes(p) || p.includes(c.toLowerCase()));
  return match || null;
}
