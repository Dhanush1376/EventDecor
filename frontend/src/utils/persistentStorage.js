import logger from './logger';

const SECRET_SALT = 'siri_arts_crafts_secret_salt_2026';

/**
 * Obfuscate text using a simple, fast XOR + Base64 cipher.
 * Designed for synchronous execution in state initialization.
 */
export const obfuscate = (str) => {
  try {
    const utf8Str = encodeURIComponent(str);
    let result = '';
    for (let i = 0; i < utf8Str.length; i++) {
      result += String.fromCharCode(
        utf8Str.charCodeAt(i) ^ SECRET_SALT.charCodeAt(i % SECRET_SALT.length),
      );
    }
    return btoa(result);
  } catch (e) {
    logger.error('[PersistentStorage] Obfuscation failed:', e);
    return str;
  }
};

/**
 * Deobfuscate text using XOR + Base64 cipher.
 */
export const deobfuscate = (str) => {
  try {
    const decoded = atob(str);
    let result = '';
    for (let i = 0; i < decoded.length; i++) {
      result += String.fromCharCode(
        decoded.charCodeAt(i) ^ SECRET_SALT.charCodeAt(i % SECRET_SALT.length),
      );
    }
    return decodeURIComponent(result);
  } catch (e) {
    logger.error('[PersistentStorage] Deobfuscation failed (possible corruption):', e);
    return null;
  }
};

// Volatile in-memory fallbacks for private/incognito tabs or storage blockages
const localMemoryStore = new Map();
const sessionMemoryStore = new Map();

/**
 * Check if the window storage type is available and writable.
 */
const isStorageAvailable = (type) => {
  try {
    if (typeof window === 'undefined' || !window[type]) return false;
    const storage = window[type];
    const testKey = '__storage_test_key__';
    storage.setItem(testKey, 'test');
    storage.removeItem(testKey);
    return true;
  } catch (_e) {
    return false;
  }
};

const hasLocalStorage = isStorageAvailable('localStorage');
const hasSessionStorage = isStorageAvailable('sessionStorage');

/**
 * Clean up expired keys matching our namespace from physical storage.
 */
const sweepExpiredKeys = (storageType) => {
  try {
    const isSession = storageType === 'sessionStorage';
    const storage = isSession ? window.sessionStorage : window.localStorage;
    if (!storage) return;

    const keysToRemove = [];
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key && (key.startsWith('siri_') || key.startsWith('checkout_'))) {
        try {
          const raw = storage.getItem(key);
          if (raw) {
            const wrapper = JSON.parse(raw);
            if (wrapper && wrapper.expiresAt && Date.now() > wrapper.expiresAt) {
              keysToRemove.push(key);
            }
          }
        } catch (__) {
          // Keep corrupted keys for general read-time cleaning
        }
      }
    }

    keysToRemove.forEach((k) => {
      storage.removeItem(k);
      logger.info(`[PersistentStorage] Garbage collected expired key: ${k}`);
    });
  } catch (e) {
    logger.warn('[PersistentStorage] Key sweep failed:', e);
  }
};

/**
 * Robust Persistent Storage Manager
 */
export const persistentStorage = {
  /**
   * Store a value with custom options (expiration, encryption, session scope)
   */
  setItem: (key, value, options = {}) => {
    const isSession = !!options.session;
    const useMemory = isSession ? !hasSessionStorage : !hasLocalStorage;
    const memoryStore = isSession ? sessionMemoryStore : localMemoryStore;
    const storage = isSession ? window.sessionStorage : window.localStorage;

    const version = options.version || '1.0';
    const ttl = options.ttl || null;
    const expiresAt = ttl ? Date.now() + ttl : null;
    const encrypt = !!options.encrypt;

    // Prepare packaged payload
    let stringifiedValue;
    try {
      stringifiedValue = JSON.stringify(value);
    } catch (e) {
      logger.error(`[PersistentStorage] JSON stringify failed for key "${key}":`, e);
      return;
    }

    const valueToStore = encrypt ? obfuscate(stringifiedValue) : stringifiedValue;

    const wrapper = {
      value: valueToStore,
      timestamp: Date.now(),
      expiresAt,
      version,
      isEncrypted: encrypt,
    };

    const serializedWrapper = JSON.stringify(wrapper);

    // Save to memory store first to ensure quick retrieval
    memoryStore.set(key, serializedWrapper);

    if (useMemory) {
      return;
    }

    try {
      storage.setItem(key, serializedWrapper);
    } catch (err) {
      logger.warn(
        `[PersistentStorage] Failed to write key "${key}" to storage. Attempting recovery.`,
        err,
      );

      // Attempt Quota Recovery: Sweep expired keys
      sweepExpiredKeys(isSession ? 'sessionStorage' : 'localStorage');

      try {
        storage.setItem(key, serializedWrapper);
      } catch (retryErr) {
        logger.error(
          `[PersistentStorage] Hard storage failure for key "${key}". Falling back strictly to memory.`,
          retryErr,
        );
      }
    }
  },

  /**
   * Retrieve a value, handling TTL, version mismatch, corruption, and fallbacks
   */
  getItem: (key, options = {}) => {
    const isSession = !!options.session;
    const useMemory = isSession ? !hasSessionStorage : !hasLocalStorage;
    const memoryStore = isSession ? sessionMemoryStore : localMemoryStore;
    const storage = isSession ? window.sessionStorage : window.localStorage;

    const expectedVersion = options.version || '1.0';
    const fallbackValue = options.fallback !== undefined ? options.fallback : null;

    let raw = null;

    // If storage is available, prioritize reading from it
    if (!useMemory) {
      try {
        raw = storage.getItem(key);
      } catch (e) {
        logger.warn(
          `[PersistentStorage] Read failed from physical storage for key "${key}". Trying memory fallback.`,
          e,
        );
      }
    }

    // Fallback to volatile store if raw is not found
    if (!raw) {
      raw = memoryStore.get(key) || null;
    }

    if (!raw) {
      return fallbackValue;
    }

    try {
      const wrapper = JSON.parse(raw);

      // Verify if it is indeed our wrapper structure
      const isWrapped =
        wrapper &&
        typeof wrapper === 'object' &&
        wrapper?.hasOwnProperty?.('value') &&
        wrapper?.hasOwnProperty?.('version');

      if (!isWrapped) {
        // It's a legacy JSON structure, return it as is
        return wrapper;
      }

      // Check version mismatch
      if (wrapper.version !== expectedVersion) {
        logger.warn(
          `[PersistentStorage] Version mismatch for key "${key}". Expected ${expectedVersion}, got ${wrapper.version}. Invaliding.`,
        );
        persistentStorage.removeItem(key, { session: isSession });
        return fallbackValue;
      }

      // Check Expiration (TTL)
      if (wrapper.expiresAt && Date.now() > wrapper.expiresAt) {
        logger.info(`[PersistentStorage] Key "${key}" expired. Removing.`);
        persistentStorage.removeItem(key, { session: isSession });
        return fallbackValue;
      }

      // Handle Decryption/Deobfuscation if requested
      let decryptedValue = wrapper.value;
      if (wrapper.isEncrypted) {
        decryptedValue = deobfuscate(wrapper.value);
        if (decryptedValue === null) {
          throw new Error('Deobfuscation integrity check failed');
        }
      }

      // Parse and return inner value
      try {
        return JSON.parse(decryptedValue);
      } catch (__) {
        return decryptedValue;
      }
    } catch (_error) {
      // If parsing failed, it is a legacy raw string. Return it directly.
      return raw;
    }
  },

  /**
   * Remove a key from all levels of storage
   */
  removeItem: (key, options = {}) => {
    const isSession = !!options.session;
    const memoryStore = isSession ? sessionMemoryStore : localMemoryStore;
    const storage = isSession ? window.sessionStorage : window.localStorage;

    memoryStore.delete(key);

    const available = isSession ? hasSessionStorage : hasLocalStorage;
    if (available && storage) {
      try {
        storage.removeItem(key);
      } catch (e) {
        logger.warn(`[PersistentStorage] Failed to remove physical key "${key}":`, e);
      }
    }
  },

  /**
   * Clear all stored data
   */
  clear: (options = {}) => {
    const targetSession = options.session === undefined ? null : !!options.session;

    if (targetSession === null || targetSession === false) {
      localMemoryStore.clear();
      if (hasLocalStorage) {
        try {
          window.localStorage.clear();
        } catch (__) {}
      }
    }

    if (targetSession === null || targetSession === true) {
      sessionMemoryStore.clear();
      if (hasSessionStorage) {
        try {
          window.sessionStorage.clear();
        } catch (__) {}
      }
    }
  },

  /**
   * Run background garbage collection for expired keys
   */
  runGC: () => {
    logger.info('[PersistentStorage] Starting periodic storage clean cycle.');
    sweepExpiredKeys('localStorage');
    sweepExpiredKeys('sessionStorage');
  },
};
