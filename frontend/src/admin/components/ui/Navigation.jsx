import React from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';

export function PeriodSelector({ periods = ['weekly', 'monthly', 'yearly'], value, onChange }) {
  return (
    <div className="flex w-full sm:w-auto bg-[var(--admin-surface-muted)] rounded-[var(--admin-radius-lg)] p-0.5 border border-[var(--admin-border-subtle)]">
      {periods.map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={`flex-1 text-center px-3 py-1.5 rounded-[var(--admin-radius-md)] text-[11px] font-semibold capitalize cursor-pointer transition-all min-h-0 whitespace-nowrap ${
            value === p
              ? 'bg-[var(--admin-surface)] text-[var(--admin-text-primary)] shadow-[var(--admin-shadow-xs)] border border-[var(--admin-border-subtle)]'
              : 'text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)]'
          }`}
        >
          {p}
        </button>
      ))}
    </div>
  );
}

export function FilterBar({ filters, value, onChange, counts, className = '' }) {
  return (
    <div
      className={`flex gap-2 overflow-x-auto pb-1 scrollbar-hide scroll-smooth admin-filter-bar ${className}`}
    >
      {filters.map((f) => (
        <button
          key={f}
          onClick={() => onChange(f)}
          className={`admin-filter-pill min-h-0 ${value === f ? 'admin-filter-pill-active' : ''}`}
        >
          {f}
          {counts?.[f] !== undefined && (
            <span
              className={`ml-1 px-1.5 py-0 rounded text-[10px] font-bold ${
                value === f
                  ? 'bg-white/20 text-white'
                  : 'bg-[var(--admin-surface-muted)] text-[var(--admin-text-tertiary)]'
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
