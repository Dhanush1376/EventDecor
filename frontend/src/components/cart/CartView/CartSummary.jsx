import { Info, ShieldCheck, Shield } from 'lucide-react';
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Skeleton } from '../../ui/Skeleton';

export const CartSummary = ({
  loading,
  activeCartMode,
  cartCount,
  totalMRP,
  actualSubtotal,
  discountOnMRP,
  couponDiscountAmount,
  appliedCoupon,
  platformFee,
  shippingFee,
  useWallet,
  walletDeduction,
  finalPayableAmount,
  depositTotal,
  runProtectedAction,
  navigate,
}) => {
  return (
    <div className="bg-surface-bright border border-outline-variant/40 rounded-lg shadow-xs relative overflow-hidden">
      {loading && (
        <div className="absolute inset-0 bg-surface/70 backdrop-blur-[1px] z-10 p-5">
          <div className="space-y-3">
            <Skeleton className="h-4 w-40" />
            {[0, 1, 2].map((idx) => (
              <div className="flex justify-between" key={idx}>
                <Skeleton className="h-3 w-24" delay={idx * 90} />
                <Skeleton className="h-3 w-16" delay={idx * 90 + 70} />
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="p-5">
        <div
          className="text-[10px] font-label font-bold text-on-surface uppercase tracking-widest pb-4 border-b border-outline-variant/40 mb-4"
          style={{ fontFamily: 'var(--font-label)' }}
        >
          {activeCartMode === 'rental' ? 'Rental Summary' : `Price Details (${cartCount} Items)`}
        </div>
        <div className="space-y-3.5 text-[13px] text-on-surface">
          {activeCartMode === 'rental' ? (
            <>
              <div className="flex justify-between">
                <span className="text-secondary">Rental Charges</span>
                <span className="font-medium">₹{actualSubtotal.toLocaleString()}</span>
              </div>
              {depositTotal > 0 && (
                <div className="flex justify-between">
                  <span className="text-secondary">Security Deposits</span>
                  <span className="font-medium">₹{depositTotal.toLocaleString()}</span>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="flex justify-between">
                <span className="text-secondary">Total MRP</span>
                <span className="font-medium">
                  ₹{(totalMRP || actualSubtotal).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary">Discount on MRP</span>
                <span className="text-green-700 font-medium">
                  − ₹{discountOnMRP.toLocaleString()}
                </span>
              </div>
            </>
          )}

          <AnimatePresence>
            {appliedCoupon && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex justify-between overflow-hidden"
              >
                <span className="text-secondary">Coupon Discount</span>
                <span className="text-green-700 font-medium">
                  − ₹{couponDiscountAmount.toLocaleString()}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
          {platformFee > 0 && (
            <div className="flex justify-between items-center group">
              <span className="text-secondary flex items-center gap-1 cursor-pointer">
                Platform Fee <Info className="text-[14px]" strokeWidth={1.5} />
              </span>
              <span className="font-medium">₹{platformFee}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-secondary">Shipping Fee</span>
            <span
              className={
                shippingFee === 0
                  ? 'text-green-700 font-bold uppercase tracking-wider text-[11px]'
                  : 'font-medium'
              }
            >
              {shippingFee === 0 ? 'Free' : `₹${shippingFee}`}
            </span>
          </div>

          <AnimatePresence>
            {useWallet && walletDeduction > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex justify-between items-center bg-primary/10 text-primary rounded-lg px-3 py-2 border border-primary/20 font-semibold"
              >
                <span className="flex items-center gap-1 font-medium text-[11px]">
                  <span className="material-symbols-outlined text-[14px] text-primary">stars</span>
                  Siri Pay Wallet applied
                </span>
                <span>− ₹{walletDeduction.toLocaleString()}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="h-[1px] bg-outline-variant/40 my-3" />
          <div className="flex justify-between items-baseline font-bold text-[15px]">
            <span>{activeCartMode === 'rental' ? 'Grand Total Due Today' : 'Total Amount'}</span>
            <div className="flex items-center gap-2">
              {appliedCoupon && (
                <span className="bg-green-100 text-green-800 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase border border-green-200 tracking-wider">
                  {appliedCoupon.code}
                </span>
              )}
              <motion.span
                key={finalPayableAmount}
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
              >
                ₹{finalPayableAmount.toLocaleString()}
              </motion.span>
            </div>
          </div>

          {/* Expected Refund Block for Rentals */}
          {activeCartMode === 'rental' && depositTotal > 0 && (
            <div className="mt-3 bg-green-50 border border-green-200/60 p-2 rounded-md flex justify-between items-center text-[12px] text-green-800">
              <div className="flex items-center gap-1 font-bold">
                <ShieldCheck className="text-[15px]" strokeWidth={1.5} />
                Expected Refund
              </div>
              <span className="font-extrabold">₹{depositTotal.toLocaleString()}</span>
            </div>
          )}

          {/* Desktop Place Order Button */}
          <button
            onClick={() =>
              runProtectedAction(() => {
                sessionStorage.removeItem('siri_checkout_step');
                navigate('/checkout', {
                  state: {
                    checkoutMode: activeCartMode,
                    couponCode: appliedCoupon?.code,
                  },
                });
              })
            }
            className="w-full mt-6 bg-black text-white hover:bg-[#8c7335] hover:text-white py-3.5 rounded-full text-[11px] font-bold uppercase tracking-widest shadow-md transition-all text-center hidden lg:block cursor-pointer active:scale-[0.98]"
          >
            {activeCartMode === 'rental' ? 'Continue Rental Booking' : 'Checkout'}
          </button>
        </div>
      </div>

      {/* Secure verification footer inside card */}
      <div className="bg-surface-container-lowest px-5 py-3 border-t border-outline-variant/40 flex items-center justify-between text-[11px] text-secondary font-medium">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="text-[16px] text-primary" strokeWidth={1.5} /> Genuine
        </div>
        <div className="flex items-center gap-1.5">
          <Shield className="text-[16px] text-primary" strokeWidth={1.5} /> Secure
        </div>
      </div>
    </div>
  );
};
