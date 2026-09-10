import React, { useState, useRef, useEffect } from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';
import { AdminToggle } from './AdminUIKit';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAdmin } from '../context/AdminContext';
import { useAuth } from '../../context/AuthContext';

const ROUTE_LABELS = {
  exchanges: 'Exchanges',
  returns: 'Returns & Exchanges',
  orders: 'All Orders',
  rentals: 'Rentals',
  'custom-orders': 'Custom Orders',
  homepage: 'Edit Website',
  policies: 'Policies',
  gallery: 'Photo Gallery',
  payments: 'Payments',
  products: 'Products',
  categories: 'Categories',
  inventory: 'Inventory',
  customers: 'Customers',
  analytics: 'Analytics',
  operations: 'Live Customer Activity',
  drafts: 'Drafts',
  users: 'Active Admins',
  notifications: 'Notifications',
  settings: 'Settings',
  audit: 'Audit History',
  'recycle-bin': 'Recycle Bin',
  coupons: 'Discount Coupons',
  reviews: 'Reviews',
  events: 'Events & Bookings',
  add: 'Add New',
  edit: 'Edit',
  new: 'Create',
};

const getBreadcrumbLabel = (segment, index, arr) => {
  if (ROUTE_LABELS[segment]) {
    return ROUTE_LABELS[segment];
  }

  // Check if segment is genuinely an ID (MongoDB ObjectId, order code, or numeric ID)
  const isHexId = /^[0-9a-fA-F]{24}$/.test(segment);
  const isNumericId = /^[0-9]+$/.test(segment);
  const isPrefixCode = /^(ORD|RET|EXC|BKG|CUST|RENT)-/i.test(segment);
  const isLikelyId = isHexId || isNumericId || isPrefixCode;

  if (isLikelyId) {
    const parent = arr[index - 1] || arr[0];
    if (parent === 'exchanges') return 'Exchange Details';
    if (parent === 'returns') return 'Return Details';
    if (parent === 'orders') return 'Order Details';
    if (parent === 'rentals') return 'Rental Details';
    return `#${segment.slice(-6).toUpperCase()}`;
  }

  // Human-readable capitalized label for non-ID route segments
  return segment
    .replace(/[-_]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
};

export function AdminTopBar() {
  const {
    sidebarOpen,
    toggleSidebar,
    toggleMobileSidebar,
    notifications,
    unreadNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    setSearchPaletteOpen,
    activeRole,
    changeActiveRole,
    autoPublish,
    toggleAutoPublish,
  } = useAdmin();
  const [showNotifs, setShowNotifs] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const notifRef = useRef(null);
  const profileRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const { user, logout } = useAuth();

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .substring(0, 2)
    : 'AD';

  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifs(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfile(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const notifIcon = {
    order: 'shopping_bag',
    booking: 'event',
    stock: 'warning',
    review: 'star',
    payment: 'payments',
  };

  return (
    <>
      <header
        className={`fixed top-0 right-0 z-30 transition-all duration-300 ease-[var(--admin-ease)] ${
          sidebarOpen ? 'lg:left-[260px]' : 'lg:left-[72px]'
        } left-0 bg-[var(--admin-surface)]/90 dark:bg-stone-900/90 backdrop-blur-xl border-b border-[var(--admin-border-subtle)] shadow-[0_1px_3px_rgba(0,0,0,0.03)] dark:shadow-none`}
        style={{
          height: 'var(--admin-topbar-height, 56px)',
        }}
      >
        <div className="flex items-center justify-between h-full px-3 sm:px-4 lg:px-6 gap-2.5 min-w-0">
          {/* Left: Sidebar Toggle + Breadcrumbs + Search */}
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
            {/* Mobile Hamburger Toggle */}
            <button
              type="button"
              aria-label="Open menu"
              onClick={toggleMobileSidebar}
              className="lg:hidden w-[36px] h-[36px] min-h-0 min-w-0 rounded-[8px] flex items-center justify-center text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] hover:bg-[var(--admin-surface-hover)] border border-[var(--admin-border-subtle)] cursor-pointer transition-all active:scale-95 shrink-0"
            >
              <span className="material-symbols-outlined text-[20px]">menu</span>
            </button>

            {/* Desktop Sidebar Collapse/Expand Toggle */}
            <button
              type="button"
              onClick={toggleSidebar}
              className="hidden lg:flex w-[36px] h-[36px] min-h-0 min-w-0 rounded-[8px] items-center justify-center text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] hover:bg-[var(--admin-surface-hover)] border border-[var(--admin-border-subtle)] cursor-pointer transition-all active:scale-95 shrink-0"
              title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            >
              <span className="material-symbols-outlined text-[19px]">
                {sidebarOpen ? 'menu_open' : 'menu'}
              </span>
            </button>

            {/* Interactive Breadcrumbs (Desktop XL and up) */}
            <div className="hidden xl:flex items-center gap-1.5 ml-1 mr-1.5 select-none min-w-0">
              <button
                type="button"
                onClick={() => navigate('/admin')}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded-[5px] text-[12px] font-medium text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] hover:bg-[var(--admin-surface-muted)] cursor-pointer transition-all shrink-0 bg-transparent border-none outline-none shadow-none"
              >
                <span className="material-symbols-outlined text-[15px] leading-none text-[var(--admin-accent)]">
                  storefront
                </span>
                <span>Admin</span>
              </button>
              {location.pathname !== '/admin' &&
                location.pathname
                  .split('/')
                  .filter(Boolean)
                  .slice(1)
                  .filter(
                    (segment) =>
                      segment !== 'requests' && segment !== 'detail' && segment !== 'details',
                  )
                  .map((segment, index, arr) => {
                    const label = getBreadcrumbLabel(segment, index, arr);
                    const isLast = index === arr.length - 1;
                    return (
                      <React.Fragment key={index}>
                        <span className="material-symbols-outlined text-[13px] text-[var(--admin-text-tertiary)]/50 shrink-0">
                          chevron_right
                        </span>
                        {isLast ? (
                          <span
                            className="px-1.5 py-0.5 text-[12px] font-bold text-[var(--admin-text-primary)] truncate max-w-[170px] bg-transparent"
                            title={label}
                          >
                            {label}
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => navigate('/admin/' + arr.slice(0, index + 1).join('/'))}
                            className="px-1.5 py-0.5 rounded-[5px] text-[12px] font-medium text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] hover:bg-[var(--admin-surface-muted)] cursor-pointer transition-all truncate max-w-[150px] bg-transparent border-none outline-none shadow-none"
                            title={label}
                          >
                            {label}
                          </button>
                        )}
                      </React.Fragment>
                    );
                  })}
            </div>

            {/* Command Palette Search Trigger */}
            <div
              onClick={() => setSearchPaletteOpen(true)}
              className="flex items-center gap-2 sm:gap-2.5 h-[36px] min-h-0 px-3 rounded-[8px] bg-[var(--admin-surface-muted)] dark:bg-stone-800/70 hover:bg-[var(--admin-surface-hover)] border border-[var(--admin-border-subtle)] hover:border-[var(--admin-border)] cursor-pointer transition-all select-none ml-1 flex-1 w-full max-w-[200px] sm:max-w-[300px] lg:max-w-[420px] group shadow-2xs"
            >
              <span className="material-symbols-outlined text-[17px] text-[var(--admin-text-tertiary)] group-hover:text-[var(--admin-accent)] transition-colors shrink-0">
                search
              </span>
              <span className="text-[12px] text-[var(--admin-text-secondary)] group-hover:text-[var(--admin-text-primary)] flex-1 truncate font-medium">
                <span className="hidden sm:inline">Search products, orders, customers...</span>
                <span className="sm:hidden">Search...</span>
              </span>
              <div className="hidden sm:flex items-center gap-1 shrink-0">
                <kbd className="h-[20px] px-1.5 flex items-center justify-center bg-white dark:bg-stone-800 rounded-[4px] shadow-2xs text-[10.5px] font-mono font-bold text-[var(--admin-text-tertiary)] border border-stone-200/90 dark:border-stone-700">
                  ⌘
                </kbd>
                <kbd className="h-[20px] px-1.5 flex items-center justify-center bg-white dark:bg-stone-800 rounded-[4px] shadow-2xs text-[10px] font-mono font-bold text-[var(--admin-text-tertiary)] border border-stone-200/90 dark:border-stone-700">
                  K
                </kbd>
              </div>
            </div>
          </div>

          {/* Right: Actions & Utilities */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Auto-Publish Toggle — Large screens */}
            <div className="hidden 2xl:flex items-center gap-2.5 h-[36px] min-h-0 px-3 rounded-[8px] bg-[var(--admin-surface-muted)]/80 border border-[var(--admin-border-subtle)] select-none">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--admin-text-primary)] leading-none">
                Auto-Publish
              </span>
              <AdminToggle
                checked={autoPublish}
                onChange={toggleAutoPublish}
                size="sm"
                className="!h-auto !w-auto min-h-0 min-w-0 p-0"
                aria-label="Toggle Auto-Publish"
              />
            </div>

            {/* Notifications Dropdown */}
            <div ref={notifRef} className="relative">
              <button
                type="button"
                onClick={() => setShowNotifs(!showNotifs)}
                className={`w-[36px] h-[36px] min-h-0 min-w-0 rounded-[8px] relative flex items-center justify-center border transition-all cursor-pointer bg-[var(--admin-surface)] ${
                  showNotifs
                    ? 'bg-[var(--admin-surface-hover)] text-[var(--admin-text-primary)] border-[var(--admin-border)]'
                    : 'text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] hover:bg-[var(--admin-surface-hover)] border-[var(--admin-border-subtle)]'
                }`}
                title="Notifications"
              >
                <span className="material-symbols-outlined text-[19px]">notifications</span>
                {unreadNotifications > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 text-[9.5px] font-extrabold rounded-full flex items-center justify-center bg-rose-500 text-white shadow-xs ring-2 ring-white dark:ring-stone-900 animate-pulse">
                    {unreadNotifications > 99 ? '99+' : unreadNotifications}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {showNotifs && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    className="admin-dropdown fixed left-3 right-3 top-[calc(var(--admin-topbar-height)+8px)] sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[380px] max-w-[380px] z-[300] bg-[var(--admin-surface)] rounded-[12px] border border-[var(--admin-border-strong)] shadow-2xl overflow-hidden flex flex-col"
                  >
                    <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--admin-border-subtle)] bg-[var(--admin-surface-muted)]/80">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-bold text-[var(--admin-text-primary)]">
                          Notifications
                        </span>
                        {unreadNotifications > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 text-[10px] font-extrabold">
                            {unreadNotifications} new
                          </span>
                        )}
                      </div>
                      {unreadNotifications > 0 && (
                        <button
                          type="button"
                          onClick={markAllNotificationsRead}
                          className="text-[11px] text-[var(--admin-accent)] font-semibold hover:underline cursor-pointer"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div className="max-h-[340px] overflow-y-auto custom-scrollbar divide-y divide-[var(--admin-border-subtle)]">
                      {notifications.length === 0 ? (
                        <div className="py-10 text-center text-[var(--admin-text-tertiary)] flex flex-col items-center">
                          <div className="w-10 h-10 rounded-full bg-[var(--admin-surface-muted)] flex items-center justify-center mb-2">
                            <span className="material-symbols-outlined text-[20px] text-stone-400">
                              notifications_none
                            </span>
                          </div>
                          <p className="text-[12px] font-semibold text-[var(--admin-text-secondary)]">
                            No new notifications
                          </p>
                          <p className="text-[10.5px] text-[var(--admin-text-tertiary)] mt-0.5">
                            You're all caught up!
                          </p>
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <button
                            key={n.id}
                            type="button"
                            onClick={() => {
                              markNotificationRead(n.id);
                              setShowNotifs(false);
                              if (n.actionLink) navigate(n.actionLink);
                            }}
                            className={`w-full flex items-start gap-3 px-4 py-3 transition-colors cursor-pointer text-left ${
                              !n.read
                                ? 'bg-[var(--admin-accent)]/5 hover:bg-[var(--admin-accent)]/10'
                                : 'hover:bg-[var(--admin-surface-hover)]'
                            }`}
                          >
                            <div
                              className={`w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0 mt-0.5 overflow-hidden ${
                                !n.image
                                  ? 'bg-[var(--admin-surface-muted)] border border-[var(--admin-border)]'
                                  : 'bg-stone-100'
                              }`}
                            >
                              {n.image ? (
                                <img
                                  src={n.image}
                                  alt={n.title}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="material-symbols-outlined text-[16px] text-[var(--admin-accent)]">
                                  {notifIcon[n.type] || 'info'}
                                </span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p
                                className={`text-[12px] leading-snug ${
                                  !n.read
                                    ? 'font-bold text-[var(--admin-text-primary)]'
                                    : 'font-medium text-[var(--admin-text-secondary)]'
                                }`}
                              >
                                {n.title}
                              </p>
                              <p className="text-[11px] text-[var(--admin-text-tertiary)] mt-0.5 truncate">
                                {n.message}
                              </p>
                              <p className="text-[10px] text-[var(--admin-text-tertiary)] mt-1 font-mono">
                                {n.time}
                              </p>
                            </div>
                            {!n.read && (
                              <span className="w-2 h-2 rounded-full mt-2 shrink-0 bg-[var(--admin-accent)]" />
                            )}
                          </button>
                        ))
                      )}
                    </div>
                    <div className="p-2 border-t border-[var(--admin-border-subtle)] bg-[var(--admin-surface-muted)]/50">
                      <button
                        type="button"
                        onClick={() => {
                          navigate('/admin/notifications');
                          setShowNotifs(false);
                        }}
                        className="w-full text-center text-[11.5px] font-bold text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] py-1.5 rounded-[6px] hover:bg-[var(--admin-surface-hover)] cursor-pointer transition-all"
                      >
                        View All Notifications
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Profile Dropdown */}
            <div ref={profileRef} className="relative">
              <button
                type="button"
                onClick={() => setShowProfile(!showProfile)}
                className={`flex items-center gap-2 h-[36px] min-h-0 px-2 rounded-[8px] border transition-all cursor-pointer bg-[var(--admin-surface)] ${
                  showProfile
                    ? 'bg-[var(--admin-surface-hover)] border-[var(--admin-border)]'
                    : 'hover:bg-[var(--admin-surface-hover)] border-[var(--admin-border-subtle)]'
                }`}
              >
                <div className="w-[26px] h-[26px] rounded-[6px] flex items-center justify-center bg-[var(--admin-accent)] text-white shadow-2xs font-bold text-[10.5px] shrink-0">
                  {initials}
                </div>
                <div className="hidden xl:flex flex-col text-left pr-0.5">
                  <span className="text-[12px] font-bold text-[var(--admin-text-primary)] leading-tight truncate max-w-[110px]">
                    {user?.name || 'Administrator'}
                  </span>
                  <span className="text-[10px] font-semibold text-[var(--admin-text-tertiary)] capitalize leading-none">
                    {user?.role || 'Staff'}
                  </span>
                </div>
                <span className="material-symbols-outlined text-[15px] text-[var(--admin-text-tertiary)] hidden xl:block">
                  expand_more
                </span>
              </button>

              <AnimatePresence>
                {showProfile && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    className="admin-dropdown absolute right-0 top-full mt-2 w-[240px] z-[300] bg-[var(--admin-surface)] rounded-[12px] border border-[var(--admin-border-strong)] shadow-2xl p-1.5 flex flex-col"
                  >
                    {/* User Profile Card */}
                    <div className="flex items-center gap-2.5 p-2.5 rounded-[8px] bg-[var(--admin-surface-muted)]/80 mb-1">
                      <div className="w-9 h-9 rounded-[7px] flex items-center justify-center bg-[var(--admin-accent)] text-white font-bold text-[12px] shadow-xs shrink-0">
                        {initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[12.5px] font-bold text-[var(--admin-text-primary)] truncate">
                          {user?.name || 'Administrator'}
                        </p>
                        <p className="text-[10.5px] text-[var(--admin-text-tertiary)] truncate">
                          {user?.email || 'admin@siriartsandcrafts.com'}
                        </p>
                      </div>
                    </div>

                    {/* Role Simulator */}
                    <div className="p-2 rounded-[8px] border border-[var(--admin-border-subtle)] bg-[var(--admin-bg-subtle)]/50 mb-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--admin-text-tertiary)] block mb-1">
                        Preview Role
                      </label>
                      <select
                        value={activeRole}
                        onChange={(e) => changeActiveRole(e.target.value)}
                        className="w-full h-7 px-2 text-[11px] font-semibold bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-[5px] text-[var(--admin-text-primary)] outline-none cursor-pointer"
                      >
                        <option value="owner">Owner (Full)</option>
                        <option value="manager">Manager (Ops)</option>
                        <option value="editor">Editor (CMS)</option>
                        <option value="viewer">Viewer (Read)</option>
                      </select>
                    </div>

                    {/* Navigation Links */}
                    <div className="space-y-0.5 py-1">
                      {[
                        { icon: 'person', label: 'My Profile', path: '/admin/settings' },
                        { icon: 'settings', label: 'Store Settings', path: '/admin/settings' },
                      ].map((item, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            navigate(item.path);
                            setShowProfile(false);
                          }}
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[12px] font-medium text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] hover:bg-[var(--admin-surface-hover)] rounded-[6px] transition-colors cursor-pointer text-left"
                        >
                          <span className="material-symbols-outlined text-[16px] text-[var(--admin-text-tertiary)]">
                            {item.icon}
                          </span>
                          <span>{item.label}</span>
                        </button>
                      ))}
                    </div>

                    {/* Sign Out */}
                    <div className="pt-1 mt-1 border-t border-[var(--admin-border-subtle)]">
                      <button
                        type="button"
                        onClick={() => {
                          if (confirmSignOut) {
                            logout(true);
                            navigate('/');
                            setShowProfile(false);
                          } else {
                            setConfirmSignOut(true);
                            setTimeout(() => setConfirmSignOut(false), 3000);
                          }
                        }}
                        className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[6px] text-[12px] font-semibold transition-all cursor-pointer ${
                          confirmSignOut
                            ? 'bg-rose-600 text-white'
                            : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          {confirmSignOut ? 'priority_high' : 'logout'}
                        </span>
                        <span>{confirmSignOut ? 'Confirm Sign Out?' : 'Sign Out'}</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </header>

      {/* Flow spacer so main content doesn't jump underneath fixed header */}
      <div
        className="w-full shrink-0"
        style={{ height: 'var(--admin-topbar-height, 56px)' }}
        aria-hidden="true"
      />
    </>
  );
}
