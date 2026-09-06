import { ResponsiveContainer } from 'recharts';
import { AreaChart } from 'recharts';
import { CartesianGrid } from 'recharts';
import { XAxis } from 'recharts';
import { YAxis } from 'recharts';
import { Tooltip } from 'recharts';
import { Area } from 'recharts';
import { BarChart } from 'recharts';
import { Bar } from 'recharts';
import { LabelList } from 'recharts';
import { PieChart } from 'recharts';
import { Pie } from 'recharts';
import { Cell } from 'recharts';
import { m as motion } from 'framer-motion';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';

import api from '../../services/api';
import logger from '../../utils/core/logger';
import AdminCustomerProfileModal from '../components/AdminCustomerProfileModal';
import {
  PageHeader,
  StatCard,
  ChartCard,
  ChartTooltip,
  SkeletonDashboard,
  stagger,
  fadeUp,
  getRelativeTime,
} from '../components/AdminUIKit';

const VIBRANT_MULTI_COLORS = [
  '#3b82f6', // Bright Blue
  '#8b5cf6', // Vivid Purple
  '#ec4899', // Pink
  '#f59e0b', // Amber / Gold
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#f97316', // Orange
  '#6366f1', // Indigo
  '#14b8a6', // Teal
  '#e11d48', // Crimson Red
  '#84cc16', // Lime Green
  '#a855f7', // Violet
  '#0284c7', // Sky Blue
  '#eab308', // Warm Yellow
  '#d946ef', // Fuchsia
  '#22c55e', // Green
];

// Human-understandable names for recommendation sources
const RECOMMENDATION_SOURCE_NAMES = {
  trending: 'Trending Decor',
  similar: 'Similar Items',
  feed: 'Personalized Feed',
  seasonal: 'Festive & Seasonal',
};

function AffinityTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;
  return (
    <div className="bg-[var(--admin-surface)] border border-[var(--admin-border)] shadow-xl rounded-xl p-3 text-[12px] min-w-[180px] pointer-events-none">
      <div className="flex items-center gap-2 mb-1.5">
        <span
          className="w-3 h-3 rounded-full shrink-0"
          style={{ backgroundColor: data.color || payload[0]?.color }}
        />
        <span className="font-bold text-[var(--admin-text-primary)] truncate">
          {data.displayName || data._id}
        </span>
      </div>
      <p className="text-[13px] font-extrabold text-[var(--admin-text-primary)] font-mono">
        {data.count}{' '}
        <span className="text-[11px] font-semibold text-[var(--admin-text-tertiary)]">
          {data.count === 1 ? 'interaction' : 'interactions'}
        </span>
      </p>
    </div>
  );
}

function formatLogUser(user, role, customerName) {
  if (customerName) return customerName;
  if (!user || user.startsWith('Visitor #') || user.toLowerCase().startsWith('visitor')) {
    return role === 'admin' ? 'Store Staff' : 'Guest Shopper';
  }
  return user;
}

function formatLogAction(action) {
  if (!action) return 'Interacted with store';
  if (
    action.toLowerCase().includes('browsed orders/') ||
    action.toLowerCase().includes('browsed order/')
  ) {
    const raw = action.replace(/browsed\s+/i, '').replace(/\s+page/i, '');
    const code = raw.split('/').filter(Boolean).pop()?.toUpperCase() || '';
    return code
      ? `Looked up Order #${code} delivery & tracking status`
      : 'Checked order delivery & tracking status';
  }
  if (
    action.toLowerCase().includes('adminanalytics/operations') ||
    action.toLowerCase().includes('admin/analytics/operations')
  ) {
    return 'Reviewed Operational Insights Dashboard';
  }
  if (
    action.toLowerCase().includes('adminanalytics') ||
    action.toLowerCase().includes('admin/analytics')
  ) {
    return 'Analyzed Sales & Revenue Performance';
  }
  return action;
}

function formatLogDetail(detail) {
  if (!detail) return '';
  if (detail.startsWith('/orders/') || detail.startsWith('/order/')) {
    const code = detail.split('/').filter(Boolean).pop()?.toUpperCase() || '';
    return code ? `Order #${code}` : 'Order Tracking';
  }
  if (detail.startsWith('/admin/analytics/operations')) {
    return 'Operational Insights';
  }
  if (detail.startsWith('/admin/')) {
    return 'Admin Management';
  }
  if (detail.startsWith('/')) {
    return detail
      .replace(/^\//, '')
      .replace(/[-_]+/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return detail;
}

function formatLogDevice(device) {
  if (!device) return 'Desktop Browser';
  const d = String(device).toLowerCase();
  if (d === 'desktop' || d.includes('desktop')) return 'Desktop Browser';
  if (d === 'mobile' || d.includes('mobile')) return 'Mobile Phone';
  if (d === 'tablet' || d.includes('tablet')) return 'Tablet';
  return device;
}

function isRedundantDetail(action, details, orderCode) {
  if (!details) return true;
  const a = (action || '').toLowerCase();
  const d = (details || '').toLowerCase();
  if (orderCode && d.includes(orderCode.toLowerCase()) && a.includes(orderCode.toLowerCase())) {
    return true;
  }
  if (a.includes(d) || d.includes(a)) return true;
  return false;
}

export function AdminRecommendationAnalytics() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Live User Activity Logs state
  const [userLogs, setUserLogs] = useState([]);
  const [logsSummary, setLogsSummary] = useState({
    viewsCount: 0,
    cartCount: 0,
    searchesCount: 0,
    authCount: 0,
  });
  const [logsLoading, setLogsLoading] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedActorScope, setSelectedActorScope] = useState('all'); // 'all', 'users', 'staff'
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const KNOWN_EVENT_CATEGORIES = useMemo(
    () => [
      'South Indian Wedding',
      'Traditional Indian Festival',
      'Engagement Ceremony',
      'Sankranthi Festive Decor',
      'Ganesh Pooja Backdrops',
      'Butta Decoration',
      'Indian Wedding Gifts',
      'Reception & Sangeet',
      'Haldi & Mehendi Decor',
      'Baby Shower & Seemantham',
      'Birthday & Milestone Celebrations',
      'Event Packages',
      'Event Showcase',
    ],
    [],
  );

  const KNOWN_PRODUCT_CATEGORIES = useMemo(
    () => [
      'Bangle Trays',
      'Pooja Decoration Sets',
      'Tray Decorations',
      'Jewellery Trays',
      'Kobbari Chippalu',
      'Gift Hampers',
      'Coconut Decorations',
      'Return Gifts',
      'Props & Backdrops',
      'Decor Products',
      'Order Checkout',
    ],
    [],
  );

  // Dynamically collect all available product & event categories from live logs and affinities
  const { productCategoriesList, eventCategoriesList } = useMemo(() => {
    const prodSet = new Set(KNOWN_PRODUCT_CATEGORIES);
    const evtSet = new Set(KNOWN_EVENT_CATEGORIES);

    const checkAndAdd = (catName, dom) => {
      if (
        !catName ||
        catName === 'General' ||
        catName === 'Storefront Action' ||
        catName === 'Account Registration'
      )
        return;
      const clean = catName.trim();
      const lower = clean.toLowerCase();
      const isEvent =
        dom === 'event' ||
        [
          'wedding',
          'festival',
          'engagement',
          'sankranthi',
          'ganesh',
          'haldi',
          'mehendi',
          'shower',
          'birthday',
          'reception',
          'ceremony',
          'event',
        ].some((k) => lower.includes(k));

      if (isEvent) {
        evtSet.add(clean);
      } else {
        prodSet.add(clean);
      }
    };

    userLogs.forEach((l) => checkAndAdd(l.category, l.domain));
    if (stats?.userMetrics?.topAffinities) {
      stats.userMetrics.topAffinities.forEach((a) => checkAndAdd(String(a._id)));
    }
    if (stats?.trendingMetrics?.topCategories) {
      stats.trendingMetrics.topCategories.forEach((t) => checkAndAdd(String(t._id)));
    }

    return {
      productCategoriesList: Array.from(prodSet).sort(),
      eventCategoriesList: Array.from(evtSet).sort(),
    };
  }, [userLogs, stats, KNOWN_PRODUCT_CATEGORIES, KNOWN_EVENT_CATEGORIES]);

  const fetchLogs = useCallback(
    async (type = selectedFilter) => {
      try {
        setLogsLoading(true);
        const res = await api.get(
          `/analytics/recommendations/live-user-logs?type=${type}&limit=60`,
        );
        if (res.data?.success) {
          setUserLogs(res.data.data?.logs || []);
          if (res.data.data?.summary) {
            setLogsSummary(res.data.data.summary);
          }
          setLastSyncTime(new Date());
        }
      } catch (err) {
        logger.error('Failed to fetch live user logs', err);
      } finally {
        setLogsLoading(false);
      }
    },
    [selectedFilter],
  );

  useEffect(() => {
    fetchLogs(selectedFilter);
  }, [selectedFilter, fetchLogs]);

  // Live auto-refresh polling every 15s
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchLogs(selectedFilter);
    }, 15000);
    return () => clearInterval(interval);
  }, [autoRefresh, selectedFilter, fetchLogs]);

  // Categorize log actors into Staff vs Users (Customers & Visitors)
  const { staffCount, usersCount, customersCount, visitorsCount } = useMemo(() => {
    let staff = 0;
    let customers = 0;
    let visitors = 0;

    userLogs.forEach((log) => {
      const role = (log.userRole || '').toLowerCase();
      const user = (log.user || '').toLowerCase();
      const isStaffLog =
        role === 'admin' ||
        role === 'staff' ||
        role === 'super_admin' ||
        role === 'main_admin' ||
        user.includes('staff') ||
        user.includes('admin');

      if (isStaffLog) {
        staff++;
      } else {
        const isCustomerLog =
          role === 'customer' ||
          role === 'user' ||
          Boolean(log.customerId || log.customerEmail || log.customerPhone);
        if (isCustomerLog) {
          customers++;
        } else {
          visitors++;
        }
      }
    });

    return {
      staffCount: staff,
      usersCount: customers + visitors,
      customersCount: customers,
      visitorsCount: visitors,
    };
  }, [userLogs]);

  const filteredLogs = useMemo(() => {
    let result = userLogs;

    const isStaffLog = (log) => {
      const role = (log.userRole || '').toLowerCase();
      const user = (log.user || '').toLowerCase();
      return (
        role === 'admin' ||
        role === 'staff' ||
        role === 'super_admin' ||
        role === 'main_admin' ||
        user.includes('staff') ||
        user.includes('admin')
      );
    };

    const isCustomerLog = (log) => {
      const role = (log.userRole || '').toLowerCase();
      return (
        role === 'customer' ||
        role === 'user' ||
        Boolean(log.customerId || log.customerEmail || log.customerPhone)
      );
    };

    // 1. Filter by Actor Scope (Staff vs Users)
    if (selectedActorScope === 'staff') {
      result = result.filter((log) => isStaffLog(log));
    } else if (selectedActorScope === 'users') {
      result = result.filter((log) => !isStaffLog(log));
    }

    // 2. Filter by Search query
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      result = result.filter(
        (log) =>
          (log.user && log.user.toLowerCase().includes(q)) ||
          (log.customerName && log.customerName.toLowerCase().includes(q)) ||
          (log.customerEmail && log.customerEmail.toLowerCase().includes(q)) ||
          (log.customerPhone && log.customerPhone.toLowerCase().includes(q)) ||
          (log.orderCode && log.orderCode.toLowerCase().includes(q)) ||
          (log.action && log.action.toLowerCase().includes(q)) ||
          (log.details && log.details.toLowerCase().includes(q)) ||
          (log.device && log.device.toLowerCase().includes(q)) ||
          (log.category && log.category.toLowerCase().includes(q)),
      );
    }

    return result;
  }, [userLogs, selectedActorScope, searchFilter]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const [overviewRes, ctrRes, trendingRes, interestsRes, conversionRes, execRes] =
          await Promise.all([
            api.get('/analytics/recommendations/overview'),
            api.get('/analytics/recommendations/ctr?days=7'),
            api.get('/analytics/recommendations/trending-history?limit=1'),
            api.get('/analytics/recommendations/user-interests'),
            api.get('/analytics/recommendations/conversion-impact'),
            api.get('/customer-intelligence/executive-summary'),
          ]);

        const aggregatedStats = {
          engagementMetrics: {
            totalInteractions:
              overviewRes.data?.data?.totalInteractionsAllTime ??
              overviewRes.data?.data?.totalInteractions ??
              overviewRes.data?.data?.totalInteractions30d ??
              0,
            interactionsByDay: overviewRes.data?.data?.interactionsByDay || [],
          },
          userMetrics: {
            activeProfiles: overviewRes.data?.data?.activeProfiles || 0,
            topAffinities:
              interestsRes.data?.data?.categoryInterests?.map((c) => ({
                _id: c.category,
                count: c.interactions,
              })) || [],
          },
          conversionMetrics: {
            globalClickThroughRate: (conversionRes.data?.data?.attributionRate || 0) / 100,
            clickThroughRateByType: {},
          },
          trendingMetrics: {
            topCategories:
              (trendingRes.data?.data?.snapshots?.[0]?.topItems?.length > 0
                ? trendingRes.data.data.snapshots[0].topItems.map((item) => ({
                    _id: item.category,
                    count: item.score,
                  }))
                : interestsRes.data?.data?.categoryInterests?.map((c) => ({
                    _id: c.category,
                    count: c.interactions,
                  }))) || [],
          },
          generalMetrics: {
            websiteVisitors: execRes.data?.data?.snapshot?.metrics?.activeCustomers || 0,
          },
        };

        // Populate CTR by type across recent days
        if (ctrRes.data?.data?.days?.length > 0) {
          const daysList = ctrRes.data.data.days;
          ['trending', 'similar', 'feed', 'seasonal'].forEach((type) => {
            let sumCtr = 0;
            let count = 0;
            daysList.forEach((d) => {
              if (d[type] && typeof d[type].ctr === 'number' && d[type].ctr > 0) {
                sumCtr += d[type].ctr;
                count++;
              }
            });
            const avgCtr = count > 0 ? sumCtr / count : daysList[0]?.[type]?.ctr || 0;
            aggregatedStats.conversionMetrics.clickThroughRateByType[type] = avgCtr / 100;
          });
        }

        setStats(aggregatedStats);
      } catch (err) {
        logger.error('Failed to fetch recommendation analytics', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  // Map CTR array for charts with human-understandable source names
  const ctrData = useMemo(() => {
    if (!stats?.conversionMetrics?.clickThroughRateByType) return [];
    return Object.keys(stats.conversionMetrics.clickThroughRateByType).map((key, idx) => {
      const rawKey = key.toLowerCase();
      const displayName =
        RECOMMENDATION_SOURCE_NAMES[rawKey] ||
        key
          .replace(/[-_]+/g, ' ')
          .split(' ')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(' ');
      const val = parseFloat(
        (stats.conversionMetrics.clickThroughRateByType[key] * 100).toFixed(1),
      );
      return {
        key: rawKey,
        name: displayName,
        ctr: val,
        color: VIBRANT_MULTI_COLORS[(idx * 2) % VIBRANT_MULTI_COLORS.length],
      };
    });
  }, [stats]);

  // Process and clean User Top Affinities with multi-colors and clean labels
  const formattedAffinities = useMemo(() => {
    if (!stats?.userMetrics?.topAffinities) return [];
    return stats.userMetrics.topAffinities.map((item, idx) => {
      const raw = String(item._id || 'General');
      const cleanName = raw
        .replace(/[-_]+/g, ' ')
        .split(' ')
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');

      return {
        ...item,
        displayName: cleanName,
        color: VIBRANT_MULTI_COLORS[idx % VIBRANT_MULTI_COLORS.length],
      };
    });
  }, [stats]);

  // Clean trending categories with multi-colors
  const formattedTrending = useMemo(() => {
    if (!stats?.trendingMetrics?.topCategories) return [];
    return stats.trendingMetrics.topCategories.map((item, idx) => {
      const raw = String(item._id || 'General');
      const cleanName = raw
        .replace(/[-_]+/g, ' ')
        .split(' ')
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');

      return {
        ...item,
        displayName: cleanName,
        color: VIBRANT_MULTI_COLORS[idx % VIBRANT_MULTI_COLORS.length],
      };
    });
  }, [stats]);

  if (loading || !stats) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <SkeletonDashboard />
      </div>
    );
  }

  return (
    <motion.div initial="hidden" animate="show" variants={stagger} className="space-y-6">
      <PageHeader
        title="Live Customer Activity"
        subtitle={`Real-time visitor clicks, searches, cart items & orders · ${
          lastSyncTime
            ? `Synced ${lastSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
            : ''
        }`}
        headerAction={
          <div className="flex items-center justify-end gap-2 w-full sm:w-auto ml-auto">
            <button
              type="button"
              onClick={() => setAutoRefresh((prev) => !prev)}
              className={`px-3 py-1.5 rounded-[var(--admin-radius-md)] text-[11px] font-bold border transition-all flex items-center gap-1.5 ${
                autoRefresh
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                  : 'bg-[var(--admin-surface)] text-[var(--admin-text-tertiary)] border-[var(--admin-border)]'
              }`}
              title={autoRefresh ? 'Live Auto-Sync every 15s (Active)' : 'Auto-Sync is paused'}
            >
              <span className="material-symbols-outlined text-[14px]">
                {autoRefresh ? 'autorenew' : 'pause_circle'}
              </span>
              <span>{autoRefresh ? 'Live Sync (15s)' : 'Sync Paused'}</span>
            </button>

            <button
              type="button"
              onClick={() => fetchLogs(selectedFilter)}
              disabled={logsLoading}
              className="w-9 h-9 bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-border-subtle)] text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] rounded-md flex items-center justify-center cursor-pointer transition-all active:scale-95 border border-[var(--admin-border)] shrink-0 disabled:opacity-50"
              title="Refresh logs now"
            >
              <span
                className={`material-symbols-outlined text-[18px] ${logsLoading ? 'animate-spin' : ''}`}
              >
                sync
              </span>
            </button>
          </div>
        }
      />

      {/* KPI Cards */}
      <motion.div variants={stagger} className="admin-grid-stats">
        <StatCard
          icon="touch_app"
          label="Total Interactions"
          value={stats.engagementMetrics?.totalInteractions || 0}
          change={stats.engagementMetrics?.change ? `${stats.engagementMetrics.change}%` : ''}
          changeType={
            stats.engagementMetrics?.change > 0
              ? 'up'
              : stats.engagementMetrics?.change < 0
                ? 'down'
                : ''
          }
          color="var(--admin-info)"
        />
        <StatCard
          icon="psychology"
          label="Active Profiles"
          value={stats.userMetrics?.activeProfiles || 0}
          change={stats.userMetrics?.change ? `${stats.userMetrics.change}%` : ''}
          changeType={
            stats.userMetrics?.change > 0 ? 'up' : stats.userMetrics?.change < 0 ? 'down' : ''
          }
          color="var(--admin-accent)"
        />
        <StatCard
          icon="ads_click"
          label="Avg Global CTR"
          value={`${((stats.conversionMetrics?.globalClickThroughRate || 0) * 100).toFixed(1)}%`}
          change={stats.conversionMetrics?.change ? `${stats.conversionMetrics.change}%` : ''}
          changeType={
            stats.conversionMetrics?.change > 0
              ? 'up'
              : stats.conversionMetrics?.change < 0
                ? 'down'
                : ''
          }
          color="var(--admin-success)"
        />
        <StatCard
          icon="groups"
          label="Website Visitors"
          value={stats.generalMetrics?.websiteVisitors || 0}
          change=""
          changeType="neutral"
          color="var(--admin-warning)"
        />
      </motion.div>

      {/* Live User Activity & Clickstream Feed */}
      <motion.div variants={fadeUp} className="admin-card p-5 sm:p-6 flex flex-col">
        {/* Panel Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 pb-3 mb-3 border-b border-[var(--admin-border-subtle)]">
          <div className="flex items-center gap-2">
            <h3 className="text-[15px] sm:text-[16px] font-bold text-[var(--admin-text-primary)]">
              Live Activity
            </h3>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              LIVE
            </span>
          </div>

          {/* Beside Live Activity: Filter by Staff and Users */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            {/* Staff & Users Pills */}
            <div className="inline-flex items-center p-0.5 rounded-lg bg-[var(--admin-surface-muted)] border border-[var(--admin-border)] text-[11.5px] font-semibold">
              <button
                type="button"
                onClick={() => setSelectedActorScope('all')}
                className={`px-3 py-1.5 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedActorScope === 'all'
                    ? 'bg-[var(--admin-surface)] text-[var(--admin-text-primary)] shadow-2xs font-bold'
                    : 'text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)]'
                }`}
              >
                <span>All</span>
                <span className="text-[10px] font-mono opacity-70">({userLogs.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedActorScope('users')}
                className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                  selectedActorScope === 'users'
                    ? 'bg-[var(--admin-surface)] text-blue-600 dark:text-blue-400 shadow-2xs font-bold'
                    : 'text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)]'
                }`}
                title="Filter by Storefront Users (Customers & Visitors)"
              >
                <span className="material-symbols-outlined text-[13px]">person</span>
                <span>Users</span>
                <span className="text-[10px] font-mono opacity-70">({usersCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedActorScope('staff')}
                className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                  selectedActorScope === 'staff'
                    ? 'bg-[var(--admin-surface)] text-purple-600 dark:text-purple-400 shadow-2xs font-bold'
                    : 'text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)]'
                }`}
                title="Filter by Admin & Store Staff"
              >
                <span className="material-symbols-outlined text-[13px]">shield_person</span>
                <span>Staff</span>
                <span className="text-[10px] font-mono opacity-70">({staffCount})</span>
              </button>
            </div>
          </div>
        </div>

        {/* Search Bar & Filter Tabs: Stacked on mobile, side-by-side on laptop */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5 w-full mb-4">
          {/* Search Box: 1st at Top on mobile, flex-1 side-by-side on laptop */}
          <div className="activity-search-box relative flex-1 w-full bg-[var(--admin-surface-muted)] rounded border border-[var(--admin-border)] flex items-center px-3.5 h-14 lg:h-11 transition-all focus-within:border-[var(--admin-accent)] focus-within:ring-1 focus-within:ring-[var(--admin-accent)]/20 shadow-2xs min-w-0">
            <span className="material-symbols-outlined text-[24px] text-[var(--admin-text-tertiary)] shrink-0">
              search
            </span>
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search customer, order, action, email, phone..."
              className="bg-transparent border-none outline-none w-full text-[14.5px] sm:text-[13.5px] text-[var(--admin-text-primary)] placeholder-[var(--admin-text-tertiary)] font-medium px-2.5 h-full min-w-0"
            />
            {searchFilter && (
              <button
                type="button"
                onClick={() => setSearchFilter('')}
                className="text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)] text-[20px] cursor-pointer p-1 transition-colors leading-none"
                title="Clear search"
              >
                ×
              </button>
            )}
          </div>

          {/* Category Tabs: Side-by-side with matching height on laptop */}
          <div className="flex items-center gap-1 p-1 bg-[var(--admin-surface-muted)] rounded border border-[var(--admin-border)] overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] h-[44px] sm:h-[46px] w-full lg:w-auto shrink-0">
            {[
              {
                key: 'all',
                label: 'All',
                icon: 'all_inclusive',
                count:
                  (logsSummary.viewsCount || 0) +
                  (logsSummary.cartCount || 0) +
                  (logsSummary.searchesCount || 0) +
                  (logsSummary.authCount || 0),
              },
              { key: 'views', label: 'Views', icon: 'visibility', count: logsSummary.viewsCount },
              { key: 'cart', label: 'Orders', icon: 'shopping_cart', count: logsSummary.cartCount },
              {
                key: 'searches',
                label: 'Searches',
                icon: 'search',
                count: logsSummary.searchesCount,
              },
              { key: 'auth', label: 'Accounts', icon: 'person', count: logsSummary.authCount },
            ].map((f) => {
              const isActive = selectedFilter === f.key;
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setSelectedFilter(f.key)}
                  className={`px-3 h-full rounded-sm text-[12px] font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-white dark:bg-[var(--admin-surface)] text-[var(--admin-accent)] shadow-sm border border-[var(--admin-border-subtle)]'
                      : 'text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] border border-transparent'
                  }`}
                >
                  <span className="material-symbols-outlined text-[15px]">{f.icon}</span>
                  <span>{f.label}</span>
                  {f.count !== undefined && (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                        isActive
                          ? 'bg-[var(--admin-accent-muted)] text-[var(--admin-accent)]'
                          : 'bg-[var(--admin-border-subtle)] text-[var(--admin-text-tertiary)]'
                      }`}
                    >
                      {f.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Scrollable Event Stream List */}
        <div className="overflow-y-auto max-h-[480px] custom-scrollbar pr-0.5 space-y-2">
          {logsLoading && userLogs.length === 0 ? (
            <div className="py-10 flex flex-col items-center justify-center text-center">
              <span className="material-symbols-outlined text-[28px] text-[var(--admin-text-tertiary)] animate-spin mb-2">
                sync
              </span>
              <p className="text-[12px] font-semibold text-[var(--admin-text-secondary)]">
                Loading live user activity stream...
              </p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="py-10 flex flex-col items-center justify-center bg-[var(--admin-bg-subtle)] rounded-[var(--admin-radius-lg)] border border-dashed border-[var(--admin-border)] text-center p-5">
              <span className="material-symbols-outlined text-[32px] text-[var(--admin-text-tertiary)] mb-2">
                manage_search
              </span>
              <p className="text-[13px] font-bold text-[var(--admin-text-secondary)]">
                No matching user activity found
              </p>
              <p className="text-[11px] text-[var(--admin-text-tertiary)] mt-1 max-w-sm">
                {searchFilter
                  ? `No events match "${searchFilter}". Clear search to view all logged actions.`
                  : 'As customers visit your website, their clicks, searches, and cart actions will appear here in real time.'}
              </p>
            </div>
          ) : (
            filteredLogs.map((log) => {
              const bgBadge = log.badgeColor || '#3b82f6';
              return (
                <div
                  key={log.id}
                  className="p-2.5 sm:p-3 rounded-[var(--admin-radius-lg)] bg-[var(--admin-bg-subtle)] hover:bg-[var(--admin-surface)] border border-[var(--admin-border-subtle)] hover:border-[var(--admin-border)] transition-all flex items-start gap-2.5 sm:gap-3 group"
                >
                  {/* Action Icon */}
                  <div
                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center shrink-0 shadow-2xs mt-0.5"
                    style={{
                      backgroundColor: `${bgBadge}18`,
                      border: `1px solid ${bgBadge}33`,
                      color: bgBadge,
                    }}
                  >
                    <span className="material-symbols-outlined text-[16px] sm:text-[18px]">
                      {log.icon || 'touch_app'}
                    </span>
                  </div>

                  {/* Main Content */}
                  <div className="min-w-0 flex-1">
                    {/* Top Row: User Name + Role + Timestamp */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                        <span className="text-[12.5px] sm:text-[13px] font-bold text-[var(--admin-text-primary)] truncate max-w-[140px] sm:max-w-none">
                          {formatLogUser(log.user, log.userRole, log.customerName)}
                        </span>

                        <span
                          className={`text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded tracking-wider ${
                            log.userRole === 'admin'
                              ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                              : log.userRole === 'customer'
                                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                                : 'bg-slate-500/10 text-slate-500 border border-slate-500/20'
                          }`}
                        >
                          {log.userRole || 'visitor'}
                        </span>

                        {log.device && (
                          <span className="hidden md:inline text-[11px] font-medium text-[var(--admin-text-tertiary)]">
                            • {formatLogDevice(log.device)}
                          </span>
                        )}
                      </div>

                      {/* Timestamp on the top right */}
                      <span
                        className="text-[10px] sm:text-[11px] font-semibold text-[var(--admin-text-tertiary)] whitespace-nowrap shrink-0"
                        title={new Date(log.timestamp).toLocaleString()}
                      >
                        {getRelativeTime(log.timestamp)}
                      </span>
                    </div>

                    {/* Plain English Action Sentence */}
                    <p className="text-[12px] sm:text-[12.5px] text-[var(--admin-text-primary)] font-medium mt-0.5 leading-snug">
                      {formatLogAction(log.action)}
                    </p>

                    {/* Optional Non-Redundant Detail Badge */}
                    {log.details && !isRedundantDetail(log.action, log.details, log.orderCode) && (
                      <div className="mt-1">
                        <span className="inline-flex items-center gap-1 text-[10.5px] px-1.5 py-0.2 rounded bg-[var(--admin-surface)] border border-[var(--admin-border-subtle)] text-[var(--admin-text-secondary)] font-medium max-w-full truncate">
                          <span className="material-symbols-outlined text-[12px] text-[var(--admin-text-tertiary)]">
                            info
                          </span>
                          {formatLogDetail(log.details)}
                        </span>
                      </div>
                    )}

                    {/* Clean Customer Contact & Quick Actions Footer Bar */}
                    {(log.customerEmail ||
                      log.customerPhone ||
                      log.orderCode ||
                      log.customerId) && (
                      <div className="mt-2 pt-1.5 border-t border-[var(--admin-border-subtle)]/70 flex items-center justify-between gap-2 flex-wrap text-[11px]">
                        {/* Contact details */}
                        <div className="flex items-center gap-2 sm:gap-2.5 text-[var(--admin-text-secondary)] min-w-0 flex-wrap">
                          {log.customerEmail && (
                            <a
                              href={`mailto:${log.customerEmail}`}
                              onClick={(e) => e.stopPropagation()}
                              className="hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1 transition-colors"
                              title={`Email: ${log.customerEmail}`}
                            >
                              <span className="material-symbols-outlined text-[13px] text-blue-500 shrink-0">
                                mail
                              </span>
                              <span className="truncate max-w-[130px] sm:max-w-[200px]">
                                {log.customerEmail}
                              </span>
                            </a>
                          )}
                          {log.customerPhone && (
                            <a
                              href={`tel:${log.customerPhone}`}
                              onClick={(e) => e.stopPropagation()}
                              className="hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center gap-1 transition-colors font-mono text-[10.5px]"
                              title={`Call: ${log.customerPhone}`}
                            >
                              <span className="material-symbols-outlined text-[13px] text-emerald-500 shrink-0">
                                call
                              </span>
                              <span>{log.customerPhone}</span>
                            </a>
                          )}
                        </div>

                        {/* Quick Actions (Order / Profile) */}
                        <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                          {log.orderCode && (
                            <Link
                              to={`/admin/orders?search=${encodeURIComponent(log.orderCode)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all"
                              title={`Open Order #${log.orderCode}`}
                            >
                              <span className="material-symbols-outlined text-[12px]">
                                package_2
                              </span>
                              <span>Order #{log.orderCode}</span>
                            </Link>
                          )}
                          {(log.customerId || log.customerEmail) && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedCustomer({
                                  _id: log.customerId,
                                  name: log.customerName || log.user,
                                  email: log.customerEmail,
                                  phone: log.customerPhone,
                                });
                              }}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-bold text-purple-700 dark:text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 transition-all cursor-pointer"
                              title="Open Customer 360 profile"
                            >
                              <span className="material-symbols-outlined text-[12px]">person</span>
                              <span>Profile</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Interaction Timeline */}
        <ChartCard
          title="Interaction Timeline"
          subtitle="Views, clicks, and explicit interactions over last 30 days"
        >
          <div className="h-[300px]">
            {!stats.engagementMetrics?.interactionsByDay ||
            stats.engagementMetrics.interactionsByDay.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center bg-[var(--admin-bg-subtle)] rounded-[var(--admin-radius-lg)] border border-dashed border-[var(--admin-border)]">
                <span className="material-symbols-outlined text-[32px] text-[var(--admin-text-tertiary)] mb-2">
                  timeline
                </span>
                <span className="text-[11px] uppercase font-bold text-[var(--admin-text-secondary)] tracking-wider">
                  No Timeline Data
                </span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.engagementMetrics.interactionsByDay}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="var(--admin-border-subtle)"
                  />
                  <XAxis
                    dataKey="_id"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: 'var(--admin-text-tertiary)' }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: 'var(--admin-text-tertiary)' }}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorCount)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </ChartCard>

        {/* CTR by Recommendation Type with Multi-Colors */}
        <ChartCard
          title="Algorithm Performance (CTR)"
          subtitle="Click-through rates by recommendation source"
        >
          <div className="min-h-[200px] sm:h-[300px] flex flex-col justify-center">
            {ctrData.length === 0 ? (
              <div className="h-full min-h-[180px] flex flex-col items-center justify-center bg-[var(--admin-bg-subtle)] rounded-[var(--admin-radius-lg)] border border-dashed border-[var(--admin-border)]">
                <span className="material-symbols-outlined text-[32px] text-[var(--admin-text-tertiary)] mb-2">
                  bar_chart
                </span>
                <span className="text-[11px] uppercase font-bold text-[var(--admin-text-secondary)] tracking-wider">
                  No CTR Data
                </span>
              </div>
            ) : (
              <>
                {/* Mobile View: High-clarity, spacious full-width bars (prevents compressed SVG) */}
                <div className="flex flex-col gap-4 py-2 sm:hidden">
                  {ctrData.map((item, index) => {
                    const maxCtr = Math.max(...ctrData.map((d) => d.ctr), 10);
                    const fillPercent = Math.max(
                      Math.min(Math.round((item.ctr / (maxCtr * 1.08)) * 100), 100),
                      12,
                    );

                    return (
                      <div key={item.key || index} className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                              style={{ backgroundColor: item.color }}
                            />
                            <span className="text-[13px] font-bold text-[var(--admin-text-primary)] truncate">
                              {item.name}
                            </span>
                          </div>
                          <span
                            className="text-[12px] font-extrabold px-2 py-0.5 rounded-md border shrink-0 tracking-tight"
                            style={{
                              backgroundColor: `${item.color}15`,
                              color: item.color,
                              borderColor: `${item.color}35`,
                            }}
                          >
                            {item.ctr}%
                          </span>
                        </div>

                        {/* Full-width bar */}
                        <div className="w-full h-3.5 bg-[var(--admin-surface-muted)] rounded-full overflow-hidden p-[2px] border border-[var(--admin-border-subtle)]">
                          <div
                            className="h-full rounded-full transition-all duration-700 ease-out"
                            style={{
                              width: `${fillPercent}%`,
                              backgroundColor: item.color,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop/Tablet View: Recharts BarChart */}
                <div className="hidden sm:block h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={ctrData}
                      layout="vertical"
                      margin={{ top: 8, right: 48, left: 10, bottom: 8 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        horizontal={false}
                        stroke="var(--admin-border-subtle)"
                      />
                      <XAxis
                        type="number"
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) => `${v}%`}
                        tick={{
                          fontSize: 10.5,
                          fill: 'var(--admin-text-tertiary)',
                          fontWeight: 600,
                        }}
                        domain={[0, (dataMax) => Math.max(Math.ceil(dataMax + 1), 6)]}
                      />
                      <YAxis
                        dataKey="name"
                        type="category"
                        axisLine={false}
                        tickLine={false}
                        tick={{
                          fontSize: 11.5,
                          fill: 'var(--admin-text-primary)',
                          fontWeight: 600,
                        }}
                        width={135}
                      />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar
                        dataKey="ctr"
                        radius={[0, 6, 6, 0]}
                        barSize={24}
                        minPointSize={5}
                        name="CTR (%)"
                      >
                        <LabelList
                          dataKey="ctr"
                          position="right"
                          formatter={(v) => `${v}%`}
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            fill: 'var(--admin-text-secondary)',
                          }}
                        />
                        {ctrData.map((entry, index) => (
                          <Cell key={`cell-ctr-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </div>
        </ChartCard>

        {/* Top Trending Categories with Multi-Colors */}
        <ChartCard title="Top Trending Categories" subtitle="Based on recent real-time velocity">
          <div className="h-[300px]">
            {formattedTrending.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center bg-[var(--admin-bg-subtle)] rounded-[var(--admin-radius-lg)] border border-dashed border-[var(--admin-border)]">
                <span className="material-symbols-outlined text-[32px] text-[var(--admin-text-tertiary)] mb-2">
                  pie_chart
                </span>
                <span className="text-[11px] uppercase font-bold text-[var(--admin-text-secondary)] tracking-wider">
                  No Trending Data
                </span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={formattedTrending}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="count"
                    nameKey="displayName"
                    strokeWidth={0}
                  >
                    {formattedTrending.map((entry, index) => (
                      <Cell key={`trending-cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          {formattedTrending.length > 0 && (
            <div className="flex flex-wrap gap-2 justify-center mt-4 p-1">
              {formattedTrending.map((entry, index) => (
                <div
                  key={index}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--admin-bg-subtle)] border border-[var(--admin-border-subtle)] text-[11px] font-semibold text-[var(--admin-text-secondary)] shadow-2xs hover:border-[var(--admin-border)] transition-colors"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span>{entry.displayName}</span>
                </div>
              ))}
            </div>
          )}
        </ChartCard>

        {/* Active Profile Affinities with Vibrant Multi-Colors */}
        <ChartCard
          title="User Top Affinities"
          subtitle="Top decor themes and categories customers are interested in"
        >
          <div className="min-h-[380px] sm:h-[480px] flex flex-col justify-center">
            {formattedAffinities.length === 0 ? (
              <div className="h-full min-h-[220px] flex flex-col items-center justify-center bg-[var(--admin-bg-subtle)] rounded-[var(--admin-radius-lg)] border border-dashed border-[var(--admin-border)]">
                <span className="material-symbols-outlined text-[32px] text-[var(--admin-text-tertiary)] mb-2">
                  groups
                </span>
                <span className="text-[11px] uppercase font-bold text-[var(--admin-text-secondary)] tracking-wider">
                  No Affinity Data
                </span>
              </div>
            ) : (
              <>
                {/* Mobile View: High-clarity, spacious full-width bars (prevents compressed SVG and broken text wrapping) */}
                <div className="flex flex-col gap-3 py-2 sm:hidden max-h-[460px] overflow-y-auto pr-1">
                  {formattedAffinities.map((item, index) => {
                    const maxCount = Math.max(...formattedAffinities.map((d) => d.count), 1);
                    const fillPercent = Math.max(
                      Math.min(Math.round((item.count / maxCount) * 100), 100),
                      6,
                    );

                    return (
                      <div key={item._id || index} className="space-y-1">
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                              style={{ backgroundColor: item.color }}
                            />
                            <span className="text-[13px] font-bold text-[var(--admin-text-primary)] truncate">
                              {item.displayName}
                            </span>
                          </div>
                          <span
                            className="text-[11px] font-extrabold px-2 py-0.5 rounded-md border shrink-0 font-mono tracking-tight"
                            style={{
                              backgroundColor: `${item.color}15`,
                              color: item.color,
                              borderColor: `${item.color}35`,
                            }}
                          >
                            {item.count} {item.count === 1 ? 'interaction' : 'interactions'}
                          </span>
                        </div>

                        {/* Full-width bar */}
                        <div className="w-full h-3 bg-[var(--admin-surface-muted)] rounded-full overflow-hidden p-[2px] border border-[var(--admin-border-subtle)]">
                          <div
                            className="h-full rounded-full transition-all duration-700 ease-out"
                            style={{
                              width: `${fillPercent}%`,
                              backgroundColor: item.color,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop/Tablet View: Recharts BarChart */}
                <div className="hidden sm:block h-[480px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={formattedAffinities}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 15, bottom: 5 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        horizontal={false}
                        stroke="var(--admin-border-subtle)"
                      />
                      <XAxis
                        type="number"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fill: 'var(--admin-text-tertiary)', fontWeight: 600 }}
                      />
                      <YAxis
                        dataKey="displayName"
                        type="category"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: 'var(--admin-text-primary)', fontWeight: 600 }}
                        width={165}
                      />
                      <Tooltip content={<AffinityTooltip />} />
                      <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={16} name="Interactions">
                        {formattedAffinities.map((entry, index) => (
                          <Cell key={`cell-affinity-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </div>
        </ChartCard>
      </div>

      {/* Customer 360 Profile Modal */}
      {selectedCustomer && (
        <AdminCustomerProfileModal
          customer={selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
        />
      )}
    </motion.div>
  );
}

export default AdminRecommendationAnalytics;
