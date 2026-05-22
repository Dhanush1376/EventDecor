import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { MandalaArtDecor } from "../components/ui/MandalaArtDecor";
import { handleImageError } from "../utils/imageUtils";
import { useCheckout } from "./CheckoutProvider";


export default function CheckoutPaymentStep() {
  const { activeStep, setActiveStep, activeSelectedAddress, isAddingNewAddress, paymentOption, setPaymentOption, upiId, setUpiId, upiVerified, setUpiVerified, cardDetails, setCardDetails, selectedBank, setSelectedBank, codConfirmed, setCodConfirmed, codOtpSent, codOtpCode, codOtpInput, setCodOtpInput, codVerified, isSendingOtp, paymentError, setPaymentError, handleSendCodOtp, handleVerifyCodOtp, backendTotals, UPI_REGEX, settings, user } = useCheckout();
  return (
    <>
      {/* Accordion Block 4: PAYMENT OPTIONS */}
      <motion.div
              layout
              className="bg-white border border-[#d0c5af]/40 rounded-lg overflow-hidden shadow-xs relative group"
            >
              <MandalaArtDecor
                variant={1}
                size={300}
                className="absolute -bottom-10 -right-10 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity pointer-events-none"
              />

              {/* Header */}
              <motion.button
                whileTap={{
                  backgroundColor:
                    activeStep === 3
                      ? "var(--color-primary)"
                      : "var(--color-surface-container-low)",
                }}
                onClick={() => {
                  if (activeStep > 2) {
                    if (!activeSelectedAddress) {
                      toast.error("Please configure and select a delivery address first.");
                      return;
                    }
                    if (isAddingNewAddress) {
                      toast.error("Please save your new address or click cancel to proceed.");
                      return;
                    }
                    setActiveStep(3);
                  }
                }}
                aria-expanded={activeStep === 3}
                className={`w-full p-4 flex items-center justify-between cursor-pointer transition-colors ${
                  activeStep === 3
                    ? "bg-primary text-surface"
                    : "bg-surface-bright text-on-surface hover:bg-surface-container-low"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-5 h-5 font-bold text-xs rounded flex items-center justify-center transition-colors ${
                      activeStep === 3
                        ? "bg-surface text-primary"
                        : "bg-surface-container-low text-secondary"
                    }`}
                  >
                    4
                  </span>
                  <span
                    className={`text-xs font-bold uppercase tracking-wider transition-colors ${activeStep === 3 ? "text-surface" : "text-secondary"}`}
                  >
                    Payment Options
                  </span>
                </div>
              </motion.button>

              {/* Body */}
              <AnimatePresence>
                {activeStep === 3 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="p-4 sm:p-6 space-y-4 border-t border-[#f4f3f1] overflow-hidden"
                  >
                    {/* Payment selection list */}
                    <div className="space-y-4">
                      {/* Option: Razorpay (Secure Online Payment) */}
                      <motion.div
                        layout
                        className={`border rounded-lg p-3 sm:p-4 transition-all ${
                          paymentOption === "razorpay"
                            ? "bg-primary/5 border-primary shadow-sm"
                            : "border-outline-variant/40"
                        }`}
                      >
                        <label className="flex items-start gap-4 cursor-pointer select-none">
                          <input
                            type="radio"
                            name="payment-option-radio"
                            checked={paymentOption === "razorpay"}
                            onChange={() => setPaymentOption("razorpay")}
                            className="mt-1 text-primary focus:ring-0 cursor-pointer transition-all"
                          />
                          <div className="flex-1">
                            <span className="text-sm font-bold text-on-surface flex items-center gap-2">
                              Secure Online Payment (Razorpay)
                              <span className="bg-green-100 text-green-700 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Recommended</span>
                            </span>
                            <p className="text-[11px] text-on-surface-variant/60 mt-1">
                              Pay securely using UPI, Credit/Debit Card, or Netbanking via Razorpay.
                            </p>
                          </div>
                        </label>
                      </motion.div>

                      {/* Option: Cash on Delivery */}
                      <motion.div
                        layout
                        className={`border rounded-lg p-3 sm:p-4 transition-all ${
                          paymentOption === "cod"
                            ? "bg-primary/5 border-primary shadow-sm"
                            : "border-outline-variant/40"
                        }`}
                      >
                        <label className={`flex items-start gap-4 select-none ${backendTotals.total > 50000 ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}>
                          <input
                            type="radio"
                            name="payment-option-radio"
                            checked={paymentOption === "cod"}
                            disabled={backendTotals.total > 50000}
                            onChange={() => setPaymentOption("cod")}
                            className={`mt-1 text-primary focus:ring-0 transition-all ${backendTotals.total > 50000 ? "cursor-not-allowed" : "cursor-pointer"}`}
                          />
                          <div className="flex-1">
                            <span className="text-sm font-bold text-on-surface">Cash on Delivery (COD)</span>
                            {backendTotals.total > 50000 ? (
                              <p className="text-[10px] text-error font-bold mt-1 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[12px]">info</span>
                                COD unavailable for orders above ₹50,000
                              </p>
                            ) : (
                              <p className="text-[11px] text-on-surface-variant/60 mt-1">
                                Pay with cash or UPI when your item arrives.
                              </p>
                            )}
                          </div>
                        </label>

                        <AnimatePresence>
                          {paymentOption === "cod" && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className="mt-3 pl-8 pt-3 border-t border-outline-variant/30 space-y-3 overflow-hidden text-xs"
                            >
                              {/* Order Limit Check */}
                              {backendTotals.total < 500 ? (
                                <div className="p-2.5 bg-amber-50 text-amber-800 rounded-lg font-semibold text-[10px] uppercase tracking-wider flex items-center gap-1.5 border border-amber-200">
                                  <span className="material-symbols-outlined text-[13px]">warning</span>
                                  <span>COD requires minimum order of ₹500. Please choose secure online payment.</span>
                                </div>
                              ) : (
                                <>
                                  {/* Pincode eligibility check */}
                                  <div className="flex items-center gap-2 text-[10px] text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-lg font-bold uppercase tracking-wider">
                                    <span className="material-symbols-outlined text-xs">local_shipping</span>
                                    <span>COD Serviceable by Delhivery at {activeSelectedAddress?.pincode || "Your Pincode"}</span>
                                  </div>

                                  <label className="flex items-center gap-3 cursor-pointer select-none">
                                    <input
                                      type="checkbox"
                                      checked={codConfirmed}
                                      onChange={(e) => {
                                        const isChecked = e.target.checked;
                                        setCodConfirmed(isChecked);
                                        if (isChecked && !codOtpSent && !codVerified) {
                                          handleSendCodOtp();
                                        }
                                      }}
                                      className="rounded text-primary focus:ring-0 cursor-pointer"
                                    />
                                    <span className="text-[11px] text-on-surface-variant font-medium">
                                      I confirm this is a real order request.
                                    </span>
                                  </label>

                                  {/* OTP Section */}
                                  <div className="mt-2.5 bg-surface-container-low p-3 rounded-lg border border-outline-variant/20">
                                    <div className="flex items-center justify-between gap-2 mb-2">
                                      <span className="text-[10px] font-bold uppercase tracking-widest text-secondary flex items-center gap-1">
                                        <span className="material-symbols-outlined text-xs">lock</span>
                                        Security OTP Verification
                                      </span>
                                      {codVerified && (
                                        <span className="text-[9px] font-bold uppercase tracking-widest text-green-700 bg-green-50 px-2 py-0.5 rounded-full flex items-center gap-0.5 border border-green-200">
                                          <span className="material-symbols-outlined text-[10px] font-bold">check</span>
                                          Verified
                                        </span>
                                      )}
                                    </div>

                                    {!codVerified ? (
                                      <div className="space-y-2">
                                        {!codOtpSent ? (
                                          <button
                                            type="button"
                                            onClick={handleSendCodOtp}
                                            disabled={isSendingOtp}
                                            className="w-full bg-primary/5 hover:bg-primary/10 border border-primary/20 text-primary font-bold text-[9px] uppercase tracking-widest py-2 rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-2xs"
                                          >
                                            {isSendingOtp ? (
                                              <>
                                                <div className="w-3 h-3 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                                                <span>Sending Code...</span>
                                              </>
                                            ) : (
                                              <>
                                                <span className="material-symbols-outlined text-xs">mail</span>
                                                <span>Send Verification OTP to {activeSelectedAddress?.email || user?.email || "Email"}</span>
                                              </>
                                            )}
                                          </button>
                                        ) : (
                                          <div className="space-y-2">
                                            <p className="text-[10px] text-secondary leading-normal">
                                              We sent a 4-digit code to <strong className="text-on-surface">{activeSelectedAddress?.email || user?.email}</strong>. Enter it below:
                                            </p>
                                            <div className="flex gap-2 items-stretch">
                                              <input
                                                type="text"
                                                maxLength={4}
                                                placeholder="Enter OTP"
                                                value={codOtpInput}
                                                onChange={(e) => setCodOtpInput(e.target.value.replace(/\D/g, ""))}
                                                className="flex-1 h-9 bg-white border border-outline-variant rounded px-3 text-xs outline-none focus:border-primary transition-colors text-center font-mono font-bold tracking-widest"
                                              />
                                              <button
                                                type="button"
                                                onClick={handleVerifyCodOtp}
                                                className="h-9 bg-primary text-white font-bold text-[9px] uppercase tracking-widest px-4 rounded cursor-pointer hover:brightness-110 shadow-xs flex items-center justify-center transition-all"
                                              >
                                                Verify
                                              </button>
                                              <button
                                                type="button"
                                                onClick={handleSendCodOtp}
                                                className="h-9 bg-gray-100 text-gray-600 font-bold text-[9px] uppercase tracking-widest px-3 rounded cursor-pointer hover:bg-gray-200 flex items-center justify-center transition-all"
                                              >
                                                Resend
                                              </button>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <p className="text-[10px] text-green-700 font-semibold flex items-center gap-1">
                                        <span className="material-symbols-outlined text-xs">verified</span>
                                        OTP Verification completed! Ready to confirm your cash delivery.
                                      </p>
                                    )}
                                  </div>
                                </>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    </div>

                    {paymentError && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="p-3 bg-red-50 text-red-600 rounded text-xs font-semibold"
                      >
                        ⚠️ {paymentError}
                      </motion.div>
                    )}

                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
    </>
  );
}
