/**
 * Resolves the API base URL.
 * - Dev: same-origin `/api/v1` via Vite proxy (cookies work).
 * - Prod on site host: same-origin `/api/v1` via Vercel rewrite (cookies work).
 * - Override with VITE_API_URL when needed.
 */
const normalizeConfigured = (configured) => {
  if (!configured.endsWith('/api') && !configured.endsWith('/api/v1')) {
    return configured.replace(/\/+$/, '') + '/api/v1';
  }
  return configured;
};

const shouldUseSameOriginApi = (configured) => {
  if (typeof window === 'undefined') return false;
  try {
    const target = new URL(configured, window.location.origin);
    return target.origin !== window.location.origin;
  } catch {
    return false;
  }
};

export const getApiUrl = () => {
  const configured = import.meta.env.VITE_API_URL?.trim();

  if (configured) {
    const useProxy =
      (import.meta.env.PROD && shouldUseSameOriginApi(configured)) ||
      (import.meta.env.DEV &&
        /localhost:5000|127\.0\.0\.1:5000/i.test(configured));
    if (useProxy) {
      return '/api/v1';
    }
    return normalizeConfigured(configured);
  }

  if (import.meta.env.DEV) {
    return '/api/v1';
  }

  return '/api/v1';
};
