/**
 * Starts downloading the page chunk for the URL the visitor landed on, in parallel
 * with React booting.
 *
 * Without this, the route chunk is only requested after the app tree first renders
 * and React.lazy suspends, which puts a full extra round trip between "JS loaded"
 * and "page content requested". The import specifiers match AppRoutes.jsx exactly,
 * so React.lazy reuses the same in-flight module promise; nothing is loaded twice.
 *
 * Only the most common customer entry pages are listed. Anything else falls back to
 * normal lazy loading.
 */
const ENTRY_ROUTES = [
  { test: (p) => p === '/', load: () => import('../pages/Home/Home') },
  { test: (p) => p === '/collections', load: () => import('../pages/ProductListing') },
  { test: (p) => /^\/product\/[^/]+$/.test(p), load: () => import('../pages/ProductDetails') },
  { test: (p) => p === '/cart', load: () => import('../pages/Cart') },
  { test: (p) => p === '/events', load: () => import('../pages/EventShowcases') },
  { test: (p) => p === '/events/collections', load: () => import('../pages/EventCollections') },
  { test: (p) => /^\/events\/[^/]+$/.test(p), load: () => import('../pages/EventDetail') },
  { test: (p) => p === '/checkout', load: () => import('../pages/Checkout') },
];

export function preloadEntryRoute(pathname = window.location.pathname) {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  const route = ENTRY_ROUTES.find((r) => r.test(path));
  if (!route) return;
  // Errors are handled by lazyWithRetry when the route actually renders.
  route.load().catch(() => {});
}
