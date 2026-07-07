import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import logger from '../utils/core/logger';

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      // Intentionally do not show a global toast for background refetch failures
      // The user already has cached data, so background failures shouldn't interrupt them
      logger.warn(
        `[QueryCache] Background update failed for query ${query.queryKey.join('-')}:`,
        error,
      );
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      // Intentionally ignore mutations that were successfully queued offline
      // as NetworkProvider already shows a success toast for them
      if (error.offlineQueued) return;

      // Only show global toast if the mutation didn't define its own custom onError handler
      if (!mutation.options.onError) {
        toast.error(
          error.response?.data?.message ||
            error.message ||
            'An error occurred while processing your request.',
        );
      }
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
      networkMode: 'offlineFirst',
      refetchOnMount: true,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      retry: (failureCount, error) => {
        if (failureCount >= 3) return false;
        const status = error?.response?.status || error?.normalized?.status;
        if (status && [400, 401, 403, 404, 422].includes(status)) {
          return false;
        }
        return true;
      },
    },
  },
});

queryClient.setQueryDefaults(['product'], { staleTime: 1000 * 60 * 5, gcTime: 1000 * 60 * 30 });
queryClient.setQueryDefaults(['products'], {
  staleTime: 1000 * 60 * 2,
  gcTime: 1000 * 60 * 30,
  refetchOnMount: true,
  refetchOnReconnect: true,
});
queryClient.setQueryDefaults(['cart'], { staleTime: 1000 * 60 * 2, gcTime: 1000 * 60 * 5 });
queryClient.setQueryDefaults(['profile'], { staleTime: 1000 * 60 * 2, gcTime: 1000 * 60 * 10 });
queryClient.setQueryDefaults(['cms'], {
  staleTime: 1000 * 60 * 15,
  gcTime: 1000 * 60 * 60,
  refetchOnMount: false,
  refetchOnReconnect: false,
});
queryClient.setQueryDefaults(['recommendations'], {
  staleTime: 1000 * 60 * 10,
  gcTime: 1000 * 60 * 30,
  refetchOnMount: false,
});
