import { useQuery } from '@tanstack/react-query';
import { returnService } from '../services/api/returnService';

/**
 * Return/exchange records created by the previous automated flow for one order (read-only).
 * New requests go through WhatsApp and are not stored, so this data only changes when staff
 * edit legacy records; one shared, cached request serves every component on the order page.
 */
export function useLegacyReturnSummary(orderId) {
  return useQuery({
    queryKey: ['legacy-return-summary', orderId],
    enabled: Boolean(orderId),
    staleTime: 5 * 60 * 1000,
    retry: 1,
    queryFn: async ({ signal }) => {
      const res = await returnService.getOrderReturnSummary(orderId, { signal });
      const data = res.data?.data || {};
      return {
        returns: Array.isArray(data.returns) ? data.returns : [],
        exchanges: Array.isArray(data.exchanges) ? data.exchanges : [],
      };
    },
  });
}
