import React from 'react';
import { m as motion } from 'framer-motion';
import { StatusBadge, fadeUp } from '../../components/AdminUIKit';
import { EXTERNAL_URLS } from '../../../config/constants';
import { WhatsAppIcon } from '../../../components/ui/WhatsAppIcon';

export function OrderHeader({ order, navigate, onPrintInvoice, onViewInvoice }) {
  return (
    <motion.div
      variants={fadeUp}
      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-6 bg-white/50 backdrop-blur-sm p-3 sm:p-4 rounded-[4px] border border-[var(--admin-border-subtle)] shadow-sm"
    >
      <div className="flex flex-col w-full sm:w-auto overflow-hidden">
        {/* Row 1: Title on left, Status / Payment Badges on right */}
        <div className="flex items-center justify-between gap-3 w-full">
          <h2 className="text-[18px] sm:text-[20px] font-bold text-[var(--admin-text-primary)] tracking-tight leading-none">
            Order Details
          </h2>
          <div className="flex items-center gap-1.5 shrink-0">
            {order.orderType && order.orderType !== 'purchase' && (
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-[4px] shadow-2xs border ${
                  order.orderType === 'rental'
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    : 'bg-purple-50 text-purple-700 border-purple-200'
                }`}
              >
                {order.orderType}
              </span>
            )}
            <StatusBadge status={order.payment.replace('_', '')} />
          </div>
        </div>

        {/* Row 2: Order ID on left, Placed Date Chip on right in equal line */}
        <div className="flex items-center justify-between gap-3 w-full mt-2">
          <span
            className="text-[12px] sm:text-[13px] font-normal text-[var(--admin-text-secondary)] select-all truncate max-w-[180px] sm:max-w-none"
            title={order.id}
          >
            #{order.id}
          </span>
          <span className="text-[11px] font-medium text-[var(--admin-text-secondary)] bg-[var(--admin-surface-muted)] border border-[var(--admin-border)] px-2.5 py-0.5 rounded-[4px] shadow-2xs whitespace-nowrap shrink-0">
            Placed on {order.date}
          </span>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto mt-2 sm:mt-0 shrink-0">
        <button
          onClick={onPrintInvoice}
          className="admin-btn admin-btn-primary flex-1 sm:flex-none h-10 px-3 sm:px-5 !rounded-[4px] shadow-sm text-[12px] sm:text-[13px] font-bold min-w-max"
        >
          <span className="material-symbols-outlined text-[18px]">print</span>
          Print
        </button>
        <button
          onClick={onViewInvoice}
          className="admin-btn admin-btn-outline flex-1 sm:flex-none h-10 px-3 sm:px-5 !rounded-[4px] text-[12px] sm:text-[13px] font-bold shadow-sm min-w-max"
        >
          <span className="material-symbols-outlined text-[18px]">receipt_long</span>
          Invoice
        </button>
        <a
          href={`${EXTERNAL_URLS.WHATSAPP_BASE}/${order.phone.replace(/[^0-9]/g, '')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="h-10 px-3 sm:px-5 rounded-[4px] flex-1 sm:flex-none flex items-center justify-center gap-2 bg-[#25D366] text-white hover:bg-[#128C7E] font-bold text-[12px] sm:text-[13px] transition-colors shadow-sm min-w-max"
        >
          <WhatsAppIcon className="w-[16px] sm:w-[18px] h-[16px] sm:h-[18px]" />
          WhatsApp
        </a>
      </div>
    </motion.div>
  );
}
