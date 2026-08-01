import { Mail, Check } from 'lucide-react';
import React from 'react';
import { m as motion } from 'framer-motion';
import { GoogleSignInButton } from './GoogleSignInButton';
import { useGoogleIdentity } from '../../hooks/useGoogleIdentity';
import { LoadingButton } from '../ui/LoadingButton';

export function EmailInputForm({
  email,
  setEmail,
  sendOTP,
  isLoading,
  isFocused,
  setIsFocused,
  googleLoading,
  handleGoogleSuccess,
  handleGoogleError,
}) {
  const {
    isReady: googleReady,
    triggerLogin,
    renderGoogleButton,
  } = useGoogleIdentity(handleGoogleSuccess, handleGoogleError);

  return (
    <motion.div
      key="email-block"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-5"
    >
      {/* OTP Login Section */}
      <form onSubmit={sendOTP} className="space-y-5">
        <div className="relative group">
          <Mail
            className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/30 text-[16px] group-focus-within:text-primary transition-colors"
            strokeWidth={1.5}
          />

          <label
            htmlFor="auth-email-input"
            className={`absolute transition-all duration-300 pointer-events-none font-bold ${
              isFocused || email
                ? 'text-[9px] -top-2 left-4 bg-[#faf9f6] px-1.5 text-primary tracking-[0.2em] uppercase z-10'
                : 'text-[12px] top-1/2 -translate-y-1/2 left-12 text-on-surface-variant/40 tracking-[0.15em] uppercase'
            }`}
          >
            Email Address
          </label>

          <input
            id="auth-email-input"
            type="email"
            required
            className="form-field !pl-12 !text-[12px]"
            placeholder={isFocused ? 'e.g. creative@siriartsandcrafts.com' : ''}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          />
        </div>
        <LoadingButton
          type="submit"
          loading={isLoading}
          disabled={!email}
          fullWidth
          icon="arrow_forward"
        >
          Send Verification Code
        </LoadingButton>
      </form>

      {/* ── OR Divider ── */}
      <div className="flex items-center gap-4 py-1">
        <div className="flex-1 h-px bg-outline-variant/30" />
        <span className="font-label-sm text-[9px] text-on-surface-variant/40 uppercase tracking-[0.25em] font-bold select-none">
          or
        </span>
        <div className="flex-1 h-px bg-outline-variant/30" />
      </div>

      {/* ── Google Sign-In ── */}
      <GoogleSignInButton
        onClick={triggerLogin}
        isLoading={googleLoading}
        disabled={!googleReady}
        renderGoogleButton={googleReady ? renderGoogleButton : null}
      />
    </motion.div>
  );
}

export function TwoFactorForm({ totpCode, setTotpCode, verify2FA, isLoading, resetState }) {
  return (
    <motion.form
      key="2fa-block"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
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
        className="form-field !text-center !font-mono !text-[20px] !tracking-[0.3em] !font-bold !py-3"
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
    </motion.form>
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
            className={`w-8 h-11 xs:w-9 xs:h-12 text-center font-mono text-[16px] xs:text-[18px] bg-transparent border-b-2 outline-none transition-all ${
              error
                ? 'border-error text-error'
                : digit
                  ? 'border-primary text-primary font-semibold'
                  : 'border-outline-variant/30 text-on-surface-variant focus:border-primary'
            }`}
          />
        ))}
      </motion.div>

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
    </motion.form>
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
