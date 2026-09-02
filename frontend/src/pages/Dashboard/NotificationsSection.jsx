import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, Box, Calendar, CreditCard, Settings, Clock, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { notificationService } from '../../services/domainServices';
import { useDashboard } from '../../context/DashboardContext';
import { toast } from 'react-hot-toast';

const getIconForType = (type) => {
  switch (type) {
    case 'order':
      return <Box className="w-4 h-4 text-[#8c7335]" strokeWidth={1.5} />;
    case 'booking':
      return <Calendar className="w-4 h-4 text-[#8c7335]" strokeWidth={1.5} />;
    case 'payment':
      return <CreditCard className="w-4 h-4 text-[#8c7335]" strokeWidth={1.5} />;
    case 'system':
      return <Settings className="w-4 h-4 text-gray-500" strokeWidth={1.5} />;
    default:
      return <Bell className="w-4 h-4 text-[#8c7335]" strokeWidth={1.5} />;
  }
};

const resolveImageUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  const devUrl = 'http://' + 'localhost' + ':5000';
  const backend = import.meta.env.VITE_BACKEND_URL || devUrl;
  return `${backend}${path.startsWith('/') ? path : `/${path}`}`;
};

const formatTimeAgo = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

  return date.toLocaleDateString();
};

const parseNotificationContent = (notification) => {
  let { title, message } = notification;

  // Generic ID extractor (supports RET-, EXC-, ORD-, and raw #hex Mongo IDs)
  const idMatch = message.match(/(RET|EXC|ORD)-[0-9]+/i) || message.match(/#[0-9a-fA-F]{10,24}/i);
  if (idMatch) {
    const id = idMatch[0];
    // Retroactively attach entityId (strip the # if present for the badge)
    notification.metadata = {
      ...(notification.metadata || {}),
      entityId: notification.metadata?.entityId || id.replace('#', ''),
    };
    // Remove the ID from the message cleanly
    message = message
      .replace(id, '')
      .replace(/\s+/g, ' ')
      .replace('request is', 'is')
      .replace('order is', 'is')
      .trim();
  }

  // Format snake_case statuses if present
  if (title.includes('Status Update') || title.includes('Status Updated')) {
    const statusMatch =
      message.match(/is now ([a-z_]+)/i) || message.match(/updated to:? ([a-z_]+)/i);
    if (statusMatch) {
      const rawStatus = statusMatch[1];
      const statusMap = {
        inspection_started: 'undergoing quality inspection',
        inspection_passed: 'approved after inspection',
        inspection_failed: 'rejected after inspection',
        return_received: 'received at our warehouse',
        return_picked_up: 'picked up by our courier partner',
        refund_initiated: 'processing for a refund',
        refund_completed: 'refunded successfully',
        refund_failed: 'experiencing an issue with the refund',
      };

      const readableStatus = statusMap[rawStatus] || rawStatus.replace(/_/g, ' ');
      message = message.replace(rawStatus, readableStatus);
    }
  }

  return { ...notification, parsedMessage: message };
};

export function NotificationsSection() {
  const navigate = useNavigate();
  const { setMobileShowContent, setSelectedOrderId } = useDashboard();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All');

  const tabs = ['All', 'Unread', 'Orders', 'Bookings', 'Payments'];

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const res = await notificationService.getMyNotifications({ limit: 50 });
      setNotifications((res.data || []).map(parseNotificationContent));
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
      toast.error('Could not load notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    setMobileShowContent(true);
  }, [fetchNotifications, setMobileShowContent]);

  const handleMarkAsRead = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await notificationService.markNotificationRead(id);
      setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)));
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      toast.success('All notifications marked as read');
    } catch (err) {
      toast.error('Failed to update notifications');
    }
  };

  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      handleMarkAsRead(notification._id);
    }
    if (notification.actionUrl) {
      const url = notification.actionUrl;
      if (url.startsWith('/dashboard/orders/')) {
        const orderId = url.split('/').pop();
        if (orderId) {
          setSelectedOrderId(orderId);
          navigate('/dashboard/orders');
          return;
        }
      }
      navigate(url);
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === 'All') return true;
    if (activeTab === 'Unread') return !n.read;
    if (activeTab === 'Orders') return n.type === 'order';
    if (activeTab === 'Bookings') return n.type === 'booking';
    if (activeTab === 'Payments') return n.type === 'payment';
    return true;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3 }}
      className="space-y-4 text-[11px]"
    >
      <div className="pb-4 mb-4 border-b border-outline-variant/20 flex justify-between items-end">
        <div>
          <h2 className="text-[9px] font-bold uppercase tracking-widest text-secondary flex items-center gap-1.5 mb-1.5">
            <Bell className="text-[12px]" strokeWidth={1.5} />
            Notification Center
          </h2>
          <p className="text-[11px] text-on-surface-variant/70">
            Stay updated on your orders and bookings
          </p>
        </div>
        <button
          onClick={handleMarkAllAsRead}
          className="text-[10px] font-bold uppercase tracking-widest text-[#8c7335] hover:opacity-70 transition-colors flex items-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed"
          disabled={!notifications.some((n) => !n.read)}
        >
          <Check className="w-3 h-3" strokeWidth={2} />
          Mark all read
        </button>
      </div>

      {/* Minimal Tabs */}
      <div className="flex space-x-6 min-w-max mb-6">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-2 text-[10px] font-bold uppercase tracking-[0.1em] transition-colors relative ${
              activeTab === tab
                ? 'text-[#1a1a1a]'
                : 'text-on-surface-variant/50 hover:text-[#1a1a1a]'
            }`}
          >
            {tab}
            {activeTab === tab && (
              <motion.div
                layoutId="activeNotifTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1a1a1a]"
              />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="min-h-[400px]">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="animate-pulse bg-surface-bright rounded-lg h-24 w-full border border-black/5"
              ></div>
            ))}
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="bg-surface-bright rounded-lg p-8 text-center shadow-sm flex flex-col items-center justify-center min-h-[35vh] relative overflow-hidden border border-black/5">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-[#8c7335]/5 rounded-full blur-3xl pointer-events-none" />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="w-16 h-16 rounded-full bg-[#8c7335]/5 text-[#8c7335] flex items-center justify-center mb-5 relative"
            >
              <div
                className="absolute inset-0 rounded-full border border-[#8c7335]/20 animate-ping"
                style={{ animationDuration: '3s' }}
              />
              <Bell className="text-[24px] relative z-10" strokeWidth={1.5} />
            </motion.div>

            <h3 className="font-display font-medium text-[18px] lg:text-[20px] text-black mb-2">
              No Notifications Found
            </h3>
            <p className="text-[11px] text-black/40 max-w-[280px] mb-6 leading-normal">
              You are all caught up! We'll notify you when there's an update on your orders or
              bookings.
            </p>
          </div>
        ) : (
          <AnimatePresence>
            <div className="space-y-3">
              {filteredNotifications.map((notification) => (
                <motion.div
                  key={notification._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={() => handleNotificationClick(notification)}
                  className={`relative overflow-hidden p-4 lg:p-5 rounded-lg border transition-all cursor-pointer flex gap-4 lg:gap-5 items-start group ${
                    !notification.read
                      ? 'bg-[#8c7335]/[0.02] border-[#8c7335]/20 hover:border-[#8c7335]/40'
                      : 'bg-surface-bright border-black/5 hover:border-black/10'
                  }`}
                >
                  {/* Unread Left Border Thick Line */}
                  {!notification.read && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#8c7335]" />
                  )}

                  {/* Icon or Image */}
                  {notification.metadata?.imageSrc ? (
                    <div
                      className={`w-14 h-14 lg:w-16 lg:h-16 rounded-lg shrink-0 flex items-center justify-center overflow-hidden bg-white shadow-sm border border-[#8c7335]/10`}
                    >
                      <img
                        src={resolveImageUrl(notification.metadata.imageSrc)}
                        alt="Product"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    </div>
                  ) : (
                    <div
                      className={`w-11 h-11 lg:w-12 lg:h-12 rounded-full shrink-0 flex items-center justify-center ${!notification.read ? 'bg-white shadow-sm border border-[#8c7335]/10' : 'bg-surface-container/50'}`}
                    >
                      {getIconForType(notification.type)}
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex-1 min-w-0 flex flex-col justify-center min-h-[40px]">
                    <div className="flex justify-between items-start mb-1.5 gap-3 w-full">
                      <div className="flex-1 flex items-center gap-2 min-w-0">
                        <h4
                          className={`text-[12px] lg:text-[13px] truncate shrink-0 ${!notification.read ? 'text-[#1a1a1a] font-bold' : 'text-[#1a1a1a] font-medium'}`}
                        >
                          {notification.title}
                        </h4>
                        {notification.metadata?.entityId && (
                          <span className="text-[9px] px-1.5 py-0.5 bg-black/5 rounded text-black/60 font-bold tracking-widest truncate shrink min-w-0">
                            {notification.metadata.entityId}
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] uppercase tracking-widest text-on-surface-variant/50 whitespace-nowrap flex items-center gap-1 shrink-0 font-medium pt-0.5">
                        <Clock className="w-3 h-3" strokeWidth={1.5} />
                        {formatTimeAgo(notification.createdAt)}
                      </span>
                    </div>
                    <p
                      className={`text-[11px] leading-relaxed line-clamp-2 ${!notification.read ? 'text-[#1a1a1a]/80' : 'text-[#1a1a1a]/60'}`}
                    >
                      {notification.parsedMessage}
                    </p>
                  </div>

                  {/* Action arrow */}
                  {notification.actionUrl && (
                    <div className="shrink-0 self-center opacity-30 group-hover:opacity-100 transition-all group-hover:translate-x-1 transform duration-300">
                      <ArrowRight className="w-4 h-4 text-[#8c7335]" strokeWidth={2} />
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  );
}
