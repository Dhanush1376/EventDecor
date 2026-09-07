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

  const renderCouponContent = () => (
    <div className="relative z-10 flex flex-col h-full">
      <div className="mb-6">
        <h2 className="text-[20px] font-bold text-on-surface leading-tight mb-1">
          Coupons & Offers
        </h2>
        <p className="text-secondary text-[12px]">Enter a promo code or select an offer below</p>
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
            className="w-full bg-surface-container-lowest border border-outline-variant/60 rounded-xl px-4 py-3 text-[16px] sm:text-[13px] outline-none focus:border-primary text-on-surface font-bold uppercase transition-all tracking-wider"
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
          className="bg-primary hover:bg-primary-hover disabled:opacity-50 text-on-primary px-6 py-3 rounded-xl font-label text-[11px] uppercase tracking-widest font-bold transition-all shadow-xs shrink-0 cursor-pointer disabled:cursor-not-allowed"
        >
          Apply
        </button>
      </form>

      {/* Available Coupons list */}
      <div>
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-secondary mb-3">
          Available Coupons
        </h3>

        {activeCoupons.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-outline-variant/40 rounded-xl">
            <p className="text-secondary text-[12px]">No coupons available right now.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeCoupons.map((c) => {
              const meetsMinOrder = !c.minOrderValue || actualSubtotal >= c.minOrderValue;
              let hasApplicableItem = true;
              if (c.targetItems && c.targetItems.length > 0) {
                hasApplicableItem = items.some((item) => {
                  const targetId = (item.id || item._id || '').toString();
                  return c.targetItems.some((t) => (t._id || t).toString() === targetId);
                });
              }

              const isUnlocked = meetsMinOrder && hasApplicableItem;
              let lockReason = '';
              if (!meetsMinOrder) {
                lockReason = `Add ₹${(c.minOrderValue - actualSubtotal).toLocaleString()} more to unlock`;
              } else if (!hasApplicableItem) {
                lockReason = 'Applicable only on specific items';
              }

              return (
                <div
                  key={c._id}
                  className={`border rounded-xl p-4 transition-all relative overflow-hidden ${
                    isUnlocked
                      ? 'border-outline-variant/60 bg-surface-container-lowest/50 hover:border-primary/50'
                      : 'border-outline-variant/30 bg-surface-container-low/30 opacity-70'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1.5">
                    <div>
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded font-mono text-[11px] font-bold tracking-wider border ${
                          isUnlocked
                            ? 'bg-primary/10 text-primary border-primary/20'
                            : 'bg-stone-100 text-stone-500 border-stone-200'
                        }`}
                      >
                        {c.code}
                      </span>
                    </div>
                    {isUnlocked && (
                      <button
                        onClick={() => {
                          setCouponInput(c.code);
                          handleApplyCoupon(null, c.code);
                        }}
                        className="text-primary hover:underline font-bold text-[11px] uppercase tracking-wider cursor-pointer"
                      >
                        Apply
                      </button>
                    )}
                  </div>

                  <p className="text-on-surface font-medium text-[13px] mb-1">{c.description}</p>

                  <div className="flex items-center gap-3 mt-2">
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
  );

  return createPortal(
    <AnimatePresence>
      {isCouponModalOpen && (
        <>
          {/* Backdrop: Independent full-screen overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsCouponModalOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[1000]"
          />

          {/* Desktop Centered Modal (sm: and above) */}
          <div className="hidden sm:flex fixed inset-0 z-[1001] items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="pointer-events-auto relative w-full max-w-[500px] bg-surface-bright rounded-[24px] p-8 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] overflow-hidden flex flex-col max-h-[85vh]"
            >
              <button
                onClick={() => setIsCouponModalOpen(false)}
                className="absolute top-6 right-6 w-8 h-8 min-h-0 rounded-full bg-surface-container-lowest border border-outline-variant/40 flex items-center justify-center hover:bg-surface-container transition-all z-50 cursor-pointer shadow-xs"
                aria-label="Close coupon modal"
              >
                <X className="text-[16px]" strokeWidth={1.5} />
              </button>
              <div className="overflow-y-auto no-scrollbar max-h-[75vh]">
                {renderCouponContent()}
              </div>
            </motion.div>
          </div>

          {/* Mobile Bottom Sheet (<640px) */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="sm:hidden fixed bottom-0 left-0 right-0 z-[1001] w-full bg-surface-bright rounded-t-[24px] shadow-2xl pointer-events-auto flex flex-col"
          >
            {/* Grab handle */}
            <div className="w-12 h-1.5 bg-black/15 rounded-full mx-auto mt-3 mb-2 shrink-0" />

            <div className="flex items-center justify-between px-6 py-2 border-b border-outline-variant/10 shrink-0">
              <span className="font-label text-[11px] uppercase tracking-widest text-primary font-bold">
                Apply Coupon
              </span>
              <button
                onClick={() => setIsCouponModalOpen(false)}
                className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface cursor-pointer"
                aria-label="Close coupon modal"
              >
                <X className="text-[16px]" strokeWidth={1.5} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto no-scrollbar max-h-[75vh] pb-[calc(1.5rem+var(--safe-area-bottom))]">
              {renderCouponContent()}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
