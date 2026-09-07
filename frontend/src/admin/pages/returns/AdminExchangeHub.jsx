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

const getActiveExchangeStep = (status, replacementStatus) => {
  if (['completed'].includes(status) || replacementStatus === 'delivered') {
    return 'completed';
  }
  if (replacementStatus === 'shipped') {
    return 'replacement_dispatched';
  }
  if (
    ['inspection_completed', 'refund_initiated', 'refund_completed'].includes(status) ||
    ['reserved'].includes(replacementStatus)
  ) {
    return 'quality_check_passed';
  }
  if (['return_received', 'inspection_started'].includes(status)) {
    return 'quality_check_passed';
  }
  if (['return_picked_up', 'return_in_transit'].includes(status)) {
    return 'item_picked_up';
  }
  if (['approved', 'return_courier_assigned'].includes(status)) {
    return 'approved';
  }
  if (status === 'rejected') {
    return 'rejected';
  }
  return 'submitted';
};

const getExchangeStatusBadgeStyle = (status, replacementStatus) => {
  const step = getActiveExchangeStep(status, replacementStatus);
  switch (step) {
    case 'completed':
      return 'bg-emerald-600 text-white';
    case 'replacement_dispatched':
      return 'bg-blue-600 text-white';
    case 'quality_check_passed':
      return 'bg-purple-600 text-white';
    case 'item_picked_up':
      return 'bg-indigo-600 text-white';
    case 'approved':
      return 'bg-amber-600 text-white';
    case 'rejected':
      return 'bg-red-600 text-white';
    case 'submitted':
    default:
      return 'bg-stone-500 text-white';
  }
};

const getExchangeStatusLabel = (status, replacementStatus) => {
  const step = getActiveExchangeStep(status, replacementStatus);
  switch (step) {
    case 'completed':
      return 'Completed';
    case 'replacement_dispatched':
      return 'Dispatched';
    case 'quality_check_passed':
      return 'QC Passed';
    case 'item_picked_up':
      return 'Picked Up';
    case 'approved':
      return 'Approved';
    case 'rejected':
      return 'Rejected';
    case 'submitted':
    default:
      return 'Submitted';
  }
};

const getReplacementStatusInfo = (replacementStatus, returnStatus, hasReservation = false) => {
  if (
    ['completed', 'refund_completed'].includes(returnStatus) ||
    replacementStatus === 'delivered'
  ) {
    return {
      label: 'Delivered',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: 'verified',
    };
  }

  if (replacementStatus === 'shipped') {
    return {
      label: 'Dispatched',
      badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
      icon: 'local_shipping',
    };
  }

  if (['rejected', 'cancelled'].includes(returnStatus) || replacementStatus === 'cancelled') {
    return {
      label: 'Cancelled',
      badgeClass: 'bg-red-50 text-red-700 border-red-200',
      icon: 'cancel',
    };
  }

  if (
    replacementStatus === 'reserved' ||
    hasReservation ||
    [
      'approved',
      'return_courier_assigned',
      'return_picked_up',
      'return_in_transit',
      'return_received',
      'inspection_started',
      'inspection_completed',
    ].includes(returnStatus)
  ) {
    return {
      label: 'Stock Reserved',
      badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
      icon: 'inventory_2',
    };
  }

  return {
    label: 'Under Review',
    badgeClass: 'bg-stone-50 text-stone-700 border-stone-200',
    icon: 'hourglass_empty',
  };
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

  const {
    dashboardStats,
    fetchDashboardStats,
    transitionStatus,
    transitionExchangeReplacement,
    settleRefund,
  } = useReturnManagement();

  // Manual Refund Settlement Modal State
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [settleExchange, setSettleExchange] = useState(null);
  const [settleData, setSettleData] = useState({
    amount: 0,
    paymentMethod: 'upi',
    upiId: '',
    transactionId: '',
    notes: '',
    autoComplete: true,
  });
  const [isSubmittingSettle, setIsSubmittingSettle] = useState(false);

  const openManualSettleModal = (ex, shouldAutoComplete = true) => {
    const priceDiff = Number(ex.priceDifference || 0);
    const effectiveUpi = ex.upiId || ex.returnRequestId?.upiId || '';
    setSettleExchange(ex);
    setSettleData({
      amount: priceDiff > 0 ? priceDiff : 0,
      paymentMethod: 'upi',
      upiId: effectiveUpi,
      transactionId: '',
      notes: `Balance refund payout for Exchange #${ex.exchangeId || ex._id?.slice(-8)}`,
      autoComplete: shouldAutoComplete,
    });
    setIsSettleModalOpen(true);
  };

  const handleSettleSubmit = async (e) => {
    e.preventDefault();
    if (!settleExchange) return;

    const returnRequestId = settleExchange.returnRequestId?._id || settleExchange.returnRequestId;
    if (!returnRequestId) {
      toast.error('Missing return request ID');
      return;
    }

    const amt = Number(settleData.amount);
    if (!amt || amt <= 0) {
      toast.error('Please enter a valid refund payout amount');
      return;
    }

    if (settleData.paymentMethod === 'upi' && !settleData.upiId?.trim()) {
      toast.error('Customer UPI ID is required for UPI payout');
      return;
    }

    setIsSubmittingSettle(true);
    try {
      // 1. Record manual refund payout in backend
      await returnService.settleRefund(returnRequestId, {
        amount: amt,
        paymentMethod: settleData.paymentMethod,
        upiId: settleData.upiId?.trim(),
        transactionId: settleData.transactionId?.trim() || `UPI-MANUAL-${Date.now()}`,
        notes: settleData.notes?.trim(),
      });

      // 2. If autoComplete is checked, advance exchange replacement to delivered / completed
      if (settleData.autoComplete) {
        if (settleExchange._id) {
          await transitionExchangeReplacement(settleExchange._id, returnRequestId, 'delivered');
        } else {
          await transitionStatus(returnRequestId, {
            nextStatus: 'completed',
            reason: 'Refund payout recorded manually and exchange completed.',
          });
        }
        toast.success(`Refund of ₹${amt} recorded and exchange completed successfully!`);
      } else {
        toast.success(`Refund payout of ₹${amt} registered successfully.`);
      }

      setIsSettleModalOpen(false);
      setSettleExchange(null);
      await fetchExchanges();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || err?.message || 'Failed to settle refund');
    } finally {
      setIsSubmittingSettle(false);
    }
  };

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
        const friendlyName =
          status === 'reserved'
            ? 'Stock Reserved'
            : status === 'shipped'
              ? 'Dispatched'
              : status === 'delivered'
                ? 'Delivered'
                : status;
        toast.success(`Replacement marked as ${friendlyName}`);
        fetchExchanges();
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Transition failed';
      toast.error(msg);
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
            <table className="admin-table w-full min-w-[1100px]">
              <thead>
                <tr>
                  <th className="w-10 pl-5">
                    <input type="checkbox" className="admin-checkbox" disabled />
                  </th>
                  <th className="whitespace-nowrap min-w-[130px]">Exchange ID</th>
                  <th className="whitespace-nowrap min-w-[160px]">Customer</th>
                  <th className="min-w-[280px]">Item Details</th>
                  <th className="whitespace-nowrap min-w-[160px]">Difference</th>
                  <th className="whitespace-nowrap min-w-[190px]">Req. Status</th>
                  <th className="whitespace-nowrap min-w-[140px]">Replacement</th>
                  <th className="whitespace-nowrap text-right pr-5 min-w-[80px]">Actions</th>
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
                      <td className="relative overflow-hidden font-semibold text-[var(--admin-text-primary)] pl-7">
                        {/* Top-Left Diagonal Status Badge */}
                        <div className="absolute top-0 left-0 w-14 h-14 pointer-events-none z-10 overflow-hidden">
                          <div
                            className={`absolute top-2.5 -left-8 w-28 text-[7px] font-extrabold text-white text-center uppercase py-[2px] -rotate-45 shadow-sm tracking-wide ${getExchangeStatusBadgeStyle(ex.returnRequestId?.status, ex.replacementStatus)}`}
                          >
                            {getExchangeStatusLabel(
                              ex.returnRequestId?.status,
                              ex.replacementStatus,
                            )}
                          </div>
                        </div>
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
                      <td className="whitespace-nowrap min-w-[160px]">
                        <div className="flex flex-col gap-1">
                          <span className="font-bold text-[var(--admin-text-primary)]">
                            ₹{ex.priceDifference || 0}
                          </span>

                          {ex.differenceAction === 'refund_difference' &&
                          Number(ex.priceDifference) > 0 ? (
                            Boolean(ex.additionalRefundId) ||
                            ex.paymentStatus === 'payment_paid' ||
                            ['completed', 'refund_completed'].includes(
                              ex.returnRequestId?.status,
                            ) ||
                            Boolean(ex.returnRequestId?.refundRecordId) ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded w-max">
                                <span className="material-symbols-outlined text-[12px]">
                                  verified
                                </span>
                                Refund Settled
                              </span>
                            ) : (
                              <div className="flex flex-col gap-1 mt-0.5">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openManualSettleModal(ex, false);
                                  }}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300/80 rounded-md transition-all shadow-2xs cursor-pointer w-max"
                                  title="Click to record refund to customer"
                                >
                                  <span className="material-symbols-outlined text-[13px] text-amber-700">
                                    currency_rupee
                                  </span>
                                  Refund Difference
                                </button>
                                {(ex.upiId || ex.returnRequestId?.upiId) && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const upi = ex.upiId || ex.returnRequestId?.upiId;
                                      navigator.clipboard.writeText(upi);
                                      toast.success(`Copied UPI ID: ${upi}`);
                                    }}
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold bg-amber-50 text-amber-900 border border-amber-200 rounded hover:bg-amber-100 transition-colors cursor-pointer w-max"
                                    title="Click to copy UPI ID"
                                  >
                                    <span className="material-symbols-outlined text-[10px]">
                                      content_copy
                                    </span>
                                    {ex.upiId || ex.returnRequestId?.upiId}
                                  </button>
                                )}
                              </div>
                            )
                          ) : (
                            <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--admin-text-tertiary)] bg-[var(--admin-surface-muted)] px-1.5 py-0.5 rounded w-max">
                              {ex.paymentStatus?.replace(/_/g, ' ') || 'Direct Swap'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="whitespace-nowrap min-w-[190px]">
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
                                className="admin-btn bg-white hover:bg-red-50 text-red-600 hover:text-red-700 border border-red-200 hover:border-red-300 !py-1 !px-2.5 text-[10px] uppercase tracking-wider font-bold shadow-2xs transition-all"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(
                                  `/admin/exchanges/requests/${ex.returnRequestId?._id || ex.returnRequestId || ex._id}`,
                                );
                              }}
                              className="admin-btn bg-white hover:bg-[var(--admin-surface-muted)] text-[var(--admin-text-primary)] border border-[var(--admin-border-strong)] !py-1 !px-2.5 text-[10px] uppercase tracking-wider font-bold shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
                            >
                              Manage
                              <span className="material-symbols-outlined text-[13px]">
                                arrow_forward
                              </span>
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="whitespace-nowrap min-w-[140px]">
                        {(() => {
                          const info = getReplacementStatusInfo(
                            ex.replacementStatus,
                            ex.returnRequestId?.status,
                            Boolean(ex.replacementItem?.reservationId),
                          );
                          return (
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border whitespace-nowrap ${info.badgeClass}`}
                            >
                              <span className="material-symbols-outlined text-[12px]">
                                {info.icon}
                              </span>
                              {info.label}
                            </span>
                          );
                        })()}
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

            {/* Mobile Cards View with 4-Step Dropdown */}
            <div className="md:hidden flex flex-col gap-3 px-1 py-3">
              {filteredExchanges.length === 0 ? (
                <div className="py-10 text-center flex flex-col items-center justify-center bg-[var(--admin-surface)] rounded-[var(--admin-radius-lg)]">
                  <EmptyState
                    icon={searchTerm ? 'search_off' : 'swap_horiz'}
                    title={searchTerm ? 'No Matches Found' : 'No Exchanges Found'}
                    description={
                      searchTerm
                        ? 'No exchanges match your search.'
                        : 'There are no active exchanges currently registered.'
                    }
                  />
                </div>
              ) : (
                filteredExchanges.map((ex) => (
                  <div
                    key={ex._id}
                    onClick={() => {
                      const requestId = ex.returnRequestId?._id || ex.returnRequestId;
                      if (requestId) navigate(`/admin/exchanges/requests/${requestId}`);
                    }}
                    className="relative overflow-hidden rounded-[var(--admin-radius-lg)] p-4 shadow-sm border border-[var(--admin-border)] bg-white flex flex-col gap-3 cursor-pointer hover:shadow-md transition-all"
                  >
                    {/* Top-Left Diagonal Status Badge */}
                    <div className="absolute top-0 left-0 w-14 h-14 pointer-events-none z-10 overflow-hidden rounded-tl-[var(--admin-radius-lg)]">
                      <div
                        className={`absolute top-2.5 -left-8 w-28 text-[7px] font-extrabold text-white text-center uppercase py-[2px] -rotate-45 shadow-sm tracking-wide ${getExchangeStatusBadgeStyle(ex.returnRequestId?.status, ex.replacementStatus)}`}
                      >
                        {getExchangeStatusLabel(ex.returnRequestId?.status, ex.replacementStatus)}
                      </div>
                    </div>
                    <div className="flex justify-between items-start gap-2 pl-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[var(--admin-text-primary)] text-sm">
                            {ex.exchangeId || ex._id.substring(0, 8)}
                          </span>
                          <span className="font-mono text-xs text-[var(--admin-text-secondary)]">
                            #{ex.orderId?.orderCode || ex.orderId?._id?.slice(-8) || 'Order'}
                          </span>
                        </div>
                        <span className="text-xs font-medium text-[var(--admin-text-secondary)] block mt-0.5 truncate">
                          {ex.userId?.name || 'Customer'}
                        </span>
                      </div>

                      {/* Step selector pill on the card (matching first page) */}
                      <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(
                              `/admin/exchanges/requests/${ex.returnRequestId?._id || ex.returnRequestId || ex._id}`,
                            );
                          }}
                          className="admin-btn bg-white hover:bg-[var(--admin-surface-muted)] text-[var(--admin-text-primary)] border border-[var(--admin-border-strong)] !py-1 !px-2 text-[10px] uppercase tracking-wider font-bold shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
                        >
                          Manage
                          <span className="material-symbols-outlined text-[13px]">
                            arrow_forward
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Items comparison preview */}
                    <div className="flex items-center gap-2 bg-[var(--admin-surface-muted)] p-2.5 rounded-lg border border-[var(--admin-border-subtle)] text-xs">
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">
                          Return
                        </span>
                        <p className="font-bold text-[var(--admin-text-primary)] truncate mt-0.5">
                          {ex.originalItem?.title || 'Returned Item'}
                        </p>
                      </div>
                      <span className="material-symbols-outlined text-[16px] text-[var(--admin-text-tertiary)] shrink-0">
                        arrow_forward
                      </span>
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">
                          Replacement
                        </span>
                        <p className="font-bold text-[var(--admin-text-primary)] truncate mt-0.5">
                          {ex.replacementItem?.title || 'Replacement Item'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-[var(--admin-border-subtle)] text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-[var(--admin-text-secondary)]">
                          Difference:
                        </span>
                        <span className="font-mono font-bold text-[var(--admin-text-primary)]">
                          ₹{ex.priceDifference || 0}
                        </span>
                        {ex.differenceAction === 'refund_difference' &&
                          Number(ex.priceDifference) > 0 &&
                          !(
                            Boolean(ex.additionalRefundId) ||
                            ex.paymentStatus === 'payment_paid' ||
                            ['completed', 'refund_completed'].includes(
                              ex.returnRequestId?.status,
                            ) ||
                            Boolean(ex.returnRequestId?.refundRecordId)
                          ) && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openManualSettleModal(ex, false);
                              }}
                              className="px-1.5 py-0.5 text-[9px] font-bold bg-amber-500 hover:bg-amber-600 text-white rounded cursor-pointer"
                            >
                              Settle
                            </button>
                          )}
                      </div>
                      {(() => {
                        const info = getReplacementStatusInfo(
                          ex.replacementStatus,
                          ex.returnRequestId?.status,
                          Boolean(ex.replacementItem?.reservationId),
                        );
                        return (
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border whitespace-nowrap shrink-0 ${info.badgeClass}`}
                          >
                            <span className="material-symbols-outlined text-[11px]">
                              {info.icon}
                            </span>
                            {info.label}
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </motion.div>
      </div>
      {/* ─── Manual Refund Settlement Modal ─── */}
      {isSettleModalOpen && settleExchange && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[110] p-3 sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSubmittingSettle) {
              setIsSettleModalOpen(false);
            }
          }}
        >
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-[var(--admin-border)] overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-[var(--admin-border)] flex items-center justify-between bg-amber-500/5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-800 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[22px]">payments</span>
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-[var(--admin-text-primary)]">
                    Settle Refund & Record Payment
                  </h3>
                  <p className="text-[11px] text-[var(--admin-text-secondary)]">
                    Record money payout before completing Exchange #
                    {settleExchange.exchangeId || settleExchange._id?.slice(-8)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSettleModalOpen(false)}
                disabled={isSubmittingSettle}
                className="w-8 h-8 rounded-lg text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)] hover:bg-[var(--admin-surface-hover)] flex items-center justify-center transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Body */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
              {/* Notice Banner */}
              <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-xl text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-amber-900">
                  <span className="material-symbols-outlined text-[16px] text-amber-600">info</span>
                  Manual Refund Balance Settlement
                </div>
                <p className="text-amber-800 text-[11px] leading-relaxed">
                  The customer returned a higher-value item and is owed a price difference refund of{' '}
                  <strong className="font-bold text-amber-950">
                    ₹{settleExchange.priceDifference || 0}
                  </strong>
                  . Record the manual transfer details below to reconcile your records and fulfill
                  the exchange.
                </p>
              </div>

              {/* Customer & Items Recap */}
              <div className="p-3 bg-[var(--admin-surface-muted)] border border-[var(--admin-border-subtle)] rounded-xl space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[var(--admin-text-tertiary)] font-medium">Customer:</span>
                  <span className="font-bold text-[var(--admin-text-primary)]">
                    {settleExchange.returnRequestId?.userId?.name || 'Customer'}{' '}
                    {settleExchange.returnRequestId?.userId?.phone
                      ? `(${settleExchange.returnRequestId.userId.phone})`
                      : ''}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-[var(--admin-border-subtle)]">
                  <span className="text-[var(--admin-text-tertiary)] font-medium">Returning:</span>
                  <span className="font-semibold text-[var(--admin-text-primary)] truncate max-w-[240px]">
                    {settleExchange.originalItem?.title || 'Returned Item'}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-[var(--admin-border-subtle)]">
                  <span className="text-blue-600 font-medium">Replacement:</span>
                  <span className="font-semibold text-[var(--admin-text-primary)] truncate max-w-[240px]">
                    {settleExchange.replacementItem?.title || 'Replacement Item'}
                  </span>
                </div>
                {(settleExchange.upiId || settleExchange.returnRequestId?.upiId) && (
                  <div className="flex items-center justify-between pt-1 border-t border-[var(--admin-border-subtle)]">
                    <span className="text-[var(--admin-text-tertiary)] font-medium">
                      Customer UPI:
                    </span>
                    <div className="flex items-center gap-1.5 font-mono font-bold text-[var(--admin-text-primary)]">
                      <span>{settleExchange.upiId || settleExchange.returnRequestId?.upiId}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const upi = settleExchange.upiId || settleExchange.returnRequestId?.upiId;
                          navigator.clipboard.writeText(upi);
                          toast.success(`Copied UPI ID: ${upi}`);
                        }}
                        className="text-amber-800 hover:text-amber-900 cursor-pointer"
                        title="Copy UPI ID"
                      >
                        <span className="material-symbols-outlined text-[14px]">content_copy</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Form */}
              <form id="settle-refund-form" onSubmit={handleSettleSubmit} className="space-y-3.5">
                <div>
                  <label className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider block mb-1">
                    Refund Amount (₹) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--admin-text-tertiary)] font-bold text-sm pointer-events-none z-10 select-none">
                      ₹
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      required
                      placeholder="e.g. 500"
                      className="admin-input admin-input-currency w-full !pl-8 text-sm font-mono font-black text-[var(--admin-text-primary)]"
                      style={{ paddingLeft: '32px' }}
                      value={settleData.amount}
                      onChange={(e) => setSettleData({ ...settleData, amount: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider block mb-1">
                    Payment Mode
                  </label>
                  <select
                    className="admin-input w-full text-xs font-semibold"
                    value={settleData.paymentMethod}
                    onChange={(e) =>
                      setSettleData({ ...settleData, paymentMethod: e.target.value })
                    }
                  >
                    <option value="upi">Direct UPI (GPay / PhonePe / Paytm / BHIM)</option>
                    <option value="bank_transfer">Direct Bank Transfer (IMPS / NEFT)</option>
                    <option value="cash">Cash Handover / In-Person</option>
                    <option value="wallet">Customer Store Wallet Credit</option>
                  </select>
                </div>

                {settleData.paymentMethod === 'upi' && (
                  <div>
                    <label className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider block mb-1">
                      Customer Destination UPI ID <span className="text-red-500">*</span>
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        required
                        placeholder="e.g. 9154691315@ybl"
                        className="admin-input w-full text-xs font-mono font-bold pr-8"
                        value={settleData.upiId}
                        onChange={(e) => setSettleData({ ...settleData, upiId: e.target.value })}
                      />
                      {settleData.upiId && (
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(settleData.upiId);
                            toast.success(`Copied UPI ID: ${settleData.upiId}`);
                          }}
                          className="absolute right-2 text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)]"
                          title="Copy UPI"
                        >
                          <span className="material-symbols-outlined text-[14px]">
                            content_copy
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider">
                      Transaction Reference / UTR Number
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const randomRef = `UPI-${Date.now().toString().slice(-8)}`;
                        setSettleData({ ...settleData, transactionId: randomRef });
                      }}
                      className="text-[10px] font-bold text-[var(--admin-accent)] hover:underline cursor-pointer"
                    >
                      Auto-fill Ref
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="e.g. 423589123456, UPI-1315, or CASH-PAID"
                    className="admin-input w-full text-xs font-mono"
                    value={settleData.transactionId}
                    onChange={(e) =>
                      setSettleData({ ...settleData, transactionId: e.target.value })
                    }
                  />
                  <p className="text-[10px] text-[var(--admin-text-tertiary)] mt-0.5">
                    Reference number from your UPI app, bank receipt, or cash voucher.
                  </p>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider block mb-1">
                    Admin Internal Note (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Paid from business account to customer UPI..."
                    className="admin-input w-full text-xs"
                    value={settleData.notes}
                    onChange={(e) => setSettleData({ ...settleData, notes: e.target.value })}
                  />
                </div>

                {/* Auto Complete Checkbox */}
                <div className="p-2.5 rounded-xl bg-blue-50/60 border border-blue-200/60 flex items-start gap-2 text-xs">
                  <input
                    type="checkbox"
                    id="auto-complete-exchange-check"
                    className="admin-checkbox mt-0.5"
                    checked={settleData.autoComplete}
                    onChange={(e) =>
                      setSettleData({ ...settleData, autoComplete: e.target.checked })
                    }
                  />
                  <label
                    htmlFor="auto-complete-exchange-check"
                    className="cursor-pointer select-none text-[11px] text-blue-900 leading-tight"
                  >
                    <strong className="font-bold block">
                      Mark exchange as Completed immediately after recording refund
                    </strong>
                    Finalizes the replacement delivery and closes this exchange ticket without
                    further steps.
                  </label>
                </div>
              </form>
            </div>

            {/* Footer */}
            <div className="p-4 sm:p-5 border-t border-[var(--admin-border)] bg-[var(--admin-surface)] flex items-center justify-end gap-2.5">
              <button
                type="button"
                className="admin-btn admin-btn-outline text-xs"
                onClick={() => setIsSettleModalOpen(false)}
                disabled={isSubmittingSettle}
              >
                Cancel
              </button>
              <button
                type="submit"
                form="settle-refund-form"
                disabled={isSubmittingSettle}
                className="admin-btn admin-btn-primary !bg-amber-600 hover:!bg-amber-700 text-white text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                {isSubmittingSettle ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Recording Refund...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">check_circle</span>
                    {settleData.autoComplete
                      ? 'Confirm Refund & Complete Exchange'
                      : 'Record Refund Only'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

export { AdminExchangeHub };
