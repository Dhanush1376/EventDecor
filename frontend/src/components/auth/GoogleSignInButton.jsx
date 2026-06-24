import { useEffect } from 'react';
import { m as motion } from 'framer-motion';

/**
 * Google "G" logo SVG — uses official Google brand colors.
 */
function GoogleIcon({ className = '' }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 48 48"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59A14.5 14.5 0 0 1 9.5 24c0-1.59.28-3.14.76-4.59l-7.98-6.19A23.998 23.998 0 0 0 0 24c0 3.77.9 7.35 2.56 10.53l7.97-5.94z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 5.94C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

/**
 * Custom-styled Google Sign-In button that matches the app's design system.
 * Renders a button with the Google "G" icon, loading spinner, and accessible labels.
 *
 * @param {Object} props
 * @param {Function} props.onClick - Click handler to trigger Google login
 * @param {boolean} props.isLoading - Show loading state
 * @param {boolean} [props.disabled] - Disable the button
 */
export function GoogleSignInButton({ onClick, isLoading, disabled = false, renderGoogleButton }) {
  const containerId = 'google-signin-overlay';

  useEffect(() => {
    if (renderGoogleButton && !disabled && !isLoading) {
      renderGoogleButton(containerId);
    }
  }, [renderGoogleButton, disabled, isLoading]);

  return (
    <div className="relative w-full h-12 overflow-hidden rounded-full">
      {/* Invisible overlay for official Google button iframe */}
      <div
        id={containerId}
        className="absolute inset-0 z-20 w-full h-full opacity-[0.01] flex items-center justify-center cursor-pointer"
        style={{ pointerEvents: disabled || isLoading ? 'none' : 'auto' }}
      />

      {/* Custom styled button underneath */}
      <motion.button
        type="button"
        onClick={onClick}
        disabled={disabled || isLoading}
        whileTap={{ scale: 0.98 }}
        className="w-full h-12 bg-white border border-outline-variant/40 text-on-surface-variant rounded-full flex items-center justify-center gap-3 font-label-sm text-[10px] uppercase tracking-widest font-bold hover:bg-surface-container-low/80 hover:border-outline-variant/60 hover:shadow-sm transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed group relative overflow-hidden shadow-xs"
        aria-label="Continue with Google"
      >
        {isLoading ? (
          <div className="flex items-center gap-2.5">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full"
            />
            <span className="text-on-surface-variant/60">Signing in…</span>
          </div>
        ) : (
          <>
            <GoogleIcon className="shrink-0" />
            <span>Continue with Google</span>
          </>
        )}
      </motion.button>
    </div>
  );
}
