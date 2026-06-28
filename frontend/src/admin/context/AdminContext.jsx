import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import {
  analyticsService,
  reviewService,
  userService,
  eventService,
  notificationService,
} from '../../services/domainServices';
import toast from 'react-hot-toast';
import { io as socketIO } from 'socket.io-client';
import { getAccessToken } from '../../services/api';
import { getApiRootUrl } from '../../config/apiConfig';
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

const mapDbCustomerToFrontend = (c) => {
  if (!c) return null;
  if (c.id && c.orders !== undefined) return c;

  const totalSpent = Array.isArray(c.orders)
    ? c.orders.reduce((sum, order) => sum + (order.total || 0), 0)
    : 0;
  const orderCount = Array.isArray(c.orders) ? c.orders.length : 0;

  let segment = 'New';
  if (orderCount > 5 || totalSpent > 50000) {
    segment = 'VIP';
  } else if (orderCount > 0) {
    segment = 'Regular';
  }

  const lastOrderDate = c.updatedAt
    ? new Date(c.updatedAt).toISOString().split('T')[0]
    : '2026-05-15';
  const city = c.addresses && c.addresses[0] ? c.addresses[0].city : 'Unknown';

  return {
    id: c._id || c.id || 'CUS-UNKNOWN',
    name: c.name || 'Customer',
    email: c.email || '',
    phone: c.phone || '',
    orders: orderCount,
    totalSpent: totalSpent || 0,
    lastOrder: lastOrderDate,
    segment: segment,
    city: city,
    walletBalance: c.walletBalance || 0,
    siriCoins: c.siriCoins || 0,
    loyaltyTier: c.loyaltyTier || 'Bronze',
    rawUser: c,
  };
};

const mapDbEventToFrontend = (e) => {
  if (!e) return null;
  if (e.id && e.eventType && e.customer) return e;

  const dateStr = e.createdAt ? new Date(e.createdAt).toISOString().split('T')[0] : '2026-05-20';

  return {
    id: e._id || e.id || 'EVT-UNKNOWN',
    eventType: e.title || 'Custom Consultation',
    customer: e.category || 'Consultation Request',
    status: e.isActive ? 'Confirmed' : 'Pending',
    date: dateStr,
    venue: e.venueType || 'Ongole',
    amount: e.pricing ? parseInt(e.pricing.replace(/[^0-9]/g, '')) || 45000 : 45000,
    payment: 'Paid',
    staff: ['Siri', 'Anji'],
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
  const [customers, setCustomers] = useState([]);
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
        const [customersRes, reviewsRes, statsRes, eventsRes, auditLogsRes, alertsRes] =
          await Promise.allSettled([
            userService.getAll({ role: 'customer' }),
            reviewService.getAll({ limit: 50 }),
            analyticsService.getDashboardStats(),
            eventService.getAll({ limit: 50 }),
            analyticsService.getAuditLogs({ limit: 100 }),
            notificationService.getAdminAlerts(),
          ]);

        // Trigger fetches in hooks
        await Promise.all([productsHook.refreshProducts(), ordersHook.refreshOrders()]);

        if (customersRes.status === 'fulfilled' && customersRes.value?.success) {
          const payload = customersRes.value.data;
          const list = payload?.users || payload?.data || payload || [];
          setCustomers((Array.isArray(list) ? list : []).map(mapDbCustomerToFrontend));
        }
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
        const res = await reviewService.updateStatus(reviewId, 'approved');
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

  // Real-time WebSocket alerts
  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;

    const rawApiUrl = getApiRootUrl();
    const socketServerUrl = rawApiUrl;

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
    });

    socket.on('order_update', () => {
      ordersHook.refreshOrders();
    });

    socket.on('stock_update', () => {
      productsHook.refreshProducts();
    });

    socket.on('booking_update', () => {
      refreshEvents();
    });

    return () => {
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const refreshCustomers = useCallback(async () => {
    try {
      const res = await userService.getAll({ limit: 50, role: 'user' });
      if (res.success) {
        const list = res.data?.data || [];
        setCustomers(list.map(mapDbCustomerToFrontend));
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

  const [lastDataRefresh, setLastDataRefresh] = useState(new Date());

  useEffect(() => {
    const pollInterval = setInterval(async () => {
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
    }, 60000);
    return () => clearInterval(pollInterval);
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
        customers,
        refreshCustomers,
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
