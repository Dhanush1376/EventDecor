import React, { useState, useEffect } from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';
import { useActiveCoupons } from '../../hooks/useActiveCoupons';
import { useCart } from '../../context/CartContext';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';

export function FloatingOfferCard() {
  const { data: activeCoupons = [] } = useActiveCoupons();
  const { appliedCoupon, setClaimedCoupon, setAppliedCoupon } = useCart();
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(false);
  const [hasDismissed, setHasDismissed] = useState(false);

  // Hide on admin routes or checkout
  const isHiddenRoute =
    location.pathname.startsWith('/admin') || location.pathname.startsWith('/checkout');

  const floatingCoupons = activeCoupons.filter(
    (c) => c.displayLocations?.includes('floating_app') && c.isFeatured,
  );

  const offer = floatingCoupons[0]; // Just show the top featured one

  useEffect(() => {
    // Show after a slight delay so it doesn't pop up instantly on page load
    if (offer && !appliedCoupon && !isHiddenRoute && !hasDismissed) {
      const timer = setTimeout(() => setIsVisible(true), 3000);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [offer, appliedCoupon, isHiddenRoute, hasDismissed]);

  if (!offer) return null;

  const handleApply = () => {
    setClaimedCoupon(offer.code);
    if (setAppliedCoupon) setAppliedCoupon(offer.code);
    setIsVisible(false);
    toast.success(`Coupon ${offer.code} claimed!`, {
      icon: '✨',
      style: {
        border: '1px solid #BFA15F',
        padding: '12px 16px',
        color: '#2d2b29',
        background: '#ffffff',
        borderRadius: '12px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
      },
    });
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-6 right-6 z-50 w-[280px] bg-white rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.15)] overflow-hidden border border-[var(--color-gold-dark)]/30 group"
        >
          {/* Animated Gradient Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-gold-dark)]/5 via-white to-transparent" />

          <button
            onClick={() => {
              setIsVisible(false);
              setHasDismissed(true);
            }}
            className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/5 flex items-center justify-center text-black/40 hover:text-black hover:bg-black/10 transition-colors z-10"
          >
            <span className="material-symbols-outlined text-[14px]">close</span>
          </button>

          <div className="relative p-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-[var(--color-gold-dark)] text-[18px] animate-pulse">
                local_activity
              </span>
              <span className="font-label text-[10px] uppercase tracking-widest font-bold text-neutral-500">
                Exclusive Offer
              </span>
            </div>

            <h3 className="font-display text-[16px] text-[#1a1a1a] leading-tight mb-1">
              {offer.discountType === 'percentage'
                ? `Take ${offer.discountValue}% OFF`
                : `Save ₹${offer.discountValue}`}
            </h3>

            <p className="font-body text-[12px] text-neutral-500 leading-snug mb-4">
              {offer.minOrderAmount > 0
                ? `On your order of ₹${offer.minOrderAmount} or more.`
                : `Enjoy this special discount on us!`}
            </p>

            <button
              onClick={handleApply}
              className="w-full bg-[#1a1a1a] text-white py-2.5 rounded-xl font-label text-[11px] uppercase tracking-[0.15em] font-bold shadow-md hover:bg-[var(--color-gold-dark)] transition-colors active:scale-95 flex items-center justify-center gap-2"
            >
              Apply Code{' '}
              <span className="font-mono bg-white/20 px-1.5 py-0.5 rounded text-[10px]">
                {offer.code}
              </span>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
