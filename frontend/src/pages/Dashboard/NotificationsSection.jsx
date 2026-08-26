import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  Check,
  Box,
  Calendar,
  CreditCard,
  Settings,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { notificationService } from '../../services/domainServices';
import { useDashboard } from '../../context/DashboardContext';
import { toast } from 'react-hot-toast';

const getIconForType = (type) => {
  switch (type) {
    case 'order':
      return <Box className="w-5 h-5 text-blue-500" />;
    case 'booking':
      return <Calendar className="w-5 h-5 text-purple-500" />;
    case 'payment':
      return <CreditCard className="w-5 h-5 text-green-500" />;
    case 'system':
      return <Settings className="w-5 h-5 text-gray-500" />;
    default:
      return <Bell className="w-5 h-5 text-primary" />;
  }
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

export function NotificationsSection() {
  const navigate = useNavigate();
  const { setMobileShowContent } = useDashboard();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All');

  const tabs = ['All', 'Unread', 'Orders', 'Bookings', 'Payments'];

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const res = await notificationService.getMyNotifications({ limit: 50 });
      setNotifications(res.data || []);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
      toast.error('Could not load notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    // Ensure mobile view shows content correctly
    setMobileShowContent(true);
  }, [fetchNotifications, setMobileShowContent]);

  const handleMarkAsRead = async (id) => {
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
      navigate(notification.actionUrl);
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
    <div className="bg-surface-bright rounded-2xl shadow-sm border border-outline-variant/30 overflow-hidden flex flex-col h-[calc(100vh-140px)] lg:h-auto min-h-[600px]">
      {/* Header */}
      <div className="p-6 border-b border-outline-variant/30 bg-surface flex justify-between items-center sticky top-0 z-10">
        <div>
          <h2 className="text-2xl font-display font-medium text-on-surface">Notification Center</h2>
          <p className="text-sm text-on-surface-variant mt-1">
            Stay updated on your orders and bookings
          </p>
        </div>
        <button
          onClick={handleMarkAllAsRead}
          className="text-sm font-medium text-primary hover:text-primary-dark transition-colors flex items-center gap-2"
          disabled={!notifications.some((n) => !n.read)}
        >
          <Check className="w-4 h-4" />
          Mark all read
        </button>
      </div>

      {/* Tabs */}
      <div className="px-6 border-b border-outline-variant/30 bg-surface/50 backdrop-blur-sm sticky top-[88px] z-10 overflow-x-auto no-scrollbar">
        <div className="flex space-x-6 min-w-max">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-4 pt-4 text-sm font-medium transition-colors relative ${
                activeTab === tab ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {tab}
              {activeTab === tab && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full"
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-2 sm:p-6 bg-surface-container-lowest">
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="w-16 h-16 bg-surface-container rounded-full flex items-center justify-center mb-4">
              <Bell className="w-8 h-8 text-on-surface-variant/50" />
            </div>
            <h3 className="text-lg font-medium text-on-surface mb-1">No notifications yet</h3>
            <p className="text-on-surface-variant max-w-sm">
              We'll notify you when there's an update on your orders or bookings.
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
                  className={`relative overflow-hidden p-4 rounded-xl border transition-all cursor-pointer flex gap-4 items-start ${
                    !notification.read
                      ? 'bg-primary/5 border-primary/20 shadow-sm pl-5'
                      : 'bg-surface border-outline-variant/30 hover:border-outline hover:shadow-xs pl-5'
                  }`}
                >
                  {/* Unread Left Border Thick Line */}
                  {!notification.read && (
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary" />
                  )}

                  {/* Icon */}
                  <div
                    className={`p-2 rounded-full shrink-0 ${!notification.read ? 'bg-white shadow-sm' : 'bg-surface-container'}`}
                  >
                    {getIconForType(notification.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <h4
                        className={`text-sm font-medium truncate pr-4 ${!notification.read ? 'text-on-surface font-semibold' : 'text-on-surface-variant'}`}
                      >
                        {notification.title}
                      </h4>
                      <span className="text-xs text-on-surface-variant whitespace-nowrap flex items-center gap-1 shrink-0">
                        <Clock className="w-3 h-3" />
                        {formatTimeAgo(notification.createdAt)}
                      </span>
                    </div>
                    <p
                      className={`text-sm line-clamp-2 ${!notification.read ? 'text-on-surface-variant' : 'text-on-surface-variant/70'}`}
                    >
                      {notification.message}
                    </p>
                  </div>

                  {/* Unread Indicator & Arrow */}
                  <div className="flex flex-col items-end gap-2 shrink-0 self-center">
                    {!notification.read && <div className="w-2 h-2 rounded-full bg-primary" />}
                    {notification.actionUrl && (
                      <ChevronRight
                        className={`w-4 h-4 ${!notification.read ? 'text-primary' : 'text-on-surface-variant/50'}`}
                      />
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
