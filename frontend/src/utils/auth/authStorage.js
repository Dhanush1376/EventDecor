import { persistentStorage } from '../storage/persistentStorage';

export const SESSION_MARKER_KEY = 'siri_session_active';
export const REFRESH_TOKEN_KEY = 'siri_refresh_token_fallback';

export const hasSessionMarker = () => {
  const val = persistentStorage.getItem(SESSION_MARKER_KEY, { fallback: 'false' });
  const strVal = String(val).replace(/["']/g, '').trim().toLowerCase();
  return strVal === 'true';
};

export const setSessionMarker = () => {
  persistentStorage.setItem(SESSION_MARKER_KEY, 'true');
};

export const clearSessionMarker = () => {
  persistentStorage.removeItem(SESSION_MARKER_KEY);
};

// Refresh tokens live only in the HttpOnly cookie. These helpers remain as no-ops so a token is
// never written to storage readable by page JavaScript; any value left by older builds is removed.
export const setFallbackRefreshToken = () => {
  clearFallbackRefreshToken();
};

export const getFallbackRefreshToken = () => null;

export const clearFallbackRefreshToken = () => {
  persistentStorage.removeItem(REFRESH_TOKEN_KEY);
};

export const clearAuthStorage = () => {
  clearSessionMarker();
  clearFallbackRefreshToken();
};

// Remove refresh tokens persisted by earlier builds.
try {
  clearFallbackRefreshToken();
} catch {
  // storage unavailable
}
