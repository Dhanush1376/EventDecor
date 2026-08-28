import React, { useEffect, useState } from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../../services/api';
import { useConfirm } from '../../../context/ConfirmProvider';
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
  { id: 'fraud', label: 'Fraud Flagged', icon: 'security' },
];

const RETURN_STATUS_GROUPS = [
  {
    label: 'Request Phase',
    options: [
      { value: 'submitted', label: 'Submitted' },
      { value: 'approved', label: 'Approved' },
      { value: 'rejected', label: 'Rejected' },
      { value: 'cancelled', label: 'Cancelled' },
    ],
  },
  {
    label: 'Logistics Phase',
    options: [
      { value: 'return_courier_assigned', label: 'Courier Assigned' },
      { value: 'return_picked_up', label: 'Picked Up' },
      { value: 'return_in_transit', label: 'In Transit' },
      { value: 'return_received', label: 'Received' },
    ],
  },
  {
    label: 'Quality Check Phase',
    options: [
      { value: 'inspection_started', label: 'Inspection Started' },
      { value: 'inspection_completed', label: 'Inspection Completed' },
    ],
  },
  {
    label: 'Refund Phase',
    options: [
      { value: 'refund_initiated', label: 'Refund Initiated' },
      { value: 'refund_completed', label: 'Refund Completed' },
      { value: 'completed', label: 'Completed' },
    ],
  },
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

  const [activeTab, setActiveTab] = useState('All Returns');
  const [searchTerm, setSearchTerm] = useState('');

  const confirm = useConfirm();
  const [selectedIds, setSelectedIds] = useState([]);

  useEffect(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const filterParams = { search: searchTerm, type: 'return' };

      switch (activeTab) {
        case 'Needs Attention':
          filterParams.status = 'submitted';
          break;
        case 'Pending Pickup':
          filterParams.status = 'approved';
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

  const triggerRefund = async (id, method, currentStatus, e) => {
    if (e) e.stopPropagation();
    try {
      const isEarly = !['inspection_passed', 'inspection_completed'].includes(currentStatus);
      const earlyWarning = isEarly
        ? `\n\n⚠️ WARNING: This return is currently in '${currentStatus}' state and has not completed inspection. Are you absolutely sure you want to bypass the process and issue a refund early?`
        : '';

      const confirmed = await confirm({
        title: method === 'wallet' ? 'Confirm Wallet Refund' : 'Confirm Direct Refund',
        message:
          (method === 'wallet'
            ? "Are you sure you want to credit this refund to the customer's wallet?"
            : 'Are you sure you want to process this refund via Razorpay to the original payment source?') +
          earlyWarning,
        confirmText: isEarly ? 'Force Process Refund' : 'Process Refund',
      });
      if (!confirmed) return;
      await api.post(`/returns/admin/${id}/refund`, { method });
      toast.success('Refund triggered successfully!');
      fetchReturnsList({ search: searchTerm, type: 'return' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to trigger refund');
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
          />
        </div>
      )}

      <div className="flex-1 overflow-y-auto scrollbar-hide space-y-6 pb-10 pr-1">
        <motion.div variants={fadeUp} className="admin-card overflow-hidden text-left relative p-0">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-[var(--admin-border-strong)] z-10" />
          <div className="grid grid-cols-2 md:grid-cols-3 bg-[var(--admin-surface)]">
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

        <div className="flex flex-col md:flex-row items-stretch gap-3 w-full">
          <div className="relative w-full md:flex-1 shrink-0 bg-[var(--admin-surface-muted)] rounded border border-[var(--admin-border)] flex items-center px-3 h-14">
            <span className="material-symbols-outlined text-[18px] text-[var(--admin-text-tertiary)] shrink-0">
              search
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search returns..."
              className="bg-transparent border-none outline-none w-full text-[13px] text-[var(--admin-text-primary)] placeholder-[var(--admin-text-tertiary)] font-medium px-2 h-full"
            />
          </div>
          <div className="flex items-stretch gap-2 w-full md:w-auto overflow-hidden">
            <FilterBar
              className="w-full md:w-auto"
              filters={TABS.map((t) => t.label)}
              value={activeTab}
              onChange={(val) => {
                setActiveTab(val);
                setSelectedIds([]);
              }}
            />
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
              <div className="hidden md:block admin-card overflow-x-auto p-0">
                <table className="admin-table w-full min-w-[900px]">
                  <thead>
                    <tr>
                      <th className="pl-5">ID</th>
                      <th>Customer</th>
                      <th className="w-1/3">Return Details</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th className="text-center">Refund Action</th>
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
                          <td className="pl-5 relative overflow-hidden font-semibold text-[var(--admin-text-primary)]">
                            {(req.sla?.isOverdue ||
                              req.priority === 'critical' ||
                              req.priority === 'high') && (
                              <div className="absolute top-0 left-0 w-12 h-12 pointer-events-none z-10 overflow-hidden rounded-tl-md">
                                <div
                                  className={`absolute top-2 -left-7 w-24 text-[7.5px] font-bold text-white text-center uppercase py-[2px] -rotate-45 shadow-sm tracking-wider ${
                                    req.sla?.isOverdue
                                      ? 'bg-red-600'
                                      : req.priority === 'critical'
                                        ? 'bg-red-600'
                                        : 'bg-orange-500'
                                  }`}
                                >
                                  {req.sla?.isOverdue ? 'Overdue' : req.priority}
                                </div>
                              </div>
                            )}
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
                              <span
                                className="font-semibold text-[var(--admin-text-primary)] truncate max-w-[150px]"
                                title={
                                  req.userId?.name ||
                                  req.orderId?.shippingAddress?.name ||
                                  'Guest User'
                                }
                              >
                                {req.userId?.name ||
                                  req.orderId?.shippingAddress?.name ||
                                  'Guest User'}
                              </span>
                              <span className="text-[11px] text-[var(--admin-text-tertiary)] mt-0.5 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[12px]">call</span>
                                {req.pickup?.address?.phone ||
                                  req.userId?.phone ||
                                  req.orderId?.shippingAddress?.phone ||
                                  'N/A'}
                              </span>
                              {(req.pickup?.address?.addressLine1 ||
                                req.pickup?.address?.addressString ||
                                req.orderId?.shippingAddress?.address) && (
                                <span className="text-[10px] text-[var(--admin-text-secondary)] mt-1.5 flex items-start gap-1 leading-tight max-w-[150px]">
                                  <span className="material-symbols-outlined text-[11px] mt-0.5 shrink-0">
                                    location_on
                                  </span>
                                  <span className="truncate whitespace-normal line-clamp-2">
                                    {req.pickup?.address?.addressString ||
                                      req.pickup?.address?.addressLine1 ||
                                      req.orderId?.shippingAddress?.address}
                                    {req.pickup?.address?.city || req.orderId?.shippingAddress?.city
                                      ? `, ${req.pickup?.address?.city || req.orderId?.shippingAddress?.city}`
                                      : ''}
                                  </span>
                                </span>
                              )}
                              {req.fraudScore >= 50 && (
                                <div className="inline-flex items-center gap-1 mt-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-500 w-max">
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
                              req.refundAmount ||
                              0
                            ).toLocaleString()}
                          </td>
                          <td>
                            <div className="flex flex-col items-start gap-1.5">
                              {req.status === 'submitted' ? (
                                <div className="flex items-center gap-1.5 w-max">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      confirm({
                                        title: 'Approve Request',
                                        message: 'Are you sure you want to approve this request?',
                                        confirmText: 'Approve',
                                        type: 'info',
                                      }).then((confirmed) => {
                                        if (confirmed) {
                                          transitionStatus(req._id, {
                                            nextStatus: 'approved',
                                            reason: 'Approved from Returns Hub',
                                          }).then(() => fetchReturnsList({ search: searchTerm }));
                                        }
                                      });
                                    }}
                                    className="bg-blue-600 text-white font-bold px-2.5 py-1 text-[10px] uppercase tracking-wider rounded border border-blue-700 hover:bg-blue-700 transition-colors shadow-sm"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      confirm({
                                        title: 'Reject Request',
                                        message:
                                          'Please provide a reason for rejecting this request:',
                                        isPrompt: true,
                                        promptPlaceholder: 'Enter rejection reason...',
                                        confirmText: 'Reject',
                                        type: 'danger',
                                      }).then((reason) => {
                                        if (reason && typeof reason === 'string') {
                                          transitionStatus(req._id, {
                                            nextStatus: 'rejected',
                                            reason,
                                          }).then(() => fetchReturnsList({ search: searchTerm }));
                                        }
                                      });
                                    }}
                                    className="bg-white text-red-600 font-bold px-2.5 py-1 text-[10px] uppercase tracking-wider rounded border border-red-200 hover:bg-red-50 transition-colors shadow-sm"
                                  >
                                    Reject
                                  </button>
                                </div>
                              ) : (
                                <div className="relative group w-max">
                                  <select
                                    value={req.status}
                                    onChange={(e) => {
                                      e.stopPropagation();
                                      transitionStatus(req._id, {
                                        nextStatus: e.target.value,
                                        reason: 'Status updated from Returns Hub table.',
                                      }).then(() => {
                                        // Refresh the list after successful update to reflect changes in current tab
                                        fetchReturnsList({ search: searchTerm });
                                      });
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="appearance-none bg-white border border-[var(--admin-border-strong)] text-[10px] font-bold text-[var(--admin-text-primary)] rounded px-2 py-1 pr-6 cursor-pointer outline-none hover:border-blue-400 focus:border-blue-500 shadow-sm uppercase tracking-wider transition-colors"
                                  >
                                    {RETURN_STATUS_GROUPS.map((group) => (
                                      <optgroup key={group.label} label={group.label}>
                                        {group.options.map((s) => {
                                          return (
                                            <option key={s.value} value={s.value}>
                                              {s.label}
                                            </option>
                                          );
                                        })}
                                      </optgroup>
                                    ))}
                                  </select>
                                  <span className="material-symbols-outlined absolute right-1.5 top-1/2 -translate-y-1/2 text-[14px] text-[var(--admin-text-tertiary)] pointer-events-none">
                                    expand_more
                                  </span>
                                </div>
                              )}
                              <span className="text-[10px] text-[var(--admin-text-tertiary)] font-medium">
                                {new Date(req.createdAt).toLocaleString('en-IN', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                          </td>
                          <td className="text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center">
                              {(() => {
                                if (
                                  req.status === 'completed' ||
                                  req.status === 'rejected' ||
                                  req.status === 'cancelled'
                                )
                                  return <span className="text-gray-400 text-[12px]">-</span>;

                                if (req.status === 'refund_completed') {
                                  return (
                                    <div
                                      className="flex items-center gap-1 text-green-600 px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full bg-green-50 border border-green-200"
                                      title="Refund Completed"
                                    >
                                      <span className="material-symbols-outlined text-[14px]">
                                        check_circle
                                      </span>
                                      DONE
                                    </div>
                                  );
                                }

                                if (req.status === 'refund_initiated') {
                                  return (
                                    <div
                                      className="flex items-center gap-1 text-orange-600 px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full bg-orange-50 border border-orange-200"
                                      title="Refund Processing"
                                    >
                                      <span className="material-symbols-outlined animate-spin text-[14px]">
                                        progress_activity
                                      </span>
                                      PROCESSING
                                    </div>
                                  );
                                }

                                if (req.status === 'refund_failed') {
                                  return (
                                    <div
                                      className="flex items-center gap-1 text-red-600 px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full bg-red-50 border border-red-200"
                                      title="Refund Failed"
                                    >
                                      <span className="material-symbols-outlined text-[14px]">
                                        error
                                      </span>
                                      FAILED
                                    </div>
                                  );
                                }

                                const isReadyForRefund =
                                  req.status === 'inspection_passed' ||
                                  req.status === 'inspection_completed';

                                return (
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={(e) => {
                                        triggerRefund(req._id, 'wallet', req.status, e);
                                      }}
                                      className={`admin-btn-icon w-8 h-8 p-0 min-h-0 text-[var(--admin-text-tertiary)] hover:text-green-600`}
                                      title={
                                        isReadyForRefund
                                          ? 'Refund to Wallet'
                                          : 'Force Refund to Wallet (Bypass Inspection)'
                                      }
                                    >
                                      <span className="material-symbols-outlined text-[16px]">
                                        account_balance_wallet
                                      </span>
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        triggerRefund(req._id, 'original', req.status, e);
                                      }}
                                      className={`admin-btn-icon w-8 h-8 p-0 min-h-0 text-[var(--admin-text-tertiary)] hover:text-blue-600`}
                                      title={
                                        isReadyForRefund
                                          ? 'Direct Refund (Original Source)'
                                          : 'Force Direct Refund (Bypass Inspection)'
                                      }
                                    >
                                      <span className="material-symbols-outlined text-[16px]">
                                        account_balance
                                      </span>
                                    </button>
                                  </div>
                                );
                              })()}
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
                      className={`${getCardColorClass(req)} relative overflow-hidden rounded-[var(--admin-radius-lg)] p-4 shadow-sm border flex flex-col gap-3 cursor-pointer hover:shadow-md transition-all`}
                    >
                      {(req.sla?.isOverdue ||
                        req.priority === 'critical' ||
                        req.priority === 'high') && (
                        <div className="absolute top-0 left-0 w-12 h-12 pointer-events-none z-10 overflow-hidden rounded-tl-md">
                          <div
                            className={`absolute top-2 -left-7 w-24 text-[7.5px] font-bold text-white text-center uppercase py-[2px] -rotate-45 shadow-sm tracking-wider ${
                              req.sla?.isOverdue
                                ? 'bg-red-600'
                                : req.priority === 'critical'
                                  ? 'bg-red-600'
                                  : 'bg-orange-500'
                            }`}
                          >
                            {req.sla?.isOverdue ? 'Overdue' : req.priority}
                          </div>
                        </div>
                      )}

                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[var(--admin-text-primary)] text-[14px] pl-3">
                              {req.returnId || req._id.substring(0, 8)}
                            </span>
                          </div>
                          <span className="text-[11px] font-medium text-[var(--admin-text-secondary)] block mt-0.5 pl-3">
                            {req.userId?.name || 'Guest User'}
                          </span>
                        </div>
                        <StatusBadge status={req.status || 'submitted'} />
                      </div>

                      {req.items && req.items.length > 0 && (
                        <div className="flex items-center gap-3 bg-[var(--admin-surface-muted)] p-2.5 rounded border border-[var(--admin-border-subtle)]">
                          {req.items[0].imageSrc && (
                            <img
                              src={req.items[0].imageSrc}
                              alt=""
                              className="w-10 h-10 object-cover rounded border border-[var(--admin-border)] shrink-0"
                            />
                          )}
                          <div className="flex flex-col gap-0.5 min-w-0">
                            <span className="text-[12px] font-bold text-[var(--admin-text-primary)] truncate">
                              {req.items[0].title ||
                                req.items[0].productId?.title ||
                                'Unknown Product'}
                              <span className="ml-1 text-[var(--admin-text-secondary)] font-medium">
                                (x{req.items[0].returnQuantity || 1})
                              </span>
                            </span>
                            <div className="text-[10px] text-[var(--admin-text-secondary)] line-clamp-1">
                              <span className="font-semibold text-[var(--admin-text-primary)]">
                                {req.items[0].reason}
                              </span>
                              {req.items[0].description && ` - ${req.items[0].description}`}
                            </div>
                            <div className="flex items-center flex-wrap gap-1.5 mt-1.5">
                              <span className="text-[9px] font-medium text-[var(--admin-text-tertiary)] uppercase bg-[var(--admin-surface)] border border-[var(--admin-border)] px-1.5 py-0.5 rounded flex items-center gap-1">
                                <span className="material-symbols-outlined text-[10px]">
                                  payments
                                </span>
                                {req.refundMethod || 'Original'}
                              </span>
                              {req.items.length > 1 && (
                                <span className="text-[9px] font-medium text-[var(--admin-text-tertiary)] bg-[var(--admin-surface)] border border-[var(--admin-border)] px-1.5 py-0.5 rounded">
                                  +{req.items.length - 1} more
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-1 border-t border-[var(--admin-border-subtle)]">
                        <div className="flex flex-col mt-1">
                          <span className="text-[10px] text-[var(--admin-text-secondary)] mb-0.5">
                            Refund Amount
                          </span>
                          <span className="font-bold text-[var(--admin-text-primary)] text-[14px]">
                            ₹
                            {(
                              req.refundBreakdown?.grandTotal ||
                              req.refundAmount ||
                              0
                            ).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          {req.status === 'submitted' ? (
                            <div className="flex items-center gap-1.5 w-max">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  confirm({
                                    title: 'Approve Request',
                                    message: 'Are you sure you want to approve this request?',
                                    confirmText: 'Approve',
                                    type: 'info',
                                  }).then((confirmed) => {
                                    if (confirmed) {
                                      transitionStatus(req._id, {
                                        nextStatus: 'approved',
                                        reason: 'Approved from Returns Hub',
                                      }).then(() => fetchReturnsList({ search: searchTerm }));
                                    }
                                  });
                                }}
                                className="bg-blue-600 text-white font-bold px-2.5 py-1 text-[10px] uppercase tracking-wider rounded border border-blue-700 hover:bg-blue-700 transition-colors shadow-sm"
                              >
                                Approve
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  confirm({
                                    title: 'Reject Request',
                                    message: 'Please provide a reason for rejecting this request:',
                                    isPrompt: true,
                                    promptPlaceholder: 'Enter rejection reason...',
                                    confirmText: 'Reject',
                                    type: 'danger',
                                  }).then((reason) => {
                                    if (reason && typeof reason === 'string') {
                                      transitionStatus(req._id, {
                                        nextStatus: 'rejected',
                                        reason,
                                      }).then(() => fetchReturnsList({ search: searchTerm }));
                                    }
                                  });
                                }}
                                className="bg-white text-red-600 font-bold px-2.5 py-1 text-[10px] uppercase tracking-wider rounded border border-red-200 hover:bg-red-50 transition-colors shadow-sm"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            (() => {
                              const isReadyForRefund =
                                req.status === 'inspection_passed' ||
                                req.status === 'inspection_completed' ||
                                req.status === 'refund_initiated';
                              return (
                                <button
                                  onClick={(e) => {
                                    if (isReadyForRefund)
                                      triggerRefund(
                                        req._id,
                                        req.refundMethod || 'wallet',
                                        req.status,
                                        e,
                                      );
                                    else e.stopPropagation();
                                  }}
                                  disabled={!isReadyForRefund}
                                  className={`admin-btn-sm border-none rounded px-3 py-1.5 flex items-center gap-1 font-bold text-[10px] uppercase tracking-wider shadow-sm ${
                                    isReadyForRefund
                                      ? 'bg-green-600 text-white hover:bg-green-700'
                                      : 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-50'
                                  }`}
                                >
                                  <span className="material-symbols-outlined text-[14px]">
                                    payments
                                  </span>
                                  Pay
                                </button>
                              );
                            })()
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/admin/returns/requests/${req._id}`);
                            }}
                            className="admin-btn-icon w-8 h-8 p-0 min-h-0 text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)]"
                          >
                            <span className="material-symbols-outlined text-[16px]">
                              visibility
                            </span>
                          </button>
                        </div>
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
