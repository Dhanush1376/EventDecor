import Product from '../models/Product';
import Event from '../models/Event';
import Gallery from '../models/Gallery';
import UserInteraction from '../models/UserInteraction';
import { getCachedSeasonalContext, computeSeasonalBoost } from './recommendation/seasonalEngine';
import { MemoryCache } from '../utils/MemoryCache';
import logger from '../config/logger';
import redisClient from '../utils/redis';
import { sanitizePromptInput, validateAIResponse, htmlEscapeString } from '../utils/aiSanitizer';

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

async function getSearchCache<T>(cacheType: 'ac' | 'trending' | 'full', key: string): Promise<T | null> {
  const redisKey = `search:${cacheType}:${key}`;
  const redisCached = await getCachedData<T>(redisKey);
  if (redisCached) return redisCached;

  if (cacheType === 'ac') return autocompleteCache.get<T>(key);
  if (cacheType === 'trending') return trendingSearchCache.get<T>(key);
  return searchResultsCache.get<T>(key);
}

async function setSearchCache<T>(cacheType: 'ac' | 'trending' | 'full', key: string, val: T, ttlMs: number): Promise<void> {
  const redisKey = `search:${cacheType}:${key}`;
  await setCachedData(redisKey, val, ttlMs);

  if (cacheType === 'ac') autocompleteCache.set(key, val, ttlMs);
  else if (cacheType === 'trending') trendingSearchCache.set(key, val, ttlMs);
  else searchResultsCache.set(key, val, ttlMs);
}

// ── Multilingual Translation & Transliteration Dictionary ──
const TRANSLITERATION_MAP: Record<string, string[]> = {
  // Telugu in English script
  pelli: ['wedding', 'marriage', 'kalyanam'],
  pendli: ['wedding', 'marriage', 'kalyanam'],
  kalyanam: ['wedding', 'marriage'],
  shadi: ['wedding', 'marriage'],
  vivaham: ['wedding', 'marriage'],
  madapam: ['mandap', 'stage'],
  mandapam: ['mandap', 'stage'],
  nischayam: ['engagement'],
  pasupu: ['haldi', 'yellow'],
  poola: ['flower', 'floral'],
  poolu: ['flower', 'floral'],
  puja: ['pooja'],
  deepavali: ['diwali'],
  muggu: ['rangoli'],
  kolam: ['rangoli'],
  alankarana: ['decoration', 'decor'],
  demudu: ['pooja', 'god'],
  varalakshmi: ['pooja', 'festival'],
  sravanamasam: ['pooja', 'traditional'],
  pellikuturu: ['haldi', 'bridal'],
  pelliaspatalu: ['wedding', 'marriage'],
  // Hinglish
  shaadi: ['wedding', 'marriage'],
  dulhan: ['bride'],
  dulha: ['groom'],
  shandar: ['luxury', 'premium'],
  sasta: ['cheap', 'budget', 'simple'],
  accha: ['good', 'premium'],
  phool: ['flower', 'floral'],
  genda: ['marigold'],
  diya: ['lamps', 'lighting'],
  shubh: ['pooja', 'traditional'],
  vivah: ['wedding'],
  // Telugu Script
  పెళ్లి: ['wedding', 'marriage', 'pelli'],
  పెండ్లి: ['wedding', 'marriage', 'pelli'],
  కళ్యాణం: ['wedding', 'marriage', 'kalyanam'],
  మండపం: ['mandap', 'stage', 'mandapam'],
  నిశ్చితార్థం: ['engagement', 'nischayam'],
  హల్దీ: ['haldi', 'pasupu'],
  మెహందీ: ['mehendi'],
  పూజ: ['pooja', 'puja'],
  దీపావళి: ['diwali', 'deepavali'],
  ముగ్గు: ['rangoli', 'muggu'],
  అలంకరణ: ['decoration', 'decor', 'alankarana'],
  పువ్వులు: ['flower', 'floral', 'poolu'],
  బంగారు: ['gold', 'golden'],
  రంగులు: ['colors'],
};

// ── Synonym expansion map for decor/event domain ──
const SYNONYM_MAP: Record<string, string[]> = {
  mandap:      ['mandapam', 'stage', 'wedding altar', 'wedding stage', 'ceremony stage'],
  mandapam:    ['mandap', 'stage', 'wedding altar'],
  wedding:     ['marriage', 'shaadi', 'vivah', 'kalyanam', 'pelli'],
  floral:      ['flower', 'flowers', 'bouquet', 'garland', 'mala'],
  pooja:       ['puja', 'prayer', 'worship', 'homam', 'havan'],
  rangoli:     ['kolam', 'muggu', 'alpana', 'floor art'],
  birthday:    ['bday', 'celebration', 'party'],
  engagement:  ['ring ceremony', 'nischayam', 'betrothal'],
  lighting:    ['lights', 'lamps', 'candles', 'diyas', 'led', 'illumination'],
  traditional: ['heritage', 'classical', 'ethnic', 'desi'],
  modern:      ['contemporary', 'minimalist', 'minimal', 'trendy'],
  luxury:      ['premium', 'exclusive', 'high-end', 'deluxe', 'grand'],
  tray:        ['thali', 'plate', 'platter', 'presentation'],
  diwali:      ['deepavali', 'festival of lights'],
  haldi:       ['turmeric ceremony', 'pithi'],
  mehendi:     ['mehndi', 'henna'],
  sangeet:     ['music night', 'dance night'],
  reception:   ['grand reception', 'wedding reception'],
  decor:       ['decoration', 'decorations', 'setup', 'arrangement'],
  decoration:  ['decor', 'setup', 'arrangement', 'styling'],
  stage:       ['backdrop', 'mandap', 'platform'],
  balloon:     ['balloons', 'helium', 'arch'],
  gold:        ['golden', 'gilded'],
  silver:      ['metallic', 'chrome'],
  pink:        ['rose', 'blush', 'magenta'],
  red:         ['crimson', 'maroon', 'scarlet'],
  white:       ['ivory', 'cream', 'pearl'],
};

// ── Category keywords for intent prediction ──
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Wedding':     ['wedding', 'marriage', 'bride', 'groom', 'mandap', 'mandapam', 'bridal', 'shaadi', 'kalyanam', 'pelli', 'vivah', 'sangeet', 'mehendi', 'haldi', 'reception', 'పెళ్లి', 'మండపం'],
  'Birthday':    ['birthday', 'bday', 'party', 'celebration', 'cake', 'balloon', 'balloons', 'kids', 'child'],
  'Pooja':       ['pooja', 'puja', 'prayer', 'homam', 'havan', 'worship', 'religious', 'temple', 'god', 'పూజ'],
  'Engagement':  ['engagement', 'ring', 'proposal', 'nischayam', 'betrothal', 'నిశ్చితార్థం'],
  'Floral':      ['floral', 'flower', 'bouquet', 'garland', 'rose', 'jasmine', 'marigold', 'mala', 'పువ్వులు'],
  'Traditional': ['traditional', 'heritage', 'ethnic', 'classical', 'rangoli', 'kolam', 'muggu', 'ముగ్గు'],
  'Modern':      ['modern', 'contemporary', 'minimalist', 'trendy', 'sleek', 'chic'],
  'Lighting':    ['lighting', 'lights', 'lamps', 'candles', 'diyas', 'led', 'fairy lights', 'chandelier', 'దీపావళి'],
  'Stage':       ['stage', 'backdrop', 'mandap', 'platform', 'entrance'],
  'Diwali':      ['diwali', 'deepavali', 'festival', 'festive', 'rangoli'],
};

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
  let priceMin: number | null = null;
  
  // Regex to extract budget: "under 50000", "below 50k", "rs 30000", "under 1 lakh"
  const priceMaxMatch = normalized.match(/(?:under|below|less than|within|budget)\s*(?:rs\.?|inr)?\s*(\d+)\s*(k|lakh)?/i);
  if (priceMaxMatch) {
    let val = parseInt(priceMaxMatch[1], 10);
    const unit = priceMaxMatch[2]?.toLowerCase();
    if (unit === 'k') val *= 1000;
    if (unit === 'lakh') val *= 100000;
    priceMax = val;
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

  // Detect style
  let style: string | null = null;
  if (normalized.includes('traditional') || normalized.includes('heritage') || normalized.includes('ethnic') || normalized.includes('desi') || normalized.includes('classical')) {
    style = 'traditional';
  } else if (normalized.includes('modern') || normalized.includes('contemporary') || normalized.includes('minimal')) {
    style = 'modern';
  } else if (normalized.includes('luxury') || normalized.includes('premium') || normalized.includes('exclusive') || normalized.includes('grand') || normalized.includes('royal')) {
    style = 'luxury';
  } else if (normalized.includes('simple') || normalized.includes('budget') || normalized.includes('cheap')) {
    style = 'simple';
  }

  // Detect category
  let category: string | null = null;
  for (const [catName, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(kw => normalized.includes(kw))) {
      category = catName;
      break;
    }
  }

  // Detect colors
  const colorPalette = ['red', 'yellow', 'gold', 'golden', 'white', 'pink', 'rose', 'orange', 'green', 'blue', 'silver', 'ivory', 'cream', 'peach', 'purple', 'maroon'];
  const colors = colorPalette.filter(color => normalized.includes(color));

  // Detect tags
  const potentialTags = ['balloons', 'balloon', 'flowers', 'flower', 'marigold', 'jasmine', 'rose', 'garland', 'backdrop', 'stage', 'entrance', 'welcome board', 'coconut', 'tray', 'thali', 'diyas', 'lamps', 'lights', 'lighting', 'candles', 'leaves', 'banana', 'mango', 'curtain', 'drapes'];
  const tags = potentialTags.filter(t => normalized.includes(t));

  // Basic script-based language check
  const teluguRegex = /[\u0c00-\u0c7f]/;
  const detectedLanguage = teluguRegex.test(query) ? 'telugu' : 'english';

  const expandedTerms = getTransliterationsAndSynonyms(normalized);

  return {
    detectedLanguage,
    correctedQuery: query,
    category,
    style,
    colors,
    tags,
    priceMin,
    priceMax,
    expandedTerms
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
    Analyze the following user search query and output a structured JSON response.

    Query: "${safeQuery}"

    Guidelines:
    1. DETECT LANGUAGE: Identify the language (english, telugu, hinglish, mixed).
    2. NORMALIZATION & TRANSLITERATION:
       - If in Telugu Script (e.g. "పెళ్లి"), translate to English equivalent ("wedding", "marriage").
       - If in Latin Script Telugu/Hinglish (e.g. "pelli decoration", "haldi setup", "pasupu"), map it to the proper English term (e.g. pelli/pasupu -> wedding/yellow/haldi).
       - If misspelled, provide the corrected spelling in English (e.g. "weddng" -> "wedding").
    3. EXTRACT INTENT AND ENTITIES:
       - category: Map to one of our core store categories if relevant (Wedding, Birthday, Pooja, Engagement, Festival, Floral, Traditional, Modern, Lighting, Stage, Diwali, Mehendi, Haldi, Sangeet).
       - style: (traditional, modern, luxury, minimalist, rustic, premium).
       - colors: Array of color words if mentioned (e.g. red, yellow, gold, white, pink, rose, orange, green, blue).
       - tags: List of keyword tags (e.g. balloons, flowers, backdrop, garlands, diyas, coconut, tray, welcome board).
       - priceMax: Extracted budget limit. If query is "under 50k" or "under 50000" or "below 20000", parse the budget (e.g. 50000). Otherwise null.
       - priceMin: Extracted min budget limit. Otherwise null.
       - correctedQuery: The corrected version of the query in clean English/Telugu.
       - expandedTerms: Array of related terms and synonyms (e.g. ["marriage", "stage", "pelli", "mandapam"]).

    Your output MUST be a valid JSON object only (do not wrap in markdown code blocks, do not write anything else), matching the format:
    {
      "detectedLanguage": "english | telugu | hinglish | mixed",
      "correctedQuery": "clean corrected query",
      "category": "Wedding" | "Birthday" | "Pooja" | "Engagement" | "Festival" | null,
      "style": "traditional" | "modern" | "luxury" | "minimalist" | null,
      "colors": ["color1", "color2"],
      "tags": ["tag1", "tag2"],
      "priceMin": number | null,
      "priceMax": number | null,
      "expandedTerms": ["term1", "term2"]
    }
    `;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 800); // 800ms timeout for fast fallback

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.1,
        max_tokens: 300
      }),
      signal: controller.signal
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
        logger.warn('[SEARCH AI] AI response failed schema validation, falling back to local parser');
        throw new Error('AI response schema validation failed');
      }

      await setSearchCache('full', cacheKey, validated, 24 * 60 * 60 * 1000);
      return validated;
    }
  } catch (err: any) {
    logger.warn(`[SEARCH AI] AI query parsing failed: ${err.message}. Falling back to local parser.`);
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
  options: { limit?: number } = {}
): Promise<{ suggestions: AutocompleteResult[]; predictedCategories: string[]; correctedQuery?: string }> {
  const limit = options.limit || 8;
  const normalizedQuery = query.trim().toLowerCase();

  if (normalizedQuery.length < 2) {
    return { suggestions: [], predictedCategories: [] };
  }

  // Check cache
  const cacheKey = `${normalizedQuery}_${limit}`;
  const cached = await getSearchCache<{ suggestions: AutocompleteResult[]; predictedCategories: string[] }>('ac', cacheKey);
  if (cached) return cached;

  try {
    // Generate transliterations and synonyms locally for instant speed
    const allTerms = getTransliterationsAndSynonyms(normalizedQuery);
    const fuzzyTerms = generateFuzzyVariants(normalizedQuery);
    const searchTerms = [...new Set([...allTerms, ...fuzzyTerms])];
    const regexPatterns = searchTerms.map((term) => new RegExp(escapeRegex(term), 'i'));

    // Predict intent categories
    const predictedCategories = predictCategories(normalizedQuery);

    const [products, events, galleries] = await Promise.all([
      Product.find({
        isActive: true,
        $or: [
          { title: { $in: regexPatterns } },
          { teluguTitle: { $in: regexPatterns } },
          { category: { $in: regexPatterns } },
          { tags: { $in: regexPatterns } }
        ],
      })
        .select('_id title teluguTitle imageSrc category price rating slug')
        .sort({ rating: -1, reviews: -1 })
        .limit(5)
        .lean(),

      Event.find({
        isActive: true,
        $or: [
          { title: { $in: regexPatterns } },
          { category: { $in: regexPatterns } },
          { style: { $in: regexPatterns } },
          { features: { $in: regexPatterns } },
        ],
      })
        .select('_id title category style basePrice slug')
        .sort({ basePrice: -1 })
        .limit(3)
        .lean(),

      Gallery.find({
        isActive: true,
        $or: [
          { title: { $in: regexPatterns } },
          { teluguTitle: { $in: regexPatterns } },
          { category: { $in: regexPatterns } },
          { tags: { $in: regexPatterns } },
        ],
      })
        .select('_id title teluguTitle image category style')
        .sort({ views: -1 })
        .limit(2)
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
        score: computeSearchScore(p.title, p.category, p.tags || [], normalizedQuery, p.teluguTitle),
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

    // Score galleries
    for (const g of galleries) {
      suggestions.push({
        id: (g._id as any).toString(),
        title: g.title,
        type: 'gallery',
        category: g.category,
        image: g.image,
        score: computeSearchScore(g.title, g.category, g.tags || [], normalizedQuery, g.teluguTitle),
      });
    }

    suggestions.sort((a, b) => b.score - a.score);
    const final = suggestions.slice(0, limit);

    // Local spelling/transliteration recommendation for overlay banner
    let correctedQuery: string | undefined;
    const words = normalizedQuery.split(/\s+/);
    const correctedWords = words.map(word => {
      const trans = TRANSLITERATION_MAP[word];
      if (trans && trans.length > 0) {
        const englishSuggested = trans.find(t => !/[\u0c00-\u0c7f]/.test(t));
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
  } = {}
): Promise<SearchResponse> {
  const page = options.page || 1;
  const limit = Math.min(options.limit || 20, 40);
  const skip = (page - 1) * limit;
  const normalizedQuery = query.trim().toLowerCase();

  if (normalizedQuery.length < 1) {
    return { items: [], total: 0, page, limit, predictedCategories: [], query };
  }

  // Check Cache
  const cacheKey = `${normalizedQuery}:${options.category || ''}:${options.type || ''}:${options.sort || ''}:${page}:${options.priceMin || ''}:${options.priceMax || ''}`;
  const cached = await getSearchCache<SearchResponse>('full', cacheKey);
  if (cached) return cached;

  try {
    // Stage 1: Analyze query semantic intent using AI / Local Fallback
    const aiAnalysis = await analyzeQueryWithAI(normalizedQuery);
    
    // Stage 2: Merge terms and build regex patterns (capped at 15 to prevent regex explosion / ReDoS)
    const terms = [
      normalizedQuery,
      aiAnalysis.correctedQuery,
      ...aiAnalysis.expandedTerms,
      ...getTransliterationsAndSynonyms(normalizedQuery),
      ...generateFuzzyVariants(normalizedQuery)
    ];
    const uniqueTerms = [...new Set(terms.filter(t => t.length > 1))].slice(0, 15);
    const regexPatterns = uniqueTerms.map((term) => new RegExp(escapeRegex(term), 'i'));

    const seasonal = await getCachedSeasonalContext();

    // Stage 3: Build base filter
    const baseFilter: any = {
      isActive: true,
      $or: [
        { title: { $in: regexPatterns } },
        { category: { $in: regexPatterns } },
        { tags: { $in: regexPatterns } },
      ]
    };

    // Apply manual Category filter or predicted intent category
    const activeCategory = (options.category && options.category !== 'All') 
      ? options.category 
      : (aiAnalysis.category || undefined);

    if (activeCategory) {
      baseFilter.category = new RegExp(escapeRegex(activeCategory), 'i');
    }

    const items: SearchResult[] = [];
    const searchProducts = !options.type || options.type === 'all' || options.type === 'product';
    const searchEvents = !options.type || options.type === 'all' || options.type === 'event';
    const searchGalleries = !options.type || options.type === 'all' || options.type === 'gallery';

    const promises: Promise<void>[] = [];

    // Setup Price parameters (combining manual filter + AI budget parser)
    const minPrice = options.priceMin !== undefined ? options.priceMin : (aiAnalysis.priceMin || undefined);
    const maxPrice = options.priceMax !== undefined ? options.priceMax : (aiAnalysis.priceMax || undefined);

    if (searchProducts) {
      const productFilter = { ...baseFilter };
      if (minPrice !== undefined || maxPrice !== undefined) {
        productFilter.price = {};
        if (minPrice !== undefined) productFilter.price.$gte = minPrice;
        if (maxPrice !== undefined) productFilter.price.$lte = maxPrice;
      }
      productFilter.$or = [
        ...productFilter.$or,
        { teluguTitle: { $in: regexPatterns } },
        { description: { $in: regexPatterns } },
        { material: { $in: regexPatterns } }
      ];

      // Add color filters from intent
      if (aiAnalysis.colors.length > 0) {
        productFilter.$or.push({ tags: { $in: aiAnalysis.colors.map(c => new RegExp(escapeRegex(c), 'i')) } });
      }

      promises.push(
        Product.find(productFilter)
          .select('_id title teluguTitle imageSrc category price rating reviews tags slug material description')
          .limit(100)
          .maxTimeMS(5000)
          .lean()
          .then((products) => {
            for (const p of products) {
              const searchScore = computeSearchScore(p.title, p.category, p.tags || [], normalizedQuery, p.teluguTitle);
              const seasonalBoost = computeSeasonalBoost(p.category, undefined, p.tags, seasonal);
              const popularityBoost = ((p.rating || 0) / 5) * 0.3 + Math.min((p.reviews || 0) / 100, 0.2);

              // Extra boost if matching parsed AI tags/styles
              let aiBoost = 1.0;
              if (aiAnalysis.style && p.description?.toLowerCase().includes(aiAnalysis.style)) aiBoost += 0.2;
              if (aiAnalysis.tags.some(t => p.tags?.map(pt => pt.toLowerCase()).includes(t))) aiBoost += 0.25;

              items.push({
                id: (p._id as any).toString(),
                title: p.title,
                type: 'product',
                category: p.category,
                image: p.imageSrc,
                price: p.price,
                rating: p.rating,
                reviews: p.reviews,
                tags: p.tags,
                slug: p.slug,
                score: (searchScore * seasonalBoost * aiBoost) + popularityBoost,
                matchSource: getMatchSource(p.title, p.category, p.tags || [], normalizedQuery, p.teluguTitle),
              });
            }
          })
      );
    }

    if (searchEvents) {
      const eventFilter = { ...baseFilter };
      if (minPrice !== undefined || maxPrice !== undefined) {
        eventFilter.basePrice = {};
        if (minPrice !== undefined) eventFilter.basePrice.$gte = minPrice;
        if (maxPrice !== undefined) eventFilter.basePrice.$lte = maxPrice;
      }
      eventFilter.$or = [
        ...eventFilter.$or,
        { style: { $in: regexPatterns } },
        { features: { $in: regexPatterns } }
      ];

      promises.push(
        Event.find(eventFilter)
          .select('_id title category style basePrice features image description')
          .limit(100)
          .maxTimeMS(5000)
          .lean()
          .then((events) => {
            for (const e of events) {
              const searchScore = computeSearchScore(e.title, e.category, e.features || [], normalizedQuery);
              const seasonalBoost = computeSeasonalBoost(e.category, e.style, e.features, seasonal);
              
              let aiBoost = 1.0;
              if (aiAnalysis.style && e.style?.toLowerCase().includes(aiAnalysis.style)) aiBoost += 0.3;
              if (aiAnalysis.tags.some(t => e.features?.map(ef => ef.toLowerCase()).includes(t))) aiBoost += 0.25;

              items.push({
                id: (e._id as any).toString(),
                title: e.title,
                type: 'event',
                category: e.category,
                style: e.style,
                image: e.image,
                price: e.basePrice,
                tags: e.features,
                score: (searchScore * seasonalBoost * aiBoost),
                matchSource: getMatchSource(e.title, e.category, e.features || [], normalizedQuery),
              });
            }
          })
      );
    }

    if (searchGalleries) {
      const galleryFilter = { ...baseFilter };
      galleryFilter.$or = [
        ...galleryFilter.$or,
        { teluguTitle: { $in: regexPatterns } },
        { description: { $in: regexPatterns } }
      ];

      promises.push(
        Gallery.find(galleryFilter)
          .select('_id title teluguTitle image category style tags views likes')
          .limit(100)
          .maxTimeMS(5000)
          .lean()
          .then((galleries) => {
            for (const g of galleries) {
              const searchScore = computeSearchScore(g.title, g.category, g.tags || [], normalizedQuery, g.teluguTitle);
              const popularityBoost = Math.log2(Math.max(g.views || 1, 1)) * 0.05 + Math.min((g.likes || 0) / 50, 0.1);

              let aiBoost = 1.0;
              if (aiAnalysis.style && g.style?.toLowerCase().includes(aiAnalysis.style)) aiBoost += 0.25;
              if (aiAnalysis.tags.some(t => g.tags?.map(gt => gt.toLowerCase()).includes(t))) aiBoost += 0.25;

              items.push({
                id: (g._id as any).toString(),
                title: g.title,
                type: 'gallery',
                category: g.category,
                style: g.style,
                image: g.image,
                tags: g.tags,
                score: (searchScore * aiBoost) + popularityBoost,
                matchSource: getMatchSource(g.title, g.category, g.tags || [], normalizedQuery, g.teluguTitle),
              });
            }
          })
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

    // Sort combined results
    if (options.sort === 'price_asc') {
      deduplicatedItems.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
    } else if (options.sort === 'price_desc') {
      deduplicatedItems.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
    } else if (options.sort === 'rating') {
      deduplicatedItems.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    } else {
      deduplicatedItems.sort((a, b) => b.score - a.score);
    }

    // Determine if we should present a spelling/translation suggestion
    let correctedQuery: string | undefined;
    if (aiAnalysis.correctedQuery.toLowerCase() !== normalizedQuery) {
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
  options: { limit?: number; days?: number } = {}
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
          levenshteinDistance(existing, normalized) <= 2
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
  options: { limit?: number } = {}
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
    // Check transliterations first
    const trans = TRANSLITERATION_MAP[word];
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
    const synonyms = SYNONYM_MAP[word];
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
    if (word.length >= 2) {
      expanded.add(word);
      const trans = TRANSLITERATION_MAP[word];
      if (trans) trans.forEach(t => expanded.add(t));
      const synonyms = SYNONYM_MAP[word];
      if (synonyms) synonyms.forEach(s => expanded.add(s));
    }
  }

  // Cap total expanded terms to prevent unbounded regex growth
  return Array.from(expanded).slice(0, 30);
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
    a: ['s', 'q'], s: ['a', 'd'], d: ['s', 'f'], f: ['d', 'g'], g: ['f', 'h'],
    h: ['g', 'j'], j: ['h', 'k'], k: ['j', 'l'], l: ['k'], q: ['w', 'a'],
    w: ['q', 'e'], e: ['w', 'r'], r: ['e', 't'], t: ['r', 'y'], y: ['t', 'u'],
    u: ['y', 'i'], i: ['u', 'o'], o: ['i', 'p'], p: ['o'],
    z: ['x'], x: ['z', 'c'], c: ['x', 'v'], v: ['c', 'b'], b: ['v', 'n'],
    n: ['b', 'm'], m: ['n'],
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
      for (const keyword of keywords) {
        if (keyword === word) score += 3;
        else if (keyword.includes(word) || word.includes(keyword)) score += 1;
      }
    }
    if (score > 0) scores.set(category, score);
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
  teluguTitle?: string
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
  } else if (normalizedTitle.includes(query) || (normalizedTeluguTitle && normalizedTeluguTitle.includes(query))) {
    score += 1.0;
  }

  // Prefix matching
  if (normalizedTitle.startsWith(query) || (normalizedTeluguTitle && normalizedTeluguTitle.startsWith(query))) {
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
  teluguTitle?: string
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
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
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
