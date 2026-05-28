import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

import { handleImageError } from "../utils/imageUtils";
import { useCheckout } from "./CheckoutProvider";


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
    settings,
    user
  } = useCheckout();

  // References and state for 4-digit OTP grid
  const otpRefs = [React.useRef(null), React.useRef(null), React.useRef(null), React.useRef(null)];
  const [otpDigits, setOtpDigits] = React.useState(["", "", "", ""]);

  // Sync internal digits state with global codOtpInput context state
  React.useEffect(() => {
    if (codOtpInput) {
      const digits = codOtpInput.padEnd(4, " ").slice(0, 4).split("").map(c => c === " " ? "" : c);
      setOtpDigits(digits);
    } else {
      setOtpDigits(["", "", "", ""]);
    }
  }, [codOtpInput]);

  // Automatically confirm COD behind the scenes when COD option is selected to simplify user flow
  React.useEffect(() => {
    if (paymentOption === "cod") {
      setCodConfirmed(true);
    }
  }, [paymentOption, setCodConfirmed]);

  const handleDigitChange = async (index, value) => {
    const cleanedVal = value.replace(/\D/g, "").slice(0, 1);
    const newDigits = [...otpDigits];
    newDigits[index] = cleanedVal;
    setOtpDigits(newDigits);

    const code = newDigits.join("");
    setCodOtpInput(code);

    // Auto-focus next field
    if (cleanedVal !== "" && index < 3) {
      otpRefs[index + 1].current?.focus();
    }

    // Auto-verify if fully entered
    if (code.length === 4) {
      await handleVerifyCodOtp(code);
    }
  };

  const handleDigitKeyDown = (index, e) => {
    if (e.key === "Backspace") {
      if (otpDigits[index] === "" && index > 0) {
        const newDigits = [...otpDigits];
        newDigits[index - 1] = "";
        setOtpDigits(newDigits);
        setCodOtpInput(newDigits.join(""));
        otpRefs[index - 1].current?.focus();
      } else {
        const newDigits = [...otpDigits];
        newDigits[index] = "";
        setOtpDigits(newDigits);
        setCodOtpInput(newDigits.join(""));
      }
    }
  };

  const getSubmitButtonLabel = () => {
    if (isProcessing) return "Processing...";
    
    if (paymentOption === "razorpay") {
      return `Pay ₹${backendTotals.total.toLocaleString("en-IN")}`;
    }
    
    // COD payment option selected
    if (backendTotals.total < 500) {
      return "COD Unavailable (< ₹500)";
    }
    if (!codOtpSent) {
      return "Send Verification Code";
    }
    if (!codVerified) {
      return "Verify OTP";
    }
    return "Place COD Order";
  };

  const handleBottomSubmit = async () => {
    if (isProcessing) return;

    if (!activeSelectedAddress) {
      toast.error("Please select a delivery address");
      setActiveStep(1);
      return;
    }

    if (paymentOption === "razorpay") {
      handleConfirmOrder();
    } else {
      if (backendTotals.total < 500) {
        toast.error("COD is only serviceable for order totals between ₹500 and ₹50,000.");
        return;
      }
      if (!codOtpSent) {
        handleSendCodOtp();
      } else if (!codVerified) {
        if (!codOtpInput.trim() || codOtpInput.length < 4) {
          toast.error("Please enter the 4-digit verification code");
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
    if (paymentOption === "cod" && backendTotals.total < 500) return true;
    return false;
  };
  
  return (
    <div className="bg-surface-container-low -mt-2 pb-4">
      {/* Payment Header */}
      <div className="bg-surface-bright mb-3 px-4 py-3.5 text-[11px] font-bold text-[#a17e2b] uppercase tracking-widest border-b border-[#c29b38]/10 shadow-xs">
         Payment Options
      </div>

      <div className="bg-surface-bright p-4 sm:p-5 shadow-xs border-b border-outline-variant/20 space-y-4 rounded-[4px]">
        {/* Option: Razorpay (Secure Online Payment) */}
        <div
          onClick={() => setPaymentOption("razorpay")}
          className={`border rounded-[4px] p-4 transition-all duration-300 cursor-pointer ${
            paymentOption === "razorpay"
              ? "bg-[#c29b38]/5 border-[#c29b38] shadow-xs"
              : "border-outline-variant/40 hover:border-[#c29b38]/30"
          }`}
        >
          <div className="flex items-start gap-4 select-none">
            {/* Custom Premium Radio Button */}
            <div className="pt-1">
              <div className={`w-4.5 h-4.5 rounded-full border-[1.5px] flex items-center justify-center transition-all ${paymentOption === "razorpay" ? 'border-[#c29b38] bg-white' : 'border-outline-variant bg-transparent'}`}>
                {paymentOption === "razorpay" && (
                  <motion.div 
                    layoutId="payment-radio-dot"
                    className="w-2.5 h-2.5 rounded-full bg-[#c29b38]"
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  />
                )}
              </div>
            </div>
            
            <div className="flex-1">
              <span className="text-[13px] font-bold text-on-surface flex items-center gap-2">
                Secure Online Payment (Razorpay)
                <span className="bg-[#c29b38]/10 text-[#c29b38] border border-[#c29b38]/30 text-[9px] px-2 py-0.5 rounded font-extrabold uppercase tracking-wider">Recommended</span>
              </span>
              <p className="text-[11px] text-secondary mt-1 leading-relaxed">
                Pay securely using UPI, Credit/Debit Card, or Netbanking via Razorpay.
              </p>
            </div>
          </div>
        </div>

        {/* Option: Cash on Delivery */}
        <div
          onClick={() => {
            if (backendTotals.total <= 50000) {
              setPaymentOption("cod");
            }
          }}
          className={`border rounded-[4px] p-4 transition-all duration-300 ${
            backendTotals.total > 50000 
              ? "opacity-45 cursor-not-allowed border-outline-variant/20 bg-gray-50/50" 
              : "cursor-pointer " + (paymentOption === "cod" ? "bg-[#c29b38]/5 border-[#c29b38] shadow-xs" : "border-outline-variant/40 hover:border-[#c29b38]/30")
          }`}
        >
          <div className="flex items-start gap-4 select-none">
            {/* Custom Premium Radio Button */}
            <div className="pt-1">
              <div className={`w-4.5 h-4.5 rounded-full border-[1.5px] flex items-center justify-center transition-all ${paymentOption === "cod" ? 'border-[#c29b38] bg-white' : 'border-outline-variant bg-transparent'}`}>
                {paymentOption === "cod" && (
                  <motion.div 
                    layoutId="payment-radio-dot"
                    className="w-2.5 h-2.5 rounded-full bg-[#c29b38]"
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  />
                )}
              </div>
            </div>

            <div className="flex-1">
              <span className="text-[13px] font-bold text-on-surface">Cash on Delivery (COD)</span>
              {backendTotals.total > 50000 ? (
                <p className="text-[10px] text-red-600 font-bold mt-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[12px]">info</span>
                  COD unavailable for orders above ₹50,000
                </p>
              ) : (
                <p className="text-[11px] text-secondary mt-1 leading-relaxed">
                  Pay with cash or UPI when your item arrives.
                </p>
              )}
            </div>
          </div>

          <AnimatePresence>
            {paymentOption === "cod" && backendTotals.total <= 50000 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 pl-8.5 pt-3 border-t border-[#c29b38]/10 space-y-3 overflow-hidden text-xs"
              >
                {/* Order Limit Check */}
                {backendTotals.total < 500 ? (
                  <div className="p-2.5 bg-amber-50 text-amber-800 rounded-lg font-semibold text-[10px] uppercase tracking-wider flex items-center gap-1.5 border border-amber-200">
                    <span className="material-symbols-outlined text-[13px]">warning</span>
                    <span>COD requires minimum order of ₹500. Please choose secure online payment.</span>
                  </div>
                ) : (
                  <>
                    {/* Delhivery check */}
                    <div className="flex items-center gap-2.5 text-[11px] font-semibold text-green-700 bg-green-50/50 border border-green-200/50 p-3 rounded-[4px] mb-3">
                      <span className="material-symbols-outlined text-[16px] text-green-700 font-extrabold">verified</span>
                      <span>COD is serviceable at <span className="font-extrabold">{activeSelectedAddress?.pincode || "your pincode"}</span> by Delhivery</span>
                    </div>

                    {/* Unified Verification Interface */}
                    {!codVerified ? (
                      <div className="space-y-3 pt-1">
                        {!codOtpSent ? (
                          <div className="flex items-start gap-3 bg-[#c29b38]/5 border border-[#c29b38]/15 p-3.5 rounded-[4px]">
                            <span className="material-symbols-outlined text-[#c29b38] text-[18px] shrink-0 pt-0.5">verified_user</span>
                            <div className="flex-1">
                              <p className="text-[12px] text-secondary leading-relaxed font-light">
                                To secure your order, we will send a 4-digit verification code to your email address:
                              </p>
                              <strong className="text-on-surface font-semibold block mt-1.5 text-[13px] tracking-wide">
                                {activeSelectedAddress?.email || user?.email}
                              </strong>
                              <p className="text-[10px] text-secondary/70 mt-2">
                                Please click the prominent orange button below to request the code.
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3 bg-[#c29b38]/5 border border-[#c29b38]/15 p-4 rounded-[4px]">
                            <p className="text-[12px] text-secondary leading-normal">
                              We sent a 4-digit code to <strong className="text-on-surface font-semibold">{activeSelectedAddress?.email || user?.email}</strong>. Please check your inbox or spam folder:
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
                                  className="w-12 h-12 bg-white border border-[#c29b38]/20 focus:border-[#f26a10] rounded-[6px] text-center font-bold text-lg text-on-surface shadow-xs outline-none transition-all focus:ring-1 focus:ring-[#f26a10]/50 disabled:opacity-50"
                                />
                              ))}
                            </div>

                            {/* Resend option */}
                            <div className="flex justify-center pt-2 border-t border-[#c29b38]/10 mt-1">
                              <button
                                type="button"
                                onClick={handleSendCodOtp}
                                disabled={isSendingOtp || isProcessing}
                                className="text-[11px] text-[#c29b38] hover:text-[#a17e2b] font-bold hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                              >
                                <span className="material-symbols-outlined text-xs">sync</span>
                                Resend verification code
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2.5 text-[12px] text-green-700 bg-green-50/50 p-3 rounded-[4px] border border-green-200/50 mt-2 font-semibold">
                        <span className="material-symbols-outlined text-[18px] text-green-700 font-bold">verified</span>
                        <span>Verification completed! Ready to place your Cash on Delivery order.</span>
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

      {/* Sticky Action Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-surface-bright border-t border-outline-variant/20 p-3 shadow-lg z-40 max-w-[768px] mx-auto flex gap-3">
         <button
           onClick={() => setActiveStep(1)}
           disabled={isProcessing}
           className="flex-1 py-3 bg-surface-bright text-on-surface hover:bg-surface-container-low font-extrabold uppercase text-[12px] tracking-widest border border-outline-variant rounded transition-all disabled:opacity-50"
         >
           Back
         </button>
         <button
           onClick={handleBottomSubmit}
           disabled={isButtonDisabled()}
           className="flex-1 bg-[#f26a10] hover:bg-[#d85d0d] text-white py-3 rounded text-[12px] font-extrabold uppercase tracking-widest shadow-md transition-all text-center disabled:opacity-75 disabled:cursor-not-allowed flex items-center justify-center gap-2"
         >
           {isProcessing && <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />}
           <span>{getSubmitButtonLabel()}</span>
         </button>
      </div>
    </div>
  );
}
