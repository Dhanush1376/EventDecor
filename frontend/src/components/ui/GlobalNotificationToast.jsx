import React, { useEffect, useState, useRef } from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { notificationService } from '../../services/domainServices';
import { useAuth } from '../../context/AuthContext';

// Keep track of the last seen notification ID to avoid showing the toast for the same notification multiple times
const STORAGE_KEY = 'lastSeenNotificationId';

export function GlobalNotificationToast() {
  const [latestNotification, setLatestNotification] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const pollingIntervalRef = useRef(null);
  const hideTimeoutRef = useRef(null);

  const fetchLatestNotification = async () => {
    if (!isAuthenticated) return;

    try {
      const res = await notificationService.getMyNotifications({ limit: 1 });
      const notifications = res?.data || [];
      if (notifications.length > 0) {
        const notif = notifications[0];
        const storedId = localStorage.getItem(STORAGE_KEY);

        // Dispatch global event for the orange dot in sidebar
        window.dispatchEvent(
          new CustomEvent('notifications_status_changed', {
            detail: { hasUnread: !notif.read },
          }),
        );

        // Only show if it's unread, we haven't shown a toast for this specific ID yet,
        // and it is a RECENT notification (e.g. created within the last 5 minutes)
        const isRecent = new Date() - new Date(notif.createdAt) < 5 * 60 * 1000;

        if (!notif.read && storedId !== notif._id && isRecent) {
          setLatestNotification(notif);
          setShowToast(true);
          localStorage.setItem(STORAGE_KEY, notif._id);

          // Auto hide after 5 seconds
          if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
          hideTimeoutRef.current = setTimeout(() => {
            setShowToast(false);
          }, 5000);
        }
      }
    } catch (err) {
      // Silently fail polling
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchLatestNotification();

    // Poll every 15 seconds
    pollingIntervalRef.current = setInterval(fetchLatestNotification, 15000);

    return () => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, [isAuthenticated]);

  const handleToastClick = () => {
    setShowToast(false);

    // Mark as read in background
    if (latestNotification) {
      notificationService.markNotificationRead(latestNotification._id).catch(() => {});

      if (latestNotification.actionUrl) {
        if (latestNotification.actionUrl.startsWith('/dashboard/orders/')) {
          navigate('/dashboard/orders');
        } else {
          navigate(latestNotification.actionUrl);
        }
      } else {
        navigate('/dashboard/notifications');
      }
    }
  };

  const getTimeAgo = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}H AGO`; // Simplification
    if (diffHours > 0) return `${diffHours}H AGO`;
    if (diffMins > 0) return `${diffMins}M AGO`;
    return 'JUST NOW';
  };

  return (
    <AnimatePresence>
      {showToast && latestNotification && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0, transition: { duration: 0.3 } }}
          className="fixed top-6 left-0 right-0 z-[100] flex justify-center pointer-events-none px-4"
        >
          <div
            onClick={handleToastClick}
            className="pointer-events-auto cursor-pointer bg-white shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-surface-container rounded-xl w-full max-w-md p-3 flex items-center gap-4 transition-transform hover:scale-[1.02]"
          >
            {/* Image or Icon */}
            <div className="w-16 h-16 rounded-lg overflow-hidden bg-surface-container-lowest flex-shrink-0 flex items-center justify-center border border-outline-variant/20 shadow-sm relative">
              {latestNotification.metadata?.image || latestNotification.metadata?.thumbnail ? (
                <img
                  src={latestNotification.metadata?.image || latestNotification.metadata?.thumbnail}
                  alt="Notification"
                  className="w-full h-full object-cover"
                />
              ) : (
                <Bell className="w-6 h-6 text-[#8c7335]" strokeWidth={1.5} />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-[14px] text-on-surface truncate">
                  {latestNotification.title}
                </span>
                {latestNotification.metadata?.entityType && (
                  <span className="bg-surface-container px-1.5 py-0.5 rounded text-[10px] font-bold text-secondary uppercase tracking-wider whitespace-nowrap">
                    {latestNotification.metadata.entityType.substring(0, 2).toUpperCase()}
                  </span>
                )}
                <span className="flex items-center gap-1 text-[10px] text-secondary ml-auto whitespace-nowrap">
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  {getTimeAgo(latestNotification.createdAt)}
                </span>
              </div>
              <p className="text-[13px] text-secondary truncate">{latestNotification.message}</p>
            </div>

            {/* Arrow */}
            <div className="flex-shrink-0 px-2 text-[#8c7335]">
              <ArrowRight size={18} strokeWidth={2} />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
