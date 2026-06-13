import crypto from 'crypto';
import sharp from 'sharp';
import Product from '../models/Product';
import VisualSearchConfig, { IVisualSearchConfig } from '../models/VisualSearchConfig';
import VisualSearchLog from '../models/VisualSearchLog';
import { MemoryCache } from '../utils/MemoryCache';
import logger from '../config/logger';
import redisClient from '../utils/redis';
import { createVisionProvider, AIAnalysisResult } from './ai/providerFactory';
import { validateVisionApiKey } from './ai/apiValidator';
import { aiVisionCircuitBreaker } from '../utils/CircuitBreaker';

export interface VisualSearchResult {
  id: string;
  title: string;
  slug: string;
  category: string;
  imageSrc: string;
  images: string[];
  price: number;
  oldPrice?: number;
  rating: number;
  reviews: number;
  tags: string[];
  description: string;
  similarityScore: number;
  matchSource: string;
  badges: string[];
}

export interface VisualSearchResponse {
  bestMatch: VisualSearchResult | null;
  similarProducts: VisualSearchResult[];
  relatedProducts: VisualSearchResult[];
  aiAnalysis: {
    labels: string[];
    category: string;
    attributes: Record<string, string>;
    confidence: number;
  };
  totalResults: number;
  searchDurationMs: number;
}

// ── Caches ──
const configCache = new MemoryCache({ defaultTtlMs: 60 * 1000, maxKeys: 5 });
const analysisCache = new MemoryCache({ defaultTtlMs: 60 * 60 * 1000, maxKeys: 200 });
const matchCache = new MemoryCache({ defaultTtlMs: 5 * 60 * 1000, maxKeys: 200 });

// ══════════════════════════════════════════════
// TYPES & INTERFACES
// ══════════════════════════════════════════════

// ══════════════════════════════════════════════
// CONFIG MANAGEMENT
// ══════════════════════════════════════════════

/**
 * Get the visual search config (singleton). Creates one with defaults if missing.
 */
export async function getVisualSearchConfig(): Promise<IVisualSearchConfig> {
  const cached = configCache.get<IVisualSearchConfig>('vs_config');
  if (cached) return cached;

  let config = await VisualSearchConfig.findOne();
  if (!config) {
    // Auto-create default config using existing GROQ_API_KEY if available
    config = await VisualSearchConfig.create({
      enabled: false,
      provider: {
        name: 'groq',
        apiKey: process.env.GROQ_API_KEY || '',
        isValidated: !!process.env.GROQ_API_KEY,
      },
    });
  }

  configCache.set('vs_config', config, 60 * 1000);
  return config;
}

/**
 * Update visual search config.
 */
export async function updateVisualSearchConfig(
  updates: Partial<IVisualSearchConfig>,
  userId?: string,
): Promise<IVisualSearchConfig> {
  let config = await VisualSearchConfig.findOne();
  if (!config) {
    config = new VisualSearchConfig({});
  }

  // Apply updates
  const allowedFields = [
    'enabled',
    'cameraSearchEnabled',
    'imageUploadEnabled',
    'similarProductsEnabled',
    'searchSensitivity',
    'resultCount',
    'similarityThreshold',
    'provider',
    'analyticsEnabled',
    'saveSearchedImages',
  ];

  for (const field of allowedFields) {
    if ((updates as any)[field] !== undefined) {
      if (field === 'provider' && (updates as any).provider) {
        const p = (updates as any).provider;
        config.provider.name = p.name ?? config.provider.name;
        // Only update API/Secret keys if they are explicitly provided and not the masked placeholder
        if (p.apiKey !== undefined && p.apiKey !== '****') {
          config.provider.apiKey = p.apiKey;
        }
        if (p.secretKey !== undefined && p.secretKey !== '****') {
          config.provider.secretKey = p.secretKey;
        }
        config.provider.endpointUrl = p.endpointUrl ?? config.provider.endpointUrl;
        config.provider.isValidated = p.isValidated ?? config.provider.isValidated;
      } else {
        (config as any)[field] = (updates as any)[field];
      }
    }
  }

  if (userId) {
    config.updatedBy = userId as any;
  }

  await config.save();
  configCache.delete('vs_config');
  return config;
}

/**
 * Validate provider credentials by making a test API call.
 */
export async function validateProviderCredentials(
  providerName: string,
  apiKey: string,
  endpointUrl?: string,
): Promise<{
  valid: boolean;
  model?: string;
  error?: string;
  latencyMs?: number;
  suggestions?: string[];
  status?: string;
}> {
  // Delegate to the new AI Validator Pipeline
  return await validateVisionApiKey(providerName, apiKey, endpointUrl);
}

// ══════════════════════════════════════════════
// IMAGE PROCESSING
// ══════════════════════════════════════════════

/**
 * Compress and resize image for optimal AI processing.
 */
export async function processImage(
  buffer: Buffer,
  mimeType: string,
): Promise<{ base64: string; mimeType: string; hash: string }> {
  // Compute hash of original for caching
  const hash = crypto.createHash('sha256').update(buffer).digest('hex');

  // Resize to max 1024px on longest side, convert to JPEG for universal compatibility
  const processed = await sharp(buffer)
    .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 80, progressive: true })
    .toBuffer();

  return {
    base64: processed.toString('base64'),
    mimeType: 'image/jpeg',
    hash,
  };
}

// ══════════════════════════════════════════════
// PRODUCT MATCHING ENGINE
// ══════════════════════════════════════════════

/**
 * Score how well a product matches the AI analysis results.
 */
function computeProductScore(
  product: any,
  analysis: AIAnalysisResult,
  sensitivity: number,
): number {
  let score = 0;
  const labels = analysis.labels.map((l) => l.toLowerCase());
  const category = analysis.category.toLowerCase();
  const attrs = analysis.attributes;

  // 1. Title match (highest weight)
  const titleLower = (product.title || '').toLowerCase();
  for (const label of labels) {
    if (titleLower.includes(label)) {
      score += 25;
    } else {
      // Partial word matching
      const labelWords = label.split(/\s+/);
      for (const word of labelWords) {
        if (word.length > 2 && titleLower.includes(word)) {
          score += 10;
        }
      }
    }
  }

  // 2. AI Tags match (if product has been pre-tagged)
  if (product.aiTags && Array.isArray(product.aiTags)) {
    const productTags = product.aiTags.map((t: string) => t.toLowerCase());
    for (const label of labels) {
      if (productTags.includes(label)) {
        score += 20;
      }
      // Partial tag match
      for (const tag of productTags) {
        if (tag.includes(label) || label.includes(tag)) {
          score += 8;
        }
      }
    }
  }

  // 3. Category match
  const productCategory = (product.category || '').toLowerCase();
  if (productCategory === category) {
    score += 30;
  } else if (productCategory.includes(category) || category.includes(productCategory)) {
    score += 15;
  }
  // Also check aiCategory
  if (product.aiCategory) {
    const aiCat = product.aiCategory.toLowerCase();
    if (aiCat === category) score += 20;
    else if (aiCat.includes(category) || category.includes(aiCat)) score += 10;
  }

  // 4. Tags match
  if (product.tags && Array.isArray(product.tags)) {
    const productTags = product.tags.map((t: string) => t.toLowerCase());
    for (const label of labels) {
      if (productTags.some((t: string) => t.includes(label) || label.includes(t))) {
        score += 12;
      }
    }
  }

  // 5. Description match
  const descLower = (product.description || '').toLowerCase();
  for (const label of labels) {
    if (descLower.includes(label)) {
      score += 5;
    }
  }

  // 6. Material match
  if (attrs.material && product.material) {
    if (product.material.toLowerCase().includes(attrs.material.toLowerCase())) {
      score += 15;
    }
  }

  // 7. Color match from attributes
  if (attrs.primaryColor) {
    const colorLower = attrs.primaryColor.toLowerCase();
    if (titleLower.includes(colorLower) || descLower.includes(colorLower)) {
      score += 8;
    }
    if (product.tags?.some((t: string) => t.toLowerCase().includes(colorLower))) {
      score += 5;
    }
  }

  // 8. Boost for higher-rated products (tie-breaker)
  score += (product.rating || 0) * 2;

  // Apply sensitivity multiplier
  return Math.round(score * sensitivity);
}

/**
 * Search for matching products based on AI analysis results.
 */
export async function findMatchingProducts(
  analysis: AIAnalysisResult,
  config: IVisualSearchConfig,
): Promise<{
  bestMatch: VisualSearchResult | null;
  similar: VisualSearchResult[];
  related: VisualSearchResult[];
}> {
  const { labels, category, attributes } = analysis;
  const sensitivity = config.searchSensitivity;
  const resultCount = config.resultCount;
  const threshold = config.similarityThreshold;

  // Check match cache
  const cacheKey = `match:${labels.slice(0, 5).join(',')}:${category}`;
  const cached = matchCache.get<{
    bestMatch: VisualSearchResult | null;
    similar: VisualSearchResult[];
    related: VisualSearchResult[];
  }>(cacheKey);
  if (cached) return cached;

  // Build search queries from labels
  const searchTerms = [
    ...new Set(
      [
        ...labels,
        category,
        attributes.material,
        attributes.primaryColor,
        attributes.occasion,
        attributes.style,
      ].filter(Boolean),
    ),
  ].map((t) => t!.toLowerCase());

  // Extract individual words for better partial matching (e.g. 'Ganesh' from 'Ganesh decoration')
  const words = searchTerms
    .flatMap((term) => term.split(/[\s_-]+/))
    .filter(
      (word) =>
        word.length > 2 && !['and', 'the', 'with', 'for', 'decoration', 'ornament'].includes(word),
    );

  const uniqueTermsAndWords = [...new Set([...searchTerms, ...words])];

  const regexPatterns = uniqueTermsAndWords
    .slice(0, 20)
    .map((term) => new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));

  // Query 1: Direct label/tag match
  const labelQuery = {
    isActive: true,
    $or: [
      { title: { $in: regexPatterns } },
      { tags: { $in: regexPatterns } },
      { category: { $in: regexPatterns } },
      { description: { $in: regexPatterns } },
      { aiTags: { $in: regexPatterns } },
      { material: { $in: regexPatterns } },
    ],
  };

  // Query 2: Category-based fallback
  const categoryRegex = new RegExp(category.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const categoryQuery = {
    isActive: true,
    $or: [{ category: categoryRegex }, { aiCategory: categoryRegex }],
  };

  const [labelResults, categoryResults] = await Promise.all([
    Product.find(labelQuery)
      .select(
        '_id title slug category imageSrc images price oldPrice rating reviews tags description material badges aiTags aiCategory aiAttributes',
      )
      .limit(100)
      .maxTimeMS(8000)
      .lean(),
    Product.find(categoryQuery)
      .select(
        '_id title slug category imageSrc images price oldPrice rating reviews tags description material badges aiTags aiCategory aiAttributes',
      )
      .limit(50)
      .maxTimeMS(5000)
      .lean(),
  ]);

  // Merge and deduplicate
  const productMap = new Map<string, any>();
  for (const p of labelResults) {
    productMap.set(p._id.toString(), p);
  }
  for (const p of categoryResults) {
    const id = p._id.toString();
    if (!productMap.has(id)) {
      productMap.set(id, p);
    }
  }

  // Score all products
  const scored: { product: any; score: number }[] = [];
  for (const product of productMap.values()) {
    const score = computeProductScore(product, analysis, sensitivity);
    scored.push({ product, score });
  }

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Normalize scores to 0-100 percentage
  // Use a baseline max score of 120 to represent a "perfect" multi-dimensional match
  // This prevents weak single-keyword matches from appearing as "100% Match"
  const maxScore = Math.max(scored[0]?.score || 1, 120);

  const formatResult = (
    item: { product: any; score: number },
    maxS: number,
  ): VisualSearchResult => ({
    id: item.product._id.toString(),
    title: item.product.title,
    slug: item.product.slug,
    category: item.product.category,
    imageSrc: item.product.imageSrc,
    images: item.product.images || [],
    price: item.product.price,
    oldPrice: item.product.oldPrice,
    rating: item.product.rating || 0,
    reviews: item.product.reviews || 0,
    tags: item.product.tags || [],
    description: item.product.description || '',
    similarityScore: Math.round((item.score / maxS) * 100),
    matchSource:
      item.score > maxS * 0.7
        ? 'visual_match'
        : item.score > maxS * 0.4
          ? 'category_match'
          : 'related',
    badges: item.product.badges || [],
  });

  // Filter by threshold (convert percentage threshold to absolute)
  const thresholdScore = maxScore * threshold;
  const qualified = scored.filter((s) => s.score >= thresholdScore);

  // Split into tiers
  const bestMatch = qualified.length > 0 ? formatResult(qualified[0], maxScore) : null;

  const similar = qualified
    .slice(1, Math.min(resultCount, qualified.length))
    .filter((s) => s.score >= maxScore * 0.3)
    .map((s) => formatResult(s, maxScore));

  const related = scored
    .filter((s) => s.score < maxScore * 0.3 && s.score > 0)
    .slice(0, 10)
    .map((s) => formatResult(s, maxScore));

  const result = { bestMatch, similar, related };
  matchCache.set(cacheKey, result, 5 * 60 * 1000);
  return result;
}

// ══════════════════════════════════════════════
// MAIN VISUAL SEARCH PIPELINE
// ══════════════════════════════════════════════

/**
 * Execute a full visual search: process image → AI analysis → product matching.
 */
export async function executeVisualSearch(
  imageBuffer: Buffer,
  imageMimeType: string,
  options: {
    userId?: string;
    sessionId?: string;
    searchSource?: 'camera' | 'upload' | 'drag_drop';
    ip?: string;
    userAgent?: string;
  } = {},
): Promise<VisualSearchResponse> {
  const startTime = performance.now();

  // 1. Get config
  const config = await getVisualSearchConfig();
  if (!config.enabled) {
    throw new Error('Visual search is currently disabled');
  }

  // 2. Process image (resize + compress)
  const { base64, mimeType, hash } = await processImage(imageBuffer, imageMimeType);

  // 3. Check analysis cache
  let analysis: AIAnalysisResult;
  const cachedAnalysis = analysisCache.get<AIAnalysisResult>(`analysis:${hash}`);

  // Also check Redis
  let redisCachedAnalysis: AIAnalysisResult | null = null;
  if (!cachedAnalysis) {
    try {
      if (redisClient && redisClient.isReady) {
        const rd = await redisClient.get(`vs:analysis:${hash}`);
        if (rd) redisCachedAnalysis = JSON.parse(rd);
      }
    } catch {
      // Redis unavailable, continue
    }
  }

  if (cachedAnalysis) {
    analysis = cachedAnalysis;
  } else if (redisCachedAnalysis) {
    analysis = redisCachedAnalysis;
    analysisCache.set(`analysis:${hash}`, analysis, 60 * 60 * 1000);
  } else {
    // 4. Send to AI provider with Circuit Breaker
    // Use the decrypted API key from the config model method we added
    const apiKey = (config as any).getDecryptedApiKey?.() || config.provider.apiKey;
    const provider = createVisionProvider(
      config.provider.name,
      apiKey,
      config.provider.endpointUrl,
    );

    try {
      analysis = await aiVisionCircuitBreaker.execute(async () => {
        return await provider.analyzeImage(base64, mimeType);
      });
    } catch (providerError: any) {
      logger.error(`[VISUAL_SEARCH] Primary provider failed: ${providerError.message}`);

      // Auto-fallback to Groq if different provider was primary and circuit breaker fails or provider fails
      if (config.provider.name !== 'groq' && process.env.GROQ_API_KEY) {
        logger.info('[VISUAL_SEARCH] Falling back to Groq Vision');
        const fallback = createVisionProvider('groq', process.env.GROQ_API_KEY);
        // Do not wrap fallback in circuit breaker to ensure at least one attempt goes out if main is tripped
        analysis = await fallback.analyzeImage(base64, mimeType);
      } else {
        throw providerError;
      }
    }

    // Cache the analysis result
    analysisCache.set(`analysis:${hash}`, analysis, 60 * 60 * 1000);
    try {
      if (redisClient && redisClient.isReady) {
        await redisClient.set(`vs:analysis:${hash}`, JSON.stringify(analysis), { EX: 3600 });
      }
    } catch {
      // Redis unavailable
    }
  }

  // 5. Find matching products
  const { bestMatch, similar, related } = await findMatchingProducts(analysis, config);

  const searchDurationMs = Math.round(performance.now() - startTime);

  // 6. Log the search (fire and forget)
  if (config.analyticsEnabled) {
    VisualSearchLog.create({
      userId: options.userId,
      sessionId: options.sessionId || crypto.randomUUID(),
      imageHash: hash,
      provider: config.provider.name,
      aiLabels: analysis.labels,
      aiCategory: analysis.category,
      aiConfidence: analysis.confidence,
      aiAttributes: analysis.attributes,
      matchedProductIds: [...(bestMatch ? [bestMatch.id] : []), ...similar.map((s) => s.id)],
      bestMatchProductId: bestMatch?.id,
      resultCount: (bestMatch ? 1 : 0) + similar.length + related.length,
      searchDurationMs,
      searchSource: options.searchSource || 'upload',
      ip: options.ip || '',
      userAgent: options.userAgent || '',
    }).catch((err) => logger.error('[VISUAL_SEARCH] Failed to log search:', err));
  }

  return {
    bestMatch,
    similarProducts: similar,
    relatedProducts: related,
    aiAnalysis: {
      labels: analysis.labels,
      category: analysis.category,
      attributes: analysis.attributes,
      confidence: analysis.confidence,
    },
    totalResults: (bestMatch ? 1 : 0) + similar.length + related.length,
    searchDurationMs,
  };
}

// ══════════════════════════════════════════════
// ADMIN ANALYTICS
// ══════════════════════════════════════════════

export async function getVisualSearchAnalytics(days: number = 30) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [
    totalSearches,
    successfulSearches,
    averageConfidence,
    topCategories,
    dailyUsage,
    interactionBreakdown,
    averageDuration,
    providerUsage,
  ] = await Promise.all([
    // Total searches
    VisualSearchLog.countDocuments({ createdAt: { $gte: since } }),

    // Successful searches (with results)
    VisualSearchLog.countDocuments({
      createdAt: { $gte: since },
      resultCount: { $gt: 0 },
    }),

    // Average confidence
    VisualSearchLog.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: null, avg: { $avg: '$aiConfidence' } } },
    ]),

    // Top searched categories
    VisualSearchLog.aggregate([
      { $match: { createdAt: { $gte: since }, aiCategory: { $ne: '' } } },
      { $group: { _id: '$aiCategory', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),

    // Daily usage
    VisualSearchLog.aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),

    // User interaction breakdown
    VisualSearchLog.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: '$userInteraction', count: { $sum: 1 } } },
    ]),

    // Average search duration
    VisualSearchLog.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: null, avg: { $avg: '$searchDurationMs' } } },
    ]),

    // Provider usage
    VisualSearchLog.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: '$provider', count: { $sum: 1 } } },
    ]),
  ]);

  const failedSearches = totalSearches - successfulSearches;

  return {
    totalSearches,
    successfulSearches,
    failedSearches,
    successRate: totalSearches > 0 ? Math.round((successfulSearches / totalSearches) * 100) : 0,
    averageConfidence: averageConfidence[0]?.avg ? Math.round(averageConfidence[0].avg * 100) : 0,
    averageDurationMs: averageDuration[0]?.avg ? Math.round(averageDuration[0].avg) : 0,
    topCategories: topCategories.map((c) => ({ category: c._id, count: c.count })),
    dailyUsage: dailyUsage.map((d) => ({ date: d._id, count: d.count })),
    interactionBreakdown: interactionBreakdown.reduce((acc: Record<string, number>, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {}),
    providerUsage: providerUsage.map((p) => ({ provider: p._id, count: p.count })),
    periodDays: days,
  };
}

/**
 * Bulk-generate AI tags for products that don't have them.
 */
export async function bulkGenerateProductTags(
  batchSize: number = 5,
): Promise<{ processed: number; failed: number; total: number }> {
  const config = await getVisualSearchConfig();
  const apiKey = (config as any).getDecryptedApiKey?.() || config.provider.apiKey;
  const provider = createVisionProvider(config.provider.name, apiKey, config.provider.endpointUrl);

  // Find products without aiTags that have images
  const products = await Product.find({
    isActive: true,
    imageSrc: { $exists: true, $ne: '' },
    $or: [{ aiTags: { $exists: false } }, { aiTags: { $size: 0 } }],
  })
    .select('_id title imageSrc category')
    .limit(batchSize)
    .lean();

  const total = products.length;
  let processed = 0;
  let failed = 0;

  for (const product of products) {
    try {
      // Fetch product image
      const imageUrl = product.imageSrc;
      const imgRes = await fetch(imageUrl);
      if (!imgRes.ok) {
        failed++;
        continue;
      }

      const arrayBuffer = await imgRes.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const { base64, mimeType } = await processImage(buffer, 'image/jpeg');

      // Analyze with AI
      const analysis = await provider.analyzeImage(base64, mimeType);

      // Update product
      await Product.findByIdAndUpdate(product._id, {
        aiTags: analysis.labels,
        aiCategory: analysis.category,
        aiAttributes: analysis.attributes,
      });

      processed++;

      // Small delay to avoid rate limiting
      await new Promise((r) => setTimeout(r, 500));
    } catch (err: any) {
      logger.error(`[VISUAL_SEARCH] Failed to tag product ${product._id}: ${err.message}`);
      failed++;
    }
  }

  return { processed, failed, total };
}
