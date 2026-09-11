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

  const formattedEventType = booking?.eventType ? booking.eventType.replace(/[-_]+/g, ' ') : '';

  return (
    <motion.div
      variants={fadeUp}
      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 bg-[var(--admin-surface)] p-3 sm:p-5 rounded-[4px] shadow-xs border border-[var(--admin-border)] min-w-0"
    >
      {/* Left Column: Title and Booking ID */}
      <div className="flex flex-col w-full sm:w-auto min-w-0">
        {/* Title Row */}
        <div className="flex items-center justify-between gap-2.5 w-full">
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="text-[18px] sm:text-[20px] font-bold text-[var(--admin-text-primary)] tracking-tight whitespace-nowrap leading-tight">
              Booking Details
            </h2>
            {formattedEventType && (
              <span className="hidden sm:inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-[4px] shadow-2xs border bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/50 shrink-0">
                {formattedEventType}
              </span>
            )}
          </div>
          {/* Status badges in top-right for mobile only */}
          <div className="sm:hidden shrink-0 flex items-center gap-1.5">
            <StatusBadge status={booking?.status || 'inquiry'} />
            {booking?.pricing?.paymentStatus && (
              <span
                className={`text-[9.5px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-[4px] shadow-2xs border shrink-0 ${
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

        {/* Row 2: Booking ID on Left, Date at Right bottom on mobile */}
        <div className="flex items-end justify-between gap-2.5 w-full mt-1 sm:mt-1.5">
          {/* Left: Booking ID with copy button */}
          <div className="flex items-center gap-1 leading-none min-w-0">
            <span
              className="font-mono text-[12px] sm:text-[12.5px] font-medium text-[var(--admin-text-secondary)] select-all truncate"
              title={fullId}
            >
              {displayId}
            </span>
            <button
              type="button"
              onClick={copyBookingId}
              className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 p-0.5 cursor-pointer transition-colors shrink-0"
              title="Copy Booking ID"
            >
              <span className="material-symbols-outlined text-[13px] sm:text-[14px] block">
                content_copy
              </span>
            </button>
          </div>

          {/* Date Chip: on mobile aligned to the right bottom */}
          <div className="sm:hidden shrink-0 self-end">
            <span className="text-[10.5px] font-medium text-[var(--admin-text-secondary)] bg-[var(--admin-surface-muted)] border border-[var(--admin-border)] px-2 py-0.5 rounded-[4px] shadow-2xs whitespace-nowrap flex items-center gap-1">
              <span className="material-symbols-outlined text-[12px] text-[var(--admin-text-tertiary)] shrink-0">
                schedule
              </span>
              <span>Booked {bookingDate}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Right Column: Status & Date (above), Buttons (below) on laptop */}
      <div className="flex flex-col sm:items-end w-full sm:w-auto mt-2 sm:mt-0 shrink-0 gap-1.5 sm:gap-2">
        {/* On laptop: Status Badge on top, Date chip directly below it */}
        <div className="hidden sm:flex flex-col items-end gap-1">
          <div className="flex items-center gap-1.5">
            <StatusBadge status={booking?.status || 'inquiry'} />
            {booking?.pricing?.paymentStatus && (
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-[4px] shadow-2xs border shrink-0 ${
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
          <span className="text-[11px] font-medium text-[var(--admin-text-secondary)] bg-[var(--admin-surface-muted)] border border-[var(--admin-border)] px-2.5 py-0.5 rounded-[4px] shadow-2xs whitespace-nowrap flex items-center gap-1">
            <span className="material-symbols-outlined text-[12px] text-[var(--admin-text-tertiary)] shrink-0">
              schedule
            </span>
            <span>Booked on {bookingDate}</span>
          </span>
        </div>

        {/* Action Buttons: Back, Status Selector, WhatsApp */}
        <div className="flex items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => {
              if (window.history.state && window.history.state.idx > 0) {
                navigate(-1);
              } else {
                navigate('/admin/events?tab=bookings');
              }
            }}
            className="admin-btn admin-btn-outline flex-1 sm:flex-none !h-9 sm:!h-10 !py-0 px-3 sm:px-4 !rounded-[4px] text-[12px] sm:text-[13px] font-bold shadow-sm min-w-max cursor-pointer inline-flex items-center justify-center gap-1.5 box-border"
          >
            <span className="material-symbols-outlined text-[17px] sm:text-[18px] leading-none">
              arrow_back
            </span>
            <span>Back</span>
          </button>

          {cleanPhone && (
            <a
              href={`${EXTERNAL_URLS.WHATSAPP_BASE}/${cleanPhone}`}
              target="_blank"
              rel="noopener noreferrer"
              className="admin-btn flex-1 sm:flex-none !h-9 sm:!h-10 !py-0 px-3 sm:px-4 !rounded-[4px] text-[12px] sm:text-[13px] font-bold shadow-sm min-w-max cursor-pointer inline-flex items-center justify-center gap-1.5 bg-[#25D366] !text-white hover:!bg-[#128C7E] border border-[#25D366] hover:border-[#128C7E] transition-colors box-border"
            >
              <WhatsAppIcon className="w-[17px] sm:w-[18px] h-[17px] sm:h-[18px]" />
              <span>WhatsApp</span>
            </a>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default BookingHeader;
