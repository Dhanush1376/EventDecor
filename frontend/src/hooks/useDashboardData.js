import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { orderService } from '../services/domainServices';
import { useUserAddresses, useRecentlyViewed } from './useUserQueries';

/**
 * useDashboardData - retrieves orders, addresses, and recently viewed in parallel using TanStack Query.
 */
export function useDashboardData(userId) {
  const queryClient = useQueryClient();

  // Queries
  const ordersQuery = useQuery({
    queryKey: ['dashboard', 'orders', userId],
    queryFn: async () => {
      const res = await orderService.getMyOrders();
      return res.data ?? res ?? [];
    },
    enabled: Boolean(userId),
    staleTime: 30 * 1000, // 30 seconds dashboard order cache
    gcTime: 5 * 60 * 1000,
  });

  const addressesQuery = useUserAddresses();
  const recentlyViewedQuery = useRecentlyViewed();

  const refetch = useCallback(() => {
    if (userId) {
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'orders', userId] });
    }
    queryClient.invalidateQueries({ queryKey: ['user', 'addresses'] });
    queryClient.invalidateQueries({ queryKey: ['user', 'recentlyViewed'] });
  }, [queryClient, userId]);

  return {
    orders: ordersQuery.data || [],
    addresses: addressesQuery.data || [],
    recentlyViewed: recentlyViewedQuery.data || [],
    isOrdersLoading: ordersQuery.isLoading,
    isAddressesLoading: addressesQuery.isLoading,
    isLoadingRecentlyViewed: recentlyViewedQuery.isLoading,
    error: ordersQuery.error || addressesQuery.error || recentlyViewedQuery.error,
    refetch,
    // Keep setter functions for signature compatibility (unused in page but mockable)
    setOrders: (data) => {
      if (userId) {
        queryClient.setQueryData(['dashboard', 'orders', userId], data);
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
