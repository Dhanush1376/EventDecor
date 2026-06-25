import { useQuery } from '@tanstack/react-query';
import { couponService } from '../services/domainServices';
import logger from '../utils/core/logger';

export function useActiveCoupons() {
  return useQuery({
    queryKey: ['storefront-active-coupons'],
    queryFn: async () => {
      try {
        const res = await couponService.getAll();
        if (res.success) {
          const list =
            res.data?.data || res.data?.items || (Array.isArray(res.data) ? res.data : []);
          const now = new Date();

          return list.filter((c) => {
            // Filter strictly to active, unexpired coupons
            if (!c.isActive) return false;
            if (c.expiryDate && new Date(c.expiryDate) < now) return false;
            if (c.startDate && new Date(c.startDate) > now) return false;

            // Usage limit
            if (c.usageLimit && c.usageLimit > 0 && c.usedCount >= c.usageLimit) return false;

            return true;
          });
        }
        return [];
      } catch (err) {
        logger.error('Failed to fetch active coupons globally:', err);
        return [];
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}
