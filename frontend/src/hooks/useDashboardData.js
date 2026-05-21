import { useState, useEffect, useCallback } from 'react';
import { orderService, userService } from '../services/domainServices';
import logger from '../utils/logger';

const CACHE_TTL_MS = 30_000;

let inflightPromise = null;
let cachedPayload = null;
let cacheTimestamp = 0;

/**
 * Fetches orders, addresses, and recently viewed in parallel with in-flight deduplication.
 */
export function useDashboardData(userId) {
  const [orders, setOrders] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async (force = false) => {
    if (!userId) return;

    const now = Date.now();
    if (!force && cachedPayload && now - cacheTimestamp < CACHE_TTL_MS) {
      setOrders(cachedPayload.orders);
      setAddresses(cachedPayload.addresses);
      setRecentlyViewed(cachedPayload.recentlyViewed);
      return;
    }

    if (inflightPromise && !force) {
      try {
        const data = await inflightPromise;
        setOrders(data.orders);
        setAddresses(data.addresses);
        setRecentlyViewed(data.recentlyViewed);
      } catch (err) {
        logger.error('Dashboard deduped fetch failed:', err);
      }
      return;
    }

    setIsLoading(true);
    setError(null);

    inflightPromise = Promise.all([
      orderService.getMyOrders(),
      userService.getAddresses(),
      userService.getRecentlyViewed(),
    ])
      .then(([ordersRes, addressesRes, recentRes]) => {
        const payload = {
          orders: ordersRes?.data ?? ordersRes ?? [],
          addresses: addressesRes?.data ?? addressesRes ?? [],
          recentlyViewed: recentRes?.data ?? recentRes ?? [],
        };
        cachedPayload = payload;
        cacheTimestamp = Date.now();
        return payload;
      })
      .finally(() => {
        inflightPromise = null;
      });

    try {
      const payload = await inflightPromise;
      setOrders(payload.orders);
      setAddresses(payload.addresses);
      setRecentlyViewed(payload.recentlyViewed);
    } catch (err) {
      logger.error('Dashboard parallel fetch failed:', err);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const refetch = useCallback(() => load(true), [load]);

  return {
    orders,
    addresses,
    recentlyViewed,
    isOrdersLoading: isLoading,
    isAddressesLoading: isLoading,
    isLoadingRecentlyViewed: isLoading,
    error,
    refetch,
    setOrders,
    setAddresses,
    setRecentlyViewed,
  };
}
