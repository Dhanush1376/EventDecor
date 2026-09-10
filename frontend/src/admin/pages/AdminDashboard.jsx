import { m as motion } from 'framer-motion';
import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAdmin } from '../context/AdminContext';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import {
  PageHeader,
  AdminDashboardSkeleton,
  getRelativeTime,
  stagger,
  CHART_COLORS,
} from '../components/AdminUIKit';
import { AdminDashboardRecents } from '../components/dashboard/AdminDashboardRecents';
import { AdminDashboardActivity } from '../components/dashboard/AdminDashboardActivity';
import { AdminDashboardCharts } from '../components/dashboard/AdminDashboardCharts';
import { AdminDashboardStats } from '../components/dashboard/AdminDashboardStats';

export function AdminDashboard() {
  const {
    orders,
    eventBookings,
    products,
    dashboardStats,
    customers,
    auditLogs,
    lastDataRefresh,
    refreshDashboard,
    refreshOrders,
    dataLoading,
  } = useAdmin();
  const navigate = useNavigate();
  const [chartPeriod, setChartPeriod] = useState('all-time');
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

  // Prepare Revenue Overview data from backend
  const revenueChartData = useMemo(() => {
    if (dashboardStats?.monthlyRevenue && dashboardStats.monthlyRevenue.length > 0) {
      return [...dashboardStats.monthlyRevenue].reverse();
    }
    return [];
  }, [dashboardStats]);

  // Use top categories from backend dynamically
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
    return [];
  }, [dashboardStats]);

  // Use real-time activity stream from backend
  const dynamicRecentActivity = useMemo(() => {
    if (!dashboardStats?.recentActivity) return [];

    return dashboardStats.recentActivity.map((item) => {
      let icon = 'notifications';
      if (item.type === 'order') icon = 'shopping_bag';
      else if (item.type === 'system') icon = 'shield';
      else if (item.type === 'user') icon = 'person';

      return {
        ...item,
        icon,
        text: `[${item.user}] ${item.action}`,
        time: getRelativeTime(new Date(item.timestamp)),
      };
    });
  }, [dashboardStats]);

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

  const [isRefreshing, setIsRefreshing] = useState(false);

  // Trending products
  const trendingProducts = useMemo(() => {
    if (!products || products.length === 0) return [];
    return [...products].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 4);
  }, [products]);

  const quickActions = [
    {
      icon: 'shopping_bag',
      label: 'All Orders',
      path: '/admin/orders',
      color: '#5a7d9a',
    },
    {
      icon: 'inventory_2',
      label: 'Catalog',
      path: '/admin/products',
      color: '#826237',
    },
    {
      icon: 'stream',
      label: 'Live Activity',
      path: '/admin/analytics/operations',
      color: '#58856b',
    },
    {
      icon: 'sell',
      label: 'Coupons',
      path: '/admin/coupons',
      color: '#c2944b',
    },
  ];

  const handleManualSync = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refreshDashboard(), refreshOrders()]);
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  if (dataLoading) {
    return <AdminDashboardSkeleton />;
  }

  return (
    <motion.div initial="hidden" animate="show" variants={stagger} className="space-y-6 pb-8">
      {/* Header */}
      <PageHeader
        title="Dashboard"
        subtitle={
          <div className="flex flex-wrap items-center gap-2 text-[12.5px] mt-0.5">
            <span className="font-semibold text-[var(--admin-text-primary)]">
              Business Overview
            </span>
            <span className="text-[var(--admin-border-strong)]">•</span>
            <span className="text-[var(--admin-text-secondary)]">{orders.length} orders total</span>
            <span className="text-[var(--admin-border-strong)]">•</span>
            <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {lastDataRefresh
                ? `Synced ${lastDataRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                : 'Live operational stream'}
            </span>
          </div>
        }
        headerAction={
          <div className="flex items-center justify-end gap-1.5 sm:gap-2 w-full sm:w-auto overflow-x-auto custom-scrollbar pb-1 sm:pb-0 shrink-0 ml-auto">
            {/* Period Switcher (42px locked height) */}
            <div className="bg-[var(--admin-surface-muted)] p-1 rounded-[4px] border border-[var(--admin-border)] flex items-center gap-1 h-[42px] min-h-[42px] max-h-[42px] box-border shadow-2xs shrink-0">
              {[
                { id: 'today', label: 'Today' },
                { id: 'weekly', label: '7D' },
                { id: 'monthly', label: 'Month' },
                { id: 'all-time', label: 'All' },
              ].map((p) => {
                const isSelected = chartPeriod === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setChartPeriod(p.id)}
                    className={`h-[32px] min-h-[32px] max-h-[32px] px-2.5 sm:px-3.5 rounded-[3px] text-[11.5px] sm:text-[12px] font-bold transition-all flex items-center justify-center cursor-pointer whitespace-nowrap box-border leading-none ${
                      isSelected
                        ? 'bg-white dark:bg-stone-800 text-[var(--admin-accent)] shadow-xs font-bold'
                        : 'text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] hover:bg-white/40 dark:hover:bg-stone-800/40'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            {/* Sync Now Button (42px locked height) */}
            <button
              type="button"
              onClick={handleManualSync}
              disabled={isRefreshing}
              className="h-[42px] min-h-[42px] max-h-[42px] px-2.5 sm:px-3 bg-[var(--admin-surface)] hover:bg-[var(--admin-surface-hover)] text-[var(--admin-text-primary)] rounded-[4px] border border-[var(--admin-border)] shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 disabled:opacity-60 shrink-0"
              title="Click to sync live dashboard data"
            >
              <span
                className={`material-symbols-outlined text-[17px] text-[var(--admin-accent)] ${
                  isRefreshing ? 'animate-spin' : ''
                }`}
              >
                sync
              </span>
              <span className="text-[11.5px] font-bold whitespace-nowrap hidden sm:inline">
                Sync Now
              </span>
            </button>
          </div>
        }
      />

      {/* ─── 4-Column Connected Financial & Operational Telemetry Ledger ─── */}
      <AdminDashboardStats
        dashboardStats={dashboardStats}
        pendingOrders={pendingOrders}
        eventBookings={eventBookings}
        customers={customers}
      />

      {/* ─── Charts & Trends Row ─── */}
      <AdminDashboardCharts
        orders={orders}
        revenueChartData={revenueChartData}
        categoryChartData={categoryChartData}
        weeklyOrderStats={weeklyOrderStats}
        isMobile={isMobile}
      />

      {/* ─── Operations & Activity Row ─── */}
      <AdminDashboardActivity
        quickActions={quickActions}
        dynamicRecentActivity={dynamicRecentActivity}
        products={products}
        outOfStock={outOfStock}
        lowStockProducts={lowStockProducts}
      />

      {/* ─── Recents & Catalog Row ─── */}
      <AdminDashboardRecents
        orders={orders}
        eventBookings={eventBookings}
        trendingProducts={trendingProducts}
      />
    </motion.div>
  );
}
