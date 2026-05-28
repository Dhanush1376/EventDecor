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
import api from "../../services/api";
import logger from "../../utils/logger";
import {
  PageHeader,
  StatCard,
  ChartCard,
  ChartTooltip,
  SkeletonPage,
  fadeUp,
  stagger,
  CHART_COLORS,
} from "../components/AdminUIKit";

export function AdminRecommendationAnalytics() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const [overviewRes, ctrRes, trendingRes, interestsRes, conversionRes] = await Promise.all([
          api.get("/analytics/recommendations/overview"),
          api.get("/analytics/recommendations/ctr?days=7"),
          api.get("/analytics/recommendations/trending-history?limit=1"),
          api.get("/analytics/recommendations/user-interests"),
          api.get("/analytics/recommendations/conversion-impact"),
        ]);

        const aggregatedStats = {
          engagementMetrics: {
            totalInteractions: overviewRes.data?.data?.totalInteractions30d || 0,
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
              trendingRes.data?.data?.snapshots?.[0]?.topItems?.map((item) => ({
                _id: item.category,
                count: item.score,
              })) || [],
          },
        };

        // Populate CTR by type from the latest day
        if (ctrRes.data?.data?.days?.length > 0) {
          const latestDay = ctrRes.data.data.days[0];
          ["feed", "similar", "trending", "seasonal"].forEach((type) => {
            if (latestDay[type]) {
              aggregatedStats.conversionMetrics.clickThroughRateByType[type] =
                latestDay[type].ctr / 100;
            }
          });
        }

        setStats(aggregatedStats);
      } catch (err) {
        logger.error("Failed to fetch recommendation analytics", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading || !stats) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <SkeletonPage />
      </div>
    );
  }

  // Map CTR array for charts
  const ctrData = stats.conversionMetrics?.clickThroughRateByType
    ? Object.keys(stats.conversionMetrics.clickThroughRateByType).map((key) => ({
        name: key.replace("_", " ").toUpperCase(),
        ctr: parseFloat((stats.conversionMetrics.clickThroughRateByType[key] * 100).toFixed(1)),
      }))
    : [];

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={stagger}
      className="space-y-6"
    >
      <PageHeader
        title="AI Engine Analytics"
        subtitle="Insights into Hybrid Recommendation performance & User Behavior"
      />

      {/* KPI Cards */}
      <motion.div variants={stagger} className="admin-grid-stats">
        <StatCard
          icon="touch_app"
          label="Total Interactions"
          value={stats.engagementMetrics?.totalInteractions || 0}
          change="+15.4%" // Mocked change value
          changeType="up"
          color="var(--admin-info)"
        />
        <StatCard
          icon="psychology"
          label="Active Profiles"
          value={stats.userMetrics?.activeProfiles || 0}
          change="+8.2%"
          changeType="up"
          color="var(--admin-accent)"
        />
        <StatCard
          icon="ads_click"
          label="Avg Global CTR"
          value={`${((stats.conversionMetrics?.globalClickThroughRate || 0) * 100).toFixed(1)}%`}
          change="+0.5%"
          changeType="up"
          color="var(--admin-success)"
        />
        <StatCard
          icon="trending_up"
          label="Top Trending"
          value={stats.trendingMetrics?.topCategories?.[0]?._id || "N/A"}
          change="Updated"
          changeType="up"
          color="var(--admin-warning)"
        />
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Interaction Timeline */}
        <ChartCard
          title="Interaction Timeline"
          subtitle="Views, clicks, and explicit interactions over last 30 days"
        >
          <div className="h-[300px]">
            {!stats.engagementMetrics?.interactionsByDay || stats.engagementMetrics.interactionsByDay.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center bg-[var(--admin-bg-subtle)] rounded-[var(--admin-radius-lg)] border border-dashed border-[var(--admin-border)]">
                <span className="material-symbols-outlined text-[32px] text-[var(--admin-text-tertiary)] mb-2">timeline</span>
                <span className="text-[11px] uppercase font-bold text-[var(--admin-text-secondary)] tracking-wider">No Timeline Data</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.engagementMetrics.interactionsByDay}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--admin-accent)" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="var(--admin-accent)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--admin-border-subtle)" />
                  <XAxis
                    dataKey="_id"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: "var(--admin-text-tertiary)" }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: "var(--admin-text-tertiary)" }}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="var(--admin-accent)"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorCount)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </ChartCard>

        {/* CTR by Recommendation Type */}
        <ChartCard
          title="Algorithm Performance (CTR)"
          subtitle="Click-through rates by recommendation source"
        >
          <div className="h-[300px]">
            {ctrData.length === 0 ? (
               <div className="h-full flex flex-col items-center justify-center bg-[var(--admin-bg-subtle)] rounded-[var(--admin-radius-lg)] border border-dashed border-[var(--admin-border)]">
                 <span className="material-symbols-outlined text-[32px] text-[var(--admin-text-tertiary)] mb-2">bar_chart</span>
                 <span className="text-[11px] uppercase font-bold text-[var(--admin-text-secondary)] tracking-wider">No CTR Data</span>
               </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ctrData} layout="vertical" margin={{ left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--admin-border-subtle)" />
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="name"
                    type="category"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: "var(--admin-text-secondary)" }}
                    width={100}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar
                    dataKey="ctr"
                    fill="var(--admin-border-strong)"
                    radius={[0, 4, 4, 0]}
                    barSize={20}
                    name="CTR (%)"
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </ChartCard>

        {/* Top Trending Categories */}
        <ChartCard
          title="Top Trending Categories"
          subtitle="Based on recent real-time velocity"
        >
          <div className="h-[300px]">
            {!stats.trendingMetrics?.topCategories || stats.trendingMetrics.topCategories.length === 0 ? (
               <div className="h-full flex flex-col items-center justify-center bg-[var(--admin-bg-subtle)] rounded-[var(--admin-radius-lg)] border border-dashed border-[var(--admin-border)]">
                 <span className="material-symbols-outlined text-[32px] text-[var(--admin-text-tertiary)] mb-2">pie_chart</span>
                 <span className="text-[11px] uppercase font-bold text-[var(--admin-text-secondary)] tracking-wider">No Trending Data</span>
               </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.trendingMetrics.topCategories}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="count"
                    nameKey="_id"
                    strokeWidth={0}
                  >
                    {stats.trendingMetrics.topCategories.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          {stats.trendingMetrics?.topCategories?.length > 0 && (
            <div className="flex flex-wrap gap-3 justify-center mt-4">
              {stats.trendingMetrics.topCategories.map((entry, index) => (
                <div key={index} className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--admin-text-secondary)]">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />
                  {entry._id}
                </div>
              ))}
            </div>
          )}
        </ChartCard>

        {/* Active Profile Affinities */}
        <ChartCard
          title="User Top Affinities"
          subtitle="Aggregated from active user profiles"
        >
          <div className="h-[300px]">
            {!stats.userMetrics?.topAffinities || stats.userMetrics.topAffinities.length === 0 ? (
               <div className="h-full flex flex-col items-center justify-center bg-[var(--admin-bg-subtle)] rounded-[var(--admin-radius-lg)] border border-dashed border-[var(--admin-border)]">
                 <span className="material-symbols-outlined text-[32px] text-[var(--admin-text-tertiary)] mb-2">groups</span>
                 <span className="text-[11px] uppercase font-bold text-[var(--admin-text-secondary)] tracking-wider">No Affinity Data</span>
               </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.userMetrics.topAffinities} layout="vertical" margin={{ left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--admin-border-subtle)" />
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="_id"
                    type="category"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: "var(--admin-text-secondary)" }}
                    width={120}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar
                    dataKey="count"
                    fill="var(--admin-accent)"
                    radius={[0, 4, 4, 0]}
                    barSize={20}
                    name="Users"
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </ChartCard>
      </div>
    </motion.div>
  );
}
