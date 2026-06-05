import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAdmin } from '../context/AdminContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { SkeletonDashboard } from '../components/AdminUIKit';

const fadeUp = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } };
const listContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.04 },
  },
};

const typeIcons = {
  order: 'shopping_bag',
  booking: 'event',
  stock: 'warning',
  review: 'star',
  payment: 'payments',
};

const typeColors = {
  order:
    'bg-[var(--admin-surface-muted)] text-[var(--admin-text-primary)] border-[var(--admin-border-subtle)] hover:bg-[var(--admin-surface-hover)]',
  booking:
    'bg-[var(--admin-surface-muted)] text-[var(--admin-accent)] border-[var(--admin-border-subtle)] hover:bg-[var(--admin-surface-hover)]',
  stock: 'bg-[var(--admin-error-light)] text-[var(--admin-error)] border-none hover:opacity-90',
  review:
    'bg-[var(--admin-warning-light)] text-[var(--admin-warning)] border-none hover:opacity-90',
  payment:
    'bg-[var(--admin-success-light)] text-[var(--admin-success)] border-none hover:opacity-90',
  custom_request:
    'bg-[var(--admin-surface-muted)] text-[var(--admin-accent)] border-[var(--admin-border-subtle)] hover:bg-[var(--admin-surface-hover)]',
  inquiry:
    'bg-[var(--admin-surface-muted)] text-[var(--admin-accent)] border-[var(--admin-border-subtle)] hover:bg-[var(--admin-surface-hover)]',
};

export function AdminNotifications() {
  const {
    notifications,
    unreadNotifications: unreadCount,
    markNotificationRead,
    markAllNotificationsRead,
    dataLoading,
  } = useAdmin();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all');

  const handleMarkRead = (id) => {
    markNotificationRead(id);
  };

  const handleMarkAllRead = () => {
    markAllNotificationsRead();
  };

  const handleClearRead = () => {
    toast.success('Read logs cleared for fresh intake sync!');
  };

  // Filter list by tab
  const filteredNotifications = useMemo(() => {
    let list = notifications;
    if (activeTab === 'unread') {
      return list.filter((n) => !n.read);
    }
    if (activeTab === 'all') {
      return list;
    }
    // Map booking tab to include custom requests and inquiries
    if (activeTab === 'booking') {
      return list.filter(
        (n) => n.type === 'booking' || n.type === 'custom_request' || n.type === 'inquiry',
      );
    }
    return list.filter((n) => n.type === activeTab);
  }, [notifications, activeTab]);

  if (dataLoading) {
    return (
      <div className="max-w-[1000px] mx-auto">
        <SkeletonDashboard />
      </div>
    );
  }

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.05 } } }}
      className="max-w-[1000px] mx-auto space-y-6  text-[var(--admin-text-primary)]"
    >
      {/* Header Block */}
      <motion.div
        variants={fadeUp}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h2 className="text-[26px] font-bold  text-[var(--admin-text-primary)]">
            Notification Center
          </h2>
          <p className="text-[13px] text-[var(--admin-text-tertiary)] mt-0.5">
            {unreadCount > 0 ? (
              <span className="text-[var(--admin-text-primary)] font-bold">
                {unreadCount} actionable alerts needing response
              </span>
            ) : (
              <span className="text-[var(--admin-success)] font-bold">
                All caught up! No pending alerts
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="admin-btn admin-btn-outline h-9 px-4 text-[12px] font-bold uppercase tracking-wider flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">done_all</span>
              Mark All Read
            </button>
          )}
        </div>
      </motion.div>

      {/* Tabs Filter Bar */}
      <motion.div
        variants={fadeUp}
        className="flex border-b border-[var(--admin-border)] overflow-x-auto gap-4 scrollbar-none"
      >
        {[
          { id: 'all', label: 'All Alerts', count: notifications.length },
          { id: 'unread', label: 'Unread', count: unreadCount },
          {
            id: 'order',
            label: 'Orders',
            count: notifications.filter((n) => n.type === 'order').length,
          },
          {
            id: 'booking',
            label: 'Consults',
            count: notifications.filter(
              (n) => n.type === 'booking' || n.type === 'custom_request' || n.type === 'inquiry',
            ).length,
          },
          {
            id: 'payment',
            label: 'Payments',
            count: notifications.filter((n) => n.type === 'payment').length,
          },
          {
            id: 'review',
            label: 'Reviews',
            count: notifications.filter((n) => n.type === 'review' || n.type === 'user').length,
          },
          {
            id: 'system',
            label: 'System',
            count: notifications.filter((n) => n.type === 'system').length,
          },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-3 text-[13px] font-bold uppercase tracking-wider cursor-pointer border-b-2 transition-all shrink-0 relative ${
              activeTab === tab.id
                ? 'border-[var(--admin-accent)] text-[var(--admin-text-primary)]'
                : 'border-transparent text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)]'
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span
                className={`ml-1.5 px-2 py-0.5 rounded-full text-[11px] sm:text-[11px] font-bold ${
                  activeTab === tab.id
                    ? 'bg-[var(--admin-accent)] text-white'
                    : 'bg-[var(--admin-surface-muted)] text-[var(--admin-text-tertiary)]'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </motion.div>

      {/* Alerts Grid List */}
      <motion.div variants={listContainer} className="space-y-3">
        <AnimatePresence mode="popLayout">
          {filteredNotifications.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="py-16 text-center bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-3xl p-6 shadow-sm flex flex-col items-center justify-center"
            >
              <span className="material-symbols-outlined text-[48px] text-[var(--admin-text-secondary)]/40 mb-2 block">
                search_off
              </span>
              <h3 className="text-[14px] font-bold text-[var(--admin-text-primary)] mb-0.5">
                Data Not Found
              </h3>
              <p className="text-[12px] text-[var(--admin-text-secondary)] max-w-[280px]">
                No notification alerts available in this category.
              </p>
            </motion.div>
          ) : (
            filteredNotifications.map((n) => {
              const formattedDate = n.rawNotification?.createdAt
                ? new Date(n.rawNotification.createdAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    hour: 'numeric',
                    minute: '2-digit',
                  })
                : 'Just now';

              const actionLabel =
                n.type === 'order'
                  ? 'Process Order'
                  : n.type === 'payment'
                    ? 'Review Payment'
                    : n.type === 'booking' || n.type === 'custom_request'
                      ? 'Confirm Request'
                      : n.type === 'inquiry'
                        ? 'View Inquiry'
                        : n.type === 'user'
                          ? 'View Users'
                          : 'Open Details';

              // Map backend type cleanly to available icons
              const uiType =
                n.type === 'custom_request'
                  ? 'booking'
                  : n.type === 'inquiry'
                    ? 'booking'
                    : n.type === 'user'
                      ? 'review'
                      : n.type;

              return (
                <motion.div
                  layoutId={n.id}
                  key={n.id}
                  variants={fadeUp}
                  exit={{ opacity: 0, x: -50 }}
                  className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl border transition-all ${
                    !n.read
                      ? 'bg-[var(--admin-surface)] border-[var(--admin-border)] shadow-md shadow-primary/2'
                      : 'bg-[var(--admin-bg-subtle)] border-[var(--admin-border-subtle)] opacity-75 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    {/* Circle Icon Indicator */}
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border transition-transform hover:scale-105 duration-300 ${typeColors[uiType] || typeColors.order}`}
                    >
                      <span className="material-symbols-outlined text-[20px]">
                        {typeIcons[uiType] || typeIcons.order}
                      </span>
                    </div>

                    {/* Details Column */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[13px] font-bold ${!n.read ? 'text-[var(--admin-text-primary)]' : 'text-[var(--admin-text-tertiary)]'}`}
                        >
                          {n.title}
                        </span>
                        {!n.read && (
                          <span className="flex h-2 w-2 relative shrink-0">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--admin-accent)] opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--admin-accent)]"></span>
                          </span>
                        )}
                      </div>
                      <p className="text-[12px] text-[var(--admin-text-secondary)] leading-relaxed font-medium">
                        {n.message}
                      </p>
                      <p className="text-[11px] text-[var(--admin-text-tertiary)] font-mono">
                        {formattedDate} • {n.time}
                      </p>
                    </div>
                  </div>

                  {/* Actions Column */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    {n.actionLink && (
                      <button
                        onClick={() => navigate(n.actionLink)}
                        className="admin-btn admin-btn-outline admin-btn-sm h-8 px-3 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider border-[var(--admin-border)] text-[var(--admin-text-primary)] hover:bg-[var(--admin-surface-muted)]"
                      >
                        {actionLabel}
                        <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
                      </button>
                    )}

                    {!n.read && (
                      <button
                        onClick={() => handleMarkRead(n.id)}
                        className="p-2.5 bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface-hover)] text-[var(--admin-text-primary)] rounded-xl cursor-pointer transition-all flex items-center justify-center"
                        title="Mark as Read"
                      >
                        <span className="material-symbols-outlined text-[16px]">done</span>
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
