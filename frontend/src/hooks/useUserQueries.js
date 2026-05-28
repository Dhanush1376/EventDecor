import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userService } from '../services/domainServices';
import { hasSessionMarker } from '../utils/authStorage';
import toast from 'react-hot-toast';

const checkAuthLocal = () => hasSessionMarker();

export function useUserProfile() {
  return useQuery({
    queryKey: ['user', 'profile'],
    queryFn: async ({ signal }) => {
      const res = await userService.getProfile({ signal });
      return res.success ? res.data : res;
    },
    enabled: checkAuthLocal(),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

export function useUserAddresses() {
  return useQuery({
    queryKey: ['user', 'addresses'],
    queryFn: async () => {
      const res = await userService.getAddresses();
      return res.success ? res.data : res;
    },
    enabled: checkAuthLocal(),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

export function useRecentlyViewed() {
  return useQuery({
    queryKey: ['user', 'recentlyViewed'],
    queryFn: async () => {
      const res = await userService.getRecentlyViewed();
      return res.success ? res.data : res;
    },
    enabled: checkAuthLocal(),
    staleTime: 30 * 1000, // short TTL for recently viewed
    gcTime: 5 * 60 * 1000,
  });
}

export function useUpdateProfileMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (profileData) => userService.updateProfile(profileData),
    onSuccess: (data) => {
      if (data?.success && data?.data) {
        queryClient.setQueryData(['user', 'profile'], data.data);
      } else {
        queryClient.invalidateQueries({ queryKey: ['user', 'profile'] });
      }
      toast.success('Profile updated successfully');
    },
    onError: (err) => {
      toast.error(err?.message || 'Failed to update profile');
    }
  });
}

export function useAddressMutations() {
  const queryClient = useQueryClient();

  const addAddressMutation = useMutation({
    mutationFn: async (data) => userService.addAddress(data),
    onMutate: async (newAddress) => {
      await queryClient.cancelQueries({ queryKey: ['user', 'addresses'] });
      const previousAddresses = queryClient.getQueryData(['user', 'addresses']) || [];
      const optimisticAddress = {
        _id: `temp-${Date.now()}`,
        ...newAddress,
        isDefault: previousAddresses.length === 0, // default if first address
      };
      queryClient.setQueryData(['user', 'addresses'], [...previousAddresses, optimisticAddress]);
      return { previousAddresses };
    },
    onError: (err, newAddress, context) => {
      queryClient.setQueryData(['user', 'addresses'], context?.previousAddresses);
      toast.error('Failed to add address');
    },
    onSuccess: () => {
      toast.success('Address added successfully');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['user', 'addresses'] });
    },
  });

  const updateAddressMutation = useMutation({
    mutationFn: async ({ id, data }) => userService.updateAddress(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['user', 'addresses'] });
      const previousAddresses = queryClient.getQueryData(['user', 'addresses']) || [];
      queryClient.setQueryData(
        ['user', 'addresses'],
        previousAddresses.map((addr) => (addr._id === id ? { ...addr, ...data } : addr))
      );
      return { previousAddresses };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['user', 'addresses'], context?.previousAddresses);
      toast.error('Failed to update address');
    },
    onSuccess: () => {
      toast.success('Address updated successfully');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['user', 'addresses'] });
    },
  });

  const deleteAddressMutation = useMutation({
    mutationFn: async (id) => userService.deleteAddress(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['user', 'addresses'] });
      const previousAddresses = queryClient.getQueryData(['user', 'addresses']) || [];
      queryClient.setQueryData(
        ['user', 'addresses'],
        previousAddresses.filter((addr) => addr._id !== id)
      );
      return { previousAddresses };
    },
    onError: (err, id, context) => {
      queryClient.setQueryData(['user', 'addresses'], context?.previousAddresses);
      toast.error('Failed to delete address');
    },
    onSuccess: () => {
      toast.success('Address removed successfully');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['user', 'addresses'] });
    },
  });

  const setDefaultAddressMutation = useMutation({
    mutationFn: async (id) => userService.setDefaultAddress(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['user', 'addresses'] });
      const previousAddresses = queryClient.getQueryData(['user', 'addresses']) || [];
      queryClient.setQueryData(
        ['user', 'addresses'],
        previousAddresses.map((addr) => ({
          ...addr,
          isDefault: addr._id === id,
        }))
      );
      return { previousAddresses };
    },
    onError: (err, id, context) => {
      queryClient.setQueryData(['user', 'addresses'], context?.previousAddresses);
      toast.error('Failed to update default address');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['user', 'addresses'] });
    },
  });

  return {
    addAddress: addAddressMutation.mutate,
    updateAddress: updateAddressMutation.mutate,
    deleteAddress: deleteAddressMutation.mutate,
    setDefaultAddress: setDefaultAddressMutation.mutate,
    isMutating:
      addAddressMutation.isPending ||
      updateAddressMutation.isPending ||
      deleteAddressMutation.isPending ||
      setDefaultAddressMutation.isPending,
  };
}
