import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  useEffect,
} from "react";
import { userService } from "../services/domainServices";
import { useAuth } from "./AuthContext";
import toast from "react-hot-toast";

const CartContext = createContext(null);

const CART_STORAGE_KEY = "siri_arts_cart";

export function CartProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [items, setItems] = useState([]);
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

  // 1. Initial Load and Synchronization on Auth State Changes with a valid token safeguard
  useEffect(() => {
    const initializeCart = async () => {
      setLoading(true);
      try {
        if (isAuthenticated) {
          // Logged in: Sync local items first (merge) then load final cart from database
          const localSaved = localStorage.getItem(CART_STORAGE_KEY);
          let localItems = [];
          if (localSaved) {
            try {
              localItems = JSON.parse(localSaved) || [];
            } catch (e) {
              console.error("Failed to parse local cart:", e);
            }
          }

          if (localItems.length > 0) {
            // Merge guest cart items into database cart
            const payload = localItems.map((item) => ({
              product: item.id || item._id,
              quantity: item.quantity,
            }));
            const res = await userService.syncCart(payload);
            setItems(transformDbCart(res.data?.items));
            setSummary(res.data?.summary || summary);
            // Empty local storage after successful sync
            localStorage.removeItem(CART_STORAGE_KEY);
          } else {
            // No local items: Just retrieve database cart
            const res = await userService.getCart();
            setItems(transformDbCart(res.data?.items));
            setSummary(res.data?.summary || summary);
          }
        } else {
          // Guest mode: Load from localStorage
          const saved = localStorage.getItem(CART_STORAGE_KEY);
          if (saved) {
            const parsed = JSON.parse(saved) || [];
            setItems(parsed);
            const guestSubtotal = parsed.reduce((acc, item) => acc + item.price * item.quantity, 0);
            setSummary({
              subtotal: guestSubtotal,
              shippingFee: guestSubtotal > 2000 || guestSubtotal === 0 ? 0 : 100,
              platformFee: 0,
              discount: 0,
              total: guestSubtotal + (guestSubtotal > 2000 || guestSubtotal === 0 ? 0 : 100)
            });
          } else {
            setItems([]);
            setSummary({ subtotal: 0, shippingFee: 0, platformFee: 0, discount: 0, total: 0 });
          }
        }
      } catch (err) {
        console.error("Cart synchronization failed:", err);
      } finally {
        setLoading(false);
      }
    };

    initializeCart();
  }, [isAuthenticated]);

  // 2. Save to localStorage ONLY when guest to prevent out-of-sync states
  useEffect(() => {
    if (!isAuthenticated) {
      try {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
      } catch (error) {
        console.error("Failed to save cart to local storage:", error);
      }
    }
  }, [items, isAuthenticated]);

  const addItem = async (product) => {
    const qty = product.quantity || 1;
    
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

    // Persist to MongoDB
    if (isAuthenticated) {
      try {
        const res = await userService.addToCart(product._id || product.id, qty);
        setItems(transformDbCart(res.data?.items));
        setSummary(res.data?.summary);
      } catch (err) {
        console.error("Failed to add item to database cart:", err);
        toast.error("Shopping bag synchronization failed");
      }
    }
  };

  const removeItem = async (id, variant) => {
    // Optimistic UI update
    setItems((prev) => prev.filter((item) => item.id !== id));

    // Persist to MongoDB
    if (isAuthenticated) {
      try {
        const res = await userService.removeFromCart(id);
        setItems(transformDbCart(res.data?.items));
        setSummary(res.data?.summary);
      } catch (err) {
        console.error("Failed to remove item from database cart:", err);
        toast.error("Failed to remove item from cloud bag");
      }
    }
  };

  const updateQuantity = async (id, variantOrQuantity, maybeQuantity) => {
    // Support both (id, quantity) and (id, variant, quantity) signatures
    const quantity = maybeQuantity !== undefined ? maybeQuantity : variantOrQuantity;
    const numericQuantity = Number(quantity) || 1;
    
    if (numericQuantity < 1) {
      removeItem(id);
      return;
    }

    // Optimistic UI update — capture the new items for sync
    let updatedItems;
    setItems((prev) => {
      updatedItems = prev.map((item) => (item.id === id ? { ...item, quantity: numericQuantity } : item));
      return updatedItems;
    });

    // Persist to MongoDB using the updated items (not stale `items` state)
    if (isAuthenticated) {
      try {
        // Wait a tick for state to settle, then use updatedItems
        const payload = (updatedItems || items).map((item) => ({
          product: item.id || item._id,
          quantity: (item.id || item._id) === id ? numericQuantity : item.quantity,
        }));
        const res = await userService.syncCart(payload);
        setItems(transformDbCart(res.data?.items));
        setSummary(res.data?.summary);
      } catch (err) {
        console.error("Failed to update cart quantity in database:", err);
        toast.error("Failed to sync quantity update");
      }
    }
  };

  const clearCart = async () => {
    setItems([]);
    setSummary({ subtotal: 0, shippingFee: 0, platformFee: 0, discount: 0, total: 0 });
    if (isAuthenticated) {
      try {
        await userService.syncCart([]);
      } catch (err) {
        console.error("Failed to clear database cart:", err);
      }
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
    }),
    [items, cartCount, subtotal, summary, isCartOpen, loading]
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
