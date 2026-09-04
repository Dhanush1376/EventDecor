import { m as motion, AnimatePresence } from 'framer-motion';
import { SkeletonDashboard, PageHeader, FilterBar } from '../components/AdminUIKit';
import { useState, useMemo } from 'react';
import { useAdmin } from '../context/AdminContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const fadeUp = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } };
const listContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.04 },
  },
};

const cardStyles = {
  order: {
    icon: 'shopping_bag',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    iconBg: 'bg-blue-100 text-blue-700',
    accent: 'bg-blue-500',
    actionBtn:
      'bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-600/20 border-transparent',
    ghostBtn: 'text-blue-600 hover:bg-blue-100',
    hover: 'hover:border-blue-300 hover:shadow-blue-100',
  },
  booking: {
    icon: 'event',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    iconBg: 'bg-purple-100 text-purple-700',
    accent: 'bg-purple-500',
    actionBtn:
      'bg-purple-600 text-white hover:bg-purple-700 shadow-sm shadow-purple-600/20 border-transparent',
    ghostBtn: 'text-purple-600 hover:bg-purple-100',
    hover: 'hover:border-purple-300 hover:shadow-purple-100',
  },
  custom_request: {
    icon: 'event',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    iconBg: 'bg-purple-100 text-purple-700',
    accent: 'bg-purple-500',
    actionBtn:
      'bg-purple-600 text-white hover:bg-purple-700 shadow-sm shadow-purple-600/20 border-transparent',
    ghostBtn: 'text-purple-600 hover:bg-purple-100',
    hover: 'hover:border-purple-300 hover:shadow-purple-100',
  },
  inquiry: {
    icon: 'event',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    iconBg: 'bg-purple-100 text-purple-700',
    accent: 'bg-purple-500',
    actionBtn:
      'bg-purple-600 text-white hover:bg-purple-700 shadow-sm shadow-purple-600/20 border-transparent',
    ghostBtn: 'text-purple-600 hover:bg-purple-100',
    hover: 'hover:border-purple-300 hover:shadow-purple-100',
  },
  stock: {
    icon: 'warning',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    iconBg: 'bg-rose-100 text-rose-700',
    accent: 'bg-rose-500',
    actionBtn:
      'bg-rose-600 text-white hover:bg-rose-700 shadow-sm shadow-rose-600/20 border-transparent',
    ghostBtn: 'text-rose-600 hover:bg-rose-100',
    hover: 'hover:border-rose-300 hover:shadow-rose-100',
  },
  system: {
    icon: 'report',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    iconBg: 'bg-rose-100 text-rose-700',
    accent: 'bg-rose-500',
    actionBtn:
      'bg-rose-600 text-white hover:bg-rose-700 shadow-sm shadow-rose-600/20 border-transparent',
    ghostBtn: 'text-rose-600 hover:bg-rose-100',
    hover: 'hover:border-rose-300 hover:shadow-rose-100',
  },
  review: {
    icon: 'star',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    iconBg: 'bg-amber-100 text-amber-700',
    accent: 'bg-amber-500',
    actionBtn:
      'bg-amber-600 text-white hover:bg-amber-700 shadow-sm shadow-amber-600/20 border-transparent',
    ghostBtn: 'text-amber-600 hover:bg-amber-100',
    hover: 'hover:border-amber-300 hover:shadow-amber-100',
  },
  user: {
    icon: 'star',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    iconBg: 'bg-amber-100 text-amber-700',
    accent: 'bg-amber-500',
    actionBtn:
      'bg-amber-600 text-white hover:bg-amber-700 shadow-sm shadow-amber-600/20 border-transparent',
    ghostBtn: 'text-amber-600 hover:bg-amber-100',
    hover: 'hover:border-amber-300 hover:shadow-amber-100',
  },
  payment: {
    icon: 'payments',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    iconBg: 'bg-emerald-100 text-emerald-700',
    accent: 'bg-emerald-500',
    actionBtn:
      'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm shadow-emerald-600/20 border-transparent',
    ghostBtn: 'text-emerald-600 hover:bg-emerald-100',
    hover: 'hover:border-emerald-300 hover:shadow-emerald-100',
  },
  default: {
    icon: 'notifications',
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    iconBg: 'bg-slate-100 text-slate-700',
    accent: 'bg-slate-500',
    actionBtn:
      'bg-slate-700 text-white hover:bg-slate-800 shadow-sm shadow-slate-700/20 border-transparent',
    ghostBtn: 'text-slate-600 hover:bg-slate-200',
    hover: 'hover:border-slate-300 hover:shadow-slate-100',
  },
};

export function AdminNotifications({ hideHeader }) {
  const {
    notifications,
    unreadNotifications: unreadCount,
    markNotificationRead,
    markNotificationUnread,
    deleteNotification,
    markAllNotificationsRead,
    dataLoading,
  } = useAdmin();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const handleToggleRead = (n) => {
    if (n.read) {
      markNotificationUnread(n.id);
    } else {
      markNotificationRead(n.id);
    }
  };

  const handleDelete = (id) => {
    deleteNotification(id);
  };

  const handleMarkAllRead = () => {
    markAllNotificationsRead();
  };

  const _handleClearRead = () => {
    toast.success('Read logs cleared for fresh intake sync!');
  };

  // Filter list by tab
  const filteredNotifications = useMemo(() => {
    let list = notifications;
    if (activeTab === 'unread') {
      list = list.filter((n) => !n.read);
    } else if (activeTab === 'booking') {
      list = list.filter(
        (n) => n.type === 'booking' || n.type === 'custom_request' || n.type === 'inquiry',
      );
    } else if (activeTab !== 'all') {
      list = list.filter((n) => n.type === activeTab);
    }

    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      list = list.filter(
        (n) =>
          (n.title && n.title.toLowerCase().includes(lowerQuery)) ||
          (n.message && n.message.toLowerCase().includes(lowerQuery)),
      );
    }

    return list;
  }, [notifications, activeTab, searchQuery]);

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
      className="max-w-[1440px] mx-auto space-y-6  text-[var(--admin-text-primary)]"
    >
      {/* Header Block */}
      {!hideHeader && (
        <PageHeader
          title="Notification Center"
          badge={unreadCount > 0 ? unreadCount : null}
          subtitle={
            unreadCount > 0
              ? `${unreadCount} actionable alerts needing response`
              : 'All caught up! No pending alerts'
          }
          icon="notifications"
          actionRowMobile={true}
          headerAction={
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="admin-btn h-10 sm:h-8 admin-btn-outline px-3 flex items-center gap-1.5 rounded-md border border-[var(--admin-border)] shrink-0 font-bold text-[12px]"
                >
                  <span className="material-symbols-outlined text-[16px]">done_all</span>
                  <span className="hidden sm:inline whitespace-nowrap">Mark All Read</span>
                </button>
              )}
            </div>
          }
        />
      )}

      {/* Filters & Search Bar */}
      <div className="mb-4">
        <div className="flex flex-col sm:flex-row items-stretch gap-2 w-full">
          <div className="relative flex-1 sm:w-64 shrink-0 bg-[var(--admin-surface-muted)] rounded-md border border-[var(--admin-border)] flex items-center px-3">
            <span className="material-symbols-outlined text-[18px] text-[var(--admin-text-tertiary)] shrink-0">
              search
            </span>
            <input
              type="text"
              placeholder="Search alerts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none w-full text-[13px] text-[var(--admin-text-primary)] placeholder-[var(--admin-text-tertiary)] font-medium px-2 h-10 sm:h-8"
            />
          </div>

          <div className="flex items-stretch gap-2 w-full sm:w-auto overflow-hidden">
            <FilterBar
              filters={['all', 'unread', 'order', 'booking', 'payment', 'review', 'system']}
              value={activeTab}
              onChange={setActiveTab}
              className="flex-1 min-w-0"
            />
          </div>
        </div>
      </div>

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

              const typeStyle = cardStyles[n.type] || cardStyles.default;

              return (
                <motion.div
                  layoutId={n.id}
                  key={n.id}
                  variants={fadeUp}
                  exit={{ opacity: 0, x: -50 }}
                  className={`relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-lg border transition-all ${typeStyle.hover} ${
                    !n.read
                      ? `${typeStyle.bg} ${typeStyle.border} shadow-sm pl-6`
                      : `bg-[var(--admin-bg-subtle)] border-[var(--admin-border-subtle)] opacity-75 grayscale-[0.5] hover:grayscale-0 hover:opacity-100 pl-6`
                  }`}
                >
                  {/* Unread Left Border Thick Line */}
                  {!n.read && (
                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${typeStyle.accent}`} />
                  )}

                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    {/* Circle Icon Indicator */}
                    {/* Circle Icon Indicator or Image */}
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border border-transparent transition-transform hover:scale-105 duration-300 overflow-hidden ${!n.image ? typeStyle.iconBg : 'bg-gray-100'}`}
                    >
                      {n.image ? (
                        <img src={n.image} alt={n.title} className="w-full h-full object-cover" />
                      ) : (
                        <span className="material-symbols-outlined text-[20px]">
                          {typeStyle.icon}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h4
                          className={`text-[14px] font-bold truncate ${!n.read ? 'text-[var(--admin-text-primary)]' : 'text-[var(--admin-text-secondary)]'}`}
                        >
                          {n.title}
                        </h4>
                        {!n.read && (
                          <span className="px-1.5 py-0.5 rounded border border-[var(--admin-accent)] bg-[var(--admin-accent-muted)] text-[var(--admin-accent)] text-[9px] font-black uppercase tracking-widest leading-none">
                            New
                          </span>
                        )}
                      </div>
                      <p
                        className={`text-[13px] leading-relaxed line-clamp-2 ${!n.read ? 'text-[var(--admin-text-secondary)] font-medium' : 'text-[var(--admin-text-tertiary)]'}`}
                      >
                        {n.message}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-[11px] font-bold text-[var(--admin-text-tertiary)] tracking-wider uppercase">
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[12px]">schedule</span>
                          {n.timestamp
                            ? new Date(n.timestamp).toLocaleString('en-US', {
                                day: 'numeric',
                                month: 'short',
                                hour: 'numeric',
                                minute: '2-digit',
                              })
                            : n.time || 'Just now'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Column */}
                  <div className="flex items-center gap-1 self-end sm:self-center shrink-0">
                    {n.actionLink && (
                      <button
                        onClick={() => navigate(n.actionLink)}
                        className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)] hover:bg-[var(--admin-surface-hover)] transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleToggleRead(n)}
                      className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                        !n.read
                          ? 'text-[var(--admin-text-tertiary)] hover:text-[var(--admin-success)] hover:bg-[var(--admin-success-light)]'
                          : 'text-[var(--admin-success)] hover:text-[var(--admin-text-tertiary)] hover:bg-[var(--admin-surface-hover)]'
                      }`}
                      title={!n.read ? 'Mark as Read' : 'Mark as Unread'}
                    >
                      <span className="material-symbols-outlined text-[20px]">
                        {!n.read ? 'mark_email_read' : 'mark_email_unread'}
                      </span>
                    </button>

                    <button
                      onClick={() => handleDelete(n.id)}
                      className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--admin-text-tertiary)] hover:text-[var(--admin-error)] hover:bg-[var(--admin-error-light)] transition-colors cursor-pointer"
                      title="Delete Notification"
                    >
                      <span className="material-symbols-outlined text-[20px]">delete</span>
                    </button>
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
