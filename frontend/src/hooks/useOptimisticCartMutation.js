import { useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { useCartMutations } from './useCartQueries';
import { cleanRentalInfo, calculateCartSummary } from '../utils/ecommerce/cartCalculations';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { hasSessionMarker } from '../utils/auth/authStorage';

const checkAuthLocal = () => hasSessionMarker();

export function useOptimisticCartMutation({
  isAuthenticated,
  activeCartMode,
  setActiveCartMode,
  runProtectedAction,
  setIsCartOpen,
  emptySummary,
}) {
  const { addToCart, removeFromCart, syncCart } = useCartMutations();
  const syncTimeoutRef = useRef(null);
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAuth = checkAuthLocal();
  const cartKey = isAuth ? user?._id || user?.id || 'authenticated' : 'guest';

  const addItem = useCallback(
    (product) => {
      runProtectedAction(() => {
        setIsCartOpen(true);
        const qty = product.quantity || 1;
        const itemType = product.type || 'purchase';

        // React Query useCartMutations handles the optimistic UI and rollback natively now!
        addToCart({
          product,
          productId: product._id || product.id,
          quantity: qty,
          type: itemType,
          rentalInfo: cleanRentalInfo(product.rentalInfo),
        });
      });
    },
    [runProtectedAction, addToCart, setIsCartOpen],
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
    [activeCartMode, setActiveCartMode, addItem],
  );

  const removeItem = useCallback(
    (id) => {
      runProtectedAction(() => {
        // React Query useCartMutations handles the optimistic UI and rollback natively now!
        removeFromCart({ productId: id, type: activeCartMode });
      });
    },
    [runProtectedAction, removeFromCart, activeCartMode],
  );

  const updateQuantity = useCallback(
    (id, variantOrQuantity, maybeQuantity) => {
      const quantity = maybeQuantity !== undefined ? maybeQuantity : variantOrQuantity;
      const numericQuantity = Number(quantity) || 1;

      if (numericQuantity < 1) {
        removeItem(id);
        return;
      }

      runProtectedAction(() => {
        // 1. Manually update cache instantly for the UI slider responsiveness
        const previousCart = queryClient.getQueryData(['cart', cartKey]);
        if (previousCart) {
          const targetCartKey =
            activeCartMode === 'purchase'
              ? 'purchaseCart'
              : activeCartMode === 'rental'
                ? 'rentalCart'
                : 'customCart';
          const updatedItems = previousCart[targetCartKey].items.map((item) => {
            const itemId = item.product?._id || item.product?.id;
            if (itemId === id) {
              return { ...item, quantity: numericQuantity };
            }
            return item;
          });

          const { subtotal, depositTotal, total } = calculateCartSummary(
            updatedItems,
            activeCartMode,
            previousCart[targetCartKey].summary?.shippingFee || 0,
          );

          queryClient.setQueryData(['cart', cartKey], {
            ...previousCart,
            [targetCartKey]: {
              ...previousCart[targetCartKey],
              items: updatedItems,
              summary: {
                ...(previousCart[targetCartKey].summary || emptySummary),
                subtotal,
                depositTotal,
                total,
              },
            },
          });
        }

        // 2. Debounce the actual API call
        if (syncTimeoutRef.current) {
          clearTimeout(syncTimeoutRef.current);
        }

        syncTimeoutRef.current = setTimeout(() => {
          const currentCart = queryClient.getQueryData(['cart', cartKey]);
          const allItems = [
            ...(currentCart?.purchaseCart?.items || []),
            ...(currentCart?.rentalCart?.items || []),
          ];

          const payload = allItems.map((item) => {
            return {
              product: item.product?._id || item.product?.id || item._id || item.id || item.product,
              quantity: item.quantity,
              type: item.type || 'purchase',
              rentalInfo: cleanRentalInfo(item.rentalInfo),
              deposit: item.deposit,
            };
          });

          // React Query useCartMutations handles the network request and onSettled invalidation
          syncCart({ cartItems: payload });
        }, 500);
      });
    },
    [removeItem, runProtectedAction, syncCart, queryClient, activeCartMode, cartKey, emptySummary],
  );

  const clearCart = useCallback(() => {
    runProtectedAction(() => {
      const currentCart = queryClient.getQueryData(['cart', cartKey]);
      const otherCartKey = activeCartMode === 'purchase' ? 'rentalCart' : 'purchaseCart';
      const otherItems = currentCart?.[otherCartKey]?.items || [];
      const payload = otherItems.map((item) => {
        return {
          product: item.product?._id || item.product?.id || item._id || item.id || item.product,
          quantity: item.quantity,
          type: item.type || 'purchase',
          rentalInfo: cleanRentalInfo(item.rentalInfo),
          deposit: item.deposit,
        };
      });

      syncCart({ cartItems: payload });
    });
  }, [runProtectedAction, syncCart, queryClient, activeCartMode, cartKey]);

  return { addItem, attemptAddToCart, removeItem, updateQuantity, clearCart };
}
