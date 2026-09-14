import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useConfirm } from '../../../context/ConfirmProvider';
import { format } from 'date-fns';
import { m as motion, AnimatePresence } from 'framer-motion';
import { useReturnManagement } from '../../hooks/useReturnManagement';
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
import {
  formatINR,
  RETURN_HAPPY_PATH,
  mapStatusToStep,
} from '../../../features/returns/utils/returnDomainUtils';
import {
  ReturnTimelineCard,
  ReturnRejectModal,
  ReturnSettleRefundModal,
  ReturnItemInspectionCard,
} from '../../../features/returns/components';

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
    deleteReturn,
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
  const [isDeleting, setIsDeleting] = useState(false);
  const confirm = useConfirm();

  const handleDeleteReturn = async () => {
    const confirmed = await confirm({
      title: 'Move Return to Recycle Bin',
      message: `Are you sure you want to delete return request #${request.returnId || request._id}? You can restore it anytime from the Recycle Bin.`,
      confirmText: 'Move to Recycle Bin',
      cancelText: 'Cancel',
      variant: 'danger',
    });
    if (!confirmed) return;

    try {
      setIsDeleting(true);
      await deleteReturn(id);
      navigate('/admin/returns');
    } catch (_err) {
      // Handled by hook
    } finally {
      setIsDeleting(false);
    }
  };

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
            {['completed', 'cancelled', 'rejected', 'refund_completed'].includes(
              (request.status || '').toLowerCase(),
            ) && (
              <button
                type="button"
                onClick={handleDeleteReturn}
                disabled={isDeleting}
                className="admin-btn flex-1 sm:flex-none !h-9 sm:!h-10 !py-0 px-3 sm:px-4 !rounded-[4px] text-[12px] sm:text-[13px] font-bold shadow-sm min-w-max cursor-pointer inline-flex items-center justify-center gap-1.5 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 hover:bg-red-100 transition-colors box-border disabled:opacity-50"
                title="Move to Recycle Bin"
              >
                {isDeleting ? (
                  <span className="w-3.5 h-3.5 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span className="material-symbols-outlined text-[17px] sm:text-[18px] leading-none">
                    delete_outline
                  </span>
                )}
                <span>Delete</span>
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* ─── 2. MAIN 2/3 + 1/3 GRID (Matches AdminOrderDetail max-w-[1400px]) ─── */}
      <div className="max-w-[1400px] mx-auto w-auto">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 sm:gap-6 lg:gap-8 items-start">
          {/* ─── LEFT COLUMN: Operations, Stepper & Items (2/3 Width) ─── */}
          <div className="xl:col-span-2 flex flex-col gap-3 sm:gap-6 lg:gap-8">
            {/* CARD 1: LIFECYCLE PROGRESSION */}
            <ReturnTimelineCard
              currentStepName={currentStepName}
              isFailed={isFailed}
              currentIdx={currentIdx}
              status={request.status}
              onTransitionStatus={(nextStatus) => transitionStatus(id, { nextStatus })}
            >
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
            </ReturnTimelineCard>

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
                {request.items?.map((item, index) => (
                  <ReturnItemInspectionCard
                    key={index}
                    item={item}
                    index={index}
                    inspectionState={inspectionState}
                    onInspectionChange={handleInspectionChange}
                    onInspectionSubmit={handleInspectionSubmit}
                    onPreviewImage={setPreviewImage}
                    canInspect={['return_received', 'inspection_started'].includes(request.status)}
                  />
                ))}
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
                    {request.orderId?.orderStatus ||
                      request.order?.orderStatus ||
                      request.orderId?.status ||
                      request.order?.status ||
                      'Processing'}
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
      <ReturnRejectModal
        isOpen={isRejectOpen}
        onClose={() => {
          setIsRejectOpen(false);
          setRejectReason('');
        }}
        onConfirm={handleReject}
      />

      {/* ─── Record Refund Payment / Settlement Modal ─── */}
      <ReturnSettleRefundModal
        isOpen={isSettleModalOpen}
        onClose={() => setIsSettleModalOpen(false)}
        settleData={settleData}
        setSettleData={setSettleData}
        onSubmit={handleSettleSubmit}
        isSubmittingSettle={isSubmittingSettle}
        customerName={request.userId?.name || pickupAddr.name || 'Customer'}
        upiId={upiId || settleData.upiId}
        grandTotal={grandTotal}
        returnCode={request.returnId || request._id?.slice(-8)}
        isDark={isDark}
        isMobile={isMobile}
      />

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
