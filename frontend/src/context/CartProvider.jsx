import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { userService } from "../services/domainServices";
import { useAuth } from "./AuthContext";
import { CartStateContext, CartDispatchContext } from "./CartContext";
import toast from "react-hot-toast";
import logger from '../utils/logger';

export function CartProvider({ children }) {
  const { isAuthenticated, runProtectedAction, isAuthInitialized } = useAuth();
  const getInitialCartState = () => {
    try {
      if (typeof window !== 'undefined') {
        const cached = localStorage.getItem('siri_cart_cache');
        if (cached) return JSON.parse(cached);
      }
    } catch (e) {}
    return { items: [], summary: { subtotal: 0, shippingFee: 0, platformFee: 0, discount: 0, total: 0 } };
  };

  const initialState = getInitialCartState();
  const [items, setItems] = useState(initialState.items);
  const [claimedCoupon, setClaimedCoupon] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState("");
  const itemsRef = useRef(initialState.items);
  
  const [summary, setSummary] = useState(initialState.summary);

  useEffect(() => {
    itemsRef.current = items;
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('siri_cart_cache', JSON.stringify({ items, summary }));
      }
    } catch (e) {}
  }, [items, summary]);

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const syncTimeoutRef = useRef(null);

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

  // 1. Initial Load and Synchronization on Auth State Changes
  useEffect(() => {
    const controller = new AbortController();
    const initializeCart = async () => {
      if (!isAuthInitialized) return;
      setLoading(true);
      try {
        if (isAuthenticated) {
          // Retrieve database cart
          const res = await userService.getCart({ signal: controller.signal });
          setItems(transformDbCart(res.data?.items));
          setSummary(res.data?.summary || summary);
        } else {
          // Guest mode: Keep purely in-memory. 
          // Do not reset to empty because we want to preserve localStorage cart.
        }
      } catch (err) {
        if (err.name !== 'CanceledError' && err?.code !== 'ERR_NO_SESSION' && err?.message !== 'Not authenticated') {
          logger.error("Cart synchronization failed:", err);
        }
      } finally {
        setLoading(false);
      }
    };

    initializeCart();
    return () => controller.abort();
  }, [isAuthenticated, isAuthInitialized, transformDbCart]);

  const addItem = useCallback(async (product) => {
    const qty = product.quantity || 1;
    
    const action = async () => {
      // Optimistic UI update
      setItems((prev) => {
        const itemKey = product._id || product.id;
        const existingIndex = prev.findIndex((item) => item.id === itemKey);
        
        if (existingIndex >= 0) {
          const newItems = [...prev];
          newItems[existingIndex] = { ...newItems[existingIndex], quantity: newItems[existingIndex].quantity + qty };
          return newItems;
        }
        return [
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
      });

      setIsCartOpen(true);

      try {
        const res = await userService.addToCart(product._id || product.id, qty);
        setItems(transformDbCart(res.data?.items));
        setSummary(res.data?.summary);
      } catch (err) {
        logger.error("Failed to add item to database cart:", err);
        toast.error("Shopping bag synchronization failed");
      }
    };

    runProtectedAction(action);
  }, [runProtectedAction, transformDbCart]);

  const removeItem = useCallback(async (id, variant) => {
    const action = async () => {
      // Optimistic UI update
      setItems((prev) => prev.filter((item) => item.id !== id));

      try {
        const res = await userService.removeFromCart(id);
        setItems(transformDbCart(res.data?.items));
        setSummary(res.data?.summary);
      } catch (err) {
        logger.error("Failed to remove item from database cart:", err);
        toast.error("Failed to remove item from cloud bag");
      }
    };

    runProtectedAction(action);
  }, [runProtectedAction, transformDbCart]);

  const updateQuantity = useCallback((id, variantOrQuantity, maybeQuantity) => {
    const action = () => {
      // Support both (id, quantity) and (id, variant, quantity) signatures
      const quantity = maybeQuantity !== undefined ? maybeQuantity : variantOrQuantity;
      const numericQuantity = Number(quantity) || 1;
      
      if (numericQuantity < 1) {
        removeItem(id);
        return;
      }

      // Synchronous optimistic UI update utilizing itemsRef to prevent stale closure races
      const currentItems = itemsRef.current;
      const updatedItems = currentItems.map((item) => (item.id === id ? { ...item, quantity: numericQuantity } : item));
      setItems(updatedItems);
      itemsRef.current = updatedItems;

      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }

      syncTimeoutRef.current = setTimeout(async () => {
        try {
          const payload = itemsRef.current.map((item) => ({
            product: item.id || item._id,
            quantity: item.quantity,
          }));
          const res = await userService.syncCart(payload);
          const transformed = transformDbCart(res.data?.items);
          setItems(transformed);
          itemsRef.current = transformed;
          setSummary(res.data?.summary);
        } catch (err) {
          logger.error("Failed to update cart quantity in database:", err);
          toast.error("Failed to sync quantity update");
        }
      }, 500);
    };

    runProtectedAction(action);
  }, [removeItem, runProtectedAction, transformDbCart]);

  const clearCart = useCallback(async () => {
    const action = async () => {
      setItems([]);
      setSummary({ subtotal: 0, shippingFee: 0, platformFee: 0, discount: 0, total: 0 });
      try {
        await userService.syncCart([]);
      } catch (err) {
        logger.error("Failed to clear database cart:", err);
      }
    };

    if (isAuthenticated) {
      action();
    }
  }, [isAuthenticated]);

  const cartCount = useMemo(
    () => items.reduce((acc, item) => acc + item.quantity, 0),
    [items]
  );

  const subtotal = useMemo(() => summary.subtotal, [summary.subtotal]);
  
  const totalMRP = useMemo(
    () => items.reduce((acc, item) => acc + (item.oldPrice || item.price) * item.quantity, 0),
    [items]
  );

  // O(1) lookup map derived from items array to prevent O(n) scans
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
      loading,
      claimedCoupon,
      appliedCoupon,
      isInCart,
    }),
    [items, cartCount, subtotal, totalMRP, summary, isCartOpen, loading, claimedCoupon, appliedCoupon, isInCart]
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
