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

  // Clean matching stages for Exchange lifecycle (Aligned with Storefront Journey Tracker - 6 Steps)
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
      key: 'item_picked_up',
      number: 3,
      title: 'Item Picked Up',
      desc: 'Reverse pickup collected from customer',
      icon: 'local_shipping',
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
      border: 'border-indigo-200',
      dot: 'bg-indigo-600',
    },
    {
      key: 'quality_check_passed',
      number: 4,
      title: 'Quality Check Passed',
      desc: 'Returned item verified at warehouse',
      icon: 'fact_check',
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      dot: 'bg-purple-600',
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
      ['inspection_completed', 'refund_initiated', 'refund_completed'].includes(request.status) ||
      ['reserved'].includes(replacementStatus)
    ) {
      return 'quality_check_passed';
    }
    if (['return_received', 'inspection_started'].includes(request.status)) {
      return 'quality_check_passed';
    }
    if (['return_picked_up', 'return_in_transit'].includes(request.status)) {
      return 'item_picked_up';
    }
    if (['approved', 'return_courier_assigned'].includes(request.status)) {
      return 'approved';
    }
    if (request.status === 'rejected') {
      return 'rejected';
    }
    return 'submitted';
  };

  const getReplacementStatusInfo = (repStatus, retStatus, hasReservation = false) => {
    if (['completed', 'refund_completed'].includes(retStatus) || repStatus === 'delivered') {
      return {
        label: 'Delivered',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        icon: 'verified',
      };
    }
    if (repStatus === 'shipped') {
      return {
        label: 'Dispatched',
        badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
        icon: 'local_shipping',
      };
    }
    if (['rejected', 'cancelled'].includes(retStatus) || repStatus === 'cancelled') {
      return {
        label: 'Cancelled',
        badgeClass: 'bg-red-50 text-red-700 border-red-200',
        icon: 'cancel',
      };
    }
    if (
      repStatus === 'reserved' ||
      hasReservation ||
      [
        'approved',
        'return_courier_assigned',
        'return_picked_up',
        'return_in_transit',
        'return_received',
        'inspection_started',
        'inspection_completed',
      ].includes(retStatus)
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
                {currentStageObj.title}
              </span>
              <p className="text-xs text-[var(--admin-text-secondary)] mt-0.5 truncate">
                {currentStageObj.desc}
              </p>
            </div>
          </div>

          {/* Quick Stage Controls */}
          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
            {/* Contextual Action Button based on current step */}
            {activeStepKey === 'submitted' && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onApprove}
                  className="px-4 py-2.5 rounded-xl bg-[var(--admin-accent)] hover:bg-[var(--admin-accent-hover)] text-white text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm cursor-pointer border-0"
                >
                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                  Approve Exchange
                </button>
                <button
                  type="button"
                  onClick={() => setIsRejectOpen(true)}
                  className="px-3.5 py-2.5 rounded-xl border border-red-200 text-red-700 hover:bg-red-50 text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer bg-white"
                >
                  <span className="material-symbols-outlined text-[16px]">cancel</span>
                  Reject
                </button>
              </div>
            )}

            {activeStepKey === 'approved' && (
              <button
                type="button"
                onClick={() => onTransitionStatus('return_picked_up')}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm cursor-pointer border-0"
              >
                <span className="material-symbols-outlined text-[16px]">local_shipping</span>
                Confirm Item Picked Up
              </button>
            )}

            {activeStepKey === 'item_picked_up' && (
              <button
                type="button"
                onClick={() => onTransitionStatus('inspection_completed')}
                className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm cursor-pointer border-0"
              >
                <span className="material-symbols-outlined text-[16px]">fact_check</span>
                Pass Quality Check
              </button>
            )}

            {activeStepKey === 'quality_check_passed' && (
              <div className="flex items-center gap-2">
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
                        });
                        setIsSettleModalOpen(true);
                      }}
                      className="px-3.5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm cursor-pointer border-0"
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
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm cursor-pointer border-0"
                >
                  <span className="material-symbols-outlined text-[16px]">inventory_2</span>
                  Dispatch Replacement
                </button>
              </div>
            )}

            {activeStepKey === 'replacement_dispatched' && (
              <div className="flex items-center gap-2">
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
                        });
                        setIsSettleModalOpen(true);
                      }}
                      className="px-3.5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm cursor-pointer border-0"
                    >
                      <span className="material-symbols-outlined text-[16px]">payments</span>
                      Refund Difference (₹{formatINR(priceDifference)})
                    </button>
                  )}
                <button
                  type="button"
                  onClick={() => {
                    if (exchangeDetails?._id) {
                      onTransitionReplacement(exchangeDetails._id, request._id, 'delivered');
                    } else {
                      onTransitionStatus('completed');
                    }
                  }}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm cursor-pointer border-0"
                >
                  <span className="material-symbols-outlined text-[16px]">verified</span>
                  Mark Delivered & Complete
                </button>
              </div>
            )}

            {activeStepKey === 'completed' && (
              <span className="px-3.5 py-2 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">verified</span>
                Exchange Completed
              </span>
            )}

            {request.status === 'rejected' && (
              <span className="px-3.5 py-2 rounded-xl bg-red-100 text-red-800 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">cancel</span>
                Exchange Rejected
              </span>
            )}
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
                  {(() => {
                    const info = getReplacementStatusInfo(
                      replacementStatus,
                      request.status,
                      Boolean(exchangeDetails?.replacementItem?.reservationId),
                    );
                    return (
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border whitespace-nowrap ${info.badgeClass}`}
                      >
                        <span className="material-symbols-outlined text-[12px]">{info.icon}</span>
                        {info.label}
                      </span>
                    );
                  })()}
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
            <div className="p-4 sm:p-5 border-b border-[var(--admin-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-[var(--admin-bg-subtle)]/50">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[var(--admin-accent)] text-[20px] shrink-0">
                  account_balance_wallet
                </span>
                <h3 className="text-sm sm:text-base font-bold text-[var(--admin-text-primary)]">
                  Exchange Financial Settlement
                </h3>
              </div>
              <span className="self-start sm:self-auto text-[11px] sm:text-xs font-bold px-2.5 py-1 rounded-full bg-[var(--admin-surface-muted)] text-[var(--admin-text-secondary)] border border-[var(--admin-border)] font-mono whitespace-nowrap">
                Backend Action: {differenceAction.replace(/_/g, ' ')}
              </span>
            </div>

            <div className="p-3.5 sm:p-6 space-y-4 sm:space-y-5">
              {/* Financial Math Comparison */}
              <div className="grid grid-cols-3 gap-1 sm:gap-3 text-center p-2 sm:p-3.5 rounded-xl bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)]">
                <div className="min-w-0">
                  <span className="text-[9px] sm:text-[10px] uppercase tracking-wider font-bold text-[var(--admin-text-tertiary)] block leading-tight">
                    Original Credit
                  </span>
                  <p className="text-xs sm:text-base lg:text-lg font-bold text-[var(--admin-text-primary)] font-mono mt-0.5 truncate">
                    ₹{formatINR(originalTotal)}
                  </p>
                </div>
                <div className="border-x border-[var(--admin-border)] px-1 min-w-0">
                  <span className="text-[9px] sm:text-[10px] uppercase tracking-wider font-bold text-[var(--admin-text-tertiary)] block leading-tight">
                    Replacement Cost
                  </span>
                  <p className="text-xs sm:text-base lg:text-lg font-bold text-[var(--admin-accent)] font-mono mt-0.5 truncate">
                    ₹{formatINR(replacementTotal)}
                  </p>
                </div>
                <div className="min-w-0">
                  <span className="text-[9px] sm:text-[10px] uppercase tracking-wider font-bold text-[var(--admin-text-tertiary)] block leading-tight">
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
                <div className="p-3.5 sm:p-4 rounded-xl bg-[var(--admin-warning-light)] border border-[var(--admin-warning-border)] space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-[var(--admin-warning-light)] border border-[var(--admin-warning-border)] text-[var(--admin-warning)] flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[22px]">payments</span>
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-[var(--admin-text-primary)]">
                          Customer Payment Required: ₹{formatINR(priceDifference)}
                        </h4>
                        <p className="text-xs text-[var(--admin-text-secondary)] mt-0.5">
                          The replacement item is priced higher than the returning item.
                        </p>
                      </div>
                    </div>
                    <div className="self-start sm:self-auto shrink-0">
                      {paymentStatus === 'payment_paid' ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold bg-[var(--admin-success-light)] text-[var(--admin-success)] border border-[var(--admin-success-border)] whitespace-nowrap">
                          <span className="material-symbols-outlined text-[16px]">
                            check_circle
                          </span>
                          PAID via Razorpay
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold bg-[var(--admin-warning-light)] text-[var(--admin-warning)] border border-[var(--admin-warning-border)] whitespace-nowrap">
                          <span className="material-symbols-outlined text-[16px]">
                            hourglass_empty
                          </span>
                          Awaiting Customer Payment
                        </span>
                      )}
                    </div>
                  </div>

                  {exchangeDetails?.additionalPaymentId && (
                    <div className="mt-3 pt-2.5 border-t border-[var(--admin-warning-border)] flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--admin-text-secondary)]">
                      <span>Razorpay Order ID:</span>
                      <span className="font-mono font-bold text-[var(--admin-text-primary)] select-all break-all">
                        {exchangeDetails.additionalPaymentId}
                      </span>
                    </div>
                  )}

                  {paymentStatus !== 'payment_paid' && (
                    <div className="pt-2 border-t border-[var(--admin-warning-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
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
                        className="admin-btn admin-btn-primary text-xs !py-2 sm:!py-1.5 !px-3.5 w-full sm:w-auto text-center justify-center font-bold"
                      >
                        Mark Payment Received
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Case B: Store Needs to Refund Difference to Customer */}
              {differenceAction === 'refund_difference' && (
                <div className="p-3.5 sm:p-4 rounded-xl bg-[var(--admin-success-light)] border border-[var(--admin-success-border)] space-y-3.5 sm:space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-start sm:items-center gap-2.5 min-w-0">
                      <span className="material-symbols-outlined text-[var(--admin-success)] text-[22px] shrink-0 mt-0.5 sm:mt-0">
                        savings
                      </span>
                      <div className="min-w-0">
                        <span className="font-bold text-sm text-[var(--admin-text-primary)] block">
                          Customer Due Balance Refund
                        </span>
                        <p className="text-[11px] text-[var(--admin-text-secondary)] leading-normal mt-0.5">
                          Replacement item costs less than the returned product credit value.
                        </p>
                      </div>
                    </div>
                    <span className="self-start sm:self-auto text-sm sm:text-base font-mono font-black text-[var(--admin-success)] bg-white px-3 py-1 rounded-xl border border-[var(--admin-success-border)] shadow-2xs whitespace-nowrap">
                      ₹{formatINR(priceDifference)} Refund
                    </span>
                  </div>

                  {/* Payment Details Container */}
                  <div className="p-3.5 sm:p-4 bg-white rounded-xl border border-[var(--admin-success-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 text-xs">
                    <div className="space-y-2 flex-1 min-w-0">
                      {/* Refund Method Row */}
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="text-[10px] uppercase tracking-wider font-bold text-[var(--admin-text-tertiary)] shrink-0">
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
                          <span className="px-2 py-0.5 bg-[var(--admin-warning-light)] text-[var(--admin-warning)] border border-[var(--admin-warning-border)] text-[10px] font-bold rounded whitespace-nowrap">
                            COD Order
                          </span>
                        )}
                      </div>

                      {/* Customer UPI ID Row */}
                      {upiId && (
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="text-[10px] uppercase tracking-wider font-bold text-[var(--admin-text-tertiary)] shrink-0">
                            Customer UPI ID:
                          </span>
                          <span className="font-mono font-black text-sm text-[var(--admin-text-primary)] select-all break-all">
                            {upiId}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons Row */}
                    <div className="flex items-stretch sm:items-center gap-2 pt-2.5 sm:pt-0 border-t sm:border-t-0 border-stone-100 shrink-0 w-full sm:w-auto">
                      {upiId && (
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(upiId);
                            toast.success('UPI ID copied to clipboard!');
                          }}
                          className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface-hover)] text-[var(--admin-text-primary)] text-xs font-bold rounded-lg border border-[var(--admin-border)] transition-colors cursor-pointer whitespace-nowrap"
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            content_copy
                          </span>
                          <span>Copy UPI ID</span>
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
                          className="flex-1 sm:flex-initial admin-btn admin-btn-primary flex items-center justify-center gap-1.5 text-xs font-bold !py-2 sm:!py-1.5 !px-3.5 rounded-lg shadow-xs transition-all cursor-pointer whitespace-nowrap"
                        >
                          <span className="material-symbols-outlined text-[16px]">verified</span>
                          <span>Mark Payment Done</span>
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
                          className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 bg-white hover:bg-[var(--admin-surface-hover)] text-[var(--admin-text-primary)] text-xs font-bold rounded-lg border border-[var(--admin-border)] transition-colors cursor-pointer whitespace-nowrap"
                        >
                          <span className="material-symbols-outlined text-[15px]">edit_note</span>
                          <span>Update Payout Record</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Settled Details Summary Strip if already paid */}
                  {isRefundSettled && (
                    <div className="p-3 sm:p-3.5 bg-white rounded-xl border border-[var(--admin-success-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="material-symbols-outlined text-[var(--admin-success)] text-[18px] shrink-0">
                          check_circle
                        </span>
                        <span className="text-[var(--admin-text-primary)] font-bold">
                          Payout Registered:{' '}
                          <span className="font-mono font-black text-sm text-[var(--admin-success)]">
                            ₹{formatINR(settledAmount)}
                          </span>
                        </span>
                        {settledUtr && (
                          <span className="font-mono text-[11px] bg-[var(--admin-bg-subtle)] px-2 py-0.5 rounded border border-[var(--admin-border)] text-[var(--admin-text-primary)] font-bold break-all">
                            UTR: {settledUtr}
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-[100] p-3 sm:p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-4 sm:p-6 max-h-[90vh] overflow-y-auto shadow-2xl border border-[var(--admin-border)]">
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

              {/* Auto Complete Checkbox */}
              <div className="p-2.5 rounded-xl bg-blue-50/60 border border-blue-200/60 flex items-start gap-2 text-xs">
                <input
                  type="checkbox"
                  id="detail-auto-complete-exchange-check"
                  className="admin-checkbox mt-0.5"
                  checked={Boolean(settleData.autoCompleteAfterSettle)}
                  onChange={(e) =>
                    setSettleData({ ...settleData, autoCompleteAfterSettle: e.target.checked })
                  }
                />
                <label
                  htmlFor="detail-auto-complete-exchange-check"
                  className="cursor-pointer select-none text-[11px] text-blue-900 leading-tight"
                >
                  <strong className="font-bold block">
                    Mark exchange as Completed immediately after recording payout
                  </strong>
                  Finalizes the replacement delivery and completes this exchange.
                </label>
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
                  className="admin-btn admin-btn-primary !bg-amber-600 hover:!bg-amber-700 text-white text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  {isSubmittingSettle ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Recording Settlement...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px]">check_circle</span>
                      {settleData.autoCompleteAfterSettle
                        ? 'Confirm Payout & Complete Exchange'
                        : 'Confirm & Register Payment'}
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
