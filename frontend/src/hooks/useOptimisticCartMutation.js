import { useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import logger from '../utils/core/logger';
import { getErrorMessage } from '../utils/core/errorHelpers';
import { useCartMutations } from './useCartQueries';
import { cleanRentalInfo, calculateCartSummary } from '../utils/ecommerce/cartCalculations';

export function useOptimisticCartMutation({
  isAuthenticated,
  activeCartMode,
  setActiveCartMode,
  runProtectedAction,
  setIsCartOpen,
  emptySummary,
  setGuestPurchaseCart,
  setGuestRentalCart,
}) {
  const queryClient = useQueryClient();
  const { addToCart, removeFromCart, syncCart } = useCartMutations();
  const syncTimeoutRef = useRef(null);

  const addItem = useCallback(
    async (product) => {
      const qty = product.quantity || 1;
      const itemKey = product._id || product.id;
      const itemType = product.type || 'purchase';

      if (isAuthenticated) {
        const action = async () => {
          setIsCartOpen(true);
          const previousCart = queryClient.getQueryData(['cart']);
          let rollbackCart = previousCart;

          if (previousCart) {
            let targetCartKey = itemType === 'purchase' ? 'purchaseCart' : 'rentalCart';
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

            queryClient.setQueryData(['cart'], {
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
            if (rollbackCart) queryClient.setQueryData(['cart'], rollbackCart);
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
                rentalInfo: cleanRentalInfo(product.rentalInfo),
                isNonRefundable: product.isNonRefundable || false,
                customizationConfig: product.customizationConfig,
                product: product,
              },
            ];
          }

          const { subtotal, depositTotal, total } = calculateCartSummary(
            newItems,
            itemType,
            prev.summary?.shippingFee || 0,
          );

          return {
            items: newItems,
            summary: {
              ...prev.summary,
              subtotal,
              total,
              depositTotal,
            },
          };
        });
        setIsCartOpen(true);
      }
    },
    [
      runProtectedAction,
      isAuthenticated,
      addToCart,
      queryClient,
      emptySummary,
      setGuestPurchaseCart,
      setGuestRentalCart,
      setIsCartOpen,
    ],
  );

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
    [activeCartMode, setActiveCartMode, addItem],
  );

  const removeItem = useCallback(
    async (id) => {
      if (isAuthenticated) {
        const action = async () => {
          const previousCart = queryClient.getQueryData(['cart']);
          let rollbackCart = previousCart;

          if (previousCart) {
            let targetCartKey = activeCartMode === 'purchase' ? 'purchaseCart' : 'rentalCart';
            const prevItems = previousCart[targetCartKey]?.items || [];
            const updatedItems = prevItems.filter(
              (item) => (item.product?._id || item.product?.id || item._id || item.id) !== id,
            );

            const { subtotal, depositTotal, total } = calculateCartSummary(
              updatedItems,
              activeCartMode,
              previousCart[targetCartKey]?.summary?.shippingFee || 0,
            );

            queryClient.setQueryData(['cart'], {
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
            if (rollbackCart) queryClient.setQueryData(['cart'], rollbackCart);
          }
        };
        runProtectedAction(action);
      } else {
        const setTargetCart =
          activeCartMode === 'purchase' ? setGuestPurchaseCart : setGuestRentalCart;

        setTargetCart((prev) => {
          const newItems = prev.items.filter((item) => item.id !== id);
          const { subtotal, depositTotal, total } = calculateCartSummary(
            newItems,
            activeCartMode,
            prev.summary?.shippingFee || 0,
          );

          return {
            items: newItems,
            summary: {
              ...prev.summary,
              subtotal,
              total,
              depositTotal,
            },
          };
        });
      }
    },
    [
      runProtectedAction,
      isAuthenticated,
      removeFromCart,
      activeCartMode,
      queryClient,
      emptySummary,
      setGuestPurchaseCart,
      setGuestRentalCart,
    ],
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
            let targetCartKey = activeCartMode === 'purchase' ? 'purchaseCart' : 'rentalCart';
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
              return {
                product:
                  item.product?._id || item.product?.id || item._id || item.id || item.product,
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
        };
        runProtectedAction(action);
      } else {
        const setTargetCart =
          activeCartMode === 'purchase' ? setGuestPurchaseCart : setGuestRentalCart;

        setTargetCart((prev) => {
          const newItems = prev.items.map((item) =>
            item.id === id ? { ...item, quantity: numericQuantity } : item,
          );
          const { subtotal, depositTotal, total } = calculateCartSummary(
            newItems,
            activeCartMode,
            prev.summary?.shippingFee || 0,
          );

          return {
            items: newItems,
            summary: {
              ...prev.summary,
              subtotal,
              total,
              depositTotal,
            },
          };
        });
      }
    },
    [
      removeItem,
      runProtectedAction,
      isAuthenticated,
      syncCart,
      queryClient,
      activeCartMode,
      setGuestPurchaseCart,
      setGuestRentalCart,
    ],
  );

  const clearCart = useCallback(async () => {
    const action = async () => {
      if (isAuthenticated) {
        try {
          const currentCart = queryClient.getQueryData(['cart']);
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
          await syncCart({ cartItems: payload });
        } catch (err) {
          logger.error('Failed to clear database cart:', err);
          toast.error(getErrorMessage(err, 'Failed to clear bag'));
        }
      } else {
        const setTargetCart =
          activeCartMode === 'purchase' ? setGuestPurchaseCart : setGuestRentalCart;
        setTargetCart({ items: [], summary: { ...emptySummary, depositTotal: 0 } });
      }
    };

    action();
  }, [
    isAuthenticated,
    syncCart,
    queryClient,
    activeCartMode,
    emptySummary,
    setGuestPurchaseCart,
    setGuestRentalCart,
  ]);

  return { addItem, attemptAddToCart, removeItem, updateQuantity, clearCart };
}
