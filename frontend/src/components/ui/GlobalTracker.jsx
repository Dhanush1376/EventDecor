import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useRecommendationTracker } from '../../hooks/useRecommendationTracker';
import { trackEvent } from '../../utils/core/analyticsCollector';
// socket.io is imported dynamically inside the useEffect
import { getApiRootUrl } from '../../config/apiConfig';

let socket = null;

/**
 * GlobalTracker component to initialize tracking session,
 * handle batch flushes, and perform basic global tracking.
 * Must be rendered inside <Router>.
 */
export function GlobalTracker() {
  // Calling the hook without targetType/targetId will initialize the session
  // and start the periodic batch flush timer for recommendations
  useRecommendationTracker();

  const location = useLocation();
  const startTime = useRef(Date.now());
  const lastPath = useRef(location.pathname);

  // 1. Page View Tracking
  useEffect(() => {
    // Record page exit for previous path
    if (lastPath.current !== location.pathname) {
      const timeSpentMs = Date.now() - startTime.current;
      trackEvent('page_exit', {
        exitPage: lastPath.current,
        timeSpentMs,
      });
    }

    // Record page view for new path
    startTime.current = Date.now();
    lastPath.current = location.pathname;

    trackEvent('page_view', {
      entryPage: location.pathname,
    });
  }, [location.pathname]);

  // 2. Visitor Heartbeat (Phase 4: Live Operations)
  useEffect(() => {
    if (import.meta.env.VITE_ENABLE_VISITOR_SOCKET !== 'true') return;

    let interval;
    if (!socket) {
      import('socket.io-client')
        .then(({ io }) => {
          let socketServerUrl = getApiRootUrl();
          if (socketServerUrl.endsWith('/api/v1')) {
            socketServerUrl = socketServerUrl.slice(0, -7);
          } else if (socketServerUrl.endsWith('/api')) {
            socketServerUrl = socketServerUrl.slice(0, -4);
          }

          socket = io(`${socketServerUrl}/visitor`, {
            withCredentials: true,
            transports: ['websocket', 'polling'],
          });
          interval = setInterval(beat, 120000); // 2 minutes
        })
        .catch(() => {});
    } else {
      interval = setInterval(beat, 120000); // 2 minutes
    }

    function beat() {
      // Determine what product is being viewed if on a product page
      const isProductPage = location.pathname.startsWith('/product/');
      const productViewed = isProductPage ? location.pathname.split('/product/')[1] : null;

      // Extract search query if on collection/search page
      const params = new URLSearchParams(window.location.search);
      const searchQuery = params.get('q') || null;

      const sessionId = sessionStorage.getItem('ci_session_id');

      if (socket) {
        socket.emit('visitor:heartbeat', {
          sessionId,
          currentPage: location.pathname,
          productViewed,
          searchQuery,
        });
      }
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [location.pathname]);

  return null;
}
