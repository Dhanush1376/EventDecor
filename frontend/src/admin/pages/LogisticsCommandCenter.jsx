import React, { useState } from 'react';
import { m as motion } from 'framer-motion';
import { PageHeader, fadeUp, stagger } from '../components/AdminUIKit';

export default function LogisticsCommandCenter() {
  const [activeTab, setActiveTab] = useState('overview'); // overview, shipments, rules, zones, couriers

  return (
    <motion.div initial="hidden" animate="show" variants={stagger} className="w-full space-y-6">
      <PageHeader
        title="Logistics Command Center"
        subtitle="Manage shipments, shipping rules, delivery zones, and couriers."
        icon="local_shipping"
        iconColor="info"
      />

      <div className="flex items-center gap-6 border-b border-[var(--admin-border-subtle)] mt-1 overflow-x-auto no-scrollbar">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'shipments', label: 'Shipments & Tracking' },
          { id: 'rules', label: 'Shipping Rules' },
          { id: 'zones', label: 'Delivery Zones' },
          { id: 'couriers', label: 'Couriers' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-3 text-[13px] font-bold tracking-wide capitalize border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-[var(--admin-info)] text-[var(--admin-info)]'
                : 'border-transparent text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <motion.div key={activeTab} variants={fadeUp} className="admin-card p-12 text-center">
        <div className="w-20 h-20 bg-[var(--admin-info)]/10 text-[var(--admin-info)] rounded-[var(--admin-radius-xl)] flex items-center justify-center mx-auto mb-6 shadow-inner">
          <span className="material-symbols-outlined text-[40px]">construction</span>
        </div>
        <h2 className="text-[24px] font-bold text-[var(--admin-text-primary)] tracking-tight">
          Module Under Construction
        </h2>
        <p className="text-[var(--admin-text-secondary)] mt-2 font-medium text-[15px]">
          The {activeTab} view for the new Logistics Domain is currently being built.
        </p>
      </motion.div>
    </motion.div>
  );
}
