import { m as motion, AnimatePresence } from 'framer-motion';

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '../context/AdminContext';
import { playSuccessBeep, playErrorBeep } from '../../utils/media/audioUtils';
import toast from 'react-hot-toast';
import {
  PageHeader,
  SkeletonTable,
  formatCurrency,
  fadeUp,
  stagger,
} from '../components/AdminUIKit';
import { SkeletonList } from '../components/ui/Skeletons';
import { AdminOrdersTable } from '../components/AdminOrdersTable';
import { AdminOrdersKanban } from '../components/AdminOrdersKanban';
import { AdminOrderDrawer } from '../components/AdminOrderDrawer';
import { useOrderFilters, allStatuses, statusIcons } from '../hooks/useOrderFilters';

const slideDrawer = {
  hidden: { x: '100%', opacity: 0 },
  show: { x: 0, opacity: 1 },
  exit: { x: '100%', opacity: 0 },
};

export function AdminOrders({ hideHeader = false }) {
  const navigate = useNavigate();
  const {
    orders,
    dataLoading,
    updateOrderStatus,
    updateOrderNotes,
    deleteOrder,
    searchQuery,
    setSearchQuery,
  } = useAdmin();

  const {
    viewMode,
    setViewMode,
    filterStatus,
    setFilterStatus,
    filterOrderType,
    setFilterOrderType,
    selectedOrder,
    setSelectedOrder,
    isDrawerOpen,
    setIsDrawerOpen,
    codStats,
    filteredOrders,
    statusCounts,
    handleExportCSV,
    openOrderDrawer,
    dateFilter,
    setDateFilter,
    customDateRange,
    setCustomDateRange,
    paymentFilter,
    setPaymentFilter,
    deliveryDateFilter,
    setDeliveryDateFilter,
    customDeliveryRange,
    setCustomDeliveryRange,
    orderValueRange,
    setOrderValueRange,
    attentionFilter,
    setAttentionFilter,
    sortBy,
    setSortBy,
    savedView,
    setSavedView,
  } = useOrderFilters(orders, searchQuery);

  const [showFiltersMenu, setShowFiltersMenu] = useState(false);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 640 : false,
  );

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSavedViewChange = (e) => {
    const view = e.target.value;
    setSavedView(view);

    // Reset defaults first
    setFilterStatus('All Statuses');
    setDateFilter('All Time');
    setPaymentFilter('All');
    setDeliveryDateFilter('All Time');
    setAttentionFilter('All');

    if (view === "Today's Deliveries") {
      setDeliveryDateFilter('Today');
      setFilterStatus('Processing');
    } else if (view === "Tomorrow's Deliveries") {
      setDeliveryDateFilter('Tomorrow');
      setFilterStatus('Processing');
    } else if (view === 'Needs Attention') {
      setAttentionFilter('Needs Attention');
    } else if (view === 'Processing') {
      setFilterStatus('Processing');
    }
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filterStatus !== 'All Statuses') count++;
    if (dateFilter !== 'All Time') count++;
    if (paymentFilter !== 'All') count++;
    if (deliveryDateFilter !== 'All Time') count++;
    if (attentionFilter !== 'All') count++;
    if (orderValueRange.min !== '' || orderValueRange.max !== '') count++;
    return count;
  };

  const activeCount = getActiveFilterCount();

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

  // Notes draft removed

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={stagger}
      className="space-y-6 pb-12 sm:pb-8"
    >
      {!hideHeader && (
        <PageHeader
          title="Orders"
          subtitle={
            dataLoading ? (
              <span>Loading orders summary...</span>
            ) : (
              <div className="flex flex-wrap items-center gap-1.5 text-[13px]">
                <span className="font-semibold text-[var(--admin-text-primary)]">
                  {orders.length} Total Orders
                </span>
                <span className="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  {statusCounts?.Pending || 0} Pending
                </span>
                {(statusCounts?.Delivered || 0) > 0 && (
                  <>
                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      {statusCounts.Delivered} Delivered
                    </span>
                  </>
                )}
              </div>
            )
          }
        />
      )}

      {/* Search & Actions Bar: Sticky below top navbar */}
      <div className="sticky top-[var(--admin-topbar-height,56px)] z-20 -my-2 py-2.5 bg-[var(--admin-bg)]/95 backdrop-blur-md">
        <motion.div variants={fadeUp} className="flex flex-row items-center gap-2 w-full">
          {/* Search Bar - Height exactly matches FilterBar/Actions (42px) */}
          <div className="relative flex-1 min-w-0 bg-[var(--admin-surface-muted)] rounded-[4px] border border-[var(--admin-border)] flex items-center px-2.5 sm:px-3 h-[42px] min-h-[42px] max-h-[42px]">
            <span className="material-symbols-outlined text-[18px] text-[var(--admin-text-tertiary)] shrink-0">
              search
            </span>
            <input
              type="text"
              value={searchQuery || ''}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search orders..."
              className="bg-transparent border-none outline-none w-full text-[13px] text-[var(--admin-text-primary)] placeholder-[var(--admin-text-tertiary)] font-medium px-2 h-full min-w-0"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)] cursor-pointer p-1 flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            )}
          </div>

          {/* Action Controls Group (no overflow clipping so dropdowns open on laptop) */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Filters Button */}
            <div className="relative shrink-0">
              <button
                onClick={() => setShowFiltersMenu(!showFiltersMenu)}
                className={`h-[42px] min-h-[42px] max-h-[42px] px-2.5 sm:px-3.5 flex items-center justify-center gap-1.5 rounded-[4px] border transition-colors shrink-0 cursor-pointer ${
                  showFiltersMenu || activeCount > 0
                    ? 'bg-[var(--admin-accent)] text-white border-transparent shadow-sm'
                    : 'bg-[var(--admin-surface-muted)] text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] border-[var(--admin-border)] hover:border-[var(--admin-border-strong)]'
                }`}
                title="Order Filters"
              >
                <span className="material-symbols-outlined text-[18px]">tune</span>
                <span className="font-semibold text-[13px] hidden sm:inline">
                  {activeCount > 0 ? `${activeCount} Filters` : 'Filters'}
                </span>
                {activeCount > 0 && (
                  <span className="min-w-[16px] h-4 px-1 rounded-full bg-white text-[var(--admin-accent)] text-[10px] font-bold flex items-center justify-center">
                    {activeCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {showFiltersMenu && (
                  <>
                    <div
                      onClick={() => setShowFiltersMenu(false)}
                      className="fixed inset-0 z-[120] bg-black/30 sm:bg-transparent"
                    />

                    <motion.div
                      initial={isMobile ? { y: '100%' } : { opacity: 0, y: -8, scale: 0.98 }}
                      animate={isMobile ? { y: 0 } : { opacity: 1, y: 0, scale: 1 }}
                      exit={isMobile ? { y: '100%' } : { opacity: 0, y: -8, scale: 0.98 }}
                      transition={{ duration: 0.15 }}
                      className="fixed sm:absolute bottom-0 inset-x-0 sm:top-full sm:bottom-auto sm:right-0 sm:left-auto z-[130] sm:mt-2 w-full sm:w-[320px] bg-[var(--admin-surface)] rounded-t-[8px] sm:rounded-[4px] shadow-2xl border border-[var(--admin-border-strong)] flex flex-col p-5 sm:p-4 text-left"
                    >
                      <div className="flex justify-between items-center mb-4 sm:mb-3">
                        <h3 className="text-[14px] font-bold text-[var(--admin-text-primary)] flex items-center gap-2">
                          <span className="material-symbols-outlined text-[18px]">filter_list</span>
                          Order Filters
                        </h3>
                        <button
                          onClick={() => setShowFiltersMenu(false)}
                          className="sm:hidden admin-btn-icon hover:bg-[var(--admin-bg-subtle)] !rounded-[4px] p-1"
                        >
                          <span className="material-symbols-outlined text-[20px]">close</span>
                        </button>
                      </div>

                      <div className="space-y-5 max-h-[60vh] overflow-y-auto scrollbar-hide">
                        {/* Core Filters */}
                        <div className="space-y-4 pt-2">
                          {/* Saved Views */}
                          <div>
                            <label className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider mb-2 block">
                              Saved Views (Quick Filters)
                            </label>
                            <select
                              value={savedView}
                              onChange={handleSavedViewChange}
                              className="w-full bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-[4px] px-3 py-2 text-[12px] font-medium outline-none text-[var(--admin-accent)]"
                            >
                              <option value="All Orders">View: All Orders</option>
                              <option value="Today's Deliveries">Today's Deliveries</option>
                              <option value="Tomorrow's Deliveries">Tomorrow's Deliveries</option>
                              <option value="Needs Attention">Needs Attention</option>
                              <option value="Processing">Processing</option>
                            </select>
                          </div>

                          {/* Sort */}
                          <div>
                            <label className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider mb-2 block">
                              Sort By
                            </label>
                            <select
                              value={sortBy}
                              onChange={(e) => setSortBy(e.target.value)}
                              className="w-full bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-[4px] px-3 py-2 text-[12px] outline-none"
                            >
                              <option value="Newest first">Newest first</option>
                              <option value="Oldest first">Oldest first</option>
                              <option value="Delivery date ↑">Delivery date ↑</option>
                              <option value="Delivery date ↓">Delivery date ↓</option>
                              <option value="Order value ↑">Order value ↑</option>
                              <option value="Order value ↓">Order value ↓</option>
                            </select>
                          </div>

                          {/* Order Type */}
                          <div>
                            <label className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider mb-2 block">
                              Order Type
                            </label>
                            <select
                              value={filterStatus}
                              onChange={(e) => setFilterStatus(e.target.value)}
                              className="w-full bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-[4px] px-3 py-2 text-[12px] outline-none"
                            >
                              <option value="All Statuses">All Types</option>
                              <option value="purchase">Purchase Orders</option>
                              <option value="rental">Rental Bookings</option>
                              <option value="custom">Custom Requests</option>
                            </select>
                          </div>

                          {/* Date Range */}
                          <div>
                            <label className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider mb-2 block">
                              Date Range
                            </label>
                            <select
                              value={dateFilter}
                              onChange={(e) => setDateFilter(e.target.value)}
                              className="w-full bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-[4px] px-3 py-2 text-[12px] outline-none"
                            >
                              <option value="All Time">All Time</option>
                              <option value="Today">Today</option>
                              <option value="Last 7 Days">Last 7 Days</option>
                              <option value="Last 30 Days">Last 30 Days</option>
                              <option value="This Month">This Month</option>
                              <option value="Custom">Custom Range...</option>
                            </select>
                          </div>

                          {dateFilter === 'Custom' && (
                            <div className="grid grid-cols-2 gap-2 pt-1">
                              <input
                                type="date"
                                value={customDateRange.from}
                                onChange={(e) =>
                                  setCustomDateRange((prev) => ({
                                    ...prev,
                                    from: e.target.value,
                                  }))
                                }
                                className="w-full bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-[4px] px-2 py-1.5 text-[11px] outline-none"
                              />
                              <input
                                type="date"
                                value={customDateRange.to}
                                onChange={(e) =>
                                  setCustomDateRange((prev) => ({
                                    ...prev,
                                    to: e.target.value,
                                  }))
                                }
                                className="w-full bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-[4px] px-2 py-1.5 text-[11px] outline-none"
                              />
                            </div>
                          )}

                          {/* Order Value Range */}
                          <div>
                            <label className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider mb-2 block">
                              Order Value (₹)
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="number"
                                placeholder="Min ₹"
                                value={orderValueRange.min}
                                onChange={(e) =>
                                  setOrderValueRange((prev) => ({
                                    ...prev,
                                    min: e.target.value,
                                  }))
                                }
                                className="w-full bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-[4px] px-2.5 py-1.5 text-[12px] outline-none"
                              />
                              <input
                                type="number"
                                placeholder="Max ₹"
                                value={orderValueRange.max}
                                onChange={(e) =>
                                  setOrderValueRange((prev) => ({
                                    ...prev,
                                    max: e.target.value,
                                  }))
                                }
                                className="w-full bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-[4px] px-2.5 py-1.5 text-[12px] outline-none"
                              />
                            </div>
                          </div>

                          {/* Payment */}
                          <div>
                            <label className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider mb-2 block">
                              Payment Status
                            </label>
                            <select
                              value={paymentFilter}
                              onChange={(e) => setPaymentFilter(e.target.value)}
                              className="w-full bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-[4px] px-3 py-2 text-[12px] outline-none"
                            >
                              <option value="All">All</option>
                              <option value="Paid">Paid</option>
                              <option value="Pending">Pending</option>
                              <option value="Failed">Failed</option>
                              <option value="Refunded">Refunded</option>
                              <option value="Partially Refunded">Partially Refunded</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-[var(--admin-border-subtle)] flex gap-2">
                        <button
                          onClick={() => {
                            setFilterStatus('All Statuses');
                            setDateFilter('All Time');
                            setPaymentFilter('All');
                            setOrderValueRange({ min: '', max: '' });
                            setAttentionFilter('All');
                            setCustomDateRange({ from: '', to: '' });
                            setSavedView('All Orders');
                            setSortBy('Newest first');
                          }}
                          className="admin-btn-outline flex-1 justify-center py-2.5 !rounded-[4px] text-[13px]"
                        >
                          Clear All
                        </button>
                        <button
                          onClick={() => setShowFiltersMenu(false)}
                          className="admin-btn-primary flex-1 justify-center py-2.5 !rounded-[4px] text-[13px]"
                        >
                          Apply Filters
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* View Mode Toggle (Table / Kanban) */}
            <div className="flex items-center gap-1 shrink-0 bg-[var(--admin-surface-muted)] rounded-[4px] border border-[var(--admin-border)] p-1 h-[42px] min-h-[42px] max-h-[42px] box-border">
              <button
                onClick={() => setViewMode('table')}
                className={`h-[32px] w-[32px] min-h-[32px] min-w-[32px] max-h-[32px] max-w-[32px] rounded-[3px] box-border flex items-center justify-center transition-all cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-white dark:bg-stone-800 text-[var(--admin-accent)] shadow-xs font-bold'
                    : 'text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)]'
                }`}
                title="Table View"
              >
                <span className="material-symbols-outlined text-[18px] leading-none">
                  view_list
                </span>
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                className={`h-[32px] w-[32px] min-h-[32px] min-w-[32px] max-h-[32px] max-w-[32px] rounded-[3px] box-border flex items-center justify-center transition-all cursor-pointer ${
                  viewMode === 'kanban'
                    ? 'bg-white dark:bg-stone-800 text-[var(--admin-accent)] shadow-xs font-bold'
                    : 'text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)]'
                }`}
                title="Kanban View"
              >
                <span className="material-symbols-outlined text-[18px] leading-none">
                  view_kanban
                </span>
              </button>
            </div>

            {/* Export Button */}
            <button
              onClick={handleExportCSV}
              className="h-[42px] min-h-[42px] max-h-[42px] w-[42px] sm:w-auto px-0 sm:px-3.5 bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-border-subtle)] text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] rounded-[4px] flex items-center justify-center cursor-pointer transition-all active:scale-95 border border-[var(--admin-border)] shrink-0 gap-1.5 font-semibold text-[13px]"
              title="Export CSV"
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
              <span className="hidden sm:inline">Export</span>
            </button>
          </div>
        </motion.div>
      </div>

      <div className="space-y-6">
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

        {/* CONTENT SWITCHER */}
        <AnimatePresence mode="wait">
          {dataLoading ? (
            <motion.div
              key="loading"
              initial="hidden"
              animate="show"
              exit="hidden"
              variants={fadeUp}
            >
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
              className="w-full"
            >
              <AdminOrdersTable
                filteredOrders={filteredOrders}
                searchQuery={searchQuery}
                filterStatus={filterStatus}
                setFilterStatus={setFilterStatus}
                openOrderDrawer={openOrderDrawer}
                navigate={navigate}
                updateOrderStatus={updateOrderStatus}
                deleteOrder={deleteOrder}
                allStatuses={allStatuses}
              />
            </motion.div>
          ) : (
            /* KANBAN BOARD */
            <motion.div
              key="kanban"
              initial="hidden"
              animate="show"
              exit="hidden"
              variants={fadeUp}
              className="flex gap-4 items-start overflow-x-auto pb-4 custom-scrollbar snap-x snap-mandatory"
            >
              <AdminOrdersKanban
                filteredOrders={filteredOrders}
                allStatuses={allStatuses}
                statusIcons={statusIcons}
                openOrderDrawer={openOrderDrawer}
                updateOrderStatus={updateOrderStatus}
                deleteOrder={deleteOrder}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* QUICK EDIT SIDE DRAWER PANEL */}
        <AnimatePresence>
          {isDrawerOpen && selectedOrder && (
            <AdminOrderDrawer
              selectedOrder={selectedOrder}
              selectedOrderData={selectedOrderData}
              setIsDrawerOpen={setIsDrawerOpen}
              allStatuses={allStatuses}
              updateOrderStatus={updateOrderStatus}
              deleteOrder={deleteOrder}
              navigate={navigate}
            />
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
