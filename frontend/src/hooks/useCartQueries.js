import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userService } from '../services/domainServices';
import { hasSessionMarker } from '../utils/authStorage';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../utils/errorHelpers';

const checkAuthLocal = () => hasSessionMarker();

const emptyCart = {
  items: [],
  summary: { subtotal: 0, depositTotal: 0, total: 0, shippingFee: 0, platformFee: 0 },
};
const defaultCart = { purchaseCart: emptyCart, rentalCart: emptyCart };

export function useCartQuery() {
  return useQuery({
    queryKey: ['cart'],
    queryFn: async ({ signal }) => {
      const res = await userService.getCart({ signal });
      return res.success ? res.data : res;
    },
    enabled: checkAuthLocal(),
    staleTime: 1 * 60 * 1000, // 1 minute stale time
    gcTime: 30 * 60 * 1000,
  });
}

export function useCartMutations() {
  const queryClient = useQueryClient();

  const addToCartMutation = useMutation({
    mutationFn: async ({ productId, quantity, type, rentalInfo }) => {
      const res = await userService.addToCart(productId, quantity, type, rentalInfo);
      return res.success ? res.data : res;
    },
    onMutate: async ({ productId, quantity, productInfo, type, rentalInfo }) => {
      await queryClient.cancelQueries({ queryKey: ['cart'] });
      const previousCart = queryClient.getQueryData(['cart']) || defaultCart;

      const targetKey = type === 'rental' ? 'rentalCart' : 'purchaseCart';
      const targetCart = previousCart[targetKey] || emptyCart;

      const existingItemIndex = targetCart.items.findIndex(
        (item) => (item.product?._id || item.product?.id) === productId,
      );

      let updatedItems = [...targetCart.items];
      if (existingItemIndex >= 0) {
        const existingItem = updatedItems[existingItemIndex];
        updatedItems[existingItemIndex] = {
          ...existingItem,
          quantity: existingItem.quantity + quantity,
        };
      } else if (productInfo) {
        updatedItems.push({
          _id: `temp-${Date.now()}`,
          product: {
            _id: productId,
            id: productId,
            title: productInfo.title,
            price: productInfo.price,
            oldPrice: productInfo.oldPrice || productInfo.price,
            stock: productInfo.stock || 10,
            imageSrc: productInfo.imageSrc,
            category: productInfo.category,
            seller: productInfo.seller || 'Assured Craft Teams',
          },
          quantity,
          variant: 'Default',
          type: type || 'purchase',
          rentalInfo,
          deposit: productInfo.deposit || 0,
        });
      }

      const subtotal = updatedItems.reduce(
        (sum, item) => sum + (item.product?.price || 0) * item.quantity,
        0,
      );

      const depositTotal =
        type === 'rental'
          ? updatedItems.reduce(
              (sum, item) =>
                sum + (item.deposit || item.product?.securityDeposit || 0) * item.quantity,
              0,
            )
          : 0;

      const optimisticCart = {
        ...previousCart,
        [targetKey]: {
          ...targetCart,
          items: updatedItems,
          summary: {
            ...targetCart.summary,
            subtotal,
            depositTotal,
            total:
              subtotal +
              depositTotal +
              (targetCart.summary?.shippingFee || 0) +
              (targetCart.summary?.platformFee || 0),
          },
        },
      };

      queryClient.setQueryData(['cart'], optimisticCart);
      return { previousCart };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['cart'], context?.previousCart);
      toast.error(getErrorMessage(err, 'Unable to add item to bag'));
    },
    onSuccess: (data) => {
      if (data) queryClient.setQueryData(['cart'], data);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });

  const removeFromCartMutation = useMutation({
    mutationFn: async ({ productId }) => {
      const res = await userService.removeFromCart(productId);
      return res.success ? res.data : res;
    },
    onMutate: async ({ productId }) => {
      await queryClient.cancelQueries({ queryKey: ['cart'] });
      const previousCart = queryClient.getQueryData(['cart']) || defaultCart;

      // Determine which cart has the item
      const inPurchase = previousCart.purchaseCart?.items.some(
        (i) => (i.product?._id || i.product?.id) === productId,
      );
      const targetKey = inPurchase ? 'purchaseCart' : 'rentalCart';
      const targetCart = previousCart[targetKey] || emptyCart;

      const updatedItems = targetCart.items.filter(
        (item) => (item.product?._id || item.product?.id) !== productId,
      );

      const subtotal = updatedItems.reduce(
        (sum, item) => sum + (item.product?.price || 0) * item.quantity,
        0,
      );

      const depositTotal =
        targetKey === 'rentalCart'
          ? updatedItems.reduce(
              (sum, item) =>
                sum + (item.deposit || item.product?.securityDeposit || 0) * item.quantity,
              0,
            )
          : 0;

      const optimisticCart = {
        ...previousCart,
        [targetKey]: {
          ...targetCart,
          items: updatedItems,
          summary: {
            ...targetCart.summary,
            subtotal,
            depositTotal,
            total:
              subtotal +
              depositTotal +
              (targetCart.summary?.shippingFee || 0) +
              (targetCart.summary?.platformFee || 0),
          },
        },
      };

      queryClient.setQueryData(['cart'], optimisticCart);
      return { previousCart };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['cart'], context?.previousCart);
      toast.error(getErrorMessage(err, 'Unable to remove item from bag'));
    },
    onSuccess: (data) => {
      if (data) queryClient.setQueryData(['cart'], data);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
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
    onSuccess: (data) => {
      if (data) queryClient.setQueryData(['cart'], data);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
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
