import { persistentStorage } from './persistentStorage';

export const SESSION_MARKER_KEY = 'siri_session_active';
export const REFRESH_TOKEN_KEY = 'siri_refresh_token_fallback';

export const hasSessionMarker = () => {
  return persistentStorage.getItem(SESSION_MARKER_KEY, { fallback: 'false' }) === 'true';
};

export const setSessionMarker = () => {
  persistentStorage.setItem(SESSION_MARKER_KEY, 'true');
};

export const clearSessionMarker = () => {
  persistentStorage.removeItem(SESSION_MARKER_KEY);
};

export const setFallbackRefreshToken = (token) => {
  if (token) persistentStorage.setItem(REFRESH_TOKEN_KEY, token);
};

export const getFallbackRefreshToken = () => {
  return persistentStorage.getItem(REFRESH_TOKEN_KEY, { fallback: null });
};

export const clearFallbackRefreshToken = () => {
  persistentStorage.removeItem(REFRESH_TOKEN_KEY);
};

export const clearAuthStorage = () => {
  clearSessionMarker();
  clearFallbackRefreshToken();
};
