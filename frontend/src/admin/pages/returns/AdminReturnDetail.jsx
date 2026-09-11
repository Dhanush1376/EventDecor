import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useConfirm } from '../../../context/ConfirmProvider';
import { format } from 'date-fns';
import { m as motion, AnimatePresence } from 'framer-motion';
import { useReturnManagement } from '../../hooks/useReturnManagement';
import { handleImageError } from '../../../utils/media/imageUtils';
import { PLACEHOLDER_IMAGES } from '../../../constants/placeholderImages';
import { WhatsAppIcon } from '../../../components/ui/WhatsAppIcon';
import { InvoiceTemplate } from '../../../components/ui';
import api from '../../../services/api';
import {
  StatusBadge,
  EmptyState,
  AdminReturnDetailSkeleton,
  fadeUp,
  stagger,
} from '../../components/AdminUIKit';
import AdminExchangeDetailView from './AdminExchangeDetailView';
import AdminCustomerProfileModal from '../../components/AdminCustomerProfileModal';

const formatINR = (val) => {
  if (val === null || val === undefined || isNaN(val)) return '0';
  return Number(val).toLocaleString('en-IN', { maximumFractionDigits: 2 });
};

const RETURN_HAPPY_PATH = ['Submitted', 'Approved', 'Item Picked Up', 'QC Passed', 'Completed'];

const STEP_ICONS = {
  Submitted: 'assignment',
  Approved: 'check_circle',
  'Item Picked Up': 'local_shipping',
  'QC Passed': 'fact_check',
  Completed: 'verified',
  Rejected: 'cancel',
  Cancelled: 'cancel',
};

const STEP_COLORS = {
  Submitted: {
    activeBg: 'bg-amber-500',
    activeBorder: 'border-amber-500',
    activeText: 'text-white',
    completedBorder: 'border-amber-500',
    completedText: 'text-amber-600',
    pulse: 'bg-amber-500',
    progress: 'bg-amber-500',
  },
  Approved: {
    activeBg: 'bg-blue-500',
    activeBorder: 'border-blue-500',
    activeText: 'text-white',
    completedBorder: 'border-blue-500',
    completedText: 'text-blue-600',
    pulse: 'bg-blue-500',
    progress: 'bg-blue-500',
  },
  'Item Picked Up': {
    activeBg: 'bg-indigo-600',
    activeBorder: 'border-indigo-600',
    activeText: 'text-white',
    completedBorder: 'border-indigo-600',
    completedText: 'text-indigo-600',
    pulse: 'bg-indigo-600',
    progress: 'bg-indigo-600',
  },
  'QC Passed': {
    activeBg: 'bg-purple-600',
    activeBorder: 'border-purple-600',
    activeText: 'text-white',
    completedBorder: 'border-purple-600',
    completedText: 'text-purple-600',
    pulse: 'bg-purple-600',
    progress: 'bg-purple-600',
  },
  Completed: {
    activeBg: 'bg-emerald-500',
    activeBorder: 'border-emerald-500',
    activeText: 'text-white',
    completedBorder: 'border-emerald-500',
    completedText: 'text-emerald-600',
    pulse: 'bg-emerald-500',
    progress: 'bg-emerald-500',
  },
};

const mapStatusToStep = (status) => {
  if (['completed', 'refund_completed', 'refund_initiated', 'refund_settled'].includes(status)) {
    return 'Completed';
  }
  if (['inspection_completed', 'qc_passed', 'qc_approved'].includes(status)) {
    return 'QC Passed';
  }
  if (
    [
      'return_picked_up',
      'return_courier_assigned',
      'return_in_transit',
      'return_received',
      'inspection_started',
    ].includes(status)
  ) {
    return 'Item Picked Up';
  }
  if (status === 'approved') {
    return 'Approved';
  }
  if (status === 'rejected') {
    return 'Rejected';
  }
  if (status === 'cancelled') {
    return 'Cancelled';
  }
  return 'Submitted';
};

const AdminReturnDetail = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const {
    currentReturn,
    fetchReturnDetails,
    approveReturn,
    rejectReturn,
    transitionStatus,
    transitionExchangeReplacement,
    triggerRefund,
    settleRefund,
    submitInspection,
    addInternalNote,
    loading,
    error,
  } = useReturnManagement();

  const [internalNote, setInternalNote] = useState('');
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [inspectionState, setInspectionState] = useState({});
  const [previewImage, setPreviewImage] = useState(null);

  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 640 : false,
  );

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isDark =
    typeof document !== 'undefined' &&
    (document.documentElement.classList.contains('dark') ||
      document.body.classList.contains('dark'));

  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [settleData, setSettleData] = useState({
    amount: 0,
    paymentMethod: 'upi',
    upiId: '',
    transactionId: '',
    notes: '',
  });
  const [isSubmittingSettle, setIsSubmittingSettle] = useState(false);
  const [invoiceOrder, setInvoiceOrder] = useState(null);
  const [loadingInvoice, setLoadingInvoice] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const confirm = useConfirm();

  const handleInspectionChange = (itemIndex, field, value) => {
    setInspectionState((prev) => ({
      ...prev,
      [itemIndex]: {
        ...(prev[itemIndex] || {
          originalProduct: true,
          accessoriesPresent: true,
          packagingIntact: true,
          workingCondition: true,
          inspectionScore: 100,
          remarks: '',
        }),
        [field]: value,
      },
    }));
  };

  const handleInspectionSubmit = async (itemIndex) => {
    const data = inspectionState[itemIndex] || {
      originalProduct: true,
      accessoriesPresent: true,
      packagingIntact: true,
      workingCondition: true,
      inspectionScore: 100,
      remarks: '',
    };
    await submitInspection(id, itemIndex, data);
  };

  useEffect(() => {
    fetchReturnDetails(id);
  }, [id, fetchReturnDetails]);

  // Synchronize route with request type (exchange vs return)
  useEffect(() => {
    if (!loading && currentReturn?.request) {
      const isExchange = currentReturn.request.returnType === 'exchange';
      if (isExchange && location.pathname.startsWith('/admin/returns')) {
        navigate(`/admin/exchanges/requests/${id}`, { replace: true });
      } else if (!isExchange && location.pathname.startsWith('/admin/exchanges')) {
        navigate(`/admin/returns/requests/${id}`, { replace: true });
      }
    }
  }, [loading, currentReturn, location.pathname, id, navigate]);

  const handleApprove = async () => {
    if (
      await confirm({
        title: 'Approve Return',
        message: 'Are you sure you want to approve this return request?',
        type: 'warning',
      })
    ) {
      approveReturn(id);
    }
  };

  const handleReject = () => {
    if (!rejectReason.trim()) {
      toast.error('Please provide a reason for rejection.');
      return;
    }
    rejectReturn(id, { reason: rejectReason });
    setIsRejectOpen(false);
    setRejectReason('');
  };

  const handleTransition = async (nextStatus) => {
    if (
      await confirm({
        title: 'Transition Status',
        message: `Are you sure you want to transition to ${nextStatus.replace(/_/g, ' ')}?`,
        type: 'warning',
      })
    ) {
      transitionStatus(id, { nextStatus });
    }
  };

  const handleAddNote = (e) => {
    e.preventDefault();
    if (!internalNote.trim()) return;
    addInternalNote(id, { note: internalNote });
    setInternalNote('');
  };

  if (!currentReturn) {
    if (error) {
      return (
        <EmptyState
          icon="error_outline"
          title="Failed to load return details"
          description={error || 'Return request not found'}
        />
      );
    }
    return <AdminReturnDetailSkeleton />;
  }

  const { request = {}, userStats = {}, exchangeDetails = {} } = currentReturn;

  if (!request || (!request._id && !request.returnId)) {
    return (
      <EmptyState
        icon="search_off"
        title="Return Request Not Found"
        description="The requested return or exchange record could not be found."
      />
    );
  }

  const isExchange = request.returnType === 'exchange';

  if (isExchange) {
    return (
      <AdminExchangeDetailView
        currentReturn={currentReturn}
        onApprove={handleApprove}
        onReject={(reason) => rejectReturn(id, { reason })}
        onTransitionStatus={(nextStatus, reason, metadata) =>
          transitionStatus(id, { nextStatus, status: nextStatus, reason, metadata })
        }
        onTransitionReplacement={(exchangeId, returnRequestId, nextStatus, metadata) =>
          transitionExchangeReplacement(exchangeId, returnRequestId, nextStatus, metadata)
        }
        onTriggerRefund={(method) => triggerRefund(id, method)}
        onSettleRefund={(settlementData) => settleRefund(id, settlementData)}
        onAddNote={(note) => addInternalNote(id, { note })}
        onSubmitInspection={(itemIndex) => handleInspectionSubmit(itemIndex)}
        inspectionState={inspectionState}
        onInspectionChange={handleInspectionChange}
      />
    );
  }

  const currentStepName = mapStatusToStep(request.status);
  const currentIdx = RETURN_HAPPY_PATH.indexOf(currentStepName);
  const isFailed = currentStepName === 'Rejected' || currentStepName === 'Cancelled';

  const handleTriggerRefundClick = async () => {
    if (
      await confirm({
        title: 'Trigger Refund',
        message: 'Are you sure you want to trigger the refund for this return request?',
        type: 'warning',
      })
    ) {
      triggerRefund(id, request.refundMethod || 'original');
    }
  };

  // Financial Math & Settlement
  const refundBreakdown = request.refundBreakdown || {};
  const productTotal = Number(
    refundBreakdown.productTotal ??
      request.items?.reduce(
        (acc, curr) => acc + (curr.unitPrice || 0) * (curr.returnQuantity || 1),
        0,
      ) ??
      0,
  );
  const taxRefund = Number(refundBreakdown.taxRefund ?? 0);
  const shippingRefund = Number(refundBreakdown.shippingRefund ?? 0);
  const restockingFee = Number(refundBreakdown.restockingFee ?? 0);
  const discountDeduction = Number(refundBreakdown.discountDeduction ?? 0);
  const walletUsedDeduction = Number(refundBreakdown.walletUsedDeduction ?? 0);
  const grandTotal = Number(
    refundBreakdown.grandTotal ??
      Math.max(
        0,
        productTotal +
          taxRefund +
          shippingRefund -
          restockingFee -
          discountDeduction -
          walletUsedDeduction,
      ),
  );

  const refundTimelineEvent = request.timeline?.find(
    (t) =>
      t.status === 'refund_completed' ||
      t.action === 'refund_completed' ||
      t.status === 'refund_settled' ||
      t.action === 'refund_settled' ||
      t.action === 'refund_paid',
  );
  const refundRecord = request.refundRecordId || request.refundId;
  const isRefundSettled =
    Boolean(request.refundRecordId) ||
    Boolean(refundTimelineEvent) ||
    request.status === 'refund_completed' ||
    request.status === 'completed';

  const settledAmount = refundRecord?.amount || refundTimelineEvent?.metadata?.amount || grandTotal;

  const settledUtr =
    refundRecord?.bankReference ||
    refundRecord?.originalTransactionId ||
    refundTimelineEvent?.metadata?.transactionId ||
    '';

  const settledDate = refundRecord?.completedAt || refundTimelineEvent?.timestamp;

  const refundMethod = request.refundMethod || 'original';
  const upiId = request.upiId || '';
  const isCOD = request.orderId?.paymentMethod === 'cod' || request.order?.paymentMethod === 'cod';

  // Addresses & contacts
  const orderShippingAddr =
    request.orderId?.shippingAddress || request.order?.shippingAddress || {};
  const pickupRaw =
    request.pickup?.address && typeof request.pickup?.address === 'object'
      ? request.pickup.address
      : typeof request.pickup?.address === 'string'
        ? { address: request.pickup.address }
        : {};
  const pickupAddr = {
    ...orderShippingAddr,
    ...pickupRaw,
  };
  const rawPhone = String(request.userId?.phone || pickupAddr.phone || '').replace(/\D/g, '');
  const waPhone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;

  const customerId =
    request.userId?._id ||
    request.userId?.id ||
    (typeof request.userId === 'string' && request.userId) ||
    request.user?._id ||
    request.user;

  const resolvedCustomer = customerId
    ? {
        _id: customerId,
        name: request.userId?.name || pickupAddr.name || 'Customer',
        email: request.userId?.email || '',
        phone: request.userId?.phone || pickupAddr.phone || '',
        shippingAddress: pickupAddr,
      }
    : null;

  // Order link helper
  const orderIdVal = request.orderId?._id || request.orderId?.id || request.orderId;
  const orderCodeVal =
    request.orderId?.orderCode ||
    request.orderId?._id?.slice(-8) ||
    orderIdVal?.slice?.(-8) ||
    'Order';

  const handleSettleSubmit = async (e) => {
    e.preventDefault();
    if (!settleData.amount || Number(settleData.amount) <= 0) {
      toast.error('Please enter a valid refund amount');
      return;
    }
    if (settleData.paymentMethod === 'upi' && !settleData.upiId?.trim()) {
      toast.error('Customer UPI ID is required for UPI payout');
      return;
    }
    try {
      setIsSubmittingSettle(true);
      await settleRefund(id, {
        amount: Number(settleData.amount),
        refundMethod: settleData.paymentMethod,
        bankReference: settleData.transactionId?.trim() || undefined,
        originalTransactionId: settleData.transactionId?.trim() || undefined,
        notes: settleData.notes?.trim() || undefined,
        status: 'completed',
        reason: 'Return order refund payout',
      });
      toast.success('Refund payment record saved successfully');
      setIsSettleModalOpen(false);
    } catch (err) {
      console.error('Failed to settle refund:', err);
      toast.error(err.message || 'Failed to record refund settlement');
    } finally {
      setIsSubmittingSettle(false);
    }
  };

  const handleViewInvoice = async () => {
    // 1. If request.orderId is already populated with items and details
    if (request.orderId && typeof request.orderId === 'object' && request.orderId.items?.length) {
      const ord = {
        ...request.orderId,
        id: request.orderId.id || request.orderId._id,
        _id: request.orderId._id || request.orderId.id,
        orderCode:
          request.orderId.orderCode ||
          request.orderId.orderNumber ||
          request.orderId._id?.slice(-8),
        date: request.orderId.createdAt
          ? format(new Date(request.orderId.createdAt), 'dd MMM yyyy, hh:mm a')
          : undefined,
        shippingAddress: request.orderId.shippingAddress || pickupAddr,
        user: request.orderId.user || request.userId,
      };
      setInvoiceOrder(ord);
      return;
    }

    // 2. Fetch full order from API
    const targetOrderId =
      request.orderId?._id ||
      request.orderId?.id ||
      (typeof request.orderId === 'string' ? request.orderId : null);

    if (!targetOrderId) {
      toast.error('No linked order found for this return');
      return;
    }

    try {
      setLoadingInvoice(true);
      const res = await api.get(`/orders/${targetOrderId}`);
      const fetchedOrder = res.data?.data || res.data?.order || res.data;
      if (fetchedOrder) {
        setInvoiceOrder({
          ...fetchedOrder,
          id: fetchedOrder.id || fetchedOrder._id || targetOrderId,
          _id: fetchedOrder._id || fetchedOrder.id || targetOrderId,
          shippingAddress: fetchedOrder.shippingAddress || pickupAddr,
          user: fetchedOrder.user || request.userId,
        });
      } else {
        toast.error('Order invoice could not be loaded');
      }
    } catch (err) {
      console.error('Failed to load order for invoice:', err);
      toast.error('Failed to load order invoice');
    } finally {
      setLoadingInvoice(false);
    }
  };

  return (
    <motion.div initial="hidden" animate="show" variants={stagger} className="space-y-6 text-left">
      {/* ─── 1. TOP HEADER (Exact OrderHeader Layout & Rounded-[4px]) ─── */}
      <motion.div
        variants={fadeUp}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-6 bg-white/50 dark:bg-stone-850/50 backdrop-blur-sm p-3 sm:p-4 rounded-[4px] border border-[var(--admin-border-subtle)] shadow-sm"
      >
        {/* Left Column: Title and Return/Order IDs */}
        <div className="flex flex-col w-full sm:w-auto min-w-0">
          {/* Title Row */}
          <div className="flex items-center justify-between gap-2.5 w-full">
            <div className="flex items-center gap-2 min-w-0">
              <h2 className="text-[18px] sm:text-[20px] font-bold text-[var(--admin-text-primary)] tracking-tight whitespace-nowrap leading-tight">
                Return Details
              </h2>
              {request.returnType === 'exchange' && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-[4px] shadow-2xs border bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800 shrink-0">
                  Exchange
                </span>
              )}
            </div>
            {/* Status badge in top-right for mobile only */}
            <div className="sm:hidden shrink-0">
              <StatusBadge status={request.status} />
            </div>
          </div>

          {/* Row 2: IDs on Left (stacked 1 below another on mobile), Date at Right bottom on mobile */}
          <div className="flex items-end justify-between gap-2.5 w-full mt-1 sm:mt-1.5">
            {/* IDs: one below another on mobile, inline on laptop */}
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2 min-w-0">
              {/* Return ID with Copy Button */}
              <div className="flex items-center gap-1 leading-none">
                <span
                  className="font-mono text-[12px] sm:text-[12.5px] font-medium text-[var(--admin-text-secondary)] select-all"
                  title={request.returnId || request._id}
                >
                  #{request.returnId || request._id}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const rId = request.returnId || request._id;
                    if (rId) {
                      navigator.clipboard.writeText(rId);
                      toast.success('Return ID copied to clipboard');
                    }
                  }}
                  className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 p-0.5 cursor-pointer transition-colors shrink-0"
                  title="Copy Return ID"
                >
                  <span className="material-symbols-outlined text-[13px] sm:text-[14px] block">
                    content_copy
                  </span>
                </button>
              </div>

              {/* Order ID below Return ID on mobile, inline with dot on laptop */}
              {orderIdVal && (
                <>
                  <span className="text-stone-300 dark:text-stone-600 select-none text-[11px] hidden sm:inline">
                    •
                  </span>
                  <Link
                    to={`/admin/orders/${orderIdVal}`}
                    className="font-mono text-[11.5px] sm:text-[12px] text-[var(--admin-accent)] hover:underline inline-flex items-center gap-1 font-medium truncate leading-none"
                    title="View Original Order"
                  >
                    <span className="material-symbols-outlined text-[13px]">shopping_bag</span>
                    <span>Order #{orderCodeVal}</span>
                  </Link>
                </>
              )}
            </div>

            {/* Date Chip: on mobile aligned to the right bottom */}
            <div className="sm:hidden shrink-0 self-end">
              <span className="text-[10.5px] font-medium text-[var(--admin-text-secondary)] bg-[var(--admin-surface-muted)] border border-[var(--admin-border)] px-2 py-0.5 rounded-[4px] shadow-2xs whitespace-nowrap flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px] text-[var(--admin-text-tertiary)] shrink-0">
                  schedule
                </span>
                <span>
                  {request.createdAt
                    ? format(new Date(request.createdAt), 'dd MMM yyyy, hh:mm a')
                    : 'N/A'}
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Status & Date (above), Buttons (below) on laptop */}
        <div className="flex flex-col sm:items-end w-full sm:w-auto mt-2 sm:mt-0 shrink-0 gap-1.5 sm:gap-2">
          {/* On laptop: Status Badge on top, Date chip directly below it */}
          <div className="hidden sm:flex flex-col items-end gap-1">
            <StatusBadge status={request.status} />
            <span className="text-[11px] font-medium text-[var(--admin-text-secondary)] bg-[var(--admin-surface-muted)] border border-[var(--admin-border)] px-2 py-0.5 rounded-[4px] shadow-2xs whitespace-nowrap flex items-center gap-1">
              <span className="material-symbols-outlined text-[12px] text-[var(--admin-text-tertiary)] shrink-0">
                schedule
              </span>
              <span>
                {request.createdAt
                  ? format(new Date(request.createdAt), 'dd MMM yyyy, hh:mm a')
                  : 'N/A'}
              </span>
            </span>
          </div>

          {/* Action Buttons: Back, Invoice, WhatsApp */}
          <div className="flex items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => navigate('/admin/returns')}
              className="admin-btn admin-btn-outline flex-1 sm:flex-none !h-9 sm:!h-10 !py-0 px-3 sm:px-4 !rounded-[4px] text-[12px] sm:text-[13px] font-bold shadow-sm min-w-max cursor-pointer inline-flex items-center justify-center gap-1.5 box-border"
            >
              <span className="material-symbols-outlined text-[17px] sm:text-[18px] leading-none">
                arrow_back
              </span>
              <span>Back</span>
            </button>
            {orderIdVal && (
              <button
                type="button"
                onClick={handleViewInvoice}
                disabled={loadingInvoice}
                className="admin-btn admin-btn-outline flex-1 sm:flex-none !h-9 sm:!h-10 !py-0 px-3 sm:px-4 !rounded-[4px] text-[12px] sm:text-[13px] font-bold shadow-sm min-w-max cursor-pointer inline-flex items-center justify-center gap-1.5 hover:border-[var(--admin-accent)] hover:text-[var(--admin-accent)] transition-colors box-border"
                title="View Order Invoice"
              >
                {loadingInvoice ? (
                  <span className="w-3.5 h-3.5 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span className="material-symbols-outlined text-[17px] sm:text-[18px] leading-none">
                    receipt_long
                  </span>
                )}
                <span>Invoice</span>
              </button>
            )}
            {waPhone && (
              <a
                href={`https://wa.me/${waPhone}?text=Hi%20${encodeURIComponent(pickupAddr.name || request.userId?.name || 'Customer')},%20regarding%20your%20Return%20Request%20#${encodeURIComponent(request.returnId || request._id)}:`}
                target="_blank"
                rel="noopener noreferrer"
                className="admin-btn flex-1 sm:flex-none !h-9 sm:!h-10 !py-0 px-3 sm:px-4 !rounded-[4px] text-[12px] sm:text-[13px] font-bold shadow-sm min-w-max cursor-pointer inline-flex items-center justify-center gap-1.5 bg-[#25D366] !text-white hover:!bg-[#128C7E] border border-[#25D366] hover:border-[#128C7E] transition-colors box-border"
              >
                <WhatsAppIcon className="w-[17px] sm:w-[18px] h-[17px] sm:h-[18px]" />
                <span>WhatsApp</span>
              </a>
            )}
          </div>
        </div>
      </motion.div>

      {/* ─── 2. MAIN 2/3 + 1/3 GRID (Matches AdminOrderDetail max-w-[1400px]) ─── */}
      <div className="max-w-[1400px] mx-auto w-auto">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 sm:gap-6 lg:gap-8 items-start">
          {/* ─── LEFT COLUMN: Operations, Stepper & Items (2/3 Width) ─── */}
          <div className="xl:col-span-2 flex flex-col gap-3 sm:gap-6 lg:gap-8">
            {/* CARD 1: LIFECYCLE PROGRESSION (Matches OrderStatusTimeline.jsx) */}
            <div className="bg-white dark:bg-stone-900 rounded-[4px] shadow-sm border border-[var(--admin-border-subtle)] overflow-hidden">
              <div className="px-5 py-4 border-b border-[var(--admin-border-subtle)] flex items-center justify-between">
                <div className="flex flex-col">
                  <h3 className="text-[14px] font-bold text-[var(--admin-text-primary)] tracking-tight">
                    Lifecycle Progression
                  </h3>
                  <p className="text-[12px] text-[var(--admin-text-secondary)] font-medium hidden sm:block mt-0.5">
                    Track and override the return's current operational stage.
                  </p>
                </div>
                {/* Status Dropdown to override return status */}
                <div className="relative w-[140px] sm:w-[165px] h-8 shrink-0">
                  <select
                    value={request.status || 'submitted'}
                    onChange={(e) => transitionStatus(id, { nextStatus: e.target.value })}
                    style={{ backgroundImage: 'none' }}
                    className="admin-no-arrow w-full h-8 !min-h-[32px] !max-h-[32px] !appearance-none !bg-none bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-750 border border-stone-300 dark:border-stone-600 text-stone-800 dark:text-stone-200 text-[11px] font-bold rounded-[4px] pl-2.5 pr-7 cursor-pointer shadow-2xs outline-none focus:border-amber-500 transition-colors truncate"
                  >
                    <option value="submitted">Submitted</option>
                    <option value="approved">Approved</option>
                    <option value="return_picked_up">Item Picked Up</option>
                    <option value="return_received">Returned / Received</option>
                    <option value="inspection_completed">QC Passed</option>
                    <option value="completed">Completed</option>
                    <option value="rejected">Rejected</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 text-stone-500">
                    <span className="material-symbols-outlined text-[16px]">expand_more</span>
                  </div>
                </div>
              </div>

              {/* Horizontal Connected Stepper */}
              <div className="px-3 sm:px-5 py-8 overflow-hidden">
                <div className="flex items-center justify-between relative w-full max-w-full">
                  {/* Background connecting bar */}
                  <div className="absolute left-[10%] right-[10%] top-[20px] h-[2px] bg-[var(--admin-border)] z-0">
                    {!isFailed && currentIdx >= 0 && (
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{
                          width: `${(currentIdx / (RETURN_HAPPY_PATH.length - 1)) * 100}%`,
                        }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className={`absolute left-0 top-0 bottom-0 ${STEP_COLORS[currentStepName]?.progress || 'bg-[var(--admin-accent)]'}`}
                      />
                    )}
                  </div>

                  {RETURN_HAPPY_PATH.map((step, idx) => {
                    const isActive = currentStepName === step;
                    const isCompleted = currentIdx >= idx && !isFailed;
                    const colors = STEP_COLORS[step] || {};

                    return (
                      <div
                        key={step}
                        className="relative z-10 flex flex-col items-center gap-2 sm:gap-3 w-16 sm:w-24 shrink-0 text-center"
                      >
                        <div className="relative group focus:outline-none">
                          {/* Pulse animation for active step */}
                          {isActive && (
                            <motion.div
                              animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0, 0.3] }}
                              transition={{ duration: 2, repeat: Infinity }}
                              className={`absolute inset-0 rounded-full z-0 ${colors.pulse || 'bg-[var(--admin-accent)]'}`}
                            />
                          )}
                          {/* Circle Node */}
                          <div
                            className={`relative z-10 w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-300 shadow-sm border-2 ${
                              isActive
                                ? `${colors.activeBg || 'bg-[var(--admin-accent)]'} ${colors.activeBorder || 'border-[var(--admin-accent)]'} ${colors.activeText || 'text-white'}`
                                : isCompleted
                                  ? `bg-white dark:bg-stone-900 ${colors.completedBorder || 'border-[var(--admin-accent)]'} ${colors.completedText || 'text-[var(--admin-accent)]'}`
                                  : 'bg-white dark:bg-stone-900 border-[var(--admin-border-strong)] text-[var(--admin-text-tertiary)]'
                            }`}
                          >
                            {isCompleted && !isActive ? (
                              <span className="material-symbols-outlined text-[16px] sm:text-[20px] font-bold">
                                check
                              </span>
                            ) : (
                              <span className="material-symbols-outlined text-[14px] sm:text-[18px]">
                                {STEP_ICONS[step]}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-center mt-1">
                          <span
                            className={`text-[9.5px] sm:text-[11px] font-bold uppercase tracking-wider block transition-colors leading-tight whitespace-nowrap ${
                              isActive
                                ? colors.completedText || 'text-[var(--admin-text-primary)]'
                                : isCompleted
                                  ? colors.completedText || 'text-[var(--admin-text-secondary)]'
                                  : 'text-[var(--admin-text-tertiary)]'
                            }`}
                          >
                            {step === 'Item Picked Up' ? (
                              <>
                                <span className="sm:hidden">Pickup</span>
                                <span className="hidden sm:inline">Item Picked Up</span>
                              </>
                            ) : (
                              step
                            )}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Footer Quick Action Bar (Contextual buttons + stage advances) */}
              <div className="bg-gray-50 dark:bg-stone-850 border-t border-[var(--admin-border-subtle)] px-3.5 sm:px-5 py-2.5 sm:py-3.5 flex flex-row items-center justify-between gap-2.5 sm:gap-4 flex-wrap">
                <span className="text-[10px] sm:text-[11px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-widest shrink-0">
                  Operational Actions
                </span>

                <div className="flex flex-wrap items-center gap-2">
                  {currentStepName === 'Submitted' && (
                    <>
                      <button
                        type="button"
                        onClick={handleApprove}
                        className="px-3 sm:px-4 py-1.5 rounded-[4px] text-[11px] font-bold bg-[var(--admin-accent)] text-white hover:bg-[var(--admin-accent-hover)] transition-all flex items-center gap-1.5 shadow-sm cursor-pointer border-0"
                      >
                        <span className="material-symbols-outlined text-[16px]">check_circle</span>
                        Approve Return
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsRejectOpen(true)}
                        className="px-3 py-1.5 rounded-[4px] text-[11px] font-bold bg-white dark:bg-stone-800 text-red-600 border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <span className="material-symbols-outlined text-[16px]">cancel</span>
                        Reject
                      </button>
                    </>
                  )}

                  {currentStepName === 'Approved' && (
                    <button
                      type="button"
                      onClick={() => handleTransition('return_picked_up')}
                      className="px-3 sm:px-4 py-1.5 rounded-[4px] text-[11px] font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer border-0"
                    >
                      <span className="material-symbols-outlined text-[16px]">local_shipping</span>
                      Confirm Item Picked Up
                    </button>
                  )}

                  {currentStepName === 'Item Picked Up' && (
                    <>
                      {['return_picked_up', 'return_in_transit'].includes(request.status) && (
                        <button
                          type="button"
                          onClick={() => handleTransition('return_received')}
                          className="px-3 sm:px-4 py-1.5 rounded-[4px] text-[11px] font-bold bg-purple-600 text-white hover:bg-purple-700 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer border-0"
                        >
                          <span className="material-symbols-outlined text-[16px]">warehouse</span>
                          Mark Received at Facility
                        </button>
                      )}
                      {['return_received', 'inspection_started'].includes(request.status) && (
                        <button
                          type="button"
                          onClick={() => handleTransition('inspection_completed')}
                          className="px-3 sm:px-4 py-1.5 rounded-[4px] text-[11px] font-bold bg-purple-600 text-white hover:bg-purple-700 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer border-0"
                        >
                          <span className="material-symbols-outlined text-[16px]">fact_check</span>
                          Pass Quality Check
                        </button>
                      )}
                    </>
                  )}

                  {currentStepName === 'QC Passed' && (
                    <>
                      <button
                        type="button"
                        onClick={handleTriggerRefundClick}
                        className="px-3 sm:px-4 py-1.5 rounded-[4px] text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all flex items-center gap-1.5 shadow-sm cursor-pointer border-0"
                      >
                        <span className="material-symbols-outlined text-[16px]">payments</span>
                        Trigger Refund (₹{formatINR(grandTotal)})
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSettleData({
                            amount: grandTotal,
                            paymentMethod: isCOD
                              ? 'upi'
                              : refundMethod === 'wallet'
                                ? 'wallet'
                                : 'upi',
                            upiId: upiId || '',
                            transactionId: '',
                            notes: `Manual settlement for Return #${request.returnId || request._id}`,
                          });
                          setIsSettleModalOpen(true);
                        }}
                        className="px-3 py-1.5 rounded-[4px] text-[11px] font-bold bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-300 dark:border-stone-600 hover:bg-stone-50 dark:hover:bg-stone-750 transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <span className="material-symbols-outlined text-[16px]">edit_note</span>
                        Record Manual Payout
                      </button>
                    </>
                  )}

                  {currentStepName === 'Completed' && (
                    <span className="px-3 py-1.5 rounded-[4px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px]">verified</span>
                      Return Resolved & Closed
                    </span>
                  )}

                  {currentStepName === 'Rejected' && (
                    <span className="px-3 py-1.5 rounded-[4px] bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 text-[11px] font-bold flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px]">cancel</span>
                      Return Rejected
                    </span>
                  )}

                  {currentStepName === 'Cancelled' && (
                    <span className="px-3 py-1.5 rounded-[4px] bg-stone-100 text-stone-700 text-[11px] font-bold flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px]">cancel</span>
                      Cancelled by Customer
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* CARD 2: RETURNED ITEMS & QC INSPECTION (Matches Lifecycle Progression style) */}
            <div className="bg-white dark:bg-stone-900 rounded-[4px] shadow-sm border border-[var(--admin-border-subtle)] overflow-hidden">
              <div className="px-5 py-4 border-b border-[var(--admin-border-subtle)] flex items-center justify-between">
                <h3 className="text-[14px] font-bold text-[var(--admin-text-primary)] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">outbox</span>
                  Returned Items
                </h3>
                <span className="text-[11px] font-semibold text-[var(--admin-text-secondary)] bg-[var(--admin-surface-muted)] px-2.5 py-0.5 rounded-[4px] border border-[var(--admin-border-subtle)]">
                  Total: {request.items?.length || 1} Item(s)
                </span>
              </div>

              <div className="divide-y divide-[var(--admin-border-subtle)]">
                {request.items?.map((item, index) => {
                  const itemUnit = Number(item.unitPrice || 0);
                  const itemQty = Number(item.returnQuantity || 1);
                  const itemTotal = itemUnit * itemQty;

                  return (
                    <div key={index} className="p-4 sm:p-5 space-y-4">
                      {/* Product Header Strip */}
                      <div className="flex gap-3 sm:gap-4 items-start">
                        <img
                          src={item.imageSrc || PLACEHOLDER_IMAGES.product}
                          alt={item.title || 'Product'}
                          onError={handleImageError}
                          onClick={() => item.imageSrc && setPreviewImage(item.imageSrc)}
                          className="w-14 h-14 sm:w-16 sm:h-16 object-cover rounded-[4px] border border-[var(--admin-border-subtle)] shadow-2xs flex-shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <h4 className="text-sm font-bold text-[var(--admin-text-primary)] leading-snug">
                              {item.title || 'Product'}
                            </h4>
                            <span className="text-[11px] font-bold font-mono px-2 py-0.5 rounded-[4px] bg-[var(--admin-surface-muted)] text-[var(--admin-text-secondary)] border border-[var(--admin-border-subtle)]">
                              Qty: {itemQty} of {item.orderedQuantity || itemQty}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            {item.sku && (
                              <span className="text-[11px] font-mono text-[var(--admin-text-tertiary)]">
                                SKU: {item.sku}
                              </span>
                            )}
                            {item.variant && (
                              <span className="inline-block bg-[var(--admin-bg-subtle)] text-[var(--admin-text-secondary)] text-[10px] font-semibold px-2 py-0.5 rounded-[4px] border border-[var(--admin-border-subtle)]">
                                Variant: {item.variant}
                              </span>
                            )}
                          </div>

                          <p className="mt-1.5 text-xs font-bold text-[var(--admin-text-primary)] font-mono">
                            ₹{formatINR(itemUnit)}{' '}
                            <span className="text-[11px] font-normal text-[var(--admin-text-tertiary)]">
                              / unit
                            </span>
                            <span className="text-[var(--admin-text-tertiary)] font-normal mx-1.5">
                              •
                            </span>
                            <span className="text-[var(--admin-accent)]">
                              Total: ₹{formatINR(itemTotal)}
                            </span>
                          </p>
                        </div>
                      </div>

                      {/* Customer Reason Quote */}
                      <div className="p-3.5 rounded-[4px] bg-amber-500/5 border border-amber-500/20 text-xs space-y-1">
                        <div className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-wider font-bold text-amber-800 dark:text-amber-300">
                          <span className="material-symbols-outlined text-[14px] text-amber-600">
                            help_center
                          </span>
                          Customer Return Reason:
                        </div>
                        <p className="font-semibold text-[var(--admin-text-primary)]">
                          {item.reason || 'Customer request'}
                        </p>
                        {item.description && item.description !== item.reason && (
                          <p className="text-[var(--admin-text-secondary)] text-[11px] italic leading-relaxed pt-0.5">
                            "{item.description}"
                          </p>
                        )}
                      </div>

                      {/* Evidence Photos */}
                      {item.evidenceImages?.length > 0 && (
                        <div>
                          <span className="text-[10px] uppercase tracking-wider font-bold text-[var(--admin-text-tertiary)] mb-2 block">
                            Customer Attached Photos ({item.evidenceImages.length})
                          </span>
                          <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1">
                            {item.evidenceImages.map((img, i) => (
                              <img
                                key={i}
                                src={img}
                                alt="Evidence"
                                onClick={() => setPreviewImage(img)}
                                className="w-14 h-14 object-cover rounded-[4px] border border-[var(--admin-border-subtle)] shadow-2xs cursor-pointer hover:scale-105 transition-transform shrink-0"
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Warehouse Quality Inspection Section */}
                      <div className="pt-2">
                        {item.inspectionResult?.inspectedAt ? (
                          <div className="p-3.5 rounded-[4px] bg-[var(--admin-bg-subtle)] border border-[var(--admin-border-subtle)] space-y-3 text-xs">
                            <div className="flex items-center justify-between pb-2 border-b border-[var(--admin-border-subtle)]">
                              <span className="font-bold text-[var(--admin-text-primary)] flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[16px] text-emerald-600">
                                  fact_check
                                </span>
                                Warehouse Inspection Result
                              </span>
                              <span
                                className={`px-2.5 py-0.5 rounded-[4px] text-xs font-bold border ${item.inspectionResult.inspectionScore >= 80 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}
                              >
                                Score: {item.inspectionResult.inspectionScore}/100
                              </span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              <div className="p-2 bg-[var(--admin-surface)] rounded-[4px] border border-[var(--admin-border-subtle)]">
                                <span className="text-[10px] text-[var(--admin-text-tertiary)] block font-medium">
                                  Original Product
                                </span>
                                <span
                                  className={`font-bold ${item.inspectionResult.originalProduct ? 'text-emerald-700' : 'text-red-700'}`}
                                >
                                  {item.inspectionResult.originalProduct ? 'Verified' : 'Failed'}
                                </span>
                              </div>
                              <div className="p-2 bg-[var(--admin-surface)] rounded-[4px] border border-[var(--admin-border-subtle)]">
                                <span className="text-[10px] text-[var(--admin-text-tertiary)] block font-medium">
                                  Accessories
                                </span>
                                <span
                                  className={`font-bold ${item.inspectionResult.accessoriesPresent ? 'text-emerald-700' : 'text-red-700'}`}
                                >
                                  {item.inspectionResult.accessoriesPresent
                                    ? 'Complete'
                                    : 'Missing'}
                                </span>
                              </div>
                              <div className="p-2 bg-[var(--admin-surface)] rounded-[4px] border border-[var(--admin-border-subtle)]">
                                <span className="text-[10px] text-[var(--admin-text-tertiary)] block font-medium">
                                  Packaging
                                </span>
                                <span
                                  className={`font-bold ${item.inspectionResult.packagingIntact ? 'text-emerald-700' : 'text-red-700'}`}
                                >
                                  {item.inspectionResult.packagingIntact ? 'Intact' : 'Damaged'}
                                </span>
                              </div>
                              <div className="p-2 bg-[var(--admin-surface)] rounded-[4px] border border-[var(--admin-border-subtle)]">
                                <span className="text-[10px] text-[var(--admin-text-tertiary)] block font-medium">
                                  Condition
                                </span>
                                <span
                                  className={`font-bold ${item.inspectionResult.workingCondition ? 'text-emerald-700' : 'text-red-700'}`}
                                >
                                  {item.inspectionResult.workingCondition ? 'Working' : 'Defective'}
                                </span>
                              </div>
                            </div>
                            {item.inspectionResult.remarks && (
                              <div className="pt-2 border-t border-[var(--admin-border-subtle)] text-xs text-[var(--admin-text-secondary)]">
                                <strong className="text-[var(--admin-text-primary)]">
                                  Remarks:{' '}
                                </strong>
                                {item.inspectionResult.remarks}
                              </div>
                            )}
                          </div>
                        ) : ['return_received', 'inspection_started'].includes(request.status) ? (
                          <div className="p-3.5 rounded-[4px] bg-[var(--admin-bg-subtle)] border border-[var(--admin-border-subtle)] space-y-3">
                            <h5 className="text-xs font-bold text-[var(--admin-text-primary)] flex items-center gap-1.5 pb-2 border-b border-[var(--admin-border-subtle)]">
                              <span className="material-symbols-outlined text-[16px] text-[var(--admin-accent)]">
                                fact_check
                              </span>
                              Conduct Warehouse Inspection
                            </h5>
                            <div className="space-y-2.5">
                              {[
                                'originalProduct',
                                'accessoriesPresent',
                                'packagingIntact',
                                'workingCondition',
                              ].map((field) => (
                                <div
                                  key={field}
                                  className="flex justify-between items-center text-xs"
                                >
                                  <span className="text-[var(--admin-text-primary)] font-medium capitalize">
                                    {field.replace(/([A-Z])/g, ' $1').trim()}
                                  </span>
                                  <div className="flex gap-1.5">
                                    <button
                                      type="button"
                                      className={`px-3 py-1 rounded-[4px] border text-xs font-bold transition-colors cursor-pointer ${
                                        (inspectionState[index]?.[field] ?? true) === true
                                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                          : 'bg-[var(--admin-surface)] text-[var(--admin-text-tertiary)] border-[var(--admin-border)] hover:bg-[var(--admin-surface-hover)]'
                                      }`}
                                      onClick={() => handleInspectionChange(index, field, true)}
                                    >
                                      Yes
                                    </button>
                                    <button
                                      type="button"
                                      className={`px-3 py-1 rounded-[4px] border text-xs font-bold transition-colors cursor-pointer ${
                                        (inspectionState[index]?.[field] ?? true) === false
                                          ? 'bg-red-50 text-red-700 border-red-300'
                                          : 'bg-[var(--admin-surface)] text-[var(--admin-text-tertiary)] border-[var(--admin-border)] hover:bg-[var(--admin-surface-hover)]'
                                      }`}
                                      onClick={() => handleInspectionChange(index, field, false)}
                                    >
                                      No
                                    </button>
                                  </div>
                                </div>
                              ))}
                              <div className="pt-2 border-t border-[var(--admin-border-subtle)]">
                                <label className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider mb-1 block">
                                  Inspection Score (0-100)
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  className="w-full text-xs p-2 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-[4px] outline-none focus:border-[var(--admin-accent)] font-mono"
                                  value={inspectionState[index]?.inspectionScore ?? 100}
                                  onChange={(e) =>
                                    handleInspectionChange(
                                      index,
                                      'inspectionScore',
                                      parseInt(e.target.value) || 0,
                                    )
                                  }
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider mb-1 block">
                                  Inspector Observations
                                </label>
                                <textarea
                                  className="w-full text-xs p-2 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-[4px] outline-none focus:border-[var(--admin-accent)] resize-none"
                                  rows="2"
                                  placeholder="Add detailed inspection observations..."
                                  value={inspectionState[index]?.remarks || ''}
                                  onChange={(e) =>
                                    handleInspectionChange(index, 'remarks', e.target.value)
                                  }
                                />
                              </div>
                              <button
                                type="button"
                                className="admin-btn admin-btn-primary w-full text-xs font-bold !rounded-[4px] h-9 cursor-pointer"
                                onClick={() => handleInspectionSubmit(index)}
                              >
                                Submit Inspection
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="p-3.5 rounded-[4px] bg-purple-500/5 border border-purple-500/15 text-xs text-purple-900 dark:text-purple-300 flex items-center gap-2 font-medium">
                            <span className="material-symbols-outlined text-[17px] text-purple-600 shrink-0">
                              pending_actions
                            </span>
                            <span>
                              Quality inspection will unlock once item is marked received at
                              facility.
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ─── RIGHT COLUMN: Settlement, Customer & Linked Order (1/3 Width Sticky) ─── */}
          <div className="xl:col-span-1 flex flex-col gap-3 sm:gap-6 lg:gap-8 sticky top-[88px]">
            {/* CARD 1: FINANCIAL SETTLEMENT (Matches Lifecycle Progression style) */}
            <div className="bg-white dark:bg-stone-900 rounded-[4px] shadow-sm border border-[var(--admin-border-subtle)] overflow-hidden">
              <div className="px-5 py-4 border-b border-[var(--admin-border-subtle)] flex items-center justify-between">
                <h3 className="text-[14px] font-bold text-[var(--admin-text-primary)] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">account_balance</span>
                  Financial Settlement
                </h3>
                <span
                  className={`text-[10.5px] px-2.5 py-0.5 rounded-[4px] font-bold uppercase tracking-wider border shadow-2xs ${
                    isRefundSettled
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                      : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300'
                  }`}
                >
                  {isRefundSettled ? 'Reconciled' : 'Pending'}
                </span>
              </div>

              <div className="p-4 sm:p-5 space-y-4 text-xs">
                {/* Breakdown Ledger */}
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center text-[var(--admin-text-secondary)]">
                    <span>Item(s) Subtotal</span>
                    <span className="font-mono font-medium text-[var(--admin-text-primary)]">
                      ₹{formatINR(productTotal)}
                    </span>
                  </div>

                  {taxRefund > 0 && (
                    <div className="flex justify-between items-center text-emerald-700 dark:text-emerald-400">
                      <span>Tax Refund</span>
                      <span className="font-mono font-medium">+₹{formatINR(taxRefund)}</span>
                    </div>
                  )}

                  {shippingRefund > 0 && (
                    <div className="flex justify-between items-center text-emerald-700 dark:text-emerald-400">
                      <span>Shipping Fee Refund</span>
                      <span className="font-mono font-medium">+₹{formatINR(shippingRefund)}</span>
                    </div>
                  )}

                  {restockingFee > 0 && (
                    <div className="flex justify-between items-center text-red-600 dark:text-red-400">
                      <span>Restocking Fee Deduction</span>
                      <span className="font-mono font-medium">-₹{formatINR(restockingFee)}</span>
                    </div>
                  )}

                  {discountDeduction > 0 && (
                    <div className="flex justify-between items-center text-red-600 dark:text-red-400">
                      <span>Pro-rated Coupon Deduction</span>
                      <span className="font-mono font-medium">
                        -₹{formatINR(discountDeduction)}
                      </span>
                    </div>
                  )}

                  {walletUsedDeduction > 0 && (
                    <div className="flex justify-between items-center text-red-600 dark:text-red-400">
                      <span>Wallet Used Deduction</span>
                      <span className="font-mono font-medium">
                        -₹{formatINR(walletUsedDeduction)}
                      </span>
                    </div>
                  )}

                  {/* Net Calculated Refund Box */}
                  <div className="pt-3 border-t border-[var(--admin-border-subtle)] flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-[var(--admin-text-primary)] block">
                        Net Refund Due
                      </span>
                      <span className="text-[10px] text-[var(--admin-text-secondary)] capitalize">
                        Method: {refundMethod.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <span className="font-mono font-extrabold text-[16px] text-emerald-700 dark:text-emerald-400">
                      ₹{formatINR(grandTotal)}
                    </span>
                  </div>
                </div>

                {/* Customer UPI Display if available */}
                {upiId && (
                  <div className="p-2.5 rounded-[4px] bg-[var(--admin-bg-subtle)] border border-[var(--admin-border-subtle)] flex items-center justify-between gap-2 text-xs">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--admin-text-tertiary)] block">
                        Customer UPI ID:
                      </span>
                      <span className="font-mono font-bold text-[var(--admin-text-primary)]">
                        {upiId}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(upiId);
                        toast.success('UPI ID copied!');
                      }}
                      className="text-[var(--admin-accent)] hover:underline cursor-pointer p-1"
                      title="Copy UPI ID"
                    >
                      <span className="material-symbols-outlined text-[16px]">content_copy</span>
                    </button>
                  </div>
                )}

                {/* Action Buttons */}
                {!isRefundSettled &&
                !['submitted', 'under_review', 'pending'].includes(request.status) ? (
                  <div className="space-y-2 pt-1">
                    <button
                      type="button"
                      onClick={handleTriggerRefundClick}
                      className="w-full h-10 rounded-[4px] bg-[var(--admin-accent)] hover:bg-[var(--admin-accent-hover)] text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer border-0"
                    >
                      <span className="material-symbols-outlined text-[16px]">payments</span>
                      Trigger Automated Refund
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSettleData({
                          amount: grandTotal,
                          paymentMethod: isCOD
                            ? 'upi'
                            : refundMethod === 'wallet'
                              ? 'wallet'
                              : 'upi',
                          upiId: upiId || '',
                          transactionId: '',
                          notes: `Manual settlement of ₹${formatINR(grandTotal)} for Return #${request.returnId || request._id}`,
                        });
                        setIsSettleModalOpen(true);
                      }}
                      className="w-full h-10 rounded-[4px] bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-750 text-[var(--admin-text-primary)] font-bold text-xs border border-[var(--admin-border-subtle)] shadow-2xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">verified</span>
                      Record Payment / Payout
                    </button>
                  </div>
                ) : isRefundSettled ? (
                  <div className="p-3.5 bg-emerald-500/5 dark:bg-emerald-950/30 border border-emerald-500/20 dark:border-emerald-800/40 rounded-[4px] text-xs space-y-1.5">
                    <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-bold">
                      <span className="material-symbols-outlined text-[16px]">check_circle</span>
                      Payout Registered: ₹{formatINR(settledAmount)}
                    </div>
                    {settledUtr && (
                      <p className="font-mono text-[var(--admin-text-primary)]">
                        UTR / Ref: <span className="font-bold">{settledUtr}</span>
                      </p>
                    )}
                    {settledDate && (
                      <p className="text-[var(--admin-text-tertiary)] text-[11px]">
                        Recorded on {format(new Date(settledDate), 'dd MMM yyyy, hh:mm a')}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setSettleData({
                          amount: settledAmount,
                          paymentMethod: refundRecord?.refundMethod || 'upi',
                          upiId: upiId || '',
                          transactionId: settledUtr || '',
                          notes: refundRecord?.reason || refundTimelineEvent?.description || '',
                        });
                        setIsSettleModalOpen(true);
                      }}
                      className="mt-2 w-full text-center text-xs font-bold text-[var(--admin-accent)] hover:underline pt-1.5 border-t border-emerald-500/15 cursor-pointer"
                    >
                      Update Payout Record
                    </button>
                  </div>
                ) : null}
              </div>
            </div>

            {/* CARD 2: CUSTOMER & REVERSE PICUP DOSSIER (Matches Lifecycle Progression style) */}
            <div className="bg-white dark:bg-stone-900 rounded-[4px] shadow-sm border border-[var(--admin-border-subtle)] overflow-hidden">
              <div className="px-5 py-4 border-b border-[var(--admin-border-subtle)] flex items-center justify-between">
                <h3 className="text-[14px] font-bold text-[var(--admin-text-primary)] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">person</span>
                  Customer
                </h3>
                {resolvedCustomer && (
                  <button
                    type="button"
                    onClick={() => setShowCustomerModal(true)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--admin-accent)] hover:text-[var(--admin-accent-hover)] hover:underline cursor-pointer transition-colors"
                    title="View Customer Profile"
                  >
                    <span>View Profile</span>
                    <span className="material-symbols-outlined text-[12px]">open_in_new</span>
                  </button>
                )}
              </div>

              <div className="p-4 sm:p-5 space-y-5 text-xs">
                {/* Customer Identity Row */}
                <div
                  onClick={() => resolvedCustomer && setShowCustomerModal(true)}
                  className={`flex items-start gap-3.5 p-1.5 -m-1.5 rounded-[4px] transition-colors ${
                    resolvedCustomer
                      ? 'hover:bg-[var(--admin-surface-muted)]/70 cursor-pointer group'
                      : ''
                  }`}
                  title={resolvedCustomer ? 'Click to view customer profile' : undefined}
                >
                  <div
                    className={`w-11 h-11 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 flex items-center justify-center shrink-0 font-bold text-[15px] border border-blue-100 dark:border-blue-900/40 shadow-2xs ${resolvedCustomer ? 'group-hover:scale-105 transition-transform' : ''}`}
                  >
                    {(request.userId?.name || pickupAddr.name || 'C').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p
                        className={`text-[14.5px] font-bold text-[var(--admin-text-primary)] truncate ${resolvedCustomer ? 'group-hover:text-[var(--admin-accent)] transition-colors' : ''}`}
                      >
                        {request.userId?.name || pickupAddr.name || 'Customer Name'}
                      </p>
                      {resolvedCustomer && (
                        <span className="material-symbols-outlined text-[13px] text-[var(--admin-text-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity">
                          open_in_new
                        </span>
                      )}
                    </div>
                    <div className="text-[12px] text-[var(--admin-text-secondary)] mt-1 flex flex-col gap-1">
                      <span className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[14px] text-[var(--admin-text-tertiary)]">
                          phone
                        </span>
                        <span className="font-mono text-[11.5px]">
                          {request.userId?.phone || pickupAddr.phone || 'No phone provided'}
                        </span>
                      </span>
                      <span className="flex items-center gap-1.5 truncate">
                        <span className="material-symbols-outlined text-[14px] text-[var(--admin-text-tertiary)]">
                          mail
                        </span>
                        <span className="truncate">
                          {request.userId?.email || 'No email provided'}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Account Activity & Return Metrics */}
                <div className="!mt-4 grid grid-cols-3 gap-2 py-2.5 px-3 rounded-[4px] bg-[var(--admin-bg-subtle)] border border-[var(--admin-border-subtle)] text-center">
                  <div>
                    <span className="text-[10px] text-[var(--admin-text-tertiary)] uppercase font-bold tracking-wider block">
                      Orders
                    </span>
                    <p className="text-[14px] font-bold font-mono text-[var(--admin-text-primary)] mt-0.5">
                      {userStats?.totalOrders || 1}
                    </p>
                  </div>
                  <div className="border-x border-[var(--admin-border-subtle)]">
                    <span className="text-[10px] text-[var(--admin-text-tertiary)] uppercase font-bold tracking-wider block">
                      Returns
                    </span>
                    <p className="text-[14px] font-bold font-mono text-amber-600 dark:text-amber-400 mt-0.5">
                      {userStats?.totalReturns || 0}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-[var(--admin-text-tertiary)] uppercase font-bold tracking-wider block">
                      Return Rate
                    </span>
                    <p className="text-[14px] font-bold font-mono text-[var(--admin-text-primary)] mt-0.5">
                      {userStats?.returnPercentage || 0}%
                    </p>
                  </div>
                </div>

                {/* Reverse Pickup Address */}
                <div className="pt-4 border-t border-[var(--admin-border-subtle)]">
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-200/60 dark:border-amber-800/40 shadow-2xs mt-0.5">
                      <span className="material-symbols-outlined text-[20px]">location_on</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      {/* Section Label & Top-Right Button */}
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-[10.5px] uppercase font-bold text-[var(--admin-text-tertiary)] tracking-wider block">
                          Reverse Pickup Address
                        </span>
                        <a
                          href={`https://maps.google.com/?q=${encodeURIComponent(
                            [
                              pickupAddr.address || pickupAddr.addressLine1,
                              pickupAddr.addressLine2,
                              pickupAddr.locality,
                              pickupAddr.landmark,
                              pickupAddr.city,
                              pickupAddr.state,
                              pickupAddr.pincode || pickupAddr.pinCode,
                            ]
                              .filter(Boolean)
                              .join(', '),
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 h-6 px-2 rounded-[3px] text-[10.5px] font-semibold text-[var(--admin-text-primary)] hover:text-[var(--admin-accent)] bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 hover:border-[var(--admin-accent)] transition-all shadow-2xs cursor-pointer shrink-0"
                          title="Open Reverse Pickup Address in Google Maps"
                        >
                          <span className="material-symbols-outlined text-[13px] text-amber-600 dark:text-amber-400">
                            map
                          </span>
                          <span>Open in Maps</span>
                          <span className="material-symbols-outlined text-[11px] opacity-70">
                            open_in_new
                          </span>
                        </a>
                      </div>

                      <div className="text-[13px] text-[var(--admin-text-primary)] leading-normal space-y-1">
                        {/* Street & Area */}
                        <p className="font-medium text-[13px] text-[var(--admin-text-primary)]">
                          {pickupAddr.address ||
                            pickupAddr.addressLine1 ||
                            'Address details not provided'}
                          {pickupAddr.addressLine2 ? `, ${pickupAddr.addressLine2}` : ''}
                          {pickupAddr.locality ? `, ${pickupAddr.locality}` : ''}
                        </p>

                        {/* Landmark */}
                        {pickupAddr.landmark && (
                          <p className="text-[11.5px] text-[var(--admin-text-secondary)] flex items-center gap-1">
                            <span className="text-[var(--admin-text-tertiary)] font-medium">
                              Landmark:
                            </span>
                            <span>{pickupAddr.landmark}</span>
                          </p>
                        )}

                        {/* City, State & Pincode */}
                        {(pickupAddr.city || pickupAddr.state) && (
                          <p className="text-[12px] text-[var(--admin-text-secondary)] font-medium">
                            {[pickupAddr.city, pickupAddr.state].filter(Boolean).join(', ')}
                            {(pickupAddr.pincode || pickupAddr.pinCode) && (
                              <>
                                {' — '}
                                <span className="font-mono font-bold text-[var(--admin-text-primary)]">
                                  {pickupAddr.pincode || pickupAddr.pinCode}
                                </span>
                              </>
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Courier / Logistics Strip */}
                {(request.pickup?.partner || request.pickup?.trackingId) && (
                  <div className="p-3 rounded-[4px] bg-[var(--admin-bg-subtle)] border border-[var(--admin-border-subtle)] space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase">
                        Courier: {request.pickup.partner || 'Assigned'}
                      </span>
                      <span className="text-[10px] font-bold text-[var(--admin-accent)]">
                        {request.pickup.status?.replace(/_/g, ' ') || 'In Progress'}
                      </span>
                    </div>
                    {request.pickup.trackingId && (
                      <p className="font-mono font-bold text-[var(--admin-text-primary)]">
                        Tracking: {request.pickup.trackingId}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* CARD 3: LINKED ORIGINAL ORDER (Matches Lifecycle Progression style) */}
            <div className="bg-white dark:bg-stone-900 rounded-[4px] shadow-sm border border-[var(--admin-border-subtle)] overflow-hidden">
              <div className="px-4 sm:px-5 py-3 border-b border-[var(--admin-border-subtle)] flex items-center justify-between">
                <h3 className="text-[14px] font-bold text-[var(--admin-text-primary)] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                  Linked Order
                </h3>
                {orderIdVal && (
                  <Link
                    to={`/admin/orders/${orderIdVal}`}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--admin-accent)] hover:text-[var(--admin-accent-hover)] hover:underline transition-colors"
                    title="View Original Order Details"
                  >
                    <span>View Order</span>
                    <span className="material-symbols-outlined text-[12px]">arrow_forward</span>
                  </Link>
                )}
              </div>
              <div className="px-4 sm:px-5 py-2.5 sm:py-3 text-xs space-y-2 font-medium">
                <div className="flex justify-between items-center py-1 border-b border-[var(--admin-border-subtle)]">
                  <span className="text-[var(--admin-text-secondary)]">Order ID:</span>
                  <Link
                    to={`/admin/orders/${orderIdVal}`}
                    className="font-mono font-bold text-[var(--admin-accent)] hover:text-[var(--admin-accent-hover)] hover:underline"
                  >
                    #{orderCodeVal}
                  </Link>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-[var(--admin-border-subtle)]">
                  <span className="text-[var(--admin-text-secondary)]">Payment Method:</span>
                  <span className="font-bold text-[var(--admin-text-primary)] uppercase">
                    {request.orderId?.paymentMethod ||
                      request.order?.paymentMethod ||
                      (isCOD ? 'COD' : 'Online')}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-[var(--admin-border-subtle)]">
                  <span className="text-[var(--admin-text-secondary)]">Order Status:</span>
                  <span className="font-bold capitalize text-[var(--admin-text-primary)]">
                    {request.orderId?.orderStatus || 'Delivered'}
                  </span>
                </div>
                {request.orderId?.total !== undefined && (
                  <div className="flex justify-between items-center py-1">
                    <span className="text-[var(--admin-text-secondary)]">Order Total:</span>
                    <span className="font-bold text-[var(--admin-text-primary)] font-mono">
                      ₹{formatINR(request.orderId.total)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Lightbox Image Preview Modal ─── */}
      {previewImage && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[110] p-4 cursor-pointer"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh] p-2" onClick={(e) => e.stopPropagation()}>
            <img
              src={previewImage}
              alt="Preview"
              className="max-w-full max-h-[85vh] object-contain rounded-[4px] shadow-2xl border border-white/20"
            />
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white text-black flex items-center justify-center shadow-lg hover:scale-110 transition-transform cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </div>
      )}

      {/* ─── Reject Return Request Modal ─── */}
      <AnimatePresence>
        {isRejectOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-[100] p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[var(--admin-surface)] rounded-[4px] w-full max-w-md p-6 shadow-2xl border border-[var(--admin-border)]"
            >
              <h3 className="text-base font-bold text-[var(--admin-error)] flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined">warning</span>
                Reject Return Request
              </h3>
              <p className="text-xs text-[var(--admin-text-secondary)] mb-4">
                Please enter the reason for rejecting this return request. This message will be
                recorded and shown to the customer.
              </p>
              <textarea
                className="admin-input w-full min-h-[100px] text-xs mb-4 !rounded-[4px]"
                placeholder="e.g., The item does not meet the return policy criteria..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
              <div className="flex justify-end gap-2.5">
                <button
                  type="button"
                  className="admin-btn admin-btn-outline text-xs !rounded-[4px] cursor-pointer"
                  onClick={() => {
                    setIsRejectOpen(false);
                    setRejectReason('');
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn-primary !bg-[var(--admin-error)] hover:!bg-[var(--admin-error)]/90 text-xs !rounded-[4px] cursor-pointer"
                  onClick={handleReject}
                >
                  Confirm Rejection
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── Record Refund Payment / Settlement Modal (Standardized Style) ─── */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {isSettleModalOpen && (
              <div
                key="return-settle-modal-portal"
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
                  onClick={!isSubmittingSettle ? () => setIsSettleModalOpen(false) : undefined}
                  className="fixed inset-0 bg-black/40 dark:bg-black/60 cursor-pointer pointer-events-auto"
                  style={{ backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}
                />

                {/* Modal Card / Mobile App Drawer */}
                <motion.div
                  initial={{ opacity: 0, y: isMobile ? '100%' : 4, scale: isMobile ? 1 : 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: isMobile ? '100%' : 4, scale: isMobile ? 1 : 0.98 }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  className={`admin-section-root ${isDark ? 'dark' : ''} pointer-events-auto relative w-full sm:max-w-md bg-white dark:bg-[#1f1e1b] rounded-t-[20px] sm:rounded-[4px] shadow-2xl overflow-hidden z-10 border-t sm:border border-[#e8e4d9] dark:border-white/10 font-sans max-h-[88vh] sm:max-h-none flex flex-col`}
                  style={{
                    backgroundColor: 'var(--admin-surface, #ffffff)',
                    borderColor: 'var(--admin-border, #e8e4d9)',
                    fontFamily:
                      "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Mobile Drawer Pull Indicator */}
                  <div className="pt-2.5 pb-1 sm:hidden flex justify-center w-full cursor-grab active:cursor-grabbing">
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
                        Record Refund Payment
                      </h3>
                      <p className="text-[11px] text-[var(--admin-text-secondary)] font-medium truncate mt-0.5 !font-sans">
                        Return #{request.returnId || request._id?.slice(-8)} &bull; Settlement
                        Payout
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

                  {/* Body Form */}
                  <form
                    onSubmit={handleSettleSubmit}
                    className="p-5 sm:p-6 space-y-4 font-sans overflow-y-auto custom-scrollbar flex-1 pb-8 sm:pb-6 text-left"
                  >
                    {/* Price Difference / Refund Summary Box */}
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
                        <div className="flex justify-between items-center text-[12.5px]">
                          <span className="text-stone-500 dark:text-stone-400 font-medium shrink-0 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-stone-400"></span>
                            Customer
                          </span>
                          <span className="font-semibold text-[var(--admin-text-primary)]">
                            {request.userId?.name || pickupAddr.name || 'Customer'}
                          </span>
                        </div>
                        {(upiId || settleData.upiId) && (
                          <div className="flex justify-between items-center text-[12px] pt-1 border-t border-[var(--admin-border-subtle)]">
                            <span className="text-stone-500 dark:text-stone-400 font-medium shrink-0 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                              Customer UPI
                            </span>
                            <div className="flex items-center gap-1 font-mono font-bold text-[var(--admin-text-primary)]">
                              <span>{upiId || settleData.upiId}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const upi = upiId || settleData.upiId;
                                  navigator.clipboard.writeText(upi);
                                  toast.success('UPI ID copied!');
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
                      </div>

                      {/* Highlighted Refund Banner */}
                      <div className="flex justify-between items-center px-3 py-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/40 rounded-[4px] mt-1">
                        <span className="font-bold text-[12px] text-amber-900 dark:text-amber-200">
                          Calculated Refund
                        </span>
                        <span className="font-extrabold text-amber-700 dark:text-amber-400 font-mono text-[15px]">
                          ₹{formatINR(grandTotal)}
                        </span>
                      </div>
                    </div>

                    {/* Amount to Refund */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--admin-text-secondary)] block">
                          Refund Amount (₹) *
                        </label>
                        {grandTotal > 0 && String(settleData.amount) !== String(grandTotal) && (
                          <button
                            type="button"
                            onClick={() => setSettleData({ ...settleData, amount: grandTotal })}
                            className="text-[11px] font-bold text-amber-700 dark:text-amber-400 hover:underline cursor-pointer"
                          >
                            Fill Due (₹{formatINR(grandTotal)})
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
                          placeholder={`e.g. ${grandTotal || 500}`}
                          disabled={isSubmittingSettle}
                          className="w-full h-10 pl-8 pr-3 rounded-[4px] border border-[var(--admin-border)] bg-white dark:bg-[#1a1815] text-[var(--admin-text-primary)] focus:border-[var(--admin-accent)] outline-none text-[14px] font-bold transition-all font-mono"
                          style={{
                            backgroundColor: 'var(--admin-bg, #ffffff)',
                            borderColor: 'var(--admin-border, #e8e4d9)',
                            color: 'var(--admin-text-primary, #000000)',
                          }}
                        />
                      </div>
                    </div>

                    {/* Payment Method */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--admin-text-secondary)] block">
                        Payment Method *
                      </label>
                      <div className="relative">
                        <select
                          value={settleData.paymentMethod}
                          onChange={(e) =>
                            setSettleData({ ...settleData, paymentMethod: e.target.value })
                          }
                          disabled={isSubmittingSettle}
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
                          <option value="upi">UPI Payout</option>
                          <option value="wallet">Store Wallet Credit</option>
                          <option value="bank_transfer">Bank Transfer (NEFT/IMPS)</option>
                          <option value="original">Original Payment Gateway (Razorpay)</option>
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
                          Customer UPI ID *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. customer@okhdfcbank"
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

                    {/* Bank Reference / UTR Number */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--admin-text-secondary)] block">
                        Bank Reference / UTR Number
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. UPI/123456789012 or UTR..."
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

                    {/* Notes */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--admin-text-secondary)] block">
                        Notes
                      </label>
                      <textarea
                        rows="2"
                        value={settleData.notes}
                        onChange={(e) => setSettleData({ ...settleData, notes: e.target.value })}
                        placeholder="Optional notes or payout reference details..."
                        disabled={isSubmittingSettle}
                        className="w-full px-3 py-2 rounded-[4px] border border-[var(--admin-border)] bg-white dark:bg-[#1a1815] text-[var(--admin-text-primary)] focus:border-[var(--admin-accent)] outline-none text-[13px] transition-all resize-none"
                        style={{
                          backgroundColor: 'var(--admin-bg, #ffffff)',
                          borderColor: 'var(--admin-border, #e8e4d9)',
                          color: 'var(--admin-text-primary, #000000)',
                        }}
                      />
                    </div>

                    {/* Submit Button */}
                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={isSubmittingSettle || Number(settleData.amount) <= 0}
                        className="w-full h-10 rounded-[4px] bg-[var(--admin-accent)] hover:bg-[var(--admin-accent-hover)] text-white font-bold text-[13px] shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border-0"
                        style={{
                          backgroundColor: 'var(--admin-accent, #826237)',
                        }}
                      >
                        {isSubmittingSettle ? (
                          <>
                            <span className="material-symbols-outlined animate-spin text-[16px]">
                              progress_activity
                            </span>
                            <span>Saving Settlement...</span>
                          </>
                        ) : (
                          <span>
                            Confirm & Save Settlement{' '}
                            {Number(settleData.amount) > 0
                              ? `(₹${formatINR(settleData.amount)})`
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

      {/* Customer 360 Profile Modal */}
      <AnimatePresence>
        {showCustomerModal && resolvedCustomer && (
          <AdminCustomerProfileModal
            customer={resolvedCustomer}
            onClose={() => setShowCustomerModal(false)}
          />
        )}
      </AnimatePresence>

      {/* Order Invoice App Drawer Modal (Matches AdminOrderDetail, AdminRentalDetail, AdminOrdersTable) */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {invoiceOrder && (
              <div
                className={`admin-section-root ${
                  document.documentElement.classList.contains('dark') ||
                  document.body.classList.contains('dark')
                    ? 'dark'
                    : ''
                }`}
              >
                {/* Full-screen Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setInvoiceOrder(null)}
                  className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] no-print cursor-pointer"
                />
                {/* Modal Container */}
                <motion.div
                  initial={{ y: '100%', opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: '100%', opacity: 0 }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  className="invoice-modal-container fixed bottom-0 left-0 right-0 lg:top-0 lg:bottom-0 lg:my-auto lg:h-fit lg:rounded-[6px] mx-auto w-full max-w-[580px] max-h-[92vh] bg-white dark:bg-[#1f1e1b] rounded-t-[6px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-[#e8e4d9] dark:border-white/10 z-[101] overflow-y-auto custom-scrollbar pt-2.5 pb-2 px-3 sm:pt-3 sm:pb-2.5 sm:px-4 print:static print:translate-x-0 print:translate-y-0 print:h-auto print:max-w-none print:shadow-none print:bg-white print:p-0 print:border-none font-sans"
                  style={{
                    backgroundColor: 'var(--admin-surface, #ffffff)',
                    borderColor: 'var(--admin-border, #e8e4d9)',
                    fontFamily:
                      "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                  }}
                >
                  <style type="text/css" media="print">
                    {`
                      @page { size: A4 portrait; margin: 10mm; }
                      html, body { 
                        height: 100vh !important; 
                        overflow: hidden !important; 
                        margin: 0 !important; 
                        padding: 0 !important; 
                      }
                      body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; background: white !important; }
                      body * { visibility: hidden !important; }
                      .invoice-modal-container {
                        position: fixed !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100vw !important;
                        height: 100vh !important;
                        transform: none !important;
                        overflow: hidden !important;
                        background: transparent !important;
                        box-shadow: none !important;
                      }
                      .print-invoice-area, .print-invoice-area * {
                        visibility: visible !important;
                        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
                      }
                      .print-invoice-area .font-mono {
                        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
                      }
                      .print-invoice-area {
                        position: static !important;
                        width: 540px !important;
                        max-width: 540px !important;
                        margin: 0 auto !important;
                        padding: 16px !important;
                        box-shadow: none !important;
                        border: 1px solid #e5e7eb !important;
                        background: white !important;
                        overflow: visible !important;
                      }
                      .no-print, .no-print * { display: none !important; }
                    `}
                  </style>
                  <div className="relative">
                    <InvoiceTemplate
                      order={invoiceOrder}
                      onClose={() => setInvoiceOrder(null)}
                      isAdmin={true}
                    />
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </motion.div>
  );
};

export default AdminReturnDetail;
