import { persistentStorage } from './persistentStorage';

/**
 * Safe LocalStorage and SessionStorage wrappers.
 * Redefined to leverage persistentStorage under the hood for corruption checks,
 * TTL validation, in-memory fallbacks (incognito tabs), and quota management.
 */

export const safeLocalStorage = {
  getItem: (key) => {
    const val = persistentStorage.getItem(key, { session: false });
    if (val === null) return null;
    return typeof val === 'object' ? JSON.stringify(val) : String(val);
  },

  setItem: (key, value) => {
    persistentStorage.setItem(key, value, { session: false });
  },

  removeItem: (key) => {
    persistentStorage.removeItem(key, { session: false });
  },

  clear: () => {
    persistentStorage.clear({ session: false });
  }
};

export const safeSessionStorage = {
  getItem: (key) => {
    const val = persistentStorage.getItem(key, { session: true });
    if (val === null) return null;
    return typeof val === 'object' ? JSON.stringify(val) : String(val);
  },

  setItem: (key, value) => {
    persistentStorage.setItem(key, value, { session: true });
  },

  removeItem: (key) => {
    persistentStorage.removeItem(key, { session: true });
  },

  clear: () => {
    persistentStorage.clear({ session: true });
  }
};
