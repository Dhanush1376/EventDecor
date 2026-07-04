import React, { useState, useEffect } from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';
import { PageHeader, fadeUp, stagger, StatCard, SkeletonDashboard } from '../components/AdminUIKit';
import api from '../../services/api';
import { toast } from 'react-hot-toast';

export default function AdminApprovalsQueue() {
  const [approvals, setApprovals] = useState([]);
  const [stats, setStats] = useState({ approvedToday: 0, rejectedToday: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApprovals();
  }, []);

  const fetchApprovals = async () => {
    try {
      setLoading(true);
      const [res, statsRes] = await Promise.all([
        api.get('/api/v1/admin/approvals'),
        api.get('/api/v1/admin/approvals/stats'),
      ]);

      if (res.data?.success) {
        setApprovals(res.data.data);
      }
      if (statsRes.data?.success) {
        setStats(statsRes.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch approvals:', error);
      toast.error('Failed to load approvals');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id, action) => {
    // Keep a copy of the old state to revert if the API fails
    const previousApprovals = [...approvals];

    // Optimistic UI update
    setApprovals(approvals.filter((a) => a._id !== id));

    try {
      if (action === 'approve') {
        await api.post(`/api/v1/admin/approvals/${id}/approve`);
        toast.success('Request approved successfully');
        setStats((s) => ({ ...s, approvedToday: s.approvedToday + 1 }));
      } else {
        await api.post(`/api/v1/admin/approvals/${id}/reject`);
        toast.success('Request rejected');
        setStats((s) => ({ ...s, rejectedToday: s.rejectedToday + 1 }));
      }
    } catch (error) {
      // Revert optimistic update
      setApprovals(previousApprovals);
      console.error(`Failed to ${action} request:`, error);
      toast.error(error?.response?.data?.message || `Failed to ${action} request`);
    }
  };

  return (
    <motion.div initial="hidden" animate="show" variants={stagger} className="w-full space-y-6">
      <PageHeader
        title="Approvals Queue"
        subtitle="Manage pending manager overrides, refunds, and high-risk actions requiring authorization."
        icon="verified_user"
      />

      {loading ? (
        <SkeletonDashboard />
      ) : (
        <>
          {/* Stats Cards */}
          <motion.div variants={fadeUp} className="admin-grid-stats">
            <StatCard
              label="Pending Requests"
              value={approvals.length}
              icon="pending_actions"
              domainColor="warning"
            />
            <StatCard
              label="Approved Today"
              value={stats.approvedToday}
              icon="task_alt"
              domainColor="success"
            />
            <StatCard
              label="Rejected Today"
              value={stats.rejectedToday}
              icon="block"
              domainColor="danger"
            />
          </motion.div>

          <motion.div
            variants={fadeUp}
            className="admin-card p-0 overflow-hidden shadow-lg border border-[var(--admin-border-strong)]"
          >
            <div className="p-6 border-b border-[var(--admin-border-strong)] bg-[var(--admin-surface)] flex items-center justify-between">
              <h3 className="font-bold text-[var(--admin-text-primary)] text-xl tracking-tight">
                Action Required
              </h3>
              <button className="admin-btn admin-btn-sm admin-btn-outline bg-[var(--admin-surface-muted)]">
                <span className="material-symbols-outlined text-[16px]">filter_list</span> Filter
              </button>
            </div>

            {approvals.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-24 text-center text-[var(--admin-text-tertiary)] flex flex-col items-center bg-[var(--admin-surface)]"
              >
                <div className="w-24 h-24 bg-[var(--admin-bg-subtle)] rounded-full flex items-center justify-center mb-6 shadow-inner border border-[var(--admin-border-strong)]">
                  <span className="material-symbols-outlined text-5xl opacity-50">task</span>
                </div>
                <h3 className="text-2xl font-bold text-[var(--admin-text-primary)] mb-2 tracking-tight">
                  All caught up!
                </h3>
                <p className="font-medium text-lg">You have no pending approvals in your queue.</p>
              </motion.div>
            ) : (
              <div className="divide-y divide-[var(--admin-border-subtle)] bg-[var(--admin-surface)]">
                <AnimatePresence>
                  {approvals.map((req) => (
                    <motion.div
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95, height: 0, margin: 0, padding: 0 }}
                      transition={{ duration: 0.3 }}
                      key={req._id}
                      className="p-6 lg:p-8 flex flex-col xl:flex-row xl:items-center justify-between gap-8 hover:bg-[var(--admin-surface-hover)] transition-all overflow-hidden"
                    >
                      <div className="flex-1 flex gap-6">
                        <div className="hidden sm:block">
                          <div
                            className={`w-12 h-12 rounded-[var(--admin-radius-lg)] flex items-center justify-center shadow-inner mt-1 ${req.riskLevel === 'High' ? 'bg-[var(--admin-domain-danger)]/10 text-[var(--admin-domain-danger)]' : 'bg-[var(--admin-warning)]/10 text-[var(--admin-warning)]'}`}
                          >
                            <span className="material-symbols-outlined text-[24px]">
                              {req.riskLevel === 'High' ? 'warning' : 'info'}
                            </span>
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-4 mb-3">
                            <h4 className="font-bold text-[16px] text-[var(--admin-text-primary)] tracking-tight">
                              {req.type}
                            </h4>
                            <span className="text-[11px] font-mono font-bold bg-[var(--admin-bg-subtle)] border border-[var(--admin-border-strong)] px-2 py-0.5 rounded text-[var(--admin-text-secondary)] shadow-sm">
                              {req._id}
                            </span>
                            <span
                              className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded tracking-wider shadow-sm ${req.riskLevel === 'High' ? 'bg-[var(--admin-domain-danger)] text-white' : 'bg-[var(--admin-warning)] text-white'}`}
                            >
                              {req.riskLevel} Risk
                            </span>
                          </div>
                          <p className="text-[14px] font-medium text-[var(--admin-text-secondary)] mb-5 max-w-4xl leading-relaxed">
                            {req.details}
                          </p>

                          <div className="flex flex-wrap items-center gap-6 text-[13px] font-bold text-[var(--admin-text-secondary)] bg-[var(--admin-bg-subtle)] px-4 py-3 rounded-xl border border-[var(--admin-border-strong)] w-fit shadow-inner">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-[var(--admin-surface-muted)] border border-[var(--admin-border-strong)] shadow-sm flex items-center justify-center text-[10px]">
                                <span className="material-symbols-outlined text-[14px]">
                                  person
                                </span>
                              </div>
                              <span className="text-[var(--admin-text-primary)]">
                                {req.requesterName || req.requesterId || 'System'}
                              </span>
                            </div>
                            <div className="w-px h-4 bg-[var(--admin-border-strong)]"></div>
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-[16px] text-[var(--admin-text-tertiary)]">
                                schedule
                              </span>
                              {new Date(req.createdAt).toLocaleDateString()}
                            </div>
                            <div className="w-px h-4 bg-[var(--admin-border-strong)]"></div>
                            <div className="flex items-center gap-2 text-[var(--admin-success)]">
                              <span className="material-symbols-outlined text-[18px]">
                                payments
                              </span>
                              {req.amount || 'N/A'}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-4 border-t xl:border-t-0 border-[var(--admin-border-subtle)] pt-6 xl:pt-0 pl-[4.5rem] sm:pl-0 xl:w-[320px]">
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => handleAction(req._id, 'approve')}
                            disabled={loading}
                            className="admin-btn admin-btn-primary w-full py-3 group disabled:opacity-50"
                          >
                            <span className="material-symbols-outlined text-[18px]">check</span>
                            Approve
                          </button>
                          <p className="text-[11px] text-[var(--admin-text-tertiary)] font-medium leading-snug px-1 text-center group-hover:text-[var(--admin-accent-text)] transition-colors">
                            <span className="font-bold uppercase block mb-0.5 text-[9px] tracking-wider text-[var(--admin-success)]">
                              If Approved:
                            </span>
                            {req.approveConsequence}
                          </p>
                        </div>

                        <div className="w-full h-px bg-[var(--admin-border-subtle)] my-1"></div>

                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => handleAction(req._id, 'reject')}
                            disabled={loading}
                            className="admin-btn admin-btn-outline w-full py-3 !border-[var(--admin-error)]/30 !text-[var(--admin-error)] hover:!bg-[var(--admin-error)]/10 group disabled:opacity-50"
                          >
                            Reject
                          </button>
                          <p className="text-[11px] text-[var(--admin-text-tertiary)] font-medium leading-snug px-1 text-center group-hover:text-[var(--admin-error)] transition-colors">
                            <span className="font-bold uppercase block mb-0.5 text-[9px] tracking-wider text-[var(--admin-error)]">
                              If Rejected:
                            </span>
                            {req.rejectConsequence}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        </>
      )}
    </motion.div>
  );
}
