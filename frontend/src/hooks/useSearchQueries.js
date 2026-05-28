import { useQuery } from '@tanstack/react-query';
import { searchService } from '../services/searchService';

export function useSearch(query, options = {}) {
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
    enabled: Boolean(query || options.category || options.type),
    staleTime: 2 * 60 * 1000, // 2 minutes search result cache
    gcTime: 10 * 60 * 1000,
  });
}

export function useAutocomplete(query, options = {}) {
  const limit = options.limit || 8;
  return useQuery({
    queryKey: ['autocomplete', query, limit],
    queryFn: async ({ signal }) => {
      const res = await searchService.autocomplete(query, { ...options, signal });
      return res.success ? res.data : res;
    },
    enabled: Boolean(query && query.trim().length >= 2),
    staleTime: 5 * 60 * 1000, // cache suggestions for 5 minutes
    gcTime: 15 * 60 * 1000,
  });
}

export function useTrendingSearches(options = {}) {
  const limit = options.limit || 10;
  return useQuery({
    queryKey: ['search', 'trending', limit],
    queryFn: async ({ signal }) => {
      const res = await searchService.getTrending({ ...options, signal });
      return res.success ? res.data : res;
    },
    staleTime: 10 * 60 * 1000, // trending searches rarely change, 10 min cache
    gcTime: 30 * 60 * 1000,
  });
}

export function useRelatedSearches(query, options = {}) {
  const limit = options.limit || 5;
  return useQuery({
    queryKey: ['search', 'related', query, limit],
    queryFn: async ({ signal }) => {
      const res = await searchService.getRelated(query, { ...options, signal });
      return res.success ? res.data : res;
    },
    enabled: Boolean(query),
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });
}
