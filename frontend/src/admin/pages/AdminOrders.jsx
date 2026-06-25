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
  SkeletonList,
  formatCurrency,
  fadeUp,
  stagger,
} from '../components/AdminUIKit';
import { useDraft } from '../hooks/useDraft';
import { AdminOrdersTable } from '../components/AdminOrdersTable';
import { AdminOrdersKanban } from '../components/AdminOrdersKanban';
import { AdminOrderDrawer } from '../components/AdminOrderDrawer';
import { useOrderFilters, allStatuses, statusIcons } from '../hooks/useOrderFilters';

const slideDrawer = {
  hidden: { x: '100%', opacity: 0 },
  show: { x: 0, opacity: 1 },
  exit: { x: '100%', opacity: 0 },
};

export function AdminOrders() {
  const navigate = useNavigate();
  const { orders, dataLoading, updateOrderStatus, updateOrderNotes, searchQuery } = useAdmin();

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
            <AdminOrdersTable
              filteredOrders={filteredOrders}
              searchQuery={searchQuery}
              filterStatus={filterStatus}
              setFilterStatus={setFilterStatus}
              openOrderDrawer={openOrderDrawer}
              navigate={navigate}
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
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 items-start"
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
    </motion.div>
  );
}
