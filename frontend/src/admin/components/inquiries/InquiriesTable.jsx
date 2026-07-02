import React from 'react';
import { m as motion } from 'framer-motion';

const fadeUp = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } };

export function InquiriesTable({
  orders,
  statusFilter,
  setStatusFilter,
  setSelectedOrder,
  handleUpdatePriority,
  page,
  setPage,
  totalPages,
  totalItems,
}) {
  return (
    <>
      {/* Luxury Status Pipeline Segment Controls */}
      <motion.div
        variants={fadeUp}
        className="flex overflow-x-auto gap-2 border-b border-[var(--admin-border-subtle)] pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none snap-x flex-nowrap"
        style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
      >
        {[
          'All',
          'Pending',
          'Reviewing',
          'Quote Sent',
          'Approved',
          'In Progress',
          'Ready',
          'Delivered',
          'Cancelled',
        ].map((tab) => (
          <button
            key={tab}
            onClick={() => setStatusFilter(tab)}
            className={`px-4 py-2 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer border shrink-0 snap-align-start whitespace-nowrap ${
              statusFilter === tab
                ? 'bg-[var(--admin-surface)] text-[var(--admin-text-primary)] shadow-[var(--admin-shadow-xs)] border-[var(--admin-border-subtle)]'
                : 'bg-[var(--admin-surface)] border-[var(--admin-border)] text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] hover:border-[var(--admin-border-strong)]'
            }`}
          >
            {tab}
            {statusFilter === tab && (
              <span className="ml-2 px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-[var(--admin-surface)] text-[var(--admin-text-primary)]">
                {totalItems}
              </span>
            )}
          </button>
        ))}
      </motion.div>

      {/* Desktop Table View */}
      <div className="hidden md:block admin-card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="admin-table w-full min-w-[900px]">
            <thead>
              <tr className="">
                <th className="p-4.5 pl-6">Customer Name</th>
                <th className="p-4.5">Type</th>
                <th className="p-4.5">Request Details</th>
                <th className="p-4.5">Event Date</th>
                <th className="p-4.5">Priority</th>
                <th className="p-4.5">Status</th>
                <th className="p-4.5 text-right pr-6">Total Price</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="p-20 text-center text-[var(--admin-text-secondary)] bg-[var(--admin-surface)]"
                  >
                    <span className="material-symbols-outlined text-[48px] text-[var(--admin-text-tertiary)] mb-2 block">
                      search_off
                    </span>
                    <p className="text-[14px] font-bold text-[var(--admin-text-primary)]">
                      Data Not Found
                    </p>
                    <p className="text-[11px] text-[var(--admin-text-secondary)] mt-1 max-w-[280px] mx-auto">
                      No custom orders found matching your search.
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

                  return (
                    <tr
                      key={order._id}
                      onClick={() => setSelectedOrder(order)}
                      className="border-b border-[var(--admin-border-subtle)] hover:bg-[var(--admin-bg-subtle)] cursor-pointer transition-all duration-300 border-l-4 border-l-transparent hover:border-l-[var(--admin-accent)]"
                    >
                      <td className="p-4.5 pl-6 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[var(--admin-bg-subtle)] border border-[var(--admin-border-subtle)] text-[var(--admin-accent)] flex items-center justify-center font-bold text-[13px] shadow-sm">
                          {customerInitial}
                        </div>
                        <div>
                          <p className="font-bold text-[var(--admin-text-primary)]">
                            {order.customerName}
                          </p>
                          <span className="text-[11px] text-[var(--admin-text-secondary)]/70 font-mono tracking-tight">
                            {order.customerEmail}
                          </span>
                        </div>
                      </td>

                      <td className="p-4.5 font-bold uppercase tracking-wider">
                        <span
                          className={`px-2 py-1 rounded-[6px] text-[10px] ${
                            order.customOrderType === 'product'
                              ? 'bg-[#e3f2fd] text-[#1565c0]'
                              : order.customOrderType === 'event'
                                ? 'bg-[#f3e5f5] text-[#7b1fa2]'
                                : order.customOrderType === 'general'
                                  ? 'bg-[#fff8e1] text-[#f57f17]'
                                  : 'bg-[var(--admin-bg-subtle)] text-[var(--admin-text-secondary)]'
                          }`}
                        >
                          {order.customOrderType || 'Legacy'}
                        </span>
                      </td>
                      <td className="p-4.5 text-[12px] text-[var(--admin-text-secondary)]">
                        <div>
                          <span className="font-bold text-[var(--admin-text-primary)] uppercase text-[10px]">
                            {order.occasion || 'Custom'}
                          </span>
                        </div>
                        <div>{order.productType || 'N/A'}</div>
                      </td>
                      <td className="p-4.5 font-mono text-[var(--admin-text-primary)] font-light">
                        {dateStr}
                      </td>
                      <td className="p-4.5">
                        <select
                          value={order.priority}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleUpdatePriority(order._id, e.target.value);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className={`px-3 py-1 rounded-xl text-[11px] font-bold uppercase tracking-wider border cursor-pointer outline-none transition-all ${
                            order.priority === 'high'
                              ? 'bg-[var(--admin-error-light)] text-[var(--admin-error)] border-[var(--admin-error-border)]'
                              : order.priority === 'medium'
                                ? 'admin-badge admin-badge-warning border-[var(--admin-warning-border)]'
                                : 'bg-[var(--admin-surface-muted)] text-[var(--admin-text-secondary)] border-[var(--admin-border)]'
                          }`}
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                        </select>
                      </td>
                      <td className="p-4.5">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                            order.status === 'Pending'
                              ? 'admin-badge admin-badge-warning'
                              : order.status === 'Approved'
                                ? 'bg-[var(--admin-success-light)] text-[var(--admin-success)]'
                                : order.status === 'Cancelled'
                                  ? 'admin-badge admin-badge-error'
                                  : 'bg-[var(--admin-info-light)] text-[var(--admin-info)]'
                          }`}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className="p-4.5 text-right pr-6 font-mono font-bold text-[var(--admin-accent)]">
                        {order.quotation?.total > 0
                          ? `₹${order.quotation.total.toLocaleString('en-IN')}`
                          : 'Custom Quote'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card Deck View */}
      <div className="block md:hidden space-y-3">
        {orders.length === 0 ? (
          <div className="admin-card p-12 text-center text-[var(--admin-text-secondary)]">
            <span className="material-symbols-outlined text-[40px] text-[var(--admin-text-tertiary)] mb-2 block">
              search_off
            </span>
            <p className="text-[13px] font-bold text-[var(--admin-text-primary)]">Data Not Found</p>
            <p className="text-[11px] text-[var(--admin-text-secondary)] mt-1">
              No custom orders found matching search.
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
            const customerInitial = (order.customerName || 'C').charAt(0).toUpperCase();

            return (
              <div
                key={order._id}
                onClick={() => setSelectedOrder(order)}
                className="admin-card p-4 hover:border-[var(--admin-border-strong)] cursor-pointer transition-all duration-300 border-l-4 border-l-transparent hover:border-l-[var(--admin-accent)] active:scale-[0.99] space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-[var(--admin-bg-subtle)] border border-[var(--admin-border-subtle)] text-[var(--admin-accent)] flex items-center justify-center font-bold text-[12px] shadow-sm shrink-0">
                      {customerInitial}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-[var(--admin-text-primary)] text-[13px] truncate">
                        {order.customerName}
                      </h4>
                      <p className="text-[10px] text-[var(--admin-text-secondary)] truncate">
                        {order.customerEmail}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-[var(--admin-text-tertiary)] shrink-0">
                    {dateStr}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] border-t border-b border-[var(--admin-border-subtle)] py-2">
                  <div className="min-w-0">
                    <span className="text-[9px] uppercase tracking-wider text-[var(--admin-text-tertiary)] font-bold block">
                      Occasion
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="font-bold text-[var(--admin-text-primary)]/80 truncate block">
                        {order.occasion}
                      </span>
                      {order.productSnapshot && (
                        <span
                          className="bg-[var(--admin-accent)]/10 text-[var(--admin-accent)] border border-[var(--admin-accent)]/20 px-1.5 py-0.5 rounded-[4px] text-[8px] font-bold uppercase tracking-wider shrink-0"
                          title="Based on a Catalog Product"
                        >
                          Catalog
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <span className="text-[9px] uppercase tracking-wider text-[var(--admin-text-tertiary)] font-bold block">
                      Product Type
                    </span>
                    <span className="text-[var(--admin-text-secondary)] truncate block">
                      {order.productType}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-2">
                    <select
                      value={order.priority}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleUpdatePriority(order._id, e.target.value);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border cursor-pointer outline-none transition-all ${
                        order.priority === 'high'
                          ? 'bg-[var(--admin-error-light)] text-[var(--admin-error)] border-[var(--admin-error-border)]'
                          : order.priority === 'medium'
                            ? 'admin-badge admin-badge-warning border-[var(--admin-warning-border)] py-0.5'
                            : 'bg-[var(--admin-surface-muted)] text-[var(--admin-text-secondary)] border-[var(--admin-border)]'
                      }`}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Med</option>
                      <option value="high">High</option>
                    </select>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        order.status === 'Pending'
                          ? 'admin-badge admin-badge-warning'
                          : order.status === 'Approved'
                            ? 'bg-[var(--admin-success-light)] text-[var(--admin-success)]'
                            : order.status === 'Cancelled'
                              ? 'admin-badge admin-badge-error'
                              : 'bg-[var(--admin-info-light)] text-[var(--admin-info)]'
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>

                  <span className="font-mono font-bold text-[12px] text-[var(--admin-accent)]">
                    {order.quotation?.total > 0
                      ? `₹${order.quotation.total.toLocaleString('en-IN')}`
                      : 'Custom Quote'}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-[var(--admin-border)] pt-4 mt-4 px-2">
          <div className="text-[12px] text-[var(--admin-text-secondary)]">
            Showing{' '}
            <span className="font-bold text-[var(--admin-text-primary)]">
              {(page - 1) * 15 + 1}
            </span>{' '}
            to{' '}
            <span className="font-bold text-[var(--admin-text-primary)]">
              {Math.min(page * 15, totalItems)}
            </span>{' '}
            of <span className="font-bold text-[var(--admin-text-primary)]">{totalItems}</span>{' '}
            orders
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--admin-border-subtle)] text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] hover:border-[var(--admin-border)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-[var(--admin-surface)] cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>
            <div className="flex items-center gap-1">
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i + 1}
                  onClick={() => setPage(i + 1)}
                  className={`w-8 h-8 flex items-center justify-center rounded-lg text-[12px] font-bold font-mono transition-colors cursor-pointer ${
                    page === i + 1
                      ? 'bg-[var(--admin-surface)] text-[var(--admin-text-primary)] shadow-[var(--admin-shadow-xs)] border border-[var(--admin-border-subtle)]'
                      : 'text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] hover:bg-[var(--admin-surface-muted)] border border-transparent'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--admin-border-subtle)] text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] hover:border-[var(--admin-border)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-[var(--admin-surface)] cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
