import React from "react";
import { motion } from "framer-motion";

export function Button({
  children,
  variant = "primary",
  className = "",
  icon,
  fullWidth = false,
  size = "md",
  ...props
}) {
  const baseClasses =
    "font-label-md rounded-full inline-flex justify-center items-center gap-2 transition-all duration-300 relative overflow-hidden group";

  const variants = {
    primary:
      "bg-on-surface-variant text-surface uppercase tracking-[0.3em] shadow-lg shadow-on-surface-variant/10 hover:bg-primary-container hover:text-on-primary-container",
    outline:
      "bg-surface border border-outline-variant/50 text-on-surface uppercase tracking-[0.2em] hover:border-primary",
    ghost:
      "bg-transparent text-secondary uppercase tracking-[0.2em] hover:text-primary",
  };

  const sizes = {
    sm: "px-6 py-3 text-[10px]",
    md: "px-10 py-4 text-label-sm",
    lg: "px-14 py-5 text-label-md",
  };

  const widthClass = fullWidth ? "w-full md:w-auto" : "";

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${widthClass} ${className}`}
      {...props}
    >
      <span className="relative z-10">{children}</span>
      {icon && (
        <motion.span
          initial={{ x: 0 }}
          whileHover={{ x: 5 }}
          className="material-symbols-outlined text-[20px] font-light relative z-10"
        >
          {icon}
        </motion.span>
      )}

      {/* Shine effect on hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
    </motion.button>
  );
}
