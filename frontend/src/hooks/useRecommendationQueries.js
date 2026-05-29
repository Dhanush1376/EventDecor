import { useQuery } from '@tanstack/react-query';
import recommendationService from '../services/recommendationService';

export function useTrendingRecommendations(params, options = {}) {
  return useQuery({
    queryKey: ['recommendations', 'trending', params],
    queryFn: async () => {
      const res = await recommendationService.getTrending(params);
      return res.success ? res.data : res;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    ...options
  });
}

export function usePersonalizedFeed(params, options = {}) {
  return useQuery({
    queryKey: ['recommendations', 'feed', params],
    queryFn: async () => {
      const res = await recommendationService.getFeed(params);
      return res.success ? res.data : res;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    ...options
  });
}

export function useSimilarRecommendations(targetType, targetId, limit = 8, options = {}) {
  return useQuery({
    queryKey: ['recommendations', 'similar', targetType, targetId, limit],
    queryFn: async ({ signal }) => {
      const res = await recommendationService.getSimilar(targetType, targetId, limit, { signal });
      return res.success ? res.data : res;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    ...options,
    enabled: Boolean(targetType && targetId) && (options.enabled !== false),
  });
}

export function useCompleteSetup(targetId, limit = 6, options = {}) {
  return useQuery({
    queryKey: ['recommendations', 'completeSetup', targetId, limit],
    queryFn: async ({ signal }) => {
      const res = await recommendationService.getCompleteSetup(targetId, limit, { signal });
      return res.success ? res.data : res;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    ...options,
    enabled: Boolean(targetId) && (options.enabled !== false),
  });
}

export function useAlsoViewed(targetId, targetType = 'product', limit = 8, options = {}) {
  return useQuery({
    queryKey: ['recommendations', 'alsoViewed', targetId, targetType, limit],
    queryFn: async ({ signal }) => {
      const res = await recommendationService.getAlsoViewed(targetId, targetType, limit, { signal });
      return res.success ? res.data : res;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    ...options,
    enabled: Boolean(targetId) && (options.enabled !== false),
  });
}
