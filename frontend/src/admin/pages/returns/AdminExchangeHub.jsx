import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { m as motion, AnimatePresence } from 'framer-motion';
import { returnService } from '../../../services/api/returnService';
import toast from 'react-hot-toast';
import {
  PageHeader,
  EmptyState,
  SkeletonTable,
  AdminStatusPill,
  AdminFilterDrawer,
  fadeUp,
  stagger,
  smoothScrollCardIntoView,
} from '../../components/AdminUIKit';
import { isWithinPeriod } from '../../utils/dateFilters';
import { useAdminFilters } from '../../components/filters/useAdminFilters';
import { exchangeFilterConfig } from '../../components/filters/configs/exchangeFilterConfig';
import { AdminActiveFilterChips } from '../../components/filters/AdminActiveFilterChips';

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

const RETURN_STATUS_OPTIONS = [
  { value: 'submitted', label: 'Submitted' },
  { value: 'approved', label: 'Approved' },
  { value: 'return_courier_assigned', label: 'Courier Assigned' },
  { value: 'return_picked_up', label: 'Item Picked Up' },
  { value: 'return_in_transit', label: 'In Transit' },
  { value: 'return_received', label: 'Item Received' },
  { value: 'inspection_completed', label: 'QC Passed' },
  { value: 'completed', label: 'Completed' },
  { value: 'rejected', label: 'Rejected' },
];

const isExchangeUnderReview = (ex) => {
  if (!ex) return false;
  const returnStatus = ex.returnRequestId?.status || ex.status;
  if (!returnStatus || ['submitted', 'under_review', 'pending'].includes(returnStatus)) {
    return true;
  }
  const info = getReplacementStatusInfo(
    ex.replacementStatus,
    returnStatus,
    Boolean(ex.replacementItem?.reservationId || ex.reservedInventoryId || ex.isInventoryReserved),
  );
  if (info.label === 'Under Review') {
    return true;
  }
  const activeApprovedStatuses = [
    'approved',
    'return_courier_assigned',
    'return_picked_up',
    'return_in_transit',
    'return_received',
    'inspection_started',
    'inspection_completed',
    'refund_initiated',
    'refund_completed',
    'completed',
  ];
  return !activeApprovedStatuses.includes(returnStatus);
};

export default function AdminExchangeHub({ hideHeader = false }) {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [exchanges, setExchanges] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCardIds, setExpandedCardIds] = useState(new Set());
  const [updatingStatusId, setUpdatingStatusId] = useState(null);

  // View & Advanced Filter States (Matches AdminOrders)
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'kanban'
  const [showFiltersMenu, setShowFiltersMenu] = useState(false);
  const [sortBy, setSortBy] = useState('Newest first');

  const {
    filteredItems: filteredExchangesBeforeSort,
    filterState,
    setFilterValue,
    resetFilter,
    resetAllFilters,
    activeChips,
    activeCount,
    totalCount,
    matchCount,
  } = useAdminFilters(exchanges, exchangeFilterConfig, searchTerm);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 640 : false,
  );

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleExpandCard = (id) => {
    setExpandedCardIds((prev) => {
      const next = new Set(prev);
      const isExpanding = !next.has(id);
      if (isExpanding) {
        next.add(id);
        smoothScrollCardIntoView(`exchange-card-${id}`);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const handleSavedViewChange = (e) => {
    const view = e.target.value;
    setFilterValue('savedView', view);
    if (view === 'All Exchanges') {
      setFilterValue('status', 'All');
      setFilterValue('diff', 'All');
    } else if (view === 'Needs Attention') {
      setFilterValue('status', 'under_review');
      setFilterValue('diff', 'All');
    } else if (view === 'Pending Pickups') {
      setFilterValue('status', 'pickups');
      setFilterValue('diff', 'All');
    } else if (view === 'Replacement Dispatched') {
      setFilterValue('status', 'dispatched');
      setFilterValue('diff', 'All');
    } else if (view === 'Payment Required') {
      setFilterValue('status', 'All');
      setFilterValue('diff', 'collect');
    } else if (view === 'Completed') {
      setFilterValue('status', 'completed');
      setFilterValue('diff', 'All');
    }
  };

  const handleResetAllFilters = () => {
    resetAllFilters();
    setSortBy('Newest first');
  };

  const activeFilterCount = activeCount;

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

  const isDark =
    typeof document !== 'undefined' &&
    (document.documentElement.classList.contains('dark') ||
      document.body.classList.contains('dark'));

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

  // Collect Customer Payment Modal State
  const [isCollectPaymentModalOpen, setIsCollectPaymentModalOpen] = useState(false);
  const [collectPaymentExchange, setCollectPaymentExchange] = useState(null);
  const [collectPaymentData, setCollectPaymentData] = useState({
    amount: '',
    paymentMethod: 'upi',
    note: '',
    autoReserve: true,
  });
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  const openCollectPaymentModal = (ex) => {
    const priceDiff = Number(ex.priceDifference || 0);
    setCollectPaymentExchange(ex);
    setCollectPaymentData({
      amount: priceDiff > 0 ? String(priceDiff) : '',
      paymentMethod: 'upi',
      note: '',
      autoReserve: true,
    });
    setIsCollectPaymentModalOpen(true);
  };

  const handleCollectPaymentSubmit = async (e) => {
    e.preventDefault();
    if (!collectPaymentExchange) return;

    const exchangeId = collectPaymentExchange._id || collectPaymentExchange.exchangeId;
    if (!exchangeId) {
      toast.error('Missing exchange request ID');
      return;
    }

    const amt = Number(collectPaymentData.amount);
    if (!amt || amt <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }

    setIsSubmittingPayment(true);
    try {
      const { returnService: adminReturnService } =
        await import('../../../services/api/returnService');
      await adminReturnService.recordExchangePayment(exchangeId, {
        amount: amt,
        paymentMethod: collectPaymentData.paymentMethod,
        transactionId: collectPaymentData.note?.trim() || undefined,
        notes: collectPaymentData.note?.trim() || undefined,
        autoReserve: true,
      });

      toast.success(`Payment of ₹${amt} recorded successfully!`);
      setIsCollectPaymentModalOpen(false);
      setCollectPaymentExchange(null);
      await fetchExchanges();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || err?.message || 'Failed to record payment');
    } finally {
      setIsSubmittingPayment(false);
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

  const handleReturnStatusChange = async (ex, targetStatus) => {
    const reqId = ex.returnRequestId?._id || ex.returnRequestId;
    if (!reqId) {
      toast.error('Return request record not found');
      return;
    }
    const currentStatus = ex.returnRequestId?.status || 'submitted';
    if (targetStatus === currentStatus) return;

    if (targetStatus === 'rejected') {
      const reason = await confirm({
        title: 'Reject Exchange Request',
        message: 'Please provide a reason for rejecting this exchange:',
        isPrompt: true,
        promptPlaceholder: 'Enter rejection reason...',
        confirmText: 'Reject Request',
        type: 'danger',
      });
      if (reason && typeof reason === 'string') {
        try {
          setUpdatingStatusId(ex._id);
          await transitionStatus(reqId, {
            nextStatus: 'rejected',
            reason,
          });
          await fetchExchanges();
        } catch (err) {
          console.error(err);
        } finally {
          setUpdatingStatusId(null);
        }
      }
      return;
    }

    const confirmed = await confirm({
      title: 'Update Request Status',
      message: `Change request status to "${targetStatus.replace(/_/g, ' ')}"? This will update the status shown in the user's profile.`,
      confirmText: 'Update Status',
      type: 'info',
    });
    if (!confirmed) return;

    try {
      setUpdatingStatusId(ex._id);
      const directTransitions = {
        submitted: ['approved', 'rejected', 'cancelled'],
        approved: ['return_courier_assigned', 'return_picked_up', 'rejected', 'cancelled'],
        return_courier_assigned: ['return_picked_up', 'rejected', 'cancelled'],
        return_picked_up: ['return_in_transit', 'return_received', 'inspection_completed'],
        return_in_transit: ['return_received', 'inspection_completed'],
        return_received: ['inspection_started', 'inspection_completed'],
        inspection_started: ['inspection_completed', 'rejected'],
        inspection_completed: ['refund_initiated', 'refund_completed', 'completed'],
        refund_initiated: ['refund_completed', 'completed'],
        refund_completed: ['completed'],
      };

      if (directTransitions[currentStatus]?.includes(targetStatus)) {
        await transitionStatus(reqId, {
          nextStatus: targetStatus,
          reason: `Status updated to ${targetStatus.replace(/_/g, ' ')} from Exchanges`,
        });
      } else {
        const stepChain = [
          'submitted',
          'approved',
          'return_picked_up',
          'return_received',
          'inspection_completed',
          'completed',
        ];
        const curIdx = stepChain.indexOf(currentStatus);
        const targetIdx = stepChain.indexOf(targetStatus);

        if (curIdx !== -1 && targetIdx !== -1 && targetIdx > curIdx) {
          for (let i = curIdx + 1; i <= targetIdx; i++) {
            await transitionStatus(reqId, {
              nextStatus: stepChain[i],
              reason: `Auto step transition to ${stepChain[i].replace(/_/g, ' ')}`,
            });
          }
        } else {
          await transitionStatus(reqId, {
            nextStatus: targetStatus,
            reason: `Status updated to ${targetStatus.replace(/_/g, ' ')}`,
          });
        }
      }
      await fetchExchanges();
    } catch (err) {
      console.error('Failed to transition status:', err);
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleApproveExchange = async (ex) => {
    const reqId = ex.returnRequestId?._id || ex.returnRequestId;
    if (!reqId) {
      toast.error('Return request record not found');
      return;
    }
    const confirmed = await confirm({
      title: 'Approve Exchange',
      message: 'Are you sure you want to approve this exchange request?',
      confirmText: 'Approve',
      type: 'info',
    });
    if (confirmed) {
      try {
        setUpdatingStatusId(ex._id);
        await transitionStatus(reqId, {
          nextStatus: 'approved',
          reason: 'Approved from Exchanges',
        });
        await fetchExchanges();
        toast.success('Exchange request approved successfully!');
      } catch (err) {
        console.error(err);
      } finally {
        setUpdatingStatusId(null);
      }
    }
  };

  const handleRejectExchange = async (ex) => {
    const reqId = ex.returnRequestId?._id || ex.returnRequestId;
    if (!reqId) {
      toast.error('Return request record not found');
      return;
    }
    const reason = await confirm({
      title: 'Reject Exchange',
      message: 'Please provide a reason for rejecting this exchange:',
      isPrompt: true,
      promptPlaceholder: 'Enter rejection reason...',
      confirmText: 'Reject',
      type: 'danger',
    });
    if (reason && typeof reason === 'string') {
      try {
        setUpdatingStatusId(ex._id);
        await transitionStatus(reqId, {
          nextStatus: 'rejected',
          reason,
        });
        await fetchExchanges();
        toast.success('Exchange request rejected.');
      } catch (err) {
        console.error(err);
      } finally {
        setUpdatingStatusId(null);
      }
    }
  };

  const handleExportCSV = () => {
    if (!filteredExchanges.length) {
      toast.error('No exchanges to export');
      return;
    }
    const headers = [
      'Exchange ID',
      'Customer',
      'Phone',
      'Original Item',
      'Replacement Item',
      'Price Diff',
      'Status',
      'Replacement Status',
      'Created At',
    ];
    const rows = filteredExchanges.map((ex) => [
      ex.exchangeId || ex._id,
      `"${(ex.returnRequestId?.userId?.name || ex.userId?.name || 'Customer').replace(/"/g, '""')}"`,
      ex.returnRequestId?.userId?.phone || ex.userId?.phone || '',
      `"${(ex.originalItem?.title || '').replace(/"/g, '""')}"`,
      `"${(ex.replacementItem?.title || '').replace(/"/g, '""')}"`,
      ex.priceDifference || 0,
      ex.returnRequestId?.status || ex.status || '',
      ex.replacementStatus || '',
      ex.createdAt ? new Date(ex.createdAt).toISOString().split('T')[0] : '',
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `exchanges_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Exchanges exported successfully');
  };

  // Separated Sorting Pipeline
  const filteredExchanges = useMemo(() => {
    let result = [...filteredExchangesBeforeSort];

    result.sort((a, b) => {
      if (sortBy === 'Newest first') {
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      }
      if (sortBy === 'Oldest first') {
        return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
      }
      if (sortBy === 'Price Difference: High to Low') {
        return Number(b.priceDifference || 0) - Number(a.priceDifference || 0);
      }
      if (sortBy === 'Price Difference: Low to High') {
        return Number(a.priceDifference || 0) - Number(b.priceDifference || 0);
      }
      return 0;
    });

    return result;
  }, [filteredExchangesBeforeSort, sortBy]);

  const stats = dashboardStats?.stats || {};

  const pendingApprovalCount = useMemo(() => {
    return exchanges.filter(isExchangeUnderReview).length || stats.pendingReturns || 0;
  }, [exchanges, stats.pendingReturns]);

  const logisticsPendingCount = useMemo(() => {
    return (
      exchanges.filter((ex) =>
        ['approved', 'return_courier_assigned', 'return_picked_up', 'return_in_transit'].includes(
          ex.returnRequestId?.status || ex.status,
        ),
      ).length ||
      stats.pendingPickups ||
      0
    );
  }, [exchanges, stats.pendingPickups]);

  const replacementsDispatchedCount = useMemo(() => {
    return (
      exchanges.filter((ex) =>
        ['shipped', 'out_for_delivery', 'reserved'].includes(ex.replacementStatus),
      ).length || 0
    );
  }, [exchanges]);

  const completedCount = useMemo(() => {
    return (
      exchanges.filter(
        (ex) =>
          ex.replacementStatus === 'delivered' ||
          ['completed', 'refund_completed'].includes(ex.returnRequestId?.status || ex.status),
      ).length || 0
    );
  }, [exchanges]);

  if (isLoading && !exchanges.length) {
    return (
      <div className="space-y-6 pb-12 sm:pb-8 text-left">
        {!hideHeader && (
          <PageHeader title="Exchanges" subtitle={<span>Loading exchanges summary...</span>} />
        )}
        <SkeletonTable rows={5} cols={6} />
      </div>
    );
  }

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={stagger}
      className="space-y-6 pb-12 sm:pb-8 text-left"
    >
      {/* ─── EXECUTIVE PAGE HEADER (Matches Orders & Returns) ─── */}
      {!hideHeader && (
        <PageHeader
          title="Exchanges"
          actionRowMobile
          headerAction={
            <div className="hidden sm:inline-flex items-center bg-[var(--admin-surface-muted)] dark:bg-stone-800/60 p-0.5 rounded-[6px] border border-[var(--admin-border)] shrink-0">
              <button
                type="button"
                onClick={() => navigate('/admin/returns')}
                className="h-[26px] sm:h-[28px] px-2 sm:px-2.5 rounded-[4px] flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer text-[11px] sm:text-[12px] font-medium text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] hover:bg-black/5 dark:hover:bg-white/5"
                title="Switch to Returns"
              >
                <span className="material-symbols-outlined text-[14px] leading-none">
                  assignment_return
                </span>
                <span>Returns</span>
              </button>
              <button
                type="button"
                onClick={() => navigate('/admin/exchanges')}
                className="h-[26px] sm:h-[28px] px-2 sm:px-2.5 rounded-[4px] flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer text-[11px] sm:text-[12px] font-bold bg-white dark:bg-stone-800 text-[var(--admin-accent)] shadow-xs border border-stone-200/90 dark:border-stone-700/80"
                title="Exchanges Page"
              >
                <span className="material-symbols-outlined text-[14px] leading-none">
                  swap_horiz
                </span>
                <span>Exchanges</span>
              </button>
            </div>
          }
          subtitle={
            isLoading && !exchanges.length ? (
              <span>Loading exchanges summary...</span>
            ) : (
              <div className="flex flex-wrap items-center gap-1.5 text-[13px]">
                <span className="font-semibold text-[var(--admin-text-primary)]">
                  {filteredExchanges.length} Total Exchanges
                </span>
                <span className="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  {pendingApprovalCount} Awaiting Action
                </span>
                {completedCount > 0 && (
                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {completedCount} Completed
                  </span>
                )}
              </div>
            )
          }
        />
      )}

      {/* ─── STICKY SEARCH & ACTIONS BAR (Matches Orders 42px bar) ─── */}
      <div className="sticky top-[var(--admin-topbar-height,56px)] z-20 -my-2 py-2 sm:py-2.5 bg-[var(--admin-bg)]/95 backdrop-blur-md flex flex-col gap-2">
        {/* Mobile Combined Switcher on top of search bar */}
        <div className="flex sm:hidden items-center bg-[var(--admin-surface-muted)] dark:bg-stone-800/60 p-1 rounded-[6px] border border-[var(--admin-border)] w-full">
          <button
            type="button"
            onClick={() => navigate('/admin/returns')}
            className="flex-1 h-[32px] rounded-[4px] flex items-center justify-center gap-1.5 text-[12px] font-medium text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[15px] leading-none">
              assignment_return
            </span>
            <span>Returns</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/admin/exchanges')}
            className="flex-1 h-[32px] rounded-[4px] flex items-center justify-center gap-1.5 text-[12px] font-bold transition-all cursor-pointer bg-white dark:bg-stone-800 text-[var(--admin-accent)] shadow-xs border border-stone-200/90 dark:border-stone-700/80"
          >
            <span className="material-symbols-outlined text-[15px] leading-none">swap_horiz</span>
            <span>Exchanges</span>
          </button>
        </div>

        <motion.div variants={fadeUp} className="flex flex-row items-center gap-2 w-full">
          {/* Search Bar - Height exactly matches FilterBar/Actions (42px) */}
          <div className="relative flex-1 min-w-0 bg-[var(--admin-surface-muted)] rounded-[4px] border border-[var(--admin-border)] flex items-center px-2.5 sm:px-3 h-[42px] min-h-[42px] max-h-[42px]">
            <span className="material-symbols-outlined text-[18px] text-[var(--admin-text-tertiary)] shrink-0">
              search
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search exchanges by ID, order, customer, product..."
              className="bg-transparent border-none outline-none w-full text-[13px] text-[var(--admin-text-primary)] placeholder-[var(--admin-text-tertiary)] font-medium px-2 h-full min-w-0"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)] cursor-pointer p-1 flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            )}
          </div>

          {/* Action Controls Group */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Filters Button */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setShowFiltersMenu(!showFiltersMenu)}
                className={`h-[42px] min-h-[42px] max-h-[42px] px-2.5 sm:px-3.5 flex items-center justify-center gap-1.5 rounded-[4px] border transition-colors shrink-0 cursor-pointer ${
                  showFiltersMenu || activeFilterCount > 0
                    ? 'bg-[var(--admin-accent)] text-white border-transparent shadow-sm font-semibold'
                    : 'bg-[var(--admin-surface-muted)] text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] border-[var(--admin-border)] hover:border-[var(--admin-border-strong)]'
                }`}
                title="Exchange Filters"
              >
                <span className="material-symbols-outlined text-[18px]">tune</span>
                <span className="font-semibold text-[13px] hidden sm:inline">
                  {activeFilterCount > 0 ? `${activeFilterCount} Filters` : 'Filters'}
                </span>
                {activeFilterCount > 0 && (
                  <span className="min-w-[16px] h-4 px-1 rounded-full bg-white text-[var(--admin-accent)] text-[10px] font-bold flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              {/* Filters Drawer / Dropdown */}
              <AdminFilterDrawer
                isOpen={showFiltersMenu}
                onClose={() => setShowFiltersMenu(false)}
                title="Exchange Filters"
                icon="tune"
                activeCount={activeFilterCount}
                onClearAll={handleResetAllFilters}
                clearAllLabel="Clear All"
                onApply={() => setShowFiltersMenu(false)}
              >
                <div className="space-y-4">
                  {/* Saved Views */}
                  <div>
                    <label className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider mb-2 block">
                      Saved Views
                    </label>
                    <select
                      value={filterState.savedView}
                      onChange={handleSavedViewChange}
                      className="w-full bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-[4px] px-3 py-2 text-[12px] font-medium outline-none text-[var(--admin-accent)] cursor-pointer"
                    >
                      <option value="All Exchanges">View: All Exchanges</option>
                      <option value="Needs Attention">Needs Action / Under Review</option>
                      <option value="Pending Pickups">Pending Return Pickups</option>
                      <option value="Replacement Dispatched">Replacement Dispatched</option>
                      <option value="Payment Required">Customer Payment Required</option>
                      <option value="Completed">Completed & Settled</option>
                    </select>
                  </div>

                  {/* Sort */}
                  <div>
                    <label className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider mb-2 block">
                      Sort By
                    </label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="w-full bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-[4px] px-3 py-2 text-[12px] outline-none cursor-pointer"
                    >
                      <option value="Newest first">Newest first</option>
                      <option value="Oldest first">Oldest first</option>
                      <option value="Price Difference: High to Low">Difference: High to Low</option>
                      <option value="Price Difference: Low to High">Difference: Low to High</option>
                    </select>
                  </div>

                  {/* Status Filter */}
                  <div>
                    <label className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider mb-2 block">
                      Status Lifecycle
                    </label>
                    <select
                      value={filterState.status}
                      onChange={(e) => setFilterValue('status', e.target.value)}
                      className="w-full bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-[4px] px-3 py-2 text-[12px] outline-none cursor-pointer"
                    >
                      <option value="All">All Statuses</option>
                      <option value="under_review">Under Review</option>
                      <option value="approved">Approved</option>
                      <option value="pickups">Pickup In Transit</option>
                      <option value="qc">QC / Warehouse Received</option>
                      <option value="dispatched">Replacement Dispatched</option>
                      <option value="completed">Completed</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>

                  {/* Price Difference Filter */}
                  <div>
                    <label className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider mb-2 block">
                      Price Difference
                    </label>
                    <select
                      value={filterState.diff}
                      onChange={(e) => setFilterValue('diff', e.target.value)}
                      className="w-full bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-[4px] px-3 py-2 text-[12px] outline-none cursor-pointer"
                    >
                      <option value="All">All Amounts</option>
                      <option value="zero">Even Swap (₹0 Diff)</option>
                      <option value="collect">Customer Collect Due (+)</option>
                      <option value="refund">Refund to Customer Due (-)</option>
                    </select>
                  </div>

                  {/* Date Filter */}
                  <div>
                    <label className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider mb-2 block">
                      Creation Date
                    </label>
                    <select
                      value={filterState.date}
                      onChange={(e) => setFilterValue('date', e.target.value)}
                      className="w-full bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-[4px] px-3 py-2 text-[12px] outline-none cursor-pointer"
                    >
                      <option value="All Time">All Time</option>
                      <option value="Today">Today</option>
                      <option value="Last 7 Days">Last 7 Days</option>
                      <option value="Last 30 Days">Last 30 Days</option>
                      <option value="This Month">This Month</option>
                      <option value="Custom">Custom Range...</option>
                    </select>
                  </div>

                  {filterState.date === 'Custom' && (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <input
                        type="date"
                        value={filterState.customDateRange?.from || ''}
                        onChange={(e) =>
                          setFilterValue('customDateRange', {
                            ...filterState.customDateRange,
                            from: e.target.value,
                          })
                        }
                        className="w-full bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-[4px] px-2 py-1.5 text-[11px] outline-none text-[var(--admin-text-primary)]"
                      />
                      <input
                        type="date"
                        value={filterState.customDateRange?.to || ''}
                        onChange={(e) =>
                          setFilterValue('customDateRange', {
                            ...filterState.customDateRange,
                            to: e.target.value,
                          })
                        }
                        className="w-full bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-[4px] px-2 py-1.5 text-[11px] outline-none text-[var(--admin-text-primary)]"
                      />
                    </div>
                  )}
                </div>
              </AdminFilterDrawer>
            </div>

            {/* View Mode Toggle (Table / Kanban) - Hidden on Mobile */}
            <div className="hidden md:flex items-center gap-1 shrink-0 bg-[var(--admin-surface-muted)] rounded-[4px] border border-[var(--admin-border)] p-1 h-[42px] min-h-[42px] max-h-[42px] box-border">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`h-[32px] w-[32px] min-h-[32px] min-w-[32px] max-h-[32px] max-w-[32px] rounded-[3px] box-border flex items-center justify-center transition-all cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-white dark:bg-stone-800 text-[var(--admin-accent)] shadow-xs font-bold'
                    : 'text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)]'
                }`}
                title="Table View"
              >
                <span className="material-symbols-outlined text-[18px] leading-none">
                  view_list
                </span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('kanban')}
                className={`h-[32px] w-[32px] min-h-[32px] min-w-[32px] max-h-[32px] max-w-[32px] rounded-[3px] box-border flex items-center justify-center transition-all cursor-pointer ${
                  viewMode === 'kanban'
                    ? 'bg-white dark:bg-stone-800 text-[var(--admin-accent)] shadow-xs font-bold'
                    : 'text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)]'
                }`}
                title="Kanban View"
              >
                <span className="material-symbols-outlined text-[18px] leading-none">
                  view_kanban
                </span>
              </button>
            </div>

            {/* Refresh Button - Hidden on Mobile */}
            <button
              type="button"
              onClick={fetchExchanges}
              className="hidden md:flex h-[42px] min-h-[42px] max-h-[42px] px-3 bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-border-subtle)] text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] rounded-[4px] items-center justify-center cursor-pointer transition-all active:scale-95 border border-[var(--admin-border)] shrink-0 gap-1.5 font-semibold text-[13px]"
              title="Refresh exchanges"
            >
              <span
                className={`material-symbols-outlined text-[18px] ${isLoading ? 'animate-spin' : ''}`}
              >
                refresh
              </span>
              <span>Refresh</span>
            </button>

            {/* Export CSV Button */}
            <button
              type="button"
              onClick={handleExportCSV}
              className="h-[42px] min-h-[42px] max-h-[42px] w-[42px] sm:w-auto px-0 sm:px-3 bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-border-subtle)] text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] rounded-[4px] flex items-center justify-center cursor-pointer transition-all active:scale-95 border border-[var(--admin-border)] shrink-0 gap-1.5 font-semibold text-[13px]"
              title="Export CSV"
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
              <span className="hidden sm:inline">Export</span>
            </button>
          </div>
        </motion.div>

        {/* Active Filter Chips Row */}
        <AdminActiveFilterChips
          activeChips={activeChips}
          totalCount={totalCount}
          matchCount={matchCount}
          onClearAll={handleResetAllFilters}
          itemName="exchanges"
          className="mt-2 mb-1"
        />
      </div>

      {/* ─── REAL-TIME OPERATIONS LEDGER (Matches Orders COD/Operations Ledger) ─── */}
      <motion.div
        variants={fadeUp}
        className="admin-card overflow-hidden text-left relative p-0 !rounded-[4px] border border-[var(--admin-border)] shadow-xs"
      >
        <div className="absolute top-0 left-0 w-full h-[3px] bg-[var(--admin-border-strong)] z-10" />
        <div className="grid grid-cols-2 md:grid-cols-4 bg-[var(--admin-surface)]">
          <div className="p-5 space-y-1 border-r border-b md:border-b-0 border-[var(--admin-border-subtle)]">
            <span className="text-[10px] text-[var(--admin-text-tertiary)] font-bold uppercase tracking-wider">
              Pending Exchanges
            </span>
            <p className="text-[14px] font-bold text-[var(--admin-text-primary)]">
              {pendingApprovalCount}
            </p>
            <span className="text-[10px] text-[var(--admin-text-secondary)] mt-1 block">
              Awaiting review
            </span>
          </div>
          <div className="p-5 space-y-1 border-b md:border-b-0 md:border-r border-[var(--admin-border-subtle)]">
            <span className="text-[10px] text-[var(--admin-warning)] font-bold uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[var(--admin-warning)] animate-pulse" />
              Logistics Pending
            </span>
            <p className="text-[14px] font-bold text-[var(--admin-text-primary)]">
              {logisticsPendingCount}
            </p>
            <span className="text-[10px] text-[var(--admin-text-secondary)] mt-1 block">
              Pickup / In Transit
            </span>
          </div>
          <div className="p-5 space-y-1 border-r border-[var(--admin-border-subtle)]">
            <span className="text-[10px] text-[var(--admin-text-tertiary)] font-bold uppercase tracking-wider">
              Replacement Shipped
            </span>
            <p className="text-[14px] font-bold text-[var(--admin-text-primary)]">
              {replacementsDispatchedCount}
            </p>
            <span className="text-[10px] text-[var(--admin-text-secondary)] mt-1 block">
              Fulfillment in transit
            </span>
          </div>
          <div className="p-5 space-y-1 bg-[var(--admin-success-light)] border-l-0">
            <span className="text-[10px] text-[var(--admin-success)] font-bold uppercase tracking-wider">
              Completed Swaps
            </span>
            <p className="text-[14px] font-bold text-[var(--admin-success)]">{completedCount}</p>
            <span className="text-[10px] text-[var(--admin-success)] opacity-80 mt-1 block">
              Delivered & Settled
            </span>
          </div>
        </div>
      </motion.div>

      {/* Desktop Table View */}
      {viewMode === 'table' && (
        <motion.div
          variants={fadeUp}
          className="hidden md:block admin-card overflow-x-auto p-0 !rounded-[4px] border border-[var(--admin-border)] shadow-xs text-left"
        >
          <div className="overflow-x-auto custom-scrollbar">
            <table className="admin-table w-full min-w-[1100px] text-left">
              <thead>
                <tr className="border-b border-[var(--admin-border-subtle)] bg-[var(--admin-surface-muted)] text-[11px] uppercase tracking-wider font-bold text-[var(--admin-text-tertiary)]">
                  <th className="py-3 px-4 whitespace-nowrap min-w-[130px] pl-5 !bg-[var(--admin-surface-muted)]">
                    Exchange ID
                  </th>
                  <th className="py-3 px-4 whitespace-nowrap min-w-[160px] !bg-[var(--admin-surface-muted)]">
                    Customer
                  </th>
                  <th className="py-3 px-4 min-w-[280px] !bg-[var(--admin-surface-muted)]">
                    Item Details
                  </th>
                  <th className="py-3 px-4 whitespace-nowrap min-w-[160px] !bg-[var(--admin-surface-muted)]">
                    Difference
                  </th>
                  <th className="py-3 px-4 whitespace-nowrap min-w-[190px] !bg-[var(--admin-surface-muted)]">
                    Req. Status
                  </th>
                  <th className="py-3 px-4 whitespace-nowrap text-right pr-5 min-w-[80px] !bg-[var(--admin-surface-muted)]">
                    Actions
                  </th>
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
                      <td className="min-w-[280px] py-3">
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
                          {(ex.returnRequestId?.items?.[0]?.reason || ex.reason) && (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-[11px] font-medium bg-amber-500/10 text-amber-900 dark:text-amber-300 border border-amber-500/20 w-fit max-w-full">
                              <span className="material-symbols-outlined text-[13px] text-amber-600 dark:text-amber-400 shrink-0">
                                info
                              </span>
                              <span className="truncate">
                                <span className="font-semibold text-amber-950 dark:text-amber-200">
                                  Reason:
                                </span>{' '}
                                {ex.returnRequestId?.items?.[0]?.reason || ex.reason}
                              </span>
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
                            ) : !isExchangeUnderReview(ex) ? (
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
                            ) : null
                          ) : ex.differenceAction === 'collect_payment' &&
                            Number(ex.priceDifference) > 0 ? (
                            ex.paymentStatus === 'payment_paid' ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded w-max">
                                <span className="material-symbols-outlined text-[12px]">
                                  check_circle
                                </span>
                                Paid
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openCollectPaymentModal(ex);
                                }}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300/80 rounded-md transition-all shadow-2xs cursor-pointer w-max"
                                title="Click to register payment collected from customer"
                              >
                                <span className="material-symbols-outlined text-[13px] text-amber-700">
                                  payments
                                </span>
                                Collect ₹{ex.priceDifference}
                              </button>
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
                          {isExchangeUnderReview(ex) ? (
                            <div className="flex items-center gap-1.5 w-max">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleApproveExchange(ex);
                                }}
                                disabled={updatingStatusId === ex._id}
                                className="h-9 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs rounded-[6px] flex items-center justify-center gap-1.5 px-3 shadow-2xs cursor-pointer border-0 disabled:opacity-50 transition-colors"
                              >
                                {updatingStatusId === ex._id ? (
                                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <span className="material-symbols-outlined text-[16px]">
                                    check_circle
                                  </span>
                                )}
                                <span>Approve</span>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRejectExchange(ex);
                                }}
                                disabled={updatingStatusId === ex._id}
                                className="h-9 bg-white dark:bg-stone-800 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 font-bold text-xs rounded-[6px] border border-red-200 dark:border-red-800/60 px-3 shadow-2xs cursor-pointer disabled:opacity-50 transition-colors flex items-center justify-center gap-1"
                              >
                                <span className="material-symbols-outlined text-[15px]">close</span>
                                <span>Reject</span>
                              </button>
                            </div>
                          ) : (
                            <div
                              className="flex items-center gap-1.5 w-max"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="relative w-[170px] h-9">
                                <select
                                  value={ex.returnRequestId?.status || 'approved'}
                                  onChange={(e) => handleReturnStatusChange(ex, e.target.value)}
                                  disabled={updatingStatusId === ex._id}
                                  className="w-full h-9 !min-h-[36px] !max-h-[36px] appearance-none bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-750 border border-stone-300 dark:border-stone-600 text-stone-800 dark:text-stone-200 text-[11px] font-bold rounded-[6px] pl-2.5 pr-7 cursor-pointer shadow-2xs outline-none focus:border-amber-500 transition-colors disabled:opacity-50 truncate"
                                >
                                  {RETURN_STATUS_OPTIONS.map((opt) => (
                                    <option
                                      key={opt.value}
                                      value={opt.value}
                                      disabled={opt.value === 'submitted'}
                                    >
                                      {opt.label}
                                    </option>
                                  ))}
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-stone-500">
                                  {updatingStatusId === ex._id ? (
                                    <span className="w-3.5 h-3.5 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
                                  ) : (
                                    <span className="material-symbols-outlined text-[16px]">
                                      expand_more
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
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
      )}

      {/* Cards View (Responsive Grid in kanban mode, mobile list in table mode) */}
      <motion.div
        variants={fadeUp}
        className={
          viewMode === 'kanban'
            ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pt-1'
            : 'md:hidden flex flex-col gap-3 px-0.5 py-1'
        }
      >
        {filteredExchanges.length === 0 ? (
          <div className="py-10 text-center flex flex-col items-center justify-center bg-[var(--admin-surface)] rounded-[var(--admin-radius-lg)] border border-[var(--admin-border)]">
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
          filteredExchanges.map((ex) => {
            const returnImg =
              ex.originalItem?.imageSrc || ex.originalItem?.image || ex.originalItem?.images?.[0];
            const replaceImg =
              ex.replacementItem?.imageSrc ||
              ex.replacementItem?.image ||
              ex.replacementItem?.images?.[0];
            const isExpanded = expandedCardIds.has(ex._id);

            return (
              <div
                key={ex._id}
                id={`exchange-card-${ex._id}`}
                onClick={() => {
                  const requestId = ex.returnRequestId?._id || ex.returnRequestId || ex._id;
                  if (requestId) navigate(`/admin/exchanges/requests/${requestId}`);
                }}
                className="relative overflow-hidden rounded-[8px] p-3.5 shadow-xs border border-stone-200/90 dark:border-stone-700/80 bg-white dark:bg-stone-900 flex flex-col gap-3 cursor-pointer hover:border-stone-300 dark:hover:border-stone-600 hover:shadow-sm transition-all"
              >
                {/* Header: Customer Name + Status Pill, with subtle faded EXC ID + Order */}
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-[var(--admin-text-primary)] text-[14px] block truncate leading-tight">
                      {ex.returnRequestId?.userId?.name || ex.userId?.name || 'Customer'}
                    </span>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <span className="font-mono text-[11px] font-medium text-[var(--admin-text-tertiary)] dark:text-stone-400">
                        #{ex.exchangeId || ex._id.substring(0, 8)}
                      </span>
                      <span className="font-mono text-[10.5px] text-[var(--admin-text-tertiary)]">
                        (Order #
                        {ex.orderId?.orderCode ||
                          ex.orderId?.orderId ||
                          (ex.orderId?._id || ex.orderId)?.toString().substring(0, 8) ||
                          'Order'}
                        )
                      </span>
                    </div>
                  </div>
                  <AdminStatusPill
                    status={getExchangeStatusLabel(
                      ex.returnRequestId?.status,
                      ex.replacementStatus,
                    )}
                    className="shrink-0"
                  />
                </div>

                {/* Swap Box with Product Images */}
                <div className="bg-[#FAF9F5] dark:bg-stone-800/60 p-2.5 rounded-[6px] border border-stone-200/80 dark:border-stone-700/60 flex items-center gap-2">
                  {/* Return Item Thumbnail & Title */}
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {returnImg ? (
                      <img
                        src={returnImg}
                        alt=""
                        className="w-11 h-11 rounded-[4px] object-cover border border-stone-200 bg-white shrink-0 shadow-2xs"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-[4px] bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-400 shrink-0">
                        <span className="material-symbols-outlined text-[18px]">inventory_2</span>
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <span className="text-[9px] font-extrabold text-amber-700 uppercase tracking-wider block leading-tight">
                        RETURN
                      </span>
                      <p
                        className="text-[12px] font-bold text-[var(--admin-text-primary)] truncate mt-0.5"
                        title={ex.originalItem?.title}
                      >
                        {ex.originalItem?.title || 'Returned Item'}
                      </p>
                    </div>
                  </div>

                  {/* Center Swap Arrow */}
                  <div className="shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-white dark:bg-stone-700 border border-stone-200/90 dark:border-stone-600 shadow-2xs text-stone-500 dark:text-stone-300">
                    <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                  </div>

                  {/* Replacement Item Thumbnail & Title */}
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {replaceImg ? (
                      <img
                        src={replaceImg}
                        alt=""
                        className="w-11 h-11 rounded-[4px] object-cover border border-blue-200 bg-white shrink-0 shadow-2xs"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-[4px] bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-400 shrink-0">
                        <span className="material-symbols-outlined text-[18px]">swap_horiz</span>
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <span className="text-[9px] font-extrabold text-blue-600 uppercase tracking-wider block leading-tight">
                        REPLACEMENT
                      </span>
                      <p
                        className="text-[12px] font-bold text-[var(--admin-text-primary)] truncate mt-0.5"
                        title={ex.replacementItem?.title}
                      >
                        {ex.replacementItem?.title || 'Replacement Item'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Financial Difference & Status Badge */}
                <div className="flex items-center justify-between pt-0.5 text-xs">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] text-[var(--admin-text-secondary)] font-medium">
                      Difference:
                    </span>
                    <span className="font-extrabold text-[var(--admin-text-primary)] text-[13px]">
                      ₹{ex.priceDifference || 0}
                    </span>
                    {ex.differenceAction === 'refund_difference' &&
                      Number(ex.priceDifference) > 0 &&
                      (Boolean(ex.additionalRefundId) ||
                      ex.paymentStatus === 'payment_paid' ||
                      ['completed', 'refund_completed'].includes(ex.returnRequestId?.status) ||
                      Boolean(ex.returnRequestId?.refundRecordId) ? (
                        <span className="inline-flex items-center gap-0.5 text-[9.5px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-[4px]">
                          <span className="material-symbols-outlined text-[11px]">verified</span>
                          Settled
                        </span>
                      ) : !isExchangeUnderReview(ex) ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openManualSettleModal(ex, false);
                          }}
                          className="px-2 py-0.5 text-[9.5px] font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-[4px] shadow-2xs cursor-pointer flex items-center gap-0.5"
                        >
                          <span className="material-symbols-outlined text-[11px]">
                            currency_rupee
                          </span>
                          Settle
                        </button>
                      ) : null)}
                    {ex.differenceAction === 'collect_payment' &&
                      Number(ex.priceDifference) > 0 &&
                      ex.paymentStatus === 'payment_paid' && (
                        <span className="inline-flex items-center gap-0.5 text-[9.5px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-[4px]">
                          <span className="material-symbols-outlined text-[11px]">
                            check_circle
                          </span>
                          Paid
                        </span>
                      )}
                  </div>

                  <div>
                    {/* Instead of reserve stock badge, show Collect Payment button if customer needs to pay and has not paid yet */}
                    {ex.differenceAction === 'collect_payment' &&
                    Number(ex.priceDifference) > 0 &&
                    ex.paymentStatus !== 'payment_paid' ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openCollectPaymentModal(ex);
                        }}
                        className="px-2.5 py-1 text-[10px] font-bold bg-amber-500 hover:bg-amber-600 active:scale-95 text-white rounded-[6px] shadow-2xs cursor-pointer flex items-center gap-1 border border-amber-600 transition-all uppercase tracking-wider"
                        title="Click to register customer difference payment"
                      >
                        <span className="material-symbols-outlined text-[13px]">payments</span>
                        Collect ₹{ex.priceDifference}
                      </button>
                    ) : (
                      (() => {
                        const info = getReplacementStatusInfo(
                          ex.replacementStatus,
                          ex.returnRequestId?.status,
                          Boolean(ex.replacementItem?.reservationId),
                        );
                        return (
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-[4px] text-[10px] font-bold uppercase tracking-wider border whitespace-nowrap shrink-0 ${info.badgeClass}`}
                          >
                            <span className="material-symbols-outlined text-[12px]">
                              {info.icon}
                            </span>
                            {info.label}
                          </span>
                        );
                      })()
                    )}
                  </div>
                </div>

                {/* Status Action Section:
                      - When submitted: show APPROVE EXCHANGE & REJECT pill buttons, plus Details toggle
                      - Only after approval does the full status dropdown activate:
                        Both Status Dropdown & Details Button are placed in a 2-column grid to strictly match size equally (36px height, 50% width each)
                  */}
                {isExchangeUnderReview(ex) ? (
                  <div
                    className="flex items-center justify-between pt-2 border-t border-stone-200/70 dark:border-stone-700/60 gap-2 w-full"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      {/* APPROVE EXCHANGE Button (Green / Emerald with 6px border-radius) */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApproveExchange(ex);
                        }}
                        disabled={updatingStatusId === ex._id}
                        className="flex-1 min-w-0 h-9 rounded-[6px] bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-[10.5px] sm:text-[11px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 px-3 shadow-2xs cursor-pointer border-0 disabled:opacity-50"
                      >
                        {updatingStatusId === ex._id ? (
                          <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                        ) : (
                          <span className="material-symbols-outlined text-[16px] shrink-0">
                            check_circle
                          </span>
                        )}
                        <span className="truncate">Approve Exchange</span>
                      </button>

                      {/* REJECT Button (Matching 6px border-radius) */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRejectExchange(ex);
                        }}
                        disabled={updatingStatusId === ex._id}
                        className="h-9 px-3 rounded-[6px] border border-red-200 text-red-700 bg-white hover:bg-red-50 active:scale-95 text-[10.5px] sm:text-[11px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer shadow-2xs shrink-0 disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-[16px] text-red-600">
                          cancel
                        </span>
                        <span>Reject</span>
                      </button>
                    </div>

                    {/* Expandable Details Toggle */}
                    <button
                      type="button"
                      onClick={() => toggleExpandCard(ex._id)}
                      className={`h-9 px-2.5 rounded-[6px] border text-[11px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer shadow-2xs shrink-0 ${
                        isExpanded
                          ? 'border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200'
                          : 'border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-50'
                      }`}
                      title="Toggle Order Details"
                    >
                      <span>{isExpanded ? 'Hide' : 'Details'}</span>
                      <span className="material-symbols-outlined text-[16px] shrink-0 text-stone-500">
                        {isExpanded ? 'expand_less' : 'expand_more'}
                      </span>
                    </button>
                  </div>
                ) : (
                  <div
                    className="flex items-center gap-2 pt-2 border-t border-stone-200/70 dark:border-stone-700/60 w-full"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="text-[10px] uppercase font-bold text-stone-500 dark:text-stone-400 shrink-0">
                      Status:
                    </span>

                    {/* Symmetrical 2-Column Grid: Exact Equal Width & Height for both Status Dropdown and Details Button */}
                    <div className="grid grid-cols-2 gap-2 flex-1 min-w-0">
                      {/* Box 1: Status Dropdown */}
                      <div className="relative w-full h-9">
                        <select
                          value={ex.returnRequestId?.status || 'approved'}
                          onChange={(e) => handleReturnStatusChange(ex, e.target.value)}
                          disabled={updatingStatusId === ex._id}
                          className="w-full h-9 !min-h-[36px] !max-h-[36px] appearance-none bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-750 border border-stone-300 dark:border-stone-600 text-stone-800 dark:text-stone-200 text-[11px] font-bold rounded-[6px] pl-2.5 pr-7 cursor-pointer shadow-2xs outline-none focus:border-amber-500 transition-colors disabled:opacity-50 truncate"
                        >
                          {RETURN_STATUS_OPTIONS.map((opt) => (
                            <option
                              key={opt.value}
                              value={opt.value}
                              disabled={opt.value === 'submitted'}
                            >
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-stone-500">
                          {updatingStatusId === ex._id ? (
                            <span className="w-3.5 h-3.5 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <span className="material-symbols-outlined text-[16px]">
                              expand_more
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Box 2: Details Toggle Button (Matching 36px Height, 50% Width, and 6px Radius) */}
                      <button
                        type="button"
                        onClick={() => toggleExpandCard(ex._id)}
                        className={`w-full h-9 !min-h-[36px] !max-h-[36px] rounded-[6px] border text-[11px] font-bold flex items-center justify-between px-2.5 transition-colors cursor-pointer shadow-2xs ${
                          isExpanded
                            ? 'border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200'
                            : 'border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-50'
                        }`}
                        title="Toggle Order Details"
                      >
                        <span className="truncate">{isExpanded ? 'Hide' : 'Details'}</span>
                        <span className="material-symbols-outlined text-[16px] shrink-0 text-stone-500">
                          {isExpanded ? 'expand_less' : 'expand_more'}
                        </span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Expandable Details Panel */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      key={`exchange-expanded-${ex._id}`}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
                      <div
                        className="pt-2 border-t border-dashed border-stone-200 dark:border-stone-700 flex flex-col gap-2 text-xs"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Customer Contact: Equally aligned 2-column grid matching controls sideways */}
                        <div className="grid grid-cols-2 gap-2 items-center text-[11px] text-stone-600 dark:text-stone-300 bg-stone-50 dark:bg-stone-800/50 px-2.5 py-2 rounded-[6px] border border-stone-200/60 dark:border-stone-700/60">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="material-symbols-outlined !text-[15px] !leading-none text-stone-400 shrink-0 select-none">
                              call
                            </span>
                            <a
                              href={`tel:${ex.returnRequestId?.userId?.phone || ex.userId?.phone || ''}`}
                              className="font-semibold text-stone-800 dark:text-stone-200 hover:underline truncate leading-tight inline-flex items-center"
                            >
                              {ex.returnRequestId?.userId?.phone || ex.userId?.phone || 'No phone'}
                            </a>
                          </div>
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="material-symbols-outlined !text-[15px] !leading-none text-stone-400 shrink-0 select-none">
                              mail
                            </span>
                            <a
                              href={`mailto:${ex.returnRequestId?.userId?.email || ex.userId?.email || ''}`}
                              className="font-medium text-stone-700 dark:text-stone-300 hover:underline truncate leading-tight inline-flex items-center"
                              title={ex.returnRequestId?.userId?.email || ex.userId?.email}
                            >
                              {ex.returnRequestId?.userId?.email || ex.userId?.email || 'No email'}
                            </a>
                          </div>
                        </div>

                        {/* Return Reason */}
                        {ex.returnRequestId?.items?.[0]?.reason && (
                          <div className="text-[11px] bg-amber-500/5 border border-amber-500/20 p-2 rounded-[6px] text-amber-900 dark:text-amber-300 flex items-start gap-1.5">
                            <span className="material-symbols-outlined text-[14px] shrink-0 text-amber-600 dark:text-amber-400 mt-0.5">
                              info
                            </span>
                            <div className="leading-tight">
                              <span className="font-semibold text-stone-700 dark:text-stone-300 block mb-0.5">
                                Return Reason:
                              </span>
                              {ex.returnRequestId.items[0].reason}
                            </div>
                          </div>
                        )}

                        {/* Customer UPI for Balance Refund */}
                        {(ex.upiId || ex.returnRequestId?.upiId) && (
                          <div className="text-[11px] bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700 p-2 rounded-[6px] flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="material-symbols-outlined text-[14px] shrink-0 text-stone-400">
                                account_balance_wallet
                              </span>
                              <span className="truncate text-stone-600 dark:text-stone-300 font-mono text-[10.5px]">
                                UPI: {ex.upiId || ex.returnRequestId?.upiId}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(
                                  ex.upiId || ex.returnRequestId?.upiId,
                                );
                                toast.success('UPI ID copied!');
                              }}
                              className="text-amber-700 dark:text-amber-400 font-bold hover:underline flex items-center gap-0.5 shrink-0"
                            >
                              <span className="material-symbols-outlined text-[12px]">
                                content_copy
                              </span>
                              Copy
                            </button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </motion.div>
      {/* ─── Manual Refund Settlement Modal (Standardized Rental Style) ─── */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {isSettleModalOpen && settleExchange && (
              <div
                key="settle-refund-modal-portal"
                className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 font-sans pointer-events-none"
                style={{
                  fontFamily:
                    "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                }}
              >
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={!isSubmittingSettle ? () => setIsSettleModalOpen(false) : undefined}
                  className="fixed inset-0 bg-black/40 dark:bg-black/60 cursor-pointer pointer-events-auto"
                  style={{ backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}
                />
                <motion.div
                  initial={{ opacity: 0, y: isMobile ? '100%' : 4, scale: isMobile ? 1 : 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: isMobile ? '100%' : 4, scale: isMobile ? 1 : 0.98 }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  className={`admin-section-root ${isDark ? 'dark' : ''} pointer-events-auto relative w-full sm:max-w-md bg-white dark:bg-[#1f1e1b] rounded-t-[6px] sm:rounded-[4px] shadow-2xl overflow-hidden z-10 border-t sm:border border-[#e8e4d9] dark:border-white/10 font-sans max-h-[88vh] sm:max-h-none flex flex-col`}
                  style={{
                    backgroundColor: 'var(--admin-surface, #ffffff)',
                    borderColor: 'var(--admin-border, #e8e4d9)',
                    fontFamily:
                      "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Mobile Drawer Pull Indicator */}
                  <div className="pt-2.5 pb-1 sm:hidden flex justify-center w-full bg-[#f2efe5] dark:bg-[#2a2823] cursor-grab active:cursor-grabbing">
                    <div className="w-10 h-1.5 rounded-full bg-stone-300 dark:bg-stone-600" />
                  </div>

                  {/* Header */}
                  <div
                    className="px-5 py-3.5 sm:py-4 border-b border-[#e8e4d9] dark:border-white/10 flex items-center justify-between shrink-0"
                    style={{
                      borderColor: 'var(--admin-border-subtle, #e8e4d9)',
                    }}
                  >
                    <div className="min-w-0 pr-2">
                      <h3
                        className="text-[14.5px] font-bold text-[var(--admin-text-primary)] flex items-center gap-2 !font-sans tracking-normal"
                        style={{
                          fontFamily:
                            "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                        }}
                      >
                        <span className="material-symbols-outlined text-[20px] text-[var(--admin-accent)]">
                          payments
                        </span>
                        Record Balance Refund
                      </h3>
                      <p className="text-[11px] text-[var(--admin-text-secondary)] font-medium truncate mt-0.5 !font-sans">
                        Exchange #{settleExchange.exchangeId || settleExchange._id?.slice(-8)}{' '}
                        &bull; Customer Balance Settlement
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsSettleModalOpen(false)}
                      disabled={isSubmittingSettle}
                      className="w-7 h-7 rounded-[4px] flex items-center justify-center text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                  </div>

                  {/* Form */}
                  <form
                    onSubmit={handleSettleSubmit}
                    className="p-5 sm:p-6 space-y-4 font-sans overflow-y-auto custom-scrollbar flex-1 pb-8 sm:pb-6"
                  >
                    {/* Summary Box */}
                    <div
                      className="bg-[#f6f4eb] dark:bg-[#211f1b] rounded-[4px] p-3.5 border border-[#e8e4d9] dark:border-white/10 space-y-2 text-xs"
                      style={{
                        backgroundColor: 'var(--admin-bg-subtle, #f6f4eb)',
                        borderColor: 'var(--admin-border-subtle, #e8e4d9)',
                      }}
                    >
                      <div className="flex justify-between items-center text-[13px]">
                        <span className="text-[var(--admin-text-secondary)] font-medium">
                          Customer
                        </span>
                        <span className="font-bold text-[var(--admin-text-primary)]">
                          {settleExchange.returnRequestId?.userId?.name || 'Customer'}
                        </span>
                      </div>
                      {(settleExchange.upiId || settleExchange.returnRequestId?.upiId) && (
                        <div className="flex justify-between items-center text-[12px] pt-1 border-t border-[var(--admin-border-subtle)]">
                          <span className="text-[var(--admin-text-secondary)] font-medium">
                            Customer UPI
                          </span>
                          <div className="flex items-center gap-1 font-mono font-bold text-[var(--admin-text-primary)]">
                            <span>
                              {settleExchange.upiId || settleExchange.returnRequestId?.upiId}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const upi =
                                  settleExchange.upiId || settleExchange.returnRequestId?.upiId;
                                navigator.clipboard.writeText(upi);
                                toast.success(`Copied UPI ID: ${upi}`);
                              }}
                              className="text-[var(--admin-accent)] hover:underline cursor-pointer p-0.5"
                              title="Copy UPI ID"
                            >
                              <span className="material-symbols-outlined text-[13px]">
                                content_copy
                              </span>
                            </button>
                          </div>
                        </div>
                      )}
                      <div className="flex justify-between items-center text-[14px] pt-1.5 mt-1 border-t border-[var(--admin-border-subtle)]">
                        <span className="font-bold text-[var(--admin-text-primary)]">
                          Refund Due
                        </span>
                        <span className="font-bold text-amber-700 dark:text-amber-400 text-[15px] font-mono">
                          ₹{settleExchange.priceDifference || 0}
                        </span>
                      </div>
                    </div>

                    {/* Amount to Refund */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--admin-text-secondary)] block">
                          Refund Amount (₹) *
                        </label>
                        {settleExchange.priceDifference > 0 &&
                          String(settleData.amount) !== String(settleExchange.priceDifference) && (
                            <button
                              type="button"
                              onClick={() =>
                                setSettleData({
                                  ...settleData,
                                  amount: settleExchange.priceDifference,
                                })
                              }
                              className="text-[11px] font-semibold text-[var(--admin-accent)] hover:underline cursor-pointer"
                            >
                              Fill Due (₹{settleExchange.priceDifference})
                            </button>
                          )}
                      </div>
                      <div className="relative flex items-center">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--admin-text-tertiary)] font-bold text-[14px] pointer-events-none select-none">
                          ₹
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          min="1"
                          required
                          value={settleData.amount}
                          onChange={(e) => setSettleData({ ...settleData, amount: e.target.value })}
                          placeholder={`e.g. ${settleExchange.priceDifference || 500}`}
                          disabled={isSubmittingSettle}
                          className="w-full h-10 pl-8 pr-3 rounded-[4px] border border-[var(--admin-border)] bg-white dark:bg-[#1a1815] text-[var(--admin-text-primary)] focus:border-[var(--admin-accent)] outline-none text-[14px] font-semibold transition-all font-mono"
                          style={{
                            backgroundColor: 'var(--admin-bg, #ffffff)',
                            borderColor: 'var(--admin-border, #e8e4d9)',
                            color: 'var(--admin-text-primary, #000000)',
                          }}
                        />
                      </div>
                    </div>

                    {/* Payment Mode */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--admin-text-secondary)] block">
                        Payment Mode *
                      </label>
                      <div className="relative">
                        <select
                          value={settleData.paymentMethod}
                          onChange={(e) =>
                            setSettleData({ ...settleData, paymentMethod: e.target.value })
                          }
                          disabled={isSubmittingSettle}
                          className="w-full h-10 px-3 pr-9 rounded-[4px] border border-[var(--admin-border)] bg-white dark:bg-[#1a1815] text-[var(--admin-text-primary)] focus:border-[var(--admin-accent)] outline-none text-[13px] cursor-pointer font-medium"
                          style={{
                            backgroundColor: 'var(--admin-bg, #ffffff)',
                            borderColor: 'var(--admin-border, #e8e4d9)',
                            color: 'var(--admin-text-primary, #000000)',
                            WebkitAppearance: 'none',
                            MozAppearance: 'none',
                            appearance: 'none',
                            backgroundImage: 'none',
                          }}
                        >
                          <option value="upi">Direct UPI (GPay / PhonePe / Paytm / BHIM)</option>
                          <option value="bank_transfer">Direct Bank Transfer (IMPS / NEFT)</option>
                          <option value="cash">Cash Handover / In-Person</option>
                          <option value="wallet">Customer Store Wallet Credit</option>
                        </select>
                        <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-[18px] text-[var(--admin-text-secondary)] pointer-events-none select-none">
                          expand_more
                        </span>
                      </div>
                    </div>

                    {/* Customer UPI if UPI mode */}
                    {settleData.paymentMethod === 'upi' && (
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--admin-text-secondary)] block">
                          Customer Destination UPI ID *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. user@okhdfcbank"
                          value={settleData.upiId}
                          onChange={(e) => setSettleData({ ...settleData, upiId: e.target.value })}
                          disabled={isSubmittingSettle}
                          className="w-full h-10 px-3 rounded-[4px] border border-[var(--admin-border)] bg-white dark:bg-[#1a1815] text-[var(--admin-text-primary)] focus:border-[var(--admin-accent)] outline-none text-[13px] font-mono transition-all"
                          style={{
                            backgroundColor: 'var(--admin-bg, #ffffff)',
                            borderColor: 'var(--admin-border, #e8e4d9)',
                            color: 'var(--admin-text-primary, #000000)',
                          }}
                        />
                      </div>
                    )}

                    {/* UTR / Transaction Reference */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--admin-text-secondary)] block">
                          Transaction Reference / UTR
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            const randomRef = `REF-${Date.now().toString().slice(-8)}`;
                            setSettleData({ ...settleData, transactionId: randomRef });
                          }}
                          className="text-[11px] font-semibold text-[var(--admin-accent)] hover:underline cursor-pointer"
                        >
                          Auto-fill Ref
                        </button>
                      </div>
                      <input
                        type="text"
                        placeholder="e.g. UPI-5601315 or 423589123456"
                        value={settleData.transactionId}
                        onChange={(e) =>
                          setSettleData({ ...settleData, transactionId: e.target.value })
                        }
                        disabled={isSubmittingSettle}
                        className="w-full h-10 px-3 rounded-[4px] border border-[var(--admin-border)] bg-white dark:bg-[#1a1815] text-[var(--admin-text-primary)] focus:border-[var(--admin-accent)] outline-none text-[13px] font-mono transition-all"
                        style={{
                          backgroundColor: 'var(--admin-bg, #ffffff)',
                          borderColor: 'var(--admin-border, #e8e4d9)',
                          color: 'var(--admin-text-primary, #000000)',
                        }}
                      />
                    </div>

                    {/* Internal Note */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--admin-text-secondary)] block">
                        Admin Internal Note (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Verified transfer in bank portal..."
                        value={settleData.notes}
                        onChange={(e) => setSettleData({ ...settleData, notes: e.target.value })}
                        disabled={isSubmittingSettle}
                        className="w-full h-10 px-3 rounded-[4px] border border-[var(--admin-border)] bg-white dark:bg-[#1a1815] text-[var(--admin-text-primary)] focus:border-[var(--admin-accent)] outline-none text-[13px] transition-all"
                        style={{
                          backgroundColor: 'var(--admin-bg, #ffffff)',
                          borderColor: 'var(--admin-border, #e8e4d9)',
                          color: 'var(--admin-text-primary, #000000)',
                        }}
                      />
                    </div>

                    {/* Auto Complete Checkbox */}
                    <label className="flex items-start gap-2.5 p-3 rounded-[4px] border border-[#e8e4d9] dark:border-white/10 bg-[#f6f4eb] dark:bg-[#211f1b] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settleData.autoComplete}
                        onChange={(e) =>
                          setSettleData({ ...settleData, autoComplete: e.target.checked })
                        }
                        className="mt-0.5 rounded-[3px] accent-[var(--admin-accent)]"
                      />
                      <div className="text-[11.5px] leading-tight text-[var(--admin-text-primary)]">
                        <strong className="block font-bold">
                          Mark exchange as Completed immediately
                        </strong>
                        <span className="text-[10.5px] text-[var(--admin-text-secondary)]">
                          Finalizes the exchange request and records payout in audit log.
                        </span>
                      </div>
                    </label>

                    {/* Submit Button */}
                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={isSubmittingSettle || Number(settleData.amount) <= 0}
                        className="w-full h-10 rounded-[4px] bg-[var(--admin-accent)] hover:bg-[var(--admin-accent-hover)] text-white font-bold text-[13px] shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{
                          backgroundColor: 'var(--admin-accent, #826237)',
                        }}
                      >
                        {isSubmittingSettle ? (
                          <>
                            <span className="material-symbols-outlined animate-spin text-[16px]">
                              progress_activity
                            </span>
                            <span>Recording Refund...</span>
                          </>
                        ) : (
                          <span>
                            {settleData.autoComplete
                              ? 'Confirm Refund & Complete Exchange'
                              : 'Record Refund Only'}
                          </span>
                        )}
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body,
        )}

      {/* ─── Collect Customer Difference Payment Modal (Standardized Rental Style) ─── */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {isCollectPaymentModalOpen && collectPaymentExchange && (
              <div
                key="collect-payment-modal-portal"
                className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 font-sans pointer-events-none"
                style={{
                  fontFamily:
                    "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                }}
              >
                {/* Full-screen Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={
                    !isSubmittingPayment ? () => setIsCollectPaymentModalOpen(false) : undefined
                  }
                  className="fixed inset-0 bg-black/40 dark:bg-black/60 cursor-pointer pointer-events-auto"
                  style={{ backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}
                />

                {/* Modal Card / Mobile App Drawer */}
                <motion.div
                  initial={{ opacity: 0, y: isMobile ? '100%' : 4, scale: isMobile ? 1 : 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: isMobile ? '100%' : 4, scale: isMobile ? 1 : 0.98 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  className="relative w-full sm:max-w-md bg-[var(--admin-bg)] dark:bg-[#1a1815] rounded-t-[6px] sm:rounded-[4px] shadow-2xl border border-[#e8e4d9] dark:border-white/10 overflow-hidden z-10 pointer-events-auto flex flex-col max-h-[90vh] sm:max-h-[85vh] font-sans"
                  style={{
                    backgroundColor: 'var(--admin-bg, #ffffff)',
                    borderColor: 'var(--admin-border, #e8e4d9)',
                    fontFamily:
                      "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                    boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.2)',
                  }}
                >
                  {/* Top Drag Handle for Mobile */}
                  <div className="w-10 h-1 bg-stone-300 dark:bg-stone-600 rounded-full mx-auto mt-2.5 mb-1 sm:hidden shrink-0" />

                  {/* Header: Title + Close Button (Clean & Transparent BG) */}
                  <div
                    className="flex items-center justify-between px-5 py-3.5 sm:py-4 border-b border-[#e8e4d9] dark:border-white/10 shrink-0"
                    style={{
                      borderColor: 'var(--admin-border-subtle, #e8e4d9)',
                    }}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-[4px] bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[18px]">payments</span>
                      </div>
                      <div>
                        <h3
                          className="text-[14.5px] font-bold text-[var(--admin-text-primary)] leading-tight tracking-normal !font-sans"
                          style={{
                            fontFamily:
                              "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                          }}
                        >
                          Collect Customer Payment
                        </h3>
                        <p className="text-[11px] text-[var(--admin-text-secondary)] mt-0.5 font-medium !font-sans">
                          Exchange #
                          {collectPaymentExchange.exchangeId ||
                            collectPaymentExchange._id?.slice(-8)}{' '}
                          &bull; Required Difference: ₹{collectPaymentExchange.priceDifference}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsCollectPaymentModalOpen(false)}
                      disabled={isSubmittingPayment}
                      className="w-7 h-7 rounded-[4px] flex items-center justify-center text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                  </div>

                  {/* Form */}
                  <form
                    onSubmit={handleCollectPaymentSubmit}
                    className="p-5 sm:p-6 space-y-4 font-sans overflow-y-auto custom-scrollbar flex-1 pb-8 sm:pb-6"
                  >
                    {/* Price Difference Summary Box (Clean, Warm & Polished) */}
                    <div
                      className="bg-[#faf8f2] dark:bg-[#201e19] rounded-[4px] p-3.5 border border-[#e8e4d9] dark:border-white/10 space-y-2.5 text-xs shadow-2xs"
                      style={{
                        backgroundColor: 'var(--admin-bg-subtle, #faf8f2)',
                        borderColor: 'var(--admin-border-subtle, #e8e4d9)',
                        fontFamily:
                          "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                      }}
                    >
                      <div className="space-y-2">
                        {/* Original Item */}
                        <div className="flex justify-between items-start text-[12.5px] gap-2">
                          <span className="text-stone-500 dark:text-stone-400 font-medium shrink-0 flex items-center gap-1.5 pt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-stone-400"></span>
                            Original Item
                          </span>
                          <span className="font-semibold text-[var(--admin-text-primary)] text-right truncate max-w-[220px]">
                            {collectPaymentExchange.originalItem?.title || 'Original Item'}
                          </span>
                        </div>

                        {/* Replacement Item */}
                        <div className="flex justify-between items-start text-[12.5px] gap-2">
                          <span className="text-emerald-700 dark:text-emerald-400 font-medium shrink-0 flex items-center gap-1.5 pt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Replacement Item
                          </span>
                          <span className="font-semibold text-emerald-700 dark:text-emerald-300 text-right truncate max-w-[220px]">
                            {collectPaymentExchange.replacementItem?.title || 'Replacement Item'}
                          </span>
                        </div>
                      </div>

                      {/* Highlighted Difference Banner */}
                      <div className="flex justify-between items-center px-3 py-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/40 rounded-[4px] mt-1">
                        <span className="font-bold text-[12px] text-amber-900 dark:text-amber-200">
                          Price Difference Due
                        </span>
                        <span className="font-extrabold text-amber-700 dark:text-amber-400 font-mono text-[15px]">
                          ₹{collectPaymentExchange.priceDifference || 0}
                        </span>
                      </div>
                    </div>

                    {/* Amount Input */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--admin-text-secondary)] block">
                          Payment Amount (₹) *
                        </label>
                        {collectPaymentExchange.priceDifference > 0 &&
                          String(collectPaymentData.amount) !==
                            String(collectPaymentExchange.priceDifference) && (
                            <button
                              type="button"
                              onClick={() =>
                                setCollectPaymentData({
                                  ...collectPaymentData,
                                  amount: String(collectPaymentExchange.priceDifference),
                                })
                              }
                              className="text-[11px] font-bold text-amber-700 dark:text-amber-400 hover:underline cursor-pointer"
                            >
                              Pay Full (₹{collectPaymentExchange.priceDifference})
                            </button>
                          )}
                      </div>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[14px] font-bold text-[var(--admin-text-secondary)]">
                          ₹
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          required
                          value={collectPaymentData.amount}
                          onChange={(e) =>
                            setCollectPaymentData({ ...collectPaymentData, amount: e.target.value })
                          }
                          placeholder={`e.g. ${collectPaymentExchange.priceDifference || 500}`}
                          disabled={isSubmittingPayment}
                          className="w-full h-10 pl-8 pr-3 rounded-[4px] border border-[var(--admin-border)] bg-white dark:bg-[#1a1815] text-[var(--admin-text-primary)] focus:border-[var(--admin-accent)] outline-none text-[14px] font-bold font-mono transition-all"
                          style={{
                            backgroundColor: 'var(--admin-bg, #ffffff)',
                            borderColor: 'var(--admin-border, #e8e4d9)',
                            color: 'var(--admin-text-primary, #000000)',
                          }}
                        />
                      </div>
                    </div>

                    {/* Payment Mode */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--admin-text-secondary)] block">
                        Payment Method *
                      </label>
                      <div className="relative">
                        <select
                          required
                          value={collectPaymentData.paymentMethod}
                          onChange={(e) =>
                            setCollectPaymentData({
                              ...collectPaymentData,
                              paymentMethod: e.target.value,
                            })
                          }
                          disabled={isSubmittingPayment}
                          className="w-full h-10 pl-3 pr-9 rounded-[4px] border border-[var(--admin-border)] bg-white dark:bg-[#1a1815] text-[var(--admin-text-primary)] focus:border-[var(--admin-accent)] outline-none text-[13px] font-medium transition-all cursor-pointer"
                          style={{
                            backgroundColor: 'var(--admin-bg, #ffffff)',
                            borderColor: 'var(--admin-border, #e8e4d9)',
                            color: 'var(--admin-text-primary, #000000)',
                            WebkitAppearance: 'none',
                            MozAppearance: 'none',
                            appearance: 'none',
                            backgroundImage: 'none',
                          }}
                        >
                          <option value="upi">UPI / QR Code Scan</option>
                          <option value="bank_transfer">Direct Bank Transfer / NEFT / IMPS</option>
                          <option value="cash">Cash in Hand</option>
                          <option value="card">POS / Debit / Credit Card</option>
                          <option value="other">Other Payment Mode</option>
                        </select>
                        <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-[18px] text-[var(--admin-text-secondary)] pointer-events-none select-none">
                          expand_more
                        </span>
                      </div>
                    </div>

                    {/* Note / Reference (Optional, matching RentalPaymentModal) */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--admin-text-secondary)] block">
                        Note / Reference (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Handed over at counter / UPI Ref #123"
                        value={collectPaymentData.note}
                        onChange={(e) =>
                          setCollectPaymentData({ ...collectPaymentData, note: e.target.value })
                        }
                        disabled={isSubmittingPayment}
                        className="w-full h-10 px-3 rounded-[4px] border border-[var(--admin-border)] bg-white dark:bg-[#1a1815] text-[var(--admin-text-primary)] focus:border-[var(--admin-accent)] outline-none text-[13px] transition-all"
                        style={{
                          backgroundColor: 'var(--admin-bg, #ffffff)',
                          borderColor: 'var(--admin-border, #e8e4d9)',
                          color: 'var(--admin-text-primary, #000000)',
                        }}
                      />
                    </div>

                    {/* Actions */}
                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={isSubmittingPayment || Number(collectPaymentData.amount) <= 0}
                        className="w-full h-10 rounded-[4px] bg-[var(--admin-accent)] hover:bg-[var(--admin-accent-hover)] text-white font-bold text-[13px] shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{
                          backgroundColor: 'var(--admin-accent, #826237)',
                        }}
                      >
                        {isSubmittingPayment ? (
                          <>
                            <span className="material-symbols-outlined animate-spin text-[16px]">
                              progress_activity
                            </span>
                            <span>Recording Payment...</span>
                          </>
                        ) : (
                          <span>
                            Record Payment{' '}
                            {Number(collectPaymentData.amount) > 0
                              ? `(₹${collectPaymentData.amount})`
                              : ''}
                          </span>
                        )}
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </motion.div>
  );
}

export { AdminExchangeHub };
