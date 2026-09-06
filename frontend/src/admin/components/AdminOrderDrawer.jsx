import React from 'react';
import { m as motion } from 'framer-motion';
import { formatCurrency } from '../components/AdminUIKit';
import { EXTERNAL_URLS } from '../../config/constants';
import { WhatsAppIcon } from '../../components/ui/WhatsAppIcon';
import { DeleteConfirmModal } from './ui/DeleteConfirmModal';
import { returnService } from '../../services/api/returnService';
import toast from 'react-hot-toast';
import { OrderSettlement } from '../pages/AdminOrderDetail/OrderSettlement';

const RETURN_STATUSES = [
  'submitted',
  'approved',
  'return_courier_assigned',
  'return_picked_up',
  'return_in_transit',
  'return_received',
  'inspection_started',
  'inspection_completed',
  'refund_initiated',
  'refund_completed',
  'completed',
  'rejected',
  'cancelled',
];
const EXCHANGE_STATUSES = ['pending_stock', 'reserved', 'shipped', 'delivered'];

export function AdminOrderDrawer({
  selectedOrder,
  selectedOrderData,
  setIsDrawerOpen,
  allStatuses,
  updateOrderStatus,
  deleteOrder,
  navigate,
}) {
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [localReturns, setLocalReturns] = React.useState([]);
  const [localExchanges, setLocalExchanges] = React.useState([]);
  const [settlementCharges, setSettlementCharges] = React.useState(
    selectedOrderData?.rawOrder?.courierCharges || selectedOrder.courierCharges || 150,
  );

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

  const slideDrawer = {
    hidden: isMobile ? { y: '100%', opacity: 0 } : { x: '100%', opacity: 0 },
    show: isMobile ? { y: 0, opacity: 1 } : { x: 0, opacity: 1 },
    exit: isMobile ? { y: '100%', opacity: 0 } : { x: '100%', opacity: 0 },
  };

  React.useEffect(() => {
    if (selectedOrderData) {
      setLocalReturns(selectedOrderData.returns || []);
      setLocalExchanges(selectedOrderData.exchanges || []);
    } else {
      setLocalReturns(selectedOrder.returns || []);
      setLocalExchanges(selectedOrder.exchanges || []);
    }
  }, [selectedOrderData, selectedOrder]);

  const handleUpdateReturnStatus = async (returnId, newStatus) => {
    try {
      const res = await returnService.transitionReturnStatus(returnId, { status: newStatus });
      if (res.data?.success) {
        toast.success(`Return updated to ${newStatus.replace(/_/g, ' ')}`);
        setLocalReturns((prev) =>
          prev.map((r) => (r._id === returnId ? { ...r, status: newStatus } : r)),
        );
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update return status');
    }
  };

  const handleUpdateExchangeStatus = async (exchangeId, newStatus) => {
    try {
      const res = await returnService.transitionExchangeReplacement(exchangeId, {
        status: newStatus,
      });
      if (res.data?.success) {
        toast.success(`Exchange updated to ${newStatus.replace(/_/g, ' ')}`);
        setLocalExchanges((prev) =>
          prev.map((e) => (e._id === exchangeId ? { ...e, replacementStatus: newStatus } : e)),
        );
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update exchange status');
    }
  };

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
        className="fixed sm:right-0 sm:top-0 bottom-0 inset-x-0 sm:inset-x-auto h-[90dvh] sm:h-screen w-full sm:w-[500px] z-[1000] shadow-[var(--admin-shadow-2xl)] flex flex-col overflow-hidden border-t sm:border-t-0 sm:border-l border-[var(--admin-border)] rounded-t-2xl sm:rounded-none"
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
            {['Cancelled', 'Returned', 'Refunded', 'Exchanged', 'Delivered'].includes(
              selectedOrder.status,
            ) && (
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
                <p className="font-bold text-[var(--admin-text-primary)] flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px] text-[var(--admin-text-tertiary)]">
                    call
                  </span>
                  {selectedOrder.phone}
                </p>
              </div>
              <div>
                <p className="text-[var(--admin-text-tertiary)] font-medium mb-1 text-[10px] uppercase">
                  Payment Mode
                </p>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold border ${
                    selectedOrder.payment?.toLowerCase().includes('pending') ||
                    selectedOrder.payment?.toLowerCase().includes('cod')
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}
                >
                  {selectedOrder.payment?.toLowerCase().includes('pending') && (
                    <span className="material-symbols-outlined text-[14px] mr-1">schedule</span>
                  )}
                  {selectedOrder.payment}
                </span>
              </div>
              <div>
                <p className="text-[var(--admin-text-tertiary)] font-medium mb-0.5 text-[10px] uppercase">
                  Invoice Date
                </p>
                <p className="font-bold text-[var(--admin-text-primary)] flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px] text-[var(--admin-text-tertiary)]">
                    event
                  </span>
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

            {/* Delivery Address Row */}
            <div className="pt-2 border-t border-[var(--admin-border-subtle)] mt-1">
              <p className="text-[var(--admin-text-tertiary)] font-medium mb-0.5 text-[10px] uppercase">
                Delivery Address
              </p>
              <p className="font-bold text-[var(--admin-text-primary)] flex items-start gap-1.5 mt-1">
                <span className="material-symbols-outlined text-[14px] text-[var(--admin-text-tertiary)] mt-0.5">
                  location_on
                </span>
                <span className="leading-tight text-[12px]">
                  {selectedOrder.address || 'Address not available'}
                </span>
              </p>
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
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-12 h-12 rounded-[var(--admin-radius-md)] object-cover border border-[var(--admin-border)] shadow-sm shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-[var(--admin-radius-md)] bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-gray-400">inventory_2</span>
                      </div>
                    )}
                    <div>
                      <p className="text-[13px] font-bold text-[var(--admin-text-primary)] line-clamp-1">
                        {item.name}
                      </p>
                      <p className="text-[11px] font-medium text-[var(--admin-text-secondary)] mt-0.5 bg-[var(--admin-surface-muted)] inline-block px-1.5 py-0.5 rounded border border-[var(--admin-border-subtle)]">
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
              {allStatuses.slice(0, 4).map((st, sidx) => {
                const isDone = allStatuses.indexOf(selectedOrder.status) >= sidx;
                const isCurrent = selectedOrder.status === st;

                const STATUS_COLORS = {
                  Pending: {
                    border: 'border-amber-500',
                    bg: 'bg-amber-500',
                    text: 'text-amber-600',
                    badgeText: 'text-amber-700',
                    badgeBg: 'bg-amber-100',
                    badgeBorder: 'border-amber-200',
                  },
                  Confirmed: {
                    border: 'border-blue-500',
                    bg: 'bg-blue-500',
                    text: 'text-blue-600',
                    badgeText: 'text-blue-700',
                    badgeBg: 'bg-blue-100',
                    badgeBorder: 'border-blue-200',
                  },
                  Processing: {
                    border: 'border-purple-500',
                    bg: 'bg-purple-500',
                    text: 'text-purple-600',
                    badgeText: 'text-purple-700',
                    badgeBg: 'bg-purple-100',
                    badgeBorder: 'border-purple-200',
                  },
                  Delivered: {
                    border: 'border-emerald-500',
                    bg: 'bg-emerald-500',
                    text: 'text-emerald-600',
                    badgeText: 'text-emerald-700',
                    badgeBg: 'bg-emerald-100',
                    badgeBorder: 'border-emerald-200',
                  },
                };
                const colors = STATUS_COLORS[st] || {
                  border: 'border-[var(--admin-accent)]',
                  bg: 'bg-[var(--admin-accent)]',
                  text: 'text-[var(--admin-accent)]',
                  badgeText: 'text-[var(--admin-accent)]',
                  badgeBg: 'bg-[var(--admin-accent)]/10',
                  badgeBorder: 'border-[var(--admin-accent)]/20',
                };

                return (
                  <div key={st} className="relative flex items-center justify-between">
                    <span
                      className={`absolute -left-[31px] w-4 h-4 rounded-full border-2 bg-white flex items-center justify-center transition-all ${
                        isDone ? colors.border : 'border-gray-300'
                      }`}
                    >
                      {isDone && <span className={`w-2 h-2 rounded-full ${colors.bg}`} />}
                    </span>
                    <div>
                      <p
                        className={`text-[12px] font-bold ${
                          isDone ? colors.text : 'text-gray-400'
                        }`}
                      >
                        {st}
                      </p>
                    </div>
                    {isCurrent && (
                      <span
                        className={`text-[9px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full animate-pulse border ${colors.badgeText} ${colors.badgeBg} ${colors.badgeBorder}`}
                      >
                        Active State
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4. Financial Settlement */}
          <OrderSettlement
            order={selectedOrderData || selectedOrder}
            updateOrderStatus={updateOrderStatus}
            settlementCharges={settlementCharges}
            setSettlementCharges={setSettlementCharges}
          />
        </div>

        {/* Drawer Footer Controls */}
        <div className="p-5 bg-[var(--admin-surface-muted)] border-t border-[var(--admin-border)] shrink-0 flex flex-col gap-4 text-left admin-drawer-footer">
          {/* Returns & Exchanges Management */}
          {(localReturns.length > 0 || localExchanges.length > 0) && (
            <div className="flex-1 space-y-3 pb-3 border-b border-[var(--admin-border-subtle)]">
              {localReturns.map((r) => (
                <div key={r._id} className="w-full">
                  <label className="text-[10px] font-bold text-yellow-600 uppercase tracking-wider block mb-1">
                    Return Status ({r.returnId || 'Active'})
                  </label>
                  <select
                    value={r.status}
                    onChange={(e) => handleUpdateReturnStatus(r._id, e.target.value)}
                    className="admin-input font-bold"
                  >
                    {RETURN_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
              {localExchanges.map((e) => (
                <div key={e._id} className="w-full">
                  <label className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block mb-1">
                    Exchange Status ({e.exchangeId || 'Active'})
                  </label>
                  <select
                    value={e.replacementStatus || 'pending_stock'}
                    onChange={(ev) => handleUpdateExchangeStatus(e._id, ev.target.value)}
                    className="admin-input font-bold"
                  >
                    {EXCHANGE_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}

          <div className="flex-1 bg-blue-50/50 p-3 rounded-lg border border-blue-100">
            <label className="text-[10px] font-bold text-blue-800 uppercase tracking-wider block mb-2 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">edit_note</span>
              Direct Status Override
            </label>
            <select
              value={selectedOrderData?.status || selectedOrder.status}
              onChange={(e) => {
                updateOrderStatus(selectedOrder.id, e.target.value);
              }}
              className="admin-input font-bold bg-white border-blue-200 text-blue-900 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
            >
              {allStatuses.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3 w-full mt-2">
            <button
              type="button"
              onClick={() => {
                setIsDrawerOpen(false);
                navigate(`/admin/orders/${selectedOrder.id}`);
              }}
              className="admin-btn bg-white border-2 border-[var(--admin-border-strong)] text-[var(--admin-text-primary)] hover:bg-gray-50 flex-1 min-h-[44px] shadow-sm font-bold"
            >
              <span className="material-symbols-outlined text-[18px]">receipt_long</span>
              Full Details
            </button>
            <button
              type="button"
              onClick={() => setIsDrawerOpen(false)}
              className="admin-btn bg-[var(--admin-accent)] text-white hover:opacity-90 flex-1 min-h-[44px] shadow-md font-bold text-[14px]"
            >
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
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
