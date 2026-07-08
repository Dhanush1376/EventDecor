import axios from 'axios';
import logger from '../utils/core/logger';
import { logCartTrace } from '../utils/forensic/cartTrace';
import { getCachedGet, setCachedGet, clearApiCache } from '../utils/api/apiCache';
import {
  hasSessionMarker,
  setSessionMarker,
  clearAuthStorage,
  getFallbackRefreshToken,
  setFallbackRefreshToken,
} from '../utils/auth/authStorage';
import { clearCachedProfile } from '../utils/auth/authSessionCache';
import { createRequestInterceptor } from './interceptors/requestInterceptor';
import { createResponseInterceptor } from './interceptors/responseInterceptor';
const api = axios.create({
  timeout: 15000, // 15s timeout to prevent hanging connections and give early feedback
  withCredentials: true,
});

let accessToken = null;
let refreshPromise = null;
let refreshPostPromise = null;
let csrfToken = null;
let csrfInitPromise = null;
let authBootstrapActive = false;

export const setAuthBootstrapActive = (active) => {
  authBootstrapActive = !!active;
};

export const ensureCsrfToken = async () => {
  if (csrfToken) return csrfToken;
  if (!csrfInitPromise) {
    csrfInitPromise = (async () => {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const res = await api.get('/csrf-token', { _bypassOfflineQueue: true });
          csrfToken = res.data?.csrfToken || csrfToken;
          return csrfToken;
        } catch (_err) {
          if (attempt < 2) {
            await new Promise((r) => setTimeout(r, 500));
          } else {
            // Allow request to proceed — backend will enforce CSRF and return
            // a clear 403 "Invalid or missing CSRF token" instead of silently blocking
            logger.warn('[API] CSRF token fetch failed after retries. Proceeding without token.');
            csrfInitPromise = null;
            return null;
          }
        }
      }
    })();
  }
  return csrfInitPromise;
};

export const setAccessToken = (token) => {
  accessToken = token || null;
};

export const getAccessToken = () => accessToken;
export const getRefreshPromise = () => refreshPromise;

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

export const refreshAccessToken = async (retryCount = 0) => {
  if (!hasLocalAuthMarker()) {
    return null;
  }
  if (retryCount >= 3) {
    logger.error('[API] Max refresh retry attempts reached (409 conflict loops).');
    dispatchUnauthorized();
    throw new Error('Max refresh retry attempts reached');
  }
  if (!refreshPromise) {
    refreshPromise = api
      .post('/auth/refresh', buildRefreshBody(), { _skipAuthRetry: true, _disableRetry: true })
      .then((res) => {
        const payload = res.data?.data || res.data;
        return applyRefreshPayload(payload);
      })
      .catch(async (err) => {
        if (err.response?.status === 409) {
          logger.warn(
            `[API] Concurrent refresh detected (409). Retrying (attempt ${retryCount + 1}/1) in 1s to pick up new tokens from other tab.`,
          );
          await new Promise((r) => setTimeout(r, 1000));
          refreshPromise = null;
          return refreshAccessToken(retryCount + 1); // Retry the refresh with the new cookie/localStorage token
        }
        if (err.response?.status === 401 || err.response?.status === 403) {
          dispatchUnauthorized();
        }
        throw err;
      })
      .finally(() => {
        // Only nullify if it hasn't been nullified by the retry catch block
        if (refreshPromise) {
          refreshPromise = null;
        }
      });
  }
  return refreshPromise;
};

const setCsrfTokenState = (token) => {
  if (token === null) {
    csrfToken = null;
    csrfInitPromise = null;
  } else {
    csrfToken = token;
    csrfInitPromise = Promise.resolve(token);
  }
};

api.interceptors.request.use(
  createRequestInterceptor({
    getAccessToken,
    hasLocalAuthMarker,
    refreshAccessToken,
    ensureCsrfToken,
    getRefreshPromise,
  }),
  (error) => Promise.reject(error),
);

const [onResponse, onError] = createResponseInterceptor({
  api,
  dispatchUnauthorized,
  refreshAccessToken,
  ensureCsrfToken,
  hasLocalAuthMarker,
  getAccessToken,
  setCsrfTokenState,
});

api.interceptors.response.use(onResponse, onError);

// High-performance GET request de-duplication wrapper to block parallel duplicate fetches
const originalGet = api.get;
const pendingGetRequests = new Map();

let cartGetSequenceCounter = 0;

const clearPendingGets = () => {
  const pendingCartRequestCountBefore = pendingGetRequests.size;
  const pendingCartRequestSeq = Array.from(pendingGetRequests.keys()).find((k) =>
    k.includes('/users/cart'),
  )
    ? 'unknown'
    : null; // we don't store seq in map keys right now, just noting it

  const hasCartPending = Array.from(pendingGetRequests.keys()).some((k) =>
    k.includes('/users/cart'),
  );

  pendingGetRequests.clear();
  clearApiCache();

  if (hasCartPending || pendingCartRequestCountBefore > 0) {
    logCartTrace('PENDING_GETS_CLEAR', {
      cartRequestWasPending: hasCartPending,
      pendingCartRequestSeq,
      pendingRequestCountBefore: pendingCartRequestCountBefore,
      pendingRequestCountAfter: pendingGetRequests.size,
      source: 'clearPendingGets',
    });
  }
};

api.get = function (url, config) {
  const requestKey = `${url}?${JSON.stringify(config?.params || {})}`;
  const isCart = url.includes('/users/cart');
  let currentSeq = null;

  if (isCart) {
    cartGetSequenceCounter++;
    currentSeq = cartGetSequenceCounter;
    logCartTrace('API_GET_ENTER', {
      cartGetSeq: currentSeq,
      requestKey,
      url,
      hasSignal: !!config?.signal,
      signalAborted: config?.signal?.aborted,
      source: 'api.get',
    });
  }

  const cached = getCachedGet(url, config);
  if (cached && !cached.stale) {
    return Promise.resolve({
      data: cached.data,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: config || {},
      fromCache: true,
    });
  }

  if (pendingGetRequests.has(requestKey)) {
    if (isCart) {
      logCartTrace('API_GET_DEDUP_HIT', {
        cartGetSeq: currentSeq,
        requestKey,
        source: 'api.get',
      });
    }
    return pendingGetRequests.get(requestKey);
  }

  if (isCart) {
    logCartTrace('API_GET_NETWORK_START', {
      cartGetSeq: currentSeq,
      requestKey,
      source: 'api.get',
    });
  }

  const promise = originalGet
    .call(this, url, config)
    .then((response) => {
      pendingGetRequests.delete(requestKey);
      if (response?.data !== undefined) {
        setCachedGet(url, config, response.data);
      }

      if (isCart) {
        logCartTrace('API_GET_NETWORK_RESOLVE', {
          cartGetSeq: currentSeq,
          requestKey,
          cartData: response.data?.data || response.data,
          source: 'api.get',
        });
      }
      return response;
    })
    .catch((error) => {
      pendingGetRequests.delete(requestKey);

      if (isCart) {
        logCartTrace('API_GET_NETWORK_REJECT', {
          cartGetSeq: currentSeq,
          requestKey,
          error: error?.message,
          isCancel: axios.isCancel(error),
          source: 'api.get',
        });
      }

      if (cached?.data) {
        return {
          data: cached.data,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: config || {},
          fromCache: true,
          stale: true,
        };
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

if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    // Suppress specific harmless third-party or network errors from polluting logs
    const reason = event.reason;
    if (reason && reason.isNetwork) {
      logger.dev('[API] Suppressing unhandled network rejection:', reason.message);
      event.preventDefault();
    }
  });
}
