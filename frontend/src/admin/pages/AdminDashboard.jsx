import React, { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
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
import { useAdmin } from "../context/AdminContext";
import { handleImageError } from "../../utils/imageUtils";
import { useMediaQuery } from "../../hooks/useMediaQuery";

const fadeUp = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } };
const stagger = { show: { transition: { staggerChildren: 0.05 } } };

const FALLBACK_DATE = new Date("2026-05-20T00:00:00Z");
const FALLBACK_PRODUCT_DATE = new Date("2026-05-17T00:00:00Z");

function formatCurrency(val) {
  if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
  if (val >= 1000) return `₹${(val / 1000).toFixed(1)}K`;
  return `₹${val}`;
}

function StatCard({
  icon,
  label,
  value,
  change,
  changeType = "up",
  color,
  onClick,
  sparklinePath,
  progress,
}) {
  const displayColor = color;

  return (
    <motion.button
      variants={fadeUp}
      onClick={onClick}
      className="bg-white rounded-xl p-5 border border-slate-250/70 text-left w-full cursor-pointer hover:border-slate-300 hover:shadow-xs transition-all duration-200 group relative overflow-hidden shrink-0"
    >
      <div className="flex items-start justify-between mb-3 relative z-10">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center border"
          style={{ 
            backgroundColor: displayColor === "#FFFFFF" ? "rgba(255,255,255,0.08)" : `${displayColor}08`, 
            borderColor: displayColor === "#FFFFFF" ? "rgba(255,255,255,0.15)" : `${displayColor}15` 
          }}
        >
          <span
            className="material-symbols-outlined text-[18px]"
            style={{ color: displayColor }}
          >
            {icon}
          </span>
        </div>
        {change && (
          <span
            className={`flex items-center gap-0.5 text-[9.5px] font-bold px-2 py-0.5 rounded-md border ${
              changeType === "up" ? "text-emerald-700 bg-emerald-50 border-emerald-100" : "text-rose-600 bg-rose-50 border-rose-100"
            }`}
          >
            <span className="material-symbols-outlined text-[11px] font-bold">
              {changeType === "up" ? "trending_up" : "trending_down"}
            </span>
            {change}
          </span>
        )}
      </div>

      <div className="flex items-end justify-between relative z-10 mt-1">
        <div>
          <p className="text-[22px] font-semibold text-slate-900 leading-none tracking-tight">
            {value}
          </p>
          <p className="text-[9px] text-slate-400 mt-2 font-bold tracking-wider uppercase">{label}</p>
        </div>
        
        {sparklinePath && (
          <div className="w-12 h-6 text-slate-300 group-hover:text-indigo-400 transition-colors duration-250 shrink-0">
            <svg className="w-full h-full" viewBox="0 0 100 30" fill="none">
              <path d={sparklinePath} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        )}
      </div>

      {progress !== undefined && (
        <div className="w-full bg-slate-105 h-1 rounded-full mt-4 overflow-hidden relative z-10">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="h-full"
            style={{ backgroundColor: displayColor }}
          />
        </div>
      )}
    </motion.button>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-lg shadow-md border border-slate-200 px-3 py-2">
      <p className="text-[10px] font-semibold text-slate-400 mb-1 uppercase tracking-wider">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-[12px] font-bold" style={{ color: p.color }}>
          {p.name}:{" "}
          {typeof p.value === "number" && p.value > 1000
            ? formatCurrency(p.value)
            : p.value}
        </p>
      ))}
    </div>
  );
}

export function AdminDashboard() {
  const {
    orders,
    eventBookings,
    products,
    dashboardStats,
    customers,
    auditLogs,
    activeRole,
    safetyLock,
    toggleSafetyLock,
    maintenanceMode,
    toggleMaintenanceMode
  } = useAdmin();
  const navigate = useNavigate();
  const [chartPeriod, setChartPeriod] = useState("yearly");
  const isMobile = useMediaQuery("(max-width: 768px)");

  const pendingOrders = orders.filter((o) => o.status === "Pending").length;
  const lowStockProducts = products.filter(
    (p) => p.stock > 0 && p.stock <= 5,
  ).length;
  const outOfStock = products.filter((p) => p.stock === 0).length;

  // Helper for dynamic relative time reporting
  const getRelativeTime = (date) => {
    if (!date) return "Recently";
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (60 * 1000));
    const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
    const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  // Prepare Revenue Overview data
  const revenueChartData = React.useMemo(() => {
    if (dashboardStats?.monthlyRevenue && dashboardStats.monthlyRevenue.length > 0) {
      return [...dashboardStats.monthlyRevenue].reverse();
    }
    
    const monthlyMap = {};
    orders.forEach(o => {
      if (!o.rawOrder?.createdAt) return;
      const date = new Date(o.rawOrder.createdAt);
      const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
      if (!monthlyMap[key]) {
        monthlyMap[key] = { month: key, revenue: 0, orders: 0 };
      }
      monthlyMap[key].revenue += o.total;
      monthlyMap[key].orders += 1;
    });

    const list = Object.values(monthlyMap);
    if (list.length > 0) {
      return list.sort((a, b) => {
        const [yA, mA] = a.month.split("-").map(Number);
        const [yB, mB] = b.month.split("-").map(Number);
        return yA !== yB ? yA - yB : mA - mB;
      });
    }

    return [];
  }, [dashboardStats, orders]);

  // Cool neutral charts color palette
  const colors = [
    "#000000", // Indigo
    "#3B82F6", // Blue
    "#10B981", // Emerald
    "#8B5CF6", // Purple
    "#EC4899", // Pink
    "#F59E0B"  // Amber
  ];
  
  // Calculate top categories dynamically
  const categoryChartData = React.useMemo(() => {
    if (dashboardStats?.categoryPerformance && dashboardStats.categoryPerformance.length > 0) {
      const total = dashboardStats.categoryPerformance.reduce((sum, item) => sum + (item.value || 0), 0);
      return dashboardStats.categoryPerformance.map((item, idx) => ({
        name: item.name,
        value: total > 0 ? Math.round((item.value / total) * 100) : 0,
        fill: colors[idx % colors.length]
      }));
    }

    const catMap = {};
    products.forEach(p => {
      const cat = p.category || "Uncategorized";
      catMap[cat] = (catMap[cat] || 0) + 1;
    });
    
    const total = Object.values(catMap).reduce((sum, v) => sum + v, 0);
    if (total > 0) {
      return Object.entries(catMap).map(([name, val], idx) => ({
        name,
        value: Math.round((val / total) * 100),
        fill: colors[idx % colors.length]
      }));
    }

    return [];
  }, [dashboardStats, products]);

  // Generate real-time activity stream
  const dynamicRecentActivity = React.useMemo(() => {
    const activity = [];
    
    orders.forEach(o => {
      const ts = o.rawOrder?.createdAt ? new Date(o.rawOrder.createdAt) : null;
      activity.push({
        icon: "shopping_bag",
        text: `Order ${o.id || "New"} placed by ${o.customer || "Guest"}`,
        timestamp: ts || FALLBACK_DATE
      });
    });
    
    products.forEach(p => {
      const ts = p.rawProduct?.createdAt ? new Date(p.rawProduct.createdAt) : null;
      activity.push({
        icon: "inventory_2",
        text: `Product '${p.name}' added to catalog`,
        timestamp: ts || FALLBACK_PRODUCT_DATE
      });
    });

    eventBookings.forEach(b => {
      const ts = b.rawOrder?.createdAt ? new Date(b.rawOrder.createdAt) : null;
      activity.push({
        icon: "celebration",
        text: `Consultation request for ${b.eventType || "Event"}`,
        timestamp: ts || FALLBACK_DATE
      });
    });

    auditLogs.forEach(log => {
      activity.push({
        icon: log.action.includes("LOCK") || log.action.includes("MAINTENANCE") ? "shield" : "receipt_long",
        text: `[${log.actor.toUpperCase()}] ${log.action}: ${log.details}`,
        timestamp: new Date(log.timestamp)
      });
    });

    if (activity.length === 0) return [];

    return activity
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 7)
      .map(item => ({
        ...item,
        time: getRelativeTime(item.timestamp)
      }));
  }, [orders, products, eventBookings, auditLogs]);

  // Compute weekly metrics
  const weeklyOrderStats = React.useMemo(() => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dailyMap = {};
    days.forEach(day => {
      dailyMap[day] = { day, ordersCount: 0, itemsCount: 0 };
    });

    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    orders.forEach(o => {
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

    return days.map(day => dailyMap[day]);
  }, [orders]);

  // Trending products
  const trendingProducts = React.useMemo(() => {
    if (!products || products.length === 0) return [];
    return [...products]
      .sort((a, b) => (b.views || 0) - (a.views || 0))
      .slice(0, 4);
  }, [products]);

  const quickActions = [
    {
      icon: "edit_note",
      label: "Edit Web Pages",
      path: "/admin/content",
      color: "#000000",
    },
    {
      icon: "design_services",
      label: "Custom Orders",
      path: "/admin/custom-orders",
      color: "#3B82F6",
    },
    {
      icon: "shopping_bag",
      label: "Orders",
      path: "/admin/orders",
      color: "#10B981",
    },
    {
      icon: "analytics",
      label: "Analytics",
      path: "/admin/analytics",
      color: "#8B5CF6",
    },
  ];

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={stagger}
      className="max-w-[1440px] mx-auto space-y-6"
    >
      {/* Header */}
      <motion.div
        variants={fadeUp}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h2 className="text-[22px] font-bold text-slate-900 tracking-tight">
            Dashboard
          </h2>
          <p className="text-[12px] text-slate-500 mt-0.5">
            Welcome back, Siri. Here's your business overview.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 rounded-lg p-0.5 border border-slate-200/50">
            {["weekly", "monthly", "yearly"].map((p) => (
              <button
                key={p}
                onClick={() => setChartPeriod(p)}
                className={`px-3 py-1 rounded-md text-[11px] font-semibold capitalize cursor-pointer transition-all ${chartPeriod === p ? "bg-white text-slate-900 shadow-xs border border-slate-200/30" : "text-slate-500 hover:text-slate-800"}`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Website Control Center Highlight */}
      <motion.div
        variants={fadeUp}
        className="bg-slate-50 border border-slate-200/70 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 transition-colors hover:bg-slate-100"
      >
        <div className="flex items-center gap-4">
          <div className="w-9 h-9 rounded-lg bg-black text-white flex items-center justify-center shrink-0 shadow-xs">
            <span className="material-symbols-outlined text-[18px]">
              view_quilt
            </span>
          </div>
          <div>
            <h2 className="text-[13.5px] font-semibold text-slate-900">
              Website Layout & Content
            </h2>
            <p className="text-[11.5px] text-slate-500 mt-0.5">
              Manage your website pages and photos visually.
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate("/admin/content")}
          className="px-4 py-2 text-[11.5px] font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-black rounded-lg transition-all flex items-center gap-1.5 shadow-xs"
        >
          Launch Editor
          <span className="material-symbols-outlined text-[14px]">
            arrow_forward
          </span>
        </button>
      </motion.div>

      {/* Quick Security overrides */}
      <motion.div
        variants={fadeUp}
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        <div className="bg-slate-50/50 border border-slate-200/80 rounded-2xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${safetyLock ? "bg-rose-50 border-rose-200 text-rose-600" : "bg-slate-100 border-slate-200 text-slate-500"}`}>
              <span className="material-symbols-outlined text-[18px]">
                {safetyLock ? "lock" : "lock_open"}
              </span>
            </div>
            <div>
              <h3 className="text-[12.5px] font-bold text-slate-800 flex items-center gap-1.5">
                Global Safety Lock
                {safetyLock && <span className="text-[8px] bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded-full font-bold uppercase">Restricted</span>}
              </h3>
              <p className="text-[10px] text-slate-400">Blocks all database write operations immediately</p>
            </div>
          </div>
          <button
            onClick={toggleSafetyLock}
            className={`w-11 h-6 rounded-full transition-colors duration-200 relative focus:outline-none cursor-pointer min-h-0 p-0 ${safetyLock ? "bg-slate-900" : "bg-slate-300"}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform duration-200 shadow-sm ${safetyLock ? "translate-x-5" : ""}`} />
          </button>
        </div>

        <div className="bg-slate-50/50 border border-slate-200/80 rounded-2xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${maintenanceMode ? "bg-amber-50 border-amber-200 text-amber-600" : "bg-slate-100 border-slate-200 text-slate-500"}`}>
              <span className="material-symbols-outlined text-[18px]">
                {maintenanceMode ? "construction" : "check_circle"}
              </span>
            </div>
            <div>
              <h3 className="text-[12.5px] font-bold text-slate-800 flex items-center gap-1.5">
                Maintenance Shield
                {maintenanceMode && <span className="text-[8px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full font-bold uppercase">Active</span>}
              </h3>
              <p className="text-[10px] text-slate-400">Redirects storefront traffic to maintenance splash</p>
            </div>
          </div>
          <button
            onClick={toggleMaintenanceMode}
            className={`w-11 h-6 rounded-full transition-colors duration-200 relative focus:outline-none cursor-pointer min-h-0 p-0 ${maintenanceMode ? "bg-slate-900" : "bg-slate-300"}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform duration-200 shadow-sm ${maintenanceMode ? "translate-x-5" : ""}`} />
          </button>
        </div>
      </motion.div>

      {/* Stat Cards Grid */}
      <motion.div
        variants={stagger}
        className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-4 gap-4"
      >
        <StatCard
          icon="payments"
          label="Total Revenue"
          value={formatCurrency(dashboardStats?.stats?.totalSales !== undefined ? dashboardStats.stats.totalSales : 0)}
          change="+15.4% YoY"
          changeType="up"
          color="#000000"
          onClick={() => navigate("/admin/payments")}
          sparklinePath="M0,20 Q15,5 30,20 T60,8 T90,18 T100,5"
          progress={78}
        />
        <StatCard
          icon="shopping_bag"
          label="Pending Orders"
          value={dashboardStats?.stats?.pendingOrders !== undefined ? dashboardStats.stats.pendingOrders : pendingOrders}
          change={pendingOrders > 0 ? "Needs Review" : "Healthy"}
          changeType={pendingOrders > 3 ? "down" : "up"}
          color="#3B82F6"
          onClick={() => navigate("/admin/orders")}
          sparklinePath="M0,8 Q20,25 40,12 T80,18 T100,10"
          progress={42}
        />
        <StatCard
          icon="event"
          label="Active Bookings"
          value={dashboardStats?.stats?.totalEvents !== undefined ? dashboardStats.stats.totalEvents : eventBookings.filter((b) => b.status !== "Cancelled").length}
          change="+8.1% MoM"
          changeType="up"
          color="#10B981"
          onClick={() => navigate("/admin/events")}
          sparklinePath="M0,22 Q20,12 40,25 T80,8 T100,18"
          progress={64}
        />
        <StatCard
          icon="group"
          label="Total Customers"
          value={(dashboardStats?.stats?.totalCustomers !== undefined ? dashboardStats.stats.totalCustomers : (customers?.length || 0)).toLocaleString()}
          change="+11.3% MoM"
          changeType="up"
          color="#8B5CF6"
          onClick={() => navigate("/admin/customers")}
          sparklinePath="M0,25 Q20,18 40,10 T80,5 T100,2"
          progress={89}
        />
      </motion.div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <motion.div
          variants={fadeUp}
          className="lg:col-span-2 bg-white rounded-xl p-6 border border-slate-200/80 shadow-xs"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-[14px] font-semibold text-slate-900">
                Sales Overview
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Monthly sales & order trends
              </p>
            </div>
            <div className="flex items-center gap-4 text-[11px] font-medium text-slate-600">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-900" />
                Sales
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                Orders
              </span>
            </div>
          </div>
          {orders.length === 0 ? (
            <div className="h-[280px] flex flex-col items-center justify-center text-slate-300 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 my-2">
              <span className="material-symbols-outlined text-[36px] mb-2 text-slate-400">analytics</span>
              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500">No Sales Trends Recorded Yet</span>
              <p className="text-[11px] text-slate-400 mt-1 font-medium">Place an order on the storefront to activate transaction graphs.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={isMobile ? 200 : 280}>
              <AreaChart data={revenueChartData}>
                <defs>
                  <linearGradient id="blackGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#000000" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#000000" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 10, fill: "#94A3B8" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  hide={isMobile}
                  tick={{ fontSize: 10, fill: "#94A3B8" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => formatCurrency(v)}
                />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#000000"
                  fill="url(#blackGrad)"
                  strokeWidth={2}
                  name="Sales"
                />
                <Area
                  type="monotone"
                  dataKey="orders"
                  stroke="#94A3B8"
                  fill="transparent"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  name="Orders"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        {/* Category Performance */}
        <motion.div
          variants={fadeUp}
          className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between"
        >
          <div>
            <h3 className="text-[14px] font-semibold text-slate-900 mb-1">
              Top Categories
            </h3>
            <p className="text-[11px] text-slate-500 mb-4">
              Sales distribution by category
            </p>
          </div>
          {categoryChartData.length === 0 ? (
            <div className="h-[240px] flex flex-col items-center justify-center text-slate-300 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 my-2">
              <span className="material-symbols-outlined text-[32px] mb-2 text-slate-400">pie_chart</span>
              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500">No Sales Recorded Yet</span>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={categoryChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    dataKey="value"
                    paddingAngle={3}
                    strokeWidth={0}
                  >
                    {categoryChartData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2.5 mt-4">
                {categoryChartData.slice(0, 4).map((cat, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-[11.5px]"
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: cat.fill }}
                      />
                      <span className="text-slate-600 font-medium">{cat.name}</span>
                    </span>
                    <span className="font-semibold text-slate-800">
                      {cat.value}%
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </motion.div>
      </div>

      {/* Middle Row — Quick Actions + Recent Activity + Inventory */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <motion.div
          variants={fadeUp}
          className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-xs"
        >
          <h3 className="text-[14px] font-semibold text-slate-900 mb-4">
            Quick Actions
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((a, i) => (
              <button
                key={i}
                onClick={() => navigate(a.path)}
                className="flex flex-col items-center justify-center gap-2.5 p-4 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50 cursor-pointer transition-all group"
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
                  style={{ backgroundColor: `${a.color}08` }}
                >
                  <span
                    className="material-symbols-outlined text-[19px] group-hover:scale-105 transition-transform"
                    style={{ color: a.color }}
                  >
                    {a.icon}
                  </span>
                </div>
                <span className="text-[11px] font-semibold text-slate-600 group-hover:text-slate-950 transition-colors">
                  {a.label}
                </span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          variants={fadeUp}
          className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between"
        >
          <h3 className="text-[14px] font-semibold text-slate-900 mb-4">
            Recent Activity
          </h3>
          {dynamicRecentActivity.length === 0 ? (
            <div className="h-[200px] flex flex-col items-center justify-center text-slate-300 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 p-4 text-center my-auto">
              <span className="material-symbols-outlined text-[24px] mb-1.5 text-slate-400">history</span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">No Recent Activity</span>
              <p className="text-[10px] text-slate-400 mt-1 font-medium">Actions like catalog updates, consultations, and orders will stream here.</p>
            </div>
          ) : (
            <div className="space-y-1 my-auto">
              {dynamicRecentActivity.slice(0, 5).map((a, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0"
                >
                  <div className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-150 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[15px] text-slate-500">
                      {a.icon}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-[11.5px] text-slate-700 font-medium truncate">
                      {a.text}
                    </p>
                    <p className="text-[9.5px] text-slate-400">{a.time}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Inventory Alerts */}
        <motion.div
          variants={fadeUp}
          className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[14px] font-semibold text-slate-900">
              Inventory Alerts
            </h3>
            <button
              onClick={() => navigate("/admin/inventory")}
              className="text-[11px] font-semibold text-black hover:underline cursor-pointer"
            >
              View All
            </button>
          </div>
          {outOfStock === 0 && lowStockProducts === 0 && products.filter((p) => p.stock <= 5).length === 0 ? (
            <div className="h-[200px] flex flex-col items-center justify-center text-emerald-500 bg-emerald-50/10 rounded-xl border border-dashed border-emerald-500/20 p-4 text-center my-auto">
              <span className="material-symbols-outlined text-[24px] mb-1.5 text-emerald-500">check_circle</span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-700">Stock Levels Healthy</span>
              <p className="text-[10px] text-slate-400 mt-1 font-medium">All active catalog product stocks are safely above alerts threshold.</p>
            </div>
          ) : (
            <>
              {outOfStock > 0 && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-rose-50 border border-rose-100 mb-3">
                  <span className="material-symbols-outlined text-[18px] text-rose-600">
                    error
                  </span>
                  <div className="text-left">
                    <p className="text-[12px] font-semibold text-rose-700">
                      {outOfStock} Product{outOfStock > 1 ? "s" : ""} Out of Stock
                    </p>
                    <p className="text-[10px] text-rose-500 mt-0.5">
                      Immediate attention required
                    </p>
                  </div>
                </div>
              )}
              {lowStockProducts > 0 && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 border border-amber-100 mb-3">
                  <span className="material-symbols-outlined text-[18px] text-amber-600">
                    warning
                  </span>
                  <div className="text-left">
                    <p className="text-[12px] font-semibold text-amber-700">
                      {lowStockProducts} Product{lowStockProducts > 1 ? "s" : ""}{" "}
                      Low Stock
                    </p>
                    <p className="text-[10px] text-amber-500 mt-0.5">
                      Running below threshold
                    </p>
                  </div>
                </div>
              )}
              <div className="space-y-2 mt-2">
                {products
                  .filter((p) => p.stock <= 5)
                  .slice(0, 3)
                  .map((p, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <img
                          onError={handleImageError}
                          src={p.image}
                          alt="Traditional wedding event decoration"
                          className="w-7 h-7 rounded-md object-cover border border-slate-205"
                        />
                        <span className="text-[11.5px] text-slate-700 font-medium truncate max-w-[120px]">
                          {p.name}
                        </span>
                      </div>
                      <span
                        className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full ${p.stock === 0 ? "text-rose-600 bg-rose-50 border border-rose-100" : "text-amber-600 bg-amber-50 border border-amber-100"}`}
                      >
                        {p.stock === 0 ? "Out" : `${p.stock} left`}
                      </span>
                    </div>
                  ))}
              </div>
            </>
          )}
        </motion.div>
      </div>

      {/* Weekly Order & Sales Volume Chart */}
      <motion.div
        variants={fadeUp}
        className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-xs"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-[14px] font-semibold text-slate-900">
              Weekly Order Velocity
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Real-time orders placed & products sold this past week
            </p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={isMobile ? 180 : 220}>
          <BarChart data={weeklyOrderStats} barGap={isMobile ? 4 : 6}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 10, fill: "#94A3B8" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              hide={isMobile}
              tick={{ fontSize: 10, fill: "#94A3B8" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<ChartTooltip />} />
            <Bar
              dataKey="ordersCount"
              fill="#000000"
              radius={[4, 4, 0, 0]}
              name="Orders Placed"
            />
            <Bar
              dataKey="itemsCount"
              fill="#CBD5E1"
              radius={[4, 4, 0, 0]}
              name="Products Sold"
            />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Bottom Row: Recent Orders + Upcoming Bookings + Trending Products */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <motion.div
          variants={fadeUp}
          className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[14px] font-semibold text-slate-900">
                Recent Orders
              </h3>
              <button
                onClick={() => navigate("/admin/orders")}
                className="text-[11px] font-semibold text-black hover:underline cursor-pointer"
              >
                View All
              </button>
            </div>
            {orders.length === 0 ? (
              <div className="h-[180px] flex flex-col items-center justify-center text-slate-300 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 p-4 text-center my-2">
                <span className="material-symbols-outlined text-[24px] mb-1.5 text-slate-400">receipt_long</span>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">No Orders Found</span>
                <p className="text-[10px] text-slate-400 mt-1 font-medium">Customer storefront orders will display here once transactions complete.</p>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-2 px-2 scrollbar-hide">
                <table className="w-full text-[11.5px] min-w-[300px]">
                  <thead>
                    <tr className="text-left text-slate-400 border-b border-slate-100">
                      <th className="pb-3 font-semibold">Order</th>
                      <th className="pb-3 font-semibold">Customer</th>
                      <th className="pb-3 font-semibold">Amount</th>
                      <th className="pb-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.slice(0, 5).map((o, i) => {
                      const statusColors = {
                        Pending: "text-amber-600 bg-amber-50 border-amber-100",
                        Processing: "text-black bg-slate-100 border-slate-200",
                        Confirmed: "text-emerald-605 bg-emerald-50 border-emerald-100",
                        Packed: "text-purple-650 bg-purple-50 border-purple-100",
                        Delivered: "text-emerald-700 bg-emerald-50 border-emerald-200",
                        Cancelled: "text-rose-600 bg-rose-50 border-rose-100",
                      };
                      return (
                        <tr
                          key={i}
                          className="border-b border-slate-100/70 last:border-0 hover:bg-slate-50 transition-colors"
                        >
                          <td className="py-2.5 font-semibold text-black text-left">
                            {o.id.substring(o.id.length - 8).toUpperCase()}
                          </td>
                          <td className="py-2.5 text-slate-600 truncate max-w-[100px] text-left">
                            {o.customer}
                          </td>
                          <td className="py-2.5 font-semibold text-slate-800 text-left">
                            ₹{o.total.toLocaleString()}
                          </td>
                          <td className="py-2.5 text-left">
                            <span
                              className={`px-2 py-0.5 rounded border text-[9.5px] font-semibold ${statusColors[o.status] || "text-slate-500 bg-slate-50"}`}
                            >
                              {o.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </motion.div>

        {/* Upcoming Bookings */}
        <motion.div
          variants={fadeUp}
          className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[14px] font-semibold text-slate-900">
                Upcoming Bookings
              </h3>
              <button
                onClick={() => navigate("/admin/events")}
                className="text-[11px] font-semibold text-black hover:underline cursor-pointer"
              >
                View All
              </button>
            </div>
            {eventBookings.filter((b) => b.status !== "Cancelled").length === 0 ? (
              <div className="h-[180px] flex flex-col items-center justify-center text-slate-300 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 p-4 text-center my-2">
                <span className="material-symbols-outlined text-[24px] mb-1.5 text-slate-400">calendar_today</span>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">No Bookings Found</span>
                <p className="text-[10px] text-slate-400 mt-1 font-medium">Consultations and event setup bookings will display here once scheduled.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {eventBookings
                  .filter((b) => b.status !== "Cancelled")
                  .slice(0, 4)
                  .map((b, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 p-2.5 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors text-left"
                    >
                      <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[16px] text-black">
                          event
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-semibold text-slate-800 truncate">
                          {b.eventType}
                        </p>
                        <p className="text-[10.5px] text-slate-400 mt-0.5">
                          {b.customer} · {b.date}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                          {b.venue}
                        </p>
                      </div>
                      <span
                        className={`text-[9.5px] font-semibold px-2 py-0.5 rounded border shrink-0 ${b.status === "Confirmed" ? "text-emerald-700 bg-emerald-50 border-emerald-100" : b.status === "Processing" ? "text-blue-650 bg-slate-100 border-blue-105" : "text-amber-600 bg-amber-50 border-amber-100"}`}
                      >
                        {b.status}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* Trending Products */}
        <motion.div
          variants={fadeUp}
          className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[14px] font-semibold text-slate-900">
                Trending Products
              </h3>
              <button
                onClick={() => navigate("/admin/products")}
                className="text-[11px] font-semibold text-black hover:underline cursor-pointer"
              >
                View All
              </button>
            </div>
            {trendingProducts.length === 0 ? (
              <div className="h-[180px] flex flex-col items-center justify-center text-slate-300 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 p-4 text-center my-2">
                <span className="material-symbols-outlined text-[24px] mb-1.5 text-slate-400">trending_up</span>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">No Products Yet</span>
                <p className="text-[10px] text-slate-400 mt-1 font-medium">Top performing products by views will automatically appear here.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {trendingProducts.map((p, i) => (
                  <div
                    key={i}
                    onClick={() => navigate(`/admin/products/edit/${p.id}`)}
                    className="flex items-start gap-3 p-2 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer group text-left"
                  >
                    <img
                      src={p.image}
                      alt={p.name}
                      className="w-8 h-8 rounded-lg object-cover shrink-0 border border-slate-200"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-slate-800 truncate group-hover:text-black transition-colors">
                        {p.name}
                      </p>
                      <p className="text-[10.5px] text-slate-400 mt-0.5">
                        ₹{p.price.toLocaleString()} · {p.category}
                      </p>
                    </div>
                    <div className="flex flex-col items-end justify-center shrink-0">
                      <span className="flex items-center gap-0.5 text-[9.5px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/50">
                        <span className="material-symbols-outlined text-[10px] text-slate-400">visibility</span>
                        {p.views.toLocaleString()}
                      </span>
                      <span className="text-[9px] text-slate-400 mt-1 font-medium">
                        {p.sold} sold
                      </span>
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
