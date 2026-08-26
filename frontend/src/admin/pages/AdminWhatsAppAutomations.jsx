import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PageHeader } from '../components/ui/Layout';
import WhatsAppDashboard from '../components/whatsapp/WhatsAppDashboard';
import AutomationToggleCenter from '../components/whatsapp/AutomationToggleCenter';
import TemplateEditor from '../components/whatsapp/TemplateEditor';
import RecipientManager from '../components/whatsapp/RecipientManager';
import MessageLogViewer from '../components/whatsapp/MessageLogViewer';
import WhatsAppCampaigns from '../components/whatsapp/WhatsAppCampaigns';
import DeadLetterQueueManager from '../components/whatsapp/DeadLetterQueueManager';
import AuditAndVersions from '../components/whatsapp/AuditAndVersions';
import WhatsAppRolesAndApprovals from '../components/whatsapp/WhatsAppRolesAndApprovals';
import WhatsAppWorkflowStudio from '../components/whatsapp/WhatsAppWorkflowStudio';
import WhatsAppExecutiveDashboard from '../components/whatsapp/WhatsAppExecutiveDashboard';
import WhatsAppReadinessDashboard from '../components/whatsapp/WhatsAppReadinessDashboard';
import WhatsAppSettings from '../components/whatsapp/WhatsAppSettings';

const fadeUp = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export const AdminWhatsAppAutomations = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [advancedMode, setAdvancedMode] = useState(false);

  const baseTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'automations', label: 'Notifications', icon: 'notifications' },
    { id: 'templates', label: 'Templates', icon: 'edit_document' },
    { id: 'recipients', label: 'Recipients', icon: 'group' },
    { id: 'logs', label: 'Logs', icon: 'history' },
    { id: 'analytics', label: 'Analytics', icon: 'insights' },
    { id: 'settings', label: 'Settings', icon: 'settings' },
  ];

  const advancedTabs = [
    { id: 'campaigns', label: 'Campaigns', icon: 'campaign' },
    { id: 'queues', label: 'Live Queues', icon: 'monitor_heart' },
    { id: 'versions', label: 'Audit & Versions', icon: 'history_edu' },
    { id: 'rbac', label: 'Security & RBAC', icon: 'shield_person' },
    { id: 'studio', label: 'Workflow Studio', icon: 'schema' },
    { id: 'certification', label: 'Certification', icon: 'verified' },
  ];

  const tabs = advancedMode ? [...baseTabs, ...advancedTabs] : baseTabs;

  return (
    <div className="admin-page-container">
      <PageHeader title="WhatsApp Automation Center" icon="chat" />

      {/* Sleek Modern Tabs */}
      <div className="flex items-center gap-1.5 p-1.5 bg-[var(--admin-surface-muted)] rounded-md border border-[var(--admin-border-subtle)] overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] mb-6 shadow-sm">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative shrink-0 flex items-center gap-2 px-4 py-2.5 rounded text-[13px] font-bold tracking-wide transition-all duration-300 ${
                isActive
                  ? 'bg-white text-[var(--admin-text-primary)] shadow-md border border-[var(--admin-border-subtle)]'
                  : 'text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] hover:bg-black/5 border border-transparent'
              }`}
            >
              <span
                className={`material-symbols-outlined text-[18px] transition-colors duration-300 ${
                  isActive ? 'text-[var(--admin-accent)]' : 'text-[var(--admin-text-tertiary)]'
                }`}
              >
                {tab.icon}
              </span>
              {tab.label}
            </button>
          );
        })}
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
            {activeTab === 'logs' && <MessageLogViewer />}
            {activeTab === 'analytics' && <WhatsAppExecutiveDashboard />}
            {activeTab === 'settings' && (
              <WhatsAppSettings advancedMode={advancedMode} setAdvancedMode={setAdvancedMode} />
            )}

            {advancedMode && (
              <>
                {activeTab === 'campaigns' && <WhatsAppCampaigns />}
                {activeTab === 'queues' && <DeadLetterQueueManager />}
                {activeTab === 'versions' && <AuditAndVersions />}
                {activeTab === 'rbac' && <WhatsAppRolesAndApprovals />}
                {activeTab === 'studio' && <WhatsAppWorkflowStudio />}
                {activeTab === 'certification' && <WhatsAppReadinessDashboard />}
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AdminWhatsAppAutomations;
