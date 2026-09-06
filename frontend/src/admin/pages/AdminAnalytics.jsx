import {
  ResponsiveContainer,
  ComposedChart,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Line,
  PieChart,
  Pie,
  Cell,
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
import { FilterBar } from '../components/ui/Navigation';

const formatMonthLabel = (monthStr) => {
  if (!monthStr) return '';
  const parts = String(monthStr).split('-');
  if (parts.length === 2) {
    const year = parts[0];
    const monthIndex = parseInt(parts[1], 10) - 1;
    const months = [
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
    if (monthIndex >= 0 && monthIndex < 12) {
      return `${months[monthIndex]} '${year.slice(2)}`;
    }
  }
  return monthStr;
};

const formatFullMonthLabel = (monthStr) => {
  if (!monthStr) return '';
  const parts = String(monthStr).split('-');
  if (parts.length === 2) {
    const year = parts[0];
    const monthIndex = parseInt(parts[1], 10) - 1;
    const fullMonths = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    if (monthIndex >= 0 && monthIndex < 12) {
      return `${fullMonths[monthIndex]} ${year}`;
    }
  }
  return monthStr;
};

const formatYAxisCurrency = (val) => {
  if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
  if (val >= 1000) return `₹${(val / 1000).toFixed(val % 1000 === 0 ? 0 : 1)}k`;
  return `₹${val}`;
};

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

const FriendlySalesTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const fullMonth = formatFullMonthLabel(label);
    const rev = payload.find((p) => p.dataKey === 'revenue')?.value;
    const ord = payload.find((p) => p.dataKey === 'orders')?.value;

    return (
      <div className="bg-[var(--admin-surface)] border border-[var(--admin-border-strong)] p-3.5 rounded-[var(--admin-radius-lg)] shadow-2xl min-w-[190px] pointer-events-none">
        <p className="text-[13px] font-bold text-[var(--admin-text-primary)] mb-2.5 pb-1.5 border-b border-[var(--admin-border-subtle)] flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[15px] text-[var(--admin-text-tertiary)]">
            calendar_today
          </span>
          {fullMonth || label}
        </p>
        <div className="space-y-2">
          {rev !== undefined && (
            <div className="flex items-center justify-between gap-4">
              <span className="text-[12px] font-medium text-[var(--admin-text-secondary)] flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                Money Earned
              </span>
              <span className="text-[13px] font-bold text-[var(--admin-text-primary)] font-mono">
                {formatCurrency(rev)}
              </span>
            </div>
          )}
          {ord !== undefined && (
            <div className="flex items-center justify-between gap-4">
              <span className="text-[12px] font-medium text-[var(--admin-text-secondary)] flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shrink-0" />
                Orders
              </span>
              <span className="text-[13px] font-bold text-[var(--admin-text-primary)] font-mono">
                {ord} {ord === 1 ? 'order' : 'orders'}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
};

const FriendlyCategoryTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-[var(--admin-surface)] border border-[var(--admin-border-strong)] p-3 rounded-[var(--admin-radius-lg)] shadow-xl pointer-events-none min-w-[180px]">
        <p className="text-[13px] font-bold text-[var(--admin-text-primary)] mb-1.5 flex items-center gap-1.5">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: data.fill || data.color }}
          />
          {data.name}
        </p>
        <div className="flex items-center justify-between text-[12px] text-[var(--admin-text-secondary)] pt-1.5 border-t border-[var(--admin-border-subtle)]">
          <span>Items Sold:</span>
          <span className="font-bold text-[var(--admin-text-primary)]">
            {data.value} {data.value === 1 ? 'item' : 'items'}
          </span>
        </div>
        {data.percentage !== undefined && (
          <div className="flex items-center justify-between text-[12px] text-[var(--admin-text-secondary)] mt-1">
            <span>Share of Sales:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              {data.percentage}%
            </span>
          </div>
        )}
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

const CATEGORY_COLORS = [
  '#3b82f6', // Royal Blue
  '#10b981', // Emerald Green
  '#f59e0b', // Warm Amber
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#06b6d4', // Teal Cyan
  '#f97316', // Bright Orange
  '#6366f1', // Indigo
];

export function AdminAnalytics() {
  const { dashboardStats, dataLoading, refreshDashboard, lastDataRefresh } = useAdmin();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState('12M');
  const [salesView, setSalesView] = useState('revenue'); // 'revenue' | 'orders' | 'both'
  const [categoryView, setCategoryView] = useState('donut'); // 'donut' | 'bars'

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

  // Format monthly data for easy human understanding
  const formattedMonthlyData = useMemo(() => {
    if (!stats.monthlyRevenue || stats.monthlyRevenue.length === 0) return [];
    // Ascending order for display from left to right (oldest to newest)
    const sorted = [...stats.monthlyRevenue].reverse();
    return sorted.map((item) => ({
      ...item,
      displayMonth: formatMonthLabel(item.month),
      fullMonth: formatFullMonthLabel(item.month),
    }));
  }, [stats.monthlyRevenue]);

  // Aggregate monthly stats for summary cards
  const { totalRevenueSum, totalOrdersSum, topMonthName, topMonthRevenue, topMonthText } =
    useMemo(() => {
      if (!formattedMonthlyData || formattedMonthlyData.length === 0) {
        return {
          totalRevenueSum: 0,
          totalOrdersSum: 0,
          topMonthName: 'None',
          topMonthRevenue: '',
          topMonthText: 'None',
        };
      }
      let revSum = 0;
      let ordSum = 0;
      let highestRev = -1;
      let highestMonthName = '';

      formattedMonthlyData.forEach((m) => {
        revSum += Number(m.revenue || 0);
        ordSum += Number(m.orders || 0);
        if (Number(m.revenue || 0) > highestRev) {
          highestRev = Number(m.revenue || 0);
          highestMonthName = m.displayMonth;
        }
      });

      return {
        totalRevenueSum: revSum,
        totalOrdersSum: ordSum,
        topMonthName: highestMonthName || 'None',
        topMonthRevenue: highestRev > 0 ? formatCurrency(highestRev) : '',
        topMonthText: highestMonthName
          ? `${highestMonthName} (${formatCurrency(highestRev)})`
          : 'None',
      };
    }, [formattedMonthlyData]);

  // Categories processing with percentage share
  const { totalCategoryItems, processedCategories } = useMemo(() => {
    if (!stats.categoryPerformance || stats.categoryPerformance.length === 0) {
      return { totalCategoryItems: 0, processedCategories: [] };
    }
    const total = stats.categoryPerformance.reduce((sum, item) => sum + Number(item.value || 0), 0);
    const safeTotal = total > 0 ? total : 1;

    const list = stats.categoryPerformance.map((item, idx) => {
      const count = Number(item.value || 0);
      const percentage = Math.round((count / safeTotal) * 100);
      const color = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
      return {
        name: item.name || 'Uncategorized',
        value: count,
        percentage,
        fill: color,
        color,
      };
    });

    return { totalCategoryItems: total, processedCategories: list };
  }, [stats.categoryPerformance]);

  // Dynamically calculate trends and sparklines from actual monthly data
  const {
    revenueChangeStr,
    revenueChangeType,
    sparklineRevenue,
    ordersChangeStr,
    ordersChangeType,
    sparklineOrders,
    sparklineCustomers,
  } = useMemo(() => {
    const defaultRes = {
      revenueChangeStr: '0%',
      revenueChangeType: 'neutral',
      sparklineRevenue: 'M0,15 L100,15',
      ordersChangeStr: '0%',
      ordersChangeType: 'neutral',
      sparklineOrders: 'M0,15 L100,15',
      sparklineCustomers: 'M0,15 L100,15',
    };
    if (!stats.monthlyRevenue || stats.monthlyRevenue.length === 0) return defaultRes;

    // Backend returns descending by date, so [0] is newest, [1] is previous
    const monthlyAscending = [...stats.monthlyRevenue].reverse(); // oldest to newest for sparkline
    const customersAscending =
      stats.monthlyCustomers && stats.monthlyCustomers.length > 0
        ? [...stats.monthlyCustomers].reverse()
        : [];

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
      sparklineCustomers:
        customersAscending.length > 0
          ? generateSparklinePath(customersAscending.map((m) => m.customers))
          : 'M0,15 L100,15',
    };
  }, [stats]);

  if (dataLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <SkeletonDashboard />
      </div>
    );
  }

  // Use flat sparkline proxy for pending orders since we lack historical pending data
  const sparklinePending = 'M0,15 L100,15';

  return (
    <motion.div initial="hidden" animate="show" variants={stagger} className="space-y-6">
      <PageHeader
        title="Sales & Revenue"
        subtitle={`Clear store earnings & order performance · Last synced ${lastDataRefresh ? lastDataRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}`}
        headerAction={
          <div className="flex items-stretch gap-2 w-full sm:w-auto">
            <FilterBar
              filters={['7D', '30D', '12M', 'YTD']}
              value={timeRange}
              onChange={(range) => {
                setTimeRange(range);
                handleRefresh();
              }}
              className="flex-1 sm:flex-none min-w-0"
            />

            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="w-10 bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-border-subtle)] text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] rounded-md flex items-center justify-center cursor-pointer transition-all active:scale-95 border border-[var(--admin-border)] shrink-0"
              title="Refresh Data"
            >
              <span
                className={`material-symbols-outlined text-[18px] ${isRefreshing ? 'animate-spin' : ''}`}
              >
                sync
              </span>
            </button>
          </div>
        }
      />

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
          value={stats.stats?.totalOrders !== undefined ? stats.stats.totalOrders : totalOrdersSum}
          change={ordersChangeStr}
          changeType={ordersChangeType}
          color="#8b5cf6"
          sparklineData={sparklineOrders}
        />
        <PremiumStatCard
          icon="group"
          label="Active Customers"
          value={stats.stats?.totalCustomers || stats.totalCustomers || 0}
          change={null}
          changeType="neutral"
          color="#10b981"
          sparklineData={sparklineCustomers}
        />
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

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales & Orders Trend */}
        <motion.div variants={fadeUp}>
          <ChartCard
            title="Sales & Orders Trend"
            subtitle="How much money you made and orders placed each month"
            legend={
              <div className="w-full sm:w-auto grid grid-cols-3 sm:flex items-center gap-1 bg-[var(--admin-bg-subtle)] p-1 rounded-[var(--admin-radius-md)] border border-[var(--admin-border-subtle)]">
                <button
                  type="button"
                  onClick={() => setSalesView('revenue')}
                  className={`px-2 py-1.5 sm:px-2.5 sm:py-1 rounded-[var(--admin-radius-sm)] text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 min-w-0 ${
                    salesView === 'revenue'
                      ? 'bg-[var(--admin-surface)] text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[15px] shrink-0">payments</span>
                  <span className="truncate">Money (₹)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSalesView('orders')}
                  className={`px-2 py-1.5 sm:px-2.5 sm:py-1 rounded-[var(--admin-radius-sm)] text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 min-w-0 ${
                    salesView === 'orders'
                      ? 'bg-[var(--admin-surface)] text-purple-600 dark:text-purple-400 shadow-sm'
                      : 'text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[15px] shrink-0">package_2</span>
                  <span className="truncate">Orders</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSalesView('both')}
                  className={`px-2 py-1.5 sm:px-2.5 sm:py-1 rounded-[var(--admin-radius-sm)] text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 min-w-0 ${
                    salesView === 'both'
                      ? 'bg-[var(--admin-surface)] text-[var(--admin-text-primary)] shadow-sm'
                      : 'text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[15px] shrink-0">
                    stacked_bar_chart
                  </span>
                  <span className="truncate">Both</span>
                </button>
              </div>
            }
          >
            {/* Quick Summary Strip */}
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2 mb-4 p-2.5 sm:p-3 bg-[var(--admin-bg-subtle)] rounded-[var(--admin-radius-lg)] border border-[var(--admin-border-subtle)]">
              <div className="text-center sm:text-left sm:pl-2 min-w-0 flex flex-col justify-center">
                <p className="text-[9.5px] sm:text-[10px] uppercase font-bold text-[var(--admin-text-tertiary)] tracking-wider truncate">
                  Total Revenue
                </p>
                <p className="text-[13.5px] sm:text-[15px] font-extrabold text-blue-600 dark:text-blue-400 mt-0.5 truncate">
                  {formatCurrency(totalRevenueSum)}
                </p>
              </div>
              <div className="text-center border-x border-[var(--admin-border-subtle)] px-1 sm:px-2 min-w-0 flex flex-col justify-center">
                <p className="text-[9.5px] sm:text-[10px] uppercase font-bold text-[var(--admin-text-tertiary)] tracking-wider truncate">
                  Total Orders
                </p>
                <p className="text-[13.5px] sm:text-[15px] font-extrabold text-purple-600 dark:text-purple-400 mt-0.5 truncate">
                  {totalOrdersSum} {totalOrdersSum === 1 ? 'order' : 'orders'}
                </p>
              </div>
              <div className="text-center sm:text-right sm:pr-2 min-w-0 flex flex-col justify-center">
                <p className="text-[9.5px] sm:text-[10px] uppercase font-bold text-[var(--admin-text-tertiary)] tracking-wider truncate">
                  Best Month
                </p>
                <div className="mt-0.5 min-w-0">
                  <p className="text-[12.5px] sm:text-[13px] font-bold text-[var(--admin-text-primary)] truncate leading-tight">
                    {topMonthName}
                  </p>
                  {topMonthRevenue && (
                    <p className="text-[10.5px] sm:text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 truncate leading-tight mt-0.5">
                      {topMonthRevenue}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="h-[300px] w-full pt-2">
              {formattedMonthlyData.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center bg-[var(--admin-bg-subtle)] rounded-[var(--admin-radius-lg)] border border-dashed border-[var(--admin-border)]">
                  <span className="material-symbols-outlined text-[32px] text-[var(--admin-text-tertiary)] mb-2">
                    analytics
                  </span>
                  <span className="text-[12px] font-semibold text-[var(--admin-text-secondary)]">
                    No Revenue Data Yet
                  </span>
                  <p className="text-[11px] text-[var(--admin-text-tertiary)] mt-0.5">
                    Orders will appear here automatically
                  </p>
                </div>
              ) : salesView === 'revenue' ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={formattedMonthlyData}
                    margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="revenueFriendlyGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.45} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="var(--admin-border-subtle)"
                    />
                    <XAxis
                      dataKey="displayMonth"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: 'var(--admin-text-tertiary)', fontWeight: 600 }}
                      dy={8}
                    />
                    <YAxis
                      hide={isMobile}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: 'var(--admin-text-tertiary)', fontWeight: 600 }}
                      tickFormatter={formatYAxisCurrency}
                      dx={-5}
                    />
                    <Tooltip content={<FriendlySalesTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      name="revenue"
                      stroke="#3b82f6"
                      strokeWidth={3}
                      fill="url(#revenueFriendlyGrad)"
                      dot={{ fill: '#3b82f6', stroke: '#fff', strokeWidth: 2, r: 5 }}
                      activeDot={{ r: 7, fill: '#2563eb', stroke: '#fff', strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : salesView === 'orders' ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={formattedMonthlyData}
                    margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="ordersFriendlyGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.4} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="var(--admin-border-subtle)"
                    />
                    <XAxis
                      dataKey="displayMonth"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: 'var(--admin-text-tertiary)', fontWeight: 600 }}
                      dy={8}
                    />
                    <YAxis
                      hide={isMobile}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: 'var(--admin-text-tertiary)', fontWeight: 600 }}
                      allowDecimals={false}
                      dx={-5}
                    />
                    <Tooltip content={<FriendlySalesTooltip />} />
                    <Bar
                      dataKey="orders"
                      name="orders"
                      fill="url(#ordersFriendlyGrad)"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={48}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={formattedMonthlyData}
                    margin={{ top: 10, right: isMobile ? 0 : 20, left: -10, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="bothRevGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="var(--admin-border-subtle)"
                    />
                    <XAxis
                      dataKey="displayMonth"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: 'var(--admin-text-tertiary)', fontWeight: 600 }}
                      dy={8}
                    />
                    <YAxis
                      yAxisId="revAxis"
                      hide={isMobile}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: 'var(--admin-text-tertiary)', fontWeight: 600 }}
                      tickFormatter={formatYAxisCurrency}
                      dx={-5}
                    />
                    <YAxis
                      yAxisId="ordAxis"
                      orientation="right"
                      hide={isMobile}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: '#8b5cf6', fontWeight: 600 }}
                      allowDecimals={false}
                      dx={5}
                    />
                    <Tooltip content={<FriendlySalesTooltip />} />
                    <Area
                      yAxisId="revAxis"
                      type="monotone"
                      dataKey="revenue"
                      name="revenue"
                      stroke="#3b82f6"
                      strokeWidth={2.5}
                      fill="url(#bothRevGrad)"
                      dot={{ fill: '#3b82f6', stroke: '#fff', strokeWidth: 2, r: 4 }}
                    />
                    <Line
                      yAxisId="ordAxis"
                      type="monotone"
                      dataKey="orders"
                      name="orders"
                      stroke="#8b5cf6"
                      strokeWidth={3}
                      dot={{ fill: '#8b5cf6', stroke: '#fff', strokeWidth: 2, r: 5 }}
                      activeDot={{ r: 7, fill: '#7c3aed', stroke: '#fff', strokeWidth: 2 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>

            {salesView === 'both' && (
              <div className="flex items-center justify-center gap-6 mt-3 text-[11px] font-semibold text-[var(--admin-text-secondary)]">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  Money Earned (₹)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                  Orders Placed
                </span>
              </div>
            )}
          </ChartCard>
        </motion.div>

        {/* Top Selling Categories */}
        <motion.div variants={fadeUp}>
          <ChartCard
            title="Popular Categories"
            subtitle="Which items and themes are selling the most"
            legend={
              <div className="w-full sm:w-auto grid grid-cols-2 sm:flex items-center gap-1 bg-[var(--admin-bg-subtle)] p-1 rounded-[var(--admin-radius-md)] border border-[var(--admin-border-subtle)]">
                <button
                  type="button"
                  onClick={() => setCategoryView('donut')}
                  className={`px-2.5 py-1.5 sm:py-1 rounded-[var(--admin-radius-sm)] text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 min-w-0 ${
                    categoryView === 'donut'
                      ? 'bg-[var(--admin-surface)] text-[var(--admin-text-primary)] shadow-sm'
                      : 'text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[15px] shrink-0">pie_chart</span>
                  <span className="truncate">Circle Chart</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCategoryView('bars')}
                  className={`px-2.5 py-1.5 sm:py-1 rounded-[var(--admin-radius-sm)] text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 min-w-0 ${
                    categoryView === 'bars'
                      ? 'bg-[var(--admin-surface)] text-[var(--admin-text-primary)] shadow-sm'
                      : 'text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[15px] shrink-0">bar_chart</span>
                  <span className="truncate">Ranked List</span>
                </button>
              </div>
            }
          >
            {processedCategories.length === 0 ? (
              <div className="h-[360px] flex flex-col items-center justify-center bg-[var(--admin-bg-subtle)] rounded-[var(--admin-radius-lg)] border border-dashed border-[var(--admin-border)] p-6 text-center">
                <span className="material-symbols-outlined text-[36px] text-[var(--admin-text-tertiary)] mb-2">
                  category
                </span>
                <span className="text-[13px] font-bold text-[var(--admin-text-secondary)]">
                  No Category Sales Yet
                </span>
                <p className="text-[11px] text-[var(--admin-text-tertiary)] mt-1 max-w-xs">
                  When customers purchase decor items, their categories will be ranked and displayed
                  here automatically.
                </p>
              </div>
            ) : categoryView === 'donut' ? (
              <div className="flex flex-col sm:flex-row items-center gap-6 min-h-[360px] pt-1">
                {/* Donut graphic */}
                <div className="relative w-[190px] h-[190px] shrink-0 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={processedCategories}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        dataKey="value"
                        paddingAngle={3}
                        strokeWidth={0}
                      >
                        {processedCategories.map((entry, idx) => (
                          <Cell key={idx} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip content={<FriendlyCategoryTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center Stat Badge */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                    <span className="text-[24px] font-black text-[var(--admin-text-primary)] leading-tight font-mono">
                      {totalCategoryItems}
                    </span>
                    <span className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider">
                      Items Sold
                    </span>
                  </div>
                </div>

                {/* Ranked Legend List */}
                <div className="flex-1 w-full space-y-2.5 overflow-y-auto max-h-[320px] custom-scrollbar pr-1">
                  {processedCategories.map((cat, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-[var(--admin-radius-lg)] bg-[var(--admin-bg-subtle)] border border-[var(--admin-border-subtle)] hover:border-[var(--admin-border)] transition-all"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-5 h-5 rounded-full bg-[var(--admin-surface)] text-[10px] font-extrabold text-[var(--admin-text-secondary)] border border-[var(--admin-border)] flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: cat.color }}
                          />
                          <span className="text-[12px] font-bold text-[var(--admin-text-primary)] truncate">
                            {cat.name}
                          </span>
                        </div>
                        <span className="text-[12px] font-extrabold text-[var(--admin-text-primary)] shrink-0 font-mono">
                          {cat.value} {cat.value === 1 ? 'item' : 'items'}
                          <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 ml-1.5">
                            ({cat.percentage}%)
                          </span>
                        </span>
                      </div>
                      {/* Mini Progress meter */}
                      <div className="w-full h-1.5 bg-[var(--admin-surface-muted)] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.max(cat.percentage, 4)}%`,
                            backgroundColor: cat.color,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* Full Ranked Bars View */
              <div className="space-y-3 min-h-[360px] overflow-y-auto max-h-[360px] custom-scrollbar pr-1 pt-2">
                {processedCategories.map((cat, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-[var(--admin-radius-lg)] bg-[var(--admin-bg-subtle)] border border-[var(--admin-border-subtle)]"
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-6 h-6 rounded-md bg-[var(--admin-surface)] text-[11px] font-extrabold text-[var(--admin-text-secondary)] border border-[var(--admin-border)] flex items-center justify-center shrink-0 shadow-xs">
                          #{idx + 1}
                        </span>
                        <span className="text-[13px] font-bold text-[var(--admin-text-primary)] truncate">
                          {cat.name}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[13px] font-extrabold text-[var(--admin-text-primary)] font-mono">
                          {cat.value} {cat.value === 1 ? 'item' : 'items'}
                        </span>
                        <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 ml-2">
                          ({cat.percentage}%)
                        </span>
                      </div>
                    </div>
                    {/* Progress Bar with true proportion */}
                    <div className="w-full h-2 bg-[var(--admin-surface-muted)] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.max(cat.percentage, 5)}%`,
                          backgroundColor: cat.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ChartCard>
        </motion.div>
      </div>

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
    </motion.div>
  );
}
