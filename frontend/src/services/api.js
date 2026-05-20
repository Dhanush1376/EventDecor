import axios from 'axios';

const getApiUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    // If running in production (e.g. Vercel), fallback to the live Render backend URL
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return 'https://siri-arts-n-crafts.onrender.com/api';
    }
  }
  return 'http://localhost:5000/api';
};

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

export const setAccessToken = (token) => {
  accessToken = token || null;
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

// Add a request interceptor to include auth token and manage offline states
api.interceptors.request.use(
  (config) => {
    // ─── AUTH TOKEN INTEGRATION ───
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    // ─── OFFLINE INTEGRATION ───
    const isOffline = window.__isOffline || !navigator.onLine;
    const isBypass = config._bypassOfflineQueue === true;

    if (isOffline && !isBypass) {
      const method = config.method ? config.method.toLowerCase() : 'get';
      
      // 1. GET requests: Fail instantly to prevent browser spam/hanging timeouts
      if (method === 'get') {
        const error = new axios.AxiosError(
          "No internet connection. Fetch aborted.",
          "ERR_OFFLINE",
          config
        );
        return Promise.reject(error);
      }

      // 2. Mutating requests: Check if queueable
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

      // 3. Non-queueable mutations (e.g. login, payment checkout)
      const error = new axios.AxiosError(
        "No internet connection. Action unavailable offline.",
        "ERR_OFFLINE",
        config
      );
      return Promise.reject(error);
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Add a response interceptor to handle errors globally
api.interceptors.response.use(
  (response) => response,
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
        console.warn(`⚠️ [API TRANSIENT RETRY] GET ${originalRequest.url} failed. Retrying attempt ${originalRequest._retryCount} in ${Math.round(backoffDelay)}ms...`);
      }
      
      await new Promise((resolve) => setTimeout(resolve, backoffDelay));
      return api(originalRequest);
    }

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !isAuthRefresh && !isAuthLogout) {
      originalRequest._retry = true;

      try {
        if (!refreshPromise) {
          refreshPromise = api.post('/auth/refresh').finally(() => {
            refreshPromise = null;
          });
        }
        const refreshResponse = await refreshPromise;
        const token = refreshResponse.data?.data?.accessToken || refreshResponse.data?.data?.token;
        setAccessToken(token);

        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      } catch {
        setAccessToken(null);
        window.dispatchEvent(new Event('auth-unauthorized'));
      }
    } else if (error.response?.status === 401 && isAuthRefresh) {
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
  if (pendingGetRequests.has(requestKey)) {
    return pendingGetRequests.get(requestKey);
  }

  const promise = originalGet.call(this, url, config)
    .then((response) => {
      pendingGetRequests.delete(requestKey);
      return response;
    })
    .catch((error) => {
      pendingGetRequests.delete(requestKey);
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

