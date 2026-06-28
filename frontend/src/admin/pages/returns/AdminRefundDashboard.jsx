import React, { useState } from 'react';
import { m as motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from 'recharts';
import { useReturnManagement } from '../../hooks/useReturnManagement';
import {
  PageHeader,
  StatCard,
  ChartCard,
  ChartTooltip,
  SkeletonCard,
  SkeletonChart,
  SkeletonList,
  EmptyState,
  fadeUp,
  stagger,
  CHART_COLORS,
} from '../../components/AdminUIKit';

const AdminRefundDashboard = () => {
  const { refundStats, fetchRefundStats, loading, error } = useReturnManagement();
  const [activeTab, setActiveTab] = useState('overview');

  React.useEffect(() => {
    fetchRefundStats();
  }, [fetchRefundStats]);

  if (error) {
    return (
      <EmptyState
        icon="error_outline"
        title="Failed to load refunds"
        description={error}
        action={
          <button className="admin-btn admin-btn-primary" onClick={fetchRefundStats}>
            Try Again
          </button>
        }
      />
    );
  }

  const { pending, processed, failed, walletReversions, distribution, trend, failedList } =
    refundStats || {};

  return (
    <motion.div initial="hidden" animate="show" variants={stagger} className="space-y-6">
      <PageHeader
        title="Refunds Dashboard"
        subtitle="Manage and analyze gateway, wallet, and store credit refunds"
        icon="account_balance"
        iconColor="info"
      />

      {loading && !refundStats ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[1, 2, 3, 4].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start mt-6">
            <div className="lg:col-span-2">
              <SkeletonChart height="350px" />
            </div>
            <div className="lg:col-span-1">
              <SkeletonList items={4} />
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Core Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <StatCard
              label="Pending Refunds"
              value={`₹${(pending?.amount || 0).toLocaleString()}`}
              icon="pending_actions"
              domainColor="warning"
              infoTooltip={`${pending?.count || 0} requests awaiting processing`}
            />
            <StatCard
              label="Processed (This Month)"
              value={`₹${(processed?.amount || 0).toLocaleString()}`}
              icon="check_circle"
              domainColor="success"
              infoTooltip={`${processed?.count || 0} refunds completed`}
            />
            <StatCard
              label="Wallet Reversions"
              value={`₹${(walletReversions || 0).toLocaleString()}`}
              icon="account_balance_wallet"
              domainColor="info"
              infoTooltip="Saved gateway fees"
            />
            <StatCard
              label="Failed Refunds"
              value={failed?.count || 0}
              icon="error"
              domainColor="danger"
              infoTooltip="Action required immediately"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <div className="lg:col-span-2">
              <ChartCard title="Refund Distribution by Method">
                <div className="h-[350px] w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={trend || []}
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
                        tickFormatter={(value) => `₹${value / 1000}k`}
                        tick={{ fill: 'var(--admin-text-tertiary)', fontSize: 11, fontWeight: 500 }}
                      />
                      <ChartTooltip
                        formatter={(value) => [`₹${value.toLocaleString()}`, 'Amount']}
                      />
                      <Legend
                        verticalAlign="top"
                        height={36}
                        iconType="circle"
                        iconSize={8}
                        wrapperStyle={{ fontSize: '11px', color: 'var(--admin-text-secondary)' }}
                      />
                      <Bar
                        dataKey="gateway"
                        name="Payment Gateway"
                        stackId="a"
                        fill={CHART_COLORS[0]}
                        radius={[0, 0, 4, 4]}
                      />
                      <Bar
                        dataKey="wallet"
                        name="Wallet Credit"
                        stackId="a"
                        fill={CHART_COLORS[1]}
                      />
                      <Bar
                        dataKey="storeCredit"
                        name="Store Credit"
                        stackId="a"
                        fill={CHART_COLORS[2]}
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>
            </div>

            <div className="lg:col-span-1">
              <motion.div variants={fadeUp} className="admin-card overflow-hidden">
                <div className="p-5 border-b border-[var(--admin-border-subtle)] flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[var(--admin-domain-danger-bg)] flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[16px] text-[var(--admin-domain-danger)]">
                      warning
                    </span>
                  </div>
                  <div>
                    <h3 className="text-[14px] font-bold text-[var(--admin-text-primary)]">
                      Failed Refunds
                    </h3>
                    <p className="text-[11px] text-[var(--admin-text-tertiary)]">
                      Requires manual action
                    </p>
                  </div>
                </div>
                <div className="p-0">
                  <div className="flex flex-col divide-y divide-[var(--admin-border-subtle)] max-h-[350px] overflow-y-auto">
                    {failedList?.length > 0 ? (
                      failedList.map((failure) => (
                        <div
                          key={failure._id}
                          className="p-4 hover:bg-[var(--admin-surface-muted)] transition-colors cursor-pointer group"
                        >
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-[13px] font-bold text-[var(--admin-text-primary)] group-hover:text-[var(--admin-accent)] transition-colors">
                              {failure.returnRequestId?.returnId || 'Unknown'}
                            </span>
                            <span className="text-[13px] font-bold text-[var(--admin-domain-danger)]">
                              ₹{(failure.amount || 0).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-[11px] font-medium text-[var(--admin-text-secondary)] mb-1">
                            Original Payment:{' '}
                            <span className="uppercase tracking-wider">{failure.refundMethod}</span>
                          </p>
                          <p className="text-[11px] text-[var(--admin-domain-danger)] mb-3 bg-[var(--admin-domain-danger-bg)] px-2 py-1 rounded inline-block">
                            Error: {failure.errorDetails || 'Unknown error'}
                          </p>
                          <button className="admin-btn admin-btn-sm admin-btn-outline w-full justify-center">
                            Mark for Manual Retry
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="p-6 text-center text-[var(--admin-text-tertiary)] text-[12px] font-medium">
                        No failed refunds requiring action.
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
};

export default AdminRefundDashboard;
