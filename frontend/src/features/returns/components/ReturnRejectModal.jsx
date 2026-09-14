import React, { useState } from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';

export function ReturnRejectModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Reject Return Request',
  description = 'Please enter the reason for rejecting this return request. This message will be recorded and shown to the customer.',
}) {
  const [rejectReason, setRejectReason] = useState('');

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm(rejectReason);
    setRejectReason('');
  };

  const handleClose = () => {
    setRejectReason('');
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-[100] p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-[var(--admin-surface)] rounded-[4px] w-full max-w-md p-6 shadow-2xl border border-[var(--admin-border)]"
        >
          <h3 className="text-base font-bold text-[var(--admin-error)] flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined">warning</span>
            {title}
          </h3>
          <p className="text-xs text-[var(--admin-text-secondary)] mb-4">{description}</p>
          <textarea
            className="admin-input w-full min-h-[100px] text-xs mb-4 !rounded-[4px]"
            placeholder="e.g., The item does not meet the return policy criteria..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          <div className="flex justify-end gap-2.5">
            <button
              type="button"
              className="admin-btn admin-btn-outline text-xs !rounded-[4px] cursor-pointer"
              onClick={handleClose}
            >
              Cancel
            </button>
            <button
              type="button"
              className="admin-btn admin-btn-primary !bg-[var(--admin-error)] hover:!bg-[var(--admin-error)]/90 text-xs !rounded-[4px] cursor-pointer"
              onClick={handleConfirm}
            >
              Confirm Rejection
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
