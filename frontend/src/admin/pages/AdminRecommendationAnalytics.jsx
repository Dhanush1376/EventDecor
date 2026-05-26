import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
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
} from "recharts";
import { Skeleton } from "../../components/ui/Skeleton";
import { useApi } from "../../hooks/useApi";
import api from "../../services/api"; // generic axios instance or domainServices

const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-xl shadow-xl border border-surface-container-highest px-4 py-3">
      <p className="text-[11px] sm:text-[11px] font-semibold text-outline mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-[13px] font-bold" style={{ color: p.color }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
}

export function AdminRecommendationAnalytics() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const [overviewRes, ctrRes, trendingRes, interestsRes, conversionRes] = await Promise.all([
          api.get('/analytics/recommendations/overview'),
          api.get('/analytics/recommendations/ctr?days=7'),
          api.get('/analytics/recommendations/trending-history?limit=1'),
          api.get('/analytics/recommendations/user-interests'),
          api.get('/analytics/recommendations/conversion-impact')
        ]);

        const aggregatedStats = {
          engagementMetrics: {
            totalInteractions: overviewRes.data?.data?.totalInteractions30d || 0,
            interactionsByDay: [] // Mocking this since the backend doesn't provide interactionsByDay yet
          },
          userMetrics: {
            activeProfiles: overviewRes.data?.data?.activeProfiles || 0,
            topAffinities: interestsRes.data?.data?.categoryInterests?.map(c => ({ _id: c.category, count: c.interactions })) || []
          },
          conversionMetrics: {
            globalClickThroughRate: conversionRes.data?.data?.attributionRate / 100 || 0, // Using attribution rate as proxy if CTR not global
            clickThroughRateByType: {} 
          },
          trendingMetrics: {
            topCategories: trendingRes.data?.data?.snapshots?.[0]?.topItems?.map(item => ({ _id: item.category, count: item.score })) || []
          }
        };

        // Populate CTR by type from the latest day
        if (ctrRes.data?.data?.days?.length > 0) {
          const latestDay = ctrRes.data.data.days[0];
          ['feed', 'similar', 'trending', 'seasonal'].forEach(type => {
            if (latestDay[type]) {
              aggregatedStats.conversionMetrics.clickThroughRateByType[type] = latestDay[type].ctr / 100;
            }
          });
        }

        setStats(aggregatedStats);
      } catch (err) {
        console.error("Failed to fetch recommendation analytics", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading || !stats) {
    return (
      <div className="space-y-6 p-8">
        <Skeleton className="h-10 w-48 rounded-lg" />
        <div className="grid grid-cols-4 gap-4">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
        <Skeleton className="h-[400px] rounded-2xl" />
      </div>
    );
  }

  const COLORS = ['#2D2B29', '#C4A87C', '#D0C5AF', '#8B9474', '#F4F0EB'];

  // Map CTR array for charts
  const ctrData = stats.conversionMetrics?.clickThroughRateByType
    ? Object.keys(stats.conversionMetrics.clickThroughRateByType).map((key) => ({
        name: key.replace('_', ' ').toUpperCase(),
        ctr: parseFloat((stats.conversionMetrics.clickThroughRateByType[key] * 100).toFixed(1)),
      }))
    : [];

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.05 } } }}
      className="max-w-[1440px] mx-auto space-y-6"
    >
      <motion.div
        variants={fadeUp}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h2 className="text-[24px] font-bold text-on-surface">
            AI Engine Analytics
          </h2>
          <p className="text-[13px] text-outline">
            Insights into Hybrid Recommendation performance & User Behavior
          </p>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <motion.div
        variants={fadeUp}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {[
          {
            label: "Total Interactions",
            value: stats.engagementMetrics?.totalInteractions || 0,
            icon: "touch_app",
            color: "text-blue-600",
            bg: "bg-blue-50"
          },
          {
            label: "Active Profiles",
            value: stats.userMetrics?.activeProfiles || 0,
            icon: "psychology",
            color: "text-purple-600",
            bg: "bg-purple-50"
          },
          {
            label: "Avg Global CTR",
            value: `${((stats.conversionMetrics?.globalClickThroughRate || 0) * 100).toFixed(1)}%`,
            icon: "ads_click",
            color: "text-emerald-600",
            bg: "bg-emerald-50"
          },
          {
            label: "Top Trending",
            value: stats.trendingMetrics?.topCategories?.[0]?._id || "N/A",
            icon: "trending_up",
            color: "text-orange-600",
            bg: "bg-orange-50"
          },
        ].map((kpi, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl p-6 border border-surface-container-highest/60 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-2 rounded-xl ${kpi.bg} ${kpi.color}`}>
                <span className="material-symbols-outlined text-[20px]">{kpi.icon}</span>
              </div>
            </div>
            <p className="text-[24px] font-bold text-on-surface truncate">{kpi.value}</p>
            <p className="text-[12px] text-outline font-medium mt-1 uppercase tracking-wider">{kpi.label}</p>
          </div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Interaction Timeline */}
        <motion.div
          variants={fadeUp}
          className="bg-white rounded-2xl p-6 border border-surface-container-highest/60"
        >
          <h3 className="text-[16px] font-bold text-on-surface mb-1">
            Interaction Timeline (Last 30 Days)
          </h3>
          <p className="text-[12px] text-outline mb-6">
            Views, clicks, and explicit interactions over time
          </p>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.engagementMetrics?.interactionsByDay || []}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2D2B29" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#2D2B29" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-surface-container-highest)" />
                <XAxis 
                  dataKey="_id" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fontSize: 10, fill: 'var(--color-outline)'}} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fontSize: 10, fill: 'var(--color-outline)'}}
                />
                <Tooltip content={<ChartTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#2D2B29" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorCount)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* CTR by Recommendation Type */}
        <motion.div
          variants={fadeUp}
          className="bg-white rounded-2xl p-6 border border-surface-container-highest/60"
        >
          <h3 className="text-[16px] font-bold text-on-surface mb-1">
            Algorithm Performance (CTR)
          </h3>
          <p className="text-[12px] text-outline mb-6">Click-through rates by recommendation source</p>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ctrData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-surface-container-highest)" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fontSize: 10, fill: 'var(--color-on-surface-variant)'}}
                  width={140}
                />
                <Tooltip content={<ChartTooltip />} />
                <Bar 
                  dataKey="ctr" 
                  fill="#C4A87C" 
                  radius={[0, 4, 4, 0]} 
                  barSize={20}
                  name="CTR (%)"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Top Trending Categories */}
        <motion.div
          variants={fadeUp}
          className="bg-white rounded-2xl p-6 border border-surface-container-highest/60"
        >
          <h3 className="text-[16px] font-bold text-on-surface mb-1">
            Top Trending Categories
          </h3>
          <p className="text-[12px] text-outline mb-6">Based on recent real-time velocity</p>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.trendingMetrics?.topCategories || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="count"
                  nameKey="_id"
                >
                  {(stats.trendingMetrics?.topCategories || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-2 justify-center mt-2">
            {(stats.trendingMetrics?.topCategories || []).map((entry, index) => (
              <div key={index} className="flex items-center gap-1.5 text-[11px] font-medium text-outline">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                {entry._id}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Active Profile Affinities */}
        <motion.div
          variants={fadeUp}
          className="bg-white rounded-2xl p-6 border border-surface-container-highest/60"
        >
          <h3 className="text-[16px] font-bold text-on-surface mb-1">
            User Top Affinities
          </h3>
          <p className="text-[12px] text-outline mb-6">Aggregated from active profiles</p>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.userMetrics?.topAffinities || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-surface-container-highest)" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="_id" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fontSize: 10, fill: 'var(--color-on-surface-variant)'}}
                  width={140}
                />
                <Tooltip content={<ChartTooltip />} />
                <Bar 
                  dataKey="count" 
                  fill="#8B9474" 
                  radius={[0, 4, 4, 0]} 
                  barSize={20}
                  name="Users"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
