import { useState } from 'react';
import { m as motion } from 'framer-motion';
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
  const balanceDue = (booking?.pricing?.totalPrice || 0) - totalPaid;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const payAmount = Number(amount);
    if (!payAmount || payAmount <= 0) {
      toast.error('Enter a valid amount greater than zero.');
      return;
    }
    if (payAmount > balanceDue) {
      toast.error(`Cannot overpay. Balance is ₹${balanceDue.toLocaleString('en-IN')}`);
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
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to record manual payment'));
      setIsSubmitting(false); // Only enable on failure to allow retry
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={!isSubmitting ? onClose : undefined}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />

      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="relative w-full max-w-md bg-[var(--admin-surface)] rounded-[var(--admin-radius-2xl)] shadow-2xl p-6 sm:p-8 z-10 border border-[var(--admin-border-strong)]"
      >
        <div className="flex justify-between items-center mb-6 border-b border-[var(--admin-border-subtle)] pb-4">
          <div>
            <span className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider block mb-1">
              {booking.title}
            </span>
            <h3 className="text-[18px] font-bold text-[var(--admin-text-primary)]">
              Record Manual Payment
            </h3>
          </div>
          <button
            onClick={!isSubmitting ? onClose : undefined}
            disabled={isSubmitting}
            className="admin-btn-icon w-8 h-8 min-h-0 bg-[var(--admin-surface-muted)] disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="bg-[var(--admin-surface-muted)] rounded-xl p-4 border border-[var(--admin-border)] mb-2">
            <div className="flex justify-between items-center text-[13px] mb-1">
              <span className="text-[var(--admin-text-secondary)]">Total Price</span>
              <span className="font-medium text-[var(--admin-text-primary)]">
                ₹{booking.pricing.totalPrice?.toLocaleString('en-IN') || 0}
              </span>
            </div>
            <div className="flex justify-between items-center text-[13px] mb-1">
              <span className="text-[var(--admin-text-secondary)]">Total Paid</span>
              <span className="font-medium text-[var(--admin-success)]">
                ₹{totalPaid.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex justify-between items-center text-[14px] pt-2 mt-2 border-t border-[var(--admin-border)]">
              <span className="font-bold text-[var(--admin-text-primary)]">Balance Due</span>
              <span className="font-bold text-[var(--admin-error)]">
                ₹{balanceDue.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[12px] font-bold text-[var(--admin-text-secondary)] block">
              Amount Received (₹) *
            </label>
            <input
              type="number"
              min="1"
              max={balanceDue}
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="admin-input font-medium text-[16px]"
              placeholder="e.g. 5000"
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[12px] font-bold text-[var(--admin-text-secondary)] block">
              Payment Method *
            </label>
            <div className="relative">
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="admin-input appearance-none bg-[var(--admin-surface-muted)] cursor-pointer disabled:cursor-not-allowed"
                required
                disabled={isSubmitting}
              >
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="other">Other Manual Method</option>
              </select>
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[18px] text-[var(--admin-text-tertiary)] pointer-events-none">
                expand_more
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[12px] font-bold text-[var(--admin-text-secondary)] block">
              Note / Reference
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="admin-input"
              placeholder="e.g. Handed over at venue / UPI Ref #123"
              disabled={isSubmitting}
            />
          </div>

          {amount && Number(amount) > 0 && Number(amount) <= balanceDue && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400 p-3 rounded-lg text-[12px] font-medium border border-yellow-200 dark:border-yellow-800 mt-4">
              Recording <strong>₹{Number(amount).toLocaleString('en-IN')}</strong> via{' '}
              {paymentMethod.toUpperCase()}. Balance will become{' '}
              <strong>₹{(balanceDue - Number(amount)).toLocaleString('en-IN')}</strong>.
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={
                isSubmitting || !amount || Number(amount) <= 0 || Number(amount) > balanceDue
              }
              className="w-full h-11 bg-[var(--admin-accent)] hover:bg-[var(--admin-accent-hover)] disabled:opacity-50 text-white rounded-lg font-bold text-[13px] flex justify-center items-center gap-2 transition-all"
            >
              {isSubmitting ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[18px]">
                    progress_activity
                  </span>
                  <span>Recording...</span>
                </>
              ) : (
                'Record Payment'
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
