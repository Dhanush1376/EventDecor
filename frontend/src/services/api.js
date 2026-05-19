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

// Add a request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
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

    if (isGet && isTransientError && hasRetryAttemptsLeft && !originalRequest?._retry) {
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

export default api;

