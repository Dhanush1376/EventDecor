import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { CartStateContext, CartDispatchContext } from './CartContext';
import { useCartQuery, useCartMutations } from '../hooks/useCartQueries';
import { useOptimisticCartMutation } from '../hooks/useOptimisticCartMutation';
import { transformDbCart, cleanRentalInfo } from '../utils/ecommerce/cartCalculations';
import toast from 'react-hot-toast';
import logger from '../utils/core/logger';
import { persistentStorage } from '../utils/storage/persistentStorage';
import { userService, couponService } from '../services/domainServices';
import { useCartMerge } from '../hooks/useCartMerge';
import { useAutoApplyCoupon } from '../hooks/useAutoApplyCoupon';
export function CartProvider({ children }) {
  const { isAuthenticated, runProtectedAction } = useAuth();
  const { syncCart } = useCartMutations();

  const [activeCartMode, setActiveCartMode] = useState(() => {
    return persistentStorage.getItem('siri_cart_mode', { fallback: 'purchase' });
  });

  useEffect(() => {
    persistentStorage.setItem('siri_cart_mode', activeCartMode);
  }, [activeCartMode]);

  const emptySummary = useMemo(
    () => ({ subtotal: 0, shippingFee: 0, platformFee: 0, discount: 0, total: 0 }),
    [],
  );

  const getInitialCartState = () => {
    return persistentStorage.getItem('siri_cart_cache', {
      fallback: {
        purchaseCart: { items: [], summary: { ...emptySummary } },
        rentalCart: { items: [], summary: { ...emptySummary, depositTotal: 0 } },
      },
    });
  };

  const initialCache = getInitialCartState();
  const [guestPurchaseCart, setGuestPurchaseCart] = useState(
    () => initialCache.purchaseCart || { items: [], summary: emptySummary },
  );
  const [guestRentalCart, setGuestRentalCart] = useState(
    () => initialCache.rentalCart || { items: [], summary: { ...emptySummary, depositTotal: 0 } },
  );

  const [claimedCoupon, setClaimedCouponState] = useState(() => {
    return persistentStorage.getItem('siri_claimed_coupon', { fallback: '' });
  });

  const setClaimedCoupon = useCallback((code) => {
    setClaimedCouponState(code);
    persistentStorage.setItem('siri_claimed_coupon', code);
  }, []);

  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const { data: cartData, isLoading: cartLoading } = useCartQuery();

  const purchaseCart = useMemo(() => {
    if (isAuthenticated && cartData?.purchaseCart) {
      return {
        items: transformDbCart(cartData.purchaseCart.items),
        summary: cartData.purchaseCart.summary,
      };
    }
    return guestPurchaseCart;
  }, [isAuthenticated, cartData, guestPurchaseCart]);

  const rentalCart = useMemo(() => {
    if (isAuthenticated && cartData?.rentalCart) {
      return {
        items: transformDbCart(cartData.rentalCart.items),
        summary: cartData.rentalCart.summary,
      };
    }
    return guestRentalCart;
  }, [isAuthenticated, cartData, guestRentalCart]);

  const items = activeCartMode === 'purchase' ? purchaseCart.items : rentalCart.items;
  const summary = activeCartMode === 'purchase' ? purchaseCart.summary : rentalCart.summary;

  useEffect(() => {
    persistentStorage.setItem('siri_cart_cache', { purchaseCart, rentalCart });
  }, [purchaseCart, rentalCart]);

  const { addItem, attemptAddToCart, removeItem, updateQuantity, clearCart } =
    useOptimisticCartMutation({
      isAuthenticated,
      activeCartMode,
      setActiveCartMode,
      runProtectedAction,
      setIsCartOpen,
      emptySummary,
      setGuestPurchaseCart,
      setGuestRentalCart,
    });

  useCartMerge({
    isAuthenticated,
    syncCart,
    emptySummary,
    setGuestPurchaseCart,
    setGuestRentalCart,
  });

  const cartCount = useMemo(() => items.reduce((acc, item) => acc + item.quantity, 0), [items]);

  const purchaseCartCount = useMemo(
    () => purchaseCart.items.reduce((acc, item) => acc + item.quantity, 0),
    [purchaseCart.items],
  );
  const rentalCartCount = useMemo(
    () => rentalCart.items.reduce((acc, item) => acc + item.quantity, 0),
    [rentalCart.items],
  );

  const subtotal = summary.subtotal;

  const totalMRP = useMemo(
    () => items.reduce((acc, item) => acc + (item.oldPrice || item.price) * item.quantity, 0),
    [items],
  );

  const itemsMap = useMemo(() => {
    const map = new Map();
    items.forEach((item) => map.set(item.id, item));
    return map;
  }, [items]);

  const isInCart = useCallback(
    (id) => {
      return itemsMap.has(id);
    },
    [itemsMap],
  );

  const stateValue = useMemo(
    () => ({
      items,
      cartCount,
      purchaseCartCount,
      rentalCartCount,
      purchaseCart,
      rentalCart,
      activeCartMode,
      subtotal,
      totalMRP,
      summary,
      isCartOpen,
      loading: isAuthenticated ? cartLoading : false,
      claimedCoupon,
      appliedCoupon,
      isInCart,
    }),
    [
      items,
      cartCount,
      purchaseCartCount,
      rentalCartCount,
      purchaseCart,
      rentalCart,
      activeCartMode,
      subtotal,
      totalMRP,
      summary,
      isCartOpen,
      cartLoading,
      claimedCoupon,
      appliedCoupon,
      isInCart,
      isAuthenticated,
    ],
  );

  const dispatchValue = useMemo(
    () => ({
      addItem,
      attemptAddToCart,
      removeItem,
      updateQuantity,
      clearCart,
      setIsCartOpen,
      setActiveCartMode,
      setClaimedCoupon,
      setAppliedCoupon,
    }),
    [
      addItem,
      attemptAddToCart,
      removeItem,
      updateQuantity,
      clearCart,
      setIsCartOpen,
      setActiveCartMode,
      setClaimedCoupon,
      setAppliedCoupon,
    ],
  );

  useAutoApplyCoupon({ claimedCoupon, subtotal, setAppliedCoupon, isAuthenticated });

  return (
    <CartStateContext.Provider value={stateValue}>
      <CartDispatchContext.Provider value={dispatchValue}>{children}</CartDispatchContext.Provider>
    </CartStateContext.Provider>
  );
}
