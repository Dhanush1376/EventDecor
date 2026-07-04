import React, { useEffect, useState } from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useReturnManagement } from '../../hooks/useReturnManagement';
import {
  PageHeader,
  StatCard,
  StatusBadge,
  EmptyState,
  SkeletonTable,
  SkeletonList,
  fadeUp,
  stagger,
} from '../../components/AdminUIKit';

const TABS = [
  { id: 'all', label: 'All Returns', icon: 'list_alt' },
  { id: 'needs_attention', label: 'Needs Attention', icon: 'error_outline' },
  { id: 'pending_pickup', label: 'Pending Pickup', icon: 'local_shipping' },
  { id: 'exchanges', label: 'Exchanges', icon: 'swap_horiz' },
  { id: 'fraud', label: 'Fraud Flagged', icon: 'security' },
];

export default function AdminReturnsHub() {
  const navigate = useNavigate();
  const {
    returnsList,
    dashboardStats,
    fetchReturnsList,
    fetchDashboardStats,
    loading,
    performBulkAction,
  } = useReturnManagement();

  const [activeTab, setActiveTab] = useState('needs_attention');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);

  useEffect(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats]);

  useEffect(() => {
    const timer = setTimeout(() => {
      let filterParams = { search: searchTerm };

      switch (activeTab) {
        case 'needs_attention':
          filterParams.status = 'submitted';
          break;
        case 'pending_pickup':
          filterParams.status = 'approved';
          break;
        case 'exchanges':
          filterParams.type = 'exchange';
          break;
        case 'fraud':
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
    fetchReturnsList({ status: activeTab === 'needs_attention' ? 'submitted' : undefined });
  };

  const handleBulkReject = async () => {
    if (selectedIds.length === 0) return;
    await performBulkAction({ ids: selectedIds, action: 'reject' });
    setSelectedIds([]);
    fetchReturnsList({ status: activeTab === 'needs_attention' ? 'submitted' : undefined });
  };

  const stats = dashboardStats?.stats || {};

  return (
    <motion.div initial="hidden" animate="show" variants={stagger} className="space-y-6">
      <PageHeader
        title="Returns & Refunds Hub"
        subtitle="Unified command center for reverse logistics, exchanges, and financial processing."
        icon="undo"
        iconColor="warning"
      />

      {/* Top Stats */}
      <motion.div variants={fadeUp} className="admin-grid-stats">
        <StatCard
          label="Pending Returns"
          value={stats.pendingReturns || 0}
          icon="error"
          domainColor="warning"
        />
        <StatCard
          label="Pending Pickups"
          value={stats.pendingPickups || 0}
          icon="local_shipping"
          domainColor="info"
        />
        <StatCard
          label="Exchange Requests"
          value={stats.exchangeRequests || 0}
          icon="swap_horiz"
          domainColor="accent"
        />
        <StatCard
          label="High Fraud Risk"
          value={stats.fraudAlerts || 0}
          icon="security"
          domainColor="danger"
        />
      </motion.div>

      <motion.div
        variants={fadeUp}
        className="admin-card p-0 overflow-hidden shadow-lg flex flex-col"
      >
        {/* Hub Tabs */}
        <div className="flex border-b border-[var(--admin-border-strong)] bg-[var(--admin-surface)] overflow-x-auto hide-scrollbar">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setSelectedIds([]);
              }}
              className={`flex items-center gap-2 px-6 py-4 text-[13px] font-bold whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-[var(--admin-accent)] text-[var(--admin-accent-text)] bg-[var(--admin-accent)]/5'
                  : 'border-transparent text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] hover:bg-[var(--admin-surface-hover)]'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
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
              description={`There are no return requests matching the "${activeTab.replace('_', ' ')}" criteria.`}
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
                      checked={returnsList.length > 0 && selectedIds.length === returnsList.length}
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
                    className="cursor-pointer hover:bg-[var(--admin-surface-hover)] transition-colors"
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
                      <div className="font-mono text-[13px] font-bold text-[var(--admin-text-primary)]">
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
                        <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
