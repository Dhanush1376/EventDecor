import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import {
  analyticsService,
  reviewService,
  eventService,
  notificationService,
  loyaltyService,
} from '../../services/domainServices';
import toast from 'react-hot-toast';
import { io as socketIO } from 'socket.io-client';
import { getAccessToken } from '../../services/api';
import { getWebSocketUrl } from '../../config/apiConfig';
import logger from '../../utils/core/logger';

import { useAdminSecurity } from '../hooks/useAdminSecurity';
import { useAdminCMS } from '../hooks/useAdminCMS';
import { useAdminProducts } from '../hooks/useAdminProducts';
import { useAdminOrders } from '../hooks/useAdminOrders';

const mapDbNotificationToFrontend = (n) => ({
  id: n._id || n.id,
  title: n.title,
  message: n.message,
  type:
    n.type === 'custom_request'
      ? 'booking'
      : n.type === 'inquiry'
        ? 'booking'
        : n.type === 'user'
          ? 'review'
          : n.type,
  read: n.isRead,
  time: n.createdAt
    ? new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) +
      ' ' +
      new Date(n.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })
    : 'Just now',
  actionLink: n.actionLink,
  rawNotification: n,
});

// Customer mock function removed - Customers are now fetched dynamically on demand

const mapDbEventToFrontend = (e) => {
  if (!e) return null;

  const dateStr = e.date
    ? new Date(e.date).toISOString().split('T')[0]
    : e.createdAt
      ? new Date(e.createdAt).toISOString().split('T')[0]
      : 'Unknown Date';

  return {
    id: e.bookingId || e._id || e.id || 'UNKNOWN',
    eventType: e.eventType || e.title || 'Unknown Event',
    customer: e.user?.name || e.user?.email || 'Customer',
    status: e.status || (e.isActive ? 'Confirmed' : 'Pending'),
    date: dateStr,
    venue: e.venue?.city || e.venue?.address || 'Location TBD',
    amount: e.pricing?.totalPrice || 0,
    payment: e.pricing?.paymentStatus || 'unpaid',
    staff: e.assignedTeam ? e.assignedTeam.map((t) => t.name) : [],
    rawEvent: e,
  };
};

const AdminContext = createContext(null);

export function AdminProvider({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);

  const security = useAdminSecurity();
  const cms = useAdminCMS({
    activeRole: security.activeRole,
    safetyLock: security.safetyLock,
    logAdminAction: security.logAdminAction,
    autoPublish: security.autoPublish,
    setSafetyLock: security.setSafetyLock,
    setMaintenanceMode: security.setMaintenanceMode,
    setIdleTimeoutMinutes: security.setIdleTimeoutMinutes,
    setAutoPublish: security.setAutoPublish,
  });

  const productsHook = useAdminProducts({
    activeRole: security.activeRole,
    safetyLock: security.safetyLock,
    logAdminAction: security.logAdminAction,
  });

  const ordersHook = useAdminOrders({
    activeRole: security.activeRole,
    safetyLock: security.safetyLock,
    logAdminAction: security.logAdminAction,
  });

  const themeMode = 'light';
  const [dashboardStats, setDashboardStats] = useState(null);
  // customers removed for dynamic fetching
  const [reviews, setReviews] = useState([]);
  const [eventBookings, setEventBookings] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchPaletteOpen, setSearchPaletteOpen] = useState(false);

  // Fetch Data from Backend on Mount
  useEffect(() => {
    const fetchAdminData = async () => {
      setDataLoading(true);
      try {
        const [reviewsRes, statsRes, eventsRes, auditLogsRes, alertsRes] = await Promise.allSettled(
          [
            reviewService.getAll({ limit: 50 }),
            analyticsService.getDashboardStats(),
            eventService.getAll({ limit: 50 }),
            analyticsService.getAuditLogs({ limit: 100 }),
            notificationService.getAdminAlerts(),
          ],
        );

        // Trigger fetches in hooks
        await Promise.all([productsHook.refreshProducts(), ordersHook.refreshOrders()]);

        if (reviewsRes.status === 'fulfilled' && reviewsRes.value?.success) {
          const payload = reviewsRes.value.data;
          const list = payload?.reviews || payload?.data || payload || [];
          setReviews(Array.isArray(list) ? list : []);
        }
        if (statsRes.status === 'fulfilled' && statsRes.value?.success) {
          setDashboardStats(statsRes.value.data);
        }
        if (eventsRes.status === 'fulfilled' && eventsRes.value?.success) {
          const evData = eventsRes.value.data;
          const list =
            evData?.events ||
            evData?.items ||
            evData?.data ||
            (Array.isArray(evData) ? evData : []);
          setEventBookings((Array.isArray(list) ? list : []).map(mapDbEventToFrontend));
        }
        if (auditLogsRes.status === 'fulfilled' && auditLogsRes.value?.success) {
          const rawLogs = auditLogsRes.value.data?.data || auditLogsRes.value.data || [];
          security.setAuditLogs(
            rawLogs.map((log) => ({
              id: log._id || log.id,
              actor: (log.actorRole || 'OWNER').toUpperCase(),
              actorEmail: log.actorEmail || 'System',
              action: log.path || log.method,
              details:
                log.method === 'CLIENT_ACTION'
                  ? `Admin Triggered Action: ${log.path}`
                  : `HTTP ${log.method || 'ACTION'} on ${log.path || ''} with status ${log.statusCode || 200}`,
              timestamp: log.createdAt || new Date().toISOString(),
              status: log.statusCode < 400 ? 'Success' : 'Failure',
            })),
          );
        }
        if (alertsRes.status === 'fulfilled' && alertsRes.value?.success) {
          const list =
            alertsRes.value.data?.notifications ||
            (Array.isArray(alertsRes.value.data) ? alertsRes.value.data : []);
          setNotifications(list.map(mapDbNotificationToFrontend));
        }
      } catch (err) {
        logger.error('Failed to load admin data:', err);
        toast.error('Failed to load admin data: ' + (err.message || 'Unknown error'));
      } finally {
        setDataLoading(false);
      }
    };

    fetchAdminData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    cms.loadCMSData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cms.loadCMSData]);

  const unreadNotifications = notifications.filter((n) => !n.read).length;
  const toggleSidebar = useCallback(() => setSidebarOpen((p) => !p), []);
  const toggleMobileSidebar = useCallback(() => setSidebarMobileOpen((p) => !p), []);

  const approveReview = useCallback(
    async (reviewId) => {
      if (security.activeRole === 'viewer') {
        toast.error('Viewer Role: Write operations are restricted!');
        return;
      }
      if (security.activeRole === 'editor') {
        toast.error('Editor Role: Moderating customer reviews is restricted!');
        return;
      }
      if (security.safetyLock) {
        toast.error('Safety Lock Active: Write operations are globally blocked!');
        return;
      }
      try {
        const res = await loyaltyService.adminModerateReview(reviewId, 'approve');
        if (res.success) {
          setReviews((prev) =>
            prev.map((r) => ((r._id || r.id) === reviewId ? { ...r, status: 'approved' } : r)),
          );
          security.logAdminAction('APPROVE_REVIEW', `Approved Review ID: ${reviewId}`);
          toast.success('Review approved');
        }
      } catch (_err) {
        toast.error('Failed to approve review');
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [security.activeRole, security.safetyLock, security.logAdminAction],
  );

  const markNotificationRead = useCallback(async (notifId) => {
    setNotifications((prev) => prev.map((n) => (n.id === notifId ? { ...n, read: true } : n)));
    try {
      await notificationService.markAdminAlertRead(notifId);
    } catch (err) {
      logger.warn('Failed to mark notification read on backend:', err);
    }
  }, []);

  const markAllNotificationsRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await notificationService.markAdminAlertAllRead();
      toast.success('All notifications marked as read');
    } catch (err) {
      logger.warn('Failed to mark all notifications read on backend:', err);
    }
  }, []);

  const refreshDashboard = useCallback(async () => {
    try {
      const res = await analyticsService.getDashboardStats();
      if (res.success) setDashboardStats(res.data);
    } catch (_err) {
      /* silent */
    }
  }, []);

  const refreshEvents = useCallback(async () => {
    try {
      const res = await eventService.getAll({ limit: 100 });
      if (res.success) {
        const evData = res.data;
        const list = evData?.data || evData?.items || (Array.isArray(evData) ? evData : []);
        setEventBookings(list.map(mapDbEventToFrontend));
      }
    } catch (_err) {
      /* silent */
    }
  }, []);

  const refreshReviews = useCallback(async () => {
    try {
      const res = await reviewService.getAll({ limit: 50 });
      if (res.success) {
        setReviews(res.data?.data || []);
      }
    } catch (_err) {
      /* silent */
    }
  }, []);

  // Real-time WebSocket alerts
  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;

    const socketServerUrl = getWebSocketUrl();

    const socket = socketIO(`${socketServerUrl}/admin`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 15,
      reconnectionDelay: 5000,
    });

    const seenNotificationIds = new Set();

    socket.on('new_notification', (data) => {
      const mapped = mapDbNotificationToFrontend(data);
      if (seenNotificationIds.has(mapped.id)) return;
      seenNotificationIds.add(mapped.id);
      if (seenNotificationIds.size > 100) {
        const iter = seenNotificationIds.values();
        seenNotificationIds.delete(iter.next().value);
      }
      toast(
        (t) => (
          <div
            onClick={() => {
              toast.dismiss(t.id);
              if (mapped.actionLink) {
                window.location.href = mapped.actionLink;
              }
            }}
            className="cursor-pointer flex flex-col font-sans max-w-[280px]"
          >
            <strong className="text-[12px] text-slate-900 font-bold flex items-center gap-1.5 leading-tight">
              {mapped.title}
            </strong>
            <span className="text-[11px] sm:text-[11px] text-slate-500 mt-1 leading-normal font-normal">
              {mapped.message}
            </span>
          </div>
        ),
        { duration: 8000, position: 'top-right' },
      );
      setNotifications((prev) => [mapped, ...prev]);
      window.dispatchEvent(new CustomEvent('admin_notification', { detail: data }));
    });

    socket.on('order_update', () => {
      ordersHook.refreshOrders();
      refreshDashboard();
    });

    socket.on('stock_update', () => {
      productsHook.refreshProducts();
    });

    socket.on('booking_update', () => {
      refreshEvents();
      refreshDashboard();
    });

    socket.on('timeline_update', () => {
      ordersHook.refreshOrders();
      refreshDashboard();
    });

    socket.on('custom_order_update', () => {
      // In the absence of a dedicated custom order refresh in this context,
      // refresh events and dashboard which may contain related data.
      refreshEvents();
      refreshDashboard();
    });

    socket.on('rental_update', () => {
      refreshDashboard();
    });

    socket.on('review_update', () => {
      refreshReviews();
      refreshDashboard();
    });

    return () => {
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshDashboard]);

  const [lastDataRefresh, setLastDataRefresh] = useState(new Date());

  useEffect(() => {
    // 5-minute low-frequency fallback reconciliation
    const pollInterval = setInterval(async () => {
      // Only poll if the tab is actively visible to prevent hidden background bandwidth drain
      if (document.visibilityState === 'visible') {
        try {
          await Promise.allSettled([
            ordersHook.refreshOrders(),
            refreshDashboard(),
            (async () => {
              const alertsRes = await notificationService.getAdminAlerts();
              if (alertsRes?.success) {
                const list =
                  alertsRes.data?.notifications ||
                  (Array.isArray(alertsRes.data) ? alertsRes.data : []);
                setNotifications(list.map(mapDbNotificationToFrontend));
              }
            })(),
          ]);
          setLastDataRefresh(new Date());
        } catch (_err) {}
      }
    }, 300000); // 5 minutes

    // Reconcile immediately when the tab becomes visible after being hidden
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        try {
          await Promise.allSettled([ordersHook.refreshOrders(), refreshDashboard()]);
          setLastDataRefresh(new Date());
        } catch (_err) {}
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(pollInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ordersHook.refreshOrders, refreshDashboard]);

  return (
    <AdminContext.Provider
      value={{
        sidebarOpen,
        setSidebarOpen,
        toggleSidebar,
        sidebarMobileOpen,
        setSidebarMobileOpen,
        toggleMobileSidebar,
        // customers removed
        eventBookings,
        refreshEvents,
        reviews,
        approveReview,
        refreshReviews,
        notifications,
        unreadNotifications,
        markNotificationRead,
        markAllNotificationsRead,
        dashboardStats,
        refreshDashboard,
        dataLoading,
        searchQuery,
        setSearchQuery,
        searchPaletteOpen,
        setSearchPaletteOpen,
        themeMode,
        lastDataRefresh,

        ...security,
        ...cms,
        ...productsHook,
        ...ordersHook,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}

export const useAdmin = () => {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin must be used within AdminProvider');
  return ctx;
};
