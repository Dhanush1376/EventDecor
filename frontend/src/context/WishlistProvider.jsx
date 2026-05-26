import React, { useState, useMemo, useCallback, useEffect } from "react";
import { userService } from "../services/domainServices";
import { useAuth } from "./AuthContext";
import { WishlistStateContext, WishlistDispatchContext } from "./WishlistContext";
import toast from "react-hot-toast";
import logger from '../utils/logger';

export function WishlistProvider({ children }) {
  const { user, isAuthenticated, runProtectedAction, isAuthInitialized } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const userId = user?._id || user?.id;

  useEffect(() => {
    const controller = new AbortController();
    const loadWishlist = async () => {
      if (!isAuthInitialized) return;
      if (userId && isAuthenticated) {
        setLoading(true);
        try {
          const res = await userService.getWishlist({ signal: controller.signal });
          if (res.success) {
            setItems(res.data || []);
          }
        } catch (error) {
          const isUnauthenticated =
            error?.response?.status === 401 ||
            error?.code === 'ERR_NO_SESSION' ||
            error?.message === 'Not authenticated';

          if (error.name !== 'CanceledError' && !isUnauthenticated) {
            logger.error("Failed to fetch wishlist:", error);
            toast.error("Failed to load wishlist items");
          }
        } finally {
          setLoading(false);
        }
      } else {
        setItems([]);
      }
    };
    loadWishlist();
    return () => controller.abort();
  }, [userId, isAuthenticated, isAuthInitialized]);

  const toggleItem = useCallback(async (product) => {
    runProtectedAction(async () => {
      const isPresent = items.some(item => String(item._id || item.id) === String(product._id || product.id));
      const previousItems = [...items];

      if (isPresent) {
        setItems(prev => prev.filter(item => String(item._id || item.id) !== String(product._id || product.id)));
      } else {
        setItems(prev => [...prev, product]);
      }

      try {
        const res = await userService.toggleWishlist(product._id || product.id);
        if (res.success) {
          toast.success(isPresent ? "Removed from Wishlist" : "Added to Wishlist");
        } else {
          throw new Error(res.message || "Failed to toggle wishlist");
        }
      } catch (error) {
        logger.error("Failed to sync wishlist:", error);
        setItems(previousItems);
        toast.error("Failed to update wishlist. Please try again.");
      }
    });
  }, [items, runProtectedAction]);

  const addItem = useCallback((product) => {
    const isPresent = items.some(item => String(item._id || item.id) === String(product._id || product.id));
    if (!isPresent) toggleItem(product);
  }, [items, toggleItem]);

  const removeItem = useCallback((id) => {
    const item = items.find(i => String(i._id || i.id) === String(id));
    if (item) toggleItem(item);
  }, [items, toggleItem]);

  const isWishlisted = useCallback(
    (id) => {
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
