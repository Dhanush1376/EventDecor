import { useEffect, useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { customOrderService } from '../../services/domainServices';
import { useAdmin } from '../context/AdminContext';
import toast from 'react-hot-toast';
import logger from '../../utils/logger';
import { SkeletonDashboard } from '../components/AdminUIKit';
import { getErrorMessage } from '../../utils/errorHelpers';
import { useDraft } from '../hooks/useDraft';
import { DraftRestoreModal } from '../components/DraftRestoreModal';
import { DraftStatusIndicator } from '../components/DraftStatusIndicator';
import { UnsavedChangesGuard } from '../components/UnsavedChangesGuard';
import { AdminCustomOrderConfig } from '../components/AdminCustomOrderConfig';

const fadeUp = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } };

export function AdminInquiries() {
  const { searchQuery } = useAdmin();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  // Workspace tabs: 'active' (Orders List), 'config' (Edit Form Options)
  const [currentWorkspace, setCurrentWorkspace] = useState('active');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedOrder, setSelectedOrder] = useState(null);

  const [adminMessageText, setAdminMessageText] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const chatEndRef = useRef(null);

  // ─── INTERNAL ADMIN NOTES ───
  const [internalNoteText, setInternalNoteText] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);

  // ─── DYNAMIC FORM OPTIONS ───
  const [cmsConfig, setCmsConfig] = useState(null);
  const [isSavingCMS, setIsSavingCMS] = useState(false);

  // ─── QUOTATION BUILDER STATES (Draft Enabled) ───
  const {
    formData: quoteData,
    setFormData: setQuoteData,
    deleteDraft,
    hasDraft,
    restoreDraft,
    discardDraft,
    resetData,
    draftStatus,
    lastSavedAt,
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

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Sync active lists and form options
  const fetchAdminWorkspaceData = async () => {
    setLoading(true);
    try {
      const res = await customOrderService.adminGetAll({ archived: 'false' });
      if (res.success) {
        setOrders(res.data?.items || res.data || []);
      } else {
        setOrders(res.items || res || []);
      }

      const configRes = await customOrderService.getConfig();
      if (configRes?.success) {
        setCmsConfig(configRes.data);
      } else {
        setCmsConfig(configRes);
      }
    } catch (err) {
      logger.error('AdminInquiries fetch error:', err);
      toast.error('Failed to load custom orders list: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => {
      fetchAdminWorkspaceData();
    }, 0);
    return () => clearTimeout(t);
  }, []);

  // Scroll chat feed
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedOrder?.messages]);

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

  // Compute estimate summaries live
  const liveQuoteTotal = useMemo(() => {
    const sum = quoteData.items.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
    return sum + Number(quoteData.tax) + Number(quoteData.shipping);
  }, [quoteData.items, quoteData.tax, quoteData.shipping]);

  // ─── ADMIN PIPELINE ACTIONS ───
  const handleUpdateStatus = async (id, newStatus) => {
    setUpdatingId(id);
    try {
      const res = await customOrderService.adminUpdateStatus(id, newStatus);
      if (res.success) {
        toast.success(`Order status updated to: ${newStatus}`);
        setOrders((prev) => prev.map((o) => (o._id === id ? res.data : o)));
        if (selectedOrder?._id === id) setSelectedOrder(res.data);
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update status'));
    } finally {
      setUpdatingId(null);
    }
  };

  const handleUpdatePriority = async (id, newPriority) => {
    try {
      const res = await customOrderService.adminUpdatePriority(id, newPriority);
      if (res.success) {
        toast.success(`Priority set to ${newPriority.toUpperCase()}`);
        setOrders((prev) => prev.map((o) => (o._id === id ? res.data : o)));
        if (selectedOrder?._id === id) setSelectedOrder(res.data);
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to change priority'));
    }
  };

  const handleSaveAdminNotes = async (id, notesVal) => {
    try {
      const res = await customOrderService.adminUpdateNotes(id, notesVal);
      if (res.success) {
        toast.success('Internal notes saved');
        setOrders((prev) => prev.map((o) => (o._id === id ? res.data : o)));
        if (selectedOrder?._id === id) setSelectedOrder(res.data);
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to save internal notes'));
    }
  };

  const handleAddInternalNote = async (e) => {
    if (e) e.preventDefault();
    if (!internalNoteText.trim() || !selectedOrder) return;

    setIsAddingNote(true);
    try {
      const res = await customOrderService.adminAddInternalNote(
        selectedOrder._id,
        internalNoteText.trim(),
      );
      if (res.success) {
        toast.success('Internal note added');
        setInternalNoteText('');
        setOrders((prev) => prev.map((o) => (o._id === selectedOrder._id ? res.data : o)));
        setSelectedOrder(res.data);
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to add note'));
    } finally {
      setIsAddingNote(false);
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
        toast.success('Quote sent');
        await deleteDraft();
        setOrders((prev) => prev.map((o) => (o._id === selectedOrder._id ? res.data : o)));
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
      const res = await customOrderService.postMessage(selectedOrder._id, adminMessageText.trim());
      if (res.success) {
        setSelectedOrder(res.data);
        setAdminMessageText('');
        setOrders((prev) => prev.map((o) => (o._id === selectedOrder._id ? res.data : o)));
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to send message'));
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleArchiveOrder = async (id) => {
    try {
      const res = await customOrderService.adminArchive(id, true);
      if (res.success) {
        toast.success('Order archived');
        setOrders((prev) => prev.filter((o) => o._id !== id));
        setSelectedOrder(null);
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to archive order'));
    }
  };

  const handleSaveCMSConfig = async () => {
    if (!cmsConfig) return;
    setIsSavingCMS(true);
    try {
      const res = await customOrderService.updateConfig(cmsConfig);
      if (res.success) {
        toast.success('Form options saved');
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to save storefront options'));
    } finally {
      setIsSavingCMS(false);
    }
  };

  // ─── ANALYTICS SUMMARIES ───
  const stats = useMemo(() => {
    const total = orders.length;
    const pending = orders.filter((o) => o.status === 'Pending').length;
    const quotesSent = orders.filter((o) => o.status === 'Quote Sent').length;
    const approved = orders.filter((o) => o.status === 'Approved').length;
    const valuation = orders.reduce((sum, o) => sum + (o.quotation?.total || 0), 0);
    return { total, pending, quotesSent, approved, valuation };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    let list = orders;

    if (statusFilter !== 'All') {
      list = list.filter((o) => o.status === statusFilter);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (o) =>
          (o.customerName || '').toLowerCase().includes(q) ||
          (o.customerEmail || '').toLowerCase().includes(q) ||
          (o.occasion || '').toLowerCase().includes(q) ||
          (o.productType || '').toLowerCase().includes(q) ||
          (o.city || '').toLowerCase().includes(q) ||
          (o._id || '').toLowerCase().includes(q),
      );
    }
    return list;
  }, [orders, statusFilter, searchQuery]);

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.05 } } }}
      className="max-w-[1440px] mx-auto space-y-6  text-[var(--admin-text-primary)]"
    >
      {loading ? (
        <SkeletonDashboard />
      ) : (
        <>
          {/* Page Header Area */}
          <motion.div
            variants={fadeUp}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[var(--admin-border)] pb-5"
          >
            <div>
              <h2 className="text-[22px] font-bold text-[var(--admin-text-primary)] tracking-tight">
                Custom Orders Manager
              </h2>
              <p className="text-[12px] text-[var(--admin-text-tertiary)] font-medium mt-0.5">
                Manage custom customer requests, write quotations, chat with customers, and edit
                storefront form options.
              </p>
            </div>

            <div className="flex bg-[var(--admin-surface-muted)] p-0.5 rounded-[var(--admin-radius-lg)] border border-[var(--admin-border-subtle)] self-start sm:self-auto">
              <button
                onClick={() => setCurrentWorkspace('active')}
                className={`px-5 py-2.5 rounded-full text-[11px] font-bold uppercase tracking-wider cursor-pointer transition-all duration-300 ${
                  currentWorkspace === 'active'
                    ? 'bg-[var(--admin-surface)] text-[var(--admin-text-primary)] shadow-[var(--admin-shadow-xs)] border border-[var(--admin-border-subtle)]'
                    : 'text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)]'
                }`}
              >
                Orders List
              </button>
              <button
                onClick={() => setCurrentWorkspace('config')}
                className={`px-5 py-2.5 rounded-full text-[11px] font-bold uppercase tracking-wider cursor-pointer transition-all duration-300 ${
                  currentWorkspace === 'config'
                    ? 'bg-[var(--admin-surface)] text-[var(--admin-text-primary)] shadow-[var(--admin-shadow-xs)] border border-[var(--admin-border-subtle)]'
                    : 'text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)]'
                }`}
              >
                Edit Form Options
              </button>
            </div>
          </motion.div>

          {/* ─── WORKSPACE: PIPELINES RETAIN GRID ─── */}
          {currentWorkspace === 'active' && (
            <div className="space-y-6">
              {/* Enhanced Premium Analytics Panel */}
              <motion.div
                variants={fadeUp}
                className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4"
              >
                {[
                  {
                    label: 'Total Orders',
                    val: stats.total,
                    icon: 'assignment_late',
                    color:
                      'bg-[var(--admin-surface)] border-[var(--admin-border)] hover:border-[var(--admin-border-strong)] text-[var(--admin-text-primary)]',
                  },
                  {
                    label: 'New Requests',
                    val: stats.pending,
                    icon: 'fiber_new',
                    color:
                      'bg-[var(--admin-surface)] border-[var(--admin-border)] hover:border-[var(--admin-border-strong)] text-[var(--admin-accent)]',
                  },
                  {
                    label: 'Quotes Sent',
                    val: stats.quotesSent,
                    icon: 'payments',
                    color:
                      'bg-[var(--admin-surface)] border-[var(--admin-border)] hover:border-[var(--admin-border-strong)] text-[var(--admin-text-primary)]',
                  },
                  {
                    label: 'Approved Orders',
                    val: stats.approved,
                    icon: 'task_alt',
                    color:
                      'bg-[var(--admin-surface)] border-[var(--admin-border)] hover:border-[var(--admin-border-strong)] text-[var(--admin-success)]',
                  },
                  {
                    label: 'Total Quote Value',
                    val: `₹${stats.valuation.toLocaleString('en-IN')}`,
                    icon: 'trending_up',
                    color:
                      'bg-[var(--admin-surface)] border-[var(--admin-border)] hover:border-[var(--admin-border-strong)] text-[var(--admin-text-secondary)]',
                  },
                ].map((s, i) => (
                  <div
                    key={i}
                    className={`admin-card p-4 sm:p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[var(--admin-shadow-md)] ${s.color} ${
                      i === 4 ? 'col-span-2 lg:col-span-1' : 'col-span-1'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="material-symbols-outlined text-[18px] sm:text-[20px] opacity-75">
                        {s.icon}
                      </span>
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--admin-accent)]" />
                    </div>
                    <p className="text-[17px] sm:text-[22px] font-bold font-mono tracking-tight truncate">
                      {s.val}
                    </p>
                    <p className="text-[9px] sm:text-[11px] font-bold uppercase tracking-wider text-[var(--admin-text-secondary)] mt-1 truncate">
                      {s.label}
                    </p>
                  </div>
                ))}
              </motion.div>

              {/* Luxury Status Pipeline Segment Controls */}
              <motion.div
                variants={fadeUp}
                className="flex overflow-x-auto gap-2 border-b border-[var(--admin-border-subtle)] pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none snap-x flex-nowrap"
                style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
              >
                {[
                  'All',
                  'Pending',
                  'Reviewing',
                  'Quote Sent',
                  'Approved',
                  'In Progress',
                  'Ready',
                  'Delivered',
                  'Cancelled',
                ].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setStatusFilter(tab)}
                    className={`px-4 py-2 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer border shrink-0 snap-align-start whitespace-nowrap ${
                      statusFilter === tab
                        ? 'bg-[var(--admin-surface)] text-[var(--admin-text-primary)] shadow-[var(--admin-shadow-xs)] border-[var(--admin-border-subtle)]'
                        : 'bg-[var(--admin-surface)] border-[var(--admin-border)] text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] hover:border-[var(--admin-border-strong)]'
                    }`}
                  >
                    {tab}
                    {orders.filter((o) => (tab === 'All' ? true : o.status === tab)).length > 0 && (
                      <span
                        className={`ml-2 px-2 py-0.5 rounded-full text-[11px] font-mono font-bold ${
                          statusFilter === tab
                            ? 'bg-[var(--admin-surface)] text-[var(--admin-text-primary)]'
                            : 'bg-[var(--admin-surface-muted)] text-[var(--admin-text-secondary)]'
                        }`}
                      >
                        {orders.filter((o) => (tab === 'All' ? true : o.status === tab)).length}
                      </span>
                    )}
                  </button>
                ))}
              </motion.div>

              {/* Desktop Table View */}
              <div className="hidden md:block admin-card overflow-hidden p-0">
                <div className="overflow-x-auto">
                  <table className="admin-table w-full min-w-[900px]">
                    <thead>
                      <tr className="">
                        <th className="p-4.5 pl-6">Customer Name</th>
                        <th className="p-4.5">Type</th>
                        <th className="p-4.5">Request Details</th>
                        <th className="p-4.5">Event Date</th>
                        <th className="p-4.5">Priority</th>
                        <th className="p-4.5">Status</th>
                        <th className="p-4.5 text-right pr-6">Total Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.length === 0 ? (
                        <tr>
                          <td
                            colSpan={7}
                            className="p-20 text-center text-[var(--admin-text-secondary)] bg-[var(--admin-surface)]"
                          >
                            <span className="material-symbols-outlined text-[48px] text-[var(--admin-text-tertiary)] mb-2 block">
                              search_off
                            </span>
                            <p className="text-[14px] font-bold text-[var(--admin-text-primary)]">
                              Data Not Found
                            </p>
                            <p className="text-[11px] text-[var(--admin-text-secondary)] mt-1 max-w-[280px] mx-auto">
                              No custom orders found matching your search.
                            </p>
                          </td>
                        </tr>
                      ) : (
                        filteredOrders.map((order) => {
                          const dateStr = order.eventDate
                            ? new Date(order.eventDate).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })
                            : 'TBD';
                          const customerInitial = (order.customerName || 'C')
                            .charAt(0)
                            .toUpperCase();

                          return (
                            <tr
                              key={order._id}
                              onClick={() => setSelectedOrder(order)}
                              className="border-b border-[var(--admin-border-subtle)] hover:bg-[var(--admin-bg-subtle)] cursor-pointer transition-all duration-300 border-l-4 border-l-transparent hover:border-l-[var(--admin-accent)]"
                            >
                              <td className="p-4.5 pl-6 flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-[var(--admin-bg-subtle)] border border-[var(--admin-border-subtle)] text-[var(--admin-accent)] flex items-center justify-center font-bold text-[13px] shadow-sm">
                                  {customerInitial}
                                </div>
                                <div>
                                  <p className="font-bold text-[var(--admin-text-primary)]">
                                    {order.customerName}
                                  </p>
                                  <span className="text-[11px] text-[var(--admin-text-secondary)]/70 font-mono tracking-tight">
                                    {order.customerEmail}
                                  </span>
                                </div>
                              </td>

                              <td className="p-4.5 font-bold uppercase tracking-wider">
                                <span
                                  className={`px-2 py-1 rounded-[6px] text-[10px] ${
                                    order.customOrderType === 'product'
                                      ? 'bg-[#e3f2fd] text-[#1565c0]'
                                      : order.customOrderType === 'event'
                                        ? 'bg-[#f3e5f5] text-[#7b1fa2]'
                                        : order.customOrderType === 'general'
                                          ? 'bg-[#fff8e1] text-[#f57f17]'
                                          : 'bg-[var(--admin-bg-subtle)] text-[var(--admin-text-secondary)]'
                                  }`}
                                >
                                  {order.customOrderType || 'Legacy'}
                                </span>
                              </td>
                              <td className="p-4.5 text-[12px] text-[var(--admin-text-secondary)]">
                                <div>
                                  <span className="font-bold text-[var(--admin-text-primary)] uppercase text-[10px]">
                                    {order.occasion || 'Custom'}
                                  </span>
                                </div>
                                <div>{order.productType || 'N/A'}</div>
                              </td>
                              <td className="p-4.5 font-mono text-[var(--admin-text-primary)] font-light">
                                {dateStr}
                              </td>
                              <td className="p-4.5">
                                <select
                                  value={order.priority}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    handleUpdatePriority(order._id, e.target.value);
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  className={`px-3 py-1 rounded-xl text-[11px] font-bold uppercase tracking-wider border cursor-pointer outline-none transition-all ${
                                    order.priority === 'high'
                                      ? 'bg-[var(--admin-error-light)] text-[var(--admin-error)] border-[var(--admin-error-border)]'
                                      : order.priority === 'medium'
                                        ? 'admin-badge admin-badge-warning border-[var(--admin-warning-border)]'
                                        : 'bg-[var(--admin-surface-muted)] text-[var(--admin-text-secondary)] border-[var(--admin-border)]'
                                  }`}
                                >
                                  <option value="low">Low</option>
                                  <option value="medium">Medium</option>
                                  <option value="high">High</option>
                                </select>
                              </td>
                              <td className="p-4.5">
                                <span
                                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                                    order.status === 'Pending'
                                      ? 'admin-badge admin-badge-warning'
                                      : order.status === 'Approved'
                                        ? 'bg-[var(--admin-success-light)] text-[var(--admin-success)]'
                                        : order.status === 'Cancelled'
                                          ? 'admin-badge admin-badge-error'
                                          : 'bg-[var(--admin-info-light)] text-[var(--admin-info)]'
                                  }`}
                                >
                                  {order.status}
                                </span>
                              </td>
                              <td className="p-4.5 text-right pr-6 font-mono font-bold text-[var(--admin-accent)]">
                                {order.quotation?.total > 0
                                  ? `₹${order.quotation.total.toLocaleString('en-IN')}`
                                  : 'Custom Quote'}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile Card Deck View */}
              <div className="block md:hidden space-y-3">
                {filteredOrders.length === 0 ? (
                  <div className="admin-card p-12 text-center text-[var(--admin-text-secondary)]">
                    <span className="material-symbols-outlined text-[40px] text-[var(--admin-text-tertiary)] mb-2 block">
                      search_off
                    </span>
                    <p className="text-[13px] font-bold text-[var(--admin-text-primary)]">
                      Data Not Found
                    </p>
                    <p className="text-[11px] text-[var(--admin-text-secondary)] mt-1">
                      No custom orders found matching search.
                    </p>
                  </div>
                ) : (
                  filteredOrders.map((order) => {
                    const dateStr = order.eventDate
                      ? new Date(order.eventDate).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })
                      : 'TBD';
                    const customerInitial = (order.customerName || 'C').charAt(0).toUpperCase();

                    return (
                      <div
                        key={order._id}
                        onClick={() => setSelectedOrder(order)}
                        className="admin-card p-4 hover:border-[var(--admin-border-strong)] cursor-pointer transition-all duration-300 border-l-4 border-l-transparent hover:border-l-[var(--admin-accent)] active:scale-[0.99] space-y-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-[var(--admin-bg-subtle)] border border-[var(--admin-border-subtle)] text-[var(--admin-accent)] flex items-center justify-center font-bold text-[12px] shadow-sm shrink-0">
                              {customerInitial}
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-bold text-[var(--admin-text-primary)] text-[13px] truncate">
                                {order.customerName}
                              </h4>
                              <p className="text-[10px] text-[var(--admin-text-secondary)] truncate">
                                {order.customerEmail}
                              </p>
                            </div>
                          </div>
                          <span className="text-[10px] font-mono text-[var(--admin-text-tertiary)] shrink-0">
                            {dateStr}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[11px] border-t border-b border-[var(--admin-border-subtle)] py-2">
                          <div className="min-w-0">
                            <span className="text-[9px] uppercase tracking-wider text-[var(--admin-text-tertiary)] font-bold block">
                              Occasion
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="font-bold text-[var(--admin-text-primary)]/80 truncate block">
                                {order.occasion}
                              </span>
                              {order.productSnapshot && (
                                <span
                                  className="bg-[var(--admin-accent)]/10 text-[var(--admin-accent)] border border-[var(--admin-accent)]/20 px-1.5 py-0.5 rounded-[4px] text-[8px] font-bold uppercase tracking-wider shrink-0"
                                  title="Based on a Catalog Product"
                                >
                                  Catalog
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="min-w-0">
                            <span className="text-[9px] uppercase tracking-wider text-[var(--admin-text-tertiary)] font-bold block">
                              Product Type
                            </span>
                            <span className="text-[var(--admin-text-secondary)] truncate block">
                              {order.productType}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-1">
                          <div className="flex items-center gap-2">
                            <select
                              value={order.priority}
                              onChange={(e) => {
                                e.stopPropagation();
                                handleUpdatePriority(order._id, e.target.value);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border cursor-pointer outline-none transition-all ${
                                order.priority === 'high'
                                  ? 'bg-[var(--admin-error-light)] text-[var(--admin-error)] border-[var(--admin-error-border)]'
                                  : order.priority === 'medium'
                                    ? 'admin-badge admin-badge-warning border-[var(--admin-warning-border)] py-0.5'
                                    : 'bg-[var(--admin-surface-muted)] text-[var(--admin-text-secondary)] border-[var(--admin-border)]'
                              }`}
                            >
                              <option value="low">Low</option>
                              <option value="medium">Med</option>
                              <option value="high">High</option>
                            </select>

                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                order.status === 'Pending'
                                  ? 'admin-badge admin-badge-warning'
                                  : order.status === 'Approved'
                                    ? 'bg-[var(--admin-success-light)] text-[var(--admin-success)]'
                                    : order.status === 'Cancelled'
                                      ? 'admin-badge admin-badge-error'
                                      : 'bg-[var(--admin-info-light)] text-[var(--admin-info)]'
                              }`}
                            >
                              {order.status}
                            </span>
                          </div>

                          <span className="font-mono font-bold text-[12px] text-[var(--admin-accent)]">
                            {order.quotation?.total > 0
                              ? `₹${order.quotation.total.toLocaleString('en-IN')}`
                              : 'Custom Quote'}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* ─── SLIDING DRAWER DETAIL SHEET ─── */}
              <AnimatePresence>
                {selectedOrder && (
                  <>
                    {/* Backdrop overlay */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setSelectedOrder(null)}
                      className="fixed inset-0 z-45 bg-[var(--admin-surface-overlay)] backdrop-blur-sm"
                    />

                    {/* Sliding Content Drawer */}
                    <motion.div
                      initial={isMobile ? { y: '100%' } : { x: '100%' }}
                      animate={isMobile ? { y: 0 } : { x: 0 }}
                      exit={isMobile ? { y: '100%' } : { x: '100%' }}
                      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                      className={
                        isMobile
                          ? 'fixed bottom-0 left-0 right-0 h-[92vh] w-full bg-[var(--admin-surface)] z-50 shadow-2xl flex flex-col rounded-t-[var(--admin-radius-2xl)] border-t border-[var(--admin-border)]'
                          : 'fixed top-0 right-0 h-full w-full max-w-[540px] bg-[var(--admin-surface)] z-50 shadow-2xl flex flex-col border-l border-[var(--admin-border)]'
                      }
                    >
                      {/* Drawer Header details */}
                      <div className="p-4 sm:p-6 border-b border-[var(--admin-border-subtle)] flex items-start justify-between bg-[var(--admin-bg-subtle)] gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[var(--admin-surface)] border border-[var(--admin-border-subtle)] text-[var(--admin-accent)] flex items-center justify-center font-bold text-[14px] sm:text-[16px] shadow-sm shrink-0">
                            {(selectedOrder.customerName || 'C').charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-[15px] sm:text-[17px] font-bold text-[var(--admin-text-primary)] truncate">
                              {selectedOrder.customerName}
                            </h3>
                            <p className="text-[10px] sm:text-[11px] text-[var(--admin-text-secondary)] mt-0.5 truncate">
                              {selectedOrder.customerEmail}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                          <a
                            href={`https://wa.me/${selectedOrder.customerPhone?.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[var(--admin-surface)] hover:admin-badge admin-badge-success border border-[var(--admin-border-subtle)] flex items-center justify-center shadow-sm cursor-pointer transition-all active:scale-90"
                            title="WhatsApp Client"
                          >
                            <span className="material-symbols-outlined text-[16px] sm:text-[18px]">
                              chat
                            </span>
                          </a>
                          <a
                            href={`mailto:${selectedOrder.customerEmail}`}
                            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[var(--admin-surface)] hover:bg-[var(--admin-surface-hover)] text-[var(--admin-text-primary)] border border-[var(--admin-border-subtle)] flex items-center justify-center shadow-sm cursor-pointer transition-all active:scale-90"
                            title="Email Client"
                          >
                            <span className="material-symbols-outlined text-[16px] sm:text-[18px]">
                              mail
                            </span>
                          </a>
                          <button
                            onClick={() => setSelectedOrder(null)}
                            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[var(--admin-surface)] hover:bg-[var(--admin-surface-muted)] text-[var(--admin-text-secondary)] border border-[var(--admin-border-subtle)] flex items-center justify-center shadow-sm cursor-pointer transition-all active:scale-90"
                          >
                            ✕
                          </button>
                        </div>
                      </div>

                      {/* Drawer Content */}
                      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 sm:space-y-6 pb-[calc(32px+env(safe-area-inset-bottom))]">
                        {/* Metadata Card grids */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[var(--admin-bg-subtle)] p-4 rounded-[var(--admin-radius-lg)] border border-[var(--admin-border-subtle)]">
                          <div>
                            <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-[var(--admin-text-secondary)] font-bold">
                              Event Date & Location
                            </span>
                            <p className="text-[12px] font-bold text-[var(--admin-text-primary)] mt-0.5">
                              {selectedOrder.eventDate
                                ? new Date(selectedOrder.eventDate).toLocaleDateString('en-IN', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                  })
                                : 'TBD'}{' '}
                              • {selectedOrder.city || 'Any Location'}
                            </p>
                          </div>
                          <div>
                            <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-[var(--admin-text-secondary)] font-bold">
                              Consultation Type
                            </span>
                            <p className="text-[12px] font-bold text-[var(--admin-text-primary)] mt-0.5">
                              {selectedOrder.bookingType}
                            </p>
                          </div>
                        </div>

                        {/* Customization Details & Requirements */}
                        <div className="space-y-3">
                          {selectedOrder.productSnapshot && (
                            <div className="flex items-center gap-3 bg-[var(--admin-surface)] border border-[var(--admin-border-subtle)] p-3 rounded-[var(--admin-radius-lg)]">
                              {selectedOrder.productSnapshot.imageSrc && (
                                <img
                                  src={selectedOrder.productSnapshot.imageSrc}
                                  alt=""
                                  className="w-12 h-12 rounded-lg object-cover"
                                />
                              )}
                              <div>
                                <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--admin-text-tertiary)] block">
                                  Target Product
                                </span>
                                <p className="text-[13px] font-bold text-[var(--admin-text-primary)]">
                                  {selectedOrder.productSnapshot.title}
                                </p>
                                <a
                                  href={`/product/${selectedOrder.productSnapshot.productId}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[10px] text-[var(--admin-accent)] hover:underline"
                                >
                                  View Product
                                </a>
                              </div>
                            </div>
                          )}

                          {selectedOrder.customRequirements && (
                            <div className="space-y-1.5 bg-[var(--admin-bg-subtle)] p-4 rounded-[var(--admin-radius-lg)] border-2 border-dashed border-[var(--admin-accent)]/20">
                              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[var(--admin-accent)]">
                                Customer's Special Requirements
                              </span>
                              <p className="text-[12px] text-[var(--admin-text-primary)]/90 leading-relaxed italic">
                                "{selectedOrder.customRequirements}"
                              </p>
                            </div>
                          )}

                          {selectedOrder.customizationData?.length > 0 && (
                            <div className="space-y-2">
                              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[var(--admin-text-secondary)] block">
                                Customization Fields:
                              </span>
                              <div className="grid grid-cols-2 gap-3 bg-[var(--admin-surface)] border border-[var(--admin-border-subtle)] p-4 rounded-[var(--admin-radius-lg)]">
                                {selectedOrder.customizationData.map((field, i) => (
                                  <div key={i} className="min-w-0">
                                    <span className="text-[9px] uppercase tracking-wider text-[var(--admin-text-tertiary)] font-bold block truncate">
                                      {field.fieldName}
                                    </span>
                                    {field.fieldType === 'color' ? (
                                      <div className="flex gap-1 mt-1">
                                        {(field.value || []).map((c, ci) => (
                                          <div
                                            key={ci}
                                            className="w-4 h-4 rounded-full border border-[var(--admin-border)] shadow-sm"
                                            style={{ background: c }}
                                          />
                                        ))}
                                      </div>
                                    ) : (
                                      <span className="font-bold text-[var(--admin-text-primary)]/80 text-[12px] block truncate">
                                        {Array.isArray(field.value)
                                          ? field.value.join(', ')
                                          : field.value}
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* DYNAMIC FORM DATA RENDERER (V2) */}
                          {selectedOrder.dynamicData &&
                            Object.keys(selectedOrder.dynamicData).length > 0 && (
                              <div className="space-y-2">
                                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[var(--admin-accent)] flex items-center gap-2">
                                  <span className="material-symbols-outlined text-[16px]">
                                    list_alt
                                  </span>
                                  Dynamic Form Responses
                                </span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[var(--admin-surface)] border border-[var(--admin-border-subtle)] p-4 rounded-[var(--admin-radius-lg)]">
                                  {Object.entries(selectedOrder.dynamicData).map(
                                    ([key, value], i) => {
                                      // Format keys (e.g. "product_image" -> "Product Image")
                                      const formatKey = (k) =>
                                        k
                                          .replace(/_/g, ' ')
                                          .replace(/\b\w/g, (l) => l.toUpperCase());

                                      // Check if it's an array of simulated image names
                                      const isFileArray =
                                        Array.isArray(value) &&
                                        value.length > 0 &&
                                        typeof value[0] === 'string' &&
                                        value[0].match(/\.(jpeg|jpg|gif|png|webp|heic|pdf|doc)/i);

                                      return (
                                        <div
                                          key={i}
                                          className="min-w-0 border-b sm:border-b-0 sm:border-l border-[var(--admin-border-subtle)] sm:pl-3 pb-2 sm:pb-0 last:border-b-0"
                                        >
                                          <span className="text-[9px] uppercase tracking-wider text-[var(--admin-text-tertiary)] font-bold block mb-1">
                                            {formatKey(key)}
                                          </span>

                                          {isFileArray ? (
                                            <div className="flex flex-wrap gap-2 mt-1.5">
                                              {value.map((file, idx) => {
                                                const isImg = file.match(
                                                  /\.(jpeg|jpg|gif|png|webp|heic)/i,
                                                );
                                                return (
                                                  <div
                                                    key={idx}
                                                    className="relative w-12 h-12 rounded-lg overflow-hidden border border-[var(--admin-border-subtle)] shadow-sm bg-[var(--admin-bg-subtle)] group"
                                                  >
                                                    {isImg ? (
                                                      <>
                                                        <img
                                                          src={
                                                            file.startsWith('http')
                                                              ? file
                                                              : `https://placehold.co/100x100?text=${encodeURIComponent(file)}`
                                                          }
                                                          alt={file}
                                                          className="w-full h-full object-cover"
                                                          onError={(e) => {
                                                            e.target.style.display = 'none';
                                                            e.target.nextSibling.style.display =
                                                              'flex';
                                                          }}
                                                        />
                                                        <div className="hidden absolute inset-0 bg-[var(--admin-bg-subtle)] flex-col items-center justify-center p-1">
                                                          <span className="material-symbols-outlined text-[14px] text-[var(--admin-text-secondary)]">
                                                            image
                                                          </span>
                                                        </div>
                                                      </>
                                                    ) : (
                                                      <div className="absolute inset-0 flex items-center justify-center">
                                                        <span className="material-symbols-outlined text-[18px] text-[var(--admin-text-secondary)]">
                                                          description
                                                        </span>
                                                      </div>
                                                    )}
                                                    {/* Tooltip on hover */}
                                                    <div className="opacity-0 group-hover:opacity-100 absolute inset-0 bg-black/60 flex items-center justify-center text-white text-[7px] p-1 text-center leading-tight transition-opacity break-words pointer-events-none">
                                                      {file}
                                                    </div>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          ) : (
                                            <span className="font-bold text-[var(--admin-text-primary)] text-[12px] block break-words">
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
                                    },
                                  )}
                                </div>
                              </div>
                            )}
                        </div>

                        {/* Inspiration visual decks & external links */}
                        {selectedOrder.inspirationImages?.length > 0 &&
                          (() => {
                            const isDirectImageUrl = (url) => {
                              if (!url) return false;
                              return (
                                url.match(/\.(jpeg|jpg|gif|png|webp|heic)/i) ||
                                url.includes('cloudinary.com')
                              );
                            };
                            const directImages =
                              selectedOrder.inspirationImages.filter(isDirectImageUrl);
                            const externalLinks = selectedOrder.inspirationImages.filter(
                              (url) => !isDirectImageUrl(url),
                            );

                            return (
                              <div className="space-y-3">
                                {directImages.length > 0 && (
                                  <div className="space-y-2">
                                    <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[var(--admin-text-secondary)] block">
                                      Uploaded Inspiration Images ({directImages.length}):
                                    </span>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                      {directImages.map((img, idx) => (
                                        <a
                                          key={idx}
                                          href={img}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="relative aspect-square rounded-xl overflow-hidden border border-[var(--admin-border-subtle)] shadow-sm hover:scale-105 transition-all duration-350 cursor-zoom-in"
                                        >
                                          <img
                                            src={img}
                                            alt="Inspiration preview"
                                            className="w-full h-full object-cover"
                                          />
                                        </a>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {externalLinks.length > 0 && (
                                  <div className="space-y-2">
                                    <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[var(--admin-text-secondary)] block">
                                      Pasted Inspiration Links ({externalLinks.length}):
                                    </span>
                                    <div className="flex flex-col gap-2">
                                      {externalLinks.map((link, idx) => (
                                        <div
                                          key={idx}
                                          className="flex items-center justify-between bg-[var(--admin-bg-subtle)] border border-[var(--admin-border-subtle)] rounded-xl px-4 py-2"
                                        >
                                          <div className="flex items-center gap-2 text-[11px] min-w-0">
                                            <span className="material-symbols-outlined text-[15px] text-[var(--admin-accent)] shrink-0">
                                              link
                                            </span>
                                            <a
                                              href={link}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-[var(--admin-text-primary)] font-bold hover:underline truncate"
                                            >
                                              {link}
                                            </a>
                                          </div>
                                          <a
                                            href={link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-[var(--admin-accent)] hover:text-[var(--admin-text-primary)] text-[11px] uppercase font-bold tracking-wider shrink-0 pl-2 cursor-pointer"
                                          >
                                            Open Board
                                          </a>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })()}

                        {/* Internal Admin Notes */}
                        <div className="space-y-3 pt-4 border-t border-[var(--admin-border-subtle)]">
                          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[var(--admin-accent)] block flex items-center gap-2">
                            <span className="material-symbols-outlined text-[16px]">lock</span>
                            Internal Team Notes
                          </span>
                          <div className="bg-[var(--admin-warning-light)]/20 p-4 rounded-[var(--admin-radius-lg)] border border-[var(--admin-warning)]/30 space-y-4">
                            {selectedOrder.internalNotes?.length > 0 ? (
                              <div className="space-y-3 max-h-[150px] overflow-y-auto pr-2">
                                {selectedOrder.internalNotes.map((note, i) => (
                                  <div
                                    key={i}
                                    className="bg-white p-3 rounded-lg border border-[var(--admin-warning)]/20 shadow-sm"
                                  >
                                    <div className="flex justify-between items-end mb-1">
                                      <span className="text-[10px] font-bold text-[var(--admin-warning)]">
                                        {note.authorName}
                                      </span>
                                      <span className="text-[8px] text-[var(--admin-text-tertiary)]">
                                        {new Date(note.createdAt).toLocaleDateString()}
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-[var(--admin-text-primary)]">
                                      {note.text}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-[11px] text-[var(--admin-text-tertiary)] italic">
                                No internal notes yet. Customers cannot see these.
                              </p>
                            )}
                            <form onSubmit={handleAddInternalNote} className="flex gap-2">
                              <input
                                type="text"
                                value={internalNoteText}
                                onChange={(e) => setInternalNoteText(e.target.value)}
                                placeholder="Add a private note..."
                                className="flex-1 bg-white border border-[var(--admin-warning)]/30 rounded-full px-3 py-1.5 text-[11px] outline-none focus:border-[var(--admin-warning)]"
                              />
                              <button
                                type="submit"
                                disabled={isAddingNote || !internalNoteText.trim()}
                                className="px-3 rounded-full bg-[var(--admin-warning)] hover:bg-[var(--admin-warning)]/90 text-white text-[10px] font-bold uppercase tracking-wider disabled:opacity-50"
                              >
                                Add
                              </button>
                            </form>
                          </div>
                        </div>

                        {/* Curator Correspondence Logs */}
                        <div className="space-y-3 pt-4 border-t border-[var(--admin-border-subtle)]">
                          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[var(--admin-text-secondary)] block">
                            Customer Chat & History
                          </span>
                          <div className="h-[200px] overflow-y-auto space-y-3 bg-[var(--admin-bg-subtle)] p-3 rounded-[var(--admin-radius-lg)] border border-[var(--admin-border-subtle)] shadow-inner">
                            {selectedOrder.messages?.map((msg, i) => {
                              const isMe = msg.sender === 'admin';
                              const isLog = msg.senderName === 'System';

                              if (isLog) {
                                return (
                                  <div key={i} className="text-center py-1">
                                    <span className="px-2.5 py-1 bg-[var(--admin-surface-muted)] text-[var(--admin-text-secondary)] text-[10px] sm:text-[11px] font-bold uppercase tracking-wider rounded-lg border border-[var(--admin-border-subtle)]">
                                      {msg.text}
                                    </span>
                                  </div>
                                );
                              }

                              return (
                                <div
                                  key={i}
                                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                                >
                                  <span className="text-[10px] sm:text-[11px] font-bold text-[var(--admin-text-secondary)] mb-0.5 px-1">
                                    {msg.senderName}
                                  </span>
                                  <div
                                    className={`p-3 rounded-[var(--admin-radius-lg)] text-[11px] leading-relaxed max-w-[85%] shadow-sm ${
                                      isMe
                                        ? 'bg-[var(--admin-accent)] text-white rounded-tr-none'
                                        : 'bg-[var(--admin-surface)] text-[var(--admin-text-primary)] rounded-tl-none border border-[var(--admin-border-subtle)]'
                                    }`}
                                  >
                                    {msg.text}
                                  </div>
                                </div>
                              );
                            })}
                            <div ref={chatEndRef} />
                          </div>

                          <form onSubmit={handleSendAdminChatMessage} className="flex gap-2">
                            <input
                              type="text"
                              value={adminMessageText}
                              onChange={(e) => setAdminMessageText(e.target.value)}
                              placeholder="Type message to customer..."
                              className="flex-1 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border-strong)] admin-input rounded-full text-[12px]"
                            />
                            <button
                              aria-label="send"
                              type="submit"
                              disabled={isSendingMessage || !adminMessageText.trim()}
                              className="w-10 h-10 rounded-full bg-[var(--admin-accent)] hover:bg-[var(--admin-accent-hover)] text-white flex items-center justify-center cursor-pointer transition-all active:scale-95 shrink-0 disabled:opacity-40 disabled:pointer-events-none"
                            >
                              <span className="material-symbols-outlined text-[16px]">send</span>
                            </button>
                          </form>
                        </div>

                        {/* Interactive estimate luxury receipt builder */}
                        <div className="space-y-4 pt-4 border-t border-[var(--admin-border-subtle)] relative">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[var(--admin-accent)] block">
                              Create Quotation / Pricing
                            </span>
                            {selectedOrder && (
                              <DraftStatusIndicator
                                status={draftStatus}
                                lastSavedAt={lastSavedAt}
                              />
                            )}
                          </div>

                          <div className="space-y-3.5 bg-[var(--admin-bg-subtle)] p-4 rounded-[var(--admin-radius-lg)] border border-[var(--admin-border-subtle)] shadow-sm">
                            {/* Price Breakdown Items list (Auto height, no ugly nested scrollbar!) */}
                            <div className="space-y-3">
                              {quoteData.items.map((item, idx) => (
                                <div
                                  key={idx}
                                  className="space-y-2 sm:space-y-0 sm:flex sm:items-center sm:gap-2.5 p-3 sm:p-0 bg-[var(--admin-surface)] sm:bg-transparent border border-[var(--admin-border-subtle)] sm:border-0 rounded-xl"
                                >
                                  <div className="flex items-center gap-2 flex-1">
                                    <div className="w-6 h-6 rounded-lg bg-[var(--admin-surface-muted)] text-[var(--admin-text-secondary)] flex items-center justify-center font-mono text-[11px] font-bold shrink-0">
                                      {String(idx + 1).padStart(2, '0')}
                                    </div>
                                    <input
                                      type="text"
                                      value={item.description}
                                      onChange={(e) => {
                                        const next = [...quoteData.items];
                                        next[idx].description = e.target.value;
                                        setQuoteData((prev) => ({ ...prev, items: next }));
                                      }}
                                      placeholder="Item Description (e.g. Stage Flower Decor)"
                                      className="flex-1 bg-[var(--admin-surface)] border border-[var(--admin-border)] admin-input text-[12px] py-1.5 min-w-0"
                                    />
                                  </div>
                                  <div className="flex items-center gap-2 pl-8 sm:pl-0">
                                    <div className="relative flex-1 sm:w-28 shrink-0">
                                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] font-mono text-[var(--admin-text-secondary)]">
                                        ₹
                                      </span>
                                      <input
                                        type="number"
                                        value={item.amount}
                                        onChange={(e) => {
                                          const next = [...quoteData.items];
                                          next[idx].amount = Number(e.target.value) || 0;
                                          setQuoteData((prev) => ({ ...prev, items: next }));
                                        }}
                                        placeholder="Price"
                                        className="w-full bg-[var(--admin-surface)] border border-[var(--admin-border)] admin-input font-mono text-right text-[12px] py-1.5"
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
                                      className="w-8 h-8 rounded-xl bg-[var(--admin-error-light)] hover:bg-[var(--admin-error-light)] text-[var(--admin-error)] flex items-center justify-center cursor-pointer transition-all shrink-0 active:scale-90"
                                      title="Remove Item"
                                    >
                                      <span className="material-symbols-outlined text-[15px]">
                                        delete
                                      </span>
                                    </button>
                                  </div>
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
                                className="w-full py-2 border border-dashed border-[var(--admin-accent)]/35 text-[var(--admin-accent)] hover:bg-[var(--admin-accent)]/5 rounded-xl text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-[15px]">add</span>{' '}
                                Add Price Item
                              </button>
                            </div>

                            {/* Taxes and Shipping side-by-side */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-[var(--admin-border-subtle)]">
                              <div className="space-y-1">
                                <label className="text-[10px] sm:text-[11px] font-bold uppercase text-[var(--admin-text-secondary)] tracking-wider block">
                                  Taxes (₹)
                                </label>
                                <div className="relative">
                                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] font-mono text-[var(--admin-text-secondary)]">
                                    ₹
                                  </span>
                                  <input
                                    type="number"
                                    value={quoteData.tax}
                                    onChange={(e) =>
                                      setQuoteData((prev) => ({
                                        ...prev,
                                        tax: Number(e.target.value) || 0,
                                      }))
                                    }
                                    className="w-full bg-[var(--admin-surface)] border border-[var(--admin-border)] admin-input font-mono text-right text-[12px]"
                                  />
                                </div>
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] sm:text-[11px] font-bold uppercase text-[var(--admin-text-secondary)] tracking-wider block">
                                  Shipping & Setup (₹)
                                </label>
                                <div className="relative">
                                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] font-mono text-[var(--admin-text-secondary)]">
                                    ₹
                                  </span>
                                  <input
                                    type="number"
                                    value={quoteData.shipping}
                                    onChange={(e) =>
                                      setQuoteData((prev) => ({
                                        ...prev,
                                        shipping: Number(e.target.value) || 0,
                                      }))
                                    }
                                    className="w-full bg-[var(--admin-surface)] border border-[var(--admin-border)] admin-input font-mono text-right text-[12px]"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Special Terms & Notes */}
                            <div className="space-y-1.5 pt-1">
                              <label className="text-[10px] sm:text-[11px] font-bold uppercase text-[var(--admin-text-secondary)] tracking-wider block">
                                Special Terms / Payment Notes
                              </label>
                              <input
                                type="text"
                                value={quoteData.notes}
                                onChange={(e) =>
                                  setQuoteData((prev) => ({ ...prev, notes: e.target.value }))
                                }
                                placeholder="E.g. 50% advance payment required, balance on event date..."
                                className="w-full bg-[var(--admin-surface)] border border-[var(--admin-border)] admin-input text-[12px]"
                              />
                            </div>

                            {/* Invoice Receipt Block */}
                            <div className="pt-3 border-t border-dashed border-[var(--admin-border)] space-y-1">
                              <div className="flex justify-between items-center font-bold text-[13px] pt-1 text-[var(--admin-text-primary)]">
                                <span>Grand Total:</span>
                                <span className="font-mono text-[15px] text-[var(--admin-accent)]">
                                  ₹{liveQuoteTotal.toLocaleString('en-IN')}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Main action buttons */}
                          <div className="flex flex-col sm:flex-row gap-2 sm:gap-2.5">
                            <button
                              type="button"
                              onClick={handleDispatchQuotation}
                              disabled={updatingId === selectedOrder._id}
                              className="flex-1 bg-[var(--admin-accent)] hover:bg-[var(--admin-accent-hover)] text-white py-3 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer text-center shadow-md active:scale-95 disabled:opacity-40"
                            >
                              Send Quotation to Customer
                            </button>
                            <button
                              type="button"
                              onClick={() => handleArchiveOrder(selectedOrder._id)}
                              className="bg-[var(--admin-error-light)] text-[var(--admin-error)] hover:bg-[var(--admin-error-light)] border border-[var(--admin-error-border)] py-3 px-4 rounded-xl text-[11px] font-bold uppercase tracking-wider cursor-pointer active:scale-95 transition-all text-center"
                            >
                              Archive Order
                            </button>
                          </div>
                        </div>

                        {/* Elite Pipeline status selector card (replaces the cluttered 8-button grid!) */}
                        <div className="space-y-3 pt-4 border-t border-[var(--admin-border-subtle)]">
                          <div className="bg-[var(--admin-bg-subtle)] p-4 rounded-[var(--admin-radius-lg)] border border-[var(--admin-border-subtle)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div className="flex items-center justify-between sm:block w-full sm:w-auto">
                              <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-[var(--admin-text-secondary)] font-bold">
                                Active Status
                              </span>
                              <div className="flex items-center gap-2 mt-0.5 sm:mt-1.5">
                                <span
                                  className={`w-2.5 h-2.5 rounded-full ${
                                    selectedOrder.status === 'Pending'
                                      ? 'bg-[var(--admin-warning)] animate-pulse'
                                      : selectedOrder.status === 'Approved'
                                        ? 'bg-[var(--admin-success)]'
                                        : selectedOrder.status === 'Cancelled'
                                          ? 'bg-[var(--admin-error)]'
                                          : 'bg-[var(--admin-text-primary)]'
                                  }`}
                                />
                                <p className="text-[13px] font-bold uppercase tracking-wider text-[var(--admin-text-primary)]">
                                  {selectedOrder.status}
                                </p>
                              </div>
                            </div>

                            <div className="w-full sm:w-[180px] space-y-1">
                              <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-[var(--admin-text-secondary)] font-bold block sm:text-right">
                                Change Status
                              </span>
                              <div className="relative">
                                <select
                                  value={selectedOrder.status}
                                  onChange={(e) =>
                                    handleUpdateStatus(selectedOrder._id, e.target.value)
                                  }
                                  className="w-full bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-xl pl-3 pr-8 py-2.5 text-[11px] font-bold uppercase tracking-wider text-[var(--admin-text-primary)] outline-none focus:border-[var(--admin-accent)] cursor-pointer appearance-none shadow-sm"
                                >
                                  {[
                                    'Pending',
                                    'Reviewing',
                                    'Quote Sent',
                                    'Approved',
                                    'In Progress',
                                    'Ready',
                                    'Delivered',
                                    'Cancelled',
                                  ].map((st) => (
                                    <option key={st} value={st}>
                                      {st}
                                    </option>
                                  ))}
                                </select>
                                <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-[15px] text-[var(--admin-text-secondary)] pointer-events-none">
                                  expand_more
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* ─── WORKSPACE: STOREFRONT CMS CONFIG CMS ─── */}
          {currentWorkspace === 'config' && <AdminCustomOrderConfig />}
        </>
      )}
      {/* ─── DRAFT RESTORE & UNSAVED GUARDS ─── */}
      <DraftRestoreModal
        isOpen={showRestoreModal}
        onClose={() => setShowRestoreModal(false)}
        onRestore={restoreDraft}
        onDiscard={discardDraft}
      />
      <UnsavedChangesGuard blocker={blocker} />
    </motion.div>
  );
}
