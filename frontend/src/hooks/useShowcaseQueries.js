import { useQuery } from '@tanstack/react-query';
import { showcaseService } from '../services/domainServices';

export const useShowcases = (options = {}) => {
  return useQuery({
    queryKey: ['showcases'],
    queryFn: async () => {
      const res = await showcaseService.getAll();
      return Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
    ...options,
  });
};
