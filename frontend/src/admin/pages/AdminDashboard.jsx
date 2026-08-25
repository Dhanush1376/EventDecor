import { m as motion } from 'framer-motion';
import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAdmin } from '../context/AdminContext';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import {
  PageHeader,
  PeriodSelector,
  SkeletonDashboard,
  AdminToggle,
  getRelativeTime,
  fadeUp,
  stagger,
  CHART_COLORS,
} from '../components/AdminUIKit';
import { AdminDashboardRecents } from '../components/dashboard/AdminDashboardRecents';
import { AdminDashboardActivity } from '../components/dashboard/AdminDashboardActivity';
import { AdminDashboardCharts } from '../components/dashboard/AdminDashboardCharts';
import { AdminDashboardStats } from '../components/dashboard/AdminDashboardStats';

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
        headerAction={
          <PeriodSelector
            value={chartPeriod}
            onChange={setChartPeriod}
            periods={['weekly', 'monthly', 'yearly']}
          />
        }
      />

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

      <AdminDashboardStats
        dashboardStats={dashboardStats}
        pendingOrders={pendingOrders}
        eventBookings={eventBookings}
        customers={customers}
      />

      <AdminDashboardCharts
        orders={orders}
        revenueChartData={revenueChartData}
        categoryChartData={categoryChartData}
        weeklyOrderStats={weeklyOrderStats}
        isMobile={isMobile}
      />

      {/* Middle Row */}
      <AdminDashboardActivity
        quickActions={quickActions}
        dynamicRecentActivity={dynamicRecentActivity}
        products={products}
        outOfStock={outOfStock}
        lowStockProducts={lowStockProducts}
      />

      {/* Bottom Row */}
      <AdminDashboardRecents
        orders={orders}
        eventBookings={eventBookings}
        trendingProducts={trendingProducts}
      />
    </motion.div>
  );
}
