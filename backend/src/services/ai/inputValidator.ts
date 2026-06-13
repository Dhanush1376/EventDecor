/**
 * inputValidator.ts — API Key and Provider Input Validation
 *
 * Validates user-submitted API keys, provider names, and endpoint URLs
 * before they reach the database or external APIs.
 *
 * Uses Event Decor's existing ssrfProtection utility for URL validation.
 */

import { isKnownProvider } from './providerRegistry';
import { isSafeUrl } from '../../utils/ssrfProtection';
import logger from '../../config/logger';

// ── API Key Validation ─────────────────────────────────────────────────────

const MIN_KEY_LENGTH = 10;
const MAX_KEY_LENGTH = 500;
const API_KEY_PATTERN = /^[A-Za-z0-9\-_.:/=+]+$/;

export interface InputValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate an API key string for basic safety/format requirements.
 * This does NOT check if the key is actually valid with the provider —
 * it only guards against malformed input, injection, and absurd values.
 */
export function validateApiKeyInput(apiKey: string): InputValidationResult {
  if (!apiKey || typeof apiKey !== 'string') {
    return { valid: false, error: 'API key is required.' };
  }

  const trimmed = apiKey.trim();

  if (trimmed.length < MIN_KEY_LENGTH) {
    return { valid: false, error: `API key is too short (min ${MIN_KEY_LENGTH} characters).` };
  }

  if (trimmed.length > MAX_KEY_LENGTH) {
    return { valid: false, error: `API key is too long (max ${MAX_KEY_LENGTH} characters).` };
  }

  if (!API_KEY_PATTERN.test(trimmed)) {
    return { valid: false, error: 'API key contains invalid characters.' };
  }

  // Check for common placeholder values
  const placeholders = ['your-api-key', 'YOUR_API_KEY', 'change_me', 'sk-xxx', 'test-key'];
  if (placeholders.includes(trimmed.toLowerCase())) {
    return { valid: false, error: 'Please enter a real API key, not a placeholder.' };
  }

  return { valid: true };
}

// ── Provider Validation ────────────────────────────────────────────────────

/**
 * Validate a provider name string.
 * Accepts any known provider in the registry, plus 'custom'.
 */
export function validateProviderInput(provider: string): InputValidationResult {
  if (!provider || typeof provider !== 'string') {
    return { valid: false, error: 'Provider name is required.' };
  }

  const trimmed = provider.trim().toLowerCase();

  if (trimmed === 'custom') return { valid: true };
  if (isKnownProvider(trimmed)) return { valid: true };

  return {
    valid: false,
    error: `Unknown provider "${trimmed}". Use a known provider or "custom".`,
  };
}

// ── Endpoint URL Validation ────────────────────────────────────────────────

/**
 * Validate a custom endpoint URL.
 * Uses the existing ssrfProtection utility to prevent SSRF attacks.
 */
export async function validateEndpointUrlInput(url: string): Promise<InputValidationResult> {
  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'Endpoint URL is required for custom providers.' };
  }

  const trimmed = url.trim();

  // Basic URL format check
  try {
    const parsed = new URL(trimmed);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { valid: false, error: 'Only HTTP/HTTPS URLs are allowed.' };
    }
  } catch {
    return { valid: false, error: 'Invalid URL format.' };
  }

  // SSRF protection (blocks localhost, internal IPs, etc.)
  // Allow in development mode for local Ollama/LM Studio endpoints
  if (process.env.NODE_ENV === 'production') {
    const safe = await isSafeUrl(trimmed);
    if (!safe) {
      logger.warn(`[INPUT_VALIDATOR] SSRF blocked: ${trimmed}`);
      return { valid: false, error: 'This URL points to an internal or reserved address.' };
    }
  }

  return { valid: true };
}

// ── API Key Masking ────────────────────────────────────────────────────────

/**
 * Mask an API key for safe display (e.g., in admin dashboard or API responses).
 * Shows first 4 and last 4 characters, with asterisks in between.
 *
 * Examples:
 *   gsk_abc123xyz789 → gsk_************789
 *   sk-proj-abc... → sk-p*****...
 *   short → ****
 */
export function maskApiKey(key: string): string {
  if (!key || typeof key !== 'string') return '****';
  if (key.length <= 8) return '****';

  const first = key.substring(0, 4);
  const last = key.substring(key.length - 4);
  const middleLength = Math.min(key.length - 8, 20);

  return `${first}${'*'.repeat(middleLength)}${last}`;
}
