/**
 * providerRegistry.ts — Vision AI Provider Configuration Registry
 *
 * Single source of truth for:
 * - Provider endpoint configurations (baseURL, auth headers)
 * - Vision model tiers (validation, production, fallback, chain)
 * - Automatic provider detection from API key prefixes
 *
 * Design: Data-driven map instead of per-provider classes.
 * Adding a new provider requires only adding an entry here — zero code changes elsewhere.
 */

// ── Types ──────────────────────────────────────────────────────────────────

export interface VisionProviderConfig {
  /** Display name for admin UI */
  displayName: string;
  /** Base URL for API requests (without /chat/completions suffix) */
  baseURL: string;
  /** HTTP header used for authentication */
  headerKey: string;
  /** Prefix before the API key in the header value (e.g. 'Bearer ') */
  headerPrefix: string;
  /** Additional headers required by this provider */
  extraHeaders?: Record<string, string>;
  /** API format: 'openai' = OpenAI chat completions, 'gemini' = Google native */
  apiFormat: 'openai' | 'gemini';
  /** Whether the provider supports vision (image) input */
  supportsVision: boolean;
  /** Endpoint path for validation (relative to baseURL) */
  validationPath: string;
}

export interface VisionModelEntry {
  /** Cheapest/fastest model used for key validation */
  validation: string;
  /** Best vision model for production image analysis */
  production: string;
  /** Fallback model if production model is unavailable */
  fallback: string;
  /** Ordered list of models to try during validation (first success wins) */
  chain: string[];
}

// ── Provider Configuration Map ─────────────────────────────────────────────

export const VISION_PROVIDER_CONFIG: Record<string, VisionProviderConfig> = {
  groq: {
    displayName: 'Groq',
    baseURL: 'https://api.groq.com/openai/v1',
    headerKey: 'Authorization',
    headerPrefix: 'Bearer ',
    apiFormat: 'openai',
    supportsVision: true,
    validationPath: '/chat/completions',
  },
  openai: {
    displayName: 'OpenAI',
    baseURL: 'https://api.openai.com/v1',
    headerKey: 'Authorization',
    headerPrefix: 'Bearer ',
    apiFormat: 'openai',
    supportsVision: true,
    validationPath: '/chat/completions',
  },
  gemini: {
    displayName: 'Google Gemini',
    baseURL: 'https://generativelanguage.googleapis.com/v1beta',
    headerKey: 'x-goog-api-key',
    headerPrefix: '',
    apiFormat: 'gemini',
    supportsVision: true,
    validationPath: '/models',
  },
  anthropic: {
    displayName: 'Anthropic',
    baseURL: 'https://api.anthropic.com/v1',
    headerKey: 'x-api-key',
    headerPrefix: '',
    extraHeaders: { 'anthropic-version': '2023-06-01' },
    apiFormat: 'openai', // Anthropic uses its own format but we handle it specially
    supportsVision: true,
    validationPath: '/messages',
  },
  openrouter: {
    displayName: 'OpenRouter',
    baseURL: 'https://openrouter.ai/api/v1',
    headerKey: 'Authorization',
    headerPrefix: 'Bearer ',
    extraHeaders: {
      'HTTP-Referer': 'https://eventdecor.app',
      'X-Title': 'EventDecor Visual Search',
    },
    apiFormat: 'openai',
    supportsVision: true,
    validationPath: '/chat/completions',
  },
  deepseek: {
    displayName: 'DeepSeek',
    baseURL: 'https://api.deepseek.com',
    headerKey: 'Authorization',
    headerPrefix: 'Bearer ',
    apiFormat: 'openai',
    supportsVision: false, // DeepSeek doesn't support vision yet
    validationPath: '/chat/completions',
  },
  mistral: {
    displayName: 'Mistral',
    baseURL: 'https://api.mistral.ai/v1',
    headerKey: 'Authorization',
    headerPrefix: 'Bearer ',
    apiFormat: 'openai',
    supportsVision: true,
    validationPath: '/chat/completions',
  },
  together: {
    displayName: 'Together AI',
    baseURL: 'https://api.together.xyz/v1',
    headerKey: 'Authorization',
    headerPrefix: 'Bearer ',
    apiFormat: 'openai',
    supportsVision: true,
    validationPath: '/chat/completions',
  },
  fireworks: {
    displayName: 'Fireworks AI',
    baseURL: 'https://api.fireworks.ai/inference/v1',
    headerKey: 'Authorization',
    headerPrefix: 'Bearer ',
    apiFormat: 'openai',
    supportsVision: true,
    validationPath: '/chat/completions',
  },
  perplexity: {
    displayName: 'Perplexity',
    baseURL: 'https://api.perplexity.ai',
    headerKey: 'Authorization',
    headerPrefix: 'Bearer ',
    apiFormat: 'openai',
    supportsVision: false,
    validationPath: '/chat/completions',
  },
};

// ── Vision Model Registry ──────────────────────────────────────────────────

export const VISION_MODEL_REGISTRY: Record<string, VisionModelEntry> = {
  groq: {
    validation: 'meta-llama/llama-4-scout-17b-16e-instruct',
    production: 'meta-llama/llama-4-scout-17b-16e-instruct',
    fallback: 'meta-llama/llama-4-scout-17b-16e-instruct',
    chain: ['meta-llama/llama-4-scout-17b-16e-instruct'],
  },
  openai: {
    validation: 'gpt-4o-mini',
    production: 'gpt-4o-mini',
    fallback: 'gpt-4o-mini',
    chain: ['gpt-4o-mini', 'gpt-4o'],
  },
  gemini: {
    validation: 'gemini-2.0-flash',
    production: 'gemini-2.0-flash',
    fallback: 'gemini-1.5-flash',
    chain: ['gemini-2.0-flash', 'gemini-1.5-flash'],
  },
  anthropic: {
    validation: 'claude-3-5-haiku-20241022',
    production: 'claude-sonnet-4-20250514',
    fallback: 'claude-3-haiku-20240307',
    chain: ['claude-3-5-haiku-20241022', 'claude-3-haiku-20240307'],
  },
  openrouter: {
    validation: 'openai/gpt-4o-mini',
    production: 'openai/gpt-4o-mini',
    fallback: 'google/gemini-2.0-flash-001',
    chain: ['openai/gpt-4o-mini', 'google/gemini-2.0-flash-001'],
  },
  deepseek: {
    validation: 'deepseek-chat',
    production: 'deepseek-chat',
    fallback: 'deepseek-chat',
    chain: ['deepseek-chat'],
  },
  mistral: {
    validation: 'mistral-small-latest',
    production: 'pixtral-large-latest',
    fallback: 'mistral-small-latest',
    chain: ['mistral-small-latest', 'pixtral-large-latest'],
  },
  together: {
    validation: 'meta-llama/Llama-3.2-11B-Vision-Instruct-Turbo',
    production: 'meta-llama/Llama-3.2-11B-Vision-Instruct-Turbo',
    fallback: 'meta-llama/Llama-3.2-11B-Vision-Instruct-Turbo',
    chain: ['meta-llama/Llama-3.2-11B-Vision-Instruct-Turbo'],
  },
  fireworks: {
    validation: 'accounts/fireworks/models/llama-v3p2-11b-vision-instruct',
    production: 'accounts/fireworks/models/llama-v3p2-11b-vision-instruct',
    fallback: 'accounts/fireworks/models/llama-v3p2-11b-vision-instruct',
    chain: ['accounts/fireworks/models/llama-v3p2-11b-vision-instruct'],
  },
  perplexity: {
    validation: 'sonar',
    production: 'sonar',
    fallback: 'sonar',
    chain: ['sonar'],
  },
  custom: {
    validation: 'default',
    production: 'default',
    fallback: 'default',
    chain: ['default'],
  },
};

// ── Provider Detection ─────────────────────────────────────────────────────

/**
 * Detect the AI provider from an API key's prefix pattern.
 * Returns the provider name string or null if unrecognized.
 *
 * Each provider uses a distinctive key prefix:
 * - OpenAI: sk-proj-*, sk-svcacct-*
 * - Groq: gsk_*
 * - Google/Gemini: AIza*
 * - Anthropic: sk-ant-*
 * - OpenRouter: sk-or-v1-*, sk-or-*
 * - DeepSeek: sk- (35 chars)
 * - Mistral: sk- (32 chars)
 * - Fireworks: fw_*
 * - Perplexity: pplx-*
 * - Together: starts with various patterns
 */
export function detectProviderFromKey(apiKey: string): string | null {
  if (!apiKey || typeof apiKey !== 'string') return null;
  const key = apiKey.trim();

  // Specific prefix matches (most reliable)
  if (key.startsWith('AIza')) return 'gemini';
  if (key.startsWith('gsk_')) return 'groq';
  if (key.startsWith('sk-ant-')) return 'anthropic';
  if (key.startsWith('sk-or-v1-') || key.startsWith('sk-or-')) return 'openrouter';
  if (key.startsWith('pplx-')) return 'perplexity';
  if (key.startsWith('fw_')) return 'fireworks';
  if (key.startsWith('xai-')) return 'openai'; // xAI uses OpenAI-compatible
  if (key.startsWith('sk-proj-') || key.startsWith('sk-svcacct-')) return 'openai';

  // Generic sk- disambiguation by key length
  if (key.startsWith('sk-')) {
    if (key.length === 35) return 'deepseek';
    if (key.length === 32) return 'mistral';
    return 'openai'; // Default sk- to OpenAI
  }

  return null; // Unknown provider — admin must select manually
}

/**
 * Get the best vision model for a provider and purpose.
 */
export function getVisionModel(
  provider: string,
  tier: 'validation' | 'production' | 'fallback' = 'production',
): string {
  const entry = VISION_MODEL_REGISTRY[provider] || VISION_MODEL_REGISTRY.custom;
  return entry[tier];
}

/**
 * Get the validation chain for a provider (ordered list of models to try).
 */
export function getValidationChain(provider: string): string[] {
  const entry = VISION_MODEL_REGISTRY[provider] || VISION_MODEL_REGISTRY.custom;
  return entry.chain;
}

/**
 * Check if a provider name is registered in our config.
 */
export function isKnownProvider(provider: string): boolean {
  return provider in VISION_PROVIDER_CONFIG || provider === 'custom';
}

/**
 * Get all registered provider names (for dynamic dropdown population).
 */
export function getRegisteredProviders(): Array<{
  name: string;
  displayName: string;
  supportsVision: boolean;
}> {
  return Object.entries(VISION_PROVIDER_CONFIG).map(([name, config]) => ({
    name,
    displayName: config.displayName,
    supportsVision: config.supportsVision,
  }));
}
