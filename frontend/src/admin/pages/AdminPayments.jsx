import { m as motion, AnimatePresence } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useMemo, useEffect } from 'react';
import { useAdmin } from '../context/AdminContext';
import { formatCurrency, fadeUp, stagger } from '../components/AdminUIKit';

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[var(--admin-surface)] rounded-[var(--admin-radius-lg)] shadow-[var(--admin-shadow-lg)] border border-[var(--admin-border-subtle)] px-4 py-3">
      <p className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider">
        {label}
      </p>
      <p className="text-[14px] font-bold text-[var(--admin-text-primary)] mt-1">
        {formatCurrency(payload[0].value)}
      </p>
    </div>
  );
}

export function AdminPayments() {
  const { orders, dataLoading, searchQuery, refreshOrders } = useAdmin();

  // Auto-refresh orders every 60 seconds to keep payment stats live
  useEffect(() => {
    const interval = setInterval(() => {
      refreshOrders();
    }, 60000);
    return () => clearInterval(interval);
  }, [refreshOrders]);

  // Aggregate metrics and chart details dynamically from actual MongoDB order collections
  const metrics = useMemo(() => {
    // Start with exact zero aggregates (No static seed fallbacks)
    let totalCollected = 0;
    let thisMonth = 0;
    let pending = 0;
    let refunded = 0;

    // Initialize month labels dynamically based on past 6 months to avoid hardcoding
    const monthlyMap = {};
    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];

    const currentMonthIndex = new Date().getMonth();
    for (let i = 5; i >= 0; i--) {
      const idx = (currentMonthIndex - i + 12) % 12;
      monthlyMap[monthNames[idx]] = 0;
    }

    const currentMonthName = monthNames[currentMonthIndex];

    // Map checkout amounts into dynamic aggregates
    orders.forEach((o) => {
      const amount = Number(o.total) || 0;
      const orderDate = o.date ? new Date(o.date) : new Date();
      const monthLabel = monthNames[orderDate.getMonth()];

      if (o.payment === 'Paid') {
        totalCollected += amount;

        // Add to monthly aggregates
        if (monthlyMap[monthLabel] !== undefined) {
          monthlyMap[monthLabel] += amount;
        } else {
          monthlyMap[monthLabel] = amount;
        }

        // Track current month's collection purely
        if (monthLabel === currentMonthName) {
          thisMonth += amount;
        }
      } else if (o.status === 'Cancelled') {
        refunded += amount;
      } else {
        pending += amount;
      }
    });

    // Format chart data
    const chartData = Object.keys(monthlyMap).map((m) => ({
      month: m,
      amount: monthlyMap[m],
    }));

    // Create a transaction record list directly linked to storefront checkouts
    let transactions = orders
      .map((o) => {
        const orderNum = o.id && o.id.length > 8 ? o.id.slice(-6).toUpperCase() : o.id;
        const paymentMethod = o.rawOrder?.paymentMethod || (o.payment === 'COD' ? 'COD' : 'UPI');
        const statusLabel =
          o.payment === 'Paid' ? 'Completed' : o.status === 'Cancelled' ? 'Refunded' : 'Pending';

        return {
          id: `TXN-${o.rawOrder?.paymentInfo?.razorpayPaymentId?.slice(-8).toUpperCase() || o.id.slice(-8).toUpperCase()}`,
          order: `ORD-${orderNum}`,
          customer: o.customer || 'Anonymous Buyer',
          amount: o.total || 0,
          method: paymentMethod,
          status: statusLabel,
          date: o.date || new Date().toISOString().split('T')[0],
        };
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      transactions = transactions.filter(
        (t) =>
          (t.id || '').toLowerCase().includes(q) ||
          (t.order || '').toLowerCase().includes(q) ||
          (t.customer || '').toLowerCase().includes(q) ||
          (t.method || '').toLowerCase().includes(q) ||
          (t.status || '').toLowerCase().includes(q),
      );
    }

    return {
      totalCollected,
      thisMonth,
      pending,
      refunded,
      chartData,
      transactions,
    };
  }, [orders, searchQuery]);

  return (
    <motion.div initial="hidden" animate="show" variants={stagger} className="space-y-6">
      <PageHeader title="Payments" subtitle="Track payments and sales revenue" mobileRow={true}>
        <button className="admin-btn admin-btn-ghost" title="Export Report">
          <span className="material-symbols-outlined text-[20px]">download</span>
        </button>
      </PageHeader>

      {dataLoading ? (
        <SkeletonDashboard />
      ) : (
        <>
          <div className="admin-grid-stats">
            <StatCard
              icon="account_balance"
              label="Total Collected"
              value={formatCurrency(metrics.totalCollected)}
              change="All Time"
              changeType="neutral"
            />
            <StatCard
              icon="calendar_today"
              label="This Month"
              value={formatCurrency(metrics.thisMonth)}
              change="Current Period"
              changeType="neutral"
              color="var(--admin-success)"
            />
            <StatCard
              icon="pending"
              label="Pending Receivables"
              value={formatCurrency(metrics.pending)}
              change="To Collect"
              changeType="neutral"
              color="var(--admin-warning)"
            />
            <StatCard
              icon="undo"
              label="Refunded/Cancelled"
              value={formatCurrency(metrics.refunded)}
              change="Returns"
              changeType="neutral"
              color="var(--admin-error)"
            />
          </div>

          <ChartCard title="Monthly Collections (Sales Vol.)">
            <div className="h-[280px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={metrics.chartData}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--admin-border-subtle)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: 'var(--admin-text-tertiary)', fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                    dy={10}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: 'var(--admin-text-tertiary)', fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `₹${v >= 100000 ? `${v / 100000}L` : `${v / 1000}K`}`}
                    dx={-10}
                  />
                  <Tooltip
                    content={<ChartTooltip />}
                    cursor={{ fill: 'var(--admin-surface-muted)' }}
                  />
                  <Bar
                    dataKey="amount"
                    fill="var(--admin-accent)"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={50}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          <motion.div variants={fadeUp} className="admin-card overflow-hidden p-0">
            <div className="p-5 border-b border-[var(--admin-border-subtle)] flex items-center justify-between">
              <div>
                <h3 className="text-[16px] font-bold text-[var(--admin-text-primary)]">
                  Recent Transactions
                </h3>
                <p className="text-[12px] text-[var(--admin-text-tertiary)] mt-1">
                  Payments received across all methods.
                </p>
              </div>
              <span className="admin-badge admin-badge-neutral font-bold uppercase tracking-wider">
                {metrics.transactions.length} total
              </span>
            </div>

            <div className="overflow-x-auto">
              <AnimatePresence mode="wait">
                {metrics.transactions.length === 0 ? (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="p-16 text-center flex flex-col items-center justify-center"
                  >
                    <span className="material-symbols-outlined text-[48px] text-[var(--admin-text-tertiary)] mb-4">
                      search_off
                    </span>
                    <p className="text-[14px] font-bold text-[var(--admin-text-primary)] mb-1">
                      No results
                    </p>
                    <p className="text-[12px] text-[var(--admin-text-secondary)]">
                      No transactions matched your search.
                    </p>
                  </motion.div>
                ) : (
                  <motion.table
                    key="table"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="admin-table w-full min-w-[800px]"
                  >
                    <thead>
                      <tr>
                        <th>Transaction ID</th>
                        <th>Order Reference</th>
                        <th>Customer</th>
                        <th>Amount</th>
                        <th className="hidden sm:table-cell">Method</th>
                        <th>Status</th>
                        <th className="hidden md:table-cell text-right">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metrics.transactions.map((p) => (
                        <tr
                          key={p.id}
                          className="hover:bg-[var(--admin-surface-muted)] transition-colors"
                        >
                          <td>
                            <p className="font-bold text-[var(--admin-text-primary)] text-[12px] uppercase tracking-wider">
                              {p.id}
                            </p>
                          </td>
                          <td>
                            <p className="font-bold text-[var(--admin-text-tertiary)] text-[12px] uppercase tracking-wider">
                              {p.order}
                            </p>
                          </td>
                          <td className="font-bold text-[var(--admin-text-secondary)]">
                            {p.customer}
                          </td>
                          <td className="font-bold text-[var(--admin-text-primary)] text-[13px]">
                            {formatCurrency(p.amount)}
                          </td>
                          <td className="hidden sm:table-cell">
                            <span className="admin-badge admin-badge-neutral text-[10px] font-bold tracking-wider">
                              {p.method}
                            </span>
                          </td>
                          <td>
                            <StatusBadge status={p.status} />
                          </td>
                          <td className="hidden md:table-cell text-right text-[var(--admin-text-tertiary)] font-bold">
                            {new Date(p.date).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </motion.table>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </motion.div>
  );
}
