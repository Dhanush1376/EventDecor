import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import logger from '../utils/core/logger';
import { persistentStorage } from '../utils/storage/persistentStorage';
import { userService } from '../services/domainServices';
import { cleanRentalInfo } from '../utils/ecommerce/cartCalculations';

export function useCartMerge({
  isAuthenticated,
  syncCart,
  emptySummary,
  setGuestPurchaseCart,
  setGuestRentalCart,
  setGuestCustomCart,
}) {
  const lastAuthRef = useRef(isAuthenticated);

  useEffect(() => {
    if (isAuthenticated && !lastAuthRef.current) {
      const mergeGuestCart = async () => {
        try {
          const guestCart = persistentStorage.getItem('siri_cart_cache');
          const allGuestItems = [
            ...(guestCart?.purchaseCart?.items || []),
            ...(guestCart?.rentalCart?.items || []),
          ];

          if (allGuestItems.length > 0) {
            logger.info(
              '[Cart] Merging guest cart items with authenticated database cart upon sign-in:',
              allGuestItems,
            );

            const dbCartRes = await userService.getCart();
            const dbPurchaseItems = dbCartRes?.success
              ? dbCartRes.data?.purchaseCart?.items || []
              : [];
            const dbRentalItems = dbCartRes?.success ? dbCartRes.data?.rentalCart?.items || [] : [];
            const allDbItems = [...dbPurchaseItems, ...dbRentalItems];

            const mergedPayloadMap = new Map();

            allDbItems.forEach((item) => {
              const pId = item.product?._id || item.product?.id || item.product;
              if (pId) mergedPayloadMap.set(pId, item);
            });

            allGuestItems.forEach((item) => {
              const pId = item._id || item.id;
              if (pId) {
                const existing = mergedPayloadMap.get(pId);
                if (existing) {
                  existing.quantity += item.quantity;
                } else {
                  mergedPayloadMap.set(pId, {
                    product: pId,
                    quantity: item.quantity,
                    type: item.type || 'purchase',
                    rentalInfo: cleanRentalInfo(item.rentalInfo),
                    deposit: item.deposit,
                  });
                }
              }
            });

            const syncPayload = Array.from(mergedPayloadMap.values()).map((item) => {
              return {
                product:
                  item.product?._id || item.product?.id || item._id || item.id || item.product,
                quantity: item.quantity,
                type: item.type || 'purchase',
                rentalInfo: cleanRentalInfo(item.rentalInfo),
                deposit: item.deposit,
              };
            });

            await syncCart({ cartItems: syncPayload });
            toast.success('Your guest shopping bag was merged successfully!');
          }
        } catch (err) {
          logger.error('[Cart] Guest-to-auth cart merge failed:', err);
        } finally {
          setGuestPurchaseCart({ items: [], summary: emptySummary });
          setGuestRentalCart({ items: [], summary: { ...emptySummary, depositTotal: 0 } });
          if (setGuestCustomCart) setGuestCustomCart({ items: [], summary: emptySummary });
          persistentStorage.removeItem('siri_cart_cache');
        }
      };

      mergeGuestCart();
    }
    lastAuthRef.current = isAuthenticated;
  }, [
    isAuthenticated,
    syncCart,
    emptySummary,
    setGuestPurchaseCart,
    setGuestRentalCart,
    setGuestCustomCart,
  ]);
}
