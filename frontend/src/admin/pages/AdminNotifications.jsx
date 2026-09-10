import { m as motion } from 'framer-motion';
import { AdminNotificationsSkeleton, PageHeader, EmptyState } from '../components/AdminUIKit';
import { useState, useMemo } from 'react';
import { useAdmin } from '../context/AdminContext';
import { useNavigate } from 'react-router-dom';

const fadeUp = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } };

const getTypeBadgeStyle = (type) => {
  switch (type) {
    case 'order':
      return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-300';
    case 'booking':
    case 'custom_request':
      return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:border-purple-800 dark:text-purple-300';
    case 'payment':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300';
    case 'review':
      return 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300';
    case 'system':
    case 'stock':
      return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300';
    default:
      return 'bg-stone-50 text-stone-700 border-stone-200 dark:bg-stone-800/50 dark:border-stone-700 dark:text-stone-300';
  }
};

const getTypeIcon = (type) => {
  switch (type) {
    case 'order':
      return 'shopping_bag';
    case 'booking':
    case 'custom_request':
      return 'event';
    case 'payment':
      return 'payments';
    case 'review':
      return 'star';
    case 'stock':
      return 'warning';
    case 'system':
      return 'report';
    default:
      return 'notifications';
  }
};

const formatTypeLabel = (type) => {
  if (!type) return 'General';
  if (type === 'custom_request') return 'Custom';
  return type.charAt(0).toUpperCase() + type.slice(1);
};

const formatNotificationTime = (timestamp, timeFallback) => {
  const dateVal = timestamp || timeFallback;
  if (!dateVal) return 'Just now';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return dateVal;
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
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

  // Filter list by tab and search
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
      const lowerQuery = searchQuery.toLowerCase().trim();
      list = list.filter(
        (n) =>
          (n.title && n.title.toLowerCase().includes(lowerQuery)) ||
          (n.message && n.message.toLowerCase().includes(lowerQuery)),
      );
    }

    return list;
  }, [notifications, activeTab, searchQuery]);

  const notifCounts = useMemo(() => {
    return {
      all: notifications.length,
      unread: unreadCount,
      order: notifications.filter((n) => n.type === 'order').length,
      booking: notifications.filter(
        (n) => n.type === 'booking' || n.type === 'custom_request' || n.type === 'inquiry',
      ).length,
      payment: notifications.filter((n) => n.type === 'payment').length,
      system: notifications.filter((n) => n.type === 'system' || n.type === 'stock').length,
    };
  }, [notifications, unreadCount]);

  if (dataLoading) {
    return <AdminNotificationsSkeleton />;
  }

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.05 } } }}
      className="space-y-6 pb-12 sm:pb-8 text-[var(--admin-text-primary)] text-left"
    >
      {/* Header Block */}
      {!hideHeader && (
        <PageHeader
          title="Notifications"
          subtitle={
            <div className="flex flex-wrap items-center gap-1.5 text-[13px]">
              <span className="font-semibold text-[var(--admin-text-primary)]">
                {notifications.length} Total Alerts
              </span>
              {unreadCount > 0 ? (
                <span className="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  {unreadCount} Unread
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  All caught up!
                </span>
              )}
            </div>
          }
        />
      )}

      {/* Sticky 42px Search & Controls Bar */}
      <div className="sticky top-[var(--admin-topbar-height,56px)] z-20 -my-2 py-2.5 bg-[var(--admin-bg)]/95 backdrop-blur-md mb-5">
        <motion.div variants={fadeUp} className="flex flex-row items-center gap-2 w-full">
          {/* Search Bar */}
          <div className="relative flex-1 min-w-0 bg-[var(--admin-surface-muted)] rounded-[4px] border border-[var(--admin-border)] flex items-center px-2.5 sm:px-3 h-[42px] min-h-[42px] max-h-[42px]">
            <span className="material-symbols-outlined text-[18px] text-[var(--admin-text-tertiary)] shrink-0">
              search
            </span>
            <input
              type="text"
              placeholder="Search alerts by title or message..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none w-full text-[13px] text-[var(--admin-text-primary)] placeholder-[var(--admin-text-tertiary)] font-medium px-2 h-full min-w-0"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)] cursor-pointer p-1 flex items-center justify-center shrink-0"
                title="Clear search"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            )}
          </div>

          {/* Controls Group */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Category Segmented Pill Switcher (Desktop & Tablet) */}
            <div className="hidden lg:flex items-center gap-1 p-1 bg-[var(--admin-surface-muted)] rounded-[4px] border border-[var(--admin-border)] h-[42px] min-h-[42px] max-h-[42px] box-border">
              {['all', 'unread', 'order', 'booking', 'payment', 'system'].map((tab) => {
                const isActive = activeTab === tab;
                const count = notifCounts[tab] || 0;
                const label = tab === 'all' ? 'All' : tab.charAt(0).toUpperCase() + tab.slice(1);

                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`h-[32px] min-h-[32px] max-h-[32px] px-2.5 sm:px-3 rounded-[3px] text-[12px] font-semibold cursor-pointer transition-all flex items-center gap-1.5 whitespace-nowrap capitalize box-border leading-none ${
                      isActive
                        ? 'bg-white dark:bg-stone-800 text-[var(--admin-accent)] shadow-xs font-bold'
                        : 'text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)]'
                    }`}
                  >
                    <span>{label}</span>
                    {count > 0 && (
                      <span
                        className={`min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold flex items-center justify-center ${
                          isActive
                            ? 'bg-[var(--admin-accent)] text-white'
                            : 'bg-[var(--admin-surface)] text-[var(--admin-text-tertiary)] border border-[var(--admin-border-subtle)]'
                        }`}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Mobile / Tablet Select Dropdown */}
            <div className="lg:hidden relative shrink-0">
              <select
                value={activeTab}
                onChange={(e) => setActiveTab(e.target.value)}
                className="h-[42px] px-2.5 bg-[var(--admin-surface-muted)] text-[var(--admin-text-primary)] border border-[var(--admin-border)] rounded-[4px] text-[12px] font-semibold outline-none cursor-pointer capitalize"
              >
                {['all', 'unread', 'order', 'booking', 'payment', 'system'].map((tab) => (
                  <option key={tab} value={tab}>
                    {tab === 'all' ? 'All' : tab.charAt(0).toUpperCase() + tab.slice(1)} (
                    {notifCounts[tab] || 0})
                  </option>
                ))}
              </select>
            </div>

            {/* Mark All Read Button */}
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="h-[42px] min-h-[42px] max-h-[42px] px-3 sm:px-3.5 bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-border-subtle)] text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] rounded-[4px] border border-[var(--admin-border)] flex items-center justify-center cursor-pointer transition-all active:scale-95 shadow-xs shrink-0 gap-1.5 font-semibold text-[13px]"
                title="Mark All As Read"
              >
                <span className="material-symbols-outlined text-[18px]">done_all</span>
                <span className="hidden sm:inline whitespace-nowrap">Mark All Read</span>
              </button>
            )}
          </div>
        </motion.div>
      </div>

      {/* Main Alerts Content: Orders-Style Table & Cards */}
      {filteredNotifications.length === 0 ? (
        <div className="admin-card py-16 text-center">
          <EmptyState
            icon="notifications_off"
            title="No Notifications Found"
            description={
              searchQuery
                ? 'No alerts match your search keywords.'
                : 'No notification alerts in this category.'
            }
            action={
              searchQuery || activeTab !== 'all' ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setActiveTab('all');
                  }}
                  className="admin-btn admin-btn-outline"
                >
                  Clear Filters
                </button>
              ) : null
            }
          />
        </div>
      ) : (
        <>
          {/* Desktop Table View (Orders Style) */}
          <div className="hidden md:block admin-card p-0 overflow-hidden border border-[var(--admin-border)] shadow-xs rounded-[4px]">
            <table className="admin-table admin-table-compact w-full text-left">
              <thead>
                <tr className="border-b border-[var(--admin-border-subtle)] bg-[var(--admin-surface-muted)] text-[11px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider">
                  <th className="py-3 px-4 w-[46px] text-center"></th>
                  <th className="py-3 px-4 w-[120px]">Type</th>
                  <th className="py-3 px-4">Notification Details</th>
                  <th className="py-3 px-4 w-[160px]">Received</th>
                  <th className="py-3 px-4 w-[130px] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--admin-border-subtle)]">
                {filteredNotifications.map((n) => {
                  return (
                    <tr
                      key={n.id}
                      onClick={() => {
                        if (n.actionLink) {
                          markNotificationRead(n.id);
                          navigate(n.actionLink);
                        } else {
                          handleToggleRead(n);
                        }
                      }}
                      className={`group transition-colors cursor-pointer ${
                        !n.read
                          ? 'bg-[var(--admin-surface)] hover:bg-[var(--admin-surface-muted)]'
                          : 'bg-[var(--admin-surface-muted)]/30 hover:bg-[var(--admin-surface-muted)]'
                      }`}
                    >
                      {/* Unread indicator / Icon */}
                      <td className="py-3.5 px-4 text-center align-middle">
                        {!n.read ? (
                          <span
                            className="w-2.5 h-2.5 rounded-full bg-[var(--admin-accent)] block mx-auto animate-pulse"
                            title="Unread"
                          />
                        ) : (
                          <span
                            className="w-1.5 h-1.5 rounded-full bg-stone-300 dark:bg-stone-600 block mx-auto"
                            title="Read"
                          />
                        )}
                      </td>

                      {/* Type Badge */}
                      <td className="py-3.5 px-4 align-middle whitespace-nowrap">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-[3px] border inline-flex items-center gap-1 ${getTypeBadgeStyle(n.type)}`}
                        >
                          <span className="material-symbols-outlined text-[13px] leading-none">
                            {getTypeIcon(n.type)}
                          </span>
                          <span>{formatTypeLabel(n.type)}</span>
                        </span>
                      </td>

                      {/* Title and Message */}
                      <td className="py-3.5 px-4 align-middle min-w-0 pr-4">
                        <div className="flex flex-col gap-0.5 max-w-2xl">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`text-[13px] font-bold truncate ${
                                !n.read
                                  ? 'text-[var(--admin-text-primary)]'
                                  : 'text-[var(--admin-text-secondary)] font-medium'
                              }`}
                            >
                              {n.title}
                            </span>
                            {!n.read && (
                              <span className="px-1.5 py-0.2 rounded bg-[var(--admin-accent)] text-white text-[9px] font-black uppercase tracking-wider">
                                New
                              </span>
                            )}
                          </div>
                          <p
                            className={`text-[12px] leading-relaxed truncate ${
                              !n.read
                                ? 'text-[var(--admin-text-secondary)] font-medium'
                                : 'text-[var(--admin-text-tertiary)]'
                            }`}
                          >
                            {n.message}
                          </p>
                        </div>
                      </td>

                      {/* Timestamp */}
                      <td className="py-3.5 px-4 align-middle whitespace-nowrap">
                        <span className="text-[12px] font-medium text-[var(--admin-text-tertiary)] flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">schedule</span>
                          {formatNotificationTime(n.timestamp, n.time)}
                        </span>
                      </td>

                      {/* Action buttons */}
                      <td className="py-3.5 px-4 align-middle text-right whitespace-nowrap">
                        <div
                          className="flex items-center justify-end gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {n.actionLink && (
                            <button
                              type="button"
                              onClick={() => {
                                markNotificationRead(n.id);
                                navigate(n.actionLink);
                              }}
                              className="w-8 h-8 rounded-[4px] text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)] hover:bg-[var(--admin-surface-hover)] flex items-center justify-center transition-colors cursor-pointer"
                              title="Open details"
                            >
                              <span className="material-symbols-outlined text-[18px]">
                                arrow_forward
                              </span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleToggleRead(n)}
                            className="w-8 h-8 rounded-[4px] text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)] hover:bg-[var(--admin-surface-hover)] flex items-center justify-center transition-colors cursor-pointer"
                            title={!n.read ? 'Mark as Read' : 'Mark as Unread'}
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              {!n.read ? 'mark_email_read' : 'mark_email_unread'}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(n.id)}
                            className="w-8 h-8 rounded-[4px] text-[var(--admin-text-tertiary)] hover:text-[var(--admin-error)] hover:bg-[var(--admin-error-light)] flex items-center justify-center transition-colors cursor-pointer"
                            title="Delete Notification"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View (Orders Mobile Card Style) */}
          <div className="md:hidden space-y-2.5">
            {filteredNotifications.map((n) => {
              return (
                <div
                  key={n.id}
                  onClick={() => {
                    if (n.actionLink) {
                      markNotificationRead(n.id);
                      navigate(n.actionLink);
                    } else {
                      handleToggleRead(n);
                    }
                  }}
                  className={`rounded-[4px] p-3.5 shadow-xs border transition-all cursor-pointer ${
                    !n.read
                      ? 'border-[var(--admin-border-strong)] bg-[var(--admin-surface)]'
                      : 'border-[var(--admin-border)] bg-[var(--admin-surface-muted)]/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {!n.read && (
                        <span className="w-2 h-2 rounded-full bg-[var(--admin-accent)] shrink-0" />
                      )}
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-[3px] border inline-flex items-center gap-1 ${getTypeBadgeStyle(n.type)}`}
                      >
                        <span className="material-symbols-outlined text-[12px] leading-none">
                          {getTypeIcon(n.type)}
                        </span>
                        <span>{formatTypeLabel(n.type)}</span>
                      </span>
                      {!n.read && (
                        <span className="px-1 rounded bg-[var(--admin-accent)] text-white text-[9px] font-extrabold uppercase">
                          New
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] font-medium text-[var(--admin-text-tertiary)] shrink-0">
                      {formatNotificationTime(n.timestamp, n.time)}
                    </span>
                  </div>

                  <div>
                    <h4
                      className={`text-[13px] font-bold ${
                        !n.read
                          ? 'text-[var(--admin-text-primary)]'
                          : 'text-[var(--admin-text-secondary)]'
                      }`}
                    >
                      {n.title}
                    </h4>
                    <p className="text-[12px] text-[var(--admin-text-secondary)] leading-relaxed mt-0.5">
                      {n.message}
                    </p>
                  </div>

                  <div
                    className="mt-3 pt-2.5 border-t border-[var(--admin-border-subtle)] flex items-center justify-end gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {n.actionLink && (
                      <button
                        type="button"
                        onClick={() => {
                          markNotificationRead(n.id);
                          navigate(n.actionLink);
                        }}
                        className="h-7 px-2 rounded-[3px] bg-[var(--admin-accent)] text-white text-[11px] font-bold inline-flex items-center gap-1 hover:opacity-90 transition-opacity cursor-pointer mr-auto"
                      >
                        <span>View</span>
                        <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleToggleRead(n)}
                      className="w-7 h-7 rounded-[3px] text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)] hover:bg-[var(--admin-surface-hover)] flex items-center justify-center transition-colors cursor-pointer"
                      title={!n.read ? 'Mark as Read' : 'Mark as Unread'}
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        {!n.read ? 'mark_email_read' : 'mark_email_unread'}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(n.id)}
                      className="w-7 h-7 rounded-[3px] text-[var(--admin-text-tertiary)] hover:text-[var(--admin-error)] hover:bg-[var(--admin-error-light)] flex items-center justify-center transition-colors cursor-pointer"
                      title="Delete Notification"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </motion.div>
  );
}
