import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { couponService } from '../../services/domainServices';
import { useCart } from '../../context/CartContext';
import logger from '../../utils/core/logger';

export function ProductCoupons({ product }) {
  const { setClaimedCoupon, claimedCoupon } = useCart();
  const [expanded, setExpanded] = useState(false);
  const [copiedCode, setCopiedCode] = useState(null);

  const productId = product?._id || product?.id;

  const { data, isLoading } = useQuery({
    queryKey: ['product-coupons', productId],
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

  const handleCopy = (code) => {
    navigator.clipboard.writeText(code).catch((err) => {
      logger.error('Failed to copy text: ', err);
    });
    if (setClaimedCoupon) {
      setClaimedCoupon(code);
    }
    setCopiedCode(code);

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
        <span
          className="material-symbols-outlined text-[18px] text-black"
          style={{ transform: 'none' }}
        >
          sell
        </span>
        <span className="font-label text-[11px] md:text-[12px] text-black uppercase tracking-[0.1em] font-bold">
          Available Coupons & Savings
        </span>
      </div>

      <div className="flex sm:grid sm:grid-cols-3 gap-3 overflow-x-auto sm:overflow-x-visible no-scrollbar pb-3 sm:pb-0 snap-x snap-mandatory -mx-[18px] pl-[18px] pr-[18px] scroll-pl-[18px] sm:mx-0 sm:px-0">
        {initialCoupons.map((coupon, idx) => (
          <div
            key={coupon._id || coupon.id || idx}
            className="w-[280px] sm:w-auto shrink-0 snap-start"
          >
            <CouponCard
              coupon={coupon}
              isBest={idx === 0}
              onCopy={handleCopy}
              isCopied={copiedCode === coupon.code}
              isApplied={claimedCoupon === coupon.code}
            />
          </div>
        ))}
      </div>

      {extraCoupons.length > 0 && (
        <div className="mt-3">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1.5 text-primary hover:text-primary-container text-[11px] uppercase tracking-wider font-bold focus-visible:outline-none transition-colors"
          >
            <span
              className="material-symbols-outlined text-[16px] transition-transform duration-300"
              style={{ transform: 'none' }}
            >
              {expanded ? 'keyboard_arrow_up' : 'keyboard_arrow_down'}
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
                <div className="flex sm:grid sm:grid-cols-3 gap-3 pt-3 overflow-x-auto sm:overflow-x-visible no-scrollbar pb-3 sm:pb-0 snap-x snap-mandatory -mx-4 px-4 sm:mx-0 sm:px-0">
                  {extraCoupons.map((coupon, idx) => (
                    <div
                      key={coupon._id || coupon.id || idx + 3}
                      className="w-[280px] sm:w-auto shrink-0 snap-start"
                    >
                      <CouponCard
                        coupon={coupon}
                        isBest={false}
                        onCopy={handleCopy}
                        isCopied={copiedCode === coupon.code}
                        isApplied={claimedCoupon === coupon.code}
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

function CouponCard({ coupon, isBest, onCopy, isApplied }) {
  const isPercentage = coupon.discountType === 'percentage';
  const discountText = isPercentage
    ? `${coupon.discountValue}% Off`
    : `₹${coupon.discountValue} Off`;

  const minOrderText =
    coupon.minOrderAmount > 0
      ? `On order of ₹${coupon.minOrderAmount.toLocaleString()}`
      : 'No min. purchase';

  const expiryDate = new Date(coupon.expiryDate);
  const formattedExpiry = expiryDate.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });

  return (
    <div
      onClick={() => onCopy(coupon.code)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onCopy(coupon.code);
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`Coupon ${coupon.code}: ${discountText}, ${minOrderText}`}
      className={`border-2 border-dashed rounded-xl p-3 flex flex-col justify-between gap-1 bg-[#fcfbf9]/60 hover:bg-[#faf6e6]/60 backdrop-blur-md cursor-pointer transition-all duration-300 relative overflow-hidden group select-none ${
        isBest
          ? 'border-primary/50 ring-1 ring-primary/20 shadow-2xs hover:shadow-xs'
          : 'border-outline-variant/30 hover:border-primary/30'
      }`}
    >
      {/* Decorative Ticket Circles */}
      <div className="absolute top-1/2 -left-2.5 w-5 h-5 rounded-full bg-surface border-r border-outline-variant/20 -translate-y-1/2 z-10 pointer-events-none"></div>
      <div className="absolute top-1/2 -right-2.5 w-5 h-5 rounded-full bg-surface border-l border-outline-variant/20 -translate-y-1/2 z-10 pointer-events-none"></div>

      <div>
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="font-label text-[10px] font-bold tracking-wider text-on-surface bg-[#e9e8e5] px-2 py-0.5 rounded uppercase">
            {coupon.code}
          </span>
          {isBest && (
            <span className="bg-primary-container/20 border border-primary/40 text-primary font-bold px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wider whitespace-nowrap">
              Best Offer
            </span>
          )}
        </div>

        <div className="font-display text-[15px] sm:text-[16px] text-on-surface font-semibold tracking-tight leading-snug">
          {discountText}
        </div>
        <p className="font-body text-[11px] text-on-surface/60 font-medium leading-normal mt-0.5">
          {minOrderText}
        </p>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-dashed border-outline-variant/20 mt-1">
        <span className="font-body text-[9px] text-on-surface/40 uppercase tracking-widest font-bold">
          Exp: {formattedExpiry}
        </span>
        <button
          className={`flex items-center gap-1 text-[9px] uppercase tracking-widest font-extrabold focus:outline-none transition-colors duration-300 pointer-events-none ${
            isApplied ? 'text-green-700' : 'text-primary group-hover:text-primary-container'
          }`}
          aria-hidden="true"
        >
          <span className="material-symbols-outlined text-[12px]" style={{ transform: 'none' }}>
            {isApplied ? 'check_circle' : 'local_offer'}
          </span>
          {isApplied ? 'Applied' : 'Apply'}
        </button>
      </div>
    </div>
  );
}
