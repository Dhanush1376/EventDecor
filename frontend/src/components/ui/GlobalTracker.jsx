import React from 'react';
import { useRecommendationTracker } from '../../hooks/useRecommendationTracker';

/**
 * GlobalTracker component to initialize tracking session, 
 * handle batch flushes, and perform basic global tracking.
 * Must be rendered inside <Router>.
 */
export function GlobalTracker() {
  // Calling the hook without targetType/targetId will initialize the session 
  // and start the periodic batch flush timer.
  useRecommendationTracker();

  return null;
}
