import { useQuery } from '@tanstack/react-query';
import recommendationService from '../services/api/recommendationService';

export function useTrendingRecommendations(params, options = {}) {
  const {
    enabled = true,
    staleTime = 5 * 60 * 1000,
    gcTime = 15 * 60 * 1000,
    ...restOptions
  } = options;
  return useQuery({
    queryKey: ['recommendations', 'trending', params],
    queryFn: async () => {
      const res = await recommendationService.getTrending(params);
      return res.success ? res.data : res;
    },
    enabled,
    staleTime,
    gcTime,
    ...restOptions,
  });
}

export function usePersonalizedFeed(params, options = {}) {
  const {
    enabled = true,
    staleTime = 5 * 60 * 1000,
    gcTime = 15 * 60 * 1000,
    ...restOptions
  } = options;
  return useQuery({
    queryKey: ['recommendations', 'feed', params],
    queryFn: async () => {
      const res = await recommendationService.getFeed(params);
      return res.success ? res.data : res;
    },
    enabled,
    staleTime,
    gcTime,
    ...restOptions,
  });
}

export function useSimilarRecommendations(targetType, targetId, limit = 8, options = {}) {
  const {
    enabled = true,
    staleTime = 5 * 60 * 1000,
    gcTime = 15 * 60 * 1000,
    ...restOptions
  } = options;
  return useQuery({
    queryKey: ['recommendations', 'similar', targetType, targetId, limit],
    queryFn: async ({ signal }) => {
      const res = await recommendationService.getSimilar(targetType, targetId, limit, { signal });
      return res.success ? res.data : res;
    },
    staleTime,
    gcTime,
    ...restOptions,
    enabled: Boolean(targetType && targetId) && enabled,
  });
}

export function useCompleteSetup(targetId, targetType = 'product', limit = 6, options = {}) {
  const {
    enabled = true,
    staleTime = 5 * 60 * 1000,
    gcTime = 15 * 60 * 1000,
    ...restOptions
  } = options;
  return useQuery({
    queryKey: ['recommendations', 'completeSetup', targetId, targetType, limit],
    queryFn: async ({ signal }) => {
      const res = await recommendationService.getCompleteSetup(targetId, targetType, limit, {
        signal,
      });
      return res.success ? res.data : res;
    },
    staleTime,
    gcTime,
    ...restOptions,
    enabled: Boolean(targetId) && enabled,
  });
}

export function useAlsoViewed(targetId, targetType = 'product', limit = 8, options = {}) {
  const {
    enabled = true,
    staleTime = 5 * 60 * 1000,
    gcTime = 15 * 60 * 1000,
    ...restOptions
  } = options;
  return useQuery({
    queryKey: ['recommendations', 'alsoViewed', targetId, targetType, limit],
    queryFn: async ({ signal }) => {
      const res = await recommendationService.getAlsoViewed(targetId, targetType, limit, {
        signal,
      });
      return res.success ? res.data : res;
    },
    staleTime,
    gcTime,
    ...restOptions,
    enabled: Boolean(targetId) && enabled,
  });
}
