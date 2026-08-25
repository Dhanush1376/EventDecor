import React, { useEffect, useState } from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useReturnManagement } from '../../hooks/useReturnManagement';
import {
  PageHeader,
  StatusBadge,
  EmptyState,
  SkeletonTable,
  SkeletonList,
  fadeUp,
  stagger,
  FilterBar,
} from '../../components/AdminUIKit';

const TABS = [
  { id: 'all', label: 'All Returns', icon: 'list_alt' },
  { id: 'needs_attention', label: 'Needs Attention', icon: 'error_outline' },
  { id: 'pending_pickup', label: 'Pending Pickup', icon: 'local_shipping' },
  { id: 'exchanges', label: 'Exchanges', icon: 'swap_horiz' },
  { id: 'fraud', label: 'Fraud Flagged', icon: 'security' },
];

const getCardColorClass = (status) => {
  switch (status) {
    case 'submitted':
      return 'bg-[#d97706]/15 border-[#d97706]/30'; // Ochre
    case 'approved':
      return 'bg-[#64748b]/15 border-[#64748b]/30'; // Slate Blue
    case 'completed':
    case 'resolved':
      return 'bg-[#7a8b76]/15 border-[#7a8b76]/30'; // Sage Green
    case 'rejected':
      return 'bg-[#9e5b5b]/15 border-[#9e5b5b]/30'; // Terracotta
    default:
      return 'bg-[var(--admin-bg-subtle)] border-[var(--admin-border-subtle)] hover:bg-[var(--admin-surface-hover)]';
  }
};

export default function AdminReturnsHub({ hideHeader = false }) {
  const navigate = useNavigate();
  const {
    returnsList,
    dashboardStats,
    fetchReturnsList,
    fetchDashboardStats,
    loading,
    performBulkAction,
  } = useReturnManagement();

  const [activeTab, setActiveTab] = useState('Needs Attention');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);

  useEffect(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats]);

  useEffect(() => {
    const timer = setTimeout(() => {
      let filterParams = { search: searchTerm };

      switch (activeTab) {
        case 'Needs Attention':
          filterParams.status = 'submitted';
          break;
        case 'Pending Pickup':
          filterParams.status = 'approved';
          break;
        case 'Exchanges':
          filterParams.type = 'exchange';
          break;
        case 'Fraud Flagged':
          filterParams.fraudScore = 50;
          break;
        default:
          break;
      }
      fetchReturnsList(filterParams);
    }, 300);

    return () => clearTimeout(timer);
  }, [fetchReturnsList, searchTerm, activeTab]);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(returnsList.map((r) => r._id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (e, id) => {
    if (e.target.checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((item) => item !== id));
    }
  };

  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) return;
    await performBulkAction({ ids: selectedIds, action: 'approve' });
    setSelectedIds([]);
    fetchReturnsList({ status: activeTab === 'Needs Attention' ? 'submitted' : undefined });
  };

  const handleBulkReject = async () => {
    if (selectedIds.length === 0) return;
    await performBulkAction({ ids: selectedIds, action: 'reject' });
    setSelectedIds([]);
    fetchReturnsList({ status: activeTab === 'Needs Attention' ? 'submitted' : undefined });
  };

  const stats = dashboardStats?.stats || {};

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={stagger}
      className="flex flex-col h-full max-w-[1440px] mx-auto w-full"
    >
      {!hideHeader && (
        <div className="shrink-0 mb-6">
          <PageHeader
            title="Returns & Refunds"
            subtitle="Manage returns and exchanges"
            icon="undo"
            iconColor="warning"
          />
        </div>
      )}

      <div className="flex-1 overflow-y-auto scrollbar-hide space-y-6 pb-10">
        <motion.div variants={fadeUp} className="admin-card overflow-hidden text-left relative p-0">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-[var(--admin-border-strong)] z-10" />
          <div className="grid grid-cols-2 md:grid-cols-4 bg-[var(--admin-surface)]">
            <div className="p-5 space-y-1 border-r border-b md:border-b-0 border-[var(--admin-border-subtle)]">
              <span className="text-[10px] text-[var(--admin-warning)] font-bold uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[var(--admin-warning)] animate-pulse" />
                Pending Returns
              </span>
              <p className="text-[14px] sm:text-[16px] font-bold text-[var(--admin-text-primary)]">
                {stats.pendingReturns || 0}
              </p>
              <span className="text-[10px] text-[var(--admin-text-secondary)] mt-1 block">
                Awaiting approval
              </span>
            </div>
            <div className="p-5 space-y-1 border-b md:border-b-0 md:border-r border-[var(--admin-border-subtle)]">
              <span className="text-[10px] text-[var(--admin-info)] font-bold uppercase tracking-wider">
                Pending Pickups
              </span>
              <p className="text-[14px] sm:text-[16px] font-bold text-[var(--admin-text-primary)]">
                {stats.pendingPickups || 0}
              </p>
              <span className="text-[10px] text-[var(--admin-text-secondary)] mt-1 block">
                Logistics scheduled
              </span>
            </div>
            <div className="p-5 space-y-1 border-r border-[var(--admin-border-subtle)]">
              <span className="text-[10px] text-[var(--admin-accent)] font-bold uppercase tracking-wider">
                Exchange Requests
              </span>
              <p className="text-[14px] sm:text-[16px] font-bold text-[var(--admin-text-primary)]">
                {stats.exchangeRequests || 0}
              </p>
              <span className="text-[10px] text-[var(--admin-text-secondary)] mt-1 block">
                Product swaps
              </span>
            </div>
            <div className="p-5 space-y-1 bg-[var(--admin-danger)]/5 col-span-2 md:col-span-1 border-l-0">
              <span className="text-[10px] text-[var(--admin-danger)] font-bold uppercase tracking-wider">
                High Fraud Risk
              </span>
              <p className="text-[14px] sm:text-[16px] font-bold text-[var(--admin-danger)]">
                {stats.fraudAlerts || 0}
              </p>
              <span className="text-[10px] text-[var(--admin-danger)] opacity-80 mt-1 block">
                Needs investigation
              </span>
            </div>
          </div>
        </motion.div>

        <motion.div
          variants={fadeUp}
          className="admin-card p-0 overflow-hidden shadow-lg flex flex-col"
        >
          {/* Hub Tabs */}
          <div className="border-b border-[var(--admin-border-subtle)] bg-[var(--admin-surface)] px-4 pt-3 pb-2 w-full">
            <FilterBar
              filters={TABS.map((t) => t.label)}
              value={activeTab}
              onChange={(val) => {
                setActiveTab(val);
                setSelectedIds([]);
              }}
            />
          </div>

          {/* Toolbar */}
          <div className="p-4 flex flex-col sm:flex-row justify-between items-center gap-4 bg-[var(--admin-bg-subtle)] border-b border-[var(--admin-border-subtle)]">
            <div className="relative w-full sm:max-w-xs">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-[var(--admin-text-tertiary)]">
                search
              </span>
              <input
                type="text"
                placeholder="Search Returns..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="admin-input !pl-10 w-full"
              />
            </div>

            <AnimatePresence>
              {selectedIds.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex items-center gap-3 bg-white dark:bg-[var(--admin-surface)] px-4 py-2 rounded-xl border border-[var(--admin-border-strong)] shadow-sm"
                >
                  <span className="text-[13px] font-bold text-[var(--admin-text-primary)]">
                    {selectedIds.length} selected
                  </span>
                  <button
                    className="admin-btn admin-btn-sm admin-btn-outline !border-[var(--admin-success)] !text-[var(--admin-success)] hover:!bg-[var(--admin-success)]/10"
                    onClick={handleBulkApprove}
                  >
                    <span className="material-symbols-outlined text-[16px]">check</span> Approve
                  </button>
                  <button
                    className="admin-btn admin-btn-sm admin-btn-outline !border-[var(--admin-error)] !text-[var(--admin-error)] hover:!bg-[var(--admin-error)]/10"
                    onClick={handleBulkReject}
                  >
                    <span className="material-symbols-outlined text-[16px]">close</span> Reject
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Unified Table */}
          {loading && !returnsList?.length ? (
            <div className="p-4">
              <div className="hidden md:block">
                <SkeletonTable cols={7} rows={5} />
              </div>
              <div className="md:hidden">
                <SkeletonList items={5} />
              </div>
            </div>
          ) : returnsList?.length === 0 ? (
            <div className="p-12">
              <EmptyState
                icon="inventory_2"
                title="No returns found"
                description={`There are no return requests matching the "${activeTab}" criteria.`}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="admin-table w-full min-w-[900px]">
                <thead>
                  <tr>
                    <th className="w-12 pl-5">
                      <input
                        type="checkbox"
                        className="admin-checkbox"
                        checked={
                          returnsList.length > 0 && selectedIds.length === returnsList.length
                        }
                        onChange={handleSelectAll}
                      />
                    </th>
                    <th>ID</th>
                    <th>Customer</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th className="text-right pr-5">Next Step</th>
                  </tr>
                </thead>
                <tbody>
                  {returnsList.map((req) => (
                    <tr
                      key={req._id}
                      className={`cursor-pointer hover:border-[var(--admin-border-strong)] transition-all duration-300 border-l-4 border-l-transparent hover:border-l-[var(--admin-accent)] border-b ${getCardColorClass(req.status)}`}
                      onClick={(e) => {
                        if (e.target.type !== 'checkbox' && !e.target.closest('button')) {
                          navigate(`/admin/returns/requests/${req._id}`);
                        }
                      }}
                    >
                      <td className="pl-5">
                        <input
                          type="checkbox"
                          className="admin-checkbox"
                          checked={selectedIds.includes(req._id)}
                          onChange={(e) => handleSelectOne(e, req._id)}
                        />
                      </td>
                      <td>
                        <div className="text-[13px] font-bold text-[var(--admin-text-primary)]">
                          {req.returnId || req._id.substring(0, 8)}
                        </div>
                        <div className="text-[11px] text-[var(--admin-text-tertiary)] mt-1">
                          Ord: {req.orderId?.orderId || req.orderId?._id?.substring(0, 8)}
                        </div>
                      </td>
                      <td>
                        <div className="text-[13px] font-bold text-[var(--admin-text-primary)]">
                          {req.userId?.name || 'Guest User'}
                        </div>
                        {req.fraudScore >= 50 && (
                          <div className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-500">
                            <span className="material-symbols-outlined text-[12px]">warning</span>
                            High Risk ({req.fraudScore})
                          </div>
                        )}
                      </td>
                      <td>
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded text-[11px] font-bold uppercase ${req.type === 'exchange' ? 'bg-purple-500/10 text-purple-600' : 'bg-blue-500/10 text-blue-600'}`}
                        >
                          {req.type || 'Refund'}
                        </span>
                      </td>
                      <td>
                        <div className="text-[13px] font-bold text-[var(--admin-success)]">
                          ₹{(req.refundAmount?.total || 0).toLocaleString()}
                        </div>
                      </td>
                      <td>
                        <StatusBadge status={req.status || 'submitted'} />
                      </td>
                      <td className="pr-5 text-right">
                        <button
                          className="admin-btn admin-btn-sm admin-btn-primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/admin/returns/requests/${req._id}`);
                          }}
                        >
                          Review
                          <span className="material-symbols-outlined text-[16px]">
                            arrow_forward
                          </span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
