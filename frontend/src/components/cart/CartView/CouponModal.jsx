import { X, AlertCircle, CheckCircle2 } from 'lucide-react';
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { useScrollLock } from '../../../hooks/useScrollLock';

export function CouponModal({
  isCouponModalOpen,
  setIsCouponModalOpen,
  handleApplyCoupon,
  couponInput,
  setCouponInput,
  couponError,
  setCouponError,
  activeCoupons,
  actualSubtotal,
  items = [],
}) {
  useScrollLock(isCouponModalOpen);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isCouponModalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-end justify-center sm:items-center sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsCouponModalOpen(false)}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="relative w-full max-w-[500px] flex flex-col z-[1001]"
          >
            <div className="w-full bg-surface-bright rounded-t-[24px] sm:rounded-[24px] p-6 sm:p-8 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] overflow-hidden max-h-[85vh] flex flex-col">
              <div className="w-12 h-1.5 bg-outline-variant/60 rounded-full mx-auto mb-6 sm:hidden" />
              <button
                onClick={() => setIsCouponModalOpen(false)}
                className="absolute top-6 right-6 w-8 h-8 min-h-0 rounded-full bg-surface-container-lowest border border-outline-variant/40 flex items-center justify-center hover:bg-surface-container transition-all z-50 cursor-pointer shadow-xs hidden sm:flex"
              >
                <X className="text-[16px]" strokeWidth={1.5} />
              </button>
              <div className="relative z-10 flex flex-col h-full max-h-[75vh]">
                <div className="mb-6">
                  <h2 className="text-[20px] font-bold text-on-surface leading-tight mb-1">
                    Coupons & Offers
                  </h2>
                  <p className="text-secondary text-[12px]">
                    Enter a promo code or select an offer below
                  </p>
                </div>

                <form onSubmit={(e) => handleApplyCoupon(e)} className="flex gap-2 mb-6">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="ENTER PROMO CODE"
                      value={couponInput}
                      onChange={(e) => {
                        setCouponInput(e.target.value.toUpperCase());
                        if (couponError) setCouponError('');
                      }}
                      className="w-full bg-surface-container-lowest border border-outline-variant/60 rounded-xl px-4 py-3 text-[13px] outline-none focus:border-primary text-on-surface font-bold uppercase transition-all tracking-wider"
                    />
                    <AnimatePresence>
                      {couponError && (
                        <motion.div
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="absolute -bottom-10 left-0 right-0 bg-red-50 text-red-600 px-3 py-1.5 rounded-lg text-[10px] font-bold border border-red-100 flex items-center gap-1.5 z-10 shadow-sm"
                        >
                          <AlertCircle className="text-[14px]" strokeWidth={1.5} />
                          {couponError}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <button
                    type="submit"
                    disabled={!couponInput.trim()}
                    className="bg-on-surface text-surface disabled:opacity-30 disabled:cursor-not-allowed px-6 rounded-xl text-[12px] font-bold uppercase tracking-wider transition-all cursor-pointer hover:bg-on-surface/90"
                  >
                    Apply
                  </button>
                </form>

                <div className="flex-1 overflow-y-auto pr-2 space-y-4 scrollbar-thin">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-secondary block">
                    Available Offers
                  </span>

                  {activeCoupons.length === 0 ? (
                    <div className="text-center py-10 space-y-2">
                      <span className="material-symbols-outlined text-secondary/40 text-4xl">
                        local_activity
                      </span>
                      <p className="text-xs font-semibold text-secondary/70">
                        No coupons available right now.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {activeCoupons.map((c) => {
                        const isUnlockedAmount = actualSubtotal >= c.minOrderAmount;
                        let isUnlocked = isUnlockedAmount;
                        let lockReason = '';
                        const needMore = c.minOrderAmount - actualSubtotal;

                        if (!isUnlockedAmount) {
                          lockReason = `Add ₹${needMore.toLocaleString()} more to unlock`;
                        } else if (
                          c.targetType === 'categories' &&
                          c.targetCategories?.length > 0
                        ) {
                          const hasValidCategory = items?.some((item) =>
                            c.targetCategories.includes(item.category || item.primaryCategory),
                          );
                          if (!hasValidCategory) {
                            isUnlocked = false;
                            lockReason = `Only valid for categories: ${c.targetCategories.join(', ')}`;
                          }
                        } else if (c.targetType === 'products' && c.targetProductIds?.length > 0) {
                          const hasValidProduct = items?.some((item) =>
                            c.targetProductIds.includes(item.id || item._id || item.productId),
                          );
                          if (!hasValidProduct) {
                            isUnlocked = false;
                            lockReason = `Not valid for items in your cart`;
                          }
                        }

                        return (
                          <div
                            key={c._id || c.id}
                            className={`border rounded-2xl p-4 transition-all duration-300 flex flex-col gap-3 relative overflow-hidden ${
                              isUnlocked
                                ? 'bg-surface-container-lowest border-outline-variant/60 hover:border-on-surface/30'
                                : 'bg-surface-container-high/30 border-outline-variant/20 opacity-50 grayscale pointer-events-none'
                            }`}
                          >
                            <div className="flex justify-between items-start gap-4">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold text-on-surface text-[12px] uppercase tracking-wider">
                                    {c.code}
                                  </span>
                                </div>
                                <p className="text-[13px] font-bold text-on-surface leading-snug">
                                  {c.discountType === 'percentage'
                                    ? `${c.discountValue}% off`
                                    : `₹${c.discountValue} off`}
                                  {c.maxDiscount ? ` up to ₹${c.maxDiscount}` : ''}
                                </p>
                                <p className="text-[11px] text-secondary">
                                  On minimum purchase of ₹{c.minOrderAmount}
                                </p>
                              </div>
                              <button
                                type="button"
                                disabled={!isUnlocked}
                                onClick={(e) => handleApplyCoupon(e, c.code)}
                                className={`text-[11px] font-bold uppercase tracking-widest px-4 py-2 rounded-full transition-all cursor-pointer ${
                                  isUnlocked
                                    ? 'text-primary bg-primary/10 hover:bg-primary/20'
                                    : 'text-secondary/50 bg-surface-container cursor-not-allowed'
                                }`}
                              >
                                {isUnlocked ? 'Apply' : 'Locked'}
                              </button>
                            </div>

                            <div className="flex items-center justify-between border-t border-outline-variant/30 pt-3 mt-1">
                              {!isUnlocked ? (
                                <p className="text-[10px] text-red-500 font-medium">{lockReason}</p>
                              ) : (
                                <p className="text-[10px] text-green-600 font-medium flex items-center gap-1">
                                  <CheckCircle2 className="text-[12px]" strokeWidth={1.5} />
                                  Unlocked
                                </p>
                              )}
                              <p className="text-[10px] text-secondary">
                                Valid till{' '}
                                {new Date(c.expiryDate).toLocaleDateString('en-IN', {
                                  day: 'numeric',
                                  month: 'short',
                                })}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
