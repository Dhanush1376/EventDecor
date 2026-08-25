import React, { useState } from 'react';
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
  const [teamHeaderAction, setTeamHeaderAction] = useState(null);

  const handleTabChange = (tabId) => {
    const basePath = '/admin/system';
    const newPath = tabId === 'users' ? `${basePath}/users` : `${basePath}/${tabId}`;
    navigate(newPath);
  };

  const getHeaderProps = () => {
    switch (activeTab) {
      case 'notifications':
        return {
          title: 'Notifications',
          subtitle: 'System alerts, rules, and emails.',
          icon: 'notifications',
        };
      case 'settings':
        return {
          title: 'System Settings',
          subtitle: 'Profile, backups, and configuration.',
          icon: 'settings',
        };
      case 'audit':
        return {
          title: 'Audit History',
          subtitle: 'Logs, activity, and security.',
          icon: 'history',
        };
      case 'users':
      default:
        return {
          title: 'Active Admins',
          subtitle: 'Manage team access and invitations.',
          icon: 'admin_panel_settings',
        };
    }
  };

  const headerProps = getHeaderProps();

  return (
    <motion.div initial="hidden" animate="show" variants={stagger} className="space-y-6">
      <div>
        <PageHeader
          title={headerProps.title}
          subtitle={headerProps.subtitle}
          icon={headerProps.icon}
          headerAction={activeTab === 'users' ? teamHeaderAction : null}
        />
      </div>

      <div>
        {activeTab === 'users' && (
          <AdminTeam hideHeader={true} setHeaderAction={setTeamHeaderAction} />
        )}
        {activeTab === 'notifications' && <AdminNotifications hideHeader={true} />}
        {activeTab === 'settings' && <AdminSettings hideHeader={true} />}
        {activeTab === 'audit' && <AdminAuditHistory hideHeader={true} />}
      </div>
    </motion.div>
  );
}
