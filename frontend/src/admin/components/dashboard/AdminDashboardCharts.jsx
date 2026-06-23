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
import { ChartCard, ChartTooltip, formatCurrency } from '../AdminUIKit';

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
      <div className="admin-grid-charts">
        {/* Revenue Chart */}
        <ChartCard
          title="Sales Overview"
          subtitle="Monthly sales & order trends"
          legend={
            <>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[var(--admin-accent)]" />
                Sales
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[var(--admin-border-strong)]" />
                Orders
              </span>
            </>
          }
        >
          {orders.length === 0 ? (
            <div className="h-[280px] flex flex-col items-center justify-center bg-[var(--admin-bg-subtle)] rounded-[var(--admin-radius-lg)] border border-dashed border-[var(--admin-border)]">
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
                margin={{ top: 10, right: 0, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--admin-accent)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="var(--admin-accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--admin-border-subtle)"
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 10, fill: 'var(--admin-text-tertiary)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  hide={isMobile}
                  tick={{ fontSize: 10, fill: 'var(--admin-text-tertiary)' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={formatCurrency}
                />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="var(--admin-accent)"
                  fill="url(#colorSales)"
                  strokeWidth={2}
                  name="Sales"
                />
                <Area
                  type="monotone"
                  dataKey="orders"
                  stroke="var(--admin-border-strong)"
                  fill="transparent"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  name="Orders"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Category Performance */}
        <ChartCard title="Top Categories" subtitle="Sales distribution by category">
          {categoryChartData.length === 0 ? (
            <div className="h-[240px] flex flex-col items-center justify-center bg-[var(--admin-bg-subtle)] rounded-[var(--admin-radius-lg)] border border-dashed border-[var(--admin-border)]">
              <span className="material-symbols-outlined text-[32px] text-[var(--admin-text-tertiary)] mb-2">
                pie_chart
              </span>
              <span className="text-[11px] uppercase font-bold text-[var(--admin-text-secondary)] tracking-wider">
                No Sales Recorded
              </span>
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
                    outerRadius={80}
                    dataKey="value"
                    paddingAngle={2}
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
                  <div key={i} className="flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: cat.fill }}
                      />
                      <span className="text-[var(--admin-text-secondary)] font-medium truncate max-w-[120px]">
                        {cat.name}
                      </span>
                    </span>
                    <span className="font-bold text-[var(--admin-text-primary)]">{cat.value}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </ChartCard>
      </div>

      {/* Weekly Order & Sales Volume Chart */}
      <ChartCard
        title="Weekly Order Velocity"
        subtitle="Orders and sales this week"
        className="p-4 sm:p-6"
      >
        <ResponsiveContainer width="100%" height={isMobile ? 180 : 220}>
          <BarChart
            data={weeklyOrderStats}
            barGap={isMobile ? 4 : 6}
            margin={{ top: 10, right: 5, left: isMobile ? -20 : -10, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--admin-border-subtle)"
              vertical={false}
            />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 10, fill: 'var(--admin-text-tertiary)' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              hide={isMobile}
              allowDecimals={false}
              tick={{ fontSize: 10, fill: 'var(--admin-text-tertiary)' }}
              axisLine={false}
              tickLine={false}
              width={25}
            />
            <Tooltip content={<ChartTooltip />} />
            <Bar
              dataKey="ordersCount"
              fill="var(--admin-accent)"
              radius={[4, 4, 0, 0]}
              name="Orders Placed"
            />
            <Bar
              dataKey="itemsCount"
              fill="var(--admin-border-strong)"
              radius={[4, 4, 0, 0]}
              name="Products Sold"
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </>
  );
}
