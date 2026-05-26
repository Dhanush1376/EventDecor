import React from "react";
import { motion } from "framer-motion";
import { EASE } from "../../constants/design-tokens";

/**
 * Premium button component — unified across the entire design system.
 *
 * Variants: primary | outline | gold | ghost | minimal
 * Sizes: sm | md | lg
 * Features: loading state, icon support, shine effect, link rendering via `as` prop
 */
export function Button({
  children,
  variant = "primary",
  className = "",
  icon,
  fullWidth = false,
  size = "md",
  loading = false,
  as: Component,
  ...props
}) {
  const baseClasses =
    "btn-base relative overflow-hidden group";

  const variants = {
    primary: "btn-primary",
    outline: "btn-outline",
    gold: "btn-gold",
    ghost: "bg-transparent text-secondary uppercase tracking-[0.2em] hover:text-primary",
    minimal: "btn-minimal",
  };

  const sizes = {
    sm: "!px-5 !py-2.5 !text-[10px]",
    md: "",
    lg: "!px-14 !py-5 !text-[13px]",
  };

  const widthClass = fullWidth ? "w-full" : "";
  const disabledClass = loading ? "opacity-70 pointer-events-none" : "";

  const buttonContent = (
    <>
      {/* Loading spinner */}
      {loading && (
        <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
      )}
      <span className="relative z-10">{!loading && children}</span>
      {!loading && icon && (
        <span className="material-symbols-outlined text-[18px] font-light relative z-10 group-hover:translate-x-0.5 transition-transform">
          {icon}
        </span>
      )}
      {/* Shine effect on hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />
    </>
  );

  // Support rendering as a Link or other component
  if (Component) {
    return (
      <Component
        className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${widthClass} ${disabledClass} ${className}`}
        {...props}
      >
        {buttonContent}
      </Component>
    );
  }

  return (
    <motion.button
      whileHover={{ scale: loading ? 1 : 1.02 }}
      whileTap={{ scale: loading ? 1 : 0.97 }}
      transition={{ duration: 0.15, ease: EASE.smooth }}
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${widthClass} ${disabledClass} ${className}`}
      disabled={loading}
      {...props}
    >
      {buttonContent}
    </motion.button>
  );
}
