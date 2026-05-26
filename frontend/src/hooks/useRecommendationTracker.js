import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { recommendationService } from '../services/recommendationService';
import { useAuth } from '../context/AuthContext';

/**
 * useRecommendationTracker — automatic behavioral tracking hook.
 *
 * Drop into any page component to automatically track:
 * - Page views (based on route and provided context)
 * - Dwell time (time spent on page, sent on unmount)
 * - Scroll depth (deepest scroll, batched)
 *
 * For explicit tracking, use the returned `trackEvent` and `trackSearch` methods.
 */
export function useRecommendationTracker({
  targetType = null,
  targetId = null,
  category = null,
  style = null,
  tags = null,
  price = null,
  source = null,
} = {}) {
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const mountTimeRef = useRef(Date.now());
  const maxScrollRef = useRef(0);
  const batchBufferRef = useRef([]);
  const flushTimerRef = useRef(null);
  const trackedViewRef = useRef(null); // Prevent duplicate view tracking

  // Infer price range from price
  const getPriceRange = useCallback((p) => {
    if (!p) return undefined;
    if (p < 500) return 'budget';
    if (p < 2000) return 'mid';
    if (p < 10000) return 'premium';
    return 'luxury';
  }, []);

  // Queue an event to the batch buffer
  const queueEvent = useCallback((eventType, tType, tId, metadata = {}) => {
    if (!tType || !tId) return;
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(tId);
    const isValidTargetType = ['product', 'event', 'gallery', 'showcase'].includes(tType);
    if (!isValidTargetType || !isValidObjectId) return;

    batchBufferRef.current.push({
      eventType,
      targetType: tType,
      targetId: tId,
      metadata: {
        ...metadata,
        source: metadata.source || source || inferSource(location.pathname),
      },
    });

    // Auto-flush if buffer is large
    if (batchBufferRef.current.length >= 10) {
      flushBatch();
    }
  }, [source, location.pathname]);

  // Flush the batch buffer
  const flushBatch = useCallback(() => {
    if (batchBufferRef.current.length === 0) return;

    const events = [...batchBufferRef.current];
    batchBufferRef.current = [];

    // Use sendBeacon for page unload reliability, fall back to regular API
    if (navigator.sendBeacon && events.length <= 5) {
      try {
        const blob = new Blob([JSON.stringify({ events })], { type: 'application/json' });
        const apiUrl = import.meta.env.VITE_API_URL || '/api';
        navigator.sendBeacon(`${apiUrl}/tracking/batch`, blob);
        return;
      } catch {
        // Fall through to regular API
      }
    }

    recommendationService.trackBatch(events);
  }, []);

  // Track a single event explicitly (for use in component event handlers)
  const trackEvent = useCallback((eventType, tType, tId, metadata = {}) => {
    if (!tType || !tId) return;
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(tId);
    const isValidTargetType = ['product', 'event', 'gallery', 'showcase'].includes(tType);
    if (!isValidTargetType || !isValidObjectId) return;

    recommendationService.trackEvent(eventType, tType, tId, {
      category,
      style,
      tags,
      priceRange: getPriceRange(price),
      ...metadata,
      source: metadata.source || source || inferSource(location.pathname),
    });
  }, [category, style, tags, price, source, location.pathname, getPriceRange]);

  // Track a search query
  const trackSearch = useCallback((query) => {
    if (!query || query.trim().length < 2) return;

    // For search, we use a generic target
    recommendationService.trackEvent('search', 'product', '000000000000000000000000', {
      searchQuery: query.trim(),
      source: 'search',
    });
  }, []);

  // Track category exploration
  const trackCategoryExplore = useCallback((cat) => {
    if (!cat) return;

    recommendationService.trackEvent('category_explore', 'product', '000000000000000000000000', {
      category: cat,
      source: inferSource(location.pathname),
    });
  }, [location.pathname]);

  // ── Automatic page view tracking ──
  useEffect(() => {
    if (!targetType || !targetId) return;
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(targetId);
    const isValidTargetType = ['product', 'event', 'gallery', 'showcase'].includes(targetType);
    if (!isValidTargetType || !isValidObjectId) return;

    // Prevent duplicate tracking for the same item
    const viewKey = `${targetType}:${targetId}`;
    if (trackedViewRef.current === viewKey) return;
    trackedViewRef.current = viewKey;

    // Determine event type based on target type
    const eventType = `${targetType}_view`;

    recommendationService.trackEvent(eventType, targetType, targetId, {
      category,
      style,
      tags,
      priceRange: getPriceRange(price),
      source: source || inferSource(location.pathname),
    });

    // Reset mount time for dwell tracking
    mountTimeRef.current = Date.now();
    maxScrollRef.current = 0;
  }, [targetType, targetId, category, style, tags, price, source, location.pathname, getPriceRange]);

  // ── Scroll depth tracking (throttled) ──
  useEffect(() => {
    if (!targetType || !targetId) return;

    let ticking = false;

    const handleScroll = () => {
      if (ticking) return;
      ticking = true;

      requestAnimationFrame(() => {
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrollPercent = docHeight > 0 ? Math.round((scrollTop / docHeight) * 100) : 0;

        if (scrollPercent > maxScrollRef.current) {
          maxScrollRef.current = scrollPercent;
        }

        ticking = false;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [targetType, targetId]);

  // ── Dwell time + scroll depth tracking on unmount ──
  useEffect(() => {
    return () => {
      if (!targetType || !targetId) return;
      const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(targetId);
      const isValidTargetType = ['product', 'event', 'gallery', 'showcase'].includes(targetType);
      if (!isValidTargetType || !isValidObjectId) return;

      const dwellTimeMs = Date.now() - mountTimeRef.current;

      // Only track if user spent meaningful time (>2 seconds)
      if (dwellTimeMs > 2000) {
        const events = [{
          eventType: `${targetType}_click`, // Use click to indicate engaged view
          targetType,
          targetId,
          metadata: {
            category,
            style,
            dwellTimeMs,
            scrollDepth: maxScrollRef.current,
            source: source || 'page-exit',
          },
        }];

        // sendBeacon is reliable on page unload
        try {
          const blob = new Blob([JSON.stringify({ events })], { type: 'application/json' });
          const apiUrl = import.meta.env.VITE_API_URL || '/api';
          navigator.sendBeacon(`${apiUrl}/tracking/batch`, blob);
        } catch {
          // Best effort
        }
      }
    };
  }, [targetType, targetId, category, style, source]);

  // ── Periodic batch flush (every 5 seconds) ──
  useEffect(() => {
    flushTimerRef.current = setInterval(flushBatch, 5000);
    return () => {
      if (flushTimerRef.current) clearInterval(flushTimerRef.current);
      flushBatch(); // Flush remaining on cleanup
    };
  }, [flushBatch]);

  // ── Init session on first mount ──
  useEffect(() => {
    recommendationService.initSession();
  }, []);

  return {
    trackEvent,
    trackSearch,
    trackCategoryExplore,
    queueEvent,
    flushBatch,
  };
}

/**
 * Infer the source context from the current pathname.
 */
function inferSource(pathname) {
  if (pathname === '/' || pathname === '/home') return 'homepage';
  if (pathname.startsWith('/products')) return 'product-listing';
  if (pathname.startsWith('/product/')) return 'product-detail';
  if (pathname.startsWith('/gallery')) return 'gallery';
  if (pathname.startsWith('/events')) return 'events';
  if (pathname.startsWith('/event/')) return 'event-detail';
  if (pathname.startsWith('/cart')) return 'cart';
  if (pathname.startsWith('/wishlist')) return 'wishlist';
  if (pathname.startsWith('/search')) return 'search';
  return 'other';
}

export default useRecommendationTracker;
