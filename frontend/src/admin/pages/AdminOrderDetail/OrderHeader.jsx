import React from 'react';
import { m as motion } from 'framer-motion';
import { StatusBadge, fadeUp } from '../../components/AdminUIKit';
import { EXTERNAL_URLS } from '../../../config/constants';
import { WhatsAppIcon } from '../../../components/ui/WhatsAppIcon';

export function OrderHeader({ order, navigate, onPrintInvoice, onViewInvoice }) {
  return (
    <motion.div
      variants={fadeUp}
      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
    >
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/admin/orders')}
          className="admin-btn-icon w-10 h-10 min-h-0 bg-[var(--admin-surface)] hover:bg-[var(--admin-surface-muted)] text-[var(--admin-text-primary)] border border-[var(--admin-border)]"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
        </button>
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-[20px] font-bold text-[var(--admin-text-primary)] leading-none">
              {order.id}
            </h2>
            {order.orderType && order.orderType !== 'purchase' && (
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${order.orderType === 'rental' ? 'bg-indigo-100 text-indigo-700' : 'bg-purple-100 text-purple-700'}`}
              >
                {order.orderType}
              </span>
            )}
            <StatusBadge status={order.payment.replace('_', '')} />
          </div>
          <p className="text-[12px] text-[var(--admin-text-tertiary)] font-medium mt-1.5">
            Placed on {order.date}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
        <button onClick={onPrintInvoice} className="admin-btn admin-btn-primary h-9">
          <span className="material-symbols-outlined text-[16px]">print</span>
          Print Invoice
        </button>
        <button onClick={onViewInvoice} className="admin-btn admin-btn-outline h-9">
          <span className="material-symbols-outlined text-[16px]">receipt_long</span>
          View Invoice
        </button>
        <a
          href={`${EXTERNAL_URLS.WHATSAPP_BASE}/${order.phone.replace(/[^0-9]/g, '')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="admin-btn h-9 bg-[var(--admin-success)] text-white hover:bg-[var(--admin-success-light)] border-none"
        >
          <WhatsAppIcon className="w-[16px] h-[16px]" />
          WhatsApp
        </a>
      </div>
    </motion.div>
  );
}
