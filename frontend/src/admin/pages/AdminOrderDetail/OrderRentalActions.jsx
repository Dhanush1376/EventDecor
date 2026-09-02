import React from 'react';
import toast from 'react-hot-toast';

export function OrderRentalActions({ order, updateOrderStatus }) {
  const isRental = order.orderType === 'rental' || order.items?.some((i) => i.type === 'rental');

  return (
    <div className="space-y-4">
      {isRental && (
        <div className="bg-[var(--admin-surface)] rounded-xl shadow-sm border border-[var(--admin-border)] overflow-hidden relative border-l-4 border-l-[#8c7335]">
          <div className="px-3 sm:px-5 py-3 sm:py-4 border-b border-[var(--admin-border-subtle)] bg-[#8c7335]/5 flex items-center justify-between">
            <h3 className="text-[14px] font-bold text-[#8c7335] flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">sell</span>
              Rental Operations
            </h3>
          </div>

          <div className="px-3 py-4 sm:p-5 flex flex-col gap-3">
            <button
              onClick={() => toast.success('Return approved')}
              className="w-full h-10 rounded-xl font-bold text-[13px] flex items-center justify-center gap-2 transition-all bg-white border border-[#8c7335]/30 text-[#8c7335] hover:bg-[#8c7335] hover:text-white shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">assignment_turned_in</span>
              Approve Return
            </button>
            <button
              onClick={() => toast.success('Inspection logged')}
              className="w-full h-10 rounded-xl font-bold text-[13px] flex items-center justify-center gap-2 transition-all bg-white border border-amber-200 text-amber-700 hover:bg-amber-600 hover:text-white shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">search</span>
              Inspect Item
            </button>
            <button
              onClick={() => toast.success('Deposit released')}
              className="w-full h-10 rounded-xl font-bold text-[13px] flex items-center justify-center gap-2 transition-all bg-white border border-green-200 text-green-700 hover:bg-green-600 hover:text-white shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">payments</span>
              Release Deposit
            </button>
          </div>
        </div>
      )}

      {order.status !== 'Cancelled' &&
        order.status !== 'Delivered' &&
        order.status !== 'Refunded' && (
          <div className="bg-red-50/50 rounded-xl shadow-sm border border-red-100 overflow-hidden relative">
            <div className="p-5">
              <button
                onClick={() => updateOrderStatus(order.id, 'Cancelled')}
                className="w-full h-12 rounded-xl font-bold text-[14px] flex items-center justify-center gap-2 transition-all bg-red-600 border border-red-600 text-white hover:bg-red-700 shadow-sm"
              >
                <span className="material-symbols-outlined text-[20px]">cancel</span>
                Cancel Order
              </button>
              <p className="text-[11px] text-center text-red-400 mt-3 font-medium uppercase tracking-wider">
                Danger Zone
              </p>
            </div>
          </div>
        )}
    </div>
  );
}
