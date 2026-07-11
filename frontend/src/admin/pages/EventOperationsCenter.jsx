import React, { useState } from 'react';
import { m as motion } from 'framer-motion';
import { PageHeader, fadeUp, stagger } from '../components/AdminUIKit';

export default function EventOperationsCenter() {
  const [activeTab, setActiveTab] = useState('overview'); // overview, venues, crew, resources, calendar

  return (
    <motion.div initial="hidden" animate="show" variants={stagger} className="w-full space-y-6">
      <PageHeader
        title="Event Operations Center"
        subtitle="Manage venues, crews, resources, and event logistics."
        icon="event_available"
        iconColor="primary"
      />

      <div className="flex items-center gap-6 border-b border-[var(--admin-border-subtle)] mt-1">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'venues', label: 'Venues' },
          { id: 'crew', label: 'Crew & Staff' },
          { id: 'resources', label: 'Resources & Equipment' },
          { id: 'calendar', label: 'Operations Calendar' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-3 text-[13px] font-bold tracking-wide capitalize border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-[var(--admin-primary)] text-[var(--admin-primary)]'
                : 'border-transparent text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <motion.div key={activeTab} variants={fadeUp} className="admin-card p-12 text-center">
        <div className="w-20 h-20 bg-[var(--admin-primary)]/10 text-[var(--admin-primary)] rounded-[var(--admin-radius-xl)] flex items-center justify-center mx-auto mb-6 shadow-inner">
          <span className="material-symbols-outlined text-[40px]">construction</span>
        </div>
        <h2 className="text-[24px] font-bold text-[var(--admin-text-primary)] tracking-tight">
          Module Under Construction
        </h2>
        <p className="text-[var(--admin-text-secondary)] mt-2 font-medium text-[15px]">
          The {activeTab} view for the new Event Operations domain is currently being built.
        </p>
      </motion.div>
    </motion.div>
  );
}
