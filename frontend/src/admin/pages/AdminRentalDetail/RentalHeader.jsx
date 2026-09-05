import React from 'react';
import { m as motion } from 'framer-motion';
import { StatusBadge, fadeUp } from '../../components/AdminUIKit';
import { EXTERNAL_URLS } from '../../../config/constants';
import { WhatsAppIcon } from '../../../components/ui/WhatsAppIcon';

export function RentalHeader({ rental, navigate }) {
  const rentalId = rental.rentalOrderId || rental._id;

  return (
    <motion.div
      variants={fadeUp}
      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-6 bg-white/50 backdrop-blur-sm p-3 sm:p-4 rounded-lg border border-[var(--admin-border-subtle)] shadow-sm mb-4 sm:mb-6"
    >
      <div className="flex items-start sm:items-center gap-3 sm:gap-4 w-full sm:w-auto overflow-hidden">
        <button
          onClick={() => navigate('/admin/rentals')}
          className="w-10 h-10 rounded-full flex items-center justify-center bg-[var(--admin-surface)] hover:bg-[var(--admin-surface-muted)] text-[var(--admin-text-primary)] border border-[var(--admin-border)] shadow-sm transition-colors shrink-0 mt-0.5 sm:mt-0"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <h2
              className="text-[18px] sm:text-[22px] font-bold text-[var(--admin-text-primary)] tracking-tight leading-none truncate"
              title={rentalId}
            >
              #{rentalId}
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-xl shadow-sm border bg-indigo-50 text-indigo-700 border-indigo-200">
                Rental
              </span>
              <StatusBadge status={rental.status} />
            </div>
          </div>
          <p className="text-[12px] sm:text-[13px] text-[var(--admin-text-secondary)] font-medium mt-2 sm:mt-1.5 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[14px]">calendar_today</span>
            Placed on{' '}
            {new Date(rental.createdAt).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto mt-2 sm:mt-0 shrink-0">
        <a
          href={`${EXTERNAL_URLS.WHATSAPP_BASE}/${(rental.shippingAddress?.phone || '').replace(/[^0-9]/g, '')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="h-10 px-3 sm:px-5 rounded-lg flex-1 sm:flex-none flex items-center justify-center gap-2 bg-[#25D366] text-white hover:bg-[#128C7E] font-bold text-[12px] sm:text-[13px] transition-colors shadow-sm min-w-max"
        >
          <WhatsAppIcon className="w-[16px] sm:w-[18px] h-[16px] sm:h-[18px]" />
          WhatsApp
        </a>
      </div>
    </motion.div>
  );
}
