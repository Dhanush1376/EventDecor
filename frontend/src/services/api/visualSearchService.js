import api from '../api';

const searchCache = new Map();
const CACHE_TTL_MS = 1000; // 1 second short deduplication window for parallel mounts

const CHANNEL_NAME = 'siri_visual_search_channel';
let broadcastChannel = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
  } catch (_e) {}
}

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

      if (typeof window !== 'undefined' && result?.data) {
        try {
          localStorage.setItem('siri_visual_search_config', JSON.stringify(result.data));
          localStorage.setItem('siri_visual_search_enabled', String(!!result.data.enabled));
          localStorage.setItem(
            'siri_visual_search_camera_enabled',
            String(result.data.cameraSearchEnabled !== false),
          );
        } catch (_e) {}
      }

      return result;
    } catch {
      return { success: false, data: { enabled: false, cameraSearchEnabled: false } };
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
    searchCache.clear();
    if (typeof window !== 'undefined') {
      const updatedConfig = response.data?.data || response.data || updates;
      try {
        localStorage.setItem('siri_visual_search_config', JSON.stringify(updatedConfig));
        localStorage.setItem('siri_visual_search_enabled', String(!!updatedConfig.enabled));
        localStorage.setItem(
          'siri_visual_search_camera_enabled',
          String(updatedConfig.cameraSearchEnabled !== false),
        );
      } catch (_e) {}

      try {
        broadcastChannel?.postMessage({
          type: 'config_updated',
          data: updatedConfig,
        });
      } catch (_e) {}

      window.dispatchEvent(
        new CustomEvent('visual-search-config-changed', { detail: updatedConfig }),
      );
    }
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
