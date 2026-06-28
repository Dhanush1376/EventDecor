import React, { useEffect, useState } from 'react';
import { m as motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useReturnManagement } from '../../hooks/useReturnManagement';
import {
  PageHeader,
  EmptyState,
  SkeletonTable,
  SkeletonList,
  FilterBar,
  fadeUp,
  stagger,
} from '../../components/AdminUIKit';

const AdminFraudDetection = () => {
  const {
    fraudAlerts,
    highRiskCustomers,
    fetchFraudAlerts,
    fetchHighRiskCustomers,
    loading,
    error,
  } = useReturnManagement();

  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState('All');

  useEffect(() => {
    fetchFraudAlerts();
    fetchHighRiskCustomers();
  }, [fetchFraudAlerts, fetchHighRiskCustomers]);

  if (error) {
    return (
      <EmptyState
        icon="error_outline"
        title="Failed to load fraud data"
        description={error}
        action={
          <button
            className="admin-btn admin-btn-primary"
            onClick={() => {
              fetchFraudAlerts();
              fetchHighRiskCustomers();
            }}
          >
            Try Again
          </button>
        }
      />
    );
  }

  const alerts = fraudAlerts || [];
  const suspiciousCustomers = highRiskCustomers || [];
  const metrics = { totalBlocked: 0, avgRiskScore: 0, savedRevenue: 0 };

  return (
    <motion.div initial="hidden" animate="show" variants={stagger} className="space-y-6">
      <PageHeader
        title="Fraud Detection"
        subtitle="AI-driven anomaly detection, risk scoring, and policy abuse prevention"
        icon="security"
        iconColor="danger"
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
        <div className="md:col-span-3 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="w-full flex flex-col sm:flex-row gap-4">
              <FilterBar
                filters={['All', 'High Risk', 'Medium Risk', 'Low Risk']}
                value={riskFilter}
                onChange={setRiskFilter}
              />
              <div className="w-full sm:max-w-[250px] relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[var(--admin-text-tertiary)] text-[18px]">
                  search
                </span>
                <input
                  type="text"
                  className="admin-input !pl-10 py-2 w-full text-[12px]"
                  placeholder="Search Customer, Email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>

          <motion.div variants={fadeUp} className="admin-card">
            {loading && suspiciousCustomers.length === 0 ? (
              <>
                <div className="hidden md:block">
                  <SkeletonTable
                    cols={6}
                    rows={5}
                    className="border-0 shadow-none bg-transparent"
                  />
                </div>
                <div className="md:hidden">
                  <SkeletonList items={5} className="border-0 shadow-none bg-transparent" />
                </div>
              </>
            ) : suspiciousCustomers.length === 0 ? (
              <div className="p-10">
                <EmptyState
                  icon="verified_user"
                  title="No suspicious activity found"
                  description="Your return metrics look healthy."
                />
              </div>
            ) : (
              <>
                <div className="hidden md:block overflow-x-auto">
                  <table className="admin-table w-full min-w-[800px]">
                    <thead>
                      <tr>
                        <th className="pl-5">Customer</th>
                        <th>Total Returns</th>
                        <th>Return Value</th>
                        <th>Risk Score</th>
                        <th>Primary Reason</th>
                        <th className="text-right pr-5">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {suspiciousCustomers.map((customer) => (
                        <tr
                          key={customer.userId}
                          className={
                            customer.riskScore > 80 ? 'bg-[var(--admin-domain-danger-bg)]' : ''
                          }
                        >
                          <td className="pl-5">
                            <div className="font-semibold text-[var(--admin-text-primary)]">
                              {customer.name}
                            </div>
                            <div className="text-[12px] text-[var(--admin-text-secondary)]">
                              {customer.email}
                            </div>
                          </td>
                          <td>
                            <div className="text-[14px] font-bold text-[var(--admin-text-primary)]">
                              {customer.totalReturns}
                            </div>
                            <div className="text-[11px] text-[var(--admin-text-tertiary)]">
                              Lifetime
                            </div>
                          </td>
                          <td>
                            <div className="font-semibold text-[var(--admin-text-primary)]">
                              ₹{customer.totalReturnValue?.toLocaleString()}
                            </div>
                          </td>
                          <td>
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-[13px] font-bold ${
                                  customer.riskScore > 80
                                    ? 'text-[var(--admin-domain-danger)]'
                                    : customer.riskScore > 50
                                      ? 'text-[var(--admin-domain-warning)]'
                                      : 'text-[var(--admin-domain-info)]'
                                }`}
                              >
                                {customer.riskScore}/100
                              </span>
                              <div className="w-16 h-1.5 bg-[var(--admin-surface-muted)] rounded-full overflow-hidden">
                                <div
                                  className={`h-1.5 rounded-full ${
                                    customer.riskScore > 80
                                      ? 'bg-[var(--admin-domain-danger)]'
                                      : customer.riskScore > 50
                                        ? 'bg-[var(--admin-domain-warning)]'
                                        : 'bg-[var(--admin-domain-info)]'
                                  }`}
                                  style={{ width: `${customer.riskScore}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="bg-[var(--admin-surface-muted)] text-[var(--admin-text-secondary)] px-2 py-1 rounded-[var(--admin-radius-sm)] text-[11px] font-bold uppercase tracking-wider">
                              {customer.primaryReason || 'Multiple'}
                            </span>
                          </td>
                          <td className="text-right pr-5">
                            <button className="admin-btn admin-btn-sm admin-btn-outline">
                              Review Profile
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex md:hidden flex-col gap-3 p-3 bg-[var(--admin-bg-subtle)]">
                  {suspiciousCustomers.map((customer) => (
                    <div
                      key={customer.userId}
                      className="bg-[var(--admin-surface)] rounded-[var(--admin-radius-lg)] p-4 shadow-sm border border-[var(--admin-border)] flex flex-col gap-3"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <span className="font-bold text-[var(--admin-text-primary)] text-[14px]">
                            {customer.name}
                          </span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[11px] font-medium text-[var(--admin-text-secondary)] block">
                              {customer.email}
                            </span>
                          </div>
                        </div>
                        <span
                          className={`text-[13px] font-bold ${
                            customer.riskScore > 80
                              ? 'text-[var(--admin-domain-danger)]'
                              : customer.riskScore > 50
                                ? 'text-[var(--admin-domain-warning)]'
                                : 'text-[var(--admin-domain-info)]'
                          }`}
                        >
                          Score: {customer.riskScore}/100
                        </span>
                      </div>

                      <div className="pt-2 pb-2 border-y border-[var(--admin-border-subtle)]">
                        <div className="flex justify-between text-[12px] mb-1">
                          <span className="text-[var(--admin-text-secondary)]">Total Returns:</span>
                          <span className="font-bold text-[var(--admin-text-primary)]">
                            {customer.totalReturns}
                          </span>
                        </div>
                        <div className="flex justify-between text-[12px]">
                          <span className="text-[var(--admin-text-secondary)]">Return Value:</span>
                          <span className="font-bold text-[var(--admin-text-primary)]">
                            ₹{customer.totalReturnValue?.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="bg-[var(--admin-surface-muted)] text-[var(--admin-text-secondary)] px-2 py-1 rounded-[var(--admin-radius-sm)] text-[11px] font-bold uppercase tracking-wider">
                          {customer.primaryReason || 'Multiple'}
                        </span>
                        <button className="admin-btn admin-btn-sm admin-btn-outline">Review</button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </motion.div>
        </div>

        <div className="md:col-span-1 space-y-6">
          <motion.div variants={fadeUp} className="admin-card overflow-hidden">
            <div className="p-4 border-b border-[var(--admin-border-subtle)] flex items-center justify-between">
              <h3 className="text-[14px] font-bold text-[var(--admin-text-primary)]">
                Fraud Metrics
              </h3>
            </div>
            <div className="p-0 flex flex-col divide-y divide-[var(--admin-border-subtle)]">
              <div className="p-4 flex items-center justify-between">
                <span className="text-[13px] font-medium text-[var(--admin-text-secondary)]">
                  Total Blocked
                </span>
                <span className="text-[16px] font-bold text-[var(--admin-text-primary)]">
                  {metrics.totalBlocked || 0}
                </span>
              </div>
              <div className="p-4 flex items-center justify-between">
                <span className="text-[13px] font-medium text-[var(--admin-text-secondary)]">
                  Avg Risk Score
                </span>
                <span className="text-[16px] font-bold text-[var(--admin-domain-warning)]">
                  {metrics.avgRiskScore || 0}
                </span>
              </div>
              <div className="p-4 flex items-center justify-between bg-[var(--admin-surface-muted)]">
                <span className="text-[13px] font-bold text-[var(--admin-text-primary)] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-[var(--admin-domain-success)]">
                    verified_user
                  </span>
                  Saved Revenue
                </span>
                <span className="text-[16px] font-bold text-[var(--admin-domain-success)]">
                  ₹{(metrics.savedRevenue || 0).toLocaleString()}
                </span>
              </div>
            </div>
          </motion.div>

          <motion.div variants={fadeUp} className="admin-card overflow-hidden">
            <div className="p-4 border-b border-[var(--admin-border-subtle)] flex items-center justify-between">
              <h3 className="text-[14px] font-bold text-[var(--admin-text-primary)]">
                Suspicious Alerts
              </h3>
              <span className="bg-[var(--admin-domain-danger)] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                {alerts?.length || 0} New
              </span>
            </div>
            <div className="p-0">
              <div className="flex flex-col divide-y divide-[var(--admin-border-subtle)] max-h-[300px] overflow-y-auto">
                {loading && alerts.length === 0 ? (
                  <SkeletonList
                    items={3}
                    className="border-0 shadow-none bg-transparent rounded-none"
                  />
                ) : alerts.length > 0 ? (
                  alerts.map((alert) => (
                    <div
                      key={alert._id}
                      className="p-4 hover:bg-[var(--admin-surface-hover)] transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-[var(--admin-domain-danger-bg)] flex items-center justify-center shrink-0 mt-0.5">
                          <span className="material-symbols-outlined text-[16px] text-[var(--admin-domain-danger)]">
                            warning
                          </span>
                        </div>
                        <div>
                          <Link
                            to={`/admin/returns/requests/${alert.returnRequestId}`}
                            className="text-[13px] font-bold text-[var(--admin-text-primary)] hover:text-[var(--admin-accent)] transition-colors"
                          >
                            {alert.returnId || 'Return Request'}
                          </Link>
                          <p className="text-[12px] text-[var(--admin-domain-danger)] font-medium mt-1 leading-snug">
                            {alert.reason}
                          </p>
                          <div className="text-[10px] text-[var(--admin-text-tertiary)] mt-2 font-semibold uppercase tracking-wider">
                            {new Date(alert.createdAt).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-[var(--admin-text-tertiary)] text-[12px] font-medium">
                    No active alerts.
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

export default AdminFraudDetection;
