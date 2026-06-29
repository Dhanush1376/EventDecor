import React from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';

export function FrontendPreview({ label, children, className = '' }) {
  return (
    <div className={`admin-card-flush ${className}`}>
      <div className="bg-[var(--admin-bg-subtle)] px-4 py-2.5 flex items-center gap-2 border-b border-[var(--admin-border)]">
        <div className="flex gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[var(--admin-border-strong)]" />
          <span className="w-2 h-2 rounded-full bg-[var(--admin-border-strong)]" />
          <span className="w-2 h-2 rounded-full bg-[var(--admin-border-strong)]" />
        </div>
        <span className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider ml-2">
          {label || 'Frontend Preview'}
        </span>
        <span className="material-symbols-outlined text-[13px] text-[var(--admin-text-tertiary)] ml-auto block">
          visibility
        </span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

export function PublishBar({ hasChanges, onPublish, onReset, _lastSaved }) {
  return null;
}

export function PublishToast({ message }) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ y: -40, x: '-50%', opacity: 0, scale: 0.95 }}
          animate={{ y: 0, x: '-50%', opacity: 1, scale: 1 }}
          exit={{ y: -40, x: '-50%', opacity: 0, scale: 0.95 }}
          className="fixed top-20 left-1/2 z-[200] bg-[var(--admin-success)] text-white border border-[var(--admin-success-border)] px-5 py-2.5 rounded-[var(--admin-radius-xl)] shadow-[var(--admin-shadow-lg)] flex items-center gap-2 text-[12px] font-semibold"
        >
          <span className="material-symbols-outlined text-[15px]">check_circle</span>
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
