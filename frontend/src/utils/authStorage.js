import { persistentStorage } from './persistentStorage';

export const SESSION_MARKER_KEY = 'siri_session_active';

export const hasSessionMarker = () => {
  return persistentStorage.getItem(SESSION_MARKER_KEY, { fallback: 'false' }) === 'true';
};

export const setSessionMarker = () => {
  persistentStorage.setItem(SESSION_MARKER_KEY, 'true');
};

export const clearSessionMarker = () => {
  persistentStorage.removeItem(SESSION_MARKER_KEY);
};

export const clearAuthStorage = () => {
  clearSessionMarker();
};
