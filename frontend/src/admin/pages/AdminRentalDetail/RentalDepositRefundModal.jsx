import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import rentalService from '../../../services/api/rentalService';
import { m as motion, AnimatePresence } from 'framer-motion';
import { useMobileDrawerEngine, DrawerDragHandle } from '../../../components/ui/drawer';

export function RentalDepositRefundModal({ rental, onClose, onSuccess }) {
  const depositHeld = rental.securityDeposit || 0;

  const [deductionAmount, setDeductionAmount] = useState(0);
  const [deductionReason, setDeductionReason] = useState('');
  const [method, setMethod] = useState(rental.razorpayPaymentId ? 'razorpay' : 'cash');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const refundAmount = Math.max(0, depositHeld - Number(deductionAmount));
  const hasRazorpay = !!rental.razorpayPaymentId;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (deductionAmount > depositHeld) {
      toast.error('Deduction cannot exceed deposit held');
      return;
    }
    if (deductionAmount > 0 && !deductionReason.trim()) {
      toast.error('Reason required for deduction');
      return;
    }

    setIsSubmitting(true);
    try {
      await rentalService.adminReleaseDeposit(rental._id, {
        deductionAmount: Number(deductionAmount),
        deductionReason,
        method,
      });
      toast.success('Deposit resolution initiated');
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to resolve deposit');
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (val) => `₹${Number(val || 0).toLocaleString('en-IN')}`;

  const { isMobile, dragProps, sheetTransition } = useMobileDrawerEngine({
    isOpen: !!rental,
    onClose: !isSubmitting ? onClose : undefined,
  });

  const isDark =
    typeof document !== 'undefined' &&
    (document.documentElement.classList.contains('dark') ||
      document.body.classList.contains('dark'));

  const modalContent = (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 font-sans pointer-events-none"
        style={{
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        {/* Full-screen Backdrop: covers entire viewport with strong blur across sidenav and topnav */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={!isSubmitting ? onClose : undefined}
          className="fixed inset-0 bg-black/40 dark:bg-black/60 cursor-pointer pointer-events-auto"
          style={{
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
          }}
        />

        {/* Modal Card / Mobile App Drawer */}
        <motion.div
          initial={{ opacity: 0, y: isMobile ? '100%' : 8, scale: isMobile ? 1 : 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: isMobile ? '100%' : 8, scale: isMobile ? 1 : 0.98 }}
          transition={sheetTransition}
          {...dragProps}
          className={`admin-section-root ${isDark ? 'dark' : ''} pointer-events-auto relative bg-white dark:bg-[#1f1e1b] rounded-t-2xl sm:rounded-[4px] shadow-2xl w-full sm:max-w-md overflow-hidden z-10 border-t sm:border border-[#e8e4d9] dark:border-white/10 font-sans max-h-[90dvh] sm:max-h-none flex flex-col`}
          style={{
            backgroundColor: 'var(--admin-surface, #ffffff)',
            borderColor: 'var(--admin-border, #e8e4d9)',
            fontFamily:
              "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {isMobile && <DrawerDragHandle onClick={!isSubmitting ? onClose : undefined} />}

          <div
            className="px-5 py-3.5 sm:py-4 border-b border-[#e8e4d9] dark:border-white/10 flex items-center justify-between bg-[#f2efe5] dark:bg-[#2a2823] shrink-0"
            style={{
              backgroundColor: 'var(--admin-surface-muted, #f2efe5)',
              borderColor: 'var(--admin-border-subtle, #e8e4d9)',
            }}
          >
            <h3
              className="text-[15px] font-bold text-[var(--admin-text-primary)] flex items-center gap-2 font-sans tracking-normal"
              style={{
                fontFamily:
                  "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
              }}
            >
              <span className="material-symbols-outlined text-[20px] text-[var(--admin-accent)]">
                currency_rupee
              </span>
              Resolve Security Deposit
            </h3>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-[4px] bg-white dark:bg-[#26241f] flex items-center justify-center text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] hover:bg-[#f2efe5] dark:hover:bg-[#302d27] transition-colors shadow-2xs border border-[#e8e4d9] dark:border-white/10 cursor-pointer"
              style={{
                backgroundColor: 'var(--admin-surface, #ffffff)',
                borderColor: 'var(--admin-border, #e8e4d9)',
              }}
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>

          <form
            onSubmit={handleSubmit}
            className="p-5 font-sans overflow-y-auto overscroll-contain touch-pan-y custom-scrollbar flex-1 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] sm:pb-5"
          >
            <div className="bg-[var(--admin-bg-subtle)] rounded-[4px] p-3.5 mb-5 border border-[var(--admin-border-subtle)]">
              <div className="flex justify-between mb-2">
                <span className="text-[12px] text-[var(--admin-text-secondary)] font-medium">
                  Customer:
                </span>
                <span className="text-[12px] font-bold text-[var(--admin-text-primary)]">
                  {rental.shippingAddress?.name}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-[var(--admin-border-subtle)]">
                <span className="text-[13px] font-bold text-[var(--admin-text-primary)] uppercase">
                  Deposit Held:
                </span>
                <span className="text-[14px] font-black text-[var(--admin-text-primary)] font-mono">
                  {formatCurrency(depositHeld)}
                </span>
              </div>
            </div>

            <div className="space-y-4 mb-5">
              <div>
                <label className="block text-[11px] font-bold text-[var(--admin-text-secondary)] mb-1.5 uppercase tracking-wider">
                  Deduction Amount (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  max={depositHeld}
                  value={deductionAmount}
                  onChange={(e) => setDeductionAmount(e.target.value)}
                  className="w-full h-10 px-3 rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-bg)] text-[var(--admin-text-primary)] focus:border-[var(--admin-accent)] outline-none text-[14px] font-semibold"
                  placeholder="0"
                />
              </div>

              {Number(deductionAmount) > 0 && (
                <div>
                  <label className="block text-[11px] font-bold text-[var(--admin-text-secondary)] mb-1.5 uppercase tracking-wider">
                    Deduction Reason *
                  </label>
                  <textarea
                    required
                    value={deductionReason}
                    onChange={(e) => setDeductionReason(e.target.value)}
                    className="w-full p-2.5 rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-bg)] text-[var(--admin-text-primary)] focus:border-[var(--admin-accent)] outline-none text-[13px] h-20"
                    placeholder="e.g. Broken packaging, minor scratch, missing accessory"
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-[var(--admin-text-secondary)] mb-1.5 uppercase tracking-wider">
                  Refund Method
                </label>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className="w-full h-10 px-3 rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-bg)] text-[var(--admin-text-primary)] focus:border-[var(--admin-accent)] outline-none text-[13px]"
                >
                  {hasRazorpay && (
                    <option value="razorpay">Refund to Original Payment (Razorpay)</option>
                  )}
                  <option value="cash">Cash / Offline Refund</option>
                  <option value="bank_transfer">Direct Bank Transfer (NEFT/IMPS)</option>
                  <option value="upi">UPI Manual Transfer</option>
                </select>
              </div>
            </div>

            <div className="bg-[var(--admin-accent-light)] rounded-[4px] p-3.5 mb-5 border border-[var(--admin-accent-muted)] flex justify-between items-center">
              <span className="text-[12px] font-bold text-[var(--admin-text-primary)] uppercase">
                Final Refund Amount:
              </span>
              <span className="text-[17px] font-black text-[var(--admin-accent)] font-mono">
                {formatCurrency(refundAmount)}
              </span>
            </div>

            {refundAmount > 0 && (
              <div className="mb-5">
                <label className="block text-[11px] font-bold text-[var(--admin-text-secondary)] mb-2 uppercase tracking-wider">
                  Refund Method
                </label>
                <div className="flex flex-col gap-2">
                  <label
                    className={`flex items-center gap-3 p-3 rounded-[4px] border cursor-pointer transition-colors ${method === 'razorpay' ? 'border-[var(--admin-accent)] bg-[var(--admin-accent-light)]' : 'border-[var(--admin-border)] hover:border-[var(--admin-border-strong)] bg-[var(--admin-surface)]'} ${!hasRazorpay ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <input
                      type="radio"
                      name="refundMethod"
                      value="razorpay"
                      checked={method === 'razorpay'}
                      onChange={() => setMethod('razorpay')}
                      disabled={!hasRazorpay}
                      className="w-4 h-4 accent-[var(--admin-accent)]"
                    />
                    <div className="flex flex-col">
                      <span className="text-[13px] font-bold text-[var(--admin-text-primary)]">
                        Razorpay (Original Source)
                      </span>
                      {!hasRazorpay && (
                        <span className="text-[11px] text-[var(--admin-text-secondary)]">
                          Not available for COD orders
                        </span>
                      )}
                    </div>
                  </label>

                  <label
                    className={`flex items-center gap-3 p-3 rounded-[4px] border cursor-pointer transition-colors ${method === 'cash' ? 'border-[var(--admin-accent)] bg-[var(--admin-accent-light)]' : 'border-[var(--admin-border)] hover:border-[var(--admin-border-strong)] bg-[var(--admin-surface)]'}`}
                  >
                    <input
                      type="radio"
                      name="refundMethod"
                      value="cash"
                      checked={method === 'cash'}
                      onChange={() => setMethod('cash')}
                      className="w-4 h-4 accent-[var(--admin-accent)]"
                    />
                    <div className="flex flex-col">
                      <span className="text-[13px] font-bold text-[var(--admin-text-primary)]">
                        Cash / Manual Transfer
                      </span>
                      <span className="text-[11px] text-[var(--admin-text-secondary)]">
                        Mark as refunded offline
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            )}

            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 h-10 rounded-[4px] font-bold text-[13px] bg-[var(--admin-surface-muted)] text-[var(--admin-text-secondary)] hover:bg-[var(--admin-border-subtle)] border border-[var(--admin-border)] transition-colors cursor-pointer"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 h-10 rounded-[4px] font-bold text-[13px] bg-[var(--admin-accent)] text-white hover:bg-[var(--admin-accent-hover)] transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-sm"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span className="material-symbols-outlined animate-spin text-[16px]">
                    progress_activity
                  </span>
                ) : (
                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                )}
                {refundAmount > 0 ? `Refund ${formatCurrency(refundAmount)}` : 'Forfeit Deposit'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
}
