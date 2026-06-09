import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { orderService } from '../services/domainServices';
import rentalService from '../services/rentalService';
import { useUserAddresses, useRecentlyViewed } from './useUserQueries';

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

  const addressesQuery = useUserAddresses();
  const recentlyViewedQuery = useRecentlyViewed();

  const refetch = useCallback(() => {
    if (userId) {
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'orders', userId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'rentals', userId] });
    }
    queryClient.invalidateQueries({ queryKey: ['user', 'addresses'] });
    queryClient.invalidateQueries({ queryKey: ['user', 'recentlyViewed'] });
  }, [queryClient, userId]);

  return {
    orders: ordersQuery.data || [],
    rentals: rentalsQuery.data || [],
    addresses: addressesQuery.data || [],
    recentlyViewed: recentlyViewedQuery.data || [],
    isOrdersLoading: ordersQuery.isLoading,
    isRentalsLoading: rentalsQuery.isLoading,
    isAddressesLoading: addressesQuery.isLoading,
    isLoadingRecentlyViewed: recentlyViewedQuery.isLoading,
    error:
      ordersQuery.error || rentalsQuery.error || addressesQuery.error || recentlyViewedQuery.error,
    refetch,
    // Keep setter functions for signature compatibility
    setOrders: (data) => {
      if (userId) {
        queryClient.setQueryData(['dashboard', 'orders', userId], data);
      }
    },
    setRentals: (data) => {
      if (userId) {
        queryClient.setQueryData(['dashboard', 'rentals', userId], data);
      }
    },
    setAddresses: (data) => {
      queryClient.setQueryData(['user', 'addresses'], data);
    },
    setRecentlyViewed: (data) => {
      queryClient.setQueryData(['user', 'recentlyViewed'], data);
    },
  };
}
