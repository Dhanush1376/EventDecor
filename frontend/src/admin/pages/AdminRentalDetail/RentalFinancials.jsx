import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { RentalPaymentModal } from './RentalPaymentModal';
import { RentalDepositRefundModal } from './RentalDepositRefundModal';

const formatCurrency = (val) => `₹${Number(val || 0).toLocaleString('en-IN')}`;

export function RentalFinancials({ rental, fetchRentalDetail }) {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);

  const amountPaid = rental.amountPaid ?? (rental.totalAmount || 0);
  const amountDue = Math.max(0, (rental.totalAmount || 0) - amountPaid);

  const paymentMethod =
    rental.paymentMethod === 'Cash_on_Delivery'
      ? 'Cash on Delivery (COD)'
      : (rental.paymentMethod || 'Razorpay').replace(/_/g, ' ');

  const isDepositRefunded = rental.depositStatus === 'refunded';
  const isDepositHeld = rental.depositStatus === 'held';
  const isSettled = rental.status === 'completed' && isDepositRefunded;
  const canRecordPayment = amountDue > 0;
  const canRefundDeposit =
    isDepositHeld &&
    Number(rental.securityDeposit || 0) > 0 &&
    ['active_rental', 'returned', 'completed'].includes(rental.status);

  const copyToClipboard = (text, label) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  const totalBill = Number(rental.totalAmount || 0);
  const depositAmount = Number(rental.securityDeposit || 0);
  const rentalCharges = Number(rental.rentalCharge || totalBill - depositAmount || totalBill);

  return (
    <div
      id="rental-settlement"
      className="bg-[var(--admin-surface)] rounded-[4px] shadow-sm border border-[var(--admin-border)] overflow-hidden"
    >
      {/* Header */}
      <div className="px-3 sm:px-5 py-3 sm:py-4 border-b border-[var(--admin-border-subtle)] bg-[var(--admin-bg-subtle)] flex items-center justify-between">
        <h3 className="text-[14px] font-bold text-[var(--admin-text-primary)] flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">account_balance</span>
          Financial Settlement
        </h3>
        <span
          className={`text-[10px] px-2 py-0.5 rounded-[4px] font-bold uppercase tracking-wider border shadow-sm ${
            isSettled
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800'
              : isDepositRefunded
                ? 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:border-teal-800'
                : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800'
          }`}
        >
          {isSettled ? 'Reconciled' : isDepositRefunded ? 'Deposit Refunded' : 'Deposit Held'}
        </span>
      </div>

      {/* Financial Overview 2x2 Grid */}
      <div className="p-3 sm:p-4 space-y-3">
        <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
          {/* Net Total & Method */}
          <div className="p-2.5 rounded-[4px] bg-[var(--admin-bg-subtle)]/70 border border-[var(--admin-border-subtle)] flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold text-[var(--admin-text-tertiary)] tracking-wider">
              Total Bill
            </span>
            <div className="mt-1">
              <span className="text-[15px] font-black text-[var(--admin-text-primary)] font-mono block">
                {formatCurrency(totalBill)}
              </span>
              <span className="inline-flex items-center gap-1 text-[10.5px] text-[var(--admin-text-secondary)] font-medium mt-0.5">
                <span className="material-symbols-outlined text-[13px] text-stone-400">
                  {rental.paymentMethod === 'Cash_on_Delivery' ? 'payments' : 'credit_card'}
                </span>
                <span className="truncate max-w-[110px]">{paymentMethod}</span>
              </span>
            </div>
          </div>

          {/* Security Deposit & Status */}
          <div className="p-2.5 rounded-[4px] bg-[var(--admin-bg-subtle)]/70 border border-[var(--admin-border-subtle)] flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-[var(--admin-text-tertiary)] tracking-wider">
                Deposit
              </span>
              <span
                className={`text-[8.5px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded-[3px] border ${
                  isDepositRefunded
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800'
                    : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800'
                }`}
              >
                {isDepositRefunded ? 'Refunded' : 'Held'}
              </span>
            </div>
            <div className="mt-1">
              <span className="text-[15px] font-black text-[var(--admin-text-primary)] font-mono block">
                {formatCurrency(depositAmount)}
              </span>
              <span className="text-[10.5px] text-[var(--admin-text-tertiary)] font-medium mt-0.5 block">
                Refundable
              </span>
            </div>
          </div>

          {/* Amount Collected */}
          <div className="p-2.5 rounded-[4px] bg-[var(--admin-bg-subtle)]/70 border border-[var(--admin-border-subtle)] flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold text-[var(--admin-text-tertiary)] tracking-wider">
              Collected
            </span>
            <div className="mt-1">
              <span className="text-[15px] font-black text-emerald-600 dark:text-emerald-400 font-mono block">
                {formatCurrency(amountPaid)}
              </span>
              <span className="text-[10.5px] text-[var(--admin-text-tertiary)] font-medium mt-0.5 block">
                {amountDue === 0 ? 'Fully Paid' : 'Partial / Unpaid'}
              </span>
            </div>
          </div>

          {/* Balance Due */}
          <div
            className={`p-2.5 rounded-[4px] border flex flex-col justify-between ${
              amountDue > 0
                ? 'bg-red-50/50 dark:bg-red-950/20 border-red-200/70 dark:border-red-900/40'
                : 'bg-[var(--admin-bg-subtle)]/70 border-[var(--admin-border-subtle)]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span
                className={`text-[10px] uppercase font-bold tracking-wider ${amountDue > 0 ? 'text-red-700 dark:text-red-400' : 'text-[var(--admin-text-tertiary)]'}`}
              >
                Balance Due
              </span>
              {amountDue === 0 && (
                <span className="material-symbols-outlined text-[14px] text-emerald-600">
                  check_circle
                </span>
              )}
            </div>
            <div className="mt-1">
              <span
                className={`text-[15px] font-black font-mono block ${amountDue > 0 ? 'text-red-600 dark:text-red-400' : 'text-[var(--admin-text-primary)]'}`}
              >
                {formatCurrency(amountDue)}
              </span>
              <span
                className={`text-[10.5px] font-medium mt-0.5 block ${amountDue > 0 ? 'text-red-600 dark:text-red-400' : 'text-[var(--admin-text-tertiary)]'}`}
              >
                {amountDue > 0 ? 'Payment Pending' : 'Settled'}
              </span>
            </div>
          </div>
        </div>

        {/* Siri Pay Wallet Deduction (if applied) */}
        {Number(rental.walletDeduction || 0) > 0 && (
          <div className="flex items-center justify-between px-3 py-1.5 rounded-[4px] bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-400 text-[11.5px]">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="material-symbols-outlined text-[14px]">account_balance_wallet</span>
              Siri Cash Discount Applied
            </span>
            <span className="font-bold font-mono">-{formatCurrency(rental.walletDeduction)}</span>
          </div>
        )}

        {/* Quick Settlement Actions */}
        {(canRefundDeposit || canRecordPayment) && (
          <div className="space-y-2 pt-1">
            {canRefundDeposit && (
              <button
                type="button"
                onClick={() => setShowRefundModal(true)}
                className="w-full h-8 sm:h-9 px-3 rounded-[4px] bg-[var(--admin-accent)] hover:bg-[var(--admin-accent-hover)] text-white font-bold text-[11.5px] sm:text-[12px] flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">restart_alt</span>
                <span>Refund Security Deposit ({formatCurrency(depositAmount)})</span>
              </button>
            )}

            {canRecordPayment && (
              <button
                type="button"
                onClick={() => setShowPaymentModal(true)}
                className="w-full h-8 sm:h-9 px-3 rounded-[4px] bg-[var(--admin-accent)] hover:bg-[var(--admin-accent-hover)] text-white font-bold text-[11.5px] sm:text-[12px] flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">payments</span>
                <span>Record Manual Payment ({formatCurrency(amountDue)})</span>
              </button>
            )}
          </div>
        )}

        {/* Payment Gateway Transaction IDs */}
        {(rental.razorpayPaymentId || rental.razorpayOrderId) && (
          <div className="pt-2 border-t border-[var(--admin-border-subtle)] space-y-1.5 text-[11px]">
            <span className="text-[9.5px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider block">
              Gateway References
            </span>
            <div className="flex flex-wrap gap-2">
              {rental.razorpayPaymentId && (
                <button
                  type="button"
                  onClick={() => copyToClipboard(rental.razorpayPaymentId, 'Payment ID')}
                  className="px-2 py-1 rounded-[4px] bg-[var(--admin-bg-subtle)] border border-[var(--admin-border-subtle)] font-mono text-[11px] text-[var(--admin-text-primary)] hover:text-[var(--admin-accent)] inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                  title="Click to copy Payment ID"
                >
                  <span className="text-[10px] text-[var(--admin-text-tertiary)] font-sans">
                    Pay ID:
                  </span>
                  <span>{rental.razorpayPaymentId}</span>
                  <span className="material-symbols-outlined text-[12px] text-stone-400">
                    content_copy
                  </span>
                </button>
              )}
              {rental.razorpayOrderId && (
                <button
                  type="button"
                  onClick={() => copyToClipboard(rental.razorpayOrderId, 'Order ID')}
                  className="px-2 py-1 rounded-[4px] bg-[var(--admin-bg-subtle)] border border-[var(--admin-border-subtle)] font-mono text-[11px] text-[var(--admin-text-primary)] hover:text-[var(--admin-accent)] inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                  title="Click to copy Order ID"
                >
                  <span className="text-[10px] text-[var(--admin-text-tertiary)] font-sans">
                    Order ID:
                  </span>
                  <span>{rental.razorpayOrderId}</span>
                  <span className="material-symbols-outlined text-[12px] text-stone-400">
                    content_copy
                  </span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Manual Payment Recording Modal */}
      {showPaymentModal && (
        <RentalPaymentModal
          rental={rental}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={() => {
            setShowPaymentModal(false);
            if (fetchRentalDetail) fetchRentalDetail();
          }}
        />
      )}

      {/* Security Deposit Refund Modal */}
      {showRefundModal && (
        <RentalDepositRefundModal
          rental={rental}
          onClose={() => setShowRefundModal(false)}
          onSuccess={() => {
            setShowRefundModal(false);
            if (fetchRentalDetail) fetchRentalDetail();
          }}
        />
      )}
    </div>
  );
}
