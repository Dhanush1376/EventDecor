import { Mail, Check, Smartphone, AlertCircle } from 'lucide-react';
import React from 'react';
import toast from 'react-hot-toast';
import { m as motion } from 'framer-motion';
import { GoogleSignInButton } from './GoogleSignInButton';
import { useGoogleIdentity } from '../../hooks/useGoogleIdentity';
import { LoadingButton } from '../ui/LoadingButton';

export function UnifiedAuthForm({
  identifier,
  setIdentifier,
  requestOTP,
  isLoading,
  googleLoading,
  handleGoogleSuccess,
  handleGoogleError,
  customerAuthMethod = 'both',
}) {
  const {
    isReady: googleReady,
    triggerLogin,
    renderGoogleButton,
  } = useGoogleIdentity(handleGoogleSuccess, handleGoogleError);

  const cleanVal = (identifier || '').trim();
  const digitsOnly = cleanVal.replace(/\D/g, '');
  const hasLetters = /[a-zA-Z]/.test(cleanVal);
  const hasAt = cleanVal.includes('@');

  // Determine effective mode:
  let effectiveMode = 'both';
  if (customerAuthMethod === 'phone_only') {
    effectiveMode = 'phone';
  } else if (customerAuthMethod === 'email_only') {
    effectiveMode = 'email';
  } else {
    // Both allowed (combined in 1 input field):
    if (hasAt || (hasLetters && !cleanVal.startsWith('+'))) {
      effectiveMode = 'email';
    } else if (digitsOnly.length > 0) {
      effectiveMode = 'phone';
    } else {
      effectiveMode = 'both';
    }
  }

  const handleFormSubmit = (e) => {
    e.preventDefault();
    const val = (identifier || '').trim();
    if (!val) {
      toast.error('Please enter your mobile phone number or email address');
      return;
    }

    if (effectiveMode === 'phone' || customerAuthMethod === 'phone_only') {
      const digits = val.replace(/\D/g, '');
      let clean = digits;
      if (clean.startsWith('91') && clean.length === 12) clean = clean.slice(2);
      else if (clean.startsWith('0') && clean.length === 11) clean = clean.slice(1);

      if (clean.length !== 10) {
        toast.error('Please enter a valid 10-digit mobile phone number');
        return;
      }
      requestOTP(e, clean);
      return;
    }

    if (effectiveMode === 'email' || customerAuthMethod === 'email_only') {
      if (!val.includes('@') || !val.includes('.') || val.length < 5) {
        toast.error('Please enter a valid email address');
        return;
      }
      requestOTP(e, val.toLowerCase());
      return;
    }

    toast.error('Please enter a valid 10-digit mobile number or email address');
  };

  const showGoogleSignIn = customerAuthMethod !== 'phone_only';

  return (
    <div className="space-y-5">
      <form onSubmit={handleFormSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <label
            htmlFor="auth-identifier-input"
            className="flex items-center gap-1.5 text-[10px] font-bold text-on-surface-variant/70 tracking-[0.2em] uppercase"
          >
            {effectiveMode === 'phone' ? (
              <>
                <Smartphone className="w-3.5 h-3.5" strokeWidth={1.5} />
                Mobile Phone Number
              </>
            ) : effectiveMode === 'email' ? (
              <>
                <Mail className="w-3.5 h-3.5" strokeWidth={1.5} />
                Email Address
              </>
            ) : (
              <>
                <span className="flex items-center gap-1">
                  <Smartphone className="w-3 h-3 text-primary" strokeWidth={1.5} />
                  <span className="text-[9px] opacity-40">/</span>
                  <Mail className="w-3 h-3 text-primary" strokeWidth={1.5} />
                </span>
                Mobile Phone or Email
              </>
            )}
          </label>

          {customerAuthMethod === 'phone_only' ? (
            <div className="relative flex items-center">
              <div className="absolute left-4 flex items-center gap-1 pointer-events-none select-none text-[12px] font-semibold text-on-surface-variant/70">
                <span>🇮🇳</span>
                <span>+91</span>
                <span className="text-outline-variant/60 ml-1">|</span>
              </div>
              <input
                id="auth-identifier-input"
                type="tel"
                inputMode="numeric"
                required
                className="form-field text-[16px] sm:!text-[13px] !rounded-full !pl-18 !pr-5 font-medium tracking-wide"
                placeholder="98765 43210"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value.replace(/\D/g, '').slice(0, 10))}
                maxLength={10}
              />
            </div>
          ) : customerAuthMethod === 'email_only' ? (
            <div className="relative flex items-center">
              <div className="absolute left-4 flex items-center pointer-events-none select-none text-on-surface-variant/50">
                <Mail className="w-4 h-4" strokeWidth={1.5} />
              </div>
              <input
                id="auth-identifier-input"
                type="email"
                required
                className="form-field text-[16px] sm:!text-[13px] !rounded-full !pl-11 !pr-5 font-medium"
                placeholder="name@example.com"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value.trim())}
              />
            </div>
          ) : (
            /* Combined 1 Input: Single smart input field for both Phone and Email */
            <div className="relative flex items-center">
              {effectiveMode === 'phone' ? (
                <div className="absolute left-4 flex items-center gap-1 pointer-events-none select-none text-[12px] font-semibold text-on-surface-variant/70">
                  <span>🇮🇳</span>
                  <span>+91</span>
                  <span className="text-outline-variant/60 ml-1">|</span>
                </div>
              ) : effectiveMode === 'email' ? (
                <div className="absolute left-4 flex items-center pointer-events-none select-none text-on-surface-variant/50">
                  <Mail className="w-4 h-4" strokeWidth={1.5} />
                </div>
              ) : (
                <div className="absolute left-4 flex items-center gap-1 pointer-events-none select-none text-on-surface-variant/40">
                  <Smartphone className="w-3.5 h-3.5" strokeWidth={1.5} />
                  <span className="text-[10px] opacity-30">/</span>
                  <Mail className="w-3.5 h-3.5" strokeWidth={1.5} />
                </div>
              )}
              <input
                id="auth-identifier-input"
                type={effectiveMode === 'email' ? 'email' : 'text'}
                autoCapitalize="none"
                autoCorrect="off"
                required
                className={`form-field text-[16px] sm:!text-[13px] !rounded-full !pr-5 font-medium transition-all ${
                  effectiveMode === 'phone'
                    ? '!pl-18 tracking-wide'
                    : effectiveMode === 'email'
                      ? '!pl-11'
                      : '!pl-14'
                }`}
                placeholder={
                  effectiveMode === 'phone'
                    ? '98765 43210'
                    : effectiveMode === 'email'
                      ? 'name@example.com'
                      : '98765 43210 or name@example.com'
                }
                value={identifier}
                onChange={(e) => {
                  const raw = e.target.value;
                  const digits = raw.replace(/\D/g, '');
                  const hasAlpha = /[a-zA-Z@]/.test(raw);
                  if (!hasAlpha && digits.length > 0) {
                    let clean = digits;
                    if (clean.startsWith('91') && clean.length > 10) clean = clean.slice(2);
                    else if (clean.startsWith('0') && clean.length > 10) clean = clean.slice(1);
                    setIdentifier(clean.slice(0, 10));
                  } else {
                    setIdentifier(raw);
                  }
                }}
              />
            </div>
          )}
        </div>

        <LoadingButton
          type="submit"
          loading={isLoading}
          disabled={!identifier}
          fullWidth
          icon="arrow_forward"
        >
          {effectiveMode === 'phone'
            ? 'Send SMS Verification Code'
            : effectiveMode === 'email'
              ? 'Send Email Verification Code'
              : 'Send Verification Code'}
        </LoadingButton>
      </form>

      {/* ── Optional Google Sign-In (when email is permitted) ── */}
      {showGoogleSignIn && (
        <>
          <div className="flex items-center gap-4 py-1">
            <div className="flex-1 h-px bg-outline-variant/30" />
            <span className="font-label-sm text-[9px] text-on-surface-variant/40 uppercase tracking-[0.25em] font-bold select-none">
              or
            </span>
            <div className="flex-1 h-px bg-outline-variant/30" />
          </div>

          <GoogleSignInButton
            onClick={triggerLogin}
            isLoading={googleLoading}
            disabled={!googleReady}
            renderGoogleButton={googleReady ? renderGoogleButton : null}
          />
        </>
      )}
    </div>
  );
}

export function TwoFactorForm({ totpCode, setTotpCode, verify2FA, isLoading, resetState }) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (totpCode.length >= 6) verify2FA(totpCode);
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
        onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
        className="form-field !text-center !font-mono !text-[20px] !tracking-[0.3em] !font-bold !py-3 !rounded-full"
        placeholder="000000"
      />
      <LoadingButton
        type="submit"
        loading={isLoading}
        disabled={totpCode.length < 6}
        fullWidth
        loadingText="Verifying…"
      >
        Verify Authenticator
      </LoadingButton>
      <button
        type="button"
        onClick={resetState}
        className="w-full text-center font-label-sm text-[8px] text-primary uppercase tracking-[0.2em] font-bold hover:underline cursor-pointer"
      >
        Start over
      </button>
    </form>
  );
}

export function OtpVerificationForm({
  otp,
  handleVerifyOTP,
  handlePaste,
  handleOtpChange,
  handleKeyDown,
  otpRefs,
  error,
  errorMsg,
  isLoading,
  timer,
  sendOTP,
}) {
  return (
    <form onSubmit={handleVerifyOTP} className="space-y-5">
      <div
        className={`grid grid-cols-6 gap-1.5 xs:gap-2 sm:gap-2.5 w-full max-w-[340px] mx-auto transition-transform duration-300 ${error ? 'translate-x-1' : ''}`}
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
            className={`w-full aspect-[1/1.18] min-w-0 max-w-[46px] mx-auto text-center font-mono text-[18px] xs:text-[20px] rounded-xl outline-none transition-all duration-200 shadow-sm focus:shadow-md ${
              error
                ? 'border-2 border-error text-error bg-error/5'
                : digit
                  ? 'border-2 border-primary text-primary font-bold bg-primary/5 ring-1 ring-primary/20'
                  : 'border border-outline-variant/40 text-on-surface-variant bg-surface focus:border-primary focus:ring-2 focus:ring-primary/15'
            }`}
          />
        ))}
      </div>

      {/* Aria-live inline error message */}
      <div aria-live="polite" className="h-4 text-center">
        {errorMsg && (
          <span className="text-error text-[11px] font-bold tracking-wide">{errorMsg}</span>
        )}
      </div>

      <div className="space-y-4 pt-1">
        <LoadingButton
          type="submit"
          loading={isLoading}
          disabled={otp.join('').length < 6}
          fullWidth
        >
          Verify and Login
        </LoadingButton>

        <div className="text-center">
          {timer > 0 ? (
            <span className="font-label-sm text-[9px] text-on-surface-variant/40 uppercase tracking-[0.2em] font-semibold block">
              Resend Code in {timer}s
            </span>
          ) : (
            <button
              type="button"
              onClick={sendOTP}
              className="font-label-sm text-[9px] text-primary uppercase tracking-[0.25em] font-bold hover:underline cursor-pointer"
            >
              Resend Code
            </button>
          )}
        </div>
      </div>
    </form>
  );
}

export function AuthSuccessScreen({ MandalaElement, isNewUser }) {
  return (
    <motion.div
      key="success-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="text-center py-12 relative flex flex-col items-center justify-center min-h-[260px] overflow-hidden"
    >
      {/* Background Mandala */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0">
        <MandalaElement
          size={320}
          duration={80}
          variant={2}
          opacity={0.07}
          className="text-primary"
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 flex flex-col items-center w-full"
      >
        {/* Success Tick Animation */}
        <motion.div
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 15, delay: 0.2 }}
          className="mb-6 relative flex items-center justify-center w-20 h-20 rounded-full bg-green-500/10"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', damping: 12, delay: 0.4 }}
            className="flex items-center justify-center w-14 h-14 rounded-full bg-green-500 shadow-[0_4px_12px_rgba(34,197,94,0.3)]"
          >
            <Check className="text-white text-[32px] font-bold" strokeWidth={1.5} />
          </motion.div>
        </motion.div>

        <div className="space-y-3">
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="font-label text-[10px] text-on-surface-variant/50 uppercase tracking-[0.3em] font-semibold block"
          >
            Verification Complete
          </motion.span>

          <motion.h2
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="font-display text-[24px] sm:text-[28px] leading-tight text-on-surface font-normal tracking-wide"
          >
            {isNewUser ? 'Welcome' : 'Welcome Back'}
          </motion.h2>
        </div>

        {/* Elegant divider */}
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 40, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.5, ease: 'easeOut' }}
          className="h-px bg-primary/40 mt-8"
        />
      </motion.div>
    </motion.div>
  );
}

export function LinkRequiredScreen({ setStep }) {
  return (
    <div className="space-y-6 text-center">
      <div className="flex justify-center mb-2">
        <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
          <AlertCircle className="text-orange-500" size={24} />
        </div>
      </div>

      <h3 className="font-display text-[20px] text-on-surface">Sign-in Method Unavailable</h3>

      <p className="text-[13px] text-on-surface-variant/70 leading-relaxed px-2">
        This Google account can't be used to sign in directly.
        <br />
        <br />
        If you have an existing account, sign in with your original method and connect Google from
        Login & Security.
      </p>

      <div className="space-y-3 pt-4">
        <button
          onClick={() => {
            setStep('identifier');
          }}
          className="w-full py-3 rounded-lg border border-outline-variant/30 font-bold text-[12px] text-on-surface hover:bg-surface-variant/30 transition-colors cursor-pointer"
        >
          Sign in with Email or Phone
        </button>
      </div>
    </div>
  );
}

export function NamePromptForm({ name, setName, onSubmit, onSkip, isLoading }) {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-2">
        <label
          htmlFor="auth-name-input"
          className="flex items-center gap-1.5 text-[10px] font-bold text-on-surface-variant/70 tracking-[0.2em] uppercase"
        >
          Your Name
        </label>
        <input
          id="auth-name-input"
          type="text"
          autoFocus
          className="form-field text-[16px] sm:!text-[13px] !rounded-full !px-5"
          placeholder="e.g. Priya Sharma"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <p className="text-[11px] text-on-surface-variant/50 font-light pl-1">
          Help us personalize your experience and order delivery.
        </p>
      </div>

      <div className="space-y-3 pt-2">
        <LoadingButton
          type="submit"
          loading={isLoading}
          disabled={!name || !name.trim()}
          fullWidth
          icon="arrow_forward"
        >
          Continue
        </LoadingButton>
        <button
          type="button"
          onClick={onSkip}
          className="w-full text-center font-label-sm text-[11px] text-on-surface-variant/60 hover:text-on-surface uppercase tracking-[0.18em] font-bold py-2 transition-colors cursor-pointer"
        >
          Skip for now
        </button>
      </div>
    </form>
  );
}
