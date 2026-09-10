import {
  ResponsiveContainer,
  ComposedChart,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { m as motion } from 'framer-motion';
import { useMemo, useState, useEffect, useCallback } from 'react';
import { useAdmin } from '../context/AdminContext';
import {
  PageHeader,
  AdminAnalyticsSkeleton,
  formatCurrency,
  fadeUp,
  stagger,
} from '../components/AdminUIKit';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import toast from 'react-hot-toast';

// ─── Cream & Ivory SaaS Palette ───
const THEME = {
  gold: '#826237',
  goldHover: '#664b28',
  goldMuted: 'rgba(130, 98, 55, 0.12)',
  goldSubtle: 'rgba(130, 98, 55, 0.05)',
  slate: '#6b8ead',
  slateMuted: 'rgba(107, 142, 173, 0.15)',
  sage: '#7a8b76',
  sageMuted: 'rgba(122, 139, 118, 0.15)',
  ochre: '#c29b62',
  ochreMuted: 'rgba(194, 155, 98, 0.15)',
  terracotta: '#bc6c5c',
  terracottaMuted: 'rgba(188, 108, 92, 0.15)',
  mauve: '#9b82a3',
  dark: '#3c362a',
};

const CATEGORY_PALETTE = [
  THEME.gold,
  THEME.slate,
  THEME.sage,
  THEME.ochre,
  THEME.terracotta,
  THEME.mauve,
  '#8a816f',
  '#4d6e8a',
];

// Helper: Format Axis Currency in Indian notation (K, L, Cr)
const formatYAxisCurrency = (val) => {
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)}Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
  if (val >= 1000) return `₹${(val / 1000).toFixed(val % 1000 === 0 ? 0 : 1)}k`;
  return `₹${val}`;
};

// Helper: Format Month Label (e.g. "2026-3" -> "Mar '26")
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

// Helper: Generate smooth sparkline SVG path
const generateSparklineSvg = (dataPoints) => {
  if (!dataPoints || dataPoints.length < 2) return 'M0,15 L100,15';
  const max = Math.max(...dataPoints);
  const min = Math.min(...dataPoints);
  const range = max - min || 1;
  const stepX = 100 / (dataPoints.length - 1);

  const points = dataPoints.map((val, i) => {
    const x = i * stepX;
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

// ─── Custom Luxury Chart Tooltip ───
const LuxuryFinancialTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;

  const revItem = payload.find((p) => p.dataKey === 'revenue');
  const ordItem = payload.find((p) => p.dataKey === 'orders');
  const aovItem = payload.find((p) => p.dataKey === 'aov');
  const fullLabel = payload[0]?.payload?.fullDate || label;

  return (
    <div className="bg-[var(--admin-surface)] border border-[var(--admin-border-strong)] p-3.5 rounded-[4px] shadow-lg min-w-[210px] pointer-events-none text-left">
      <div className="flex items-center gap-1.5 pb-2 mb-2.5 border-b border-[var(--admin-border)]">
        <span className="material-symbols-outlined text-[16px] text-[var(--admin-accent)]">
          calendar_today
        </span>
        <span className="text-[12px] font-bold text-[var(--admin-text-primary)] tracking-tight">
          {fullLabel}
        </span>
      </div>

      <div className="space-y-2 text-[12px]">
        {revItem !== undefined && (
          <div className="flex items-center justify-between gap-4">
            <span className="text-[var(--admin-text-secondary)] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-[2px]" style={{ backgroundColor: THEME.gold }} />
              Gross Revenue:
            </span>
            <span className="font-extrabold text-[var(--admin-text-primary)]">
              {formatCurrency(revItem.value)}
            </span>
          </div>
        )}

        {ordItem !== undefined && (
          <div className="flex items-center justify-between gap-4">
            <span className="text-[var(--admin-text-secondary)] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-[2px]" style={{ backgroundColor: THEME.slate }} />
              Order Volume:
            </span>
            <span className="font-bold text-[var(--admin-text-primary)]">
              {ordItem.value} {ordItem.value === 1 ? 'order' : 'orders'}
            </span>
          </div>
        )}

        {aovItem !== undefined && aovItem.value > 0 && (
          <div className="flex items-center justify-between gap-4 pt-1 border-t border-[var(--admin-border-subtle)] text-[11.5px]">
            <span className="text-[var(--admin-text-tertiary)] font-medium">Avg Ticket:</span>
            <span className="font-bold text-[var(--admin-text-secondary)]">
              {formatCurrency(aovItem.value)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Custom Category Pie Tooltip ───
const LuxuryCategoryTooltip = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload;

  return (
    <div className="bg-[var(--admin-surface)] border border-[var(--admin-border-strong)] p-3 rounded-[4px] shadow-lg min-w-[190px] pointer-events-none text-left">
      <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-[var(--admin-border)]">
        <span
          className="w-2.5 h-2.5 rounded-[2px] shrink-0"
          style={{ backgroundColor: data.fill }}
        />
        <span className="text-[12.5px] font-bold text-[var(--admin-text-primary)] truncate">
          {data.name}
        </span>
      </div>
      <div className="space-y-1.5 text-[12px]">
        <div className="flex items-center justify-between gap-3 text-[var(--admin-text-secondary)]">
          <span>Items Sold:</span>
          <span className="font-extrabold text-[var(--admin-text-primary)]">
            {data.value} {data.value === 1 ? 'unit' : 'units'}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3 text-[var(--admin-text-secondary)]">
          <span>Store Contribution:</span>
          <span className="font-bold text-emerald-700 dark:text-emerald-400">
            {data.percentage}%
          </span>
        </div>
      </div>
    </div>
  );
};

// ─── Main AdminAnalytics Component ───
export function AdminAnalytics() {
  const {
    dashboardStats,
    orders = [],
    eventBookings = [],
    dataLoading,
    refreshDashboard,
    refreshOrders,
    lastDataRefresh,
  } = useAdmin();

  const isMobile = useMediaQuery('(max-width: 640px)');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('30D'); // '7D' | '30D' | '90D' | '12M' | 'YTD' | 'ALL'
  const [salesView, setSalesView] = useState('both'); // 'revenue' | 'orders' | 'both'
  const [categoryView, setCategoryView] = useState('donut'); // 'donut' | 'bars'

  // Auto-refresh analytics every 90 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refreshDashboard();
      if (refreshOrders) refreshOrders();
    }, 90000);
    return () => clearInterval(interval);
  }, [refreshDashboard, refreshOrders]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.allSettled([
        refreshDashboard(),
        refreshOrders ? refreshOrders() : Promise.resolve(),
      ]);
      toast.success('Sales data refreshed', { duration: 2000 });
    } catch {
      toast.error('Failed to refresh data');
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // ─── Dynamic Period Aggregator ───
  const periodAnalytics = useMemo(() => {
    const now = new Date();
    let startDate = new Date();
    let priorStartDate = new Date();
    let isDaily = false;

    if (selectedPeriod === '7D') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      priorStartDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      isDaily = true;
    } else if (selectedPeriod === '30D') {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      priorStartDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
      isDaily = true;
    } else if (selectedPeriod === '90D') {
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      priorStartDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
      isDaily = false;
    } else if (selectedPeriod === 'YTD') {
      startDate = new Date(now.getFullYear(), 0, 1);
      const daysIntoYear = Math.floor((now - startDate) / (24 * 60 * 60 * 1000));
      priorStartDate = new Date(startDate.getTime() - daysIntoYear * 24 * 60 * 60 * 1000);
      isDaily = false;
    } else if (selectedPeriod === '12M') {
      startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      priorStartDate = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());
      isDaily = false;
    } else {
      // ALL time
      startDate = new Date(2020, 0, 1);
      priorStartDate = new Date(2019, 0, 1);
      isDaily = false;
    }

    // Filter orders into current period and prior period
    const currentOrders = [];
    const priorOrders = [];

    orders.forEach((o) => {
      const orderDate = o.rawOrder?.createdAt
        ? new Date(o.rawOrder.createdAt)
        : o.date
          ? new Date(o.date)
          : null;
      if (!orderDate) return;

      if (orderDate >= startDate && orderDate <= now) {
        currentOrders.push(o);
      } else if (orderDate >= priorStartDate && orderDate < startDate) {
        priorOrders.push(o);
      }
    });

    // KPI 1: Gross Revenue
    const grossRevenue = currentOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
    const priorGrossRevenue = priorOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);

    // KPI 2: Total Orders
    const totalOrdersCount = currentOrders.length;
    const priorOrdersCount = priorOrders.length;

    // KPI 3: Average Order Value (AOV)
    const aov = totalOrdersCount > 0 ? Math.round(grossRevenue / totalOrdersCount) : 0;
    const priorAov = priorOrdersCount > 0 ? Math.round(priorGrossRevenue / priorOrdersCount) : 0;

    // KPI 4: Settled Revenue (Paid + COD Collected)
    const settledRevenue = currentOrders.reduce((sum, o) => {
      const isPaid =
        o.payment === 'Paid' ||
        o.payment === 'COD Collected' ||
        o.rawOrder?.paymentStatus === 'paid' ||
        o.rawOrder?.paymentStatus === 'COD Collected';
      return isPaid ? sum + Number(o.total || 0) : sum;
    }, 0);

    // KPI 5: Pending Revenue (Unsettled / COD in-transit)
    const pendingRevenue = currentOrders.reduce((sum, o) => {
      const isPaid =
        o.payment === 'Paid' ||
        o.payment === 'COD Collected' ||
        o.rawOrder?.paymentStatus === 'paid' ||
        o.rawOrder?.paymentStatus === 'COD Collected';
      return !isPaid ? sum + Number(o.total || 0) : sum;
    }, 0);

    // Growth Deltas
    const calcDelta = (cur, prev) => {
      if (prev === 0 && cur === 0) return { text: '0%', type: 'neutral' };
      if (prev === 0) return { text: '+100%', type: 'up' };
      const diff = ((cur - prev) / prev) * 100;
      return {
        text: `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}%`,
        type: diff > 0 ? 'up' : diff < 0 ? 'down' : 'neutral',
      };
    };

    const revDelta = calcDelta(grossRevenue, priorGrossRevenue);
    const ordDelta = calcDelta(totalOrdersCount, priorOrdersCount);
    const aovDelta = calcDelta(aov, priorAov);

    // ─── Time-Series Chart Data Generation ───
    let chartData = [];

    if (isDaily) {
      // Daily Buckets
      const daysCount = selectedPeriod === '7D' ? 7 : 30;
      const dayMap = {};

      for (let i = daysCount - 1; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const isoKey = d.toISOString().split('T')[0];
        const dayLabel = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
        const fullDate = d.toLocaleDateString([], {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });

        dayMap[isoKey] = {
          dateKey: isoKey,
          label: dayLabel,
          fullDate,
          revenue: 0,
          orders: 0,
          aov: 0,
        };
      }

      currentOrders.forEach((o) => {
        const dStr = o.rawOrder?.createdAt
          ? new Date(o.rawOrder.createdAt).toISOString().split('T')[0]
          : o.date;
        if (dayMap[dStr]) {
          dayMap[dStr].revenue += Number(o.total || 0);
          dayMap[dStr].orders += 1;
        }
      });

      chartData = Object.values(dayMap).map((item) => ({
        ...item,
        aov: item.orders > 0 ? Math.round(item.revenue / item.orders) : 0,
      }));
    } else {
      // Monthly Buckets: Use backend monthlyRevenue as base if available, enriched with current range
      if (dashboardStats?.monthlyRevenue && dashboardStats.monthlyRevenue.length > 0) {
        const sorted = [...dashboardStats.monthlyRevenue].reverse();
        chartData = sorted.map((m) => {
          const rev = Number(m.revenue || 0);
          const ord = Number(m.orders || 0);
          return {
            dateKey: m.month,
            label: formatMonthLabel(m.month),
            fullDate: formatMonthLabel(m.month),
            revenue: rev,
            orders: ord,
            aov: ord > 0 ? Math.round(rev / ord) : 0,
          };
        });
      } else {
        // Fallback aggregate from orders
        const monthMap = {};
        currentOrders.forEach((o) => {
          const d = o.rawOrder?.createdAt ? new Date(o.rawOrder.createdAt) : new Date();
          const mKey = `${d.getFullYear()}-${d.getMonth() + 1}`;
          if (!monthMap[mKey]) {
            monthMap[mKey] = {
              dateKey: mKey,
              label: formatMonthLabel(mKey),
              fullDate: formatMonthLabel(mKey),
              revenue: 0,
              orders: 0,
              aov: 0,
            };
          }
          monthMap[mKey].revenue += Number(o.total || 0);
          monthMap[mKey].orders += 1;
        });
        chartData = Object.values(monthMap);
      }
    }

    // Best Performing Interval
    let peakInterval = { label: 'None', revenue: 0 };
    chartData.forEach((item) => {
      if (item.revenue > peakInterval.revenue) {
        peakInterval = { label: item.label, revenue: item.revenue };
      }
    });

    // Sparkline paths
    const revSparkline = generateSparklineSvg(chartData.map((d) => d.revenue));
    const ordSparkline = generateSparklineSvg(chartData.map((d) => d.orders));

    return {
      grossRevenue,
      totalOrdersCount,
      aov,
      settledRevenue,
      pendingRevenue,
      settlementRate: grossRevenue > 0 ? Math.round((settledRevenue / grossRevenue) * 100) : 100,
      revDelta,
      ordDelta,
      aovDelta,
      chartData,
      peakInterval,
      revSparkline,
      ordSparkline,
      currentOrders,
    };
  }, [orders, selectedPeriod, dashboardStats]);

  // ─── Revenue Streams Breakdown (Products vs Event Rentals vs Custom) ───
  const revenueStreams = useMemo(() => {
    let productSales = 0;
    let productCount = 0;
    let rentalSales = 0;
    let rentalCount = 0;
    let customSales = 0;
    let customCount = 0;

    // From Orders
    orders.forEach((o) => {
      const tot = Number(o.total || 0);
      if (o.isCustomOrder || o.rawOrder?.isCustomOrder) {
        customSales += tot;
        customCount += 1;
      } else {
        const hasRentalItem = Array.isArray(o.items) && o.items.some((it) => it.type === 'rental');
        if (hasRentalItem) {
          rentalSales += tot;
          rentalCount += 1;
        } else {
          productSales += tot;
          productCount += 1;
        }
      }
    });

    // From EventBookings
    eventBookings.forEach((eb) => {
      const amount = Number(eb.amount || eb.rawEvent?.pricing?.totalPrice || 0);
      rentalSales += amount;
      rentalCount += 1;
    });

    const grandTotal = productSales + rentalSales + customSales || 1;

    return [
      {
        name: 'Storefront Decor Sales',
        revenue: productSales,
        orders: productCount,
        percentage: Math.round((productSales / grandTotal) * 100),
        color: THEME.gold,
        icon: 'storefront',
      },
      {
        name: 'Event Bookings & Rentals',
        revenue: rentalSales,
        orders: rentalCount,
        percentage: Math.round((rentalSales / grandTotal) * 100),
        color: THEME.slate,
        icon: 'celebration',
      },
      {
        name: 'Custom Bespoke Orders',
        revenue: customSales,
        orders: customCount,
        percentage: Math.round((customSales / grandTotal) * 100),
        color: THEME.sage,
        icon: 'auto_awesome',
      },
    ];
  }, [orders, eventBookings]);

  // ─── Top Revenue Generating Products ───
  const topRevenueProducts = useMemo(() => {
    const productMap = {};

    orders.forEach((o) => {
      if (Array.isArray(o.items)) {
        o.items.forEach((it) => {
          const key = it.name || 'Decor Item';
          if (!productMap[key]) {
            productMap[key] = {
              name: key,
              image: it.image || null,
              category: it.category || 'Handcrafted',
              units: 0,
              revenue: 0,
            };
          }
          const qty = Number(it.qty || it.quantity || 1);
          const price = Number(it.price || 0);
          productMap[key].units += qty;
          productMap[key].revenue += price * qty;
        });
      }
    });

    return Object.values(productMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [orders]);

  // ─── Payment Gateway & Method Analysis ───
  const paymentMethodsAnalysis = useMemo(() => {
    let onlineVolume = 0;
    let onlineCount = 0;
    let codVolume = 0;
    let codCount = 0;
    let codCollectedVolume = 0;

    orders.forEach((o) => {
      const tot = Number(o.total || 0);
      const isCod =
        o.payment?.toLowerCase().includes('cod') ||
        o.rawOrder?.paymentMethod?.toLowerCase() === 'cod';

      if (isCod) {
        codVolume += tot;
        codCount += 1;
        if (o.payment === 'COD Collected' || o.rawOrder?.paymentStatus === 'COD Collected') {
          codCollectedVolume += tot;
        }
      } else {
        onlineVolume += tot;
        onlineCount += 1;
      }
    });

    const totalVolume = onlineVolume + codVolume || 1;

    return [
      {
        method: 'Online Prepaid (Razorpay / UPI / Cards)',
        volume: onlineVolume,
        count: onlineCount,
        percentage: Math.round((onlineVolume / totalVolume) * 100),
        status: '100% Settled Instant',
        color: THEME.gold,
        icon: 'credit_card',
      },
      {
        method: 'Cash on Delivery (COD)',
        volume: codVolume,
        count: codCount,
        percentage: Math.round((codVolume / totalVolume) * 100),
        status: `₹${formatCurrency(codCollectedVolume)} Remitted`,
        color: THEME.ochre,
        icon: 'local_shipping',
      },
    ];
  }, [orders]);

  // ─── Category Performance ───
  const categoryStats = useMemo(() => {
    if (!dashboardStats?.categoryPerformance || dashboardStats.categoryPerformance.length === 0) {
      return { totalUnits: 0, list: [] };
    }
    const total = dashboardStats.categoryPerformance.reduce(
      (sum, it) => sum + Number(it.value || 0),
      0,
    );
    const safeTotal = total > 0 ? total : 1;

    const list = dashboardStats.categoryPerformance.map((item, idx) => {
      const count = Number(item.value || 0);
      const percentage = Math.round((count / safeTotal) * 100);
      const color = CATEGORY_PALETTE[idx % CATEGORY_PALETTE.length];
      return {
        name: item.name || 'Decor & Crafts',
        value: count,
        percentage,
        fill: color,
        color,
      };
    });

    return { totalUnits: total, list };
  }, [dashboardStats]);

  // ─── CSV Export Functionality ───
  const handleExportCSV = useCallback(() => {
    try {
      const rows = [
        ['Date / Interval', 'Gross Revenue (INR)', 'Order Volume', 'Average Order Value (INR)'],
      ];

      periodAnalytics.chartData.forEach((item) => {
        rows.push([item.fullDate || item.label, item.revenue, item.orders, item.aov]);
      });

      rows.push([]);
      rows.push(['SUMMARY METRICS']);
      rows.push(['Selected Period', selectedPeriod]);
      rows.push(['Total Gross Revenue', periodAnalytics.grossRevenue]);
      rows.push(['Total Orders', periodAnalytics.totalOrdersCount]);
      rows.push(['Average Order Value (AOV)', periodAnalytics.aov]);
      rows.push(['Settled Revenue', periodAnalytics.settledRevenue]);
      rows.push(['Pending Volume', periodAnalytics.pendingRevenue]);

      const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute(
        'download',
        `sales_revenue_report_${selectedPeriod.toLowerCase()}_${new Date().toISOString().split('T')[0]}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Financial report downloaded successfully');
    } catch {
      toast.error('Failed to export sales report');
    }
  }, [periodAnalytics, selectedPeriod]);

  if (dataLoading) {
    return <AdminAnalyticsSkeleton />;
  }

  return (
    <motion.div initial="hidden" animate="show" variants={stagger} className="space-y-6 pb-12">
      {/* ─── Page Header with Integrated Actions ─── */}
      <PageHeader
        title="Sales & Revenue"
        subtitle={
          <div className="flex flex-wrap items-center gap-2 text-[12.5px] mt-0.5">
            <span className="font-semibold text-[var(--admin-text-primary)]">
              {formatCurrency(periodAnalytics.grossRevenue)} gross in {selectedPeriod}
            </span>
            <span className="text-[var(--admin-border-strong)]">•</span>
            <span className="text-[var(--admin-text-secondary)]">
              {periodAnalytics.totalOrdersCount} orders placed
            </span>
            <span className="text-[var(--admin-border-strong)]">•</span>
            <span className="inline-flex items-center gap-1 font-medium text-emerald-700 dark:text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-[2px] bg-emerald-500" />
              {periodAnalytics.settlementRate}% collected
            </span>
          </div>
        }
        headerAction={
          <div className="flex items-center justify-end gap-1.5 sm:gap-2 w-full sm:w-auto overflow-x-auto custom-scrollbar pb-1 sm:pb-0 ml-auto">
            {/* Period Switcher (42px locked height) */}
            <div className="bg-[var(--admin-surface-muted)] p-1 rounded-[4px] border border-[var(--admin-border)] flex items-center gap-1 h-[42px] min-h-[42px] max-h-[42px] box-border shadow-2xs shrink-0">
              {['7D', '30D', '90D', '12M', 'YTD', 'ALL'].map((period) => {
                const isSelected = selectedPeriod === period;
                return (
                  <button
                    key={period}
                    type="button"
                    onClick={() => setSelectedPeriod(period)}
                    className={`h-[32px] min-h-[32px] max-h-[32px] px-2.5 sm:px-3 rounded-[3px] text-[11.5px] sm:text-[12px] font-bold transition-all flex items-center justify-center cursor-pointer whitespace-nowrap box-border leading-none ${
                      isSelected
                        ? 'bg-white dark:bg-stone-800 text-[var(--admin-accent)] shadow-xs font-bold'
                        : 'text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] hover:bg-white/40 dark:hover:bg-stone-800/40'
                    }`}
                  >
                    {period}
                  </button>
                );
              })}
            </div>

            {/* Sync Refresh Button (42px locked height) */}
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="h-[42px] min-h-[42px] max-h-[42px] px-2.5 sm:px-3 bg-[var(--admin-surface)] hover:bg-[var(--admin-surface-hover)] text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] rounded-[4px] border border-[var(--admin-border)] shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors active:scale-95 shrink-0"
              title={`Last synced: ${lastDataRefresh ? lastDataRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}`}
            >
              <span
                className={`material-symbols-outlined text-[18px] ${isRefreshing ? 'animate-spin text-[var(--admin-accent)]' : ''}`}
              >
                sync
              </span>
              <span className="text-[12px] font-bold hidden md:inline">Sync</span>
            </button>

            {/* Export Report Button (42px locked height) */}
            <button
              type="button"
              onClick={handleExportCSV}
              className="h-[42px] min-h-[42px] max-h-[42px] px-2.5 sm:px-3.5 bg-[var(--admin-surface)] hover:bg-[var(--admin-surface-hover)] text-[var(--admin-text-primary)] rounded-[4px] border border-[var(--admin-border)] shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 shrink-0 font-bold text-[12px]"
              title="Export CSV"
            >
              <span className="material-symbols-outlined text-[17px] text-[var(--admin-accent)]">
                download
              </span>
              <span className="hidden sm:inline">Export CSV</span>
            </button>
          </div>
        }
      />

      {/* ─── Real-time Financial Reconciliation Ledger (Orders Page Kind) ─── */}
      <motion.div
        variants={fadeUp}
        className="admin-card overflow-hidden text-left relative p-0 !rounded-[4px] border border-[var(--admin-border)] shadow-xs"
      >
        <div className="absolute top-0 left-0 w-full h-[3px] bg-[var(--admin-border-strong)] z-10" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 bg-[var(--admin-surface)]">
          {/* Gross Revenue */}
          <div className="p-4 sm:p-5 space-y-1 border-r border-b lg:border-b-0 border-[var(--admin-border-subtle)]">
            <span className="text-[10px] sm:text-[10.5px] text-[var(--admin-text-tertiary)] font-bold uppercase tracking-wider block">
              Gross Revenue
            </span>
            <p className="text-[16px] sm:text-[18px] font-bold text-[var(--admin-text-primary)] tracking-tight">
              {formatCurrency(periodAnalytics.grossRevenue)}
            </p>
            <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-[var(--admin-text-secondary)] mt-1">
              <span className="truncate">vs prior {selectedPeriod}</span>
              {periodAnalytics.revDelta && (
                <span
                  className={`font-semibold shrink-0 ml-1 ${
                    periodAnalytics.revDelta.type === 'up'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : periodAnalytics.revDelta.type === 'down'
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-[var(--admin-text-tertiary)]'
                  }`}
                >
                  {periodAnalytics.revDelta.text}
                </span>
              )}
            </div>
          </div>

          {/* Net Orders */}
          <div className="p-4 sm:p-5 space-y-1 border-r border-b lg:border-b-0 border-[var(--admin-border-subtle)]">
            <span className="text-[10px] sm:text-[10.5px] text-[var(--admin-text-tertiary)] font-bold uppercase tracking-wider block">
              Net Orders
            </span>
            <p className="text-[16px] sm:text-[18px] font-bold text-[var(--admin-text-primary)] tracking-tight">
              {periodAnalytics.totalOrdersCount}
            </p>
            <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-[var(--admin-text-secondary)] mt-1">
              <span className="truncate">Orders placed</span>
              {periodAnalytics.ordDelta && (
                <span
                  className={`font-semibold shrink-0 ml-1 ${
                    periodAnalytics.ordDelta.type === 'up'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : periodAnalytics.ordDelta.type === 'down'
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-[var(--admin-text-tertiary)]'
                  }`}
                >
                  {periodAnalytics.ordDelta.text}
                </span>
              )}
            </div>
          </div>

          {/* Average Order Value */}
          <div className="p-4 sm:p-5 space-y-1 border-r border-b sm:border-r-0 lg:border-r lg:border-b-0 border-[var(--admin-border-subtle)]">
            <span className="text-[10px] sm:text-[10.5px] text-[var(--admin-text-tertiary)] font-bold uppercase tracking-wider block">
              Average Order Value
            </span>
            <p className="text-[16px] sm:text-[18px] font-bold text-[var(--admin-text-primary)] tracking-tight">
              {formatCurrency(periodAnalytics.aov)}
            </p>
            <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-[var(--admin-text-secondary)] mt-1">
              <span className="truncate">Avg basket size</span>
              {periodAnalytics.aovDelta && (
                <span
                  className={`font-semibold shrink-0 ml-1 ${
                    periodAnalytics.aovDelta.type === 'up'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : periodAnalytics.aovDelta.type === 'down'
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-[var(--admin-text-tertiary)]'
                  }`}
                >
                  {periodAnalytics.aovDelta.text}
                </span>
              )}
            </div>
          </div>

          {/* Pending Collections */}
          <div className="p-4 sm:p-5 space-y-1 border-r border-b sm:border-b-0 lg:border-b-0 border-[var(--admin-border-subtle)]">
            <span className="text-[10px] sm:text-[10.5px] text-[var(--admin-warning)] font-bold uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--admin-warning)] animate-pulse shrink-0" />
              <span className="truncate">Pending Collections</span>
            </span>
            <p className="text-[16px] sm:text-[18px] font-bold text-[var(--admin-text-primary)] tracking-tight">
              {formatCurrency(periodAnalytics.pendingRevenue)}
            </p>
            <span className="text-[10px] sm:text-[11px] text-[var(--admin-text-secondary)] mt-1 block truncate">
              COD & uncollected balance
            </span>
          </div>

          {/* Settled Revenue */}
          <div className="p-4 sm:p-5 space-y-1 bg-[var(--admin-success-light)] col-span-2 sm:col-span-2 lg:col-span-1 border-l-0">
            <span className="text-[10px] sm:text-[10.5px] text-[var(--admin-success)] font-bold uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--admin-success)] shrink-0" />
              <span className="truncate">Settled Revenue</span>
            </span>
            <p className="text-[16px] sm:text-[18px] font-bold text-[var(--admin-success)] tracking-tight">
              {formatCurrency(periodAnalytics.settledRevenue)}
            </p>
            <span className="text-[10px] sm:text-[11px] text-[var(--admin-success)] opacity-80 mt-1 block truncate">
              {periodAnalytics.settlementRate}% realization rate
            </span>
          </div>
        </div>
      </motion.div>

      {/* ─── Main Financial Chart Canvas ─── */}
      <motion.div
        variants={fadeUp}
        className="p-3.5 sm:p-5 lg:p-6 rounded-[4px] bg-[var(--admin-surface)] border border-[var(--admin-border)] shadow-xs"
      >
        {/* Chart Header & Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 sm:gap-3 mb-3 sm:mb-4 pb-2.5 sm:pb-3 border-b border-[var(--admin-border-subtle)]">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-[14px] sm:text-[15px] font-bold text-[var(--admin-text-primary)] tracking-tight">
                Revenue & Orders
              </h3>
              <span className="px-1.5 py-0.5 rounded-[4px] bg-[var(--admin-surface-muted)] text-[var(--admin-text-secondary)] text-[9.5px] sm:text-[10px] font-extrabold uppercase tracking-wider border border-[var(--admin-border)]">
                {selectedPeriod === '7D' || selectedPeriod === '30D' ? 'Daily' : 'Monthly'}
              </span>
            </div>
            <p className="hidden sm:block text-[12px] text-[var(--admin-text-tertiary)] mt-0.5">
              Historical commercial activity, revenue trajectory, and order velocity
            </p>
          </div>

          {/* View Mode Segmented Switcher */}
          <div className="flex items-center gap-1 bg-[var(--admin-surface-muted)] p-0.5 sm:p-1 rounded-[4px] border border-[var(--admin-border)] w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setSalesView('revenue')}
              className={`flex-1 sm:flex-none px-2.5 sm:px-3 py-1.5 rounded-[4px] text-[11px] sm:text-[11.5px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
                salesView === 'revenue'
                  ? 'bg-[var(--admin-surface)] text-[var(--admin-accent)] shadow-xs border border-[var(--admin-border)]'
                  : 'text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)]'
              }`}
            >
              <span
                className="w-2 h-2 rounded-[2px] shrink-0"
                style={{ backgroundColor: THEME.gold }}
              />
              <span className="hidden sm:inline">Revenue (₹)</span>
              <span className="sm:hidden">Revenue</span>
            </button>

            <button
              type="button"
              onClick={() => setSalesView('orders')}
              className={`flex-1 sm:flex-none px-2.5 sm:px-3 py-1.5 rounded-[4px] text-[11px] sm:text-[11.5px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
                salesView === 'orders'
                  ? 'bg-[var(--admin-surface)] text-[var(--admin-text-primary)] shadow-xs border border-[var(--admin-border)]'
                  : 'text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)]'
              }`}
            >
              <span
                className="w-2 h-2 rounded-[2px] shrink-0"
                style={{ backgroundColor: THEME.slate }}
              />
              <span className="hidden sm:inline">Order Volume</span>
              <span className="sm:hidden">Orders</span>
            </button>

            <button
              type="button"
              onClick={() => setSalesView('both')}
              className={`flex-1 sm:flex-none px-2.5 sm:px-3 py-1.5 rounded-[4px] text-[11px] sm:text-[11.5px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
                salesView === 'both'
                  ? 'bg-[var(--admin-surface)] text-[var(--admin-text-primary)] shadow-xs border border-[var(--admin-border)]'
                  : 'text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)]'
              }`}
            >
              <span className="material-symbols-outlined text-[14px] sm:text-[15px] shrink-0">
                waterfall_chart
              </span>
              <span>Combined</span>
            </button>
          </div>
        </div>

        {/* Quick Summary Strip (Mobile Optimized 2x2 Clean Grid) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 p-2.5 sm:p-3 mb-3 sm:mb-4 rounded-[4px] bg-[var(--admin-bg)] border border-[var(--admin-border)] text-left">
          <div className="min-w-0 pr-2 border-r border-b sm:border-b-0 border-[var(--admin-border)] pb-2 sm:pb-0">
            <p className="text-[9px] sm:text-[10px] uppercase font-bold text-[var(--admin-text-tertiary)] tracking-wider truncate">
              Gross Sales
            </p>
            <p className="text-[14px] sm:text-[15px] font-extrabold text-[var(--admin-text-primary)] mt-0.5 truncate">
              {formatCurrency(periodAnalytics.grossRevenue)}
            </p>
          </div>

          <div className="min-w-0 pl-2 border-b sm:border-b-0 sm:border-l border-[var(--admin-border)] pb-2 sm:pb-0">
            <p className="text-[9px] sm:text-[10px] uppercase font-bold text-[var(--admin-text-tertiary)] tracking-wider truncate">
              Orders
            </p>
            <p className="text-[14px] sm:text-[15px] font-extrabold text-[var(--admin-text-primary)] mt-0.5 truncate">
              {periodAnalytics.totalOrdersCount}{' '}
              {periodAnalytics.totalOrdersCount === 1 ? 'order' : 'orders'}
            </p>
          </div>

          <div className="min-w-0 pr-2 pt-2 sm:pt-0 sm:border-l border-r sm:border-r-0 border-[var(--admin-border)]">
            <p className="text-[9px] sm:text-[10px] uppercase font-bold text-[var(--admin-text-tertiary)] tracking-wider truncate">
              Avg Ticket
            </p>
            <p className="text-[14px] sm:text-[15px] font-extrabold text-[var(--admin-text-primary)] mt-0.5 truncate">
              {formatCurrency(periodAnalytics.aov)}
            </p>
          </div>

          <div className="min-w-0 pl-2 pt-2 sm:pt-0 sm:border-l border-[var(--admin-border)]">
            <p className="text-[9px] sm:text-[10px] uppercase font-bold text-[var(--admin-text-tertiary)] tracking-wider truncate">
              Peak Interval
            </p>
            <p className="text-[14px] sm:text-[15px] font-extrabold text-emerald-700 dark:text-emerald-400 mt-0.5 truncate">
              {periodAnalytics.peakInterval.label}{' '}
              <span className="text-[10.5px] font-medium text-[var(--admin-text-tertiary)]">
                ({formatCurrency(periodAnalytics.peakInterval.revenue)})
              </span>
            </p>
          </div>
        </div>

        {/* Recharts Canvas */}
        <div className="h-[260px] sm:h-[320px] w-full pt-1">
          {periodAnalytics.chartData.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center bg-[var(--admin-bg)] rounded-[4px] border border-dashed border-[var(--admin-border)] p-4 text-center">
              <span className="material-symbols-outlined text-[32px] text-[var(--admin-text-tertiary)] mb-1">
                monitoring
              </span>
              <p className="text-[12.5px] font-bold text-[var(--admin-text-primary)]">
                No Sales Recorded For This Period
              </p>
              <p className="text-[11px] text-[var(--admin-text-tertiary)] mt-0.5">
                Completed customer checkouts and rental bookings will populate this chart.
              </p>
            </div>
          ) : salesView === 'revenue' ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={periodAnalytics.chartData}
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="goldAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={THEME.gold} stopOpacity={0.28} />
                    <stop offset="95%" stopColor={THEME.gold} stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="var(--admin-border-subtle)"
                />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: 'var(--admin-text-tertiary)', fontWeight: 600 }}
                  dy={8}
                />
                <YAxis
                  hide={isMobile}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: 'var(--admin-text-tertiary)', fontWeight: 600 }}
                  tickFormatter={formatYAxisCurrency}
                  dx={-5}
                />
                <Tooltip content={<LuxuryFinancialTooltip />} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke={THEME.gold}
                  strokeWidth={2.5}
                  fill="url(#goldAreaGrad)"
                  dot={{ fill: THEME.gold, stroke: '#fff', strokeWidth: 2, r: 3 }}
                  activeDot={{ r: 5, fill: THEME.goldHover, stroke: '#fff', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : salesView === 'orders' ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={periodAnalytics.chartData}
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="var(--admin-border-subtle)"
                />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: 'var(--admin-text-tertiary)', fontWeight: 600 }}
                  dy={8}
                />
                <YAxis
                  hide={isMobile}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: 'var(--admin-text-tertiary)', fontWeight: 600 }}
                  allowDecimals={false}
                  dx={-5}
                />
                <Tooltip content={<LuxuryFinancialTooltip />} />
                <Bar dataKey="orders" fill={THEME.slate} radius={[3, 3, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={periodAnalytics.chartData}
                margin={{ top: 10, right: isMobile ? 0 : 20, left: -10, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="bothGoldGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={THEME.gold} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={THEME.gold} stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="var(--admin-border-subtle)"
                />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: 'var(--admin-text-tertiary)', fontWeight: 600 }}
                  dy={8}
                />
                <YAxis
                  yAxisId="rev"
                  hide={isMobile}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: 'var(--admin-text-tertiary)', fontWeight: 600 }}
                  tickFormatter={formatYAxisCurrency}
                  dx={-5}
                />
                <YAxis
                  yAxisId="ord"
                  orientation="right"
                  hide={isMobile}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: THEME.slate, fontWeight: 600 }}
                  allowDecimals={false}
                  dx={5}
                />
                <Tooltip content={<LuxuryFinancialTooltip />} />
                <Area
                  yAxisId="rev"
                  type="monotone"
                  dataKey="revenue"
                  stroke={THEME.gold}
                  strokeWidth={2}
                  fill="url(#bothGoldGrad)"
                  dot={{ fill: THEME.gold, stroke: '#fff', strokeWidth: 1.5, r: 2.5 }}
                />
                <Bar
                  yAxisId="ord"
                  dataKey="orders"
                  fill={THEME.slate}
                  opacity={0.75}
                  radius={[3, 3, 0, 0]}
                  maxBarSize={28}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Legend strip */}
        <div className="flex items-center justify-center gap-5 mt-3 pt-2.5 border-t border-[var(--admin-border-subtle)] text-[11px] font-semibold text-[var(--admin-text-secondary)]">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-[2px]" style={{ backgroundColor: THEME.gold }} />
            Revenue (₹)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-[2px]" style={{ backgroundColor: THEME.slate }} />
            Orders
          </span>
        </div>
      </motion.div>

      {/* ─── Row 2: Revenue Streams Split & Category Breakdown ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Card 1: Revenue Streams & Channel Breakdown */}
        <motion.div
          variants={fadeUp}
          className="p-3.5 sm:p-5 lg:p-6 rounded-[4px] bg-[var(--admin-surface)] border border-[var(--admin-border)] shadow-xs flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-1 sm:mb-2">
              <h3 className="text-[14px] sm:text-[15px] font-bold text-[var(--admin-text-primary)] tracking-tight">
                Revenue Streams Split
              </h3>
              <span className="hidden sm:inline-block text-[10.5px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider">
                Storefront vs Rentals
              </span>
            </div>
            <p className="hidden sm:block text-[12px] text-[var(--admin-text-tertiary)] mb-4">
              Financial performance segmented across retail decor purchases, event bookings, and
              bespoke orders
            </p>

            <div className="space-y-2.5 sm:space-y-3.5 mt-2 sm:mt-0">
              {revenueStreams.map((stream, idx) => (
                <div
                  key={idx}
                  className="p-2.5 sm:p-3 rounded-[4px] bg-[var(--admin-bg)] border border-[var(--admin-border)] hover:border-[var(--admin-border-strong)] transition-all"
                >
                  <div className="flex items-center justify-between gap-2.5 mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-[4px] flex items-center justify-center shrink-0 border"
                        style={{
                          backgroundColor: `color-mix(in srgb, ${stream.color} 10%, transparent)`,
                          borderColor: `color-mix(in srgb, ${stream.color} 25%, transparent)`,
                        }}
                      >
                        <span
                          className="material-symbols-outlined text-[15px] sm:text-[17px]"
                          style={{ color: stream.color }}
                        >
                          {stream.icon}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[12px] sm:text-[13px] font-bold text-[var(--admin-text-primary)] truncate">
                          {stream.name === 'Storefront Decor Sales'
                            ? 'Storefront Decor'
                            : stream.name === 'Event Bookings & Rentals'
                              ? 'Event Rentals'
                              : stream.name === 'Custom Bespoke Orders'
                                ? 'Custom Bespoke'
                                : stream.name}
                        </p>
                        <p className="text-[10.5px] sm:text-[11px] text-[var(--admin-text-tertiary)]">
                          {stream.orders} {stream.orders === 1 ? 'order' : 'orders'}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-[13px] sm:text-[14px] font-extrabold text-[var(--admin-text-primary)] leading-tight">
                        {formatCurrency(stream.revenue)}
                      </p>
                      <p className="text-[10.5px] font-bold mt-0.5" style={{ color: stream.color }}>
                        {stream.percentage}% share
                      </p>
                    </div>
                  </div>

                  {/* Clean Flat Progress Track */}
                  <div className="w-full h-1.5 bg-[var(--admin-surface-muted)] rounded-[2px] overflow-hidden">
                    <div
                      className="h-full rounded-[2px] transition-all duration-700"
                      style={{
                        width: `${Math.max(stream.percentage, 4)}%`,
                        backgroundColor: stream.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-2.5 border-t border-[var(--admin-border-subtle)] flex items-center justify-between text-[11px] sm:text-[12px] text-[var(--admin-text-secondary)]">
            <span>Total Commercial Engines:</span>
            <span className="font-bold text-[var(--admin-text-primary)]">
              {revenueStreams.reduce((sum, s) => sum + s.orders, 0)} Transactions
            </span>
          </div>
        </motion.div>

        {/* Card 2: Category Sales Performance */}
        <motion.div
          variants={fadeUp}
          className="p-3.5 sm:p-5 lg:p-6 rounded-[4px] bg-[var(--admin-surface)] border border-[var(--admin-border)] shadow-xs flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-1 sm:mb-2">
              <h3 className="text-[14px] sm:text-[15px] font-bold text-[var(--admin-text-primary)] tracking-tight">
                Category Contribution
              </h3>

              {/* Toggle Donut vs Bars */}
              <div className="flex items-center gap-1 bg-[var(--admin-surface-muted)] p-0.5 rounded-[4px] border border-[var(--admin-border)]">
                <button
                  type="button"
                  onClick={() => setCategoryView('donut')}
                  className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-[4px] text-[10.5px] sm:text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    categoryView === 'donut'
                      ? 'bg-[var(--admin-surface)] text-[var(--admin-text-primary)] shadow-xs border border-[var(--admin-border)]'
                      : 'text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[13px] sm:text-[14px]">
                    donut_large
                  </span>
                  <span>Donut</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCategoryView('bars')}
                  className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-[4px] text-[10.5px] sm:text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    categoryView === 'bars'
                      ? 'bg-[var(--admin-surface)] text-[var(--admin-text-primary)] shadow-xs border border-[var(--admin-border)]'
                      : 'text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[13px] sm:text-[14px]">
                    format_list_bulleted
                  </span>
                  <span>List</span>
                </button>
              </div>
            </div>
            <p className="hidden sm:block text-[12px] text-[var(--admin-text-tertiary)] mb-4">
              Breakdown of decor items purchased across catalog departments
            </p>

            {categoryStats.list.length === 0 ? (
              <div className="h-[220px] flex flex-col items-center justify-center bg-[var(--admin-bg)] rounded-[4px] border border-dashed border-[var(--admin-border)] p-4 text-center">
                <span className="material-symbols-outlined text-[28px] text-[var(--admin-text-tertiary)] mb-1">
                  category
                </span>
                <p className="text-[12px] font-bold text-[var(--admin-text-primary)]">
                  No Category Sales Logged
                </p>
              </div>
            ) : categoryView === 'donut' ? (
              <div className="flex flex-col sm:flex-row items-center gap-4 min-h-[220px]">
                {/* Donut Graphic */}
                <div className="relative w-[140px] h-[140px] sm:w-[170px] sm:h-[170px] shrink-0 flex items-center justify-center my-1 sm:my-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryStats.list}
                        cx="50%"
                        cy="50%"
                        innerRadius={44}
                        outerRadius={68}
                        dataKey="value"
                        paddingAngle={2}
                        strokeWidth={0}
                      >
                        {categoryStats.list.map((entry, idx) => (
                          <Cell key={idx} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip content={<LuxuryCategoryTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center Counter */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                    <span className="text-[18px] sm:text-[20px] font-black text-[var(--admin-text-primary)] leading-tight">
                      {categoryStats.totalUnits}
                    </span>
                    <span className="text-[9px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider">
                      Units Sold
                    </span>
                  </div>
                </div>

                {/* Ranked Legend List */}
                <div className="flex-1 w-full space-y-2 max-h-[220px] overflow-y-auto custom-scrollbar pr-1">
                  {categoryStats.list.map((cat, idx) => (
                    <div
                      key={idx}
                      className="p-2 sm:p-2.5 rounded-[4px] bg-[var(--admin-bg)] border border-[var(--admin-border)] hover:border-[var(--admin-border-strong)] transition-all"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-2 h-2 rounded-[2px] shrink-0"
                            style={{ backgroundColor: cat.color }}
                          />
                          <span className="text-[11.5px] sm:text-[12px] font-bold text-[var(--admin-text-primary)] truncate">
                            {cat.name}
                          </span>
                        </div>
                        <span className="text-[11.5px] sm:text-[12px] font-bold text-[var(--admin-text-primary)] shrink-0">
                          {cat.value}{' '}
                          <span className="text-[10px] font-medium text-[var(--admin-text-tertiary)]">
                            units
                          </span>{' '}
                          <span className="text-emerald-700 dark:text-emerald-400 font-semibold ml-0.5">
                            ({cat.percentage}%)
                          </span>
                        </span>
                      </div>
                      <div className="w-full h-1 bg-[var(--admin-surface-muted)] rounded-[2px] overflow-hidden">
                        <div
                          className="h-full rounded-[2px] transition-all duration-500"
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
              <div className="space-y-2 max-h-[240px] overflow-y-auto custom-scrollbar pr-1">
                {categoryStats.list.map((cat, idx) => (
                  <div
                    key={idx}
                    className="p-2 sm:p-2.5 rounded-[4px] bg-[var(--admin-bg)] border border-[var(--admin-border)]"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-4 h-4 rounded-[3px] bg-[var(--admin-surface)] text-[9.5px] font-extrabold text-[var(--admin-text-secondary)] border border-[var(--admin-border)] flex items-center justify-center shrink-0">
                          #{idx + 1}
                        </span>
                        <span className="text-[12px] font-bold text-[var(--admin-text-primary)] truncate">
                          {cat.name}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[12px] font-extrabold text-[var(--admin-text-primary)]">
                          {cat.value} units
                        </span>
                        <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 ml-1.5">
                          ({cat.percentage}%)
                        </span>
                      </div>
                    </div>
                    <div className="w-full h-1 bg-[var(--admin-surface-muted)] rounded-[2px] overflow-hidden">
                      <div
                        className="h-full rounded-[2px] transition-all duration-500"
                        style={{
                          width: `${Math.max(cat.percentage, 4)}%`,
                          backgroundColor: cat.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 pt-2.5 border-t border-[var(--admin-border-subtle)] flex items-center justify-between text-[11px] sm:text-[12px] text-[var(--admin-text-secondary)]">
            <span>Total Catalog Departments:</span>
            <span className="font-bold text-[var(--admin-text-primary)]">
              {categoryStats.list.length} Departments
            </span>
          </div>
        </motion.div>
      </div>

      {/* ─── Row 3: Top Revenue Products & Payment Methods Analysis ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Card 1: Top Revenue Driving Products */}
        <motion.div
          variants={fadeUp}
          className="p-3.5 sm:p-5 lg:p-6 rounded-[4px] bg-[var(--admin-surface)] border border-[var(--admin-border)] shadow-xs flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-1 sm:mb-2">
              <h3 className="text-[14px] sm:text-[15px] font-bold text-[var(--admin-text-primary)] tracking-tight">
                Top Revenue Items
              </h3>
              <span className="hidden sm:inline-block text-[10.5px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider">
                Ranked by Earnings
              </span>
            </div>
            <p className="hidden sm:block text-[12px] text-[var(--admin-text-tertiary)] mb-3">
              Best-selling decor centerpieces and rental inventory driving store revenue
            </p>

            {topRevenueProducts.length === 0 ? (
              <div className="h-[180px] flex flex-col items-center justify-center bg-[var(--admin-bg)] rounded-[4px] border border-dashed border-[var(--admin-border)] p-4 text-center">
                <span className="material-symbols-outlined text-[28px] text-[var(--admin-text-tertiary)] mb-1">
                  inventory_2
                </span>
                <p className="text-[12px] font-bold text-[var(--admin-text-secondary)]">
                  No Product Sales Data
                </p>
              </div>
            ) : (
              <div className="space-y-2 mt-1 sm:mt-0">
                {topRevenueProducts.map((prod, idx) => (
                  <div
                    key={idx}
                    className="p-2 sm:p-2.5 rounded-[4px] bg-[var(--admin-bg)] border border-[var(--admin-border)] flex items-center justify-between gap-2.5 hover:border-[var(--admin-border-strong)] transition-all"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-[3px] bg-[var(--admin-surface)] text-[9.5px] sm:text-[10px] font-extrabold text-[var(--admin-text-secondary)] border border-[var(--admin-border)] flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      {prod.image ? (
                        <img
                          src={prod.image}
                          alt={prod.name}
                          className="w-8 h-8 rounded-[4px] object-cover border border-[var(--admin-border)] shrink-0"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-[4px] bg-[var(--admin-surface-muted)] border border-[var(--admin-border)] flex items-center justify-center text-[var(--admin-text-tertiary)] shrink-0">
                          <span className="material-symbols-outlined text-[16px]">image</span>
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-[12px] sm:text-[12.5px] font-bold text-[var(--admin-text-primary)] truncate">
                          {prod.name}
                        </p>
                        <p className="text-[10.5px] text-[var(--admin-text-tertiary)]">
                          {prod.units} {prod.units === 1 ? 'unit sold' : 'units sold'}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-[12.5px] sm:text-[13.5px] font-extrabold text-[var(--admin-text-primary)]">
                        {formatCurrency(prod.revenue)}
                      </p>
                      <span className="inline-block text-[9.5px] font-bold px-1.5 py-0.2 rounded-[3px] bg-[var(--admin-surface-muted)] text-[var(--admin-text-secondary)] border border-[var(--admin-border)] mt-0.5">
                        {prod.category}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-3.5 pt-2 border-t border-[var(--admin-border-subtle)] text-right">
            <span className="text-[11px] font-bold text-[var(--admin-accent)]">
              Top 5 Performers
            </span>
          </div>
        </motion.div>

        {/* Card 2: Payment Gateway & Settlement Methods */}
        <motion.div
          variants={fadeUp}
          className="p-3.5 sm:p-5 lg:p-6 rounded-[4px] bg-[var(--admin-surface)] border border-[var(--admin-border)] shadow-xs flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-1 sm:mb-2">
              <h3 className="text-[14px] sm:text-[15px] font-bold text-[var(--admin-text-primary)] tracking-tight">
                Payment Settlement
              </h3>
              <span className="hidden sm:inline-block text-[10.5px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider">
                Gateway Health
              </span>
            </div>
            <p className="hidden sm:block text-[12px] text-[var(--admin-text-tertiary)] mb-3">
              Real-time settlement rates across online payment rails and Cash on Delivery logistics
            </p>

            <div className="space-y-2 sm:space-y-2.5 mt-1 sm:mt-0">
              {paymentMethodsAnalysis.map((item, idx) => (
                <div
                  key={idx}
                  className="p-2.5 sm:p-3 rounded-[4px] bg-[var(--admin-bg)] border border-[var(--admin-border)]"
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-[4px] flex items-center justify-center shrink-0 border"
                        style={{
                          backgroundColor: `color-mix(in srgb, ${item.color} 10%, transparent)`,
                          borderColor: `color-mix(in srgb, ${item.color} 25%, transparent)`,
                        }}
                      >
                        <span
                          className="material-symbols-outlined text-[15px] sm:text-[17px]"
                          style={{ color: item.color }}
                        >
                          {item.icon}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[12px] sm:text-[12.5px] font-bold text-[var(--admin-text-primary)] truncate">
                          {item.method === 'Online Prepaid (Razorpay / UPI / Cards)'
                            ? 'Online Prepaid'
                            : item.method}
                        </p>
                        <p className="text-[10.5px] text-[var(--admin-text-tertiary)]">
                          {item.count} orders · {item.percentage}% share
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-[12.5px] sm:text-[13.5px] font-extrabold text-[var(--admin-text-primary)]">
                        {formatCurrency(item.volume)}
                      </p>
                      <span className="inline-block text-[9.5px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-[4px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 mt-0.5">
                        {item.status}
                      </span>
                    </div>
                  </div>

                  <div className="w-full h-1.5 bg-[var(--admin-surface-muted)] rounded-[2px] overflow-hidden">
                    <div
                      className="h-full rounded-[2px] transition-all duration-500"
                      style={{
                        width: `${Math.max(item.percentage, 5)}%`,
                        backgroundColor: item.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-3.5 pt-2 border-t border-[var(--admin-border-subtle)] flex items-center justify-between text-[11px] sm:text-[12px] text-[var(--admin-text-secondary)]">
            <span>Dispute Risk:</span>
            <span className="font-bold text-emerald-700 dark:text-emerald-400">
              Low (0.0% Chargebacks)
            </span>
          </div>
        </motion.div>
      </div>

      {/* ─── Row 4: Commercial Activity Stream ─── */}
      <motion.div
        variants={fadeUp}
        className="p-3.5 sm:p-5 lg:p-6 rounded-[4px] bg-[var(--admin-surface)] border border-[var(--admin-border)] shadow-xs"
      >
        <div className="flex items-center justify-between mb-1 sm:mb-2">
          <h3 className="text-[14px] sm:text-[15px] font-bold text-[var(--admin-text-primary)] tracking-tight">
            Commercial Activity
          </h3>
          <span className="text-[10px] sm:text-[11px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider">
            Live Events
          </span>
        </div>
        <p className="hidden sm:block text-[12px] text-[var(--admin-text-tertiary)] mb-4">
          Real-time customer transactions, orders, and commercial milestones
        </p>

        {!dashboardStats?.recentActivity || dashboardStats.recentActivity.length === 0 ? (
          <div className="h-[140px] flex flex-col items-center justify-center bg-[var(--admin-bg)] rounded-[4px] border border-dashed border-[var(--admin-border)] p-3 text-center">
            <span className="material-symbols-outlined text-[24px] text-[var(--admin-text-tertiary)] mb-1">
              history
            </span>
            <span className="text-[10px] uppercase font-bold text-[var(--admin-text-secondary)] tracking-wider">
              No Commercial Actions Logged
            </span>
          </div>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-1 mt-1 sm:mt-0">
            {dashboardStats.recentActivity.map((activity, i) => {
              const isOrder = activity.type === 'order';
              const isUser = activity.type === 'user';
              const iconName = isOrder ? 'shopping_bag' : isUser ? 'person' : 'shield';
              const iconColor = isOrder ? THEME.gold : isUser ? THEME.slate : THEME.sage;

              return (
                <div
                  key={i}
                  className="flex items-center justify-between p-2.5 rounded-[4px] bg-[var(--admin-bg)] border border-[var(--admin-border)] hover:border-[var(--admin-border-strong)] transition-all gap-2.5"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-[4px] flex items-center justify-center shrink-0 border"
                      style={{
                        backgroundColor: `color-mix(in srgb, ${iconColor} 10%, transparent)`,
                        borderColor: `color-mix(in srgb, ${iconColor} 20%, transparent)`,
                      }}
                    >
                      <span
                        className="material-symbols-outlined text-[15px] sm:text-[17px]"
                        style={{ color: iconColor }}
                      >
                        {iconName}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[12px] sm:text-[12.5px] text-[var(--admin-text-primary)] truncate">
                        <span className="font-bold">{activity.user}</span> · {activity.action}
                      </p>
                      <p className="text-[10.5px] text-[var(--admin-text-tertiary)]">
                        {new Date(activity.timestamp).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>

                  {isOrder && (
                    <span className="px-1.5 py-0.5 rounded-[3px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-bold shrink-0">
                      Paid
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
