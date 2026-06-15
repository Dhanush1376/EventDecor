import { m as motion, AnimatePresence } from 'framer-motion';
import React from 'react';
import toast from 'react-hot-toast';

import { useCheckout } from './CheckoutProvider';

export default function CheckoutPaymentStep() {
  const {
    activeStep,
    setActiveStep,
    activeSelectedAddress,
    isAddingNewAddress,
    paymentOption,
    setPaymentOption,
    codConfirmed,
    setCodConfirmed,
    codOtpSent,
    codOtpInput,
    setCodOtpInput,
    codVerified,
    isSendingOtp,
    paymentError,
    setPaymentError,
    handleSendCodOtp,
    handleVerifyCodOtp,
    handleConfirmOrder,
    isProcessing,
    backendTotals,
    isTotalsLoading,
    totalsError,
    appliedCoupon,
    fetchBackendTotals,
    settings,
    user,
    hasRentalItems,
    rentalStartDate,
    rentalEndDate,
  } = useCheckout();

  // References and state for 4-digit OTP grid
  const otpRefs = [React.useRef(null), React.useRef(null), React.useRef(null), React.useRef(null)];
  const [otpDigits, setOtpDigits] = React.useState(['', '', '', '']);

  // Sync internal digits state with global codOtpInput context state
  React.useEffect(() => {
    if (codOtpInput) {
      const digits = codOtpInput
        .padEnd(4, ' ')
        .slice(0, 4)
        .split('')
        .map((c) => (c === ' ' ? '' : c));
      setOtpDigits(digits);
    } else {
      setOtpDigits(['', '', '', '']);
    }
  }, [codOtpInput]);

  // Automatically confirm COD behind the scenes when COD option is selected to simplify user flow
  React.useEffect(() => {
    if (paymentOption === 'cod') {
      setCodConfirmed(true);
    }
  }, [paymentOption, setCodConfirmed]);

  const handleDigitChange = async (index, value) => {
    const cleanedVal = value.replace(/\D/g, '').slice(0, 1);
    const newDigits = [...otpDigits];
    newDigits[index] = cleanedVal;
    setOtpDigits(newDigits);

    const code = newDigits.join('');
    setCodOtpInput(code);

    // Auto-focus next field
    if (cleanedVal !== '' && index < 3) {
      otpRefs[index + 1].current?.focus();
    }

    // Auto-verify if fully entered
    if (code.length === 4) {
      await handleVerifyCodOtp(code);
    }
  };

  const handleDigitKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (otpDigits[index] === '' && index > 0) {
        const newDigits = [...otpDigits];
        newDigits[index - 1] = '';
        setOtpDigits(newDigits);
        setCodOtpInput(newDigits.join(''));
        otpRefs[index - 1].current?.focus();
      } else {
        const newDigits = [...otpDigits];
        newDigits[index] = '';
        setOtpDigits(newDigits);
        setCodOtpInput(newDigits.join(''));
      }
    }
  };

  const getSubmitButtonLabel = () => {
    if (isProcessing) return 'Processing...';
    if (isTotalsLoading) return 'Calculating...';
    if (totalsError) return 'Pricing Load Error';

    if (paymentOption === 'razorpay') {
      return `Pay ₹${backendTotals.total.toLocaleString('en-IN')}`;
    }

    // COD payment option selected
    if (backendTotals.total < 500) {
      return 'COD Unavailable (< ₹500)';
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

    if (paymentOption === 'razorpay') {
      handleConfirmOrder();
    } else {
      if (backendTotals.total < 500) {
        toast.error('COD is only serviceable for order totals between ₹500 and ₹50,000.');
        return;
      }
      if (!codOtpSent) {
        handleSendCodOtp();
      } else if (!codVerified) {
        if (!codOtpInput.trim() || codOtpInput.length < 4) {
          toast.error('Please enter the 4-digit verification code');
          return;
        }
        handleVerifyCodOtp();
      } else {
        handleConfirmOrder();
      }
    }
  };

  const isButtonDisabled = () => {
    if (isProcessing) return true;
    if (isTotalsLoading) return true;
    if (totalsError) return true;
    if (paymentOption === 'cod' && backendTotals.total < 500) return true;
    if (paymentOption === 'cod' && !codVerified && codOtpInput.length < 4) return true;
    return false;
  };

  return (
    <div className="bg-surface-container-low -mt-2">
      {/* Rental Agreement Summary Card */}
      {hasRentalItems && rentalStartDate && rentalEndDate && (
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-5 mb-4 shadow-xs mt-4 mx-0 sm:mx-0">
          <h4 className="text-xs font-bold text-primary uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[15px]">description</span>
            Rental Agreement Summary
          </h4>
          <div className="space-y-1.5 text-[11px] text-secondary mt-3">
            <div className="flex justify-between">
              <span className="font-medium">Rental Period:</span>
              <span className="font-bold">
                {new Date(rentalStartDate).toLocaleDateString('en-IN')} -{' '}
                {new Date(rentalEndDate).toLocaleDateString('en-IN')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Return Date:</span>
              <span className="font-bold">
                {new Date(rentalEndDate).toLocaleDateString('en-IN')}
              </span>
            </div>
            {backendTotals?.depositTotal > 0 && (
              <div className="flex justify-between">
                <span className="font-medium">Security Deposit:</span>
                <span className="font-bold">₹{backendTotals.depositTotal.toLocaleString()}</span>
              </div>
            )}
            <div className="mt-3 p-2 bg-white/60 rounded-md text-[10px] italic">
              <strong>Late Fee Policy:</strong> Failure to return the items by the return date will
              result in a daily penalty deducted from the security deposit.
            </div>
          </div>
        </div>
      )}

      {/* Payment Header */}
      <div className="bg-surface-bright mb-4 p-4 text-[10px] font-label font-bold text-on-surface uppercase tracking-widest border border-outline-variant/40 rounded-lg shadow-xs">
        Payment Options
      </div>

      <div className="bg-surface-bright p-5 shadow-xs border border-outline-variant/40 space-y-3 rounded-lg">
        {/* Option: Razorpay (Secure Online Payment) */}
        <div
          onClick={() => setPaymentOption('razorpay')}
          className={`border rounded-lg p-4 transition-all duration-300 cursor-pointer ${
            paymentOption === 'razorpay'
              ? 'bg-primary/5 border-primary shadow-xs'
              : 'border-outline-variant/40 hover:border-primary/30'
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

        {/* Option: Cash on Delivery */}
        <div
          onClick={() => {
            if (backendTotals.total <= 50000) {
              setPaymentOption('cod');
            }
          }}
          className={`border rounded-lg p-4 transition-all duration-300 ${
            backendTotals.total > 50000
              ? 'opacity-45 cursor-not-allowed border-outline-variant/20 bg-gray-50/50'
              : 'cursor-pointer ' +
                (paymentOption === 'cod'
                  ? 'bg-primary/5 border-primary shadow-xs'
                  : 'border-outline-variant/40 hover:border-primary/30')
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
              {backendTotals.total > 50000 ? (
                <p className="text-[10px] text-red-600 font-bold mt-0.5 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[12px]">info</span>
                  COD unavailable for orders above ₹50,000
                </p>
              ) : (
                <p className="text-[10px] text-secondary mt-1 leading-relaxed">
                  Pay with cash or UPI when your item arrives.
                </p>
              )}
            </div>
          </div>

          <AnimatePresence>
            {paymentOption === 'cod' && backendTotals.total <= 50000 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 pt-4 border-t border-primary/10 space-y-3 overflow-hidden text-xs"
              >
                {/* Order Limit Check */}
                {backendTotals.total < 500 ? (
                  <div className="p-2.5 bg-amber-50 text-amber-800 rounded-lg font-semibold text-[10px] uppercase tracking-wider flex items-center gap-1.5 border border-amber-200">
                    <span className="material-symbols-outlined text-[13px]">warning</span>
                    <span>
                      COD requires minimum order of ₹500. Please choose secure online payment.
                    </span>
                  </div>
                ) : (
                  <>
                    {/* Delhivery check */}
                    <div className="flex items-center gap-2 text-[10px] font-semibold text-green-700 bg-green-50/50 border border-green-200/50 p-2.5 rounded-md mb-2">
                      <span className="material-symbols-outlined text-[14px] text-green-700 font-extrabold">
                        verified
                      </span>
                      <span>
                        COD is serviceable at{' '}
                        <span className="font-extrabold">
                          {activeSelectedAddress?.pincode || 'your pincode'}
                        </span>{' '}
                        by Delhivery
                      </span>
                    </div>

                    {/* Unified Verification Interface */}
                    {!codVerified ? (
                      <div className="space-y-3 pt-1">
                        {!codOtpSent ? (
                          <div className="flex items-start gap-2.5 bg-primary/5 border border-primary/15 p-3.5 rounded-md">
                            <span className="material-symbols-outlined text-primary text-[16px] shrink-0 pt-0.5">
                              verified_user
                            </span>
                            <div className="flex-1">
                              <p className="text-[11px] text-secondary leading-relaxed font-light">
                                To secure your order, we will send a 4-digit verification code to
                                your email:
                              </p>
                              <strong className="text-on-surface font-semibold block mt-1 text-[11px] tracking-wide">
                                {activeSelectedAddress?.email || user?.email}
                              </strong>
                              <button
                                type="button"
                                onClick={handleSendCodOtp}
                                disabled={isSendingOtp || isProcessing}
                                className="mt-3 px-5 py-2 bg-on-surface-variant text-surface rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-primary-container hover:text-on-primary-container transition-all shadow-sm w-fit disabled:opacity-70 disabled:cursor-not-allowed"
                              >
                                {isSendingOtp ? 'SENDING...' : 'VERIFY OTP'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2.5 bg-primary/5 border border-primary/15 p-4 rounded-md">
                            <p className="text-[12px] text-secondary leading-normal">
                              We sent a 4-digit code to{' '}
                              <strong className="text-on-surface font-semibold">
                                {activeSelectedAddress?.email || user?.email}
                              </strong>
                              . Please check your inbox or spam folder:
                            </p>

                            {/* Gorgeous 4-digit input grid */}
                            <div className="flex justify-center gap-3 py-2">
                              {otpDigits.map((digit, idx) => (
                                <input
                                  key={idx}
                                  ref={otpRefs[idx]}
                                  type="tel"
                                  pattern="[0-9]*"
                                  inputMode="numeric"
                                  maxLength={1}
                                  value={digit}
                                  disabled={isProcessing}
                                  onChange={(e) => handleDigitChange(idx, e.target.value)}
                                  onKeyDown={(e) => handleDigitKeyDown(idx, e)}
                                  className="w-10 h-10 bg-white border border-outline-variant/30 focus:border-primary rounded-md text-center font-bold text-base text-on-surface shadow-xs outline-none transition-all disabled:opacity-50"
                                />
                              ))}
                            </div>

                            {/* Resend option */}
                            <div className="flex justify-center pt-3 border-t border-primary/10 mt-2">
                              <button
                                type="button"
                                onClick={handleSendCodOtp}
                                disabled={isSendingOtp || isProcessing}
                                className="text-[11px] text-primary font-bold hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                              >
                                <span className="material-symbols-outlined text-xs">sync</span>
                                Resend verification code
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2.5 text-[12px] text-green-700 bg-green-50/50 p-4 rounded-lg border border-green-200/50 mt-2 font-semibold">
                        <span className="material-symbols-outlined text-[18px] text-green-700 font-bold">
                          verified
                        </span>
                        <span>
                          Verification completed! Ready to place your Cash on Delivery order.
                        </span>
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {paymentError && (
        <div className="mx-4 mt-4 p-3 bg-red-50 text-red-600 rounded text-xs font-semibold border border-red-200">
          ⚠️ {paymentError}
        </div>
      )}

      {totalsError && (
        <div className="mx-4 mt-4 p-3.5 bg-red-50 text-red-700 rounded-lg text-xs font-semibold border border-red-200 flex flex-col gap-2">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[15px] text-red-700">error</span>
            <span>{totalsError}</span>
          </div>
          <button
            type="button"
            onClick={() => fetchBackendTotals(appliedCoupon)}
            className="btn-primary py-1 px-3 rounded-full text-[9px] uppercase tracking-wider w-fit self-end font-bold shadow-xs cursor-pointer"
          >
            Retry Validation
          </button>
        </div>
      )}

      {/* Sticky Action Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-surface-bright border-t border-outline-variant/20 p-3 shadow-lg z-40 flex justify-center">
        <div className="max-w-[768px] w-full mx-auto flex gap-3">
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
            className="flex-1 btn-primary py-2.5 rounded-full text-[9px] font-bold uppercase tracking-widest shadow-sm transition-all text-center disabled:opacity-75 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isProcessing && <div className="skeleton-box inline-block w-3 h-3 rounded-full" />}
            <span>{getSubmitButtonLabel()}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
