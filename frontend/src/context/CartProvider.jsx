import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useCartQuery, useCartMutations } from '../hooks/useCartQueries';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import logger from '../utils/logger';
import { persistentStorage } from '../utils/persistentStorage';
import { userService } from '../services/domainServices';
import { getErrorMessage } from '../utils/errorHelpers';

export function CartProvider({ children }) {
  const { isAuthenticated, runProtectedAction } = useAuth();
  const queryClient = useQueryClient();

  const [activeCartMode, setActiveCartMode] = useState(() => {
    return persistentStorage.getItem('siri_cart_mode', { fallback: 'purchase' });
  });

  useEffect(() => {
    persistentStorage.setItem('siri_cart_mode', activeCartMode);
  }, [activeCartMode]);

  const emptySummary = { subtotal: 0, shippingFee: 0, platformFee: 0, discount: 0, total: 0 };

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

  const [claimedCoupon, setClaimedCoupon] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState('');
  const [isCartOpen, setIsCartOpen] = useState(false);

  const { data: cartData, isLoading: cartLoading } = useCartQuery();
  const { addToCart, removeFromCart, syncCart } = useCartMutations();

  const transformDbCart = useCallback((dbCartItems) => {
    if (!dbCartItems || !Array.isArray(dbCartItems)) return [];
    return dbCartItems
      .filter((item) => item.product)
      .map((item) => ({
        id: item.product._id || item.product.id,
        _id: item.product._id || item.product.id,
        title: item.product.title,
        price: item.product.price,
        oldPrice: item.product.oldPrice || item.product.price,
        stock: item.product.stock || 0,
        seller: item.product.seller || 'Siri Arts Artisans',
        rating: item.product.rating || 0,
        imageSrc: item.product.imageSrc,
        category: item.product.category,
        quantity: item.quantity,
        variant: item.variant || 'Default',
        type: item.type || 'purchase',
        rentalInfo: item.rentalInfo,
        deposit: item.deposit || 0,
        isNonRefundable: item.product.isNonRefundable,
        customizationConfig: item.product.customizationConfig,
        product: item.product,
      }));
  }, []);

  const purchaseCart = useMemo(() => {
    if (isAuthenticated && cartData?.purchaseCart) {
      return {
        items: transformDbCart(cartData.purchaseCart.items),
        summary: cartData.purchaseCart.summary,
      };
    }
    return guestPurchaseCart;
  }, [isAuthenticated, cartData, guestPurchaseCart, transformDbCart]);

  const rentalCart = useMemo(() => {
    if (isAuthenticated && cartData?.rentalCart) {
      return {
        items: transformDbCart(cartData.rentalCart.items),
        summary: cartData.rentalCart.summary,
      };
    }
    return guestRentalCart;
  }, [isAuthenticated, cartData, guestRentalCart, transformDbCart]);

  // Derived state based on active mode (for backward compatibility with components expecting a single cart)
  const items = activeCartMode === 'purchase' ? purchaseCart.items : rentalCart.items;
  const summary = activeCartMode === 'purchase' ? purchaseCart.summary : rentalCart.summary;

  useEffect(() => {
    persistentStorage.setItem('siri_cart_cache', { purchaseCart, rentalCart });
  }, [purchaseCart, rentalCart]);

  const lastAuthRef = useRef(isAuthenticated);

  useEffect(() => {
    if (isAuthenticated && !lastAuthRef.current) {
      const mergeGuestCart = async () => {
        try {
          const guestCart = persistentStorage.getItem('siri_cart_cache');
          const allGuestItems = [
            ...(guestCart?.purchaseCart?.items || []),
            ...(guestCart?.rentalCart?.items || []),
          ];

          if (allGuestItems.length > 0) {
            logger.info(
              '[Cart] Merging guest cart items with authenticated database cart upon sign-in:',
              allGuestItems,
            );

            const dbCartRes = await userService.getCart();
            const dbPurchaseItems = dbCartRes?.success
              ? dbCartRes.data?.purchaseCart?.items || []
              : [];
            const dbRentalItems = dbCartRes?.success ? dbCartRes.data?.rentalCart?.items || [] : [];
            const allDbItems = [...dbPurchaseItems, ...dbRentalItems];

            const mergedPayloadMap = new Map();

            allDbItems.forEach((item) => {
              const pId = item.product?._id || item.product?.id || item.product;
              if (pId) mergedPayloadMap.set(pId, item);
            });

            allGuestItems.forEach((item) => {
              const pId = item._id || item.id;
              if (pId) {
                const existing = mergedPayloadMap.get(pId);
                if (existing) {
                  existing.quantity += item.quantity;
                } else {
                  mergedPayloadMap.set(pId, {
                    product: pId,
                    quantity: item.quantity,
                    type: item.type || 'purchase',
                    rentalInfo: item.rentalInfo,
                    deposit: item.deposit,
                  });
                }
              }
            });

            const syncPayload = Array.from(mergedPayloadMap.values()).map((item) => {
              const rInfo =
                item.rentalInfo && Object.keys(item.rentalInfo).length > 0
                  ? item.rentalInfo
                  : undefined;
              return {
                product:
                  item.product?._id || item.product?.id || item._id || item.id || item.product,
                quantity: item.quantity,
                type: item.type || 'purchase',
                rentalInfo: rInfo,
                deposit: item.deposit,
              };
            });

            await syncCart({ cartItems: syncPayload });
            toast.success('Your guest shopping bag was merged successfully!');
          }

          setGuestPurchaseCart({ items: [], summary: emptySummary });
          setGuestRentalCart({ items: [], summary: { ...emptySummary, depositTotal: 0 } });
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

  const attemptAddToCart = useCallback(
    async (product) => {
      const itemType = product.type || 'purchase';

      if (itemType !== activeCartMode) {
        toast(
          `Switched to ${itemType === 'rental' ? 'Rental' : 'Purchase'} Cart to add this item`,
          { icon: '🔄' },
        );
        setActiveCartMode(itemType);
      }

      addItem(product);
    },
    [activeCartMode],
  );

  const addItem = useCallback(
    async (product) => {
      const qty = product.quantity || 1;
      const itemKey = product._id || product.id;
      const itemType = product.type || 'purchase';

      if (isAuthenticated) {
        const action = async () => {
          setIsCartOpen(true);
          try {
            await addToCart({
              productId: itemKey,
              quantity: qty,
              type: itemType,
              rentalInfo: product.rentalInfo,
              productInfo: product,
            });
          } catch (err) {
            logger.error('Failed to add item to database cart:', err);
            toast.error(getErrorMessage(err, 'Unable to add item to bag'));
          }
        };
        runProtectedAction(action);
      } else {
        const setTargetCart = itemType === 'purchase' ? setGuestPurchaseCart : setGuestRentalCart;

        setTargetCart((prev) => {
          const prevItems = prev.items || [];
          const existingIndex = prevItems.findIndex((item) => item.id === itemKey);
          let newItems;
          if (existingIndex >= 0) {
            newItems = [...prevItems];
            newItems[existingIndex] = {
              ...newItems[existingIndex],
              quantity: newItems[existingIndex].quantity + qty,
            };
          } else {
            newItems = [
              ...prevItems,
              {
                id: itemKey,
                _id: itemKey,
                title: product.title,
                price: product.price,
                oldPrice: product.oldPrice || product.price,
                stock: product.stock || 10,
                seller: product.seller || 'Assured Craft Teams',
                rating: product.rating || 4.5,
                imageSrc: product.imageSrc,
                category: product.category,
                quantity: qty,
                variant: 'Default',
                type: itemType,
                deposit: product.deposit || 0,
                rentalInfo: product.rentalInfo,
                isNonRefundable: product.isNonRefundable || false,
                customizationConfig: product.customizationConfig,
                product: product,
              },
            ];
          }

          const subtotal = newItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
          let depositTotal = 0;
          if (itemType === 'rental') {
            depositTotal = newItems.reduce(
              (sum, item) => sum + (item.deposit || 0) * item.quantity,
              0,
            );
          }

          return {
            items: newItems,
            summary: {
              ...prev.summary,
              subtotal,
              total: subtotal + depositTotal,
              depositTotal,
            },
          };
        });
        setIsCartOpen(true);
      }
    },
    [runProtectedAction, isAuthenticated, addToCart],
  );

  const removeItem = useCallback(
    async (id, variant) => {
      if (isAuthenticated) {
        const action = async () => {
          try {
            await removeFromCart({ productId: id });
          } catch (err) {
            logger.error('Failed to remove item from database cart:', err);
            toast.error(getErrorMessage(err, 'Unable to remove item from bag'));
          }
        };
        runProtectedAction(action);
      } else {
        const setTargetCart =
          activeCartMode === 'purchase' ? setGuestPurchaseCart : setGuestRentalCart;

        setTargetCart((prev) => {
          const newItems = prev.items.filter((item) => item.id !== id);
          const subtotal = newItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
          let depositTotal = 0;
          if (activeCartMode === 'rental') {
            depositTotal = newItems.reduce(
              (sum, item) => sum + (item.deposit || 0) * item.quantity,
              0,
            );
          }

          return {
            items: newItems,
            summary: {
              ...prev.summary,
              subtotal,
              total: subtotal + depositTotal,
              depositTotal,
            },
          };
        });
      }
    },
    [runProtectedAction, isAuthenticated, removeFromCart, activeCartMode],
  );

  const updateQuantity = useCallback(
    (id, variantOrQuantity, maybeQuantity) => {
      const quantity = maybeQuantity !== undefined ? maybeQuantity : variantOrQuantity;
      const numericQuantity = Number(quantity) || 1;

      if (numericQuantity < 1) {
        removeItem(id);
        return;
      }

      if (isAuthenticated) {
        const action = () => {
          const previousCart = queryClient.getQueryData(['cart']);
          if (previousCart) {
            // Optimistically update the exact cart (purchase vs rental)
            let targetCartKey = activeCartMode === 'purchase' ? 'purchaseCart' : 'rentalCart';
            const updatedItems = previousCart[targetCartKey].items.map((item) => {
              const itemId = item.product?._id || item.product?.id;
              if (itemId === id) {
                return { ...item, quantity: numericQuantity };
              }
              return item;
            });

            const subtotal = updatedItems.reduce(
              (sum, item) => sum + (item.product?.price || 0) * item.quantity,
              0,
            );
            const depositTotal =
              activeCartMode === 'rental'
                ? updatedItems.reduce(
                    (sum, item) => sum + (item.product?.securityDeposit || 0) * item.quantity,
                    0,
                  )
                : 0;
            const total =
              subtotal + depositTotal + (previousCart[targetCartKey].summary?.shippingFee || 0);

            queryClient.setQueryData(['cart'], {
              ...previousCart,
              [targetCartKey]: {
                ...previousCart[targetCartKey],
                items: updatedItems,
                summary: {
                  ...previousCart[targetCartKey].summary,
                  subtotal,
                  depositTotal,
                  total,
                },
              },
            });
          }

          if (syncTimeoutRef.current) {
            clearTimeout(syncTimeoutRef.current);
          }

          syncTimeoutRef.current = setTimeout(async () => {
            const currentCart = queryClient.getQueryData(['cart']);
            const allItems = [
              ...(currentCart?.purchaseCart?.items || []),
              ...(currentCart?.rentalCart?.items || []),
            ];

            const payload = allItems.map((item) => {
              const rInfo =
                item.rentalInfo && Object.keys(item.rentalInfo).length > 0
                  ? item.rentalInfo
                  : undefined;
              return {
                product:
                  item.product?._id || item.product?.id || item._id || item.id || item.product,
                quantity: item.quantity,
                type: item.type || 'purchase',
                rentalInfo: rInfo,
                deposit: item.deposit,
              };
            });
            try {
              await syncCart({ cartItems: payload });
            } catch (err) {
              logger.error('Failed to update cart quantity in database:', err);
              toast.error(getErrorMessage(err, 'Unable to update quantity'));
            }
          }, 500);
        };
        runProtectedAction(action);
      } else {
        const setTargetCart =
          activeCartMode === 'purchase' ? setGuestPurchaseCart : setGuestRentalCart;

        setTargetCart((prev) => {
          const newItems = prev.items.map((item) =>
            item.id === id ? { ...item, quantity: numericQuantity } : item,
          );
          const subtotal = newItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
          let depositTotal = 0;
          if (activeCartMode === 'rental') {
            depositTotal = newItems.reduce(
              (sum, item) => sum + (item.deposit || 0) * item.quantity,
              0,
            );
          }

          return {
            items: newItems,
            summary: {
              ...prev.summary,
              subtotal,
              total: subtotal + depositTotal,
              depositTotal,
            },
          };
        });
      }
    },
    [removeItem, runProtectedAction, isAuthenticated, syncCart, queryClient, activeCartMode],
  );

  const clearCart = useCallback(async () => {
    const action = async () => {
      if (isAuthenticated) {
        try {
          // Note: clearing cart only clears the active cart!
          const currentCart = queryClient.getQueryData(['cart']);
          const otherCartKey = activeCartMode === 'purchase' ? 'rentalCart' : 'purchaseCart';
          const otherItems = currentCart?.[otherCartKey]?.items || [];
          const payload = otherItems.map((item) => {
            const rInfo =
              item.rentalInfo && Object.keys(item.rentalInfo).length > 0
                ? item.rentalInfo
                : undefined;
            return {
              product: item.product?._id || item.product?.id || item._id || item.id || item.product,
              quantity: item.quantity,
              type: item.type || 'purchase',
              rentalInfo: rInfo,
              deposit: item.deposit,
            };
          });
          await syncCart({ cartItems: payload }); // Leaves only the other cart's items
        } catch (err) {
          logger.error('Failed to clear database cart:', err);
        }
      } else {
        const setTargetCart =
          activeCartMode === 'purchase' ? setGuestPurchaseCart : setGuestRentalCart;
        setTargetCart({ items: [], summary: { ...emptySummary, depositTotal: 0 } });
      }
    };

    if (isAuthenticated) {
      action();
    } else {
      action();
    }
  }, [isAuthenticated, syncCart, queryClient, activeCartMode]);

  const cartCount = useMemo(() => items.reduce((acc, item) => acc + item.quantity, 0), [items]);

  const purchaseCartCount = useMemo(
    () => purchaseCart.items.reduce((acc, item) => acc + item.quantity, 0),
    [purchaseCart.items],
  );
  const rentalCartCount = useMemo(
    () => rentalCart.items.reduce((acc, item) => acc + item.quantity, 0),
    [rentalCart.items],
  );

  const subtotal = useMemo(() => summary.subtotal, [summary.subtotal]);

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

  return (
    <CartStateContext.Provider value={stateValue}>
      <CartDispatchContext.Provider value={dispatchValue}>{children}</CartDispatchContext.Provider>
    </CartStateContext.Provider>
  );
}
