/**
 * apiValidator.ts — Vision AI API Key Validation Pipeline
 *
 * Validates API keys by making real minimal API calls (not just listing models).
 * Uses a fallback chain: if model A fails with a model-related error,
 * automatically tries model B, C, etc. from the provider's chain.
 *
 * Returns rich structured results with status classification,
 * latency measurement, and model suggestions on failure.
 */

import logger from '../../config/logger';
import {
  VISION_PROVIDER_CONFIG,
  getValidationChain,
  getVisionModel,
  isKnownProvider,
  detectProviderFromKey,
} from './providerRegistry';

// ── Types ──────────────────────────────────────────────────────────────────

export type ValidationStatus =
  | 'valid'
  | 'invalid'
  | 'unreachable'
  | 'wrong_model'
  | 'quota_exceeded'
  | 'rate_limited';

export interface ValidationResult {
  valid: boolean;
  status: ValidationStatus;
  error?: string;
  latencyMs: number;
  model?: string;
  detectedProvider?: string;
  suggestions?: string[];
}

// ── Constants ──────────────────────────────────────────────────────────────

const VALIDATION_TIMEOUT_MS = 15000;

// ── Main Validation Function ───────────────────────────────────────────────

/**
 * Validate an AI provider's API key by making a minimal test request.
 *
 * The validation process:
 * 1. Look up the provider's validation chain (ordered list of models)
 * 2. Make a minimal chat completion request with the first model
 * 3. If it fails with a model-related error, try the next model in the chain
 * 4. If it fails with an auth/quota error, stop immediately
 * 5. Return a rich result with status, latency, and suggestions
 */
export async function validateVisionApiKey(
  providerName: string,
  apiKey: string,
  endpointUrl?: string,
): Promise<ValidationResult> {
  const start = Date.now();

  // Auto-detect provider if not specified or unknown
  const detectedProvider = detectProviderFromKey(apiKey);

  // Get validation chain
  const chain = getValidationChain(providerName);
  let lastResult: { ok: boolean; status: number; error: string } | null = null;

  // Try each model in the chain
  for (const testModel of chain) {
    try {
      const result = await executeValidationRequest(providerName, apiKey, testModel, endpointUrl);
      const latencyMs = Date.now() - start;

      if (result.ok) {
        return {
          valid: true,
          status: 'valid',
          latencyMs,
          model: testModel,
          detectedProvider: detectedProvider || undefined,
        };
      }

      lastResult = result;

      // If the error is NOT model-related, don't try other models
      const isModelError = isModelRelatedError(result.error, result.status);
      if (!isModelError) break;

      logger.info(
        `[API_VALIDATOR] Model "${testModel}" failed for ${providerName}, trying next in chain...`,
      );
    } catch (err: any) {
      lastResult = {
        ok: false,
        status: 0,
        error:
          err.name === 'AbortError'
            ? `Connection timed out after ${VALIDATION_TIMEOUT_MS}ms`
            : `Network error: ${err.message}`,
      };
      // Network errors affect all models — stop trying
      break;
    }
  }

  // Build failure response
  const latencyMs = Date.now() - start;
  const errorMsg = lastResult?.error || 'Validation failed';
  const status = classifyValidationError(errorMsg, lastResult?.status || 0);

  // Generate suggestions
  const suggestions: string[] = [];
  if (status === 'wrong_model' || status === 'invalid') {
    const validationModel = getVisionModel(providerName, 'validation');
    if (validationModel) suggestions.push(validationModel);
    const productionModel = getVisionModel(providerName, 'production');
    if (productionModel && !suggestions.includes(productionModel)) {
      suggestions.push(productionModel);
    }
  }

  return {
    valid: false,
    status,
    error: errorMsg,
    latencyMs,
    detectedProvider: detectedProvider || undefined,
    suggestions: suggestions.length > 0 ? suggestions : undefined,
  };
}

// ── Validation Request Executors ───────────────────────────────────────────

async function executeValidationRequest(
  providerName: string,
  apiKey: string,
  model: string,
  endpointUrl?: string,
): Promise<{ ok: boolean; status: number; error: string }> {
  const config = VISION_PROVIDER_CONFIG[providerName];

  // Custom provider
  if (providerName === 'custom' || !config) {
    return executeCustomValidation(apiKey, model, endpointUrl || '');
  }

  // Gemini uses native API format
  if (config.apiFormat === 'gemini') {
    return executeGeminiValidation(apiKey, model);
  }

  // Anthropic has a different auth/body format
  if (providerName === 'anthropic') {
    return executeAnthropicValidation(apiKey, model);
  }

  // All other providers: OpenAI-compatible
  return executeOpenAIValidation(providerName, apiKey, model, config);
}

/**
 * OpenAI-compatible validation: POST /chat/completions with min tokens.
 */
async function executeOpenAIValidation(
  providerName: string,
  apiKey: string,
  model: string,
  config: (typeof VISION_PROVIDER_CONFIG)[string],
): Promise<{ ok: boolean; status: number; error: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), VALIDATION_TIMEOUT_MS);

  try {
    const url = `${config.baseURL}/chat/completions`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        [config.headerKey]: `${config.headerPrefix}${apiKey}`,
        ...(config.extraHeaders || {}),
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 1,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (res.ok) return { ok: true, status: 200, error: '' };

    const body: any = await res.json().catch(() => ({}) as any);
    const errMsg = body?.error?.message || body?.message || `HTTP ${res.status}`;

    return {
      ok: false,
      status: res.status,
      error: formatProviderError(providerName, res.status, errMsg),
    };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Gemini validation: POST /models/{model}:generateContent?key=...
 */
async function executeGeminiValidation(
  apiKey: string,
  model: string,
): Promise<{ ok: boolean; status: number; error: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), VALIDATION_TIMEOUT_MS);

  try {
    // First try listing models (cheapest validation)
    const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const res = await fetch(listUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (res.ok) return { ok: true, status: 200, error: '' };

    const body: any = await res.json().catch(() => ({}) as any);
    const errMsg = body?.error?.message || `HTTP ${res.status}`;

    if (res.status === 400 && errMsg.includes('API key')) {
      return { ok: false, status: 400, error: 'Invalid Google API key.' };
    }
    if (res.status === 403) {
      return { ok: false, status: 403, error: "Google API key doesn't have permission." };
    }

    return { ok: false, status: res.status, error: `Gemini error: ${errMsg}` };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Anthropic validation: POST /messages with min tokens.
 */
async function executeAnthropicValidation(
  apiKey: string,
  model: string,
): Promise<{ ok: boolean; status: number; error: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), VALIDATION_TIMEOUT_MS);

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 1,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (res.ok) return { ok: true, status: 200, error: '' };

    const body: any = await res.json().catch(() => ({}) as any);
    const errMsg = body?.error?.message || `HTTP ${res.status}`;

    return {
      ok: false,
      status: res.status,
      error: formatProviderError('anthropic', res.status, errMsg),
    };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Custom endpoint validation.
 */
async function executeCustomValidation(
  apiKey: string,
  model: string,
  endpointUrl: string,
): Promise<{ ok: boolean; status: number; error: string }> {
  if (!endpointUrl) {
    return { ok: false, status: 0, error: 'Base URL is required for custom providers.' };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), VALIDATION_TIMEOUT_MS);

  try {
    const baseClean = endpointUrl.replace(/\/+$/, '').replace(/\/chat\/completions$/i, '');
    const url = `${baseClean}/chat/completions`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: apiKey.startsWith('Bearer ') ? apiKey : `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model || 'default',
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 1,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (res.ok) return { ok: true, status: 200, error: '' };

    const body: any = await res.json().catch(() => ({}) as any);
    const errMsg = body?.error?.message || body?.message || `HTTP ${res.status}`;

    if (res.status === 404) {
      return {
        ok: false,
        status: 404,
        error: `Endpoint not found: ${url}. Do NOT include /chat/completions in the base URL.`,
      };
    }
    if (res.status === 401) {
      return { ok: false, status: 401, error: 'API key rejected by the custom provider.' };
    }

    return { ok: false, status: res.status, error: `Provider error (${res.status}): ${errMsg}` };
  } finally {
    clearTimeout(timeout);
  }
}

// ── Error Classification Helpers ───────────────────────────────────────────

function isModelRelatedError(error: string, status: number): boolean {
  if (status === 404) return true;
  const lower = (error || '').toLowerCase();
  return lower.includes('model') || lower.includes('not found') || lower.includes('permission');
}

function classifyValidationError(error: string, status: number): ValidationStatus {
  if (status === 401 || status === 403) return 'invalid';
  if (status === 402) return 'quota_exceeded';
  if (status === 429) return 'rate_limited';
  if (status === 404) return 'wrong_model';

  const lower = (error || '').toLowerCase();
  if (lower.includes('timeout') || lower.includes('network') || lower.includes('econnrefused')) {
    return 'unreachable';
  }
  if (lower.includes('quota') || lower.includes('credits') || lower.includes('balance')) {
    return 'quota_exceeded';
  }
  if (lower.includes('rate limit')) return 'rate_limited';
  if (lower.includes('model') || lower.includes('not found')) return 'wrong_model';

  return 'invalid';
}

function formatProviderError(provider: string, status: number, rawError: string): string {
  const displayName = VISION_PROVIDER_CONFIG[provider]?.displayName || provider;

  switch (status) {
    case 401:
      return `Invalid ${displayName} API key. Please check your key.`;
    case 402:
      return `Your ${displayName} account has insufficient credits.`;
    case 403:
      return `Access denied for ${displayName}. ${rawError}`;
    case 404:
      return `Model not found on ${displayName}. Check provider docs.`;
    case 429:
      return `Rate limit reached for ${displayName}. Try again in a moment.`;
    default:
      return `${displayName} error (${status}): ${rawError}`;
  }
}
