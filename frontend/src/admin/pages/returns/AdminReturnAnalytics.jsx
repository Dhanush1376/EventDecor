import React, { useEffect, useState } from 'react';
import { m as motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useReturnManagement } from '../../hooks/useReturnManagement';
import {
  PageHeader,
  ChartCard,
  ChartTooltip,
  SkeletonChart,
  SkeletonList,
  EmptyState,
  FilterBar,
  fadeUp,
  stagger,
  CHART_COLORS,
} from '../../components/AdminUIKit';

const AdminReturnAnalytics = () => {
  const { analyticsData, fetchAnalytics, loading, error } = useReturnManagement();
  const [dimension, setDimension] = useState('reason');

  useEffect(() => {
    fetchAnalytics({ dimension });
  }, [fetchAnalytics, dimension]);

  if (error) {
    return (
      <EmptyState
        icon="error_outline"
        title="Failed to load analytics"
        description={error}
        action={
          <button
            className="admin-btn admin-btn-primary"
            onClick={() => fetchAnalytics({ dimension })}
          >
            Try Again
          </button>
        }
      />
    );
  }

  return (
    <motion.div initial="hidden" animate="show" variants={stagger} className="space-y-6">
      <PageHeader
        title="Return Analytics"
        subtitle="Deep dive into return reasons, product performance, and financial impact"
        icon="analytics"
        iconColor="accent"
      />

      <div className="flex flex-col sm:flex-row sm:items-center gap-4 flex-wrap">
        <span className="text-[12px] font-bold text-[var(--admin-text-secondary)]">
          Analyze By:
        </span>
        <FilterBar
          filters={['reason', 'product', 'category', 'customer']}
          value={dimension}
          onChange={setDimension}
        />
      </div>

      {loading && !analyticsData ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2 space-y-6">
            <SkeletonChart height="400px" />
            <SkeletonChart height="300px" />
          </div>
          <div className="lg:col-span-1 space-y-6">
            <SkeletonList items={3} />
            <SkeletonList items={1} />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2 space-y-6">
            <motion.div variants={fadeUp}>
              <ChartCard
                title={`Returns Breakdown by ${dimension.charAt(0).toUpperCase() + dimension.slice(1)}`}
              >
                <div className="h-[400px] w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={analyticsData?.data || []}
                      margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="var(--admin-border-subtle)"
                      />
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'var(--admin-text-tertiary)', fontSize: 11, fontWeight: 500 }}
                        dy={10}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'var(--admin-text-tertiary)', fontSize: 11, fontWeight: 500 }}
                      />
                      <ChartTooltip />
                      <Legend
                        verticalAlign="top"
                        height={36}
                        iconType="circle"
                        iconSize={8}
                        wrapperStyle={{ fontSize: '11px', color: 'var(--admin-text-secondary)' }}
                      />
                      <Bar
                        dataKey="returns"
                        name="Total Returns"
                        fill={CHART_COLORS[0]}
                        radius={[4, 4, 0, 0]}
                        maxBarSize={50}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>
            </motion.div>

            <motion.div variants={fadeUp}>
              <ChartCard title="Return Rate Trend (Last 6 Months)">
                <div className="h-[300px] w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={analyticsData?.trend || []}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="var(--admin-border-subtle)"
                      />
                      <XAxis
                        dataKey="month"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'var(--admin-text-tertiary)', fontSize: 11, fontWeight: 500 }}
                        dy={10}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(val) => `${val}%`}
                        tick={{ fill: 'var(--admin-text-tertiary)', fontSize: 11, fontWeight: 500 }}
                      />
                      <ChartTooltip formatter={(value) => [`${value}%`, 'Return Rate']} />
                      <Legend
                        verticalAlign="top"
                        height={36}
                        iconType="circle"
                        iconSize={8}
                        wrapperStyle={{ fontSize: '11px', color: 'var(--admin-text-secondary)' }}
                      />
                      <Line
                        type="monotone"
                        dataKey="rate"
                        name="Return Rate %"
                        stroke={CHART_COLORS[1]}
                        strokeWidth={3}
                        dot={{ r: 4, strokeWidth: 2 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>
            </motion.div>
          </div>

          <div className="lg:col-span-1 space-y-6">
            <motion.div variants={fadeUp} className="admin-card overflow-hidden">
              <div className="p-4 border-b border-[var(--admin-border-subtle)]">
                <h3 className="text-[14px] font-bold text-[var(--admin-text-primary)] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-[var(--admin-domain-danger)]">
                    trending_down
                  </span>
                  Revenue Impact
                </h3>
              </div>
              <div className="p-0 flex flex-col divide-y divide-[var(--admin-border-subtle)]">
                <div className="p-4 flex items-center justify-between">
                  <span className="text-[13px] font-medium text-[var(--admin-text-secondary)]">
                    Total Refunded
                  </span>
                  <span className="text-[16px] font-bold text-[var(--admin-domain-danger)]">
                    ₹{(analyticsData?.financials?.totalRefunded || 0).toLocaleString()}
                  </span>
                </div>
                <div className="p-4 flex items-center justify-between">
                  <span className="text-[13px] font-medium text-[var(--admin-text-secondary)]">
                    Logistics Cost
                  </span>
                  <span className="text-[16px] font-bold text-[var(--admin-domain-warning)]">
                    ₹{(analyticsData?.financials?.logisticsCost || 0).toLocaleString()}
                  </span>
                </div>
                <div className="p-4 flex items-center justify-between bg-[var(--admin-surface-muted)]">
                  <span className="text-[13px] font-bold text-[var(--admin-text-primary)]">
                    Total Loss
                  </span>
                  <span className="text-[18px] font-black text-[var(--admin-domain-danger)]">
                    ₹
                    {(
                      (analyticsData?.financials?.totalRefunded || 0) +
                      (analyticsData?.financials?.logisticsCost || 0)
                    ).toLocaleString()}
                  </span>
                </div>
              </div>
            </motion.div>

            <motion.div variants={fadeUp} className="admin-card overflow-hidden">
              <div className="p-4 border-b border-[var(--admin-border-subtle)]">
                <h3 className="text-[14px] font-bold text-[var(--admin-text-primary)] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-[var(--admin-accent)]">
                    tips_and_updates
                  </span>
                  Insights
                </h3>
              </div>
              <div className="p-5">
                <div className="text-[13px] text-[var(--admin-text-secondary)] leading-relaxed italic bg-[var(--admin-surface-hover)] p-4 rounded-[var(--admin-radius-lg)] border border-[var(--admin-border)]">
                  {analyticsData?.insight || 'Loading insights based on your data...'}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default AdminReturnAnalytics;
