import React from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';

export function DeleteConfirmModal({ isOpen, onClose, onConfirm, productTitle, isDeleting }) {
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
          className="relative w-full max-w-md bg-surface border border-outline-variant/30 rounded-3xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="p-6 pb-4 border-b border-outline-variant/20 flex items-center justify-between">
            <div className="flex items-center gap-3 text-error">
              <span className="material-symbols-outlined text-[24px]">delete</span>
              <h3 className="font-display text-[18px] font-medium text-on-surface">
                Move to Recycle Bin
              </h3>
            </div>
            <button
              onClick={onClose}
              disabled={isDeleting}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-variant text-on-surface-variant transition-colors disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            <p className="text-on-surface-variant text-[14px] leading-relaxed">
              Are you sure you want to move{' '}
              <strong className="text-on-surface font-semibold">{productTitle}</strong> to the
              recycle bin?
            </p>
            <div className="bg-error-container/20 border border-error/20 p-4 rounded-xl flex items-start gap-3 text-error">
              <span className="material-symbols-outlined text-[20px] shrink-0 mt-0.5">info</span>
              <div className="text-[13px] leading-relaxed">
                <p>This product will be moved to the Recycle Bin and hidden from the storefront.</p>
                <p className="mt-1 font-medium">
                  You can restore it within 30 days or permanently delete it.
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 pt-4 bg-surface-variant/30 flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              disabled={isDeleting}
              className="px-5 py-2.5 rounded-full font-label-sm text-[11px] uppercase tracking-widest font-bold text-on-surface hover:bg-surface-variant transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isDeleting}
              className="px-6 py-2.5 rounded-full bg-error text-onError font-label-sm text-[11px] uppercase tracking-widest font-bold shadow-md shadow-error/20 hover:bg-error/90 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDeleting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-onError/30 border-t-onError rounded-full animate-spin" />
                  <span>Moving...</span>
                </>
              ) : (
                <>
                  <span>Move to Recycle Bin</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
