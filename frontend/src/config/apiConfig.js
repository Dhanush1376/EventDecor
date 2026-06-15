/**
 * Centralized API configuration for all environments.
 * Production must use VITE_API_URL (Render backend). Development uses the Vite /api proxy.
 */

export const PRODUCTION_API_ORIGIN = 'https://eventdecor-production-1647.up.railway.app';

const normalizeApiBase = (url) => {
  let trimmed = String(url || '')
    .trim()
    .replace(/\/+$/, '');
  if (!trimmed) return '';
  if (!trimmed.startsWith('/') && !/^https?:\/\//i.test(trimmed)) {
    trimmed = `https://${trimmed}`;
  }
  if (trimmed.endsWith('/api/v1')) return trimmed;
  if (trimmed.endsWith('/api')) return `${trimmed}/v1`;
  return `${trimmed}/api/v1`;
};

const resolveOrigin = (baseUrl) => {
  if (typeof window !== 'undefined' && baseUrl.startsWith('/')) {
    return window.location.origin;
  }
  try {
    return new URL(
      baseUrl,
      typeof window !== 'undefined' ? window.location.origin : PRODUCTION_API_ORIGIN,
    ).origin;
  } catch {
    return PRODUCTION_API_ORIGIN;
  }
};

let cachedConfig = null;

/**
 * @returns {{ baseUrl: string, apiRootUrl: string, apiOrigin: string, isDev: boolean, deployVersion: string, configuredUrl: string }}
 */
export const getApiConfig = () => {
  if (cachedConfig) return cachedConfig;

  const isDev = import.meta.env.DEV;
  const configured = import.meta.env.VITE_API_URL?.trim() || '';
  const deployVersion =
    import.meta.env.VITE_BUILD_ID ||
    import.meta.env.VITE_VERCEL_GIT_COMMIT_SHA?.slice?.(0, 12) ||
    'local';

  let baseUrl;

  if (isDev) {
    const pointsToLocalBackend =
      !configured || /localhost:5000|127\.0\.0\.1:5000/i.test(configured);
    baseUrl = pointsToLocalBackend ? '/api/v1' : normalizeApiBase(configured);
  } else {
    const productionBase = configured && configured !== '/api' ? configured : '/api/v1';
    baseUrl = normalizeApiBase(productionBase);
  }

  const apiRootUrl = baseUrl.startsWith('/') ? '/api' : baseUrl.replace(/\/v1\/?$/, '');

  cachedConfig = {
    baseUrl,
    apiRootUrl,
    apiOrigin: resolveOrigin(baseUrl),
    isDev,
    deployVersion,
    configuredUrl: configured,
  };

  return cachedConfig;
};

export const getApiUrl = () => getApiConfig().baseUrl;

export const getApiRootUrl = () => getApiConfig().apiRootUrl;

export const getApiOrigin = () => getApiConfig().apiOrigin;
