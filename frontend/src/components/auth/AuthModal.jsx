import { m as motion, AnimatePresence } from 'framer-motion';
import { MandalaElement } from '../ui/MandalaElement';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/domainServices';
import toast from 'react-hot-toast';
import logger from '../../utils/logger';

export function AuthModal() {
  const { isAuthModalOpen, closeAuthModal, loginSuccess } = useAuth();

  const [step, setStep] = useState('identifier'); // identifier, otp, 2fa, success
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [totpCode, setTotpCode] = useState('');
  const [pending2faUserId, setPending2faUserId] = useState(null);
  const [timer, setTimer] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const otpRefs = useRef([]);
  const isSubmittingRef = useRef(false);
  const lastAutoSubmittedOtp = useRef('');

  const handleCheckEmailOrSend = async (e) => {
    e?.preventDefault();
    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    if (isSubmittingRef.current || isLoading) return;

    isSubmittingRef.current = true;
    setIsLoading(true);

    try {
      const response = await authService.sendOTP(email);
      toast.success('Verification code sent to your email!');
      setStep('otp');
      setTimer(60);
      lastAutoSubmittedOtp.current = '';
      setOtp(['', '', '', '', '', '']);
      setTimeout(() => {
        if (otpRefs.current[0]) otpRefs.current[0].focus();
      }, 300);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send verification credentials');
    } finally {
      isSubmittingRef.current = false;
      setIsLoading(false);
    }
  };

  const submitOTP = async (otpString) => {
    if (isSubmittingRef.current || isLoading) return;

    isSubmittingRef.current = true;
    setIsLoading(true);
    try {
      const response = await authService.verifyOTP(email, otpString.replace(/\D/g, ''));
      if (response.success && response.data?.requires2FA) {
        setPending2faUserId(response.data.userId);
        setTotpCode('');
        setStep('2fa');
        return;
      }
      if (response.success) {
        setStep('success');
        setTimeout(async () => {
          await loginSuccess(
            response.data.user,
            response.data.accessToken || response.data.token,
            response.data.refreshToken,
          );
        }, 1800);
      }
    } catch (err) {
      setError(true);
      lastAutoSubmittedOtp.current = '';
      toast.error(err.response?.data?.message || 'Invalid or expired code');
      setOtp(['', '', '', '', '', '']);
      setTimeout(() => {
        setError(false);
        if (otpRefs.current[0]) otpRefs.current[0].focus();
      }, 600);
    } finally {
      isSubmittingRef.current = false;
      setIsLoading(false);
    }
  };

  const submit2FA = async (code) => {
    if (!pending2faUserId || isSubmittingRef.current || isLoading) return;
    isSubmittingRef.current = true;
    setIsLoading(true);
    try {
      const response = await authService.verify2FALogin(pending2faUserId, code);
      if (response.success) {
        setStep('success');
        setTimeout(async () => {
          await loginSuccess(
            response.data.user,
            response.data.accessToken || response.data.token,
            response.data.refreshToken,
          );
        }, 1800);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid authenticator code');
      setTotpCode('');
    } finally {
      isSubmittingRef.current = false;
      setIsLoading(false);
    }
  };

  // Countdown timer for resending OTP
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

  // Reset modal state when it closes or opens
  useEffect(() => {
    if (!isAuthModalOpen) {
      // Small delay to prevent visual jump during exit animation
      const t = setTimeout(() => {
        setStep('identifier');
        setEmail('');
        setOtp(['', '', '', '', '', '']);
        setTimer(0);
        setError(false);
        setTotpCode('');
        setPending2faUserId(null);
      }, 400);
      return () => clearTimeout(t);
    }
  }, [isAuthModalOpen]);

  // Auto-submit OTP when all 6 digits are typed
  useEffect(() => {
    const otpString = otp.join('');
    if (otpString.length === 6 && step === 'otp' && isAuthModalOpen) {
      const timer = setTimeout(() => {
        submitOTP(otpString);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [otp]);

  // WebOTP API for automatic SMS reading
  useEffect(() => {
    if (step === 'otp' && isAuthModalOpen && 'OTPCredential' in window) {
      const ac = new AbortController();
      navigator.credentials
        .get({
          otp: { transport: ['sms'] },
          signal: ac.signal,
        })
        .then((otpCredential) => {
          if (otpCredential && otpCredential.code) {
            const newOtp = otpCredential.code.split('').slice(0, 6);
            const paddedOtp = Array.from({ length: 6 }, (_, i) => newOtp[i] || '');
            setOtp(paddedOtp);
          }
        })
        .catch((err) => {
          logger.info('WebOTP API failed or aborted:', err);
        });

      return () => {
        ac.abort();
      };
    }
  }, [step, isAuthModalOpen]);

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
    await submitOTP(otpString);
  };

  const handleOtpChange = (value, index) => {
    if (!value) {
      const newOtp = [...otp];
      newOtp[index] = '';
      setOtp(newOtp);
      return;
    }

    // Handle multi-character autofill/paste
    if (value.length > 1) {
      const pastedData = value.replace(/\D/g, '').slice(0, 6).split('');
      const newOtp = [...otp];
      pastedData.forEach((char, idx) => {
        if (idx < 6) newOtp[idx] = char;
      });
      setOtp(newOtp);
      const lastFilledIndex = pastedData.length - 1;
      if (lastFilledIndex >= 0 && lastFilledIndex < 5) {
        otpRefs.current[lastFilledIndex + 1].focus();
      } else if (lastFilledIndex >= 5) {
        otpRefs.current[5].focus();
      }
      return;
    }

    if (isNaN(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      otpRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1].focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim().slice(0, 6).split('');
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
    <AnimatePresence>
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          {/* Dark blurred background overlay */}
          <motion.div
            key="auth-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeAuthModal}
            className="absolute inset-0 bg-black/40 backdrop-blur-md"
          />

          {/* Floating Auth Card Modal Container */}
          <motion.div
            key="auth-modal"
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="relative bg-[#faf9f6] w-full max-w-[390px] rounded-[28px] p-6 xs:p-7 sm:p-8 border border-outline-variant/30 shadow-[0_30px_70px_rgba(115,92,0,0.06)] overflow-hidden"
          >
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
              className="absolute top-6 right-6 w-9 h-9 rounded-full bg-white/50 backdrop-blur-md border border-outline-variant/20 flex items-center justify-center hover:bg-primary/10 text-on-surface-variant/40 hover:text-primary transition-all duration-300 z-50 cursor-pointer shadow-2xs"
              aria-label="Close authentication modal"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>

            {/* Core Content Layout */}
            <div className="relative z-10">
              <AnimatePresence mode="wait">
                {step === 'success' ? (
                  <motion.div
                    key="success-screen"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-center space-y-8 py-6 relative"
                  >
                    <div className="relative inline-block">
                      <MandalaElement
                        size={200}
                        duration={35}
                        variant={4}
                        opacity={0.08}
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary"
                      />

                      <motion.div
                        initial={{ scale: 0, rotate: -45 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: 'spring', damping: 14, delay: 0.1 }}
                        className="w-20 h-20 bg-gradient-to-br from-primary to-primary-container text-surface rounded-full flex items-center justify-center shadow-lg relative z-10"
                      >
                        <span className="material-symbols-outlined text-[36px] font-bold">
                          check
                        </span>
                      </motion.div>

                      <motion.div
                        animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0, 0.2] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
                        className="absolute inset-0 bg-primary/30 rounded-full blur-lg"
                      />
                    </div>

                    <div className="space-y-2">
                      <span className="font-label-sm text-[9px] text-primary uppercase tracking-[0.4em] font-bold block">
                        Verification Successful
                      </span>
                      <h2 className="font-display text-[30px] leading-tight text-on-surface-variant font-light">
                        Welcome to the <br />
                        <span className="italic font-light text-primary">Studio.</span>
                      </h2>
                    </div>

                    <div className="pt-2 flex justify-center">
                      <div className="w-12 h-[1px] bg-outline-variant/30 relative overflow-hidden">
                        <motion.div
                          initial={{ x: '-100%' }}
                          animate={{ x: '100%' }}
                          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                          className="absolute inset-0 bg-primary w-1/2"
                        />
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="form-container"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-8"
                  >
                    {/* Headings */}
                    <div className="space-y-1.5">
                      <span className="font-label-sm text-[9px] text-primary uppercase tracking-[0.4em] block font-bold">
                        Bespoke Portal
                      </span>
                      <h2 className="font-display text-[24px] sm:text-[28px] leading-tight text-on-surface-variant font-light">
                        {step === '2fa'
                          ? 'Enter Authenticator Code'
                          : step === 'otp'
                            ? 'Verification Code'
                            : 'Login or Sign Up'}
                      </h2>
                      {step !== 'otp' && (
                        <p className="text-on-surface-variant/60 text-[13px] font-light leading-relaxed">
                          {step === '2fa'
                            ? 'Enter the 6-digit code from your authenticator app.'
                            : 'Experience passwordless, secure entry to our store.'}
                        </p>
                      )}
                      {step === 'otp' && (
                        <p className="text-on-surface-variant/60 text-[13px] font-light leading-relaxed">
                          Code sent to{' '}
                          <span className="font-semibold text-on-surface-variant">{email}</span>
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
                          <motion.form
                            key="email-block"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            onSubmit={handleCheckEmailOrSend}
                            className="space-y-5"
                          >
                            <div className="relative group">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant/30 text-[16px] group-focus-within:text-primary transition-colors">
                                mail
                              </span>

                              <label
                                htmlFor="auth-email-input"
                                className={`absolute transition-all duration-300 pointer-events-none font-bold ${
                                  isFocused || email
                                    ? 'text-[9px] -top-2 left-4 bg-white px-1.5 text-primary tracking-[0.2em] uppercase z-10'
                                    : 'text-[12px] top-1/2 -translate-y-1/2 left-10 text-on-surface-variant/40 tracking-[0.15em] uppercase'
                                }`}
                              >
                                Email Address
                              </label>

                              <input
                                id="auth-email-input"
                                type="email"
                                required
                                className="w-full bg-surface-container-low/50 border border-outline-variant/35 rounded-xl pl-10 pr-4 py-3.5 font-body text-[14px] text-on-surface-variant outline-none transition-all focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/5"
                                placeholder={isFocused ? 'e.g. creative@siriartsandcrafts.com' : ''}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                onFocus={() => setIsFocused(true)}
                                onBlur={() => setIsFocused(false)}
                              />
                            </div>
                            <button
                              disabled={!email || isLoading}
                              className="w-full h-12 bg-primary text-surface rounded-full flex items-center justify-center gap-2.5 font-label-sm text-[10px] uppercase tracking-widest font-bold hover:bg-on-surface-variant hover:text-surface transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed group relative overflow-hidden shadow-md shadow-primary/10 cursor-pointer"
                            >
                              {isLoading ? (
                                <div className="skeleton-box inline-block w-4 h-4 rounded-md" />
                              ) : (
                                <>
                                  <span>Send Verification Code</span>
                                  <span className="material-symbols-outlined text-[14px] group-hover:translate-x-1 transition-transform">
                                    arrow_forward
                                  </span>
                                </>
                              )}
                            </button>
                          </motion.form>
                        ) : step === '2fa' ? (
                          <motion.form
                            key="2fa-block"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            onSubmit={(e) => {
                              e.preventDefault();
                              if (totpCode.length >= 6) submit2FA(totpCode);
                            }}
                            className="space-y-6"
                          >
                            <input
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              maxLength={6}
                              autoComplete="one-time-code"
                              value={totpCode}
                              onChange={(e) =>
                                setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                              }
                              className="w-full text-center font-display text-[20px] tracking-[0.3em] bg-surface-container-low/50 border border-outline-variant/35 rounded-xl py-3.5 outline-none focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/5 font-bold"
                              placeholder="000000"
                            />
                            <button
                              type="submit"
                              disabled={totpCode.length < 6 || isLoading}
                              className="w-full h-12 bg-primary text-surface rounded-full flex items-center justify-center gap-2.5 font-label-sm text-[10px] uppercase tracking-widest font-bold hover:bg-on-surface-variant hover:text-surface transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed group relative overflow-hidden shadow-md shadow-primary/10 cursor-pointer"
                            >
                              {isLoading ? 'Verifying…' : 'Verify Authenticator'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setStep('identifier');
                                setPending2faUserId(null);
                              }}
                              className="w-full text-center font-label-sm text-[8px] text-primary uppercase tracking-[0.2em] font-bold hover:underline cursor-pointer"
                            >
                              Start over
                            </button>
                          </motion.form>
                        ) : (
                          <motion.form
                            key="otp-block"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            onSubmit={handleVerifyOTP}
                            className="space-y-5"
                          >
                            <motion.div
                              animate={error ? { x: [-10, 10, -10, 10, 0] } : {}}
                              transition={{ duration: 0.4 }}
                              className="flex justify-between gap-1 xs:gap-1.5 sm:gap-2"
                              onPaste={handlePaste}
                            >
                              {otp.map((digit, idx) => (
                                <input
                                  key={idx}
                                  ref={(el) => (otpRefs.current[idx] = el)}
                                  type="text"
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  maxLength={6}
                                  autoComplete="one-time-code"
                                  value={digit}
                                  onChange={(e) => handleOtpChange(e.target.value, idx)}
                                  onKeyDown={(e) => handleKeyDown(e, idx)}
                                  onPaste={handlePaste}
                                  aria-label={`Digit ${idx + 1} of verification code`}
                                  className={`w-8 h-11 xs:w-9 xs:h-12 text-center font-display text-[16px] xs:text-[18px] bg-surface-container-low/50 border rounded-xl outline-none transition-all shadow-inner focus:shadow-md focus:ring-4 focus:ring-primary/5 ${
                                    error
                                      ? 'border-error text-error ring-1 ring-error'
                                      : digit
                                        ? 'border-primary text-primary font-semibold'
                                        : 'border-outline-variant/40 text-on-surface-variant focus:border-primary'
                                  }`}
                                />
                              ))}
                            </motion.div>

                            <div className="space-y-4 pt-1">
                              <button
                                disabled={otp.join('').length < 6 || isLoading}
                                className="w-full h-12 bg-primary text-surface rounded-full flex items-center justify-center gap-2.5 font-label-sm text-[10px] uppercase tracking-widest font-bold hover:bg-on-surface-variant hover:text-surface transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed group relative overflow-hidden shadow-md shadow-primary/10 cursor-pointer"
                              >
                                {isLoading ? (
                                  <div className="skeleton-box inline-block w-4 h-4 rounded-md" />
                                ) : (
                                  <span>Verify and Login</span>
                                )}
                              </button>

                              <div className="text-center">
                                {timer > 0 ? (
                                  <span className="font-label-sm text-[9px] text-on-surface-variant/40 uppercase tracking-[0.2em] font-semibold block">
                                    Resend Code in {timer}s
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={handleCheckEmailOrSend}
                                    className="font-label-sm text-[9px] text-primary uppercase tracking-[0.25em] font-bold hover:underline cursor-pointer"
                                  >
                                    Resend Code
                                  </button>
                                )}
                              </div>
                            </div>
                          </motion.form>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
