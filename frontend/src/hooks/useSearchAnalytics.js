import { useCallback } from 'react';
import api from '../services/api';
import logger from '../utils/core/logger';

export function useSearchAnalytics() {
  const trackEvent = useCallback(async (eventType, query, metadata = {}) => {
    try {
      await api.post('/search/analytics/track', {
        eventType,
        query,
        metadata: {
          ...metadata,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
        },
      });
    } catch (err) {
      // Silently fail to not disrupt user experience
      logger.warn(`Failed to track search event: ${eventType}`, err);
    }
  }, []);

  return { trackEvent };
}
