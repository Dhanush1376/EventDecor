import { Request, Response } from 'express';
import multer from 'multer';
import asyncHandler from '../utils/asyncHandler';
import ApiResponse from '../utils/ApiResponse';
import ApiError from '../utils/ApiError';
import { verifyImageSignature } from '../middleware/upload';
import {
  executeVisualSearch,
  getVisualSearchConfig,
  updateVisualSearchConfig,
  validateProviderCredentials,
  getVisualSearchAnalytics,
  bulkGenerateProductTags,
} from '../services/visualSearchService';
import logger from '../config/logger';
import {
  validateApiKeyInput,
  validateProviderInput,
  validateEndpointUrlInput,
  maskApiKey,
} from '../services/ai/inputValidator';
import { detectProviderFromKey } from '../services/ai/providerRegistry';
import { aiVisionCircuitBreaker } from '../utils/CircuitBreaker';

// Allowed image MIME types for visual search
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB

// ══════════════════════════════════════════════
// PUBLIC ENDPOINTS
// ══════════════════════════════════════════════

/**
 * POST /visual-search/analyze
 * Upload an image for visual search analysis and product matching.
 */
export const analyzeImage = asyncHandler(async (req: Request, res: Response) => {
  const file = req.file as Express.Multer.File;

  if (!file || !file.buffer) {
    throw new ApiError(400, 'Image file is required');
  }

  // Validate file size
  if (file.size > MAX_IMAGE_SIZE) {
    throw new ApiError(400, 'Image file exceeds maximum size of 10MB');
  }

  // Validate MIME type
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    throw new ApiError(400, 'Invalid file type. Only JPEG, PNG, and WebP images are allowed.');
  }

  // Validate magic bytes (security: prevent disguised files)
  const detectedMime = verifyImageSignature(file.buffer);
  if (!detectedMime || !ALLOWED_MIME_TYPES.has(detectedMime)) {
    throw new ApiError(400, 'File content does not match an allowed image format.');
  }

  const searchSource = (req.body.source as 'camera' | 'upload' | 'drag_drop') || 'upload';

  try {
    const results = await executeVisualSearch(file.buffer, detectedMime, {
      userId: req.user?.id,
      sessionId: req.body.sessionId,
      searchSource,
      ip: req.ip || '',
      userAgent: req.get('user-agent') || '',
    });

    res.status(200).json(new ApiResponse(true, 'Visual search completed', results));
  } catch (err: any) {
    if (err.message === 'Visual search is currently disabled') {
      throw new ApiError(403, 'Visual search is currently disabled by the administrator.');
    }
    logger.error(`[VISUAL_SEARCH_CTRL] Analysis failed: ${err.message}`);
    throw new ApiError(500, 'Visual search analysis failed. Please try again.');
  }
});

/**
 * GET /visual-search/config
 * Public endpoint: returns which features are enabled (no credentials exposed).
 */
export const getPublicConfig = asyncHandler(async (req: Request, res: Response) => {
  const config = await getVisualSearchConfig();

  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300');
  res.status(200).json(
    new ApiResponse(true, 'Visual search configuration', {
      enabled: config.enabled,
      cameraSearchEnabled: config.cameraSearchEnabled,
      imageUploadEnabled: config.imageUploadEnabled,
      similarProductsEnabled: config.similarProductsEnabled,
    }),
  );
});

// ══════════════════════════════════════════════
// ADMIN ENDPOINTS
// ══════════════════════════════════════════════

/**
 * GET /visual-search/admin/config
 * Admin endpoint: returns full config (credentials are masked).
 */
export const getAdminConfig = asyncHandler(async (req: Request, res: Response) => {
  const config = await getVisualSearchConfig();
  const configObj = config.toObject();

  // Mask sensitive credentials
  if (configObj.provider?.apiKey) {
    configObj.provider.apiKey = maskApiKey(configObj.provider.apiKey);
  }
  if (configObj.provider?.secretKey) {
    configObj.provider.secretKey = '****';
  }

  res.status(200).json(new ApiResponse(true, 'Admin visual search configuration', configObj));
});

/**
 * PUT /visual-search/admin/config
 * Admin endpoint: update visual search config.
 */
export const updateAdminConfig = asyncHandler(async (req: Request, res: Response) => {
  const updates = req.body;

  if (!updates || typeof updates !== 'object') {
    throw new ApiError(400, 'Invalid configuration data');
  }

  // Validate numeric ranges
  if (updates.searchSensitivity !== undefined) {
    const val = Number(updates.searchSensitivity);
    if (isNaN(val) || val < 0 || val > 1) {
      throw new ApiError(400, 'Search sensitivity must be between 0 and 1');
    }
  }

  // Validate Provider Updates
  if (updates.provider) {
    if (updates.provider.name) {
      const pValid = validateProviderInput(updates.provider.name);
      if (!pValid.valid) throw new ApiError(400, pValid.error!);
    }

    if (updates.provider.apiKey) {
      if (updates.provider.apiKey === '****' || updates.provider.apiKey.includes('*')) {
        delete updates.provider.apiKey;
      } else {
        const kValid = validateApiKeyInput(updates.provider.apiKey);
        if (!kValid.valid) throw new ApiError(400, kValid.error!);
      }
    }

    if (updates.provider.name === 'custom' && updates.provider.endpointUrl) {
      const eValid = await validateEndpointUrlInput(updates.provider.endpointUrl);
      if (!eValid.valid) throw new ApiError(400, eValid.error!);
    }
  }
  if (updates.resultCount !== undefined) {
    const val = Number(updates.resultCount);
    if (isNaN(val) || val < 1 || val > 50) {
      throw new ApiError(400, 'Result count must be between 1 and 50');
    }
  }
  if (updates.similarityThreshold !== undefined) {
    const val = Number(updates.similarityThreshold);
    if (isNaN(val) || val < 0 || val > 1) {
      throw new ApiError(400, 'Similarity threshold must be between 0 and 1');
    }
  }

  const updated = await updateVisualSearchConfig(updates, req.user?.id);

  // Mask credentials in response
  const responseObj = updated.toObject();
  if (responseObj.provider?.apiKey) {
    responseObj.provider.apiKey = maskApiKey(responseObj.provider.apiKey);
  }
  if (responseObj.provider?.secretKey) {
    responseObj.provider.secretKey = '****';
  }

  res.status(200).json(new ApiResponse(true, 'Configuration updated', responseObj));
});

/**
 * POST /visual-search/admin/validate-provider
 * Admin endpoint: test AI provider credentials.
 */
export const validateProvider = asyncHandler(async (req: Request, res: Response) => {
  const { providerName, apiKey, endpointUrl } = req.body;

  if (!providerName || !apiKey) {
    throw new ApiError(400, 'Provider name and API key are required');
  }

  const pValid = validateProviderInput(providerName);
  if (!pValid.valid) throw new ApiError(400, pValid.error!);

  const kValid = validateApiKeyInput(apiKey);
  if (!kValid.valid) throw new ApiError(400, kValid.error!);

  if (providerName === 'custom' && endpointUrl) {
    const eValid = await validateEndpointUrlInput(endpointUrl);
    if (!eValid.valid) throw new ApiError(400, eValid.error!);
  }

  const result = await validateProviderCredentials(providerName, apiKey, endpointUrl);

  // Auto-detect provider if there's a mismatch
  const detected = detectProviderFromKey(apiKey);
  const providerMismatch = detected && detected !== providerName && providerName !== 'custom';

  res.status(200).json(
    new ApiResponse(
      result.valid,
      result.valid ? 'Credentials validated successfully' : 'Validation failed',
      {
        valid: result.valid,
        status: result.status,
        model: result.model,
        error: result.error,
        latencyMs: result.latencyMs,
        suggestions: result.suggestions,
        detectedProvider: detected,
        providerMismatch,
      },
    ),
  );
});

/**
 * GET /visual-search/health
 * Public endpoint: returns AI search health/circuit breaker status.
 */
export const getHealth = asyncHandler(async (req: Request, res: Response) => {
  const config = await getVisualSearchConfig();
  const status = aiVisionCircuitBreaker.getState();

  const isHealthy = config.enabled && status === 'CLOSED';

  res.status(isHealthy ? 200 : 503).json(
    new ApiResponse(
      isHealthy,
      isHealthy ? 'Visual search is healthy' : 'Visual search is degraded or disabled',
      {
        enabled: config.enabled,
        circuitBreakerStatus: status,
      },
    ),
  );
});

/**
 * GET /visual-search/admin/analytics
 * Admin endpoint: visual search analytics dashboard data.
 */
export const getAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const days = Math.min(parseInt(req.query.days as string, 10) || 30, 90);
  const analytics = await getVisualSearchAnalytics(days);

  res.status(200).json(new ApiResponse(true, 'Visual search analytics', analytics));
});

/**
 * POST /visual-search/admin/generate-tags
 * Admin endpoint: bulk-generate AI tags for products.
 */
export const generateProductTags = asyncHandler(async (req: Request, res: Response) => {
  const batchSize = Math.min(parseInt(req.body.batchSize as string, 10) || 5, 20);

  try {
    const result = await bulkGenerateProductTags(batchSize);
    res.status(200).json(new ApiResponse(true, `Processed ${result.processed} products`, result));
  } catch (err: any) {
    logger.error(`[VISUAL_SEARCH_CTRL] Bulk tag generation failed: ${err.message}`);
    throw new ApiError(500, 'Failed to generate product tags');
  }
});
