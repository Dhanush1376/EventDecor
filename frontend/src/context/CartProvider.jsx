import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { CartStateContext, CartDispatchContext } from "./CartContext";
import { useCartQuery, useCartMutations } from "../hooks/useCartQueries";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import logger from '../utils/logger';
import { persistentStorage } from "../utils/persistentStorage";
import { userService } from "../services/domainServices";
import { getErrorMessage } from '../utils/errorHelpers';

export function CartProvider({ children }) {
  const { isAuthenticated, runProtectedAction, isAuthInitialized } = useAuth();
  const queryClient = useQueryClient();

  const getInitialCartState = () => {
    return persistentStorage.getItem('siri_cart_cache', {
      fallback: { items: [], summary: { subtotal: 0, shippingFee: 0, platformFee: 0, discount: 0, total: 0 } }
    });
  };

  // Guest mode in-memory states
  const [guestItems, setGuestItems] = useState(() => {
    const cached = getInitialCartState();
    return cached.items;
  });
  const [guestSummary, setGuestSummary] = useState(() => {
    const cached = getInitialCartState();
    return cached.summary;
  });

  const [claimedCoupon, setClaimedCoupon] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState("");
  const [isCartOpen, setIsCartOpen] = useState(false);

  // TanStack Query hooks for authenticated user
  const { data: cartData, isLoading: cartLoading } = useCartQuery();
  const { addToCart, removeFromCart, syncCart } = useCartMutations();

  const transformDbCart = useCallback((dbCart) => {
    if (!dbCart || !Array.isArray(dbCart)) return [];
    return dbCart
      .filter((item) => item.product) // filter out orphaned products
      .map((item) => ({
        id: item.product._id || item.product.id,
        _id: item.product._id || item.product.id,
        title: item.product.title,
        price: item.product.price,
        oldPrice: item.product.oldPrice || item.product.price,
        stock: item.product.stock || 0,
        seller: item.product.seller || "Siri Arts Artisans",
        rating: item.product.rating || 0,
        imageSrc: item.product.imageSrc,
        category: item.product.category,
        quantity: item.quantity,
        variant: item.variant || "Default",
      }));
  }, []);

  // Derived state depending on auth
  const items = useMemo(() => {
    if (isAuthenticated && cartData?.items) {
      return transformDbCart(cartData.items);
    }
    return guestItems;
  }, [isAuthenticated, cartData, guestItems, transformDbCart]);

  const summary = useMemo(() => {
    if (isAuthenticated && cartData?.summary) {
      return cartData.summary;
    }
    return guestSummary;
  }, [isAuthenticated, cartData, guestSummary]);

  // Sync back to persistentStorage for offline cache
  useEffect(() => {
    persistentStorage.setItem('siri_cart_cache', { items, summary });
  }, [items, summary]);

  // Automatic Guest-to-Auth Cart Merging upon Login
  const lastAuthRef = useRef(isAuthenticated);

  useEffect(() => {
    if (isAuthenticated && !lastAuthRef.current) {
      const mergeGuestCart = async () => {
        try {
          const guestCart = persistentStorage.getItem('siri_cart_cache');
          if (guestCart && Array.isArray(guestCart.items) && guestCart.items.length > 0) {
            logger.info('[Cart] Merging guest cart items with authenticated database cart upon sign-in:', guestCart.items);
            
            // Get current database cart items
            const dbCartRes = await userService.getCart();
            const dbItems = dbCartRes?.success ? dbCartRes.data?.items || [] : [];

            // Merge items by combining quantities
            const mergedPayloadMap = new Map();

            // 1. Populate from DB cart
            dbItems.forEach((item) => {
              const pId = item.product?._id || item.product?.id || item.product;
              if (pId) {
                mergedPayloadMap.set(pId, item.quantity);
              }
            });

            // 2. Add guest cart quantities
            guestCart.items.forEach((item) => {
              const pId = item._id || item.id;
              if (pId) {
                const existingQty = mergedPayloadMap.get(pId) || 0;
                mergedPayloadMap.set(pId, existingQty + item.quantity);
              }
            });

            // Convert map back to sync payload structure
            const syncPayload = Array.from(mergedPayloadMap.entries()).map(([productId, quantity]) => ({
              product: productId,
              quantity,
            }));

            // Sync merged cart to server database
            await syncCart({ cartItems: syncPayload });
            toast.success('Your guest shopping bag was merged successfully!');
          }
          
          // Clear guest states and cache
          setGuestItems([]);
          setGuestSummary({ subtotal: 0, shippingFee: 0, platformFee: 0, discount: 0, total: 0 });
          persistentStorage.removeItem('siri_cart_cache');
        } catch (err) {
          logger.error('[Cart] Guest-to-auth cart merge failed:', err);
        }
      };

      mergeGuestCart();
    }
    lastAuthRef.current = isAuthenticated;
  }, [isAuthenticated, syncCart]);

  const syncTimeoutRef = useRef(null);

  const addItem = useCallback(async (product) => {
    const qty = product.quantity || 1;
    const itemKey = product._id || product.id;
    
    if (isAuthenticated) {
      // Authenticated: use DB cart via runProtectedAction
      const action = async () => {
        setIsCartOpen(true);
        try {
          await addToCart({
            productId: itemKey,
            quantity: qty,
            productInfo: product,
          });
        } catch (err) {
          logger.error("Failed to add item to database cart:", err);
          toast.error(getErrorMessage(err, 'Unable to add item to bag'));
        }
      };
      runProtectedAction(action);
    } else {
      // Guest mode: update locally without requiring auth
      setGuestItems((prev) => {
        const existingIndex = prev.findIndex((item) => item.id === itemKey);
        let newItems = [];
        if (existingIndex >= 0) {
          newItems = [...prev];
          newItems[existingIndex] = { 
            ...newItems[existingIndex], 
            quantity: newItems[existingIndex].quantity + qty 
          };
        } else {
          newItems = [
            ...prev,
            {
              id: itemKey,
              _id: itemKey,
              title: product.title,
              price: product.price,
              oldPrice: product.oldPrice || product.price,
              stock: product.stock || 10,
              seller: product.seller || "Assured Craft Teams",
              rating: product.rating || 4.5,
              imageSrc: product.imageSrc,
              category: product.category,
              quantity: qty,
              variant: "Default",
            },
          ];
        }
        const subtotal = newItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
        setGuestSummary({
          subtotal,
          shippingFee: 0,
          platformFee: 0,
          discount: 0,
          total: subtotal,
        });
        return newItems;
      });
      setIsCartOpen(true);
    }
  }, [runProtectedAction, isAuthenticated, addToCart]);

  const removeItem = useCallback(async (id, variant) => {
    if (isAuthenticated) {
      const action = async () => {
        try {
          await removeFromCart({ productId: id });
        } catch (err) {
          logger.error("Failed to remove item from database cart:", err);
          toast.error(getErrorMessage(err, 'Unable to remove item from bag'));
        }
      };
      runProtectedAction(action);
    } else {
      // Guest mode: remove locally without requiring auth
      setGuestItems((prev) => {
        const newItems = prev.filter((item) => item.id !== id);
        const subtotal = newItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
        setGuestSummary({
          subtotal,
          shippingFee: 0,
          platformFee: 0,
          discount: 0,
          total: subtotal,
        });
        return newItems;
      });
    }
  }, [runProtectedAction, isAuthenticated, removeFromCart]);

  const updateQuantity = useCallback((id, variantOrQuantity, maybeQuantity) => {
    const quantity = maybeQuantity !== undefined ? maybeQuantity : variantOrQuantity;
    const numericQuantity = Number(quantity) || 1;
    
    if (numericQuantity < 1) {
      removeItem(id);
      return;
    }

    if (isAuthenticated) {
      const action = () => {
        // 1. Instantly update React Query Cache for responsiveness
        const previousCart = queryClient.getQueryData(['cart']);
        if (previousCart) {
          const updatedItems = previousCart.items.map((item) => {
            const itemId = item.product?._id || item.product?.id;
            if (itemId === id) {
              return { ...item, quantity: numericQuantity };
            }
            return item;
          });
          const subtotal = updatedItems.reduce((sum, item) => sum + (item.product?.price || 0) * item.quantity, 0);
          queryClient.setQueryData(['cart'], {
            ...previousCart,
            items: updatedItems,
            summary: {
              ...previousCart.summary,
              subtotal,
              total: subtotal + (previousCart.summary?.shippingFee || 0) + (previousCart.summary?.platformFee || 0),
            }
          });
        }

        // 2. Debounce server mutation to avoid spamming calls
        if (syncTimeoutRef.current) {
          clearTimeout(syncTimeoutRef.current);
        }

        syncTimeoutRef.current = setTimeout(async () => {
          const currentCart = queryClient.getQueryData(['cart']);
          const currentItems = currentCart?.items || [];
          const payload = currentItems.map((item) => ({
            product: item.product?._id || item.product?.id,
            quantity: item.quantity,
          }));
          try {
            await syncCart({ cartItems: payload });
          } catch (err) {
            logger.error("Failed to update cart quantity in database:", err);
            toast.error(getErrorMessage(err, 'Unable to update quantity'));
          }
        }, 500);
      };
      runProtectedAction(action);
    } else {
      // Guest mode: update locally without requiring auth
      setGuestItems((prev) => {
        const newItems = prev.map((item) => (item.id === id ? { ...item, quantity: numericQuantity } : item));
        const subtotal = newItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
        setGuestSummary({
          subtotal,
          shippingFee: 0,
          platformFee: 0,
          discount: 0,
          total: subtotal,
        });
        return newItems;
      });
    }
  }, [removeItem, runProtectedAction, isAuthenticated, syncCart, queryClient]);

  const clearCart = useCallback(async () => {
    const action = async () => {
      if (isAuthenticated) {
        try {
          await syncCart({ cartItems: [] });
        } catch (err) {
          logger.error("Failed to clear database cart:", err);
        }
      } else {
        setGuestItems([]);
        setGuestSummary({ subtotal: 0, shippingFee: 0, platformFee: 0, discount: 0, total: 0 });
      }
    };

    if (isAuthenticated) {
      action();
    }
  }, [isAuthenticated, syncCart]);

  const cartCount = useMemo(
    () => items.reduce((acc, item) => acc + item.quantity, 0),
    [items]
  );

  const subtotal = useMemo(() => summary.subtotal, [summary.subtotal]);
  
  const totalMRP = useMemo(
    () => items.reduce((acc, item) => acc + (item.oldPrice || item.price) * item.quantity, 0),
    [items]
  );

  const itemsMap = useMemo(() => {
    const map = new Map();
    items.forEach(item => map.set(item.id, item));
    return map;
  }, [items]);

  const isInCart = useCallback((id) => {
    return itemsMap.has(id);
  }, [itemsMap]);

  const stateValue = useMemo(
    () => ({
      items,
      cartCount,
      subtotal,
      totalMRP,
      summary,
      isCartOpen,
      loading: isAuthenticated ? cartLoading : false,
      claimedCoupon,
      appliedCoupon,
      isInCart,
    }),
    [items, cartCount, subtotal, totalMRP, summary, isCartOpen, cartLoading, claimedCoupon, appliedCoupon, isInCart, isAuthenticated]
  );

  const dispatchValue = useMemo(
    () => ({
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      setIsCartOpen,
      setClaimedCoupon,
      setAppliedCoupon,
    }),
    [addItem, removeItem, updateQuantity, clearCart, setIsCartOpen, setClaimedCoupon, setAppliedCoupon]
  );

  return (
    <CartStateContext.Provider value={stateValue}>
      <CartDispatchContext.Provider value={dispatchValue}>
        {children}
      </CartDispatchContext.Provider>
    </CartStateContext.Provider>
  );
}
