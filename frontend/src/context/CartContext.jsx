import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  useEffect,
  useRef,
} from "react";
import { userService } from "../services/domainServices";
import { useAuth } from "./AuthContext";
import toast from "react-hot-toast";

import logger from '../utils/logger';
const CartContext = createContext(null);

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

  // Helper to map DB cart shape to uniform frontend cart shape
  const transformDbCart = (dbCart) => {
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
  };

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
        if (err.name !== 'CanceledError') {
          logger.error("Cart synchronization failed:", err);
        }
      } finally {
        setLoading(false);
      }
    };

    initializeCart();
    return () => controller.abort();
  }, [isAuthenticated, isAuthInitialized]);

  const addItem = async (product) => {
    const qty = product.quantity || 1;
    
    const action = async () => {
      // Optimistic UI update
      setItems((prev) => {
        const existing = prev.find(
          (item) => item.id === (product._id || product.id)
        );
        if (existing) {
          return prev.map((item) =>
            item.id === (product._id || product.id)
              ? { ...item, quantity: item.quantity + qty }
              : item
          );
        }
        return [
          ...prev,
          {
            id: product._id || product.id,
            _id: product._id || product.id,
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
  };

  const removeItem = async (id, variant) => {
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
  };

  const updateQuantity = async (id, variantOrQuantity, maybeQuantity) => {
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
  };

  const clearCart = async () => {
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
  };

  const cartCount = useMemo(
    () => items.reduce((acc, item) => acc + item.quantity, 0),
    [items]
  );

  const subtotal = useMemo(() => summary.subtotal, [summary.subtotal]);

  const isInCart = (id) => {
    return items.some((item) => item.id === id);
  };

  const value = useMemo(
    () => ({
      items,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      cartCount,
      subtotal,
      summary,
      isCartOpen,
      setIsCartOpen,
      isInCart,
      loading,
      claimedCoupon,
      setClaimedCoupon,
    }),
    [items, cartCount, subtotal, summary, isCartOpen, loading, claimedCoupon]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
