import { useState, useRef, useEffect, useCallback } from 'react';
import { authService } from '../services/domainServices';
import toast from 'react-hot-toast';
import logger from '../utils/core/logger';

export function useAuthFlow(loginSuccess, isAuthModalOpen) {
  const [step, setStep] = useState('identifier');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [totpCode, setTotpCode] = useState('');
  const [pending2faUserId, setPending2faUserId] = useState(null);
  const [timer, setTimer] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isNewUser, setIsNewUser] = useState(false);

  const otpRefs = useRef([]);
  const isSubmittingRef = useRef(false);

  const resetState = useCallback(() => {
    setStep('identifier');
    setEmail('');
    setOtp(['', '', '', '', '', '']);
    setTimer(0);
    setError(false);
    setErrorMsg('');
    setTotpCode('');
    setPending2faUserId(null);
    setIsNewUser(false);
  }, []);

  const sendOTP = async (e) => {
    e?.preventDefault();
    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    if (isSubmittingRef.current || isLoading) return;

    isSubmittingRef.current = true;
    setIsLoading(true);

    try {
      await authService.sendOTP(email);
      toast.success('Verification code sent to your email!');
      setStep('otp');
      setTimer(60);
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

  const verifyOTP = useCallback(
    async (otpString) => {
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
          const user = response.data.user;
          const isNewlyCreated =
            user?.createdAt && Date.now() - new Date(user.createdAt).getTime() < 120000;
          setIsNewUser(!!response.data.isNewUser || !!isNewlyCreated);
          setStep('success');
          setTimeout(async () => {
            await loginSuccess(
              user,
              response.data.accessToken || response.data.token,
              response.data.refreshToken,
            );
          }, 1800);
        }
      } catch (err) {
        setError(true);
        const msg = err.response?.data?.message || 'Invalid or expired code';
        setErrorMsg(msg);
        toast.error(msg);
        setOtp(['', '', '', '', '', '']);
        setTimeout(() => {
          setError(false);
          setErrorMsg('');
          if (otpRefs.current[0]) otpRefs.current[0].focus();
        }, 600);
      } finally {
        isSubmittingRef.current = false;
        setIsLoading(false);
      }
    },
    [isLoading, email, loginSuccess],
  );

  const verify2FA = async (code) => {
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

  const handleGoogleSuccess = useCallback(
    async (credentialResponse) => {
      if (isSubmittingRef.current || googleLoading) return;
      isSubmittingRef.current = true;
      setGoogleLoading(true);
      try {
        const response = await authService.googleAuth(credentialResponse.credential);
        if (response.success && response.data?.requires2FA) {
          setPending2faUserId(response.data.userId);
          setTotpCode('');
          setStep('2fa');
          return;
        }
        if (response.success) {
          const user = response.data.user;
          const isNewlyCreated =
            user?.createdAt && Date.now() - new Date(user.createdAt).getTime() < 120000;
          setIsNewUser(!!response.data.isNewUser || !!isNewlyCreated);
          setStep('success');
          setTimeout(async () => {
            await loginSuccess(
              user,
              response.data.accessToken || response.data.token,
              response.data.refreshToken,
            );
          }, 1800);
        }
      } catch (err) {
        const msg = err.response?.data?.message || 'Google sign-in failed. Please try again.';
        toast.error(msg);
      } finally {
        isSubmittingRef.current = false;
        setGoogleLoading(false);
      }
    },
    [googleLoading, loginSuccess],
  );

  const handleGoogleError = useCallback((errorMsg) => {
    if (errorMsg && !errorMsg.includes('dismissed') && !errorMsg.includes('skipped')) {
      toast.error('Google sign-in could not be started. Please try OTP login.');
    }
  }, []);

  // Auto-submit OTP
  useEffect(() => {
    const otpString = otp.join('');
    if (otpString.length === 6 && step === 'otp' && isAuthModalOpen) {
      const timer = setTimeout(() => {
        verifyOTP(otpString);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [otp, step, isAuthModalOpen, verifyOTP]);

  // Timer
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

  // WebOTP API
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

      return () => ac.abort();
    }
  }, [step, isAuthModalOpen]);

  const handleOtpChange = (value, index) => {
    if (!value) {
      const newOtp = [...otp];
      newOtp[index] = '';
      setOtp(newOtp);
      return;
    }

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

  return {
    step,
    setStep,
    email,
    setEmail,
    otp,
    totpCode,
    setTotpCode,
    timer,
    isLoading,
    error,
    setError,
    errorMsg,
    otpRefs,
    sendOTP,
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
  };
}
