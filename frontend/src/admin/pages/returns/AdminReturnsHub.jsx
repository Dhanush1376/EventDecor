import React, { useEffect, useState } from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useReturnManagement } from '../../hooks/useReturnManagement';
import {
  PageHeader,
  StatusBadge,
  EmptyState,
  SkeletonTable,
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

const RETURN_STATUSES = [
  { value: 'submitted', label: 'Submitted' },
  { value: 'approved', label: 'Approved' },
  { value: 'return_courier_assigned', label: 'Courier Assigned' },
  { value: 'return_picked_up', label: 'Picked Up' },
  { value: 'return_in_transit', label: 'In Transit' },
  { value: 'return_received', label: 'Received' },
  { value: 'inspection_started', label: 'Inspection Started' },
  { value: 'inspection_completed', label: 'Inspection Completed' },
  { value: 'refund_initiated', label: 'Refund Initiated' },
  { value: 'refund_completed', label: 'Refund Completed' },
  { value: 'completed', label: 'Completed' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'cancelled', label: 'Cancelled' },
];

const VALID_TRANSITIONS = {
  submitted: ['approved', 'rejected', 'cancelled'],
  approved: ['return_courier_assigned', 'cancelled'],
  return_courier_assigned: ['return_picked_up', 'cancelled'],
  return_picked_up: ['return_in_transit', 'return_received'],
  return_in_transit: ['return_received'],
  return_received: ['inspection_started'],
  inspection_started: ['inspection_completed', 'rejected'],
  inspection_completed: ['refund_initiated'],
  refund_initiated: ['refund_completed'],
  refund_completed: ['completed'],
  completed: [],
  rejected: [],
  cancelled: [],
};

const getCardColorClass = (req) => {
  if (req?.sla?.isOverdue || req?.priority === 'critical') {
    return '!bg-red-500/10 !border-red-500/30';
  }
  if (req?.priority === 'high') {
    return '!bg-orange-500/10 !border-orange-500/30';
  }

  const s = (req?.status || '').toLowerCase();
  switch (s) {
    case 'completed':
    case 'resolved':
      return '!bg-[#7a8b76]/10 border-[#7a8b76]/30';
    case 'approved':
      return '!bg-[#6b8ead]/10 border-[#6b8ead]/30';
    case 'rejected':
      return '!bg-[#bc6c5c]/10 border-[#bc6c5c]/30';
    default:
      // Separate normal returns and exchanges by color
      if (req?.returnType === 'exchange') {
        return '!bg-blue-500/10 border-blue-500/20';
      }
      return '!bg-yellow-500/10 border-yellow-500/20';
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
    transitionStatus,
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
    <motion.div initial="hidden" animate="show" variants={stagger} className="flex flex-col h-full">
      {!hideHeader && (
        <div className="shrink-0 pb-2">
          <PageHeader
            title="Returns & Refunds"
            subtitle="Manage returns and exchanges"
            icon="undo"
            iconColor="warning"
            mobileRow={false}
            headerAction={
              <div className="flex flex-col sm:flex-row items-stretch gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64 shrink-0 bg-[var(--admin-surface-muted)] rounded-[4px] border border-[var(--admin-border)] flex items-center px-3">
                  <span className="material-symbols-outlined text-[18px] text-[var(--admin-text-tertiary)] shrink-0">
                    search
                  </span>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search returns..."
                    className="bg-transparent border-none outline-none w-full text-[13px] text-[var(--admin-text-primary)] placeholder-[var(--admin-text-tertiary)] font-medium px-2 h-10 sm:h-8"
                  />
                </div>
              </div>
            }
          />
        </div>
      )}

      <div className="flex-1 overflow-y-auto scrollbar-hide space-y-6 pb-10 pr-1">
        <motion.div variants={fadeUp} className="admin-card overflow-hidden text-left relative p-0">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-[var(--admin-border-strong)] z-10" />
          <div className="grid grid-cols-2 md:grid-cols-4 bg-[var(--admin-surface)]">
            <div className="p-5 space-y-1 border-r border-b md:border-b-0 border-[var(--admin-border-subtle)]">
              <span className="text-[10px] text-[var(--admin-text-tertiary)] font-bold uppercase tracking-wider">
                Pending Returns
              </span>
              <p className="text-[14px] font-bold text-[var(--admin-text-primary)]">
                {stats.pendingReturns || 0}
              </p>
              <span className="text-[10px] text-[var(--admin-text-secondary)] mt-1 block">
                Awaiting approval
              </span>
            </div>
            <div className="p-5 space-y-1 border-b md:border-b-0 md:border-r border-[var(--admin-border-subtle)]">
              <span className="text-[10px] text-[var(--admin-warning)] font-bold uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[var(--admin-warning)] animate-pulse" />
                Pending Pickups
              </span>
              <p className="text-[14px] font-bold text-[var(--admin-text-primary)]">
                {stats.pendingPickups || 0}
              </p>
              <span className="text-[10px] text-[var(--admin-text-secondary)] mt-1 block">
                Logistics scheduled
              </span>
            </div>
            <div className="p-5 space-y-1 border-r border-[var(--admin-border-subtle)]">
              <span className="text-[10px] text-[var(--admin-text-tertiary)] font-bold uppercase tracking-wider">
                Exchange Requests
              </span>
              <p className="text-[14px] font-bold text-[var(--admin-text-primary)]">
                {stats.exchangeRequests || 0}
              </p>
              <span className="text-[10px] text-[var(--admin-text-secondary)] mt-1 block">
                Product swaps
              </span>
            </div>
            <div className="p-5 space-y-1 bg-[var(--admin-danger)]/5 border-l-0">
              <span className="text-[10px] text-[var(--admin-danger)] font-bold uppercase tracking-wider">
                High Fraud Risk
              </span>
              <p className="text-[14px] font-bold text-[var(--admin-danger)]">
                {stats.fraudAlerts || 0}
              </p>
              <span className="text-[10px] text-[var(--admin-danger)] opacity-80 mt-1 block">
                Needs investigation
              </span>
            </div>
          </div>
        </motion.div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="w-full flex flex-col sm:flex-row justify-between gap-4">
            <div className="w-full">
              <FilterBar
                filters={TABS.map((t) => t.label)}
                value={activeTab}
                onChange={(val) => {
                  setActiveTab(val);
                  setSelectedIds([]);
                }}
              />
            </div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {loading && !returnsList?.length ? (
            <motion.div
              key="loading"
              initial="hidden"
              animate="show"
              exit="hidden"
              variants={fadeUp}
            >
              <SkeletonTable rows={10} cols={7} />
            </motion.div>
          ) : (
            <motion.div
              key="table"
              initial="hidden"
              animate="show"
              exit="hidden"
              variants={fadeUp}
              className="w-full relative"
            >
              <AnimatePresence>
                {selectedIds.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-0 left-0 right-0 z-20 flex items-center gap-3 bg-[var(--admin-surface)] px-4 py-3 border-b border-[var(--admin-border-strong)] shadow-sm"
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

              <div className="hidden md:block admin-card overflow-x-auto p-0">
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
                      <th className="w-1/3">Return Details</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th className="text-right pr-5">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {returnsList.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-16 text-center">
                          <EmptyState
                            icon={searchTerm ? 'search_off' : 'inventory_2'}
                            title={searchTerm ? 'No Matches Found' : 'No Returns Found'}
                            description={
                              searchTerm
                                ? 'No returns match your search.'
                                : `There are no return requests matching the "${activeTab}" criteria.`
                            }
                          />
                        </td>
                      </tr>
                    ) : (
                      returnsList.map((req) => (
                        <tr key={req._id} className={`group ${getCardColorClass(req)}`}>
                          <td className="pl-5">
                            <input
                              type="checkbox"
                              className="admin-checkbox"
                              checked={selectedIds.includes(req._id)}
                              onChange={(e) => handleSelectOne(e, req._id)}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </td>
                          <td className="font-semibold text-[var(--admin-text-primary)]">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                {req.returnId || req._id.substring(0, 8)}
                              </div>
                              <div
                                className="text-[11px] text-blue-500 hover:text-blue-600 hover:underline mt-1 cursor-pointer w-max"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (req.orderId) {
                                    navigate(`/admin/orders/${req.orderId._id || req.orderId}`);
                                  }
                                }}
                                title="View Original Order"
                              >
                                Ord:{' '}
                                {req.orderId
                                  ? req.orderId.orderId ||
                                    (req.orderId._id || req.orderId).toString().substring(0, 8)
                                  : 'Deleted'}
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="flex flex-col">
                              <span className="font-semibold text-[var(--admin-text-primary)]">
                                {req.userId?.name || 'Guest User'}
                              </span>
                              {req.fraudScore >= 50 && (
                                <div className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-500 w-max">
                                  <span className="material-symbols-outlined text-[12px]">
                                    warning
                                  </span>
                                  High Risk ({req.fraudScore})
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="max-w-[300px] py-3 pr-4">
                            {req.items && req.items[0] && (
                              <div className="flex gap-3 items-start">
                                <div className="w-12 h-12 rounded bg-[var(--admin-surface-muted)] border border-[var(--admin-border)] shrink-0 overflow-hidden flex items-center justify-center">
                                  <img
                                    src={
                                      req.items[0].imageSrc ||
                                      req.items[0].productId?.imageSrc ||
                                      '/placeholder.png'
                                    }
                                    alt="Product"
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      e.target.src = '/placeholder.png';
                                    }}
                                  />
                                </div>
                                <div className="flex flex-col gap-0.5 min-w-0">
                                  <span
                                    className="text-[12px] font-bold text-[var(--admin-text-primary)] truncate"
                                    title={req.items[0].title || req.items[0].productId?.title}
                                  >
                                    {req.items[0].title ||
                                      req.items[0].productId?.title ||
                                      'Unknown Product'}
                                    <span className="ml-1 text-[var(--admin-text-secondary)] font-medium">
                                      (x{req.items[0].returnQuantity || 1})
                                    </span>
                                  </span>
                                  <div
                                    className="text-[10px] text-[var(--admin-text-secondary)] line-clamp-1"
                                    title={`${req.items[0].reason}${req.items[0].description ? ` - ${req.items[0].description}` : ''}`}
                                  >
                                    <span className="font-semibold text-[var(--admin-text-primary)]">
                                      {req.items[0].reason}
                                    </span>
                                    {req.items[0].description && ` - ${req.items[0].description}`}
                                  </div>
                                  <div className="flex items-center flex-wrap gap-1.5 mt-1">
                                    <span
                                      className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded w-max ${
                                        req.returnType === 'exchange'
                                          ? 'bg-purple-100 text-purple-700'
                                          : 'bg-blue-100 text-blue-700'
                                      }`}
                                    >
                                      {req.returnType === 'exchange' ? 'Exchange' : 'Return'}
                                    </span>
                                    <span className="text-[9px] font-medium text-[var(--admin-text-tertiary)] uppercase bg-[var(--admin-surface-muted)] border border-[var(--admin-border)] px-1.5 py-0.5 rounded flex items-center gap-1">
                                      <span className="material-symbols-outlined text-[10px]">
                                        payments
                                      </span>
                                      {req.refundMethod || 'Original'}
                                    </span>
                                    {req.approvalLevel && req.approvalLevel !== 'auto' && (
                                      <span className="text-[9px] font-medium text-[var(--admin-warning)] bg-[var(--admin-warning)]/10 border border-[var(--admin-warning)]/20 px-1.5 py-0.5 rounded flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[10px]">
                                          admin_panel_settings
                                        </span>
                                        {req.approvalLevel === 'manager'
                                          ? 'Manager Approval'
                                          : 'Senior Admin'}
                                      </span>
                                    )}
                                    {req.items.length > 1 && (
                                      <span className="text-[9px] font-medium text-[var(--admin-text-tertiary)] bg-[var(--admin-surface-muted)] border border-[var(--admin-border)] px-1.5 py-0.5 rounded">
                                        +{req.items.length - 1} more
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="font-bold text-[var(--admin-text-primary)]">
                            ₹
                            {(
                              req.refundBreakdown?.grandTotal ||
                              req.refundAmount?.total ||
                              0
                            ).toLocaleString()}
                          </td>
                          <td>
                            <div className="flex flex-col items-start gap-1.5">
                              <div className="relative group w-max">
                                <select
                                  value={req.status || 'submitted'}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    transitionStatus(req._id, {
                                      status: e.target.value,
                                      reason: 'Status updated from Returns Hub table.',
                                    }).then(() => {
                                      // Refresh the list after successful update to reflect changes in current tab
                                      fetchReturnsList({ search: searchTerm });
                                    });
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  className="appearance-none bg-white border border-[var(--admin-border-strong)] text-[10px] font-bold text-[var(--admin-text-primary)] rounded px-2 py-1 pr-6 cursor-pointer outline-none hover:border-blue-400 focus:border-blue-500 shadow-sm uppercase tracking-wider transition-colors"
                                >
                                  {RETURN_STATUSES.filter(
                                    (s) =>
                                      s.value === req.status ||
                                      (VALID_TRANSITIONS[req.status] || []).includes(s.value),
                                  ).map((s) => (
                                    <option key={s.value} value={s.value}>
                                      {s.label}
                                    </option>
                                  ))}
                                </select>
                                <span className="material-symbols-outlined absolute right-1.5 top-1/2 -translate-y-1/2 text-[14px] text-[var(--admin-text-tertiary)] pointer-events-none">
                                  expand_more
                                </span>
                              </div>
                              <span className="text-[10px] text-[var(--admin-text-tertiary)] font-medium">
                                {new Date(req.createdAt).toLocaleString('en-IN', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                              {(req.sla?.isOverdue ||
                                (req.priority &&
                                  req.priority !== 'low' &&
                                  req.priority !== 'medium')) && (
                                <div className="flex flex-col gap-1 mt-0.5">
                                  {req.sla?.isOverdue && (
                                    <span className="text-[9px] font-bold text-white bg-red-600 border border-red-700 px-1.5 py-0.5 rounded flex items-center gap-1 w-max shadow-sm">
                                      <span className="material-symbols-outlined text-[10px]">
                                        timer_off
                                      </span>{' '}
                                      Overdue
                                    </span>
                                  )}
                                  {req.priority &&
                                    req.priority !== 'low' &&
                                    req.priority !== 'medium' && (
                                      <span
                                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 w-max capitalize shadow-sm ${
                                          req.priority === 'critical'
                                            ? 'text-white bg-red-600 border border-red-700'
                                            : 'text-orange-700 bg-orange-100 border border-orange-300'
                                        }`}
                                      >
                                        <span className="material-symbols-outlined text-[10px]">
                                          {req.priority === 'critical'
                                            ? 'warning'
                                            : 'priority_high'}
                                        </span>{' '}
                                        {req.priority}
                                      </span>
                                    )}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="text-right pr-5" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => navigate(`/admin/returns/requests/${req._id}`)}
                                className="admin-btn-icon w-8 h-8 p-0 min-h-0 text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)]"
                                title="Review Request"
                              >
                                <span className="material-symbols-outlined text-[16px]">
                                  visibility
                                </span>
                              </button>
                              <button
                                onClick={() =>
                                  navigate(`/admin/orders/${req.orderId?._id || req.orderId}`)
                                }
                                disabled={!req.orderId}
                                className="admin-btn-icon w-8 h-8 p-0 min-h-0 text-[var(--admin-text-tertiary)] hover:text-blue-500 disabled:opacity-50"
                                title="View Original Order"
                              >
                                <span className="material-symbols-outlined text-[16px]">
                                  receipt_long
                                </span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile View Placeholder */}
              <div className="md:hidden flex flex-col gap-3 px-1 py-3">
                {returnsList.length === 0 ? (
                  <div className="py-10 text-center flex flex-col items-center justify-center bg-[var(--admin-surface)] rounded-[var(--admin-radius-lg)]">
                    <EmptyState
                      icon={searchTerm ? 'search_off' : 'inventory_2'}
                      title={searchTerm ? 'No Matches Found' : 'No Returns Found'}
                      description={
                        searchTerm
                          ? 'No returns match your search.'
                          : `There are no return requests matching the "${activeTab}" criteria.`
                      }
                    />
                  </div>
                ) : (
                  returnsList.map((req) => (
                    <div
                      key={req._id}
                      onClick={() => navigate(`/admin/returns/requests/${req._id}`)}
                      className={`${getCardColorClass(req.status)} rounded-[var(--admin-radius-lg)] p-4 shadow-sm border flex flex-col gap-3 cursor-pointer hover:shadow-md transition-all`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <span className="font-bold text-[var(--admin-text-primary)] text-[14px]">
                            {req.returnId || req._id.substring(0, 8)}
                          </span>
                          <span className="text-[11px] font-medium text-[var(--admin-text-secondary)] block mt-0.5">
                            {req.userId?.name || 'Guest User'}
                          </span>
                        </div>
                        <StatusBadge status={req.status || 'submitted'} />
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <span className="font-bold text-[var(--admin-text-primary)] text-[14px]">
                          ₹{(req.refundAmount?.total || 0).toLocaleString()}
                        </span>
                        <span
                          className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded w-max ${
                            req.type === 'exchange'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {req.type || 'Refund'}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
