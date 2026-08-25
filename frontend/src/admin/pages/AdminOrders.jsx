import { m as motion, AnimatePresence } from 'framer-motion';
import { DraftRestoreModal } from '../components/DraftRestoreModal';
import { UnsavedChangesGuard } from '../components/UnsavedChangesGuard';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '../context/AdminContext';
import { playSuccessBeep, playErrorBeep } from '../../utils/media/audioUtils';
import toast from 'react-hot-toast';
import {
  PageHeader,
  SkeletonTable,
  FilterBar,
  formatCurrency,
  fadeUp,
  stagger,
  PeriodSelector,
} from '../components/AdminUIKit';
import { useDraft } from '../hooks/useDraft';
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
  const { orders, dataLoading, updateOrderStatus, updateOrderNotes, searchQuery, setSearchQuery } =
    useAdmin();

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
  } = useOrderFilters(orders, searchQuery);

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

  return (
    <motion.div initial="hidden" animate="show" variants={stagger} className="flex flex-col h-full">
      {!hideHeader && (
        <div className="shrink-0 pb-6">
          <PageHeader
            title="Orders"
            icon="shopping_bag"
            iconColor="orders"
            mobileRow={false}
            headerAction={
              <div className="flex flex-wrap items-center gap-3 shrink-0 w-full pb-1 sm:pb-0">
                <div className="relative shrink-0 w-[180px] sm:w-[220px] bg-[var(--admin-surface-muted)] border border-[var(--admin-border-subtle)] rounded-[var(--admin-radius-lg)] p-0.5 flex flex-col justify-center">
                  <span
                    className="material-symbols-outlined absolute left-2 text-[var(--admin-text-tertiary)] pointer-events-none z-10"
                    style={{ fontSize: '14px', top: '50%', transform: 'translateY(-50%)' }}
                  >
                    search
                  </span>
                  <input
                    type="text"
                    value={searchQuery || ''}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search orders..."
                    className="w-full h-full min-h-[24px] pl-7 pr-2 bg-[var(--admin-surface)] border border-[var(--admin-border-subtle)] shadow-[var(--admin-shadow-xs)] rounded-[var(--admin-radius-sm)] text-[12px] font-semibold text-[var(--admin-text-primary)] placeholder-[var(--admin-text-tertiary)] focus:outline-none transition-all m-0"
                  />
                </div>
                <div className="w-[1px] h-6 bg-[var(--admin-border-subtle)] shrink-0 hidden sm:block"></div>
                <div className="shrink-0 origin-left flex items-stretch">
                  <PeriodSelector
                    value={dateFilter}
                    onChange={setDateFilter}
                    periods={['All Time', 'Today', 'Last 7 Days', 'This Month', 'This Year']}
                  />
                </div>
                <div className="w-[1px] h-6 bg-[var(--admin-border-subtle)] shrink-0 hidden sm:block"></div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="flex items-center bg-[var(--admin-surface-muted)] rounded-[var(--admin-radius-lg)] p-0.5 border border-[var(--admin-border-subtle)]">
                    <button
                      onClick={() => setViewMode('table')}
                      className={`p-0.5 rounded-[var(--admin-radius-sm)] cursor-pointer transition-all flex items-center justify-center ${
                        viewMode === 'table'
                          ? 'bg-[var(--admin-surface)] text-[var(--admin-text-primary)] shadow-[var(--admin-shadow-xs)] border border-[var(--admin-border-subtle)]'
                          : 'text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)] border border-transparent'
                      }`}
                      title="Table View"
                    >
                      <span className="material-symbols-outlined text-[16px]">view_list</span>
                    </button>
                    <button
                      onClick={() => setViewMode('kanban')}
                      className={`p-0.5 rounded-[var(--admin-radius-sm)] cursor-pointer transition-all flex items-center justify-center ${
                        viewMode === 'kanban'
                          ? 'bg-[var(--admin-surface)] text-[var(--admin-text-primary)] shadow-[var(--admin-shadow-xs)] border border-[var(--admin-border-subtle)]'
                          : 'text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)] border border-transparent'
                      }`}
                      title="Kanban View"
                    >
                      <span className="material-symbols-outlined text-[16px]">view_kanban</span>
                    </button>
                  </div>
                  <button
                    onClick={handleExportCSV}
                    className="flex items-center justify-center px-2 py-1 rounded-[var(--admin-radius-lg)] text-[var(--admin-text-primary)] bg-[var(--admin-surface)] hover:bg-[var(--admin-surface-hover)] shadow-sm border border-[var(--admin-border-strong)] transition-all active:scale-95 cursor-pointer shrink-0"
                    title="Export CSV"
                  >
                    <span className="material-symbols-outlined text-[14px]">download</span>
                    <span className="text-[10px] font-semibold hidden sm:inline ml-1">Export</span>
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

        {/* Controls row: view modes, search/filters, export buttons */}
        {viewMode === 'table' && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="w-full flex flex-col sm:flex-row justify-between gap-4">
              <div className="w-full">
                <FilterBar
                  filters={['All', ...allStatuses]}
                  value={filterStatus}
                  onChange={setFilterStatus}
                  counts={statusCounts}
                />
              </div>
            </div>
          </div>
        )}

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
              orderNoteDraft={orderNoteDraft}
              setOrderNoteDraft={setOrderNoteDraft}
              handleSaveNoteDraft={handleSaveNoteDraft}
              updateOrderStatus={updateOrderStatus}
              navigate={navigate}
            />
          )}
        </AnimatePresence>

        <DraftRestoreModal
          isOpen={showRestoreModal}
          onClose={() => setShowRestoreModal(false)}
          onRestore={restoreDraft}
          onDiscard={discardDraft}
        />
        <UnsavedChangesGuard blocker={blocker} />
      </div>
    </motion.div>
  );
}
