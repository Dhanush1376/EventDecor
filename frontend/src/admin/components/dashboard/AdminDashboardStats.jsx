import { m as motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { formatCurrency, fadeUp } from '../AdminUIKit';

export function AdminDashboardStats({ dashboardStats, pendingOrders, eventBookings, customers }) {
  const navigate = useNavigate();

  const totalSales =
    dashboardStats?.stats?.totalSales !== undefined ? dashboardStats.stats.totalSales : 0;
  const revenueChange = dashboardStats?.stats?.revenueChange;
  const ordersPending =
    dashboardStats?.stats?.pendingOrders !== undefined
      ? dashboardStats.stats.pendingOrders
      : pendingOrders;
  const activeBookings =
    dashboardStats?.stats?.totalEvents !== undefined
      ? dashboardStats.stats.totalEvents
      : eventBookings?.filter((b) => b.status !== 'Cancelled').length || 0;
  const eventsChange = dashboardStats?.stats?.eventsChange;
  const totalCustomers =
    dashboardStats?.stats?.totalCustomers !== undefined
      ? dashboardStats.stats.totalCustomers
      : customers?.length || 0;
  const customersChange = dashboardStats?.stats?.customersChange;

  return (
    <motion.div
      variants={fadeUp}
      className="admin-card overflow-hidden text-left relative p-0 !rounded-[4px] border border-[var(--admin-border)] shadow-xs"
    >
      {/* Top Accent Stripe */}
      <div className="absolute top-0 left-0 w-full h-[3px] bg-[var(--admin-border-strong)] z-10" />

      <div className="grid grid-cols-2 lg:grid-cols-4 bg-[var(--admin-surface)]">
        {/* Metric 1: Total Revenue */}
        <div
          onClick={() => navigate('/admin/payments')}
          className="p-3 sm:p-5 space-y-1 sm:space-y-1.5 border-r border-b lg:border-b-0 border-[var(--admin-border-subtle)] hover:bg-[var(--admin-surface-hover)] transition-colors cursor-pointer group"
          title="Click to view financial payments"
        >
          <div className="flex items-center justify-between gap-1 min-w-0">
            <span className="text-[10px] sm:text-[10.5px] text-[var(--admin-text-tertiary)] font-bold uppercase tracking-wide sm:tracking-wider flex items-center gap-1 sm:gap-1.5 min-w-0 truncate">
              <span className="material-symbols-outlined text-[14px] text-[var(--admin-accent)] shrink-0">
                payments
              </span>
              <span className="truncate">Total Revenue</span>
            </span>
            <span className="hidden sm:block material-symbols-outlined text-[13px] text-[var(--admin-text-placeholder)] opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              arrow_forward
            </span>
          </div>
          <p className="text-[18px] sm:text-[22px] font-bold text-[var(--admin-text-primary)] tracking-tight font-mono">
            {formatCurrency(totalSales)}
          </p>
          <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-[var(--admin-text-secondary)] mt-0.5 sm:mt-1">
            <span className="truncate">Gross earnings</span>
            {revenueChange !== undefined && revenueChange !== null && (
              <span
                className={`font-bold shrink-0 ml-1 inline-flex items-center gap-0.5 ${
                  Number(revenueChange) >= 0
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                <span className="material-symbols-outlined text-[11px]">
                  {Number(revenueChange) >= 0 ? 'trending_up' : 'trending_down'}
                </span>
                {Number(revenueChange) >= 0 ? `+${revenueChange}%` : `${revenueChange}%`}
              </span>
            )}
          </div>
        </div>

        {/* Metric 2: Pending Orders */}
        <div
          onClick={() => navigate('/admin/orders')}
          className="p-3 sm:p-5 space-y-1 sm:space-y-1.5 border-b lg:border-b-0 border-[var(--admin-border-subtle)] hover:bg-[var(--admin-surface-hover)] transition-colors cursor-pointer group"
          title="Click to view pending order queue"
        >
          <div className="flex items-center justify-between gap-1 min-w-0">
            <span className="text-[10px] sm:text-[10.5px] text-[var(--admin-text-tertiary)] font-bold uppercase tracking-wide sm:tracking-wider flex items-center gap-1 sm:gap-1.5 min-w-0 truncate">
              <span className="material-symbols-outlined text-[14px] text-amber-600 dark:text-amber-400 shrink-0">
                shopping_bag
              </span>
              <span className="truncate">Pending Orders</span>
            </span>
            <span className="hidden sm:block material-symbols-outlined text-[13px] text-[var(--admin-text-placeholder)] opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              arrow_forward
            </span>
          </div>
          <p className="text-[18px] sm:text-[22px] font-bold text-[var(--admin-text-primary)] tracking-tight font-mono">
            {ordersPending}
          </p>
          <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-[var(--admin-text-secondary)] mt-0.5 sm:mt-1">
            <span className="truncate hidden sm:inline">Awaiting dispatch</span>
            <span className="truncate sm:hidden">Dispatch</span>
            <span
              className={`px-1.5 py-0.2 rounded-[3px] text-[9px] sm:text-[9.5px] font-bold shrink-0 ml-1 ${
                ordersPending > 0
                  ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20'
                  : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20'
              }`}
            >
              {ordersPending > 0 ? 'Needs Attention' : 'All Clear'}
            </span>
          </div>
        </div>

        {/* Metric 3: Active Bookings */}
        <div
          onClick={() => navigate('/admin/events')}
          className="p-3 sm:p-5 space-y-1 sm:space-y-1.5 border-r border-[var(--admin-border-subtle)] hover:bg-[var(--admin-surface-hover)] transition-colors cursor-pointer group"
          title="Click to view event setups & bookings"
        >
          <div className="flex items-center justify-between gap-1 min-w-0">
            <span className="text-[10px] sm:text-[10.5px] text-[var(--admin-text-tertiary)] font-bold uppercase tracking-wide sm:tracking-wider flex items-center gap-1 sm:gap-1.5 min-w-0 truncate">
              <span className="material-symbols-outlined text-[14px] text-purple-600 dark:text-purple-400 shrink-0">
                event
              </span>
              <span className="truncate">Active Bookings</span>
            </span>
            <span className="hidden sm:block material-symbols-outlined text-[13px] text-[var(--admin-text-placeholder)] opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              arrow_forward
            </span>
          </div>
          <p className="text-[18px] sm:text-[22px] font-bold text-[var(--admin-text-primary)] tracking-tight font-mono">
            {activeBookings}
          </p>
          <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-[var(--admin-text-secondary)] mt-0.5 sm:mt-1">
            <span className="truncate">Decor & event jobs</span>
            {eventsChange !== undefined && eventsChange !== null ? (
              <span
                className={`font-bold shrink-0 ml-1 inline-flex items-center gap-0.5 ${
                  Number(eventsChange) >= 0
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                <span className="material-symbols-outlined text-[11px]">
                  {Number(eventsChange) >= 0 ? 'trending_up' : 'trending_down'}
                </span>
                {Number(eventsChange) >= 0 ? `+${eventsChange}%` : `${eventsChange}%`}
              </span>
            ) : (
              <span className="text-[10px] text-[var(--admin-text-tertiary)] font-medium">
                Confirmed
              </span>
            )}
          </div>
        </div>

        {/* Metric 4: Total Customers */}
        <div
          onClick={() => navigate('/admin/customers')}
          className="p-3 sm:p-5 space-y-1 sm:space-y-1.5 hover:bg-[var(--admin-surface-hover)] transition-colors cursor-pointer group"
          title="Click to view customer directory"
        >
          <div className="flex items-center justify-between gap-1 min-w-0">
            <span className="text-[10px] sm:text-[10.5px] text-[var(--admin-text-tertiary)] font-bold uppercase tracking-wide sm:tracking-wider flex items-center gap-1 sm:gap-1.5 min-w-0 truncate">
              <span className="material-symbols-outlined text-[14px] text-blue-600 dark:text-blue-400 shrink-0">
                group
              </span>
              <span className="truncate">Total Customers</span>
            </span>
            <span className="hidden sm:block material-symbols-outlined text-[13px] text-[var(--admin-text-placeholder)] opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              arrow_forward
            </span>
          </div>
          <p className="text-[18px] sm:text-[22px] font-bold text-[var(--admin-text-primary)] tracking-tight font-mono">
            {totalCustomers.toLocaleString()}
          </p>
          <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-[var(--admin-text-secondary)] mt-0.5 sm:mt-1">
            <span className="truncate">Client profiles</span>
            {customersChange !== undefined && customersChange !== null ? (
              <span
                className={`font-bold shrink-0 ml-1 inline-flex items-center gap-0.5 ${
                  Number(customersChange) >= 0
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                <span className="material-symbols-outlined text-[11px]">
                  {Number(customersChange) >= 0 ? 'trending_up' : 'trending_down'}
                </span>
                {Number(customersChange) >= 0 ? `+${customersChange}%` : `${customersChange}%`}
              </span>
            ) : (
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                Active
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
