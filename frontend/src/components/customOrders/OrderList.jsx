import React from 'react';

export function OrderList({ myOrders, selectedOrder, setSelectedOrder }) {
  return (
    <div className={`lg:col-span-4 space-y-4 ${selectedOrder ? 'hidden lg:block' : 'block'}`}>
      <h3 className="text-[14px] font-bold uppercase tracking-wider text-[#685C57] mb-2 px-1">
        My Custom Orders
      </h3>
      {myOrders.length === 0 ? (
        <div className="bg-white rounded-3xl border border-black/5 p-8 text-center text-[#685C57] flex flex-col items-center justify-center">
          <span className="material-symbols-outlined text-[36px] text-black/20 mb-2">
            search_off
          </span>
          <p className="text-[13px] font-bold text-[var(--color-on-surface)]">
            No Custom Orders Found
          </p>
          <p className="text-[11px] text-[#685C57] mt-1 max-w-[200px] mx-auto">
            Use the request form to submit your custom order request today.
          </p>
        </div>
      ) : (
        myOrders.map((order) => {
          const dateVal = new Date(order.createdAt).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          });

          return (
            <div
              key={order._id}
              onClick={() => setSelectedOrder(order)}
              className={`p-5 rounded-[2rem] border transition-all duration-300 cursor-pointer shadow-sm ${
                selectedOrder?._id === order._id
                  ? 'bg-white border-[var(--color-gold)] ring-1 ring-[var(--color-gold)]'
                  : 'bg-white border-black/5 hover:border-black/15'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`px-2 py-0.5 rounded-full text-[8px] font-bold tracking-wider uppercase ${
                    order.status === 'Pending'
                      ? 'bg-amber-100 text-amber-700'
                      : order.status === 'Approved'
                        ? 'bg-emerald-100 text-emerald-700'
                        : order.status === 'Cancelled'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-blue-100 text-blue-700'
                  }`}
                >
                  {order.status}
                </span>
                <span className="text-[9px] font-mono text-[#685C57]">{dateVal}</span>
              </div>

              <h4 className="text-[14px] font-bold text-[var(--color-on-surface)] line-clamp-1">
                {order.occasion} Setup
              </h4>
              <p className="text-[11px] text-[#685C57] mt-0.5">
                {order.productType} • {order.city || 'Any Location'}
              </p>

              {order.quotation?.total > 0 && (
                <div className="mt-3 pt-3 border-t border-black/5 flex items-center justify-between text-[11px]">
                  <span className="text-[#685C57]">Estimated Price:</span>
                  <span className="font-bold font-mono text-[var(--color-gold)]">
                    ₹{order.quotation.total.toLocaleString('en-IN')}
                  </span>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
