import { useMemo, useCallback } from 'react';
import { userService } from '../services/domainServices';
import { useAuth } from './AuthContext';
import { WishlistStateContext, WishlistDispatchContext } from './WishlistContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import logger from '../utils/logger';
import { getErrorMessage } from '../utils/errorHelpers';

export function WishlistProvider({ children }) {
  const { user, isAuthenticated, runProtectedAction, isAuthInitialized } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?._id || user?.id;

  const isQueryEnabled = Boolean(isAuthInitialized && userId && isAuthenticated);

  // Fetch Wishlist via React Query
  const { data: rawItems = [], isLoading: loading } = useQuery({
    queryKey: ['wishlist'],
    queryFn: async ({ signal }) => {
      const res = await userService.getWishlist({ signal });
      return res.success ? res.data || [] : [];
    },
    enabled: isQueryEnabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const items = useMemo(() => {
    if (!isAuthenticated || !rawItems) return [];
    if (Array.isArray(rawItems)) return rawItems;
    if (rawItems.data && Array.isArray(rawItems.data)) return rawItems.data;
    if (rawItems.items && Array.isArray(rawItems.items)) return rawItems.items;
    return [];
  }, [rawItems, isAuthenticated]);

  // Mutation with optimistic updates
  const toggleMutation = useMutation({
    mutationFn: async (product) => {
      const res = await userService.toggleWishlist(product._id || product.id);
      if (!res.success) {
        throw new Error(res.message || 'Failed to toggle wishlist');
      }
      return res;
    },
    onMutate: async (product) => {
      await queryClient.cancelQueries({ queryKey: ['wishlist'] });
      let previousData = queryClient.getQueryData(['wishlist']) || [];

      // Defensively extract array if it is wrapped in an ApiResponse
      let previousWishlist = previousData;
      if (!Array.isArray(previousData)) {
        if (previousData.data && Array.isArray(previousData.data)) {
          previousWishlist = previousData.data;
        } else if (previousData.items && Array.isArray(previousData.items)) {
          previousWishlist = previousData.items;
        } else {
          previousWishlist = [];
        }
      }

      const isPresent = previousWishlist.some(
        (item) => String(item._id || item.id) === String(product._id || product.id),
      );

      let updatedWishlist;
      if (isPresent) {
        updatedWishlist = previousWishlist.filter(
          (item) => String(item._id || item.id) !== String(product._id || product.id),
        );
      } else {
        updatedWishlist = [...previousWishlist, product];
      }

      queryClient.setQueryData(['wishlist'], updatedWishlist);
      return { previousWishlist, isPresent };
    },
    onError: (err, product, context) => {
      queryClient.setQueryData(['wishlist'], context?.previousWishlist);
      logger.error('Failed to sync wishlist:', err);
      toast.error(getErrorMessage(err, 'Unable to update wishlist. Please try again.'));
    },
    onSuccess: (data, product, context) => {
      toast.success(context.isPresent ? 'Removed from Wishlist' : 'Added to Wishlist');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
    },
  });

  const toggleItem = useCallback(
    async (product) => {
      runProtectedAction(() => {
        toggleMutation.mutate(product);
      });
    },
    [runProtectedAction, toggleMutation],
  );

  const addItem = useCallback(
    (product) => {
      const isPresent =
        Array.isArray(items) &&
        items.some((item) => String(item._id || item.id) === String(product._id || product.id));
      if (!isPresent) toggleItem(product);
    },
    [items, toggleItem],
  );

  const removeItem = useCallback(
    (id) => {
      const item = items.find((i) => String(i._id || i.id) === String(id));
      if (item) toggleItem(item);
    },
    [items, toggleItem],
  );

  const isWishlisted = useCallback(
    (id) => {
      if (!Array.isArray(items)) return false;
      return items.some((item) => String(item._id || item.id) === String(id));
    },
    [items],
  );

  const stateValue = useMemo(
    () => ({
      items,
      loading,
      count: items.length,
      isWishlisted,
    }),
    [items, loading, isWishlisted],
  );

  const dispatchValue = useMemo(
    () => ({
      addItem,
      removeItem,
      toggleItem,
    }),
    [addItem, removeItem, toggleItem],
  );

  return (
    <WishlistStateContext.Provider value={stateValue}>
      <WishlistDispatchContext.Provider value={dispatchValue}>
        {children}
      </WishlistDispatchContext.Provider>
    </WishlistStateContext.Provider>
  );
}
