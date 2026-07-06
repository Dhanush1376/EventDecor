/**
 * Centralized API configuration for all environments.
 * Production uses the same-origin /api proxy. Development uses the Vite /api proxy.
 */

export const PRODUCTION_API_ORIGIN = import.meta.env.VITE_PRODUCTION_API_ORIGIN || '';

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
  const deployVersion =
    import.meta.env.VITE_BUILD_ID ||
    import.meta.env.VITE_VERCEL_GIT_COMMIT_SHA?.slice?.(0, 12) ||
    'local';

  let baseUrl;
  let configured = '';

  if (isDev) {
    configured = import.meta.env.VITE_API_URL?.trim() || '';
    const pointsToLocalBackend =
      !configured || /localhost:5000|127\.0\.0\.1:5000/i.test(configured);
    baseUrl = pointsToLocalBackend ? '/api/v1' : normalizeApiBase(configured);
  } else {
    // Force relative same-origin proxy routing to bypass ISP/carrier blocks on the direct Railway domain
    const productionBase = '/api/v1';
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

export const getWebSocketUrl = () => {
  const config = getApiConfig();
  if (!config.isDev && PRODUCTION_API_ORIGIN) {
    return PRODUCTION_API_ORIGIN;
  }
  let socketServerUrl = config.apiRootUrl;
  if (socketServerUrl.endsWith('/api/v1')) {
    socketServerUrl = socketServerUrl.slice(0, -7);
  } else if (socketServerUrl.endsWith('/api')) {
    socketServerUrl = socketServerUrl.slice(0, -4);
  }
  return socketServerUrl;
};
