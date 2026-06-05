import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '../context/AdminContext';
import { playSuccessBeep, playErrorBeep } from '../../utils/audioUtils';
import toast from 'react-hot-toast';
import {
  PageHeader,
  FilterBar,
  StatusBadge,
  formatCurrency,
  fadeUp,
  stagger,
  SkeletonTable,
  SkeletonList,
  EmptyState,
} from '../components/AdminUIKit';
import { useDraft } from '../hooks/useDraft';
import { DraftRestoreModal } from '../components/DraftRestoreModal';
import { UnsavedChangesGuard } from '../components/UnsavedChangesGuard';

const slideDrawer = {
  hidden: { x: '100%', opacity: 0 },
  show: { x: 0, opacity: 1 },
  exit: { x: '100%', opacity: 0 },
};

const allStatuses = [
  'Pending',
  'Confirmed',
  'Packed',
  'Ready to Ship',
  'Shipped',
  'Out for Delivery',
  'Delivered',
  'Cancelled',
  'Returned',
  'Refunded',
];

const statusIcons = {
  Pending: 'schedule',
  Confirmed: 'thumb_up',
  Packed: 'inventory_2',
  'Ready to Ship': 'conveyor_belt',
  Shipped: 'local_shipping',
  'Out for Delivery': 'directions_run',
  Delivered: 'verified',
  Cancelled: 'cancel',
  Returned: 'keyboard_return',
  Refunded: 'payments',
};

export function AdminOrders() {
  const navigate = useNavigate();
  const { orders, dataLoading, updateOrderStatus, updateOrderNotes, searchQuery } = useAdmin();

  const [viewMode, setViewMode] = useState('table'); // 'table' or 'kanban'
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterOrderType, setFilterOrderType] = useState('All');

  // Quick-edit details drawer state
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const codStats = useMemo(() => {
    let totalVolume = 0;
    let pendingRemittance = 0;
    let settledPayouts = 0;
    let courierDeductions = 0;

    orders.forEach((o) => {
      if (o.rawOrder?.paymentMethod?.toLowerCase() === 'cod') {
        totalVolume += o.total;
        if (o.status === 'Delivered' && o.rawOrder?.settlementStatus !== 'Settled') {
          pendingRemittance += o.total;
        } else if (o.rawOrder?.settlementStatus === 'Settled' || o.status === 'Settled') {
          const charges = o.rawOrder?.courierCharges || 150;
          courierDeductions += charges;
          settledPayouts += o.rawOrder?.settledAmount || o.total - charges;
        }
      }
    });

    return { totalVolume, pendingRemittance, settledPayouts, courierDeductions };
  }, [orders]);

  // Capture physical barcode scanner keyboard inputs
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = Date.now();

    const handleKeyPress = (e) => {
      const currentTime = Date.now();

      // Fast barcode keyboard sweeps (< 50ms)
      if (currentTime - lastKeyTime > 50) {
        buffer = '';
      }
      lastKeyTime = currentTime;

      if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta') {
        return;
      }

      if (e.key === 'Enter') {
        if (buffer.length >= 3) {
          const scannedCode = buffer.trim().toUpperCase();
          buffer = '';

          const matchedOrder = orders.find((o) => {
            const cleanId = o.id.toUpperCase();
            const cleanAWB = (o.trackingNumber || '').toUpperCase();
            const customBarcode = `SR-${o.id.substring(o.id.length - 8).toUpperCase()}-IN`;
            const invoiceNum = (o.invoiceNumber || '').toUpperCase();
            return (
              scannedCode === cleanId ||
              scannedCode === cleanAWB ||
              scannedCode === customBarcode ||
              scannedCode === invoiceNum ||
              scannedCode.includes(cleanId.substring(0, 8))
            );
          });

          if (matchedOrder) {
            playSuccessBeep();
            toast.success(
              `Order Found! Opening Full Details for #${matchedOrder.id.substring(matchedOrder.id.length - 8).toUpperCase()}`,
            );
            navigate(`/admin/orders/${matchedOrder.id}`);
          } else {
            playErrorBeep();
            toast.error(`Scan mismatch! Code "${scannedCode}" not found in orders list.`);
          }
        }
        return;
      }

      if (e.key.length === 1) {
        buffer += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [orders, navigate]);

  // Derive selected order data from orders list dynamically
  const selectedOrderData = selectedOrder ? orders.find((o) => o.id === selectedOrder.id) : null;

  // Draft integration for staff note
  const {
    formData: orderNoteDraft,
    setFormData: setOrderNoteDraft,
    deleteDraft,
    hasDraft,
    restoreDraft,
    discardDraft,
    resetData,
    showRestoreModal,
    setShowRestoreModal,
    blocker,
  } = useDraft({
    draftKey: selectedOrder ? `admin:order:note:${selectedOrder.id}` : null,
    module: 'Orders',
    pageTitle: 'Staff Note',
    initialData: { text: '' },
    enabled: !!selectedOrder,
  });

  useEffect(() => {
    if (selectedOrder && !hasDraft) {
      resetData({ text: selectedOrderData?.notes || '' });
    }
  }, [selectedOrder, selectedOrderData, hasDraft, resetData]);

  const handleSaveNoteDraft = async (e) => {
    const text = e.target.value;
    await updateOrderNotes(selectedOrder.id, text);
    await deleteDraft();
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchStatus = filterStatus === 'All' || o.status === filterStatus;
      const matchOrderType = filterOrderType === 'All' || o.orderType === filterOrderType;
      const matchSearch =
        !searchQuery ||
        o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.phone.toLowerCase().includes(searchQuery.toLowerCase());
      return matchStatus && matchOrderType && matchSearch;
    });
  }, [orders, filterStatus, filterOrderType, searchQuery]);

  const statusCounts = useMemo(() => {
    const counts = { All: orders.length };
    allStatuses.forEach((s) => (counts[s] = orders.filter((o) => o.status === s).length));
    return counts;
  }, [orders]);

  const handleExportCSV = () => {
    if (filteredOrders.length === 0) {
      return toast.error('No orders found to export');
    }

    const headers =
      'Order ID,Customer,Phone,Items Summary,Total Amount,Payment Type,Status,Order Date\n';
    const rows = filteredOrders
      .map((o) => {
        const itemsList = o.items.map((i) => `${i.name} (x${i.quantity || 1})`).join(' | ');
        return `"${o.id}","${o.customer}","${o.phone}","${itemsList}",${o.total},"${o.payment}","${o.status}","${o.date}"`;
      })
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `SiriArts_Orders_${new Date().toISOString().slice(0, 10)}.csv`);
    link.click();
    toast.success('Export ready');
  };

  const openOrderDrawer = (order) => {
    setSelectedOrder(order);
    setIsDrawerOpen(true);
  };

  return (
    <motion.div initial="hidden" animate="show" variants={stagger} className="space-y-6">
      <PageHeader
        title="Orders"
        subtitle={`${orders.length} orders`}
        icon="shopping_bag"
        iconColor="orders"
        mobileRow={true}
      >
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg cursor-pointer transition-all flex items-center justify-center ${
                viewMode === 'table'
                  ? 'text-[var(--admin-text-primary)] bg-[var(--admin-surface-muted)]'
                  : 'text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)] hover:bg-[var(--admin-surface-hover)]'
              }`}
              title="Table View"
            >
              <span className="material-symbols-outlined text-[18px]">view_list</span>
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-lg cursor-pointer transition-all flex items-center justify-center ${
                viewMode === 'kanban'
                  ? 'text-[var(--admin-text-primary)] bg-[var(--admin-surface-muted)]'
                  : 'text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)] hover:bg-[var(--admin-surface-hover)]'
              }`}
              title="Kanban View"
            >
              <span className="material-symbols-outlined text-[18px]">dashboard</span>
            </button>
          </div>
          <button
            onClick={handleExportCSV}
            className="flex items-center justify-center p-1.5 rounded-lg text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)] hover:bg-[var(--admin-surface-muted)] transition-all active:scale-95 cursor-pointer shrink-0"
            title="Export CSV"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
          </button>
        </div>
      </PageHeader>

      {/* Real-time Logistics & COD Remittance Reconciliation Ledger */}
      <motion.div variants={fadeUp} className="admin-card overflow-hidden text-left relative p-0">
        <div className="absolute top-0 left-0 w-full h-[3px] bg-[var(--admin-border-strong)] z-10" />
        <div className="grid grid-cols-2 md:grid-cols-4 bg-[var(--admin-surface)]">
          <div className="p-5 space-y-1 border-r border-b md:border-b-0 border-[var(--admin-border-subtle)]">
            <span className="text-[10px] text-[var(--admin-text-tertiary)] font-bold uppercase tracking-wider">
              COD Order Volume
            </span>
            <p className="text-[14px] font-bold text-[var(--admin-text-primary)]">
              {formatCurrency(codStats.totalVolume)}
            </p>
            <span className="text-[10px] text-[var(--admin-text-secondary)] mt-1 block">
              Total COD orders
            </span>
          </div>
          <div className="p-5 space-y-1 border-b md:border-b-0 md:border-r border-[var(--admin-border-subtle)]">
            <span className="text-[10px] text-[var(--admin-warning)] font-bold uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[var(--admin-warning)] animate-pulse" />
              Collections Pending
            </span>
            <p className="text-[14px] font-bold text-[var(--admin-text-primary)]">
              {formatCurrency(codStats.pendingRemittance)}
            </p>
            <span className="text-[10px] text-[var(--admin-text-secondary)] mt-1 block">
              Awaiting transfer
            </span>
          </div>
          <div className="p-5 space-y-1 border-r border-[var(--admin-border-subtle)]">
            <span className="text-[10px] text-[var(--admin-text-tertiary)] font-bold uppercase tracking-wider">
              Shipping Deductions
            </span>
            <p className="text-[14px] font-bold text-[var(--admin-error)]">
              {formatCurrency(codStats.courierDeductions)}
            </p>
            <span className="text-[10px] text-[var(--admin-text-secondary)] mt-1 block">
              Logistics fees
            </span>
          </div>
          <div className="p-5 space-y-1 bg-[var(--admin-success-light)] border-l-0">
            <span className="text-[10px] text-[var(--admin-success)] font-bold uppercase tracking-wider">
              Net Bank Payouts
            </span>
            <p className="text-[14px] font-bold text-[var(--admin-success)]">
              {formatCurrency(codStats.settledPayouts)}
            </p>
            <span className="text-[10px] text-[var(--admin-success)] opacity-80 mt-1 block">
              Settled payouts
            </span>
          </div>
        </div>
      </motion.div>

      {/* Controls row: view modes, search/filters, export buttons */}
      {viewMode === 'table' && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="w-full flex flex-col sm:flex-row gap-4">
            <div className="sm:max-w-md w-full">
              <FilterBar
                filters={['All', ...allStatuses]}
                value={filterStatus}
                onChange={setFilterStatus}
                counts={statusCounts}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-bold text-[var(--admin-text-secondary)]">
                Type:
              </span>
              <div className="flex bg-[var(--admin-surface-muted)] p-1 rounded-lg border border-[var(--admin-border-subtle)]">
                {['All', 'purchase', 'rental', 'mixed'].map((type) => (
                  <button
                    key={type}
                    onClick={() => setFilterOrderType(type)}
                    className={`px-3 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider transition-colors ${
                      filterOrderType === type
                        ? 'bg-[var(--admin-surface)] text-[var(--admin-text-primary)] shadow-sm border border-[var(--admin-border)]'
                        : 'text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-secondary)]'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONTENT SWITCHER */}
      <AnimatePresence mode="wait">
        {dataLoading ? (
          <motion.div key="loading" initial="hidden" animate="show" exit="hidden" variants={fadeUp}>
            {viewMode === 'table' ? (
              <SkeletonTable rows={10} cols={8} />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 items-start">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="bg-[var(--admin-bg-subtle)] rounded-[var(--admin-radius-xl)] p-3 border border-[var(--admin-border)] flex flex-col h-[600px]"
                  >
                    <SkeletonList items={5} className="border-none shadow-none bg-transparent" />
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        ) : viewMode === 'table' ? (
          /* TABLE VIEW */
          <motion.div
            key="table"
            initial="hidden"
            animate="show"
            exit="hidden"
            variants={fadeUp}
            className="admin-card"
          >
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="admin-table w-full min-w-[900px]">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th className="hidden md:table-cell">Items</th>
                    <th>Total</th>
                    <th className="hidden sm:table-cell">Payment</th>
                    <th>Status</th>
                    <th className="hidden lg:table-cell">Date</th>
                    <th>Required By</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-16 text-center">
                        <EmptyState
                          icon={
                            searchQuery || filterStatus !== 'All' ? 'search_off' : 'shopping_bag'
                          }
                          title={
                            searchQuery || filterStatus !== 'All'
                              ? 'No Matches Found'
                              : 'No Orders Yet'
                          }
                          description={
                            searchQuery || filterStatus !== 'All'
                              ? 'No orders match the search or filter criteria.'
                              : "You haven't received any orders yet."
                          }
                          action={
                            (searchQuery || filterStatus !== 'All') && (
                              <button
                                onClick={() => setFilterStatus('All')}
                                className="admin-btn admin-btn-outline"
                              >
                                Clear Filters
                              </button>
                            )
                          }
                        />
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((o) => {
                      const isVip = o.total >= 15000;
                      const isNew = o.date && o.date.includes('Today');

                      return (
                        <tr
                          key={o.id}
                          className="admin-table-row-clickable group"
                          onClick={() => openOrderDrawer(o)}
                        >
                          <td className="font-semibold text-[var(--admin-text-primary)]">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                #{o.id.substring(o.id.length - 8).toUpperCase()}
                                {isNew && (
                                  <span
                                    className="w-1.5 h-1.5 rounded-full bg-[var(--admin-accent)] animate-ping"
                                    title="Recent order"
                                  />
                                )}
                              </div>
                              {o.orderType && o.orderType !== 'purchase' && (
                                <span
                                  className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded w-max ${o.orderType === 'rental' ? 'bg-indigo-100 text-indigo-700' : 'bg-purple-100 text-purple-700'}`}
                                >
                                  {o.orderType}
                                </span>
                              )}
                            </div>
                          </td>
                          <td>
                            <div className="flex flex-col">
                              <span className="font-semibold text-[var(--admin-text-primary)]">
                                {o.customer}
                              </span>
                              <span className="text-[11px] text-[var(--admin-text-tertiary)] mt-0.5 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[12px]">call</span>
                                {o.phone}
                              </span>
                            </div>
                          </td>
                          <td className="hidden md:table-cell max-w-[200px] truncate text-[var(--admin-text-secondary)]">
                            {o.items.map((i) => `${i.name} (x${i.quantity || 1})`).join(', ')}
                          </td>
                          <td className="font-bold text-[var(--admin-text-primary)]">
                            <div className="flex flex-col items-start">
                              <span>{formatCurrency(o.total)}</span>
                              {isVip && (
                                <span className="admin-badge admin-badge-neutral text-[8px] mt-1 p-0.5 px-1 font-extrabold uppercase bg-[var(--admin-surface-muted)]">
                                  VIP Collection
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="hidden sm:table-cell">
                            <span className="admin-badge admin-badge-neutral uppercase text-[9px] tracking-wider font-bold">
                              {o.payment}
                            </span>
                          </td>
                          <td>
                            <StatusBadge status={o.status} />
                          </td>
                          <td className="hidden lg:table-cell text-[var(--admin-text-secondary)]">
                            {o.date}
                          </td>
                          <td>
                            {o.needByDate ? (
                              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-[var(--admin-radius-sm)] bg-[var(--admin-info-light)] text-[var(--admin-info)] border border-[var(--admin-info-border)] text-[10px] font-bold uppercase tracking-wider">
                                <span className="material-symbols-outlined text-[12px]">
                                  calendar_today
                                </span>
                                {new Date(o.needByDate).toLocaleDateString('en-IN', {
                                  day: 'numeric',
                                  month: 'short',
                                })}
                              </span>
                            ) : (
                              <span className="text-[var(--admin-text-tertiary)]">—</span>
                            )}
                          </td>
                          <td className="text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => openOrderDrawer(o)}
                                className="admin-btn-icon w-8 h-8 p-0 min-h-0 text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)]"
                                title="Quick Details"
                              >
                                <span className="material-symbols-outlined text-[16px]">
                                  visibility
                                </span>
                              </button>
                              <button
                                onClick={() => navigate(`/admin/orders/${o.id}`)}
                                className="admin-btn-icon w-8 h-8 p-0 min-h-0 text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)]"
                                title="Full Invoice"
                              >
                                <span className="material-symbols-outlined text-[16px]">
                                  receipt_long
                                </span>
                              </button>
                              <a
                                href={`https://wa.me/${o.phone.replace(/[^0-9]/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="admin-btn-icon w-8 h-8 p-0 min-h-0 text-[var(--admin-text-tertiary)] hover:text-[var(--admin-success)]"
                                title="WhatsApp"
                              >
                                <span className="material-symbols-outlined text-[16px]">chat</span>
                              </a>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Cards (replaces table on small screens) */}
            <div className="flex md:hidden flex-col gap-3 p-3 bg-[var(--admin-bg-subtle)]">
              {filteredOrders.length === 0 ? (
                <div className="py-10 text-center flex flex-col items-center justify-center bg-[var(--admin-surface)] rounded-[var(--admin-radius-lg)]">
                  <EmptyState
                    icon={searchQuery || filterStatus !== 'All' ? 'search_off' : 'shopping_bag'}
                    title={
                      searchQuery || filterStatus !== 'All' ? 'No Matches Found' : 'No Orders Yet'
                    }
                    description={
                      searchQuery || filterStatus !== 'All'
                        ? 'No orders match the search or filter criteria.'
                        : "You haven't received any orders yet."
                    }
                    action={
                      (searchQuery || filterStatus !== 'All') && (
                        <button
                          onClick={() => setFilterStatus('All')}
                          className="admin-btn admin-btn-outline"
                        >
                          Clear Filters
                        </button>
                      )
                    }
                  />
                </div>
              ) : (
                filteredOrders.map((o) => {
                  const isNew = o.date && o.date.includes('Today');
                  return (
                    <div
                      key={o.id}
                      onClick={() => openOrderDrawer(o)}
                      className="bg-[var(--admin-surface)] rounded-[var(--admin-radius-lg)] p-4 shadow-sm border border-[var(--admin-border)] flex flex-col gap-3 cursor-pointer hover:border-[var(--admin-border-strong)] transition-all"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[var(--admin-text-primary)] text-[14px]">
                              #{o.id.substring(o.id.length - 8).toUpperCase()}
                            </span>
                            {isNew && (
                              <span className="w-2 h-2 rounded-full bg-[var(--admin-accent)] animate-pulse" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[11px] font-medium text-[var(--admin-text-secondary)] block">
                              {o.customer}
                            </span>
                            {o.orderType && o.orderType !== 'purchase' && (
                              <span
                                className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${o.orderType === 'rental' ? 'bg-indigo-100 text-indigo-700' : 'bg-purple-100 text-purple-700'}`}
                              >
                                {o.orderType}
                              </span>
                            )}
                          </div>
                        </div>
                        <StatusBadge
                          status={o.status}
                          className="border-none px-2 py-1 text-[10px]"
                        />
                      </div>

                      <div className="pt-2 pb-2 border-y border-[var(--admin-border-subtle)]">
                        <p className="text-[12px] text-[var(--admin-text-primary)] line-clamp-2">
                          {o.items.map((i) => `${i.name} (x${i.quantity || 1})`).join(', ')}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="font-bold text-[var(--admin-text-primary)] text-[14px]">
                          {formatCurrency(o.total)}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="admin-badge admin-badge-neutral text-[9px] uppercase font-bold tracking-wider">
                            {o.payment}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openOrderDrawer(o);
                            }}
                            className="admin-btn-icon w-8 h-8 p-0 min-h-0 text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)]"
                          >
                            <span className="material-symbols-outlined text-[18px]">more_vert</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        ) : (
          /* KANBAN BOARD */
          <motion.div
            key="kanban"
            initial="hidden"
            animate="show"
            exit="hidden"
            variants={fadeUp}
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 items-start"
          >
            {filteredOrders.length === 0 ? (
              <div className="py-20 text-center col-span-full admin-card flex flex-col items-center justify-center">
                <span className="material-symbols-outlined text-[36px] text-[var(--admin-text-tertiary)] mb-2">
                  search_off
                </span>
                <p className="text-[12px] font-bold text-[var(--admin-text-secondary)]">
                  Data Not Found
                </p>
                <p className="text-[11px] mt-0.5 text-[var(--admin-text-tertiary)]">
                  Try adjusting your active search keywords or status tabs.
                </p>
              </div>
            ) : (
              allStatuses.slice(0, 5).map((status) => {
                const statusOrders = filteredOrders.filter((o) => o.status === status);

                return (
                  <div
                    key={status}
                    className="bg-[var(--admin-bg-subtle)] rounded-[var(--admin-radius-xl)] p-3 border border-[var(--admin-border)] flex flex-col h-[400px] md:h-[600px] admin-kanban-column"
                  >
                    {/* Column Header */}
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-[var(--admin-border-subtle)] shrink-0 select-none">
                      <div className="flex items-center gap-2 text-left">
                        <span className="material-symbols-outlined text-[16px] text-[var(--admin-text-secondary)]">
                          {statusIcons[status]}
                        </span>
                        <span className="text-[12px] font-bold text-[var(--admin-text-primary)] uppercase tracking-wider">
                          {status}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold bg-[var(--admin-surface-muted)] border border-[var(--admin-border)] text-[var(--admin-text-secondary)] px-1.5 py-0.5 rounded-[var(--admin-radius-sm)]">
                        {statusOrders.length}
                      </span>
                    </div>

                    {/* Cards Pool */}
                    <div className="flex-1 space-y-3 overflow-y-auto custom-scrollbar pr-1">
                      {statusOrders.map((o) => {
                        const hasNote = Boolean(o.notes);

                        return (
                          <div
                            key={o.id}
                            onClick={() => openOrderDrawer(o)}
                            className="bg-[var(--admin-surface)] rounded-[var(--admin-radius-lg)] p-4 border border-[var(--admin-border)] shadow-[var(--admin-shadow-sm)] hover:border-[var(--admin-border-strong)] hover:shadow-[var(--admin-shadow-md)] transition-all duration-200 cursor-pointer group text-left flex flex-col"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[12px] font-bold text-[var(--admin-text-primary)] group-hover:text-[var(--admin-accent)] transition-colors">
                                    #{o.id.substring(o.id.length - 8).toUpperCase()}
                                  </span>
                                  {o.orderType && o.orderType !== 'purchase' && (
                                    <span
                                      className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${o.orderType === 'rental' ? 'bg-indigo-100 text-indigo-700' : 'bg-purple-100 text-purple-700'}`}
                                    >
                                      {o.orderType}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] font-medium text-[var(--admin-text-secondary)] mt-0.5 truncate max-w-[120px]">
                                  {o.customer}
                                </p>
                              </div>
                              <span className="text-[12px] font-bold text-[var(--admin-text-primary)]">
                                {formatCurrency(o.total)}
                              </span>
                            </div>

                            <p className="text-[10px] text-[var(--admin-text-tertiary)] truncate mb-4">
                              {o.items.map((i) => i.name).join(', ')}
                            </p>

                            <div
                              className="flex items-center justify-between mt-auto pt-3 border-t border-[var(--admin-border-subtle)] gap-2"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <select
                                value={o.status}
                                onChange={(e) => {
                                  updateOrderStatus(o.id, e.target.value);
                                  toast.success(
                                    `Moved #${o.id.substring(o.id.length - 6).toUpperCase()} to ${e.target.value}`,
                                  );
                                }}
                                className="admin-input py-1 px-2 text-[10px] font-bold uppercase tracking-wider cursor-pointer min-h-0 h-7"
                              >
                                {allStatuses.map((st) => (
                                  <option key={st} value={st}>
                                    {st}
                                  </option>
                                ))}
                              </select>

                              <div className="flex items-center gap-1.5 shrink-0">
                                {hasNote && (
                                  <span
                                    className="material-symbols-outlined text-[14px] text-[var(--admin-warning)]"
                                    title="Contains team note"
                                  >
                                    sticky_note_2
                                  </span>
                                )}
                                <a
                                  href={`https://wa.me/${o.phone.replace(/[^0-9]/g, '')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="w-7 h-7 rounded-[var(--admin-radius-sm)] bg-[var(--admin-success-light)] text-[var(--admin-success)] border border-[var(--admin-success-border)] flex items-center justify-center hover:bg-[var(--admin-success)] hover:text-white transition-colors"
                                >
                                  <span className="material-symbols-outlined text-[14px]">
                                    chat
                                  </span>
                                </a>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {statusOrders.length === 0 && (
                        <div className="py-12 text-center text-[var(--admin-text-tertiary)] border border-dashed border-[var(--admin-border)] rounded-[var(--admin-radius-lg)] flex flex-col items-center justify-center">
                          <span className="material-symbols-outlined text-[24px] mb-2">inbox</span>
                          <span className="text-[10px] uppercase font-bold tracking-wider">
                            Empty
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* QUICK EDIT SIDE DRAWER PANEL */}
      <AnimatePresence>
        {isDrawerOpen && selectedOrder && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
              className="fixed inset-0 z-[999] cursor-pointer"
              style={{ background: 'var(--admin-surface-overlay)', backdropFilter: 'blur(4px)' }}
            />

            <motion.aside
              initial="hidden"
              animate="show"
              exit="exit"
              variants={slideDrawer}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed right-0 top-0 h-screen w-full sm:w-[500px] z-[1000] shadow-[var(--admin-shadow-2xl)] flex flex-col overflow-hidden border-l border-[var(--admin-border)]"
              style={{ background: 'var(--admin-surface)' }}
            >
              {/* Drawer Header */}
              <div className="px-6 py-5 border-b border-[var(--admin-border-subtle)] flex items-center justify-between shrink-0 text-left bg-[var(--admin-bg-subtle)]">
                <div>
                  <h3 className="text-[14px] font-bold text-[var(--admin-text-primary)]">
                    Order Details Panel
                  </h3>
                  <p className="text-[11px] text-[var(--admin-text-tertiary)] mt-1">
                    #{selectedOrder.id.toUpperCase()}
                  </p>
                </div>
                <button onClick={() => setIsDrawerOpen(false)} className="admin-btn-icon">
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              {/* Drawer Scroll Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar text-left bg-[var(--admin-bg)]">
                {/* 1. Client Card */}
                <div className="admin-card p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider">
                        Customer Profile
                      </p>
                      <h4 className="text-[14px] font-bold text-[var(--admin-text-primary)] mt-1">
                        {selectedOrder.customer}
                      </h4>
                    </div>
                    <a
                      href={`https://wa.me/${selectedOrder.phone.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="admin-badge admin-badge-success flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity"
                    >
                      <span className="material-symbols-outlined text-[14px]">chat</span>
                      WhatsApp
                    </a>
                  </div>

                  <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-[12px] pt-4 border-t border-[var(--admin-border-subtle)]">
                    <div>
                      <p className="text-[var(--admin-text-tertiary)] font-medium mb-0.5 text-[10px] uppercase">
                        Phone
                      </p>
                      <p className="font-semibold text-[var(--admin-text-primary)]">
                        {selectedOrder.phone}
                      </p>
                    </div>
                    <div>
                      <p className="text-[var(--admin-text-tertiary)] font-medium mb-0.5 text-[10px] uppercase">
                        Payment Mode
                      </p>
                      <p className="font-semibold text-[var(--admin-text-primary)]">
                        {selectedOrder.payment}
                      </p>
                    </div>
                    <div>
                      <p className="text-[var(--admin-text-tertiary)] font-medium mb-0.5 text-[10px] uppercase">
                        Invoice Date
                      </p>
                      <p className="font-semibold text-[var(--admin-text-primary)]">
                        {selectedOrder.date}
                      </p>
                    </div>
                    {selectedOrder.needByDate && (
                      <div>
                        <p className="text-[var(--admin-info)] font-bold mb-0.5 text-[10px] uppercase">
                          Need-By Date
                        </p>
                        <p className="font-bold text-[var(--admin-info)] flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">
                            calendar_today
                          </span>
                          {new Date(selectedOrder.needByDate).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Items List */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-[var(--admin-text-secondary)] pl-1">
                    Curated Items
                  </h4>
                  <div className="space-y-2">
                    {selectedOrder.items.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-[var(--admin-radius-lg)] shadow-[var(--admin-shadow-sm)]"
                      >
                        <div className="flex items-center gap-3">
                          {item.image && (
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-10 h-10 rounded-[var(--admin-radius-md)] object-cover border border-[var(--admin-border-subtle)] shrink-0"
                            />
                          )}
                          <div>
                            <p className="text-[12px] font-bold text-[var(--admin-text-primary)] line-clamp-1">
                              {item.name}
                            </p>
                            <p className="text-[11px] text-[var(--admin-text-tertiary)] mt-0.5">
                              Qty: {item.qty || item.quantity || 1}
                            </p>
                            {item.type === 'rental' && (
                              <div className="mt-1 flex flex-wrap gap-1">
                                <span
                                  className={`text-[9px] px-1.5 py-0.5 rounded border font-bold uppercase tracking-wider ${
                                    item.rentalInfo?.inspectionStatus === 'Inspected'
                                      ? 'bg-green-100 text-green-700 border-green-200'
                                      : item.rentalInfo?.inspectionStatus === 'Damage Reported'
                                        ? 'bg-red-100 text-red-700 border-red-200'
                                        : 'bg-amber-100 text-amber-700 border-amber-200'
                                  }`}
                                >
                                  Insp: {item.rentalInfo?.inspectionStatus || 'Pending'}
                                </span>
                                <span
                                  className={`text-[9px] px-1.5 py-0.5 rounded border font-bold uppercase tracking-wider ${
                                    item.rentalInfo?.refundStatus === 'Refunded'
                                      ? 'bg-green-100 text-green-700 border-green-200'
                                      : item.rentalInfo?.refundStatus === 'Deducted'
                                        ? 'bg-purple-100 text-purple-700 border-purple-200'
                                        : 'bg-amber-100 text-amber-700 border-amber-200'
                                  }`}
                                >
                                  Ref: {item.rentalInfo?.refundStatus || 'Pending'}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        <span className="text-[12px] font-bold text-[var(--admin-text-primary)] shrink-0 ml-3">
                          {formatCurrency(Number(item.price * (item.qty || item.quantity || 1)))}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between p-4 bg-[var(--admin-surface-muted)] border border-[var(--admin-border-strong)] rounded-[var(--admin-radius-lg)]">
                    <span className="text-[12px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider">
                      Grand Total
                    </span>
                    <span className="text-[16px] text-[var(--admin-text-primary)] font-bold">
                      {formatCurrency(selectedOrder.total)}
                    </span>
                  </div>
                </div>

                {/* 3. Transaction Timeline */}
                <div className="admin-card p-5">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-[var(--admin-text-secondary)] mb-5">
                    Delivery Timeline
                  </h4>
                  <div className="relative pl-6 space-y-5 border-l-2 border-[var(--admin-border)] ml-3">
                    {allStatuses.slice(0, 5).map((st, sidx) => {
                      const isDone = allStatuses.indexOf(selectedOrder.status) >= sidx;
                      const isCurrent = selectedOrder.status === st;

                      return (
                        <div key={st} className="relative flex items-center justify-between">
                          <span
                            className={`absolute -left-[31px] w-4 h-4 rounded-full border-2 bg-[var(--admin-surface)] flex items-center justify-center transition-all ${
                              isDone
                                ? 'border-[var(--admin-accent)]'
                                : 'border-[var(--admin-border-strong)]'
                            }`}
                          >
                            {isDone && (
                              <span className="w-2 h-2 rounded-full bg-[var(--admin-accent)]" />
                            )}
                          </span>
                          <div>
                            <p
                              className={`text-[12px] font-bold ${isCurrent ? 'text-[var(--admin-accent)]' : 'text-[var(--admin-text-secondary)]'}`}
                            >
                              {st}
                            </p>
                          </div>
                          {isCurrent && (
                            <span className="text-[9px] uppercase font-bold tracking-widest text-[var(--admin-accent)] bg-[var(--admin-accent)]/10 px-2 py-0.5 rounded-full animate-pulse border border-[var(--admin-accent)]/20">
                              Active State
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 4. Staff Notes Form */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider block pl-1">
                    Internal Staff Notes
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Type logistics references, customer specifications, or event notes..."
                    value={orderNoteDraft.text}
                    onChange={(e) => setOrderNoteDraft({ text: e.target.value })}
                    onBlur={handleSaveNoteDraft}
                    className="admin-textarea bg-[var(--admin-surface)]"
                  />
                  <p className="text-[10px] text-[var(--admin-text-tertiary)] pl-1">
                    * Note auto-saves when you click out. Visible only to studio staff.
                  </p>
                </div>
              </div>

              {/* Drawer Footer Controls */}
              <div className="p-5 bg-[var(--admin-surface-muted)] border-t border-[var(--admin-border)] shrink-0 flex flex-col gap-4 text-left admin-drawer-footer">
                <div className="flex-1">
                  <label className="text-[10px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider block mb-2">
                    Direct Status Override
                  </label>
                  <select
                    value={selectedOrderData?.status || selectedOrder.status}
                    onChange={(e) => {
                      updateOrderStatus(selectedOrder.id, e.target.value);
                      toast.success(`Updated order status to ${e.target.value}`);
                    }}
                    className="admin-input font-bold"
                  >
                    {allStatuses.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-3 w-full">
                  <button
                    type="button"
                    onClick={() => {
                      setIsDrawerOpen(false);
                      navigate(`/admin/orders/${selectedOrder.id}`);
                    }}
                    className="admin-btn admin-btn-outline flex-1 min-h-[40px]"
                  >
                    <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                    Full Details
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsDrawerOpen(false)}
                    className="admin-btn flex-1 min-h-[40px]"
                  >
                    Done
                  </button>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

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
