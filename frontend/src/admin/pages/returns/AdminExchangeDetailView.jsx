import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { format } from 'date-fns';
import { m as motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useConfirm } from '../../../context/ConfirmProvider';
import { handleImageError } from '../../../utils/media/imageUtils';
import { PLACEHOLDER_IMAGES } from '../../../constants/placeholderImages';
import { StatusBadge, fadeUp, stagger } from '../../components/AdminUIKit';
import { WhatsAppIcon } from '../../../components/ui/WhatsAppIcon';
import AdminCustomerProfileModal from '../../components/AdminCustomerProfileModal';

const EXCHANGE_HAPPY_PATH = [
  'Submitted',
  'Approved',
  'Item Picked Up',
  'QC Passed',
  'Dispatched',
  'Completed',
];

const STEP_ICONS = {
  Submitted: 'assignment',
  Approved: 'check_circle',
  'Item Picked Up': 'local_shipping',
  'QC Passed': 'fact_check',
  Dispatched: 'inventory_2',
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
  Dispatched: {
    activeBg: 'bg-blue-600',
    activeBorder: 'border-blue-600',
    activeText: 'text-white',
    completedBorder: 'border-blue-600',
    completedText: 'text-blue-600',
    pulse: 'bg-blue-600',
    progress: 'bg-blue-600',
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

export default function AdminExchangeDetailView({
  currentReturn,
  onApprove,
  onReject,
  onTransitionStatus,
  onTransitionReplacement,
  onTriggerRefund,
  onSettleRefund,
  onAddNote,
  onSubmitInspection,
  inspectionState,
  onInspectionChange,
}) {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { request = {}, userStats = {}, exchangeDetails = {} } = currentReturn || {};

  // Local UI state
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
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

  // Record Refund Settlement / Payout Modal state
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [settleData, setSettleData] = useState({
    amount: 0,
    paymentMethod: 'upi',
    upiId: '',
    transactionId: '',
    notes: '',
    autoCompleteAfterSettle: false,
  });
  const [isSubmittingSettle, setIsSubmittingSettle] = useState(false);

  // Record Customer Difference Payment Modal state
  const [isCollectModalOpen, setIsCollectModalOpen] = useState(false);
  const [collectData, setCollectData] = useState({
    amount: '',
    paymentMethod: 'upi',
    note: '',
    autoReserve: true,
  });
  const [isSubmittingCollect, setIsSubmittingCollect] = useState(false);

  // Authoritative fields from backend
  const originalItem = exchangeDetails?.originalItem || request.items?.[0] || {};
  const replacementItem = exchangeDetails?.replacementItem || {};
  const exchangeType = exchangeDetails?.exchangeType || 'variant';
  const priceDifference = Number(exchangeDetails?.priceDifference ?? 0);
  const differenceAction = exchangeDetails?.differenceAction || 'direct_exchange';
  const paymentStatus = exchangeDetails?.paymentStatus || 'not_applicable';
  const replacementStatus = exchangeDetails?.replacementStatus || 'pending_stock';
  const upiId = exchangeDetails?.upiId || request.upiId || '';
  const refundMethod = request.refundMethod || 'original';
  const isCOD = request.orderId?.paymentMethod === 'cod' || request.order?.paymentMethod === 'cod';

  // Addresses
  const pickupAddr = request.pickup?.address || request.orderId?.shippingAddress || {};
  const deliveryAddr = request.orderId?.shippingAddress || request.pickup?.address || {};

  // Financial Math
  const originalUnit = Number(originalItem.unitPrice || 0);
  const originalQty = Number(originalItem.quantity || originalItem.returnQuantity || 1);
  const originalTotal = originalUnit * originalQty;

  const replacementUnit = Number(replacementItem.unitPrice || 0);
  const replacementQty = Number(replacementItem.quantity || 1);
  const replacementTotal = replacementUnit * replacementQty;

  const formatINR = (amt) =>
    Number(amt || 0).toLocaleString('en-IN', {
      maximumFractionDigits: 2,
    });

  // Refund Settlement Status
  const refundTimelineEvent = request.timeline?.find(
    (t) => t.action === 'refund_settled' || t.action === 'refund_paid',
  );
  const refundRecord = request.refundRecordId || exchangeDetails?.additionalRefundId;
  const isRefundSettled =
    ['completed', 'refund_completed'].includes(request.status) ||
    Boolean(request.refundRecordId) ||
    Boolean(exchangeDetails?.additionalRefundId) ||
    (differenceAction === 'refund_difference' &&
      exchangeDetails?.paymentStatus === 'payment_paid') ||
    Boolean(refundTimelineEvent);

  const isUnderReview =
    !request.status || ['submitted', 'under_review', 'pending'].includes(request.status);

  const settledAmount =
    refundRecord?.amount || refundTimelineEvent?.metadata?.amount || priceDifference;

  const settledUtr =
    refundRecord?.bankReference ||
    refundRecord?.originalTransactionId ||
    refundTimelineEvent?.metadata?.transactionId ||
    '';

  const settledDate = refundRecord?.completedAt || refundTimelineEvent?.timestamp;

  // Phone for WhatsApp
  const rawPhone = String(
    request.userId?.phone || pickupAddr.phone || deliveryAddr.phone || '',
  ).replace(/\D/g, '');
  const waPhone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;

  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const customerId =
    request.userId?._id ||
    request.userId?.id ||
    (typeof request.userId === 'string' && request.userId) ||
    request.user?._id ||
    request.user;

  const resolvedCustomer = customerId
    ? {
        _id: customerId,
        name: pickupAddr.name || deliveryAddr.name || request.userId?.name || 'Customer',
        email: request.userId?.email || '',
        phone: request.userId?.phone || pickupAddr.phone || deliveryAddr.phone || '',
        shippingAddress: deliveryAddr || pickupAddr,
      }
    : null;

  // Order link helper
  const orderIdVal = request.orderId?._id || request.orderId?.id || request.orderId;
  const orderCodeVal =
    request.orderId?.orderCode ||
    request.orderId?._id?.slice(-8) ||
    (typeof orderIdVal === 'string' ? orderIdVal.slice(-8) : 'Order');

  // Determine current progression step
  const getCurrentStepName = () => {
    if (
      ['completed', 'refund_completed'].includes(request.status) ||
      replacementStatus === 'delivered'
    ) {
      return 'Completed';
    }
    if (replacementStatus === 'shipped') {
      return 'Dispatched';
    }
    if (
      ['inspection_completed', 'return_received', 'inspection_started'].includes(request.status) ||
      ['reserved'].includes(replacementStatus)
    ) {
      return 'QC Passed';
    }
    if (['return_picked_up', 'return_in_transit'].includes(request.status)) {
      return 'Item Picked Up';
    }
    if (['approved', 'return_courier_assigned'].includes(request.status)) {
      return 'Approved';
    }
    if (request.status === 'rejected') {
      return 'Rejected';
    }
    if (request.status === 'cancelled') {
      return 'Cancelled';
    }
    return 'Submitted';
  };

  const currentStepName = getCurrentStepName();
  const isFailed = ['Rejected', 'Cancelled'].includes(currentStepName);
  const currentIdx = EXCHANGE_HAPPY_PATH.indexOf(currentStepName);

  // Reject submission
  const handleRejectSubmit = () => {
    if (!rejectReason.trim()) {
      toast.error('Please provide a reason for rejecting the exchange request');
      return;
    }
    onReject(rejectReason.trim());
    setIsRejectOpen(false);
    setRejectReason('');
  };

  // Record Refund Settlement submit
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

    setIsSubmittingSettle(true);
    try {
      if (onSettleRefund) {
        await onSettleRefund({
          amount: Number(settleData.amount),
          paymentMethod: settleData.paymentMethod,
          upiId: settleData.upiId?.trim(),
          transactionId: settleData.transactionId?.trim() || `UPI-MANUAL-${Date.now()}`,
          notes: settleData.notes?.trim(),
        });
      }

      if (settleData.autoCompleteAfterSettle) {
        if (exchangeDetails?._id) {
          await onTransitionReplacement(exchangeDetails._id, request._id, 'delivered');
        } else {
          await onTransitionStatus('completed');
        }
        toast.success(
          `Refund of ₹${settleData.amount} recorded and exchange completed successfully!`,
        );
      }

      setIsSettleModalOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingSettle(false);
    }
  };

  const handleOpenCollectModal = () => {
    setCollectData({
      amount: String(priceDifference || 0),
      paymentMethod: 'upi',
      note: '',
      autoReserve: true,
    });
    setIsCollectModalOpen(true);
  };

  const handleCollectPaymentSubmit = async (e) => {
    e.preventDefault();
    const exchangeId = request._id || request.exchangeId;
    if (!exchangeId) {
      toast.error('Missing exchange request ID');
      return;
    }
    const amt = Number(collectData.amount);
    if (!amt || amt <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }
    setIsSubmittingCollect(true);
    try {
      const { returnService: adminReturnService } =
        await import('../../../services/api/returnService');
      await adminReturnService.recordExchangePayment(exchangeId, {
        amount: amt,
        paymentMethod: collectData.paymentMethod,
        transactionId: collectData.note?.trim() || undefined,
        notes: collectData.note?.trim() || undefined,
        autoReserve: true,
      });
      toast.success(`Payment of ₹${amt} recorded successfully!`);
      setIsCollectModalOpen(false);
      if (typeof onTransitionStatus === 'function') {
        onTransitionStatus(request.status, 'Admin registered difference payment', {
          paymentStatus: 'payment_paid',
          paidAt: new Date(),
        });
      }
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || err?.message || 'Failed to record payment');
    } finally {
      setIsSubmittingCollect(false);
    }
  };

  return (
    <motion.div initial="hidden" animate="show" variants={stagger} className="space-y-6 text-left">
      {/* ─── 1. TOP HEADER (Unified Return/Exchange Layout & Rounded-[4px]) ─── */}
      <motion.div
        variants={fadeUp}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 bg-[var(--admin-surface)] p-3 sm:p-5 rounded-[4px] shadow-xs border border-[var(--admin-border)] min-w-0"
      >
        {/* Left Column: Title and Exchange/Order IDs */}
        <div className="flex flex-col w-full sm:w-auto min-w-0">
          {/* Title Row */}
          <div className="flex items-center justify-between gap-2.5 w-full">
            <div className="flex items-center gap-2 min-w-0">
              <h2 className="text-[18px] sm:text-[20px] font-bold text-[var(--admin-text-primary)] tracking-tight whitespace-nowrap leading-tight">
                Exchange Details
              </h2>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-[4px] shadow-2xs border bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800 shrink-0">
                {exchangeType.replace(/_/g, ' ')}
              </span>
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
              {/* Exchange ID with Copy Button */}
              <div className="flex items-center gap-1 leading-none">
                <span
                  className="font-mono text-[12px] sm:text-[12.5px] font-medium text-[var(--admin-text-secondary)] select-all"
                  title={exchangeDetails?.exchangeId || request.returnId || request._id}
                >
                  #{exchangeDetails?.exchangeId || request.returnId || request._id}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const exId = exchangeDetails?.exchangeId || request.returnId || request._id;
                    if (exId) {
                      navigator.clipboard.writeText(exId);
                      toast.success('Exchange ID copied to clipboard');
                    }
                  }}
                  className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 p-0.5 cursor-pointer transition-colors shrink-0"
                  title="Copy Exchange ID"
                >
                  <span className="material-symbols-outlined text-[13px] sm:text-[14px] block">
                    content_copy
                  </span>
                </button>
              </div>

              {/* Order ID below Exchange ID on mobile, inline with dot on laptop */}
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
            <span className="text-[11px] font-medium text-[var(--admin-text-secondary)] bg-[var(--admin-surface-muted)] border border-[var(--admin-border)] px-2.5 py-0.5 rounded-[4px] shadow-2xs whitespace-nowrap flex items-center gap-1">
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

          {/* Action Buttons: Back, WhatsApp */}
          <div className="flex items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => navigate('/admin/exchanges')}
              className="admin-btn admin-btn-outline flex-1 sm:flex-none !h-9 sm:!h-10 !py-0 px-3 sm:px-4 !rounded-[4px] text-[12px] sm:text-[13px] font-bold shadow-sm min-w-max cursor-pointer inline-flex items-center justify-center gap-1.5 box-border"
            >
              <span className="material-symbols-outlined text-[17px] sm:text-[18px] leading-none">
                arrow_back
              </span>
              <span>Back</span>
            </button>
            {waPhone && (
              <a
                href={`https://wa.me/${waPhone}?text=Hi%20${encodeURIComponent(pickupAddr.name || request.userId?.name || 'Customer')},%20regarding%20your%20Exchange%20Request%20#${encodeURIComponent(exchangeDetails?.exchangeId || request.returnId)}:`}
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
                    Track and override the exchange's current operational stage.
                  </p>
                </div>
                {/* Status Dropdown to override exchange status */}
                <div className="relative w-[140px] sm:w-[165px] h-8 shrink-0">
                  <select
                    value={request.status || 'submitted'}
                    onChange={(e) => onTransitionStatus(e.target.value)}
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
                  <div className="absolute left-[8%] right-[8%] top-[20px] h-[2px] bg-[var(--admin-border)] z-0">
                    {!isFailed && currentIdx >= 0 && (
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{
                          width: `${(currentIdx / (EXCHANGE_HAPPY_PATH.length - 1)) * 100}%`,
                        }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className={`absolute left-0 top-0 bottom-0 ${STEP_COLORS[currentStepName]?.progress || 'bg-[var(--admin-accent)]'}`}
                      />
                    )}
                  </div>

                  {EXCHANGE_HAPPY_PATH.map((step, idx) => {
                    const isActive = currentStepName === step;
                    const isCompleted = currentIdx >= idx && !isFailed;
                    const colors = STEP_COLORS[step] || {};

                    return (
                      <div
                        key={step}
                        className="relative z-10 flex flex-col items-center gap-2 sm:gap-3 w-14 sm:w-20 shrink-0 text-center"
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
                        onClick={onApprove}
                        className="px-3 sm:px-4 py-1.5 rounded-[4px] text-[11px] font-bold bg-[var(--admin-accent)] text-white hover:bg-[var(--admin-accent-hover)] transition-all flex items-center gap-1.5 shadow-sm cursor-pointer border-0"
                      >
                        <span className="material-symbols-outlined text-[16px]">check_circle</span>
                        Approve Exchange
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
                      onClick={() => onTransitionStatus('return_picked_up')}
                      className="px-3 sm:px-4 py-1.5 rounded-[4px] text-[11px] font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer border-0"
                    >
                      <span className="material-symbols-outlined text-[16px]">local_shipping</span>
                      Confirm Item Picked Up
                    </button>
                  )}

                  {currentStepName === 'Item Picked Up' && (
                    <button
                      type="button"
                      onClick={() => onTransitionStatus('inspection_completed')}
                      className="px-3 sm:px-4 py-1.5 rounded-[4px] text-[11px] font-bold bg-purple-600 text-white hover:bg-purple-700 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer border-0"
                    >
                      <span className="material-symbols-outlined text-[16px]">fact_check</span>
                      Pass Quality Check
                    </button>
                  )}

                  {currentStepName === 'QC Passed' && (
                    <>
                      {differenceAction === 'refund_difference' &&
                        priceDifference > 0 &&
                        !isRefundSettled && (
                          <button
                            type="button"
                            onClick={() => {
                              setSettleData({
                                amount: priceDifference,
                                paymentMethod: isCOD ? 'upi' : 'original',
                                upiId: upiId || '',
                                transactionId: '',
                                notes: `Balance refund payout for Exchange #${exchangeDetails?.exchangeId || request.returnId}`,
                                autoCompleteAfterSettle: false,
                              });
                              setIsSettleModalOpen(true);
                            }}
                            className="px-3 py-1.5 rounded-[4px] text-[11px] font-bold bg-amber-600 hover:bg-amber-700 text-white transition-all flex items-center gap-1.5 shadow-sm cursor-pointer border-0"
                          >
                            <span className="material-symbols-outlined text-[16px]">payments</span>
                            Refund Difference (₹{formatINR(priceDifference)})
                          </button>
                        )}
                      <button
                        type="button"
                        onClick={() => {
                          if (exchangeDetails?._id) {
                            onTransitionReplacement(exchangeDetails._id, request._id, 'shipped');
                          } else {
                            onTransitionStatus('inspection_completed');
                          }
                        }}
                        className="px-3 sm:px-4 py-1.5 rounded-[4px] text-[11px] font-bold bg-blue-600 hover:bg-blue-700 text-white transition-all flex items-center gap-1.5 shadow-sm cursor-pointer border-0"
                      >
                        <span className="material-symbols-outlined text-[16px]">inventory_2</span>
                        Dispatch Replacement
                      </button>
                    </>
                  )}

                  {currentStepName === 'Dispatched' && (
                    <button
                      type="button"
                      onClick={() => {
                        if (exchangeDetails?._id) {
                          onTransitionReplacement(exchangeDetails._id, request._id, 'delivered');
                        } else {
                          onTransitionStatus('completed');
                        }
                      }}
                      className="px-3 sm:px-4 py-1.5 rounded-[4px] text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all flex items-center gap-1.5 shadow-sm cursor-pointer border-0"
                    >
                      <span className="material-symbols-outlined text-[16px]">verified</span>
                      Mark Delivered & Complete
                    </button>
                  )}

                  {currentStepName === 'Completed' && (
                    <span className="px-3 py-1.5 rounded-[4px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px]">verified</span>
                      Exchange Fully Completed
                    </span>
                  )}

                  {currentStepName === 'Rejected' && (
                    <span className="px-3 py-1.5 rounded-[4px] bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 text-[11px] font-bold flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px]">cancel</span>
                      Exchange Rejected
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* CARD 2: EXCHANGE ITEMS COMPARISON (Matches OrderItems.jsx) */}
            <div className="bg-[var(--admin-surface)] rounded-[4px] shadow-sm border border-[var(--admin-border)] overflow-hidden">
              <div className="px-3 sm:px-5 py-3 sm:py-4 border-b border-[var(--admin-border-subtle)] bg-[var(--admin-bg-subtle)] flex items-center justify-between">
                <h3 className="text-[14px] font-bold text-[var(--admin-text-primary)] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">compare_arrows</span>
                  Exchange Items Comparison
                </h3>
                <span className="text-[12px] font-bold text-[var(--admin-text-secondary)] bg-[var(--admin-surface-muted)] px-2.5 py-0.5 rounded-[4px] border border-[var(--admin-border-subtle)]">
                  Type: {exchangeType.replace(/_/g, ' ')}
                </span>
              </div>

              <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 sm:gap-6 items-center">
                {/* Left Box: Returning Item */}
                <div className="p-4 rounded-[4px] bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] flex flex-col justify-between h-full">
                  <div>
                    <div className="flex items-center justify-between gap-2 pb-2 mb-3 border-b border-[var(--admin-border)]">
                      <span className="text-[11px] font-bold text-red-700 dark:text-red-400 flex items-center gap-1 uppercase tracking-wider">
                        <span className="material-symbols-outlined text-[14px]">outbox</span>
                        Returning Item
                      </span>
                      <span className="text-[10px] font-bold text-[var(--admin-text-secondary)] bg-white dark:bg-stone-800 px-2 py-0.5 rounded-[4px] border border-[var(--admin-border)]">
                        Qty: {originalQty}
                      </span>
                    </div>

                    <div className="flex gap-3 sm:gap-4 items-start">
                      <img
                        src={originalItem.imageSrc || PLACEHOLDER_IMAGES.product}
                        alt={originalItem.title || 'Original Product'}
                        onError={handleImageError}
                        className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-[4px] border border-[var(--admin-border)] shadow-2xs flex-shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() =>
                          originalItem.imageSrc && setPreviewImage(originalItem.imageSrc)
                        }
                      />
                      <div className="min-w-0 flex-1">
                        <h4 className="text-[14px] font-bold text-[var(--admin-text-primary)] leading-snug line-clamp-2">
                          {originalItem.title || 'Original Item'}
                        </h4>
                        {originalItem.variant && (
                          <div className="mt-1">
                            <span className="inline-block bg-white dark:bg-stone-800 text-[var(--admin-text-secondary)] text-[10px] font-semibold px-2 py-0.5 rounded-[4px] border border-[var(--admin-border)]">
                              Variant: {originalItem.variant}
                            </span>
                          </div>
                        )}
                        <p className="mt-1.5 text-[14px] font-extrabold text-[var(--admin-text-primary)] font-mono">
                          ₹{formatINR(originalUnit)}{' '}
                          <span className="text-[11px] font-normal text-[var(--admin-text-tertiary)]">
                            / unit
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* Customer Reason Badge (Styled as perfect pill with ample margins) */}
                    <div className="mt-3 pt-2.5 border-t border-[var(--admin-border)]">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] text-[11px] font-medium bg-amber-500/10 text-amber-900 dark:text-amber-300 border border-amber-500/20 max-w-full">
                        <span className="material-symbols-outlined text-[13px] text-amber-600 dark:text-amber-400 shrink-0">
                          info
                        </span>
                        <span className="truncate">
                          <strong className="font-semibold text-amber-950 dark:text-amber-200">
                            Reason:
                          </strong>{' '}
                          {request.items?.[0]?.reason ||
                            originalItem.reason ||
                            'Different variant requested'}
                        </span>
                      </div>
                      {request.items?.[0]?.description &&
                        request.items[0].description !==
                          (request.items?.[0]?.reason || originalItem.reason) && (
                          <p className="mt-1.5 text-[var(--admin-text-secondary)] text-[11px] italic">
                            "{request.items[0].description}"
                          </p>
                        )}
                    </div>

                    {/* Evidence Photos */}
                    {request.items?.[0]?.evidenceImages?.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-[var(--admin-border)]">
                        <div className="text-[10px] uppercase tracking-wider font-bold text-[var(--admin-text-tertiary)] mb-1.5">
                          Customer Photos ({request.items[0].evidenceImages.length})
                        </div>
                        <div className="flex gap-2 overflow-x-auto admin-scrollbar pb-1">
                          {request.items[0].evidenceImages.map((img, i) => (
                            <img
                              key={i}
                              src={img}
                              alt="Evidence"
                              onClick={() => setPreviewImage(img)}
                              className="w-11 h-11 object-cover rounded-[4px] border border-[var(--admin-border)] shadow-2xs cursor-pointer hover:scale-105 transition-transform"
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-2.5 border-t border-[var(--admin-border)] flex items-center justify-between text-[12px]">
                    <span className="text-[var(--admin-text-secondary)] font-medium">
                      Original Credit:
                    </span>
                    <span className="font-bold text-[var(--admin-text-primary)] font-mono text-[13px]">
                      ₹{formatINR(originalTotal)}
                    </span>
                  </div>
                </div>

                {/* Middle: Arrow Indicator */}
                <div className="flex flex-col items-center justify-center py-1 md:py-0">
                  <div className="w-8 h-8 rounded-full bg-[var(--admin-surface-muted)] border border-[var(--admin-border)] flex items-center justify-center text-[var(--admin-accent)] shadow-2xs">
                    <span className="material-symbols-outlined text-[18px] rotate-90 md:rotate-0">
                      arrow_forward
                    </span>
                  </div>
                </div>

                {/* Right Box: Replacement Item */}
                <div className="p-4 rounded-[4px] bg-blue-50/20 dark:bg-blue-950/10 border border-blue-200 dark:border-blue-900/40 flex flex-col justify-between h-full">
                  <div>
                    <div className="flex items-center justify-between gap-2 pb-2 mb-3 border-b border-blue-200/60 dark:border-blue-900/40">
                      <span className="text-[11px] font-bold text-blue-700 dark:text-blue-400 flex items-center gap-1 uppercase tracking-wider">
                        <span className="material-symbols-outlined text-[14px]">move_to_inbox</span>
                        Replacement Item
                      </span>
                      <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-[4px] border border-blue-200 dark:border-blue-800">
                        Qty: {replacementQty}
                      </span>
                    </div>

                    <div className="flex gap-3 sm:gap-4 items-start">
                      <img
                        src={replacementItem.imageSrc || PLACEHOLDER_IMAGES.product}
                        alt={replacementItem.title || 'Replacement Product'}
                        onError={handleImageError}
                        className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-[4px] border border-[var(--admin-border)] shadow-2xs flex-shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() =>
                          replacementItem.imageSrc && setPreviewImage(replacementItem.imageSrc)
                        }
                      />
                      <div className="min-w-0 flex-1">
                        <h4 className="text-[14px] font-bold text-[var(--admin-text-primary)] leading-snug line-clamp-2">
                          {replacementItem.title || 'Replacement Item'}
                        </h4>
                        {replacementItem.variant && (
                          <div className="mt-1">
                            <span className="inline-block bg-white dark:bg-stone-800 text-blue-700 dark:text-blue-300 text-[10px] font-semibold px-2 py-0.5 rounded-[4px] border border-blue-200 dark:border-blue-800">
                              Variant: {replacementItem.variant}
                            </span>
                          </div>
                        )}
                        <p className="mt-1.5 text-[14px] font-extrabold text-[var(--admin-text-primary)] font-mono">
                          ₹{formatINR(replacementUnit)}{' '}
                          <span className="text-[11px] font-normal text-[var(--admin-text-tertiary)]">
                            / unit
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* Stock Reservation status */}
                    <div className="mt-3 pt-2.5 border-t border-blue-200/60 dark:border-blue-900/40">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-[4px] border border-emerald-200 dark:border-emerald-800">
                        <span className="material-symbols-outlined text-[13px] text-emerald-600">
                          inventory_2
                        </span>
                        Stock Reserved for Exchange
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-2.5 border-t border-blue-200/60 dark:border-blue-900/40 flex items-center justify-between text-[12px]">
                    <span className="text-[var(--admin-text-secondary)] font-medium">
                      New Price Value:
                    </span>
                    <span className="font-bold text-blue-700 dark:text-blue-300 font-mono text-[13px]">
                      ₹{formatINR(replacementTotal)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Footer Totals Breakdown (Exact Match to OrderItems.jsx) */}
              <div className="px-3 py-4 sm:p-5 lg:p-6 bg-[var(--admin-bg-subtle)] border-t border-[var(--admin-border-subtle)]">
                <div className="flex flex-col items-end gap-2 text-[13px] font-medium text-[var(--admin-text-secondary)]">
                  <div className="flex justify-between w-full sm:w-72">
                    <span>Returning Item Credit</span>
                    <span className="font-bold text-[var(--admin-text-primary)] font-mono">
                      ₹{formatINR(originalTotal)}
                    </span>
                  </div>
                  <div className="flex justify-between w-full sm:w-72">
                    <span>Replacement Item Cost</span>
                    <span className="font-bold text-[var(--admin-text-primary)] font-mono">
                      ₹{formatINR(replacementTotal)}
                    </span>
                  </div>
                  <div className="flex justify-between w-full sm:w-72 pt-3 mt-1 border-t border-[var(--admin-border)]">
                    <span className="text-[13px] font-bold text-[var(--admin-text-primary)] uppercase">
                      Net Difference
                    </span>
                    <span
                      className={`text-[16px] font-black font-mono ${
                        differenceAction === 'collect_payment'
                          ? 'text-amber-600 dark:text-amber-400'
                          : differenceAction === 'refund_difference'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-[var(--admin-text-primary)]'
                      }`}
                    >
                      {differenceAction === 'collect_payment'
                        ? `+₹${formatINR(priceDifference)} (Collect)`
                        : differenceAction === 'refund_difference'
                          ? `-₹${formatINR(priceDifference)} (Refund)`
                          : '₹0 (Even Exchange)'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ─── RIGHT COLUMN: Shipping, Settlement, Order Context (1/3 Width Sticky) ─── */}
          <div className="xl:col-span-1 flex flex-col gap-3 sm:gap-6 lg:gap-8 sticky top-[88px]">
            {/* CARD 1: SHIPPING & LOGISTICS (Matches OrderShipping.jsx) */}
            <div className="bg-[var(--admin-surface)] rounded-[4px] shadow-sm border border-[var(--admin-border)] overflow-hidden">
              <div className="px-3 sm:px-5 py-3 sm:py-4 border-b border-[var(--admin-border-subtle)] bg-[var(--admin-bg-subtle)] flex items-center justify-between">
                <h3 className="text-[14px] font-bold text-[var(--admin-text-primary)] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">local_shipping</span>
                  Shipping Profile
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-[var(--admin-surface)] text-[var(--admin-text-secondary)] px-2 py-0.5 rounded-[4px] font-bold uppercase tracking-wider border border-[var(--admin-border)] shadow-2xs">
                    Reverse & Forward
                  </span>
                  {resolvedCustomer && (
                    <button
                      type="button"
                      onClick={() => setShowCustomerModal(true)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--admin-accent)] hover:underline cursor-pointer"
                      title="View Customer Profile"
                    >
                      <span>View Profile</span>
                      <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="px-3 py-4 sm:p-5 lg:p-6 space-y-5">
                {/* Customer Contact Header */}
                <div
                  onClick={() => resolvedCustomer && setShowCustomerModal(true)}
                  className={`flex items-start gap-3 p-1.5 -m-1.5 rounded-[4px] transition-colors ${
                    resolvedCustomer
                      ? 'hover:bg-[var(--admin-surface-muted)]/70 cursor-pointer group'
                      : ''
                  }`}
                  title={resolvedCustomer ? 'Click to view customer profile' : undefined}
                >
                  <div
                    className={`w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-300 flex items-center justify-center shrink-0 ${resolvedCustomer ? 'group-hover:scale-105 transition-transform' : ''}`}
                  >
                    <span className="material-symbols-outlined text-[20px]">person</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p
                        className={`text-[14px] font-bold text-[var(--admin-text-primary)] truncate ${resolvedCustomer ? 'group-hover:text-[var(--admin-accent)] transition-colors' : ''}`}
                      >
                        {pickupAddr.name || deliveryAddr.name || request.userId?.name || 'Customer'}
                      </p>
                      {resolvedCustomer && (
                        <span className="material-symbols-outlined text-[13px] text-[var(--admin-text-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity">
                          open_in_new
                        </span>
                      )}
                    </div>
                    <div className="text-[12px] text-[var(--admin-text-secondary)] mt-0.5 flex flex-col gap-0.5">
                      <span className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[14px]">phone</span>{' '}
                        {pickupAddr.phone || deliveryAddr.phone || request.userId?.phone || 'N/A'}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[14px]">mail</span>{' '}
                        {request.userId?.email || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Reverse Pickup Address */}
                <div className="flex items-start gap-3 pt-4 border-t border-[var(--admin-border-subtle)]">
                  <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[20px]">outbox</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className="text-[10px] uppercase font-bold text-[var(--admin-text-tertiary)] tracking-wider block">
                        Reverse Pickup Address
                      </span>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([pickupAddr.address || pickupAddr.addressLine1, pickupAddr.locality, pickupAddr.city, pickupAddr.state, pickupAddr.pincode || pickupAddr.pinCode].filter(Boolean).join(', '))}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--admin-accent)] hover:underline cursor-pointer shrink-0"
                        title="Open pickup address in Google Maps"
                      >
                        <span className="material-symbols-outlined text-[13px]">map</span>
                        <span>Open in Maps</span>
                      </a>
                    </div>
                    <div className="text-[12px] sm:text-[13px] text-[var(--admin-text-primary)] leading-relaxed">
                      <p>
                        {pickupAddr.address ||
                          pickupAddr.addressLine1 ||
                          'Address details not provided'}
                        {pickupAddr.locality ? `, ${pickupAddr.locality}` : ''}
                      </p>
                      {(pickupAddr.city || pickupAddr.state) && (
                        <p className="mt-0.5 font-medium">
                          {[pickupAddr.city, pickupAddr.state].filter(Boolean).join(', ')} -{' '}
                          <span className="font-bold">
                            {pickupAddr.pincode || pickupAddr.pinCode || ''}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Forward Delivery Address */}
                <div className="flex items-start gap-3 pt-4 border-t border-[var(--admin-border-subtle)]">
                  <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[20px]">home_pin</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className="text-[10px] uppercase font-bold text-[var(--admin-text-tertiary)] tracking-wider block">
                        Replacement Delivery Address
                      </span>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([deliveryAddr.address || deliveryAddr.addressLine1 || pickupAddr.address, deliveryAddr.locality || pickupAddr.locality, deliveryAddr.city || pickupAddr.city, deliveryAddr.state || pickupAddr.state, deliveryAddr.pincode || deliveryAddr.pinCode || pickupAddr.pincode].filter(Boolean).join(', '))}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--admin-accent)] hover:underline cursor-pointer shrink-0"
                        title="Open delivery address in Google Maps"
                      >
                        <span className="material-symbols-outlined text-[13px]">map</span>
                        <span>Open in Maps</span>
                      </a>
                    </div>
                    <div className="text-[12px] sm:text-[13px] text-[var(--admin-text-primary)] leading-relaxed">
                      <p>
                        {deliveryAddr.address ||
                          deliveryAddr.addressLine1 ||
                          pickupAddr.address ||
                          'Same as pickup address'}
                        {deliveryAddr.locality ? `, ${deliveryAddr.locality}` : ''}
                      </p>
                      {(deliveryAddr.city || deliveryAddr.state) && (
                        <p className="mt-0.5 font-medium">
                          {[deliveryAddr.city, deliveryAddr.state].filter(Boolean).join(', ')} -{' '}
                          <span className="font-bold">
                            {deliveryAddr.pincode || deliveryAddr.pinCode || ''}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Open in Google Maps */}
                <div className="pt-2">
                  <a
                    href={`https://maps.google.com/?q=${encodeURIComponent(
                      [
                        pickupAddr.address || pickupAddr.addressLine1,
                        pickupAddr.locality,
                        pickupAddr.city,
                        pickupAddr.state,
                        pickupAddr.pincode || pickupAddr.pinCode,
                      ]
                        .filter(Boolean)
                        .join(', '),
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full h-10 flex items-center justify-center rounded-[4px] bg-[var(--admin-surface)] text-[var(--admin-text-primary)] hover:bg-[var(--admin-bg-subtle)] transition-colors border border-[var(--admin-border)] shadow-sm font-bold text-[12px]"
                  >
                    <span className="material-symbols-outlined text-[16px] mr-1.5">map</span>
                    Open in Maps
                  </a>
                </div>
              </div>
            </div>

            {/* CARD 2: FINANCIAL SETTLEMENT (Matches OrderSettlement.jsx) */}
            <div className="bg-[var(--admin-surface)] rounded-[4px] shadow-sm border border-[var(--admin-border)] overflow-hidden">
              <div className="px-3 sm:px-5 py-3 sm:py-4 border-b border-[var(--admin-border-subtle)] bg-[var(--admin-bg-subtle)] flex items-center justify-between">
                <h3 className="text-[14px] font-bold text-[var(--admin-text-primary)] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">account_balance</span>
                  Financial Settlement
                </h3>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-[4px] font-bold uppercase tracking-wider border shadow-2xs ${
                    isRefundSettled ||
                    paymentStatus === 'payment_paid' ||
                    differenceAction === 'direct_exchange'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                      : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300'
                  }`}
                >
                  {isRefundSettled ||
                  paymentStatus === 'payment_paid' ||
                  differenceAction === 'direct_exchange'
                    ? 'Reconciled'
                    : 'Pending'}
                </span>
              </div>

              <div className="px-3 py-4 sm:p-5 lg:p-6 space-y-4">
                {/* Settlement Difference Action Strip */}
                <div className="space-y-2 pb-3 border-b border-[var(--admin-border-subtle)]">
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="text-[var(--admin-text-secondary)]">Difference Action</span>
                    <span className="font-bold text-[var(--admin-text-primary)] capitalize">
                      {differenceAction.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[13px]">
                    <span className="text-[var(--admin-text-secondary)]">
                      Net Difference Amount
                    </span>
                    <span className="font-bold text-[var(--admin-text-primary)] font-mono text-[14px]">
                      ₹{formatINR(priceDifference)}
                    </span>
                  </div>
                </div>

                {/* CASE A: STORE REFUNDS DIFFERENCE TO CUSTOMER */}
                {differenceAction === 'refund_difference' && (
                  <div className="space-y-3">
                    <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/40 rounded-[4px] space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                          Customer Payout Due
                        </span>
                        <span className="font-mono font-black text-emerald-700 dark:text-emerald-300 text-[14px]">
                          ₹{formatINR(priceDifference)}
                        </span>
                      </div>

                      {upiId && (
                        <div className="pt-2 border-t border-emerald-200/60 dark:border-emerald-800/40 flex items-center justify-between gap-2">
                          <span className="text-[11px] text-[var(--admin-text-secondary)] font-medium">
                            Customer UPI ID:
                          </span>
                          <div className="flex items-center gap-1.5 font-mono font-bold text-[12px] text-[var(--admin-text-primary)]">
                            <span>{upiId}</span>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(upiId);
                                toast.success('UPI ID copied!');
                              }}
                              className="text-[var(--admin-accent)] hover:underline cursor-pointer"
                              title="Copy UPI ID"
                            >
                              <span className="material-symbols-outlined text-[14px]">
                                content_copy
                              </span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action Button: Mark Payment Done */}
                    {!isRefundSettled && !isUnderReview ? (
                      <button
                        type="button"
                        onClick={() => {
                          setSettleData({
                            amount: priceDifference || 0,
                            paymentMethod: isCOD
                              ? 'upi'
                              : refundMethod === 'wallet'
                                ? 'wallet'
                                : 'upi',
                            upiId: upiId || '',
                            transactionId: '',
                            notes: `Paid ₹${formatINR(priceDifference)} balance refund to customer UPI (${upiId || 'Direct'})`,
                            autoCompleteAfterSettle: false,
                          });
                          setIsSettleModalOpen(true);
                        }}
                        className="w-full admin-btn admin-btn-primary flex items-center justify-center gap-2 h-10 !rounded-[4px] text-[12px] font-bold shadow-sm cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">verified</span>
                        Record Payment / Payout
                      </button>
                    ) : isRefundSettled ? (
                      <div className="p-3 bg-white dark:bg-stone-850 border border-emerald-200 dark:border-emerald-800 rounded-[4px] text-[11px] space-y-1">
                        <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-bold">
                          <span className="material-symbols-outlined text-[15px]">
                            check_circle
                          </span>
                          Payout Reconciled & Recorded
                        </div>
                        {settledUtr && (
                          <p className="font-mono text-[var(--admin-text-primary)]">
                            UTR: <span className="font-bold">{settledUtr}</span>
                          </p>
                        )}
                        {settledDate && (
                          <p className="text-[var(--admin-text-tertiary)]">
                            Recorded on {format(new Date(settledDate), 'dd MMM yyyy, hh:mm a')}
                          </p>
                        )}
                      </div>
                    ) : null}
                  </div>
                )}

                {/* CASE B: CUSTOMER PAYS DIFFERENCE */}
                {differenceAction === 'collect_payment' && (
                  <div className="space-y-3">
                    <div className="p-3 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/40 rounded-[4px] space-y-2">
                      <div className="flex items-center justify-between text-[12px]">
                        <span className="font-medium text-[var(--admin-text-secondary)]">
                          Payment Status
                        </span>
                        <span
                          className={`font-bold px-2 py-0.5 rounded-[4px] text-[10px] uppercase tracking-wider ${
                            paymentStatus === 'payment_paid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {paymentStatus === 'payment_paid'
                            ? 'Paid via Razorpay'
                            : 'Pending Payment'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[12px]">
                        <span className="font-medium text-[var(--admin-text-secondary)]">
                          Amount Due
                        </span>
                        <span className="font-mono font-bold text-amber-700 dark:text-amber-400 text-[14px]">
                          ₹{formatINR(priceDifference)}
                        </span>
                      </div>
                    </div>

                    {paymentStatus !== 'payment_paid' && (
                      <button
                        type="button"
                        onClick={handleOpenCollectModal}
                        className="w-full admin-btn admin-btn-primary flex items-center justify-center gap-2 h-10 !rounded-[4px] text-[12px] font-bold shadow-sm cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">payments</span>
                        Collect Payment (₹{formatINR(priceDifference)})
                      </button>
                    )}
                  </div>
                )}

                {/* CASE C: DIRECT EVEN EXCHANGE */}
                {differenceAction === 'direct_exchange' && (
                  <div className="p-3 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-[4px] flex items-center gap-2 text-[12px] text-[var(--admin-text-secondary)]">
                    <span className="material-symbols-outlined text-[16px] text-emerald-600">
                      balance
                    </span>
                    <span>Even exchange. No additional payment or refund required.</span>
                  </div>
                )}
              </div>
            </div>

            {/* CARD 3: ORIGINAL ORDER REFERENCE (Matches OrderReturnCard style) */}
            <div className="bg-[var(--admin-surface)] rounded-[4px] shadow-sm border border-[var(--admin-border)] overflow-hidden">
              <div className="px-3 sm:px-5 py-3 sm:py-4 border-b border-[var(--admin-border-subtle)] bg-[var(--admin-bg-subtle)] flex items-center justify-between">
                <h3 className="text-[14px] font-bold text-[var(--admin-text-primary)] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                  Original Order Reference
                </h3>
                {orderIdVal && (
                  <Link
                    to={`/admin/orders/${orderIdVal}`}
                    className="admin-btn admin-btn-outline h-7 px-2.5 !rounded-[4px] text-[11px] font-bold shadow-2xs flex items-center gap-1 hover:border-[var(--admin-accent)] hover:text-[var(--admin-accent)] transition-colors"
                    title="View Original Order Details"
                  >
                    <span>View Order</span>
                    <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                  </Link>
                )}
              </div>

              <div className="p-4 sm:p-5 text-[12px] space-y-2.5 font-medium">
                <div className="flex justify-between items-center py-1 border-b border-[var(--admin-border-subtle)]">
                  <span className="text-[var(--admin-text-secondary)]">Order ID:</span>
                  <Link
                    to={`/admin/orders/${request.orderId?._id || request.orderId}`}
                    className="font-mono font-bold text-[var(--admin-accent)] hover:underline"
                  >
                    #
                    {request.orderId?.orderCode ||
                      request.orderId?._id?.slice(-8) ||
                      request.orderId ||
                      'Order'}
                  </Link>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-[var(--admin-border-subtle)]">
                  <span className="text-[var(--admin-text-secondary)]">Payment Method:</span>
                  <span className="font-bold text-[var(--admin-text-primary)] uppercase">
                    {request.orderId?.paymentMethod || request.order?.paymentMethod || 'Online'}
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

      {/* ─── MODAL 1: REJECT EXCHANGE MODAL ─── */}
      <AnimatePresence>
        {isRejectOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[100] p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-stone-900 rounded-[4px] w-full max-w-md p-6 shadow-xl border border-[var(--admin-border)]"
            >
              <h3 className="text-base font-bold text-red-600 flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined">warning</span>
                Reject Exchange Request
              </h3>
              <p className="text-xs text-[var(--admin-text-secondary)] mb-4">
                Please enter the reason for rejecting this exchange request. This message will be
                sent to the customer.
              </p>
              <textarea
                className="admin-input w-full min-h-[100px] text-xs mb-4 !rounded-[4px]"
                placeholder="e.g., Item has exceeded the eligible exchange window..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
              <div className="flex justify-end gap-2.5">
                <button
                  type="button"
                  className="admin-btn admin-btn-outline text-xs !rounded-[4px]"
                  onClick={() => setIsRejectOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn-primary !bg-red-600 hover:!bg-red-700 text-white text-xs !rounded-[4px]"
                  onClick={handleRejectSubmit}
                >
                  Confirm Rejection
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── MODAL 2: RECORD REFUND SETTLEMENT MODAL (Standardized Rental Style) ─── */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {isSettleModalOpen && (
              <div
                key="exchange-settle-modal-portal"
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
                        className="text-[15px] font-bold text-[var(--admin-text-primary)] flex items-center gap-2 font-sans tracking-normal"
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
                      <p className="text-[11px] text-[var(--admin-text-secondary)] font-medium truncate mt-0.5 font-sans">
                        Exchange #{request.exchangeId || request._id?.slice(-8)} &bull; Price
                        Difference Payout
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsSettleModalOpen(false)}
                      disabled={isSubmittingSettle}
                      className="w-7 h-7 rounded-[4px] flex items-center justify-center text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] hover:bg-black/5 dark:hover:bg-white/10 transition-colors shadow-2xs border border-[#e8e4d9] dark:border-white/10 cursor-pointer disabled:opacity-50"
                      style={{
                        backgroundColor: 'var(--admin-surface, #ffffff)',
                        borderColor: 'var(--admin-border, #e8e4d9)',
                      }}
                    >
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                  </div>

                  {/* Body Form */}
                  <form
                    onSubmit={handleSettleSubmit}
                    className="p-5 sm:p-6 space-y-4 font-sans overflow-y-auto custom-scrollbar flex-1 pb-8 sm:pb-6 text-left"
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
                          {pickupAddr.name || request.userId?.name || 'Customer'}
                        </span>
                      </div>
                      {upiId && (
                        <div className="flex justify-between items-center text-[12px] pt-1 border-t border-[var(--admin-border-subtle)]">
                          <span className="text-[var(--admin-text-secondary)] font-medium">
                            Customer UPI
                          </span>
                          <div className="flex items-center gap-1 font-mono font-bold text-[var(--admin-text-primary)]">
                            <span>{upiId}</span>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(upiId);
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
                      <div className="flex justify-between items-center text-[14px] pt-1.5 mt-1 border-t border-[var(--admin-border-subtle)]">
                        <span className="font-bold text-[var(--admin-text-primary)]">
                          Refund Due
                        </span>
                        <span className="font-bold text-amber-700 dark:text-amber-400 text-[15px] font-mono">
                          ₹{priceDifference || 0}
                        </span>
                      </div>
                    </div>

                    {/* Amount to Refund */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--admin-text-secondary)] block">
                          Amount Paid (₹) *
                        </label>
                        {priceDifference > 0 &&
                          String(settleData.amount) !== String(priceDifference) && (
                            <button
                              type="button"
                              onClick={() =>
                                setSettleData({ ...settleData, amount: priceDifference })
                              }
                              className="text-[11px] font-semibold text-[var(--admin-accent)] hover:underline cursor-pointer"
                            >
                              Fill Due (₹{priceDifference})
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
                          placeholder={`e.g. ${priceDifference || 500}`}
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
                          className="w-full h-10 pl-3 pr-9 rounded-[4px] border border-[var(--admin-border)] bg-white dark:bg-[#1a1815] text-[var(--admin-text-primary)] focus:border-[var(--admin-accent)] outline-none text-[13px] cursor-pointer font-medium"
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
                          <option value="wallet">Customer Store Wallet Credit</option>
                          <option value="cash">Cash Settlement</option>
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
                        placeholder="e.g. Paid ₹500 from Business Account..."
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
                        checked={Boolean(settleData.autoCompleteAfterSettle)}
                        onChange={(e) =>
                          setSettleData({
                            ...settleData,
                            autoCompleteAfterSettle: e.target.checked,
                          })
                        }
                        className="mt-0.5 rounded-[3px] accent-[var(--admin-accent)]"
                      />
                      <div className="text-[11.5px] leading-tight text-[var(--admin-text-primary)]">
                        <strong className="block font-bold">
                          Mark exchange as Completed immediately after recording
                        </strong>
                        <span className="text-[10.5px] text-[var(--admin-text-secondary)]">
                          Finalizes the replacement delivery and completes this exchange.
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
                            <span>Recording Settlement...</span>
                          </>
                        ) : (
                          <span>
                            {settleData.autoCompleteAfterSettle
                              ? 'Confirm Payout & Complete Exchange'
                              : 'Confirm & Register Payment'}
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

      {/* ─── MODAL: RECORD CUSTOMER DIFFERENCE PAYMENT (Standardized Rental Style) ─── */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {isCollectModalOpen && (
              <div
                key="exchange-detail-collect-modal-portal"
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
                  onClick={!isSubmittingCollect ? () => setIsCollectModalOpen(false) : undefined}
                  className="fixed inset-0 bg-black/40 dark:bg-black/60 cursor-pointer pointer-events-auto"
                  style={{ backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}
                />

                {/* Modal Card / Mobile App Drawer */}
                <motion.div
                  initial={{ opacity: 0, y: isMobile ? '100%' : 15, scale: isMobile ? 1 : 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: isMobile ? '100%' : 15, scale: isMobile ? 1 : 0.95 }}
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

                  {/* Header */}
                  <div
                    className="flex items-center justify-between px-5 sm:px-6 py-3.5 sm:py-4 border-b border-[#e8e4d9] dark:border-white/10 shrink-0"
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
                          Exchange #{request.exchangeId || request._id?.slice(-8)} &bull; Required
                          Difference: ₹{priceDifference}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsCollectModalOpen(false)}
                      disabled={isSubmittingCollect}
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
                            {originalItem.title || 'Original Item'}
                          </span>
                        </div>

                        {/* Replacement Item */}
                        <div className="flex justify-between items-start text-[12.5px] gap-2">
                          <span className="text-emerald-700 dark:text-emerald-400 font-medium shrink-0 flex items-center gap-1.5 pt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Replacement Item
                          </span>
                          <span className="font-semibold text-emerald-700 dark:text-emerald-300 text-right truncate max-w-[220px]">
                            {replacementItem.title || 'Replacement Item'}
                          </span>
                        </div>
                      </div>

                      {/* Highlighted Difference Banner */}
                      <div className="flex justify-between items-center px-3 py-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/40 rounded-[4px] mt-1">
                        <span className="font-bold text-[12px] text-amber-900 dark:text-amber-200">
                          Price Difference Due
                        </span>
                        <span className="font-extrabold text-amber-700 dark:text-amber-400 font-mono text-[15px]">
                          ₹{priceDifference}
                        </span>
                      </div>
                    </div>

                    {/* Amount Input */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--admin-text-secondary)] block">
                          Payment Amount (₹) *
                        </label>
                        {priceDifference > 0 &&
                          String(collectData.amount) !== String(priceDifference) && (
                            <button
                              type="button"
                              onClick={() =>
                                setCollectData({ ...collectData, amount: String(priceDifference) })
                              }
                              className="text-[11px] font-bold text-amber-700 dark:text-amber-400 hover:underline cursor-pointer"
                            >
                              Pay Full (₹{priceDifference})
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
                          value={collectData.amount}
                          onChange={(e) =>
                            setCollectData({ ...collectData, amount: e.target.value })
                          }
                          placeholder={`e.g. ${priceDifference || 500}`}
                          disabled={isSubmittingCollect}
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
                          value={collectData.paymentMethod}
                          onChange={(e) =>
                            setCollectData({ ...collectData, paymentMethod: e.target.value })
                          }
                          disabled={isSubmittingCollect}
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
                        value={collectData.note}
                        onChange={(e) => setCollectData({ ...collectData, note: e.target.value })}
                        disabled={isSubmittingCollect}
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
                        disabled={isSubmittingCollect || Number(collectData.amount) <= 0}
                        className="w-full h-10 rounded-[4px] bg-[var(--admin-accent)] hover:bg-[var(--admin-accent-hover)] text-white font-bold text-[13px] shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{
                          backgroundColor: 'var(--admin-accent, #826237)',
                        }}
                      >
                        {isSubmittingCollect ? (
                          <>
                            <span className="material-symbols-outlined animate-spin text-[16px]">
                              progress_activity
                            </span>
                            <span>Recording Payment...</span>
                          </>
                        ) : (
                          <span>
                            Record Payment{' '}
                            {Number(collectData.amount) > 0 ? `(₹${collectData.amount})` : ''}
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

      {/* ─── MODAL 3: EVIDENCE IMAGE LIGHTBOX MODAL ─── */}
      <AnimatePresence>
        {previewImage && (
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[110] p-4 cursor-pointer"
            onClick={() => setPreviewImage(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-3xl max-h-[85vh] bg-transparent"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={previewImage}
                alt="Enlarged preview"
                className="max-w-full max-h-[85vh] object-contain rounded-[4px] shadow-2xl border border-white/20"
              />
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-black/80 text-white flex items-center justify-center hover:bg-black transition-colors shadow-lg border border-white/20 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Customer 360 Profile Modal */}
      <AnimatePresence>
        {showCustomerModal && resolvedCustomer && (
          <AdminCustomerProfileModal
            customer={resolvedCustomer}
            onClose={() => setShowCustomerModal(false)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
