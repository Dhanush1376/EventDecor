import axios from 'axios';
import logger from '../utils/logger';
import { getApiUrl } from '../utils/apiUrl';
import { getCachedGet, setCachedGet } from '../utils/apiCache';

const API_URL = getApiUrl();

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  timeout: 30000, // 30s timeout to prevent hanging requests
  headers: {
    'Content-Type': 'application/json',
  },
});

let accessToken = null;
let refreshPromise = null;
let csrfToken = null;
let csrfInitPromise = null;

const MUTATING_METHODS = new Set(['post', 'put', 'patch', 'delete']);

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

const hasLocalAuthMarker = () => {
  try {
    return !!localStorage.getItem('siri_auth_token');
  } catch {
    return false;
  }
};

// Add a request interceptor to include auth token and manage offline states
api.interceptors.request.use(
  async (config) => {
    const path = (config.url || '').toLowerCase();

    // Prevent protected profile/cart/wishlist calls before a session marker exists
    if (
      !accessToken &&
      !hasLocalAuthMarker() &&
      (path.includes('/auth/profile') ||
        path.includes('/users/cart') ||
        path.includes('/users/wishlist') ||
        path.includes('/users/profile'))
    ) {
      const err = new axios.AxiosError('Not authenticated', 'ERR_NO_SESSION', config);
      return Promise.reject(err);
    }

    // ─── AUTH TOKEN INTEGRATION ───
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    const method = (config.method || 'get').toLowerCase();
    if (MUTATING_METHODS.has(method) && !config.url?.includes('/orders/webhook')) {
      const token = await ensureCsrfToken();
      if (token) {
        config.headers['X-CSRF-Token'] = token;
      }
    }

    // ─── OFFLINE INTEGRATION ───
    const isOffline = window.__networkState === 'offline';
    const isBypass = config._bypassOfflineQueue === true;

    if (isOffline && !isBypass) {
      const method = config.method ? config.method.toLowerCase() : 'get';
      
      // We no longer aggressively block GET requests here.
      // We let the browser's fetch attempt it, as network conditions might have recovered
      // without navigator.onLine updating yet.

      // Mutating requests: Check if queueable
      if (method !== 'get' && isQueueable(config.url, config.method)) {
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

      // Non-queueable mutations (e.g. login, payment checkout) while explicitly offline
      if (method !== 'get') {
        const error = new axios.AxiosError(
          "Action unavailable while offline.",
          "ERR_OFFLINE",
          config
        );
        return Promise.reject(error);
      }
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
    const isAuthRefresh = originalRequest?.url?.includes('/auth/refresh');
    const isAuthLogout = originalRequest?.url?.includes('/auth/logout');

    // ─── TRANSIENT FAILURE AUTOMATIC RETRIES (GET ONLY) ───
    const isGet = originalRequest?.method?.toLowerCase() === 'get';
    const isTransientError = !error.response || [500, 502, 503, 504].includes(error.response.status);
    const hasRetryAttemptsLeft = originalRequest && (!originalRequest._retryCount || originalRequest._retryCount < 3);

    // Skip retries entirely if we are currently offline to keep network cleaner
    if (isGet && isTransientError && hasRetryAttemptsLeft && !originalRequest?._retry && !window.__isOffline) {
      originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;
      // Exponential backoff: 2^attempt * 1000ms + randomized jitter
      const backoffDelay = Math.pow(2, originalRequest._retryCount) * 1000 + Math.random() * 100;
      
      if (import.meta.env.DEV) {
        logger.warn(`⚠️ [API TRANSIENT RETRY] GET ${originalRequest.url} failed. Retrying attempt ${originalRequest._retryCount} in ${Math.round(backoffDelay)}ms...`);
      }
      
      await new Promise((resolve) => setTimeout(resolve, backoffDelay));
      return api(originalRequest);
    }

    const isProtectedWithoutSession =
      !hasLocalAuthMarker() &&
      !accessToken &&
      (originalRequest?.url?.includes('/auth/profile') ||
        originalRequest?.url?.includes('/users/cart') ||
        originalRequest?.url?.includes('/users/wishlist'));

    if (isProtectedWithoutSession) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !isAuthRefresh && !isAuthLogout) {
      originalRequest._retry = true;
      logger.dev('[API] 401 Unauthorized - Attempting token refresh for:', originalRequest.url);

      try {
        if (!refreshPromise) {
          logger.dev('[API] Initiating refresh token request...');
          refreshPromise = api.post('/auth/refresh').finally(() => {
            refreshPromise = null;
          });
        }
        const refreshResponse = await refreshPromise;
        const token = refreshResponse.data?.data?.accessToken || refreshResponse.data?.data?.token;

        if (token) {
          setAccessToken(token);
        }

        logger.dev('[API] Token refresh successful. Retrying original request.');
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      } catch (refreshErr) {
        // Only trigger logout if it's a true 4xx/5xx rejection from the server
        if (refreshErr.response) {
          logger.error('[API] Token refresh rejected by server. Triggering logout.');
          setAccessToken(null);
          window.dispatchEvent(new Event('auth-unauthorized'));
        } else {
          logger.warn('[API] Token refresh failed due to network error. Preserving session.');
          // Don't wipe session on timeout/network drop!
        }
      }
    } else if (error.response?.status === 401 && isAuthRefresh) {
      logger.error('[API] Refresh endpoint returned 401. Session expired.');
      setAccessToken(null);
      window.dispatchEvent(new Event('auth-unauthorized'));
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
    if (!refreshPromise) {
      refreshPromise = originalPost.call(this, url, data, config).finally(() => {
        refreshPromise = null;
      });
    }
    return refreshPromise;
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