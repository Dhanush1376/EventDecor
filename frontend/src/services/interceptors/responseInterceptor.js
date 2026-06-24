import logger from '../../utils/core/logger';
import { normalizeApiError } from '../../utils/api/apiErrors';
import {
  SLOW_REQUEST_MS,
  TRANSIENT_STATUSES,
  MAX_GET_RETRIES,
  MAX_MUTATION_RETRIES,
  pathIncludesAuth,
  isPathProtected,
} from '../apiHelpers';

export const createResponseInterceptor = ({
  api,
  dispatchUnauthorized,
  refreshAccessToken,
  ensureCsrfToken,
  hasLocalAuthMarker,
  getAccessToken,
  setCsrfTokenState,
}) => [
  (response) => {
    // Capture new CSRF tokens returned in any successful response (e.g. login)
    const csrfToken = response.data?.csrfToken || response.data?.data?.csrfToken;
    if (csrfToken) {
      setCsrfTokenState(csrfToken);
    }

    const started = response.config?.metadata?.startTime;
    if (started && import.meta.env.PROD) {
      const duration = Date.now() - started;
      if (duration > SLOW_REQUEST_MS) {
        logger.warn(
          `[API] Slow request ${response.config?.method?.toUpperCase()} ${response.config?.url} (${duration}ms)`,
        );
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
    const isDatabaseDown =
      status === 503 &&
      error.response?.data?.message?.includes('Database connection is temporarily unavailable');

    // Don't treat database readiness guard 503s as generic transient errors to avoid 2-minute UI hangs
    const isTransientError =
      (!error.response || TRANSIENT_STATUSES.has(status) || normalized.isTimeout) &&
      !isDatabaseDown;

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
        Math.pow(2, originalRequest._retryCount) * 500 +
        Math.random() * 200 +
        (status === 429 ? 2000 : 0);

      logger.warn(
        `[API] Transient ${method.toUpperCase()} ${originalRequest.url} — retry ${originalRequest._retryCount}/${maxRetries} in ${Math.round(backoffDelay)}ms`,
      );

      await new Promise((resolve) => setTimeout(resolve, backoffDelay));
      return api(originalRequest);
    }

    const isProtectedWithoutSession =
      !hasLocalAuthMarker() &&
      !getAccessToken() &&
      isPathProtected(originalRequest?.url?.toLowerCase() || '');

    if (isProtectedWithoutSession) {
      return Promise.reject(error);
    }

    // Handle CSRF token mismatch / expiration
    if (
      status === 403 &&
      error.response?.data?.message?.includes('CSRF') &&
      !originalRequest._csrfRetry
    ) {
      originalRequest._csrfRetry = true;
      logger.warn('[API] CSRF token invalid/missing. Re-fetching and retrying...');
      setCsrfTokenState(null); // clear

      try {
        const newToken = await ensureCsrfToken();
        if (newToken) {
          if (originalRequest.headers && typeof originalRequest.headers.set === 'function') {
            originalRequest.headers.set('X-CSRF-Token', newToken);
          } else {
            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers['X-CSRF-Token'] = newToken;
          }
          return api(originalRequest);
        }
      } catch (_e) {
        logger.error('[API] Failed to refresh CSRF token on retry');
      }
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
        if (refreshErr.response?.status === 401 || refreshErr.response?.status === 403) {
          logger.error('[API] Token refresh rejected by server (Unauthorized).');
          dispatchUnauthorized();
        } else {
          logger.warn(
            '[API] Token refresh failed due to network/server error. Preserving session.',
          );
        }
      }
    } else if (error.response?.status === 409 && isAuthRefresh) {
      logger.warn(
        '[API] Refresh endpoint returned 409 (grace period overlap). Deferring to retry logic.',
      );
      // Do nothing, let the catch block in refreshAccessToken handle the retry
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

    // Enrich error with payment-specific classification for UI handling
    if (isPaymentOrOrderMutation && error.response) {
      error.isPaymentError = true;
      error.paymentErrorType =
        status === 504 || status === 502 || status === 503
          ? 'gateway_timeout' // Payment may still have gone through — do NOT auto-retry
          : status === 400 || status === 422
            ? 'validation' // Definitive failure — safe to retry
            : 'unknown';
    }

    // Detect circuit breaker errors from backend for UI-level awareness
    if (status === 503 && error.response?.data?.message?.includes('circuit breaker')) {
      error.isCircuitBreakerError = true;
    }

    return Promise.reject(error);
  },
];
