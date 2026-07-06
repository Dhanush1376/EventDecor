import axios from 'axios';
import logger from '../../utils/core/logger';
import { getApiUrl } from '../../config/apiConfig';
import { getCachedGet } from '../../utils/api/apiCache';
import {
  isPathProtected,
  MUTATING_METHODS,
  isQueueable,
  getRequestDescription,
} from '../apiHelpers';

export const createRequestInterceptor =
  ({
    getAccessToken,
    hasLocalAuthMarker,
    refreshAccessToken,
    ensureCsrfToken,
    getRefreshPromise,
  }) =>
  async (config) => {
    config.baseURL = getApiUrl();
    const path = (config.url || '').toLowerCase();
    const method = (config.method || 'get').toLowerCase();

    const isProtectedRoute = isPathProtected(path, method);

    const isAuthLifecycleRequest =
      path.includes('/auth/refresh') ||
      path.includes('/auth/login') ||
      path.includes('/auth/register') ||
      path.includes('/auth/logout') ||
      path.includes('/auth/google') ||
      path.includes('/csrf-token') ||
      config._skipAuthRetry === true;

    const accessToken = getAccessToken();

    // Prevent protected calls before a session marker exists
    if (!accessToken && !hasLocalAuthMarker() && isProtectedRoute) {
      const err = new axios.AxiosError('Not authenticated', 'ERR_NO_SESSION', config);
      return Promise.reject(err);
    }

    // ─── AUTH TOKEN INTEGRATION & QUEUEING ───
    if (!isAuthLifecycleRequest) {
      // Completely block parallel requests globally while refreshing
      const activeRefresh = getRefreshPromise ? getRefreshPromise() : null;

      if (activeRefresh) {
        try {
          await activeRefresh;
        } catch (e) {
          return Promise.reject(e);
        }
      }

      // Re-fetch access token after potential refresh block
      const currentToken = getAccessToken();

      if (isProtectedRoute && !currentToken && hasLocalAuthMarker()) {
        try {
          const token = await refreshAccessToken();
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          } else {
            const err = new axios.AxiosError('Session expired', 'ERR_NO_SESSION', config);
            return Promise.reject(err);
          }
        } catch (err) {
          return Promise.reject(err);
        }
      } else if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
      }
    }

    if (MUTATING_METHODS.has(method) && !config.url?.includes('/orders/webhook')) {
      const token = await ensureCsrfToken();
      if (token) {
        config.headers['X-CSRF-Token'] = token;
      }
    }

    // ─── OFFLINE & RECONNECTING INTEGRATION ───
    const isOfflineOrReconnecting =
      !import.meta.env.DEV &&
      (window.__networkState === 'offline' || window.__networkState === 'reconnecting');
    const isBypass = config._bypassOfflineQueue === true;

    if (isOfflineOrReconnecting && !isBypass && !import.meta.env.DEV) {
      if (method === 'get') {
        const cached = getCachedGet(config.url, config);
        if (cached) {
          logger.dev(`[API] Serving offline cached GET for: ${config.url}`);
          return Promise.resolve({
            data: cached.data,
            status: 200,
            statusText: 'OK',
            headers: {},
            config,
            fromCache: true,
            stale: true,
          });
        }
        const error = new axios.AxiosError(
          'Service is currently offline or reconnecting.',
          'ERR_OFFLINE',
          config,
        );
        return Promise.reject(error);
      }

      // Mutating requests: Check if queueable
      if (isQueueable(config.url, config.method)) {
        if (typeof window.__queueRequest === 'function') {
          const queueItem = window.__queueRequest({
            url: config.url,
            method: config.method,
            data: config.data,
            headers: config.headers,
            description: getRequestDescription(config),
          });

          const error = new axios.AxiosError(
            `Request queued offline: ${queueItem.description}`,
            'ERR_OFFLINE_QUEUED',
            config,
          );
          error.offlineQueued = true;
          error.queueItem = queueItem;
          return Promise.reject(error);
        }
      }

      // Non-queueable mutations (e.g. login, payment checkout) while offline/reconnecting
      const error = new axios.AxiosError(
        'Action unavailable while connection is offline or reconnecting.',
        'ERR_OFFLINE',
        config,
      );
      return Promise.reject(error);
    }

    config.metadata = { startTime: Date.now() };
    return config;
  };
