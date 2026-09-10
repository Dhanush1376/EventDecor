import React, { useEffect, useState, useRef, useCallback } from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';
import { Bell, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  notificationService,
  bookingService,
  orderService,
  showcaseService,
} from '../../services/domainServices';
import { useAuth } from '../../context/AuthContext';
import { useUserSocket } from '../../context/UserSocketProvider';

const STORAGE_KEY = 'lastSeenNotificationId';

const getNotificationImage = (notif) => {
  if (!notif) return null;
  return (
    notif.metadata?.imageSrc ||
    notif.metadata?.image ||
    notif.metadata?.thumbnail ||
    notif.metadata?.productImage ||
    notif.metadata?.showcaseImage ||
    notif.metadata?.inspirationImages?.[0] ||
    notif.imageSrc ||
    notif.image ||
    null
  );
};

const formatNotificationMessage = (msg) => {
  if (!msg) return '';
  return (
    msg
      // Remove "EXC-00007", "RET-10004", or any exchange/return ID after request
      .replace(/\b(exchange|return)\s+request\s+[A-Za-z0-9_-]+\s+/gi, '$1 request ')
      // Remove order numbers like "#6a9f3fd1410" or "6a9f3fd14102b2f0a356a168"
      .replace(/\border\s+(#[A-Za-z0-9_-]+|[A-Za-z0-9_-]{8,})\s+/gi, 'order ')
      // Remove booking IDs like "SR-BK-2026-04273A" or "#..."
      .replace(/\bbooking\s+(#[A-Za-z0-9_-]+|[A-Za-z0-9_-]{8,})\s+/gi, 'booking ')
      // Replace underscores in status strings (e.g. "is now setup_in_progress")
      .replace(/status is now ([a-z_]+)/gi, (match, p1) => `status is now ${p1.replace(/_/g, ' ')}`)
      .replace(/\s{2,}/g, ' ')
      .trim()
  );
};

export function GlobalNotificationToast() {
  const [latestNotification, setLatestNotification] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [resolvedImage, setResolvedImage] = useState(null);
  const [imageError, setImageError] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const socket = useUserSocket();

  const pollingIntervalRef = useRef(null);
  const hideTimeoutRef = useRef(null);

  const triggerToast = useCallback((notif) => {
    if (!notif) return;
    setLatestNotification(notif);
    setShowToast(true);

    if (notif._id) {
      localStorage.setItem(STORAGE_KEY, notif._id);
    }

    // Broadcast unread status change to update badges across the app
    window.dispatchEvent(
      new CustomEvent('notifications_status_changed', {
        detail: { hasUnread: true },
      }),
    );

    // Auto-dismiss after 5 seconds
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    hideTimeoutRef.current = setTimeout(() => {
      setShowToast(false);
    }, 5000);
  }, []);

  const fetchLatestNotification = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const res = await notificationService.getMyNotifications({ limit: 1 });
      const notifications = res?.data || [];
      if (notifications.length > 0) {
        const notif = notifications[0];
        const storedId = localStorage.getItem(STORAGE_KEY);

        // Update sidebar/navbar unread badge
        window.dispatchEvent(
          new CustomEvent('notifications_status_changed', {
            detail: { hasUnread: !notif.read },
          }),
        );

        // Only show toast if unread, not previously toasted, and recent (last 10 minutes)
        const isRecent = notif.createdAt
          ? Date.now() - new Date(notif.createdAt).getTime() < 10 * 60 * 1000
          : false;

        if (!notif.read && storedId !== notif._id && isRecent) {
          triggerToast(notif);
        }
      }
    } catch {
      // Silently fail background fetch
    }
  }, [isAuthenticated, triggerToast]);

  // Handle socket events for real-time updates across the app
  useEffect(() => {
    if (!socket) return;

    const handleNewNotif = (notif) => {
      if (notif) {
        triggerToast(notif);
      }
    };

    const handleUpdateEvent = () => {
      // Small timeout to allow backend jobs/outbox to commit the notification
      setTimeout(() => {
        fetchLatestNotification();
      }, 700);
    };

    socket.on('notification:new', handleNewNotif);
    socket.on('order_status_updated', handleUpdateEvent);
    socket.on('order_status_update', handleUpdateEvent);
    socket.on('booking_status_updated', handleUpdateEvent);
    socket.on('return:status_updated', handleUpdateEvent);
    socket.on('return:created', handleUpdateEvent);
    socket.on('refund:status_updated', handleUpdateEvent);
    socket.on('customOrder:statusChange', handleUpdateEvent);

    return () => {
      socket.off('notification:new', handleNewNotif);
      socket.off('order_status_updated', handleUpdateEvent);
      socket.off('order_status_update', handleUpdateEvent);
      socket.off('booking_status_updated', handleUpdateEvent);
      socket.off('return:status_updated', handleUpdateEvent);
      socket.off('return:created', handleUpdateEvent);
      socket.off('refund:status_updated', handleUpdateEvent);
      socket.off('customOrder:statusChange', handleUpdateEvent);
    };
  }, [socket, triggerToast, fetchLatestNotification]);

  // Listen for programmatic notification events
  useEffect(() => {
    const handleCustomToast = (e) => {
      if (e.detail) {
        triggerToast(e.detail);
      }
    };

    window.addEventListener('show_notification_toast', handleCustomToast);
    return () => {
      window.removeEventListener('show_notification_toast', handleCustomToast);
    };
  }, [triggerToast]);

  // Initial fetch and 15-second polling interval
  useEffect(() => {
    fetchLatestNotification();

    if (isAuthenticated) {
      pollingIntervalRef.current = setInterval(fetchLatestNotification, 15000);
    }

    return () => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, [isAuthenticated, fetchLatestNotification]);

  useEffect(() => {
    if (!latestNotification) {
      setResolvedImage(null);
      setImageError(false);
      return;
    }

    setImageError(false);
    const directImage = getNotificationImage(latestNotification);
    if (directImage) {
      setResolvedImage(directImage);
      return;
    }

    // Dynamic resolution if notification image isn't directly on metadata
    let isMounted = true;
    const resolveAsyncImage = async () => {
      try {
        const metadata = latestNotification.metadata || {};
        if (
          latestNotification.type === 'booking' ||
          metadata.bookingId ||
          latestNotification.title?.toLowerCase().includes('booking')
        ) {
          if (metadata.bookingId) {
            const bookingRes = await bookingService.getById(metadata.bookingId);
            const booking = bookingRes?.data || bookingRes;
            const img =
              booking?.eventPackage?.image ||
              booking?.eventPackage?.imageSrc ||
              booking?.inspirationImages?.[0];
            if (img && isMounted) {
              setResolvedImage(img);
              return;
            }
            if (booking?.eventPackage && isMounted) {
              const pkgId = booking.eventPackage._id || booking.eventPackage;
              if (typeof pkgId === 'string') {
                const scRes = await showcaseService.getById(pkgId);
                const sc = scRes?.data || scRes;
                if (sc?.image && isMounted) {
                  setResolvedImage(sc.image);
                  return;
                }
              }
            }
          }

          // Search showcase by title if not resolved yet
          if (isMounted) {
            const cleanTitle = (latestNotification.title || '')
              .replace(/^rent:\s*/i, '')
              .replace(/\s*booking$/i, '')
              .replace(/booking\s*request\s*received/i, '')
              .trim();
            if (cleanTitle) {
              const showcasesRes = await showcaseService.getAll();
              const showcases = showcasesRes?.data || showcasesRes || [];
              const matched = showcases.find((s) =>
                s.title?.toLowerCase().includes(cleanTitle.toLowerCase()),
              );
              if (matched?.image && isMounted) {
                setResolvedImage(matched.image);
                return;
              }
            }
          }
        } else if (
          latestNotification.type === 'order' ||
          metadata.orderId ||
          latestNotification.title?.toLowerCase().includes('order')
        ) {
          if (metadata.orderId) {
            const orderRes = await orderService.getById(metadata.orderId);
            const order = orderRes?.data || orderRes;
            const img = order?.items?.[0]?.imageSrc || order?.items?.[0]?.image;
            if (img && isMounted) {
              setResolvedImage(img);
              return;
            }
          }
        }
      } catch {
        // Silently fallback to bell icon
      }
    };

    resolveAsyncImage();

    return () => {
      isMounted = false;
    };
  }, [latestNotification]);

  const handleToastClick = () => {
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    setShowToast(false);

    // Mark as read in background
    if (latestNotification?._id) {
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

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMins > 0) return `${diffMins}m ago`;
    return 'Just now';
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
            className="pointer-events-auto cursor-pointer bg-white dark:bg-zinc-900 shadow-[0_12px_36px_-6px_rgba(0,0,0,0.15),0_4px_12px_-2px_rgba(0,0,0,0.08)] dark:shadow-[0_12px_36px_-6px_rgba(0,0,0,0.7)] border border-black/[0.08] dark:border-white/10 rounded-[18px] w-full max-w-md p-3.5 pr-5 sm:pr-6 flex items-center gap-3.5 transition-all hover:scale-[1.02] hover:shadow-[0_20px_45px_-10px_rgba(0,0,0,0.2)] group"
          >
            {/* Image or Icon Container */}
            <div className="w-[68px] h-[68px] sm:w-[76px] sm:h-[76px] rounded-[18px] overflow-hidden bg-neutral-100 dark:bg-zinc-800 flex-shrink-0 flex items-center justify-center border border-black/5 dark:border-white/10 shadow-2xs relative">
              {resolvedImage && !imageError ? (
                <img
                  src={resolvedImage}
                  alt={latestNotification.title || 'Notification Thumbnail'}
                  className="w-full h-full object-cover rounded-[18px] transition-transform duration-300 group-hover:scale-105"
                  onError={() => setImageError(true)}
                  loading="eager"
                />
              ) : (
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-[18px] bg-primary/10 flex items-center justify-center">
                  <Bell className="w-5 h-5 sm:w-6 sm:h-6 text-primary" strokeWidth={1.8} />
                </div>
              )}
            </div>

            {/* Content Column */}
            <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
              <span className="font-bold text-[14px] text-on-surface truncate tracking-tight">
                {latestNotification.title}
              </span>
              <p className="text-[12px] sm:text-[13px] text-secondary/80 dark:text-white/70 truncate leading-relaxed">
                {formatNotificationMessage(latestNotification.message)}
              </p>
            </div>

            {/* Right Meta Column: Timestamp on top, small arrow below */}
            <div className="flex flex-col items-end justify-between self-stretch py-0.5 flex-shrink-0">
              <span className="text-[11px] text-secondary/60 dark:text-white/50 font-medium whitespace-nowrap">
                {getTimeAgo(latestNotification.createdAt)}
              </span>
              <ArrowRight
                size={13}
                strokeWidth={2.2}
                className="text-secondary/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all"
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
