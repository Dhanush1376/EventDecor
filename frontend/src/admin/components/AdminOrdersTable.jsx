import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AdminStatusPill,
  AdminStatusDropdown,
  AdminPaymentBadge,
  EmptyState,
  formatCurrency,
  smoothScrollCardIntoView,
} from './AdminUIKit';
import { EXTERNAL_URLS } from '../../config/constants';
import { WhatsAppIcon } from '../../components/ui/WhatsAppIcon';
import { InvoiceTemplate } from '../../components/ui';
import { DeleteConfirmModal } from './ui/DeleteConfirmModal';

const formatDateDMY = (dateStr) => {
  if (!dateStr) return 'N/A';
  if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split('-');
    return `${d}-${m}-${y}`;
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

export function AdminOrdersTable({
  filteredOrders,
  searchQuery,
  filterStatus,
  setFilterStatus,
  onResetFilters,
  openOrderDrawer,
  navigate,
  updateOrderStatus,
  deleteOrder,
  allStatuses = [],
}) {
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [invoiceOrder, setInvoiceOrder] = useState(null);
  const [expandedCardIds, setExpandedCardIds] = useState(new Set());
  const [updatingStatusId, setUpdatingStatusId] = useState(null);

  const toggleExpandCard = (id) => {
    setExpandedCardIds((prev) => {
      const next = new Set(prev);
      const isExpanding = !next.has(id);
      if (isExpanding) {
        next.add(id);
        smoothScrollCardIntoView(`order-card-${id}`);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const handleDelete = async () => {
    if (!orderToDelete) return;
    const success = await deleteOrder(orderToDelete.id);
    if (success) {
      setOrderToDelete(null);
    }
  };

  const handleApproveOrder = async (o) => {
    try {
      setUpdatingStatusId(o.id);
      await updateOrderStatus(o.id, 'Confirmed');
    } catch (_err) {
      // Error toast is handled by updateOrderStatus
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleCancelOrder = async (o) => {
    try {
      setUpdatingStatusId(o.id);
      await updateOrderStatus(o.id, 'Cancelled');
    } catch (_err) {
      // Error toast is handled by updateOrderStatus
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleStatusChange = async (o, newStatus) => {
    try {
      setUpdatingStatusId(o.id);
      await updateOrderStatus(o.id, newStatus);
    } catch (_err) {
      // Error toast is handled by updateOrderStatus
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const getOrderCardStyle = (o) => {
    const s = (o.status || '').toLowerCase();
    if (s === 'delivered' || s === 'settled') {
      return 'border border-emerald-500/40 bg-gradient-to-r from-emerald-500/[0.035] via-emerald-500/[0.01] to-white dark:to-[#26241f] hover:border-emerald-500/60 shadow-xs';
    }
    if (s === 'cancelled' || s === 'rejected') {
      return 'border border-rose-500/40 bg-gradient-to-r from-rose-500/[0.035] via-rose-500/[0.01] to-white dark:to-[#26241f] hover:border-rose-500/60 shadow-xs';
    }
    if (s === 'processing' || s === 'confirmed' || s === 'shipped') {
      return 'border border-blue-500/40 bg-gradient-to-r from-blue-500/[0.035] via-blue-500/[0.01] to-white dark:to-[#26241f] hover:border-blue-500/60 shadow-xs';
    }
    return 'border border-amber-500/40 bg-gradient-to-r from-amber-500/[0.045] via-amber-500/[0.015] to-white dark:to-[#26241f] hover:border-amber-500/60 shadow-xs';
  };

  return (
    <>
      <div className="hidden md:block admin-card overflow-x-auto">
        <table className="admin-table admin-table-compact admin-orders-table w-full">
          <thead>
            <tr>
              <th className="whitespace-nowrap w-[120px]">Order ID</th>
              <th className="whitespace-nowrap min-w-[120px]">Customer</th>
              <th className="hidden md:table-cell whitespace-nowrap w-[145px]">Items</th>
              <th className="whitespace-nowrap w-[95px]">Total</th>
              <th className="hidden sm:table-cell whitespace-nowrap w-[85px]">Payment</th>
              <th className="whitespace-nowrap w-[140px]">Status</th>
              <th className="hidden lg:table-cell whitespace-nowrap w-[105px]">Date</th>
              <th className="whitespace-nowrap w-[115px]">Required By</th>
              <th className="text-right whitespace-nowrap w-[115px]">Actions</th>
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
                          onClick={() => {
                            if (onResetFilters) onResetFilters();
                            else setFilterStatus('All');
                          }}
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

                const method = o.rawOrder?.paymentMethod || o.paymentMethod || o.payment || '';
                const paymentStatus =
                  o.rawOrder?.paymentStatus || o.paymentStatus || o.payment || '';
                const settlementStatus =
                  o.rawOrder?.settlementStatus || o.settlementStatus || 'Not Applicable';
                const razorpayPaymentId = o.rawOrder?.razorpayPaymentId || o.razorpayPaymentId;
                const orderStatus = o.status || o.rawOrder?.orderStatus || '';

                const isCod =
                  method.toLowerCase().includes('cod') ||
                  method.toLowerCase().includes('cash') ||
                  paymentStatus.toLowerCase().includes('cod');

                const isReturned =
                  ['Returned', 'returned', 'return_received', 'return_completed'].includes(
                    orderStatus,
                  ) || ['Returned', 'returned'].includes(paymentStatus);

                const isCancelled =
                  ['Cancelled', 'cancelled', 'rejected'].includes(orderStatus) ||
                  ['Cancelled', 'cancelled'].includes(paymentStatus);

                const isRefunded =
                  ['Refunded', 'refunded'].includes(orderStatus) ||
                  ['Refunded', 'refunded'].includes(paymentStatus);

                const isOnlinePaid =
                  !isCod && (Boolean(razorpayPaymentId) || paymentStatus.toLowerCase() === 'paid');

                const isCodSettled =
                  isCod && (settlementStatus === 'Settled' || orderStatus === 'Settled');

                const isCodCollected =
                  isCod &&
                  (paymentStatus === 'COD Collected' || orderStatus === 'Delivered') &&
                  !isCodSettled;

                const isPaid =
                  (isOnlinePaid || isCodSettled) && !isReturned && !isCancelled && !isRefunded;

                const paymentBorderClass = isRefunded
                  ? 'border-l-[3px] border-l-purple-500'
                  : isReturned
                    ? 'border-l-[3px] border-l-purple-500'
                    : isCancelled
                      ? 'border-l-[3px] border-l-rose-500'
                      : isPaid
                        ? 'border-l-[3px] border-l-emerald-500'
                        : isCodCollected
                          ? 'border-l-[3px] border-l-sky-500'
                          : ['pending', 'pending cod', 'cod pending'].includes(
                                paymentStatus.toLowerCase(),
                              )
                            ? 'border-l-[3px] border-l-amber-500'
                            : 'border-l-[3px] border-l-rose-500';

                return (
                  <tr
                    key={o.id}
                    className={`admin-table-row-clickable group transition-colors ${paymentBorderClass}`}
                    onClick={() => openOrderDrawer(o)}
                  >
                    <td>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 font-mono text-[12px] font-semibold text-[var(--admin-text-secondary)]">
                          #{o.orderCode || o.id.substring(o.id.length - 8).toUpperCase()}
                          {isNew && (
                            <span
                              className="w-1.5 h-1.5 rounded-full bg-[var(--admin-accent)] animate-ping"
                              title="Recent order"
                            />
                          )}
                        </div>
                        {o.orderType && o.orderType !== 'purchase' && (
                          <span
                            className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded w-max border ${
                              o.orderType === 'rental'
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-200/70 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800'
                                : 'bg-purple-50 text-purple-700 border-purple-200/70 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800'
                            }`}
                          >
                            {o.orderType}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="min-w-[120px] max-w-[150px]">
                      <div className="flex flex-col">
                        <span
                          className="font-semibold text-[var(--admin-text-primary)] truncate max-w-[140px] text-[13px]"
                          title={o.customer || o.shippingAddress?.name || 'User'}
                        >
                          {o.customer || o.shippingAddress?.name || 'User'}
                        </span>
                        <span className="text-[11px] text-[var(--admin-text-tertiary)] mt-0.5 flex items-center gap-1.5 truncate">
                          <span className="w-3.5 flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-[13px]">call</span>
                          </span>
                          <span className="truncate">
                            {o.phone || o.shippingAddress?.phone || 'N/A'}
                          </span>
                        </span>
                        {(o.address || o.shippingAddress?.address) && (
                          <span className="text-[11px] text-[var(--admin-text-secondary)] mt-0.5 flex items-center gap-1.5 leading-tight max-w-[140px]">
                            <span className="w-3.5 flex items-center justify-center shrink-0">
                              <span className="material-symbols-outlined text-[13px]">
                                location_on
                              </span>
                            </span>
                            <span className="truncate whitespace-normal line-clamp-1">
                              {o.shippingAddress?.city ||
                                o.city ||
                                o.address ||
                                o.shippingAddress?.address}
                            </span>
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="hidden md:table-cell w-[145px] max-w-[150px] py-2.5">
                      <div className="flex items-center gap-2 w-full overflow-hidden">
                        <div className="flex items-center -space-x-2 shrink-0">
                          {o.items.slice(0, 2).map((item, idx) => {
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
                                className="w-9 h-9 rounded-[6px] object-cover border border-white dark:border-stone-800 shadow-xs bg-stone-100 dark:bg-stone-800 relative shrink-0"
                                style={{ zIndex: 10 - idx }}
                                onError={(e) => {
                                  e.target.src =
                                    'https://placehold.co/100x100/f3f4f6/a1a1aa?text=Image';
                                }}
                              />
                            );
                          })}
                          {o.items.length > 2 && (
                            <div className="w-9 h-9 rounded-[6px] bg-[var(--admin-surface-muted)] border border-white dark:border-stone-800 shadow-xs flex items-center justify-center text-[10px] font-black text-[var(--admin-text-primary)] relative z-0 shrink-0">
                              +{o.items.length - 2}
                            </div>
                          )}
                        </div>
                        <span
                          className="text-[12px] font-medium text-[var(--admin-text-secondary)] leading-tight truncate max-w-[85px]"
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
                    <td className="font-bold text-[var(--admin-text-primary)] whitespace-nowrap">
                      <div className="flex flex-col items-start">
                        <span>{formatCurrency(o.total)}</span>
                        {isVip && (
                          <span className="admin-badge admin-badge-neutral text-[8px] mt-0.5 p-0.5 px-1 font-extrabold uppercase bg-[var(--admin-surface-muted)]">
                            VIP
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="hidden sm:table-cell whitespace-nowrap">
                      <AdminPaymentBadge
                        isPaid={isPaid}
                        method={method}
                        status={paymentStatus}
                        orderStatus={orderStatus}
                        settlementStatus={settlementStatus}
                        razorpayPaymentId={razorpayPaymentId}
                      />
                    </td>
                    <td
                      className="w-[150px] whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <AdminStatusDropdown
                        status={o.status}
                        options={allStatuses}
                        onChange={(newStatus) => handleStatusChange(o, newStatus)}
                        loading={updatingStatusId === o.id}
                      />
                    </td>
                    <td className="hidden lg:table-cell text-[var(--admin-text-secondary)] text-[12px] whitespace-nowrap w-[105px]">
                      {formatDateDMY(o.date)}
                    </td>
                    <td className="whitespace-nowrap w-[115px]">
                      {o.needByDate ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[4px] bg-[var(--admin-info-light)] text-[var(--admin-info)] border border-[var(--admin-info-border)] text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">
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
                    <td
                      className="text-right whitespace-nowrap w-[115px]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-1 w-[104px] ml-auto">
                        <button
                          type="button"
                          onClick={() => openOrderDrawer(o)}
                          className="admin-btn-icon w-8 h-8 min-w-[32px] max-w-[32px] min-h-[32px] max-h-[32px] p-0 !rounded-[4px] text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)] hover:bg-[var(--admin-bg-subtle)] transition-colors flex items-center justify-center shrink-0 cursor-pointer"
                          title="Quick Details"
                        >
                          <span className="material-symbols-outlined text-[17px]">visibility</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setInvoiceOrder(o.rawOrder || o)}
                          className="admin-btn-icon w-8 h-8 min-w-[32px] max-w-[32px] min-h-[32px] max-h-[32px] p-0 !rounded-[4px] text-[var(--admin-text-tertiary)] hover:text-[var(--admin-accent)] hover:bg-[var(--admin-bg-subtle)] transition-colors flex items-center justify-center shrink-0 cursor-pointer"
                          title="View Invoice"
                        >
                          <span className="material-symbols-outlined text-[17px]">
                            receipt_long
                          </span>
                        </button>
                        {['Cancelled', 'Returned', 'Refunded', 'Exchanged', 'Delivered'].includes(
                          o.status,
                        ) ? (
                          <button
                            type="button"
                            onClick={() => setOrderToDelete(o)}
                            className="admin-btn-icon w-8 h-8 min-w-[32px] max-w-[32px] min-h-[32px] max-h-[32px] p-0 !rounded-[4px] text-[var(--admin-text-tertiary)] hover:text-[var(--admin-error)] hover:bg-[var(--admin-error-light)] transition-colors flex items-center justify-center shrink-0 cursor-pointer"
                            title="Move to Recycle Bin"
                          >
                            <span className="material-symbols-outlined text-[17px]">delete</span>
                          </button>
                        ) : (
                          <div
                            className="w-8 h-8 min-w-[32px] max-w-[32px] min-h-[32px] max-h-[32px] shrink-0 pointer-events-none"
                            aria-hidden="true"
                          />
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

      {/* Mobile Cards View */}
      <div className="flex md:hidden flex-col gap-3 px-0.5 py-1 pb-12">
        {filteredOrders.length === 0 ? (
          <div className="py-10 text-center flex flex-col items-center justify-center bg-[var(--admin-surface)] rounded-[var(--admin-radius-lg)] border border-[var(--admin-border)]">
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
                    onClick={() => {
                      if (onResetFilters) onResetFilters();
                      else setFilterStatus('All');
                    }}
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
            const isExpanded = expandedCardIds.has(o.id);
            const isVip = o.total >= 15000;
            const firstItem = o.items?.[0] || {};
            const firstImg =
              firstItem.image || firstItem.images?.[0] || firstItem.thumbnail || '/placeholder.png';
            const method = o.rawOrder?.paymentMethod || o.paymentMethod || o.payment || '';
            const paymentStatus = o.rawOrder?.paymentStatus || o.paymentStatus || o.payment || '';
            const settlementStatus =
              o.rawOrder?.settlementStatus || o.settlementStatus || 'Not Applicable';
            const razorpayPaymentId = o.rawOrder?.razorpayPaymentId || o.razorpayPaymentId;
            const orderStatus = o.status || o.rawOrder?.orderStatus || '';

            const isCod =
              method.toLowerCase().includes('cod') ||
              method.toLowerCase().includes('cash') ||
              paymentStatus.toLowerCase().includes('cod');

            const isReturned =
              ['Returned', 'returned', 'return_received', 'return_completed'].includes(
                orderStatus,
              ) || ['Returned', 'returned'].includes(paymentStatus);

            const isCancelled =
              ['Cancelled', 'cancelled', 'rejected'].includes(orderStatus) ||
              ['Cancelled', 'cancelled'].includes(paymentStatus);

            const isRefunded =
              ['Refunded', 'refunded'].includes(orderStatus) ||
              ['Refunded', 'refunded'].includes(paymentStatus);

            const isOnlinePaid =
              !isCod && (Boolean(razorpayPaymentId) || paymentStatus.toLowerCase() === 'paid');

            const isCodSettled =
              isCod && (settlementStatus === 'Settled' || orderStatus === 'Settled');

            const isPaid =
              (isOnlinePaid || isCodSettled) && !isReturned && !isCancelled && !isRefunded;

            return (
              <div
                key={o.id}
                id={`order-card-${o.id}`}
                onClick={() => openOrderDrawer(o)}
                className={`relative overflow-hidden rounded-[4px] p-3.5 flex flex-col gap-3 cursor-pointer transition-all ${getOrderCardStyle(
                  o,
                )}`}
              >
                {/* Header: Customer Name + Status Pill, with subtle faded Order ID & Tag */}
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-[var(--admin-text-primary)] text-[14px] truncate leading-tight">
                        {o.customer || o.shippingAddress?.name || 'Customer'}
                      </span>
                      {isVip && (
                        <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200 uppercase shrink-0">
                          VIP
                        </span>
                      )}
                      {isNew && (
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-[var(--admin-accent)] animate-ping shrink-0"
                          title="Recent order"
                        />
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <span className="font-mono text-[11px] font-medium text-[var(--admin-text-tertiary)] dark:text-stone-400">
                        #{o.orderCode || o.id.substring(o.id.length - 8).toUpperCase()}
                      </span>
                      {o.orderType && o.orderType !== 'purchase' && (
                        <span
                          className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded border shrink-0 ${
                            o.orderType === 'rental'
                              ? 'bg-indigo-50/80 text-indigo-700 border-indigo-200/80 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800'
                              : 'bg-purple-50/80 text-purple-700 border-purple-200/80 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800'
                          }`}
                        >
                          {o.orderType}
                        </span>
                      )}
                    </div>
                  </div>
                  <AdminStatusPill status={o.status} className="shrink-0" />
                </div>

                {/* Product Item Box */}
                <div className="bg-[#FAF9F5] dark:bg-stone-800/60 p-2.5 rounded-[4px] border border-stone-200/80 dark:border-stone-700/60 flex items-center gap-2.5">
                  <img
                    src={firstImg}
                    alt=""
                    className="w-11 h-11 rounded-[4px] object-cover border border-stone-200 bg-white shrink-0 shadow-2xs"
                    loading="lazy"
                    onError={(e) => {
                      e.target.src = '/placeholder.png';
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[9px] font-extrabold text-amber-700 uppercase tracking-wider block leading-tight">
                        ORDER ITEM
                      </span>
                      {o.items?.length > 1 && (
                        <span className="text-[9px] font-bold text-stone-500 bg-white dark:bg-stone-700 px-1.5 py-0.5 rounded border border-stone-200 dark:border-stone-600 shrink-0">
                          +{o.items.length - 1} more
                        </span>
                      )}
                    </div>
                    <p
                      className="text-[12px] font-bold text-[var(--admin-text-primary)] truncate mt-0.5"
                      title={firstItem.name}
                    >
                      {firstItem.name || 'Order Item'}
                      <span className="ml-1 text-[var(--admin-text-secondary)] font-medium">
                        (x{firstItem.qty || firstItem.quantity || 1})
                      </span>
                    </p>
                    {o.needByDate ? (
                      <span className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold truncate block mt-0.5 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px]">
                          calendar_today
                        </span>
                        Required by{' '}
                        {new Date(o.needByDate).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </span>
                    ) : (
                      <span className="text-[10px] text-stone-500 dark:text-stone-400 truncate block mt-0.5">
                        {o.items?.length || 1} item{o.items?.length > 1 ? 's' : ''} in this order
                      </span>
                    )}
                  </div>
                </div>

                {/* Financial Total & Payment Strip */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5 text-xs">
                  <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                    <span className="text-[11px] text-[var(--admin-text-secondary)] font-medium">
                      Total:
                    </span>
                    <span className="font-extrabold text-[var(--admin-text-primary)] text-[13px] whitespace-nowrap">
                      {formatCurrency(o.total)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                    <AdminPaymentBadge
                      isPaid={isPaid}
                      method={method}
                      status={paymentStatus}
                      orderStatus={orderStatus}
                      settlementStatus={settlementStatus}
                      razorpayPaymentId={razorpayPaymentId}
                    />
                  </div>
                </div>

                {/* Status Action Section:
                    - When Pending: show APPROVE ORDER & CANCEL buttons + Details toggle
                    - When Confirmed/other: Symmetrical 2-column grid (36px height, 50% width each)
                */}
                {o.status === 'Pending' ? (
                  <div
                    className="flex items-center justify-between pt-2 border-t border-stone-200/70 dark:border-stone-700/60 gap-2 w-full"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      {/* APPROVE ORDER Button (Emerald with 4px radius) */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApproveOrder(o);
                        }}
                        disabled={updatingStatusId === o.id}
                        className="flex-1 min-w-0 h-9 rounded-[4px] bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-[10.5px] sm:text-[11px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 px-3 shadow-2xs cursor-pointer border-0 disabled:opacity-50"
                      >
                        {updatingStatusId === o.id ? (
                          <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                        ) : (
                          <span className="material-symbols-outlined text-[16px] shrink-0">
                            check_circle
                          </span>
                        )}
                        <span className="truncate">Approve Order</span>
                      </button>

                      {/* CANCEL Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCancelOrder(o);
                        }}
                        disabled={updatingStatusId === o.id}
                        className="h-9 px-3 rounded-[4px] border border-red-200 text-red-700 bg-white hover:bg-red-50 active:scale-95 text-[10.5px] sm:text-[11px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer shadow-2xs shrink-0 disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-[16px] text-red-600">
                          cancel
                        </span>
                        <span>Cancel</span>
                      </button>
                    </div>

                    {/* Details Toggle Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpandCard(o.id);
                      }}
                      className={`h-9 px-2.5 rounded-[4px] border text-[11px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer shadow-2xs shrink-0 ${
                        isExpanded
                          ? 'border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200'
                          : 'border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-50'
                      }`}
                      title="Toggle Order Details"
                    >
                      <span>{isExpanded ? 'Hide' : 'Details'}</span>
                      <span className="material-symbols-outlined text-[16px] shrink-0 text-stone-500">
                        {isExpanded ? 'expand_less' : 'expand_more'}
                      </span>
                    </button>
                  </div>
                ) : (
                  <div
                    className="flex items-center gap-2 pt-2 border-t border-stone-200/70 dark:border-stone-700/60 w-full"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="text-[10px] uppercase font-bold text-stone-500 dark:text-stone-400 shrink-0">
                      Status:
                    </span>

                    {/* Symmetrical 2-Column Grid: Exact Equal Width & Height for both Status Dropdown and Details Button */}
                    <div className="grid grid-cols-2 gap-2 flex-1 min-w-0">
                      {/* Box 1: Status Dropdown */}
                      <div className="relative w-full h-9">
                        <select
                          value={o.status || 'Confirmed'}
                          onChange={(e) => handleStatusChange(o, e.target.value)}
                          disabled={updatingStatusId === o.id}
                          style={{ backgroundImage: 'none' }}
                          className="admin-no-arrow w-full h-9 !min-h-[36px] !max-h-[36px] !appearance-none !bg-none bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-750 border border-stone-300 dark:border-stone-600 text-stone-800 dark:text-stone-200 text-[11px] font-bold rounded-[4px] pl-2.5 pr-7 cursor-pointer shadow-2xs outline-none focus:border-amber-500 transition-colors disabled:opacity-50 truncate"
                        >
                          {allStatuses.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-stone-500">
                          {updatingStatusId === o.id ? (
                            <span className="w-3.5 h-3.5 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <span className="material-symbols-outlined text-[16px]">
                              expand_more
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Box 2: Details Toggle Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpandCard(o.id);
                        }}
                        className={`w-full h-9 !min-h-[36px] !max-h-[36px] rounded-[4px] border text-[11px] font-bold flex items-center justify-between px-2.5 transition-colors cursor-pointer shadow-2xs ${
                          isExpanded
                            ? 'border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200'
                            : 'border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-50'
                        }`}
                        title="Toggle Order Details"
                      >
                        <span className="truncate">{isExpanded ? 'Hide' : 'Details'}</span>
                        <span className="material-symbols-outlined text-[16px] shrink-0 text-stone-500">
                          {isExpanded ? 'expand_less' : 'expand_more'}
                        </span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Expandable Details Panel */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      key={`expanded-${o.id}`}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
                      <div
                        className="pt-2 border-t border-dashed border-stone-200 dark:border-stone-700 flex flex-col gap-2 text-xs"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Customer Contact: Equally aligned 2-column grid matching controls sideways */}
                        <div className="grid grid-cols-2 gap-2 items-center text-[11px] text-stone-600 dark:text-stone-300 bg-stone-50 dark:bg-stone-800/50 px-2.5 py-2 rounded-[4px] border border-stone-200/60 dark:border-stone-700/60">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="material-symbols-outlined !text-[15px] !leading-none text-stone-400 shrink-0 select-none">
                              call
                            </span>
                            <a
                              href={`tel:${o.phone || o.shippingAddress?.phone || ''}`}
                              className="font-semibold text-stone-800 dark:text-stone-200 hover:underline truncate leading-tight inline-flex items-center"
                            >
                              {(o.phone || o.shippingAddress?.phone || 'No phone')
                                .replace('+91', '')
                                .trim()}
                            </a>
                          </div>
                          <div className="flex items-center gap-1.5 min-w-0">
                            <WhatsAppIcon className="w-3.5 h-3.5 shrink-0 text-[#25D366]" />
                            <a
                              href={`${EXTERNAL_URLS.WHATSAPP_BASE}/${(o.phone || o.shippingAddress?.phone || '').replace(/[^0-9]/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium text-emerald-700 dark:text-emerald-400 hover:underline truncate leading-tight inline-flex items-center"
                            >
                              WhatsApp
                            </a>
                          </div>
                        </div>

                        {/* Delivery Address */}
                        {(o.address || o.shippingAddress?.address) && (
                          <div className="text-[11px] bg-stone-50 dark:bg-stone-800 p-2 rounded-[4px] border border-stone-200/70 dark:border-stone-700/70 flex items-start gap-1.5">
                            <span className="material-symbols-outlined text-[14px] mt-0.5 text-stone-400 shrink-0">
                              location_on
                            </span>
                            <div className="text-stone-700 dark:text-stone-300 leading-snug">
                              <span className="font-bold text-stone-900 dark:text-stone-100">
                                Address:
                              </span>{' '}
                              {o.address || o.shippingAddress?.address}
                              {o.shippingAddress?.city || o.city
                                ? `, ${o.shippingAddress?.city || o.city}`
                                : ''}
                            </div>
                          </div>
                        )}

                        {/* Order Items List (if multiple) */}
                        {o.items?.length > 1 && (
                          <div className="bg-stone-50 dark:bg-stone-800/60 p-2 rounded-[4px] border border-stone-200/60 dark:border-stone-700/60 flex flex-col gap-1 text-[10.5px]">
                            <span className="font-bold text-stone-500 uppercase tracking-wider text-[9px]">
                              All Items ({o.items.length})
                            </span>
                            {o.items.map((it, i) => (
                              <div key={i} className="flex justify-between items-center py-0.5">
                                <span className="truncate text-stone-800 dark:text-stone-200 font-medium max-w-[200px]">
                                  {it.name}{' '}
                                  <span className="text-stone-400">
                                    x{it.qty || it.quantity || 1}
                                  </span>
                                </span>
                                <span className="font-bold text-stone-700 dark:text-stone-300 shrink-0">
                                  {it.price
                                    ? formatCurrency(it.price * (it.qty || it.quantity || 1))
                                    : ''}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Dates & Actions Strip */}
                        <div className="pt-2.5 border-t border-stone-200/80 dark:border-stone-700/80 space-y-2.5">
                          {/* Date & Meta Row */}
                          <div className="flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400 px-0.5">
                            <span className="flex items-center gap-1.5 font-medium">
                              <span className="material-symbols-outlined text-[14px] text-stone-400">
                                schedule
                              </span>
                              Placed on{' '}
                              <strong className="text-stone-800 dark:text-stone-200 font-semibold">
                                {formatDateDMY(o.date)}
                              </strong>
                            </span>
                            {o.needByDate && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[4px] bg-[var(--admin-info-light)] text-[var(--admin-info)] border border-[var(--admin-info-border)] text-[9.5px] font-bold uppercase tracking-wider">
                                <span className="material-symbols-outlined text-[11px]">
                                  calendar_today
                                </span>
                                {new Date(o.needByDate).toLocaleDateString('en-IN', {
                                  day: 'numeric',
                                  month: 'short',
                                })}
                              </span>
                            )}
                          </div>

                          {/* Action Buttons Row */}
                          <div
                            className={`grid gap-2 ${
                              [
                                'Cancelled',
                                'Returned',
                                'Refunded',
                                'Exchanged',
                                'Delivered',
                              ].includes(o.status)
                                ? 'grid-cols-3'
                                : 'grid-cols-2'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openOrderDrawer(o);
                              }}
                              className="h-9 px-2.5 rounded-[4px] border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/90 hover:bg-stone-100 dark:hover:bg-stone-750 text-stone-700 dark:text-stone-200 text-[11.5px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-[0.98]"
                              title="Quick View Details"
                            >
                              <span className="material-symbols-outlined text-[15px] text-stone-500 dark:text-stone-400 shrink-0">
                                visibility
                              </span>
                              <span className="truncate">Quick View</span>
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setInvoiceOrder(o.rawOrder || o);
                              }}
                              className="h-9 px-2.5 rounded-[4px] border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/90 hover:bg-stone-100 dark:hover:bg-stone-750 text-stone-700 dark:text-stone-200 text-[11.5px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-[0.98]"
                              title="View & Download Invoice"
                            >
                              <span className="material-symbols-outlined text-[15px] text-stone-500 dark:text-stone-400 shrink-0">
                                receipt_long
                              </span>
                              <span className="truncate">Invoice</span>
                            </button>

                            {[
                              'Cancelled',
                              'Returned',
                              'Refunded',
                              'Exchanged',
                              'Delivered',
                            ].includes(o.status) && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOrderToDelete(o);
                                }}
                                className="h-9 px-2.5 rounded-[4px] border border-red-200 dark:border-red-900/50 bg-red-50/70 dark:bg-red-950/30 hover:bg-red-100 text-red-600 dark:text-red-400 text-[11.5px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-[0.98]"
                                title="Move to Recycle Bin"
                              >
                                <span className="material-symbols-outlined text-[15px] shrink-0">
                                  delete
                                </span>
                                <span className="truncate">Delete</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>

      {/* Invoice Modal */}
      <AnimatePresence>
        {invoiceOrder && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setInvoiceOrder(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] no-print"
            />
            {/* Modal Container */}
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="invoice-modal-container fixed bottom-0 left-0 right-0 lg:top-0 lg:bottom-0 lg:my-auto lg:h-fit lg:rounded-[6px] mx-auto w-full max-w-[580px] max-h-[92vh] bg-[var(--admin-surface)] rounded-t-[6px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-outline-variant/30 z-[101] overflow-y-auto custom-scrollbar pt-2.5 pb-2 px-3 sm:pt-3 sm:pb-2.5 sm:px-4 print:static print:translate-x-0 print:translate-y-0 print:h-auto print:max-w-none print:shadow-none print:bg-white print:p-0 print:border-none"
            >
              <style type="text/css" media="print">
                {`
                  @page { size: A4 portrait; margin: 10mm; }
                  html, body { 
                    height: 100vh !important; 
                    overflow: hidden !important; 
                    margin: 0 !important; 
                    padding: 0 !important;
                  }
                  body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; background: white !important; }
                  body * { visibility: hidden !important; }
                  .invoice-modal-container {
                    position: fixed !important;
                    left: 0 !important;
                    top: 0 !important;
                    width: 100vw !important;
                    height: 100vh !important;
                    transform: none !important;
                    overflow: hidden !important;
                    background: transparent !important;
                    box-shadow: none !important;
                  }
                  .print-invoice-area, .print-invoice-area * {
                    visibility: visible !important;
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
                  }
                  .print-invoice-area .font-mono {
                    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
                  }
                  .print-invoice-area {
                    position: static !important;
                    width: 540px !important;
                    max-width: 540px !important;
                    margin: 0 auto !important;
                    padding: 16px !important;
                    box-shadow: none !important;
                    border: 1px solid #e5e7eb !important;
                    background: white !important;
                    overflow: visible !important;
                  }
                  .no-print, .no-print * { display: none !important; }
                `}
              </style>
              <InvoiceTemplate
                order={invoiceOrder}
                onClose={() => setInvoiceOrder(null)}
                isAdmin={true}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

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
