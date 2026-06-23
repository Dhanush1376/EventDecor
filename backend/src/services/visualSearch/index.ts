import crypto from 'crypto';
import { MemoryCache } from '../../utils/cache/MemoryCache';
import logger from '../../config/logger';
import redisClient from '../../utils/cache/redis';
import { createVisionProvider, AIAnalysisResult } from '../ai/providerFactory';
import { aiVisionCircuitBreaker } from '../../utils/CircuitBreaker';
import Product from '../../models/Product';
import VisualSearchLog from '../../models/VisualSearchLog';

import { getVisualSearchConfig } from './config';
import { processImage, computeImageHash } from './imageProcessing';
import { SearchOrchestrator } from './SearchOrchestrator';
import { VisualSearchResponse } from './types';

export const analysisCache = new MemoryCache({ defaultTtlMs: 60 * 60 * 1000, maxKeys: 200 });
const orchestrator = new SearchOrchestrator();

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

  // 2b. Compute perceptual hash of the uploaded image for image-to-image matching
  let uploadedImageHash = '';
  try {
    uploadedImageHash = await computeImageHash(imageBuffer);
  } catch {
    // Non-critical: image hash comparison just won't work
  }

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

  // 5. Find matching items
  const { bestMatch, similar, related } = await orchestrator.findMatchingProducts(
    analysis,
    config,
    uploadedImageHash,
  );

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

      // Compute perceptual image hash for image-to-image matching
      let imageHash = '';
      try {
        imageHash = await computeImageHash(buffer);
      } catch {
        // Non-critical
      }

      // Analyze with AI
      const analysis = await provider.analyzeImage(base64, mimeType);

      // Update product with AI tags and image hash
      await Product.findByIdAndUpdate(product._id, {
        aiTags: analysis.labels,
        aiCategory: analysis.category,
        aiAttributes: analysis.attributes,
        ...(imageHash ? { imageHash } : {}),
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

export * from './types';
export * from './config';
export * from './analytics';
