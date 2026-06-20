import { m as motion } from 'framer-motion';
import { useMemo, useEffect, useState } from 'react';
import { useAdmin } from '../context/AdminContext';

import {
  PageHeader,
  StatCard,
  ChartCard,
  ChartTooltip,
  SkeletonDashboard,
  formatCurrency,
  fadeUp,
  stagger,
} from '../components/AdminUIKit';
import { useMediaQuery } from '../../hooks/useMediaQuery';

export function AdminAnalytics() {
  const { dashboardStats, dataLoading, refreshDashboard, lastDataRefresh } = useAdmin();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [isRefreshing, setIsRefreshing] = useState(false);

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
    setIsRefreshing(false);
  };

  const stats = useMemo(() => {
    if (!dashboardStats)
      return {
        totalSales: 0,
        totalOrders: 0,
        totalCustomers: 0,
        conversionRate: 0,
        revenueTrend: [],
        categoryStats: [],
        recentActivity: [],
      };
    return dashboardStats;
  }, [dashboardStats]);

  if (dataLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <SkeletonDashboard />
      </div>
    );
  }

  return (
    <motion.div initial="hidden" animate="show" variants={stagger} className="space-y-6">
      <PageHeader
        title="Business Analytics"
        subtitle={`Real-time performance metrics and growth insights · Last synced ${lastDataRefresh ? lastDataRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}`}
        mobileRow={true}
      >
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
        <StatCard
          icon="payments"
          label="Total Revenue"
          value={formatCurrency(stats.stats?.totalSales || stats.totalSales || 0)}
          change="+15.4%"
          changeType="up"
          color="var(--admin-accent)"
        />
        <StatCard
          icon="shopping_bag"
          label="Total Orders"
          value={stats.stats?.totalOrders || stats.totalOrders || 0}
          change="+8.2%"
          changeType="up"
          color="var(--admin-info)"
        />
        <StatCard
          icon="group"
          label="Active Customers"
          value={stats.stats?.totalCustomers || stats.totalCustomers || 0}
          change="+12.1%"
          changeType="up"
          color="var(--admin-warning)"
        />
        <StatCard
          icon="insights"
          label="Conversion"
          value={`${(stats.conversionRate || 3.4).toFixed(1)}%`}
          change="+0.5%"
          changeType="up"
          color="var(--admin-success)"
        />
      </motion.div>

      {/* Revenue Trend */}
      <ChartCard
        title="Revenue Performance"
        subtitle="Monthly revenue analysis for the current year"
      >
        <div className="h-[350px] w-full">
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
              <AreaChart
                data={[...stats.monthlyRevenue].reverse()}
                margin={{ top: 10, right: 0, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--admin-accent)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="var(--admin-accent)" stopOpacity={0} />
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
                  tick={{ fontSize: 11, fill: 'var(--admin-text-tertiary)' }}
                />
                <YAxis
                  hide={isMobile}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: 'var(--admin-text-tertiary)' }}
                  tickFormatter={formatCurrency}
                />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="var(--admin-accent)"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#revenueGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </ChartCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Sales */}
        <ChartCard title="Category Distribution" subtitle="Sales volume by category">
          <div className="h-[300px]">
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
                <BarChart data={stats.categoryPerformance} layout="vertical" margin={{ left: -20 }}>
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
                    tick={{ fontSize: 11, fill: 'var(--admin-text-secondary)' }}
                    width={100}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar
                    dataKey="value"
                    fill="var(--admin-border-strong)"
                    radius={[0, 4, 4, 0]}
                    barSize={24}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </ChartCard>

        {/* Activity Feed */}
        <motion.div variants={fadeUp} className="admin-card p-6 flex flex-col">
          <h3 className="text-[14px] font-semibold text-[var(--admin-text-primary)] mb-1">
            Recent System Activity
          </h3>
          <p className="text-[11px] text-[var(--admin-text-tertiary)] mb-6">
            Latest events from your store
          </p>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
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
              <div className="space-y-4">
                {stats.recentActivity.map((activity, i) => (
                  <div key={i} className="flex gap-4 items-start">
                    <div className="w-9 h-9 rounded-[var(--admin-radius-md)] bg-[var(--admin-surface-muted)] border border-[var(--admin-border)] flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[18px] text-[var(--admin-text-secondary)]">
                        {activity.type === 'order' ? 'shopping_bag' : 'person'}
                      </span>
                    </div>
                    <div>
                      <p className="text-[12.5px] text-[var(--admin-text-primary)] leading-snug">
                        <span className="font-semibold text-[var(--admin-text-primary)]">
                          {activity.user}
                        </span>{' '}
                        {activity.action}
                      </p>
                      <p className="text-[10px] text-[var(--admin-text-tertiary)] mt-1">
                        {new Date(activity.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
