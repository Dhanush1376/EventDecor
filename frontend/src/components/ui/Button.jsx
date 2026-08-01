import { CheckCircle2 } from 'lucide-react';
import { m as motion } from 'framer-motion';
import { Skeleton } from './Skeleton';
import React from 'react';
import { EASE } from '../../constants/design-tokens';

/**
 * Premium button component — unified across the entire design system.
 *
 * Variants: primary | outline | gold | ghost | minimal
 * Sizes: sm | md | lg
 * Features: loading state, icon support, shine effect, link rendering via `as` prop
 */
export const Button = React.memo(function Button({
  children,
  variant = 'primary',
  className = '',
  icon,
  fullWidth = false,
  size = 'md',
  loading = false,
  success = false,
  disabled = false,
  loadingText,
  successText,
  onClick,
  type = 'button',
  as: Component,
  ...props
}) {
  const [isDebouncing, setIsDebouncing] = React.useState(false);

  React.useEffect(() => {
    if (loading || success) {
      setIsDebouncing(false);
    }
  }, [loading, success]);

  const handleClick = (e) => {
    if (disabled || loading || success || isDebouncing) {
      e.preventDefault();
      return;
    }
    if (onClick) {
      setIsDebouncing(true);
      onClick(e);
      setTimeout(() => setIsDebouncing(false), 500);
    }
  };
  const baseClasses = 'btn-base relative overflow-hidden group';

  const variants = {
    primary: 'btn-primary',
    outline: 'btn-outline',
    gold: 'btn-gold',
    ghost: 'bg-transparent text-secondary uppercase tracking-[0.2em] hover:text-primary',
    minimal: 'btn-minimal',
    destructive: 'bg-error text-onError hover:bg-error/90 shadow-error/10 font-bold',
  };

  const sizes = {
    sm: '!px-5 !py-2.5 !text-[10px]',
    md: '',
    lg: '!px-14 !py-5 !text-[13px]',
  };

  const widthClass = fullWidth ? 'w-full' : '';
  const disabledClass =
    disabled || loading || success ? 'opacity-70 cursor-not-allowed pointer-events-none' : '';

  const buttonContent = (
    <>
      {loading ? (
        <div className="flex items-center justify-center gap-2 relative z-10 w-full h-full">
          <Skeleton className="h-4 w-4 !bg-current/40 !border-transparent !rounded-full shrink-0" />
          {loadingText ? (
            <span className="truncate">{loadingText}</span>
          ) : (
            <Skeleton className="h-4 w-12 !bg-current/20 !border-transparent !rounded-full shrink-0" />
          )}
        </div>
      ) : success ? (
        <div className="flex items-center justify-center gap-2 relative z-10 w-full h-full text-green-600 dark:text-green-500">
          <CheckCircle2 className="text-[18px]" strokeWidth={1.5} />
          {successText && <span className="truncate">{successText}</span>}
        </div>
      ) : (
        <div className="flex items-center justify-center gap-2 relative z-10 w-full h-full">
          <span className="relative z-10">{children}</span>
          {icon && (
            <span className="material-symbols-outlined text-[18px] font-light relative z-10 group-hover:translate-x-0.5 transition-transform">
              {icon}
            </span>
          )}
        </div>
      )}

      {/* Shine effect on hover */}
      {!(disabled || loading || success) && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />
      )}
    </>
  );

  // Support rendering as a Link or other component
  if (Component) {
    return (
      <Component
        className={`${baseClasses} ${variants[variant] || variants.primary} ${sizes[size]} ${widthClass} ${disabledClass} ${className}`}
        onClick={handleClick}
        {...props}
      >
        {buttonContent}
      </Component>
    );
  }

  return (
    <motion.button
      type={type}
      whileHover={{ scale: disabled || loading || success ? 1 : 1.02 }}
      whileTap={{ scale: disabled || loading || success ? 1 : 0.97 }}
      transition={{ duration: 0.15, ease: EASE.smooth }}
      className={`${baseClasses} ${variants[variant] || variants.primary} ${sizes[size]} ${widthClass} ${disabledClass} ${className}`}
      disabled={disabled || loading || success || isDebouncing}
      onClick={handleClick}
      {...props}
    >
      {buttonContent}
    </motion.button>
  );
});
