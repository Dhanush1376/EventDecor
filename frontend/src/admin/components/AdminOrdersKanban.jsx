import React from 'react';
import { formatCurrency } from '../components/AdminUIKit';
import toast from 'react-hot-toast';
import { EXTERNAL_URLS } from '../../config/constants';

export function AdminOrdersKanban({
  filteredOrders,
  allStatuses,
  statusIcons,
  openOrderDrawer,
  updateOrderStatus,
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
              className="bg-[var(--admin-bg-subtle)] rounded-[var(--admin-radius-xl)] p-3 border border-[var(--admin-border)] flex flex-col h-[400px] md:h-[600px] admin-kanban-column"
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
                      className="bg-[var(--admin-surface)] rounded-[var(--admin-radius-lg)] p-4 border border-[var(--admin-border)] shadow-[var(--admin-shadow-sm)] hover:border-[var(--admin-border-strong)] hover:shadow-[var(--admin-shadow-md)] transition-all duration-200 cursor-pointer group text-left flex flex-col"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[12px] font-bold text-[var(--admin-text-primary)] group-hover:text-[var(--admin-accent)] transition-colors">
                              #{o.id.substring(o.id.length - 8).toUpperCase()}
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
                          <p className="text-[11px] font-medium text-[var(--admin-text-secondary)] mt-0.5 truncate max-w-[120px]">
                            {o.customer}
                          </p>
                        </div>
                        <span className="text-[12px] font-bold text-[var(--admin-text-primary)]">
                          {formatCurrency(o.total)}
                        </span>
                      </div>

                      <p className="text-[10px] text-[var(--admin-text-tertiary)] truncate mb-4">
                        {o.items.map((i) => i.name).join(', ')}
                      </p>

                      <div
                        className="flex items-center justify-between mt-auto pt-3 border-t border-[var(--admin-border-subtle)] gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <select
                          value={o.status}
                          onChange={(e) => {
                            updateOrderStatus(o.id, e.target.value);
                            toast.success(
                              `Moved #${o.id.substring(o.id.length - 6).toUpperCase()} to ${
                                e.target.value
                              }`,
                            );
                          }}
                          className="admin-input py-1 px-2 text-[10px] font-bold uppercase tracking-wider cursor-pointer min-h-0 h-7"
                        >
                          {allStatuses.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {hasNote && (
                            <span
                              className="material-symbols-outlined text-[14px] text-[var(--admin-warning)]"
                              title="Contains team note"
                            >
                              sticky_note_2
                            </span>
                          )}
                          <a
                            href={`${EXTERNAL_URLS.WHATSAPP_BASE}/${o.phone.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-7 h-7 rounded-[var(--admin-radius-sm)] bg-[var(--admin-success-light)] text-[var(--admin-success)] border border-[var(--admin-success-border)] flex items-center justify-center hover:bg-[var(--admin-success)] hover:text-white transition-colors"
                          >
                            <span className="material-symbols-outlined text-[14px]">chat</span>
                          </a>
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
