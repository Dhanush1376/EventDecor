import React from 'react';
import { m as motion } from 'framer-motion';

const fadeUp = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } };

export function InquiriesMetrics({ stats }) {
  return (
    <motion.div variants={fadeUp} className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
      {[
        {
          label: 'Total Orders',
          val: stats.total,
          icon: 'assignment_late',
          color:
            'bg-[var(--admin-surface)] border-[var(--admin-border)] hover:border-[var(--admin-border-strong)] text-[var(--admin-text-primary)]',
        },
        {
          label: 'New Requests',
          val: stats.pending,
          icon: 'fiber_new',
          color:
            'bg-[var(--admin-surface)] border-[var(--admin-border)] hover:border-[var(--admin-border-strong)] text-[var(--admin-accent)]',
        },
        {
          label: 'Quotes Sent',
          val: stats.quotesSent,
          icon: 'payments',
          color:
            'bg-[var(--admin-surface)] border-[var(--admin-border)] hover:border-[var(--admin-border-strong)] text-[var(--admin-text-primary)]',
        },
        {
          label: 'Approved Orders',
          val: stats.approved,
          icon: 'task_alt',
          color:
            'bg-[var(--admin-surface)] border-[var(--admin-border)] hover:border-[var(--admin-border-strong)] text-[var(--admin-success)]',
        },
        {
          label: 'Total Quote Value',
          val: `₹${stats.valuation.toLocaleString('en-IN')}`,
          icon: 'trending_up',
          color:
            'bg-[var(--admin-surface)] border-[var(--admin-border)] hover:border-[var(--admin-border-strong)] text-[var(--admin-text-secondary)]',
        },
      ].map((s, i) => (
        <div
          key={i}
          className={`admin-card p-4 sm:p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[var(--admin-shadow-md)] ${
            s.color
          } ${i === 4 ? 'col-span-2 lg:col-span-1' : 'col-span-1'}`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="material-symbols-outlined text-[18px] sm:text-[20px] opacity-75">
              {s.icon}
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--admin-accent)]" />
          </div>
          <p className="text-[17px] sm:text-[22px] font-bold font-mono tracking-tight truncate">
            {s.val}
          </p>
          <p className="text-[9px] sm:text-[11px] font-bold uppercase tracking-wider text-[var(--admin-text-secondary)] mt-1 truncate">
            {s.label}
          </p>
        </div>
      ))}
    </motion.div>
  );
}
