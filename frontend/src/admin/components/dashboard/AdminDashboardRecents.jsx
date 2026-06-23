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
    <div className="admin-grid-content mt-6">
      {/* Recent Orders */}
      <motion.div variants={fadeUp} className="admin-card p-4 sm:p-6 flex flex-col">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[14px] font-semibold text-[var(--admin-text-primary)]">
            Recent Orders
          </h3>
          <button
            onClick={() => navigate('/admin/orders')}
            className="text-[11px] font-bold text-[var(--admin-accent)] hover:underline cursor-pointer min-h-0"
          >
            View All
          </button>
        </div>
        {orders.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center bg-[var(--admin-bg-subtle)] rounded-[var(--admin-radius-lg)] border border-dashed border-[var(--admin-border)] p-4 text-center">
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
            <div className="hidden md:block overflow-x-auto -mx-6 px-6 scrollbar-hide">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Customer</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.slice(0, 5).map((o, i) => (
                    <tr
                      key={i}
                      onClick={() => navigate(`/admin/orders/${o.id}`)}
                      className="admin-table-row-clickable"
                    >
                      <td className="font-bold text-[var(--admin-text-primary)]">
                        {o.id.substring(o.id.length - 8).toUpperCase()}
                      </td>
                      <td className="truncate max-w-[100px]">{o.customer}</td>
                      <td className="font-semibold">{formatCurrency(o.total)}</td>
                      <td>
                        <StatusBadge status={o.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View */}
            <div className="md:hidden space-y-2.5">
              {orders.slice(0, 5).map((o, i) => (
                <motion.div
                  key={i}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate(`/admin/orders/${o.id}`)}
                  className="relative flex items-center justify-between p-3 rounded-[var(--admin-radius-lg)] border border-[var(--admin-border-subtle)] hover:bg-[var(--admin-surface-hover)] transition-all cursor-pointer bg-[var(--admin-surface)] pl-4 overflow-hidden"
                >
                  {/* Status vertical accent strip */}
                  <span
                    className={`absolute left-0 top-0 bottom-0 w-1 ${getStatusIndicatorColor(o.status)}`}
                    aria-hidden="true"
                  />

                  <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
                    {/* Initials Avatar */}
                    <div className="w-8 h-8 rounded-full bg-[var(--admin-surface-muted)] border border-[var(--admin-border)] flex items-center justify-center shrink-0 text-[10px] font-bold text-[var(--admin-text-secondary)] shadow-sm">
                      {getInitials(o.customer)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-bold text-[var(--admin-text-primary)]">
                        #{o.id.substring(o.id.length - 8).toUpperCase()}
                      </p>
                      <p className="text-[10px] text-[var(--admin-text-tertiary)] mt-0.5 truncate font-medium">
                        {o.customer}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1.5 shrink-0">
                    <p className="text-[12px] font-bold text-[var(--admin-text-primary)]">
                      {formatCurrency(o.total)}
                    </p>
                    <StatusBadge status={o.status} className="text-[8px] px-2 py-0.5 font-bold" />
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </motion.div>

      {/* Upcoming Bookings */}
      <motion.div variants={fadeUp} className="admin-card p-4 sm:p-6 flex flex-col">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[14px] font-semibold text-[var(--admin-text-primary)]">
            Upcoming Bookings
          </h3>
          <button
            onClick={() => navigate('/admin/events')}
            className="text-[11px] font-bold text-[var(--admin-accent)] hover:underline cursor-pointer min-h-0"
          >
            View All
          </button>
        </div>
        {eventBookings.filter((b) => b.status !== 'Cancelled').length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-[var(--admin-surface-muted)] to-[var(--admin-bg-subtle)] rounded-[var(--admin-radius-lg)] border border-[var(--admin-border)] p-6 text-center shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]">
            <div className="w-10 h-10 rounded-full bg-[var(--admin-surface)] border border-[var(--admin-border)] text-[var(--admin-text-tertiary)] flex items-center justify-center mb-2.5 shadow-sm">
              <span className="material-symbols-outlined text-[20px]">calendar_today</span>
            </div>
            <span className="text-[11px] uppercase font-bold tracking-wider text-[var(--admin-text-secondary)]">
              No Bookings Found
            </span>
            <p className="text-[10px] text-[var(--admin-text-tertiary)] mt-1 font-medium">
              No upcoming events.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {eventBookings
              .filter((b) => b.status !== 'Cancelled')
              .slice(0, 4)
              .map((b, i) => (
                <motion.div
                  key={i}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate('/admin/events')}
                  className="relative flex items-center gap-3 p-3 rounded-[var(--admin-radius-lg)] border border-[var(--admin-border-subtle)] hover:bg-[var(--admin-surface-hover)] transition-all cursor-pointer bg-[var(--admin-surface)] pl-4 overflow-hidden"
                >
                  {/* Status vertical accent strip */}
                  <span
                    className={`absolute left-0 top-0 bottom-0 w-1 ${getStatusIndicatorColor(b.status)}`}
                    aria-hidden="true"
                  />

                  {/* Initials Avatar */}
                  <div className="w-8 h-8 rounded-full bg-[var(--admin-surface-muted)] border border-[var(--admin-border)] flex items-center justify-center shrink-0 text-[10px] font-bold text-[var(--admin-text-secondary)] shadow-sm">
                    {getInitials(b.customer)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-bold text-[var(--admin-text-primary)] truncate">
                      {b.eventType}
                    </p>
                    <p className="text-[10px] text-[var(--admin-text-tertiary)] mt-0.5 font-medium truncate">
                      {b.customer} · {b.date}
                    </p>
                  </div>
                  <StatusBadge
                    status={b.status}
                    className="text-[8px] px-2 py-0.5 font-bold shrink-0 ml-2"
                  />
                </motion.div>
              ))}
          </div>
        )}
      </motion.div>

      {/* Trending Products */}
      <motion.div variants={fadeUp} className="admin-card p-4 sm:p-6 flex flex-col">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[14px] font-semibold text-[var(--admin-text-primary)]">
            Trending Products
          </h3>
          <button
            onClick={() => navigate('/admin/products')}
            className="text-[11px] font-bold text-[var(--admin-accent)] hover:underline cursor-pointer min-h-0"
          >
            View All
          </button>
        </div>
        {trendingProducts.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center bg-[var(--admin-bg-subtle)] rounded-[var(--admin-radius-lg)] border border-dashed border-[var(--admin-border)] p-6 text-center">
            <span className="material-symbols-outlined text-[28px] text-[var(--admin-text-tertiary)] mb-2">
              trending_up
            </span>
            <span className="text-[11px] uppercase font-bold text-[var(--admin-text-secondary)] tracking-wider">
              No Products Yet
            </span>
          </div>
        ) : (
          <div className="space-y-2.5">
            {trendingProducts.map((p, i) => (
              <motion.div
                key={i}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(`/admin/products/edit/${p.id}`)}
                className="flex items-center gap-3 p-2.5 rounded-[var(--admin-radius-lg)] border border-[var(--admin-border-subtle)] hover:bg-[var(--admin-surface-hover)] hover:border-[var(--admin-border-strong)] transition-all cursor-pointer group min-w-0 bg-[var(--admin-surface)]"
              >
                <img
                  onError={handleImageError}
                  src={p.image}
                  alt={p.name}
                  className="w-11 h-11 rounded-[var(--admin-radius-md)] object-cover shrink-0 border border-[var(--admin-border)] shadow-sm"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-bold text-[var(--admin-text-primary)] truncate group-hover:text-[var(--admin-accent)] transition-colors">
                    {p.name}
                  </p>
                  <p className="text-[10px] text-[var(--admin-text-tertiary)] mt-0.5 truncate font-medium">
                    {formatCurrency(p.price)} · {p.category}
                  </p>
                </div>
                <div className="flex flex-col items-end justify-center shrink-0 pl-1">
                  <span className="flex items-center gap-1 admin-badge admin-badge-neutral text-[9px] px-1.5 py-0.5 font-bold">
                    <span className="material-symbols-outlined text-[10px] leading-none">
                      visibility
                    </span>
                    {p.views.toLocaleString()}
                  </span>
                  <span className="text-[10px] font-bold text-[var(--admin-text-secondary)] mt-1.5 shrink-0">
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
