import React, { useMemo } from"react";
import { motion } from"framer-motion";
import { useAdmin } from"../context/AdminContext";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from"recharts";

const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

const formatCurrency = (val) => {
  if (!val) return"₹0";
  if (val >= 100000) {
    return `₹${(val / 100000).toFixed(2)}L`;
  }
  return `₹${val.toLocaleString("en-IN")}`;
};

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-xl shadow-xl border border-surface-container-highest px-4 py-3">
      <p className="text-[11px] sm:text-[11px] font-semibold text-outline">{label}</p>
      <p className="text-[13px] font-bold text-black font-mono">
        ₹{payload[0].value.toLocaleString("en-IN")}
      </p>
    </div>
  );
}

export function AdminPayments() {
  const { orders, dataLoading, searchQuery } = useAdmin();

  // Aggregate metrics and chart details dynamically from actual MongoDB order collections
  const metrics = useMemo(() => {
    // Start with exact zero aggregates (No static seed fallbacks)
    let totalCollected = 0;
    let thisMonth = 0;
    let pending = 0;
    let refunded = 0;

    // Initialize month labels dynamically based on past 6 months to avoid hardcoding
    const monthlyMap = {};
    const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    
    const currentMonthIndex = new Date().getMonth();
    for (let i = 5; i >= 0; i--) {
      const idx = (currentMonthIndex - i + 12) % 12;
      monthlyMap[monthNames[idx]] = 0;
    }

    const currentMonthName = monthNames[currentMonthIndex];

    // Map checkout amounts into dynamic aggregates
    orders.forEach((o) => {
      const amount = Number(o.total) || 0;
      const orderDate = o.date ? new Date(o.date) : new Date();
      const monthLabel = monthNames[orderDate.getMonth()];

      if (o.payment ==="Paid") {
        totalCollected += amount;
        
        // Add to monthly aggregates
        if (monthlyMap[monthLabel] !== undefined) {
          monthlyMap[monthLabel] += amount;
        } else {
          monthlyMap[monthLabel] = amount;
        }

        // Track current month's collection purely
        if (monthLabel === currentMonthName) {
          thisMonth += amount;
        }
      } else if (o.status ==="Cancelled") {
        refunded += amount;
      } else {
        pending += amount;
      }
    });

    // Format chart data
    const chartData = Object.keys(monthlyMap).map((m) => ({
      month: m,
      amount: monthlyMap[m],
    }));

    // Create a transaction record list directly linked to storefront checkouts
    let transactions = orders.map((o) => {
      const orderNum = o.id && o.id.length > 8 ? o.id.slice(-6).toUpperCase() : o.id;
      const paymentMethod = o.rawOrder?.paymentMethod || (o.payment ==="COD" ?"COD" :"UPI");
      const statusLabel = o.payment ==="Paid" ?"Completed" : o.status ==="Cancelled" ?"Refunded" :"Pending";

      return {
        id: `TXN-${o.rawOrder?.paymentInfo?.razorpayPaymentId?.slice(-8).toUpperCase() || o.id.slice(-8).toUpperCase()}`,
        order: `ORD-${orderNum}`,
        customer: o.customer ||"Anonymous Buyer",
        amount: o.total || 0,
        method: paymentMethod,
        status: statusLabel,
        date: o.date || new Date().toISOString().split("T")[0],
      };
    }).sort((a, b) => new Date(b.date) - new Date(a.date));

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      transactions = transactions.filter(t => 
        (t.id ||"").toLowerCase().includes(q) ||
        (t.order ||"").toLowerCase().includes(q) ||
        (t.customer ||"").toLowerCase().includes(q) ||
        (t.method ||"").toLowerCase().includes(q) ||
        (t.status ||"").toLowerCase().includes(q)
      );
    }

    return {
      totalCollected,
      thisMonth,
      pending,
      refunded,
      chartData,
      transactions,
    };
  }, [orders, searchQuery]);

  if (dataLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-10 h-10 border-3 border-slate-900 border-t-transparent rounded-full animate-spin" />
        <p className="text-[12px] text-outline font-body">Syncing live payments from gateway...</p>
      </div>
    );
  }

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.05 } } }}
      className="max-w-[1440px] mx-auto space-y-6 font-body text-on-surface"
    >
      {/* Header */}
      <motion.div variants={fadeUp}>
        <h2 className="text-[24px] font-bold text-on-surface">
          Payments
        </h2>
        <p className="text-[13px] text-outline">
          Real-time transaction tracking and sales revenue aggregations
        </p>
      </motion.div>

      {/* KPI Cards */}
      <motion.div
        variants={fadeUp}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {[
          {
            label:"Total Collected",
            value: formatCurrency(metrics.totalCollected),
            icon:"account_balance",
            bg:"bg-slate-50 text-black border-slate-250",
          },
          { 
            label:"This Month", 
            value: formatCurrency(metrics.thisMonth), 
            icon:"calendar_today",
            bg:"bg-emerald-50 text-emerald-600 border-emerald-200",
          },
          { 
            label:"Pending Receivables", 
            value: formatCurrency(metrics.pending), 
            icon:"pending",
            bg:"bg-amber-50 text-amber-600 border-amber-200",
          },
          { 
            label:"Refunded/Cancelled", 
            value: formatCurrency(metrics.refunded), 
            icon:"undo",
            bg:"bg-rose-50 text-rose-600 border-rose-200",
          },
        ].map((s, i) => (
          <div
            key={i}
            className={`bg-white rounded-2xl p-5 border shadow-sm transition-all hover:y-[-2px] ${s.bg}`}
          >
            <span className="material-symbols-outlined text-[24px] mb-2 block">
              {s.icon}
            </span>
            <p className="text-[22px] font-bold tracking-tight text-on-surface font-mono">{s.value}</p>
            <p className="text-[11px] sm:text-[11px] font-bold uppercase tracking-wider text-outline-variant">{s.label}</p>
          </div>
        ))}
      </motion.div>

      {/* BarChart */}
      <motion.div
        variants={fadeUp}
        className="bg-white rounded-2xl p-6 border border-surface-container-highest/60 shadow-sm"
      >
        <h3 className="text-[16px] font-bold text-on-surface mb-4">
          Monthly Collections (Sales Vol.)
        </h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={metrics.chartData}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--color-surface-container-highest)"
              vertical={false}
            />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill:"var(--color-outline)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill:"var(--color-outline)" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `₹${v >= 100000 ? `${v / 100000}L` : `${v / 1000}K`}`}
            />
            <Tooltip content={<ChartTooltip />} />
            <Bar
              dataKey="amount"
              fill="var(--color-primary)"
              radius={[8, 8, 0, 0]}
              name="Amount"
            />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Transactions Table */}
      <motion.div
        variants={fadeUp}
        className="bg-white rounded-2xl border border-surface-container-highest/60 shadow-sm overflow-hidden"
      >
        <div className="p-5 border-b border-surface-container-low flex items-center justify-between">
          <div>
            <h3 className="text-[16px] font-bold text-on-surface">
              Recent Checkout Transactions
            </h3>
            <p className="text-[11px] sm:text-[11px] text-outline">Payments registered through credit/debit card, UPI, and net banking</p>
          </div>
          <span className="px-3 py-1 bg-surface-container-low text-outline text-[11px] font-bold uppercase tracking-wider rounded-lg">
            {metrics.transactions.length} total
          </span>
        </div>
        <div className="overflow-x-auto">
          {metrics.transactions.length === 0 ? (
            <div className="p-12 text-center text-outline flex flex-col items-center justify-center">
              <span className="material-symbols-outlined text-[48px] mb-2 block text-outline-variant">search_off</span>
              <p className="text-[14px] font-bold text-[#0F172A] mt-1">Data Not Found</p>
              <p className="text-[11px] sm:text-[11px] text-[#64748B] mt-1">No checkouts or transactions matched your search or filters.</p>
            </div>
          ) : (
            <table className="w-full text-[12px]">
              <thead>
                <tr className="bg-surface text-left text-outline border-b border-surface-container-highest/60">
                  <th className="p-4 font-semibold">Transaction ID</th>
                  <th className="p-4 font-semibold">Order Reference</th>
                  <th className="p-4 font-semibold">Customer</th>
                  <th className="p-4 font-semibold">Amount</th>
                  <th className="p-4 font-semibold hidden sm:table-cell">
                    Method
                  </th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold hidden md:table-cell">Date</th>
                </tr>
              </thead>
              <tbody>
                {metrics.transactions.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-surface-container-low hover:bg-surface/50 transition-colors"
                  >
                    <td className="p-4">
                      <p className="font-semibold text-black font-mono">{p.id}</p>
                    </td>
                    <td className="p-4">
                      <p className="font-mono text-outline-variant font-semibold">
                        {p.order}
                      </p>
                    </td>
                    <td className="p-4 text-on-surface-variant font-medium">{p.customer}</td>
                    <td className="p-4 font-bold text-on-surface">
                      ₹{p.amount.toLocaleString("en-IN")}
                    </td>
                    <td className="p-4 text-outline hidden sm:table-cell">
                      <span className="px-2 py-1 bg-surface rounded-md text-[11px] font-bold font-mono">
                        {p.method}
                      </span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] sm:text-[11px] sm:text-[11px] font-bold border ${
                          p.status ==="Completed" 
                            ?"text-emerald-600 bg-emerald-50 border-emerald-200" 
                            : p.status ==="Refunded"
                            ?"text-rose-600 bg-rose-50 border-rose-200"
                            :"text-amber-600 bg-amber-50 border-amber-200"
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="p-4 text-outline hidden md:table-cell">
                      {new Date(p.date).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
