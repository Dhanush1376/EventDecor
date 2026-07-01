import { useEffect, useRef } from 'react';
import { couponService } from '../services/domainServices';
import logger from '../utils/core/logger';
import { useActiveCoupons } from './useActiveCoupons';

export function useAutoApplyCoupon({ claimedCoupon, subtotal, setAppliedCoupon, isAuthenticated }) {
  const { data: activeCoupons } = useActiveCoupons();
  const lastAttempt = useRef({ coupon: null, subtotal: 0, status: 'idle' });

  useEffect(() => {
    if (!isAuthenticated || subtotal === 0) {
      setAppliedCoupon(null);
      lastAttempt.current = { coupon: null, subtotal: 0, status: 'idle' };
      return;
    }

    const safeActiveCoupons = activeCoupons || [];

    const applyCouponLogic = async () => {
      let targetCoupon = null;

      // Priority 1: User explicitly claimed a coupon
      if (claimedCoupon) {
        targetCoupon = claimedCoupon;
      }

      if (!targetCoupon) {
        setAppliedCoupon(null);
        return;
      }

      // Prevent infinite loop or concurrent requests for the exact same coupon and subtotal
      if (
        lastAttempt.current.coupon === targetCoupon &&
        lastAttempt.current.subtotal === subtotal &&
        (lastAttempt.current.status === 'failed' || lastAttempt.current.status === 'pending')
      ) {
        return;
      }

      try {
        lastAttempt.current = { coupon: targetCoupon, subtotal, status: 'pending' };
        const res = await couponService.apply(targetCoupon, subtotal);
        if (res.success) {
          lastAttempt.current.status = 'success';
          setAppliedCoupon(res.data);
        } else {
          lastAttempt.current.status = 'failed';
          setAppliedCoupon(null);
        }
      } catch (err) {
        logger.error('[CartProvider] Failed to auto-apply coupon:', err);
        lastAttempt.current.status = 'failed';
        setAppliedCoupon(null);
      }
    };

    applyCouponLogic();
  }, [claimedCoupon, subtotal, setAppliedCoupon, isAuthenticated, activeCoupons]);
}
