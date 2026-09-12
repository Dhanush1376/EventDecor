import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { m as motion, AnimatePresence } from 'framer-motion';
import { formatCurrency, AdminStatusPill } from './AdminUIKit';
import { EXTERNAL_URLS } from '../../config/constants';
import { WhatsAppIcon } from '../../components/ui/WhatsAppIcon';
import toast from 'react-hot-toast';
import rentalService from '../../services/api/rentalService';
import AdminCustomerProfileModal from './AdminCustomerProfileModal';

const formatDateDMY = (dateStr) => {
  if (!dateStr) return 'N/A';
  if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split('-');
    return `${d}-${m}-${y}`;
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

const RENTAL_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'active_rental', label: 'Active Rental' },
  { value: 'returned', label: 'Returned' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export function AdminRentalDrawer({
  selectedRental,
  setIsDrawerOpen,
  updateRentalStatus,
  onViewInvoice,
  navigate,
  onDeleteRental,
}) {
  const [isMobile, setIsMobile] = React.useState(
    typeof window !== 'undefined' ? window.innerWidth < 640 : false,
  );
  const [updating, setUpdating] = React.useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);

  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  React.useEffect(() => {
    if (typeof document === 'undefined') return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  if (!selectedRental || typeof document === 'undefined') return null;

  const slideDrawer = {
    hidden: isMobile ? { y: '100%', opacity: 0 } : { x: '100%', opacity: 0 },
    show: isMobile ? { y: 0, opacity: 1 } : { x: 0, opacity: 1 },
    exit: isMobile ? { y: '100%', opacity: 0 } : { x: '100%', opacity: 0 },
  };

  const isDark =
    document.documentElement.classList.contains('dark') || document.body.classList.contains('dark');

  const rentalId = selectedRental.rentalOrderId || selectedRental._id;
  const customerName =
    selectedRental.userId?.name ||
    selectedRental.user?.name ||
    selectedRental.shippingAddress?.name ||
    'Customer';
  const customerPhone =
    selectedRental.userId?.phone ||
    selectedRental.user?.phone ||
    selectedRental.shippingAddress?.phone ||
    '';
  const customerEmail =
    selectedRental.userId?.email ||
    selectedRental.user?.email ||
    selectedRental.shippingAddress?.email ||
    '';
  const cleanPhone = customerPhone.replace(/[^0-9]/g, '');

  const customerId =
    selectedRental.userId?._id ||
    selectedRental.userId?.id ||
    (typeof selectedRental.userId === 'string' && selectedRental.userId) ||
    selectedRental.user?._id ||
    selectedRental.user?.id ||
    (typeof selectedRental.user === 'string' && selectedRental.user);

  const shipping = selectedRental.shippingAddress || {};

  const resolvedCustomer = customerId
    ? {
        _id: customerId,
        name: customerName,
        phone: customerPhone,
        email: customerEmail,
        shippingAddress: shipping,
      }
    : null;
  const fullAddress = [
    shipping.address,
    shipping.locality,
    shipping.landmark ? `Near ${shipping.landmark}` : '',
    shipping.city,
    shipping.state,
    shipping.pincode,
  ]
    .filter(Boolean)
    .join(', ');

  const handleStatusChange = async (newStatus) => {
    if (updateRentalStatus) {
      updateRentalStatus(selectedRental._id, newStatus);
      return;
    }
    try {
      setUpdating(true);
      const res = await rentalService.adminUpdateStatus(selectedRental._id, newStatus);
      if (res.success) {
        toast.success(`Rental status updated to ${newStatus.replace(/_/g, ' ')}`);
        selectedRental.status = newStatus;
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const items =
    Array.isArray(selectedRental.items) && selectedRental.items.length > 0
      ? selectedRental.items
      : [
          {
            name: selectedRental.productTitle || 'Rented Item',
            price: selectedRental.rentalCharge || selectedRental.totalAmount || 0,
            quantity: selectedRental.quantity || 1,
            image:
              selectedRental.productImage ||
              selectedRental.productImages?.[0] ||
              selectedRental.productThumbnail ||
              '',
            deposit: selectedRental.securityDeposit || 0,
          },
        ];

  const totalAmount = Number(selectedRental.totalAmount || selectedRental.rentalCharge || 0);
  const securityDeposit = Number(selectedRental.securityDeposit || 0);
  const rentalCharge = Number(
    selectedRental.rentalCharge || totalAmount - securityDeposit || totalAmount,
  );

  return createPortal(
    <div className={`admin-section-root ${isDark ? 'dark' : ''}`}>
      {/* Backdrop */}
      <motion.div
        key="admin-rental-drawer-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setIsDrawerOpen(false)}
        className="fixed inset-0 z-[999] cursor-pointer"
        style={{
          background: 'var(--admin-surface-overlay, rgba(60, 54, 42, 0.45))',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
        }}
      />

      {/* Drawer Body */}
      <motion.aside
        key="admin-rental-drawer-aside"
        initial="hidden"
        animate="show"
        exit="exit"
        variants={slideDrawer}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="fixed z-[1000] flex flex-col overflow-hidden shadow-[var(--admin-shadow-2xl)] border-[var(--admin-border)] sm:inset-y-0 sm:top-0 sm:bottom-0 sm:right-0 sm:left-auto sm:w-[520px] sm:h-full sm:max-h-none sm:rounded-none sm:border-l sm:border-t-0 bottom-0 inset-x-0 max-h-[90vh] h-auto rounded-t-[4px] border-t bg-[var(--admin-surface)] text-[var(--admin-text-primary)]"
        style={{ background: 'var(--admin-surface, #ffffff)' }}
      >
        {/* Drawer Header */}
        <div className="px-6 py-5 border-b border-[var(--admin-border-subtle)] flex items-center justify-between shrink-0 text-left bg-[var(--admin-bg-subtle)]">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-[14px] font-bold text-[var(--admin-text-primary)]">
                Rental Details Panel
              </h3>
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-[4px] border bg-[var(--admin-accent-light)] text-[var(--admin-accent)] border-[var(--admin-accent-muted)]">
                RENTAL
              </span>
              <AdminStatusPill status={selectedRental.status} />
            </div>
            <p className="text-[11px] text-[var(--admin-text-tertiary)] mt-1 font-mono font-bold">
              #{rentalId}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {onViewInvoice && (
              <button
                type="button"
                onClick={() => {
                  onViewInvoice(selectedRental);
                }}
                className="admin-btn-icon hover:text-[var(--admin-accent)] hover:bg-[var(--admin-bg-subtle)] !rounded-[4px]"
                title="View Rental Invoice"
              >
                <span className="material-symbols-outlined text-[19px]">receipt_long</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsDrawerOpen(false)}
              className="admin-btn-icon !rounded-[4px]"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>

        {/* Drawer Scroll Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar text-left bg-[var(--admin-bg)]">
          {/* 1. Customer & Delivery Profile */}
          <div className="admin-card !rounded-[4px] p-5 space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div
                onClick={() => customerId && setShowCustomerModal(true)}
                className={`min-w-0 ${customerId ? 'cursor-pointer group' : ''}`}
                title={customerId ? 'Click to view customer profile' : undefined}
              >
                <p className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider">
                  Customer Profile
                </p>
                <h4
                  className={`text-[14px] font-bold text-[var(--admin-text-primary)] mt-1 flex items-center gap-1.5 ${customerId ? 'group-hover:text-[var(--admin-accent)] transition-colors' : ''}`}
                >
                  <span>{customerName}</span>
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
                    className="h-7 px-2 rounded-[4px] bg-[var(--admin-surface)] hover:bg-[var(--admin-bg-subtle)] text-[var(--admin-accent)] hover:text-[var(--admin-accent-hover)] border border-[var(--admin-border)] text-[10.5px] font-bold flex items-center gap-1 transition-colors shadow-2xs cursor-pointer"
                    title="View Customer Profile"
                  >
                    <span>View Profile</span>
                    <span className="material-symbols-outlined text-[12px]">open_in_new</span>
                  </button>
                )}
                {cleanPhone && (
                  <a
                    href={`${EXTERNAL_URLS.WHATSAPP_BASE}/${cleanPhone}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="admin-badge admin-badge-success !rounded-[4px] flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity h-7"
                  >
                    <WhatsAppIcon className="w-[14px] h-[14px]" />
                    WhatsApp
                  </a>
                )}
              </div>
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
                  {customerPhone || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-[var(--admin-text-tertiary)] font-medium mb-1 text-[10px] uppercase">
                  Payment Mode
                </p>
                <span className="inline-flex items-center px-2 py-0.5 rounded-[4px] text-[11px] font-bold border bg-emerald-50 text-emerald-700 border-emerald-200">
                  {selectedRental.paymentMethod || 'Razorpay'}
                </span>
              </div>
              <div>
                <p className="text-[var(--admin-text-tertiary)] font-medium mb-0.5 text-[10px] uppercase">
                  Booking Date
                </p>
                <p className="font-bold text-[var(--admin-text-primary)] flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px] text-[var(--admin-text-tertiary)]">
                    event
                  </span>
                  {formatDateDMY(selectedRental.createdAt)}
                </p>
              </div>
              <div>
                <p className="text-[var(--admin-text-tertiary)] font-medium mb-0.5 text-[10px] uppercase">
                  Security Deposit
                </p>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-[4px] text-[10px] font-extrabold uppercase tracking-wider border ${
                    selectedRental.depositStatus === 'refunded'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}
                >
                  {selectedRental.depositStatus === 'refunded' ? 'REFUNDED' : 'HELD'}
                </span>
              </div>
            </div>

            {/* Delivery Address */}
            <div className="pt-2 border-t border-[var(--admin-border-subtle)] mt-1">
              <p className="text-[var(--admin-text-tertiary)] font-medium mb-0.5 text-[10px] uppercase">
                Delivery Address
              </p>
              <p className="font-bold text-[var(--admin-text-primary)] flex items-start gap-1.5 mt-1">
                <span className="material-symbols-outlined text-[14px] text-[var(--admin-text-tertiary)] mt-0.5">
                  location_on
                </span>
                <span className="leading-tight text-[12px]">
                  {fullAddress || 'Address not available'}
                </span>
              </p>
              {fullAddress && (
                <div className="mt-2.5">
                  <a
                    href={`https://maps.google.com/?q=${encodeURIComponent(fullAddress)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--admin-accent)] hover:underline"
                  >
                    <span className="material-symbols-outlined text-[14px]">map</span>
                    Open in Maps
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* 2. Rental Schedule & Duration Card */}
          <div className="admin-card !rounded-[4px] p-5 space-y-3">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-[var(--admin-text-secondary)]">
              Rental Schedule
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-[var(--admin-surface-muted)] border border-[var(--admin-border)] rounded-[4px]">
                <span className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase block">
                  Delivery / Start
                </span>
                <span className="text-[13px] font-bold text-[var(--admin-text-primary)] mt-1 block">
                  {formatDateDMY(selectedRental.rentalStartDate)}
                </span>
              </div>
              <div className="p-3 bg-[var(--admin-surface-muted)] border border-[var(--admin-border)] rounded-[4px]">
                <span className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase block">
                  Return / End
                </span>
                <span className="text-[13px] font-bold text-[var(--admin-text-primary)] mt-1 block">
                  {formatDateDMY(selectedRental.rentalEndDate)}
                </span>
              </div>
              <div className="p-3 bg-[var(--admin-surface-muted)] border border-[var(--admin-border)] rounded-[4px] col-span-2 sm:col-span-1">
                <span className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase block">
                  Duration
                </span>
                <span className="text-[13px] font-bold text-amber-700 dark:text-amber-400 mt-1 block">
                  {selectedRental.durationDays || 1} Days
                </span>
              </div>
            </div>
          </div>

          {/* 3. Rented Items */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-[var(--admin-text-secondary)] pl-1">
              Rented Items ({items.length})
            </h4>
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-[4px] shadow-[var(--admin-shadow-sm)]"
                >
                  <div className="flex items-center gap-3">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-12 h-12 rounded-[4px] object-cover border border-[var(--admin-border)] shadow-sm shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-[4px] bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-gray-400">inventory_2</span>
                      </div>
                    )}
                    <div>
                      <p className="text-[13px] font-bold text-[var(--admin-text-primary)] line-clamp-1">
                        {item.name}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] font-medium text-[var(--admin-text-secondary)] bg-[var(--admin-surface-muted)] inline-block px-1.5 py-0.5 rounded-[4px] border border-[var(--admin-border-subtle)]">
                          Qty: {item.quantity || item.qty || 1}
                        </span>
                        {item.deposit > 0 && (
                          <span className="text-[10px] font-bold text-[var(--admin-accent)] bg-[var(--admin-accent-light)] border border-[var(--admin-accent-muted)] px-1.5 py-0.5 rounded-[4px]">
                            Deposit: ₹{item.deposit}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className="text-[12px] font-bold text-[var(--admin-text-primary)] shrink-0 ml-3">
                    {formatCurrency(Number(item.price * (item.quantity || item.qty || 1)))}
                  </span>
                </div>
              ))}
            </div>

            {/* Financial Ledger Breakdown */}
            <div className="p-4 bg-[var(--admin-surface-muted)] border border-[var(--admin-border-strong)] rounded-[4px] space-y-2">
              <div className="flex justify-between text-[12px] text-[var(--admin-text-secondary)]">
                <span>Rental Charges</span>
                <span className="font-bold text-[var(--admin-text-primary)]">
                  {formatCurrency(rentalCharge)}
                </span>
              </div>
              <div className="flex justify-between text-[12px] text-[var(--admin-text-secondary)]">
                <span>Security Deposit</span>
                <span className="font-bold text-[var(--admin-text-primary)]">
                  {formatCurrency(securityDeposit)}
                </span>
              </div>
              <div className="pt-2 border-t border-[var(--admin-border-subtle)] flex items-center justify-between">
                <span className="text-[12px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider">
                  Grand Total
                </span>
                <span className="text-[16px] text-[var(--admin-accent)] font-bold font-mono">
                  {formatCurrency(totalAmount)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Fixed Pinned Footer (Does not scroll) */}
        <div className="shrink-0 p-4 sm:p-5 border-t border-[var(--admin-border-subtle)] bg-[var(--admin-surface)] space-y-3 z-10 shadow-[0_-4px_16px_rgba(0,0,0,0.04)] dark:shadow-[0_-4px_16px_rgba(0,0,0,0.25)]">
          {/* Direct Status Override */}
          <div className="w-full bg-[var(--admin-accent-light)] dark:bg-stone-800/60 p-3 rounded-[4px] border border-[var(--admin-accent-muted)] dark:border-stone-700">
            <label className="text-[10px] font-bold text-[var(--admin-accent)] dark:text-[var(--admin-accent-hover)] uppercase tracking-wider block mb-2 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">edit_note</span>
              Direct Status Override
            </label>
            <div className="relative w-full h-9">
              <select
                disabled={updating}
                value={selectedRental.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                style={{ backgroundImage: 'none' }}
                className="admin-no-arrow w-full h-9 !min-h-[36px] !max-h-[36px] !appearance-none !bg-none bg-white dark:bg-stone-800 hover:bg-stone-50 border border-[var(--admin-border-strong)] text-[var(--admin-text-primary)] text-[12px] font-bold rounded-[4px] pl-3 pr-8 cursor-pointer shadow-xs outline-none focus:ring-1 focus:ring-[var(--admin-accent)] focus:border-[var(--admin-accent)] transition-colors"
              >
                {RENTAL_STATUS_OPTIONS.map((st) => (
                  <option key={st.value} value={st.value}>
                    {st.label}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[var(--admin-text-tertiary)]">
                <span className="material-symbols-outlined text-[18px]">expand_more</span>
              </div>
            </div>
          </div>

          {/* Move to Recycle Bin (Terminal status only) */}
          {['completed', 'cancelled', 'returned'].includes(
            (selectedRental.status || '').toLowerCase(),
          ) && (
            <button
              type="button"
              onClick={() => onDeleteRental && onDeleteRental(selectedRental)}
              className="admin-btn !rounded-[4px] bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-100 flex items-center justify-center gap-1.5 py-2.5 px-3 w-full shadow-xs font-bold text-[13px] cursor-pointer transition-colors"
            >
              <span className="material-symbols-outlined text-[17px]">delete_outline</span>
              <span>Move to Recycle Bin</span>
            </button>
          )}

          {/* Bottom Navigation & Action Buttons */}
          <div className="flex items-center gap-3 w-full">
            <button
              type="button"
              onClick={() => {
                setIsDrawerOpen(false);
                navigate(`/admin/rentals/detail/${selectedRental._id}`);
              }}
              className="admin-btn !rounded-[4px] bg-white border-2 border-[var(--admin-border-strong)] text-[var(--admin-text-primary)] hover:bg-gray-50 flex-1 min-h-[44px] shadow-sm font-bold cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">receipt_long</span>
              Full Details
            </button>
            <button
              type="button"
              onClick={() => setIsDrawerOpen(false)}
              className="admin-btn !rounded-[4px] bg-[var(--admin-accent)] text-white hover:opacity-90 flex-1 min-h-[44px] shadow-md font-bold text-[14px] cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              Done
            </button>
          </div>
        </div>
      </motion.aside>

      {/* Customer Profile Modal */}
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
