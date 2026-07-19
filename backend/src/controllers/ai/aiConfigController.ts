import { Request, Response } from 'express';
import asyncHandler from '../../utils/asyncHandler';
import ApiResponse from '../../utils/ApiResponse';
import ApiError from '../../utils/ApiError';
import AiProvider from '../../models/AiProvider';
import GlobalAiSettings from '../../models/GlobalAiSettings';
import AiUsageLog from '../../models/AiUsageLog';
import { detectModels } from '../../services/ai/modelDetector';
import { detectProviderFromKey } from '../../services/ai/providerRegistry';
import axios from 'axios';
import { VISION_PROVIDER_CONFIG } from '../../services/ai/providerRegistry';

// ── Global Settings ────────────────────────────────────────────────────────

export const getSettings = asyncHandler(async (req: Request, res: Response) => {
  const settings = await GlobalAiSettings.findOne().populate(
    'selectedProviderId fallbackProviderIds',
  );

  if (!settings) {
    // Return defaults if not configured
    return res.status(200).json(
      new ApiResponse(true, 'Global AI Settings', {
        temperature: 0.2,
        maxTokens: 4000,
        requestTimeout: 60000,
        retryCount: 2,
        autoSelectModel: true,
        fallbackProviderIds: [],
      }),
    );
  }

  res.status(200).json(new ApiResponse(true, 'Global AI Settings', settings));
});

export const updateSettings = asyncHandler(async (req: Request, res: Response) => {
  const updates = req.body;
  updates.updatedBy = req.user?.id;

  const settings = await GlobalAiSettings.findOneAndUpdate({}, updates, {
    new: true,
    upsert: true,
  }).populate('selectedProviderId fallbackProviderIds');

  res.status(200).json(new ApiResponse(true, 'Global AI Settings updated', settings));
});

// ── Providers ─────────────────────────────────────────────────────────────

export const getProviders = asyncHandler(async (req: Request, res: Response) => {
  const providers = await AiProvider.find().select('-apiKey').sort('-createdAt');
  res.status(200).json(new ApiResponse(true, 'AI Providers', providers));
});

export const createProvider = asyncHandler(async (req: Request, res: Response) => {
  const data = req.body;
  data.createdBy = req.user?.id;
  data.updatedBy = req.user?.id;

  // Auto-detect capabilities if not provided, though we should validate it next
  if (!data.provider) {
    const detected = detectProviderFromKey(data.apiKey);
    if (detected) data.provider = detected;
  }

  const provider = await AiProvider.create(data);
  const responseObj = provider.toObject();
  responseObj.apiKey = '****';

  res.status(201).json(new ApiResponse(true, 'Provider created', responseObj));
});

export const updateProvider = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body;
  updates.updatedBy = req.user?.id;

  // Don't update apiKey if it's masked
  if (updates.apiKey === '****' || (updates.apiKey && updates.apiKey.includes('*'))) {
    delete updates.apiKey;
  }

  const provider = await AiProvider.findByIdAndUpdate(id, updates, { new: true });
  if (!provider) throw new ApiError(404, 'Provider not found');

  const responseObj = provider.toObject();
  responseObj.apiKey = '****';

  res.status(200).json(new ApiResponse(true, 'Provider updated', responseObj));
});

export const deleteProvider = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  // Check if it's currently selected
  const settings = await GlobalAiSettings.findOne();
  if (settings) {
    if (settings.selectedProviderId?.toString() === id) {
      throw new ApiError(400, 'Cannot delete the currently selected global AI provider.');
    }
    if (settings.fallbackProviderIds?.some((f) => f.toString() === id)) {
      settings.fallbackProviderIds = settings.fallbackProviderIds.filter(
        (f) => f.toString() !== id,
      );
      await settings.save();
    }
  }

  await AiProvider.findByIdAndDelete(id);
  res.status(200).json(new ApiResponse(true, 'Provider deleted successfully'));
});

// ── Operations ────────────────────────────────────────────────────────────

export const validateProvider = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const provider = await AiProvider.findById(id);

  if (!provider) throw new ApiError(404, 'Provider not found');

  const config = VISION_PROVIDER_CONFIG[provider.provider];
  if (!config) throw new ApiError(400, `Unknown provider type: ${provider.provider}`);

  const apiKey = provider.getDecryptedApiKey();
  const baseURL =
    provider.provider === 'custom' ||
    provider.provider === 'azure_openai' ||
    provider.provider === 'ollama'
      ? provider.endpointUrl || config.baseURL
      : config.baseURL;

  const url = `${baseURL}${config.validationPath}`;
  const headers = {
    [config.headerKey]: `${config.headerPrefix}${apiKey}`,
    ...config.extraHeaders,
  };

  const startTime = Date.now();
  let isValid: boolean;
  let status: 'healthy' | 'degraded' | 'down';
  let errorMsg = '';

  try {
    if (provider.provider === 'gemini') {
      await axios.get(url, { headers, params: { key: apiKey }, timeout: 10000 });
    } else {
      // Lightest possible request to test auth
      await axios.get(url, { headers, timeout: 10000 });
    }
    isValid = true;
    status = 'healthy';
  } catch (err: any) {
    // 401/403 means auth failed.
    // Sometimes GET /chat/completions returns 405 Method Not Allowed, which actually means the key is VALID but we used GET instead of POST.
    const statusCode = err.response?.status;
    if (statusCode === 405 || statusCode === 400 || statusCode === 404) {
      // Auth passed, but endpoint expects different params or method
      isValid = true;
      status = 'healthy';
    } else if (statusCode === 429) {
      isValid = true; // Key is valid, but rate limited
      status = 'degraded';
      errorMsg = 'Rate limit exceeded';
    } else {
      isValid = false;
      status = 'down';
      errorMsg = err.response?.data?.error?.message || err.message;
    }
  }

  const latencyMs = Date.now() - startTime;

  // Update provider status
  provider.isValidated = isValid;
  provider.lastValidatedAt = new Date();
  provider.health.status = status;
  provider.health.lastSuccessAt = isValid ? new Date() : provider.health.lastSuccessAt;
  provider.health.lastErrorAt = !isValid ? new Date() : provider.health.lastErrorAt;
  provider.health.lastError = errorMsg;
  provider.health.avgLatencyMs = latencyMs;
  await provider.save();

  res.status(200).json(
    new ApiResponse(true, 'Validation result', {
      valid: isValid,
      latencyMs,
      status,
      error: errorMsg,
    }),
  );
});

export const detectProviderModels = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const provider = await AiProvider.findById(id);

  if (!provider) throw new ApiError(404, 'Provider not found');

  const apiKey = provider.getDecryptedApiKey();
  const models = await detectModels(provider.provider, apiKey, provider.endpointUrl);

  // Auto-update capabilities based on models
  if (models.length > 0) {
    const hasVision = models.some((m) => m.supportsVision);
    provider.capabilities.vision = hasVision;
    await provider.save();
  }

  res.status(200).json(new ApiResponse(true, 'Detected models', models));
});

// ── Analytics ─────────────────────────────────────────────────────────────

export const getUsageLogs = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  const logs = await AiUsageLog.find().sort('-createdAt').skip(skip).limit(limit);

  const total = await AiUsageLog.countDocuments();

  res.status(200).json(
    new ApiResponse(true, 'Usage logs', {
      logs,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    }),
  );
});

export const getUsageSummary = asyncHandler(async (req: Request, res: Response) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const stats = await AiUsageLog.aggregate([
    { $match: { createdAt: { $gte: today } } },
    {
      $group: {
        _id: '$providerName',
        totalRequests: { $sum: 1 },
        successRequests: { $sum: { $cond: ['$success', 1, 0] } },
        failedRequests: { $sum: { $cond: ['$success', 0, 1] } },
        avgLatency: { $avg: '$latencyMs' },
        totalInputTokens: { $sum: '$inputTokens' },
        totalOutputTokens: { $sum: '$outputTokens' },
      },
    },
  ]);

  const totalRequests = stats.reduce((acc, curr) => acc + curr.totalRequests, 0);

  res.status(200).json(
    new ApiResponse(true, 'Usage summary', {
      today: {
        totalRequests,
        providerStats: stats,
      },
    }),
  );
});
