import api from './api';

const normalizeOptions = (paramsOrOptions = {}) => {
  const { signal, ...params } = paramsOrOptions;
  return { params, signal };
};

export const recommendationService = {
  /**
   * Get personalized homepage feed.
   */
  getFeed: async (params = {}) => {
    const config = normalizeOptions(params);
    const response = await api.get('/recommendations/feed', config);
    return response.data;
  },

  /**
   * Get similar items for a given item.
   */
  getSimilar: async (targetType, targetId, limit = 8, options = {}) => {
    const response = await api.get(`/recommendations/similar/${targetType}/${targetId}`, {
      params: { limit },
      signal: options.signal,
    });
    return response.data;
  },

  /**
   * Get trending items.
   */
  getTrending: async (params = {}) => {
    const config = normalizeOptions(params);
    const response = await api.get('/recommendations/trending', config);
    return response.data;
  },

  /**
   * Get seasonal recommendations.
   */
  getSeasonal: async (params = {}) => {
    const config = normalizeOptions(params);
    const response = await api.get('/recommendations/seasonal', config);
    return response.data;
  },

  /**
   * Get deep personalized recommendations (auth required).
   */
  getForYou: async (params = {}) => {
    const config = normalizeOptions(params);
    const response = await api.get('/recommendations/for-you', config);
    return response.data;
  },

  /**
   * Get complementary items for "Complete the Setup".
   */
  getCompleteSetup: async (targetId, limit = 6, options = {}) => {
    const response = await api.get(`/recommendations/complete-setup/${targetId}`, {
      params: { limit },
      signal: options.signal,
    });
    return response.data;
  },

  /**
   * Get "Users Also Viewed" items.
   */
  getAlsoViewed: async (targetId, targetType = 'product', limit = 8, options = {}) => {
    const response = await api.get(`/recommendations/also-viewed/${targetId}`, {
      params: { targetType, limit },
      signal: options.signal,
    });
    return response.data;
  },

  /**
   * Track a behavioral event.
   */
  trackEvent: async (eventType, targetType, targetId, metadata = {}) => {
    try {
      const normalizedEventType =
        eventType === 'click' ? `${targetType}_click` :
        eventType === 'view' ? `${targetType}_view` :
        eventType;
      const response = await api.post('/tracking/event', {
        eventType: normalizedEventType,
        targetType,
        targetId,
        metadata,
      });
      return response.data;
    } catch {
      // Tracking failures are non-critical — silent swallow
      return null;
    }
  },

  /**
   * Track batch of events.
   */
  trackBatch: async (events) => {
    try {
      const response = await api.post('/tracking/batch', { events });
      return response.data;
    } catch {
      return null;
    }
  },

  /**
   * Initialize tracking session.
   */
  initSession: async () => {
    try {
      const response = await api.post('/tracking/session');
      return response.data;
    } catch {
      return null;
    }
  },

  // ── Admin Analytics ──
  getAnalyticsOverview: async () => {
    const response = await api.get('/analytics/recommendations/overview');
    return response.data;
  },
  getAnalyticsCTR: async (days = 7) => {
    const response = await api.get('/analytics/recommendations/ctr', { params: { days } });
    return response.data;
  },
  getAnalyticsTrendingHistory: async (params = {}) => {
    const response = await api.get('/analytics/recommendations/trending-history', { params });
    return response.data;
  },
  getAnalyticsUserInterests: async () => {
    const response = await api.get('/analytics/recommendations/user-interests');
    return response.data;
  },
  getAnalyticsSeasonalDemand: async () => {
    const response = await api.get('/analytics/recommendations/seasonal-demand');
    return response.data;
  },
  getAnalyticsConversionImpact: async () => {
    const response = await api.get('/analytics/recommendations/conversion-impact');
    return response.data;
  },
};

export default recommendationService;
