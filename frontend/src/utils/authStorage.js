import { safeLocalStorage, safeSessionStorage } from './storage';

const SESSION_MARKER_KEY = 'siri_auth_token';
const REFRESH_TOKEN_KEY = 'siri_refresh_token_store';
const ACCESS_TOKEN_KEY = 'siri_access_token_store';

export const hasSessionMarker = () => {
  try {
    return localStorage.getItem(SESSION_MARKER_KEY) === 'true';
  } catch {
    return false;
  }
};

export const setSessionMarker = () => {
  try {
    localStorage.setItem(SESSION_MARKER_KEY, 'true');
  } catch {
    // private mode
  }
};

export const clearSessionMarker = () => {
  try {
    localStorage.removeItem(SESSION_MARKER_KEY);
  } catch {
    // ignore
  }
};

/** Refresh token — survives browser restart (fallback when third-party cookies are blocked). */
export const persistRefreshToken = (token) => {
  if (!token) {
    safeLocalStorage.removeItem(REFRESH_TOKEN_KEY);
    return;
  }
  safeLocalStorage.setItem(REFRESH_TOKEN_KEY, token);
};

export const getPersistedRefreshToken = () => safeLocalStorage.getItem(REFRESH_TOKEN_KEY);

/** Short-lived access token — restored on tab refresh for instant API calls. */
export const persistAccessToken = (token) => {
  if (!token) {
    safeSessionStorage.removeItem(ACCESS_TOKEN_KEY);
    return;
  }
  safeSessionStorage.setItem(ACCESS_TOKEN_KEY, token);
};

export const getPersistedAccessToken = () => safeSessionStorage.getItem(ACCESS_TOKEN_KEY);

export const clearAuthStorage = () => {
  clearSessionMarker();
  persistRefreshToken(null);
  persistAccessToken(null);
};
