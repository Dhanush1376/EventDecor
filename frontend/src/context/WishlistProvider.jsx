import { useMemo, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { userService } from '../services/domainServices';
import { useAuth } from './AuthContext';
import { WishlistStateContext, WishlistDispatchContext } from './WishlistContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import logger from '../utils/core/logger';
import { getErrorMessage } from '../utils/core/errorHelpers';

export function WishlistProvider({ children }) {
  const { user, isAuthenticated, runProtectedAction, isAuthInitialized } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?._id || user?.id;
  const [showHeartOverlay, setShowHeartOverlay] = useState(false);

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
        // Instant feedback for removal
        toast.success('Removed from Wishlist');
      } else {
        updatedWishlist = [...previousWishlist, product];
        // Trigger heart animation instantly on optimistic update
        setShowHeartOverlay(true);
        setTimeout(() => setShowHeartOverlay(false), 1200);
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
      // Intentionally left empty as feedback is now optimistic
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
        {/* Global Instagram-style Heart Overlay */}
        <AnimatePresence>
          {showHeartOverlay && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5, y: 0 }}
              animate={{
                opacity: [0, 1, 1, 0],
                scale: [0.5, 1.2, 1, 1],
                y: [0, 0, -20, -60],
              }}
              transition={{
                duration: 1.2,
                times: [0, 0.2, 0.4, 1],
                ease: 'easeOut',
              }}
              className="fixed inset-0 flex items-center justify-center pointer-events-none z-[9999]"
            >
              <span
                className="material-symbols-outlined text-[#ff2d55] drop-shadow-2xl"
                style={{
                  fontSize: '120px',
                  fontVariationSettings: "'FILL' 1, 'wght' 400",
                  filter: 'drop-shadow(0 10px 15px rgba(255, 45, 85, 0.3))',
                }}
              >
                favorite
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </WishlistDispatchContext.Provider>
    </WishlistStateContext.Provider>
  );
}
