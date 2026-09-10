import { m as motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { handleImageError } from '../../../utils/media/imageUtils';
import { StatusBadge, formatCurrency, fadeUp } from '../AdminUIKit';

const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return parts
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
};

const getStatusIndicatorColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'confirmed':
    case 'delivered':
    case 'completed':
      return 'bg-emerald-500';
    case 'cancelled':
    case 'failed':
      return 'bg-rose-500';
    case 'pending':
    case 'processing':
      return 'bg-amber-500';
    default:
      return 'bg-blue-500';
  }
};

export function AdminDashboardRecents({ orders, eventBookings, trendingProducts }) {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Recent Orders */}
      <motion.div
        variants={fadeUp}
        className="admin-card p-4 sm:p-5 !rounded-[4px] border border-[var(--admin-border)] shadow-xs flex flex-col"
      >
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-[var(--admin-border-subtle)]">
          <div>
            <h3 className="text-[13.5px] sm:text-[14px] font-bold text-[var(--admin-text-primary)]">
              Recent Orders
            </h3>
            <p className="text-[11px] text-[var(--admin-text-tertiary)] mt-0.5">
              Latest storefront customer orders
            </p>
          </div>
          <button
            onClick={() => navigate('/admin/orders')}
            className="text-[11px] font-bold text-[var(--admin-accent)] hover:underline cursor-pointer min-h-0"
          >
            View All
          </button>
        </div>

        {orders.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center bg-[var(--admin-surface-muted)] rounded-[4px] border border-dashed border-[var(--admin-border)] p-4 text-center">
            <span className="material-symbols-outlined text-[28px] text-[var(--admin-text-tertiary)] mb-2">
              receipt_long
            </span>
            <span className="text-[10px] uppercase font-bold text-[var(--admin-text-secondary)] tracking-wider">
              No Orders Found
            </span>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto -mx-5 px-5 scrollbar-hide">
              <table className="admin-table w-full text-left">
                <thead>
                  <tr className="border-b border-[var(--admin-border-subtle)]">
                    <th className="text-[10px] uppercase font-bold text-[var(--admin-text-tertiary)] pb-2">
                      Order
                    </th>
                    <th className="text-[10px] uppercase font-bold text-[var(--admin-text-tertiary)] pb-2">
                      Customer
                    </th>
                    <th className="text-[10px] uppercase font-bold text-[var(--admin-text-tertiary)] pb-2">
                      Amount
                    </th>
                    <th className="text-[10px] uppercase font-bold text-[var(--admin-text-tertiary)] pb-2 text-right">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--admin-border-subtle)] text-[12px]">
                  {orders.slice(0, 5).map((o, i) => (
                    <tr
                      key={i}
                      onClick={() => navigate(`/admin/orders/${o.id}`)}
                      className="hover:bg-[var(--admin-surface-hover)] cursor-pointer transition-colors"
                    >
                      <td className="py-2.5 font-bold font-mono text-[var(--admin-text-primary)]">
                        #{o.id.substring(o.id.length - 6).toUpperCase()}
                      </td>
                      <td className="py-2.5 truncate max-w-[100px] text-[var(--admin-text-secondary)] font-medium">
                        {o.customer}
                      </td>
                      <td className="py-2.5 font-bold font-mono text-[var(--admin-text-primary)]">
                        {formatCurrency(o.total)}
                      </td>
                      <td className="py-2.5 text-right">
                        <StatusBadge status={o.status} className="text-[9px] px-1.5 py-0.2" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View */}
            <div className="md:hidden space-y-2">
              {orders.slice(0, 5).map((o, i) => (
                <motion.div
                  key={i}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate(`/admin/orders/${o.id}`)}
                  className="relative flex items-center justify-between p-2.5 rounded-[4px] border border-[var(--admin-border-subtle)] hover:bg-[var(--admin-surface-hover)] transition-all cursor-pointer bg-[var(--admin-surface)] pl-3.5 overflow-hidden"
                >
                  <span
                    className={`absolute left-0 top-0 bottom-0 w-1 ${getStatusIndicatorColor(o.status)}`}
                    aria-hidden="true"
                  />

                  <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                    <div className="w-7 h-7 rounded-full bg-[var(--admin-surface-muted)] border border-[var(--admin-border)] flex items-center justify-center shrink-0 text-[9.5px] font-bold text-[var(--admin-text-secondary)]">
                      {getInitials(o.customer)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11.5px] font-bold text-[var(--admin-text-primary)] font-mono">
                        #{o.id.substring(o.id.length - 6).toUpperCase()}
                      </p>
                      <p className="text-[9.5px] text-[var(--admin-text-tertiary)] truncate font-medium">
                        {o.customer}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1 shrink-0">
                    <p className="text-[11.5px] font-bold text-[var(--admin-text-primary)] font-mono">
                      {formatCurrency(o.total)}
                    </p>
                    <StatusBadge status={o.status} className="text-[8px] px-1.5 py-0.2 font-bold" />
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </motion.div>

      {/* Upcoming Bookings */}
      <motion.div
        variants={fadeUp}
        className="admin-card p-4 sm:p-5 !rounded-[4px] border border-[var(--admin-border)] shadow-xs flex flex-col"
      >
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-[var(--admin-border-subtle)]">
          <div>
            <h3 className="text-[13.5px] sm:text-[14px] font-bold text-[var(--admin-text-primary)]">
              Upcoming Bookings
            </h3>
            <p className="text-[11px] text-[var(--admin-text-tertiary)] mt-0.5">
              Scheduled decor jobs & celebrations
            </p>
          </div>
          <button
            onClick={() => navigate('/admin/events')}
            className="text-[11px] font-bold text-[var(--admin-accent)] hover:underline cursor-pointer min-h-0"
          >
            View All
          </button>
        </div>

        {eventBookings.filter((b) => b.status !== 'Cancelled').length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center bg-[var(--admin-surface-muted)] rounded-[4px] border border-[var(--admin-border)] p-6 text-center">
            <div className="w-8 h-8 rounded-full bg-[var(--admin-surface)] border border-[var(--admin-border)] text-[var(--admin-text-tertiary)] flex items-center justify-center mb-2">
              <span className="material-symbols-outlined text-[18px]">calendar_today</span>
            </div>
            <span className="text-[11px] uppercase font-bold tracking-wider text-[var(--admin-text-secondary)]">
              No Bookings Found
            </span>
            <p className="text-[10px] text-[var(--admin-text-tertiary)] mt-0.5 font-medium">
              No upcoming events scheduled.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {eventBookings
              .filter((b) => b.status !== 'Cancelled')
              .slice(0, 4)
              .map((b, i) => (
                <motion.div
                  key={i}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate('/admin/events')}
                  className="relative flex items-center gap-2.5 p-2.5 rounded-[4px] border border-[var(--admin-border-subtle)] hover:bg-[var(--admin-surface-hover)] transition-all cursor-pointer bg-[var(--admin-surface)] pl-3.5 overflow-hidden"
                >
                  <span
                    className={`absolute left-0 top-0 bottom-0 w-1 ${getStatusIndicatorColor(b.status)}`}
                    aria-hidden="true"
                  />

                  <div className="w-7 h-7 rounded-full bg-[var(--admin-surface-muted)] border border-[var(--admin-border)] flex items-center justify-center shrink-0 text-[9.5px] font-bold text-[var(--admin-text-secondary)]">
                    {getInitials(b.customer)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11.5px] font-bold text-[var(--admin-text-primary)] truncate">
                      {b.eventType}
                    </p>
                    <p className="text-[9.5px] text-[var(--admin-text-tertiary)] font-medium truncate">
                      {b.customer} · {b.date}
                    </p>
                  </div>
                  <StatusBadge
                    status={b.status}
                    className="text-[8px] px-1.5 py-0.2 font-bold shrink-0 ml-2"
                  />
                </motion.div>
              ))}
          </div>
        )}
      </motion.div>

      {/* Trending Products */}
      <motion.div
        variants={fadeUp}
        className="admin-card p-4 sm:p-5 !rounded-[4px] border border-[var(--admin-border)] shadow-xs flex flex-col"
      >
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-[var(--admin-border-subtle)]">
          <div>
            <h3 className="text-[13.5px] sm:text-[14px] font-bold text-[var(--admin-text-primary)]">
              Trending Catalog
            </h3>
            <p className="text-[11px] text-[var(--admin-text-tertiary)] mt-0.5">
              Most viewed & purchased decor items
            </p>
          </div>
          <button
            onClick={() => navigate('/admin/products')}
            className="text-[11px] font-bold text-[var(--admin-accent)] hover:underline cursor-pointer min-h-0"
          >
            View All
          </button>
        </div>

        {trendingProducts.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center bg-[var(--admin-surface-muted)] rounded-[4px] border border-dashed border-[var(--admin-border)] p-6 text-center">
            <span className="material-symbols-outlined text-[28px] text-[var(--admin-text-tertiary)] mb-2">
              trending_up
            </span>
            <span className="text-[11px] uppercase font-bold text-[var(--admin-text-secondary)] tracking-wider">
              No Products Yet
            </span>
          </div>
        ) : (
          <div className="space-y-2">
            {trendingProducts.map((p, i) => (
              <motion.div
                key={i}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(`/admin/products/edit/${p.id}`)}
                className="flex items-center gap-2.5 p-2 rounded-[4px] border border-[var(--admin-border-subtle)] hover:bg-[var(--admin-surface-hover)] hover:border-[var(--admin-border-strong)] transition-all cursor-pointer group min-w-0 bg-[var(--admin-surface)]"
              >
                <img
                  onError={handleImageError}
                  src={p.image}
                  alt={p.name}
                  className="w-9 h-9 rounded-[3px] object-cover shrink-0 border border-[var(--admin-border)]"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[11.5px] font-bold text-[var(--admin-text-primary)] truncate group-hover:text-[var(--admin-accent)] transition-colors">
                    {p.name}
                  </p>
                  <p className="text-[9.5px] text-[var(--admin-text-tertiary)] truncate font-medium">
                    <span className="font-mono font-semibold">{formatCurrency(p.price)}</span> ·{' '}
                    {p.category}
                  </p>
                </div>
                <div className="flex flex-col items-end justify-center shrink-0 pl-1">
                  <span className="flex items-center gap-1 text-[9.5px] font-bold text-[var(--admin-text-secondary)] font-mono">
                    <span className="material-symbols-outlined text-[11px] leading-none text-[var(--admin-accent)]">
                      visibility
                    </span>
                    {p.views.toLocaleString()}
                  </span>
                  <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0 font-mono">
                    {p.sold} sold
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
