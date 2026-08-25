import React from 'react';
import { m as motion } from 'framer-motion';

const fadeUp = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } };

export function InquiriesMetrics({ stats }) {
  return (
    <motion.div variants={fadeUp} className="admin-card overflow-hidden text-left relative p-0">
      <div className="absolute top-0 left-0 w-full h-[3px] bg-[var(--admin-border-strong)] z-10" />
      <div className="grid grid-cols-2 lg:grid-cols-5 bg-[var(--admin-surface)]">
        <div className="p-5 space-y-1 border-r border-b lg:border-b-0 border-[var(--admin-border-subtle)]">
          <span className="text-[10px] text-[var(--admin-text-tertiary)] font-bold uppercase tracking-wider">
            Total Orders
          </span>
          <p className="text-[14px] sm:text-[16px] font-bold text-[var(--admin-text-primary)]">
            {stats.total}
          </p>
          <span className="text-[10px] text-[var(--admin-text-secondary)] mt-1 block">
            All custom requests
          </span>
        </div>
        <div className="p-5 space-y-1 border-b lg:border-b-0 lg:border-r border-[var(--admin-border-subtle)]">
          <span className="text-[10px] text-[var(--admin-accent)] font-bold uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[var(--admin-accent)] animate-pulse" />
            New Requests
          </span>
          <p className="text-[14px] sm:text-[16px] font-bold text-[var(--admin-text-primary)]">
            {stats.pending}
          </p>
          <span className="text-[10px] text-[var(--admin-text-secondary)] mt-1 block">
            Awaiting review
          </span>
        </div>
        <div className="p-5 space-y-1 border-r border-b lg:border-b-0 border-[var(--admin-border-subtle)]">
          <span className="text-[10px] text-[var(--admin-text-tertiary)] font-bold uppercase tracking-wider">
            Quotes Sent
          </span>
          <p className="text-[14px] sm:text-[16px] font-bold text-[var(--admin-text-primary)]">
            {stats.quotesSent}
          </p>
          <span className="text-[10px] text-[var(--admin-text-secondary)] mt-1 block">
            Awaiting response
          </span>
        </div>
        <div className="p-5 space-y-1 border-r border-b lg:border-b-0 border-[var(--admin-border-subtle)]">
          <span className="text-[10px] text-[var(--admin-success)] font-bold uppercase tracking-wider">
            Approved Orders
          </span>
          <p className="text-[14px] sm:text-[16px] font-bold text-[var(--admin-success)]">
            {stats.approved}
          </p>
          <span className="text-[10px] text-[var(--admin-success)] opacity-80 mt-1 block">
            Ready to process
          </span>
        </div>
        <div className="p-5 space-y-1 bg-[var(--admin-bg-subtle)] col-span-2 lg:col-span-1">
          <span className="text-[10px] text-[var(--admin-text-tertiary)] font-bold uppercase tracking-wider">
            Total Quote Value
          </span>
          <p className="text-[14px] sm:text-[16px] font-bold text-[var(--admin-text-primary)]">
            ₹{stats.valuation.toLocaleString('en-IN')}
          </p>
          <span className="text-[10px] text-[var(--admin-text-secondary)] mt-1 block">
            Overall value
          </span>
        </div>
      </div>
    </motion.div>
  );
}
