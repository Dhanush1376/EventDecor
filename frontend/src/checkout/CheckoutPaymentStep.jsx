import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle';
import X from 'lucide-react/dist/esm/icons/x';
import { m as motion, AnimatePresence } from 'framer-motion';
import React from 'react';
import toast from 'react-hot-toast';

const formatDisplayDate = (dateVal) => {
  if (!dateVal) return '';
  try {
    let d;
    if (typeof dateVal === 'string') {
      const clean = dateVal.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
        const [y, m, day] = clean.split('-').map(Number);
        d = new Date(y, m - 1, day);
      } else {
        d = new Date(clean);
      }
    } else {
      d = new Date(dateVal);
    }
    if (isNaN(d.getTime())) {
      return typeof dateVal === 'string' ? dateVal : '';
    }
    return d.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return typeof dateVal === 'string' ? dateVal : '';
  }
};

import { useCheckout } from './CheckoutProvider';

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

  // References and state for 6-digit OTP grid
  const otpRefs = React.useRef([]);
  const [otpDigits, setOtpDigits] = React.useState(['', '', '', '', '', '']);
  const [codOtpInput, setCodOtpInput] = React.useState('');

  // Ref for target delivery date picker
  const targetDateInputRef = React.useRef(null);
  const handleOpenDatePicker = () => {
    if (targetDateInputRef.current) {
      if (typeof targetDateInputRef.current.showPicker === 'function') {
        try {
          targetDateInputRef.current.showPicker();
          return;
        } catch {}
      }
      targetDateInputRef.current.focus();
    }
  };

  // Sync internal digits state with global codOtpInput context state
  React.useEffect(() => {
    if (codOtpInput) {
      const digits = codOtpInput
        .padEnd(6, ' ')
        .slice(0, 6)
        .split('')
        .map((c) => (c === ' ' ? '' : c));
      setOtpDigits(digits);
    } else {
      setOtpDigits(['', '', '', '', '', '']);
    }
  }, [codOtpInput]);

  // Automatically confirm COD behind the scenes when COD option is selected to simplify user flow
  React.useEffect(() => {
    if (paymentOption === 'cod') {
      setCodConfirmed(true);
    }
  }, [paymentOption, setCodConfirmed]);

  const handleDigitChange = async (index, value) => {
    const cleanedVal = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = cleanedVal;
    setOtpDigits(newDigits);

    const code = newDigits.join('');
    setCodOtpInput(code);

    // Auto-focus next field
    if (cleanedVal !== '' && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }

    // Auto-verify if fully entered
    if (code.length === 6 && !newDigits.includes('')) {
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
        otpRefs.current[index - 1]?.focus();
      } else {
        const newDigits = [...otpDigits];
        newDigits[index] = '';
        setOtpDigits(newDigits);
        setCodOtpInput(newDigits.join(''));
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      otpRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = async (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData?.getData('text') || '';
    const digits = pasteData.replace(/\D/g, '').slice(0, 6).split('');
    if (digits.length === 0) return;

    const newDigits = [...otpDigits];
    digits.forEach((d, i) => {
      if (i < 6) newDigits[i] = d;
    });
    setOtpDigits(newDigits);
    const code = newDigits.join('');
    setCodOtpInput(code);

    const nextIdx = Math.min(digits.length, 5);
    otpRefs.current[nextIdx]?.focus();

    if (code.length === 6 && !newDigits.includes('')) {
      await handleVerifyCodOtp(code);
    }
  };

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

    if (paymentOption === 'razorpay') {
      return `Pay ₹${currentPayableTotal.toLocaleString('en-IN')}`;
    }

    // COD payment option selected
    if (!isCodEnabled) {
      return 'COD Unavailable';
    }
    if (currentPayableTotal < codMinOrder) {
      return `COD Unavailable (< ₹${codMinOrder})`;
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

    if (backendTotals?.total === 0 || paymentOption === 'razorpay') {
      handleConfirmOrder();
    } else {
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
    }
  };

  const isButtonDisabled = () => {
    if (isProcessing) return true;
    if (isTotalsLoading) return true;
    if (totalsError) return true;
    if (backendTotals?.total === 0) return false;

    if (
      paymentOption === 'cod' &&
      (!isCodEnabled || backendTotals.total < codMinOrder || backendTotals.total > codMaxOrder)
    )
      return true;
    if (paymentOption === 'cod' && !codVerified && codOtpInput.length < 6) return true;
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

      {/* Preferred Delivery Date Input */}
      <div className="py-4 sm:py-6 mb-2 border-b border-black/5">
        <h2 className="font-display text-sm font-extrabold text-on-surface uppercase tracking-wider flex items-center gap-2 mb-3">
          <span className="material-symbols-outlined text-[18px] text-primary">calendar_clock</span>
          Target Delivery Date{' '}
          <span className="text-[10px] text-secondary font-medium tracking-normal normal-case">
            (Optional)
          </span>
        </h2>
        <div className="flex flex-col gap-1.5 w-full">
          <label className="text-[10px] font-bold text-secondary uppercase tracking-widest">
            By when do you need this order?
          </label>
          <div
            onClick={handleOpenDatePicker}
            className={`group relative flex items-center justify-between w-full h-12 rounded-xl border px-3.5 shadow-2xs cursor-pointer transition-all ${
              needByDate
                ? 'border-primary/50 bg-primary/[0.04] ring-1 ring-primary/20'
                : 'border-outline-variant/40 bg-surface-bright hover:border-primary/40 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0 flex-1 overflow-hidden">
              <span className="material-symbols-outlined text-[20px] text-primary shrink-0">
                calendar_today
              </span>
              <span
                className={`min-w-0 truncate text-[13px] sm:text-[14px] select-none ${
                  needByDate
                    ? 'text-neutral-900 font-bold tracking-tight'
                    : 'text-secondary/60 font-normal'
                }`}
              >
                {needByDate ? formatDisplayDate(needByDate) : 'Select preferred date...'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0 ml-2 z-20">
              {needByDate && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setNeedByDate('');
                  }}
                  className="p-1.5 rounded-full text-secondary/60 hover:text-on-surface hover:bg-black/5 active:bg-black/10 transition-colors cursor-pointer"
                  aria-label="Clear selected date"
                  title="Clear date"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <span className="material-symbols-outlined text-[18px] text-secondary/40 group-hover:text-primary transition-colors pointer-events-none">
                calendar_month
              </span>
            </div>

            <input
              ref={targetDateInputRef}
              type="date"
              min={new Date().toISOString().split('T')[0]}
              value={
                typeof needByDate === 'string'
                  ? needByDate.includes('T')
                    ? needByDate.split('T')[0]
                    : needByDate
                  : ''
              }
              onChange={(e) => setNeedByDate(e.target.value)}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                opacity: 0,
                zIndex: 10,
                cursor: 'pointer',
              }}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0"
              aria-label="Target delivery date"
            />
          </div>

          {/* If rental order has rentalStartDate, offer a quick-select chip */}
          {hasRentalItems && rentalStartDate && needByDate !== rentalStartDate && (
            <button
              type="button"
              onClick={() => setNeedByDate(rentalStartDate)}
              className="self-start text-[11px] font-medium text-primary hover:underline flex items-center gap-1 mt-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[13px]">event_available</span>
              Set to rental start date ({formatDisplayDate(rentalStartDate)})
            </button>
          )}

          <p className="text-[10px] text-secondary mt-0.5 leading-normal">
            Let us know your preferred timeline and we will try our best to deliver by that time.
          </p>
        </div>
      </div>

      {/* Promo Savings Banner (only displayed if a valid coupon is active) */}
      {appliedCoupon && couponValid && backendTotals?.discount > 0 && (
        <div className="p-3.5 bg-primary/10 border border-primary/30 rounded-xl flex items-center justify-between text-xs mb-4 shadow-xs">
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
          className="p-5 bg-green-50 text-green-900 border border-green-200/60 rounded-xl mb-6 shadow-sm mt-2"
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
            <h2 className="font-display text-sm font-extrabold text-on-surface uppercase tracking-wider flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-primary">payments</span>
              Payment Options
            </h2>
          </div>

          <div className="flex flex-col gap-4 mb-4">
            {/* Option: Razorpay (Secure Online Payment) */}
            <div
              onClick={() => setPaymentOption('razorpay')}
              className={`relative p-5 rounded-xl border transition-all duration-300 cursor-pointer overflow-hidden ${
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

            {/* Option: Cash on Delivery */}
            <div
              onClick={() => {
                if (
                  isCodEnabled &&
                  backendTotals.total >= codMinOrder &&
                  backendTotals.total <= codMaxOrder
                ) {
                  setPaymentOption('cod');
                }
              }}
              className={`relative p-5 rounded-xl border transition-all duration-300 overflow-hidden ${
                !isCodEnabled ||
                backendTotals.total > codMaxOrder ||
                backendTotals.total < codMinOrder
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
                  {!isCodEnabled ? (
                    <p className="text-[10px] text-red-600 font-bold mt-0.5 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px]">info</span>
                      COD is currently disabled
                    </p>
                  ) : backendTotals.total > codMaxOrder ? (
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
                </div>
              </div>

              <AnimatePresence>
                {paymentOption === 'cod' &&
                  isCodEnabled &&
                  backendTotals.total <= codMaxOrder &&
                  backendTotals.total >= codMinOrder && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4 pt-4 border-t border-primary/10 space-y-3 overflow-hidden text-xs"
                    >
                      <>
                        {/* Courier check */}
                        <div className="flex items-center gap-2 text-[10px] font-semibold text-green-700 bg-green-50/50 border border-green-200/50 p-2.5 rounded-md mb-2">
                          <span className="material-symbols-outlined text-[14px] text-green-700 font-extrabold">
                            verified
                          </span>
                          <span>
                            COD is serviceable at{' '}
                            <span className="font-extrabold">
                              {activeSelectedAddress?.pincode || 'your pincode'}
                            </span>{' '}
                            by Standard Courier
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
                                  <p className="text-[10px] text-secondary leading-relaxed font-light">
                                    To secure your order, we will send OTP to your email:
                                  </p>
                                  <strong className="text-on-surface font-semibold block mt-1 text-[10px] tracking-wide">
                                    {activeSelectedAddress?.email || user?.email}
                                  </strong>
                                  <button
                                    type="button"
                                    onClick={handleSendCodOtp}
                                    disabled={isSendingOtp || isProcessing}
                                    className="mt-3.5 px-5 py-2.5 bg-on-surface-variant text-surface rounded-md text-[11px] font-bold uppercase tracking-widest hover:bg-primary-container hover:text-on-primary-container transition-all shadow-sm w-full disabled:opacity-70 disabled:cursor-not-allowed"
                                  >
                                    {isSendingOtp ? 'SENDING...' : 'VERIFY OTP'}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-2.5 bg-primary/5 border border-primary/15 p-4 rounded-md">
                                <p className="text-[10px] text-secondary leading-normal">
                                  We sent a 6-digit code to{' '}
                                  <strong className="text-on-surface font-semibold">
                                    {activeSelectedAddress?.email || user?.email}
                                  </strong>
                                  . Please check your inbox or spam folder:
                                </p>

                                {/* Responsive 6-digit input grid */}
                                <div
                                  className="w-full max-w-[280px] sm:max-w-[320px] mx-auto grid grid-cols-6 gap-1.5 sm:gap-2.5 py-2.5"
                                  onPaste={handleOtpPaste}
                                >
                                  {otpDigits.map((digit, idx) => (
                                    <input
                                      key={idx}
                                      ref={(el) => (otpRefs.current[idx] = el)}
                                      type="tel"
                                      pattern="[0-9]*"
                                      inputMode="numeric"
                                      maxLength={1}
                                      value={digit}
                                      disabled={isProcessing}
                                      onPaste={handleOtpPaste}
                                      onChange={(e) => handleDigitChange(idx, e.target.value)}
                                      onKeyDown={(e) => handleDigitKeyDown(idx, e)}
                                      className="w-full aspect-square min-w-0 bg-white border-2 border-outline-variant/50 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg text-center font-bold text-base sm:text-lg text-on-surface shadow-2xs outline-none transition-all disabled:opacity-50"
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
                    </motion.div>
                  )}
              </AnimatePresence>
            </div>
          </div>
        </>
      )}

      {/* Sticky Action Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-surface-bright border-t border-outline-variant/20 p-3 shadow-lg z-40 flex flex-col items-center">
        <div className="max-w-[768px] w-full mx-auto flex flex-col gap-3">
          {paymentError && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 text-red-700 p-3 rounded-xl flex items-start gap-3 border border-red-200 shadow-sm"
            >
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" aria-hidden="true" />
              <span className="font-bold text-[11px] leading-snug flex-1">{paymentError}</span>
            </motion.div>
          )}

          {totalsError && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-red-50 text-red-700 rounded-xl text-[11px] font-bold border border-red-200 flex flex-col gap-2 shadow-sm"
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
