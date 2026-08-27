import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import {
  analyticsService,
  reviewService,
  eventService,
  notificationService,
  loyaltyService,
} from '../../services/domainServices';
import toast from 'react-hot-toast';
import debounce from 'lodash.debounce';
import { getAccessToken } from '../../services/api';
import { acquireAdminSocket, releaseAdminSocket } from '../services/adminSocket';
import logger from '../../utils/core/logger';
import { getErrorMessage } from '../../utils/core/errorHelpers';

import { useAdminSecurity } from '../hooks/useAdminSecurity';
import { useAdminCMS } from '../hooks/useAdminCMS';
import { useAdminProducts } from '../hooks/useAdminProducts';
import { useAdminOrders } from '../hooks/useAdminOrders';

const extractTimestamp = (id) => {
  if (typeof id === 'string' && id.length === 24) {
    return new Date(parseInt(id.substring(0, 8), 16) * 1000).toISOString();
  }
  return new Date().toISOString();
};

const mapDbNotificationToFrontend = (n) => ({
  id: n._id || n.id,
  title: n.title,
  message: getErrorMessage({ message: n.message }, 'An automated system event occurred.'),
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
  timestamp: n.createdAt || n.timestamp || extractTimestamp(n._id || n.id),
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
  const [globalActionLoading, setGlobalActionLoading] = useState(false);
  const [globalActionMessage, setGlobalActionMessage] = useState('');
  const [globalActionSuccess, setGlobalActionSuccess] = useState(false);

  const security = useAdminSecurity({
    setGlobalActionLoading,
    setGlobalActionMessage,
    setGlobalActionSuccess,
  });
  const cms = useAdminCMS({
    activeRole: security.activeRole,
    safetyLock: security.safetyLock,
    logAdminAction: security.logAdminAction,
    autoPublish: security.autoPublish,
    setSafetyLock: security.setSafetyLock,
    setMaintenanceMode: security.setMaintenanceMode,
    setMaintenanceMode: security.setMaintenanceMode,
    setIdleTimeoutMinutes: security.setIdleTimeoutMinutes,
    setAutoPublish: security.setAutoPublish,
    setGlobalActionLoading,
    setGlobalActionMessage,
    setGlobalActionSuccess,
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
            reviewService.getAll({ limit: 999999 }),
            analyticsService.getDashboardStats(),
            eventService.getAll({ limit: 999999 }),
            analyticsService.getAuditLogs({ limit: 999999 }),
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

  const markNotificationUnread = useCallback(async (notifId) => {
    setNotifications((prev) => prev.map((n) => (n.id === notifId ? { ...n, read: false } : n)));
    try {
      // Best effort backend call if route exists, mostly relying on local state for UX
      await notificationService.markAdminAlertUnread?.(notifId);
    } catch (err) {
      logger.warn('Failed to mark notification unread on backend:', err);
    }
  }, []);

  const deleteNotification = useCallback(async (notifId) => {
    setNotifications((prev) => prev.filter((n) => n.id !== notifId));
    try {
      await notificationService.deleteAdminAlert(notifId);
      toast.success('Alert dismissed');
    } catch (err) {
      logger.warn('Failed to dismiss alert on backend:', err);
      toast.error('Failed to dismiss alert');
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
      const res = await eventService.getAll({ limit: 999999 });
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
      const res = await reviewService.getAll({ limit: 999999 });
      if (res.success) {
        setReviews(res.data?.data || []);
      }
    } catch (_err) {
      /* silent */
    }
  }, []);

  // Real-time WebSocket alerts (shared singleton /admin socket)
  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;

    const socket = acquireAdminSocket();

    const seenNotificationIds = new Set();

    // Coalesce bursty realtime events so a flurry of socket messages triggers at
    // most one refetch every few seconds instead of a storm of API refreshes.
    const debouncedDashboard = debounce(() => refreshDashboard(), 3000, { maxWait: 8000 });
    const debouncedOrders = debounce(() => ordersHook.refreshOrders(), 3000, { maxWait: 8000 });
    const debouncedEvents = debounce(() => refreshEvents(), 3000, { maxWait: 8000 });
    const debouncedReviews = debounce(() => refreshReviews(), 3000, { maxWait: 8000 });
    const debouncedProducts = debounce(() => productsHook.refreshProducts(), 3000, {
      maxWait: 8000,
    });

    const onNewNotification = (data) => {
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
            className="cursor-pointer flex flex-col font-sans w-full min-w-[250px] max-w-sm sm:max-w-md break-words p-1"
          >
            <strong className="text-sm text-slate-900 font-bold flex items-center gap-1.5 leading-tight">
              {mapped.title}
            </strong>
            <span className="text-xs text-slate-600 mt-1.5 leading-snug font-normal line-clamp-3">
              {mapped.message}
            </span>
          </div>
        ),
        { duration: 8000, position: 'top-right' },
      );
      setNotifications((prev) => [mapped, ...prev]);
      window.dispatchEvent(new CustomEvent('admin_notification', { detail: data }));
    };

    const onOrderUpdate = () => {
      debouncedOrders();
      debouncedDashboard();
    };
    const onStockUpdate = () => {
      debouncedProducts();
    };
    const onBookingUpdate = () => {
      debouncedEvents();
      debouncedDashboard();
    };
    const onTimelineUpdate = () => {
      debouncedOrders();
      debouncedDashboard();
    };
    const onCustomOrderUpdate = () => {
      // No dedicated custom-order refresh in this context; refresh the events and
      // dashboard, which surface related data.
      debouncedEvents();
      debouncedDashboard();
    };
    const onRentalUpdate = () => {
      debouncedDashboard();
    };
    const onReviewUpdate = () => {
      debouncedReviews();
      debouncedDashboard();
    };

    socket.on('new_notification', onNewNotification);
    socket.on('order_update', onOrderUpdate);
    socket.on('stock_update', onStockUpdate);
    socket.on('booking_update', onBookingUpdate);
    socket.on('timeline_update', onTimelineUpdate);
    socket.on('custom_order_update', onCustomOrderUpdate);
    socket.on('rental_update', onRentalUpdate);
    socket.on('review_update', onReviewUpdate);

    return () => {
      socket.off('new_notification', onNewNotification);
      socket.off('order_update', onOrderUpdate);
      socket.off('stock_update', onStockUpdate);
      socket.off('booking_update', onBookingUpdate);
      socket.off('timeline_update', onTimelineUpdate);
      socket.off('custom_order_update', onCustomOrderUpdate);
      socket.off('rental_update', onRentalUpdate);
      socket.off('review_update', onReviewUpdate);
      debouncedDashboard.cancel();
      debouncedOrders.cancel();
      debouncedEvents.cancel();
      debouncedReviews.cancel();
      debouncedProducts.cancel();
      releaseAdminSocket();
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
        markNotificationUnread,
        deleteNotification,
        markAllNotificationsRead,
        dashboardStats,
        refreshDashboard,
        dataLoading,
        searchQuery,
        setSearchQuery,
        searchPaletteOpen,
        setSearchPaletteOpen,
        globalActionLoading,
        setGlobalActionLoading,
        globalActionMessage,
        setGlobalActionMessage,
        globalActionSuccess,
        setGlobalActionSuccess,
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
