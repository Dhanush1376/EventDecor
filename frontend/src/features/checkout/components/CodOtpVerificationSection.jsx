import React from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';

/**
 * Encapsulated 6-digit OTP verification section for Cash on Delivery (COD) orders.
 * Supports Phone (SMS), Email, and Customer Choice (Both) delivery channels based on store settings.
 */
export default function CodOtpVerificationSection({
  paymentOption,
  isCodEnabled,
  orderTotal,
  codMinOrder,
  codMaxOrder,
  codVerified,
  codOtpSent,
  isSendingOtp,
  isProcessing,
  deliveryPhone,
  customerEmail,
  configuredCodChannel = 'phone',
  effectiveCodChannel = 'phone',
  selectedCodChannel = 'phone',
  onSelectCodChannel,
  codOtpInput,
  setCodOtpInput,
  handleSendCodOtp,
  handleVerifyCodOtp,
}) {
  const otpRefs = React.useRef([]);
  const [otpDigits, setOtpDigits] = React.useState(['', '', '', '', '', '']);

  // Sync internal digits state with codOtpInput
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

  const isCodVisible =
    paymentOption === 'cod' &&
    isCodEnabled &&
    orderTotal <= codMaxOrder &&
    orderTotal >= codMinOrder;

  const isEmailActive = effectiveCodChannel === 'email';
  const targetValue = isEmailActive ? customerEmail : deliveryPhone;
  const isTargetMissing = isEmailActive ? !customerEmail : !deliveryPhone;

  return (
    <AnimatePresence mode="wait">
      {isCodVisible && (
        <motion.div
          key="cod-otp-box"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="mb-4 rounded-lg border border-outline-variant/40 bg-surface-bright p-4 sm:p-5 shadow-xs space-y-3"
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-label text-[10px] sm:text-[11px] font-bold text-on-surface uppercase tracking-widest flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[15px] text-primary">
                verified_user
              </span>
              Verify COD Order
            </h3>

            {/* Channel Indicator Badge */}
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 font-label text-[9px] font-bold uppercase tracking-wider text-primary">
              <span className="material-symbols-outlined text-[12px]">
                {isEmailActive ? 'mail' : 'sms'}
              </span>
              <span>{isEmailActive ? 'Email Verification' : 'SMS Verification'}</span>
            </span>
          </div>

          {!codVerified ? (
            <div className="space-y-3">
              {/* Channel Selector if configured as 'both' and OTP not yet sent */}
              {configuredCodChannel === 'both' && !codOtpSent && (
                <div className="flex items-center gap-2 bg-surface-container-low/60 p-1.5 rounded-md border border-outline-variant/30">
                  <span className="font-label text-[9px] uppercase tracking-wider font-bold text-secondary px-2">
                    Verify via:
                  </span>
                  <div className="grid grid-cols-2 gap-1.5 flex-1">
                    <button
                      type="button"
                      onClick={() => onSelectCodChannel && onSelectCodChannel('phone')}
                      className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md font-label text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                        selectedCodChannel === 'phone'
                          ? 'bg-primary text-white shadow-xs'
                          : 'text-on-surface hover:bg-black/5'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[13px]">call</span>
                      <span>Phone SMS</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onSelectCodChannel && onSelectCodChannel('email')}
                      className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md font-label text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                        selectedCodChannel === 'email'
                          ? 'bg-primary text-white shadow-xs'
                          : 'text-on-surface hover:bg-black/5'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[13px]">mail</span>
                      <span>Email Code</span>
                    </button>
                  </div>
                </div>
              )}

              {isTargetMissing ? (
                <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-md flex items-center gap-2 text-amber-800 text-xs">
                  <span className="material-symbols-outlined text-[16px] text-amber-600 shrink-0">
                    warning
                  </span>
                  <span>
                    {isEmailActive
                      ? 'Please ensure your account or delivery address has a valid email address.'
                      : 'Please add a phone number to this delivery address to place a COD order.'}
                  </span>
                </div>
              ) : !codOtpSent ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-container-low/50 border border-outline-variant/30 p-3 sm:p-3.5 rounded-md">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11.5px] text-secondary font-medium">
                      {isEmailActive ? 'Send OTP to email:' : 'Send OTP to phone:'}
                    </span>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-bright border border-outline-variant/40 text-[11.5px] font-mono font-medium text-on-surface">
                      <span className="material-symbols-outlined text-[13px] text-primary">
                        {isEmailActive ? 'mail' : 'call'}
                      </span>
                      <span>{targetValue}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleSendCodOtp}
                    disabled={isSendingOtp || isProcessing}
                    className="btn-primary py-2 px-4 rounded-full font-label text-[9px] sm:text-[10px] font-bold uppercase tracking-widest shadow-xs !text-white flex items-center justify-center gap-1.5 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer shrink-0"
                  >
                    {isSendingOtp ? (
                      <>
                        <span className="material-symbols-outlined text-[13px] animate-spin">
                          progress_activity
                        </span>
                        <span>{isEmailActive ? 'Sending...' : 'Sending...'}</span>
                      </>
                    ) : (
                      <>
                        <span>{isEmailActive ? 'Send Email OTP' : 'Send OTP'}</span>
                        <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="space-y-3 bg-surface-container-low/50 border border-outline-variant/30 p-4 rounded-md">
                  <div className="text-center sm:text-left">
                    <p className="text-[12px] text-on-surface font-medium">
                      Enter the 6-digit OTP sent to {isEmailActive ? 'email' : 'phone'}:{' '}
                      <span className="font-mono font-semibold text-primary">{targetValue}</span>
                    </p>
                    <p className="text-[10.5px] text-secondary mt-0.5">
                      {isEmailActive
                        ? 'Please check your email inbox (and spam/junk folder).'
                        : 'Please check your mobile SMS messages.'}
                    </p>
                  </div>

                  {/* Responsive 6-digit input grid */}
                  <div
                    className="w-full max-w-[280px] mx-auto grid grid-cols-6 gap-2 py-1"
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
                        className="w-full aspect-square min-w-0 bg-surface-bright border border-outline-variant/40 focus:border-primary focus:ring-1 focus:ring-primary/20 rounded-md text-center font-mono font-bold text-base text-on-surface shadow-xs outline-none transition-all disabled:opacity-50"
                      />
                    ))}
                  </div>

                  {/* Resend option */}
                  <div className="flex justify-center pt-2 border-t border-outline-variant/20">
                    <button
                      type="button"
                      onClick={handleSendCodOtp}
                      disabled={isSendingOtp || isProcessing}
                      className="font-label text-[9px] sm:text-[10px] text-primary font-bold uppercase tracking-wider hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-[13px]">sync</span>
                      Resend code
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2.5 bg-emerald-50 border border-emerald-200/60 p-3 rounded-md text-emerald-900"
            >
              <span className="material-symbols-outlined text-[18px] text-emerald-700">
                check_circle
              </span>
              <div className="flex-1 min-w-0 text-xs">
                <span className="font-bold">COD Verified:</span>{' '}
                <span className="text-emerald-800">
                  Identity confirmed via {isEmailActive ? 'email' : 'phone'}. Ready to place order.
                </span>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
