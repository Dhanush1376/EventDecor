import React from 'react';
import { EmptyState, formatCurrency } from '../components/AdminUIKit';
import { EXTERNAL_URLS } from '../../config/constants';
import { WhatsAppIcon } from '../../components/ui/WhatsAppIcon';
import { DeleteConfirmModal } from './ui/DeleteConfirmModal';

export function AdminOrdersTable({
  filteredOrders,
  searchQuery,
  filterStatus,
  setFilterStatus,
  openOrderDrawer,
  navigate,
  updateOrderStatus,
  deleteOrder,
  allStatuses = [],
}) {
  const [orderToDelete, setOrderToDelete] = React.useState(null);

  const handleDelete = async () => {
    if (!orderToDelete) return;
    const success = await deleteOrder(orderToDelete.id);
    if (success) {
      setOrderToDelete(null);
    }
  };

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

  return (
    <>
      <div className="hidden md:block admin-card overflow-x-auto">
        <table className="admin-table w-full min-w-[900px]">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Customer</th>
              <th className="hidden md:table-cell">Items</th>
              <th>Total</th>
              <th className="hidden sm:table-cell">Payment</th>
              <th>Status</th>
              <th className="hidden lg:table-cell">Date</th>
              <th>Required By</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-16 text-center">
                  <EmptyState
                    icon={searchQuery || filterStatus !== 'All' ? 'search_off' : 'shopping_bag'}
                    title={
                      searchQuery || filterStatus !== 'All' ? 'No Matches Found' : 'No Orders Yet'
                    }
                    description={
                      searchQuery || filterStatus !== 'All'
                        ? 'No orders match the search or filter criteria.'
                        : "You haven't received any orders yet."
                    }
                    action={
                      searchQuery || filterStatus !== 'All' ? (
                        <button
                          onClick={() => setFilterStatus('All')}
                          className="admin-btn admin-btn-outline"
                        >
                          Clear Filters
                        </button>
                      ) : (
                        <button
                          onClick={() => window.location.reload()}
                          className="admin-btn admin-btn-outline"
                        >
                          <span className="material-symbols-outlined text-[16px]">refresh</span>
                          Refresh Page
                        </button>
                      )
                    }
                  />
                </td>
              </tr>
            ) : (
              filteredOrders.map((o) => {
                const isVip = o.total >= 15000;
                const isNew = o.date && o.date.includes('Today');

                return (
                  <tr
                    key={o.id}
                    className={`admin-table-row-clickable group ${getCardColorClass(o.status, o.cardState)}`}
                    onClick={() => openOrderDrawer(o)}
                  >
                    <td className="font-semibold text-[var(--admin-text-primary)]">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          #{o.id.substring(o.id.length - 8).toUpperCase()}
                          {isNew && (
                            <span
                              className="w-1.5 h-1.5 rounded-full bg-[var(--admin-accent)] animate-ping"
                              title="Recent order"
                            />
                          )}
                        </div>
                        {o.orderType && o.orderType !== 'purchase' && (
                          <span
                            className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded w-max ${
                              o.orderType === 'rental'
                                ? 'bg-indigo-100 text-indigo-700'
                                : 'bg-purple-100 text-purple-700'
                            }`}
                          >
                            {o.orderType}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="flex flex-col">
                        <span
                          className="font-semibold text-[var(--admin-text-primary)] truncate max-w-[150px]"
                          title={o.customer || o.shippingAddress?.name || 'User'}
                        >
                          {o.customer || o.shippingAddress?.name || 'User'}
                        </span>
                        <span className="text-[11px] text-[var(--admin-text-tertiary)] mt-0.5 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[12px]">call</span>
                          {o.phone || o.shippingAddress?.phone || 'N/A'}
                        </span>
                        {(o.address || o.shippingAddress?.address) && (
                          <span className="text-[10px] text-[var(--admin-text-secondary)] mt-1.5 flex items-start gap-1 leading-tight max-w-[150px]">
                            <span className="material-symbols-outlined text-[11px] mt-0.5 shrink-0">
                              location_on
                            </span>
                            <span className="truncate whitespace-normal line-clamp-2">
                              {o.address || o.shippingAddress?.address}
                              {o.shippingAddress?.city || o.city
                                ? `, ${o.shippingAddress?.city || o.city}`
                                : ''}
                            </span>
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="hidden md:table-cell max-w-[350px] py-3 pr-4">
                      <div className="flex items-center gap-3 w-full">
                        <div className="flex items-center -space-x-2 shrink-0">
                          {o.items.slice(0, 3).map((item, idx) => {
                            const imgSrc =
                              item.image ||
                              item.images?.[0] ||
                              item.thumbnail ||
                              'https://placehold.co/100x100/f3f4f6/a1a1aa?text=Image';
                            return (
                              <img
                                key={idx}
                                src={imgSrc}
                                alt={item.name}
                                className="w-8 h-8 rounded-full object-cover border-2 border-white shadow-sm bg-gray-100 relative"
                                style={{ zIndex: 10 - idx }}
                              />
                            );
                          })}
                          {o.items.length > 3 && (
                            <div className="w-8 h-8 rounded-full bg-[var(--admin-surface-muted)] border-2 border-white shadow-sm flex items-center justify-center text-[10px] font-black text-[var(--admin-text-primary)] relative z-0">
                              +{o.items.length - 3}
                            </div>
                          )}
                        </div>
                        <span
                          className="text-[12.5px] font-medium text-[var(--admin-text-secondary)] leading-snug line-clamp-2"
                          title={o.items
                            .map((i) => `${i.name} (x${i.qty || i.quantity || 1})`)
                            .join(', ')}
                        >
                          {o.items
                            .map((i) => `${i.name} (x${i.qty || i.quantity || 1})`)
                            .join(', ')}
                        </span>
                      </div>
                    </td>
                    <td className="font-bold text-[var(--admin-text-primary)]">
                      <div className="flex flex-col items-start">
                        <span>{formatCurrency(o.total)}</span>
                        {isVip && (
                          <span className="admin-badge admin-badge-neutral text-[8px] mt-1 p-0.5 px-1 font-extrabold uppercase bg-[var(--admin-surface-muted)]">
                            VIP Collection
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="hidden sm:table-cell">
                      <span className="admin-badge admin-badge-neutral uppercase text-[9px] tracking-wider font-bold">
                        {o.payment}
                      </span>
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <select
                        value={o.status}
                        onChange={(e) => updateOrderStatus(o.id, e.target.value)}
                        className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-1 rounded-[var(--admin-radius-sm)] border border-[var(--admin-border-strong)] bg-white/80 backdrop-blur-sm text-[var(--admin-text-primary)] cursor-pointer outline-none shadow-sm"
                      >
                        {allStatuses.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="hidden lg:table-cell text-[var(--admin-text-secondary)]">
                      {o.date}
                    </td>
                    <td>
                      {o.needByDate ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-[var(--admin-radius-sm)] bg-[var(--admin-info-light)] text-[var(--admin-info)] border border-[var(--admin-info-border)] text-[10px] font-bold uppercase tracking-wider">
                          <span className="material-symbols-outlined text-[12px]">
                            calendar_today
                          </span>
                          {new Date(o.needByDate).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </span>
                      ) : (
                        <span className="text-[var(--admin-text-tertiary)]">—</span>
                      )}
                    </td>
                    <td className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openOrderDrawer(o)}
                          className="admin-btn-icon w-8 h-8 p-0 min-h-0 text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)]"
                          title="Quick Details"
                        >
                          <span className="material-symbols-outlined text-[16px]">visibility</span>
                        </button>
                        <button
                          onClick={() => navigate(`/admin/orders/${o.id}`)}
                          className="admin-btn-icon w-8 h-8 p-0 min-h-0 text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)]"
                          title="Full Invoice"
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            receipt_long
                          </span>
                        </button>
                        <a
                          href={`${EXTERNAL_URLS.WHATSAPP_BASE}/${o.phone.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="admin-btn-icon w-8 h-8 p-0 min-h-0 text-[var(--admin-text-tertiary)] hover:text-[var(--admin-success)]"
                          title="WhatsApp"
                        >
                          <WhatsAppIcon className="w-[16px] h-[16px]" />
                        </a>
                        {['Cancelled', 'Returned', 'Refunded', 'Exchanged', 'Delivered'].includes(
                          o.status,
                        ) && (
                          <button
                            onClick={() => setOrderToDelete(o)}
                            className="admin-btn-icon w-8 h-8 p-0 min-h-0 text-[var(--admin-text-tertiary)] hover:text-[var(--admin-error)] hover:bg-[var(--admin-error-light)]"
                            title="Move to Recycle Bin"
                          >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex md:hidden flex-col gap-3 px-1 py-3">
        {filteredOrders.length === 0 ? (
          <div className="py-10 text-center flex flex-col items-center justify-center bg-[var(--admin-surface)] rounded-[var(--admin-radius-lg)]">
            <EmptyState
              icon={searchQuery || filterStatus !== 'All' ? 'search_off' : 'shopping_bag'}
              title={searchQuery || filterStatus !== 'All' ? 'No Matches Found' : 'No Orders Yet'}
              description={
                searchQuery || filterStatus !== 'All'
                  ? 'No orders match the search or filter criteria.'
                  : "You haven't received any orders yet."
              }
              action={
                searchQuery || filterStatus !== 'All' ? (
                  <button
                    onClick={() => setFilterStatus('All')}
                    className="admin-btn admin-btn-outline"
                  >
                    Clear Filters
                  </button>
                ) : (
                  <button
                    onClick={() => window.location.reload()}
                    className="admin-btn admin-btn-outline"
                  >
                    <span className="material-symbols-outlined text-[16px]">refresh</span>
                    Refresh Page
                  </button>
                )
              }
            />
          </div>
        ) : (
          filteredOrders.map((o) => {
            const isNew = o.date && o.date.includes('Today');
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
                    {o.customer || o.shippingAddress?.name || 'User'}
                  </span>
                  <div className="flex items-center gap-1.5 text-[12px] font-medium">
                    <span className="material-symbols-outlined text-[15px]">call</span>
                    {(o.phone || o.shippingAddress?.phone || 'N/A').replace('+91', '').trim()}
                  </div>
                </div>

                <div className="flex items-start gap-1.5 mb-4 text-gray-800">
                  <span className="material-symbols-outlined text-[15px] mt-0.5 shrink-0">
                    location_on
                  </span>
                  <span className="text-[11px] leading-snug line-clamp-2">
                    {o.address || o.shippingAddress?.address || 'Address not provided'}
                  </span>
                </div>

                <div className="border-y border-black/5 py-3 mb-4">
                  <div className="flex items-start gap-3">
                    <div className="flex items-center -space-x-1 shrink-0">
                      {o.items.slice(0, 3).map((item, idx) => {
                        const imgSrc =
                          item.image || item.images?.[0] || item.thumbnail || '/placeholder.png';
                        return (
                          <img
                            key={idx}
                            src={imgSrc}
                            alt=""
                            className="w-[34px] h-[34px] rounded-md object-cover border border-white shadow-sm bg-gray-100 z-10"
                            style={{ zIndex: 3 - idx }}
                          />
                        );
                      })}
                      {o.items.length > 3 && (
                        <div className="w-[34px] h-[34px] rounded-md bg-gray-200 border border-white shadow-sm flex items-center justify-center text-[9px] font-bold z-0">
                          +{o.items.length - 3}
                        </div>
                      )}
                    </div>
                    <span className="text-[11px] text-gray-800 leading-snug line-clamp-2 mt-0.5">
                      {o.items.map((i) => `${i.name} (x${i.qty || i.quantity || 1})`).join(', ')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-auto pt-1">
                  <span className="text-[15px] font-bold text-gray-900">
                    {o.total >= 1000 ? `₹${(o.total / 1000).toFixed(1)}K` : formatCurrency(o.total)}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-[4px] bg-[var(--admin-bg)] border border-[var(--admin-border)] text-gray-800 shadow-sm">
                      {o.payment || 'COD PENDING'}
                    </span>

                    <button
                      className="text-gray-700 hover:text-red-600 transition-colors ml-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOrderToDelete(o);
                      }}
                      title="Delete Order"
                    >
                      <span className="material-symbols-outlined text-[20px]">delete</span>
                    </button>

                    <button
                      className="text-gray-700 hover:text-black transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        openOrderDrawer(o);
                      }}
                    >
                      <span className="material-symbols-outlined text-[20px]">visibility</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <DeleteConfirmModal
        isOpen={!!orderToDelete}
        onClose={() => setOrderToDelete(null)}
        onConfirm={handleDelete}
        title="Move Order to Recycle Bin"
        productTitle={
          orderToDelete
            ? `Order #${orderToDelete.id.substring(orderToDelete.id.length - 8).toUpperCase()}`
            : ''
        }
        message="This order will be moved to the Recycle Bin. You can restore it within the retention period or permanently delete it."
        confirmText="Move to Recycle Bin"
        isRecycleBinAction={true}
      />
    </>
  );
}
