import React, { useState, useEffect } from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';

export function PermanentDeleteModal({ isOpen, onClose, onConfirm, productTitle, isDeleting }) {
  const [confirmText, setConfirmText] = useState('');
  const [isMatch, setIsMatch] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setConfirmText('');
      setIsMatch(false);
    }
  }, [isOpen]);

  useEffect(() => {
    setIsMatch(confirmText === productTitle);
  }, [confirmText, productTitle]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/70 backdrop-blur-md"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-lg bg-surface border border-error/30 rounded-3xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="p-6 pb-4 border-b border-error/10 bg-error/5 flex items-center justify-between">
            <div className="flex items-center gap-3 text-error">
              <span className="material-symbols-outlined text-[24px]">warning</span>
              <h3 className="font-display text-[18px] font-medium text-error">
                Permanent Deletion
              </h3>
            </div>
            <button
              onClick={onClose}
              disabled={isDeleting}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-error/10 text-error/70 transition-colors disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            <div className="space-y-2">
              <h4 className="font-medium text-on-surface text-[15px]">
                This action cannot be undone.
              </h4>
              <p className="text-on-surface-variant text-[14px] leading-relaxed">
                You are about to permanently delete{' '}
                <strong className="text-on-surface">{productTitle}</strong>. This will permanently
                remove the product and all associated data from the system.
              </p>
            </div>

            <div className="bg-error-container/10 border border-error/20 p-4 rounded-xl space-y-3">
              <h5 className="font-medium text-error text-[13px] uppercase tracking-wider">
                The following will be destroyed:
              </h5>
              <ul className="space-y-2 text-[13px] text-on-surface-variant">
                <li className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-[16px] text-error mt-0.5">
                    delete_forever
                  </span>
                  <span>
                    <strong>MongoDB</strong>: Product document, all reviews, gallery items, and
                    search indexes.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-[16px] text-error mt-0.5">
                    delete_forever
                  </span>
                  <span>
                    <strong>Cloudinary</strong>: All product images, review images, and thumbnails.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-[16px] text-error mt-0.5">
                    link_off
                  </span>
                  <span>
                    <strong>References</strong>: Removed from all user wishlists, shopping carts,
                    and recommendations.
                  </span>
                </li>
              </ul>
            </div>

            <div className="space-y-2">
              <label className="block text-[13px] font-medium text-on-surface-variant">
                Please type <strong className="text-on-surface select-all">{productTitle}</strong>{' '}
                to confirm.
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                disabled={isDeleting}
                className="w-full px-4 py-3 bg-surface border border-outline-variant/30 rounded-xl focus:border-error focus:ring-1 focus:ring-error outline-none transition-all text-[14px]"
                placeholder={productTitle}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 pt-4 bg-surface-variant/30 flex items-center justify-end gap-3 border-t border-error/10">
            <button
              onClick={onClose}
              disabled={isDeleting}
              className="px-5 py-2.5 rounded-full font-label-sm text-[11px] uppercase tracking-widest font-bold text-on-surface hover:bg-surface-variant transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={!isMatch || isDeleting}
              className="px-6 py-2.5 rounded-full bg-error text-onError font-label-sm text-[11px] uppercase tracking-widest font-bold shadow-md shadow-error/20 hover:bg-error/90 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDeleting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-onError/30 border-t-onError rounded-full animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <span>Permanently Delete</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
