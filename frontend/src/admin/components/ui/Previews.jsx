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
  return (
    <AnimatePresence>
      {hasChanges && (
        <motion.div
          initial={{ y: 80, x: '-50%', opacity: 0 }}
          animate={{ y: 0, x: '-50%', opacity: 1 }}
          exit={{ y: 80, x: '-50%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 280 }}
          className="admin-floating-bar max-w-[95vw]"
        >
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--admin-accent)] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--admin-accent)]" />
            </span>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--admin-accent)] opacity-90">
                CMS Sandbox
              </span>
              <span className="text-[9px] text-[var(--admin-text-tertiary)] font-normal">
                Unpublished changes
              </span>
            </div>
          </div>

          <div className="h-5 w-px bg-white/10" />

          <div className="flex items-center gap-2">
            <button
              onClick={onReset}
              className="px-3 py-1.5 rounded-[var(--admin-radius-md)] text-[11px] font-medium text-[var(--admin-text-tertiary)] hover:text-white hover:bg-white/5 transition-all min-h-0 active:scale-95"
            >
              Discard
            </button>
            <button
              onClick={onPublish}
              className="px-4 py-2 rounded-[var(--admin-radius-md)] text-[11px] font-semibold bg-[var(--admin-accent)] hover:bg-[var(--admin-accent-hover)] text-white shadow-sm transition-all flex items-center gap-1.5 uppercase tracking-wider min-h-0"
            >
              <span className="material-symbols-outlined text-[13px] font-bold">publish</span>
              Publish Live
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
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
