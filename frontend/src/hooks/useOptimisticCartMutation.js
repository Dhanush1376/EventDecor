import { useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import logger from '../utils/core/logger';
import { getErrorMessage } from '../utils/core/errorHelpers';
import { useCartMutations } from './useCartQueries';
import { cleanRentalInfo, calculateCartSummary } from '../utils/ecommerce/cartCalculations';
import { useAuth } from '../context/AuthContext';

export function useOptimisticCartMutation({
  isAuthenticated,
  activeCartMode,
  setActiveCartMode,
  runProtectedAction,
  setIsCartOpen,
  emptySummary,
  setGuestPurchaseCart,
  setGuestRentalCart,
  setGuestCustomCart,
}) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const cartKey = isAuthenticated ? (user?._id || user?.id || 'authenticated') : 'guest';
  const { addToCart, removeFromCart, syncCart } = useCartMutations();
  const syncTimeoutRef = useRef(null);

  const addItem = useCallback(
    async (product) => {
      const qty = product.quantity || 1;
      const itemKey = product._id || product.id;
      const itemType = product.type || 'purchase';

      runProtectedAction(async () => {
        setIsCartOpen(true);
        await queryClient.cancelQueries({ queryKey: ['cart'] });
        const previousCart = queryClient.getQueryData(['cart', cartKey]);
        let rollbackCart = previousCart;

        if (previousCart) {
          let targetCartKey =
            itemType === 'purchase'
              ? 'purchaseCart'
              : itemType === 'rental'
                ? 'rentalCart'
                : 'customCart';
          const prevItems = previousCart[targetCartKey]?.items || [];

          const existingIndex = prevItems.findIndex(
            (item) => (item.product?._id || item.product?.id || item._id || item.id) === itemKey,
          );
          let updatedItems;

          if (existingIndex >= 0) {
            updatedItems = [...prevItems];
            updatedItems[existingIndex] = {
              ...updatedItems[existingIndex],
              quantity: updatedItems[existingIndex].quantity + qty,
            };
          } else {
            updatedItems = [
              ...prevItems,
              {
                id: itemKey,
                _id: itemKey,
                quantity: qty,
                type: itemType,
                product: product,
                rentalInfo: cleanRentalInfo(product.rentalInfo),
                deposit: product.deposit || 0,
              },
            ];
          }

          const { subtotal, depositTotal, total } = calculateCartSummary(
            updatedItems,
            itemType,
            previousCart[targetCartKey]?.summary?.shippingFee || 0,
          );

          queryClient.setQueryData(['cart', cartKey], {
            ...previousCart,
            [targetCartKey]: {
              ...previousCart[targetCartKey],
              items: updatedItems,
              summary: {
                ...(previousCart[targetCartKey]?.summary || emptySummary),
                subtotal,
                depositTotal,
                total,
              },
            },
          });
        }

        try {
          await addToCart({
            productId: itemKey,
            quantity: qty,
            type: itemType,
            rentalInfo: cleanRentalInfo(product.rentalInfo),
            productInfo: product,
          });
        } catch (err) {
          logger.error('Failed to add item to database cart:', err);
          toast.error(getErrorMessage(err, 'Unable to add item to bag'));
          if (rollbackCart) queryClient.setQueryData(['cart', cartKey], rollbackCart);
        }
      });
    },
    [runProtectedAction, addToCart, queryClient, emptySummary, setIsCartOpen, cartKey],
  );

  const attemptAddToCart = useCallback(
    async (product) => {
      const itemType = product.type || 'purchase';

      if (itemType !== activeCartMode) {
        toast(
          `Switched to ${itemType === 'rental' ? 'Rental' : itemType === 'custom' ? 'Custom' : 'Purchase'} Cart to add this item`,
          // Removed icon
        );
        setActiveCartMode(itemType);
      }

      addItem(product);
    },
    [activeCartMode, setActiveCartMode, addItem],
  );

  const removeItem = useCallback(
    (id) => {
      runProtectedAction(async () => {
        await queryClient.cancelQueries({ queryKey: ['cart'] });
        const previousCart = queryClient.getQueryData(['cart', cartKey]);
        let rollbackCart = previousCart;

        if (previousCart) {
          let targetCartKey =
            activeCartMode === 'purchase'
              ? 'purchaseCart'
              : activeCartMode === 'rental'
                ? 'rentalCart'
                : 'customCart';
          const updatedItems = previousCart[targetCartKey].items.filter(
            (item) => (item.product?._id || item.product?.id || item._id || item.id) !== id,
          );

          const { subtotal, depositTotal, total } = calculateCartSummary(
            updatedItems,
            activeCartMode,
            previousCart[targetCartKey]?.summary?.shippingFee || 0,
          );

          queryClient.setQueryData(['cart', cartKey], {
            ...previousCart,
            [targetCartKey]: {
              ...previousCart[targetCartKey],
              items: updatedItems,
              summary: {
                ...(previousCart[targetCartKey]?.summary || emptySummary),
                subtotal,
                depositTotal,
                total,
              },
            },
          });
        }

        try {
          await removeFromCart({ productId: id });
        } catch (err) {
          logger.error('Failed to remove item from database cart:', err);
          toast.error(getErrorMessage(err, 'Unable to remove item from bag'));
          if (rollbackCart) queryClient.setQueryData(['cart', cartKey], rollbackCart);
        }
      });
    },
    [runProtectedAction, removeFromCart, activeCartMode, queryClient, emptySummary, cartKey],
  );

  const updateQuantity = useCallback(
    (id, variantOrQuantity, maybeQuantity) => {
      const quantity = maybeQuantity !== undefined ? maybeQuantity : variantOrQuantity;
      const numericQuantity = Number(quantity) || 1;

      if (numericQuantity < 1) {
        removeItem(id);
        return;
      }

      runProtectedAction(async () => {
        await queryClient.cancelQueries({ queryKey: ['cart'] });
        const previousCart = queryClient.getQueryData(['cart', cartKey]);
        if (previousCart) {
          let targetCartKey =
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
          try {
            await syncCart({ cartItems: payload });
          } catch (err) {
            logger.error('Failed to update cart quantity in database:', err);
            toast.error(getErrorMessage(err, 'Unable to update quantity'));
          }
        }, 500);
      });
    },
    [
      removeItem,
      runProtectedAction,
      syncCart,
      queryClient,
      activeCartMode,
      cartKey,
    ],
  );

  const clearCart = useCallback(async () => {
    runProtectedAction(async () => {
      try {
        await queryClient.cancelQueries({ queryKey: ['cart'] });
        const currentCart = queryClient.getQueryData(['cart', cartKey]);
        const otherCartKey = activeCartMode === 'purchase' ? 'rentalCart' : 'purchaseCart'; // Note: skipping custom for this quick merge since custom uses its own mode
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
        await syncCart({ cartItems: payload });
      } catch (err) {
        logger.error('Failed to clear database cart:', err);
        toast.error(getErrorMessage(err, 'Failed to clear bag'));
      }
    });
  }, [runProtectedAction, syncCart, queryClient, activeCartMode, cartKey]);

  return { addItem, attemptAddToCart, removeItem, updateQuantity, clearCart };
}
