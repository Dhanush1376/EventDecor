import React, { useState } from 'react';
import { m as motion } from 'framer-motion';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { PageHeader, stagger } from '../components/AdminUIKit';

import { AdminTeam } from './AdminTeam';
import { AdminNotifications } from './AdminNotifications';
import { AdminSettings } from './AdminSettings';

export default function AdminSystemHub() {
  const location = useLocation();
  const navigate = useNavigate();
  const [teamHeaderAction, setTeamHeaderAction] = useState(null);

  // If user navigated to old audit path, redirect to merged Staff live activity feed
  if (location.pathname.includes('/system/audit')) {
    return <Navigate to="/admin/analytics/operations?actor=staff" replace />;
  }

  // Determine initial tab based on URL path
  const getInitialTab = () => {
    const path = location.pathname;
    if (path.includes('/system/notifications')) return 'notifications';
    if (path.includes('/system/settings')) return 'settings';
    return 'users'; // Default to /admin/system/users or /admin/system
  };

  const activeTab = getInitialTab();

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
          subtitle: (
            <div className="flex flex-wrap items-center gap-1.5 text-[13px]">
              <span className="font-semibold text-[var(--admin-text-primary)]">System Alerts</span>
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Live Dispatch
              </span>
            </div>
          ),
        };
      case 'settings':
        return {
          title: 'System Settings',
          subtitle: (
            <div className="flex flex-wrap items-center gap-1.5 text-[13px]">
              <span className="font-semibold text-[var(--admin-text-primary)]">
                Platform Config
              </span>
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Preferences & Backups
              </span>
            </div>
          ),
        };
      case 'users':
      default:
        return {
          title: 'Active Admins',
          subtitle: (
            <div className="flex flex-wrap items-center gap-1.5 text-[13px]">
              <span className="font-semibold text-[var(--admin-text-primary)]">Admin Portal</span>
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Access & Authorization
              </span>
            </div>
          ),
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
          headerAction={activeTab === 'users' ? teamHeaderAction : null}
        />
      </div>

      <div>
        {activeTab === 'users' && (
          <AdminTeam hideHeader={true} setHeaderAction={setTeamHeaderAction} />
        )}
        {activeTab === 'notifications' && <AdminNotifications hideHeader={true} />}
        {activeTab === 'settings' && <AdminSettings hideHeader={true} />}
      </div>
    </motion.div>
  );
}
