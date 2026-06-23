import api from '../api';

// Simple in-memory cache for frontend to avoid redundant calls
const searchCache = new Map();
// Prevent duplicate in-flight requests
const pendingRequests = new Map();

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Helper to get from cache or fetch and cache
 */
async function fetchWithCache(cacheKey, fetchFn, options = {}) {
  // Check cache
  if (searchCache.has(cacheKey)) {
    const { data, timestamp } = searchCache.get(cacheKey);
    if (Date.now() - timestamp < CACHE_TTL_MS) {
      return data;
    }
    // Expired
    searchCache.delete(cacheKey);
  }

  // Check pending requests
  if (!options.signal && pendingRequests.has(cacheKey)) {
    return pendingRequests.get(cacheKey);
  }

  // Fetch new data
  const requestPromise = fetchFn()
    .then((data) => {
      searchCache.set(cacheKey, { data, timestamp: Date.now() });
      pendingRequests.delete(cacheKey);
      return data;
    })
    .catch((err) => {
      pendingRequests.delete(cacheKey);
      throw err;
    });

  if (!options.signal) {
    pendingRequests.set(cacheKey, requestPromise);
  }
  return requestPromise;
}

/**
 * Intelligent search service — connects to the backend search API.
 */
export const searchService = {
  /**
   * Get fast autocomplete suggestions with visual previews.
   */
  autocomplete: async (query, options = {}) => {
    if (!query || query.trim().length < 2) {
      return { success: true, data: { suggestions: [], predictedCategories: [] } };
    }

    const limit = options.limit || 8;
    const cacheKey = `ac_${query.trim().toLowerCase()}_${limit}`;

    return fetchWithCache(
      cacheKey,
      async () => {
        const response = await api.get('/search/autocomplete', {
          params: { q: query, limit },
          signal: options.signal, // Support cancellation
        });
        return response.data;
      },
      options,
    );
  },

  /**
   * Full search with filtering and pagination.
   */
  search: async (query, options = {}) => {
    // Generate cache key based on all parameters
    const params = {
      q: query,
      category: options.category,
      type: options.type,
      sort: options.sort,
      page: options.page || 1,
      limit: options.limit || 20,
      priceMin: options.priceMin,
      priceMax: options.priceMax,
      spellcheck: options.spellcheck,
      bypassCorrection: options.bypassCorrection,
    };

    const cacheKey = `search_${JSON.stringify(params)}`;

    return fetchWithCache(
      cacheKey,
      async () => {
        const response = await api.get('/search/results', {
          params,
          signal: options.signal,
        });
        return response.data;
      },
      options,
    );
  },

  /**
   * Get trending search terms.
   */
  getTrending: async (options = {}) => {
    const limit = options.limit || 10;
    const cacheKey = `trending_${limit}`;

    return fetchWithCache(
      cacheKey,
      async () => {
        const response = await api.get('/search/trending', {
          params: { limit },
          signal: options.signal,
        });
        return response.data;
      },
      options,
    );
  },

  /**
   * Get related search suggestions for a query.
   */
  getRelated: async (query, options = {}) => {
    const limit = options.limit || 5;
    const cacheKey = `related_${query}_${limit}`;

    return fetchWithCache(
      cacheKey,
      async () => {
        const response = await api.get('/search/related', {
          params: { q: query, limit },
          signal: options.signal,
        });
        return response.data;
      },
      options,
    );
  },

  /**
   * Get comprehensive discovery data (trending, popular, event collections, new arrivals).
   */
  getDiscovery: async (options = {}) => {
    const cacheKey = `discovery_data`;

    return fetchWithCache(
      cacheKey,
      async () => {
        const response = await api.get('/search/discovery', {
          signal: options.signal,
        });
        return response.data;
      },
      options,
    );
  },

  /**
   * Clear all frontend search caches
   */
  clearCache: () => {
    searchCache.clear();
  },
};

export default searchService;
