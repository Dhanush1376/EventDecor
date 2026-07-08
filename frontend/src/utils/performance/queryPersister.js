import { dehydrate, hydrate } from '@tanstack/react-query';
import logger from '../core/logger';
import { logCartTrace } from '../forensic/cartTrace';

export const CACHE_KEY = 'siri_query_cache_v3';
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours expiration
const MAX_PERSIST_SIZE_BYTES = 500 * 1024; // 500KB limit

// Helper to check if a query should be persisted
const shouldPersistQuery = (query) => {
  const key = query.queryKey;
  if (!Array.isArray(key)) return false;

  // Only persist successful queries (ignore pending or error states)
  if (query.state.status !== 'success') return false;

  // Persist cart, wishlist, user queries, categories, products, and recommendations
  const domain = key[0];
  return ['cart', 'wishlist', 'user', 'categories', 'products', 'recommendations'].includes(domain);
};

/**
 * Hydrates the query client cache synchronously from localStorage.
 * If data is expired or corrupted, it clears the cache cleanly.
 */
export const hydrateQueryClientCache = (queryClient) => {
  if (typeof window === 'undefined') return;

  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid cache structure');
    }

    const { state, timestamp } = parsed;

    // Check expiration
    if (Date.now() - timestamp > MAX_AGE_MS) {
      logger.info('[QueryPersister] Cache expired. Clearing.');
      localStorage.removeItem(CACHE_KEY);
      return;
    }

    // Hydrate state
    hydrate(queryClient, state);

    // Log cart states specifically
    state.queries.forEach((q) => {
      if (Array.isArray(q.queryKey) && q.queryKey[0] === 'cart') {
        logCartTrace('PERSISTER_HYDRATE', {
          queryKey: q.queryKey.join(','),
          cartData: q.state.data,
          source: 'hydrateQueryClientCache',
        });
      }
    });

    logger.info('[QueryPersister] Cache hydrated successfully.');
  } catch (error) {
    logger.error('[QueryPersister] Hydration failed due to corruption or error:', error);
    // Fallback recovery: clear corrupted cache
    try {
      localStorage.removeItem(CACHE_KEY);
    } catch (__) {}
  }
};

/**
 * Subscribes to QueryCache changes and debounces cache saves to localStorage.
 * Also handles cross-tab state synchronization by listening to storage changes.
 */
export const subscribeToQueryCache = (queryClient) => {
  if (typeof window === 'undefined') return () => {};

  let timeoutId = null;

  const saveCache = () => {
    try {
      const state = dehydrate(queryClient, {
        shouldDehydrateQuery: shouldPersistQuery,
      });

      // Log cart states specifically
      state.queries.forEach((q) => {
        if (Array.isArray(q.queryKey) && q.queryKey[0] === 'cart') {
          logCartTrace('PERSISTER_WRITE', {
            queryKey: q.queryKey.join(','),
            cartData: q.state.data,
            source: 'saveCache',
          });
        }
      });

      const payload = {
        state,
        timestamp: Date.now(),
        version: 2,
      };

      // Safely stringify to prevent circular reference crashes (e.g. from Axios Errors)
      const getCircularReplacer = () => {
        const seen = new WeakSet();
        return (key, value) => {
          if (typeof value === 'object' && value !== null) {
            if (value instanceof Error) {
              return { message: value.message, name: value.name };
            }
            if (seen.has(value)) return;
            seen.add(value);
          }
          return value;
        };
      };

      const serialized = JSON.stringify(payload, getCircularReplacer());

      if (serialized.length > MAX_PERSIST_SIZE_BYTES) {
        logger.warn('[QueryPersister] Cache size exceeds 500KB limit. Skipping persistence.');
        return;
      }

      localStorage.setItem(CACHE_KEY, serialized);
    } catch (error) {
      logger.error('[QueryPersister] Failed to save cache to localStorage:', error);
    }
  };

  // Debounced cache saving
  const handleUpdate = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(saveCache, 1000); // 1s debounce
  };

  // Subscribe to query cache changes (updates, additions, removals)
  const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
    // Only trigger update for queries we care about
    if (event?.query && shouldPersistQuery(event.query)) {
      handleUpdate();
    }
  });

  // Handle cross-tab state synchronization
  const handleStorageChange = (e) => {
    if (e.key === CACHE_KEY && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        if (parsed && parsed.state) {
          hydrate(queryClient, parsed.state);

          parsed.state.queries.forEach((q) => {
            if (Array.isArray(q.queryKey) && q.queryKey[0] === 'cart') {
              logCartTrace('PERSISTER_RESTORE', {
                queryKey: q.queryKey.join(','),
                cartData: q.state.data,
                source: 'handleStorageChange',
              });
            }
          });

          logCartTrace('PERSISTER_STORAGE_EVENT', { source: 'handleStorageChange' });
          logger.info('[QueryPersister] Cache synchronized from another tab.');
        }
      } catch (err) {
        logger.error('[QueryPersister] Failed to parse synchronized cache:', err);
      }
    }
  };

  window.addEventListener('storage', handleStorageChange);

  return () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    unsubscribe();
    window.removeEventListener('storage', handleStorageChange);
  };
};
