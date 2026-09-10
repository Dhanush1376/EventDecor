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
import { Link, useSearchParams } from 'react-router-dom';

import api from '../../services/api';
import logger from '../../utils/core/logger';
import AdminCustomerProfileModal from '../components/AdminCustomerProfileModal';
import {
  PageHeader,
  ChartCard,
  ChartTooltip,
  AdminRecommendationAnalyticsSkeleton,
  stagger,
  fadeUp,
  getRelativeTime,
} from '../components/AdminUIKit';

// Curated Luxury Multi-Color Palette (Tuned to Cream & Ivory decor theme)
const VIBRANT_MULTI_COLORS = [
  '#5a7d9a', // Warm Slate Blue (matches theme slate)
  '#7d6899', // Muted Royal Amethyst
  '#b8647c', // Dusty Antique Rose
  '#c2944b', // Warm Heritage Gold / Ochre
  '#58856b', // Deep Sage Olive
  '#47828d', // Vintage Mineral Teal
  '#b86a51', // Warm Terracotta Clay
  '#5b658c', // Muted Slate Indigo
  '#457e79', // Dusty Eucalyptus
  '#a64956', // Vintage Brick Crimson
  '#78854c', // Warm Olive Leaf
  '#8e658e', // Dusty Mauve
  '#4f7994', // Muted Lake Blue
  '#ba964e', // Warm Tuscan Sand
  '#a1598b', // Mulberry Mauve
  '#4e7f5e', // Forest Jade
];

// Rich human-understandable metadata for recommendation sources tuned to theme shades
const RECOMMENDATION_SOURCE_META = {
  trending: {
    name: 'Trending Decor',
    location: 'Homepage & Top Curations',
    description: 'Visitors discovering popular catalog pieces',
    color: '#5a7d9a', // Warm Slate Blue
  },
  similar: {
    name: 'Similar Items',
    location: 'Product Page "You May Also Like"',
    description: 'Shoppers exploring related items',
    color: '#b8647c', // Dusty Antique Rose
  },
  feed: {
    name: 'Personalized Feed',
    location: 'Recommended For You Feed',
    description: 'AI tailored to browsing history',
    color: '#58856b', // Deep Sage Olive
  },
  seasonal: {
    name: 'Festive & Seasonal',
    location: 'Festival Collections & Occasions',
    description: 'Seasonal celebration collections',
    color: '#c2944b', // Warm Heritage Gold / Ochre
  },
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

function isStaffLog(log) {
  if (!log) return false;
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
}

export function AdminRecommendationAnalytics() {
  const [searchParams] = useSearchParams();
  const initialActor =
    searchParams.get('actor') === 'staff'
      ? 'staff'
      : searchParams.get('actor') === 'users'
        ? 'users'
        : 'all';

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
  const [selectedActorScope, setSelectedActorScope] = useState(initialActor); // 'all', 'users', 'staff'
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // Sync actor scope if URL search param updates dynamically
  useEffect(() => {
    const actorParam = searchParams.get('actor');
    if (actorParam === 'staff') {
      setSelectedActorScope('staff');
    } else if (actorParam === 'users') {
      setSelectedActorScope('users');
    }
  }, [searchParams]);

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
      if (isStaffLog(log)) {
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

  // Map CTR array for charts with plain-English store locations and sorted by highest performance
  const ctrData = useMemo(() => {
    if (!stats?.conversionMetrics?.clickThroughRateByType) return [];
    return Object.keys(stats.conversionMetrics.clickThroughRateByType)
      .map((key, idx) => {
        const rawKey = key.toLowerCase();
        const meta = RECOMMENDATION_SOURCE_META[rawKey] || {
          name: key
            .replace(/[-_]+/g, ' ')
            .split(' ')
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
            .join(' '),
          location: 'Storefront Area',
          description: 'Shopper interaction',
          color: VIBRANT_MULTI_COLORS[(idx * 2) % VIBRANT_MULTI_COLORS.length],
        };
        const val = parseFloat(
          (stats.conversionMetrics.clickThroughRateByType[key] * 100).toFixed(1),
        );
        return {
          key: rawKey,
          name: meta.name,
          location: meta.location,
          description: meta.description,
          ctr: val,
          color: meta.color,
        };
      })
      .sort((a, b) => b.ctr - a.ctr);
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
    return <AdminRecommendationAnalyticsSkeleton />;
  }

  return (
    <motion.div initial="hidden" animate="show" variants={stagger} className="space-y-6">
      <PageHeader
        title="Live Customer Activity"
        actionRowMobile={true}
        subtitle={
          <div className="flex flex-wrap items-center gap-1.5 text-[12px] sm:text-[12.5px] mt-0.5">
            <span className="hidden sm:inline text-[var(--admin-text-secondary)]">
              Real-time clicks, searches, cart items & orders
            </span>
            <span className="hidden sm:inline text-[var(--admin-border-strong)]">•</span>
            <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {lastSyncTime
                ? `Synced ${lastSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
                : 'Live stream active'}
            </span>
          </div>
        }
        headerAction={
          <div className="flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={() => fetchLogs(selectedFilter)}
              disabled={logsLoading}
              className="h-[38px] sm:h-[42px] px-2.5 sm:px-3.5 bg-[var(--admin-surface)] hover:bg-[var(--admin-surface-hover)] text-[var(--admin-text-primary)] rounded-[4px] border border-[var(--admin-border)] shadow-2xs flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-60 shrink-0"
              title="Live telemetry updates automatically every 15s. Click to sync immediately."
            >
              <span
                className={`material-symbols-outlined text-[16px] sm:text-[17px] text-[var(--admin-accent)] ${
                  logsLoading ? 'animate-spin' : ''
                }`}
              >
                sync
              </span>
              <span className="text-[11px] sm:text-[12px] font-bold whitespace-nowrap">
                Sync Now
              </span>
              <span
                className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"
                title="Live Auto-Sync Active (15s)"
              />
            </button>
          </div>
        }
      />

      {/* ─── Real-time Customer Telemetry Ledger (Orders Page Kind) ─── */}
      <motion.div
        variants={fadeUp}
        className="admin-card overflow-hidden text-left relative p-0 !rounded-[4px] border border-[var(--admin-border)] shadow-xs"
      >
        <div className="absolute top-0 left-0 w-full h-[3px] bg-[var(--admin-border-strong)] z-10" />
        <div className="grid grid-cols-2 lg:grid-cols-4 bg-[var(--admin-surface)]">
          {/* Total Interactions */}
          <div className="p-3.5 sm:p-5 space-y-1 border-r border-b lg:border-b-0 border-[var(--admin-border-subtle)]">
            <span className="text-[10px] sm:text-[10.5px] text-[var(--admin-text-tertiary)] font-bold uppercase tracking-wider block">
              Total Interactions
            </span>
            <p className="text-[16px] sm:text-[18px] font-bold text-[var(--admin-text-primary)] tracking-tight">
              {(stats.engagementMetrics?.totalInteractions || 0).toLocaleString()}
            </p>
            <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-[var(--admin-text-secondary)] mt-1">
              <span className="truncate">Clicks & touches</span>
              {stats.engagementMetrics?.change ? (
                <span
                  className={`font-semibold shrink-0 ml-1 ${
                    stats.engagementMetrics.change > 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {stats.engagementMetrics.change > 0
                    ? `+${stats.engagementMetrics.change}%`
                    : `${stats.engagementMetrics.change}%`}
                </span>
              ) : null}
            </div>
          </div>

          {/* Active Profiles */}
          <div className="p-3.5 sm:p-5 space-y-1 border-r border-b lg:border-b-0 border-[var(--admin-border-subtle)]">
            <span className="text-[10px] sm:text-[10.5px] text-[var(--admin-text-tertiary)] font-bold uppercase tracking-wider block">
              Active Profiles
            </span>
            <p className="text-[16px] sm:text-[18px] font-bold text-[var(--admin-text-primary)] tracking-tight">
              {(stats.userMetrics?.activeProfiles || 0).toLocaleString()}
            </p>
            <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-[var(--admin-text-secondary)] mt-1">
              <span className="truncate">Identified shoppers</span>
              {stats.userMetrics?.change ? (
                <span
                  className={`font-semibold shrink-0 ml-1 ${
                    stats.userMetrics.change > 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {stats.userMetrics.change > 0
                    ? `+${stats.userMetrics.change}%`
                    : `${stats.userMetrics.change}%`}
                </span>
              ) : null}
            </div>
          </div>

          {/* Avg Global CTR */}
          <div className="p-3.5 sm:p-5 space-y-1 border-r border-b sm:border-b-0 border-[var(--admin-border-subtle)]">
            <span className="text-[10px] sm:text-[10.5px] text-[var(--admin-text-tertiary)] font-bold uppercase tracking-wider block">
              Avg Global CTR
            </span>
            <p className="text-[16px] sm:text-[18px] font-bold text-[var(--admin-text-primary)] tracking-tight">
              {((stats.conversionMetrics?.globalClickThroughRate || 0) * 100).toFixed(1)}%
            </p>
            <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-[var(--admin-text-secondary)] mt-1">
              <span className="truncate">Recommendation CTR</span>
              {stats.conversionMetrics?.change ? (
                <span
                  className={`font-semibold shrink-0 ml-1 ${
                    stats.conversionMetrics.change > 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {stats.conversionMetrics.change > 0
                    ? `+${stats.conversionMetrics.change}%`
                    : `${stats.conversionMetrics.change}%`}
                </span>
              ) : null}
            </div>
          </div>

          {/* Website Visitors */}
          <div className="p-3.5 sm:p-5 space-y-1 bg-[var(--admin-success-light)] border-l-0">
            <span className="text-[10px] sm:text-[10.5px] text-[var(--admin-success)] font-bold uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--admin-success)] animate-pulse shrink-0" />
              <span className="truncate">Website Visitors</span>
            </span>
            <p className="text-[16px] sm:text-[18px] font-bold text-[var(--admin-success)] tracking-tight">
              {(stats.generalMetrics?.websiteVisitors || 0).toLocaleString()}
            </p>
            <span className="text-[10px] sm:text-[11px] text-[var(--admin-success)] opacity-80 mt-1 block truncate">
              Live storefront sessions
            </span>
          </div>
        </div>
      </motion.div>

      {/* Live User Activity & Clickstream Feed */}
      <motion.div
        variants={fadeUp}
        className="admin-card p-3.5 sm:p-5 lg:p-6 flex flex-col !rounded-[4px] border border-[var(--admin-border)] shadow-xs"
      >
        {/* Panel Header */}
        <div className="flex flex-row items-center justify-between gap-2 pb-2 mb-2.5 border-b border-[var(--admin-border-subtle)]">
          <div className="flex items-center gap-1.5 whitespace-nowrap min-w-0 shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <h3 className="text-[13.5px] sm:text-[15px] font-bold text-[var(--admin-text-primary)] tracking-tight whitespace-nowrap">
              Live Activity
            </h3>
            <span className="hidden sm:inline-flex items-center px-1.5 py-0.2 rounded-[3px] text-[9.5px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              LIVE
            </span>
          </div>

          {/* Beside Live Activity: Filter by Staff and Users */}
          <div className="inline-flex items-center p-0.5 rounded-[4px] bg-[var(--admin-surface-muted)] border border-[var(--admin-border)] text-[10px] sm:text-[11px] font-semibold shrink-0">
            <button
              type="button"
              onClick={() => setSelectedActorScope('all')}
              className={`px-1.5 sm:px-2.5 py-1 rounded-[3px] transition-all cursor-pointer whitespace-nowrap ${
                selectedActorScope === 'all'
                  ? 'bg-[var(--admin-surface)] text-[var(--admin-text-primary)] shadow-2xs font-bold'
                  : 'text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)]'
              }`}
            >
              All <span className="opacity-60 text-[9px] font-mono">({userLogs.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedActorScope('users')}
              className={`px-1.5 sm:px-2.5 py-1 rounded-[3px] transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                selectedActorScope === 'users'
                  ? 'bg-[var(--admin-surface)] text-blue-600 dark:text-blue-400 shadow-2xs font-bold'
                  : 'text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)]'
              }`}
              title="Filter by Storefront Users"
            >
              <span className="hidden sm:inline material-symbols-outlined text-[13px]">person</span>
              <span>Users</span>{' '}
              <span className="opacity-60 text-[9px] font-mono">({usersCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedActorScope('staff')}
              className={`px-1.5 sm:px-2.5 py-1 rounded-[3px] transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                selectedActorScope === 'staff'
                  ? 'bg-[var(--admin-surface)] text-purple-600 dark:text-purple-400 shadow-2xs font-bold'
                  : 'text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)]'
              }`}
              title="Filter by Admin & Store Staff"
            >
              <span className="hidden sm:inline material-symbols-outlined text-[13px]">
                shield_person
              </span>
              <span>Staff</span>{' '}
              <span className="opacity-60 text-[9px] font-mono">({staffCount})</span>
            </button>
          </div>
        </div>

        {/* Unified Search & Category Row (Side-by-Side on Mobile & Desktop) */}
        <div className="flex items-center gap-2 w-full mb-3">
          {/* Search Box */}
          <div className="activity-search-box relative flex-1 min-w-0 bg-[var(--admin-surface)] rounded-[4px] border border-[var(--admin-border)] flex items-center px-2.5 h-[36px] min-h-[36px] max-h-[36px] transition-all focus-within:border-[var(--admin-accent)] focus-within:ring-1 focus-within:ring-[var(--admin-accent)]/20 shadow-2xs">
            <span className="material-symbols-outlined text-[17px] text-[var(--admin-text-tertiary)] shrink-0">
              search
            </span>
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search activity..."
              className="bg-transparent border-none outline-none w-full text-[12px] sm:text-[12.5px] text-[var(--admin-text-primary)] placeholder-[var(--admin-text-tertiary)] font-medium px-2 h-full min-w-0"
            />
            {searchFilter && (
              <button
                type="button"
                onClick={() => setSearchFilter('')}
                className="text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)] text-[16px] cursor-pointer p-0.5 transition-colors leading-none"
                title="Clear search"
              >
                ×
              </button>
            )}
          </div>

          {/* Category Selector on Mobile: Compact Dropdown Pill */}
          <div className="relative sm:hidden shrink-0">
            <select
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value)}
              className="h-[36px] min-h-[36px] max-h-[36px] pl-2.5 pr-6 bg-[var(--admin-surface)] text-[var(--admin-text-primary)] font-bold text-[11px] rounded-[4px] border border-[var(--admin-border)] shadow-2xs appearance-none cursor-pointer focus:outline-none focus:border-[var(--admin-accent)]"
            >
              <option value="all">
                All (
                {(logsSummary.viewsCount || 0) +
                  (logsSummary.cartCount || 0) +
                  (logsSummary.searchesCount || 0) +
                  (logsSummary.authCount || 0)}
                )
              </option>
              <option value="views">Views ({logsSummary.viewsCount || 0})</option>
              <option value="cart">Orders ({logsSummary.cartCount || 0})</option>
              <option value="searches">Searches ({logsSummary.searchesCount || 0})</option>
              <option value="auth">Accounts & Staff ({logsSummary.authCount || 0})</option>
            </select>
            <span className="material-symbols-outlined text-[15px] text-[var(--admin-text-tertiary)] absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none">
              expand_more
            </span>
          </div>

          {/* Category Tabs on Tablet/Desktop: Horizontal Pill Bar */}
          <div className="hidden sm:flex items-center gap-1 p-1 bg-[var(--admin-surface-muted)] rounded-[5px] border border-[var(--admin-border)] shrink-0 h-[36px] max-h-[36px]">
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
              {
                key: 'auth',
                label: 'Accounts & Staff',
                icon: 'shield_person',
                count: logsSummary.authCount,
              },
            ].map((f) => {
              const isActive = selectedFilter === f.key;
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setSelectedFilter(f.key)}
                  className={`min-h-0 !min-h-0 h-[28px] max-h-[28px] px-2.5 rounded-[3px] text-[11px] font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer leading-none ${
                    isActive
                      ? 'bg-[var(--admin-surface)] text-[var(--admin-accent)] shadow-xs border border-[var(--admin-border)]'
                      : 'text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] border border-transparent'
                  }`}
                  style={{ minHeight: '28px', height: '28px', maxHeight: '28px' }}
                >
                  <span className="material-symbols-outlined !text-[13px] leading-none">
                    {f.icon}
                  </span>
                  <span>{f.label}</span>
                  {f.count !== undefined && (
                    <span
                      className={`px-1.5 py-0.5 rounded-[3px] text-[9.5px] font-bold leading-none ${
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
            <div className="py-10 flex flex-col items-center justify-center bg-[var(--admin-bg)] rounded-[4px] border border-dashed border-[var(--admin-border)] text-center p-5">
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
                  className="p-2.5 sm:p-3 rounded-[4px] bg-[var(--admin-bg)] hover:bg-[var(--admin-surface)] border border-[var(--admin-border)] hover:border-[var(--admin-border-strong)] transition-all flex items-start gap-2.5 sm:gap-3 group"
                >
                  {/* Action Icon */}
                  <div
                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-[4px] flex items-center justify-center shrink-0 shadow-2xs mt-0.5 border"
                    style={{
                      backgroundColor: `${bgBadge}18`,
                      borderColor: `${bgBadge}33`,
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
                          className={`text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-[3px] tracking-wider ${
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
                        <span className="inline-flex items-center gap-1 text-[10.5px] px-1.5 py-0.2 rounded-[3px] bg-[var(--admin-surface)] border border-[var(--admin-border-subtle)] text-[var(--admin-text-secondary)] font-medium max-w-full truncate">
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
                              className="inline-flex items-center gap-1 min-h-0 !min-h-0 !h-[22px] !max-h-[22px] px-2 rounded-[3px] text-[10.5px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all leading-none"
                              style={{ minHeight: '22px', height: '22px', maxHeight: '22px' }}
                              title={`Open Order #${log.orderCode}`}
                            >
                              <span className="material-symbols-outlined !text-[12px] leading-none">
                                package_2
                              </span>
                              <span>Order #{log.orderCode}</span>
                            </Link>
                          )}
                          {!isStaffLog(log) && (log.customerId || log.customerEmail) && (
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
                              className="inline-flex items-center gap-1 min-h-0 !min-h-0 !h-[22px] !max-h-[22px] px-2 rounded-[3px] text-[10.5px] font-bold text-purple-700 dark:text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 transition-all cursor-pointer leading-none"
                              style={{ minHeight: '22px', height: '22px', maxHeight: '22px' }}
                              title="Open Customer 360 profile"
                            >
                              <span className="material-symbols-outlined !text-[12px] leading-none">
                                person
                              </span>
                              <span>Profile</span>
                            </button>
                          )}
                          {isStaffLog(log) && (
                            <Link
                              to="/admin/system/users"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 min-h-0 !min-h-0 !h-[22px] !max-h-[22px] px-2 rounded-[3px] text-[10.5px] font-bold text-purple-700 dark:text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 transition-all leading-none"
                              style={{ minHeight: '22px', height: '22px', maxHeight: '22px' }}
                              title="View Staff Team & Permissions"
                            >
                              <span className="material-symbols-outlined !text-[12px] leading-none">
                                shield_person
                              </span>
                              <span>Staff</span>
                            </Link>
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
                      <stop offset="5%" stopColor="#826237" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="#826237" stopOpacity={0.02} />
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
                    stroke="#826237"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorCount)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </ChartCard>

        {/* Storefront Recommendation Clicks (CTR) - Clear, Intuitive, and Human-Readable */}
        <ChartCard
          title="Storefront Recommendation Clicks"
          subtitle="% of shoppers who clicked items shown in each storefront section"
        >
          <div className="min-h-[220px] flex flex-col justify-center">
            {ctrData.length === 0 ? (
              <div className="h-full min-h-[180px] flex flex-col items-center justify-center bg-[var(--admin-bg-subtle)] rounded-[var(--admin-radius-lg)] border border-dashed border-[var(--admin-border)]">
                <span className="material-symbols-outlined text-[32px] text-[var(--admin-text-tertiary)] mb-2">
                  bar_chart
                </span>
                <span className="text-[11px] uppercase font-bold text-[var(--admin-text-secondary)] tracking-wider">
                  No Recommendation Click Data
                </span>
              </div>
            ) : (
              <>
                {/* Mobile View: Intuitive cards with storefront context, benchmarks & honest scale */}
                <div className="flex flex-col gap-2.5 py-1 sm:hidden">
                  <div className="flex items-center justify-between text-[10.5px] font-semibold text-[var(--admin-text-tertiary)] px-1 pb-1 border-b border-[var(--admin-border-subtle)]">
                    <span>Recommendation Area</span>
                    <span>Click Rate (Avg ~3-5%)</span>
                  </div>

                  {ctrData.map((item, index) => {
                    // Benchmark out of 20% max CTR so 11.5% looks like ~58% of the bar (honest visual scale)
                    const fillPercent = Math.min(Math.round((item.ctr / 20) * 100), 100);

                    return (
                      <div
                        key={item.key || index}
                        className="p-2.5 rounded-[6px] bg-[var(--admin-surface-muted)]/50 border border-[var(--admin-border-subtle)] space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
                                style={{ backgroundColor: item.color }}
                              />
                              <span className="text-[13px] font-bold text-[var(--admin-text-primary)]">
                                {item.name}
                              </span>
                              {index === 0 && (
                                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-extrabold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 uppercase tracking-wide">
                                  #1 Top Pick
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-[var(--admin-text-tertiary)] pl-4 font-normal mt-0.5">
                              {item.location}
                            </p>
                          </div>

                          <div className="text-right shrink-0">
                            <span
                              className="inline-flex items-center px-2 py-0.5 rounded-[4px] text-[11.5px] font-extrabold border tracking-tight"
                              style={{
                                backgroundColor: `${item.color}15`,
                                color: item.color,
                                borderColor: `${item.color}35`,
                              }}
                            >
                              {item.ctr}% CTR
                            </span>
                            <p className="text-[9.5px] text-[var(--admin-text-tertiary)] mt-0.5 font-medium">
                              {Math.round(item.ctr)} in 100 clicked
                            </p>
                          </div>
                        </div>

                        {/* Proportional visual bar with 0-20% scale indicator */}
                        <div className="space-y-1">
                          <div className="w-full h-2.5 bg-[var(--admin-surface)] rounded-full overflow-hidden p-[1.5px] border border-[var(--admin-border)]">
                            <div
                              className="h-full rounded-full transition-all duration-700 ease-out"
                              style={{
                                width: `${fillPercent}%`,
                                backgroundColor: item.color,
                              }}
                            />
                          </div>
                          <div className="flex justify-between text-[9px] text-[var(--admin-text-placeholder)] px-0.5 font-mono">
                            <span>0%</span>
                            <span>10%</span>
                            <span>20% CTR scale</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop/Tablet View: Recharts BarChart with contextual labels */}
                <div className="hidden sm:block h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={ctrData}
                      layout="vertical"
                      margin={{ top: 8, right: 64, left: 10, bottom: 8 }}
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
                        domain={[0, 20]}
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
                        name="Click-Through Rate (%)"
                      >
                        <LabelList
                          dataKey="ctr"
                          position="right"
                          formatter={(v) => `${v}% CTR`}
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

                {/* Explanatory insight banner demystifying CTR */}
                <div className="mt-3.5 pt-2.5 border-t border-[var(--admin-border-subtle)] flex items-start gap-2 text-[11.5px] text-[var(--admin-text-secondary)]">
                  <span className="material-symbols-outlined text-[15px] text-[var(--admin-accent)] shrink-0 mt-0.5">
                    info
                  </span>
                  <p className="leading-snug">
                    <span className="font-semibold text-[var(--admin-text-primary)]">
                      What is CTR?
                    </span>{' '}
                    Click-Through Rate measures how effectively recommendations attract shopper
                    clicks. An 11.5% CTR means ~11–12 of every 100 visitors clicked an item in that
                    section (e-commerce benchmark is ~3%–5%).
                  </p>
                </div>
              </>
            )}
          </div>
        </ChartCard>

        {/* Top Trending Categories with Curated Theme Shades */}
        <ChartCard
          title="Top Trending Categories"
          subtitle="Most viewed & clicked categories by store visitors"
        >
          <div className="h-[280px] sm:h-[300px]">
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
                    innerRadius={62}
                    outerRadius={102}
                    paddingAngle={3}
                    dataKey="count"
                    nameKey="displayName"
                    stroke="var(--admin-surface)"
                    strokeWidth={2}
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
            <div className="flex flex-wrap gap-1.5 sm:gap-2 justify-center mt-3 sm:mt-4 p-1">
              {formattedTrending.map((entry, index) => (
                <div
                  key={index}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--admin-surface-muted)]/70 dark:bg-[var(--admin-surface)] border border-[var(--admin-border)] text-[11px] sm:text-[11.5px] font-medium text-[var(--admin-text-primary)] shadow-2xs hover:border-[var(--admin-border-strong)] hover:bg-[var(--admin-surface)] transition-all cursor-default"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 ring-1 ring-black/5 dark:ring-white/10"
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
