import React from 'react';
import { useLocation } from 'react-router-dom';
import { prefetchManager } from '../../utils/prefetchManager';
import { preloadRazorpay } from '../../hooks/useRazorpay';

const PRIORITY_ROUTES = ['/cart', '/checkout', '/dashboard', '/collections'];

function shouldPrefetchAnchor(anchor) {
  if (!anchor) return false;
  const href = anchor.getAttribute('href');
  if (!href || !href.startsWith('/')) return false;
  if (href.startsWith('/admin')) return false;
  return true;
}

export function NavigationOrchestrator() {
  const location = useLocation();
  const [loadingRoute, setLoadingRoute] = React.useState('');
  const completeTimerRef = React.useRef(null);

  React.useEffect(() => {
    prefetchManager.hydrateRouteVisitsFromStorage();
  }, []);

  React.useEffect(() => {
    prefetchManager.markRouteVisit(location.pathname);
    if (completeTimerRef.current) window.clearTimeout(completeTimerRef.current);
    completeTimerRef.current = window.setTimeout(() => setLoadingRoute(''), 180);
    return () => {
      if (completeTimerRef.current) window.clearTimeout(completeTimerRef.current);
    };
  }, [location.pathname]);

  React.useEffect(() => {
    let hoverTimeout;
    const onPointerIntent = (event) => {
      const anchor = event.target?.closest?.('a[href]');
      if (!shouldPrefetchAnchor(anchor)) return;
      const href = anchor.getAttribute('href');

      clearTimeout(hoverTimeout);
      hoverTimeout = setTimeout(() => {
        prefetchManager.prefetchRoute(href);
      }, 50); // 50ms intent delay
    };

    const onNavClick = (event) => {
      const anchor = event.target?.closest?.('a[href]');
      if (!shouldPrefetchAnchor(anchor)) return;
      const href = anchor.getAttribute('href');
      if (href !== location.pathname) {
        setLoadingRoute(href);
      }
    };

    document.addEventListener('mouseover', onPointerIntent, { capture: true, passive: true });
    document.addEventListener('touchstart', onPointerIntent, { capture: true, passive: true });
    document.addEventListener('pointerdown', onPointerIntent, { capture: true, passive: true });
    document.addEventListener('focusin', onPointerIntent, { capture: true, passive: true });
    document.addEventListener('click', onNavClick, { capture: true });

    return () => {
      clearTimeout(hoverTimeout);
      document.removeEventListener('mouseover', onPointerIntent, { capture: true });
      document.removeEventListener('touchstart', onPointerIntent, { capture: true });
      document.removeEventListener('pointerdown', onPointerIntent, { capture: true });
      document.removeEventListener('focusin', onPointerIntent, { capture: true });
      document.removeEventListener('click', onNavClick, { capture: true });
    };
  }, [location.pathname]);

  React.useEffect(() => {
    const schedulePrefetch = () => {
      // Predictive prefetch: after collections, likely next action is product detail/cart.
      if (location.pathname === '/collections') {
        prefetchManager.prefetchRoute('/cart', { kind: 'predictive' });
        prefetchManager.prefetchRoute('/checkout', { kind: 'predictive' });
      }
      if (location.pathname.startsWith('/product/')) {
        prefetchManager.prefetchRoute('/cart', { kind: 'predictive' });
        prefetchManager.prefetchRoute('/checkout', { kind: 'predictive' });
      }
      if (location.pathname === '/cart') {
        prefetchManager.prefetchRoute('/checkout', { kind: 'predictive' });
        preloadRazorpay();
      }
      if (location.pathname === '/checkout') {
        preloadRazorpay();
      }
    };

    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(schedulePrefetch, { timeout: 3000 });
    } else {
      setTimeout(schedulePrefetch, 1000);
    }
  }, [location.pathname]);

  return null;
}
