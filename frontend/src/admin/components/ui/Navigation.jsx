import React from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';

export function PeriodSelector({
  periods = ['all-time', 'today', 'weekly', 'monthly', 'yearly'],
  value,
  onChange,
}) {
  return (
    <div className="flex w-full sm:w-auto overflow-x-auto no-scrollbar bg-[var(--admin-surface-muted)] rounded-md p-0.5 border border-[var(--admin-border-subtle)] shrink-0">
      {periods.map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={`flex-1 sm:flex-none px-3 py-1.5 rounded-sm text-[11px] font-bold capitalize cursor-pointer transition-all whitespace-nowrap ${
            value === p
              ? 'bg-[var(--admin-surface)] text-[var(--admin-text-primary)] shadow-sm border border-[var(--admin-border-subtle)]'
              : 'text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)] border border-transparent hover:bg-[var(--admin-surface)]/50'
          }`}
        >
          {p.replace('-', ' ')}
        </button>
      ))}
    </div>
  );
}

export function FilterBar({ filters, value, onChange, counts, className = '' }) {
  return (
    <div
      className={`flex items-center gap-1 p-1 bg-[var(--admin-surface-muted)] rounded-[4px] border border-[var(--admin-border)] overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] w-full sm:w-auto ${className}`}
    >
      {filters.map((f) => (
        <button
          key={f}
          type="button"
          onClick={() => onChange(f)}
          className={`flex-1 sm:flex-none px-4 py-1.5 rounded-sm text-[13px] font-bold transition-all whitespace-nowrap ${
            value === f
              ? 'bg-white text-[var(--admin-accent)] shadow-sm border border-[var(--admin-border-subtle)]'
              : 'text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] border border-transparent'
          }`}
        >
          {f}
          {counts?.[f] !== undefined && (
            <span
              className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                value === f
                  ? 'bg-[var(--admin-accent-muted)] text-[var(--admin-accent)]'
                  : 'bg-[var(--admin-border-subtle)] text-[var(--admin-text-tertiary)]'
              }`}
            >
              {counts[f]}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

export function MobileFilterDrawer({ isOpen, onClose, title = 'Filters', children }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[1000] md:hidden"
            style={{ background: 'var(--admin-surface-overlay)', backdropFilter: 'blur(4px)' }}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="fixed bottom-0 left-0 right-0 z-[1010] bg-[var(--admin-surface)] rounded-t-[var(--admin-radius-2xl)] shadow-2xl flex flex-col max-h-[85vh] md:hidden border-t border-[var(--admin-border)] overflow-hidden"
          >
            <div className="w-full flex justify-center pt-3 pb-1 shrink-0" onClick={onClose}>
              <div className="w-12 h-1.5 rounded-full bg-[var(--admin-border-strong)]" />
            </div>
            <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--admin-border-subtle)] shrink-0">
              <h3 className="text-[16px] font-bold text-[var(--admin-text-primary)]">{title}</h3>
              <button onClick={onClose} className="admin-btn-icon w-8 h-8 p-0">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 pb-6 flex flex-col gap-5">{children}</div>
            <div className="p-4 border-t border-[var(--admin-border-subtle)] bg-[var(--admin-surface-muted)] shrink-0">
              <button onClick={onClose} className="admin-btn admin-btn-primary w-full h-[44px]">
                Show Results
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
