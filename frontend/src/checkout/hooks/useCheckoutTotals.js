import { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import { persistentStorage } from '../../utils/storage/persistentStorage';
import { orderService, couponService } from '../../services/domainServices';
import logger from '../../utils/core/logger';

export function useCheckoutTotals({
  isAuthenticated,
  activeItems,
  paymentOption,
  location,
  claimedCoupon,
  setClaimedCoupon,
}) {
  const [couponInput, setCouponInput] = useState(() => {
    return persistentStorage.getItem('siri_checkout_coupon_input', { session: true, fallback: '' });
  });
  const [appliedCoupon, setAppliedCoupon] = useState(() => {
    return persistentStorage.getItem('siri_checkout_applied_coupon', {
      session: true,
      fallback: '',
    });
  });

  useEffect(() => {
    persistentStorage.setItem('siri_checkout_coupon_input', couponInput, { session: true });
  }, [couponInput]);

  useEffect(() => {
    persistentStorage.setItem('siri_checkout_applied_coupon', appliedCoupon, { session: true });
  }, [appliedCoupon]);

  const [couponValid, setCouponValid] = useState(false);
  const [couponMessage, setCouponMessage] = useState('');
  const [availableCoupons, setAvailableCoupons] = useState([]);
  const [loadingCoupons, setLoadingCoupons] = useState(false);
  const [backendTotals, setBackendTotals] = useState({
    subtotal: 0,
    discount: 0,
    shippingFee: 0,
    platformFee: 0,
    total: 0,
  });
  const [isTotalsLoading, setIsTotalsLoading] = useState(false);
  const [totalsError, setTotalsError] = useState(null);

  const [useWallet, setUseWallet] = useState(() => {
    return persistentStorage.getItem('siri_checkout_use_wallet', {
      session: true,
      fallback: false,
    });
  });

  useEffect(() => {
    persistentStorage.setItem('siri_checkout_use_wallet', useWallet, { session: true });
  }, [useWallet]);

  const totalsRequestRef = useRef(0);
  const autoApplyAttemptedRef = useRef(false);

  useEffect(() => {
    if (isAuthenticated) {
      const timer = setTimeout(() => {
        setLoadingCoupons(true);
      }, 0);
      couponService
        .getAll()
        .then((res) => {
          if (res.success && res.data) {
            const list =
              res.data.data || res.data.items || (Array.isArray(res.data) ? res.data : []);
            const activeList = list.filter((c) => {
              const isExpired = new Date() > new Date(c.expiryDate);
              return c.isActive && !isExpired && (!c.usageLimit || c.usedCount < c.usageLimit);
            });

            // Deduplicate dynamically generated coupons (like WELCOME-XXXX)
            const uniqueCoupons = [];
            const seenPrefixes = new Set();
            for (const c of activeList) {
              const prefixMatch = c.code.match(/^([A-Z]+)-[A-Z0-9]+$/);
              const prefix = prefixMatch ? prefixMatch[1] : c.code;

              if (!seenPrefixes.has(prefix)) {
                seenPrefixes.add(prefix);
                uniqueCoupons.push(c);
              }
            }

            setAvailableCoupons(uniqueCoupons);
          }
        })
        .catch((err) => {
          logger.error('Failed to load active coupons:', err);
        })
        .finally(() => {
          setLoadingCoupons(false);
        });
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && !autoApplyAttemptedRef.current) {
      const couponCodeToApply = location?.state?.couponCode || claimedCoupon;
      if (couponCodeToApply && couponCodeToApply !== appliedCoupon) {
        logger.info(`Auto-applying coupon: ${couponCodeToApply}`);
        setCouponInput(couponCodeToApply);
        setAppliedCoupon(couponCodeToApply);
        autoApplyAttemptedRef.current = true;
        if (claimedCoupon) {
          setClaimedCoupon('');
        }
        toast.success(`Auto-applied coupon "${couponCodeToApply}"!`);
      }
    }
  }, [isAuthenticated, claimedCoupon, location, appliedCoupon, setClaimedCoupon]);

  const fetchBackendTotals = useCallback(
    async (couponToApply = '') => {
      if (!activeItems || activeItems.length === 0) return;
      const requestId = totalsRequestRef.current + 1;
      totalsRequestRef.current = requestId;

      setIsTotalsLoading(true);
      setTotalsError(null);
      try {
        const itemsPayload = activeItems.map((item) => ({
          productId: item.id || item._id,
          quantity: item.quantity,
        }));

        const res = await orderService.validateTotals({
          items: itemsPayload,
          couponCode: couponToApply || undefined,
          paymentMethod: paymentOption,
          useWallet,
        });

        if (res.success && res.data) {
          if (requestId !== totalsRequestRef.current) return;
          setBackendTotals(res.data);
          setTotalsError(null);
          if (couponToApply) {
            setCouponValid(res.data.couponValid);
            setCouponMessage(res.data.couponMessage);
            if (res.data.couponValid) {
              setAppliedCoupon(couponToApply);
            } else {
              setAppliedCoupon('');
            }
          }
        }
      } catch (err) {
        logger.error('Failed to validate checkout totals:', err);
        const errMsg =
          err.response?.data?.message ||
          'Failed to connect to backend server. Please verify your connection.';
        setTotalsError(errMsg);
        toast.error(errMsg);
      } finally {
        if (requestId === totalsRequestRef.current) {
          setIsTotalsLoading(false);
        }
      }
    },
    [activeItems, paymentOption, useWallet],
  );

  useEffect(() => {
    fetchBackendTotals(appliedCoupon);
  }, [appliedCoupon, fetchBackendTotals]);

  const handleApplyCoupon = () => {
    if (!couponInput.trim()) {
      toast.error('Please enter a coupon code');
      return;
    }
    fetchBackendTotals(couponInput.trim());
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon('');
    setCouponInput('');
    setCouponMessage('');
    setCouponValid(false);
    fetchBackendTotals('');
  };

  return {
    couponInput,
    setCouponInput,
    appliedCoupon,
    setAppliedCoupon,
    couponValid,
    setCouponValid,
    couponMessage,
    setCouponMessage,
    availableCoupons,
    setAvailableCoupons,
    loadingCoupons,
    setLoadingCoupons,
    backendTotals,
    setBackendTotals,
    isTotalsLoading,
    setIsTotalsLoading,
    totalsError,
    setTotalsError,
    useWallet,
    setUseWallet,
    fetchBackendTotals,
    handleApplyCoupon,
    handleRemoveCoupon,
  };
}
