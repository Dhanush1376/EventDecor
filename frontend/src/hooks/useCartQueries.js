import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userService } from '../services/domainServices';
import { hasSessionMarker } from '../utils/authStorage';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../utils/errorHelpers';

const checkAuthLocal = () => hasSessionMarker();

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
    mutationFn: async ({ productId, quantity }) => {
      const res = await userService.addToCart(productId, quantity);
      return res.success ? res.data : res;
    },
    onMutate: async ({ productId, quantity, productInfo }) => {
      await queryClient.cancelQueries({ queryKey: ['cart'] });
      const previousCart = queryClient.getQueryData(['cart']) || { items: [], summary: { subtotal: 0, total: 0 } };
      
      // Compute optimistic items
      const existingItemIndex = previousCart.items.findIndex(
        (item) => (item.product?._id || item.product?.id) === productId
      );

      let updatedItems = [...previousCart.items];
      if (existingItemIndex >= 0) {
        const existingItem = updatedItems[existingItemIndex];
        updatedItems[existingItemIndex] = {
          ...existingItem,
          quantity: existingItem.quantity + quantity,
        };
      } else if (productInfo) {
        // If product details are passed, build an optimistic item matching the schema
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
        });
      }

      // Optimistic subtotal calculation
      const subtotal = updatedItems.reduce(
        (sum, item) => sum + (item.product?.price || 0) * item.quantity,
        0
      );

      const optimisticCart = {
        ...previousCart,
        items: updatedItems,
        summary: {
          ...previousCart.summary,
          subtotal,
          total: subtotal + (previousCart.summary?.shippingFee || 0) + (previousCart.summary?.platformFee || 0),
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
      if (data) {
        queryClient.setQueryData(['cart'], data);
      }
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
      const previousCart = queryClient.getQueryData(['cart']) || { items: [], summary: { subtotal: 0, total: 0 } };

      const updatedItems = previousCart.items.filter(
        (item) => (item.product?._id || item.product?.id) !== productId
      );

      const subtotal = updatedItems.reduce(
        (sum, item) => sum + (item.product?.price || 0) * item.quantity,
        0
      );

      const optimisticCart = {
        ...previousCart,
        items: updatedItems,
        summary: {
          ...previousCart.summary,
          subtotal,
          total: subtotal + (previousCart.summary?.shippingFee || 0) + (previousCart.summary?.platformFee || 0),
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
      if (data) {
        queryClient.setQueryData(['cart'], data);
      }
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
    onMutate: async ({ cartItems }) => {
      await queryClient.cancelQueries({ queryKey: ['cart'] });
      const previousCart = queryClient.getQueryData(['cart']) || { items: [], summary: { subtotal: 0, total: 0 } };

      // Optimistically update the items mapping them correctly
      const updatedItems = previousCart.items.map((item) => {
        const id = item.product?._id || item.product?.id;
        const match = cartItems.find((ci) => ci.product === id);
        if (match) {
          return { ...item, quantity: match.quantity };
        }
        return item;
      }).filter((item) => {
        const id = item.product?._id || item.product?.id;
        const match = cartItems.find((ci) => ci.product === id);
        return !match || match.quantity > 0;
      });

      const subtotal = updatedItems.reduce(
        (sum, item) => sum + (item.product?.price || 0) * item.quantity,
        0
      );

      const optimisticCart = {
        ...previousCart,
        items: updatedItems,
        summary: {
          ...previousCart.summary,
          subtotal,
          total: subtotal + (previousCart.summary?.shippingFee || 0) + (previousCart.summary?.platformFee || 0),
        },
      };

      queryClient.setQueryData(['cart'], optimisticCart);
      return { previousCart };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['cart'], context?.previousCart);
      toast.error(getErrorMessage(err, 'Unable to sync bag'));
    },
    onSuccess: (data) => {
      if (data) {
        queryClient.setQueryData(['cart'], data);
      }
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
      addToCartMutation.isPending ||
      removeFromCartMutation.isPending ||
      syncCartMutation.isPending,
  };
}
