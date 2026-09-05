import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { RentalPaymentModal } from './RentalPaymentModal';
import { RentalDepositRefundModal } from './RentalDepositRefundModal';

export function RentalFinancials({ rental, fetchRentalDetail }) {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);

  const amountPaid = rental.amountPaid ?? (rental.totalAmount || 0);
  const amountDue = Math.max(0, (rental.totalAmount || 0) - amountPaid);

  const paymentMethod =
    rental.paymentMethod === 'Cash_on_Delivery'
      ? 'Cash on Delivery (COD)'
      : (rental.paymentMethod || 'Razorpay').replace(/_/g, ' ');

  const paymentStatus = rental.paymentStatus || 'paid';
  const isCod = rental.paymentMethod === 'Cash_on_Delivery';
  const isUnpaid = amountDue > 0;

  const canRecordPayment = isUnpaid;
  const canRefundDeposit = rental.status === 'returned' && rental.depositStatus === 'held';

  const formatCurrency = (val) => `₹${Number(val || 0).toLocaleString('en-IN')}`;

  const copyToClipboard = (text, label) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  return (
    <div className="bg-[var(--admin-surface)] rounded-lg shadow-sm border border-[var(--admin-border)] overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--admin-border-subtle)] bg-[var(--admin-bg-subtle)] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="material-symbols-outlined text-[18px] text-[var(--admin-accent)] shrink-0">
            receipt_long
          </span>
          <h3 className="text-[13.5px] font-bold text-[var(--admin-text-primary)] truncate">
            Payment & Bill Details
          </h3>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`text-[10px] px-2.5 py-0.5 rounded-md font-bold uppercase tracking-wider border shadow-xs whitespace-nowrap ${
              !isUnpaid
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}
          >
            {!isUnpaid ? 'Paid in Full' : isCod ? 'Pending COD' : 'Payment Due'}
          </span>
          {canRecordPayment && (
            <button
              onClick={() => setShowPaymentModal(true)}
              className="h-7 px-2.5 rounded-md bg-[#b8a48f] hover:bg-[#a5917c] text-white font-bold text-[11px] shadow-xs flex items-center gap-1 cursor-pointer transition-transform active:scale-95"
              title="Record Manual Payment"
            >
              <span className="material-symbols-outlined text-[14px]">add</span>
              <span>Record Payment</span>
            </button>
          )}
        </div>
      </div>

      <div className="p-4 sm:p-5 space-y-4">
        {/* 1. BIG PAYMENT ACTION BANNER - Crystal Clear to Anyone */}
        {isUnpaid ? (
          <div className="p-3.5 sm:p-4 rounded-lg bg-amber-50/80 border border-amber-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 border border-amber-300">
                <span className="material-symbols-outlined text-[22px]">payments</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-amber-900 bg-amber-200/70 px-2 py-0.5 rounded">
                    {paymentMethod}
                  </span>
                  <span className="text-[11px] font-bold text-red-600">Not Paid Yet</span>
                </div>
                <h4 className="text-[16px] sm:text-[18px] font-extrabold text-amber-950 mt-1">
                  Collect {formatCurrency(amountDue)} in Cash
                </h4>
                <p className="text-[12px] text-amber-800 mt-0.5">
                  Collect this amount from the customer upon delivering the rental item.
                </p>
              </div>
            </div>

            {canRecordPayment && (
              <button
                onClick={() => setShowPaymentModal(true)}
                className="h-9 px-4 rounded-lg bg-[#b8a48f] hover:bg-[#a5917c] text-white font-bold text-[12.5px] shadow-sm flex items-center justify-center gap-1.5 cursor-pointer shrink-0 transition-transform active:scale-95"
              >
                <span className="material-symbols-outlined text-[17px]">payments</span>
                <span>Record Manual Payment</span>
              </button>
            )}
          </div>
        ) : (
          <div className="p-3.5 sm:p-4 rounded-lg bg-emerald-50/80 border border-emerald-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 border border-emerald-300">
                <span className="material-symbols-outlined text-[22px]">check_circle</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-emerald-900 bg-emerald-200/70 px-2 py-0.5 rounded">
                    {paymentMethod}
                  </span>
                  <span className="text-[11px] font-bold text-emerald-700">Payment Cleared</span>
                </div>
                <h4 className="text-[16px] sm:text-[18px] font-extrabold text-emerald-950 mt-1">
                  {formatCurrency(amountPaid)} Collected in Full
                </h4>
                <p className="text-[12px] text-emerald-800 mt-0.5">
                  Full payment received. Customer balance due is ₹0.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 2. SIMPLE, HONEST BILL RECEIPT */}
        <div className="border border-[var(--admin-border-subtle)] rounded-lg overflow-hidden bg-white shadow-2xs">
          <div className="px-4 py-2.5 bg-[var(--admin-bg-subtle)] border-b border-[var(--admin-border-subtle)] flex items-center justify-between">
            <span className="text-[12px] font-bold text-[var(--admin-text-primary)] flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[15px] text-[var(--admin-accent)]">
                shopping_cart_checkout
              </span>
              Order Bill Receipt
            </span>
            <span className="text-[11px] text-[var(--admin-text-tertiary)]">
              All amounts in INR (₹)
            </span>
          </div>

          <div className="p-4 space-y-2.5 text-[12.5px]">
            {/* Rental charge */}
            <div className="flex justify-between items-center text-[var(--admin-text-secondary)]">
              <span>Rental Charges ({rental.durationDays || 1} Days)</span>
              <span className="font-semibold text-[var(--admin-text-primary)]">
                {formatCurrency(rental.rentalCharge)}
              </span>
            </div>

            {/* Refundable deposit */}
            <div className="flex justify-between items-center text-[var(--admin-text-secondary)]">
              <span className="flex items-center gap-1.5">
                <span>Security Deposit</span>
                <span className="text-[10px] text-blue-700 font-bold bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                  Refundable Later
                </span>
              </span>
              <span className="font-semibold text-blue-700">
                +{formatCurrency(rental.securityDeposit)}
              </span>
            </div>

            {/* Delivery fee */}
            <div className="flex justify-between items-center text-[var(--admin-text-secondary)]">
              <span>Delivery Fee</span>
              <span className="font-semibold text-[var(--admin-text-primary)]">
                {rental.deliveryCharge ? `+${formatCurrency(rental.deliveryCharge)}` : 'Free'}
              </span>
            </div>

            {/* Tax */}
            {rental.tax ? (
              <div className="flex justify-between items-center text-[var(--admin-text-secondary)]">
                <span>Taxes & GST</span>
                <span className="font-semibold text-[var(--admin-text-primary)]">
                  +{formatCurrency(rental.tax)}
                </span>
              </div>
            ) : null}

            {/* Wallet discount */}
            {rental.walletDeduction ? (
              <div className="flex justify-between items-center text-emerald-700 bg-emerald-50/60 px-2 py-1 rounded">
                <span className="font-medium flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">
                    account_balance_wallet
                  </span>
                  Wallet Balance Used
                </span>
                <span className="font-bold">-{formatCurrency(rental.walletDeduction)}</span>
              </div>
            ) : null}

            {/* Late fee */}
            {rental.lateFee ? (
              <div className="flex justify-between items-center text-red-700 bg-red-50/60 px-2 py-1 rounded">
                <span className="font-medium">
                  Late Return Fee ({rental.lateFeeAppliedDays || 0} days)
                </span>
                <span className="font-bold">+{formatCurrency(rental.lateFee)}</span>
              </div>
            ) : null}

            {/* Total Bill */}
            <div className="pt-3 mt-1 border-t border-[var(--admin-border-subtle)] flex justify-between items-center text-[14px] font-bold">
              <span className="text-[var(--admin-text-primary)]">Total Order Bill</span>
              <span className="text-[16px] font-extrabold text-[var(--admin-accent)]">
                {formatCurrency(rental.totalAmount)}
              </span>
            </div>
          </div>
        </div>

        {/* 3. REVENUE / PAYMENT STATUS IN 3 CLEAR TILES */}
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3 text-center">
          <div className="p-2.5 sm:p-3 rounded-lg bg-[var(--admin-bg-subtle)] border border-[var(--admin-border-subtle)]">
            <span className="text-[10px] font-bold uppercase text-[var(--admin-text-tertiary)] block">
              Total Bill
            </span>
            <span className="text-[14px] sm:text-[15px] font-extrabold text-[var(--admin-text-primary)] mt-0.5 block">
              {formatCurrency(rental.totalAmount)}
            </span>
          </div>

          <div className="p-2.5 sm:p-3 rounded-lg bg-[var(--admin-bg-subtle)] border border-[var(--admin-border-subtle)]">
            <span className="text-[10px] font-bold uppercase text-[var(--admin-text-tertiary)] block">
              Paid by Customer
            </span>
            <span className="text-[14px] sm:text-[15px] font-extrabold text-emerald-600 mt-0.5 block">
              {formatCurrency(amountPaid)}
            </span>
          </div>

          <div
            className={`p-2.5 sm:p-3 rounded-lg border ${
              isUnpaid ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'
            }`}
          >
            <span
              className={`text-[10px] font-bold uppercase block ${
                isUnpaid ? 'text-red-700' : 'text-emerald-700'
              }`}
            >
              Balance Due
            </span>
            <span
              className={`text-[14px] sm:text-[15px] font-extrabold mt-0.5 block ${
                isUnpaid ? 'text-red-600' : 'text-emerald-700'
              }`}
            >
              {formatCurrency(amountDue)}
            </span>
          </div>
        </div>

        {/* 4. REFUNDABLE SECURITY DEPOSIT CARD - Explained in Plain Words */}
        <div className="p-3.5 rounded-lg border border-blue-200 bg-blue-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
              <span className="material-symbols-outlined text-[18px]">shield</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h5 className="text-[13px] font-bold text-blue-950">
                  Refundable Security Deposit: {formatCurrency(rental.securityDeposit)}
                </h5>
                <span className="text-[9.5px] font-bold uppercase px-1.5 py-0.2 rounded bg-blue-200/80 text-blue-800">
                  {rental.depositStatus === 'refunded' ? 'Refunded' : 'Held'}
                </span>
              </div>
              <p className="text-[11.5px] text-blue-800 mt-0.5 leading-relaxed">
                {rental.depositStatus === 'refunded'
                  ? `Refunded ${formatCurrency(rental.depositRefund?.amount || rental.securityDeposit)} back to the customer.`
                  : 'This safety deposit is held until the item is returned. After inspection, refund this amount back to the customer.'}
              </p>
            </div>
          </div>

          {canRefundDeposit && (
            <button
              onClick={() => setShowRefundModal(true)}
              className="h-8 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11.5px] flex items-center justify-center gap-1 shrink-0 shadow-sm cursor-pointer transition-transform active:scale-95"
            >
              <span className="material-symbols-outlined text-[15px]">currency_rupee</span>
              <span>Refund Deposit</span>
            </button>
          )}
        </div>

        {/* 5. TRANSACTION ID & PROOF (Only shown if online transaction exists) */}
        {(rental.razorpayPaymentId ||
          rental.razorpayOrderId ||
          (rental.paymentHistory && rental.paymentHistory.length > 0)) && (
          <div className="border border-[var(--admin-border-subtle)] rounded-lg p-3 bg-white space-y-2">
            <div className="flex items-center gap-1.5 text-[11.5px] font-bold text-[var(--admin-text-primary)]">
              <span className="material-symbols-outlined text-[15px] text-emerald-600">
                verified
              </span>
              Online Payment IDs & Records
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              {rental.razorpayPaymentId && (
                <div className="p-2 bg-[var(--admin-bg-subtle)] rounded border border-[var(--admin-border-subtle)] flex items-center justify-between">
                  <div className="min-w-0">
                    <span className="text-[9px] uppercase font-bold text-[var(--admin-text-tertiary)] block">
                      Payment ID
                    </span>
                    <span className="font-mono font-bold text-[var(--admin-text-primary)] truncate block">
                      {rental.razorpayPaymentId}
                    </span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(rental.razorpayPaymentId, 'Payment ID')}
                    className="text-[var(--admin-text-tertiary)] hover:text-[var(--admin-accent)] ml-2 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[14px]">content_copy</span>
                  </button>
                </div>
              )}

              {rental.razorpayOrderId && (
                <div className="p-2 bg-[var(--admin-bg-subtle)] rounded border border-[var(--admin-border-subtle)] flex items-center justify-between">
                  <div className="min-w-0">
                    <span className="text-[9px] uppercase font-bold text-[var(--admin-text-tertiary)] block">
                      Razorpay Order ID
                    </span>
                    <span className="font-mono font-bold text-[var(--admin-text-primary)] truncate block">
                      {rental.razorpayOrderId}
                    </span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(rental.razorpayOrderId, 'Order ID')}
                    className="text-[var(--admin-text-tertiary)] hover:text-[var(--admin-accent)] ml-2 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[14px]">content_copy</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showPaymentModal && (
        <RentalPaymentModal
          rental={rental}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={fetchRentalDetail}
        />
      )}

      {showRefundModal && (
        <RentalDepositRefundModal
          rental={rental}
          onClose={() => setShowRefundModal(false)}
          onSuccess={fetchRentalDetail}
        />
      )}
    </div>
  );
}
