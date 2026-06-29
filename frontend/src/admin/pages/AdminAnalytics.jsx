import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { m as motion } from 'framer-motion';
import { useMemo, useEffect, useState } from 'react';
import { useAdmin } from '../context/AdminContext';

import {
  PageHeader,
  ChartCard,
  SkeletonDashboard,
  formatCurrency,
  fadeUp,
  stagger,
} from '../components/AdminUIKit';
import { useMediaQuery } from '../../hooks/useMediaQuery';

const Sparkline = ({ color, data }) => (
  <svg viewBox="0 0 100 30" className="w-16 h-8 ml-auto opacity-80" preserveAspectRatio="none">
    <path
      d={data}
      fill="none"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d={`${data} L 100 30 L 0 30 Z`}
      fill={`url(#gradient-${color.replace('#', '').replace('var(--', '').replace(')', '')})`}
      opacity="0.3"
    />
    <defs>
      <linearGradient
        id={`gradient-${color.replace('#', '').replace('var(--', '').replace(')', '')}`}
        x1="0"
        y1="0"
        x2="0"
        y2="1"
      >
        <stop offset="0%" stopColor={color} stopOpacity="1" />
        <stop offset="100%" stopColor={color} stopOpacity="0" />
      </linearGradient>
    </defs>
  </svg>
);

const PremiumStatCard = ({ icon, label, value, change, changeType, color, sparklineData }) => {
  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="relative overflow-hidden p-5 rounded-[var(--admin-radius-xl)] flex flex-col bg-[var(--admin-surface)] border border-[var(--admin-border)]"
      style={{
        boxShadow: '0 4px 20px -10px rgba(0,0,0,0.05)',
      }}
    >
      {/* Subtle Background Glow */}
      <div
        className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-[0.04] pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
          transform: 'translate(30%, -30%)',
        }}
      />

      <div className="flex items-center justify-between mb-4 z-10">
        <div
          className="w-10 h-10 rounded-[var(--admin-radius-md)] flex items-center justify-center"
          style={{
            background: `color-mix(in srgb, ${color} 10%, transparent)`,
            border: `1px solid color-mix(in srgb, ${color} 20%, transparent)`,
          }}
        >
          <span className="material-symbols-outlined text-[20px]" style={{ color }}>
            {icon}
          </span>
        </div>
        {change !== null && change !== undefined && (
          <div
            className={`flex items-center gap-1 text-[11.5px] font-bold px-2 py-1 rounded-full tracking-wide ${
              changeType === 'up'
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                : changeType === 'down'
                  ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                  : 'bg-[var(--admin-surface-muted)] text-[var(--admin-text-tertiary)]'
            }`}
          >
            <span className="material-symbols-outlined text-[14px]">
              {changeType === 'up'
                ? 'trending_up'
                : changeType === 'down'
                  ? 'trending_down'
                  : 'horizontal_rule'}
            </span>
            {change}
          </div>
        )}
      </div>

      <div className="flex items-end justify-between z-10">
        <div>
          <p className="text-[12px] text-[var(--admin-text-tertiary)] font-bold tracking-wider mb-1.5 uppercase">
            {label}
          </p>
          <h3 className="text-[24px] font-extrabold text-[var(--admin-text-primary)] tracking-tight leading-none">
            {value}
          </h3>
        </div>
        {sparklineData && <Sparkline color={color} data={sparklineData} />}
      </div>
    </motion.div>
  );
};

const CustomDualTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[var(--admin-surface)]/90 backdrop-blur-md border border-[var(--admin-border-strong)] p-4 rounded-[var(--admin-radius-lg)] shadow-2xl">
        <p className="text-[12px] font-bold text-[var(--admin-text-secondary)] mb-3 tracking-wide">
          {label}
        </p>
        <div className="space-y-2.5">
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center justify-between gap-8">
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full shadow-sm"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-[13px] font-medium text-[var(--admin-text-tertiary)] capitalize">
                  {entry.name}
                </span>
              </div>
              <span className="text-[14px] font-bold text-[var(--admin-text-primary)]">
                {entry.name === 'revenue'
                  ? formatCurrency(entry.value)
                  : entry.value.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

const CustomBarTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[var(--admin-surface)]/90 backdrop-blur-md border border-[var(--admin-border-strong)] p-3 rounded-[var(--admin-radius-md)] shadow-xl">
        <p className="text-[12px] font-bold text-[var(--admin-text-secondary)] mb-1.5 tracking-wide">
          {label}
        </p>
        <div className="flex items-center gap-4">
          <span className="text-[13px] font-medium text-[var(--admin-text-tertiary)]">Volume</span>
          <span className="text-[14px] font-bold text-[var(--admin-text-primary)]">
            {payload[0].value.toLocaleString()} items
          </span>
        </div>
      </div>
    );
  }
  return null;
};

const getActivityStyles = (activity) => {
  const t = (activity.type || activity.action || '').toLowerCase();
  if (t.includes('order'))
    return { icon: 'local_mall', color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)' };
  if (t.includes('review'))
    return { icon: 'star', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' };
  if (t.includes('user') || t.includes('customer'))
    return { icon: 'person', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.12)' };
  if (t.includes('payment') || t.includes('refund'))
    return { icon: 'payments', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)' };
  return { icon: 'notifications', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)' };
};

const generateSparklinePath = (dataPoints) => {
  if (!dataPoints || dataPoints.length < 2) return 'M0,15 L100,15'; // Flat line for single or empty data

  const max = Math.max(...dataPoints);
  const min = Math.min(...dataPoints);
  const range = max - min || 1;
  const stepX = 100 / (dataPoints.length - 1);

  // Create smooth bezier curves using quadratic curves
  const points = dataPoints.map((val, i) => {
    const x = i * stepX;
    // Y mapped between 5 and 25 for 5px padding top/bottom
    const y = 25 - ((val - min) / range) * 20;
    return { x, y };
  });

  let path = `M${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const cx = (p0.x + p1.x) / 2;
    path += ` C${cx},${p0.y} ${cx},${p1.y} ${p1.x},${p1.y}`;
  }
  return path;
};

export function AdminAnalytics() {
  const { dashboardStats, dataLoading, refreshDashboard, lastDataRefresh } = useAdmin();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState('12M');

  // Auto-refresh analytics data every 90 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refreshDashboard();
    }, 90000);
    return () => clearInterval(interval);
  }, [refreshDashboard]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshDashboard();
    setTimeout(() => setIsRefreshing(false), 600); // Add a small delay for smoother UX
  };

  const stats = useMemo(() => {
    if (!dashboardStats)
      return {
        totalSales: 0,
        totalOrders: 0,
        totalCustomers: 0,
        pendingOrders: 0,
        revenueTrend: [],
        categoryStats: [],
        recentActivity: [],
      };
    return dashboardStats;
  }, [dashboardStats]);

  // Dynamically calculate trends and sparklines from actual monthly data
  const {
    revenueChangeStr,
    revenueChangeType,
    sparklineRevenue,
    ordersChangeStr,
    ordersChangeType,
    sparklineOrders,
  } = useMemo(() => {
    const defaultRes = {
      revenueChangeStr: '0%',
      revenueChangeType: 'neutral',
      sparklineRevenue: 'M0,15 L100,15',
      ordersChangeStr: '0%',
      ordersChangeType: 'neutral',
      sparklineOrders: 'M0,15 L100,15',
    };
    if (!stats.monthlyRevenue || stats.monthlyRevenue.length === 0) return defaultRes;

    // Backend returns descending by date, so [0] is newest, [1] is previous
    const monthlyAscending = [...stats.monthlyRevenue].reverse(); // oldest to newest for sparkline

    const newest = stats.monthlyRevenue[0] || { revenue: 0, orders: 0 };
    const previous = stats.monthlyRevenue[1] || { revenue: 0, orders: 0 };

    const calculateChange = (newVal, oldVal) => {
      if (oldVal === 0 && newVal === 0) return { str: '0%', type: 'neutral' };
      if (oldVal === 0) return { str: '+100%', type: 'up' };
      const diff = ((newVal - oldVal) / oldVal) * 100;
      return {
        str: `${diff > 0 ? '+' : ''}${diff.toFixed(1)}%`,
        type: diff > 0 ? 'up' : diff < 0 ? 'down' : 'neutral',
      };
    };

    const revChange = calculateChange(newest.revenue, previous.revenue);
    const ordChange = calculateChange(newest.orders, previous.orders);

    return {
      revenueChangeStr: revChange.str,
      revenueChangeType: revChange.type,
      sparklineRevenue: generateSparklinePath(monthlyAscending.map((m) => m.revenue)),
      ordersChangeStr: ordChange.str,
      ordersChangeType: ordChange.type,
      sparklineOrders: generateSparklinePath(monthlyAscending.map((m) => m.orders)),
    };
  }, [stats]);

  if (dataLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <SkeletonDashboard />
      </div>
    );
  }

  // Use flat sparkline proxy for customers / pending orders since we lack historical data
  const sparklineCustomers = 'M0,15 L100,15';
  const sparklinePending = 'M0,15 L100,15';

  return (
    <motion.div initial="hidden" animate="show" variants={stagger} className="space-y-6">
      <PageHeader
        title="Business Analytics"
        subtitle={`Real-time performance metrics and growth insights · Last synced ${lastDataRefresh ? lastDataRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}`}
        mobileRow={true}
      >
        <div className="hidden sm:flex bg-[var(--admin-surface)] border border-[var(--admin-border)] p-1 rounded-lg items-center text-[12px] font-medium mr-2">
          {['7D', '30D', '12M', 'YTD'].map((range) => (
            <button
              key={range}
              onClick={() => {
                setTimeRange(range);
                handleRefresh();
              }}
              className={`px-3 py-1.5 rounded-md transition-colors ${timeRange === range ? 'bg-[var(--admin-accent)] text-white shadow-sm' : 'text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)]'}`}
            >
              {range}
            </button>
          ))}
        </div>

        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="admin-btn admin-btn-ghost"
          title="Refresh Data"
        >
          <span
            className={`material-symbols-outlined text-[20px] ${isRefreshing ? 'animate-spin' : ''}`}
          >
            sync
          </span>
        </button>
        <button className="admin-btn admin-btn-ghost" title="Export Data">
          <span className="material-symbols-outlined text-[20px]">download</span>
        </button>
      </PageHeader>

      {/* KPI Cards */}
      <motion.div variants={stagger} className="admin-grid-stats">
        <PremiumStatCard
          icon="payments"
          label="Total Revenue"
          value={formatCurrency(stats.stats?.totalSales || stats.totalSales || 0)}
          change={revenueChangeStr}
          changeType={revenueChangeType}
          color="#3b82f6"
          sparklineData={sparklineRevenue}
        />
        <PremiumStatCard
          icon="local_mall"
          label="Total Orders"
          value={stats.stats?.totalOrders || stats.totalOrders || 0}
          change={ordersChangeStr}
          changeType={ordersChangeType}
          color="#8b5cf6"
          sparklineData={sparklineOrders}
        />
        <PremiumStatCard
          icon="group"
          label="Active Customers"
          value={stats.stats?.totalCustomers || stats.totalCustomers || 0}
          change={null} // Historical data for customers not available
          changeType="neutral"
          color="#10b981"
          sparklineData={sparklineCustomers}
        />
        {/* Replaced Conversion (no tracking) with Pending Orders (actionable) */}
        <PremiumStatCard
          icon="schedule"
          label="Pending Orders"
          value={stats.stats?.pendingOrders || 0}
          change={null}
          changeType="neutral"
          color="#f59e0b"
          sparklineData={sparklinePending}
        />
      </motion.div>

      {/* Revenue Performance - Composed Chart */}
      <motion.div variants={fadeUp}>
        <ChartCard
          title="Revenue & Orders Performance"
          subtitle={`Correlating order volume with gross revenue across ${timeRange}`}
        >
          <div className="h-[380px] w-full pt-4">
            {!stats.monthlyRevenue || stats.monthlyRevenue.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center bg-[var(--admin-bg-subtle)] rounded-[var(--admin-radius-lg)] border border-dashed border-[var(--admin-border)]">
                <span className="material-symbols-outlined text-[32px] text-[var(--admin-text-tertiary)] mb-2">
                  analytics
                </span>
                <span className="text-[11px] uppercase font-bold text-[var(--admin-text-secondary)] tracking-wider">
                  No Revenue Data
                </span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={[...stats.monthlyRevenue].reverse()}
                  margin={{ top: 10, right: 0, left: -20, bottom: 0 }}
                  barGap={8}
                >
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.3} />
                    </linearGradient>
                    <linearGradient id="ordersGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="var(--admin-border-subtle)"
                  />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: 'var(--admin-text-tertiary)', fontWeight: 500 }}
                    dy={10}
                  />
                  <YAxis
                    yAxisId="left"
                    hide={isMobile}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: 'var(--admin-text-tertiary)', fontWeight: 500 }}
                    tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                    dx={-10}
                  />
                  <YAxis yAxisId="right" orientation="right" hide={true} />
                  <Tooltip
                    content={<CustomDualTooltip />}
                    cursor={{ fill: 'var(--admin-surface-muted)', opacity: 0.4 }}
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="revenue"
                    name="revenue"
                    fill="url(#revenueGrad)"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  />
                  <Bar
                    yAxisId="right"
                    dataKey="orders"
                    name="orders"
                    fill="url(#ordersGrad)"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </ChartCard>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Sales */}
        <motion.div variants={fadeUp}>
          <ChartCard title="Category Distribution" subtitle="Sales volume by category">
            <div className="h-[320px] pt-4">
              {!stats.categoryPerformance || stats.categoryPerformance.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center bg-[var(--admin-bg-subtle)] rounded-[var(--admin-radius-lg)] border border-dashed border-[var(--admin-border)]">
                  <span className="material-symbols-outlined text-[32px] text-[var(--admin-text-tertiary)] mb-2">
                    bar_chart
                  </span>
                  <span className="text-[11px] uppercase font-bold text-[var(--admin-text-secondary)] tracking-wider">
                    No Category Data
                  </span>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={stats.categoryPerformance}
                    layout="vertical"
                    margin={{ left: -20, right: 20 }}
                  >
                    <defs>
                      <linearGradient id="barGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.6} />
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.9} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      horizontal={false}
                      stroke="var(--admin-border-subtle)"
                    />
                    <XAxis type="number" hide />
                    <YAxis
                      dataKey="name"
                      type="category"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: 'var(--admin-text-secondary)', fontWeight: 500 }}
                      width={110}
                    />
                    <Tooltip
                      content={<CustomBarTooltip />}
                      cursor={{ fill: 'var(--admin-surface-muted)', opacity: 0.4 }}
                    />
                    <Bar dataKey="value" fill="url(#barGrad)" radius={[0, 6, 6, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </ChartCard>
        </motion.div>

        {/* Activity Feed */}
        <motion.div variants={fadeUp} className="admin-card p-6 flex flex-col min-h-[400px]">
          <h3 className="text-[15px] font-bold text-[var(--admin-text-primary)] mb-1 tracking-tight">
            Recent System Activity
          </h3>
          <p className="text-[12px] text-[var(--admin-text-tertiary)] mb-6 font-medium">
            Latest events from your store
          </p>
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
            {!stats.recentActivity || stats.recentActivity.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center bg-[var(--admin-bg-subtle)] rounded-[var(--admin-radius-lg)] border border-dashed border-[var(--admin-border)] p-4">
                <span className="material-symbols-outlined text-[28px] text-[var(--admin-text-tertiary)] mb-2">
                  history
                </span>
                <span className="text-[10px] uppercase font-bold text-[var(--admin-text-secondary)] tracking-wider">
                  No Recent Activity
                </span>
              </div>
            ) : (
              <motion.div className="space-y-4" variants={stagger} initial="hidden" animate="show">
                {stats.recentActivity.map((activity, i) => {
                  const style = getActivityStyles(activity);
                  return (
                    <motion.div
                      key={i}
                      variants={fadeUp}
                      whileHover={{ x: 4, transition: { duration: 0.2 } }}
                      className="flex gap-4 items-start p-3 rounded-[var(--admin-radius-lg)] hover:bg-[var(--admin-bg-subtle)] transition-colors border border-transparent hover:border-[var(--admin-border-subtle)]"
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
                        style={{
                          backgroundColor: style.bg,
                          border: `1px solid ${style.bg.replace('0.12', '0.2')}`,
                        }}
                      >
                        <span
                          className="material-symbols-outlined text-[20px]"
                          style={{ color: style.color }}
                        >
                          {style.icon}
                        </span>
                      </div>
                      <div className="pt-0.5">
                        <p className="text-[13px] text-[var(--admin-text-primary)] leading-relaxed">
                          <span className="font-bold text-[var(--admin-text-primary)]">
                            {activity.user}
                          </span>{' '}
                          {activity.action}
                        </p>
                        <p className="text-[11px] text-[var(--admin-text-tertiary)] mt-1 font-medium tracking-wide">
                          {new Date(activity.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
