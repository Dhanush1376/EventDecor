import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { SEO } from "../components/seo/SEO";
import { handleImageError } from "../utils/imageUtils";
import { MandalaElement } from "../components/ui/MandalaElement";
import { useAuth } from "../context/AuthContext";
import { authService } from "../services/domainServices";
import toast from "react-hot-toast";
import { useWebsiteContent } from "../hooks/useWebsiteContent";
import { SiriLogo } from "../components/ui/SiriLogo";

import logger from '../utils/logger';
const containerVariants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.4 } },
};

const itemVariants = {
  initial: { opacity: 0, y: 15 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  },
  exit: { opacity: 0, y: -10, transition: { duration: 0.3 } },
};

export function Auth() {
  const { contact } = useWebsiteContent();
  const whatsappNumber = contact?.whatsapp || "9866006648";
  const cleanWhatsapp = whatsappNumber.replace(/^\+?91/, "").trim();

  const [step, setStep] = useState("identifier"); // identifier, otp, 2fa, success
  const [pending2faUserId, setPending2faUserId] = useState(null);
  const [totpCode, setTotpCode] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [devOtp, setDevOtp] = useState("");
  const [timer, setTimer] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [isFocused, setIsFocused] = useState(false);
  const { loading, isAuthenticated, loginSuccess } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const otpRefs = useRef([]);
  const isSubmittingRef = useRef(false);
  const lastAutoSubmittedOtp = useRef('');

  // If user is already authenticated, redirect them away from /auth (DO NOT clear their session)
  useEffect(() => {
    if (!loading && isAuthenticated) {
      const redirect = searchParams.get('redirect');
      navigate(redirect || '/', { replace: true });
    }
  }, [loading, isAuthenticated, navigate, searchParams]);

  // Countdown effect for the timer
  useEffect(() => {
    let interval = null;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [timer]);

  // Auto-submit OTP when 6 digits are fully filled (once per code)
  useEffect(() => {
    const otpString = otp.join('');
    if (
      otpString.length === 6 &&
      step === 'otp' &&
      !isLoading &&
      lastAutoSubmittedOtp.current !== otpString
    ) {
      lastAutoSubmittedOtp.current = otpString;
      submitOTP(otpString);
    }
  }, [otp, step, isLoading]);

  async function handleCheckEmailOrSend(e) {
    e?.preventDefault();
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }

    // Synchronous submission lock to prevent parallel network dispatches
    if (isSubmittingRef.current || isLoading) {
      logger.warn("[Auth] Duplicate send-otp request blocked on client");
      return;
    }

    isSubmittingRef.current = true;
    setIsLoading(true);

    try {
      const response = await authService.sendOTP(email);
      toast.success("Verification code sent to your email!");
      setStep("otp");
      setTimer(60);
      lastAutoSubmittedOtp.current = '';
      setOtp(["", "", "", "", "", ""]);
      if (import.meta.env.DEV && response.success && response.data && response.data.otp) {
        setDevOtp(response.data.otp);
      } else {
        setDevOtp("");
      }
      setTimeout(() => {
        if (otpRefs.current[0]) otpRefs.current[0].focus();
      }, 300);
    } catch (err) {
      logger.error("[AUTH ERROR]", err);
      toast.error(err.response?.data?.message || err.message || 'Failed to send verification credentials');
    } finally {
      isSubmittingRef.current = false;
      setIsLoading(false);
    }
  }

  async function submitOTP(otpString) {
    if (isSubmittingRef.current || isLoading || step === "success") {
      logger.warn("[Auth] Duplicate verify-otp request blocked on client");
      return;
    }

    isSubmittingRef.current = true;
    setIsLoading(true);
    try {
      const response = await authService.verifyOTP(email, otpString.replace(/\D/g, ''));
      if (response.success && response.data?.requires2FA) {
        setPending2faUserId(response.data.userId);
        setTotpCode("");
        setStep("2fa");
        isSubmittingRef.current = false;
        setIsLoading(false);
        return;
      }
      if (response.success) {
        setUserRole(response.data.user.role);
        setStep("success");
        // Keep isSubmittingRef and isLoading locked to true during success state transition
        isSubmittingRef.current = true;
        setIsLoading(true);
        const accessToken = response.data.accessToken || response.data.token;
        const refreshToken = response.data.refreshToken;
        setTimeout(async () => {
          await loginSuccess(response.data.user, accessToken, refreshToken);
        }, 1800);
      }
    } catch (err) {
      setError(true);
      toast.error(err.response?.data?.message || 'Invalid or expired code');
      lastAutoSubmittedOtp.current = '';
      setOtp(["", "", "", "", "", ""]);
      setTimeout(() => {
        setError(false);
        if (otpRefs.current[0]) otpRefs.current[0].focus();
      }, 600);
      isSubmittingRef.current = false;
      setIsLoading(false);
    }
  }

  const handleAutofillDevOtp = () => {
    if (devOtp) {
      const digits = devOtp.toString().split("");
      setOtp(digits);
      toast.success("OTP Autofilled successfully!");
      setTimeout(() => {
        submitOTP(devOtp.toString());
      }, 200);
    }
  };

  async function submit2FA(code) {
    if (!pending2faUserId || isSubmittingRef.current || isLoading) return;
    isSubmittingRef.current = true;
    setIsLoading(true);
    try {
      const response = await authService.verify2FALogin(pending2faUserId, code);
      if (response.success) {
        setUserRole(response.data.user.role);
        setStep("success");
        const accessToken = response.data.accessToken || response.data.token;
        const refreshToken = response.data.refreshToken;
        setTimeout(async () => {
          await loginSuccess(response.data.user, accessToken, refreshToken);
        }, 1800);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Invalid authenticator code");
      setTotpCode("");
    } finally {
      isSubmittingRef.current = false;
      setIsLoading(false);
    }
  }

  const handleVerifyOTP = async (e) => {
    e?.preventDefault();
    const otpString = otp.join("");
    if (otpString.length < 6) {
      setError(true);
      toast.error("Please enter all 6 digits");
      setTimeout(() => setError(false), 500);
      return;
    }
    await submitOTP(otpString);
  };

  const handleOtpChange = (value, index) => {
    if (isNaN(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);

    if (value && index < 5) {
      otpRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1].focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").trim().slice(0, 6).split("");
    const newOtp = [...otp];
    pastedData.forEach((char, idx) => {
      if (!isNaN(char) && idx < 6) newOtp[idx] = char;
    });
    setOtp(newOtp);
    const lastFilledIndex = pastedData.length - 1;
    if (lastFilledIndex >= 0 && lastFilledIndex < 5) {
      otpRefs.current[lastFilledIndex + 1].focus();
    } else if (lastFilledIndex >= 5) {
      otpRefs.current[5].focus();
    }
  };

  return (
    <div className="min-h-screen bg-black flex overflow-hidden selection:bg-primary/20">
      <SEO
        title="Secure Access | Siri Arts & Crafts"
        description="Experience luxury e-commerce and passwordless entry. Verify your session securely via email."
        noindex={true}
      />

      {/* Left Panel: Immersive Cinematic Storytelling */}
      <div className="hidden min-[1680px]:flex min-[1680px]:w-1/2 relative bg-black overflow-hidden">
        <motion.div
          initial={{ scale: 1.05 }}
          animate={{ scale: 1 }}
          transition={{ duration: 10, ease: "easeOut" }}
          className="absolute inset-0"
        >
          <img
            onError={handleImageError}
            src="https://images.unsplash.com/photo-1511795409834-ef04bbd61622?q=80&w=2069&auto=format&fit=crop"
            alt="Luxury Event Decor"
            className="w-full h-full object-cover opacity-60 mix-blend-screen"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-transparent" />
        </motion.div>

        {/* Floating Aura */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-primary/10 rounded-full blur-[150px] animate-pulse" />
        </div>

        <div className="relative z-10 p-20 text-white w-full min-h-screen flex flex-col justify-between">
          <div aria-hidden="true" className="h-20" />

          <div className="max-w-lg space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="space-y-6"
            >
              <h2 className="font-headline text-[48px] leading-[1.1] tracking-tight">
                Authentic Craftsmanship. <br />
                <span className="italic font-light text-primary">
                  Seamless Entry.
                </span>
              </h2>
            </motion.div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.8 }}
              className="font-body text-[15px] text-white/50 font-light leading-relaxed max-w-sm"
            >
              Welcome to the premium design hub of Siri Arts. Elevate your event visions with our curated catalog and personalized consulting.
            </motion.p>
          </div>
        </div>
      </div>

      {/* Right Panel: Premium Light-Theme Glassmorphism Auth Form */}
      <div className="w-full min-[1680px]:w-1/2 relative flex items-center justify-center p-6 md:p-12 overflow-y-auto bg-surface">
        {/* Decorative Floating Mandalas Background Aesthetics - Softened for Luxury */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-primary/5 blur-[160px] rounded-full" />
          <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] bg-primary/5 blur-[160px] rounded-full" />
          
          <MandalaElement
            size={650}
            duration={180}
            variant={1}
            opacity={0.04}
            className="absolute -top-40 -right-40 text-primary"
          />
          <MandalaElement
            size={500}
            duration={140}
            variant={3}
            opacity={0.03}
            className="absolute -bottom-30 -left-30 text-primary"
          />
          <MandalaElement
            size={350}
            duration={90}
            variant={2}
            opacity={0.03}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary"
          />
        </div>

        <div className="w-full max-w-[440px] relative z-10 my-auto py-16">
          <>
            {step === "success" ? (
              <SuccessState
                key="success"
                onComplete={() => {
                  const adminRoles = ['super_admin', 'main_admin', 'moderator', 'support_admin', 'order_manager', 'content_manager', 'admin', 'manager', 'coordinator'];
                  const redirect = searchParams.get('redirect');
                  if (redirect) {
                    navigate(redirect);
                  } else if (adminRoles.includes(userRole)) {
                    navigate("/admin");
                  } else {
                    navigate("/");
                  }
                }}
              />
            ) : (
              <motion.div
                key="auth-card"
                variants={containerVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="space-y-10"
              >
                {/* Header Branding */}
                <div className="text-center lg:text-left space-y-4">
                  <motion.div variants={itemVariants} className="lg:hidden mb-10 flex justify-center">
                    <Link to="/" className="flex items-center gap-1 group">
                      <SiriLogo size="56px" />
                    </Link>
                  </motion.div>

                  <motion.div variants={itemVariants} className="space-y-2">
                    <span className="font-label-sm text-[10px] text-primary uppercase tracking-[0.4em] block font-bold">
                      Login Gateway
                    </span>
                    <h2 className="font-headline text-[34px] md:text-[42px] leading-tight text-on-surface-variant font-light tracking-tight">
                      {step === "2fa"
                        ? "Authenticator"
                        : step === "otp"
                        ? "Security Key"
                        : "Enter Email"}
                    </h2>
                    <p className="text-on-surface-variant/60 text-[14px] font-light leading-relaxed max-w-[340px] mx-auto lg:mx-0">
                      {step === "2fa"
                        ? "Enter the 6-digit code from your authenticator app."
                        : step === "otp"
                        ? `A secure verification key has been dispatched to your email.`
                        : "Authenticate securely to step into the digital studio of Siri Arts and manage your collections."}
                    </p>
                  </motion.div>
                </div>

                {/* Form Card */}
                <div className="bg-white/80 backdrop-blur-2xl rounded-[32px] p-8 xs:p-10 md:p-12 min-h-[580px] flex flex-col justify-center border border-primary/10 shadow-xl shadow-primary/5 relative overflow-hidden">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

                  <>
                    {step === "identifier" ? (
                      <motion.form
                        key="email-form"
                        variants={itemVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        onSubmit={handleCheckEmailOrSend}
                        className="space-y-6 mt-4 lg:mt-0"
                      >
                        <div className="relative group">
                          {/* Soft Floating Label */}
                          <label
                            className={`absolute transition-all duration-300 pointer-events-none font-bold ${
                              isFocused || email
                                ? "text-[10px] -top-2 left-4 bg-white/90 backdrop-blur-md px-2 text-primary tracking-[0.2em] uppercase z-10"
                                : "text-[13px] top-1/2 -translate-y-1/2 left-4 text-on-surface-variant/40 tracking-wide"
                            }`}
                          >
                            Email Address
                          </label>

                          {/* Elegant Rounded Input */}
                          <input
                            type="email"
                            required
                            className="w-full bg-white border border-outline-variant/40 rounded-2xl px-4 py-4.5 font-body text-[15px] text-on-surface-variant outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/5 shadow-sm"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}
                          />
                        </div>

                        <button
                          disabled={!email || isLoading}
                          className="w-full h-14 bg-primary text-surface rounded-full flex items-center justify-center gap-3 font-label-sm text-[11px] uppercase tracking-widest font-bold hover:bg-on-surface-variant hover:text-surface transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed group relative overflow-hidden shadow-lg shadow-primary/20 cursor-pointer active:scale-[0.98]"
                        >
                          {isLoading ? (
                            <div className="skeleton-box inline-block w-5 h-5 rounded-md" />
                          ) : (
                            <>
                              <span>Send Verification Code</span>
                              <span className="material-symbols-outlined text-[16px] group-hover:translate-x-1 transition-transform">
                                arrow_forward
                              </span>
                            </>
                          )}
                        </button>
                      </motion.form>
                    ) : step === "2fa" ? (
                      <motion.form
                        key="2fa-form"
                        variants={itemVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (totpCode.length >= 6) submit2FA(totpCode);
                        }}
                        className="space-y-8"
                      >
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={6}
                          autoComplete="one-time-code"
                          value={totpCode}
                          onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                          className="w-full text-center font-display text-[24px] tracking-[0.4em] bg-surface-container-low/50 border border-outline-variant/40 rounded-2xl py-4 outline-none focus:border-primary"
                          placeholder="000000"
                        />
                        <button
                          type="submit"
                          disabled={totpCode.length < 6 || isLoading}
                          className="w-full h-14 bg-primary text-surface rounded-full font-label-sm text-[11px] uppercase tracking-widest font-bold disabled:opacity-30 hover:bg-on-surface-variant hover:text-surface transition-all duration-300 shadow-lg shadow-primary/20 cursor-pointer active:scale-[0.98]"
                        >
                          {isLoading ? "Verifying…" : "Verify Authenticator"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setStep("identifier");
                            setPending2faUserId(null);
                          }}
                          className="font-label-sm text-[9px] text-primary uppercase tracking-[0.2em] font-bold hover:underline"
                        >
                          Start over
                        </button>
                      </motion.form>
                    ) : (
                      <motion.form
                        key="otp-form"
                        variants={itemVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        onSubmit={handleVerifyOTP}
                        className="space-y-8"
                      >
                        <div className="space-y-3">
                          <p className="font-body text-[14px] text-on-surface-variant/70 font-light pl-1 leading-relaxed">
                            Verifying secure session for <br />
                            <span className="text-on-surface-variant font-semibold break-all">{email}</span>
                          </p>
                          <button
                            type="button"
                            onClick={() => setStep("identifier")}
                            className="font-label-sm text-[9px] text-primary uppercase tracking-[0.2em] font-bold hover:underline"
                          >
                            Not you? Change email
                          </button>
                        </div>

                        {/* Shake on error */}
                        <motion.div
                          animate={error ? { x: [-10, 10, -10, 10, 0] } : {}}
                          transition={{ duration: 0.4 }}
                          className="flex justify-between gap-1 xs:gap-1.5 sm:gap-2 md:gap-3"
                          onPaste={handlePaste}
                        >
                           {otp.map((digit, idx) => (
                            <input
                              key={idx}
                              ref={(el) => (otpRefs.current[idx] = el)}
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              maxLength={1}
                              autoComplete="one-time-code"
                              value={digit}
                              aria-invalid={error}
                              onChange={(e) => handleOtpChange(e.target.value, idx)}
                              onKeyDown={(e) => handleKeyDown(e, idx)}
                              onPaste={handlePaste}
                              className={`w-8 h-11 xs:w-10 xs:h-13 sm:w-11 sm:h-14 md:w-13 md:h-15 text-center font-display text-[16px] xs:text-[18px] sm:text-[22px] md:text-[26px] bg-surface-container-low/50 border rounded-2xl outline-none transition-all shadow-inner focus:shadow-xl focus:ring-4 focus:ring-primary/5 ${
                                error
                                  ? "border-error text-error ring-1 ring-error"
                                  : digit
                                  ? "border-primary text-primary font-semibold"
                                  : "border-outline-variant/40 text-on-surface-variant focus:border-primary"
                              }`}
                            />
                          ))}
                        </motion.div>

                        <div role="alert" aria-live="polite" className="sr-only">
                          {error ? "Invalid verification code entered. Please try again." : ""}
                        </div>

                        {import.meta.env.DEV && devOtp && (
                          <div className="text-center mt-4">
                            <button
                              type="button"
                              onClick={handleAutofillDevOtp}
                              className="px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-full text-[10.5px] font-bold uppercase tracking-wider hover:bg-primary/20 transition-all cursor-pointer"
                            >
                              [DEV ONLY] Autofill OTP: {devOtp}
                            </button>
                          </div>
                        )}



                        <div className="space-y-6 pt-2">
                          <button
                            disabled={otp.join("").length < 6 || isLoading}
                            className="w-full h-14 bg-primary text-surface rounded-full flex items-center justify-center gap-3 font-label-sm text-[11px] uppercase tracking-widest font-bold hover:bg-on-surface-variant hover:text-surface transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed group shadow-lg shadow-primary/20 cursor-pointer active:scale-[0.98]"
                          >
                            {isLoading ? (
                              <div className="skeleton-box inline-block w-5 h-5 rounded-md" />
                            ) : (
                              "Verify & Authenticate"
                            )}
                          </button>

                          <div className="text-center">
                            {timer > 0 ? (
                              <p className="font-label-sm text-[10px] text-on-surface-variant/40 uppercase tracking-widest font-semibold">
                                Resend available in 0:{timer.toString().padStart(2, "0")}
                              </p>
                            ) : (
                              <button
                                type="button"
                                onClick={handleCheckEmailOrSend}
                                className="font-label-sm text-[10px] text-primary uppercase tracking-widest font-bold hover:text-on-surface-variant transition-colors"
                              >
                                Resend Verification Code
                              </button>
                            )}
                          </div>
                        </div>
                      </motion.form>
                    )}
                  </>
                </div>

                {/* Footer Assistance */}
                <motion.div variants={itemVariants} className="text-center space-y-5">
                  <div className="flex items-center justify-center gap-5 mt-8">
                    <Link
                      to="/"
                      className="font-label-sm text-[9px] text-on-surface-variant/60 uppercase tracking-[0.2em] font-semibold hover:text-primary transition-colors"
                    >
                      Browse Storefront
                    </Link>
                    <span className="w-1 h-1 rounded-full bg-outline-variant/40" />
                    <button
                      onClick={() => window.open(`https://wa.me/91${cleanWhatsapp}`, "_blank")}
                      className="font-label-sm text-[9px] text-on-surface-variant/60 uppercase tracking-[0.2em] font-semibold hover:text-primary transition-colors cursor-pointer"
                    >
                      Need Assistance?
                    </button>
                  </div>

                  <div className="opacity-40 mt-4">
                    <p className="font-label-sm text-[8px] uppercase tracking-[0.3em] font-bold text-on-surface-variant/60">
                      Protected by Siri Secure Verification
                    </p>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </>
        </div>
      </div>
    </div>
  );
}

function SuccessState({ onComplete }) {
  useEffect(() => {
    const timer = setTimeout(onComplete, 2200);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center space-y-10 py-10 relative"
    >
      <div className="relative inline-block">
        {/* Subtle, beautiful gold mandala rotating behind the checkmark */}
        <MandalaElement
          size={240}
          duration={40}
          variant={4}
          opacity={0.08}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary"
        />

        <motion.div
          initial={{ scale: 0, rotate: -45 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", damping: 14, delay: 0.2 }}
          className="w-24 h-24 bg-gradient-to-br from-primary to-primary-container text-surface rounded-full flex items-center justify-center shadow-[0_15px_30px_rgba(115,92,0,0.15)] relative z-10"
        >
          <span className="material-symbols-outlined text-[44px] font-bold">
            check
          </span>
        </motion.div>
        
        <motion.div
          animate={{ scale: [1, 1.4, 1], opacity: [0.2, 0, 0.2] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
          className="absolute inset-0 bg-primary/30 rounded-full blur-xl"
        />
      </div>

      <div className="space-y-3 relative z-10">
        <motion.span
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="font-label-sm text-[10px] text-primary uppercase tracking-[0.5em] font-bold block"
        >
          Verification Successful
        </motion.span>
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="font-headline text-[38px] leading-tight text-on-surface-variant font-light"
        >
          Welcome to the <br />
          <span className="italic font-light text-primary">Studio.</span>
        </motion.h2>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="pt-6 flex justify-center relative z-10"
      >
        <div className="w-16 h-[1px] bg-outline-variant/30 relative overflow-hidden">
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 bg-primary w-1/2"
          />
        </div>
      </motion.div>
    </motion.div>
  );
}
