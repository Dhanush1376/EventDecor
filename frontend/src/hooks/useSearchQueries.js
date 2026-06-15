import { useQuery } from '@tanstack/react-query';
import { searchService } from '../services/searchService';

export function useSearch(query, options = {}) {
  const {
    enabled = true,
    staleTime = 2 * 60 * 1000,
    gcTime = 10 * 60 * 1000,
    ...restOptions
  } = options;
  const params = {
    q: query,
    category: options.category,
    type: options.type,
    sort: options.sort,
    page: options.page || 1,
    limit: options.limit || 20,
    priceMin: options.priceMin,
    priceMax: options.priceMax,
  };

  return useQuery({
    queryKey: ['search', params],
    queryFn: async ({ signal }) => {
      const res = await searchService.search(query, { ...options, signal });
      return res.success ? res.data : res;
    },
    enabled: Boolean(query || options.category || options.type) && enabled,
    staleTime,
    gcTime,
    ...restOptions,
  });
}

export function useAutocomplete(query, options = {}) {
  const {
    limit = 8,
    enabled = true,
    staleTime = 5 * 60 * 1000,
    gcTime = 15 * 60 * 1000,
    ...restOptions
  } = options;
  return useQuery({
    queryKey: ['autocomplete', query, limit],
    queryFn: async ({ signal }) => {
      const res = await searchService.autocomplete(query, { ...options, signal });
      return res.success ? res.data : res;
    },
    enabled: Boolean(query && query.trim().length >= 2) && enabled,
    staleTime,
    gcTime,
    ...restOptions,
  });
}

export function useTrendingSearches(options = {}) {
  const {
    limit = 10,
    enabled = true,
    staleTime = 10 * 60 * 1000,
    gcTime = 30 * 60 * 1000,
    ...restOptions
  } = options;
  return useQuery({
    queryKey: ['search', 'trending', limit],
    queryFn: async ({ signal }) => {
      const res = await searchService.getTrending({ ...options, signal });
      return res.success ? res.data : res;
    },
    staleTime,
    gcTime,
    enabled,
    ...restOptions,
  });
}

export function useRelatedSearches(query, options = {}) {
  const {
    limit = 5,
    enabled = true,
    staleTime = 5 * 60 * 1000,
    gcTime = 15 * 60 * 1000,
    ...restOptions
  } = options;
  return useQuery({
    queryKey: ['search', 'related', query, limit],
    queryFn: async ({ signal }) => {
      const res = await searchService.getRelated(query, { ...options, signal });
      return res.success ? res.data : res;
    },
    enabled: Boolean(query) && enabled,
    staleTime,
    gcTime,
    ...restOptions,
  });
}

export function useDiscoveryData(options = {}) {
  const {
    enabled = true,
    staleTime = 15 * 60 * 1000, // 15 mins
    gcTime = 30 * 60 * 1000,
    ...restOptions
  } = options;
  return useQuery({
    queryKey: ['search', 'discovery'],
    queryFn: async ({ signal }) => {
      const res = await searchService.getDiscovery({ ...options, signal });
      return res.success ? res.data : res;
    },
    staleTime,
    gcTime,
    enabled,
    ...restOptions,
  });
}
