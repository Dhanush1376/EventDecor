import React, { useState, useEffect } from 'react';

export function OrderSettlement({
  order,
  updateOrderStatus,
  settlementCharges,
  setSettlementCharges,
  collectedAmount,
  setCollectedAmount,
}) {
  const showSettlement =
    order.payment === 'Cash_on_Delivery' ||
    ['Settled', 'Delivered'].includes(order.status) ||
    order.items?.some((i) => i.type === 'rental');

  const rawCollected = order.rawOrder?.collectedAmount;

  // Fallback local state if collectedAmount is not controlled from parent
  const [localCollected, setLocalCollected] = useState(
    order.collectedAmount ?? rawCollected ?? order.total ?? 0,
  );

  useEffect(() => {
    if (collectedAmount === undefined) {
      const init = order.collectedAmount ?? rawCollected ?? order.total ?? 0;
      setLocalCollected(init);
    }
  }, [order.id, order.total, order.collectedAmount, rawCollected, collectedAmount]);

  if (!showSettlement) return null;

  const isSettled = order.status === 'Settled';
  const hasRental = order.items?.some((i) => i.type === 'rental');

  const currentCollected = collectedAmount !== undefined ? collectedAmount : localCollected;

  const handleCollectedChange = (val) => {
    if (setCollectedAmount) {
      setCollectedAmount(val);
    } else {
      setLocalCollected(val);
    }
  };

  const totalBill = Number(order.total) || 0;
  const numCollected = parseFloat(currentCollected) || 0;
  const numCharges = parseFloat(settlementCharges) || 0;
  const finalPayout = Math.max(0, numCollected - numCharges);

  return (
    <div className="bg-[var(--admin-surface)] rounded-[4px] shadow-sm border border-[var(--admin-border)] overflow-hidden">
      <div className="px-3 sm:px-5 py-3 sm:py-4 border-b border-[var(--admin-border-subtle)] bg-[var(--admin-bg-subtle)] flex items-center justify-between">
        <h3 className="text-[14px] font-bold text-[var(--admin-text-primary)] flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">account_balance</span>
          Financial Settlement
        </h3>
        <span
          className={`text-[10px] px-2 py-0.5 rounded-[4px] font-bold uppercase tracking-wider border shadow-sm ${
            isSettled
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}
        >
          {isSettled ? 'Reconciled' : 'Pending'}
        </span>
      </div>

      <div className="px-3 py-4 sm:p-5 lg:p-6 space-y-4">
        {/* Original Order Total & Payment Method */}
        <div className="space-y-2 pb-3 border-b border-[var(--admin-border-subtle)]">
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-[var(--admin-text-secondary)]">
              Original Bill Total
            </span>
            <span className="text-[14px] font-bold text-[var(--admin-text-primary)]">
              ₹{totalBill}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[13px] text-[var(--admin-text-secondary)]">Payment Method</span>
            <span className="text-[13px] font-medium text-[var(--admin-text-primary)] flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-gray-500">
                {order.payment === 'Cash_on_Delivery' ? 'money' : 'credit_card'}
              </span>
              {order.payment.replace('_', ' ')}
            </span>
          </div>
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

        {/* Amount Collected / Received (Editable) */}
        <div className="pt-1">
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="collected-amount-input"
              className="text-[13px] font-medium text-[var(--admin-text-secondary)] cursor-pointer"
            >
              Amount Collected / Received
            </label>
            {!isSettled && (
              <span className="text-[11px] text-[var(--admin-accent)] font-semibold flex items-center gap-0.5 select-none">
                <span className="material-symbols-outlined text-[13px]">edit</span>
                Editable
              </span>
            )}
          </div>
          <div
            onClick={() => {
              if (!isSettled) {
                document.getElementById('collected-amount-input')?.focus();
              }
            }}
            className={`relative flex items-center border rounded-[4px] min-h-[38px] transition-colors cursor-text ${
              isSettled
                ? 'bg-[var(--admin-bg-subtle)] border-[var(--admin-border)] cursor-not-allowed opacity-80'
                : 'bg-white border-[var(--admin-border)] shadow-sm hover:border-[var(--admin-border-strong)] focus-within:border-[var(--admin-accent)] focus-within:ring-1 focus-within:ring-[var(--admin-accent)]'
            }`}
          >
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--admin-text-tertiary)] font-bold text-[14px] pointer-events-none select-none z-10">
              ₹
            </span>
            <input
              id="collected-amount-input"
              type="number"
              step="any"
              min="0"
              value={currentCollected ?? ''}
              onChange={(e) => handleCollectedChange(e.target.value)}
              disabled={isSettled}
              className="w-full h-full min-h-[38px] pl-8 pr-3 bg-transparent border-none outline-none text-[14px] font-semibold text-[var(--admin-text-primary)] disabled:text-[var(--admin-text-secondary)] placeholder:text-[var(--admin-text-tertiary)] cursor-text"
              placeholder={totalBill.toString()}
            />
          </div>
        </div>

        {/* Courier Charges Deduction (Editable) */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-2">
            <label
              htmlFor="courier-charges-deduction"
              className="text-[13px] font-medium text-[var(--admin-text-secondary)] cursor-pointer"
            >
              Courier Charges Deduction
            </label>
            {!isSettled && (
              <span className="text-[11px] text-[var(--admin-accent)] font-semibold flex items-center gap-0.5 select-none">
                <span className="material-symbols-outlined text-[13px]">edit</span>
                Editable
              </span>
            )}
          </div>
          <div
            onClick={() => {
              if (!isSettled) {
                document.getElementById('courier-charges-deduction')?.focus();
              }
            }}
            className={`relative flex items-center border rounded-[4px] min-h-[38px] transition-colors cursor-text ${
              isSettled
                ? 'bg-[var(--admin-bg-subtle)] border-[var(--admin-border)] cursor-not-allowed opacity-80'
                : 'bg-white border-[var(--admin-border)] shadow-sm hover:border-[var(--admin-border-strong)] focus-within:border-[var(--admin-accent)] focus-within:ring-1 focus-within:ring-[var(--admin-accent)]'
            }`}
          >
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--admin-text-tertiary)] font-bold text-[14px] pointer-events-none select-none z-10">
              ₹
            </span>
            <input
              id="courier-charges-deduction"
              type="number"
              step="any"
              min="0"
              value={settlementCharges ?? ''}
              onChange={(e) => setSettlementCharges(e.target.value)}
              disabled={isSettled}
              className="w-full h-full min-h-[38px] pl-8 pr-3 bg-transparent border-none outline-none text-[14px] font-semibold text-[var(--admin-text-primary)] disabled:text-[var(--admin-text-secondary)] placeholder:text-[var(--admin-text-tertiary)] cursor-text"
              placeholder="0.00"
            />
          </div>
        </div>

        {/* Final Payout */}
        <div className="flex items-center justify-between pt-4 mt-2 border-t border-[var(--admin-border-strong)]">
          <div>
            <span className="text-[14px] font-bold text-[var(--admin-text-primary)] block">
              Final Payout
            </span>
            <span className="text-[11px] text-[var(--admin-text-tertiary)] block">
              (₹{numCollected} collected - ₹{numCharges} courier)
            </span>
          </div>
          <span
            className={`text-[18px] font-black ${isSettled ? 'text-emerald-600' : 'text-[var(--admin-text-primary)]'}`}
          >
            ₹{finalPayout.toFixed(2)}
          </span>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          {!isSettled ? (
            <button
              type="button"
              onClick={async () => {
                const charges = parseFloat(settlementCharges) || 0;
                const collected = parseFloat(currentCollected) || 0;
                await updateOrderStatus(
                  order.id,
                  'Settled',
                  `Financial settlement complete (Collected: ₹${collected}, Courier: ₹${charges})`,
                  charges,
                  collected,
                );
              }}
              className="w-full h-10 rounded-[4px] font-bold text-[13px] flex items-center justify-center gap-2 transition-all bg-[var(--admin-accent)] text-white hover:brightness-105 active:scale-[0.99] shadow-sm cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              Mark as Settled
            </button>
          ) : (
            <button
              type="button"
              onClick={async () => {
                await updateOrderStatus(order.id, 'Delivered', 'Settlement reverted to Delivered');
              }}
              className="w-full h-10 rounded-[4px] font-bold text-[13px] flex items-center justify-center gap-2 transition-all bg-[var(--admin-surface)] border border-[var(--admin-border-strong)] text-[var(--admin-text-primary)] hover:bg-[var(--admin-bg-subtle)] shadow-sm cursor-pointer active:scale-[0.99]"
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
