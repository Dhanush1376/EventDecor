import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { m as motion } from 'framer-motion';
import { returnService } from '../../../services/api/returnService';
import toast from 'react-hot-toast';
import {
  PageHeader,
  EmptyState,
  SkeletonTable,
  fadeUp,
  stagger,
} from '../../components/AdminUIKit';

import { useConfirm } from '../../../context/ConfirmProvider';
import { useReturnManagement } from '../../hooks/useReturnManagement';

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

const getStatusBadge = (status) => {
  switch (status) {
    case 'pending_stock':
      return 'bg-[var(--admin-warning-light)] text-[var(--admin-warning)] border-[var(--admin-warning-border)]';
    case 'reserved':
      return 'bg-[var(--admin-accent-light)] text-[var(--admin-accent)] border-[var(--admin-border-strong)]';
    case 'shipped':
      return 'bg-[var(--admin-info-light)] text-[var(--admin-info)] border-[var(--admin-info-border)]';
    case 'delivered':
      return 'bg-[var(--admin-success-light)] text-[var(--admin-success)] border-[var(--admin-success-border)]';
    default:
      return 'bg-[var(--admin-surface-muted)] text-[var(--admin-text-secondary)] border-[var(--admin-border)]';
  }
};
export default function AdminExchangeHub({ hideHeader = false }) {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [exchanges, setExchanges] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchExchanges = async () => {
    try {
      setIsLoading(true);
      const res = await returnService.getAllExchanges();
      if (res.data?.success) {
        setExchanges(res.data.data.exchanges || res.data.data || []);
      }
    } catch (err) {
      toast.error('Failed to load exchanges');
    } finally {
      setIsLoading(false);
    }
  };

  const { dashboardStats, fetchDashboardStats, transitionStatus } = useReturnManagement();

  useEffect(() => {
    fetchExchanges();
    fetchDashboardStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTransition = async (id, status) => {
    try {
      const { returnService: adminReturnService } =
        await import('../../../services/api/returnService');
      const res = await adminReturnService.transitionExchangeReplacement(id, { status });
      if (res.data?.success) {
        toast.success(`Exchange moved to ${status}`);
        fetchExchanges();
      }
    } catch (err) {
      toast.error('Transition failed');
    }
  };

  const filteredExchanges = exchanges.filter((ex) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      (ex.exchangeId || '').toLowerCase().includes(search) ||
      (ex.originalItem?.title || '').toLowerCase().includes(search) ||
      (ex.replacementItem?.title || '').toLowerCase().includes(search)
    );
  });

  const stats = dashboardStats?.stats || {};

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        {!hideHeader && (
          <PageHeader
            title="Exchange Hub"
            subtitle="Manage replacement fulfillments"
            icon="swap_horiz"
            iconColor="primary"
            mobileRow={false}
          />
        )}
        <SkeletonTable rows={5} cols={6} />
      </div>
    );
  }

  return (
    <motion.div initial="hidden" animate="show" variants={stagger} className="flex flex-col h-full">
      {!hideHeader && (
        <div className="shrink-0 pb-2">
          <PageHeader
            title="Exchange Hub"
            subtitle="Manage replacement fulfillments"
            icon="swap_horiz"
            iconColor="primary"
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
                    placeholder="Search exchanges..."
                    className="bg-transparent border-none outline-none w-full text-[13px] text-[var(--admin-text-primary)] placeholder-[var(--admin-text-tertiary)] font-medium px-2 h-10 sm:h-8"
                  />
                </div>
                <button
                  onClick={fetchExchanges}
                  className="admin-btn admin-btn-outline shrink-0 whitespace-nowrap hidden sm:flex"
                >
                  <span className="material-symbols-outlined text-[16px]">refresh</span>
                  Refresh
                </button>
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

        <motion.div variants={fadeUp} className="admin-card overflow-hidden text-left relative p-0">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-[var(--admin-border-strong)] z-10" />

          <div className="overflow-x-auto custom-scrollbar">
            <table className="admin-table w-full min-w-[900px]">
              <thead>
                <tr>
                  <th className="w-10">
                    <input type="checkbox" className="admin-checkbox" disabled />
                  </th>
                  <th>Exchange ID</th>
                  <th>Customer</th>
                  <th className="w-1/3">Item Details</th>
                  <th>Difference</th>
                  <th>Req. Status</th>
                  <th>Replacement</th>
                  <th className="text-right pr-5">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredExchanges.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center">
                      <EmptyState
                        icon={searchTerm ? 'search_off' : 'swap_horiz'}
                        title={searchTerm ? 'No Matches Found' : 'No Active Exchanges'}
                        description={
                          searchTerm
                            ? 'No exchanges match your search.'
                            : 'There are no active exchange requests right now.'
                        }
                      />
                    </td>
                  </tr>
                ) : (
                  filteredExchanges.map((ex) => (
                    <tr
                      key={ex._id}
                      className="group hover:bg-[var(--admin-surface-hover)] transition-colors cursor-pointer"
                      onClick={() => {
                        const requestId = ex.returnRequestId?._id || ex.returnRequestId;
                        if (requestId) {
                          navigate(`/admin/exchanges/requests/${requestId}`);
                        }
                      }}
                    >
                      <td className="pl-5">
                        <input type="checkbox" className="admin-checkbox" />
                      </td>
                      <td className="font-semibold text-[var(--admin-text-primary)]">
                        <div className="flex items-center gap-2 text-[var(--admin-accent)]">
                          <span className="material-symbols-outlined text-[14px]">swap_horiz</span>
                          {ex.exchangeId || ex._id.substring(0, 8)}
                        </div>
                      </td>
                      <td>
                        <div className="flex flex-col">
                          <span
                            className="font-semibold text-[var(--admin-text-primary)] truncate max-w-[150px]"
                            title={ex.returnRequestId?.userId?.name || 'Guest User'}
                          >
                            {ex.returnRequestId?.userId?.name || 'Guest User'}
                          </span>
                          <span className="text-[11px] text-[var(--admin-text-tertiary)] mt-0.5 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[12px]">call</span>
                            {ex.returnRequestId?.userId?.phone || 'N/A'}
                          </span>
                          <span
                            className="text-[11px] text-[var(--admin-text-tertiary)] mt-0.5 flex items-center gap-1 truncate max-w-[150px]"
                            title={ex.returnRequestId?.userId?.email || 'N/A'}
                          >
                            <span className="material-symbols-outlined text-[12px]">mail</span>
                            {ex.returnRequestId?.userId?.email || 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 flex-1 bg-[var(--admin-surface-muted)] p-2 rounded border border-[var(--admin-border-subtle)]">
                              {ex.originalItem?.imageSrc && (
                                <img
                                  src={ex.originalItem.imageSrc}
                                  alt=""
                                  className="w-8 h-8 object-cover rounded border border-[var(--admin-border)]"
                                />
                              )}
                              <div className="min-w-0">
                                <p className="text-[9px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider mb-0.5">
                                  Returning
                                </p>
                                <p
                                  className="text-[12px] font-bold text-[var(--admin-text-primary)] truncate"
                                  title={ex.originalItem?.title}
                                >
                                  {ex.originalItem?.title || 'Unknown Item'}
                                </p>
                              </div>
                            </div>

                            <span className="material-symbols-outlined text-[16px] text-[var(--admin-text-tertiary)] shrink-0">
                              arrow_forward
                            </span>

                            <div className="flex items-center gap-2 flex-1 bg-[var(--admin-surface-muted)] p-2 rounded border border-blue-500/20">
                              {ex.replacementItem?.imageSrc && (
                                <img
                                  src={ex.replacementItem.imageSrc}
                                  alt=""
                                  className="w-8 h-8 object-cover rounded border border-[var(--admin-border)]"
                                />
                              )}
                              <div className="min-w-0">
                                <p className="text-[9px] font-bold text-blue-600 uppercase tracking-wider mb-0.5">
                                  Replacement
                                </p>
                                <p
                                  className="text-[12px] font-bold text-[var(--admin-text-primary)] truncate"
                                  title={ex.replacementItem?.title}
                                >
                                  {ex.replacementItem?.title || 'Unknown Item'}
                                </p>
                              </div>
                            </div>
                          </div>
                          {ex.returnRequestId?.items?.[0]?.reason && (
                            <div className="flex items-start gap-1 text-[11px] text-[var(--admin-text-secondary)]">
                              <span className="material-symbols-outlined text-[14px] mt-[1px]">
                                info
                              </span>
                              <div>
                                <span className="font-medium">Reason:</span>{' '}
                                {ex.returnRequestId.items[0].reason}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="flex flex-col gap-1">
                          <span className="font-bold text-[var(--admin-text-primary)]">
                            ₹{ex.priceDifference || 0}
                          </span>
                          <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--admin-text-tertiary)] bg-[var(--admin-surface-muted)] px-1.5 py-0.5 rounded w-max">
                            {ex.paymentStatus?.replace(/_/g, ' ') || 'Pending'}
                          </span>
                          {(ex.upiId || ex.returnRequestId?.upiId) && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const upi = ex.upiId || ex.returnRequestId?.upiId;
                                navigator.clipboard.writeText(upi);
                                toast.success(`Copied UPI ID: ${upi}`);
                              }}
                              className="mt-0.5 inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold bg-amber-50 text-amber-900 border border-amber-200 rounded hover:bg-amber-100 transition-colors cursor-pointer w-max"
                              title="Click to copy UPI ID to issue refund"
                            >
                              <span className="material-symbols-outlined text-[10px]">
                                account_balance_wallet
                              </span>
                              Pay UPI: {ex.upiId || ex.returnRequestId?.upiId}
                            </button>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="flex flex-col items-start gap-1.5">
                          {ex.returnRequestId?.status === 'submitted' ? (
                            <div className="flex items-center gap-1.5 w-max">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  confirm({
                                    title: 'Approve Exchange',
                                    message:
                                      'Are you sure you want to approve this exchange request?',
                                    confirmText: 'Approve',
                                    type: 'info',
                                  }).then((confirmed) => {
                                    if (confirmed && ex.returnRequestId?._id) {
                                      transitionStatus(ex.returnRequestId._id, {
                                        nextStatus: 'approved',
                                        reason: 'Approved from Exchange Hub',
                                      }).then(() => fetchExchanges());
                                    }
                                  });
                                }}
                                className="admin-btn admin-btn-primary !py-1 !px-2.5 text-[10px] uppercase tracking-wider font-bold shadow-2xs"
                              >
                                Approve
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  confirm({
                                    title: 'Reject Exchange',
                                    message: 'Please provide a reason for rejecting this exchange:',
                                    isPrompt: true,
                                    promptPlaceholder: 'Enter rejection reason...',
                                    confirmText: 'Reject',
                                    type: 'danger',
                                  }).then((reason) => {
                                    if (
                                      reason &&
                                      typeof reason === 'string' &&
                                      ex.returnRequestId?._id
                                    ) {
                                      transitionStatus(ex.returnRequestId._id, {
                                        nextStatus: 'rejected',
                                        reason,
                                      }).then(() => fetchExchanges());
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
                                value={ex.returnRequestId?.status || ''}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  if (ex.returnRequestId?._id) {
                                    transitionStatus(ex.returnRequestId._id, {
                                      nextStatus: e.target.value,
                                      reason: 'Status updated from Exchange Hub table.',
                                    }).then(() => fetchExchanges());
                                  }
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="appearance-none bg-white border border-[var(--admin-border-strong)] text-[10px] font-bold text-[var(--admin-text-primary)] rounded px-2 py-1 pr-6 cursor-pointer outline-none hover:border-blue-400 focus:border-blue-500 shadow-sm uppercase tracking-wider transition-colors"
                              >
                                {RETURN_STATUS_GROUPS.map((group) => (
                                  <optgroup key={group.label} label={group.label}>
                                    {group.options.map((s) => (
                                      <option key={s.value} value={s.value}>
                                        {s.label}
                                      </option>
                                    ))}
                                  </optgroup>
                                ))}
                              </select>
                              <span className="material-symbols-outlined absolute right-1.5 top-1/2 -translate-y-1/2 text-[14px] text-[var(--admin-text-tertiary)] pointer-events-none">
                                expand_more
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <span
                          className={`text-[10px] px-2 py-1 rounded font-bold uppercase tracking-wider border ${getStatusBadge(ex.replacementStatus)}`}
                        >
                          {ex.replacementStatus?.replace(/_/g, ' ') || 'Pending'}
                        </span>
                      </td>
                      <td className="text-right pr-5">
                        <div
                          className="flex items-center justify-end gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => {
                              const requestId = ex.returnRequestId?._id || ex.returnRequestId;
                              if (requestId) navigate(`/admin/exchanges/requests/${requestId}`);
                            }}
                            className="admin-btn-icon w-8 h-8 p-0 min-h-0 text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)] tooltip-trigger"
                            title="View Request Details"
                          >
                            <span className="material-symbols-outlined text-[16px]">
                              visibility
                            </span>
                          </button>

                          {ex.replacementStatus === 'pending_stock' && (
                            <button
                              onClick={() => handleTransition(ex._id, 'reserved')}
                              className="admin-btn-icon w-8 h-8 p-0 min-h-0 text-amber-600 hover:text-amber-700 hover:bg-amber-50 tooltip-trigger border border-amber-200"
                              title="Reserve Stock"
                            >
                              <span className="material-symbols-outlined text-[16px]">
                                inventory_2
                              </span>
                            </button>
                          )}
                          {ex.replacementStatus === 'reserved' && (
                            <button
                              onClick={() => handleTransition(ex._id, 'shipped')}
                              className="admin-btn-icon w-8 h-8 p-0 min-h-0 text-[var(--admin-accent)] hover:text-[var(--admin-accent-hover)] hover:bg-[var(--admin-accent-light)] tooltip-trigger border border-[var(--admin-border-strong)]"
                              title="Mark as Shipped"
                            >
                              <span className="material-symbols-outlined text-[16px]">
                                local_shipping
                              </span>
                            </button>
                          )}
                          {ex.replacementStatus === 'shipped' && (
                            <button
                              onClick={() => handleTransition(ex._id, 'delivered')}
                              className="admin-btn-icon w-8 h-8 p-0 min-h-0 text-green-600 hover:text-green-700 hover:bg-green-50 tooltip-trigger border border-green-200"
                              title="Mark as Delivered"
                            >
                              <span className="material-symbols-outlined text-[16px]">
                                verified
                              </span>
                            </button>
                          )}
                          {ex.replacementStatus === 'delivered' && (
                            <span
                              className="material-symbols-outlined text-[18px] text-green-600 tooltip-trigger"
                              title="Replacement Completed"
                            >
                              check_circle
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

export { AdminExchangeHub };
