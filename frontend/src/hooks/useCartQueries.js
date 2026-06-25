import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userService } from '../services/domainServices';
import { hasSessionMarker } from '../utils/auth/authStorage';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../utils/core/errorHelpers';

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
    staleTime: 3 * 60 * 1000, // 3 minutes stale time
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
