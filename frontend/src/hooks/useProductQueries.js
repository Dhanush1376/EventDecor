import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { productService } from '../services/domainServices';

export function useProducts(params, options = {}) {
  return useQuery({
    queryKey: ['products', params],
    queryFn: async () => {
      const res = await productService.getAll(params);
      return res.success ? res.data : res;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    placeholderData: keepPreviousData,
    ...options,
  });
}

export function useDynamicFilters(params, options = {}) {
  return useQuery({
    queryKey: ['products-filters', params],
    queryFn: async () => {
      const res = await productService.getDynamicFilters(params);
      return res.success ? res.data : res;
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    placeholderData: keepPreviousData,
    ...options,
  });
}

export function useProduct(id, options = {}) {
  const {
    enabled = true,
    staleTime = 5 * 60 * 1000,
    gcTime = 30 * 60 * 1000,
    ...restOptions
  } = options;
  return useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      const res = await productService.getById(id);
      return res.success ? res.data : res;
    },
    enabled: Boolean(id) && enabled,
    staleTime,
    gcTime,
    ...restOptions,
  });
}

export function useCategories(options = {}) {
  const {
    enabled = true,
    staleTime = 10 * 60 * 1000,
    gcTime = 60 * 60 * 1000,
    ...restOptions
  } = options;
  return useQuery({
    queryKey: ['product_categories'],
    queryFn: async () => {
      const res = await productService.getCategories();
      return res.success ? res.data : res;
    },
    enabled,
    staleTime,
    gcTime,
    ...restOptions,
  });
}

export function useProductMutations() {
  const queryClient = useQueryClient();

  const toggleFeaturedMutation = useMutation({
    mutationFn: async (id) => productService.toggleFeatured(id),
    onSuccess: (data, id) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product', id] });
    },
  });

  return {
    toggleFeatured: toggleFeaturedMutation.mutateAsync,
    isTogglingFeatured: toggleFeaturedMutation.isPending,
  };
}
