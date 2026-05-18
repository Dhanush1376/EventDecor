import React from "react";
import { motion } from "framer-motion";
import { Button } from "./Button";

export function EmptyState({
  title = "Nothing found",
  description = "We couldn't find what you were looking for.",
  icon = "search_off",
  actionLabel,
  onAction,
}) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col items-center text-center py-24 px-6 max-w-lg mx-auto"
    >
      <div className="relative mb-8">
        <div className="w-24 h-24 rounded-full bg-surface-container border border-outline-variant/10 flex items-center justify-center text-on-surface-variant/40 shadow-sm transition-transform duration-500 hover:scale-105">
          <span className="material-symbols-outlined text-[42px] font-light">{icon}</span>
        </div>
        <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-primary/5 rounded-full blur-xl animate-pulse" />
      </div>
      <h3 className="font-headline-sm text-on-surface mb-3 tracking-tight font-semibold text-[20px] md:text-[24px]">
        {title}
      </h3>
      <p className="font-body-md text-on-surface-variant/60 mb-10 leading-relaxed text-[13px] md:text-[14px] max-w-sm">
        {description}
      </p>
      {actionLabel && (
        <Button variant="outline" onClick={onAction} className="px-10 rounded-full font-label text-[11px] uppercase tracking-widest font-bold">
          {actionLabel}
        </Button>
      )}
    </motion.div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  description = "We're having trouble loading this right now. Please try again later.",
  onRetry,
}) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col items-center text-center py-24 px-6 max-w-lg mx-auto"
    >
      <div className="relative mb-8">
        <div className="w-24 h-24 rounded-full bg-rose-50/50 border border-rose-100/50 flex items-center justify-center text-rose-500/80 shadow-sm transition-transform duration-500 hover:scale-105">
          <span className="material-symbols-outlined text-[42px] font-light">
            error_outline
          </span>
        </div>
        <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-rose-500/10 rounded-full blur-xl animate-pulse" />
      </div>
      <h3 className="font-headline-sm text-on-surface mb-3 tracking-tight font-semibold text-[20px] md:text-[24px]">
        {title}
      </h3>
      <p className="font-body-md text-on-surface-variant/60 mb-10 leading-relaxed text-[13px] md:text-[14px] max-w-sm">
        {description}
      </p>
      {onRetry && (
        <Button variant="primary" onClick={onRetry} className="px-10 rounded-full font-label text-[11px] uppercase tracking-widest font-bold">
          Try Again
        </Button>
      )}
    </motion.div>
  );
}

