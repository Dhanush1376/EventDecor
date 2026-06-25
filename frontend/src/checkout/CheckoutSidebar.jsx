import { m as motion } from 'framer-motion';
import { useCheckout } from './CheckoutProvider';
import { useActiveCoupons } from '../hooks/useActiveCoupons';

export default function CheckoutSidebar() {
  const {
    user,
    backendTotals,
    isTotalsLoading,
    totalsError,
    useWallet,
    setUseWallet,
    appliedCoupon,
    couponValid,
    couponInput,
    setCouponInput,
    handleApplyCoupon,
    handleRemoveCoupon,
    couponMessage,
    availableCoupons,
    _loadingCoupons,
    activeStep,
    paymentOption,
    isProcessing,
    handleConfirmOrder,
    activeItems,
    fetchBackendTotals,
    _hasRentalItems,
    rentalStartDate,
    rentalEndDate,
    orderType,
    rentalCostBreakdown,
    settings,
    checkoutSteps,
  } = useCheckout();

  const { data: activeCoupons = [] } = useActiveCoupons();
  const checkoutCoupons = activeCoupons.filter((c) => c.displayLocations?.includes('checkout'));

  const siriCoinEarnRate = (settings?.loyalty?.coinsPerRupee || 0.1) * 100;
  const cashbackRate = settings?.loyalty?.tiers?.[0]?.cashbackRate
    ? settings.loyalty.tiers[0].cashbackRate * 100
    : 4;

  const activeTotal =
    orderType === 'rental' ? rentalCostBreakdown?.totalAmount || 0 : backendTotals?.total || 0;

  const estimatedCoins = Math.round(activeTotal * (siriCoinEarnRate / 100));
  const estimatedCashback = Math.round(activeTotal * (cashbackRate / 100));
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
        {user &&
          (user.walletBalance > 0 || (backendTotals && backendTotals.walletBalance > 0)) &&
          checkoutSteps[activeStep] !== 'PAYMENT' && (
            <div className="bg-surface-bright border border-outline-variant/40 rounded-lg p-4 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="checkout-use-wallet-checkbox"
                    checked={useWallet}
                    onChange={(e) => setUseWallet(e.target.checked)}
                    className="mt-1 rounded text-primary focus:ring-0 cursor-pointer h-4 w-4"
                  />
                  <label
                    htmlFor="checkout-use-wallet-checkbox"
                    className="cursor-pointer select-none"
                  >
                    <span className="text-xs font-bold text-on-surface block uppercase tracking-wider">
                      Use Siri Pay Wallet
                    </span>
                    <span className="text-[10px] text-secondary font-light">
                      Available Balance:{' '}
                      <strong className="text-on-surface font-semibold">
                        ₹
                        {(
                          (backendTotals?.walletBalance ?? user?.walletBalance) ||
                          0
                        ).toLocaleString('en-IN')}
                      </strong>
                    </span>
                  </label>
                </div>
                <span className="material-symbols-outlined text-primary text-sm animate-pulse">
                  stars
                </span>
              </div>

              {useWallet && backendTotals && backendTotals.walletDeduction > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-3 pt-3 border-t border-outline-variant/30 text-[11px] text-primary font-bold flex justify-between"
                >
                  <span>Wallet Deducted:</span>
                  <span>− ₹{backendTotals?.walletDeduction?.toLocaleString('en-IN') || 0}</span>
                </motion.div>
              )}
            </div>
          )}

        {/* Promo Coupon Card */}
        {orderType !== 'rental' && checkoutSteps[activeStep] !== 'PAYMENT' && (
          <div className="bg-surface-bright border border-outline-variant/40 rounded-lg p-4 shadow-xs relative">
            <h4 className="text-[10px] font-label font-bold text-on-surface uppercase tracking-widest pb-2 border-b border-outline-variant/40 mb-3 flex items-center justify-between">
              <span>Apply Promo Coupon</span>
              <span className="material-symbols-outlined text-[15px] text-primary">sell</span>
            </h4>

            {!appliedCoupon || !couponValid ? (
              <>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="COUPON CODE"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    className="flex-1 bg-white border border-outline-variant/30 rounded-lg px-3 py-1.5 text-xs outline-none uppercase font-bold focus:border-primary transition-colors"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    className="btn-primary rounded-full font-bold text-[10px] sm:text-xs uppercase tracking-wider px-4 py-1.5 transition-colors cursor-pointer shadow-md"
                  >
                    Apply
                  </button>
                </div>

                {/* Coupon Choice Tray */}
                {checkoutCoupons.length > 0 && (!appliedCoupon || !couponValid) && (
                  <div className="mt-4 pt-3 border-t border-outline-variant/30">
                    <h5 className="text-[9px] uppercase tracking-widest font-bold text-secondary mb-2">
                      Available Coupons
                    </h5>
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide snap-x">
                      {checkoutCoupons.map((coupon) => (
                        <div
                          key={coupon.code}
                          onClick={() => {
                            setCouponInput(coupon.code);
                          }}
                          className="snap-start shrink-0 w-[180px] p-2.5 rounded-lg border border-primary/20 bg-primary/5 cursor-pointer hover:bg-primary/10 transition-colors"
                        >
                          <div className="flex justify-between items-center mb-0.5">
                            <span className="font-mono text-[11px] font-bold text-on-surface bg-white/60 px-1 rounded shadow-sm">
                              {coupon.code}
                            </span>
                            <span className="text-[9px] font-bold text-primary">Tap to use</span>
                          </div>
                          <p className="text-[10px] text-secondary leading-tight">
                            {coupon.discountType === 'percentage'
                              ? `${coupon.discountValue}% OFF`
                              : `₹${coupon.discountValue} OFF`}
                            {coupon.minOrderAmount > 0 && ` on ₹${coupon.minOrderAmount}+`}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg flex items-center justify-between text-xs text-primary">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-primary">
                    check_circle
                  </span>
                  <span>
                    Applied{' '}
                    <strong className="font-mono text-primary font-bold">{appliedCoupon}</strong>{' '}
                    successfully!
                  </span>
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
              <div
                className={`mt-2 text-[11px] font-semibold ${couponValid ? 'text-primary' : 'text-red-600'}`}
              >
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
                            ? 'bg-primary/5 border-primary/30'
                            : 'bg-surface-bright border-outline-variant/30 hover:border-primary/20'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <span className="font-mono font-bold text-on-surface text-[10px] bg-surface px-1.5 py-0.5 rounded border border-outline-variant/30 tracking-wider">
                            {c.code}
                          </span>
                          <p className="text-[10px] text-on-surface font-semibold mt-1">
                            {c.discountType === 'percentage'
                              ? `${c.discountValue}% Off`
                              : `Flat ₹${c.discountValue} Off`}
                            {c.maxDiscount ? ` up to ₹${c.maxDiscount}` : ''}
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
                          className={`text-[9px] font-extrabold uppercase tracking-wider px-2.5 py-1.5 rounded-full transition-colors cursor-pointer shrink-0 shadow-sm ${
                            isCurrent
                              ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                              : 'btn-primary'
                          }`}
                        >
                          {isCurrent ? 'Remove' : 'Apply'}
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
          <div className="pb-3 border-b border-outline-variant/40 mb-4 relative z-10 flex items-center justify-between">
            <h3 className="text-[10px] font-label font-bold text-on-surface uppercase tracking-widest">
              {orderType === 'rental' ? 'Rental Order' : 'Purchase Summary'} ({activeItems.length}{' '}
              Items)
            </h3>
            {orderType === 'rental' && (
              <span className="bg-primary/10 text-primary text-[9px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wider flex items-center gap-1">
                <span className="material-symbols-outlined text-[10px]">local_offer</span>
                Rental
              </span>
            )}
          </div>

          <div className="space-y-3 text-xs text-on-surface">
            {orderType === 'rental' && rentalCostBreakdown ? (
              <>
                <div className="flex justify-between">
                  <span>Rental Fee ({activeItems.length} items)</span>
                  <span>₹{rentalCostBreakdown?.rentalCharge?.toLocaleString() || 0}</span>
                </div>

                {rentalStartDate && rentalEndDate && (
                  <div className="flex justify-between">
                    <span>Rental Duration</span>
                    <span className="font-medium text-secondary">
                      {Math.max(
                        1,
                        Math.ceil(
                          (new Date(rentalEndDate) - new Date(rentalStartDate)) /
                            (1000 * 60 * 60 * 24),
                        ),
                      )}{' '}
                      Days
                    </span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span>Delivery Fee</span>
                  <span className="text-primary font-bold uppercase tracking-wider text-[12px]">
                    {rentalCostBreakdown?.deliveryCharge === 0
                      ? 'Free'
                      : `₹${rentalCostBreakdown?.deliveryCharge || 0}`}
                  </span>
                </div>

                {rentalCostBreakdown?.tax > 0 ? (
                  <div className="flex justify-between">
                    <span>Tax (GST)</span>
                    <span className="font-medium">
                      ₹{rentalCostBreakdown?.tax?.toLocaleString() || 0}
                    </span>
                  </div>
                ) : (
                  <div className="flex justify-between">
                    <span>Tax</span>
                    <span className="text-secondary font-medium">Included</span>
                  </div>
                )}

                {rentalCostBreakdown.securityDeposit > 0 && (
                  <div className="flex justify-between">
                    <span className="flex items-center gap-1">
                      Security Deposit{' '}
                      <span className="text-[9px] text-green-600 font-bold">(Refundable)</span>
                    </span>
                    <span className="font-medium">
                      ₹{rentalCostBreakdown?.securityDeposit?.toLocaleString() || 0}
                    </span>
                  </div>
                )}

                <div className="h-[1px] bg-outline-variant/40 my-3" />

                <div className="flex justify-between items-baseline font-bold text-sm">
                  <span>Total to Pay Now</span>
                  <span className="text-base text-on-surface font-extrabold">
                    ₹{rentalCostBreakdown?.totalAmount?.toLocaleString() || 0}
                  </span>
                </div>
              </>
            ) : totalsError ? (
              <div className="p-3.5 bg-red-50 text-red-700 rounded-lg text-xs font-semibold border border-red-200 flex flex-col gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-red-700">error</span>
                  <span>Pricing details couldn't be loaded</span>
                </div>
                <p className="text-[10px] font-normal leading-normal text-secondary/80">
                  {totalsError}
                </p>
                <button
                  type="button"
                  onClick={() => fetchBackendTotals(appliedCoupon)}
                  className="btn-primary py-1 px-3 rounded-full text-[9px] uppercase tracking-wider w-fit self-end font-bold shadow-xs cursor-pointer"
                >
                  Retry
                </button>
              </div>
            ) : isTotalsLoading ? (
              <div className="space-y-3.5 animate-pulse py-1">
                <div className="flex justify-between">
                  <div className="h-3 bg-outline-variant/20 rounded w-1/3"></div>
                  <div className="h-3 bg-outline-variant/20 rounded w-1/6"></div>
                </div>
                <div className="flex justify-between">
                  <div className="h-3 bg-outline-variant/20 rounded w-1/4"></div>
                  <div className="h-3 bg-outline-variant/20 rounded w-1/6"></div>
                </div>
                <div className="flex justify-between">
                  <div className="h-3 bg-outline-variant/20 rounded w-1/3"></div>
                  <div className="h-3 bg-outline-variant/20 rounded w-1/12"></div>
                </div>
                <div className="h-[1px] bg-outline-variant/30 my-3" />
                <div className="flex justify-between items-center">
                  <div className="h-4 bg-outline-variant/20 rounded w-1/5"></div>
                  <div className="h-5 bg-outline-variant/20 rounded w-1/4"></div>
                </div>
              </div>
            ) : (
              <>
                <div className="flex justify-between">
                  <span>Product Cost ({activeItems.length} items)</span>
                  <span>₹{backendTotals?.subtotal?.toLocaleString() || 0}</span>
                </div>

                <div className="flex justify-between">
                  <span>Promo Discount</span>
                  <span className="text-primary font-medium">
                    − ₹{backendTotals?.discount?.toLocaleString() || 0}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span>Delivery Fee</span>
                  <span className="text-primary font-bold uppercase tracking-wider text-[12px]">
                    {backendTotals?.shippingFee === 0
                      ? 'Free'
                      : `₹${backendTotals?.shippingFee || 0}`}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span>Tax</span>
                  <span className="text-secondary font-medium">Included</span>
                </div>

                {paymentOption === 'cod' && backendTotals?.codFee > 0 && (
                  <div className="flex justify-between items-center bg-amber-50/50 text-amber-800 rounded px-2 py-1.5 border border-amber-100/50">
                    <span className="flex items-center gap-1 font-medium">
                      <span className="material-symbols-outlined text-[14px]">
                        account_balance_wallet
                      </span>
                      COD Handling Fee
                    </span>
                    <span className="font-bold">
                      ₹{backendTotals?.codFee?.toLocaleString() || 0}
                    </span>
                  </div>
                )}

                {useWallet && backendTotals?.walletDeduction > 0 && (
                  <div className="flex justify-between items-center bg-primary/10 text-primary rounded-lg px-3 py-2 border border-primary/20 font-semibold">
                    <span className="flex items-center gap-1 font-medium text-[11px]">
                      <span className="material-symbols-outlined text-[14px] text-primary">
                        stars
                      </span>
                      Siri Pay Wallet applied
                    </span>
                    <span>− ₹{backendTotals?.walletDeduction?.toLocaleString() || 0}</span>
                  </div>
                )}

                <div className="h-[1px] bg-outline-variant/40 my-3" />

                <div className="flex justify-between items-baseline font-bold text-sm">
                  <span>Total</span>
                  <span className="text-base text-on-surface font-extrabold">
                    ₹{backendTotals?.total?.toLocaleString() || 0}
                  </span>
                </div>
              </>
            )}

            {/* Instant Gamified Incentives Banner */}
            {estimatedCoins > 0 && (
              <div className="bg-primary/10 text-primary rounded-lg p-3 text-[10px] sm:text-[11px] border border-primary/20 flex items-center justify-between shadow-sm mt-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-xs">stars</span>
                  <span>
                    Earn{' '}
                    <strong className="font-bold">
                      {estimatedCoins.toLocaleString('en-IN')} Siri Coins
                    </strong>{' '}
                    &{' '}
                    <strong className="font-bold">
                      ₹{estimatedCashback.toLocaleString('en-IN')} Cashback
                    </strong>
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="bg-green-50/70 text-green-700 text-[12px] font-bold rounded-lg p-2.5 mt-4 text-center border border-green-200">
            Total Savings: ₹{backendTotals?.discount?.toLocaleString() || 0}
          </div>

          {orderType === 'rental' ? (
            checkoutSteps[activeStep] !== 'PAYMENT' && (
              <div className="mt-4 pt-3 border-t border-surface-container-low text-[11px] text-primary space-y-1.5">
                <p className="flex items-center gap-1.5 font-medium">
                  <span className="material-symbols-outlined text-sm">fact_check</span>
                  ID Verification Required
                </p>
                <p className="flex items-center gap-1.5 font-medium">
                  <span className="material-symbols-outlined text-sm">currency_rupee</span>
                  Refundable Security Deposit
                </p>
                <p className="flex items-center gap-1.5 font-medium">
                  <span className="material-symbols-outlined text-sm">event_available</span>
                  Return on Due Date
                </p>
              </div>
            )
          ) : (
            <div className="mt-4 pt-3 border-t border-surface-container-low text-[11px] text-secondary space-y-1.5">
              <p className="flex items-center gap-1.5 font-medium">
                <span className="material-symbols-outlined text-sm text-primary">verified</span>
                Secure delivery
              </p>
              {activeItems.some((item) => item.isNonRefundable) ? (
                <p className="flex items-center gap-1.5 font-medium text-[#d97706]">
                  <span className="material-symbols-outlined text-sm text-[#d97706]">block</span>
                  Contains Non-Refundable Items
                </p>
              ) : (
                <p className="flex items-center gap-1.5 font-medium">
                  <span className="material-symbols-outlined text-sm text-primary">
                    change_circle
                  </span>
                  Easy {settings?.returnsExchanges?.returnWindowDays || 14}-day returns
                </p>
              )}
            </div>
          )}

          {/* Integrated Payment Button at the bottom of the Price Details Card */}
          {checkoutSteps[activeStep] === 'PAYMENT' && (
            <div className="mt-4 pt-4 border-t border-outline-variant/30">
              <motion.button
                whileHover={!isProcessing ? { scale: 1.01 } : {}}
                whileTap={!isProcessing ? { scale: 0.99 } : {}}
                type="button"
                disabled={isProcessing}
                onClick={handleConfirmOrder}
                className="w-full btn-primary py-3 rounded-full font-bold text-xs uppercase tracking-widest shadow-md transition-all flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed group relative overflow-hidden"
              >
                {isProcessing ? (
                  <>
                    <div className="skeleton-box inline-block w-5 h-5 rounded-md" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <span>
                      {paymentOption === 'razorpay' ? 'Pay & Place Order' : 'Place Order'}
                    </span>
                    <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">
                      arrow_forward
                    </span>
                  </>
                )}
              </motion.button>
            </div>
          )}
        </div>

        {/* Total Amount card shown specifically on Step 2 below Price Details */}
        {checkoutSteps[activeStep] === 'PAYMENT' && (
          <div className="bg-surface-bright p-5 border border-outline-variant/40 rounded-lg shadow-xs mt-4">
            <div className="flex justify-between items-center">
              <span className="text-[11px] text-secondary font-bold uppercase tracking-widest">
                Total Amount
              </span>
              <span className="text-[15px] font-extrabold text-on-surface">
                {totalsError ? (
                  <span className="text-red-600 text-xs font-semibold">Load Error</span>
                ) : isTotalsLoading ? (
                  <span className="inline-block w-12 h-4 bg-outline-variant/20 animate-pulse rounded"></span>
                ) : (
                  `₹${backendTotals?.total?.toLocaleString() || 0}`
                )}
              </span>
            </div>
          </div>
        )}
      </motion.div>
    </>
  );
}
