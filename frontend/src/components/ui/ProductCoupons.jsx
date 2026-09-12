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
            className="flex items-center gap-1.5 text-[#8c7335] hover:text-[#735e29] text-[11px] uppercase tracking-wider font-bold focus-visible:outline-none transition-colors cursor-pointer"
          >
            <span
              className="material-symbols-outlined text-[16px] transition-transform duration-300"
              style={{ transform: expanded ? 'rotate(180deg)' : 'none' }}
            >
              keyboard_arrow_down
            </span>
            {expanded ? 'Show Less' : `EXPLORE MORE OFFERS (${extraCoupons.length} MORE)`}
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
      className={`border-[1.5px] border-dashed rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between backdrop-blur-md transition-all duration-300 relative overflow-hidden group select-none ${
        !isEligible
          ? 'border-[#bfa36c]/25 opacity-60 grayscale cursor-not-allowed bg-[#fcfbf9]/60 dark:bg-surface-container/40'
          : showHoverByDefault
            ? 'border-[#bfa36c] ring-1 ring-[#bfa36c]/20 shadow-xs bg-[#faf6e6]/80 dark:bg-[#2c281e]/80 cursor-default'
            : disableHover
              ? isBest
                ? 'border-[#bfa36c] shadow-2xs cursor-default bg-[#fcfbf9]/60 dark:bg-surface-container/40'
                : 'border-[#bfa36c]/50 cursor-default bg-[#fcfbf9]/60 dark:bg-surface-container/40'
              : isBest
                ? 'border-[#bfa36c] shadow-2xs hover:shadow-xs hover:bg-[#faf6e6]/60 cursor-pointer bg-[#fcfbf9]/60 dark:bg-surface-container/40'
                : 'border-[#bfa36c]/50 hover:border-[#bfa36c] hover:bg-[#faf6e6]/60 cursor-pointer bg-[#fcfbf9]/60 dark:bg-surface-container/40'
      }`}
    >
      {/* BEST OFFER Corner Badge */}
      {isBest && (
        <span className="absolute top-0 right-0 bg-[#221f1f] text-white text-[8px] sm:text-[8.5px] font-bold uppercase tracking-widest px-3 py-1 rounded-bl-2xl rounded-tr-[14px] rounded-tl-[4px] shadow-xs z-10 select-none pointer-events-none">
          BEST OFFER
        </span>
      )}

      {/* Decorative Ticket Circles */}
      <div className="absolute top-1/2 -left-2 w-3.5 h-3.5 rounded-full bg-white dark:bg-stone-900 border-r border-[#bfa36c]/30 -translate-y-1/2 z-10 pointer-events-none"></div>
      <div className="absolute top-1/2 -right-2 w-3.5 h-3.5 rounded-full bg-white dark:bg-stone-900 border-l border-[#bfa36c]/30 -translate-y-1/2 z-10 pointer-events-none"></div>

      <div>
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span className="font-mono text-[10px] font-bold tracking-wider text-stone-800 dark:text-stone-200 bg-[#e7e5e1] dark:bg-stone-800 px-2.5 py-0.5 rounded-[4px] uppercase inline-block">
            {coupon?.code || 'COUPON'}
          </span>
        </div>

        <div className="font-serif text-[16px] sm:text-[17px] text-stone-900 dark:text-stone-100 font-bold tracking-tight leading-snug">
          {discountText}
        </div>
        <p
          className={`font-body text-[11px] font-medium leading-normal mt-0.5 ${!isEligible ? 'text-red-500' : 'text-stone-600 dark:text-stone-400'}`}
        >
          {minOrderText}
        </p>
      </div>

      <div className="flex items-center justify-between pt-2.5 border-t border-dashed border-[#bfa36c]/25 mt-2.5">
        <span className="font-body text-[9.5px] text-stone-500 dark:text-stone-400 uppercase tracking-wider font-bold">
          EXP: {formattedExpiry}
        </span>
        <button
          type="button"
          disabled={!isEligible}
          className={`flex items-center gap-1.5 text-[9.5px] uppercase tracking-wider font-extrabold focus:outline-none transition-colors duration-300 pointer-events-none ${
            !isEligible
              ? 'text-stone-400'
              : isCopied
                ? 'text-emerald-600'
                : showHoverByDefault
                  ? 'text-[#8c7335] font-black'
                  : disableHover
                    ? 'text-[#8c7335]'
                    : 'text-[#8c7335] group-hover:text-[#735e29]'
          }`}
          aria-hidden="true"
        >
          <span className="material-symbols-outlined text-[13px]" style={{ transform: 'none' }}>
            {!isEligible ? 'block' : isCopied ? 'check' : 'content_copy'}
          </span>
          {!isEligible ? 'NOT ELIGIBLE' : isCopied ? 'COPIED!' : 'COPY CODE'}
        </button>
      </div>
    </div>
  );
}
