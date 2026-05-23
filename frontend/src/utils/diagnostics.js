import { getApiConfig } from '../config/apiConfig';
import logger from './logger';

let bootLogged = false;

/**
 * Logs deployment, API, and routing diagnostics once per session (production-safe).
 */
export const logStartupDiagnostics = () => {
  if (bootLogged || typeof window === 'undefined') return;
  bootLogged = true;

  const config = getApiConfig();
  const payload = {
    deployVersion: config.deployVersion,
    apiBaseUrl: config.baseUrl,
    apiOrigin: config.apiOrigin,
    route: window.location.pathname,
    env: config.isDev ? 'development' : 'production',
    userAgent: navigator.userAgent,
    onLine: navigator.onLine,
  };

  logger.info('[Diagnostics] App startup', payload);

  if (!config.isDev) {
    try {
      window.__SIRI_DIAGNOSTICS__ = payload;
    } catch {
      // ignore
    }
  }
};

export const logRouteDiagnostic = (pathname) => {
  logger.dev('[Diagnostics] Route', { pathname, deployVersion: getApiConfig().deployVersion });
};

export const logApiDiagnostic = (method, url, meta = {}) => {
  logger.dev('[Diagnostics] API', { method, url, ...meta });
};
