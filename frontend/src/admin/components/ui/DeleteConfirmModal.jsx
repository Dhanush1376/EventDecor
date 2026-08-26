import React from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';

export function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  productTitle,
  isDeleting,
  title = 'Move to Recycle Bin',
  message = 'This item will be moved to the Recycle Bin and hidden from the storefront. You can restore it within 30 days or permanently delete it.',
  confirmText = 'Move to Recycle Bin',
}) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={!isDeleting ? onClose : undefined}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-[var(--admin-radius-xl)] shadow-[var(--admin-shadow-2xl)] overflow-hidden"
        >
          {/* Header */}
          <div className="p-5 pb-4 border-b border-[var(--admin-border-subtle)] flex items-center justify-between bg-[var(--admin-bg-subtle)]">
            <div className="flex items-center gap-2 text-[var(--admin-error)]">
              <span className="material-symbols-outlined text-[20px]">delete</span>
              <h3 className="text-[16px] font-bold text-[var(--admin-text-primary)]">{title}</h3>
            </div>
            <button
              onClick={onClose}
              disabled={isDeleting}
              className="admin-btn-icon text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)] disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            <p className="text-[var(--admin-text-secondary)] text-[14px] leading-relaxed">
              Are you sure you want to move{' '}
              <strong className="text-[var(--admin-text-primary)] font-bold">
                {productTitle || 'this item'}
              </strong>{' '}
              to the recycle bin?
            </p>

            {message && (
              <div className="bg-[var(--admin-error-light)] border border-[var(--admin-error)]/20 p-4 rounded-[var(--admin-radius-md)] flex items-start gap-3 text-[var(--admin-error)]">
                <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">info</span>
                <div className="text-[12px] leading-relaxed font-medium">{message}</div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-5 border-t border-[var(--admin-border-subtle)] bg-[var(--admin-bg-subtle)] flex items-center justify-end gap-3">
            <button onClick={onClose} disabled={isDeleting} className="admin-btn admin-btn-outline">
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isDeleting}
              className="admin-btn bg-[var(--admin-error)] text-white hover:bg-[var(--admin-error)]/90 border-transparent shadow-sm flex items-center gap-2"
            >
              {isDeleting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Moving...</span>
                </>
              ) : (
                <>
                  <span>{confirmText}</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
