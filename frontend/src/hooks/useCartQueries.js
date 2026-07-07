import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userService } from '../services/domainServices';
import { hasSessionMarker } from '../utils/auth/authStorage';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../utils/core/errorHelpers';
import { useAuth } from '../context/AuthContext';
import { cleanRentalInfo, calculateCartSummary } from '../utils/ecommerce/cartCalculations';

const checkAuthLocal = () => hasSessionMarker();

const emptyCart = {
  items: [],
  summary: { subtotal: 0, depositTotal: 0, total: 0, shippingFee: 0, platformFee: 0 },
};
const defaultCart = { purchaseCart: emptyCart, rentalCart: emptyCart };

export function useCartQuery() {
  const { user } = useAuth();
  const isAuth = checkAuthLocal();
  const cartKey = isAuth ? user?._id || user?.id || 'authenticated' : 'guest';

  return useQuery({
    queryKey: ['cart', cartKey],
    queryFn: async ({ signal }) => {
      const res = await userService.getCart({ signal });
      return res.success ? res.data : res;
    },
    enabled: checkAuthLocal(),
    gcTime: 30 * 60 * 1000,
    staleTime: 1000 * 60 * 2,
  });
}

export function useCartMutations() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAuth = checkAuthLocal();
  const cartKey = isAuth ? user?._id || user?.id || 'authenticated' : 'guest';

  const addToCartMutation = useMutation({
    mutationFn: async ({ productId, quantity, type, rentalInfo }) => {
      const res = await userService.addToCart(productId, quantity, type, rentalInfo);
      return res.success ? res.data : res;
    },
    onMutate: async ({ product, quantity, type, rentalInfo }) => {
      await queryClient.cancelQueries({ queryKey: ['cart', cartKey] });
      const previousCart = queryClient.getQueryData(['cart', cartKey]);

      if (previousCart && product) {
        const itemType = type || 'purchase';
        const targetCartKey =
          itemType === 'purchase'
            ? 'purchaseCart'
            : itemType === 'rental'
              ? 'rentalCart'
              : 'customCart';

        const prevItems = previousCart[targetCartKey]?.items || [];
        const itemKey = product._id || product.id;

        const existingIndex = prevItems.findIndex(
          (item) => (item.product?._id || item.product?.id || item._id || item.id) === itemKey,
        );

        let updatedItems;
        if (existingIndex >= 0) {
          updatedItems = [...prevItems];
          updatedItems[existingIndex] = {
            ...updatedItems[existingIndex],
            quantity: updatedItems[existingIndex].quantity + (quantity || 1),
          };
        } else {
          updatedItems = [
            ...prevItems,
            {
              id: itemKey,
              _id: itemKey,
              quantity: quantity || 1,
              type: itemType,
              product: product,
              rentalInfo: cleanRentalInfo(rentalInfo || product.rentalInfo),
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
              ...(previousCart[targetCartKey]?.summary || emptyCart.summary),
              subtotal,
              depositTotal,
              total,
            },
          },
        });
      }

      return { previousCart };
    },
    onError: (err, variables, context) => {
      if (context?.previousCart) {
        queryClient.setQueryData(['cart', cartKey], context.previousCart);
      }
      toast.error(getErrorMessage(err, 'Unable to add item to bag'));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['cart', cartKey] });
    },
  });

  const removeFromCartMutation = useMutation({
    mutationFn: async ({ productId }) => {
      const res = await userService.removeFromCart(productId);
      return res.success ? res.data : res;
    },
    onMutate: async ({ productId, type }) => {
      await queryClient.cancelQueries({ queryKey: ['cart', cartKey] });
      const previousCart = queryClient.getQueryData(['cart', cartKey]);

      if (previousCart && type) {
        const targetCartKey =
          type === 'purchase' ? 'purchaseCart' : type === 'rental' ? 'rentalCart' : 'customCart';

        const prevItems = previousCart[targetCartKey]?.items || [];
        const updatedItems = prevItems.filter(
          (item) => (item.product?._id || item.product?.id || item._id || item.id) !== productId,
        );

        const { subtotal, depositTotal, total } = calculateCartSummary(
          updatedItems,
          type,
          previousCart[targetCartKey]?.summary?.shippingFee || 0,
        );

        queryClient.setQueryData(['cart', cartKey], {
          ...previousCart,
          [targetCartKey]: {
            ...previousCart[targetCartKey],
            items: updatedItems,
            summary: {
              ...(previousCart[targetCartKey]?.summary || emptyCart.summary),
              subtotal,
              depositTotal,
              total,
            },
          },
        });
      }

      return { previousCart };
    },
    onError: (err, variables, context) => {
      if (context?.previousCart) {
        queryClient.setQueryData(['cart', cartKey], context.previousCart);
      }
      toast.error(getErrorMessage(err, 'Unable to remove item from bag'));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['cart', cartKey] });
    },
  });

  const syncCartMutation = useMutation({
    mutationFn: async ({ cartItems }) => {
      const res = await userService.syncCart(cartItems);
      return res.success ? res.data : res;
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, 'Unable to sync bag'));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['cart', cartKey] });
    },
  });

  return {
    addToCart: addToCartMutation.mutateAsync,
    removeFromCart: removeFromCartMutation.mutateAsync,
    syncCart: syncCartMutation.mutateAsync,
    isUpdatingCart:
      addToCartMutation.isPending || removeFromCartMutation.isPending || syncCartMutation.isPending,
  };
}
