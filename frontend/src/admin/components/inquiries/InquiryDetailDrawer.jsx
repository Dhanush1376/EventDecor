import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { m as motion, AnimatePresence } from 'framer-motion';
import { customOrderService } from '../../../services/domainServices';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../../../utils/core/errorHelpers';
import { useDraft } from '../../hooks/useDraft';
import { DraftRestoreModal } from '../DraftRestoreModal';
import { UnsavedChangesGuard } from '../UnsavedChangesGuard';
import { EXTERNAL_URLS } from '../../../config/constants';
import { WhatsAppIcon } from '../../../components/ui/WhatsAppIcon';
import { formatCurrency } from '../AdminUIKit';
import AdminCustomerProfileModal from '../AdminCustomerProfileModal';
import { useConfirm } from '../../../context/ConfirmProvider';

const ALL_STATUSES = [
  'Pending',
  'Reviewing',
  'Quote Sent',
  'Approved',
  'In Progress',
  'Ready',
  'Delivered',
  'Cancelled',
];

export function InquiryDetailDrawer({ selectedOrder, setSelectedOrder, refetchOrders, isMobile }) {
  const confirm = useConfirm();
  const chatEndRef = useRef(null);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'quote' | 'chat'
  const [adminMessageText, setAdminMessageText] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);

  // Scroll lock when drawer is active
  useEffect(() => {
    if (!selectedOrder || typeof document === 'undefined') return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [selectedOrder]);

  const {
    formData: quoteData,
    setFormData: setQuoteData,
    deleteDraft,
    hasDraft,
    restoreDraft,
    discardDraft,
    resetData,
    draftStatus,
    showRestoreModal,
    setShowRestoreModal,
    blocker,
  } = useDraft({
    draftKey: selectedOrder ? `admin:inquiry:quote:${selectedOrder._id}` : null,
    module: 'Custom Orders',
    pageTitle: 'Quotation Builder',
    initialData: {
      items: [{ description: 'Custom Decor Setup & Designing', amount: 25000 }],
      tax: 0,
      shipping: 0,
      notes: '',
    },
    enabled: !!selectedOrder,
  });

  // Sync quotation items when order is selected
  useEffect(() => {
    if (selectedOrder && !hasDraft) {
      const items =
        selectedOrder.quotation?.items?.length > 0
          ? selectedOrder.quotation.items.map((it) => ({
              description: it.description,
              amount: it.amount,
            }))
          : [
              {
                description: 'Custom Decor Setup & Designing',
                amount: selectedOrder.budget || 25000,
              },
            ];

      resetData({
        items,
        tax: selectedOrder.quotation?.tax || 0,
        shipping: selectedOrder.quotation?.shipping || 0,
        notes: selectedOrder.quotation?.notes || '',
      });
    }
  }, [selectedOrder, hasDraft, resetData]);

  const itemsSubtotal = useMemo(() => {
    return (quoteData?.items || []).reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
  }, [quoteData?.items]);

  const liveQuoteTotal = useMemo(() => {
    return itemsSubtotal + (Number(quoteData?.tax) || 0) + (Number(quoteData?.shipping) || 0);
  }, [itemsSubtotal, quoteData?.tax, quoteData?.shipping]);

  useEffect(() => {
    if (activeTab === 'chat' && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeTab, selectedOrder?.messages]);

  const handleUpdateStatus = async (id, newStatus) => {
    setUpdatingId(id);
    try {
      const res = await customOrderService.adminUpdateStatus(id, newStatus);
      if (res.success) {
        toast.success(`Inquiry status updated to ${newStatus}`);
        refetchOrders?.();
        if (selectedOrder?._id === id) setSelectedOrder(res.data);
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update status'));
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDispatchQuotation = async () => {
    if (!selectedOrder) return;
    setUpdatingId(selectedOrder._id);
    try {
      const payload = {
        items: quoteData.items.filter((it) => it.description.trim() !== ''),
        tax: Number(quoteData.tax) || 0,
        shipping: Number(quoteData.shipping) || 0,
        notes: quoteData.notes,
        status: 'sent',
      };

      const res = await customOrderService.adminUpdateQuotation(selectedOrder._id, payload);
      if (res.success) {
        toast.success('Quotation sent to customer');
        await deleteDraft();
        refetchOrders?.();
        setSelectedOrder(res.data);
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to compile quotation'));
    } finally {
      setUpdatingId(null);
    }
  };

  const handleSendAdminChatMessage = async (e) => {
    if (e) e.preventDefault();
    if (!adminMessageText.trim() || !selectedOrder) return;

    setIsSendingMessage(true);
    try {
      const res = await customOrderService.postMessage(
        selectedOrder._id,
        adminMessageText.trim(),
        [],
      );
      if (res.success) {
        toast.success('Message sent');
        setAdminMessageText('');
        refetchOrders?.();
        setSelectedOrder(res.data);
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to post message'));
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleArchiveOrder = async (id) => {
    try {
      const res = await customOrderService.adminArchive(id, true);
      if (res.success) {
        toast.success('Order archived');
        refetchOrders?.();
        setSelectedOrder(null);
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to archive order'));
    }
  };

  if (!selectedOrder || typeof document === 'undefined') return null;

  const orderCode =
    selectedOrder.customOrderNumber || `#${selectedOrder._id.slice(-6).toUpperCase()}`;

  const isTerminal = ['completed', 'cancelled', 'delivered'].includes(
    (selectedOrder.status || '').toLowerCase(),
  );

  const handleDeleteOrder = async () => {
    const confirmed = await confirm({
      title: 'Move Custom Order to Recycle Bin?',
      message: `Are you sure you want to move custom order ${orderCode} to the recycle bin? You can restore it later from the Recycle Bin.`,
      confirmLabel: 'Move to Recycle Bin',
      isDestructive: true,
    });
    if (!confirmed) return;

    try {
      await customOrderService.adminSoftDelete(selectedOrder._id);
      toast.success('Custom order moved to recycle bin');
      refetchOrders?.();
      setSelectedOrder(null);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete custom order'));
    }
  };

  const cleanPhone = (selectedOrder.customerPhone || selectedOrder.phone || '').replace(
    /[^0-9]/g,
    '',
  );

  const customerId =
    selectedOrder.userId?._id ||
    selectedOrder.userId?.id ||
    (typeof selectedOrder.userId === 'string' && selectedOrder.userId) ||
    selectedOrder.user?._id ||
    selectedOrder.user?.id ||
    (typeof selectedOrder.user === 'string' && selectedOrder.user);

  const resolvedCustomer = customerId
    ? {
        _id: customerId,
        name: selectedOrder.customerName || selectedOrder.user?.name || 'Customer',
        phone: selectedOrder.customerPhone || selectedOrder.phone || '',
        email: selectedOrder.customerEmail || selectedOrder.email || '',
      }
    : null;

  const eventDateStr = selectedOrder.eventDate
    ? new Date(selectedOrder.eventDate).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : 'TBD';

  const slideDrawer = {
    hidden: isMobile ? { y: '100%', opacity: 0 } : { x: '100%', opacity: 0 },
    show: isMobile ? { y: 0, opacity: 1 } : { x: 0, opacity: 1 },
    exit: isMobile ? { y: '100%', opacity: 0 } : { x: '100%', opacity: 0 },
  };

  const isDark =
    typeof document !== 'undefined' &&
    (document.documentElement.classList.contains('dark') ||
      document.body.classList.contains('dark'));

  const statusOrder = [
    'Pending',
    'Reviewing',
    'Quote Sent',
    'Approved',
    'In Progress',
    'Ready',
    'Delivered',
  ];
  const currentStepIndex = statusOrder.indexOf(selectedOrder.status);

  return createPortal(
    <div className={`admin-section-root ${isDark ? 'dark' : ''}`}>
      {/* Backdrop */}
      <motion.div
        key="admin-inquiry-drawer-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setSelectedOrder(null)}
        className="fixed inset-0 z-[999] cursor-pointer"
        style={{
          background: 'var(--admin-surface-overlay, rgba(60, 54, 42, 0.45))',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
        }}
      />

      {/* Drawer Body */}
      <motion.aside
        key="admin-inquiry-drawer-aside"
        initial="hidden"
        animate="show"
        exit="exit"
        variants={slideDrawer}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="fixed z-[1000] flex flex-col overflow-hidden shadow-[var(--admin-shadow-2xl)] border-[var(--admin-border)] sm:inset-y-0 sm:top-0 sm:bottom-0 sm:right-0 sm:left-auto sm:w-[560px] md:w-[600px] sm:h-full sm:max-h-none sm:rounded-none sm:border-l sm:border-t-0 bottom-0 inset-x-0 max-h-[92vh] h-auto rounded-t-[4px] border-t bg-[var(--admin-surface)] text-[var(--admin-text-primary)]"
        style={{ background: 'var(--admin-surface, #ffffff)' }}
      >
        {/* Drawer Header (Consistent with AdminReturnDetail) */}
        <div className="px-4 sm:px-5 py-3 border-b border-[var(--admin-border-subtle)] flex items-center justify-between gap-2 shrink-0 bg-[var(--admin-surface)]">
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-[14px] sm:text-[15px] font-bold text-[var(--admin-text-primary)] tracking-tight whitespace-nowrap">
                Custom Order Details
              </h3>
              <span className="text-[9.5px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-[4px] border bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800 shrink-0">
                Custom
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-1 leading-none">
              <span
                className="font-mono text-[11.5px] font-medium text-[var(--admin-text-secondary)] select-all"
                title={selectedOrder._id}
              >
                {orderCode}
              </span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(orderCode);
                  toast.success('Order code copied');
                }}
                className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 p-0.5 cursor-pointer transition-colors shrink-0"
                title="Copy Order Code"
              >
                <span className="material-symbols-outlined text-[13px] block">content_copy</span>
              </button>
              {selectedOrder.createdAt && (
                <>
                  <span className="text-stone-300 dark:text-stone-600 select-none text-[11px]">
                    •
                  </span>
                  <span className="text-[10.5px] font-medium text-[var(--admin-text-secondary)] flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px] text-[var(--admin-text-tertiary)]">
                      schedule
                    </span>
                    <span>
                      {new Date(selectedOrder.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {cleanPhone && (
              <a
                href={`${EXTERNAL_URLS.WHATSAPP_BASE}/${cleanPhone}`}
                target="_blank"
                rel="noopener noreferrer"
                className="admin-btn-icon hover:text-emerald-600 !rounded-[4px] w-8 h-8"
                title="WhatsApp"
              >
                <WhatsAppIcon className="w-[15px] h-[15px]" />
              </a>
            )}
            {selectedOrder.customerEmail && (
              <a
                href={`mailto:${selectedOrder.customerEmail}`}
                className="admin-btn-icon hover:text-[var(--admin-accent)] !rounded-[4px] w-8 h-8"
                title="Email"
              >
                <span className="material-symbols-outlined text-[17px]">mail</span>
              </a>
            )}
            <button
              onClick={() => handleArchiveOrder(selectedOrder._id)}
              className="admin-btn-icon hover:text-[var(--admin-error)] !rounded-[4px] w-8 h-8"
              title="Archive"
            >
              <span className="material-symbols-outlined text-[17px]">archive</span>
            </button>
            {isTerminal && (
              <button
                onClick={handleDeleteOrder}
                className="admin-btn-icon text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 !rounded-[4px] w-8 h-8"
                title="Move to Recycle Bin"
              >
                <span className="material-symbols-outlined text-[18px]">delete_outline</span>
              </button>
            )}
            <button
              onClick={() => setSelectedOrder(null)}
              className="admin-btn-icon !rounded-[4px] w-8 h-8"
              title="Close"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </div>

        {/* Sub-Navigation Tabs: Sleek compact 3-column pill bar */}
        <div className="px-4 py-1.5 border-b border-[var(--admin-border-subtle)] bg-[var(--admin-surface)] flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`flex-1 min-w-0 h-7 px-1.5 rounded-[4px] text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer truncate ${
              activeTab === 'overview'
                ? 'bg-[var(--admin-accent)] text-white shadow-xs'
                : 'text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] hover:bg-[var(--admin-surface-muted)]'
            }`}
          >
            <span className="material-symbols-outlined text-[14px] shrink-0">info</span>
            <span className="truncate">Details</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('quote')}
            className={`flex-1 min-w-0 h-7 px-1.5 rounded-[4px] text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer truncate ${
              activeTab === 'quote'
                ? 'bg-[var(--admin-accent)] text-white shadow-xs'
                : 'text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] hover:bg-[var(--admin-surface-muted)]'
            }`}
          >
            <span className="material-symbols-outlined text-[14px] shrink-0">request_quote</span>
            <span className="truncate">Quote</span>
            {liveQuoteTotal > 0 && (
              <span
                className={`text-[8.5px] px-1 py-0.2 rounded font-bold shrink-0 ${
                  activeTab === 'quote'
                    ? 'bg-white/20 text-white'
                    : 'bg-[var(--admin-accent-light)] text-[var(--admin-accent)]'
                }`}
              >
                {formatCurrency(liveQuoteTotal)}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('chat')}
            className={`flex-1 min-w-0 h-7 px-1.5 rounded-[4px] text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer truncate ${
              activeTab === 'chat'
                ? 'bg-[var(--admin-accent)] text-white shadow-xs'
                : 'text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] hover:bg-[var(--admin-surface-muted)]'
            }`}
          >
            <span className="material-symbols-outlined text-[14px] shrink-0">chat</span>
            <span className="truncate">Chat</span>
            {selectedOrder.messages?.length > 0 && (
              <span
                className={`text-[8.5px] px-1 py-0.2 rounded font-bold shrink-0 ${
                  activeTab === 'chat'
                    ? 'bg-white/20 text-white'
                    : 'bg-[var(--admin-surface-muted)] text-[var(--admin-text-primary)]'
                }`}
              >
                {selectedOrder.messages.length}
              </span>
            )}
          </button>
        </div>

        {/* Drawer Scroll Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 custom-scrollbar text-left bg-[var(--admin-bg)]">
          {/* ══════════════ TAB 1: DETAILS & SCOPE ══════════════ */}
          {activeTab === 'overview' && (
            <>
              {/* Lifecycle Progression Stepper */}
              <div className="admin-card !rounded-[4px] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider">
                    Pipeline Progression
                  </span>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-[4px] border ${
                      selectedOrder.status === 'Approved' || selectedOrder.status === 'Delivered'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : selectedOrder.status === 'Pending'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : selectedOrder.status === 'Cancelled'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                    }`}
                  >
                    {selectedOrder.status}
                  </span>
                </div>

                {selectedOrder.status !== 'Cancelled' && (
                  <div className="py-1">
                    <div className="flex items-center justify-between relative">
                      <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-[var(--admin-border)] -translate-y-1/2 z-0" />
                      <div
                        className="absolute top-1/2 left-0 h-[2px] bg-[var(--admin-accent)] -translate-y-1/2 z-0 transition-all duration-300"
                        style={{
                          width:
                            currentStepIndex >= 0
                              ? `${(currentStepIndex / (statusOrder.length - 1)) * 100}%`
                              : '0%',
                        }}
                      />

                      {statusOrder.map((st, idx) => {
                        const isPassed = currentStepIndex >= idx;
                        const isCurrent = currentStepIndex === idx;
                        return (
                          <div
                            key={st}
                            className="relative z-10 flex flex-col items-center group cursor-pointer"
                            onClick={() => handleUpdateStatus(selectedOrder._id, st)}
                            title={`Advance to ${st}`}
                          >
                            <div
                              className={`w-3.5 h-3.5 rounded-full flex items-center justify-center transition-all ${
                                isCurrent
                                  ? 'bg-[var(--admin-accent)] ring-4 ring-[var(--admin-accent-light)]'
                                  : isPassed
                                    ? 'bg-[var(--admin-accent)]'
                                    : 'bg-[var(--admin-surface)] border-2 border-[var(--admin-border)]'
                              }`}
                            >
                              {isPassed && !isCurrent && (
                                <span className="material-symbols-outlined text-[9px] text-white">
                                  check
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex justify-between text-[8.5px] font-bold text-[var(--admin-text-secondary)] mt-1.5 uppercase tracking-tight">
                      <span>Pending</span>
                      <span>Quote</span>
                      <span>Approved</span>
                      <span>Delivered</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Customer & Event Profile Card */}
              <div className="admin-card !rounded-[4px] p-4 space-y-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div
                    onClick={() => customerId && setShowCustomerModal(true)}
                    className={`min-w-0 ${customerId ? 'cursor-pointer group' : ''}`}
                    title={customerId ? 'Click to view customer profile' : undefined}
                  >
                    <p className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider">
                      Customer & Event Profile
                    </p>
                    <h4
                      className={`text-[14px] font-bold text-[var(--admin-text-primary)] mt-0.5 flex items-center gap-1.5 ${customerId ? 'group-hover:text-[var(--admin-accent)] transition-colors' : ''}`}
                    >
                      <span>{selectedOrder.customerName || 'Customer'}</span>
                      {customerId && (
                        <span className="material-symbols-outlined text-[13px] text-[var(--admin-text-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity">
                          open_in_new
                        </span>
                      )}
                    </h4>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {customerId && (
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
                    {cleanPhone && (
                      <a
                        href={`${EXTERNAL_URLS.WHATSAPP_BASE}/${cleanPhone}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="admin-badge admin-badge-success !rounded-[4px] flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity h-7"
                      >
                        <WhatsAppIcon className="w-[13px] h-[13px]" />
                        WhatsApp
                      </a>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-[12px] pt-3 border-t border-[var(--admin-border-subtle)]">
                  <div>
                    <p className="text-[var(--admin-text-tertiary)] font-medium text-[9.5px] uppercase">
                      Phone
                    </p>
                    <p className="font-bold text-[var(--admin-text-primary)] flex items-center gap-1 mt-0.5">
                      <span className="material-symbols-outlined text-[14px] text-[var(--admin-text-tertiary)]">
                        call
                      </span>
                      {selectedOrder.customerPhone || selectedOrder.phone || 'N/A'}
                    </p>
                  </div>

                  <div>
                    <p className="text-[var(--admin-text-tertiary)] font-medium text-[9.5px] uppercase">
                      Email
                    </p>
                    <p className="font-bold text-[var(--admin-text-primary)] flex items-center gap-1 mt-0.5 truncate">
                      <span className="material-symbols-outlined text-[14px] text-[var(--admin-text-tertiary)] shrink-0">
                        mail
                      </span>
                      <span className="truncate">{selectedOrder.customerEmail || 'N/A'}</span>
                    </p>
                  </div>

                  <div>
                    <p className="text-[var(--admin-text-tertiary)] font-medium text-[9.5px] uppercase">
                      Event Date
                    </p>
                    <p className="font-bold text-[var(--admin-text-primary)] flex items-center gap-1 mt-0.5">
                      <span className="material-symbols-outlined text-[14px] text-[var(--admin-text-tertiary)]">
                        calendar_today
                      </span>
                      {eventDateStr}
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-[var(--admin-text-tertiary)] font-medium text-[9.5px] uppercase">
                        Location / City
                      </p>
                      {selectedOrder.city && (
                        <a
                          href={`https://maps.google.com/?q=${encodeURIComponent(selectedOrder.city)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-0.5 text-[10.5px] font-semibold text-[var(--admin-accent)] hover:underline cursor-pointer"
                          title="Open location in Google Maps"
                        >
                          <span className="material-symbols-outlined text-[12px]">map</span>
                          <span>Maps</span>
                        </a>
                      )}
                    </div>
                    <p className="font-bold text-[var(--admin-text-primary)] flex items-center gap-1 mt-0.5">
                      <span className="material-symbols-outlined text-[14px] text-[var(--admin-text-tertiary)]">
                        location_on
                      </span>
                      {selectedOrder.city || 'Any Location'}
                    </p>
                  </div>

                  <div>
                    <p className="text-[var(--admin-text-tertiary)] font-medium text-[9.5px] uppercase">
                      Occasion / Scope
                    </p>
                    <p className="font-bold text-[var(--admin-text-primary)] flex items-center gap-1 mt-0.5 truncate">
                      <span className="material-symbols-outlined text-[14px] text-[var(--admin-text-tertiary)] shrink-0">
                        celebration
                      </span>
                      <span className="truncate">{selectedOrder.occasion || 'Custom Request'}</span>
                    </p>
                  </div>

                  <div>
                    <p className="text-[var(--admin-text-tertiary)] font-medium text-[9.5px] uppercase">
                      Booking Type
                    </p>
                    <p className="font-bold text-[var(--admin-text-primary)] flex items-center gap-1 mt-0.5">
                      <span className="material-symbols-outlined text-[14px] text-[var(--admin-text-tertiary)]">
                        design_services
                      </span>
                      {selectedOrder.bookingType || selectedOrder.customOrderType || 'Bespoke'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Custom Scope & Dynamic Form Responses Card */}
              <div className="admin-card !rounded-[4px] p-4 space-y-3.5">
                <p className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider">
                  Scope & Custom Specifications
                </p>

                {/* Target Product Reference */}
                {selectedOrder.productSnapshot && (
                  <div className="flex items-center gap-3 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border-subtle)] p-2.5 rounded-[4px]">
                    {selectedOrder.productSnapshot.imageSrc && (
                      <img
                        src={selectedOrder.productSnapshot.imageSrc}
                        alt=""
                        className="w-11 h-11 rounded-[4px] object-cover border border-[var(--admin-border-subtle)] bg-[var(--admin-surface)] shrink-0"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--admin-text-tertiary)] block">
                        Referenced Base Product
                      </span>
                      <p className="text-[12px] font-bold text-[var(--admin-text-primary)] truncate">
                        {selectedOrder.productSnapshot.title}
                      </p>
                      {selectedOrder.productSnapshot.productId && (
                        <a
                          href={`/product/${selectedOrder.productSnapshot.productId}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10.5px] text-[var(--admin-accent)] hover:underline inline-flex items-center gap-1 mt-0.5"
                        >
                          <span>View Storefront Product</span>
                          <span className="material-symbols-outlined text-[12px]">open_in_new</span>
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Customer Special Requirements */}
                {selectedOrder.customRequirements && (
                  <div className="p-3 rounded-[4px] bg-[var(--admin-bg-subtle)] border-l-2 border-[var(--admin-accent)] space-y-1">
                    <span className="text-[9.5px] font-bold uppercase tracking-wider text-[var(--admin-accent)] block">
                      Customer's Stated Requirements
                    </span>
                    <p className="text-[12px] text-[var(--admin-text-primary)] leading-relaxed italic">
                      "{selectedOrder.customRequirements}"
                    </p>
                  </div>
                )}

                {/* Dynamic Form Responses */}
                {selectedOrder.dynamicData && Object.keys(selectedOrder.dynamicData).length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-[var(--admin-border-subtle)]">
                    <span className="text-[9.5px] font-bold uppercase tracking-wider text-[var(--admin-text-tertiary)] flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">list_alt</span>
                      Dynamic Form Responses
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-[var(--admin-bg-subtle)] p-3 rounded-[4px] border border-[var(--admin-border-subtle)]">
                      {Object.entries(selectedOrder.dynamicData).map(([key, value], i) => {
                        const formatKey = (k) =>
                          k.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
                        const isFileArray =
                          Array.isArray(value) &&
                          value.length > 0 &&
                          typeof value[0] === 'string' &&
                          value[0].match(/\.(jpeg|jpg|gif|png|webp|heic|pdf|doc)/i);

                        return (
                          <div key={i} className="min-w-0">
                            <span className="text-[9px] uppercase tracking-wider text-[var(--admin-text-tertiary)] font-bold block mb-0.5">
                              {formatKey(key)}
                            </span>
                            {isFileArray ? (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {value.map((file, idx) => {
                                  const isImg = file.match(/\.(jpeg|jpg|gif|png|webp|heic)/i);
                                  return (
                                    <a
                                      key={idx}
                                      href={file}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="w-9 h-9 rounded-[4px] overflow-hidden border border-[var(--admin-border)] block bg-white shrink-0 hover:scale-105 transition-transform"
                                    >
                                      {isImg ? (
                                        <img
                                          src={file}
                                          alt=""
                                          className="w-full h-full object-cover"
                                        />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                          <span className="material-symbols-outlined text-[14px] text-[var(--admin-text-secondary)]">
                                            description
                                          </span>
                                        </div>
                                      )}
                                    </a>
                                  );
                                })}
                              </div>
                            ) : (
                              <span className="font-bold text-[var(--admin-text-primary)] text-[11.5px] block break-words">
                                {Array.isArray(value)
                                  ? value.join(', ')
                                  : typeof value === 'boolean'
                                    ? value
                                      ? 'Yes'
                                      : 'No'
                                    : String(value || 'N/A')}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Inspiration Gallery */}
                {selectedOrder.inspirationImages?.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-[var(--admin-border-subtle)]">
                    <span className="text-[9.5px] font-bold uppercase tracking-wider text-[var(--admin-text-tertiary)] flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">image</span>
                      Inspiration Attachments ({selectedOrder.inspirationImages.length})
                    </span>
                    <div className="grid grid-cols-4 gap-2">
                      {selectedOrder.inspirationImages.map((img, idx) => (
                        <a
                          key={idx}
                          href={img}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="aspect-square rounded-[4px] overflow-hidden border border-[var(--admin-border)] hover:border-[var(--admin-accent)] transition-all block bg-white"
                        >
                          <img src={img} alt="Inspiration" className="w-full h-full object-cover" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Terminal Actions Card */}
              {isTerminal && (
                <div className="admin-card !rounded-[4px] p-4 bg-rose-500/[0.03] border border-rose-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-bold text-rose-700 dark:text-rose-400">
                      Order Concluded ({selectedOrder.status})
                    </p>
                    <p className="text-[10.5px] text-[var(--admin-text-secondary)] mt-0.5">
                      This custom order is in a terminal state. You can safely move it to the
                      Recycle Bin.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleDeleteOrder}
                    className="px-3.5 h-8 rounded-[4px] bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 shrink-0 transition-colors shadow-xs cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[15px]">delete_outline</span>
                    Move to Recycle Bin
                  </button>
                </div>
              )}
            </>
          )}

          {/* ══════════════ TAB 2: QUOTATION BUILDER ══════════════ */}
          {activeTab === 'quote' && (
            <div className="admin-card !rounded-[4px] p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider">
                    Quotation Builder
                  </p>
                  <h4 className="text-[14px] font-bold text-[var(--admin-text-primary)] mt-0.5">
                    Pricing & Deliverables Breakdown
                  </h4>
                </div>
                <span className="text-[10px] text-[var(--admin-text-secondary)] font-medium">
                  {draftStatus === 'saving'
                    ? 'Saving draft...'
                    : draftStatus === 'saved'
                      ? 'Draft saved'
                      : ''}
                </span>
              </div>

              {/* 2x2 Financial Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-2.5 bg-[var(--admin-surface-muted)] rounded-[4px] border border-[var(--admin-border)]">
                  <span className="text-[9px] uppercase font-bold text-[var(--admin-text-tertiary)] tracking-wider block">
                    Items Total
                  </span>
                  <p className="text-[13px] font-bold text-[var(--admin-text-primary)] mt-0.5">
                    {formatCurrency(itemsSubtotal)}
                  </p>
                </div>

                <div className="p-2.5 bg-[var(--admin-surface-muted)] rounded-[4px] border border-[var(--admin-border)]">
                  <span className="text-[9px] uppercase font-bold text-[var(--admin-text-tertiary)] tracking-wider block">
                    Taxes
                  </span>
                  <p className="text-[13px] font-bold text-[var(--admin-text-primary)] mt-0.5">
                    {formatCurrency(Number(quoteData.tax) || 0)}
                  </p>
                </div>

                <div className="p-2.5 bg-[var(--admin-surface-muted)] rounded-[4px] border border-[var(--admin-border)]">
                  <span className="text-[9px] uppercase font-bold text-[var(--admin-text-tertiary)] tracking-wider block">
                    Shipping/Setup
                  </span>
                  <p className="text-[13px] font-bold text-[var(--admin-text-primary)] mt-0.5">
                    {formatCurrency(Number(quoteData.shipping) || 0)}
                  </p>
                </div>

                <div className="p-2.5 bg-[var(--admin-accent-light)] rounded-[4px] border border-[var(--admin-accent-muted)]">
                  <span className="text-[9px] uppercase font-bold text-[var(--admin-accent)] tracking-wider block">
                    Grand Total
                  </span>
                  <p className="text-[13px] font-bold text-[var(--admin-accent)] mt-0.5">
                    {formatCurrency(liveQuoteTotal)}
                  </p>
                </div>
              </div>

              {/* Itemized Deliverables List */}
              <div className="space-y-2 pt-2 border-t border-[var(--admin-border-subtle)]">
                <span className="text-[9.5px] font-bold uppercase tracking-wider text-[var(--admin-text-tertiary)] block">
                  Line Items
                </span>

                {quoteData.items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="w-5 text-[10px] font-bold font-mono text-[var(--admin-text-tertiary)] text-center shrink-0">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => {
                        setQuoteData((prev) => {
                          const next = [...prev.items];
                          next[idx] = { ...next[idx], description: e.target.value };
                          return { ...prev, items: next };
                        });
                      }}
                      placeholder="Deliverable description (e.g. Backdrop Floral Arch)"
                      className="flex-1 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-[4px] text-[12px] px-2.5 h-8 outline-none text-[var(--admin-text-primary)] min-w-0"
                    />
                    <div className="relative w-24 sm:w-28 shrink-0">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[11px] text-[var(--admin-text-tertiary)]">
                        ₹
                      </span>
                      <input
                        type="number"
                        value={item.amount === 0 && item.amount !== '0' ? '' : item.amount}
                        onChange={(e) => {
                          setQuoteData((prev) => {
                            const next = [...prev.items];
                            next[idx] = {
                              ...next[idx],
                              amount: e.target.value === '' ? '' : Number(e.target.value),
                            };
                            return { ...prev, items: next };
                          });
                        }}
                        placeholder="0"
                        className="w-full bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-[4px] text-right text-[12px] pl-5 pr-2 h-8 outline-none text-[var(--admin-text-primary)] font-bold"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setQuoteData((prev) => ({
                          ...prev,
                          items: prev.items.filter((_, i) => i !== idx),
                        }))
                      }
                      className="w-8 h-8 rounded-[4px] text-[var(--admin-text-tertiary)] hover:text-[var(--admin-error)] hover:bg-[var(--admin-error-light)] flex items-center justify-center cursor-pointer transition-colors shrink-0"
                      title="Remove Item"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() =>
                    setQuoteData((prev) => ({
                      ...prev,
                      items: [...prev.items, { description: '', amount: 0 }],
                    }))
                  }
                  className="w-full py-2 border border-dashed border-[var(--admin-border)] hover:border-[var(--admin-accent)] text-[var(--admin-accent)] rounded-[4px] text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer mt-1"
                >
                  <span className="material-symbols-outlined text-[15px]">add</span>
                  Add Line Item
                </button>
              </div>

              {/* Tax & Shipping Inputs */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[var(--admin-border-subtle)]">
                <div>
                  <label className="text-[9.5px] font-bold uppercase text-[var(--admin-text-tertiary)] tracking-wider block mb-1">
                    Tax / GST (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[11px] text-[var(--admin-text-tertiary)]">
                      ₹
                    </span>
                    <input
                      type="number"
                      value={quoteData.tax === 0 && quoteData.tax !== '0' ? '' : quoteData.tax}
                      onChange={(e) =>
                        setQuoteData((prev) => ({
                          ...prev,
                          tax: e.target.value === '' ? '' : Number(e.target.value),
                        }))
                      }
                      className="w-full bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-[4px] text-right text-[12px] pl-5 pr-2 h-8 outline-none text-[var(--admin-text-primary)]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[9.5px] font-bold uppercase text-[var(--admin-text-tertiary)] tracking-wider block mb-1">
                    Shipping & Setup (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[11px] text-[var(--admin-text-tertiary)]">
                      ₹
                    </span>
                    <input
                      type="number"
                      value={
                        quoteData.shipping === 0 && quoteData.shipping !== '0'
                          ? ''
                          : quoteData.shipping
                      }
                      onChange={(e) =>
                        setQuoteData((prev) => ({
                          ...prev,
                          shipping: e.target.value === '' ? '' : Number(e.target.value),
                        }))
                      }
                      className="w-full bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-[4px] text-right text-[12px] pl-5 pr-2 h-8 outline-none text-[var(--admin-text-primary)]"
                    />
                  </div>
                </div>
              </div>

              {/* Terms / Payment Notes */}
              <div className="space-y-1 pt-1">
                <label className="text-[9.5px] font-bold uppercase text-[var(--admin-text-tertiary)] tracking-wider block">
                  Special Terms / Payment Schedule Notes
                </label>
                <input
                  type="text"
                  value={quoteData.notes}
                  onChange={(e) => setQuoteData((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="E.g. 50% advance booking deposit required, balance on event date..."
                  className="w-full bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-[4px] text-[12px] px-2.5 h-8 outline-none text-[var(--admin-text-primary)]"
                />
              </div>

              {/* Dispatch Action Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleDispatchQuotation}
                  disabled={updatingId === selectedOrder._id}
                  className="w-full h-10 rounded-[4px] bg-[var(--admin-accent)] hover:bg-[var(--admin-accent-dark)] text-white text-[12px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98 disabled:opacity-50"
                >
                  {updatingId === selectedOrder._id ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span className="material-symbols-outlined text-[17px]">send</span>
                  )}
                  Send Quotation to Customer
                </button>
              </div>
            </div>
          )}

          {/* ══════════════ TAB 3: CUSTOMER CHAT ══════════════ */}
          {activeTab === 'chat' && (
            <div className="admin-card !rounded-[4px] p-4 flex flex-col h-[520px]">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--admin-border-subtle)] shrink-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--admin-text-tertiary)] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[15px]">chat</span>
                  Customer Chat History
                </span>
                <span className="text-[10px] text-[var(--admin-text-secondary)]">
                  {selectedOrder.messages?.length || 0} messages
                </span>
              </div>

              {/* Message Feed */}
              <div className="flex-1 overflow-y-auto space-y-2.5 p-3 bg-[var(--admin-surface-muted)] rounded-[4px] my-3 border border-[var(--admin-border-subtle)]">
                {selectedOrder.messages?.length > 0 ? (
                  selectedOrder.messages.map((msg, i) => {
                    const isMe = msg.sender === 'admin';
                    return (
                      <div
                        key={i}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-[4px] p-2.5 text-[11px] ${
                            isMe
                              ? 'bg-[var(--admin-accent)] text-white'
                              : 'bg-[var(--admin-surface)] text-[var(--admin-text-primary)] border border-[var(--admin-border-subtle)]'
                          }`}
                        >
                          <span
                            className={`text-[9px] font-bold block mb-0.5 uppercase ${
                              isMe ? 'text-white/80' : 'text-[var(--admin-accent)]'
                            }`}
                          >
                            {isMe ? 'Staff' : msg.senderName || 'Customer'}
                          </span>
                          <p>{msg.text}</p>
                        </div>
                        <span className="text-[8.5px] text-[var(--admin-text-tertiary)] mt-0.5 px-1">
                          {msg.createdAt
                            ? new Date(msg.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : ''}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-[11px] text-[var(--admin-text-secondary)] italic text-center py-12">
                    No chat messages exchanged yet. Use the input below to reach out to the
                    customer.
                  </p>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSendAdminChatMessage} className="flex gap-2 shrink-0">
                <input
                  type="text"
                  value={adminMessageText}
                  onChange={(e) => setAdminMessageText(e.target.value)}
                  placeholder="Type message to client..."
                  className="flex-1 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-[4px] px-2.5 h-9 text-[11.5px] outline-none text-[var(--admin-text-primary)]"
                />
                <button
                  type="submit"
                  disabled={isSendingMessage || !adminMessageText.trim()}
                  className="px-3.5 h-9 rounded-[4px] bg-[var(--admin-accent)] text-white text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[14px]">send</span>
                  Send
                </button>
              </form>
            </div>
          )}
        </div>

        {/* ══════════════ FIXED BOTTOM BAR: ALWAYS VISIBLE TO UPDATE STATUS & CHAT ══════════════ */}
        <div className="sticky bottom-0 inset-x-0 z-30 px-4 py-3 bg-[var(--admin-surface)] border-t border-[var(--admin-border)] shadow-[0_-4px_16px_rgba(0,0,0,0.06)] flex items-center justify-between gap-2 shrink-0">
          {/* Status Controls */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="hidden sm:inline text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider shrink-0">
              Status:
            </span>

            {selectedOrder.status === 'Pending' ? (
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <button
                  type="button"
                  onClick={() => handleUpdateStatus(selectedOrder._id, 'Approved')}
                  disabled={updatingId === selectedOrder._id}
                  className="flex-1 h-9 rounded-[4px] bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50 truncate"
                >
                  <span className="material-symbols-outlined text-[14px]">check</span>
                  <span>Approve</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateStatus(selectedOrder._id, 'Cancelled')}
                  disabled={updatingId === selectedOrder._id}
                  className="px-2.5 h-9 rounded-[4px] border border-rose-200 text-rose-600 hover:bg-rose-50 text-[11px] font-bold uppercase tracking-wider cursor-pointer disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            ) : (
              <div className="relative flex-1 min-w-0 max-w-[210px]">
                <select
                  value={selectedOrder.status}
                  onChange={(e) => handleUpdateStatus(selectedOrder._id, e.target.value)}
                  disabled={updatingId === selectedOrder._id}
                  className="w-full h-9 rounded-[4px] pl-2.5 pr-7 bg-[var(--admin-surface-muted)] border border-[var(--admin-border)] text-[11px] font-bold uppercase tracking-wider text-[var(--admin-text-primary)] cursor-pointer appearance-none truncate"
                >
                  {ALL_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
                <span className="material-symbols-outlined absolute right-1.5 top-1/2 -translate-y-1/2 text-[14px] text-[var(--admin-text-tertiary)] pointer-events-none">
                  expand_more
                </span>
              </div>
            )}
          </div>

          {/* Quick Chat & Action Controls */}
          <div className="flex items-center gap-1.5 shrink-0">
            {cleanPhone && (
              <a
                href={`${EXTERNAL_URLS.WHATSAPP_BASE}/${cleanPhone}`}
                target="_blank"
                rel="noopener noreferrer"
                className="h-9 px-2.5 rounded-[4px] bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 text-[11px] font-bold cursor-pointer hover:opacity-80"
                title="Chat on WhatsApp"
              >
                <WhatsAppIcon className="w-[14px] h-[14px]" />
                <span className="hidden sm:inline">WhatsApp</span>
              </a>
            )}

            <button
              type="button"
              onClick={() => setActiveTab(activeTab === 'chat' ? 'overview' : 'chat')}
              className={`h-9 px-3 rounded-[4px] flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider cursor-pointer border transition-colors ${
                activeTab === 'chat'
                  ? 'bg-[var(--admin-accent)] text-white border-transparent'
                  : 'bg-[var(--admin-surface-muted)] text-[var(--admin-text-primary)] border-[var(--admin-border)] hover:border-[var(--admin-border-strong)]'
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">chat</span>
              <span>{activeTab === 'chat' ? 'Close Chat' : 'Chat'}</span>
            </button>
          </div>
        </div>
      </motion.aside>

      {/* DRAFT RESTORE & UNSAVED GUARDS */}
      <DraftRestoreModal
        isOpen={showRestoreModal}
        onClose={() => setShowRestoreModal(false)}
        onRestore={restoreDraft}
        onDiscard={discardDraft}
      />
      <UnsavedChangesGuard blocker={blocker} />

      {/* Customer 360 Profile Modal */}
      <AnimatePresence>
        {showCustomerModal && resolvedCustomer && (
          <AdminCustomerProfileModal
            customer={resolvedCustomer}
            onClose={() => setShowCustomerModal(false)}
          />
        )}
      </AnimatePresence>
    </div>,
    document.body,
  );
}
