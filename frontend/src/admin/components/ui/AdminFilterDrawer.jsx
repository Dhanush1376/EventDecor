import React from 'react';
import { createPortal } from 'react-dom';
import { m as motion, AnimatePresence } from 'framer-motion';

/**
 * AdminFilterDrawer
 * Responsive filter container for Admin pages:
 * - Desktop (>= 640px): Anchored dropdown popover positioned under the filter button
 * - Mobile (< 640px): Full App Drawer (bottom sheet) portaled to document.body with touch handle,
 *   scrolling container, backdrop, and sticky Clear / Apply footer buttons.
 */
import { useMobileDrawerEngine } from '../../../hooks/useMobileDrawerEngine';
import { DrawerDragHandle } from '../../../components/ui/drawer/DrawerDragHandle';

export function AdminFilterDrawer({
  isOpen,
  onClose,
  title = 'Filters',
  icon = 'tune',
  activeCount = 0,
  onClearAll,
  clearAllLabel = 'Clear All',
  onApply,
  applyLabel = 'Apply Filters',
  children,
  widthClass = 'w-[320px] sm:w-[340px]',
  footer,
  subtitle,
}) {
  const { isMobile, dragProps, sheetTransition } = useMobileDrawerEngine({
    isOpen,
    onClose,
  });

  const handleApply = () => {
    if (onApply) onApply();
    onClose();
  };

  const isDark =
    typeof document !== 'undefined' &&
    (document.documentElement.classList.contains('dark') ||
      document.body.classList.contains('dark') ||
      !!document.querySelector('.admin-section-root.dark'));

  // ─── MOBILE APP DRAWER (Rendered via portal to document.body) ───
  if (isMobile) {
    if (typeof document === 'undefined') return null;
    return createPortal(
      <AnimatePresence>
        {isOpen && (
          <div className={`admin-section-root ${isDark ? 'dark' : ''}`}>
            {/* Backdrop */}
            <motion.div
              key="admin-filter-drawer-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={onClose}
              className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-xs cursor-pointer"
            />

            {/* Bottom Sheet Drawer */}
            <motion.div
              key="admin-filter-drawer-sheet"
              {...dragProps}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={sheetTransition}
              className="fixed bottom-0 inset-x-0 z-[9999] bg-[var(--admin-surface)] rounded-t-[14px] shadow-[0_-8px_30px_rgba(0,0,0,0.3)] border-t border-[var(--admin-border-strong)] flex flex-col max-h-[85dvh] text-left overflow-hidden pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]"
            >
              {/* Drag / Pull Handle */}
              <DrawerDragHandle onClick={onClose} pillClassName="bg-[var(--admin-border-strong)]" />

              {/* Drawer Header */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--admin-border-subtle)] shrink-0">
                <div className="flex items-center gap-2">
                  {icon && (
                    <span className="material-symbols-outlined text-[18px] text-[var(--admin-accent)]">
                      {icon}
                    </span>
                  )}
                  <h3 className="text-[14px] font-bold text-[var(--admin-text-primary)]">
                    {title}
                  </h3>
                  {activeCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-[4px] bg-[var(--admin-accent)] text-white text-[10px] font-bold">
                      {activeCount} Active
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-7 h-7 rounded-[4px] flex items-center justify-center hover:bg-[var(--admin-bg-subtle)] text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] cursor-pointer transition-colors"
                  aria-label="Close filters"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>

              {/* Scrollable Content Body */}
              <div
                className="flex-1 overflow-y-auto px-4 py-3.5 space-y-4 touch-pan-y overscroll-contain"
                style={{ WebkitOverflowScrolling: 'touch' }}
              >
                {children}
              </div>

              {/* Sticky Action Footer */}
              {footer ? (
                footer
              ) : (
                <div className="p-3.5 border-t border-[var(--admin-border-subtle)] bg-[var(--admin-surface-muted)] flex gap-2.5 shrink-0">
                  {onClearAll && (
                    <button
                      type="button"
                      onClick={onClearAll}
                      className="admin-btn-outline flex-1 justify-center py-2.5 !rounded-[4px] text-[12.5px] font-semibold cursor-pointer"
                    >
                      {clearAllLabel}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleApply}
                    className="admin-btn-primary flex-1 justify-center py-2.5 !rounded-[4px] text-[12.5px] font-semibold cursor-pointer"
                  >
                    {applyLabel}
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>,
      document.body,
    );
  }

  // ─── DESKTOP POPOVER (Anchored under filter button) ───
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Desktop backdrop click dismiss */}
          <div onClick={onClose} className="fixed inset-0 z-[60]" />

          {/* Desktop Floating Menu */}
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className={`absolute top-full right-0 mt-2 z-[70] ${widthClass} bg-[var(--admin-surface)] rounded-[6px] shadow-2xl border border-[var(--admin-border-strong)] flex flex-col p-4 text-left`}
          >
            <div className="flex justify-between items-center mb-3">
              <div>
                <h3 className="text-[13.5px] font-bold text-[var(--admin-text-primary)] flex items-center gap-2">
                  {icon && <span className="material-symbols-outlined text-[18px]">{icon}</span>}
                  {title}
                </h3>
                {subtitle && (
                  <p className="text-[11px] text-[var(--admin-text-tertiary)] mt-0.5">{subtitle}</p>
                )}
              </div>
              {activeCount > 0 && (
                <span className="px-1.5 py-0.5 rounded bg-[var(--admin-accent)]/15 text-[var(--admin-accent)] text-[10px] font-bold">
                  {activeCount} active
                </span>
              )}
            </div>

            <div className="max-h-[60vh] overflow-y-auto scrollbar-hide pr-0.5 space-y-4">
              {children}
            </div>

            {footer ? (
              footer
            ) : (
              <div className="mt-4 pt-3 border-t border-[var(--admin-border-subtle)] flex gap-2">
                {onClearAll && (
                  <button
                    type="button"
                    onClick={onClearAll}
                    className="admin-btn-outline flex-1 justify-center py-2 !rounded-[4px] text-[12px] font-semibold cursor-pointer"
                  >
                    {clearAllLabel}
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleApply}
                  className="admin-btn-primary flex-1 justify-center py-2 !rounded-[4px] text-[12px] font-semibold cursor-pointer"
                >
                  {applyLabel}
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
