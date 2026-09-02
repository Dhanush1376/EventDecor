import React from 'react';
import toast from 'react-hot-toast';

export function OrderSettlement({
  order,
  updateOrderStatus,
  settlementCharges,
  setSettlementCharges,
}) {
  const showSettlement =
    order.payment === 'Cash_on_Delivery' ||
    ['Settled', 'Delivered'].includes(order.status) ||
    order.items?.some((i) => i.type === 'rental');

  if (!showSettlement) return null;

  const isSettled = order.status === 'Settled';
  const hasRental = order.items?.some((i) => i.type === 'rental');

  return (
    <div className="bg-[var(--admin-surface)] rounded-xl shadow-sm border border-[var(--admin-border)] overflow-hidden">
      <div className="px-3 sm:px-5 py-3 sm:py-4 border-b border-[var(--admin-border-subtle)] bg-[var(--admin-bg-subtle)] flex items-center justify-between">
        <h3 className="text-[14px] font-bold text-[var(--admin-text-primary)] flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">account_balance</span>
          Financial Settlement
        </h3>
        <span
          className={`text-[10px] px-2 py-0.5 rounded-xl font-bold uppercase tracking-wider border shadow-sm ${
            isSettled
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}
        >
          {isSettled ? 'Reconciled' : 'Pending'}
        </span>
      </div>

      <div className="px-3 py-4 sm:p-5 lg:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-[13px] text-[var(--admin-text-secondary)]">Order Total</span>
          <span className="text-[14px] font-bold text-[var(--admin-text-primary)]">
            ₹{order.total}
          </span>
        </div>

        <div className="flex items-center justify-between pb-4 border-b border-[var(--admin-border-subtle)]">
          <span className="text-[13px] text-[var(--admin-text-secondary)]">Payment Method</span>
          <span className="text-[13px] font-medium text-[var(--admin-text-primary)] flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-gray-500">
              {order.payment === 'Cash_on_Delivery' ? 'money' : 'credit_card'}
            </span>
            {order.payment.replace('_', ' ')}
          </span>
        </div>

        {hasRental && (
          <div className="flex items-center justify-between py-2 border-b border-[var(--admin-border-subtle)]">
            <span className="text-[13px] text-[var(--admin-text-secondary)] flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-indigo-500">lock</span>
              Security Deposit
            </span>
            <span className="text-[14px] font-bold text-indigo-600">₹{order.deposit || 0}</span>
          </div>
        )}

        <div className="pt-2">
          <label className="text-[13px] text-[var(--admin-text-secondary)] block mb-2">
            Courier Charges Deduction
          </label>
          <div
            className={`flex items-center border rounded-lg h-9 overflow-hidden transition-colors ${
              isSettled
                ? 'bg-[var(--admin-bg-subtle)] border-[var(--admin-border)]'
                : 'bg-white border-[var(--admin-border)] shadow-sm focus-within:border-black focus-within:ring-1 focus-within:ring-black'
            }`}
          >
            <span className="pl-3 pr-2 text-[var(--admin-text-tertiary)] font-medium text-[13px]">
              ₹
            </span>
            <input
              type="number"
              value={settlementCharges}
              onChange={(e) => setSettlementCharges(e.target.value)}
              disabled={isSettled}
              className="flex-1 bg-transparent border-none outline-none text-[13px] h-full px-0 disabled:text-[var(--admin-text-secondary)]"
              placeholder="0.00"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 mt-2 border-t border-[var(--admin-border-strong)]">
          <span className="text-[14px] font-bold text-[var(--admin-text-primary)]">
            Final Payout
          </span>
          <span
            className={`text-[18px] font-black ${isSettled ? 'text-emerald-600' : 'text-[var(--admin-text-primary)]'}`}
          >
            ₹{(order.total - (parseFloat(settlementCharges) || 0)).toFixed(2)}
          </span>
        </div>

        <div className="pt-2">
          {!isSettled ? (
            <button
              onClick={() => {
                updateOrderStatus(order.id, 'Settled');
                toast.success('Settlement saved successfully');
              }}
              className="w-full h-10 rounded-lg font-bold text-[13px] flex items-center justify-center gap-2 transition-all bg-[var(--admin-text-primary)] text-white hover:bg-black shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              Mark as Settled
            </button>
          ) : (
            <button
              onClick={() => {
                updateOrderStatus(order.id, 'Delivered');
                toast.success('Settlement reverted to Delivered');
              }}
              className="w-full h-10 rounded-lg font-bold text-[13px] flex items-center justify-center gap-2 transition-all bg-white border border-[var(--admin-border-strong)] text-[var(--admin-text-secondary)] hover:bg-[var(--admin-bg-subtle)] shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">undo</span>
              Undo Settlement
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
