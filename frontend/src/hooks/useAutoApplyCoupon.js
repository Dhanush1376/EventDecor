import { useEffect } from 'react';
import { couponService } from '../services/domainServices';
import logger from '../utils/core/logger';
import { useActiveCoupons } from './useActiveCoupons';

export function useAutoApplyCoupon({ claimedCoupon, subtotal, setAppliedCoupon, isAuthenticated }) {
  const { data: activeCoupons = [] } = useActiveCoupons();

  useEffect(() => {
    if (!isAuthenticated || subtotal === 0) {
      setAppliedCoupon(null);
      return;
    }

    const applyCouponLogic = async () => {
      try {
        // Priority 1: User explicitly claimed a coupon
        if (claimedCoupon) {
          const res = await couponService.apply(claimedCoupon, subtotal);
          if (res.success) {
            setAppliedCoupon(res.data);
            return;
          }
        }

        // Priority 2: System Auto-Apply Coupons
        const autoCoupons = activeCoupons.filter(
          (c) => c.isAutoApply && c.minOrderAmount <= subtotal,
        );
        if (autoCoupons.length > 0) {
          // Sort by max discount value logic (approximation: largest minOrderAmount first)
          autoCoupons.sort((a, b) => (b.minOrderAmount || 0) - (a.minOrderAmount || 0));
          const bestCoupon = autoCoupons[0];

          const res = await couponService.apply(bestCoupon.code, subtotal);
          if (res.success) {
            setAppliedCoupon(res.data);
            return;
          }
        }

        // If no coupon could be applied
        setAppliedCoupon(null);
      } catch (err) {
        logger.error('[CartProvider] Failed to auto-apply coupon:', err);
        setAppliedCoupon(null);
      }
    };

    applyCouponLogic();
  }, [claimedCoupon, subtotal, setAppliedCoupon, isAuthenticated, activeCoupons]);
}
