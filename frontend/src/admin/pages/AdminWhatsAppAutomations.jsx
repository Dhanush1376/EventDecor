import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PageHeader } from '../components/ui/Layout';
import WhatsAppDashboard from '../components/whatsapp/WhatsAppDashboard';
import AutomationToggleCenter from '../components/whatsapp/AutomationToggleCenter';
import TemplateEditor from '../components/whatsapp/TemplateEditor';
import RecipientManager from '../components/whatsapp/RecipientManager';
import SectionBuilder from '../components/whatsapp/SectionBuilder';
import MessageLogViewer from '../components/whatsapp/MessageLogViewer';
import AnalyticsDashboard from '../components/whatsapp/AnalyticsDashboard';
import DeadLetterQueueManager from '../components/whatsapp/DeadLetterQueueManager';

const fadeUp = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export const AdminWhatsAppAutomations = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'automations', label: 'Automations', icon: 'toggle_on' },
    { id: 'templates', label: 'Templates', icon: 'format_paint' },
    { id: 'recipients', label: 'Recipients', icon: 'group' },
    { id: 'section-builder', label: 'Section Builder', icon: 'view_list' },
    { id: 'logs', label: 'Logs', icon: 'history' },
    { id: 'analytics', label: 'Analytics', icon: 'insights' },
    { id: 'dlq', label: 'DLQ Manager', icon: 'warning' },
  ];

  return (
    <div className="admin-page-container">
      <PageHeader
        title="WhatsApp Automation Center"
        subtitle="Manage end-to-end WhatsApp notifications, templates, and dynamic triggers."
        icon="chat"
      />

      {/* Tabs */}
      <div className="flex border-b border-[var(--admin-border)] mb-6 overflow-x-auto custom-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 flex items-center gap-2 whitespace-nowrap transition-colors border-b-2 ${
              activeTab === tab.id
                ? 'border-[var(--admin-accent)] text-[var(--admin-accent)] font-semibold'
                : 'border-transparent text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)]'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
            <span className="text-[14px]">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="min-h-[500px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            exit="hidden"
          >
            {activeTab === 'dashboard' && <WhatsAppDashboard />}
            {activeTab === 'automations' && <AutomationToggleCenter />}
            {activeTab === 'templates' && <TemplateEditor />}
            {activeTab === 'recipients' && <RecipientManager />}
            {activeTab === 'section-builder' && <SectionBuilder />}
            {activeTab === 'logs' && <MessageLogViewer />}
            {activeTab === 'analytics' && <AnalyticsDashboard />}
            {activeTab === 'dlq' && <DeadLetterQueueManager />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AdminWhatsAppAutomations;
