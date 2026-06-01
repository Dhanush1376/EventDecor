import api from '../services/api';
import { productService, orderService, userService } from '../services/domainServices';
import logger from './logger';
import { hasSessionMarker } from './authStorage';

/**
 * PrefetchManager handles intelligent background loading of data and assets
 * to make the application feel instantly responsive.
 */
class PrefetchManager {
  constructor() {
    this.queryClient = null;
    this.prefetchedRoutes = new Set();
    this.prefetchedImages = new Set();
    this.inFlightRoutePrefetches = new Map();
    this.prefetchedModules = new Set();
    this.routeVisitCounts = new Map();
  }

  setQueryClient(client) {
    this.queryClient = client;
  }

  /**
   * Prefetch data for a specific route
   */
  async prefetchRoute(route, opts = {}) {
    if (!this.queryClient || !route) return;
    const key = this.normalizeRoute(route);
    if (this.prefetchedRoutes.has(key)) return;
    if (this.inFlightRoutePrefetches.has(key)) return this.inFlightRoutePrefetches.get(key);

    const task = this.prefetchRouteInternal(route, opts)
      .catch((err) => {
        logger.warn(`Prefetch failed for ${route}`, err);
      })
      .finally(() => {
        this.inFlightRoutePrefetches.delete(key);
        this.prefetchedRoutes.add(key);
      });

    this.inFlightRoutePrefetches.set(key, task);
    return task;
  }

  async prefetchRouteInternal(route, opts = {}) {
    const { kind = 'default', productId } = opts;

    try {
      await this.prefetchRouteModule(route, opts);

      if (route === '/gallery') {
        await this.queryClient.prefetchInfiniteQuery({
          queryKey: ['gallery', 'all', 'All', 'All', 'All', ''],
          queryFn: async ({ pageParam = 1 }) => {
            const res = await api.get('/gallery', { params: { page: pageParam, limit: 20 } });
            return res.data.data;
          },
        });
      } else if (route === '/wishlist') {
        if (hasSessionMarker()) {
          await this.queryClient.prefetchQuery({
            queryKey: ['wishlist'],
            queryFn: async () => {
              const res = await userService.getWishlist();
              return res.success ? res.data || [] : [];
            },
            staleTime: 1000 * 60 * 2,
          });
        }
      } else if (route === '/events' || route.startsWith('/events?')) {
        await this.queryClient.prefetchQuery({
          queryKey: ['events', 'list'],
          queryFn: async () => api.get('/events').then((res) => res.data.data),
          staleTime: 1000 * 60 * 5,
        });
      } else if (route.startsWith('/product/') || kind === 'product') {
        const id = productId || route.split('/')[2];
        if (id && id !== ':id') {
          await this.queryClient.prefetchQuery({
            queryKey: ['product', id],
            queryFn: async () => productService.getById(id),
            staleTime: 1000 * 60 * 10,
          });
        }
      } else if (route === '/collections' || route.startsWith('/collections?')) {
        await this.queryClient.prefetchQuery({
          queryKey: ['products', { page: 1, limit: 12, sort: 'newest' }],
          queryFn: async () => productService.getAll({ page: 1, limit: 12, sort: 'newest' }),
          staleTime: 1000 * 60 * 5,
        });
      } else if (route === '/checkout') {
        if (hasSessionMarker()) {
          await this.queryClient.prefetchQuery({
            queryKey: ['checkout', 'addresses'],
            queryFn: async () => userService.getAddresses(),
            staleTime: 1000 * 60 * 3,
          });
        }
      } else if (route === '/dashboard' || route.startsWith('/dashboard')) {
        if (hasSessionMarker()) {
          await this.queryClient.prefetchQuery({
            queryKey: ['dashboard', 'orders'],
            queryFn: async () => orderService.getMyOrders({ limit: 10 }),
            staleTime: 1000 * 60 * 2,
          });
        }
      }
    } catch (e) {
      if (kind !== 'silent') {
        logger.warn(`Prefetch failed for ${route}`, e);
      }
    }
  }

  normalizeRoute(route) {
    if (!route) return '';
    if (route.startsWith('/product/')) return '/product/:id';
    if (route.startsWith('/dashboard')) return '/dashboard';
    if (route.startsWith('/collections')) return '/collections';
    if (route.startsWith('/events')) return '/events';
    if (route.startsWith('/gallery')) return '/gallery';
    return route.split('?')[0];
  }

  async prefetchRouteModule(route, opts = {}) {
    const key = this.normalizeRoute(route);
    if (this.prefetchedModules.has(key)) return;

    const importers = {
      '/': () => import('../pages/Home'),
      '/collections': () => import('../pages/ProductListing'),
      '/cart': () => import('../pages/Cart'),
      '/checkout': () => import('../pages/Checkout'),
      '/dashboard': () => import('../pages/Dashboard'),
      '/product/:id': () => import('../pages/ProductDetails'),
      '/gallery': () => import('../pages/Gallery'),
      '/wishlist': () => import('../pages/Wishlist'),
      '/events': () => import('../pages/EventCollections'),
      '/about': () => import('../pages/About'),
      '/contact': () => import('../pages/Contact'),
    };

    const importer = importers[key];
    if (!importer) return;

    // Deduplicate in-flight module loads
    const inFlightKey = `module_${key}`;
    if (this.inFlightRoutePrefetches.has(inFlightKey)) {
      return this.inFlightRoutePrefetches.get(inFlightKey);
    }

    const task = importer()
      .then(() => {
        this.prefetchedModules.add(key);
      })
      .finally(() => {
        this.inFlightRoutePrefetches.delete(inFlightKey);
      });

    this.inFlightRoutePrefetches.set(inFlightKey, task);
    return task;
  }

  async prefetchFrequentlyVisitedRoutes() {
    const routes = this.getTopVisitedRoutes();
    for (const route of routes) {
      await this.prefetchRoute(route, { kind: 'silent' });
    }
  }

  markRouteVisit(route) {
    const key = this.normalizeRoute(route);
    if (!key) return;
    const next = (this.routeVisitCounts.get(key) || 0) + 1;
    this.routeVisitCounts.set(key, next);
    try {
      const serializable = Array.from(this.routeVisitCounts.entries());
      localStorage.setItem('siri_route_visit_counts', JSON.stringify(serializable));
    } catch {
      // Ignore storage failures.
    }
  }

  hydrateRouteVisitsFromStorage() {
    try {
      const raw = localStorage.getItem('siri_route_visit_counts');
      if (!raw) return;
      const entries = JSON.parse(raw);
      if (!Array.isArray(entries)) return;
      this.routeVisitCounts = new Map(entries);
    } catch {
      // Ignore malformed storage.
    }
  }

  getTopVisitedRoutes(limit = 4) {
    return Array.from(this.routeVisitCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([route]) => route)
      .filter((route) =>
        ['/cart', '/checkout', '/dashboard', '/collections', '/product/:id'].includes(route),
      );
  }

  /**
   * Preload critical images so they are in browser cache
   */
  preloadImage(url) {
    if (!url || this.prefetchedImages.has(url)) return;

    this.prefetchedImages.add(url);

    // Use link preload for higher priority caching
    if (document && document.head) {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = url;
      document.head.appendChild(link);
    } else {
      // Fallback
      const img = new Image();
      img.src = url;
    }
  }
}

export const prefetchManager = new PrefetchManager();
