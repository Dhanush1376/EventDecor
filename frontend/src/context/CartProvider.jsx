import { useState, useMemo, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { CartStateContext, CartDispatchContext } from './CartContext';
import { useCartQuery } from '../hooks/useCartQueries';
import { useOptimisticCartMutation } from '../hooks/useOptimisticCartMutation';
import { transformDbCart } from '../utils/ecommerce/cartCalculations';
import { persistentStorage } from '../utils/storage/persistentStorage';
import { logCartTrace, forensicHashId } from '../utils/forensic/cartTrace';

export function CartProvider({ children }) {
  const { isAuthenticated, runProtectedAction } = useAuth();

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

  const emptyCart = useMemo(() => ({ items: [], summary: emptySummary }), [emptySummary]);
  const emptyRentalCart = useMemo(
    () => ({ items: [], summary: { ...emptySummary, depositTotal: 0 } }),
    [emptySummary],
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
      const rawItems = cartData.purchaseCart.items || [];
      const rawProductHashes = rawItems.map((i) =>
        forensicHashId(i?.product?._id || i?.product?.id || i?._id || i?.id),
      );

      logCartTrace('CART_PROVIDER_RAW', {
        cartType: 'purchase',
        rawItemCount: rawItems.length,
        rawProductHashes,
        source: 'CartProvider.purchaseCart',
      });

      const transformed = transformDbCart(rawItems);
      const transformedProductHashes = transformed.map((i) =>
        forensicHashId(i?.product?._id || i?.product?.id || i?._id || i?.id),
      );

      const removedProductHashes = rawProductHashes.filter(
        (h) => !transformedProductHashes.includes(h),
      );

      logCartTrace('CART_PROVIDER_TRANSFORMED', {
        cartType: 'purchase',
        transformedItemCount: transformed.length,
        transformedProductHashes,
        removedProductHashes,
        source: 'CartProvider.purchaseCart',
      });

      return {
        items: transformed,
        summary: cartData.purchaseCart.summary,
      };
    }
    return emptyCart;
  }, [isAuthenticated, cartData, emptyCart]);

  const rentalCart = useMemo(() => {
    if (isAuthenticated && cartData?.rentalCart) {
      const rawItems = cartData.rentalCart.items || [];
      const rawProductHashes = rawItems.map((i) =>
        forensicHashId(i?.product?._id || i?.product?.id || i?._id || i?.id),
      );

      logCartTrace('CART_PROVIDER_RAW', {
        cartType: 'rental',
        rawItemCount: rawItems.length,
        rawProductHashes,
        source: 'CartProvider.rentalCart',
      });

      const transformed = transformDbCart(rawItems);
      const transformedProductHashes = transformed.map((i) =>
        forensicHashId(i?.product?._id || i?.product?.id || i?._id || i?.id),
      );

      const removedProductHashes = rawProductHashes.filter(
        (h) => !transformedProductHashes.includes(h),
      );

      logCartTrace('CART_PROVIDER_TRANSFORMED', {
        cartType: 'rental',
        transformedItemCount: transformed.length,
        transformedProductHashes,
        removedProductHashes,
        source: 'CartProvider.rentalCart',
      });

      return {
        items: transformed,
        summary: cartData.rentalCart.summary,
      };
    }
    return emptyRentalCart;
  }, [isAuthenticated, cartData, emptyRentalCart]);

  const customCart = emptyCart;

  const items =
    activeCartMode === 'purchase'
      ? purchaseCart.items
      : activeCartMode === 'rental'
        ? rentalCart.items
        : customCart.items;
  const summary =
    activeCartMode === 'purchase'
      ? purchaseCart.summary
      : activeCartMode === 'rental'
        ? rentalCart.summary
        : customCart.summary;

  const { addItem, attemptAddToCart, removeItem, updateQuantity, clearCart } =
    useOptimisticCartMutation({
      isAuthenticated,
      activeCartMode,
      setActiveCartMode,
      runProtectedAction,
      setIsCartOpen,
      emptySummary,
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
  const customCartCount = useMemo(
    () => customCart.items.reduce((acc, item) => acc + item.quantity, 0),
    [customCart.items],
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
      customCartCount,
      purchaseCart,
      rentalCart,
      customCart,
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
      customCartCount,
      purchaseCart,
      rentalCart,
      customCart,
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

  return (
    <CartStateContext.Provider value={stateValue}>
      <CartDispatchContext.Provider value={dispatchValue}>{children}</CartDispatchContext.Provider>
    </CartStateContext.Provider>
  );
}
