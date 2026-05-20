/**
 * Safe LocalStorage and SessionStorage wrappers.
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
      console.warn(`[STORAGE] localStorage.getItem failed for key "${key}":`, e);
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
      console.warn(`[STORAGE] localStorage.setItem failed for key "${key}":`, e);
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
      console.warn(`[STORAGE] localStorage.removeItem failed for key "${key}":`, e);
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
      console.warn('[STORAGE] localStorage.clear failed:', e);
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
      console.warn(`[STORAGE] sessionStorage.getItem failed for key "${key}":`, e);
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
      console.warn(`[STORAGE] sessionStorage.setItem failed for key "${key}":`, e);
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
      console.warn(`[STORAGE] sessionStorage.removeItem failed for key "${key}":`, e);
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
      console.warn('[STORAGE] sessionStorage.clear failed:', e);
    }
    memorySessionStorage.clear();
  }
};
