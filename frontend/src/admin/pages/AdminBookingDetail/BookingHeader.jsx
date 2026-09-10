import React from 'react';
import { m as motion } from 'framer-motion';
import { StatusBadge, fadeUp } from '../../components/AdminUIKit';
import { EXTERNAL_URLS } from '../../../config/constants';
import { WhatsAppIcon } from '../../../components/ui/WhatsAppIcon';
import toast from 'react-hot-toast';

export function BookingHeader({ booking, navigate, onUpdateStatus, setShowUnpaidModal }) {
  const customerPhone = booking?.contactPhone || booking?.user?.phone || '';
  const cleanPhone = customerPhone.replace(/[^0-9]/g, '');

  const bookingDate = booking?.createdAt
    ? new Date(booking.createdAt).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : 'Recent';

  const fullId = (booking?._id || booking?.id || '').toString();
  const rawId = booking?.bookingId || (fullId ? fullId.slice(-8).toUpperCase() : 'BOOKING');
  const displayId = rawId.startsWith('#') ? rawId : `#${rawId}`;

  const copyBookingId = () => {
    const textToCopy = booking?.bookingId || fullId;
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      toast.success('Booking ID copied to clipboard!');
    }
  };

  const handleStatusSelect = (e) => {
    const newStatus = e.target.value;
    if (newStatus === 'confirmed' && booking?.pricing?.paymentStatus === 'unpaid') {
      setShowUnpaidModal(true);
      return;
    }
    onUpdateStatus(newStatus);
  };

  const formattedEventType = booking?.eventType ? booking.eventType.replace(/[-_]+/g, ' ') : '';

  return (
    <motion.div
      variants={fadeUp}
      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-6 bg-white/50 dark:bg-stone-900/50 backdrop-blur-sm p-3 sm:p-4 rounded-[4px] border border-[var(--admin-border-subtle)] shadow-xs"
    >
      {/* Top / Left Block: Title, Badges & Subtitle */}
      <div className="flex flex-col w-full sm:w-auto overflow-hidden">
        {/* Row 1: Title on left, Status Badges on right */}
        <div className="flex items-center justify-between gap-2.5 w-full">
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="text-[17px] sm:text-[20px] font-bold text-[var(--admin-text-primary)] tracking-tight leading-none truncate">
              Booking Details
            </h2>
            {formattedEventType && (
              <span className="hidden sm:inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-[4px] shadow-2xs border bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/50 shrink-0">
                {formattedEventType}
              </span>
            )}
          </div>

          {/* Badges on Right (Mobile & Desktop) */}
          <div className="flex items-center gap-1.5 shrink-0">
            <StatusBadge status={booking?.status || 'inquiry'} />
            {booking?.pricing?.paymentStatus && (
              <span
                className={`text-[9.5px] sm:text-[10px] font-bold uppercase tracking-wider px-1.5 sm:px-2 py-0.5 rounded-[4px] shadow-2xs border shrink-0 ${
                  booking.pricing.paymentStatus === 'paid'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50'
                    : booking.pricing.paymentStatus === 'partial'
                      ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/50'
                      : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50'
                }`}
              >
                {booking.pricing.paymentStatus}
              </span>
            )}
          </div>
        </div>

        {/* Row 2: Booking ID on left, Date Chip on right */}
        <div className="flex items-center justify-between gap-2.5 w-full mt-2">
          <div className="flex items-center gap-1.5 text-[12px] text-[var(--admin-text-secondary)] min-w-0">
            <span
              className="font-mono font-bold text-[var(--admin-accent)] truncate max-w-[140px] sm:max-w-none select-all"
              title={fullId}
            >
              {displayId}
            </span>
            <button
              type="button"
              onClick={copyBookingId}
              className="text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)] cursor-pointer transition-colors p-0.5 shrink-0"
              title="Copy ID"
            >
              <span className="material-symbols-outlined text-[14px]">content_copy</span>
            </button>
            <span className="hidden sm:inline text-[var(--admin-border-strong)] opacity-50">•</span>
            <span className="hidden sm:inline text-[11px] font-medium text-[var(--admin-text-secondary)]">
              Booked on {bookingDate}
            </span>
          </div>

          <span className="sm:hidden text-[10.5px] font-medium text-[var(--admin-text-secondary)] bg-[var(--admin-surface-muted)] border border-[var(--admin-border)] px-2 py-0.5 rounded-[4px] shadow-2xs whitespace-nowrap shrink-0">
            {bookingDate}
          </span>
        </div>
      </div>

      {/* Action Controls: WhatsApp & Status Selector */}
      <div className="flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0 pt-2 sm:pt-0 border-t border-[var(--admin-border-subtle)] sm:border-t-0 shrink-0">
        {cleanPhone && (
          <a
            href={`${EXTERNAL_URLS.WHATSAPP_BASE}/${cleanPhone}`}
            target="_blank"
            rel="noopener noreferrer"
            className="h-9 px-3 sm:px-4 rounded-[4px] flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-[#25D366] hover:bg-[#128C7E] text-white font-bold text-[12px] sm:text-[13px] transition-colors shadow-2xs cursor-pointer whitespace-nowrap"
          >
            <WhatsAppIcon className="w-[15px] sm:w-[16px] h-[15px] sm:h-[16px] shrink-0" />
            <span>WhatsApp</span>
          </a>
        )}

        {/* Quick Status Select */}
        <div className="relative flex-1 sm:flex-none sm:w-[180px]">
          <select
            value={booking?.status || 'inquiry'}
            onChange={handleStatusSelect}
            className="w-full h-9 pl-2.5 sm:pl-3 pr-7 sm:pr-8 rounded-[4px] border border-[var(--admin-border)] bg-white dark:bg-[#1a1815] text-[var(--admin-text-primary)] text-[12px] sm:text-[13px] font-bold shadow-2xs outline-none focus:border-[var(--admin-accent)] cursor-pointer transition-colors truncate"
            style={{
              WebkitAppearance: 'none',
              MozAppearance: 'none',
              appearance: 'none',
              backgroundImage: 'none',
            }}
          >
            <option value="inquiry">Inquiry</option>
            <option value="pending_payment">Pending Payment</option>
            <option value="confirmed">Confirmed</option>
            <option value="setup_in_progress">Setup In Progress</option>
            <option value="completed">Completed</option>
          </select>
          <span className="material-symbols-outlined absolute right-1.5 sm:right-2 top-1/2 -translate-y-1/2 text-[18px] text-[var(--admin-text-tertiary)] pointer-events-none select-none">
            expand_more
          </span>
        </div>
      </div>
    </motion.div>
  );
}

export default BookingHeader;
