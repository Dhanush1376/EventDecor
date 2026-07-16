import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from './AuthContext';
import { CartStateContext, CartDispatchContext } from './CartContext';
import { useCartQuery } from '../hooks/useCartQueries';
import { useOptimisticCartMutation } from '../hooks/useOptimisticCartMutation';
import { transformDbCart } from '../utils/ecommerce/cartCalculations';
import { persistentStorage } from '../utils/storage/persistentStorage';
import { logCartTrace, forensicHashId } from '../utils/forensic/cartTrace';
import { GuestCartService } from '../services/GuestCartService';
import { userService } from '../services/api/userService';

export function CartProvider({ children }) {
  const { isAuthenticated, runProtectedAction } = useAuth();
  const queryClient = useQueryClient();

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

  // Guest Cart Local State
  const [guestCart, setGuestCart] = useState(() => GuestCartService.getCart());

  // Merge Guest Cart on Login
  const prevAuth = useRef(isAuthenticated);
  const [isMerging, setIsMerging] = useState(false);

  useEffect(() => {
    const handleLoginSync = async () => {
      if (!prevAuth.current && isAuthenticated) {
        if (GuestCartService.hasItems()) {
          const guestItems = GuestCartService.getCartItemsForSync();
          setIsMerging(true);
          try {
            const { data } = await userService.mergeGuestCart(guestItems);

            // Validate returned cart format to prevent query cache corruption
            if (data?.cart) {
              // Invalidate query to fetch the newly merged cart
              await queryClient.invalidateQueries({ queryKey: ['cart', 'authenticated'] });
            }

            GuestCartService.clearCart();
            setGuestCart(GuestCartService.getCart()); // Reset local state

            if (data?.droppedItems?.length > 0) {
              const count = data.droppedItems.length;
              toast.error(`${count} item(s) were removed because they are no longer available.`);
            }
            toast.success('Your guest cart has been merged successfully.');
            setIsCartOpen(true);
          } catch (err) {
            console.error('Failed to merge guest cart', err);
            toast.error('Failed to sync guest cart. Please check your bag.');
          } finally {
            setIsMerging(false);
          }
        }
      }
      prevAuth.current = isAuthenticated;
    };

    handleLoginSync();
  }, [isAuthenticated, queryClient]);

  const { data: cartData, isLoading: cartLoading } = useCartQuery();

  const purchaseCart = useMemo(() => {
    if (isAuthenticated) {
      if (cartData?.purchaseCart) {
        const rawItems = cartData.purchaseCart.items || [];
        const transformed = transformDbCart(rawItems);
        return {
          items: transformed,
          summary: cartData.purchaseCart.summary,
        };
      }
      return emptyCart;
    }
    // Return Guest Cart
    const guestItems = guestCart.purchaseCart?.items || [];
    return {
      items: transformDbCart(guestItems),
      summary: guestCart.purchaseCart?.summary || emptyCart.summary,
    };
  }, [isAuthenticated, cartData, guestCart, emptyCart]);

  const rentalCart = useMemo(() => {
    if (isAuthenticated) {
      if (cartData?.rentalCart) {
        const rawItems = cartData.rentalCart.items || [];
        const transformed = transformDbCart(rawItems);
        return {
          items: transformed,
          summary: cartData.rentalCart.summary,
        };
      }
      return emptyRentalCart;
    }
    // Return Guest Cart
    const guestItems = guestCart.rentalCart?.items || [];
    return {
      items: transformDbCart(guestItems),
      summary: guestCart.rentalCart?.summary || emptyRentalCart.summary,
    };
  }, [isAuthenticated, cartData, guestCart, emptyRentalCart]);

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

  const {
    addItem: optAddItem,
    removeItem: optRemoveItem,
    updateQuantity: optUpdateQuantity,
    clearCart: optClearCart,
  } = useOptimisticCartMutation({
    isAuthenticated,
    activeCartMode,
    setActiveCartMode,
    runProtectedAction, // Note: we'll bypass this in useOptimisticCartMutation shortly
    setIsCartOpen,
    emptySummary,
  });

  // Abstracted Cart Actions
  const addItem = useCallback(
    (product) => {
      setIsCartOpen(true);
      if (isAuthenticated) {
        optAddItem(product);
      } else {
        GuestCartService.addToCart(
          product,
          product.quantity || 1,
          product.type || 'purchase',
          product.rentalInfo,
        );
        setGuestCart(GuestCartService.getCart());
      }
    },
    [isAuthenticated, optAddItem],
  );

  const attemptAddToCart = useCallback(
    (product) => {
      const itemType = product.type || 'purchase';
      if (itemType !== activeCartMode) {
        toast(
          `Switched to ${itemType === 'rental' ? 'Rental' : itemType === 'custom' ? 'Custom' : 'Purchase'} Cart to add this item`,
        );
        setActiveCartMode(itemType);
      }
      addItem(product);
    },
    [activeCartMode, addItem],
  );

  const removeItem = useCallback(
    (id) => {
      if (isAuthenticated) {
        optRemoveItem(id);
      } else {
        GuestCartService.removeFromCart(id, activeCartMode);
        setGuestCart(GuestCartService.getCart());
      }
    },
    [isAuthenticated, optRemoveItem, activeCartMode],
  );

  const updateQuantity = useCallback(
    (id, variantOrQuantity, maybeQuantity) => {
      if (isAuthenticated) {
        optUpdateQuantity(id, variantOrQuantity, maybeQuantity);
      } else {
        const quantity = maybeQuantity !== undefined ? maybeQuantity : variantOrQuantity;
        GuestCartService.updateQuantity(id, quantity, activeCartMode);
        setGuestCart(GuestCartService.getCart());
      }
    },
    [isAuthenticated, optUpdateQuantity, activeCartMode],
  );

  const clearCart = useCallback(() => {
    if (isAuthenticated) {
      optClearCart();
    } else {
      GuestCartService.clearCart();
      setGuestCart(GuestCartService.getCart());
    }
  }, [isAuthenticated, optClearCart]);

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

  const subtotal = summary?.subtotal || 0;

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
      summary: summary || emptySummary,
      isCartOpen,
      loading: (isAuthenticated ? cartLoading : false) || isMerging,
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
      emptySummary,
      isCartOpen,
      cartLoading,
      isMerging,
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
