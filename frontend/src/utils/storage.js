import logger from './logger';

/**
 * Safe LocalStorage and SessionStorage wrappers.
 *
 * SECURITY NOTICE:
 * Do not use these wrappers to store sensitive credentials (e.g., JWT access tokens, 
 * refresh tokens, or passwords). LocalStorage and SessionStorage are accessible via 
 * JavaScript and can be compromised by Cross-Site Scripting (XSS) attacks. 
 * Sensitive tokens should always be stored in HttpOnly, Secure cookies managed 
 * by the backend.
 * 
 * These wrappers are strictly for UI state, non-sensitive preferences, and caching.
 *
 * Prevents application crashes in private browsing mode (Incognito)
 * or when cookies/third-party storage are blocked by browser settings.
 */

const isStorageAvailable = (type) => {
  try {
    const storage = window[type];
    const x = '__storage_test__';
    storage.setItem(x, x);
    storage.removeItem(x);
    return true;
  } catch (e) {
    return false;
  }
};

const memoryStorage = new Map();
const memorySessionStorage = new Map();

export const safeLocalStorage = {
  getItem: (key) => {
    try {
      if (isStorageAvailable('localStorage')) {
        return localStorage.getItem(key);
      }
    } catch (e) {
      logger.warn(`[STORAGE] localStorage.getItem failed for key "${key}":`, e);
    }
    return memoryStorage.get(key) || null;
  },

  setItem: (key, value) => {
    try {
      if (isStorageAvailable('localStorage')) {
        localStorage.setItem(key, value);
        return;
      }
    } catch (e) {
      logger.warn(`[STORAGE] localStorage.setItem failed for key "${key}":`, e);
    }
    memoryStorage.set(key, String(value));
  },

  removeItem: (key) => {
    try {
      if (isStorageAvailable('localStorage')) {
        localStorage.removeItem(key);
        return;
      }
    } catch (e) {
      logger.warn(`[STORAGE] localStorage.removeItem failed for key "${key}":`, e);
    }
    memoryStorage.delete(key);
  },

  clear: () => {
    try {
      if (isStorageAvailable('localStorage')) {
        localStorage.clear();
        return;
      }
    } catch (e) {
      logger.warn('[STORAGE] localStorage.clear failed:', e);
    }
    memoryStorage.clear();
  }
};

export const safeSessionStorage = {
  getItem: (key) => {
    try {
      if (isStorageAvailable('sessionStorage')) {
        return sessionStorage.getItem(key);
      }
    } catch (e) {
      logger.warn(`[STORAGE] sessionStorage.getItem failed for key "${key}":`, e);
    }
    return memorySessionStorage.get(key) || null;
  },

  setItem: (key, value) => {
    try {
      if (isStorageAvailable('sessionStorage')) {
        sessionStorage.setItem(key, value);
        return;
      }
    } catch (e) {
      logger.warn(`[STORAGE] sessionStorage.setItem failed for key "${key}":`, e);
    }
    memorySessionStorage.set(key, String(value));
  },

  removeItem: (key) => {
    try {
      if (isStorageAvailable('sessionStorage')) {
        sessionStorage.removeItem(key);
        return;
      }
    } catch (e) {
      logger.warn(`[STORAGE] sessionStorage.removeItem failed for key "${key}":`, e);
    }
    memorySessionStorage.delete(key);
  },

  clear: () => {
    try {
      if (isStorageAvailable('sessionStorage')) {
        sessionStorage.clear();
        return;
      }
    } catch (e) {
      logger.warn('[STORAGE] sessionStorage.clear failed:', e);
    }
    memorySessionStorage.clear();
  }
};
