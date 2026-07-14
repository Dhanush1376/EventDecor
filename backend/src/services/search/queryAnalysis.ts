import logger from '../../config/logger';
import { sanitizePromptInput, validateAIResponse } from '../../utils/security/aiSanitizer';
import {
  TRANSLITERATION_MAP,
  SYNONYM_MAP,
  CATEGORY_KEYWORDS,
  EVENT_KNOWLEDGE_GRAPH,
} from './searchDictionaries';
import { getSearchCache, setSearchCache } from './searchCache';
import {
  getSingularForm,
  getTransliterationsAndSynonyms,
  getSpellCorrectedQuery,
} from './queryExpansion';

// ── Query intent analysis: search-mode detection + local and AI-assisted analysis ──
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

export function analyzeQueryLocally(query: string): AIAnalysisResult {
  const normalized = query.toLowerCase().trim();
  const _words = normalized.split(/\s+/);

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
  const hindiRegex = /[\u0900-\u097f]/;
  let detectedLanguage = 'english';
  if (teluguRegex.test(query)) detectedLanguage = 'telugu';
  else if (hindiRegex.test(query)) detectedLanguage = 'hindi';

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

  const spellCheck = getSpellCorrectedQuery(cleanedQuery);
  const correctedQuery = spellCheck.corrected || query;

  return {
    detectedLanguage,
    correctedQuery,
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
