import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';
import { ChartTooltip, formatCurrency } from '../AdminUIKit';

// Curated Luxury Cream & Ivory Decor Palette
const PALETTE = [
  '#5a7d9a', // Warm Slate Blue
  '#826237', // Heritage Gold
  '#58856b', // Deep Sage Olive
  '#b8647c', // Dusty Antique Rose
  '#c2944b', // Warm Ochre
  '#47828d', // Mineral Teal
  '#7d6899', // Royal Amethyst
  '#b86a51', // Terracotta Clay
];

export function AdminDashboardCharts({
  orders,
  revenueChartData,
  categoryChartData,
  weeklyOrderStats,
  isMobile,
}) {
  return (
    <>
      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Overview (2 Cols on Desktop) */}
        <div className="admin-card lg:col-span-2 p-4 sm:p-5 !rounded-[4px] border border-[var(--admin-border)] shadow-xs flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-[var(--admin-border-subtle)]">
            <div>
              <h3 className="text-[13.5px] sm:text-[14px] font-bold text-[var(--admin-text-primary)]">
                Sales Overview
              </h3>
              <p className="text-[11px] text-[var(--admin-text-tertiary)] mt-0.5">
                Monthly revenue and volume trajectory
              </p>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-semibold text-[var(--admin-text-secondary)]">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-[2px] bg-[#5a7d9a]" />
                Revenue
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-[2px] bg-[#c2944b]" />
                Orders
              </span>
            </div>
          </div>

          {orders.length === 0 ? (
            <div className="h-[280px] flex flex-col items-center justify-center bg-[var(--admin-surface-muted)] rounded-[4px] border border-dashed border-[var(--admin-border)]">
              <span className="material-symbols-outlined text-[32px] text-[var(--admin-text-tertiary)] mb-2">
                analytics
              </span>
              <span className="text-[11px] uppercase font-bold text-[var(--admin-text-secondary)] tracking-wider">
                No Sales Trends Recorded
              </span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={isMobile ? 220 : 280}>
              <AreaChart
                data={revenueChartData}
                margin={{ top: 10, right: 10, left: isMobile ? -20 : -5, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorSalesModern" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#5a7d9a" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#5a7d9a" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--admin-border-subtle)"
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 10.5, fill: 'var(--admin-text-tertiary)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  hide={isMobile}
                  tick={{ fontSize: 10.5, fill: 'var(--admin-text-tertiary)' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={formatCurrency}
                />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#5a7d9a"
                  fill="url(#colorSalesModern)"
                  strokeWidth={2}
                  name="Revenue"
                />
                <Area
                  type="monotone"
                  dataKey="orders"
                  stroke="#c2944b"
                  fill="transparent"
                  strokeWidth={1.5}
                  strokeDasharray="3 3"
                  name="Orders"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Category Performance (1 Col on Desktop) */}
        <div className="admin-card p-4 sm:p-5 !rounded-[4px] border border-[var(--admin-border)] shadow-xs flex flex-col justify-between">
          <div className="mb-4 pb-3 border-b border-[var(--admin-border-subtle)]">
            <h3 className="text-[13.5px] sm:text-[14px] font-bold text-[var(--admin-text-primary)]">
              Top Categories
            </h3>
            <p className="text-[11px] text-[var(--admin-text-tertiary)] mt-0.5">
              Sales distribution by category
            </p>
          </div>

          {categoryChartData.length === 0 ? (
            <div className="h-[240px] flex flex-col items-center justify-center bg-[var(--admin-surface-muted)] rounded-[4px] border border-dashed border-[var(--admin-border)]">
              <span className="material-symbols-outlined text-[32px] text-[var(--admin-text-tertiary)] mb-2">
                pie_chart
              </span>
              <span className="text-[11px] uppercase font-bold text-[var(--admin-text-secondary)] tracking-wider">
                No Sales Recorded
              </span>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={categoryChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    dataKey="value"
                    paddingAngle={3}
                    strokeWidth={0}
                  >
                    {categoryChartData.map((entry, i) => (
                      <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-3 pt-3 border-t border-[var(--admin-border-subtle)]">
                {categoryChartData.slice(0, 4).map((cat, i) => (
                  <div key={i} className="flex items-center justify-between text-[11.5px]">
                    <span className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-[2px] shrink-0"
                        style={{ backgroundColor: PALETTE[i % PALETTE.length] }}
                      />
                      <span className="text-[var(--admin-text-secondary)] font-medium truncate max-w-[130px]">
                        {cat.name}
                      </span>
                    </span>
                    <span className="font-bold text-[var(--admin-text-primary)] font-mono">
                      {cat.value}%
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Weekly Order & Sales Volume Velocity */}
      <div className="admin-card p-4 sm:p-5 !rounded-[4px] border border-[var(--admin-border)] shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-[var(--admin-border-subtle)]">
          <div>
            <h3 className="text-[13.5px] sm:text-[14px] font-bold text-[var(--admin-text-primary)]">
              Weekly Order Velocity
            </h3>
            <p className="text-[11px] text-[var(--admin-text-tertiary)] mt-0.5">
              Daily customer orders and product volume over the past 7 days
            </p>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-semibold text-[var(--admin-text-secondary)]">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-[2px] bg-[#5a7d9a]" />
              Orders Placed
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-[2px] bg-[#826237]" />
              Products Sold
            </span>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={isMobile ? 180 : 210}>
          <BarChart
            data={weeklyOrderStats}
            barGap={isMobile ? 4 : 6}
            margin={{ top: 10, right: 10, left: isMobile ? -20 : -10, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--admin-border-subtle)"
              vertical={false}
            />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 10.5, fill: 'var(--admin-text-tertiary)' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              hide={isMobile}
              allowDecimals={false}
              tick={{ fontSize: 10.5, fill: 'var(--admin-text-tertiary)' }}
              axisLine={false}
              tickLine={false}
              width={25}
            />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="ordersCount" fill="#5a7d9a" radius={[3, 3, 0, 0]} name="Orders Placed" />
            <Bar dataKey="itemsCount" fill="#826237" radius={[3, 3, 0, 0]} name="Products Sold" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}
