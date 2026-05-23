import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { useAdmin } from "../context/AdminContext";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Skeleton } from "../../components/ui/Skeleton";

const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

function formatCurrency(val) {
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)}Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
  if (val >= 1000) return `₹${(val / 1000).toFixed(1)}K`;
  return `₹${val}`;
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-xl shadow-xl border border-surface-container-highest px-4 py-3">
      <p className="text-[11px] font-semibold text-outline mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-[13px] font-bold" style={{ color: p.color }}>
          {p.name}:{" "}
          {typeof p.value === "number" && p.value > 1000
            ? formatCurrency(p.value)
            : p.value}
        </p>
      ))}
    </div>
  );
}

export function AdminAnalytics() {
  const { dashboardStats, dataLoading } = useAdmin();

  const stats = useMemo(() => {
    if (!dashboardStats) return {
      totalSales: 0,
      totalOrders: 0,
      totalCustomers: 0,
      conversionRate: 0,
      revenueTrend: [],
      categoryStats: [],
      recentActivity: []
    };
    return dashboardStats;
  }, [dashboardStats]);

  if (dataLoading) {
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
          <h2 className="text-[24px] font-bold text-on-surface font-display">
            Business Analytics
          </h2>
          <p className="text-[13px] text-outline">
            Real-time performance metrics and growth insights
          </p>
        </div>
        <button className="btn-minimal group">
          <span className="material-symbols-outlined text-[18px] transition-transform group-hover:-translate-y-1">
            download
          </span>
          Export Reports
        </button>
      </motion.div>

      {/* KPI Cards */}
      <motion.div
        variants={fadeUp}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {[
          {
            label: "Total Revenue",
            value: formatCurrency(stats.totalSales || 0),
            change: "+15.4%",
            icon: "payments",
            color: "text-emerald-600"
          },
          {
            label: "Total Orders",
            value: stats.totalOrders || 0,
            change: "+8.2%",
            icon: "shopping_bag",
            color: "text-black"
          },
          {
            label: "Active Customers",
            value: stats.totalCustomers || 0,
            change: "+12.1%",
            icon: "group",
            color: "text-amber-600"
          },
          {
            label: "Conversion",
            value: `${(stats.conversionRate || 0).toFixed(1)}%`,
            change: "+0.5%",
            icon: "insights",
            color: "text-purple-600"
          },
        ].map((kpi, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl p-6 border border-surface-container-highest/60 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-2 rounded-xl bg-surface-container-low ${kpi.color}`}>
                <span className="material-symbols-outlined text-[20px]">{kpi.icon}</span>
              </div>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                {kpi.change}
              </span>
            </div>
            <p className="text-[24px] font-bold text-on-surface">{kpi.value}</p>
            <p className="text-[12px] text-outline font-medium mt-1 uppercase tracking-wider">{kpi.label}</p>
          </div>
        ))}
      </motion.div>

        {/* Revenue Trend */}
        <motion.div
          variants={fadeUp}
          className="bg-white rounded-2xl p-6 border border-surface-container-highest/60"
        >
          <h3 className="text-[16px] font-bold text-on-surface mb-1">
            Revenue Performance
          </h3>
          <p className="text-[12px] text-outline mb-6">
            Monthly revenue analysis for the current year
          </p>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.revenueTrend || []}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-surface-container-highest)" />
                <XAxis 
                  dataKey="month" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fontSize: 11, fill: 'var(--color-outline)'}} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fontSize: 11, fill: 'var(--color-outline)'}}
                  tickFormatter={formatCurrency}
                />
                <Tooltip content={<ChartTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="var(--color-primary)" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#revenueGrad)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Category Sales */}
          <motion.div
            variants={fadeUp}
            className="bg-white rounded-2xl p-6 border border-surface-container-highest/60"
          >
            <h3 className="text-[16px] font-bold text-on-surface mb-1">
              Category Distribution
            </h3>
            <p className="text-[12px] text-outline mb-6">Sales volume by category</p>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.categoryStats || []} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-surface-container-highest)" />
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="_id" 
                    type="category" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fontSize: 10, fill: 'var(--color-on-surface-variant)'}}
                    width={120}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar 
                    dataKey="count" 
                    fill="var(--color-primary-container)" 
                    radius={[0, 4, 4, 0]} 
                    barSize={20}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Activity Feed */}
          <motion.div
            variants={fadeUp}
            className="bg-white rounded-2xl p-6 border border-surface-container-highest/60"
          >
            <h3 className="text-[16px] font-bold text-on-surface mb-1">
              Recent System Activity
            </h3>
            <p className="text-[12px] text-outline mb-6">Latest events from your store</p>
            <div className="space-y-6">
              {(stats.recentActivity || []).map((activity, i) => (
                <div key={i} className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[18px] text-black">
                      {activity.type === 'order' ? 'shopping_bag' : 'person'}
                    </span>
                  </div>
                  <div>
                    <p className="text-[13px] text-on-surface leading-snug">
                      <span className="font-bold">{activity.user}</span> {activity.action}
                    </p>
                    <p className="text-[11px] text-outline mt-1">
                      {new Date(activity.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
              {(!stats.recentActivity || stats.recentActivity.length === 0) && (
                <div className="text-center py-12 text-outline text-[13px]">
                  No recent activity found
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </motion.div>
    );
}
