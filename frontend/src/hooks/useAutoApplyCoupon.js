import { useEffect } from 'react';
import { couponService } from '../services/domainServices';
import logger from '../utils/core/logger';

export function useAutoApplyCoupon({ claimedCoupon, subtotal, setAppliedCoupon, isAuthenticated }) {
  useEffect(() => {
    if (!isAuthenticated) {
      setAppliedCoupon(null);
      return;
    }

    if (!claimedCoupon) {
      setAppliedCoupon(null);
      return;
    }

    if (subtotal === 0) {
      setAppliedCoupon(null);
      return;
    }

    const applyClaimedCoupon = async () => {
      try {
        const res = await couponService.apply(claimedCoupon, subtotal);
        if (res.success) {
          setAppliedCoupon(res.data);
        } else {
          setAppliedCoupon(null);
        }
      } catch (err) {
        logger.error('[CartProvider] Failed to auto-apply claimed coupon:', err);
        setAppliedCoupon(null);
      }
    };

    applyClaimedCoupon();
  }, [claimedCoupon, subtotal, setAppliedCoupon]);
}
