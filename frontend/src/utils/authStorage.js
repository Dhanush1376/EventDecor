export const SESSION_MARKER_KEY = 'siri_session_active';

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

export const clearAuthStorage = () => {
  clearSessionMarker();
};
