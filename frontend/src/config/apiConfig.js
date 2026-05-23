/**
 * Centralized API configuration for all environments.
 * Production must use VITE_API_URL (Render backend). Development uses the Vite /api proxy.
 */

export const PRODUCTION_API_ORIGIN = 'https://siri-arts-n-crafts.onrender.com';

const normalizeApiBase = (url) => {
  const trimmed = String(url || '').trim().replace(/\/+$/, '');
  if (!trimmed) return '';
  if (trimmed.endsWith('/api/v1')) return trimmed;
  if (trimmed.endsWith('/api')) return `${trimmed}/v1`;
  return `${trimmed}/api/v1`;
};

const resolveOrigin = (baseUrl) => {
  if (typeof window !== 'undefined' && baseUrl.startsWith('/')) {
    return window.location.origin;
  }
  try {
    return new URL(baseUrl, typeof window !== 'undefined' ? window.location.origin : PRODUCTION_API_ORIGIN)
      .origin;
  } catch {
    return PRODUCTION_API_ORIGIN;
  }
};

/**
 * @returns {{ baseUrl: string, apiRootUrl: string, apiOrigin: string, isDev: boolean, deployVersion: string, configuredUrl: string }}
 */
export const getApiConfig = () => {
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
    const productionBase = configured || `${PRODUCTION_API_ORIGIN}/api/v1`;
    baseUrl = normalizeApiBase(productionBase);
  }

  const apiRootUrl = baseUrl.startsWith('/')
    ? '/api'
    : baseUrl.replace(/\/v1\/?$/, '');

  return {
    baseUrl,
    apiRootUrl,
    apiOrigin: resolveOrigin(baseUrl),
    isDev,
    deployVersion,
    configuredUrl: configured,
  };
};

export const getApiUrl = () => getApiConfig().baseUrl;

export const getApiRootUrl = () => getApiConfig().apiRootUrl;

export const getApiOrigin = () => getApiConfig().apiOrigin;
