import React from 'react';
import { formatCurrency } from '../../components/AdminUIKit';

export function OrderItems({ order }) {
  return (
    <div className="p-3 sm:p-4 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-xl">
      <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-3 block">
        Order Items
      </label>
      <div className="space-y-3">
        {order.items.map((item, i) => (
          <div
            key={i}
            className="flex items-center justify-between p-4 bg-[var(--admin-surface-muted)] rounded-[var(--admin-radius-lg)] border border-[var(--admin-border-subtle)] hover:border-[var(--admin-border-strong)] transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-[var(--admin-radius-md)] bg-[var(--admin-bg-subtle)] flex items-center justify-center overflow-hidden border border-[var(--admin-border)] shrink-0">
                {item.image ? (
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="material-symbols-outlined text-[24px] text-[var(--admin-text-tertiary)]">
                    inventory_2
                  </span>
                )}
              </div>
              <div>
                <p className="text-[14px] font-bold text-[var(--admin-text-primary)] leading-snug flex items-center gap-2">
                  {item.name}
                  {item.isNonRefundable && (
                    <span className="text-[9px] uppercase tracking-wider font-bold bg-[#fffbeb] text-[#d97706] border border-[#fde68a] px-1.5 py-0.5 rounded-[var(--admin-radius-sm)] flex items-center gap-0.5">
                      <span className="material-symbols-outlined text-[10px]">block</span>
                      Non-Refundable
                    </span>
                  )}
                </p>
                {item.type === 'rental' && item.rentalInfo && (
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <span className="text-[10px] bg-indigo-50 text-indigo-600 border border-indigo-100 px-1.5 py-0.5 rounded flex items-center gap-1 font-bold">
                      <span className="material-symbols-outlined text-[10px]">event</span>
                      {new Date(item.rentalInfo.startDate).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                      })}{' '}
                      -{' '}
                      {new Date(item.rentalInfo.endDate).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                    {item.deposit > 0 && (
                      <span className="text-[10px] bg-amber-50 text-amber-600 border border-amber-100 px-1.5 py-0.5 rounded flex items-center gap-1 font-bold">
                        <span className="material-symbols-outlined text-[10px]">security</span>
                        Deposit: {formatCurrency(item.deposit)}
                      </span>
                    )}
                  </div>
                )}
                {item.customizationNote && (
                  <div className="mt-1.5 p-2 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border-subtle)] rounded text-[11px] text-[var(--admin-text-secondary)] italic">
                    <span className="font-bold text-[var(--admin-text-primary)] not-italic mr-1">
                      Note:
                    </span>
                    "{item.customizationNote}"
                  </div>
                )}
                <p className="text-[12px] text-[var(--admin-text-tertiary)] font-bold mt-1">
                  Qty: {item.qty} × {formatCurrency(item.price)}
                </p>
              </div>
            </div>
            <span className="text-[14px] font-bold text-[var(--admin-text-primary)] shrink-0 ml-4">
              {formatCurrency(item.qty * item.price)}
            </span>
          </div>
        ))}
      </div>

      {order.depositTotal > 0 && (
        <div className="flex justify-between items-center mt-4 pt-4 border-t border-[var(--admin-border-subtle)]">
          <span className="text-[14px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px] text-amber-500">lock</span> Total
            Security Deposit
          </span>
          <span className="text-[16px] font-bold text-amber-600">
            {formatCurrency(order.depositTotal)}
          </span>
        </div>
      )}

      <div className="flex justify-between items-center mt-4 pt-4 border-t border-[var(--admin-border-strong)]">
        <span className="text-[16px] font-bold text-[var(--admin-text-primary)] uppercase tracking-wider">
          Grand Total
        </span>
        <span className="text-[20px] font-bold text-[var(--admin-accent)]">
          {formatCurrency(order.total)}
        </span>
      </div>
    </div>
  );
}
