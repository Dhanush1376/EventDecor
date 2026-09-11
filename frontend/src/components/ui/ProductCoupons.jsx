import { Tag } from 'lucide-react';
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { couponService } from '../../services/domainServices';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import logger from '../../utils/core/logger';

export function ProductCoupons({ product, localAppliedCoupon, setLocalAppliedCoupon }) {
  const { user } = useAuth();
  const { setClaimedCoupon, claimedCoupon } = useCart();
  const [expanded, setExpanded] = useState(false);
  const [copiedCode, setCopiedCode] = useState(null);

  const productId = product?._id || product?.id;
  const userId = user?._id || user?.id || 'guest';

  const { data, isLoading } = useQuery({
    queryKey: ['product-coupons', productId, userId],
    queryFn: () => couponService.getProductCoupons(productId),
    enabled: !!productId,
  });

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-3 py-4 border-b border-outline-variant/10">
        <div className="h-4 bg-surface-container-high rounded w-1/3"></div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="h-20 bg-surface-container-high rounded-xl"></div>
          <div className="h-20 bg-surface-container-high rounded-xl"></div>
          <div className="h-20 bg-surface-container-high rounded-xl"></div>
        </div>
      </div>
    );
  }

  const payload = data?.data;
  const allCoupons = payload?.all || [];

  if (allCoupons.length === 0) {
    return null;
  }

  const initialCoupons = allCoupons.slice(0, 3);
  const extraCoupons = allCoupons.slice(3);

  const handleApply = (coupon) => {
    const isEligible = product.price >= (coupon.minOrderAmount || 0);
    if (!isEligible) return;

    navigator.clipboard.writeText(coupon.code).catch((err) => {
      logger.error('Failed to copy text: ', err);
    });
    if (setClaimedCoupon) {
      setClaimedCoupon(coupon.code);
    }
    if (setLocalAppliedCoupon) {
      setLocalAppliedCoupon(coupon.code);
    }
    setCopiedCode(coupon.code);

    // Confetti effect using the site's gold and warm color palette
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.85 },
      colors: ['#735c00', '#d4af37', '#ffe088', '#2a2c2a'],
    });

    setTimeout(() => {
      setCopiedCode(null);
    }, 2000);
  };

  return (
    <div
      className="py-4 border-b border-outline-variant/10"
      aria-label="Available Coupons and Offers"
    >
      <div className="flex items-center gap-2 mb-3">
        <Tag className="text-[18px] text-black" strokeWidth={1.5} />
        <span className="font-label text-[11px] lg:text-[12px] text-black uppercase tracking-[0.1em] font-bold">
          Available Coupons & Savings
        </span>
      </div>

      <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-1">
        {initialCoupons.map((coupon, idx) => (
          <div key={coupon._id || coupon.id || idx} className="w-[230px] sm:w-[250px] shrink-0">
            <CouponCard
              coupon={coupon}
              isBest={idx === 0}
              onApply={() => handleApply(coupon)}
              isCopied={copiedCode === coupon.code}
              isEligible={product.price >= (coupon.minOrderAmount || 0)}
            />
          </div>
        ))}
      </div>

      {extraCoupons.length > 0 && (
        <div className="mt-3">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1.5 text-primary hover:text-primary-container text-[11px] uppercase tracking-wider font-bold focus-visible:outline-none transition-colors cursor-pointer"
          >
            <span
              className="material-symbols-outlined text-[16px] transition-transform duration-300"
              style={{ transform: expanded ? 'rotate(180deg)' : 'none' }}
            >
              keyboard_arrow_down
            </span>
            {expanded ? 'Show Less' : `Explore More Offers (${extraCoupons.length} more)`}
          </button>

          <AnimatePresence initial={false}>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <div className="flex gap-3 pt-3 overflow-x-auto no-scrollbar pb-1">
                  {extraCoupons.map((coupon, idx) => (
                    <div
                      key={coupon._id || coupon.id || idx + 3}
                      className="w-[230px] sm:w-[250px] shrink-0"
                    >
                      <CouponCard
                        coupon={coupon}
                        isBest={false}
                        onApply={() => handleApply(coupon)}
                        isCopied={copiedCode === coupon.code}
                        isEligible={product.price >= (coupon.minOrderAmount || 0)}
                      />
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

export function CouponCard({
  coupon,
  isBest,
  onApply,
  isCopied,
  isEligible = true,
  disableHover = false,
  showHoverByDefault = false,
}) {
  const isPercentage = coupon?.discountType === 'percentage';
  const discountText = isPercentage
    ? `${coupon?.discountValue || 0}% Off`
    : `₹${Number(coupon?.discountValue || 0).toLocaleString('en-IN')} Off`;

  const minOrderText =
    (coupon?.minOrderAmount || 0) > 0
      ? `On order of ₹${Number(coupon.minOrderAmount).toLocaleString('en-IN')}`
      : 'No min. purchase';

  const expiryDate = coupon?.expiryDate ? new Date(coupon.expiryDate) : null;
  const formattedExpiry =
    expiryDate && !isNaN(expiryDate.getTime())
      ? expiryDate.toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
        })
      : 'TBD';

  return (
    <div
      onClick={isEligible && !disableHover ? onApply : undefined}
      onKeyDown={(e) => {
        if (isEligible && !disableHover && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onApply?.();
        }
      }}
      role={disableHover && !showHoverByDefault ? undefined : 'button'}
      tabIndex={isEligible && !disableHover ? 0 : -1}
      aria-label={`Coupon ${coupon?.code || 'COUPON'}: ${discountText}, ${minOrderText}`}
      className={`border border-dashed rounded-xl p-3 sm:p-3.5 flex flex-col justify-between backdrop-blur-md transition-all duration-300 relative overflow-hidden group select-none ${
        !isEligible
          ? 'border-outline-variant/20 opacity-60 grayscale cursor-not-allowed bg-[#fcfbf9]/60 dark:bg-surface-container/40'
          : showHoverByDefault
            ? 'border-primary/50 ring-1 ring-primary/20 shadow-xs bg-[#faf6e6]/80 dark:bg-[#2c281e]/80 cursor-default'
            : disableHover
              ? isBest
                ? 'border-primary/50 ring-1 ring-primary/20 shadow-2xs cursor-default bg-[#fcfbf9]/60 dark:bg-surface-container/40'
                : 'border-outline-variant/30 cursor-default bg-[#fcfbf9]/60 dark:bg-surface-container/40'
              : isBest
                ? 'border-primary/50 ring-1 ring-primary/20 shadow-2xs hover:shadow-xs hover:bg-[#faf6e6]/60 cursor-pointer bg-[#fcfbf9]/60 dark:bg-surface-container/40'
                : 'border-outline-variant/30 hover:border-primary/30 hover:bg-[#faf6e6]/60 cursor-pointer bg-[#fcfbf9]/60 dark:bg-surface-container/40'
      }`}
    >
      {/* Decorative Ticket Circles */}
      <div className="absolute top-1/2 -left-2 w-3.5 h-3.5 rounded-full bg-surface border-r border-outline-variant/20 -translate-y-1/2 z-10 pointer-events-none"></div>
      <div className="absolute top-1/2 -right-2 w-3.5 h-3.5 rounded-full bg-surface border-l border-outline-variant/20 -translate-y-1/2 z-10 pointer-events-none"></div>

      <div>
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span className="font-label text-[10px] font-bold tracking-wider text-on-surface bg-[#e9e8e5] dark:bg-surface-container-high px-2 py-0.5 rounded uppercase font-mono">
            {coupon?.code || 'COUPON'}
          </span>
          {isBest && (
            <span className="bg-[#2A2927] text-white text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full shadow-2xs">
              BEST OFFER
            </span>
          )}
        </div>

        <div className="font-display text-[15px] sm:text-[16px] text-on-surface font-bold tracking-tight leading-snug">
          {discountText}
        </div>
        <p
          className={`font-body text-[11px] font-medium leading-normal mt-0.5 ${!isEligible ? 'text-error' : 'text-on-surface/60'}`}
        >
          {minOrderText}
        </p>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-dashed border-outline-variant/20 mt-2">
        <span className="font-body text-[9px] text-on-surface/40 uppercase tracking-widest font-bold">
          Exp: {formattedExpiry}
        </span>
        <button
          type="button"
          disabled={!isEligible}
          className={`flex items-center gap-1 text-[9px] uppercase tracking-widest font-extrabold focus:outline-none transition-colors duration-300 pointer-events-none ${
            !isEligible
              ? 'text-on-surface/40'
              : isCopied
                ? 'text-green-700'
                : showHoverByDefault
                  ? 'text-primary-container font-black'
                  : disableHover
                    ? 'text-primary'
                    : 'text-primary group-hover:text-primary-container'
          }`}
          aria-hidden="true"
        >
          <span className="material-symbols-outlined text-[12px]" style={{ transform: 'none' }}>
            {!isEligible ? 'block' : isCopied ? 'check' : 'content_copy'}
          </span>
          {!isEligible ? 'Not Eligible' : isCopied ? 'Copied!' : 'Copy Code'}
        </button>
      </div>
    </div>
  );
}
