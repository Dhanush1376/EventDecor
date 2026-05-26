import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

export function usePersonalizedSections(sessionId) {
  return useQuery({
    queryKey: ['homepage-sections', sessionId],
    queryFn: async () => {
      const response = await api.get('/recommendations/homepage-sections', {
        headers: {
          'x-session-id': sessionId
        }
      });
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000,
    retry: 1,
    enabled: Boolean(sessionId),
    refetchOnWindowFocus: false,
  });
}
