import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useConfirm } from '../../../context/ConfirmProvider';
import { format } from 'date-fns';
import { m as motion } from 'framer-motion';
import { useReturnManagement } from '../../hooks/useReturnManagement';
import { handleImageError } from '../../../utils/media/imageUtils';
import { PLACEHOLDER_IMAGES } from '../../../constants/placeholderImages';
// Removed lucide-react direct imports in favor of material-symbols-outlined
import {
  PageHeader,
  StatusBadge,
  EmptyState,
  SkeletonDashboard,
  stagger,
} from '../../components/AdminUIKit';
import AdminExchangeDetailView from './AdminExchangeDetailView';

const formatINR = (val) => {
  if (val === null || val === undefined || isNaN(val)) return '0';
  return Number(val).toLocaleString('en-IN');
};

const RETURN_STAGES = [
  {
    key: 'submitted',
    number: 1,
    title: 'Request Submitted',
    desc: 'Customer submitted return request awaiting admin review',
    icon: 'inbox',
    color: 'text-[var(--admin-accent)]',
    bg: 'bg-[var(--admin-accent-light)]',
    border: 'border-[var(--admin-border-strong)]',
  },
  {
    key: 'approved',
    number: 2,
    title: 'Return Approved',
    desc: 'Return request approved; reverse pickup ready to schedule',
    icon: 'verified',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
  },
  {
    key: 'return_courier_assigned',
    number: 3,
    title: 'Courier Assigned',
    desc: 'Reverse pickup courier partner assigned to fetch item',
    icon: 'local_shipping',
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
  },
  {
    key: 'return_picked_up',
    number: 3,
    title: 'Item Picked Up',
    desc: 'Courier successfully picked up the returned item from customer',
    icon: 'inventory',
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
  },
  {
    key: 'return_in_transit',
    number: 3,
    title: 'In Transit',
    desc: 'Item in transit to warehouse for inspection',
    icon: 'commute',
    color: 'text-indigo-700',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
  },
  {
    key: 'return_received',
    number: 4,
    title: 'Warehouse Received',
    desc: 'Item received at warehouse; ready for quality inspection',
    icon: 'warehouse',
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
  },
  {
    key: 'inspection_started',
    number: 4,
    title: 'Inspection in Progress',
    desc: 'Quality check and condition inspection actively being conducted',
    icon: 'fact_check',
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
  },
  {
    key: 'inspection_completed',
    number: 4,
    title: 'Quality Check Passed',
    desc: 'Inspection completed and verified at warehouse',
    icon: 'task_alt',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
  },
  {
    key: 'refund_initiated',
    number: 5,
    title: 'Refund Initiated',
    desc: 'Refund payment initiated or queued for settlement',
    icon: 'payments',
    color: 'text-purple-700',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
  },
  {
    key: 'refund_completed',
    number: 5,
    title: 'Refund Settled',
    desc: 'Refund successfully settled and credited to customer',
    icon: 'savings',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
  },
  {
    key: 'completed',
    number: 6,
    title: 'Return Completed',
    desc: 'All return logistics and financial refunds successfully completed',
    icon: 'check_circle',
    color: 'text-emerald-800',
    bg: 'bg-emerald-100',
    border: 'border-emerald-300',
  },
  {
    key: 'rejected',
    number: 0,
    title: 'Return Rejected',
    desc: 'This return request has been rejected',
    icon: 'cancel',
    color: 'text-red-700',
    bg: 'bg-red-50',
    border: 'border-red-200',
  },
];

const STAGE_DROPDOWN_OPTIONS = [
  { key: 'submitted', label: 'Step 1: Request Submitted' },
  { key: 'approved', label: 'Step 2: Return Approved' },
  { key: 'return_courier_assigned', label: 'Step 3: Assign Courier' },
  { key: 'return_picked_up', label: 'Step 3: Item Picked Up' },
  { key: 'return_in_transit', label: 'Step 3: In Transit' },
  { key: 'return_received', label: 'Step 4: Warehouse Received' },
  { key: 'inspection_started', label: 'Step 4: Inspection Started' },
  { key: 'inspection_completed', label: 'Step 4: Inspection Completed' },
  { key: 'refund_initiated', label: 'Step 5: Refund Initiated' },
  { key: 'refund_completed', label: 'Step 5: Refund Settled' },
  { key: 'completed', label: 'Step 6: Return Completed' },
];

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
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [settleData, setSettleData] = useState({
    amount: 0,
    paymentMethod: 'upi',
    upiId: '',
    transactionId: '',
    notes: '',
  });
  const [isSubmittingSettle, setIsSubmittingSettle] = useState(false);
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

  // Synchronize route with request type (exchange vs return) so sidebar & topbar routes remain accurate
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
        message: `Are you sure you want to transition to ${nextStatus}?`,
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
    return <SkeletonDashboard />;
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

  const currentStageObj = RETURN_STAGES.find((s) => s.key === request.status) || {
    key: request.status || 'submitted',
    number: 1,
    title: (request.status || 'Submitted').replace(/_/g, ' '),
    desc: 'Return request in progress',
    icon: 'sync',
    color: 'text-[var(--admin-accent)]',
    bg: 'bg-[var(--admin-accent-light)]',
    border: 'border-[var(--admin-border-strong)]',
  };

  const handleSelectReturnStage = async (newStage) => {
    if (newStage === 'rejected') {
      setIsRejectOpen(true);
      return;
    }
    if (newStage === 'approved') {
      await handleApprove();
      return;
    }
    await handleTransition(newStage);
  };

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
      t.status === 'refund_settled',
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
  const pickupAddr = request.pickup?.address || request.orderId?.shippingAddress || {};
  const rawPhone = String(request.userId?.phone || pickupAddr.phone || '').replace(/\D/g, '');
  const waPhone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;

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
              Return Request
            </span>
            <span className="font-mono text-[var(--admin-accent)] bg-[var(--admin-accent-light)] border border-[var(--admin-border-strong)] px-2 py-0.5 rounded-lg text-xs sm:text-sm font-bold">
              {request.returnId}
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
        backButton={{ path: '/admin/returns', label: 'Back' }}
        headerAction={<StatusBadge status={request.status} />}
      />

      {/* ─── Unified Return Lifecycle Stage Selector ─── */}
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
                {currentStageObj.number > 0 ? `Step ${currentStageObj.number} of 6: ` : ''}
                {currentStageObj.title}
              </span>
              <p className="text-xs text-[var(--admin-text-secondary)] mt-0.5 truncate">
                {currentStageObj.desc}
              </p>
            </div>
          </div>

          {/* Quick Stage Dropdown */}
          <div className="relative shrink-0 w-full sm:w-auto min-w-0 sm:min-w-[240px]">
            <select
              id="return-status-dropdown"
              value={request.status}
              onChange={(e) => handleSelectReturnStage(e.target.value)}
              className="w-full appearance-none bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] hover:border-[var(--admin-accent)] focus:border-[var(--admin-accent)] focus:ring-2 focus:ring-[var(--admin-accent)]/15 rounded-xl px-3.5 py-2.5 pr-9 text-xs font-bold text-[var(--admin-text-primary)] shadow-2xs cursor-pointer transition-all outline-none"
            >
              {STAGE_DROPDOWN_OPTIONS.map((st) => (
                <option key={st.key} value={st.key}>
                  {st.label}
                </option>
              ))}
              <option value="rejected">✕ Reject Return</option>
            </select>
            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--admin-text-tertiary)] text-[18px]">
              unfold_more
            </span>
          </div>
        </div>
      </div>

      {/* ─── Main Two-Column Layout ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_400px] gap-6 items-start">
        {/* Left Column: Return Details & Logistics */}
        <div className="flex flex-col gap-6 min-w-0">
          {/* 1. PICKUP LOGISTICS CARD */}
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
                  {pickupAddr.address || pickupAddr.addressLine1 || 'Address details not provided'}
                  {pickupAddr.locality && `, ${pickupAddr.locality}`}
                  <br />
                  {pickupAddr.city || 'City'}, {pickupAddr.state || 'State'} -{' '}
                  <strong className="text-[var(--admin-text-primary)]">
                    {pickupAddr.pincode || pickupAddr.pinCode || ''}
                  </strong>
                </p>
              </div>

              {/* Courier Partner Strip (if assigned) */}
              {(request.pickup?.partner || request.pickup?.trackingId) && (
                <div className="px-4 sm:px-5 pb-4 text-xs">
                  <div className="p-3 rounded-xl bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <span className="text-[10px] text-[var(--admin-text-tertiary)] uppercase font-bold block">
                        Courier Partner: {request.pickup.partner || 'Assigned'}
                      </span>
                      {request.pickup.trackingId && (
                        <p className="font-mono font-bold text-[var(--admin-text-primary)] mt-0.5">
                          Tracking: {request.pickup.trackingId}
                        </p>
                      )}
                      {request.pickup.driverName && (
                        <p className="text-[11px] text-[var(--admin-text-secondary)] mt-0.5">
                          Driver: {request.pickup.driverName}{' '}
                          {request.pickup.driverPhone && `(${request.pickup.driverPhone})`}
                        </p>
                      )}
                    </div>
                    <span className="text-[var(--admin-accent)] font-bold text-[11px] flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-[var(--admin-border)] shadow-2xs">
                      <span className="material-symbols-outlined text-[14px]">local_shipping</span>
                      {request.pickup.status?.replace(/_/g, ' ') || 'In Progress'}
                    </span>
                  </div>
                </div>
              )}
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
                  href={`https://wa.me/${waPhone}?text=Hi%20${encodeURIComponent(pickupAddr.name || 'there')},%20regarding%20your%20Return%20Request%20#${encodeURIComponent(request.returnId)}:`}
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

          {/* 2. RETURNING ITEMS & WAREHOUSE INSPECTION */}
          <div className="flex flex-col gap-5">
            {request.items?.map((item, index) => {
              const itemUnit = Number(item.unitPrice || 0);
              const itemQty = Number(item.returnQuantity || 1);
              const itemTotal = itemUnit * itemQty;

              return (
                <div
                  key={index}
                  className="admin-card overflow-hidden border border-[var(--admin-border)] shadow-xs bg-white rounded-2xl"
                >
                  {/* Item Header Strip */}
                  <div className="p-4 sm:p-5 border-b border-[var(--admin-border)] flex flex-wrap items-center justify-between gap-3 bg-[var(--admin-bg-subtle)]/50">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[var(--admin-accent)] text-[20px]">
                        outbox
                      </span>
                      <h3 className="text-base font-bold text-[var(--admin-text-primary)]">
                        Returning Item {request.items.length > 1 ? `#${index + 1}` : ''}
                      </h3>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-[var(--admin-accent)] bg-[var(--admin-accent-light)] border border-[var(--admin-border-strong)] uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--admin-accent)]" />
                      Qty: {itemQty} of {item.orderedQuantity || itemQty}
                    </span>
                  </div>

                  {/* Item Product Details */}
                  <div className="p-4 sm:p-6 space-y-4">
                    <div className="flex gap-4 items-start">
                      <img
                        src={item.imageSrc || PLACEHOLDER_IMAGES.product}
                        alt={item.title || 'Product'}
                        onError={handleImageError}
                        onClick={() => item.imageSrc && setPreviewImage(item.imageSrc)}
                        className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-xl border border-[var(--admin-border)] shadow-xs flex-shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
                      />
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm sm:text-base font-bold text-[var(--admin-text-primary)] leading-snug">
                          {item.title || 'Product'}
                        </h4>
                        {item.variant && (
                          <div className="mt-1">
                            <span className="inline-block bg-[var(--admin-bg-subtle)] text-[var(--admin-text-secondary)] text-[10px] font-semibold px-2 py-0.5 rounded border border-[var(--admin-border)] shadow-2xs">
                              Variant: {item.variant}
                            </span>
                          </div>
                        )}
                        <p className="mt-1.5 text-sm font-extrabold text-[var(--admin-text-primary)] font-mono">
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

                    {/* Customer Reason */}
                    <div className="p-3.5 rounded-xl bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] text-xs">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-[var(--admin-text-tertiary)] block mb-1">
                        Return Reason:
                      </span>
                      <p className="font-semibold text-[var(--admin-text-primary)]">
                        {item.reason || 'Customer request'}
                      </p>
                      {item.description && item.description !== item.reason && (
                        <p className="mt-1 text-[var(--admin-text-secondary)] text-[11px] italic leading-relaxed">
                          "{item.description}"
                        </p>
                      )}
                    </div>

                    {/* Evidence Photos */}
                    {item.evidenceImages?.length > 0 && (
                      <div className="pt-2">
                        <span className="text-[10px] uppercase tracking-wider font-bold text-[var(--admin-text-tertiary)] mb-2 block">
                          Customer Photos ({item.evidenceImages.length})
                        </span>
                        <div className="flex gap-2 overflow-x-auto admin-scrollbar pb-1">
                          {item.evidenceImages.map((img, i) => (
                            <img
                              key={i}
                              src={img}
                              alt="Evidence"
                              onClick={() => setPreviewImage(img)}
                              className="w-14 h-14 object-cover rounded-xl border border-[var(--admin-border)] shadow-2xs cursor-pointer hover:scale-105 transition-transform"
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ─── Warehouse Inspection Section ─── */}
                    <div className="pt-3 border-t border-[var(--admin-border)]">
                      {item.inspectionResult?.inspectedAt ? (
                        <div className="p-4 rounded-xl bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] space-y-3 text-xs">
                          <div className="flex items-center justify-between pb-2 border-b border-[var(--admin-border)]">
                            <span className="font-bold text-[var(--admin-text-primary)] flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-[16px] text-emerald-600">
                                fact_check
                              </span>
                              Warehouse Inspection Result
                            </span>
                            <span
                              className={`px-2.5 py-0.5 rounded-md text-xs font-bold border ${item.inspectionResult.inspectionScore >= 80 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}
                            >
                              Score: {item.inspectionResult.inspectionScore}/100
                            </span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            <div className="p-2 bg-white rounded-lg border border-[var(--admin-border)]">
                              <span className="text-[10px] text-[var(--admin-text-tertiary)] block font-medium">
                                Original Product
                              </span>
                              <span
                                className={`font-bold flex items-center gap-1 text-[11px] mt-0.5 ${item.inspectionResult.originalProduct ? 'text-emerald-700' : 'text-red-700'}`}
                              >
                                <span className="material-symbols-outlined text-[13px]">
                                  {item.inspectionResult.originalProduct
                                    ? 'check_circle'
                                    : 'cancel'}
                                </span>
                                {item.inspectionResult.originalProduct ? 'Verified' : 'Missing'}
                              </span>
                            </div>
                            <div className="p-2 bg-white rounded-lg border border-[var(--admin-border)]">
                              <span className="text-[10px] text-[var(--admin-text-tertiary)] block font-medium">
                                Accessories
                              </span>
                              <span
                                className={`font-bold flex items-center gap-1 text-[11px] mt-0.5 ${item.inspectionResult.accessoriesPresent ? 'text-emerald-700' : 'text-red-700'}`}
                              >
                                <span className="material-symbols-outlined text-[13px]">
                                  {item.inspectionResult.accessoriesPresent
                                    ? 'check_circle'
                                    : 'cancel'}
                                </span>
                                {item.inspectionResult.accessoriesPresent ? 'Present' : 'Missing'}
                              </span>
                            </div>
                            <div className="p-2 bg-white rounded-lg border border-[var(--admin-border)]">
                              <span className="text-[10px] text-[var(--admin-text-tertiary)] block font-medium">
                                Packaging
                              </span>
                              <span
                                className={`font-bold flex items-center gap-1 text-[11px] mt-0.5 ${item.inspectionResult.packagingIntact ? 'text-emerald-700' : 'text-red-700'}`}
                              >
                                <span className="material-symbols-outlined text-[13px]">
                                  {item.inspectionResult.packagingIntact
                                    ? 'check_circle'
                                    : 'cancel'}
                                </span>
                                {item.inspectionResult.packagingIntact ? 'Intact' : 'Damaged'}
                              </span>
                            </div>
                            <div className="p-2 bg-white rounded-lg border border-[var(--admin-border)]">
                              <span className="text-[10px] text-[var(--admin-text-tertiary)] block font-medium">
                                Condition
                              </span>
                              <span
                                className={`font-bold flex items-center gap-1 text-[11px] mt-0.5 ${item.inspectionResult.workingCondition ? 'text-emerald-700' : 'text-red-700'}`}
                              >
                                <span className="material-symbols-outlined text-[13px]">
                                  {item.inspectionResult.workingCondition
                                    ? 'check_circle'
                                    : 'cancel'}
                                </span>
                                {item.inspectionResult.workingCondition ? 'Good' : 'Damaged'}
                              </span>
                            </div>
                          </div>
                          {item.inspectionResult.remarks && (
                            <div className="pt-2 border-t border-[var(--admin-border)] text-xs text-[var(--admin-text-secondary)]">
                              <strong className="text-[var(--admin-text-primary)]">
                                Remarks:{' '}
                              </strong>
                              {item.inspectionResult.remarks}
                            </div>
                          )}
                        </div>
                      ) : ['return_received', 'inspection_started'].includes(request.status) ? (
                        <div className="p-4 rounded-xl bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] space-y-3">
                          <h5 className="text-xs font-bold text-[var(--admin-text-primary)] flex items-center gap-1.5 pb-2 border-b border-[var(--admin-border)]">
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
                                    className={`px-3 py-1 rounded-lg border text-xs font-bold transition-colors cursor-pointer ${
                                      (inspectionState[index]?.[field] ?? true) === true
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                        : 'bg-white text-[var(--admin-text-tertiary)] border-[var(--admin-border)] hover:bg-[var(--admin-surface-hover)]'
                                    }`}
                                    onClick={() => handleInspectionChange(index, field, true)}
                                  >
                                    Yes
                                  </button>
                                  <button
                                    type="button"
                                    className={`px-3 py-1 rounded-lg border text-xs font-bold transition-colors cursor-pointer ${
                                      (inspectionState[index]?.[field] ?? true) === false
                                        ? 'bg-red-50 text-red-700 border-red-300'
                                        : 'bg-white text-[var(--admin-text-tertiary)] border-[var(--admin-border)] hover:bg-[var(--admin-surface-hover)]'
                                    }`}
                                    onClick={() => handleInspectionChange(index, field, false)}
                                  >
                                    No
                                  </button>
                                </div>
                              </div>
                            ))}
                            <div className="pt-2 border-t border-[var(--admin-border)]">
                              <label className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider mb-1 block">
                                Inspection Score (0-100)
                              </label>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                className="w-full text-xs p-2 bg-white border border-[var(--admin-border)] rounded-xl outline-none focus:border-[var(--admin-accent)]"
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
                                Inspection Remarks
                              </label>
                              <textarea
                                className="w-full text-xs p-2 bg-white border border-[var(--admin-border)] rounded-xl outline-none focus:border-[var(--admin-accent)]"
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
                              className="admin-btn admin-btn-primary w-full text-xs font-bold mt-2"
                              onClick={() => handleInspectionSubmit(index)}
                            >
                              Submit Inspection
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="py-2 text-xs text-[var(--admin-text-tertiary)] flex items-center gap-1.5 italic">
                          <span className="material-symbols-outlined text-[16px]">
                            pending_actions
                          </span>
                          Quality inspection will unlock once item is marked received at warehouse.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 3. AUTHORITATIVE FINANCIAL REFUND SETTLEMENT CARD */}
          <div className="admin-card overflow-hidden border border-[var(--admin-border)] shadow-xs bg-white rounded-2xl">
            <div className="p-4 sm:p-5 border-b border-[var(--admin-border)] flex items-center justify-between bg-[var(--admin-bg-subtle)]/50">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[var(--admin-accent)] text-[20px]">
                  account_balance_wallet
                </span>
                <h3 className="text-base font-bold text-[var(--admin-text-primary)]">
                  Refund Financial Settlement
                </h3>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[var(--admin-surface-muted)] text-[var(--admin-text-secondary)] border border-[var(--admin-border)] font-mono uppercase">
                Method: {refundMethod.replace(/_/g, ' ')}
              </span>
            </div>

            <div className="p-4 sm:p-6 space-y-5">
              {/* Financial Math Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center p-3 rounded-xl bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)]">
                <div>
                  <span className="text-[10px] uppercase tracking-wider font-bold text-[var(--admin-text-tertiary)]">
                    Product Total
                  </span>
                  <p className="text-sm sm:text-base font-bold text-[var(--admin-text-primary)] font-mono mt-0.5">
                    ₹{formatINR(productTotal)}
                  </p>
                </div>
                <div className="border-l border-[var(--admin-border)] pl-2">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-[var(--admin-text-tertiary)]">
                    Additions
                  </span>
                  <p className="text-sm sm:text-base font-bold text-emerald-700 font-mono mt-0.5">
                    +₹{formatINR(taxRefund + shippingRefund)}
                  </p>
                </div>
                <div className="border-l border-[var(--admin-border)] pl-2">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-[var(--admin-text-tertiary)]">
                    Deductions
                  </span>
                  <p className="text-sm sm:text-base font-bold text-red-600 font-mono mt-0.5">
                    -₹{formatINR(restockingFee + discountDeduction + walletUsedDeduction)}
                  </p>
                </div>
                <div className="border-l border-[var(--admin-border)] pl-2">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-[var(--admin-text-tertiary)]">
                    Grand Total
                  </span>
                  <p className="text-sm sm:text-lg font-black text-emerald-700 font-mono mt-0.5">
                    ₹{formatINR(grandTotal)}
                  </p>
                </div>
              </div>

              {/* Settlement Strip */}
              <div className="p-4 rounded-xl bg-[var(--admin-success-light)] border border-[var(--admin-success-border)] space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[var(--admin-success)] text-[22px]">
                      savings
                    </span>
                    <div>
                      <span className="font-bold text-sm text-[var(--admin-text-primary)]">
                        Refund Due to Customer
                      </span>
                      <p className="text-[11px] text-[var(--admin-text-secondary)]">
                        Authoritative refund calculation ready for credit or payout.
                      </p>
                    </div>
                  </div>
                  <span className="text-base font-mono font-black text-[var(--admin-success)] bg-white px-3 py-1 rounded-xl border border-[var(--admin-success-border)] shadow-2xs">
                    ₹{formatINR(grandTotal)} Refund
                  </span>
                </div>

                {/* Payment Destination Strip */}
                <div className="p-3.5 bg-white rounded-xl border border-[var(--admin-success-border)] flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-[var(--admin-text-tertiary)]">
                        Destination:
                      </span>
                      <span className="font-bold text-[var(--admin-text-primary)] uppercase">
                        {refundMethod === 'wallet'
                          ? 'Store Wallet'
                          : isCOD
                            ? 'UPI Refund (COD Order)'
                            : 'Original Payment Method / Online'}
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
                        <span className="material-symbols-outlined text-[16px]">content_copy</span>
                        Copy UPI ID
                      </button>
                    )}

                    {!isRefundSettled ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleTriggerRefundClick}
                          className="admin-btn admin-btn-outline text-xs font-bold rounded-lg"
                        >
                          Trigger Refund
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
                              notes: `Paid ₹${formatINR(grandTotal)} refund to customer`,
                            });
                            setIsSettleModalOpen(true);
                          }}
                          className="admin-btn admin-btn-primary flex items-center gap-1.5 text-xs font-bold rounded-lg shadow-xs transition-all cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[16px]">verified</span>
                          Mark Payment Done
                        </button>
                      </div>
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
            </div>
          </div>
        </div>

        {/* Right Sidebar: Customer Profile & Order Context */}
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

          {/* 3. AUDIT INFO CARD */}
          <div className="admin-card overflow-hidden border border-[var(--admin-border)] shadow-xs bg-white rounded-2xl">
            <div className="p-4 sm:p-5 border-b border-[var(--admin-border)] flex items-center justify-between bg-[var(--admin-bg-subtle)]/50">
              <h3 className="text-sm font-bold text-[var(--admin-text-primary)] flex items-center gap-2">
                <span className="material-symbols-outlined text-[var(--admin-accent)] text-[18px]">
                  history
                </span>
                Audit Details
              </h3>
            </div>
            <div className="p-4 sm:p-5 text-xs space-y-3 font-medium">
              <div className="flex justify-between items-center py-1 border-b border-[var(--admin-border-subtle)]">
                <span className="text-[var(--admin-text-secondary)]">Created:</span>
                <span className="font-bold text-[var(--admin-text-primary)]">
                  {request.createdAt
                    ? format(new Date(request.createdAt), 'MMM dd, yyyy • HH:mm')
                    : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-[var(--admin-border-subtle)]">
                <span className="text-[var(--admin-text-secondary)]">Last Updated:</span>
                <span className="font-bold text-[var(--admin-text-primary)]">
                  {request.updatedAt
                    ? format(new Date(request.updatedAt), 'MMM dd, yyyy • HH:mm')
                    : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-[var(--admin-border-subtle)]">
                <span className="text-[var(--admin-text-secondary)]">Priority:</span>
                <span
                  className={`capitalize font-bold px-2 py-0.5 rounded text-[10px] ${request.priority === 'high' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-[var(--admin-bg-subtle)] text-[var(--admin-text-primary)] border border-[var(--admin-border)]'}`}
                >
                  {request.priority || 'Normal'}
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-[var(--admin-text-secondary)]">Approval Level:</span>
                <span className="font-bold text-[var(--admin-text-primary)] capitalize">
                  {request.approvalLevel?.replace(/_/g, ' ') || 'Standard'}
                </span>
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
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl border border-white/20"
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
      {isRejectOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-[var(--admin-border)]">
            <h3 className="text-base font-bold text-[var(--admin-error)] flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined">warning</span>
              Reject Return Request
            </h3>
            <p className="text-xs text-[var(--admin-text-secondary)] mb-4">
              Please enter the reason for rejecting this return request. This message will be sent
              to the customer.
            </p>
            <textarea
              className="admin-input w-full min-h-[100px] text-xs mb-4"
              placeholder="e.g., The item does not meet the return policy criteria..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                className="admin-btn admin-btn-outline text-xs"
                onClick={() => {
                  setIsRejectOpen(false);
                  setRejectReason('');
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-primary !bg-[var(--admin-error)] hover:!bg-[var(--admin-error)]/90 text-xs"
                onClick={handleReject}
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Record Refund Payment / Settlement Modal ─── */}
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
                className="text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)]"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSettleSubmit} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider block mb-1">
                  Refund Amount (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={settleData.amount}
                  onChange={(e) => setSettleData({ ...settleData, amount: e.target.value })}
                  className="admin-input w-full text-sm font-mono font-bold"
                  placeholder="e.g. 500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider block mb-1">
                  Payment Method
                </label>
                <select
                  value={settleData.paymentMethod}
                  onChange={(e) => setSettleData({ ...settleData, paymentMethod: e.target.value })}
                  className="admin-input w-full text-xs font-semibold"
                >
                  <option value="upi">UPI Payout</option>
                  <option value="wallet">Store Wallet Credit</option>
                  <option value="bank_transfer">Bank Transfer (NEFT/IMPS)</option>
                  <option value="original">Original Payment Gateway (Razorpay)</option>
                </select>
              </div>

              {settleData.paymentMethod === 'upi' && (
                <div>
                  <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider block mb-1">
                    Customer UPI ID *
                  </label>
                  <input
                    type="text"
                    required
                    value={settleData.upiId}
                    onChange={(e) => setSettleData({ ...settleData, upiId: e.target.value })}
                    className="admin-input w-full text-xs font-mono"
                    placeholder="e.g. customer@okhdfcbank"
                  />
                </div>
              )}

              <div>
                <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider block mb-1">
                  Bank Reference / UTR Number
                </label>
                <input
                  type="text"
                  value={settleData.transactionId}
                  onChange={(e) => setSettleData({ ...settleData, transactionId: e.target.value })}
                  className="admin-input w-full text-xs font-mono"
                  placeholder="e.g. UPI/123456789012 or UTR..."
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider block mb-1">
                  Notes
                </label>
                <textarea
                  rows="2"
                  value={settleData.notes}
                  onChange={(e) => setSettleData({ ...settleData, notes: e.target.value })}
                  className="admin-input w-full text-xs"
                  placeholder="Optional notes or payout reference details..."
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  className="admin-btn admin-btn-outline text-xs"
                  onClick={() => setIsSettleModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingSettle}
                  className="admin-btn admin-btn-primary text-xs flex items-center gap-1.5"
                >
                  {isSubmittingSettle ? (
                    <span>Saving...</span>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px]">check</span>
                      Confirm & Save Settlement
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default AdminReturnDetail;
