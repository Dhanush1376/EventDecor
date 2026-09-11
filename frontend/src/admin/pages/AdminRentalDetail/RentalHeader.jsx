import React from 'react';
import { m as motion } from 'framer-motion';
import { StatusBadge, fadeUp } from '../../components/AdminUIKit';
import { EXTERNAL_URLS } from '../../../config/constants';
import { WhatsAppIcon } from '../../../components/ui/WhatsAppIcon';
import toast from 'react-hot-toast';

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

export function RentalHeader({ rental, navigate, onPrintInvoice, onViewInvoice }) {
  const rentalId = rental.rentalOrderId || rental._id;
  const phone = rental.userId?.phone || rental.user?.phone || rental.shippingAddress?.phone || '';
  const cleanPhone = phone.replace(/[^0-9]/g, '');

  const copyId = () => {
    if (rentalId) {
      navigator.clipboard.writeText(rentalId);
      toast.success('Rental ID copied to clipboard!');
    }
  };

  return (
    <motion.div
      variants={fadeUp}
      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 bg-[var(--admin-surface)] p-3 sm:p-5 rounded-[4px] shadow-xs border border-[var(--admin-border)] min-w-0"
    >
      {/* Left Column: Title and Rental ID */}
      <div className="flex flex-col w-full sm:w-auto min-w-0">
        {/* Title Row */}
        <div className="flex items-center justify-between gap-2.5 w-full">
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="text-[18px] sm:text-[20px] font-bold text-[var(--admin-text-primary)] tracking-tight whitespace-nowrap leading-tight">
              Rental Details
            </h2>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-[4px] shadow-2xs border bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:border-indigo-800 shrink-0">
              RENTAL
            </span>
          </div>
          {/* Status badge in top-right for mobile only */}
          <div className="sm:hidden shrink-0">
            <StatusBadge status={rental.status} />
          </div>
        </div>

        {/* Row 2: Rental ID on Left, Date at Right bottom on mobile */}
        <div className="flex items-end justify-between gap-2.5 w-full mt-1 sm:mt-1.5">
          {/* Left: Rental ID with copy button */}
          <div className="flex items-center gap-1 leading-none min-w-0">
            <span
              className="font-mono text-[12px] sm:text-[12.5px] font-medium text-[var(--admin-text-secondary)] select-all truncate"
              title={rentalId}
            >
              #{rentalId}
            </span>
            <button
              type="button"
              onClick={copyId}
              className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 p-0.5 cursor-pointer shrink-0 transition-colors"
              title="Copy Rental ID"
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
              <span>Booked on {formatDateDMY(rental.createdAt)}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Right Column: Status & Date (above), Buttons (below) on laptop */}
      <div className="flex flex-col sm:items-end w-full sm:w-auto mt-2 sm:mt-0 shrink-0 gap-1.5 sm:gap-2">
        {/* On laptop: Status Badge on top, Date chip directly below it */}
        <div className="hidden sm:flex flex-col items-end gap-1">
          <StatusBadge status={rental.status} />
          <span className="text-[11px] font-medium text-[var(--admin-text-secondary)] bg-[var(--admin-surface-muted)] border border-[var(--admin-border)] px-2.5 py-0.5 rounded-[4px] shadow-2xs whitespace-nowrap flex items-center gap-1">
            <span className="material-symbols-outlined text-[12px] text-[var(--admin-text-tertiary)] shrink-0">
              schedule
            </span>
            <span>Booked on {formatDateDMY(rental.createdAt)}</span>
          </span>
        </div>

        {/* Action Buttons: Back, Invoice, WhatsApp */}
        <div className="flex items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => {
              if (window.history.state && window.history.state.idx > 0) {
                navigate(-1);
              } else {
                navigate('/admin/rentals');
              }
            }}
            className="admin-btn admin-btn-outline flex-1 sm:flex-none !h-9 sm:!h-10 !py-0 px-3 sm:px-4 !rounded-[4px] text-[12px] sm:text-[13px] font-bold shadow-sm min-w-max cursor-pointer inline-flex items-center justify-center gap-1.5 box-border"
          >
            <span className="material-symbols-outlined text-[17px] sm:text-[18px] leading-none">
              arrow_back
            </span>
            <span>Back</span>
          </button>
          {onViewInvoice && (
            <button
              type="button"
              onClick={onViewInvoice}
              className="admin-btn admin-btn-outline flex-1 sm:flex-none !h-9 sm:!h-10 !py-0 px-3 sm:px-4 !rounded-[4px] text-[12px] sm:text-[13px] font-bold shadow-sm min-w-max flex items-center justify-center gap-1.5 cursor-pointer hover:border-[var(--admin-accent)] hover:text-[var(--admin-accent)] transition-colors box-border"
            >
              <span className="material-symbols-outlined text-[17px] sm:text-[18px] leading-none">
                receipt_long
              </span>
              <span>Invoice</span>
            </button>
          )}
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
