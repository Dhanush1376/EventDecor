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
  AdminFilterDrawer,
} from '../components/AdminUIKit';
import { SkeletonList } from '../components/ui/Skeletons';
import { AdminOrdersTable } from '../components/AdminOrdersTable';
import { AdminOrdersKanban } from '../components/AdminOrdersKanban';
import { AdminOrderDrawer } from '../components/AdminOrderDrawer';
import { AdminActiveFilterChips } from '../components/filters/AdminActiveFilterChips';
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
    selectedOrder,
    setSelectedOrder,
    isDrawerOpen,
    setIsDrawerOpen,
    codStats,
    filteredOrders,
    statusCounts,
    handleExportCSV,
    openOrderDrawer,
    sortBy,
    setSortBy,
    savedView,
    handleSavedViewChange,
    filterState,
    setFilterValue,
    resetFilter,
    resetAllFilters,
    activeChips,
    activeCount,
    totalCount,
    matchCount,
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
          e.preventDefault();
          const scanned = buffer.trim();
          buffer = '';

          // Look up scanned order
          const matched = orders.find(
            (o) =>
              o.id?.toLowerCase() === scanned.toLowerCase() ||
              o.orderCode?.toLowerCase() === scanned.toLowerCase() ||
              o._id?.toLowerCase() === scanned.toLowerCase(),
          );

          if (matched) {
            playSuccessBeep();
            toast.success(`Scanned: #${matched.orderCode || matched.id}`);
            openOrderDrawer(matched);
          } else {
            playErrorBeep();
            toast.error(`Order not found: ${scanned}`);
          }
        } else {
          buffer = '';
        }
        return;
      }

      if (e.key.length === 1) {
        buffer += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [orders, openOrderDrawer]);

  // Derive selected order data from orders list dynamically
  const selectedOrderData = selectedOrder ? orders.find((o) => o.id === selectedOrder.id) : null;

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={stagger}
      className="space-y-4 sm:space-y-6 pb-28 sm:pb-8"
    >
      {/* Page Title and Live Indicators Header */}
      {!hideHeader && (
        <PageHeader
          title="Orders & Shipments"
          subtitle={
            dataLoading ? (
              <span>Loading orders...</span>
            ) : (
              <div className="flex flex-wrap items-center gap-1.5 text-[12.5px] sm:text-[13px]">
                <span className="font-semibold text-[var(--admin-text-primary)]">
                  {orders.length} Total Orders
                </span>
                <span className="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  {
                    orders.filter((o) => (o.status || '').toLowerCase() === 'processing').length
                  }{' '}
                  Processing
                </span>
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {orders.filter((o) => (o.status || '').toLowerCase() === 'delivered').length}{' '}
                  Delivered
                </span>
              </div>
            )
          }
          actions={
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-[var(--admin-text-tertiary)] flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px] text-emerald-600">
                  barcode_scanner
                </span>
                <span className="hidden sm:inline">Barcode Scanner Ready</span>
              </span>
            </div>
          }
        />
      )}

      {/* ─── STICKY SEARCH & ACTIONS BAR (Sticky below top navbar) ─── */}
      <div className="sticky top-[var(--admin-topbar-height,56px)] z-20 -my-2 py-2.5 bg-[var(--admin-bg)]/95 backdrop-blur-md mb-3 sm:mb-5">
        <motion.div variants={fadeUp} className="flex flex-row items-center gap-2 w-full">
          {/* Search Bar */}
          <div className="relative flex-1 min-w-0 bg-[var(--admin-surface-muted)] rounded-[4px] border border-[var(--admin-border)] flex items-center px-2.5 sm:px-3 h-[42px] min-h-[42px] max-h-[42px]">
            <span className="material-symbols-outlined text-[18px] text-[var(--admin-text-tertiary)] shrink-0">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Order ID, Customer, Phone, or Item..."
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

          {/* Action Controls Group */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Filters Button & Drawer */}
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

              <AdminFilterDrawer
                isOpen={showFiltersMenu}
                onClose={() => setShowFiltersMenu(false)}
                title="Filter Orders"
                icon="tune"
                activeCount={activeCount}
                onClearAll={resetAllFilters}
                clearAllLabel="Reset"
                onApply={() => setShowFiltersMenu(false)}
              >
                {/* 1. Fulfillment Status */}
                <div>
                  <label className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider mb-1.5 block">
                    Fulfillment Status
                  </label>
                  <select
                    value={filterState.fulfillmentStatus}
                    onChange={(e) => setFilterValue('fulfillmentStatus', e.target.value)}
                    className="w-full bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-[4px] px-3 py-2 text-[12px] font-medium outline-none text-[var(--admin-text-primary)] cursor-pointer"
                  >
                    <option value="All Statuses">All Fulfillment Statuses</option>
                    <option value="Pending">Pending Confirmation</option>
                    <option value="Confirmed">Confirmed</option>
                    <option value="Processing">Processing / In Production</option>
                    <option value="Delivered">Delivered</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>

                {/* 3. Event / Delivery Timing (Strictly on Delivery Date) */}
                <div>
                  <label className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider mb-1.5 block">
                    Event / Delivery Schedule
                  </label>
                  <select
                    value={filterState.deliveryEventTiming}
                    onChange={(e) => setFilterValue('deliveryEventTiming', e.target.value)}
                    className="w-full bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-[4px] px-3 py-2 text-[12px] font-medium outline-none text-[var(--admin-text-primary)] cursor-pointer"
                  >
                    <option value="All Time">Any Delivery Date</option>
                    <option value="Today">Delivering Today</option>
                    <option value="Tomorrow">Delivering Tomorrow</option>
                    <option value="This Weekend">This Weekend (Sat/Sun Events)</option>
                    <option value="Next 7 Days">Next 7 Days</option>
                    <option value="This Month">This Month</option>
                  </select>
                </div>

                {/* 4. Placement Date (Strictly on Created Date) */}
                <div>
                  <label className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider mb-1.5 block">
                    Date Placed (Booking Created)
                  </label>
                  <select
                    value={filterState.placementDate}
                    onChange={(e) => setFilterValue('placementDate', e.target.value)}
                    className="w-full bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-[4px] px-3 py-2 text-[12px] font-medium outline-none text-[var(--admin-text-primary)] cursor-pointer"
                  >
                    <option value="All Time">All Time</option>
                    <option value="Today">Placed Today</option>
                    <option value="Yesterday">Placed Yesterday</option>
                    <option value="Last 7 Days">Last 7 Days</option>
                    <option value="Last 30 Days">Last 30 Days</option>
                    <option value="This Month">This Month</option>
                  </select>
                </div>

                {/* 5. Payment Method & Status */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider mb-1.5 block">
                      Payment Method
                    </label>
                    <select
                      value={filterState.paymentMethod}
                      onChange={(e) => setFilterValue('paymentMethod', e.target.value)}
                      className="w-full bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-[4px] px-2.5 py-2 text-[12px] font-medium outline-none text-[var(--admin-text-primary)] cursor-pointer"
                    >
                      <option value="All">All Methods</option>
                      <option value="cod">Cash on Delivery</option>
                      <option value="online">Prepaid Online</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider mb-1.5 block">
                      Payment Status
                    </label>
                    <select
                      value={filterState.paymentStatus}
                      onChange={(e) => setFilterValue('paymentStatus', e.target.value)}
                      className="w-full bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-[4px] px-2.5 py-2 text-[12px] font-medium outline-none text-[var(--admin-text-primary)] cursor-pointer"
                    >
                      <option value="All">All Statuses</option>
                      <option value="paid">Paid / Settled</option>
                      <option value="pending">Pending</option>
                      <option value="failed">Failed</option>
                      <option value="refunded">Refunded</option>
                    </select>
                  </div>
                </div>

                {/* 6. Order Value Range (₹) */}
                <div>
                  <label className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider mb-1.5 block">
                    Order Value Range (₹)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      placeholder="Min ₹"
                      value={filterState.orderValue?.min ?? ''}
                      onChange={(e) =>
                        setFilterValue('orderValue', {
                          ...filterState.orderValue,
                          min: e.target.value,
                        })
                      }
                      className="w-full bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-[4px] px-2.5 py-1.5 text-[12px] outline-none text-[var(--admin-text-primary)]"
                    />
                    <input
                      type="number"
                      placeholder="Max ₹"
                      value={filterState.orderValue?.max ?? ''}
                      onChange={(e) =>
                        setFilterValue('orderValue', {
                          ...filterState.orderValue,
                          max: e.target.value,
                        })
                      }
                      className="w-full bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-[4px] px-2.5 py-1.5 text-[12px] outline-none text-[var(--admin-text-primary)]"
                    />
                  </div>
                </div>

                {/* 7. Operational Flags */}
                <div>
                  <label className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider mb-1.5 block">
                    Operational Flags
                  </label>
                  <select
                    value={filterState.attention}
                    onChange={(e) => setFilterValue('attention', e.target.value)}
                    className="w-full bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-[4px] px-3 py-2 text-[12px] font-medium outline-none text-[var(--admin-text-primary)] cursor-pointer"
                  >
                    <option value="All">All Orders</option>
                    <option value="Needs Attention">Needs Attention (Delayed / Hold)</option>
                    <option value="On Hold">On Hold Only</option>
                  </select>
                </div>

                {/* 8. Sort Order */}
                <div>
                  <label className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider mb-1.5 block">
                    Sort Order
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-[4px] px-3 py-2 text-[12px] font-medium outline-none text-[var(--admin-text-primary)] cursor-pointer"
                  >
                    <option value="Newest first">Newest first</option>
                    <option value="Oldest first">Oldest first</option>
                    <option value="Delivery date ↑">Delivery date ↑</option>
                    <option value="Delivery date ↓">Delivery date ↓</option>
                    <option value="Order value ↑">Order value ↑</option>
                    <option value="Order value ↓">Order value ↓</option>
                  </select>
                </div>
              </AdminFilterDrawer>
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

        {/* Active Filter Chips Row */}
        <AdminActiveFilterChips
          activeChips={activeChips}
          totalCount={totalCount}
          matchCount={matchCount}
          onClearAll={resetAllFilters}
          itemName="orders"
          className="mt-2 mb-1"
        />
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
                filterStatus={filterState.status}
                setFilterStatus={(val) => setFilterValue('status', val)}
                onResetFilters={resetAllFilters}
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
                onResetFilters={() => {
                  resetAllFilters();
                  setSearchQuery('');
                }}
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
