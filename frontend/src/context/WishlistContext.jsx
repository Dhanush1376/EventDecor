import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
  useEffect,
} from "react";

import { userService } from "../services/domainServices";
import { useAuth } from "./AuthContext";
import toast from "react-hot-toast";

import logger from '../utils/logger';
const WishlistContext = createContext(null);

export function WishlistProvider({ children }) {
  const { user, isAuthenticated, runProtectedAction } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const userId = user?._id || user?.id;

  // Load wishlist from backend only for logged-in users with a valid token safeguard
  useEffect(() => {
    const loadWishlist = async () => {
      if (userId && isAuthenticated) {
        setLoading(true);
        try {
          const res = await userService.getWishlist();
          if (res.success) {
            setItems(res.data || []);
          }
        } catch (error) {
          logger.error("Failed to fetch wishlist:", error);
          toast.error("Failed to load wishlist items");
        } finally {
          setLoading(false);
        }
      } else {
        setItems([]);
      }
    };
    loadWishlist();
  }, [userId, isAuthenticated]);

  const toggleItem = useCallback(async (product) => {
    runProtectedAction(async () => {
      const isPresent = items.some(item => String(item._id || item.id) === String(product._id || product.id));
      const previousItems = [...items];

      // Optimistic state change
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
        setItems(previousItems); // Rollback to previous state on failure
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

  const value = useMemo(
    () => ({
      items,
      loading,
      addItem,
      removeItem,
      toggleItem,
      isWishlisted,
      count: items.length,
    }),
    [items, loading, addItem, removeItem, toggleItem, isWishlisted],
  );

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error("useWishlist must be used within a WishlistProvider");
  }
  return context;
}
