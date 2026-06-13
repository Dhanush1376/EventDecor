import api from './api';

const searchCache = new Map();
const CACHE_TTL_MS = 60 * 1000; // 1 minute for visual search

/**
 * Visual Search API service.
 */
export const visualSearchService = {
  /**
   * Get public visual search configuration (enabled/disabled status).
   */
  getConfig: async () => {
    const cacheKey = 'vs_config';
    if (searchCache.has(cacheKey)) {
      const { data, timestamp } = searchCache.get(cacheKey);
      if (Date.now() - timestamp < CACHE_TTL_MS) return data;
      searchCache.delete(cacheKey);
    }

    try {
      const response = await api.get('/visual-search/config');
      const result = response.data;
      searchCache.set(cacheKey, { data: result, timestamp: Date.now() });
      return result;
    } catch {
      return { success: false, data: { enabled: false } };
    }
  },

  /**
   * Get visual search system health and circuit breaker status.
   */
  getHealth: async () => {
    try {
      const response = await api.get('/visual-search/health');
      return response.data;
    } catch {
      return { success: false, data: { enabled: false, circuitBreakerStatus: 'UNKNOWN' } };
    }
  },

  /**
   * Upload image for visual search analysis.
   * @param {File|Blob} imageFile - The image file to analyze
   * @param {string} source - Search source: 'camera' | 'upload' | 'drag_drop'
   * @param {string} sessionId - Session identifier
   * @param {AbortSignal} [signal] - Optional abort signal
   */
  analyzeImage: async (imageFile, source = 'upload', sessionId = '', signal = undefined) => {
    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('source', source);
    if (sessionId) formData.append('sessionId', sessionId);

    const response = await api.post('/visual-search/analyze', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 30000, // 30s timeout for AI processing
      signal,
    });
    return response.data;
  },

  // ── Admin Endpoints ──

  /**
   * Get full admin config (requires admin auth).
   */
  getAdminConfig: async () => {
    const response = await api.get('/visual-search/admin/config');
    return response.data;
  },

  /**
   * Update visual search config (requires admin auth).
   */
  updateConfig: async (updates) => {
    const response = await api.put('/visual-search/admin/config', updates);
    return response.data;
  },

  /**
   * Validate AI provider credentials.
   */
  validateProvider: async (providerName, apiKey, endpointUrl = '') => {
    const response = await api.post('/visual-search/admin/validate-provider', {
      providerName,
      apiKey,
      endpointUrl,
    });
    return response.data;
  },

  /**
   * Get visual search analytics.
   */
  getAnalytics: async (days = 30) => {
    const response = await api.get('/visual-search/admin/analytics', {
      params: { days },
    });
    return response.data;
  },

  /**
   * Bulk generate AI tags for products.
   */
  generateTags: async (batchSize = 5) => {
    const response = await api.post('/visual-search/admin/generate-tags', {
      batchSize,
    });
    return response.data;
  },

  clearCache: () => {
    searchCache.clear();
  },
};

export default visualSearchService;
