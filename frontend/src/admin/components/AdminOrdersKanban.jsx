import React from 'react';
import { formatCurrency } from '../components/AdminUIKit';
import toast from 'react-hot-toast';

const getCardColorClass = (status, cardState = 'normal') => {
  const s = (status || '').toLowerCase();
  switch (s) {
    case 'delivered':
    case 'settled':
      return 'bg-green-50 border-green-200';
    case 'processing':
      return 'bg-blue-50 border-blue-200';
    case 'pending':
      return 'bg-yellow-50 border-yellow-200';
    case 'confirmed':
      return 'bg-purple-50 border-purple-200';
    case 'cancelled':
    case 'returned':
    case 'refunded':
      return 'bg-red-50 border-red-200';
    default:
      return 'bg-gray-50 border-gray-200';
  }
};
export function AdminOrdersKanban({
  filteredOrders,
  allStatuses,
  statusIcons,
  openOrderDrawer,
  updateOrderStatus,
  deleteOrder,
}) {
  return (
    <>
      {filteredOrders.length === 0 ? (
        <div className="py-20 text-center col-span-full admin-card flex flex-col items-center justify-center">
          <span className="material-symbols-outlined text-[36px] text-[var(--admin-text-tertiary)] mb-2">
            search_off
          </span>
          <p className="text-[12px] font-bold text-[var(--admin-text-secondary)]">Data Not Found</p>
          <p className="text-[11px] mt-0.5 text-[var(--admin-text-tertiary)]">
            Try adjusting your active search keywords or status tabs.
          </p>
        </div>
      ) : (
        allStatuses.slice(0, 5).map((status) => {
          const statusOrders = filteredOrders.filter((o) => o.status === status);

          return (
            <div
              key={status}
              className="bg-[var(--admin-bg-subtle)] rounded-[var(--admin-radius-xl)] p-3 border border-[var(--admin-border)] flex flex-col h-[calc(100dvh-340px)] min-h-[400px] md:h-[calc(100dvh-260px)] md:min-h-[600px] admin-kanban-column min-w-[280px] w-[320px] shrink-0 snap-start"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-[var(--admin-border-subtle)] shrink-0 select-none">
                <div className="flex items-center gap-2 text-left">
                  <span className="material-symbols-outlined text-[16px] text-[var(--admin-text-secondary)]">
                    {statusIcons[status]}
                  </span>
                  <span className="text-[12px] font-bold text-[var(--admin-text-primary)] uppercase tracking-wider">
                    {status}
                  </span>
                </div>
                <span className="text-[10px] font-bold bg-[var(--admin-surface-muted)] border border-[var(--admin-border)] text-[var(--admin-text-secondary)] px-1.5 py-0.5 rounded-[var(--admin-radius-sm)]">
                  {statusOrders.length}
                </span>
              </div>

              {/* Cards Pool */}
              <div className="flex-1 space-y-3 overflow-y-auto custom-scrollbar pr-1">
                {statusOrders.map((o) => {
                  const hasNote = Boolean(o.notes);

                  return (
                    <div
                      key={o.id}
                      onClick={() => openOrderDrawer(o)}
                      className={`${getCardColorClass(o.status, o.cardState)} rounded-sm p-4 border-2 shadow-sm hover:border-gray-500 hover:shadow-md transition-all duration-200 cursor-pointer group text-left flex flex-col relative overflow-hidden`}
                    >
                      {o.orderType && o.orderType !== 'purchase' && (
                        <div className="absolute top-0 left-0 w-12 h-12 pointer-events-none z-10 overflow-hidden rounded-tl-[var(--admin-radius-lg)]">
                          <div
                            className={`absolute top-2 -left-7 w-24 text-[7px] font-extrabold text-white text-center uppercase py-[2px] -rotate-45 shadow-sm tracking-wider ${
                              o.orderType === 'rental' ? 'bg-indigo-500' : 'bg-purple-500'
                            }`}
                          >
                            {o.orderType}
                          </div>
                        </div>
                      )}
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[15px] font-bold text-gray-900">
                          #{o.id.substring(o.id.length - 8).toUpperCase()}
                        </span>
                        <div className="relative inline-block">
                          <select
                            value={o.status}
                            onChange={(e) => {
                              updateOrderStatus(o.id, e.target.value);
                              toast.success(`Moved to ${e.target.value}`);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="appearance-none bg-white border border-[#E0E2D9] text-gray-900 text-[10px] font-bold uppercase tracking-wider rounded-[6px] py-1.5 pl-3 pr-8 cursor-pointer shadow-sm outline-none"
                          >
                            {allStatuses.map((st) => (
                              <option key={st} value={st}>
                                {st}
                              </option>
                            ))}
                          </select>
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-900">
                            <svg
                              className="h-[14px] w-[14px]"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="3"
                                d="M19 9l-7 7-7-7"
                              />
                            </svg>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 mb-2 text-gray-800">
                        <span className="text-[12px] font-medium uppercase tracking-wide truncate max-w-[140px]">
                          {o.customer}
                        </span>
                        <div className="flex items-center gap-1.5 text-[12px] font-medium">
                          <span className="material-symbols-outlined text-[15px]">call</span>
                          {o.phone.replace('+91', '').trim()}
                        </div>
                      </div>

                      <div className="flex items-start gap-1.5 mb-4 text-gray-800">
                        <span className="material-symbols-outlined text-[15px] mt-0.5 shrink-0">
                          location_on
                        </span>
                        <span className="text-[11px] leading-snug line-clamp-2">
                          {o.address || 'Address not provided'}
                        </span>
                      </div>

                      <div className="border-y border-black/5 py-3 mb-4">
                        <div className="flex items-start gap-3">
                          <div className="flex items-center -space-x-1 shrink-0">
                            {o.items.slice(0, 3).map((item, idx) => (
                              <img
                                key={idx}
                                src={item.image || '/placeholder.png'}
                                alt=""
                                className="w-[34px] h-[34px] rounded-md object-cover border border-white shadow-sm bg-gray-100 z-10"
                                style={{ zIndex: 3 - idx }}
                              />
                            ))}
                            {o.items.length > 3 && (
                              <div className="w-[34px] h-[34px] rounded-md bg-gray-200 border border-white shadow-sm flex items-center justify-center text-[9px] font-bold z-0">
                                +{o.items.length - 3}
                              </div>
                            )}
                          </div>
                          <span className="text-[11px] text-gray-800 leading-snug line-clamp-2 mt-0.5">
                            {o.items
                              .map((i) => `${i.name} (x${i.qty || i.quantity || 1})`)
                              .join(', ')}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-auto pt-1">
                        <span className="text-[15px] font-bold text-gray-900">
                          {o.total >= 1000
                            ? `₹${(o.total / 1000).toFixed(1)}K`
                            : formatCurrency(o.total)}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-[4px] bg-[var(--admin-bg)] border border-[var(--admin-border)] text-gray-800 shadow-sm">
                            {o.payment || 'COD PENDING'}
                          </span>

                          <button
                            className="text-gray-700 hover:text-red-600 transition-colors ml-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteOrder(o);
                            }}
                            title="Delete Order"
                          >
                            <span className="material-symbols-outlined text-[20px]">delete</span>
                          </button>

                          <button
                            className="text-gray-700 hover:text-black transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="material-symbols-outlined text-[20px]">
                              visibility
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {statusOrders.length === 0 && (
                  <div className="py-12 text-center text-[var(--admin-text-tertiary)] border border-dashed border-[var(--admin-border)] rounded-[var(--admin-radius-lg)] flex flex-col items-center justify-center">
                    <span className="material-symbols-outlined text-[24px] mb-2">inbox</span>
                    <span className="text-[10px] uppercase font-bold tracking-wider">Empty</span>
                  </div>
                )}
              </div>
            </div>
          );
        })
      )}
    </>
  );
}
