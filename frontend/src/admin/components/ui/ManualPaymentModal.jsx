import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { m as motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { bookingService } from '../../../services/domainServices';
import { getErrorMessage } from '../../../utils/core/errorHelpers';

export function ManualPaymentModal({ booking, onClose, onSuccess }) {
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Authoritative fallback calculation for UI max enforcement
  const totalPaid = (booking?.payments || []).reduce(
    (sum, p) => (p.status === 'success' ? sum + p.amount : sum),
    0,
  );
  const totalPrice = booking?.pricing?.totalPrice || 0;
  const balanceDue = Math.max(0, totalPrice - totalPaid);

  const formatCurrency = (val) => `₹${Number(val || 0).toLocaleString('en-IN')}`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const payAmount = Number(amount);
    if (!payAmount || payAmount <= 0) {
      toast.error('Enter a valid amount greater than zero.');
      return;
    }
    if (payAmount > balanceDue) {
      toast.error(`Cannot overpay. Balance is ${formatCurrency(balanceDue)}`);
      return;
    }

    setIsSubmitting(true);
    const transactionId = `MANUAL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    try {
      const res = await bookingService.adminRecordPayment(booking._id || booking.id, {
        amount: payAmount,
        paymentMethod,
        note,
        transactionId,
      });
      if (res.success) {
        toast.success('Manual payment successfully recorded!');
        onSuccess(res.data);
        onClose();
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to record manual payment'));
      setIsSubmitting(false); // Only enable on failure to allow retry
    }
  };

  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 640 : false,
  );

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
        {/* Full-screen Backdrop */}
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
          initial={{ opacity: 0, y: isMobile ? '100%' : 4, scale: isMobile ? 1 : 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: isMobile ? '100%' : 4, scale: isMobile ? 1 : 0.98 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className={`admin-section-root ${isDark ? 'dark' : ''} pointer-events-auto relative w-full sm:max-w-md bg-white dark:bg-[#1f1e1b] rounded-t-[6px] sm:rounded-[4px] shadow-2xl overflow-hidden z-10 border-t sm:border border-[#e8e4d9] dark:border-white/10 font-sans max-h-[88vh] sm:max-h-none flex flex-col`}
          style={{
            backgroundColor: 'var(--admin-surface, #ffffff)',
            borderColor: 'var(--admin-border, #e8e4d9)',
            fontFamily:
              "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Mobile Drawer Pull Indicator */}
          <div className="pt-2.5 pb-1 sm:hidden flex justify-center w-full cursor-grab active:cursor-grabbing">
            <div className="w-10 h-1.5 rounded-full bg-stone-300 dark:bg-stone-600" />
          </div>

          {/* Header */}
          <div
            className="px-5 py-3.5 sm:py-4 border-b border-[#e8e4d9] dark:border-white/10 flex items-center justify-between shrink-0"
            style={{
              borderColor: 'var(--admin-border-subtle, #e8e4d9)',
            }}
          >
            <div className="min-w-0 pr-2">
              <h3
                className="text-[14.5px] font-bold text-[var(--admin-text-primary)] flex items-center gap-2 !font-sans tracking-normal"
                style={{
                  fontFamily:
                    "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                }}
              >
                <span className="material-symbols-outlined text-[20px] text-[var(--admin-accent)]">
                  payments
                </span>
                Record Manual Payment
              </h3>
              <p className="text-[11px] text-[var(--admin-text-secondary)] font-medium truncate mt-0.5 !font-sans">
                {booking.title || 'Booking Order'}
              </p>
            </div>
            <button
              type="button"
              onClick={!isSubmitting ? onClose : undefined}
              disabled={isSubmitting}
              className="w-7 h-7 rounded-[4px] flex items-center justify-center text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            className="p-5 sm:p-6 space-y-4 font-sans overflow-y-auto custom-scrollbar flex-1 pb-8 sm:pb-6"
          >
            {/* Price Summary Box (Clean, Warm & Polished) */}
            <div
              className="bg-[#faf8f2] dark:bg-[#201e19] rounded-[4px] p-3.5 border border-[#e8e4d9] dark:border-white/10 space-y-2.5 text-xs shadow-2xs"
              style={{
                backgroundColor: 'var(--admin-bg-subtle, #faf8f2)',
                borderColor: 'var(--admin-border-subtle, #e8e4d9)',
                fontFamily:
                  "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
              }}
            >
              <div className="space-y-2">
                <div className="flex justify-between items-center text-[12.5px]">
                  <span className="text-stone-500 dark:text-stone-400 font-medium shrink-0 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-stone-400"></span>
                    Total Bill Price
                  </span>
                  <span className="font-bold text-[var(--admin-text-primary)] font-mono">
                    {formatCurrency(totalPrice)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[12.5px]">
                  <span className="text-emerald-700 dark:text-emerald-400 font-medium shrink-0 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Total Amount Paid
                  </span>
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400 font-mono">
                    {formatCurrency(totalPaid)}
                  </span>
                </div>
              </div>

              {/* Highlighted Balance Due Banner */}
              <div className="flex justify-between items-center px-3 py-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/40 rounded-[4px] mt-1">
                <span className="font-bold text-[12px] text-amber-900 dark:text-amber-200">
                  Balance Due
                </span>
                <span className="font-extrabold text-amber-700 dark:text-amber-400 font-mono text-[15px]">
                  {formatCurrency(balanceDue)}
                </span>
              </div>
            </div>

            {/* Amount Received */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--admin-text-secondary)] block">
                  Amount Received (₹) *
                </label>
                {balanceDue > 0 && amount !== String(balanceDue) && (
                  <button
                    type="button"
                    onClick={() => setAmount(String(balanceDue))}
                    className="text-[11px] font-semibold text-[var(--admin-accent)] hover:underline cursor-pointer"
                  >
                    Pay Full Due ({formatCurrency(balanceDue)})
                  </button>
                )}
              </div>
              <div className="relative flex items-center">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--admin-text-tertiary)] font-bold text-[14px] pointer-events-none select-none">
                  ₹
                </span>
                <input
                  type="number"
                  min="1"
                  max={balanceDue}
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={`e.g. ${balanceDue}`}
                  disabled={isSubmitting}
                  className="w-full h-10 pl-8 pr-3 rounded-[4px] border border-[var(--admin-border)] bg-white dark:bg-[#1a1815] text-[var(--admin-text-primary)] focus:border-[var(--admin-accent)] outline-none text-[14px] font-semibold transition-all font-mono"
                  style={{
                    backgroundColor: 'var(--admin-bg, #ffffff)',
                    borderColor: 'var(--admin-border, #e8e4d9)',
                    color: 'var(--admin-text-primary, #000000)',
                  }}
                />
              </div>
            </div>

            {/* Payment Method Dropdown */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--admin-text-secondary)] block">
                Payment Method *
              </label>
              <div className="relative">
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full h-10 px-3 pr-10 rounded-[4px] border border-[var(--admin-border)] bg-white dark:bg-[#1a1815] text-[var(--admin-text-primary)] focus:border-[var(--admin-accent)] outline-none text-[13px] appearance-none cursor-pointer font-medium"
                  style={{
                    backgroundColor: 'var(--admin-bg, #ffffff)',
                    borderColor: 'var(--admin-border, #e8e4d9)',
                    color: 'var(--admin-text-primary, #000000)',
                    WebkitAppearance: 'none',
                    MozAppearance: 'none',
                    appearance: 'none',
                    backgroundImage: 'none',
                  }}
                >
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="card">Card</option>
                  <option value="other">Other Manual Method</option>
                </select>
                <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-[18px] text-[var(--admin-text-tertiary)] pointer-events-none">
                  expand_more
                </span>
              </div>
            </div>

            {/* Note / Reference */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--admin-text-secondary)] block">
                Note / Reference
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Handed over at venue / UPI Ref #123"
                disabled={isSubmitting}
                className="w-full h-10 px-3 rounded-[4px] border border-[var(--admin-border)] bg-white dark:bg-[#1a1815] text-[var(--admin-text-primary)] focus:border-[var(--admin-accent)] outline-none text-[13px] transition-all"
                style={{
                  backgroundColor: 'var(--admin-bg, #ffffff)',
                  borderColor: 'var(--admin-border, #e8e4d9)',
                  color: 'var(--admin-text-primary, #000000)',
                }}
              />
            </div>

            {/* Balance Preview Notice */}
            {amount && Number(amount) > 0 && Number(amount) <= balanceDue && (
              <div
                className="p-3 rounded-[4px] text-[11.5px] border space-y-1"
                style={{
                  backgroundColor: 'rgba(130, 98, 55, 0.06)',
                  borderColor: 'rgba(130, 98, 55, 0.2)',
                }}
              >
                <div className="flex items-center gap-1.5 font-bold text-[var(--admin-text-primary)]">
                  <span className="material-symbols-outlined text-[15px] text-[var(--admin-accent)]">
                    info
                  </span>
                  <span>Payment Summary</span>
                </div>
                <p className="text-[11px] text-[var(--admin-text-secondary)]">
                  Recording{' '}
                  <strong className="text-[var(--admin-text-primary)]">
                    {formatCurrency(amount)}
                  </strong>{' '}
                  via {paymentMethod.toUpperCase()}. Remaining balance will become{' '}
                  <strong className="text-[var(--admin-text-primary)]">
                    {formatCurrency(balanceDue - Number(amount))}
                  </strong>
                  .
                </p>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={
                  isSubmitting || !amount || Number(amount) <= 0 || Number(amount) > balanceDue
                }
                className="w-full h-10 rounded-[4px] bg-[var(--admin-accent)] hover:bg-[var(--admin-accent-hover)] text-white font-bold text-[13px] shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: 'var(--admin-accent, #826237)',
                }}
              >
                {isSubmitting ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-[16px]">
                      progress_activity
                    </span>
                    <span>Recording Payment...</span>
                  </>
                ) : (
                  <span>
                    Record Payment {Number(amount) > 0 ? `(${formatCurrency(amount)})` : ''}
                  </span>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
}
