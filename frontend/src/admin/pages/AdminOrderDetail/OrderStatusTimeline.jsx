import React from 'react';

const allStatuses = [
  'Pending',
  'Confirmed',
  'Packed',
  'Ready to Ship',
  'Shipped',
  'Out for Delivery',
  'Delivered',
  'Settled',
  'Cancelled',
  'Returned',
  'Refunded',
];

const statusIcons = {
  Pending: 'schedule',
  Confirmed: 'thumb_up',
  Packed: 'inventory_2',
  'Ready to Ship': 'conveyor_belt',
  Shipped: 'local_shipping',
  'Out for Delivery': 'directions_run',
  Delivered: 'check_circle',
  Settled: 'payments',
  Cancelled: 'cancel',
  Returned: 'keyboard_return',
  Refunded: 'payments',
};

export function OrderStatusTimeline({ order, updateOrderStatus }) {
  return (
    <div className="p-3 sm:p-4 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-xl">
      <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-3 block">
        Status Timeline
      </label>
      <div className="flex flex-wrap gap-2">
        {allStatuses.map((s) => (
          <button
            key={s}
            onClick={() => updateOrderStatus(order.id, s)}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-[var(--admin-radius-lg)] text-[12px] font-bold cursor-pointer transition-all border ${
              order.status === s
                ? 'bg-[var(--admin-accent)] border-[var(--admin-accent)] text-white shadow-sm'
                : 'bg-[var(--admin-surface)] border-[var(--admin-border-subtle)] text-[var(--admin-text-secondary)] hover:border-[var(--admin-border-strong)] hover:text-[var(--admin-text-primary)]'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">{statusIcons[s]}</span>
            {s}
          </button>
        ))}
      </div>

      {/* Progress Track */}
      <div className="mt-8 pt-6 border-t border-[var(--admin-border-subtle)] flex items-center gap-1 overflow-x-auto pb-2 custom-scrollbar">
        {['Pending', 'Confirmed', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered'].map(
          (s, i, arr) => {
            const idx = arr.indexOf(order.status);
            const active =
              i <= idx &&
              order.status !== 'Cancelled' &&
              order.status !== 'Returned' &&
              order.status !== 'Refunded';
            return (
              <React.Fragment key={s}>
                <div
                  title={s}
                  className={`w-10 h-10 rounded-full flex flex-col items-center justify-center text-[18px] shrink-0 transition-colors ${
                    active
                      ? 'bg-[var(--admin-accent)] text-white shadow-sm'
                      : 'bg-[var(--admin-surface-muted)] text-[var(--admin-text-tertiary)] border border-[var(--admin-border)]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">{statusIcons[s]}</span>
                </div>
                {i < arr.length - 1 && (
                  <div
                    className={`flex-1 min-w-[20px] h-1 rounded-full ${i < idx && active ? 'bg-[var(--admin-accent)]' : 'bg-[var(--admin-surface-muted)]'}`}
                  />
                )}
              </React.Fragment>
            );
          },
        )}
      </div>
    </div>
  );
}

// Export these utilities for reuse in the scanner hook
export { allStatuses, statusIcons };
