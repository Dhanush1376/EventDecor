import React from 'react';
import { EmptyState, formatCurrency, StatusBadge } from '../components/AdminUIKit';
import { EXTERNAL_URLS } from '../../config/constants';

export function AdminOrdersTable({
  filteredOrders,
  searchQuery,
  filterStatus,
  setFilterStatus,
  openOrderDrawer,
  navigate,
}) {
  return (
    <>
      <div className="hidden md:block overflow-x-auto">
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
                    className="admin-table-row-clickable group"
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
                        <span className="font-semibold text-[var(--admin-text-primary)]">
                          {o.customer}
                        </span>
                        <span className="text-[11px] text-[var(--admin-text-tertiary)] mt-0.5 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[12px]">call</span>
                          {o.phone}
                        </span>
                      </div>
                    </td>
                    <td className="hidden md:table-cell max-w-[250px]">
                      <div className="flex items-center gap-2.5">
                        <div className="flex -space-x-2.5 overflow-hidden shrink-0 group-hover:-space-x-1 transition-all duration-300">
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
                                className="inline-block h-9 w-9 rounded-[var(--admin-radius-md)] border-[1.5px] border-[var(--admin-surface)] object-cover shadow-sm bg-[var(--admin-surface-muted)] relative z-10 transition-transform"
                                style={{ zIndex: 10 - idx }}
                              />
                            );
                          })}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span
                            className="text-[12px] font-bold text-[var(--admin-text-primary)] truncate"
                            title={o.items[0]?.name}
                          >
                            {o.items[0]?.name || 'Unknown Item'}
                          </span>
                          <span className="text-[10px] font-semibold text-[var(--admin-text-tertiary)] truncate mt-0.5">
                            {o.items.length > 1
                              ? `+ ${o.items.length - 1} other item${o.items.length > 2 ? 's' : ''}`
                              : `x${o.items[0]?.quantity || o.items[0]?.qty || 1}`}
                          </span>
                        </div>
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
                    <td>
                      <StatusBadge status={o.status} />
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
                          <span className="material-symbols-outlined text-[16px]">chat</span>
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

      <div className="flex md:hidden flex-col gap-3 p-3 bg-[var(--admin-bg-subtle)]">
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
                className="bg-[var(--admin-surface)] rounded-[var(--admin-radius-lg)] p-4 shadow-sm border border-[var(--admin-border)] flex flex-col gap-3 cursor-pointer hover:border-[var(--admin-border-strong)] transition-all"
              >
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[var(--admin-text-primary)] text-[14px]">
                        #{o.id.substring(o.id.length - 8).toUpperCase()}
                      </span>
                      {isNew && (
                        <span className="w-2 h-2 rounded-full bg-[var(--admin-accent)] animate-pulse" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] font-medium text-[var(--admin-text-secondary)] block">
                        {o.customer}
                      </span>
                      {o.orderType && o.orderType !== 'purchase' && (
                        <span
                          className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                            o.orderType === 'rental'
                              ? 'bg-indigo-100 text-indigo-700'
                              : 'bg-purple-100 text-purple-700'
                          }`}
                        >
                          {o.orderType}
                        </span>
                      )}
                    </div>
                  </div>
                  <StatusBadge status={o.status} className="border-none px-2 py-1 text-[10px]" />
                </div>

                <div className="pt-2 pb-2 border-y border-[var(--admin-border-subtle)]">
                  <p className="text-[12px] text-[var(--admin-text-primary)] line-clamp-2">
                    {o.items.map((i) => `${i.name} (x${i.quantity || 1})`).join(', ')}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="font-bold text-[var(--admin-text-primary)] text-[14px]">
                    {formatCurrency(o.total)}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="admin-badge admin-badge-neutral text-[9px] uppercase font-bold tracking-wider">
                      {o.payment}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openOrderDrawer(o);
                      }}
                      className="admin-btn-icon w-8 h-8 p-0 min-h-0 text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)]"
                    >
                      <span className="material-symbols-outlined text-[18px]">more_vert</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
