import React from 'react';
export function OrderItems({ order }) {
  return (
    <div className="bg-[var(--admin-surface)] rounded-xl shadow-sm border border-[var(--admin-border)] overflow-hidden">
      <div className="px-3 sm:px-5 py-3 sm:py-4 border-b border-[var(--admin-border-subtle)] bg-[var(--admin-bg-subtle)] flex items-center justify-between">
        <h3 className="text-[14px] font-bold text-[var(--admin-text-primary)] flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">shopping_bag</span>
          Order Items
        </h3>
        <span className="text-[12px] font-bold text-[var(--admin-text-secondary)] bg-[var(--admin-surface-muted)] px-3 py-1 rounded-full border border-[var(--admin-border-subtle)]">
          {order.items?.length || 0} Items
        </span>
      </div>

      <div className="divide-y divide-[var(--admin-border-subtle)]">
        {order.items?.map((item, index) => (
          <div
            key={index}
            className="px-3 py-4 sm:p-5 flex flex-row gap-3 sm:gap-5 hover:bg-[var(--admin-surface-muted)] transition-colors group"
          >
            {/* Image */}
            <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-xl bg-gray-100 border border-[var(--admin-border)] shrink-0 overflow-hidden relative shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)]">
              {item.image ? (
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <span className="material-symbols-outlined text-[32px]">image</span>
                </div>
              )}
              {item.type && item.type.toLowerCase() !== 'purchase' && (
                <div className="absolute top-0 right-0 bg-[var(--admin-text-primary)] text-white text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-bl-lg">
                  {item.type}
                </div>
              )}
            </div>

            {/* Details */}
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <h4 className="text-[14px] sm:text-[15px] font-bold text-[var(--admin-text-primary)] mb-1 group-hover:text-[var(--admin-accent)] transition-colors line-clamp-2">
                  {item.name}
                </h4>
                {item.type === 'rental' && item.rentalPeriod && (
                  <p className="text-[12px] text-[var(--admin-text-secondary)] font-medium flex items-center gap-1 mt-1">
                    <span className="material-symbols-outlined text-[14px]">calendar_clock</span>
                    {item.rentalPeriod.startDate} to {item.rentalPeriod.endDate}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-end justify-between gap-3 sm:gap-4 mt-3 sm:mt-4">
                <div className="flex items-center text-[13px] divide-x divide-[var(--admin-border-subtle)]">
                  <div className="flex flex-col pr-4 sm:pr-5">
                    <span className="text-[10px] uppercase font-bold text-[var(--admin-text-tertiary)] tracking-wider">
                      Price
                    </span>
                    <span className="font-bold text-[var(--admin-text-secondary)] mt-0.5">
                      ₹{item.price}
                    </span>
                  </div>
                  <div className="flex flex-col px-4 sm:px-5">
                    <span className="text-[10px] uppercase font-bold text-[var(--admin-text-tertiary)] tracking-wider">
                      Qty
                    </span>
                    <span className="font-bold text-[var(--admin-text-secondary)] mt-0.5">
                      {item.quantity || item.qty || 1}
                    </span>
                  </div>
                  {item.type === 'rental' && (
                    <div className="flex flex-col pl-4 sm:pl-5">
                      <span className="text-[10px] uppercase font-bold text-[var(--admin-text-tertiary)] tracking-wider">
                        Deposit
                      </span>
                      <span className="font-bold text-indigo-600 mt-0.5">₹{item.deposit || 0}</span>
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-[var(--admin-text-tertiary)] tracking-wider block mb-0.5">
                    Subtotal
                  </span>
                  <span className="text-[16px] font-black text-[var(--admin-text-primary)] font-mono">
                    ₹{item.price * (item.quantity || item.qty || 1)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Order Totals Footer */}
      <div className="px-3 py-4 sm:p-5 lg:p-6 bg-[var(--admin-bg-subtle)] border-t border-[var(--admin-border-subtle)]">
        <div className="flex flex-col items-end gap-2 text-[13px] font-medium text-[var(--admin-text-secondary)]">
          <div className="flex justify-between w-full sm:w-64">
            <span>Subtotal</span>
            <span className="font-bold text-[var(--admin-text-primary)]">
              ₹
              {order.items?.reduce(
                (acc, item) => acc + item.price * (item.quantity || item.qty || 1),
                0,
              )}
            </span>
          </div>
          {order.items?.some((i) => i.type === 'rental') && (
            <div className="flex justify-between w-full sm:w-64">
              <span>Security Deposit</span>
              <span className="font-bold text-[var(--admin-text-primary)]">
                ₹{order.deposit || 0}
              </span>
            </div>
          )}
          <div className="flex justify-between w-full sm:w-64 pt-3 mt-1 border-t border-[var(--admin-border)]">
            <span className="text-[14px] font-bold text-[var(--admin-text-primary)] uppercase">
              Total
            </span>
            <span className="text-[18px] font-black text-[var(--admin-accent)] font-mono">
              ₹{order.total}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
