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
          <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant/30 text-[16px] group-focus-within:text-primary transition-colors">
            mail
          </span>

          <label
            htmlFor="auth-email-input"
            className={`absolute transition-all duration-300 pointer-events-none font-bold ${
              isFocused || email
                ? 'text-[9px] -top-2 left-4 bg-[#faf9f6] px-1.5 text-primary tracking-[0.2em] uppercase z-10'
                : 'text-[12px] top-1/2 -translate-y-1/2 left-10 text-on-surface-variant/40 tracking-[0.15em] uppercase'
            }`}
          >
            Email Address
          </label>

          <input
            id="auth-email-input"
            type="email"
            required
            className="form-field !pl-11 !text-[12px]"
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
        className="form-field !text-center !font-display !text-[20px] !tracking-[0.3em] !font-bold !py-3"
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
            className={`w-8 h-11 xs:w-9 xs:h-12 text-center font-display text-[16px] xs:text-[18px] bg-transparent border-b-2 outline-none transition-all ${
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

export function AuthSuccessScreen({ MandalaElement }) {
  return (
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
          <span className="material-symbols-outlined text-[36px] font-bold">check</span>
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
  );
}
