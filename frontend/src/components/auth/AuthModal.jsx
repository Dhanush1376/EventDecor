import { X } from 'lucide-react';
import { m as motion, AnimatePresence } from 'framer-motion';
import { MandalaElement } from '../ui/MandalaElement';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAuthFlow } from '../../hooks/useAuthFlow';
import { useScrollLock } from '../../hooks/useScrollLock';
import toast from 'react-hot-toast';
import {
  UnifiedAuthForm,
  TwoFactorForm,
  OtpVerificationForm,
  AuthSuccessScreen,
  LinkRequiredScreen,
} from './AuthForms';

export function AuthModal() {
  const { isAuthModalOpen, closeAuthModal, loginSuccess } = useAuth();

  useScrollLock(isAuthModalOpen);

  const {
    step,
    setStep,
    identifier,
    setIdentifier,
    otp,
    totpCode,
    setTotpCode,
    timer,
    isLoading,
    error,
    setError,
    errorMsg,
    otpRefs,
    requestOTP,
    verifyOTP,
    verify2FA,
    handleOtpChange,
    handleKeyDown,
    handlePaste,
    resetState,
    googleLoading,
    handleGoogleSuccess,
    handleGoogleError,
    isNewUser,
  } = useAuthFlow(loginSuccess, isAuthModalOpen);

  const [isFocused, setIsFocused] = useState(false);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 640 : false,
  );
  const modalContentRef = useRef(null);
  const touchStartY = useRef(0);
  const [viewportStyle, setViewportStyle] = useState({});

  // Dynamic visualViewport tracker for mobile virtual keyboard
  useEffect(() => {
    if (!isAuthModalOpen || typeof window === 'undefined') return;

    const updateViewport = () => {
      const mobile = window.innerWidth < 640;
      setIsMobile(mobile);
      if (mobile && window.visualViewport) {
        const vv = window.visualViewport;
        setViewportStyle({
          position: 'fixed',
          top: `${vv.offsetTop}px`,
          left: `${vv.offsetLeft}px`,
          width: `${vv.width}px`,
          height: `${vv.height}px`,
        });
        if (window.scrollY !== 0) {
          window.scrollTo(0, 0);
        }
      } else {
        setViewportStyle({});
      }
    };

    updateViewport();

    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener('resize', updateViewport);
      vv.addEventListener('scroll', updateViewport);
    }
    window.addEventListener('resize', updateViewport);
    window.addEventListener('orientationchange', updateViewport);

    return () => {
      if (vv) {
        vv.removeEventListener('resize', updateViewport);
        vv.removeEventListener('scroll', updateViewport);
      }
      window.removeEventListener('resize', updateViewport);
      window.removeEventListener('orientationchange', updateViewport);
    };
  }, [isAuthModalOpen]);

  // Prevent iOS Safari rubber-band scrolling and viewport dragging
  useEffect(() => {
    if (!isAuthModalOpen || typeof window === 'undefined') return;

    const handleTouchStart = (e) => {
      touchStartY.current = e.touches[0]?.clientY || 0;
    };

    const handleTouchMove = (e) => {
      const modalEl = modalContentRef.current;
      if (!modalEl) {
        if (e.cancelable) e.preventDefault();
        return;
      }

      // Check if touch target is inside the modal card
      if (modalEl.contains(e.target)) {
        // If the card has actual scrollable content that overflows
        const hasOverflow = modalEl.scrollHeight > modalEl.clientHeight;
        if (hasOverflow) {
          const currentY = e.touches[0]?.clientY || 0;
          const deltaY = currentY - touchStartY.current;
          const isAtTop = modalEl.scrollTop <= 0 && deltaY > 0;
          const isAtBottom =
            modalEl.scrollTop + modalEl.clientHeight >= modalEl.scrollHeight - 1 && deltaY < 0;

          // Prevent rubber-band bounce when scrolling reaches top/bottom edge
          if (isAtTop || isAtBottom) {
            if (e.cancelable) e.preventDefault();
          }
          return;
        }
      }

      // Otherwise (backdrop, headers, or non-overflowing card), prevent window pan/scroll
      if (e.cancelable) {
        e.preventDefault();
      }
    };

    const handleWindowScroll = () => {
      if (window.scrollY !== 0) {
        window.scrollTo(0, 0);
      }
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('scroll', handleWindowScroll, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('scroll', handleWindowScroll);
    };
  }, [isAuthModalOpen]);

  const modalVariants = {
    hidden: isMobile ? { y: '100%', opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95, y: 15 },
    visible: {
      y: 0,
      opacity: 1,
      scale: 1,
      transition: isMobile
        ? { type: 'spring', damping: 25, stiffness: 250 }
        : { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
    },
    exit: isMobile
      ? {
          y: '100%',
          opacity: 1,
          scale: 1,
          transition: { type: 'spring', damping: 30, stiffness: 300 },
        }
      : { opacity: 0, scale: 0.95, y: 10, transition: { duration: 0.3 } },
  };

  // Reset modal state when it closes or opens
  useEffect(() => {
    if (!isAuthModalOpen) {
      // Small delay to prevent visual jump during exit animation
      const t = setTimeout(() => {
        resetState();
      }, 400);
      return () => clearTimeout(t);
    }
  }, [isAuthModalOpen, resetState]);

  // Listen to Escape key to close the auth modal
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (e.key === 'Escape' && isAuthModalOpen) {
        closeAuthModal();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isAuthModalOpen, closeAuthModal]);

  const handleVerifyOTP = async (e) => {
    e?.preventDefault();
    const otpString = otp.join('');
    if (otpString.length < 6) {
      setError(true);
      toast.error('Please enter all 6 digits');
      setTimeout(() => setError(false), 500);
      return;
    }
    await verifyOTP(otpString);
  };

  return (
    <AnimatePresence>
      {isAuthModalOpen && (
        <div
          style={viewportStyle}
          className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 touch-none overscroll-none"
        >
          {/* Dark blurred background overlay */}
          <motion.div
            key="auth-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeAuthModal}
            className="absolute inset-0 bg-black/40 backdrop-blur-md touch-none select-none"
          />

          {/* Floating Auth Card Modal Container */}
          <motion.div
            key="auth-modal"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="w-full sm:max-w-[390px] relative flex flex-col justify-end touch-pan-y"
          >
            <div
              ref={modalContentRef}
              className="relative bg-[#faf9f6] w-full rounded-t-[28px] sm:rounded-[28px] p-4 xs:p-5 sm:p-8 border-t sm:border border-outline-variant/30 shadow-[0_-10px_40px_rgba(115,92,0,0.04)] sm:shadow-[0_30px_70px_rgba(115,92,0,0.06)] overflow-y-auto max-h-full sm:max-h-[90vh] overscroll-contain no-scrollbar"
            >
              {/* Grab handle for mobile bottom sheet */}
              <div className="sm:hidden w-12 h-1 bg-outline-variant/40 rounded-full mx-auto mb-4 shrink-0" />
              {/* Concentric rotating gold mandalas for luxury styling */}
              <div className="absolute inset-0 pointer-events-none select-none overflow-hidden opacity-[0.06] z-0">
                <MandalaElement
                  size={300}
                  duration={70}
                  variant={1}
                  opacity={1}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary"
                />
                <MandalaElement
                  size={180}
                  duration={40}
                  variant={2}
                  opacity={0.8}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary"
                />
              </div>

              {/* Close button */}
              <button
                onClick={closeAuthModal}
                className="absolute top-6 right-6 w-11 h-11 rounded-full bg-white/50 backdrop-blur-md border border-outline-variant/20 flex items-center justify-center hover:bg-primary/10 text-on-surface-variant/40 hover:text-primary transition-all duration-300 z-50 cursor-pointer shadow-2xs"
                aria-label="Close authentication modal"
              >
                <X className="text-[18px]" strokeWidth={1.5} />
              </button>

              {/* Core Content Layout */}
              <div className="relative z-10">
                <AnimatePresence mode="wait">
                  {step === 'success' ? (
                    <AuthSuccessScreen MandalaElement={MandalaElement} isNewUser={isNewUser} />
                  ) : (
                    <motion.div
                      key="form-container"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-8"
                    >
                      {/* Headings */}
                      <div className="text-left mb-8 sm:mb-10 space-y-1.5 sm:space-y-2">
                        <h2 className="font-display text-[24px] sm:text-[28px] leading-tight text-on-surface-variant font-light">
                          {step === '2fa'
                            ? 'Enter Authenticator Code'
                            : step === 'otp'
                              ? 'Verification Code'
                              : 'Login or Sign Up'}
                        </h2>
                        {step !== 'otp' && step !== 'account_exists' && (
                          <p className="text-on-surface-variant/60 text-[13px] font-light leading-relaxed">
                            {step === '2fa'
                              ? 'Enter the 6-digit code from your authenticator app.'
                              : `Log in or register with your email`}
                          </p>
                        )}
                        {step === 'otp' && (
                          <p className="text-on-surface-variant/60 text-[13px] font-light leading-relaxed">
                            Code sent to{' '}
                            <span className="font-semibold text-on-surface-variant">
                              {identifier}
                            </span>
                            <button
                              type="button"
                              onClick={() => setStep('identifier')}
                              className="text-primary font-bold hover:underline cursor-pointer ml-1.5 uppercase text-[10px] tracking-wider"
                            >
                              Change
                            </button>
                          </p>
                        )}
                      </div>

                      {/* Form fields */}
                      <div className="w-full">
                        <AnimatePresence mode="wait">
                          {step === 'identifier' ? (
                            <motion.div
                              key="identifier-step"
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className="space-y-6"
                            >
                              <UnifiedAuthForm
                                identifier={identifier}
                                setIdentifier={setIdentifier}
                                requestOTP={requestOTP}
                                isLoading={isLoading}
                                isFocused={isFocused}
                                setIsFocused={setIsFocused}
                                googleLoading={googleLoading}
                                handleGoogleSuccess={handleGoogleSuccess}
                                handleGoogleError={handleGoogleError}
                              />
                            </motion.div>
                          ) : step === 'account_exists' ? (
                            <motion.div
                              key="account-exists-step"
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                            >
                              <LinkRequiredScreen setStep={setStep} />
                            </motion.div>
                          ) : step === '2fa' ? (
                            <motion.div
                              key="2fa-step"
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                            >
                              <TwoFactorForm
                                totpCode={totpCode}
                                setTotpCode={setTotpCode}
                                verify2FA={verify2FA}
                                isLoading={isLoading}
                                resetState={resetState}
                              />
                            </motion.div>
                          ) : (
                            <motion.div
                              key="otp-step"
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                            >
                              <OtpVerificationForm
                                otp={otp}
                                handleVerifyOTP={handleVerifyOTP}
                                handlePaste={handlePaste}
                                handleOtpChange={handleOtpChange}
                                handleKeyDown={handleKeyDown}
                                otpRefs={otpRefs}
                                error={error}
                                errorMsg={errorMsg}
                                isLoading={isLoading}
                                timer={timer}
                                sendOTP={requestOTP}
                              />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
