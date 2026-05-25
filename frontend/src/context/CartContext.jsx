import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { userService } from "../services/domainServices";
import { useAuth } from "./AuthContext";
import toast from "react-hot-toast";

import logger from '../utils/logger';
const CartStateContext = createContext(null);
const CartDispatchContext = createContext(null);

const CART_STORAGE_KEY = "siri_arts_cart";

export function CartProvider({ children }) {
  const { isAuthenticated, runProtectedAction, isAuthInitialized } = useAuth();
  const [items, setItems] = useState([]);
  const [claimedCoupon, setClaimedCoupon] = useState("");
  const itemsRef = useRef([]);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState({
    subtotal: 0,
    shippingFee: 0,
    platformFee: 0,
    discount: 0,
    total: 0,
  });

  const transformDbCart = useCallback((dbCart) => {
    if (!dbCart || !Array.isArray(dbCart)) return [];
    return dbCart
      .filter((item) => item.product) // filter out orphaned products
      .map((item) => ({
        id: item.product._id || item.product.id,
        _id: item.product._id || item.product.id,
        title: item.product.title,
        price: item.product.price,
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
          // Guest mode: Keep purely in-memory, reset to empty
          setItems([]);
          setSummary({ subtotal: 0, shippingFee: 0, platformFee: 0, discount: 0, total: 0 });
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

  const updateQuantity = useCallback(async (id, variantOrQuantity, maybeQuantity) => {
    const action = async () => {
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

      try {
        const payload = updatedItems.map((item) => ({
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
      summary,
      isCartOpen,
      loading,
      claimedCoupon,
      isInCart,
    }),
    [items, cartCount, subtotal, summary, isCartOpen, loading, claimedCoupon, isInCart]
  );

  const dispatchValue = useMemo(
    () => ({
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      setIsCartOpen,
      setClaimedCoupon,
    }),
    [addItem, removeItem, updateQuantity, clearCart, setIsCartOpen, setClaimedCoupon]
  );

  return (
    <CartStateContext.Provider value={stateValue}>
      <CartDispatchContext.Provider value={dispatchValue}>
        {children}
      </CartDispatchContext.Provider>
    </CartStateContext.Provider>
  );
}

// Backward compatible hook (triggers re-renders on any state change)
export function useCart() {
  const state = useContext(CartStateContext);
  const dispatch = useContext(CartDispatchContext);
  if (!state || !dispatch) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return { ...state, ...dispatch };
}

// Optimized hooks
export function useCartState() {
  const context = useContext(CartStateContext);
  if (!context) throw new Error("useCartState must be used within CartProvider");
  return context;
}

export function useCartDispatch() {
  const context = useContext(CartDispatchContext);
  if (!context) throw new Error("useCartDispatch must be used within CartProvider");
  return context;
}
