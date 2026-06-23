import React from 'react';
import toast from 'react-hot-toast';

export function OrderRentalActions({ order, updateOrderStatus }) {
  return (
    <div className="space-y-3">
      {(order.orderType === 'rental' || order.items?.some((i) => i.type === 'rental')) && (
        <div className="admin-card p-5 bg-[#8c7335]/5 border border-[#8c7335]/20 mb-4 shadow-none">
          <h3 className="text-[12px] font-bold text-[#8c7335] uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px]">sell</span>
            Rental Actions
          </h3>
          <div className="space-y-2">
            <button
              onClick={() => toast.success('Return approved')}
              className="admin-btn admin-btn-outline w-full h-10 border-[#8c7335]/30 text-[#8c7335] bg-white hover:bg-[#8c7335] hover:text-white transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">assignment_turned_in</span>
              Approve Return
            </button>
            <button
              onClick={() => toast.success('Inspection logged')}
              className="admin-btn admin-btn-outline w-full h-10 border-amber-200 text-amber-700 bg-white hover:bg-amber-600 hover:text-white transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">search</span>
              Inspect Item
            </button>
            <button
              onClick={() => toast.success('Deposit released')}
              className="admin-btn admin-btn-outline w-full h-10 border-green-200 text-green-700 bg-white hover:bg-green-600 hover:text-white transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">payments</span>
              Release Deposit
            </button>
          </div>
        </div>
      )}

      {order.status !== 'Cancelled' &&
        order.status !== 'Delivered' &&
        order.status !== 'Refunded' && (
          <button
            onClick={() => updateOrderStatus(order.id, 'Cancelled')}
            className="admin-btn admin-btn-outline w-full h-11 border-[var(--admin-error-light)] text-[var(--admin-error)] bg-[var(--admin-error-light)] hover:bg-[var(--admin-error)] hover:text-white hover:border-[var(--admin-error)] transition-colors border-none"
          >
            <span className="material-symbols-outlined text-[16px]">cancel</span>
            Cancel Order
          </button>
        )}
    </div>
  );
}
