import { QueryClient } from '@tanstack/react-query';
import api from '../services/api';
import logger from './logger';

/**
 * PrefetchManager handles intelligent background loading of data and assets
 * to make the application feel instantly responsive.
 */
class PrefetchManager {
  constructor() {
    this.queryClient = null;
    this.prefetchedRoutes = new Set();
    this.prefetchedImages = new Set();
  }

  setQueryClient(client) {
    this.queryClient = client;
  }

  /**
   * Prefetch data for a specific route
   */
  async prefetchRoute(route) {
    if (!this.queryClient || this.prefetchedRoutes.has(route)) return;

    this.prefetchedRoutes.add(route);

    try {
      if (route === '/gallery') {
        await this.queryClient.prefetchInfiniteQuery({
          queryKey: ['gallery', 'all', 'All', 'All', 'All', ''],
          queryFn: async ({ pageParam = 1 }) => {
            const res = await api.get('/gallery', { params: { page: pageParam, limit: 20 } });
            return res.data.data;
          }
        });
      } else if (route.startsWith('/product/')) {
        const id = route.split('/')[2];
        if (id) {
          await this.queryClient.prefetchQuery({
            queryKey: ['product', id],
            queryFn: async () => {
              const res = await api.get(`/products/${id}`);
              return res.data;
            }
          });
        }
      }
    } catch (e) {
      logger.warn(`Prefetch failed for ${route}`, e);
    }
  }

  /**
   * Preload critical images so they are in browser cache
   */
  preloadImage(url) {
    if (!url || this.prefetchedImages.has(url)) return;
    
    this.prefetchedImages.add(url);
    const img = new Image();
    img.src = url;
  }
}

export const prefetchManager = new PrefetchManager();
