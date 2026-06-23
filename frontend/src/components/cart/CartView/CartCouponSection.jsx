import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const CartCouponSection = ({
  appliedCoupon,
  couponDiscountAmount,
  handleRemoveCoupon,
  runProtectedAction,
  setIsCouponModalOpen,
  isAuthenticated,
  activeCoupons,
  handleApplyCoupon,
  couponInput,
  setCouponInput,
  couponError,
  setCouponError,
}) => {
  return (
    <div className="bg-surface-bright border border-outline-variant/40 rounded-lg p-5 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] font-label font-bold text-on-surface uppercase tracking-widest">
          Coupons & Offers
        </span>
        {!appliedCoupon && (
          <button
            onClick={() => {
              runProtectedAction(() => {
                setIsCouponModalOpen(true);
              });
            }}
            className="text-[10px] text-primary border border-primary/20 hover:border-primary/50 hover:bg-primary/5 transition-all duration-300 font-bold px-3 py-1.5 rounded-full cursor-pointer uppercase tracking-wider"
          >
            View All
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {appliedCoupon ? (
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-green-50 border border-green-200 rounded p-3 flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-green-600 text-[18px]">verified</span>
              <div>
                <span className="text-xs font-bold text-green-800 uppercase block">
                  {appliedCoupon.code} APPLIED
                </span>
                <span className="text-[10px] text-green-700">
                  You saved ₹{couponDiscountAmount.toLocaleString()}
                </span>
              </div>
            </div>
            <button
              onClick={handleRemoveCoupon}
              className="text-xs font-bold text-red-600 hover:underline cursor-pointer"
            >
              Remove
            </button>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div
              onClick={() => {
                runProtectedAction(() => {
                  setIsCouponModalOpen(true);
                });
              }}
              className="flex items-center gap-3 bg-surface-container-lowest border border-outline-variant/40 rounded-lg px-4 py-3 cursor-pointer hover:border-primary/30 transition-all shadow-xs"
            >
              <span className="material-symbols-outlined text-primary text-[20px]">
                local_activity
              </span>
              <div className="flex-1">
                <span className="text-[12px] font-bold text-on-surface block mb-0.5">
                  Apply Coupon
                </span>
                <span className="text-[10px] text-secondary">
                  {!isAuthenticated
                    ? 'Login to see best offers'
                    : activeCoupons.length > 0
                      ? `${activeCoupons.length} elegant offer${activeCoupons.length !== 1 ? 's' : ''} available`
                      : 'Enter code manually to redeem discounts'}
                </span>
              </div>
              <span className="material-symbols-outlined text-secondary text-[16px]">
                chevron_right
              </span>
            </div>

            {/* Manual input form */}
            <form onSubmit={(e) => handleApplyCoupon(e)} className="mt-4 flex gap-2">
              <input
                type="text"
                placeholder="Enter coupon code"
                value={couponInput}
                onChange={(e) => {
                  setCouponInput(e.target.value.toUpperCase());
                  if (couponError) setCouponError('');
                }}
                className="bg-surface-bright border border-outline-variant/60 rounded-md px-3 py-1.5 text-xs outline-none focus:border-primary text-on-surface font-bold uppercase flex-1 transition-colors h-[38px]"
              />
              <button
                type="submit"
                className="btn-outline px-4 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer h-[38px]"
              >
                Apply
              </button>
            </form>
            {couponError && (
              <span className="text-[11px] text-red-600 block mt-1.5 font-medium">
                {couponError}
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
