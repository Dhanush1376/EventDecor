import React from 'react';
import { createPortal } from 'react-dom';
import { m as motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { formatINR } from '../utils/returnDomainUtils';

export function ReturnSettleRefundModal({
  isOpen,
  onClose,
  settleData,
  setSettleData,
  onSubmit,
  isSubmittingSettle = false,
  customerName = 'Customer',
  upiId = '',
  grandTotal = 0,
  returnCode = '',
  isDark = false,
  isMobile = false,
}) {
  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      <div
        key="return-settle-modal-portal"
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
          onClick={!isSubmittingSettle ? onClose : undefined}
          className="fixed inset-0 bg-black/40 dark:bg-black/60 cursor-pointer pointer-events-auto"
          style={{ backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}
        />

        {/* Modal Card / Mobile App Drawer */}
        <motion.div
          initial={{ opacity: 0, y: isMobile ? '100%' : 4, scale: isMobile ? 1 : 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: isMobile ? '100%' : 4, scale: isMobile ? 1 : 0.98 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className={`admin-section-root ${isDark ? 'dark' : ''} pointer-events-auto relative w-full sm:max-w-md bg-white dark:bg-[#1f1e1b] rounded-t-[20px] sm:rounded-[4px] shadow-2xl overflow-hidden z-10 border-t sm:border border-[#e8e4d9] dark:border-white/10 font-sans max-h-[88vh] sm:max-h-none flex flex-col`}
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
                Record Refund Payment
              </h3>
              <p className="text-[11px] text-[var(--admin-text-secondary)] font-medium truncate mt-0.5 !font-sans">
                Return #{returnCode} &bull; Settlement Payout
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmittingSettle}
              className="w-7 h-7 rounded-[4px] flex items-center justify-center text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>

          {/* Body Form */}
          <form
            onSubmit={onSubmit}
            className="p-5 sm:p-6 space-y-4 font-sans overflow-y-auto custom-scrollbar flex-1 pb-8 sm:pb-6 text-left"
          >
            {/* Price Difference / Refund Summary Box */}
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
                    Customer
                  </span>
                  <span className="font-semibold text-[var(--admin-text-primary)]">
                    {customerName}
                  </span>
                </div>
                {(upiId || settleData.upiId) && (
                  <div className="flex justify-between items-center text-[12px] pt-1 border-t border-[var(--admin-border-subtle)]">
                    <span className="text-stone-500 dark:text-stone-400 font-medium shrink-0 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                      Customer UPI
                    </span>
                    <div className="flex items-center gap-1 font-mono font-bold text-[var(--admin-text-primary)]">
                      <span>{upiId || settleData.upiId}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const upi = upiId || settleData.upiId;
                          navigator.clipboard.writeText(upi);
                          toast.success('UPI ID copied!');
                        }}
                        className="text-[var(--admin-accent)] hover:underline cursor-pointer p-0.5"
                        title="Copy UPI ID"
                      >
                        <span className="material-symbols-outlined text-[13px]">content_copy</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Highlighted Refund Banner */}
              <div className="flex justify-between items-center px-3 py-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/40 rounded-[4px] mt-1">
                <span className="font-bold text-[12px] text-amber-900 dark:text-amber-200">
                  Calculated Refund
                </span>
                <span className="font-extrabold text-amber-700 dark:text-amber-400 font-mono text-[15px]">
                  ₹{formatINR(grandTotal)}
                </span>
              </div>
            </div>

            {/* Amount to Refund */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--admin-text-secondary)] block">
                  Refund Amount (₹) *
                </label>
                {grandTotal > 0 && String(settleData.amount) !== String(grandTotal) && (
                  <button
                    type="button"
                    onClick={() => setSettleData({ ...settleData, amount: grandTotal })}
                    className="text-[11px] font-bold text-amber-700 dark:text-amber-400 hover:underline cursor-pointer"
                  >
                    Fill Due (₹{formatINR(grandTotal)})
                  </button>
                )}
              </div>
              <div className="relative flex items-center">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--admin-text-tertiary)] font-bold text-[14px] pointer-events-none select-none">
                  ₹
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  value={settleData.amount}
                  onChange={(e) => setSettleData({ ...settleData, amount: e.target.value })}
                  placeholder={`e.g. ${grandTotal || 500}`}
                  disabled={isSubmittingSettle}
                  className="w-full h-10 pl-8 pr-3 rounded-[4px] border border-[var(--admin-border)] bg-white dark:bg-[#1a1815] text-[var(--admin-text-primary)] focus:border-[var(--admin-accent)] outline-none text-[14px] font-bold transition-all font-mono"
                  style={{
                    backgroundColor: 'var(--admin-bg, #ffffff)',
                    borderColor: 'var(--admin-border, #e8e4d9)',
                    color: 'var(--admin-text-primary, #000000)',
                  }}
                />
              </div>
            </div>

            {/* Payment Method */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--admin-text-secondary)] block">
                Payment Method *
              </label>
              <div className="relative">
                <select
                  value={settleData.paymentMethod}
                  onChange={(e) => setSettleData({ ...settleData, paymentMethod: e.target.value })}
                  disabled={isSubmittingSettle}
                  className="w-full h-10 pl-3 pr-9 rounded-[4px] border border-[var(--admin-border)] bg-white dark:bg-[#1a1815] text-[var(--admin-text-primary)] focus:border-[var(--admin-accent)] outline-none text-[13px] font-medium transition-all cursor-pointer"
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
                  <option value="upi">UPI Payout</option>
                  <option value="wallet">Store Wallet Credit</option>
                  <option value="bank_transfer">Bank Transfer (NEFT/IMPS)</option>
                  <option value="original">Original Payment Gateway (Razorpay)</option>
                </select>
                <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-[18px] text-[var(--admin-text-secondary)] pointer-events-none select-none">
                  expand_more
                </span>
              </div>
            </div>

            {/* Customer UPI if UPI mode */}
            {settleData.paymentMethod === 'upi' && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--admin-text-secondary)] block">
                  Customer UPI ID *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. customer@okhdfcbank"
                  value={settleData.upiId}
                  onChange={(e) => setSettleData({ ...settleData, upiId: e.target.value })}
                  disabled={isSubmittingSettle}
                  className="w-full h-10 px-3 rounded-[4px] border border-[var(--admin-border)] bg-white dark:bg-[#1a1815] text-[var(--admin-text-primary)] focus:border-[var(--admin-accent)] outline-none text-[13px] font-mono transition-all"
                  style={{
                    backgroundColor: 'var(--admin-bg, #ffffff)',
                    borderColor: 'var(--admin-border, #e8e4d9)',
                    color: 'var(--admin-text-primary, #000000)',
                  }}
                />
              </div>
            )}

            {/* Bank Reference / UTR Number */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--admin-text-secondary)] block">
                Bank Reference / UTR Number
              </label>
              <input
                type="text"
                placeholder="e.g. UPI/123456789012 or UTR..."
                value={settleData.transactionId}
                onChange={(e) => setSettleData({ ...settleData, transactionId: e.target.value })}
                disabled={isSubmittingSettle}
                className="w-full h-10 px-3 rounded-[4px] border border-[var(--admin-border)] bg-white dark:bg-[#1a1815] text-[var(--admin-text-primary)] focus:border-[var(--admin-accent)] outline-none text-[13px] font-mono transition-all"
                style={{
                  backgroundColor: 'var(--admin-bg, #ffffff)',
                  borderColor: 'var(--admin-border, #e8e4d9)',
                  color: 'var(--admin-text-primary, #000000)',
                }}
              />
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--admin-text-secondary)] block">
                Notes
              </label>
              <textarea
                rows="2"
                value={settleData.notes}
                onChange={(e) => setSettleData({ ...settleData, notes: e.target.value })}
                placeholder="Optional notes or payout reference details..."
                disabled={isSubmittingSettle}
                className="w-full px-3 py-2 rounded-[4px] border border-[var(--admin-border)] bg-white dark:bg-[#1a1815] text-[var(--admin-text-primary)] focus:border-[var(--admin-accent)] outline-none text-[13px] transition-all resize-none"
                style={{
                  backgroundColor: 'var(--admin-bg, #ffffff)',
                  borderColor: 'var(--admin-border, #e8e4d9)',
                  color: 'var(--admin-text-primary, #000000)',
                }}
              />
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmittingSettle || !Number(settleData.amount)}
                className="admin-btn admin-btn-primary w-full !h-11 text-[13px] font-bold !rounded-[4px] shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                style={{
                  backgroundColor: 'var(--admin-accent, #c5a059)',
                  color: '#ffffff',
                }}
              >
                {isSubmittingSettle ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-[16px]">
                      progress_activity
                    </span>
                    <span>Saving Settlement...</span>
                  </>
                ) : (
                  <span>
                    Confirm & Save Settlement{' '}
                    {Number(settleData.amount) > 0 ? `(₹${formatINR(settleData.amount)})` : ''}
                  </span>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body,
  );
}
