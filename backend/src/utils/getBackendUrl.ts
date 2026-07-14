import logger from '../config/logger';

/**
 * Robust utility to resolve the canonical backend URL across environments.
 */
export const getBackendUrl = (): string => {
  // 1. Explicit canonical URL (most reliable)
  if (process.env.BACKEND_URL) {
    return process.env.BACKEND_URL.replace(/\/$/, '');
  }

  // 2. Production hardcoded fallback
  if (process.env.NODE_ENV === 'production') {
    logger.warn('[URL RESOLUTION] Missing BACKEND_URL in production. Using hardcoded fallback.');
    return 'https://api.siriartsandcrafts.com';
  }

  // 3. Local development fallback
  return 'http://localhost:5000';
};
