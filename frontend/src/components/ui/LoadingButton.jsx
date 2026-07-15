import React, { useState, useEffect } from 'react';

export function LoadingButton({
  loading,
  disabled,
  children,
  loadingText,
  variant = 'primary',
  size = 'md',
  className = '',
  type = 'button',
  onClick,
  fullWidth = false,
  icon,
  ...props
}) {
  const [isDebouncing, setIsDebouncing] = useState(false);

  // Reset debouncing if loading becomes true (meaning the click was successfully handled)
  useEffect(() => {
    if (loading) {
      setIsDebouncing(false);
    }
  }, [loading]);

  const handleClick = (e) => {
    if (disabled || loading || isDebouncing) {
      e.preventDefault();
      return;
    }

    if (onClick) {
      // Basic double-click prevention
      setIsDebouncing(true);
      onClick(e);
      // Reset debounce after a short delay in case onClick didn't trigger a loading state
      setTimeout(() => setIsDebouncing(false), 500);
    }
  };

  const baseClasses =
    'relative flex items-center justify-center gap-2.5 transition-all duration-300 group overflow-hidden shadow-md cursor-pointer';

  const sizeClasses = {
    sm: 'h-10 px-4 font-label-sm text-[9px] uppercase tracking-widest font-bold rounded-full',
    md: 'h-12 px-6 font-label-sm text-[10px] uppercase tracking-widest font-bold rounded-full',
    lg: 'h-14 px-8 font-label-md text-[12px] uppercase tracking-widest font-bold rounded-full',
  };

  const variantClasses = {
    primary:
      'bg-primary text-surface hover:bg-on-surface-variant hover:text-surface shadow-primary/10',
    destructive: 'bg-error text-onError hover:bg-error/90 shadow-error/10',
    outline:
      'border border-outline-variant text-on-surface hover:bg-surface-variant/50 shadow-none',
    ghost: 'bg-transparent text-on-surface hover:bg-surface-variant/50 shadow-none',
  };

  const isDisabled = disabled || loading || isDebouncing;

  return (
    <button
      type={type}
      disabled={isDisabled}
      onClick={handleClick}
      className={`
        ${baseClasses}
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        ${fullWidth ? 'w-full' : ''}
        ${isDisabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}
        ${className}
      `}
      aria-busy={loading}
      aria-disabled={isDisabled}
      {...props}
    >
      {loading ? (
        <div className="flex items-center gap-2">
          <div className="skeleton-box inline-block w-4 h-4 rounded-md" />
          {loadingText && <span>{loadingText}</span>}
        </div>
      ) : (
        <>
          {children}
          {icon && (
            <span className="material-symbols-outlined text-[14px] group-hover:translate-x-1 transition-transform">
              {icon}
            </span>
          )}
        </>
      )}
    </button>
  );
}
