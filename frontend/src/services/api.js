import axios from 'axios';
import logger from '../utils/logger';
import { getApiUrl, getApiRootUrl } from '../config/apiConfig';
import { normalizeApiError } from '../utils/apiErrors';
import { getCachedGet, setCachedGet } from '../utils/apiCache';
import {
  hasSessionMarker,
  setSessionMarker,
  clearAuthStorage,
  getFallbackRefreshToken,
  setFallbackRefreshToken,
} from '../utils/authStorage';
import { clearCachedProfile } from '../utils/authSessionCache';

const api = axios.create({
  timeout: 15000, // 15s timeout to prevent hanging connections and give early feedback
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

const TRANSIENT_STATUSES = new Set([408, 429, 500, 502, 503, 504]);
const MAX_GET_RETRIES = 4;
const MAX_MUTATION_RETRIES = 2;

let accessToken = null;
let refreshPromise = null;
let refreshPostPromise = null;
let csrfToken = null;
let csrfInitPromise = null;
let authBootstrapActive = false;

export const setAuthBootstrapActive = (active) => {
  authBootstrapActive = !!active;
};

const MUTATING_METHODS = new Set(['post', 'put', 'patch', 'delete']);

const pathIncludesAuth = (url = '') => String(url).toLowerCase().includes('/auth/');

export const ensureCsrfToken = async () => {
  if (csrfToken) return csrfToken;
  if (!csrfInitPromise) {
    csrfInitPromise = api
      .get('/csrf-token', { _bypassOfflineQueue: true })
      .then((res) => {
        csrfToken = res.data?.csrfToken || csrfToken;
        return csrfToken;
      })
      .catch((err) => {
        csrfInitPromise = null;
        throw err;
      });
  }
  return csrfInitPromise;
};

export const setAccessToken = (token) => {
  accessToken = token || null;
};

export const getAccessToken = () => accessToken;

const applyRefreshPayload = (payload) => {
  const token = payload?.accessToken || payload?.token;
  const refreshToken = payload?.refreshToken;
  
  if (token) {
    setAccessToken(token);
    setSessionMarker();
    if (refreshToken) {
      setFallbackRefreshToken(refreshToken);
    }
  }
  return token;
};

const buildRefreshBody = () => {
  const fallbackToken = getFallbackRefreshToken();
  return fallbackToken ? { refreshToken: fallbackToken } : {};
};

// Helper to identify queueable mutating requests
const isQueueable = (url, method) => {
  if (!url) return false;
  const path = url.toLowerCase();
  const m = method.toLowerCase();
  
  // Only queue mutating actions
  if (m !== 'post' && m !== 'put' && m !== 'delete' && m !== 'patch') {
    return false;
  }

  // Exclude auth-related requests (login, register, logout, token refresh)
  if (path.includes('/auth/')) return false;

  // Exclude payment-related requests and security lock operations
  if (path.includes('/payment') || path.includes('/verify-payment')) return false;
  if (path.includes('/safety-lock') || path.includes('/cms/publish')) return false;

  return true;
};

// Helper to construct descriptive queue summaries
const getRequestDescription = (config) => {
  const url = config.url || '';
  const method = (config.method || 'POST').toUpperCase();
  if (url.includes('/users/cart')) return "Update Shopping Cart";
  if (url.includes('/users/wishlist')) return "Update Wishlist";
  if (url.includes('/inquiries')) return "Submit Custom Inquiry";
  if (url.includes('/custom-orders')) return "Submit Custom Order Inquiry";
  if (url.includes('/event-bookings')) return "Book Event Consultation";
  if (url.includes('/reviews')) return "Submit Product Review";
  return `${method} request to ${url.split('/').pop()}`;
};

const hasLocalAuthMarker = () => hasSessionMarker();

const dispatchUnauthorized = () => {
  if (authBootstrapActive) {
    logger.dev('[API] Suppressed auth-unauthorized during session bootstrap');
    return;
  }
  setAccessToken(null);
  clearAuthStorage();
  clearCachedProfile();
  window.dispatchEvent(new Event('auth-unauthorized'));
};

export const refreshAccessToken = async () => {
  if (!hasLocalAuthMarker()) {
    return null;
  }
  if (!refreshPromise) {
    refreshPromise = api
      .post('/auth/refresh', buildRefreshBody(), { _skipAuthRetry: true })
      .then((res) => {
        const payload = res.data?.data || res.data;
        return applyRefreshPayload(payload);
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
};

// Add a request interceptor to include auth token and manage offline states
api.interceptors.request.use(
  async (config) => {
    config.baseURL = getApiUrl();
    const path = (config.url || '').toLowerCase();

    const isProtectedRoute =
      path.includes('/auth/profile') ||
      path.includes('/users/cart') ||
      path.includes('/users/wishlist') ||
      path.includes('/users/profile') ||
      path.includes('/users/addresses') ||
      path.includes('/users/team') ||
      path.includes('/orders') ||
      path.includes('/admin/') ||
      path.includes('/custom-orders') ||
      path.includes('/notifications') ||
      path.includes('/analytics/') ||
      path.includes('/reviews') ||
      path.includes('/recommendations/for-you');

    const isAuthLifecycleRequest =
      path.includes('/auth/refresh') ||
      path.includes('/auth/login') ||
      path.includes('/auth/register') ||
      path.includes('/auth/logout') ||
      config._skipAuthRetry === true;

    // Prevent protected calls before a session marker exists
    if (!accessToken && !hasLocalAuthMarker() && isProtectedRoute) {
      const err = new axios.AxiosError('Not authenticated', 'ERR_NO_SESSION', config);
      return Promise.reject(err);
    }

    // ─── AUTH TOKEN INTEGRATION & QUEUEING ───
    if (!isAuthLifecycleRequest) {
      if (isProtectedRoute && !accessToken && hasLocalAuthMarker()) {
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

    const method = (config.method || 'get').toLowerCase();
    if (MUTATING_METHODS.has(method) && !config.url?.includes('/orders/webhook')) {
      const token = await ensureCsrfToken();
      if (token) {
        config.headers['X-CSRF-Token'] = token;
      }
    }

    // ─── OFFLINE & RECONNECTING INTEGRATION ───
    const isOfflineOrReconnecting =
      window.__networkState === 'offline' ||
      window.__networkState === 'reconnecting';
    const isBypass = config._bypassOfflineQueue === true;

    if (isOfflineOrReconnecting && !isBypass) {
      const method = config.method ? config.method.toLowerCase() : 'get';

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
          "Service is currently offline or reconnecting.",
          "ERR_OFFLINE",
          config
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
            "ERR_OFFLINE_QUEUED",
            config
          );
          error.offlineQueued = true;
          error.queueItem = queueItem;
          return Promise.reject(error);
        }
      }

      // Non-queueable mutations (e.g. login, payment checkout) while offline/reconnecting
      const error = new axios.AxiosError(
        "Action unavailable while connection is offline or reconnecting.",
        "ERR_OFFLINE",
        config
      );
      return Promise.reject(error);
    }

    config.metadata = { startTime: Date.now() };
    return config;
  },
  (error) => Promise.reject(error)
);

const SLOW_REQUEST_MS = 4000;

// Add a response interceptor to handle errors globally
api.interceptors.response.use(
  (response) => {
    const started = response.config?.metadata?.startTime;
    if (started && import.meta.env.PROD) {
      const duration = Date.now() - started;
      if (duration > SLOW_REQUEST_MS) {
        logger.warn(`[API] Slow request ${response.config?.method?.toUpperCase()} ${response.config?.url} (${duration}ms)`);
      }
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    const normalized = normalizeApiError(error);
    error.normalized = normalized;

    const isAuthRefresh = originalRequest?.url?.includes('/auth/refresh');
    const isAuthLogout = originalRequest?.url?.includes('/auth/logout');

    const method = originalRequest?.method?.toLowerCase() || 'get';
    const isGet = method === 'get';
    const status = error.response?.status;
    const isDatabaseDown = status === 503 && error.response?.data?.message?.includes('Database is currently starting up');
    
    // Don't treat database readiness guard 503s as generic transient errors to avoid 2-minute UI hangs
    const isTransientError =
      (!error.response || TRANSIENT_STATUSES.has(status) || normalized.isTimeout) && !isDatabaseDown;
      
    const maxRetries = isGet ? MAX_GET_RETRIES : MAX_MUTATION_RETRIES;
    const hasRetryAttemptsLeft =
      originalRequest && (!originalRequest._retryCount || originalRequest._retryCount < maxRetries);
    const isAuthRoute = pathIncludesAuth(originalRequest?.url);
    const retryDisabled = originalRequest?._disableRetry === true;
    const isPaymentOrOrderMutation =
      originalRequest?.url?.includes('/orders') ||
      originalRequest?.url?.includes('/verify-payment') ||
      originalRequest?.url?.includes('/payment');
    const canRetryMutation =
      !retryDisabled &&
      !isPaymentOrOrderMutation &&
      !isAuthRoute &&
      ['post', 'put', 'patch'].includes(method);

    if (
      isTransientError &&
      hasRetryAttemptsLeft &&
      !originalRequest?._retry &&
      !retryDisabled &&
      !window.__isOffline &&
      (isGet || canRetryMutation)
    ) {
      originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;
      const backoffDelay =
        Math.pow(2, originalRequest._retryCount) * 500 + // Reduced from 1000 to 500 for faster failure
        Math.random() * 200 +
        (status === 429 ? 2000 : 0);

      logger.warn(
        `[API] Transient ${method.toUpperCase()} ${originalRequest.url} — retry ${originalRequest._retryCount}/${maxRetries} in ${Math.round(backoffDelay)}ms`
      );

      await new Promise((resolve) => setTimeout(resolve, backoffDelay));
      return api(originalRequest);
    }

    const isProtectedWithoutSession =
      !hasLocalAuthMarker() &&
      !accessToken &&
      (originalRequest?.url?.includes('/auth/profile') ||
        originalRequest?.url?.includes('/users/cart') ||
        originalRequest?.url?.includes('/users/wishlist') ||
        originalRequest?.url?.includes('/users/addresses') ||
        originalRequest?.url?.includes('/orders'));

    if (isProtectedWithoutSession) {
      return Promise.reject(error);
    }

    const skipAuthRetry = originalRequest?._skipAuthRetry;

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isAuthRefresh &&
      !isAuthLogout &&
      !skipAuthRetry
    ) {
      originalRequest._retry = true;
      logger.dev('[API] 401 Unauthorized - Attempting token refresh for:', originalRequest.url);

      try {
          const token = await refreshAccessToken();
          if (token) {
            logger.dev('[API] Token refresh successful. Retrying original request.');
            if (originalRequest.headers && typeof originalRequest.headers.set === 'function') {
              originalRequest.headers.set('Authorization', `Bearer ${token}`);
            } else {
              originalRequest.headers = originalRequest.headers || {};
              originalRequest.headers['Authorization'] = `Bearer ${token}`;
            }
            return api(originalRequest);
          }
      } catch (refreshErr) {
        if (refreshErr.response) {
          logger.error('[API] Token refresh rejected by server.');
          dispatchUnauthorized();
        } else {
          logger.warn('[API] Token refresh failed due to network error. Preserving session.');
        }
      }
    } else if (error.response?.status === 401 && isAuthRefresh) {
      logger.error('[API] Refresh endpoint returned 401. Session expired.');
      dispatchUnauthorized();
    } else if (status === 403) {
      logger.warn('[API] Forbidden:', originalRequest?.url, normalized.message);
    } else if (status === 404) {
      logger.dev('[API] Not found:', originalRequest?.url);
    } else if (status === 429) {
      logger.warn('[API] Rate limited:', originalRequest?.url);
    } else if (normalized.isNetwork && !isAuthRoute) {
      logger.warn('[API] Network failure:', originalRequest?.url, normalized.message);
    }

    return Promise.reject(error);
  }
);

// High-performance GET request de-duplication wrapper to block parallel duplicate fetches
const originalGet = api.get;
const pendingGetRequests = new Map();

const clearPendingGets = () => {
  pendingGetRequests.clear();
};

api.get = function (url, config) {
  const requestKey = `${url}?${JSON.stringify(config || {})}`;

  const cached = getCachedGet(url, config);
  if (cached && !cached.stale) {
    return Promise.resolve({ data: cached.data, status: 200, statusText: 'OK', headers: {}, config: config || {}, fromCache: true });
  }

  if (pendingGetRequests.has(requestKey)) {
    return pendingGetRequests.get(requestKey);
  }

  const promise = originalGet.call(this, url, config)
    .then((response) => {
      pendingGetRequests.delete(requestKey);
      if (response?.data !== undefined) {
        setCachedGet(url, config, response.data);
      }
      return response;
    })
    .catch((error) => {
      pendingGetRequests.delete(requestKey);
      if (cached?.data) {
        return { data: cached.data, status: 200, statusText: 'OK', headers: {}, config: config || {}, fromCache: true, stale: true };
      }
      throw error;
    });

  pendingGetRequests.set(requestKey, promise);
  return promise;
};

// High-performance POST request de-duplication wrapper for token refresh to avoid concurrent replay race conditions
const originalPost = api.post;
api.post = function (url, data, config) {
  clearPendingGets();
  if (url === '/auth/refresh' || url?.includes('/auth/refresh')) {
    const body = data && Object.keys(data).length ? data : buildRefreshBody();
    if (!refreshPostPromise) {
      refreshPostPromise = originalPost.call(this, url, body, config).finally(() => {
        refreshPostPromise = null;
      });
    }
    return refreshPostPromise;
  }
  return originalPost.call(this, url, data, config);
};

const originalPut = api.put;
api.put = function (url, data, config) {
  clearPendingGets();
  return originalPut.call(this, url, data, config);
};

const originalPatch = api.patch;
api.patch = function (url, data, config) {
  clearPendingGets();
  return originalPatch.call(this, url, data, config);
};

const originalDelete = api.delete;
api.delete = function (url, config) {
  clearPendingGets();
  return originalDelete.call(this, url, config);
};

export default api;
