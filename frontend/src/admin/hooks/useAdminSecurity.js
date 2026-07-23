import { useState, useCallback, useRef, useEffect } from 'react';
import { cmsService } from '../../services/domainServices';
import storeSettingsService from '../../services/api/storeSettingsService';
import { analyticsService } from '../../services/domainServices';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import logger from '../../utils/core/logger';

export function useAdminSecurity({ setGlobalActionLoading, setGlobalActionMessage } = {}) {
  const { logout } = useAuth();

  const [activeRole, setActiveRole] = useState('owner');
  const [safetyLock, setSafetyLock] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [idleTimeoutMinutes, setIdleTimeoutMinutes] = useState(15);
  const [autoPublish, setAutoPublish] = useState(true);

  const [auditLogs, setAuditLogs] = useState([]);

  const [showIdleWarning, setShowIdleWarning] = useState(false);
  const [idleSecondsLeft, setIdleSecondsLeft] = useState(30);

  const logAdminAction = useCallback(
    async (action, details, status = 'Success') => {
      const actorName = activeRole;
      try {
        const res = await analyticsService.createAuditLog(action, details, status);
        if (res.success && res.data) {
          const log = res.data;
          const newLog = {
            id: log._id || log.id,
            actor: (log.actorRole || actorName).toUpperCase(),
            action: log.path || action,
            details: `Client Action on ${log.path || ''}: ${details}`,
            timestamp: log.createdAt || new Date().toISOString(),
            status: log.statusCode < 400 ? 'Success' : 'Failure',
          };
          setAuditLogs((prev) => [newLog, ...prev].slice(0, 100));
        }
      } catch (err) {
        logger.error('Failed to log admin action to backend:', err);
        const newLog = {
          id: `log-${Date.now()}`,
          actor: actorName.toUpperCase(),
          action,
          details,
          timestamp: new Date().toISOString(),
          status,
        };
        setAuditLogs((prev) => [newLog, ...prev].slice(0, 100));
      }
    },
    [activeRole],
  );

  const clearAuditLogs = useCallback(async () => {
    try {
      if (setGlobalActionLoading) {
        setGlobalActionMessage('Clearing audit logs...');
        setGlobalActionLoading(true);
      }
      const res = await analyticsService.clearAuditLogs();
      if (res.success) {
        setAuditLogs([]);
        toast.success('Activity log cleared');
      }
    } catch (err) {
      logger.error('Failed to clear audit logs:', err);
      toast.error('Failed to clear cloud audit logs');
    } finally {
      if (setGlobalActionLoading) setGlobalActionLoading(false);
    }
  }, [setGlobalActionLoading, setGlobalActionMessage]);

  const toggleSafetyLock = useCallback(async () => {
    const next = !safetyLock;
    setSafetyLock(next);
    try {
      if (setGlobalActionLoading) {
        setGlobalActionMessage(next ? 'Enabling safety lock...' : 'Disabling safety lock...');
        setGlobalActionLoading(true);
      }
      await cmsService.updateSection('admin_safety_lock', { safetyLock: next });
      logAdminAction('TOGGLE_SAFETY_LOCK', `Global safety write override lock set to ${next}`);
      toast.success(
        `Safety lock is now ${next ? 'ACTIVE (Write Operations Blocked)' : 'DISABLED'}`,
      );
    } catch (err) {
      logger.error('Failed to update backend safety lock:', err);
      setSafetyLock(!next);
      toast.error('Failed to update safety lock on the backend database.');
    } finally {
      if (setGlobalActionLoading) setGlobalActionLoading(false);
    }
  }, [safetyLock, logAdminAction, setGlobalActionLoading, setGlobalActionMessage]);

  const toggleMaintenanceMode = useCallback(async () => {
    const next = !maintenanceMode;
    setMaintenanceMode(next);
    try {
      if (setGlobalActionLoading) {
        setGlobalActionMessage(
          next ? 'Enabling maintenance mode...' : 'Disabling maintenance mode...',
        );
        setGlobalActionLoading(true);
      }
      await storeSettingsService.updateSection('general', { maintenanceMode: next });
      logAdminAction('TOGGLE_MAINTENANCE', `Global storefront maintenance mode set to ${next}`);
      toast.success(`Maintenance mode is now ${next ? 'ENABLED' : 'DISABLED'}`);
    } catch (err) {
      logger.error('Failed to update backend maintenance mode:', err);
      setMaintenanceMode(!next);
      toast.error('Failed to update maintenance mode on the backend database.');
    } finally {
      if (setGlobalActionLoading) setGlobalActionLoading(false);
    }
  }, [maintenanceMode, logAdminAction, setGlobalActionLoading, setGlobalActionMessage]);

  const toggleAutoPublish = useCallback(async () => {
    const next = !autoPublish;
    setAutoPublish(next);
    try {
      if (setGlobalActionLoading) {
        setGlobalActionMessage(next ? 'Enabling auto-publish...' : 'Disabling auto-publish...');
        setGlobalActionLoading(true);
      }
      await cmsService.updateSection('admin_auto_publish', { autoPublish: next });
      logAdminAction('TOGGLE_AUTO_PUBLISH', `Global auto publish CMS setting set to ${next}`);
      toast.success(`Auto-Publish mode is now ${next ? 'ENABLED' : 'DISABLED'}`);
    } catch (err) {
      logger.error('Failed to update backend auto publish setting:', err);
      setAutoPublish(!next);
      toast.error('Failed to update auto publish in database');
    } finally {
      if (setGlobalActionLoading) setGlobalActionLoading(false);
    }
  }, [autoPublish, logAdminAction, setGlobalActionLoading, setGlobalActionMessage]);

  const changeActiveRole = useCallback(
    (role) => {
      setActiveRole(role);
      logAdminAction('ROLE_SWITCH', `Switched active preview role to ${role.toUpperCase()}`);
      toast.success(`Simulating '${role.toUpperCase()}' mode permissions`);
    },
    [logAdminAction],
  );

  const changeIdleTimeout = useCallback(
    async (val) => {
      setIdleTimeoutMinutes(val);
      try {
        await cmsService.updateSection('admin_idle_timeout', { idleTimeout: val });
        logAdminAction('TIMEOUT_UPDATE', `Idle inactivity threshold updated to ${val} minutes`);
        toast.success(`Inactivity limit set to ${val} minutes`);
      } catch (err) {
        logger.error('Failed to save idle timeout to backend:', err);
        toast.error('Failed to save timeout in database');
      }
    },
    [logAdminAction],
  );

  // Idle Heartbeat Daemon
  const lastActivityRef = useRef(null);

  useEffect(() => {
    lastActivityRef.current = Date.now();
    const handleActivity = () => {
      lastActivityRef.current = Date.now();
      if (showIdleWarning) {
        setShowIdleWarning(false);
        setIdleSecondsLeft(30);
      }
    };

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);
    window.addEventListener('scroll', handleActivity);

    const interval = setInterval(() => {
      const elapsedMs = Date.now() - lastActivityRef.current;
      const elapsedSecs = Math.floor(elapsedMs / 1000);
      const totalTimeoutSecs = idleTimeoutMinutes * 60;
      const warningStartSecs = totalTimeoutSecs - 30;

      if (elapsedSecs >= totalTimeoutSecs) {
        clearInterval(interval);
        logAdminAction('SESSION_EXPIRED', 'Inactivity timeout threshold exceeded, logging out');
        logout();
        toast.error('Session expired due to inactivity.', { duration: 8000 });
        window.location.href = '/';
      } else if (elapsedSecs >= warningStartSecs) {
        setShowIdleWarning(true);
        setIdleSecondsLeft(totalTimeoutSecs - elapsedSecs);
      } else {
        setShowIdleWarning(false);
      }
    }, 1000);

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('scroll', handleActivity);
      clearInterval(interval);
    };
  }, [idleTimeoutMinutes, showIdleWarning, logout, logAdminAction]);

  return {
    activeRole,
    changeActiveRole,
    safetyLock,
    setSafetyLock,
    toggleSafetyLock,
    maintenanceMode,
    setMaintenanceMode,
    toggleMaintenanceMode,
    idleTimeoutMinutes,
    setIdleTimeoutMinutes,
    changeIdleTimeout,
    auditLogs,
    setAuditLogs,
    logAdminAction,
    clearAuditLogs,
    showIdleWarning,
    setShowIdleWarning,
    idleSecondsLeft,
    autoPublish,
    setAutoPublish,
    toggleAutoPublish,
  };
}
