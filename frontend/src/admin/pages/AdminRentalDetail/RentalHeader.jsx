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
    navigator.clipboard.writeText(rentalId);
    toast.success('Rental ID copied to clipboard!');
  };

  return (
    <motion.div
      variants={fadeUp}
      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[var(--admin-surface)] p-3 sm:p-4 rounded-[6px] border border-[var(--admin-border-subtle)] shadow-xs"
    >
      <div className="flex flex-col min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => navigate('/admin/rentals')}
            className="w-7 h-7 rounded-[4px] border border-[var(--admin-border-subtle)] flex items-center justify-center text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors mr-0.5 cursor-pointer"
            title="Back to Rentals"
          >
            <span className="material-symbols-outlined text-[17px]">arrow_back</span>
          </button>
          <span className="font-mono font-bold text-[14px] sm:text-[15px] text-[var(--admin-text-primary)]">
            #{rentalId}
          </span>
          <button
            type="button"
            onClick={copyId}
            className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 p-0.5 cursor-pointer"
            title="Copy ID"
          >
            <span className="material-symbols-outlined text-[14px]">content_copy</span>
          </button>
          <span className="text-[9.5px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-[4px] border bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:border-indigo-800 leading-none">
            RENTAL
          </span>
          <StatusBadge status={rental.status} />
        </div>
        <p className="text-[11.5px] text-[var(--admin-text-secondary)] mt-1.5 flex items-center gap-1.5 pl-8 sm:pl-0">
          <span className="material-symbols-outlined text-[13px] text-stone-400">schedule</span>
          Booked on{' '}
          <strong className="text-stone-700 dark:text-stone-300 font-semibold">
            {formatDateDMY(rental.createdAt)}
          </strong>
        </p>
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-100 dark:border-stone-800">
        {onViewInvoice && (
          <button
            type="button"
            onClick={onViewInvoice}
            className="h-8 px-3 rounded-[4px] border border-[var(--admin-border-subtle)] bg-[var(--admin-surface)] hover:bg-[var(--admin-bg-subtle)] text-[var(--admin-text-primary)] text-[11.5px] font-bold shadow-2xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-[15px] text-stone-500">
              receipt_long
            </span>
            Invoice
          </button>
        )}
        {cleanPhone && (
          <a
            href={`${EXTERNAL_URLS.WHATSAPP_BASE}/${cleanPhone}`}
            target="_blank"
            rel="noopener noreferrer"
            className="h-8 px-3 rounded-[4px] border border-emerald-300 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-400 text-[11.5px] font-bold flex items-center gap-1.5 transition-all shadow-2xs active:scale-[0.98]"
          >
            <WhatsAppIcon className="w-3.5 h-3.5 text-[#25D366]" />
            WhatsApp
          </a>
        )}
      </div>
    </motion.div>
  );
}
