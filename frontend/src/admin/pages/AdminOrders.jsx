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
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

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
      className="absolute inset-0 flex flex-col"
    >
      {!hideHeader && (
        <div className="shrink-0 pb-2">
          <PageHeader
            title="Orders"
            subtitle="Manage and track customer orders"
            icon="shopping_bag"
            iconColor="orders"
            mobileRow={false}
            headerAction={
              <div className="flex flex-col sm:flex-row items-stretch gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64 shrink-0 bg-[var(--admin-surface-muted)] rounded-[4px] border border-[var(--admin-border)] flex items-center px-3">
                  <span className="material-symbols-outlined text-[18px] text-[var(--admin-text-tertiary)] shrink-0">
                    search
                  </span>
                  <input
                    type="text"
                    value={searchQuery || ''}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search orders..."
                    className="bg-transparent border-none outline-none w-full text-[13px] text-[var(--admin-text-primary)] placeholder-[var(--admin-text-tertiary)] font-medium px-2 h-10"
                  />
                </div>
                <div className="flex items-stretch gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:flex-none">
                    <button
                      onClick={() => setShowFiltersMenu(!showFiltersMenu)}
                      className={`w-full sm:w-auto h-full px-4 flex items-center justify-between sm:justify-center gap-2 rounded-[4px] border transition-colors ${
                        showFiltersMenu || activeCount > 0
                          ? 'bg-[var(--admin-accent)] text-white border-transparent shadow-sm'
                          : 'bg-[var(--admin-surface-muted)] text-[var(--admin-text-primary)] border-[var(--admin-border)] hover:border-[var(--admin-text-tertiary)]'
                      }`}
                    >
                      <div className="flex items-center gap-2 font-semibold text-[13px]">
                        <span className="material-symbols-outlined text-[16px]">tune</span>
                        <span>{activeCount > 0 ? `${activeCount} Filters` : 'Filters'}</span>
                      </div>
                      <span className="material-symbols-outlined text-[16px]">
                        {showFiltersMenu ? 'expand_less' : 'expand_more'}
                      </span>
                    </button>

                    <AnimatePresence>
                      {showFiltersMenu && (
                        <>
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowFiltersMenu(false)}
                            className="fixed inset-0 z-[100] sm:hidden bg-black/20 backdrop-blur-sm"
                          />

                          <motion.div
                            initial={isMobile ? { y: '100%' } : { opacity: 0, y: -10 }}
                            animate={isMobile ? { y: 0 } : { opacity: 1, y: 0 }}
                            exit={isMobile ? { y: '100%' } : { opacity: 0, y: -10 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="fixed sm:absolute bottom-0 inset-x-0 sm:top-full sm:bottom-auto sm:right-0 sm:left-auto z-[101] sm:mt-2 w-full sm:w-[320px] bg-[var(--admin-surface)] rounded-t-2xl sm:rounded-lg shadow-[var(--admin-shadow-2xl)] border-t sm:border border-[var(--admin-border)] flex flex-col p-5 sm:p-4 text-left"
                          >
                            <div className="flex justify-between items-center mb-4 sm:mb-3">
                              <h3 className="text-[14px] font-bold text-[var(--admin-text-primary)] flex items-center gap-2">
                                <span className="material-symbols-outlined text-[18px]">
                                  filter_list
                                </span>
                                Order Filters
                              </h3>
                              <button
                                onClick={() => setShowFiltersMenu(false)}
                                className="sm:hidden admin-btn-icon hover:bg-[var(--admin-bg-subtle)] rounded-full p-1"
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
                                    <option value="Tomorrow's Deliveries">
                                      Tomorrow's Deliveries
                                    </option>
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

                                {/* Status */}
                                <div>
                                  <label className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider mb-2 block">
                                    Status
                                  </label>
                                  <select
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value)}
                                    className="w-full bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-[4px] px-3 py-2 text-[12px] outline-none"
                                  >
                                    <option value="All Statuses">All Statuses</option>
                                    <option value="Pending">Pending</option>
                                    <option value="Confirmed">Confirmed</option>
                                    <option value="Processing">Processing</option>
                                    <option value="Delivered">Delivered</option>
                                    <option value="Cancelled">Cancelled</option>
                                  </select>
                                </div>

                                {/* Date */}
                                <div>
                                  <label className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider mb-2 block">
                                    Order Date
                                  </label>
                                  <select
                                    value={dateFilter}
                                    onChange={(e) => setDateFilter(e.target.value)}
                                    className="w-full bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-[4px] px-3 py-2 text-[12px] outline-none"
                                  >
                                    <option value="All Time">All Time</option>
                                    <option value="Today">Today</option>
                                    <option value="Yesterday">Yesterday</option>
                                    <option value="This Week">This Week</option>
                                    <option value="Last 7 Days">Last 7 Days</option>
                                    <option value="This Month">This Month</option>
                                  </select>
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
                                className="admin-btn-outline flex-1 justify-center py-2.5 rounded-lg text-[13px]"
                              >
                                Clear All
                              </button>
                              <button
                                onClick={() => setShowFiltersMenu(false)}
                                className="admin-btn-primary flex-1 justify-center py-2.5 rounded-lg text-[13px]"
                              >
                                Apply Filters
                              </button>
                            </div>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 bg-[var(--admin-surface-muted)] rounded-[4px] border border-[var(--admin-border)] p-1">
                    <button
                      onClick={() => setViewMode('table')}
                      className={`w-8 h-8 rounded-sm flex items-center justify-center transition-all ${
                        viewMode === 'table'
                          ? 'bg-white text-[var(--admin-accent)] shadow-sm border border-[var(--admin-border-subtle)]'
                          : 'text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)] border border-transparent'
                      }`}
                      title="Table View"
                    >
                      <span className="material-symbols-outlined text-[18px]">view_list</span>
                    </button>
                    <button
                      onClick={() => setViewMode('kanban')}
                      className={`w-8 h-8 rounded-sm flex items-center justify-center transition-all ${
                        viewMode === 'kanban'
                          ? 'bg-white text-[var(--admin-accent)] shadow-sm border border-[var(--admin-border-subtle)]'
                          : 'text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)] border border-transparent'
                      }`}
                      title="Kanban View"
                    >
                      <span className="material-symbols-outlined text-[18px]">view_kanban</span>
                    </button>
                  </div>
                  <button
                    onClick={handleExportCSV}
                    className="px-3 bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-border-subtle)] text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] rounded-[4px] flex items-center justify-center cursor-pointer transition-all active:scale-95 border border-[var(--admin-border)] shrink-0 gap-1.5 font-semibold text-[13px]"
                    title="Export CSV"
                  >
                    <span className="material-symbols-outlined text-[18px]">download</span>
                    <span className="hidden sm:inline">Export</span>
                  </button>
                </div>
              </div>
            }
          />
        </div>
      )}

      <div className="flex-1 overflow-y-auto scrollbar-hide space-y-6 pb-10 pr-1">
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
