import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle';
import { m as motion } from 'framer-motion';
import React from 'react';
import toast from 'react-hot-toast';

import { useCheckout } from './CheckoutProvider';
import {
  RentalDateSummaryCard,
  TargetDeliveryDatePicker,
  CodOtpVerificationSection,
} from '../features/checkout/components';

export default function CheckoutPaymentStep() {
  const {
    _activeStep,
    setActiveStep,
    activeSelectedAddress,
    _isAddingNewAddress,
    paymentOption,
    setPaymentOption,
    _codConfirmed,
    setCodConfirmed,
    codOtpSent,
    codVerified,
    isSendingOtp,
    paymentError,
    _setPaymentError,
    configuredCodChannel,
    effectiveCodChannel,
    selectedCodChannel,
    setSelectedCodChannel,
    handleSendCodOtp,
    handleVerifyCodOtp,
    handleConfirmOrder,
    isProcessing,
    backendTotals,
    isTotalsLoading,
    totalsError,
    appliedCoupon,
    couponValid,
    fetchBackendTotals,
    settings,
    user,
    hasRentalItems,
    rentalStartDate,
    rentalEndDate,
    needByDate,
    setNeedByDate,
    orderType,
    rentalCostBreakdown,
    useWallet,
  } = useCheckout();

  const codMinOrder = settings?.payments?.codMinOrder ?? 500;
  const codMaxOrder = settings?.payments?.codMaxOrder ?? 50000;
  const isCodEnabled = settings?.payments?.enableCOD ?? true;
  const isRazorpayEnabled = settings?.payments?.enableRazorpay ?? true;

  // Auto-switch payment option if currently selected method is disabled
  React.useEffect(() => {
    if (!isRazorpayEnabled && paymentOption === 'razorpay' && isCodEnabled) {
      setPaymentOption('cod');
    } else if (!isCodEnabled && paymentOption === 'cod' && isRazorpayEnabled) {
      setPaymentOption('razorpay');
    }
  }, [isRazorpayEnabled, isCodEnabled, paymentOption, setPaymentOption]);

  // State for 6-digit OTP string
  const [codOtpInput, setCodOtpInput] = React.useState('');

  // Automatically confirm COD behind the scenes when COD option is selected to simplify user flow
  React.useEffect(() => {
    if (paymentOption === 'cod') {
      setCodConfirmed(true);
    }
  }, [paymentOption, setCodConfirmed]);

  const grossRentalAmount = rentalCostBreakdown?.totalAmount || 0;
  const availableWalletBalance = (backendTotals?.walletBalance ?? user?.walletBalance) || 0;
  const rentalWalletDeduction =
    useWallet && availableWalletBalance > 0
      ? Math.min(grossRentalAmount, availableWalletBalance)
      : 0;
  const netRentalPayable = Math.max(0, grossRentalAmount - rentalWalletDeduction);

  const currentPayableTotal =
    orderType === 'rental' ? netRentalPayable : (backendTotals?.total ?? 0);

  const getSubmitButtonLabel = () => {
    if (isProcessing) return 'Processing...';
    if (isTotalsLoading) return 'Calculating...';
    if (totalsError) return 'Pricing Load Error';

    if (currentPayableTotal === 0) {
      return 'Place Order (Fully Paid)';
    }

    if (!isRazorpayEnabled && !isCodEnabled) {
      return 'Payment Unavailable';
    }

    if (paymentOption === 'razorpay') {
      if (!isRazorpayEnabled) return 'Online Payment Unavailable';
      return `Pay ₹${currentPayableTotal.toLocaleString('en-IN')}`;
    }

    // COD payment option selected
    if (!isCodEnabled) {
      return 'COD Unavailable';
    }
    if (currentPayableTotal < codMinOrder) {
      return `COD Unavailable (< ₹${codMinOrder})`;
    }
    if (currentPayableTotal > codMaxOrder) {
      return `COD Unavailable (> ₹${codMaxOrder})`;
    }
    if (!codOtpSent) {
      return isSendingOtp
        ? 'Sending OTP...'
        : effectiveCodChannel === 'email'
          ? 'Send OTP to Email'
          : 'Send OTP to Mobile';
    }
    if (!codVerified) {
      return 'Verify OTP';
    }
    return 'Place Order';
  };

  const handleBottomSubmit = async () => {
    if (isProcessing) return;

    if (!activeSelectedAddress) {
      toast.error('Please select a delivery address');
      setActiveStep(1);
      return;
    }

    if (backendTotals?.total === 0 || currentPayableTotal === 0) {
      handleConfirmOrder();
    } else if (paymentOption === 'razorpay') {
      if (!isRazorpayEnabled) {
        toast.error('Online payments are currently disabled.');
        return;
      }
      handleConfirmOrder();
    } else if (paymentOption === 'cod') {
      if (!isCodEnabled) {
        toast.error('Cash on Delivery is currently disabled.');
        return;
      }
      if (backendTotals.total < codMinOrder || backendTotals.total > codMaxOrder) {
        toast.error(
          `COD is only serviceable for order totals between ₹${codMinOrder} and ₹${codMaxOrder}.`,
        );
        return;
      }
      if (!codOtpSent) {
        handleSendCodOtp();
      } else if (!codVerified) {
        if (!codOtpInput.trim() || codOtpInput.length < 6) {
          toast.error('Please enter the 6-digit verification code');
          return;
        }
        handleVerifyCodOtp(codOtpInput);
      } else {
        handleConfirmOrder();
      }
    } else {
      toast.error('Please select a payment method');
    }
  };

  const isButtonDisabled = () => {
    if (isProcessing || isSendingOtp) return true;
    if (isTotalsLoading) return true;
    if (totalsError) return true;
    if (backendTotals?.total === 0 || currentPayableTotal === 0) return false;

    if (!isRazorpayEnabled && !isCodEnabled) return true;

    if (paymentOption === 'razorpay') {
      return !isRazorpayEnabled;
    }

    if (paymentOption === 'cod') {
      if (!isCodEnabled || backendTotals.total < codMinOrder || backendTotals.total > codMaxOrder) {
        return true;
      }
      if (!codOtpSent) return false;
      if (!codVerified) return codOtpInput.length < 6;
      return false;
    }
    return false;
  };

  return (
    <div className="bg-surface-container-low -mt-2">
      {/* Rental Agreement Summary Card */}
      <RentalDateSummaryCard
        hasRentalItems={hasRentalItems}
        rentalStartDate={rentalStartDate}
        rentalEndDate={rentalEndDate}
        depositTotal={backendTotals?.depositTotal}
      />

      {/* Target Delivery Date (Streamlined & Clean) */}
      <TargetDeliveryDatePicker
        needByDate={needByDate}
        setNeedByDate={setNeedByDate}
        hasRentalItems={hasRentalItems}
        rentalStartDate={rentalStartDate}
      />

      {/* Promo Savings Banner (only displayed if a valid coupon is active) */}
      {appliedCoupon && couponValid && backendTotals?.discount > 0 && (
        <div className="p-3.5 bg-primary/10 border border-primary/30 rounded-lg flex items-center justify-between text-xs mb-4 shadow-xs">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-primary text-lg">local_offer</span>
            <div>
              <span className="font-bold text-on-surface block">
                Promo Code <span className="font-mono text-primary uppercase">{appliedCoupon}</span>{' '}
                applied
              </span>
              <p className="text-[10px] text-secondary">
                You are saving ₹{backendTotals.discount.toLocaleString('en-IN')} on this order!
              </p>
            </div>
          </div>
          <span className="text-primary font-extrabold text-sm">
            −₹{backendTotals.discount.toLocaleString('en-IN')}
          </span>
        </div>
      )}

      {/* Payment Options Section */}
      {backendTotals?.total === 0 ? (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="p-5 bg-green-50 text-green-900 border border-green-200/60 rounded-lg mb-6 shadow-sm mt-2"
        >
          <div className="flex items-center gap-2.5 mb-2">
            <span className="material-symbols-outlined text-green-600 text-[20px]">
              check_circle
            </span>
            <h3 className="text-green-800 font-bold text-[13px] tracking-widest uppercase">
              Payment Complete
            </h3>
          </div>
          <p className="text-green-700/80 text-[11px] font-medium leading-relaxed">
            {backendTotals?.walletDeduction > 0
              ? 'Used Siri Pay Wallet. Your wallet balance completely covers this order. No additional payment is required.'
              : 'Your order total is fully covered. No additional payment is required.'}
          </p>
        </motion.div>
      ) : (
        <>
          {/* Payment Header */}
          <div className="py-4 sm:py-6 mb-2">
            <h2
              className="font-sans text-sm font-bold text-on-surface uppercase tracking-wider flex items-center gap-2"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              <span className="material-symbols-outlined text-[18px] text-primary">payments</span>
              Payment Options
            </h2>
          </div>

          <div className="flex flex-col gap-4 mb-4">
            {/* Option: Razorpay (Secure Online Payment) */}
            {isRazorpayEnabled && (
              <div
                onClick={() => setPaymentOption('razorpay')}
                className={`relative p-5 rounded-lg border transition-all duration-300 cursor-pointer overflow-hidden ${
                  paymentOption === 'razorpay'
                    ? 'border-primary bg-primary/5 shadow-md'
                    : 'border-outline-variant/40 bg-surface-bright hover:border-primary/40 hover:shadow-sm'
                }`}
              >
                <div className="flex items-start gap-3.5 select-none">
                  {/* Custom Premium Radio Button */}
                  <div className="pt-1">
                    <div
                      className={`w-4.5 h-4.5 rounded-full border-[1.5px] flex items-center justify-center transition-all ${paymentOption === 'razorpay' ? 'border-primary bg-white' : 'border-outline-variant bg-transparent'}`}
                    >
                      {paymentOption === 'razorpay' && (
                        <motion.div
                          layoutId="payment-radio-dot"
                          className="w-2.5 h-2.5 rounded-full bg-primary"
                          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                        />
                      )}
                    </div>
                  </div>

                  <div className="flex-1">
                    <span className="text-[12px] font-semibold text-on-surface flex items-center gap-2">
                      Secure Online Payment (Razorpay)
                      <span className="bg-primary/10 text-primary border border-primary/30 text-[8px] px-1.5 py-0.5 rounded-sm font-extrabold uppercase tracking-wider">
                        Recommended
                      </span>
                    </span>
                    <p className="text-[10px] text-secondary mt-1 leading-relaxed">
                      Pay securely using UPI, Credit/Debit Card, or Netbanking.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Option: Cash on Delivery */}
            {isCodEnabled && (
              <div
                onClick={() => {
                  if (backendTotals.total >= codMinOrder && backendTotals.total <= codMaxOrder) {
                    setPaymentOption('cod');
                  }
                }}
                className={`relative p-5 rounded-lg border transition-all duration-300 overflow-hidden ${
                  backendTotals.total > codMaxOrder || backendTotals.total < codMinOrder
                    ? 'opacity-45 cursor-not-allowed border-outline-variant/20 bg-gray-50/50'
                    : 'cursor-pointer ' +
                      (paymentOption === 'cod'
                        ? 'border-primary bg-primary/5 shadow-md'
                        : 'border-outline-variant/40 bg-surface-bright hover:border-primary/40 hover:shadow-sm')
                }`}
              >
                <div className="flex items-start gap-3.5 select-none">
                  {/* Custom Premium Radio Button */}
                  <div className="pt-1">
                    <div
                      className={`w-4.5 h-4.5 rounded-full border-[1.5px] flex items-center justify-center transition-all ${paymentOption === 'cod' ? 'border-primary bg-white' : 'border-outline-variant bg-transparent'}`}
                    >
                      {paymentOption === 'cod' && (
                        <motion.div
                          layoutId="payment-radio-dot"
                          className="w-2.5 h-2.5 rounded-full bg-primary"
                          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                        />
                      )}
                    </div>
                  </div>

                  <div className="flex-1">
                    <span className="text-[12px] font-semibold text-on-surface">
                      Cash on Delivery (COD)
                    </span>
                    {backendTotals.total > codMaxOrder ? (
                      <p className="text-[10px] text-red-600 font-bold mt-0.5 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px]">info</span>
                        COD unavailable for orders above ₹{codMaxOrder.toLocaleString('en-IN')}
                      </p>
                    ) : backendTotals.total < codMinOrder ? (
                      <p className="text-[10px] text-red-600 font-bold mt-0.5 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px]">info</span>
                        COD requires minimum order of ₹{codMinOrder.toLocaleString('en-IN')}
                      </p>
                    ) : (
                      <p className="text-[10px] text-secondary mt-1 leading-relaxed">
                        Pay with cash or UPI when your item arrives at your doorstep.
                      </p>
                    )}
                    {paymentOption === 'cod' &&
                      backendTotals.total <= codMaxOrder &&
                      backendTotals.total >= codMinOrder && (
                        <div className="flex items-center gap-1.5 text-[10.5px] font-semibold text-emerald-800 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-md mt-2 w-fit">
                          <span className="material-symbols-outlined text-[13px] text-emerald-600 font-extrabold">
                            verified
                          </span>
                          <span>
                            Serviceable at {activeSelectedAddress?.pincode || 'your pincode'} by
                            Standard Courier
                          </span>
                        </div>
                      )}
                  </div>
                </div>
              </div>
            )}

            {!isRazorpayEnabled && !isCodEnabled && (
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-800 dark:text-amber-200 text-xs flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-600 text-lg">warning</span>
                <span>
                  No payment methods are currently available. Please contact store support.
                </span>
              </div>
            )}
          </div>

          {/* Dedicated Separate COD OTP Verification Box */}
          {isCodEnabled && paymentOption === 'cod' && (
            <CodOtpVerificationSection
              paymentOption={paymentOption}
              isCodEnabled={isCodEnabled}
              orderTotal={backendTotals.total}
              codMinOrder={codMinOrder}
              codMaxOrder={codMaxOrder}
              codVerified={codVerified}
              codOtpSent={codOtpSent}
              isSendingOtp={isSendingOtp}
              isProcessing={isProcessing}
              deliveryPhone={activeSelectedAddress?.phone || user?.phone}
              customerEmail={activeSelectedAddress?.email || user?.email}
              configuredCodChannel={configuredCodChannel}
              effectiveCodChannel={effectiveCodChannel}
              selectedCodChannel={selectedCodChannel}
              onSelectCodChannel={setSelectedCodChannel}
              codOtpInput={codOtpInput}
              setCodOtpInput={setCodOtpInput}
              handleSendCodOtp={handleSendCodOtp}
              handleVerifyCodOtp={handleVerifyCodOtp}
            />
          )}
        </>
      )}

      {/* Sticky Action Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-surface-bright border-t border-outline-variant/20 p-3 shadow-lg z-40 flex flex-col items-center">
        <div className="max-w-[768px] w-full mx-auto flex flex-col gap-3">
          {paymentError && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 text-red-700 p-3 rounded-lg flex items-start gap-3 border border-red-200 shadow-sm"
            >
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" aria-hidden="true" />
              <span className="font-bold text-[11px] leading-snug flex-1">{paymentError}</span>
            </motion.div>
          )}

          {totalsError && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-red-50 text-red-700 rounded-lg text-[11px] font-bold border border-red-200 flex flex-col gap-2 shadow-sm"
            >
              <div className="flex items-start gap-2">
                <AlertTriangle
                  className="w-4 h-4 shrink-0 text-red-600 mt-0.5"
                  aria-hidden="true"
                />
                <span className="flex-1 leading-snug">{totalsError}</span>
              </div>
              <button
                type="button"
                onClick={() => fetchBackendTotals(appliedCoupon)}
                className="btn-primary py-1 px-3 rounded-full text-[9px] uppercase tracking-wider w-fit self-end font-bold shadow-xs cursor-pointer !text-white"
              >
                Retry Validation
              </button>
            </motion.div>
          )}

          <div className="flex gap-3 w-full">
            <button
              onClick={() => setActiveStep(1)}
              disabled={isProcessing}
              className="flex-1 bg-transparent text-on-surface font-bold uppercase tracking-widest text-[9px] py-2.5 rounded-full border border-outline-variant/40 hover:bg-surface-container-low transition-colors disabled:opacity-50"
            >
              Back
            </button>
            <button
              onClick={handleBottomSubmit}
              disabled={isButtonDisabled()}
              className="flex-1 btn-primary py-2.5 rounded-full text-[9px] font-bold uppercase tracking-widest shadow-sm transition-all text-center disabled:opacity-75 disabled:cursor-not-allowed flex items-center justify-center gap-2 !text-white"
            >
              {isProcessing && <div className="skeleton-box inline-block w-3 h-3 rounded-full" />}
              <span>{getSubmitButtonLabel()}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
