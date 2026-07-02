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

          // Lightweight unread badge logic
          const lastAdminMessage = order.messages
            ?.slice()
            .reverse()
            .find((m) => m.sender === 'admin' || m.senderName === 'System');
          const readStorageKey = `order_readAt_${order._id}`;

          if (selectedOrder?._id === order._id) {
            localStorage.setItem(readStorageKey, Date.now().toString());
          }

          const localReadAt = localStorage.getItem(readStorageKey);
          const hasUnread =
            selectedOrder?._id !== order._id &&
            lastAdminMessage &&
            (!localReadAt ||
              new Date(lastAdminMessage.createdAt).getTime() > parseInt(localReadAt, 10));

          return (
            <div
              key={order._id}
              onClick={() => {
                setSelectedOrder(order);
                localStorage.setItem(readStorageKey, Date.now().toString());
              }}
              className={`group p-5 rounded-[2rem] border transition-all duration-300 cursor-pointer shadow-sm flex flex-col ${
                selectedOrder?._id === order._id
                  ? 'bg-white border-[var(--color-gold)] ring-1 ring-[var(--color-gold)]'
                  : 'bg-white border-black/5 hover:border-black/15 hover:shadow-md'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
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
                  {hasUnread && (
                    <span className="px-1.5 py-0.5 rounded-full bg-error text-white text-[7px] font-bold tracking-widest uppercase flex items-center gap-1 shadow-sm">
                      <span className="w-1 h-1 bg-white rounded-full animate-pulse" /> New Message
                    </span>
                  )}
                </div>
                <span className="text-[9px] font-mono text-[#685C57]">{dateVal}</span>
              </div>

              <h4 className="text-[14px] font-bold text-[var(--color-on-surface)] line-clamp-1">
                {order.occasion || 'Custom'} Setup
              </h4>
              <p className="text-[11px] text-[#685C57] mt-0.5 font-mono uppercase">
                {order.orderId} •{' '}
                <span className="font-sans normal-case">{order.city || 'Online'}</span>
              </p>

              {order.quotation?.total > 0 && (
                <div className="mt-4 pt-3 border-t border-black/5 flex items-center justify-between text-[11px]">
                  <span className="text-[#685C57]">Estimated Price:</span>
                  <span className="font-bold font-mono text-[var(--color-gold)]">
                    ₹{order.quotation.total.toLocaleString('en-IN')}
                  </span>
                </div>
              )}

              <div
                className={`mt-auto pt-4 ${!order.quotation?.total ? 'border-t border-black/5 mt-4' : ''} flex items-center justify-between`}
              >
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[var(--color-on-surface)] group-hover:text-[var(--color-gold)] transition-colors">
                  View Details
                </span>
                <span className="material-symbols-outlined text-[14px] text-[var(--color-on-surface)] group-hover:text-[var(--color-gold)] group-hover:translate-x-1 transition-all">
                  arrow_forward
                </span>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
