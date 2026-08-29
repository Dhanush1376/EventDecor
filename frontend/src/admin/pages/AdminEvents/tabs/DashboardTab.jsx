import { m as motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  StatCard,
  ChartCard,
  StatusBadge,
  formatCurrency,
  fadeUp,
} from '../../../components/AdminUIKit';
import AdminServiceability from '../../AdminServiceability';

export function DashboardTab({
  bookings,
  setActiveTab,
  totalContractVal,
  outstandingBal,
  activeBookingsCount,
  upcomingSetupsCount,
}) {
  const navigate = useNavigate();

  const categoryStats = (() => {
    const counts = {};
    bookings.forEach((b) => {
      const type = b.eventType || 'Other';
      counts[type] = (counts[type] || 0) + 1;
    });

    const colors = [
      'var(--admin-accent)',
      'var(--admin-text-primary)',
      'var(--admin-warning)',
      'var(--admin-success)',
      '#3b82f6',
      'var(--admin-text-tertiary)',
    ];

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([type, count], idx) => ({
        label: type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        count,
        color: colors[idx % colors.length],
      }));
  })();

  return (
    <motion.div
      key="dashboard"
      initial="hidden"
      animate="show"
      variants={fadeUp}
      className="space-y-6"
    >
      <div className="admin-grid-stats">
        <StatCard
          icon="account_balance_wallet"
          label="Total Bookings Value"
          value={formatCurrency(totalContractVal)}
          change="Active Bookings"
          changeType="up"
          color="var(--admin-info)"
        />
        <StatCard
          icon="pending_actions"
          label="Pending Payments"
          value={formatCurrency(outstandingBal)}
          change="To Collect"
          changeType="up"
          color="var(--admin-warning)"
        />
        <StatCard
          icon="event_available"
          label="Setups Today"
          value={activeBookingsCount}
          change="Live Events"
          changeType="up"
          color="var(--admin-success)"
        />
        <StatCard
          icon="edit_calendar"
          label="Upcoming Setups"
          value={upcomingSetupsCount}
          change="Scheduled"
          changeType="up"
          color="var(--admin-accent)"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ChartCard title="New Event Inquiries">
          <div className="space-y-3 mt-4">
            {bookings.slice(0, 4).map((b) => (
              <div
                key={b._id || b.id}
                onClick={() => navigate(`/admin/bookings/${b._id || b.id}`)}
                className="p-3 bg-[var(--admin-surface)] border border-[var(--admin-border-subtle)] rounded-[var(--admin-radius-lg)] flex items-center justify-between hover:border-[var(--admin-border-strong)] cursor-pointer transition-colors"
              >
                <div className="space-y-1 min-w-0 flex-1 pr-4">
                  <span className="admin-badge admin-badge-neutral text-[9px] uppercase font-bold">
                    {b.eventType}
                  </span>
                  <h4 className="text-[12px] font-bold text-[var(--admin-text-primary)] truncate">
                    {b.title}
                  </h4>
                  <p className="text-[11px] text-[var(--admin-text-tertiary)] truncate">
                    {b.venue?.address}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[12px] font-bold text-[var(--admin-text-primary)] block">
                    {formatCurrency(b.pricing?.totalPrice)}
                  </span>
                  <StatusBadge status={b.status.replace('_', '')} />
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() => setActiveTab('bookings')}
            className="w-full mt-4 py-2 text-[12px] font-bold text-[var(--admin-accent)] hover:text-[var(--admin-accent-hover)] transition-colors text-center"
          >
            View All Bookings →
          </button>
        </ChartCard>

        <ChartCard title="Occasion Category Distributions">
          <div className="space-y-4 mt-4">
            {categoryStats.length === 0 ? (
              <div className="text-[12px] text-[var(--admin-text-tertiary)] py-4 text-center">
                No occasion data available yet.
              </div>
            ) : (
              categoryStats.map((cat, idx) => {
                const pct = bookings.length > 0 ? (cat.count / bookings.length) * 100 : 0;
                return (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex justify-between text-[11px] font-bold">
                      <span className="text-[var(--admin-text-secondary)]">{cat.label}</span>
                      <span className="text-[var(--admin-text-primary)]">
                        {cat.count} Setups ({Math.round(pct)}%)
                      </span>
                    </div>
                    <div className="h-2 w-full bg-[var(--admin-surface-muted)] rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: cat.color }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ChartCard>
      </div>

      <div className="pt-6 border-t border-[var(--admin-border-subtle)] mt-8">
        <AdminServiceability />
      </div>
    </motion.div>
  );
}
