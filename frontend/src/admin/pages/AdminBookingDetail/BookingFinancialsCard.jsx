import React from 'react';

export function BookingFinancialsCard({ booking, onOpenPaymentModal, onDeletePayment }) {
  const pricing = booking.pricing || {};

  const rentalFee = Number(pricing.rentalFee || 0);
  const setupCharges = Number(pricing.setupCharges || 0);
  const transportCharges = Number(pricing.transportationCost || 0);
  const addOns = Number(pricing.addOnCharges || 0);
  const travelExpense = Number(pricing.travelExpenseTotal || 0);

  const totalPrice = rentalFee + setupCharges + transportCharges + addOns + travelExpense;

  const depositAmount = Number(pricing.depositAmount || 0);

  const successfulPayments = (booking.payments || []).filter((p) => p.status === 'success');

  const totalPaid = successfulPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const balanceDue = Math.max(0, totalPrice - totalPaid);

  const paymentStatus =
    pricing.paymentStatus ||
    (totalPaid >= totalPrice && totalPrice > 0 ? 'paid' : totalPaid > 0 ? 'partial' : 'unpaid');

  return (
    <div
      className="bg-[var(--admin-surface)] rounded-[4px] shadow-sm border border-[var(--admin-border-subtle)] overflow-hidden font-sans"
      style={{
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* Header */}
      <div className="px-4 sm:px-5 py-3.5 sm:py-4 border-b border-[var(--admin-border-subtle)] bg-[var(--admin-bg-subtle)] flex items-center justify-between">
        <h3 className="text-[14px] font-bold text-[var(--admin-text-primary)] flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-[var(--admin-accent)]">
            account_balance
          </span>
          Financials
        </h3>
        <span
          className={`text-[10px] px-2 py-0.5 rounded-[4px] font-bold uppercase tracking-wider border shadow-2xs ${
            paymentStatus === 'paid'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
              : paymentStatus === 'partial'
                ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300'
                : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300'
          }`}
        >
          {paymentStatus}
        </span>
      </div>

      <div className="p-4 sm:p-5 space-y-3.5">
        {/* Bill Summary Breakdown */}
        <div className="space-y-2 text-xs">
          <div className="flex justify-between items-center text-[12.5px]">
            <span className="text-[var(--admin-text-secondary)]">Base Package</span>
            <span className="font-semibold text-[var(--admin-text-primary)] font-mono">
              ₹{rentalFee.toLocaleString('en-IN')}
            </span>
          </div>

          {(setupCharges > 0 || transportCharges > 0) && (
            <div className="flex justify-between items-center text-[12.5px]">
              <span className="text-[var(--admin-text-secondary)]">Setup & Transport</span>
              <span className="font-semibold text-[var(--admin-text-primary)] font-mono">
                ₹{(setupCharges + transportCharges).toLocaleString('en-IN')}
              </span>
            </div>
          )}

          {addOns > 0 && (
            <div className="flex justify-between items-center text-[12.5px]">
              <span className="text-[var(--admin-text-secondary)]">Add-Ons</span>
              <span className="font-semibold text-[var(--admin-text-primary)] font-mono">
                ₹{addOns.toLocaleString('en-IN')}
              </span>
            </div>
          )}

          {travelExpense > 0 && (
            <div className="flex justify-between items-center text-[12.5px]">
              <span className="text-[var(--admin-text-secondary)]">Travel Expenses</span>
              <span className="font-semibold text-[var(--admin-text-primary)] font-mono">
                ₹{travelExpense.toLocaleString('en-IN')}
              </span>
            </div>
          )}

          <div className="flex justify-between items-center pt-2 border-t border-[var(--admin-border-subtle)] text-[13.5px]">
            <span className="font-bold text-[var(--admin-text-primary)]">Total Price</span>
            <span className="font-extrabold text-[var(--admin-text-primary)] font-mono text-[14.5px]">
              ₹{totalPrice.toLocaleString('en-IN')}
            </span>
          </div>

          {depositAmount > 0 && (
            <div className="flex justify-between items-center text-[12px] text-stone-500 dark:text-stone-400">
              <span>Security Deposit</span>
              <span className="font-mono font-medium">
                ₹{depositAmount.toLocaleString('en-IN')}
              </span>
            </div>
          )}

          <div className="flex justify-between items-center text-[12.5px] pt-1 border-t border-[var(--admin-border-subtle)]">
            <span className="text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Paid
            </span>
            <span className="font-bold text-emerald-700 dark:text-emerald-400 font-mono">
              ₹{totalPaid.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* Highlighted Balance Due Banner */}
        <div className="flex justify-between items-center px-3.5 py-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/40 rounded-[4px] shadow-2xs">
          <span className="font-bold text-[12px] text-amber-900 dark:text-amber-200">
            Balance Due
          </span>
          <span className="font-extrabold text-amber-700 dark:text-amber-400 font-mono text-[15px]">
            ₹{balanceDue.toLocaleString('en-IN')}
          </span>
        </div>

        {/* Payment History Ledger */}
        <div className="pt-2.5 border-t border-[var(--admin-border-subtle)] space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-[10.5px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider">
                Payments
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-[var(--admin-surface-muted)] text-[var(--admin-text-tertiary)] border border-[var(--admin-border-subtle)]">
                {successfulPayments.length}
              </span>
            </div>
          </div>

          {booking.payments && booking.payments.length > 0 ? (
            <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
              {booking.payments.map((payment, idx) => (
                <div
                  key={idx}
                  className="bg-[var(--admin-surface-muted)] dark:bg-[#1f1e1b] border border-[var(--admin-border-subtle)] rounded-[4px] p-2 text-[11px] space-y-1"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <span className="font-bold font-mono text-emerald-700 dark:text-emerald-400 text-[12.5px]">
                        ₹{(payment.amount || 0).toLocaleString('en-IN')}
                      </span>
                      <span className="text-[10px] text-[var(--admin-text-tertiary)]">
                        {new Date(payment.date).toLocaleString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    {payment.source === 'manual' && (
                      <button
                        type="button"
                        onClick={() => onDeletePayment(payment.transactionId)}
                        className="text-stone-400 hover:text-red-600 transition-colors p-0.5 cursor-pointer"
                        title="Delete Payment Record"
                      >
                        <span className="material-symbols-outlined text-[14px]">delete</span>
                      </button>
                    )}
                  </div>

                  <div className="flex justify-between items-center text-[10.5px] text-[var(--admin-text-secondary)]">
                    <span className="uppercase font-semibold">
                      {payment.paymentMethod || 'razorpay'} &bull;{' '}
                      {payment.source === 'manual' ? 'Counter' : 'Online'}
                    </span>
                    {payment.recordedBy && (
                      <span className="text-[var(--admin-text-tertiary)] italic">
                        by {payment.recordedBy}
                      </span>
                    )}
                  </div>

                  {payment.note && (
                    <p
                      className="text-[10px] text-[var(--admin-text-tertiary)] italic truncate"
                      title={payment.note}
                    >
                      Ref: {payment.note}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-[var(--admin-text-tertiary)] italic py-1 text-center">
              No payments recorded
            </p>
          )}
        </div>

        {/* Record Payment Button */}
        {balanceDue > 0 && (
          <button
            type="button"
            onClick={onOpenPaymentModal}
            className="w-full h-9 rounded-[4px] bg-[var(--admin-surface)] hover:bg-[var(--admin-surface-muted)] border border-[var(--admin-border)] text-[var(--admin-text-primary)] text-[12px] font-bold shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px] text-[var(--admin-accent)]">
              payments
            </span>
            <span>Record Payment</span>
          </button>
        )}
      </div>
    </div>
  );
}
