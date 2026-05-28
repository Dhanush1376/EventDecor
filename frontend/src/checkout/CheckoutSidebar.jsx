import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

import { handleImageError } from "../utils/imageUtils";
import { useCheckout } from "./CheckoutProvider";
import CheckoutRecommendations from "./CheckoutRecommendations";


export default function CheckoutSidebar() {
  const { user, backendTotals, useWallet, setUseWallet, appliedCoupon, couponValid, couponInput, setCouponInput, handleApplyCoupon, handleRemoveCoupon, couponMessage, availableCoupons, loadingCoupons, activeStep, paymentOption, isProcessing, handleConfirmOrder, activeItems, fetchBackendTotals } = useCheckout();
  return (
    <>
      {/* Right Column: PRICE DETAILS & promo code side card */}
      <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="lg:col-span-5 xl:col-span-4 space-y-4"
          >
            {/* Wallet Balance Card */}
            {user && (user.walletBalance > 0 || (backendTotals && backendTotals.walletBalance > 0)) && (
              <div className="bg-surface-bright border border-outline-variant/40 rounded-lg p-4 shadow-xs relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="checkout-use-wallet-checkbox"
                      checked={useWallet}
                      onChange={(e) => setUseWallet(e.target.checked)}
                      className="mt-1 rounded text-[#c29b38] focus:ring-0 cursor-pointer h-4 w-4"
                    />
                    <label htmlFor="checkout-use-wallet-checkbox" className="cursor-pointer select-none">
                      <span className="text-xs font-bold text-on-surface block uppercase tracking-wider">
                        Use Siri Pay Wallet
                      </span>
                      <span className="text-[10px] text-secondary font-light">
                        Available Balance: <strong className="text-on-surface font-semibold">₹{((backendTotals && backendTotals.walletBalance) !== undefined ? backendTotals.walletBalance : user.walletBalance).toLocaleString('en-IN')}</strong>
                      </span>
                    </label>
                  </div>
                  <span className="material-symbols-outlined text-[#c29b38] text-sm animate-pulse">stars</span>
                </div>

                {useWallet && backendTotals && backendTotals.walletDeduction > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="mt-3 pt-3 border-t border-[#f4f3f1] text-[11px] text-[#a17e2b] font-bold flex justify-between"
                  >
                    <span>Wallet Deducted:</span>
                    <span>− ₹{backendTotals.walletDeduction.toLocaleString('en-IN')}</span>
                  </motion.div>
                )}
              </div>
            )}

            {/* Promo Coupon Card */}
            {activeStep !== 2 && (
              <div className="bg-surface-bright border border-outline-variant/40 rounded-lg p-4 shadow-xs relative">
                <h4 className="text-xs font-bold text-secondary uppercase tracking-wider pb-2 border-b border-outline-variant/40 mb-3 flex items-center justify-between">
                  <span>Apply Promo Coupon</span>
                  <span className="material-symbols-outlined text-[15px] text-[#c29b38]">sell</span>
                </h4>
                
                {!appliedCoupon || !couponValid ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="COUPON CODE"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      className="flex-1 bg-white border border-outline-variant rounded px-3 py-1.5 text-xs outline-none uppercase font-bold focus:border-[#c29b38] transition-colors"
                    />
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      className="bg-[#c29b38] hover:bg-[#a17e2b] text-white font-bold text-[10px] sm:text-xs uppercase tracking-wider px-4 py-1.5 rounded transition-colors cursor-pointer"
                    >
                      Apply
                    </button>
                  </div>
                ) : (
                  <div className="p-3 bg-[#c29b38]/5 border border-[#c29b38]/20 rounded-lg flex items-center justify-between text-xs text-[#a17e2b]">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-[#c29b38]">check_circle</span>
                      <span>Applied <strong className="font-mono text-[#a17e2b] font-bold">{appliedCoupon}</strong> successfully!</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveCoupon}
                      className="text-red-600 font-extrabold hover:text-red-800 transition-colors uppercase text-[9px] tracking-wider cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                )}

                {couponMessage && (!appliedCoupon || !couponValid) && (
                  <div className={`mt-2 text-[11px] font-semibold ${couponValid ? 'text-[#a17e2b]' : 'text-red-600'}`}>
                    {couponValid ? '✓' : '⚠️'} {couponMessage}
                  </div>
                )}

                {/* Dynamic Available Store Coupons List */}
                {availableCoupons.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-outline-variant/35 space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-secondary/70 block flex items-center gap-1">
                      <span className="material-symbols-outlined text-[11px]">local_activity</span>
                      Available Offers ({availableCoupons.length})
                    </span>
                    
                    <div className="max-h-[160px] overflow-y-auto space-y-2 pr-1 no-scrollbar">
                      {availableCoupons.map((c) => {
                        const isCurrent = appliedCoupon === c.code;
                        return (
                          <div
                            key={c._id || c.id}
                            className={`p-2.5 rounded-lg border text-xs flex justify-between items-center transition-all ${
                              isCurrent
                                ? "bg-[#c29b38]/5 border-[#c29b38]/30"
                                : "bg-surface-bright border-outline-variant/30 hover:border-[#c29b38]/20"
                            }`}
                          >
                            <div className="min-w-0 pr-2">
                              <span className="font-mono font-bold text-on-surface text-[10px] bg-surface px-1.5 py-0.5 rounded border border-outline-variant/30 tracking-wider">
                                {c.code}
                              </span>
                              <p className="text-[10px] text-on-surface font-semibold mt-1">
                                {c.discountType === "percentage"
                                  ? `${c.discountValue}% Off`
                                  : `Flat ₹${c.discountValue} Off`}
                                {c.maxDiscount ? ` up to ₹${c.maxDiscount}` : ""}
                              </p>
                              <p className="text-[9px] text-outline mt-0.5 font-light">
                                Min purchase: ₹{c.minOrderAmount || 0}
                              </p>
                            </div>
                            
                            <button
                              type="button"
                              onClick={() => {
                                if (isCurrent) {
                                  handleRemoveCoupon();
                                } else {
                                  setCouponInput(c.code);
                                  fetchBackendTotals(c.code);
                                }
                              }}
                              className={`text-[9px] font-extrabold uppercase tracking-wider px-2.5 py-1.5 rounded transition-colors cursor-pointer shrink-0 ${
                                isCurrent
                                  ? "bg-red-50 text-red-600 hover:bg-red-100"
                                  : "bg-[#c29b38] text-white hover:bg-[#a17e2b]"
                              }`}
                            >
                              {isCurrent ? "Remove" : "Apply"}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Price Details Card */}
            <div className="bg-surface-bright border border-outline-variant/40 rounded-lg p-4 shadow-xs sticky top-28 relative overflow-hidden">

              <h3 className="text-xs font-bold text-secondary uppercase tracking-wider pb-3 border-b border-outline-variant/40 mb-4 relative z-10">
                Price Details ({activeItems.length} Items)
              </h3>

              <div className="space-y-3 text-xs text-on-surface">
                <div className="flex justify-between">
                  <span>Price ({activeItems.length} items)</span>
                  <span>₹{backendTotals.subtotal.toLocaleString()}</span>
                </div>

                <div className="flex justify-between">
                  <span>Promo Discount</span>
                  <span className="text-[#a17e2b] font-medium">
                    − ₹{backendTotals.discount.toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span>Delivery Charges</span>
                  <span className="text-[#a17e2b] font-bold uppercase tracking-wider text-[12px]">
                    {backendTotals.shippingFee === 0 ? "Free" : `₹${backendTotals.shippingFee}`}
                  </span>
                </div>

                {paymentOption === "cod" && backendTotals.codFee > 0 && (
                  <div className="flex justify-between items-center bg-amber-50/50 text-amber-800 rounded px-2 py-1.5 border border-amber-100/50">
                    <span className="flex items-center gap-1 font-medium">
                      <span className="material-symbols-outlined text-[14px]">account_balance_wallet</span>
                      COD Handling Fee
                    </span>
                    <span className="font-bold">
                      ₹{backendTotals.codFee.toLocaleString()}
                    </span>
                  </div>
                )}

                {useWallet && backendTotals.walletDeduction > 0 && (
                  <div className="flex justify-between items-center bg-green-50/60 text-[#a17e2b] rounded px-2 py-1.5 border border-[#c29b38]/15 font-semibold">
                    <span className="flex items-center gap-1 font-medium">
                      <span className="material-symbols-outlined text-[14px] text-[#c29b38]">stars</span>
                      Siri Pay Wallet applied
                    </span>
                    <span>
                      − ₹{backendTotals.walletDeduction.toLocaleString()}
                    </span>
                  </div>
                )}

                <div className="h-[1px] bg-outline-variant/40 my-3" />

                {/* Highlighted Payable Total Row */}
                <div className="flex justify-between items-baseline font-bold text-sm">
                  <span>Total Payable</span>
                  <span className="text-base text-[#c29b38]">
                    ₹{backendTotals.total.toLocaleString()}
                  </span>
                </div>

                {/* Instant Gamified Incentives Banner */}
                {backendTotals.coinsEarned > 0 && (
                  <div className="bg-gradient-to-tr from-[#1e1d1b] to-[#121110] text-[#f4e6d4] rounded-lg p-3 text-[10px] sm:text-[11px] border border-[#d4af37]/35 flex items-center justify-between shadow-sm relative overflow-hidden group mt-3">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#ffdf79] text-xs">stars</span>
                      <span>
                        Earn <strong className="text-[#ffdf79] font-bold">{backendTotals.coinsEarned} Siri Coins</strong> & <strong className="text-white font-bold">₹{backendTotals.cashbackEarned} Cashback</strong> on delivery!
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Instant calculation validation bottom message */}
              {backendTotals.discount > 0 && (
                <div className="bg-[#c29b38]/10 text-[#a17e2b] text-[12px] font-bold rounded p-2.5 mt-4 text-center border border-[#c29b38]/20">
                  Your Total Savings on this order sequence is ₹{backendTotals.discount.toLocaleString()}
                </div>
              )}

              {/* Bottom return policy tags */}
              <div className="mt-4 pt-3 border-t border-surface-container-low text-[11px] text-secondary space-y-1.5">
                <p className="flex items-center gap-1.5 font-medium">
                  <span className="material-symbols-outlined text-sm text-[#c29b38]">
                    verified
                  </span>
                  Safe and protected order transit
                </p>
                <p className="flex items-center gap-1.5 font-medium">
                  <span className="material-symbols-outlined text-sm text-[#c29b38]">
                    change_circle
                  </span>
                  Easy 7-day money back arrival check
                </p>
              </div>

              {/* Integrated Payment Button at the bottom of the Price Details Card */}
              {activeStep === 3 && (
                <div className="mt-4 pt-4 border-t border-outline-variant/30">
                  <motion.button
                    whileHover={!isProcessing ? { scale: 1.01 } : {}}
                    whileTap={!isProcessing ? { scale: 0.99 } : {}}
                    type="button"
                    disabled={isProcessing}
                    onClick={handleConfirmOrder}
                    className="w-full bg-[#f26a10] hover:bg-[#d85d0d] text-white font-bold text-xs uppercase tracking-wider py-3.5 rounded shadow-lg transition-all flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed group relative overflow-hidden"
                  >
                    {isProcessing ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <span>{paymentOption === "razorpay" ? "Pay & Place Order" : "Place Order"}</span>
                        <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
                      </>
                    )}
                  </motion.button>
                </div>
              )}
            </div>

            {/* Total Amount card shown specifically on Step 2 below Price Details */}
            {activeStep === 2 && (
              <div className="bg-surface-bright p-4 border border-[#c29b38]/15 rounded-[4px] shadow-xs">
                 <div className="flex justify-between items-center">
                    <span className="text-[11px] text-secondary font-bold uppercase tracking-widest">Total Amount</span>
                    <span className="text-[15px] font-extrabold text-[#c29b38]">₹{backendTotals.total.toLocaleString()}</span>
                 </div>
              </div>
            )}

            {/* Recommendations specifically sized for the sidebar */}
            {activeStep !== 2 && (
              <CheckoutRecommendations cardWidth="w-[140px]" containerClassName="mt-4" />
            )}
          </motion.div>
    </>
  );
}
