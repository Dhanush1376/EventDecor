import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { m as motion, AnimatePresence } from 'framer-motion';
import { formatCurrency } from './AdminUIKit';
import { EXTERNAL_URLS } from '../../config/constants';
import { WhatsAppIcon } from '../../components/ui/WhatsAppIcon';
import toast from 'react-hot-toast';
import { useMobileDrawerEngine, DrawerDragHandle } from '../../components/ui/drawer';

const formatDateDMY = (dateStr) => {
  if (!dateStr) return 'N/A';
  if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split('-');
    return `${d}-${m}-${y}`;
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

const RETURN_STATUS_CONFIG = {
  submitted: {
    label: 'Submitted',
    color: 'bg-stone-100 text-stone-700 border-stone-300 dark:bg-stone-800 dark:text-stone-300',
  },
  approved: {
    label: 'Approved',
    color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400',
  },
  return_courier_assigned: {
    label: 'Courier Assigned',
    color:
      'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400',
  },
  return_picked_up: {
    label: 'Picked Up',
    color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400',
  },
  return_in_transit: {
    label: 'In Transit',
    color: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-400',
  },
  return_received: {
    label: 'Received',
    color:
      'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400',
  },
  inspection_started: {
    label: 'QC Started',
    color:
      'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400',
  },
  inspection_completed: {
    label: 'QC Passed',
    color: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-400',
  },
  refund_initiated: {
    label: 'Refund Initiated',
    color:
      'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400',
  },
  refund_completed: {
    label: 'Refund Done',
    color:
      'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400',
  },
  completed: {
    label: 'Completed',
    color:
      'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400',
  },
  rejected: {
    label: 'Rejected',
    color: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400',
  },
  cancelled: {
    label: 'Cancelled',
    color: 'bg-stone-100 text-stone-600 border-stone-300 dark:bg-stone-800 dark:text-stone-400',
  },
};

const getItemTitle = (item) => {
  if (!item) return 'Returned Item';
  return (
    item.title ||
    item.name ||
    item.productId?.title ||
    item.productId?.name ||
    item.product?.title ||
    item.product?.name ||
    'Returned Item'
  );
};

const getItemImage = (item) => {
  if (!item) return null;
  const raw =
    item.imageSrc ||
    item.image ||
    item.productId?.imageSrc ||
    item.productId?.images?.[0]?.url ||
    (typeof item.productId?.images?.[0] === 'string' ? item.productId?.images?.[0] : null) ||
    item.productId?.image ||
    item.product?.imageSrc ||
    item.product?.images?.[0]?.url ||
    (typeof item.product?.images?.[0] === 'string' ? item.product?.images?.[0] : null) ||
    item.product?.image ||
    item.evidenceImages?.[0] ||
    item.evidencePhotos?.[0] ||
    null;

  if (
    raw &&
    (raw === '/placeholder-item.png' || raw.includes('photo-1513519245088-0e12902e5a38'))
  ) {
    return null;
  }
  return raw;
};

export function AdminReturnDrawer({
  isOpen = true,
  onClose,
  selectedReturn: propSelectedReturn,
  returnRequest,
  setIsDrawerOpen,
  onStatusUpdate,
  onTriggerRefund,
  onSettleRefund,
  navigate,
}) {
  const selectedReturn = propSelectedReturn || returnRequest;
  const closeDrawer = () => {
    if (typeof onClose === 'function') onClose();
    if (typeof setIsDrawerOpen === 'function') setIsDrawerOpen(false);
  };

  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'items' | 'settlement' | 'notes'
  const [isUpdating, setIsUpdating] = useState(false);
  const [lightboxImg, setLightboxImg] = useState(null);
  const [settleNotes, setSettleNotes] = useState('');
  const [settleAmount, setSettleAmount] = useState(0);

  const { isMobile, dragProps, sheetTransition, slideDrawer } = useMobileDrawerEngine({
    isOpen: !!selectedReturn && isOpen,
    onClose: closeDrawer,
  });

  useEffect(() => {
    if (selectedReturn) {
      const calculatedGrandTotal =
        selectedReturn.refundBreakdown?.grandTotal ??
        selectedReturn.totalRefundAmount ??
        selectedReturn.refundAmount ??
        selectedReturn.items?.reduce(
          (acc, item) => acc + (item.unitPrice || 0) * (item.returnQuantity || item.quantity || 1),
          0,
        ) ??
        0;
      setSettleAmount(calculatedGrandTotal);
    }
  }, [selectedReturn]);

  if (!selectedReturn || typeof document === 'undefined') return null;

  const isDark =
    typeof document !== 'undefined' &&
    (document.documentElement.classList.contains('dark') ||
      document.body.classList.contains('dark'));

  const statusKey = (selectedReturn.status || 'submitted').toLowerCase();
  const statusCfg = RETURN_STATUS_CONFIG[statusKey] || {
    label: selectedReturn.status || 'Submitted',
    color: 'bg-stone-100 text-stone-700 border-stone-300',
  };

  const customerName =
    selectedReturn.user?.name ||
    selectedReturn.customer?.name ||
    selectedReturn.customerName ||
    selectedReturn.orderId?.customer?.name ||
    'Guest Customer';

  const customerEmail =
    selectedReturn.user?.email ||
    selectedReturn.customer?.email ||
    selectedReturn.customerEmail ||
    selectedReturn.orderId?.customer?.email ||
    '';

  const customerPhone =
    selectedReturn.user?.phone ||
    selectedReturn.customer?.phone ||
    selectedReturn.customerPhone ||
    selectedReturn.orderId?.customer?.phone ||
    selectedReturn.pickupAddress?.phone ||
    '';

  const rawPhone = customerPhone.replace(/\D/g, '');
  const cleanPhone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;
  const whatsappUrl = cleanPhone
    ? EXTERNAL_URLS.whatsapp(
        cleanPhone,
        `Hi ${customerName}, regards to your Return request #${selectedReturn.returnId || selectedReturn._id.substring(0, 8)}...`,
      )
    : null;

  const items = selectedReturn.items || [];
  const breakdown = selectedReturn.refundBreakdown || {};
  const productTotal = Number(
    breakdown.productTotal ??
      items.reduce(
        (acc, item) => acc + (item.unitPrice || 0) * (item.returnQuantity || item.quantity || 1),
        0,
      ),
  );
  const taxRefund = Number(breakdown.taxRefund ?? 0);
  const shippingRefund = Number(breakdown.shippingRefund ?? 0);
  const restockingFee = Number(breakdown.restockingFee ?? 0);
  const netRefund = Number(
    breakdown.grandTotal ?? Math.max(0, productTotal + taxRefund + shippingRefund - restockingFee),
  );

  const handleStatusChange = async (newStatus) => {
    if (!onStatusUpdate) return;
    try {
      setIsUpdating(true);
      await onStatusUpdate(selectedReturn._id, newStatus);
      toast.success(`Status updated to ${newStatus.replace(/_/g, ' ')}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleTriggerRefundClick = async () => {
    if (!onTriggerRefund) return;
    try {
      setIsUpdating(true);
      await onTriggerRefund(selectedReturn._id, selectedReturn.refundMethod || 'original');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to trigger refund');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSettlePayout = async () => {
    if (!onSettleRefund) return;
    if (Number(settleAmount) <= 0) {
      toast.error('Please enter a valid refund amount');
      return;
    }
    try {
      setIsUpdating(true);
      await onSettleRefund(selectedReturn._id, {
        amount: Number(settleAmount),
        refundMethod: selectedReturn.refundMethod || 'original',
        notes: settleNotes || undefined,
        status: 'completed',
      });
      toast.success('Refund payout recorded successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record refund settlement');
    } finally {
      setIsUpdating(false);
    }
  };

  return createPortal(
    <div className={`admin-section-root ${isDark ? 'dark' : ''}`}>
      {/* Backdrop */}
      <motion.div
        key="admin-return-drawer-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => closeDrawer()}
        className="fixed inset-0 z-[999] cursor-pointer"
        style={{
          background: 'var(--admin-surface-overlay, rgba(60, 54, 42, 0.45))',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
        }}
      />

      {/* Slide-over Aside Panel */}
      <motion.aside
        key="admin-return-drawer-aside"
        initial="hidden"
        animate="show"
        exit="exit"
        variants={slideDrawer}
        transition={sheetTransition}
        {...dragProps}
        className="fixed z-[1000] flex flex-col overflow-hidden shadow-[var(--admin-shadow-2xl)] border-[var(--admin-border)] sm:inset-y-0 sm:top-0 sm:bottom-0 sm:right-0 sm:left-auto sm:w-[540px] sm:h-full sm:max-h-none sm:rounded-none sm:border-l sm:border-t-0 bottom-0 inset-x-0 max-h-[90dvh] h-auto rounded-t-2xl sm:rounded-t-none border-t bg-[var(--admin-surface)] text-[var(--admin-text-primary)]"
        style={{ background: 'var(--admin-surface, #ffffff)' }}
      >
        {isMobile && <DrawerDragHandle onClick={closeDrawer} />}
        {/* ─── DRAWER HEADER ─── */}
        <div className="px-5 sm:px-6 py-4 border-b border-[var(--admin-border-subtle)] flex items-center justify-between shrink-0 text-left bg-[var(--admin-bg-subtle)]">
          <div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-[var(--admin-accent)]">
                undo
              </span>
              <h3 className="text-[14.5px] font-bold text-[var(--admin-text-primary)] tracking-tight">
                Return Details Panel
              </h3>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-[4px] text-[10.5px] font-bold border ${statusCfg.color}`}
              >
                {statusCfg.label}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1 text-[11.5px] text-[var(--admin-text-secondary)]">
              <span className="font-mono font-bold text-[var(--admin-text-primary)]">
                {selectedReturn.returnId || `RET-${selectedReturn._id?.substring(0, 8)}`}
              </span>
              <span>•</span>
              <span>{formatDateDMY(selectedReturn.createdAt)}</span>
              {selectedReturn.orderId && (
                <>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        `/admin/orders/${selectedReturn.orderId._id || selectedReturn.orderId}`,
                      )
                    }
                    className="text-[var(--admin-accent)] hover:underline font-semibold cursor-pointer"
                  >
                    Ord:{' '}
                    {selectedReturn.orderId.orderId ||
                      (selectedReturn.orderId._id || selectedReturn.orderId)
                        .toString()
                        .substring(0, 8)}
                  </button>
                </>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => closeDrawer()}
            className="w-8 h-8 rounded-[4px] flex items-center justify-center text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)] hover:bg-[var(--admin-surface-muted)] transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* ─── TAB NAVIGATION ─── */}
        <div className="px-5 sm:px-6 border-b border-[var(--admin-border-subtle)] bg-[var(--admin-surface)] flex gap-6 shrink-0 text-[12.5px] font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`py-2.5 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'overview'
                ? 'border-[var(--admin-accent)] text-[var(--admin-accent)]'
                : 'border-transparent text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)]'
            }`}
          >
            Overview
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('items')}
            className={`py-2.5 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'items'
                ? 'border-[var(--admin-accent)] text-[var(--admin-accent)]'
                : 'border-transparent text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)]'
            }`}
          >
            Items ({items.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('settlement')}
            className={`py-2.5 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'settlement'
                ? 'border-[var(--admin-accent)] text-[var(--admin-accent)]'
                : 'border-transparent text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)]'
            }`}
          >
            Settlement ({formatCurrency(netRefund)})
          </button>
        </div>

        {/* ─── DRAWER SCROLLABLE BODY ─── */}
        <div className="flex-1 overflow-y-auto overscroll-contain touch-pan-y p-5 sm:p-6 space-y-6 text-left">
          {activeTab === 'overview' && (
            <>
              {/* LIFECYCLE ACTION CONTROLS */}
              <div className="admin-card !rounded-[4px] p-4 border border-[var(--admin-border)] space-y-3 bg-[var(--admin-surface)]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--admin-text-tertiary)] block">
                  Quick Lifecycle Actions
                </span>

                <div className="flex flex-wrap gap-2">
                  {statusKey === 'submitted' && (
                    <>
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() => handleStatusChange('approved')}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[12px] font-bold rounded-[4px] transition-all cursor-pointer flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[16px]">check</span>
                        Approve Return
                      </button>
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() => handleStatusChange('rejected')}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-[12px] font-bold rounded-[4px] transition-all cursor-pointer flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[16px]">close</span>
                        Reject
                      </button>
                    </>
                  )}

                  {statusKey === 'approved' && (
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => handleStatusChange('return_courier_assigned')}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[12px] font-bold rounded-[4px] transition-all cursor-pointer flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[16px]">local_shipping</span>
                      Assign Courier
                    </button>
                  )}

                  {statusKey === 'return_courier_assigned' && (
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => handleStatusChange('return_picked_up')}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-bold rounded-[4px] transition-all cursor-pointer flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[16px]">inventory</span>
                      Mark Picked Up
                    </button>
                  )}

                  {['return_picked_up', 'return_in_transit'].includes(statusKey) && (
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => handleStatusChange('return_received')}
                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-[12px] font-bold rounded-[4px] transition-all cursor-pointer flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[16px]">warehouse</span>
                      Mark Received at Hub
                    </button>
                  )}

                  {statusKey === 'return_received' && (
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => handleStatusChange('inspection_started')}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-[12px] font-bold rounded-[4px] transition-all cursor-pointer flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[16px]">fact_check</span>
                      Start QC Inspection
                    </button>
                  )}

                  {statusKey === 'inspection_started' && (
                    <>
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() => handleStatusChange('inspection_completed')}
                        className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-[12px] font-bold rounded-[4px] transition-all cursor-pointer flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[16px]">task_alt</span>
                        Pass QC Inspection
                      </button>
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() => handleStatusChange('rejected')}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-[12px] font-bold rounded-[4px] transition-all cursor-pointer flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[16px]">thumb_down</span>
                        Fail & Reject
                      </button>
                    </>
                  )}

                  {statusKey === 'inspection_completed' && (
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={handleTriggerRefundClick}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[12px] font-bold rounded-[4px] transition-all cursor-pointer flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[16px]">payments</span>
                      Trigger Refund
                    </button>
                  )}

                  {['refund_initiated', 'refund_completed'].includes(statusKey) && (
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => handleStatusChange('completed')}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[12px] font-bold rounded-[4px] transition-all cursor-pointer flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[16px]">verified</span>
                      Close & Complete Return
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        selectedReturn.returnType === 'exchange'
                          ? `/admin/exchanges/requests/${selectedReturn._id}`
                          : `/admin/returns/requests/${selectedReturn._id}`,
                      )
                    }
                    className="px-3 py-1.5 bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-border-subtle)] text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] border border-[var(--admin-border)] text-[12px] font-semibold rounded-[4px] transition-all cursor-pointer ml-auto"
                  >
                    Deep Review
                  </button>
                </div>
              </div>

              {/* CUSTOMER & PICKUP INFO */}
              <div className="admin-card !rounded-[4px] p-4 border border-[var(--admin-border)] space-y-3 bg-[var(--admin-surface)]">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--admin-text-tertiary)]">
                    Customer & Logistics Profile
                  </span>
                  {whatsappUrl && (
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[4px] text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                    >
                      <WhatsAppIcon className="w-3.5 h-3.5 fill-emerald-600" />
                      WhatsApp
                    </a>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[12.5px]">
                  <div>
                    <span className="text-[11px] text-[var(--admin-text-tertiary)] block">
                      Full Name
                    </span>
                    <span className="font-bold text-[var(--admin-text-primary)]">
                      {customerName}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-[var(--admin-text-tertiary)] block">
                      Contact Phone
                    </span>
                    <span className="font-mono text-[var(--admin-text-secondary)]">
                      {customerPhone || 'Not provided'}
                    </span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-[11px] text-[var(--admin-text-tertiary)] block">
                      Email
                    </span>
                    <span className="font-mono text-[var(--admin-text-secondary)]">
                      {customerEmail || 'N/A'}
                    </span>
                  </div>
                  {(selectedReturn.pickup?.address || selectedReturn.pickupAddress) &&
                    (() => {
                      const addr = selectedReturn.pickup?.address || selectedReturn.pickupAddress;
                      const street =
                        typeof addr === 'string'
                          ? addr
                          : addr.address || addr.street || addr.line1 || addr.addressLine1 || '';
                      const line2 =
                        typeof addr === 'object' ? addr.line2 || addr.addressLine2 || '' : '';
                      const locality =
                        typeof addr === 'object' ? addr.locality || addr.area || '' : '';
                      const landmark =
                        typeof addr === 'object' && addr.landmark ? `Near ${addr.landmark}` : '';
                      const city = typeof addr === 'object' ? addr.city || '' : '';
                      const state = typeof addr === 'object' ? addr.state || '' : '';
                      const pin =
                        typeof addr === 'object'
                          ? addr.pincode || addr.postalCode || addr.zipCode || ''
                          : '';

                      const fullAddr =
                        typeof addr === 'string'
                          ? addr
                          : [
                              street,
                              line2,
                              locality,
                              landmark,
                              city,
                              state ? (pin ? `${state} - ${pin}` : state) : pin,
                            ]
                              .filter(Boolean)
                              .join(', ') || 'Address on file with order';

                      return (
                        <div className="sm:col-span-2 bg-[var(--admin-surface-muted)] p-2.5 rounded-[4px] border border-[var(--admin-border-subtle)]">
                          <span className="text-[10.5px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider block mb-1">
                            Reverse Pickup Address
                          </span>
                          <p className="text-[12px] text-[var(--admin-text-secondary)] leading-relaxed">
                            {fullAddr}
                          </p>
                        </div>
                      );
                    })()}
                </div>
              </div>

              {/* QUICK ITEMS PREVIEW */}
              <div className="admin-card !rounded-[4px] p-4 border border-[var(--admin-border)] space-y-3 bg-[var(--admin-surface)]">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--admin-text-tertiary)]">
                    Items to Return ({items.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('items')}
                    className="text-[11px] font-bold text-[var(--admin-accent)] hover:underline cursor-pointer"
                  >
                    View All Details
                  </button>
                </div>

                <div className="space-y-2">
                  {items.slice(0, 3).map((item, idx) => {
                    const itemImg = getItemImage(item);
                    const itemTitle = getItemTitle(item);
                    return (
                      <div
                        key={idx}
                        className="flex items-center gap-3 p-2 rounded-[4px] bg-[var(--admin-surface-muted)] border border-[var(--admin-border-subtle)]"
                      >
                        {itemImg ? (
                          <img
                            src={itemImg}
                            alt=""
                            className="w-10 h-10 rounded-[3px] object-cover border border-[var(--admin-border)] shrink-0 bg-stone-100 dark:bg-stone-800"
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.style.display = 'none';
                              if (e.currentTarget.nextElementSibling) {
                                e.currentTarget.nextElementSibling.style.display = 'flex';
                              }
                            }}
                          />
                        ) : null}
                        <div
                          className={`w-10 h-10 rounded-[3px] bg-stone-100 dark:bg-stone-800 border border-[var(--admin-border)] items-center justify-center text-stone-400 shrink-0 ${
                            itemImg ? 'hidden' : 'flex'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[16px]">inventory_2</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p
                            className="text-[12px] font-bold text-[var(--admin-text-primary)] truncate"
                            title={itemTitle}
                          >
                            {itemTitle}
                          </p>
                          <div className="flex items-center gap-2 text-[11px] text-[var(--admin-text-tertiary)]">
                            <span>Qty: {item.returnQuantity || item.quantity || 1}</span>
                            <span>•</span>
                            <span>{formatCurrency(item.unitPrice || 0)}</span>
                            {item.reason && (
                              <>
                                <span>•</span>
                                <span className="text-amber-600 dark:text-amber-400 font-medium truncate max-w-[120px]">
                                  {item.reason}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {items.length > 3 && (
                    <p className="text-[11px] text-center text-[var(--admin-text-tertiary)] italic">
                      + {items.length - 3} more item(s) in this return
                    </p>
                  )}
                </div>
              </div>
            </>
          )}

          {activeTab === 'items' && (
            <div className="space-y-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--admin-text-tertiary)] block">
                Full Item & Photo Evidence Breakdown
              </span>

              {items.map((item, idx) => {
                const itemImg = getItemImage(item);
                const itemTitle = getItemTitle(item);
                const photoProof = [
                  ...(item.evidenceImages || []),
                  ...(item.photos || []),
                  ...(item.images || []),
                ].filter(Boolean);

                return (
                  <div
                    key={idx}
                    className="admin-card !rounded-[4px] p-4 border border-[var(--admin-border)] space-y-3 bg-[var(--admin-surface)]"
                  >
                    <div className="flex items-start gap-3">
                      {itemImg ? (
                        <img
                          src={itemImg}
                          alt=""
                          className="w-14 h-14 rounded-[4px] object-cover border border-[var(--admin-border)] shrink-0 bg-stone-100 dark:bg-stone-800"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.style.display = 'none';
                            if (e.currentTarget.nextElementSibling) {
                              e.currentTarget.nextElementSibling.style.display = 'flex';
                            }
                          }}
                        />
                      ) : null}
                      <div
                        className={`w-14 h-14 rounded-[4px] bg-stone-100 dark:bg-stone-800 border border-[var(--admin-border)] items-center justify-center text-stone-400 shrink-0 ${
                          itemImg ? 'hidden' : 'flex'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[20px]">inventory_2</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-[13px] font-bold text-[var(--admin-text-primary)]"
                          title={itemTitle}
                        >
                          {itemTitle}
                        </p>
                        <p className="text-[11.5px] text-[var(--admin-text-secondary)] mt-0.5">
                          Qty:{' '}
                          <span className="font-semibold text-[var(--admin-text-primary)]">
                            {item.returnQuantity || item.quantity || 1}
                          </span>{' '}
                          × {formatCurrency(item.unitPrice || 0)} ={' '}
                          <span className="font-bold text-[var(--admin-text-primary)]">
                            {formatCurrency(
                              (item.unitPrice || 0) * (item.returnQuantity || item.quantity || 1),
                            )}
                          </span>
                        </p>

                        <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-[3px] bg-amber-50 text-amber-800 border border-amber-200">
                            Reason: {item.reason || 'Not specified'}
                          </span>
                          {item.condition && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-[3px] bg-stone-100 text-stone-700 border border-stone-200">
                              Condition: {item.condition}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {item.customerNotes && (
                      <div className="bg-[var(--admin-surface-muted)] p-2.5 rounded-[4px] text-[11.5px] text-[var(--admin-text-secondary)] border border-[var(--admin-border-subtle)]">
                        <span className="font-semibold text-[var(--admin-text-primary)] block mb-0.5">
                          Customer Comment:
                        </span>
                        "{item.customerNotes}"
                      </div>
                    )}

                    {/* Customer Uploaded Photo Proof */}
                    {photoProof.length > 0 && (
                      <div>
                        <span className="text-[10.5px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider block mb-1.5">
                          Customer Photo Proof ({photoProof.length})
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {photoProof.map((photoUrl, pIdx) => (
                            <button
                              key={pIdx}
                              type="button"
                              onClick={() => setLightboxImg(photoUrl)}
                              className="w-16 h-16 rounded-[4px] overflow-hidden border border-[var(--admin-border)] hover:opacity-85 transition-opacity cursor-pointer shrink-0"
                            >
                              <img
                                src={photoUrl}
                                alt="proof"
                                className="w-full h-full object-cover"
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'settlement' && (
            <div className="space-y-4">
              {/* FINANCIAL BREAKDOWN */}
              <div className="admin-card !rounded-[4px] p-4 border border-[var(--admin-border)] space-y-3 bg-[var(--admin-surface)]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--admin-text-tertiary)] block">
                  Refund Mathematical Ledger
                </span>

                <div className="space-y-2 text-[12.5px]">
                  <div className="flex justify-between">
                    <span className="text-[var(--admin-text-secondary)]">
                      Items Product Subtotal
                    </span>
                    <span className="font-semibold">{formatCurrency(productTotal)}</span>
                  </div>
                  {taxRefund > 0 && (
                    <div className="flex justify-between">
                      <span className="text-[var(--admin-text-secondary)]">Tax Refund (GST)</span>
                      <span className="text-emerald-600 font-semibold">
                        + {formatCurrency(taxRefund)}
                      </span>
                    </div>
                  )}
                  {shippingRefund > 0 && (
                    <div className="flex justify-between">
                      <span className="text-[var(--admin-text-secondary)]">
                        Shipping Fee Refund
                      </span>
                      <span className="text-emerald-600 font-semibold">
                        + {formatCurrency(shippingRefund)}
                      </span>
                    </div>
                  )}
                  {restockingFee > 0 && (
                    <div className="flex justify-between">
                      <span className="text-[var(--admin-text-secondary)]">
                        Restocking / Courier Fee Deduction
                      </span>
                      <span className="text-rose-600 font-semibold">
                        - {formatCurrency(restockingFee)}
                      </span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-[var(--admin-border-subtle)] flex justify-between items-center text-[14px]">
                    <span className="font-bold text-[var(--admin-text-primary)]">
                      Net Calculated Payout
                    </span>
                    <span className="font-bold text-[var(--admin-accent)]">
                      {formatCurrency(netRefund)}
                    </span>
                  </div>
                </div>

                <div className="mt-3 p-2.5 rounded-[4px] bg-[var(--admin-surface-muted)] border border-[var(--admin-border-subtle)] text-[11.5px] flex items-center justify-between">
                  <span className="text-[var(--admin-text-secondary)]">Payout Destination:</span>
                  <span className="font-mono font-bold uppercase text-[var(--admin-text-primary)]">
                    {selectedReturn.refundMethod || 'Original Payment Source'}
                  </span>
                </div>
              </div>

              {/* MANUAL SETTLEMENT RECORDING */}
              <div className="admin-card !rounded-[4px] p-4 border border-[var(--admin-border)] space-y-3 bg-[var(--admin-surface)]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--admin-text-tertiary)] block">
                  Record Payout / Settlement
                </span>

                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-semibold text-[var(--admin-text-secondary)] block mb-1">
                      Payable Refund Amount (₹)
                    </label>
                    <input
                      type="number"
                      value={settleAmount}
                      onChange={(e) => setSettleAmount(e.target.value)}
                      className="w-full h-9 px-3 bg-[var(--admin-surface-muted)] border border-[var(--admin-border)] rounded-[4px] text-[13px] font-bold outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-[var(--admin-text-secondary)] block mb-1">
                      Settlement Notes / Reference ID
                    </label>
                    <input
                      type="text"
                      placeholder="Bank UTR / UPI Ref ID / Notes"
                      value={settleNotes}
                      onChange={(e) => setSettleNotes(e.target.value)}
                      className="w-full h-9 px-3 bg-[var(--admin-surface-muted)] border border-[var(--admin-border)] rounded-[4px] text-[12.5px] outline-none"
                    />
                  </div>

                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={handleSettlePayout}
                    className="w-full h-9 bg-[var(--admin-accent)] hover:bg-[var(--admin-accent-dark)] text-white text-[12px] font-bold rounded-[4px] transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">check_circle</span>
                    Save Settlement Record
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ─── DRAWER FOOTER ─── */}
        <div className="p-4 sm:px-6 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:pb-4 border-t border-[var(--admin-border-subtle)] bg-[var(--admin-surface)] flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={() => closeDrawer()}
            className="h-9 px-4 rounded-[4px] border border-[var(--admin-border)] text-[12.5px] font-semibold text-[var(--admin-text-secondary)] hover:bg-[var(--admin-surface-muted)] transition-colors cursor-pointer"
          >
            Close Panel
          </button>

          <button
            type="button"
            onClick={() => {
              closeDrawer();
              navigate(
                selectedReturn.returnType === 'exchange'
                  ? `/admin/exchanges/requests/${selectedReturn._id}`
                  : `/admin/returns/requests/${selectedReturn._id}`,
              );
            }}
            className="h-9 px-4 bg-[var(--admin-accent)] hover:bg-[var(--admin-accent-dark)] text-white text-[12.5px] font-bold rounded-[4px] transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <span>Open Complete Page</span>
            <span className="material-symbols-outlined text-[16px]">open_in_new</span>
          </button>
        </div>
      </motion.aside>

      {/* Lightbox Modal for Photo Proof */}
      <AnimatePresence>
        {lightboxImg && (
          <div
            onClick={() => setLightboxImg(null)}
            className="fixed inset-0 z-[1100] bg-black/80 flex items-center justify-center p-4 cursor-pointer"
          >
            <motion.img
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              src={lightboxImg}
              alt="Preview"
              className="max-w-full max-h-[85vh] rounded-[6px] object-contain shadow-2xl"
            />
          </div>
        )}
      </AnimatePresence>
    </div>,
    document.body,
  );
}
