import React from 'react';
import { m as motion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { PageHeader, stagger } from '../components/AdminUIKit';

import { AdminTeam } from './AdminTeam';
import { AdminNotifications } from './AdminNotifications';
import { AdminSettings } from './AdminSettings';
import { AdminAuditHistory } from './AdminAuditHistory';

export default function AdminSystemHub() {
  const location = useLocation();
  const navigate = useNavigate();

  // Determine initial tab based on URL path
  const getInitialTab = () => {
    const path = location.pathname;
    if (path.includes('/system/notifications')) return 'notifications';
    if (path.includes('/system/settings')) return 'settings';
    if (path.includes('/system/audit')) return 'audit';
    return 'users'; // Default to /admin/system/users or /admin/system
  };

  const activeTab = getInitialTab();

  const handleTabChange = (tabId) => {
    const basePath = '/admin/system';
    const newPath = tabId === 'users' ? `${basePath}/users` : `${basePath}/${tabId}`;
    navigate(newPath);
  };

  const tabs = [
    { id: 'users', label: 'Users & Roles', icon: 'groups' },
    { id: 'notifications', label: 'Notifications', icon: 'notifications' },
    { id: 'settings', label: 'Settings', icon: 'settings' },
    { id: 'audit', label: 'Audit History', icon: 'history' },
  ];

  return (
    <motion.div initial="hidden" animate="show" variants={stagger} className="space-y-6">
      <div>
        <PageHeader
          title="System Hub"
          subtitle="Configuration, security, team access, and notifications."
          icon="admin_panel_settings"
        />

        {/* Smart Filter Tabs */}
        <div className="flex border-b border-[var(--admin-border-subtle)] overflow-x-auto no-scrollbar mt-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2 px-6 py-4 font-semibold text-[14px] border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-[var(--admin-accent)] text-[var(--admin-accent)]'
                  : 'border-transparent text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] hover:border-[var(--admin-border-strong)]'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        {activeTab === 'users' && <AdminTeam hideHeader={true} />}
        {activeTab === 'notifications' && <AdminNotifications hideHeader={true} />}
        {activeTab === 'settings' && <AdminSettings hideHeader={true} />}
        {activeTab === 'audit' && <AdminAuditHistory hideHeader={true} />}
      </div>
    </motion.div>
  );
}
