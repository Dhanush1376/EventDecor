import React, { useEffect } from 'react';
import { m as motion } from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { useReturnManagement } from '../../hooks/useReturnManagement';
import { useMediaQuery } from '../../../hooks/useMediaQuery';
import {
  PageHeader,
  StatCard,
  ChartCard,
  ChartTooltip,
  SkeletonCard,
  SkeletonChart,
  EmptyState,
  fadeUp,
  stagger,
  CHART_COLORS,
} from '../../components/AdminUIKit';

const AdminReturnDashboard = () => {
  const {
    dashboardStats,
    fetchDashboardStats,
    analyticsData,
    fetchAnalytics,
    enterpriseAnalytics,
    fetchEnterpriseAnalytics,
    loading,
    error,
  } = useReturnManagement();
  const isMobile = useMediaQuery('(max-width: 768px)');

  useEffect(() => {
    fetchDashboardStats();
    fetchAnalytics({ dimension: 'reason' });
    fetchEnterpriseAnalytics();
  }, [fetchDashboardStats, fetchAnalytics, fetchEnterpriseAnalytics]);

  if (error) {
    return (
      <EmptyState
        icon="error_outline"
        title="Failed to load dashboard"
        description={error}
        action={
          <button className="admin-btn admin-btn-primary" onClick={fetchDashboardStats}>
            Try Again
          </button>
        }
      />
    );
  }

  const { stats = {}, sla = {}, trend = [] } = dashboardStats || {};

  const formatChange = (curr = 0, prev = 0, isTime = false) => {
    const diff = curr - prev;
    if (diff === 0) return { text: 'No change', type: 'neutral' };
    const sign = diff > 0 ? '+' : '';
    if (isTime) {
      return {
        text: `${Math.abs(diff)}h ${diff > 0 ? 'slower' : 'faster'} vs last week`,
        type: diff > 0 ? 'down' : 'up',
      };
    }
    return { text: `${sign}${diff} vs last week`, type: diff > 0 ? 'up' : 'down' };
  };

  return (
    <motion.div initial="hidden" animate="show" variants={stagger} className="space-y-6">
      <PageHeader
        title="Return & Exchange Dashboard"
        subtitle="Overview of reverse logistics, refunds, and SLA performance"
        icon="undo"
        iconColor="warning"
      />

      {loading && (!dashboardStats || !analyticsData) ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[1, 2, 3, 4].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <SkeletonChart height="280px" />
            <SkeletonChart height="280px" />
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <StatCard
              label="Pending Returns"
              value={stats.pendingReturns || 0}
              icon="undo"
              change={formatChange(stats.thisWeekReturns, stats.previousWeekReturns).text}
              changeType={formatChange(stats.thisWeekReturns, stats.previousWeekReturns).type}
              domainColor="warning"
            />
            <StatCard
              label="Exchange Requests"
              value={stats.exchangeRequests || 0}
              icon="swap_horiz"
              change={formatChange(stats.exchangeRequests, stats.previousExchangeRequests).text}
              changeType={formatChange(stats.exchangeRequests, stats.previousExchangeRequests).type}
              domainColor="info"
            />
            <StatCard
              label="Total Refunded"
              value={`₹${(stats.totalRefundAmount || 0).toLocaleString()}`}
              icon="account_balance_wallet"
              change={formatChange(stats.totalRefundAmount, stats.previousRefundAmount).text}
              changeType={formatChange(stats.totalRefundAmount, stats.previousRefundAmount).type}
              domainColor="success"
            />
            <StatCard
              label="Avg Processing Time"
              value={`${stats.avgProcessingTimeHours || 0}h`}
              icon="timer"
              change={
                formatChange(stats.avgProcessingTimeHours, stats.previousProcessingTimeHours, true)
                  .text
              }
              changeType={
                formatChange(stats.avgProcessingTimeHours, stats.previousProcessingTimeHours, true)
                  .type
              }
              domainColor="success"
            />
          </div>

          {/* SLA Monitors (Req #16) */}
          <motion.div
            variants={fadeUp}
            className="admin-card overflow-hidden text-left relative p-0"
          >
            <div className="absolute top-0 left-0 w-full h-[3px] bg-[var(--admin-border-strong)] z-10" />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 bg-[var(--admin-surface)]">
              <div className="p-4 space-y-1 border-r border-b lg:border-b-0 border-[var(--admin-border-subtle)]">
                <span className="text-[10px] text-[var(--admin-text-tertiary)] font-bold uppercase tracking-wider">
                  Awaiting Approval
                </span>
                <p className="text-[14px] font-bold text-[var(--admin-domain-info)]">
                  {sla.waitingForAdmin || 0}
                </p>
              </div>
              <div className="p-4 space-y-1 border-r border-b lg:border-b-0 border-[var(--admin-border-subtle)]">
                <span className="text-[10px] text-[var(--admin-text-tertiary)] font-bold uppercase tracking-wider">
                  Awaiting Pickup
                </span>
                <p className="text-[14px] font-bold text-[var(--admin-domain-warning)]">
                  {sla.waitingForPickup || 0}
                </p>
              </div>
              <div className="p-4 space-y-1 border-r border-b lg:border-b-0 border-[var(--admin-border-subtle)]">
                <span className="text-[10px] text-[var(--admin-text-tertiary)] font-bold uppercase tracking-wider">
                  Awaiting Inspection
                </span>
                <p className="text-[14px] font-bold text-[var(--admin-domain-warning)]">
                  {sla.waitingForWarehouse || 0}
                </p>
              </div>
              <div className="p-4 space-y-1 border-r border-b lg:border-b-0 md:border-r-0 lg:border-r border-[var(--admin-border-subtle)]">
                <span className="text-[10px] text-[var(--admin-text-tertiary)] font-bold uppercase tracking-wider">
                  Refund Pending
                </span>
                <p className="text-[14px] font-bold text-[var(--admin-domain-info)]">
                  {sla.waitingForRefund || 0}
                </p>
              </div>
              <div className="p-4 space-y-1 border-r lg:border-b-0 border-[var(--admin-border-subtle)] bg-[var(--admin-domain-danger-bg)]">
                <span className="text-[10px] text-[var(--admin-domain-danger)] font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[var(--admin-domain-danger)] animate-pulse" />
                  Overdue SLA
                </span>
                <p className="text-[14px] font-bold text-[var(--admin-domain-danger)]">
                  {sla.overdueCases || 0}
                </p>
              </div>
              <div className="p-4 space-y-1 border-l-0 bg-[var(--admin-domain-danger-bg)]">
                <span className="text-[10px] text-[var(--admin-domain-danger)] font-bold uppercase tracking-wider">
                  Escalated
                </span>
                <p className="text-[14px] font-bold text-[var(--admin-domain-danger)]">
                  {sla.escalatedCases || 0}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Enterprise Metrics Section */}
          {enterpriseAnalytics && (
            <motion.div
              variants={fadeUp}
              className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-6"
            >
              <StatCard
                label="Overall Return Rate"
                value={`${enterpriseAnalytics.enterprise.returnRate}%`}
                icon="percent"
                domainColor="danger"
              />
              <StatCard
                label="Overall Exchange Rate"
                value={`${enterpriseAnalytics.enterprise.exchangeRate}%`}
                icon="percent"
                domainColor="info"
              />
              <StatCard
                label="Revenue Lost (Refunds)"
                value={`₹${(enterpriseAnalytics.financial.revenueLost || 0).toLocaleString()}`}
                icon="trending_down"
                domainColor="danger"
              />
              <StatCard
                label="Recovered Revenue"
                value={`₹${(enterpriseAnalytics.financial.recoveredRevenue || 0).toLocaleString()}`}
                icon="trending_up"
                domainColor="success"
              />
            </motion.div>
          )}

          {/* Charts */}
          <div className="admin-grid-charts mt-6">
            <ChartCard title="Return vs Exchange Volume (Last 7 Days)">
              <div className="h-[280px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorReturns" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART_COLORS[3]} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={CHART_COLORS[3]} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorExchanges" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART_COLORS[5]} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={CHART_COLORS[5]} stopOpacity={0} />
                      </linearGradient>
                    </defs>
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
                      dx={-10}
                    />
                    <ChartTooltip />
                    <Legend
                      verticalAlign="top"
                      height={36}
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ fontSize: '11px', color: 'var(--admin-text-secondary)' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="returns"
                      stroke={CHART_COLORS[3]}
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorReturns)"
                      name="Returns"
                    />
                    <Area
                      type="monotone"
                      dataKey="exchanges"
                      stroke={CHART_COLORS[5]}
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorExchanges)"
                      name="Exchanges"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title="Top Return Reasons">
              <div className="h-[280px] w-full mt-4 flex justify-center items-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analyticsData?.data || []}
                      cx="50%"
                      cy="50%"
                      innerRadius={isMobile ? 50 : 70}
                      outerRadius={isMobile ? 70 : 100}
                      paddingAngle={5}
                      dataKey="returns"
                      stroke="none"
                    >
                      {analyticsData?.data?.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <ChartTooltip />
                    <Legend
                      layout={isMobile ? 'horizontal' : 'vertical'}
                      verticalAlign={isMobile ? 'bottom' : 'middle'}
                      align={isMobile ? 'center' : 'right'}
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ fontSize: '11px', color: 'var(--admin-text-secondary)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>
        </>
      )}
    </motion.div>
  );
};

export default AdminReturnDashboard;
