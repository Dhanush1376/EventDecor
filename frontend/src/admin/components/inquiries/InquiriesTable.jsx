import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { formatCurrency } from '../AdminUIKit';
import { EXTERNAL_URLS } from '../../../config/constants';
import { WhatsAppIcon } from '../../../components/ui/WhatsAppIcon';
import { customOrderService } from '../../../services/domainServices';
import { getErrorMessage } from '../../../utils/core/errorHelpers';

const ALL_STATUSES = [
  'Pending',
  'Reviewing',
  'Quote Sent',
  'Approved',
  'In Progress',
  'Ready',
  'Delivered',
  'Cancelled',
];

export function InquiriesTable({
  orders = [],
  statusFilter,
  setStatusFilter,
  setSelectedOrder,
  handleUpdatePriority,
  refetchOrders,
  page: _page,
  setPage: _setPage,
  totalPages: _totalPages,
  totalItems = 0,
}) {
  const queryClient = useQueryClient();
  const [updatingStatusId, setUpdatingStatusId] = useState(null);

  const handleStatusChange = async (orderId, newStatus) => {
    setUpdatingStatusId(orderId);
    try {
      const res = await customOrderService.adminUpdateStatus(orderId, newStatus);
      if (res?.success || res?.data) {
        toast.success(`Inquiry status updated to ${newStatus}`);
        refetchOrders?.();
        queryClient.invalidateQueries({ queryKey: ['adminCustomOrders'] });
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update status'));
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleApproveOrder = async (order) => {
    await handleStatusChange(order._id, 'Approved');
  };

  const handleCancelOrder = async (order) => {
    await handleStatusChange(order._id, 'Cancelled');
  };

  const getStatusBadgeStyle = (status) => {
    const s = (status || '').toLowerCase();
    switch (s) {
      case 'approved':
      case 'delivered':
      case 'ready':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800';
      case 'in progress':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:border-indigo-800';
      case 'quote sent':
        return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:border-blue-800';
      case 'reviewing':
        return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:border-purple-800';
      case 'pending':
        return 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800';
      case 'cancelled':
        return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:border-rose-800';
      default:
        return 'bg-stone-50 text-stone-600 border-stone-200 dark:bg-stone-800 dark:border-stone-700';
    }
  };

  return (
    <>
      {/* Desktop Table View */}
      <div className="hidden md:block admin-card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="admin-table admin-table-compact admin-orders-table w-full">
            <thead>
              <tr>
                <th className="whitespace-nowrap w-[230px]" style={{ paddingLeft: '24px' }}>
                  Inquiry ID & Customer
                </th>
                <th className="whitespace-nowrap w-[110px]">Type</th>
                <th className="whitespace-nowrap min-w-[160px]">Occasion & Scope</th>
                <th className="whitespace-nowrap w-[120px]">Event Date</th>
                <th className="whitespace-nowrap w-[100px]">Priority</th>
                <th className="whitespace-nowrap w-[160px]">Status</th>
                <th className="text-right whitespace-nowrap w-[120px]">Total Quote</th>
                <th
                  className="text-right whitespace-nowrap w-[100px]"
                  style={{ paddingRight: '24px' }}
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="p-16 text-center text-[var(--admin-text-secondary)] bg-[var(--admin-surface)]"
                  >
                    <span className="material-symbols-outlined text-[44px] text-[var(--admin-text-tertiary)] mb-2 block">
                      search_off
                    </span>
                    <p className="text-[14px] font-bold text-[var(--admin-text-primary)]">
                      No Inquiries Found
                    </p>
                    <p className="text-[11px] text-[var(--admin-text-secondary)] mt-1 max-w-[280px] mx-auto">
                      No custom orders match your current filter or search criteria.
                    </p>
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  const dateStr = order.eventDate
                    ? new Date(order.eventDate).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    : 'TBD';
                  const customerInitial = (order.customerName || 'C').charAt(0).toUpperCase();
                  const orderCode =
                    order.customOrderNumber || `#${order._id.slice(-6).toUpperCase()}`;

                  return (
                    <tr
                      key={order._id}
                      onClick={() => setSelectedOrder(order)}
                      className="border-b border-[var(--admin-border-subtle)] hover:bg-[var(--admin-surface-muted)] cursor-pointer transition-colors duration-150"
                    >
                      {/* ID & Customer */}
                      <td className="py-3 pl-6 pr-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[var(--admin-bg-subtle)] border border-[var(--admin-border-subtle)] text-[var(--admin-accent)] flex items-center justify-center font-bold text-[12px] shrink-0">
                            {customerInitial}
                          </div>
                          <div className="min-w-0">
                            <span className="text-[11px] font-mono font-bold text-[var(--admin-accent)] block">
                              {orderCode}
                            </span>
                            <p className="font-bold text-[var(--admin-text-primary)] text-[13px] truncate">
                              {order.customerName || 'Customer'}
                            </p>
                            <span className="text-[11px] text-[var(--admin-text-secondary)] block truncate">
                              {order.customerPhone || order.customerEmail || 'No contact'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Type Badge */}
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-[4px] text-[10px] font-bold uppercase tracking-wider border ${
                            order.customOrderType === 'product'
                              ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:border-blue-800'
                              : order.customOrderType === 'event'
                                ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:border-purple-800'
                                : 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800'
                          }`}
                        >
                          {order.customOrderType || 'Custom'}
                        </span>
                      </td>

                      {/* Occasion & Scope */}
                      <td className="py-3 px-4 text-[12px]">
                        <div className="font-bold text-[var(--admin-text-primary)] text-[12px] truncate max-w-[200px]">
                          {order.occasion || 'Special Request'}
                        </div>
                        <div className="text-[11px] text-[var(--admin-text-secondary)] truncate max-w-[200px]">
                          {order.productSnapshot?.title ||
                            order.productType ||
                            'Bespoke Decor Setup'}
                        </div>
                      </td>

                      {/* Event Date */}
                      <td className="py-3 px-4 text-[12px] whitespace-nowrap">
                        <span className="flex items-center gap-1 text-[var(--admin-text-secondary)] font-medium">
                          <span className="material-symbols-outlined text-[15px] text-[var(--admin-text-tertiary)]">
                            calendar_today
                          </span>
                          {dateStr}
                        </span>
                      </td>

                      {/* Priority */}
                      <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={order.priority || 'low'}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleUpdatePriority?.(order._id, e.target.value);
                          }}
                          className={`h-7 px-2 rounded-[4px] text-[10px] font-bold uppercase tracking-wider border cursor-pointer outline-none transition-all ${
                            order.priority === 'high'
                              ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:border-rose-800'
                              : order.priority === 'medium'
                                ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800'
                                : 'bg-stone-50 text-stone-600 border-stone-200 dark:bg-stone-800 dark:border-stone-700'
                          }`}
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                        </select>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                        {order.status === 'Pending' ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleApproveOrder(order)}
                              disabled={updatingStatusId === order._id}
                              className="h-8 px-2.5 rounded-[4px] bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                              title="Approve Inquiry"
                            >
                              {updatingStatusId === order._id ? (
                                <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <span className="material-symbols-outlined text-[13px]">check</span>
                              )}
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCancelOrder(order)}
                              disabled={updatingStatusId === order._id}
                              className="h-8 px-2 rounded-[4px] border border-rose-200 hover:bg-rose-50 dark:border-rose-800 dark:hover:bg-rose-950/30 text-rose-600 text-[10px] font-bold uppercase tracking-wider flex items-center gap-0.5 transition-all cursor-pointer disabled:opacity-50"
                              title="Cancel Inquiry"
                            >
                              <span className="material-symbols-outlined text-[13px]">close</span>
                            </button>
                          </div>
                        ) : (
                          <div className="relative inline-block w-34">
                            <select
                              value={order.status}
                              onChange={(e) => handleStatusChange(order._id, e.target.value)}
                              disabled={updatingStatusId === order._id}
                              className="w-full h-8 rounded-[4px] pl-2.5 pr-6 bg-[var(--admin-surface)] border border-[var(--admin-border)] text-[10.5px] font-bold uppercase tracking-wider text-[var(--admin-text-primary)] cursor-pointer appearance-none shadow-2xs hover:border-[var(--admin-border-strong)] focus:outline-none disabled:opacity-50"
                            >
                              {ALL_STATUSES.map((st) => (
                                <option key={st} value={st}>
                                  {st}
                                </option>
                              ))}
                            </select>
                            <span className="material-symbols-outlined absolute right-1.5 top-1/2 -translate-y-1/2 text-[14px] text-[var(--admin-text-tertiary)] pointer-events-none">
                              {updatingStatusId === order._id ? (
                                <span className="w-3 h-3 border-2 border-[var(--admin-accent)] border-t-transparent rounded-full animate-spin inline-block" />
                              ) : (
                                'expand_more'
                              )}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Total Quote */}
                      <td className="py-3 px-4 text-right font-bold text-[var(--admin-accent)] text-[13px] whitespace-nowrap">
                        {order.quotation?.total > 0
                          ? formatCurrency(order.quotation.total)
                          : 'Pending'}
                      </td>

                      {/* Action buttons */}
                      <td
                        className="py-3 pl-4 pr-6 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="admin-btn-icon w-8 h-8 !rounded-[4px] text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)]"
                            title="View Inquiry Details & Quotation"
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              visibility
                            </span>
                          </button>
                          <a
                            href={`${EXTERNAL_URLS.WHATSAPP_BASE}/${(order.customerPhone || order.phone || '').replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="admin-btn-icon w-8 h-8 !rounded-[4px] text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                            title="Chat on WhatsApp"
                            onClick={(e) => {
                              if (!order.customerPhone && !order.phone) {
                                e.preventDefault();
                                toast.error('No phone number recorded for this inquiry');
                              }
                            }}
                          >
                            <WhatsAppIcon className="w-[15px] h-[15px]" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View (Unified with AdminOrders and AdminRentalOrders) */}
      <div className="block md:hidden space-y-3">
        {orders.length === 0 ? (
          <div className="admin-card !rounded-[4px] p-12 text-center text-[var(--admin-text-secondary)]">
            <span className="material-symbols-outlined text-[40px] text-[var(--admin-text-tertiary)] mb-2 block">
              search_off
            </span>
            <p className="text-[13px] font-bold text-[var(--admin-text-primary)]">
              No Inquiries Found
            </p>
            <p className="text-[11px] text-[var(--admin-text-secondary)] mt-1">
              No custom orders match the current filter or search.
            </p>
          </div>
        ) : (
          orders.map((order) => {
            const dateStr = order.eventDate
              ? new Date(order.eventDate).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })
              : 'TBD';
            const orderCode = order.customOrderNumber || `#${order._id.slice(-6).toUpperCase()}`;
            const thumbnail =
              order.productSnapshot?.imageSrc || order.inspirationImages?.[0] || null;
            const hasQuote = (order.quotation?.total || 0) > 0;

            return (
              <div
                key={order._id}
                onClick={() => setSelectedOrder(order)}
                className="rounded-[4px] p-4 shadow-xs border border-[var(--admin-border)] bg-[var(--admin-surface)] flex flex-col gap-3 cursor-pointer hover:border-[var(--admin-border-strong)] transition-all"
              >
                {/* Header Row: Customer Name + Status Badge, with subtle Inquiry Code */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="w-7 h-7 rounded-full bg-[var(--admin-bg-subtle)] border border-[var(--admin-border-subtle)] text-[var(--admin-accent)] font-bold text-[11px] flex items-center justify-center shrink-0">
                      {(order.customerName || 'C').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-[var(--admin-text-primary)] text-[13.5px] truncate leading-tight">
                          {order.customerName || 'Customer'}
                        </span>
                        {order.priority === 'high' && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-[4px] bg-rose-50 text-rose-700 border border-rose-200 uppercase shrink-0">
                            HIGH
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="font-mono text-[11px] font-medium text-[var(--admin-text-tertiary)] dark:text-stone-400">
                          {orderCode}
                        </span>
                        {order.customOrderType && (
                          <span
                            className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded-[4px] border shrink-0 ${
                              order.customOrderType === 'product'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : order.customOrderType === 'event'
                                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                                  : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}
                          >
                            {order.customOrderType}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <span
                    className={`px-2 py-0.5 rounded-[4px] text-[10px] font-bold uppercase tracking-wider border shrink-0 ${getStatusBadgeStyle(
                      order.status,
                    )}`}
                  >
                    {order.status}
                  </span>
                </div>

                {/* Sub Row: Contact + Event Date */}
                <div className="flex items-center justify-between text-[11.5px] pt-1 border-t border-[var(--admin-border-subtle)] text-[var(--admin-text-secondary)]">
                  <span className="truncate">
                    {order.customerPhone || order.customerEmail || 'No contact info'}
                  </span>
                  <span className="text-[11px] font-medium flex items-center gap-1 shrink-0 ml-2">
                    <span className="material-symbols-outlined text-[13px]">calendar_today</span>
                    {dateStr}
                  </span>
                </div>

                {/* Scope / Item Box */}
                <div className="bg-[var(--admin-bg-subtle)] p-3 rounded-[4px] border border-[var(--admin-border-subtle)] flex items-center gap-3">
                  {thumbnail ? (
                    <img
                      src={thumbnail}
                      alt="Thumbnail"
                      className="w-12 h-12 rounded-[4px] object-cover border border-[var(--admin-border-subtle)] bg-[var(--admin-surface)] shrink-0"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-[4px] border border-[var(--admin-border-subtle)] bg-[var(--admin-surface)] flex items-center justify-center shrink-0 text-[var(--admin-accent)]">
                      <span className="material-symbols-outlined text-[22px]">architecture</span>
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[9.5px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider block">
                        {order.occasion || 'CUSTOM REQUEST'}
                      </span>
                    </div>
                    <p className="text-[12px] font-bold text-[var(--admin-text-primary)] truncate mt-0.5">
                      {order.productSnapshot?.title || order.productType || 'Custom Order Inquiry'}
                    </p>
                    {order.customRequirements && (
                      <p className="text-[11px] text-[var(--admin-text-secondary)] italic truncate mt-0.5">
                        "{order.customRequirements}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Quotation & Pricing Strip */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-[var(--admin-text-secondary)] font-medium">
                      Total Quote:
                    </span>
                    <span className="font-bold text-[var(--admin-text-primary)] text-[13px]">
                      {hasQuote ? formatCurrency(order.quotation.total) : 'Pending Calculation'}
                    </span>
                  </div>

                  <span
                    className={`inline-flex items-center gap-0.5 text-[9.5px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-[4px] border ${
                      hasQuote
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}
                  >
                    {hasQuote ? 'Quote Sent' : 'Quote Pending'}
                  </span>
                </div>

                {/* Action Row */}
                <div
                  className="flex items-center gap-2 pt-2 border-t border-[var(--admin-border-subtle)]"
                  onClick={(e) => e.stopPropagation()}
                >
                  {order.status === 'Pending' ? (
                    <>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApproveOrder(order);
                        }}
                        disabled={updatingStatusId === order._id}
                        className="flex-1 h-9 rounded-[4px] bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        {updatingStatusId === order._id ? (
                          <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <span className="material-symbols-outlined text-[15px]">check</span>
                        )}
                        Approve
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCancelOrder(order);
                        }}
                        disabled={updatingStatusId === order._id}
                        className="px-3 h-9 rounded-[4px] border border-rose-200 text-rose-600 hover:bg-rose-50 text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="relative flex-1">
                        <select
                          value={order.status}
                          onChange={(e) => handleStatusChange(order._id, e.target.value)}
                          disabled={updatingStatusId === order._id}
                          className="w-full h-9 rounded-[4px] pl-2.5 pr-6 bg-[var(--admin-surface)] border border-[var(--admin-border)] text-[11px] font-bold uppercase tracking-wider text-[var(--admin-text-primary)] cursor-pointer appearance-none"
                        >
                          {ALL_STATUSES.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                        <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-[14px] text-[var(--admin-text-tertiary)] pointer-events-none">
                          expand_more
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedOrder(order)}
                        className="h-9 px-3 rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-muted)] text-[var(--admin-text-primary)] text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer hover:bg-[var(--admin-border-subtle)]"
                      >
                        <span className="material-symbols-outlined text-[15px]">visibility</span>
                        Details
                      </button>
                    </>
                  )}

                  {/* WhatsApp Quick Action */}
                  <a
                    href={`${EXTERNAL_URLS.WHATSAPP_BASE}/${(order.customerPhone || order.phone || '').replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-9 px-2.5 rounded-[4px] bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center cursor-pointer hover:opacity-80 shrink-0"
                    title="WhatsApp"
                    onClick={(e) => {
                      if (!order.customerPhone && !order.phone) {
                        e.preventDefault();
                        toast.error('No phone number recorded');
                      }
                    }}
                  >
                    <WhatsAppIcon className="w-[15px] h-[15px]" />
                  </a>
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
