import React from 'react';
import { m as motion } from 'framer-motion';
import { fadeUp } from '../AdminUIKit';

export function InquiriesMetrics({ stats }) {
  return (
    <motion.div variants={fadeUp} className="admin-card overflow-hidden text-left relative p-0">
      <div className="absolute top-0 left-0 w-full h-[3px] bg-[var(--admin-border-strong)] z-10" />
      <div className="grid grid-cols-2 md:grid-cols-4 bg-[var(--admin-surface)]">
        {/* Total Inquiries */}
        <div className="p-5 space-y-1 border-r border-b md:border-b-0 border-[var(--admin-border-subtle)]">
          <span className="text-[10px] text-[var(--admin-text-tertiary)] font-bold uppercase tracking-wider">
            Total Inquiries
          </span>
          <p className="text-[14px] font-bold text-[var(--admin-text-primary)]">{stats.total}</p>
          <span className="text-[10px] text-[var(--admin-text-secondary)] mt-1 block">
            All custom requests
          </span>
        </div>

        {/* New Requests */}
        <div className="p-5 space-y-1 border-b md:border-b-0 md:border-r border-[var(--admin-border-subtle)]">
          <span className="text-[10px] text-[var(--admin-accent)] font-bold uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[var(--admin-accent)] animate-pulse" />
            New Requests
          </span>
          <p className="text-[14px] font-bold text-[var(--admin-text-primary)]">{stats.pending}</p>
          <span className="text-[10px] text-[var(--admin-text-secondary)] mt-1 block">
            Awaiting initial review
          </span>
        </div>

        {/* Quotes Sent */}
        <div className="p-5 space-y-1 border-r border-[var(--admin-border-subtle)]">
          <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            Quotes Sent
          </span>
          <p className="text-[14px] font-bold text-[var(--admin-text-primary)]">
            {stats.quotesSent}
          </p>
          <span className="text-[10px] text-[var(--admin-text-secondary)] mt-1 block">
            Awaiting client response
          </span>
        </div>

        {/* Approved Orders */}
        <div className="p-5 space-y-1 bg-[var(--admin-surface)]">
          <span className="text-[10px] text-[var(--admin-success)] font-bold uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[var(--admin-success)]" />
            Approved Orders
          </span>
          <p className="text-[14px] font-bold text-[var(--admin-success)]">{stats.approved}</p>
          <span className="text-[10px] text-[var(--admin-success)] opacity-80 mt-1 block">
            Ready for production
          </span>
        </div>
      </div>
    </motion.div>
  );
}
