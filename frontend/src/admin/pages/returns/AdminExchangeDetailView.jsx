import React, { useState } from 'react';
import { format } from 'date-fns';
import { m as motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useConfirm } from '../../../context/ConfirmProvider';
import { handleImageError } from '../../../utils/media/imageUtils';
import { PLACEHOLDER_IMAGES } from '../../../constants/placeholderImages';
import { PageHeader, StatusBadge, stagger } from '../../components/AdminUIKit';

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
  const confirm = useConfirm();
  const { request = {}, userStats = {}, exchangeDetails = {} } = currentReturn || {};

  // Local UI state
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [previewImage, setPreviewImage] = useState(null);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);

  // Record Refund Settlement / Payout Modal state
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [settleData, setSettleData] = useState({
    amount: 0,
    paymentMethod: 'upi',
    upiId: '',
    transactionId: '',
    notes: '',
  });
  const [isSubmittingSettle, setIsSubmittingSettle] = useState(false);

  // Safe authoritative fields from backend
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

  // Address normalization
  const pickupAddr = request.pickup?.address || request.orderId?.shippingAddress || {};
  const deliveryAddr = request.orderId?.shippingAddress || request.pickup?.address || {};

  // Financial Math
  const originalUnit = Number(originalItem.unitPrice || 0);
  const originalQty = Number(originalItem.quantity || originalItem.returnQuantity || 1);
  const originalTotal = originalUnit * originalQty;

  const replacementUnit = Number(replacementItem.unitPrice || 0);
  const replacementQty = Number(replacementItem.quantity || 1);
  const replacementTotal = replacementUnit * replacementQty;

  // Formatting helper
  const formatINR = (amt) =>
    Number(amt || 0).toLocaleString('en-IN', {
      maximumFractionDigits: 2,
    });

  // Refund Settlement Status & Record Detection
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

  const settledAmount =
    refundRecord?.amount || refundTimelineEvent?.metadata?.amount || priceDifference;

  const settledUtr =
    refundRecord?.bankReference ||
    refundRecord?.originalTransactionId ||
    refundTimelineEvent?.metadata?.transactionId ||
    '';

  const settledDate = refundRecord?.completedAt || refundTimelineEvent?.timestamp;

  // Customer phone formatting for WhatsApp
  const rawPhone = String(
    request.userId?.phone || pickupAddr.phone || deliveryAddr.phone || '',
  ).replace(/\D/g, '');
  const waPhone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;

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
          transactionId: settleData.transactionId?.trim(),
          notes: settleData.notes?.trim(),
        });
      }
      setIsSettleModalOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingSettle(false);
    }
  };

  // Clean matching stages for Exchange lifecycle (Aligned with Admin Portal Design Tokens)
  const EXCHANGE_STAGES = [
    {
      key: 'submitted',
      number: 1,
      title: 'Exchange Submitted',
      desc: 'Customer request under review',
      icon: 'assignment',
      color: 'text-[var(--admin-info)]',
      bg: 'bg-[var(--admin-info-light)]',
      border: 'border-[var(--admin-info-border)]',
      dot: 'bg-[var(--admin-info)]',
    },
    {
      key: 'approved',
      number: 2,
      title: 'Exchange Approved',
      desc: 'Approved by store team',
      icon: 'check_circle',
      color: 'text-[var(--admin-warning)]',
      bg: 'bg-[var(--admin-warning-light)]',
      border: 'border-[var(--admin-warning-border)]',
      dot: 'bg-[var(--admin-warning)]',
    },
    {
      key: 'return_picked_up',
      number: 3,
      title: 'Item Picked Up',
      desc: 'Returning item collected by courier',
      icon: 'local_shipping',
      color: 'text-[var(--admin-accent)]',
      bg: 'bg-[var(--admin-accent-light)]',
      border: 'border-[var(--admin-border-strong)]',
      dot: 'bg-[var(--admin-accent)]',
    },
    {
      key: 'inspection_completed',
      number: 4,
      title: 'Quality Check Passed',
      desc: 'Item received & verified at warehouse',
      icon: 'fact_check',
      color: 'text-[var(--admin-accent)]',
      bg: 'bg-[var(--admin-accent-light)]',
      border: 'border-[var(--admin-border-strong)]',
      dot: 'bg-[var(--admin-accent)]',
    },
    {
      key: 'replacement_dispatched',
      number: 5,
      title: 'Replacement Dispatched',
      desc: 'New replacement package on the way',
      icon: 'inventory_2',
      color: 'text-[var(--admin-info)]',
      bg: 'bg-[var(--admin-info-light)]',
      border: 'border-[var(--admin-info-border)]',
      dot: 'bg-[var(--admin-info)]',
    },
    {
      key: 'completed',
      number: 6,
      title: 'Exchange Completed',
      desc: 'Delivered & exchange finalized',
      icon: 'verified',
      color: 'text-[var(--admin-success)]',
      bg: 'bg-[var(--admin-success-light)]',
      border: 'border-[var(--admin-success-border)]',
      dot: 'bg-[var(--admin-success)]',
    },
  ];

  const getActiveExchangeStep = () => {
    if (['completed'].includes(request.status) || replacementStatus === 'delivered') {
      return 'completed';
    }
    if (replacementStatus === 'shipped') {
      return 'replacement_dispatched';
    }
    if (
      [
        'inspection_completed',
        'inspection_started',
        'return_received',
        'refund_initiated',
        'refund_completed',
      ].includes(request.status)
    ) {
      return 'inspection_completed';
    }
    if (
      ['return_picked_up', 'return_in_transit', 'return_courier_assigned'].includes(request.status)
    ) {
      return 'return_picked_up';
    }
    if (['approved'].includes(request.status)) {
      return 'approved';
    }
    if (request.status === 'rejected') {
      return 'rejected';
    }
    return 'submitted';
  };

  const activeStepKey = getActiveExchangeStep();

  const currentStageObj =
    EXCHANGE_STAGES.find((s) => s.key === activeStepKey) ||
    (request.status === 'rejected'
      ? {
          key: 'rejected',
          number: '✕',
          title: 'Exchange Rejected',
          desc: 'Request rejected by store team',
          icon: 'cancel',
          color: 'text-[var(--admin-error)]',
          bg: 'bg-[var(--admin-error-light)]',
          border: 'border-[var(--admin-error-border)]',
          dot: 'bg-[var(--admin-error)]',
        }
      : EXCHANGE_STAGES[0]);

  const handleSelectExchangeStage = async (stageKey) => {
    setIsStatusDropdownOpen(false);

    if (stageKey === activeStepKey) return;

    if (stageKey === 'rejected') {
      setIsRejectOpen(true);
      return;
    }

    if (stageKey === 'approved') {
      if (
        await confirm({
          title: 'Approve Exchange Request',
          message: `Are you sure you want to approve Exchange #${exchangeDetails?.exchangeId || request.returnId}?`,
          type: 'warning',
        })
      ) {
        onApprove();
      }
      return;
    }

    if (stageKey === 'return_picked_up') {
      onTransitionStatus('return_picked_up');
      return;
    }

    if (stageKey === 'inspection_completed') {
      onTransitionStatus('inspection_completed');
      return;
    }

    if (stageKey === 'replacement_dispatched') {
      if (exchangeDetails?._id) {
        onTransitionReplacement(exchangeDetails._id, request._id, 'shipped');
      } else {
        toast.success('Replacement item marked as dispatched.');
      }
      return;
    }

    if (stageKey === 'completed') {
      if (
        await confirm({
          title: 'Complete Exchange',
          message: 'Are you sure you want to mark this exchange as completed?',
          type: 'info',
        })
      ) {
        onTransitionStatus('completed');
      }
      return;
    }
  };

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={stagger}
      className="flex flex-col space-y-6 pb-12"
    >
      {/* ─── Top Header & Controls ─── */}
      <PageHeader
        actionRowMobile={true}
        title={
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-[var(--admin-text-primary)] font-bold text-lg sm:text-2xl">
              Exchange Request
            </span>
            <span className="font-mono text-[var(--admin-accent)] bg-[var(--admin-accent-light)] border border-[var(--admin-border-strong)] px-2 py-0.5 rounded-lg text-xs sm:text-sm font-bold">
              {exchangeDetails?.exchangeId || request.returnId}
            </span>
          </div>
        }
        subtitle={
          <div className="flex items-center gap-x-2.5 gap-y-1 text-xs text-[var(--admin-text-secondary)] mt-1 flex-wrap">
            <span>
              {request.createdAt
                ? format(new Date(request.createdAt), 'MMM dd, yyyy • HH:mm')
                : 'Recent'}
            </span>
            <span>•</span>
            <span>
              Order:{' '}
              <a
                href={`/admin/orders/${request.orderId?._id || request.orderId}`}
                className="text-[var(--admin-accent)] hover:text-[var(--admin-accent-hover)] font-bold hover:underline"
              >
                #
                {request.orderId?.orderCode ||
                  request.orderId?._id?.slice(-8) ||
                  request.orderId ||
                  'N/A'}
              </a>
            </span>
          </div>
        }
        backButton={{ path: '/admin/exchanges', label: 'Back' }}
        headerAction={<StatusBadge status={request.status} />}
      />

      {/* ─── Unified Exchange Lifecycle Stage Selector ─── */}
      <div className="admin-card overflow-hidden border border-[var(--admin-border)] shadow-xs bg-white rounded-2xl p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Current Stage */}
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${currentStageObj.bg} ${currentStageObj.color} shadow-xs border ${currentStageObj.border || 'border-current/20'}`}
            >
              <span className="material-symbols-outlined text-[22px]">{currentStageObj.icon}</span>
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-sm sm:text-base font-bold text-[var(--admin-text-primary)] block truncate">
                Step {currentStageObj.number} of 6: {currentStageObj.title}
              </span>
              <p className="text-xs text-[var(--admin-text-secondary)] mt-0.5 truncate">
                {currentStageObj.desc}
              </p>
            </div>
          </div>

          {/* Quick Stage Dropdown */}
          <div className="relative shrink-0 w-full sm:w-auto min-w-0 sm:min-w-[240px]">
            <select
              id="exchange-status-dropdown"
              value={activeStepKey}
              onChange={(e) => handleSelectExchangeStage(e.target.value)}
              className="w-full appearance-none bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] hover:border-[var(--admin-accent)] focus:border-[var(--admin-accent)] focus:ring-2 focus:ring-[var(--admin-accent)]/15 rounded-xl px-3.5 py-2.5 pr-9 text-xs font-bold text-[var(--admin-text-primary)] shadow-2xs cursor-pointer transition-all outline-none"
            >
              {EXCHANGE_STAGES.map((st) => (
                <option key={st.key} value={st.key}>
                  Step {st.number}: {st.title}
                </option>
              ))}
              <option value="rejected">✕ Reject Exchange</option>
            </select>
            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--admin-text-tertiary)] text-[18px]">
              unfold_more
            </span>
          </div>
        </div>
      </div>

      {/* ─── Main Two-Column Layout ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_400px] gap-6 items-start">
        {/* Left Column: Exchange Details */}
        <div className="flex flex-col gap-6 min-w-0">
          {/* 1. DUAL LOGISTICS & ADDRESS CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Reverse Pickup Address */}
            <div className="admin-card overflow-hidden border border-[var(--admin-border)] shadow-xs bg-white rounded-2xl flex flex-col justify-between">
              <div>
                <div className="p-4 sm:p-5 border-b border-[var(--admin-border)] flex items-center justify-between bg-[var(--admin-bg-subtle)]/40">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[var(--admin-accent)] text-[18px]">
                      local_shipping
                    </span>
                    <h3 className="text-sm font-bold text-[var(--admin-text-primary)]">
                      Pickup Logistics
                    </h3>
                  </div>
                  <StatusBadge status={request.pickup?.status || 'pending'} />
                </div>
                <div className="p-4 sm:p-5 text-xs space-y-2">
                  <p className="text-sm font-bold text-[var(--admin-text-primary)]">
                    {pickupAddr.name || request.userId?.name || 'Customer'}
                  </p>
                  <p className="text-[var(--admin-text-secondary)] leading-relaxed">
                    {pickupAddr.address ||
                      pickupAddr.addressLine1 ||
                      'Address details not provided'}
                    {pickupAddr.locality && `, ${pickupAddr.locality}`}
                    <br />
                    {pickupAddr.city || 'City'}, {pickupAddr.state || 'State'} -{' '}
                    <strong className="text-[var(--admin-text-primary)]">
                      {pickupAddr.pincode || pickupAddr.pinCode || ''}
                    </strong>
                  </p>
                </div>
              </div>

              {/* Contact Actions */}
              <div className="p-4 pt-0 flex gap-2">
                {pickupAddr.phone && (
                  <a
                    href={`tel:${pickupAddr.phone}`}
                    className="flex-1 py-2 px-3 bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface-hover)] text-[var(--admin-text-primary)] text-xs font-bold rounded-xl border border-[var(--admin-border)] text-center flex items-center justify-center gap-1 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[14px]">call</span>
                    Call {pickupAddr.phone}
                  </a>
                )}
                {waPhone && (
                  <a
                    href={`https://wa.me/${waPhone}?text=Hi%20${encodeURIComponent(pickupAddr.name || 'there')},%20regarding%20your%20Exchange%20Request%20#${encodeURIComponent(exchangeDetails?.exchangeId || request.returnId)}:`}
                    target="_blank"
                    rel="noreferrer"
                    className="py-2 px-3 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#128C7E] text-xs font-bold rounded-xl border border-[#25D366]/30 text-center flex items-center justify-center gap-1 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[14px]">chat</span>
                    WhatsApp
                  </a>
                )}
              </div>
            </div>

            {/* Replacement Delivery Address */}
            <div className="admin-card overflow-hidden border border-[var(--admin-border)] shadow-xs bg-white rounded-2xl flex flex-col justify-between">
              <div>
                <div className="p-4 sm:p-5 border-b border-[var(--admin-border)] flex items-center justify-between bg-[var(--admin-bg-subtle)]/40">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[var(--admin-accent)] text-[18px]">
                      home_pin
                    </span>
                    <h3 className="text-sm font-bold text-[var(--admin-text-primary)]">
                      Replacement Delivery
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--admin-accent-light)] text-[var(--admin-accent)] border border-[var(--admin-border-strong)]">
                    {replacementStatus.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="p-4 sm:p-5 text-xs space-y-2">
                  <p className="text-sm font-bold text-[var(--admin-text-primary)]">
                    {deliveryAddr.name || pickupAddr.name || request.userId?.name || 'Customer'}
                  </p>
                  <p className="text-[var(--admin-text-secondary)] leading-relaxed">
                    {deliveryAddr.address ||
                      deliveryAddr.addressLine1 ||
                      pickupAddr.address ||
                      'Address details not provided'}
                    {deliveryAddr.locality && `, ${deliveryAddr.locality}`}
                    <br />
                    {deliveryAddr.city || pickupAddr.city || 'City'},{' '}
                    {deliveryAddr.state || pickupAddr.state || 'State'} -{' '}
                    <strong className="text-[var(--admin-text-primary)]">
                      {deliveryAddr.pincode || deliveryAddr.pinCode || pickupAddr.pincode || ''}
                    </strong>
                  </p>
                </div>
              </div>

              {/* Replacement Dispatch Summary */}
              {exchangeDetails?.trackingNumber && (
                <div className="p-4 pt-0 text-xs">
                  <div className="p-2.5 rounded-xl bg-[var(--admin-accent-light)]/60 border border-[var(--admin-border-strong)] flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-[var(--admin-text-tertiary)] uppercase font-bold">
                        Courier: {exchangeDetails.courierPartner || 'Assigned'}
                      </span>
                      <p className="font-mono font-bold text-[var(--admin-text-primary)]">
                        {exchangeDetails.trackingNumber}
                      </p>
                    </div>
                    <span className="text-[var(--admin-success)] font-bold text-[11px] flex items-center gap-0.5">
                      <span className="material-symbols-outlined text-[14px]">check</span>{' '}
                      Dispatched
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 2. SIDE-BY-SIDE EXCHANGE COMPARISON CARD */}
          <div className="admin-card overflow-hidden border border-[var(--admin-border)] shadow-xs bg-white rounded-2xl">
            <div className="p-4 sm:p-5 border-b border-[var(--admin-border)] flex flex-wrap items-center justify-between gap-3 bg-[var(--admin-bg-subtle)]/50">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[var(--admin-accent)] text-[20px]">
                  compare_arrows
                </span>
                <h3 className="text-base font-bold text-[var(--admin-text-primary)]">
                  Exchange Item Comparison
                </h3>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-[var(--admin-accent)] bg-[var(--admin-accent-light)] border border-[var(--admin-border-strong)] uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--admin-accent)]" />
                Type: {exchangeType.replace(/_/g, ' ')}
              </span>
            </div>

            <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-6 items-center">
              {/* Left: Original Item Being Returned */}
              <div className="p-4 rounded-xl bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] flex flex-col justify-between h-full">
                <div>
                  <div className="flex items-center justify-between gap-2 pb-2 mb-3 border-b border-[var(--admin-border)]">
                    <span className="text-xs font-bold text-[var(--admin-error)] flex items-center gap-1">
                      <span className="material-symbols-outlined text-[15px]">outbox</span>
                      Returning Item
                    </span>
                    <span className="text-[10px] font-bold text-[var(--admin-text-secondary)] bg-[var(--admin-surface-muted)] px-2 py-0.5 rounded border border-[var(--admin-border)]">
                      Qty: {originalQty}
                    </span>
                  </div>

                  <div className="flex gap-3.5 items-start">
                    <img
                      src={originalItem.imageSrc || PLACEHOLDER_IMAGES.product}
                      alt={originalItem.title || 'Original Product'}
                      onError={handleImageError}
                      className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-xl border border-[var(--admin-border)] shadow-xs flex-shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() =>
                        originalItem.imageSrc && setPreviewImage(originalItem.imageSrc)
                      }
                    />
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-bold text-[var(--admin-text-primary)] leading-snug line-clamp-2">
                        {originalItem.title || 'Original Item'}
                      </h4>
                      {originalItem.variant && (
                        <div className="mt-1">
                          <span className="inline-block bg-white text-[var(--admin-text-secondary)] text-[10px] font-semibold px-2 py-0.5 rounded border border-[var(--admin-border)] shadow-2xs">
                            Variant: {originalItem.variant}
                          </span>
                        </div>
                      )}
                      <p className="mt-1.5 text-sm font-extrabold text-[var(--admin-text-primary)] font-mono">
                        ₹{formatINR(originalUnit)}{' '}
                        <span className="text-[11px] font-normal text-[var(--admin-text-tertiary)]">
                          / unit
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Customer Reason */}
                  <div className="mt-3 pt-2.5 border-t border-[var(--admin-border)] text-xs">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-[var(--admin-text-tertiary)]">
                      Reason:
                    </span>{' '}
                    <span className="font-semibold text-[var(--admin-text-primary)]">
                      {request.items?.[0]?.reason || originalItem.reason || 'Different variant'}
                    </span>
                    {request.items?.[0]?.description &&
                      request.items[0].description !==
                        (request.items?.[0]?.reason || originalItem.reason) && (
                        <p className="mt-1 text-[var(--admin-text-secondary)] text-[11px] italic">
                          "{request.items[0].description}"
                        </p>
                      )}
                  </div>

                  {/* Evidence Photos */}
                  {request.items?.[0]?.evidenceImages?.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-[var(--admin-border)]">
                      <div className="text-[10px] uppercase tracking-wider font-bold text-[var(--admin-text-tertiary)] mb-1.5">
                        Photos ({request.items[0].evidenceImages.length})
                      </div>
                      <div className="flex gap-2 overflow-x-auto admin-scrollbar pb-1">
                        {request.items[0].evidenceImages.map((img, i) => (
                          <img
                            key={i}
                            src={img}
                            alt="Evidence"
                            onClick={() => setPreviewImage(img)}
                            className="w-12 h-12 object-cover rounded-lg border border-[var(--admin-border)] shadow-2xs cursor-pointer hover:scale-105 transition-transform"
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-2.5 border-t border-[var(--admin-border)] flex items-center justify-between text-xs">
                  <span className="text-[var(--admin-text-secondary)] font-medium">Credit:</span>
                  <span className="font-bold text-[var(--admin-text-primary)] font-mono">
                    ₹{formatINR(originalTotal)}
                  </span>
                </div>
              </div>

              {/* Middle: Arrow Indicator */}
              <div className="flex flex-col items-center justify-center py-2 md:py-0">
                <div className="w-9 h-9 rounded-full bg-[var(--admin-accent-light)] border border-[var(--admin-border-strong)] flex items-center justify-center text-[var(--admin-accent)] shadow-xs">
                  <span className="material-symbols-outlined text-[20px] rotate-90 md:rotate-0">
                    arrow_forward
                  </span>
                </div>
              </div>

              {/* Right: Replacement Item Requested */}
              <div className="p-4 rounded-xl bg-[var(--admin-accent-light)]/35 border border-[var(--admin-border-strong)] flex flex-col justify-between h-full">
                <div>
                  <div className="flex items-center justify-between gap-2 pb-2 mb-3 border-b border-[var(--admin-border-strong)]">
                    <span className="text-xs font-bold text-[var(--admin-accent)] flex items-center gap-1">
                      <span className="material-symbols-outlined text-[15px]">move_to_inbox</span>
                      Replacement Item
                    </span>
                    <span className="text-[10px] font-bold text-[var(--admin-accent)] bg-[var(--admin-accent-light)] px-2 py-0.5 rounded border border-[var(--admin-border-strong)]">
                      Qty: {replacementQty}
                    </span>
                  </div>

                  <div className="flex gap-3.5 items-start">
                    <img
                      src={replacementItem.imageSrc || PLACEHOLDER_IMAGES.product}
                      alt={replacementItem.title || 'Replacement Product'}
                      onError={handleImageError}
                      className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-xl border border-[var(--admin-border-strong)] shadow-xs flex-shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() =>
                        replacementItem.imageSrc && setPreviewImage(replacementItem.imageSrc)
                      }
                    />
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-bold text-[var(--admin-text-primary)] leading-snug line-clamp-2">
                        {replacementItem.title || 'Replacement Item'}
                      </h4>
                      {replacementItem.variant && (
                        <div className="mt-1">
                          <span className="inline-block bg-white text-[var(--admin-accent)] text-[10px] font-semibold px-2 py-0.5 rounded border border-[var(--admin-border-strong)] shadow-2xs">
                            Variant: {replacementItem.variant}
                          </span>
                        </div>
                      )}
                      <p className="mt-1.5 text-sm font-extrabold text-[var(--admin-accent)] font-mono">
                        ₹{formatINR(replacementUnit)}{' '}
                        <span className="text-[11px] font-normal text-[var(--admin-text-tertiary)]">
                          / unit
                        </span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-2.5 border-t border-[var(--admin-border-strong)] flex items-center justify-between text-xs">
                  <span className="text-[var(--admin-text-secondary)] font-medium">New Price:</span>
                  <span className="font-bold text-[var(--admin-accent)] font-mono">
                    ₹{formatINR(replacementTotal)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. AUTHORITATIVE FINANCIAL SETTLEMENT CARD */}
          <div className="admin-card overflow-hidden border border-[var(--admin-border)] shadow-xs bg-white rounded-2xl">
            <div className="p-4 sm:p-5 border-b border-[var(--admin-border)] flex items-center justify-between bg-[var(--admin-bg-subtle)]/50">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[var(--admin-accent)] text-[20px]">
                  account_balance_wallet
                </span>
                <h3 className="text-base font-bold text-[var(--admin-text-primary)]">
                  Exchange Financial Settlement
                </h3>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[var(--admin-surface-muted)] text-[var(--admin-text-secondary)] border border-[var(--admin-border)] font-mono">
                Backend Action: {differenceAction.replace(/_/g, ' ')}
              </span>
            </div>

            <div className="p-4 sm:p-6 space-y-5">
              {/* Financial Math Comparison */}
              <div className="grid grid-cols-3 gap-1.5 sm:gap-3 text-center p-2.5 sm:p-3.5 rounded-xl bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)]">
                <div>
                  <span className="text-[9px] sm:text-[10px] uppercase tracking-wider font-bold text-[var(--admin-text-tertiary)]">
                    Original Credit
                  </span>
                  <p className="text-xs sm:text-base lg:text-lg font-bold text-[var(--admin-text-primary)] font-mono mt-0.5 truncate">
                    ₹{formatINR(originalTotal)}
                  </p>
                </div>
                <div className="border-x border-[var(--admin-border)] px-1">
                  <span className="text-[9px] sm:text-[10px] uppercase tracking-wider font-bold text-[var(--admin-text-tertiary)]">
                    Replacement Cost
                  </span>
                  <p className="text-xs sm:text-base lg:text-lg font-bold text-[var(--admin-accent)] font-mono mt-0.5 truncate">
                    ₹{formatINR(replacementTotal)}
                  </p>
                </div>
                <div>
                  <span className="text-[9px] sm:text-[10px] uppercase tracking-wider font-bold text-[var(--admin-text-tertiary)]">
                    Net Difference
                  </span>
                  <p
                    className={`text-xs sm:text-base lg:text-lg font-extrabold font-mono mt-0.5 truncate ${
                      differenceAction === 'collect_payment'
                        ? 'text-[var(--admin-warning)]'
                        : differenceAction === 'refund_difference'
                          ? 'text-[var(--admin-success)]'
                          : 'text-[var(--admin-text-primary)]'
                    }`}
                  >
                    {differenceAction === 'collect_payment'
                      ? '+'
                      : differenceAction === 'refund_difference'
                        ? '-'
                        : ''}
                    ₹{formatINR(priceDifference)}
                  </p>
                </div>
              </div>

              {/* Case A: Customer Needs to Pay Difference */}
              {differenceAction === 'collect_payment' && (
                <div className="p-4 rounded-xl bg-[var(--admin-warning-light)] border border-[var(--admin-warning-border)] space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-[var(--admin-warning-light)] border border-[var(--admin-warning-border)] text-[var(--admin-warning)] flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined text-[22px]">payments</span>
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-[var(--admin-text-primary)]">
                          Customer Payment Required: ₹{formatINR(priceDifference)}
                        </h4>
                        <p className="text-xs text-[var(--admin-text-secondary)] mt-0.5">
                          The replacement item is priced higher than the returning item.
                        </p>
                      </div>
                    </div>
                    <div>
                      {paymentStatus === 'payment_paid' ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold bg-[var(--admin-success-light)] text-[var(--admin-success)] border border-[var(--admin-success-border)]">
                          <span className="material-symbols-outlined text-[16px]">
                            check_circle
                          </span>
                          PAID via Razorpay
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold bg-[var(--admin-warning-light)] text-[var(--admin-warning)] border border-[var(--admin-warning-border)]">
                          <span className="material-symbols-outlined text-[16px]">
                            hourglass_empty
                          </span>
                          Awaiting Customer Payment
                        </span>
                      )}
                    </div>
                  </div>

                  {exchangeDetails?.additionalPaymentId && (
                    <div className="mt-3 pt-2.5 border-t border-[var(--admin-warning-border)] flex items-center justify-between text-xs text-[var(--admin-text-secondary)]">
                      <span>Razorpay Order ID:</span>
                      <span className="font-mono font-bold text-[var(--admin-text-primary)] select-all">
                        {exchangeDetails.additionalPaymentId}
                      </span>
                    </div>
                  )}

                  {paymentStatus !== 'payment_paid' && (
                    <div className="pt-2 border-t border-[var(--admin-warning-border)] flex items-center justify-between">
                      <span className="text-[11px] text-[var(--admin-text-secondary)]">
                        Customer will be prompted to complete payment before dispatch.
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          onTransitionStatus(
                            request.status,
                            'Admin manually marked difference payment received',
                            {
                              paymentStatus: 'payment_paid',
                              paidAt: new Date(),
                            },
                          );
                          toast.success('Payment marked as received.');
                        }}
                        className="admin-btn admin-btn-primary text-xs !py-1.5 !px-3"
                      >
                        Mark Payment Received
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Case B: Store Needs to Refund Difference to Customer */}
              {differenceAction === 'refund_difference' && (
                <div className="p-4 rounded-xl bg-[var(--admin-success-light)] border border-[var(--admin-success-border)] space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[var(--admin-success)] text-[22px]">
                        savings
                      </span>
                      <div>
                        <span className="font-bold text-sm text-[var(--admin-text-primary)]">
                          Customer Due Balance Refund
                        </span>
                        <p className="text-[11px] text-[var(--admin-text-secondary)]">
                          Replacement item costs less than the returned product credit value.
                        </p>
                      </div>
                    </div>
                    <span className="text-base font-mono font-black text-[var(--admin-success)] bg-white px-3 py-1 rounded-xl border border-[var(--admin-success-border)] shadow-2xs">
                      ₹{formatINR(priceDifference)} Refund
                    </span>
                  </div>

                  {/* Payment Details Container */}
                  <div className="p-3.5 bg-white rounded-xl border border-[var(--admin-success-border)] flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase tracking-wider font-bold text-[var(--admin-text-tertiary)]">
                          Refund Method:
                        </span>
                        <span className="font-bold text-[var(--admin-text-primary)] uppercase">
                          {refundMethod === 'wallet'
                            ? 'Store Wallet'
                            : isCOD
                              ? 'UPI Refund (COD Order)'
                              : 'Original Payment Method / UPI'}
                        </span>
                        {isCOD && (
                          <span className="px-2 py-0.5 bg-[var(--admin-warning-light)] text-[var(--admin-warning)] border border-[var(--admin-warning-border)] text-[10px] font-bold rounded">
                            COD Order
                          </span>
                        )}
                      </div>
                      {upiId && (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] uppercase tracking-wider font-bold text-[var(--admin-text-tertiary)]">
                            Customer UPI ID:
                          </span>
                          <span className="font-mono font-black text-sm text-[var(--admin-text-primary)] select-all">
                            {upiId}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {upiId && (
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(upiId);
                            toast.success('UPI ID copied to clipboard!');
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface-hover)] text-[var(--admin-text-primary)] text-xs font-bold rounded-lg border border-[var(--admin-border)] transition-colors cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            content_copy
                          </span>
                          Copy UPI ID
                        </button>
                      )}

                      {/* Mark Payment Done / Record Payout Button */}
                      {!isRefundSettled ? (
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
                            });
                            setIsSettleModalOpen(true);
                          }}
                          className="admin-btn admin-btn-primary flex items-center gap-1.5 text-xs font-bold rounded-lg shadow-xs transition-all cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[16px]">verified</span>
                          Mark Payment Done
                        </button>
                      ) : (
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
                          className="flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-[var(--admin-surface-hover)] text-[var(--admin-text-primary)] text-xs font-bold rounded-lg border border-[var(--admin-border)] transition-colors cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[15px]">edit_note</span>
                          Update Payout Record
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Settled Details Summary Strip if already paid */}
                  {isRefundSettled && (
                    <div className="p-3 bg-white rounded-xl border border-[var(--admin-success-border)] flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="material-symbols-outlined text-[var(--admin-success)] text-[18px]">
                          check_circle
                        </span>
                        <span className="text-[var(--admin-text-primary)] font-bold">
                          Payout Registered:{' '}
                          <span className="font-mono font-black text-sm text-[var(--admin-success)]">
                            ₹{formatINR(settledAmount)}
                          </span>
                        </span>
                        {settledUtr && (
                          <span className="font-mono text-[11px] bg-[var(--admin-bg-subtle)] px-2 py-0.5 rounded border border-[var(--admin-border)] text-[var(--admin-text-primary)] font-bold">
                            UTR / Ref: {settledUtr}
                          </span>
                        )}
                      </div>
                      {settledDate && (
                        <span className="text-[11px] text-[var(--admin-text-secondary)] font-medium">
                          Recorded on {format(new Date(settledDate), 'dd MMM yyyy, hh:mm a')}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Case C: Direct Even Exchange */}
              {differenceAction === 'direct_exchange' && (
                <div className="p-4 rounded-xl bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[var(--admin-accent)]">
                      balance
                    </span>
                    <span className="font-bold text-[var(--admin-text-primary)]">
                      Direct Even Exchange
                    </span>
                  </div>
                  <span className="text-[var(--admin-text-secondary)]">
                    No additional payment or refund required.
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar: Customer Trust & Quick Actions */}
        <div className="flex flex-col gap-6 min-w-0">
          {/* 1. CUSTOMER PROFILE CARD */}
          <div className="admin-card overflow-hidden border border-[var(--admin-border)] shadow-xs bg-white rounded-2xl">
            <div className="p-4 sm:p-5 border-b border-[var(--admin-border)] flex items-center justify-between bg-[var(--admin-bg-subtle)]/50">
              <h3 className="text-sm font-bold text-[var(--admin-text-primary)] flex items-center gap-2">
                <span className="material-symbols-outlined text-[var(--admin-accent)] text-[18px]">
                  person
                </span>
                Customer Profile
              </h3>
            </div>
            <div className="p-4 sm:p-5 space-y-3.5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[var(--admin-accent)] text-white font-bold text-base flex items-center justify-center shadow-xs flex-shrink-0">
                  {request.userId?.name?.charAt(0) || 'U'}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-bold text-[var(--admin-text-primary)] truncate">
                    {request.userId?.name || 'Customer Name'}
                  </h4>
                  <p className="text-xs text-[var(--admin-text-secondary)] truncate">
                    {request.userId?.email || 'No email'}
                  </p>
                  <p className="text-xs text-[var(--admin-text-secondary)] font-mono mt-0.5">
                    {request.userId?.phone || 'No phone'}
                  </p>
                </div>
              </div>

              {/* Order & Return Stats */}
              <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] text-center text-xs">
                <div>
                  <span className="text-[10px] text-[var(--admin-text-tertiary)] uppercase font-semibold">
                    Orders
                  </span>
                  <p className="text-base font-black text-[var(--admin-text-primary)] mt-0.5">
                    {userStats?.totalOrders || 1}
                  </p>
                </div>
                <div className="border-x border-[var(--admin-border)]">
                  <span className="text-[10px] text-[var(--admin-text-tertiary)] uppercase font-semibold">
                    Returns
                  </span>
                  <p className="text-base font-black text-[var(--admin-warning)] mt-0.5">
                    {userStats?.totalReturns || 0}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--admin-text-tertiary)] uppercase font-semibold">
                    Rate
                  </span>
                  <p className="text-base font-black text-[var(--admin-text-primary)] mt-0.5">
                    {userStats?.returnPercentage || 0}%
                  </p>
                </div>
              </div>

              {/* Fraud & Trust Score */}
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-[var(--admin-text-secondary)] flex items-center gap-1.5 font-medium">
                  <span className="material-symbols-outlined text-[16px] text-[var(--admin-accent)]">
                    security
                  </span>
                  Risk Assessment:
                </span>
                <span
                  className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                    (userStats?.fraudScore || 0) > 50
                      ? 'bg-[var(--admin-error-light)] text-[var(--admin-error)] border border-[var(--admin-error-border)]'
                      : 'bg-[var(--admin-success-light)] text-[var(--admin-success)] border border-[var(--admin-success-border)]'
                  }`}
                >
                  Safe (Score {userStats?.fraudScore || 0}/100)
                </span>
              </div>
            </div>
          </div>

          {/* 2. ORDER CONTEXT CARD */}
          <div className="admin-card overflow-hidden border border-[var(--admin-border)] shadow-xs bg-white rounded-2xl">
            <div className="p-4 sm:p-5 border-b border-[var(--admin-border)] flex items-center justify-between bg-[var(--admin-bg-subtle)]/50">
              <h3 className="text-sm font-bold text-[var(--admin-text-primary)] flex items-center gap-2">
                <span className="material-symbols-outlined text-[var(--admin-accent)] text-[18px]">
                  receipt_long
                </span>
                Original Order Context
              </h3>
            </div>
            <div className="p-4 sm:p-5 text-xs space-y-3 font-medium">
              <div className="flex justify-between items-center py-1 border-b border-[var(--admin-border-subtle)]">
                <span className="text-[var(--admin-text-secondary)]">Order ID:</span>
                <a
                  href={`/admin/orders/${request.orderId?._id || request.orderId}`}
                  className="font-mono font-bold text-[var(--admin-accent)] hover:text-[var(--admin-accent-hover)] hover:underline"
                >
                  #{request.orderId?.orderCode || request.orderId?._id?.slice(-8) || 'Order'}
                </a>
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

      {/* ─── Reject Modal ─── */}
      {isRejectOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-[var(--admin-border)]">
            <h3 className="text-base font-bold text-[var(--admin-error)] flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined">warning</span>
              Reject Exchange Request
            </h3>
            <p className="text-xs text-[var(--admin-text-secondary)] mb-4">
              Please enter the reason for rejecting this exchange request. This message will be sent
              to the customer.
            </p>
            <textarea
              className="admin-input w-full min-h-[100px] text-xs mb-4"
              placeholder="e.g., Item has exceeded the eligible exchange window..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                className="admin-btn admin-btn-outline text-xs"
                onClick={() => setIsRejectOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-primary !bg-[var(--admin-error)] hover:!bg-[var(--admin-error)]/90 text-xs"
                onClick={handleRejectSubmit}
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Record Refund Payment / Payout Modal ─── */}
      {isSettleModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-[var(--admin-border)]">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-[var(--admin-border)]">
              <h3 className="text-base font-bold text-[var(--admin-text-primary)] flex items-center gap-2">
                <span className="material-symbols-outlined text-[var(--admin-accent)] text-[22px]">
                  payments
                </span>
                Record Refund Payment
              </h3>
              <button
                type="button"
                onClick={() => setIsSettleModalOpen(false)}
                className="w-7 h-7 rounded-lg text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)] hover:bg-[var(--admin-surface-hover)] flex items-center justify-center transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <p className="text-xs text-[var(--admin-text-secondary)] mb-4">
              Enter the transaction details of the refund paid to the customer. This event and
              payout amount will be registered permanently in the database audit log.
            </p>

            {/* Quick Customer Recap */}
            <div className="p-3 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-xl mb-4 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[var(--admin-text-secondary)] font-medium">Customer:</span>
                <span className="font-bold text-[var(--admin-text-primary)]">
                  {request.userId?.name || pickupAddr.name || 'Customer'}
                </span>
              </div>
              {upiId && (
                <div className="flex items-center justify-between">
                  <span className="text-[var(--admin-text-secondary)] font-medium">
                    Customer UPI:
                  </span>
                  <div className="flex items-center gap-1.5 font-mono font-bold text-[var(--admin-text-primary)]">
                    <span>{upiId}</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(upiId);
                        toast.success('UPI ID copied!');
                      }}
                      className="text-[var(--admin-accent)] hover:text-[var(--admin-accent-hover)] cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[14px]">content_copy</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={handleSettleSubmit} className="space-y-3.5">
              <div>
                <label className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider block mb-1">
                  Amount Paid (₹) <span className="text-[var(--admin-error)]">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--admin-text-tertiary)] font-bold text-sm">
                    ₹
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    placeholder="e.g. 500"
                    className="admin-input w-full pl-7 text-sm font-mono font-black text-[var(--admin-text-primary)]"
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
                  onChange={(e) => setSettleData({ ...settleData, paymentMethod: e.target.value })}
                >
                  <option value="upi">Direct UPI (GPay / PhonePe / Paytm / BHIM)</option>
                  <option value="bank_transfer">Direct Bank Transfer (IMPS / NEFT)</option>
                  <option value="wallet">Customer Store Wallet Credit</option>
                  <option value="cash">Cash Settlement</option>
                </select>
              </div>

              {settleData.paymentMethod === 'upi' && (
                <div>
                  <label className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider block mb-1">
                    Customer Destination UPI ID <span className="text-[var(--admin-error)]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 9154691315@ybl"
                    className="admin-input w-full text-xs font-mono font-bold"
                    value={settleData.upiId}
                    onChange={(e) => setSettleData({ ...settleData, upiId: e.target.value })}
                  />
                </div>
              )}

              <div>
                <label className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider block mb-1">
                  Transaction Reference / UTR Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. 423589123456 or BANK-REF-9021"
                  className="admin-input w-full text-xs font-mono"
                  value={settleData.transactionId}
                  onChange={(e) => setSettleData({ ...settleData, transactionId: e.target.value })}
                />
                <p className="text-[10px] text-[var(--admin-text-tertiary)] mt-0.5">
                  Reference number from your UPI or banking app for proof of payout.
                </p>
              </div>

              <div>
                <label className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider block mb-1">
                  Admin Internal Note (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Paid ₹500 from Business Account..."
                  className="admin-input w-full text-xs"
                  value={settleData.notes}
                  onChange={(e) => setSettleData({ ...settleData, notes: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-[var(--admin-border)]">
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
                  disabled={isSubmittingSettle}
                  className="admin-btn admin-btn-primary !bg-[var(--admin-accent)] hover:!bg-[var(--admin-accent-hover)] text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  {isSubmittingSettle ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Registering...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px]">check_circle</span>
                      Confirm & Register Payment
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Evidence Image Lightbox Modal ─── */}
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
                className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl border border-white/20"
              />
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-black/80 text-white flex items-center justify-center hover:bg-black transition-colors shadow-lg border border-white/20"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
