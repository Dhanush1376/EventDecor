import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useAdmin } from '../context/AdminContext';
import { handleImageError } from '../../utils/imageUtils';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import {
  PageHeader,
  StatCard,
  ChartCard,
  ChartTooltip,
  PeriodSelector,
  StatusBadge,
  formatCurrency,
  getRelativeTime,
  fadeUp,
  stagger,
  CHART_COLORS,
  SkeletonDashboard,
  AdminToggle,
} from '../components/AdminUIKit';

const FALLBACK_DATE = new Date('2026-05-20T00:00:00Z');
const FALLBACK_PRODUCT_DATE = new Date('2026-05-17T00:00:00Z');

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

export function AdminDashboard() {
  const {
    orders,
    eventBookings,
    products,
    dashboardStats,
    customers,
    auditLogs,
    safetyLock,
    toggleSafetyLock,
    maintenanceMode,
    toggleMaintenanceMode,
    lastDataRefresh,
    refreshDashboard,
    refreshOrders,
    dataLoading,
  } = useAdmin();
  const navigate = useNavigate();
  const [chartPeriod, setChartPeriod] = useState('yearly');
  const isMobile = useMediaQuery('(max-width: 768px)');

  // Auto-refresh dashboard data every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refreshDashboard();
      refreshOrders();
    }, 60000);
    return () => clearInterval(interval);
  }, [refreshDashboard, refreshOrders]);

  const pendingOrders = orders.filter((o) => o.status === 'Pending').length;
  const lowStockProducts = products.filter((p) => p.stock > 0 && p.stock <= 5).length;
  const outOfStock = products.filter((p) => p.stock === 0).length;

  // Prepare Revenue Overview data
  const revenueChartData = useMemo(() => {
    if (dashboardStats?.monthlyRevenue && dashboardStats.monthlyRevenue.length > 0) {
      return [...dashboardStats.monthlyRevenue].reverse();
    }
    const monthlyMap = {};
    orders.forEach((o) => {
      if (!o.rawOrder?.createdAt) return;
      const date = new Date(o.rawOrder.createdAt);
      const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
      if (!monthlyMap[key]) {
        monthlyMap[key] = { month: key, revenue: 0, orders: 0 };
      }
      monthlyMap[key].revenue += o.total;
      monthlyMap[key].orders += 1;
    });

    const list = Object.values(monthlyMap);
    if (list.length > 0) {
      return list.sort((a, b) => {
        const [yA, mA] = a.month.split('-').map(Number);
        const [yB, mB] = b.month.split('-').map(Number);
        return yA !== yB ? yA - yB : mA - mB;
      });
    }
    return [];
  }, [dashboardStats, orders]);

  // Calculate top categories dynamically
  const categoryChartData = useMemo(() => {
    if (dashboardStats?.categoryPerformance && dashboardStats.categoryPerformance.length > 0) {
      const total = dashboardStats.categoryPerformance.reduce(
        (sum, item) => sum + (item.value || 0),
        0,
      );
      return dashboardStats.categoryPerformance.map((item, idx) => ({
        name: item.name,
        value: total > 0 ? Math.round((item.value / total) * 100) : 0,
        fill: CHART_COLORS[idx % CHART_COLORS.length],
      }));
    }

    const catMap = {};
    products.forEach((p) => {
      const cat = p.category || 'Uncategorized';
      catMap[cat] = (catMap[cat] || 0) + 1;
    });

    const total = Object.values(catMap).reduce((sum, v) => sum + v, 0);
    if (total > 0) {
      return Object.entries(catMap).map(([name, val], idx) => ({
        name,
        value: Math.round((val / total) * 100),
        fill: CHART_COLORS[idx % CHART_COLORS.length],
      }));
    }
    return [];
  }, [dashboardStats, products]);

  // Generate real-time activity stream
  const dynamicRecentActivity = useMemo(() => {
    const activity = [];
    orders.forEach((o) => {
      const ts = o.rawOrder?.createdAt ? new Date(o.rawOrder.createdAt) : null;
      activity.push({
        icon: 'shopping_bag',
        text: `Order ${o.id || 'New'} placed by ${o.customer || 'Guest'}`,
        timestamp: ts || FALLBACK_DATE,
      });
    });
    products.forEach((p) => {
      const ts = p.rawProduct?.createdAt ? new Date(p.rawProduct.createdAt) : null;
      activity.push({
        icon: 'inventory_2',
        text: `Product '${p.name}' added to catalog`,
        timestamp: ts || FALLBACK_PRODUCT_DATE,
      });
    });
    eventBookings.forEach((b) => {
      const ts = b.rawOrder?.createdAt ? new Date(b.rawOrder.createdAt) : null;
      activity.push({
        icon: 'celebration',
        text: `Consultation request for ${b.eventType || 'Event'}`,
        timestamp: ts || FALLBACK_DATE,
      });
    });
    auditLogs.forEach((log) => {
      activity.push({
        icon:
          log.action.includes('LOCK') || log.action.includes('MAINTENANCE')
            ? 'shield'
            : 'receipt_long',
        text: `[${log.actor.toUpperCase()}] ${log.action}: ${log.details}`,
        timestamp: new Date(log.timestamp),
      });
    });

    if (activity.length === 0) return [];
    return activity
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 7)
      .map((item) => ({
        ...item,
        time: getRelativeTime(item.timestamp),
      }));
  }, [orders, products, eventBookings, auditLogs]);

  // Compute weekly metrics
  const weeklyOrderStats = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dailyMap = {};
    days.forEach((day) => {
      dailyMap[day] = { day, ordersCount: 0, itemsCount: 0 };
    });

    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    orders.forEach((o) => {
      if (!o.rawOrder?.createdAt) return;
      const date = new Date(o.rawOrder.createdAt);
      if (date >= oneWeekAgo) {
        const dayName = days[date.getDay()];
        dailyMap[dayName].ordersCount += 1;
        const itemsSold = Array.isArray(o.rawOrder.items)
          ? o.rawOrder.items.reduce((sum, item) => sum + (item.quantity || 0), 0)
          : 1;
        dailyMap[dayName].itemsCount += itemsSold;
      }
    });
    return days.map((day) => dailyMap[day]);
  }, [orders]);

  // Trending products
  const trendingProducts = useMemo(() => {
    if (!products || products.length === 0) return [];
    return [...products].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 4);
  }, [products]);

  const quickActions = [
    {
      icon: 'edit_note',
      label: 'Edit Web Pages',
      path: '/admin/content',
      color: 'var(--admin-accent)',
    },
    {
      icon: 'design_services',
      label: 'Custom Orders',
      path: '/admin/custom-orders',
      color: 'var(--admin-info)',
    },
    { icon: 'shopping_bag', label: 'Orders', path: '/admin/orders', color: 'var(--admin-success)' },
    {
      icon: 'analytics',
      label: 'Analytics',
      path: '/admin/analytics',
      color: 'var(--admin-warning)',
    },
  ];

  if (dataLoading) {
    return <SkeletonDashboard />;
  }

  return (
    <motion.div initial="hidden" animate="show" variants={stagger} className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Dashboard"
        subtitle={`Welcome back. Here's your business overview. · Last synced ${lastDataRefresh ? lastDataRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}`}
        icon="dashboard"
        iconColor="revenue"
      />

      <div className="flex w-full mt-[-8px]">
        <PeriodSelector
          value={chartPeriod}
          onChange={setChartPeriod}
          periods={['weekly', 'monthly', 'yearly']}
        />
      </div>

      <motion.div
        variants={fadeUp}
        className="admin-card-interactive bg-[var(--admin-surface-muted)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5"
        onClick={() => navigate('/admin/content')}
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-[var(--admin-radius-lg)] bg-[var(--admin-text-primary)] text-[var(--admin-text-inverse)] flex items-center justify-center shrink-0 shadow-[var(--admin-shadow-sm)]">
            <span className="material-symbols-outlined text-[20px]">view_quilt</span>
          </div>
          <div>
            <h2 className="text-[14px] font-semibold text-[var(--admin-text-primary)] tracking-tight">
              Website Layout & Content
            </h2>
            <p className="text-[11px] text-[var(--admin-text-tertiary)] mt-0.5">
              Manage website layout and content.
            </p>
          </div>
        </div>
        <button className="admin-btn admin-btn-outline bg-[var(--admin-surface)] min-h-[36px] self-end sm:self-auto">
          Open Website Editor
          <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
        </button>
      </motion.div>

      {/* Quick Security Overrides */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="admin-card p-0 overflow-hidden border-2 border-[var(--admin-domain-danger-bg)] hover:border-[var(--admin-domain-danger)] transition-colors shadow-sm bg-white">
          <AdminToggle
            label="Global Safety Lock"
            description="Block database writes to prevent accidental modifications during critical updates."
            consequence={
              safetyLock ? 'Database writes are blocked.' : 'Database is open for writes.'
            }
            checked={safetyLock}
            onChange={toggleSafetyLock}
            variant="error"
            activeBgColor="var(--admin-domain-danger)"
            className="px-5 py-4 border-none"
          />
        </div>

        <div className="admin-card p-0 overflow-hidden border-2 border-[var(--admin-domain-users-bg)] hover:border-[var(--admin-domain-users)] transition-colors shadow-sm bg-white">
          <AdminToggle
            label="Maintenance Shield"
            description="Redirect all storefront traffic to a maintenance screen."
            consequence={
              maintenanceMode ? 'Storefront is offline.' : 'Storefront is publicly accessible.'
            }
            checked={maintenanceMode}
            onChange={toggleMaintenanceMode}
            variant="warning"
            activeBgColor="var(--admin-domain-users)"
            className="px-5 py-4 border-none"
          />
        </div>
      </motion.div>

      {/* Stat Cards Grid */}
      <motion.div variants={stagger} className="admin-grid-stats">
        <StatCard
          icon="payments"
          label="Total Revenue"
          value={formatCurrency(
            dashboardStats?.stats?.totalSales !== undefined ? dashboardStats.stats.totalSales : 0,
          )}
          change="+15.4%"
          changeType="up"
          domainColor="revenue"
          infoTooltip="Total gross revenue before refunds."
          onClick={() => navigate('/admin/payments')}
          sparklinePath="M0,20 Q15,5 30,20 T60,8 T90,18 T100,5"
          progress={
            Math.min(100, Math.round(((dashboardStats?.stats?.totalSales || 0) / 100000) * 100)) ||
            5
          }
        />
        <StatCard
          icon="shopping_bag"
          label="Pending Orders"
          value={
            dashboardStats?.stats?.pendingOrders !== undefined
              ? dashboardStats.stats.pendingOrders
              : pendingOrders
          }
          change={pendingOrders > 0 ? 'Needs Review' : 'Healthy'}
          changeType={pendingOrders > 3 ? 'down' : 'up'}
          domainColor="orders"
          infoTooltip="Orders that have not been fulfilled yet."
          onClick={() => navigate('/admin/orders')}
          sparklinePath="M0,8 Q20,25 40,12 T80,18 T100,10"
          progress={Math.min(100, Math.round((pendingOrders / 20) * 100)) || 5}
        />
        <StatCard
          icon="event"
          label="Active Bookings"
          value={
            dashboardStats?.stats?.totalEvents !== undefined
              ? dashboardStats.stats.totalEvents
              : eventBookings.filter((b) => b.status !== 'Cancelled').length
          }
          change="+8.1%"
          changeType="up"
          domainColor="orders"
          infoTooltip="Upcoming event consultations and setups."
          onClick={() => navigate('/admin/events')}
          sparklinePath="M0,22 Q20,12 40,25 T80,8 T100,18"
          progress={
            Math.min(
              100,
              Math.round((eventBookings.filter((b) => b.status !== 'Cancelled').length / 50) * 100),
            ) || 5
          }
        />
        <StatCard
          icon="group"
          label="Total Customers"
          value={(dashboardStats?.stats?.totalCustomers !== undefined
            ? dashboardStats.stats.totalCustomers
            : customers?.length || 0
          ).toLocaleString()}
          change="+11.3%"
          changeType="up"
          domainColor="users"
          infoTooltip="Registered customers and accounts."
          onClick={() => navigate('/admin/customers')}
          sparklinePath="M0,25 Q20,18 40,10 T80,5 T100,2"
          progress={Math.min(100, Math.round(((customers?.length || 0) / 100) * 100)) || 5}
        />
      </motion.div>

      {/* Charts Row */}
      <div className="admin-grid-charts">
        {/* Revenue Chart */}
        <ChartCard
          title="Sales Overview"
          subtitle="Monthly sales & order trends"
          legend={
            <>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[var(--admin-accent)]" />
                Sales
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[var(--admin-border-strong)]" />
                Orders
              </span>
            </>
          }
        >
          {orders.length === 0 ? (
            <div className="h-[280px] flex flex-col items-center justify-center bg-[var(--admin-bg-subtle)] rounded-[var(--admin-radius-lg)] border border-dashed border-[var(--admin-border)]">
              <span className="material-symbols-outlined text-[32px] text-[var(--admin-text-tertiary)] mb-2">
                analytics
              </span>
              <span className="text-[11px] uppercase font-bold text-[var(--admin-text-secondary)] tracking-wider">
                No Sales Trends Recorded
              </span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={isMobile ? 220 : 280}>
              <AreaChart
                data={revenueChartData}
                margin={{ top: 10, right: 0, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--admin-accent)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="var(--admin-accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--admin-border-subtle)"
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 10, fill: 'var(--admin-text-tertiary)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  hide={isMobile}
                  tick={{ fontSize: 10, fill: 'var(--admin-text-tertiary)' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={formatCurrency}
                />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="var(--admin-accent)"
                  fill="url(#colorSales)"
                  strokeWidth={2}
                  name="Sales"
                />
                <Area
                  type="monotone"
                  dataKey="orders"
                  stroke="var(--admin-border-strong)"
                  fill="transparent"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  name="Orders"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Category Performance */}
        <ChartCard title="Top Categories" subtitle="Sales distribution by category">
          {categoryChartData.length === 0 ? (
            <div className="h-[240px] flex flex-col items-center justify-center bg-[var(--admin-bg-subtle)] rounded-[var(--admin-radius-lg)] border border-dashed border-[var(--admin-border)]">
              <span className="material-symbols-outlined text-[32px] text-[var(--admin-text-tertiary)] mb-2">
                pie_chart
              </span>
              <span className="text-[11px] uppercase font-bold text-[var(--admin-text-secondary)] tracking-wider">
                No Sales Recorded
              </span>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={categoryChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    dataKey="value"
                    paddingAngle={2}
                    strokeWidth={0}
                  >
                    {categoryChartData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2.5 mt-4">
                {categoryChartData.slice(0, 4).map((cat, i) => (
                  <div key={i} className="flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: cat.fill }}
                      />
                      <span className="text-[var(--admin-text-secondary)] font-medium truncate max-w-[120px]">
                        {cat.name}
                      </span>
                    </span>
                    <span className="font-bold text-[var(--admin-text-primary)]">{cat.value}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </ChartCard>
      </div>

      {/* Middle Row */}
      <div className="admin-grid-content">
        {/* Quick Actions */}
        <motion.div variants={fadeUp} className="admin-card p-4 sm:p-6">
          <h3 className="text-[14px] font-semibold text-[var(--admin-text-primary)] mb-5">
            Quick Actions
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((a, i) => (
              <motion.button
                key={i}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate(a.path)}
                className="flex items-center sm:flex-col sm:justify-center gap-3 sm:gap-2.5 p-3 sm:p-4 rounded-[var(--admin-radius-lg)] border border-[var(--admin-border)] hover:border-[var(--admin-border-strong)] hover:bg-[var(--admin-surface-hover)] hover:shadow-[var(--admin-shadow-sm)] cursor-pointer transition-all group min-h-[56px] sm:min-h-0 w-full text-left sm:text-center bg-[var(--admin-surface)]"
              >
                <div
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-[var(--admin-radius-md)] flex items-center justify-center shrink-0 transition-colors"
                  style={{ backgroundColor: `${a.color}12`, color: a.color }}
                >
                  <span className="material-symbols-outlined text-[18px] sm:text-[20px] group-hover:scale-110 transition-transform">
                    {a.icon}
                  </span>
                </div>
                <span className="text-[12px] sm:text-[11px] font-bold sm:font-semibold text-[var(--admin-text-secondary)] group-hover:text-[var(--admin-text-primary)] transition-colors leading-tight">
                  {a.label}
                </span>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div variants={fadeUp} className="admin-card p-4 sm:p-6 flex flex-col">
          <h3 className="text-[14px] font-semibold text-[var(--admin-text-primary)] mb-5">
            Recent Activity
          </h3>
          {dynamicRecentActivity.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center bg-[var(--admin-bg-subtle)] rounded-[var(--admin-radius-lg)] border border-dashed border-[var(--admin-border)] p-6 text-center">
              <span className="material-symbols-outlined text-[28px] text-[var(--admin-text-tertiary)] mb-2">
                history
              </span>
              <span className="text-[11px] uppercase font-bold text-[var(--admin-text-secondary)] tracking-wider">
                No Recent Activity
              </span>
            </div>
          ) : (
            <div className="relative pl-1">
              {dynamicRecentActivity.slice(0, 5).map((a, i) => (
                <div key={i} className="relative flex items-start gap-3.5 pb-5 last:pb-0 group">
                  {/* Timeline connector line */}
                  {i < Math.min(dynamicRecentActivity.length, 5) - 1 && (
                    <span
                      className="absolute left-[15px] top-8 bottom-0 w-[1.5px] bg-[var(--admin-border-subtle)]"
                      aria-hidden="true"
                    />
                  )}
                  {/* Icon */}
                  <div className="w-8 h-8 rounded-[var(--admin-radius-md)] bg-[var(--admin-surface-muted)] border border-[var(--admin-border)] flex items-center justify-center shrink-0 text-[var(--admin-text-secondary)] relative z-10 transition-colors group-hover:border-[var(--admin-border-strong)]">
                    <span className="material-symbols-outlined text-[15px]">{a.icon}</span>
                  </div>
                  {/* Content */}
                  <div className="flex-1 min-w-0 pt-0.5">
                    <p className="text-[12px] text-[var(--admin-text-primary)] font-medium leading-relaxed break-words whitespace-normal">
                      {a.text}
                    </p>
                    <span className="inline-flex items-center gap-1 text-[10px] text-[var(--admin-text-tertiary)] mt-1 font-medium">
                      <span className="material-symbols-outlined text-[10px] leading-none">
                        schedule
                      </span>
                      {a.time}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Inventory Alerts */}
        <motion.div variants={fadeUp} className="admin-card p-4 sm:p-6 flex flex-col">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-[14px] font-semibold text-[var(--admin-text-primary)]">
              Inventory Alerts
            </h3>
            <button
              onClick={() => navigate('/admin/inventory')}
              className="text-[11px] font-bold text-[var(--admin-accent)] hover:underline cursor-pointer min-h-0"
            >
              View All
            </button>
          </div>
          {outOfStock === 0 &&
          lowStockProducts === 0 &&
          products.filter((p) => p.stock <= 5).length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-[var(--admin-success-light)] to-[rgba(16,185,129,0.02)] rounded-[var(--admin-radius-lg)] border border-[var(--admin-success-border)] p-6 text-center shadow-[inset_0_1px_2px_rgba(16,185,129,0.05)]">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-2.5 animate-pulse">
                <span className="material-symbols-outlined text-[22px] font-bold">
                  check_circle
                </span>
              </div>
              <span className="text-[11px] uppercase font-bold tracking-wider text-emerald-700">
                Stock Levels Healthy
              </span>
              <p className="text-[10px] text-emerald-600/80 mt-1 font-medium">
                All products are well stocked
              </p>
            </div>
          ) : (
            <div className="flex-1 overflow-hidden flex flex-col">
              {outOfStock > 0 && (
                <div className="flex items-center gap-3 p-3 rounded-[var(--admin-radius-md)] bg-[var(--admin-error-light)] border border-[var(--admin-error-border)] mb-3">
                  <span className="material-symbols-outlined text-[18px] text-[var(--admin-error)]">
                    error
                  </span>
                  <div>
                    <p className="text-[12px] font-bold text-[var(--admin-error)]">
                      {outOfStock} Product{outOfStock > 1 ? 's' : ''} Out of Stock
                    </p>
                    <p className="text-[10px] text-[var(--admin-error)] opacity-80 mt-0.5">
                      Immediate attention required
                    </p>
                  </div>
                </div>
              )}
              {lowStockProducts > 0 && (
                <div className="flex items-center gap-3 p-3 rounded-[var(--admin-radius-md)] bg-[var(--admin-warning-light)] border border-[var(--admin-warning-border)] mb-3">
                  <span className="material-symbols-outlined text-[18px] text-[var(--admin-warning)]">
                    warning
                  </span>
                  <div>
                    <p className="text-[12px] font-bold text-[var(--admin-warning)]">
                      {lowStockProducts} Product{lowStockProducts > 1 ? 's' : ''} Low Stock
                    </p>
                    <p className="text-[10px] text-[var(--admin-warning)] opacity-80 mt-0.5">
                      Running below threshold
                    </p>
                  </div>
                </div>
              )}
              <div className="space-y-2 mt-2">
                {products
                  .filter((p) => p.stock <= 5)
                  .slice(0, 3)
                  .map((p, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2 rounded-[var(--admin-radius-md)] border border-[var(--admin-border-subtle)] hover:bg-[var(--admin-surface-hover)] transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <img
                          onError={handleImageError}
                          src={p.image}
                          alt={p.name}
                          className="w-9 h-9 rounded-[var(--admin-radius-md)] object-cover border border-[var(--admin-border)] shrink-0 shadow-sm"
                        />
                        <div className="min-w-0 flex-1">
                          <span className="text-[12px] text-[var(--admin-text-primary)] font-bold truncate block">
                            {p.name}
                          </span>
                          <span className="text-[10px] text-[var(--admin-text-tertiary)] block mt-0.5 truncate">
                            {p.category || 'General'} · {formatCurrency(p.price)}
                          </span>
                        </div>
                      </div>
                      <span
                        className={`admin-badge ${p.stock === 0 ? 'admin-badge-error' : 'admin-badge-warning'} shrink-0 ml-2 font-bold text-[9px] px-2 py-0.5`}
                      >
                        {p.stock === 0 ? 'OUT' : `${p.stock} LEFT`}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Weekly Order & Sales Volume Chart */}
      <ChartCard
        title="Weekly Order Velocity"
        subtitle="Orders and sales this week"
        className="p-4 sm:p-6"
      >
        <ResponsiveContainer width="100%" height={isMobile ? 180 : 220}>
          <BarChart
            data={weeklyOrderStats}
            barGap={isMobile ? 4 : 6}
            margin={{ top: 10, right: 5, left: isMobile ? -20 : -10, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--admin-border-subtle)"
              vertical={false}
            />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 10, fill: 'var(--admin-text-tertiary)' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              hide={isMobile}
              allowDecimals={false}
              tick={{ fontSize: 10, fill: 'var(--admin-text-tertiary)' }}
              axisLine={false}
              tickLine={false}
              width={25}
            />
            <Tooltip content={<ChartTooltip />} />
            <Bar
              dataKey="ordersCount"
              fill="var(--admin-accent)"
              radius={[4, 4, 0, 0]}
              name="Orders Placed"
            />
            <Bar
              dataKey="itemsCount"
              fill="var(--admin-border-strong)"
              radius={[4, 4, 0, 0]}
              name="Products Sold"
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Bottom Row */}
      <div className="admin-grid-content">
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
    </motion.div>
  );
}
