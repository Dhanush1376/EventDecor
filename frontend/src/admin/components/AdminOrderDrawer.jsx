import React from 'react';
import { m as motion } from 'framer-motion';
import { formatCurrency } from '../components/AdminUIKit';
import { EXTERNAL_URLS } from '../../config/constants';
import { WhatsAppIcon } from '../../components/ui/WhatsAppIcon';
import { DeleteConfirmModal } from './ui/DeleteConfirmModal';

const slideDrawer = {
  hidden: { x: '100%', opacity: 0 },
  show: { x: 0, opacity: 1 },
  exit: { x: '100%', opacity: 0 },
};

export function AdminOrderDrawer({
  selectedOrder,
  selectedOrderData,
  setIsDrawerOpen,
  allStatuses,
  orderNoteDraft,
  setOrderNoteDraft,
  handleSaveNoteDraft,
  updateOrderStatus,
  deleteOrder,
  navigate,
}) {
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);

  const handleDelete = async () => {
    const success = await deleteOrder(selectedOrder.id);
    if (success) {
      setShowDeleteModal(false);
      setIsDrawerOpen(false);
    }
  };
  return (
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
          <div className="flex items-center gap-2">
            {['Cancelled', 'Returned', 'Refunded', 'Exchanged'].includes(selectedOrder.status) && (
              <button
                onClick={() => setShowDeleteModal(true)}
                className="admin-btn-icon hover:text-[var(--admin-error)] hover:bg-[var(--admin-error-light)]"
                title="Move to Recycle Bin"
              >
                <span className="material-symbols-outlined text-[20px]">delete</span>
              </button>
            )}
            <button onClick={() => setIsDrawerOpen(false)} className="admin-btn-icon">
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
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
                href={`${EXTERNAL_URLS.WHATSAPP_BASE}/${selectedOrder.phone.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="admin-badge admin-badge-success flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity"
              >
                <WhatsAppIcon className="w-[14px] h-[14px]" />
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
                    <span className="material-symbols-outlined text-[14px]">calendar_today</span>
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

          {/* 2.5 Custom Order Chat */}
          {selectedOrder.isCustomOrder && selectedOrder.customOrderId?.messages?.length > 0 && (
            <div className="admin-card p-5 space-y-4">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-[var(--admin-text-secondary)]">
                Custom Order Chat Log
              </h4>
              <div className="space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                {selectedOrder.customOrderId.messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col ${msg.sender === 'customer' ? 'items-start' : 'items-end'}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold uppercase text-[var(--admin-text-tertiary)]">
                        {msg.senderName || msg.sender}
                      </span>
                      <span className="text-[9px] text-[var(--admin-text-tertiary)] opacity-70">
                        {new Date(msg.createdAt).toLocaleString('en-IN', {
                          hour: 'numeric',
                          minute: 'numeric',
                          hour12: true,
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                    <div
                      className={`p-3 rounded-[var(--admin-radius-lg)] text-[12px] ${
                        msg.sender === 'customer'
                          ? 'bg-[var(--admin-surface-muted)] text-[var(--admin-text-primary)] border border-[var(--admin-border)]'
                          : 'bg-[var(--admin-accent)] text-white'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

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
                      {isDone && <span className="w-2 h-2 rounded-full bg-[var(--admin-accent)]" />}
                    </span>
                    <div>
                      <p
                        className={`text-[12px] font-bold ${
                          isCurrent
                            ? 'text-[var(--admin-accent)]'
                            : 'text-[var(--admin-text-secondary)]'
                        }`}
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

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Move Order to Recycle Bin"
        productTitle={`Order #${selectedOrder.id.substring(selectedOrder.id.length - 8).toUpperCase()}`}
        message="This order will be moved to the Recycle Bin. You can restore it within the retention period or permanently delete it."
        confirmText="Move to Recycle Bin"
        isRecycleBinAction={true}
      />
    </>
  );
}
