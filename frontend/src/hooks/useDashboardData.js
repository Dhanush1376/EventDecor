import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { orderService, customOrderService } from '../services/domainServices';
import rentalService from '../services/api/rentalService';
import { useUserAddresses, useRecentlyViewed } from './useUserQueries';

const EMPTY_ARRAY = [];

/**
 * useDashboardData - retrieves orders, rentals, addresses, and recently viewed in parallel using TanStack Query.
 */
export function useDashboardData(userId) {
  const queryClient = useQueryClient();

  // Queries
  const ordersQuery = useQuery({
    queryKey: ['dashboard', 'orders', userId],
    queryFn: async () => {
      const res = await orderService.getMyOrders();
      const payload = res.data ?? res ?? [];
      return Array.isArray(payload) ? payload : payload.data || [];
    },
    enabled: Boolean(userId),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const rentalsQuery = useQuery({
    queryKey: ['dashboard', 'rentals', userId],
    queryFn: async () => {
      const res = await rentalService.getMyRentals();
      const payload = res.data ?? res ?? [];
      return Array.isArray(payload) ? payload : payload.data || [];
    },
    enabled: Boolean(userId),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const customOrdersQuery = useQuery({
    queryKey: ['dashboard', 'customOrders', userId],
    queryFn: async () => {
      const res = await customOrderService.getMyOrders();
      const payload = res.data ?? res ?? [];
      return Array.isArray(payload) ? payload : payload.data || [];
    },
    enabled: Boolean(userId),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const addressesQuery = useUserAddresses();
  const recentlyViewedQuery = useRecentlyViewed();

  const refetch = useCallback(() => {
    if (userId) {
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'orders', userId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'rentals', userId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'customOrders', userId] });
    }
    queryClient.invalidateQueries({ queryKey: ['user', 'addresses'] });
    queryClient.invalidateQueries({ queryKey: ['user', 'recentlyViewed'] });
  }, [queryClient, userId]);

  const setOrders = useCallback(
    (data) => {
      if (userId) {
        queryClient.setQueryData(['dashboard', 'orders', userId], data);
      }
    },
    [queryClient, userId],
  );

  const setRentals = useCallback(
    (data) => {
      if (userId) {
        queryClient.setQueryData(['dashboard', 'rentals', userId], data);
      }
    },
    [queryClient, userId],
  );

  const setAddresses = useCallback(
    (data) => {
      queryClient.setQueryData(['user', 'addresses'], data);
    },
    [queryClient],
  );

  const setRecentlyViewed = useCallback(
    (data) => {
      queryClient.setQueryData(['user', 'recentlyViewed'], data);
    },
    [queryClient],
  );

  return {
    orders: ordersQuery.data || EMPTY_ARRAY,
    rentals: rentalsQuery.data || EMPTY_ARRAY,
    customOrders: customOrdersQuery.data || EMPTY_ARRAY,
    addresses: addressesQuery.data || EMPTY_ARRAY,
    recentlyViewed: recentlyViewedQuery.data || EMPTY_ARRAY,
    isOrdersLoading: ordersQuery.isLoading,
    isRentalsLoading: rentalsQuery.isLoading,
    isCustomOrdersLoading: customOrdersQuery.isLoading,
    isAddressesLoading: addressesQuery.isLoading,
    isLoadingRecentlyViewed: recentlyViewedQuery.isLoading,
    error:
      ordersQuery.error ||
      rentalsQuery.error ||
      customOrdersQuery.error ||
      addressesQuery.error ||
      recentlyViewedQuery.error,
    refetch,
    // Keep setter functions for signature compatibility
    setOrders,
    setRentals,
    setAddresses,
    setRecentlyViewed,
  };
}
