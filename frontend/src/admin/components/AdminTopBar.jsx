import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAdmin } from "../context/AdminContext";
import { useAuth } from "../../context/AuthContext";
import { AdminToggle } from "./AdminUIKit";

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
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const { user, logout } = useAuth();

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().substring(0, 2)
    : "AD";

  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target))
        setShowNotifs(false);
      if (profileRef.current && !profileRef.current.contains(e.target))
        setShowProfile(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const notifIcon = {
    order: "shopping_bag",
    booking: "event",
    stock: "warning",
    review: "star",
    payment: "payments",
  };

  const notifBadge = {
    order: "admin-badge-neutral",
    booking: "admin-badge-info",
    stock: "admin-badge-error",
    review: "admin-badge-warning",
    payment: "admin-badge-success",
  };

  return (
    <header
      className="sticky top-0 z-30"
      style={{
        background: "rgba(250,250,250,0.85)",
        backdropFilter: "blur(12px) saturate(180%)",
        WebkitBackdropFilter: "blur(12px) saturate(180%)",
        borderBottom: "1px solid var(--admin-border)",
        height: "var(--admin-topbar-height)",
      }}
    >
      <div className="flex items-center justify-between h-full px-4 sm:px-5 lg:px-6 gap-2 min-w-0">
        {/* Left: Hamburger + Search */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {/* Mobile menu */}
          <button
            aria-label="Open menu"
            onClick={toggleMobileSidebar}
            className="lg:hidden admin-btn-icon min-h-0 p-2"
          >
            <span className="material-symbols-outlined text-[20px]">menu</span>
          </button>

          {/* Desktop sidebar toggle */}
          <button
            onClick={toggleSidebar}
            className="hidden lg:flex admin-btn-icon min-h-0 p-2"
            title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            <span className="material-symbols-outlined text-[20px]">
              {sidebarOpen ? "menu_open" : "menu"}
            </span>
          </button>

          {/* Search Trigger — Desktop */}
          <button
            onClick={() => setSearchPaletteOpen(true)}
            className="hidden md:flex items-center gap-2.5 flex-1 max-w-[240px] xl:max-w-[380px] px-3 py-2 rounded-[var(--admin-radius-lg)] cursor-pointer transition-all duration-150 text-left min-h-0 group"
            style={{
              background: "var(--admin-bg-subtle)",
              border: "1px solid var(--admin-border-subtle)",
            }}
          >
            <span className="material-symbols-outlined text-[16px] text-[var(--admin-text-tertiary)] shrink-0">
              search
            </span>
            <span className="text-[12px] text-[var(--admin-text-placeholder)] font-normal flex-1 truncate group-hover:text-[var(--admin-text-tertiary)] transition-colors">
              Search products, orders, customers...
            </span>
            <div className="hidden lg:flex items-center gap-1 ml-auto shrink-0 select-none">
              <kbd className="px-1.5 py-0.5 rounded-[var(--admin-radius-sm)] text-[9px] font-semibold text-[var(--admin-text-tertiary)]"
                style={{ background: "var(--admin-surface)", border: "1px solid var(--admin-border)" }}>
                ⌘
              </kbd>
              <kbd className="px-1.5 py-0.5 rounded-[var(--admin-radius-sm)] text-[9px] font-semibold text-[var(--admin-text-tertiary)]"
                style={{ background: "var(--admin-surface)", border: "1px solid var(--admin-border)" }}>
                K
              </kbd>
            </div>
          </button>

          {/* Search Trigger — Mobile */}
          <button
            onClick={() => setSearchPaletteOpen(true)}
            className="md:hidden admin-btn-icon min-h-0 p-2"
            title="Search"
          >
            <span className="material-symbols-outlined text-[18px]">search</span>
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 shrink-0">

          {/* Auto-Publish Toggle — Desktop */}
          <div
            className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-[var(--admin-radius-full)] select-none"
            style={{
              background: "var(--admin-surface-muted)",
              border: "1px solid var(--admin-border-subtle)",
            }}
          >
            <span className="material-symbols-outlined text-[13px] text-[var(--admin-text-tertiary)]">
              {autoPublish ? "bolt" : "sync_disabled"}
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--admin-text-secondary)]">
              Auto-Publish
            </span>
            <AdminToggle
              checked={autoPublish}
              onChange={toggleAutoPublish}
              size="sm"
              aria-label="Toggle Auto-Publish"
            />
          </div>

          {/* Role Badge — Desktop */}
          <div
            className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-[var(--admin-radius-full)] select-none"
            title="Simulating Portal Access Level"
            style={{
              background: "var(--admin-accent-light)",
              border: "1px solid rgba(99,102,241,0.15)",
            }}
          >
            <span className="material-symbols-outlined text-[13px] text-[var(--admin-accent)]">
              {activeRole === "owner" ? "workspace_premium" : activeRole === "manager" ? "shield_person" : activeRole === "editor" ? "edit_square" : "visibility"}
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--admin-accent-text)] capitalize">
              {activeRole}
            </span>
          </div>

          {/* Notifications */}
          <div ref={notifRef} className="relative">
            <button
              onClick={() => setShowNotifs(!showNotifs)}
              className="admin-btn-icon relative min-h-0 p-2"
            >
              <span className="material-symbols-outlined text-[20px]">
                notifications
              </span>
              {unreadNotifications > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-1 right-1 w-4 h-4 text-[9px] font-bold rounded-full flex items-center justify-center"
                  style={{ background: "var(--admin-error)", color: "white" }}
                >
                  {unreadNotifications}
                </motion.span>
              )}
            </button>

            <AnimatePresence>
              {showNotifs && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.12 }}
                  className="admin-dropdown absolute right-0 top-full mt-2 w-[calc(100vw-32px)] sm:w-[360px] max-w-[360px] z-[300]"
                >
                  <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--admin-border-subtle)", background: "var(--admin-bg-subtle)" }}>
                    <h3 className="text-[13px] font-semibold text-[var(--admin-text-primary)]">
                      Notifications
                    </h3>
                    {unreadNotifications > 0 && (
                      <button
                        onClick={markAllNotificationsRead}
                        className="text-[10px] text-[var(--admin-accent)] font-semibold hover:underline cursor-pointer min-h-0"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-[320px] overflow-y-auto custom-scrollbar">
                    {notifications.length === 0 ? (
                      <div className="py-10 text-center text-[var(--admin-text-tertiary)]">
                        <span className="material-symbols-outlined text-[24px]">notifications_off</span>
                        <p className="text-[11px] mt-1.5 font-medium">All caught up!</p>
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <button
                          key={n.id}
                          onClick={() => {
                            markNotificationRead(n.id);
                            setShowNotifs(false);
                            if (n.actionLink) navigate(n.actionLink);
                          }}
                          className="w-full flex items-start gap-3 px-4 py-3 transition-colors cursor-pointer text-left min-h-0"
                          style={{
                            borderBottom: "1px solid var(--admin-border-subtle)",
                            background: !n.read ? "var(--admin-accent-subtle)" : "transparent",
                          }}
                        >
                          <div
                            className="w-8 h-8 rounded-[var(--admin-radius-md)] flex items-center justify-center shrink-0 mt-0.5"
                            style={{
                              background: "var(--admin-surface-muted)",
                              border: "1px solid var(--admin-border)",
                            }}
                          >
                            <span className="material-symbols-outlined text-[14px] text-[var(--admin-text-secondary)]">
                              {notifIcon[n.type] || "info"}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-[12px] leading-snug ${!n.read ? "font-semibold text-[var(--admin-text-primary)]" : "font-normal text-[var(--admin-text-secondary)]"}`}>
                              {n.title}
                            </p>
                            <p className="text-[11px] text-[var(--admin-text-tertiary)] mt-0.5 truncate">
                              {n.message}
                            </p>
                            <p className="text-[10px] text-[var(--admin-text-tertiary)] mt-1">
                              {n.time}
                            </p>
                          </div>
                          {!n.read && (
                            <div
                              className="w-1.5 h-1.5 rounded-full mt-2 shrink-0"
                              style={{ background: "var(--admin-accent)", animation: "admin-pulse 2s infinite" }}
                            />
                          )}
                        </button>
                      ))
                    )}
                  </div>
                  <div className="p-2" style={{ borderTop: "1px solid var(--admin-border-subtle)" }}>
                    <button
                      onClick={() => {
                        navigate("/admin/notifications");
                        setShowNotifs(false);
                      }}
                      className="w-full text-center text-[11px] font-semibold text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] py-2 rounded-[var(--admin-radius-md)] hover:bg-[var(--admin-surface-hover)] cursor-pointer transition-all min-h-0"
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
              onClick={() => setShowProfile(!showProfile)}
              className="flex items-center gap-2 p-1 rounded-[var(--admin-radius-md)] hover:bg-[var(--admin-surface-hover)] cursor-pointer transition-colors min-h-0"
            >
              <div
                className="w-8 h-8 rounded-[var(--admin-radius-md)] flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, var(--admin-accent), #C49A3C)",
                  boxShadow: "var(--admin-shadow-xs)",
                }}
              >
                <span className="text-white text-[11px] font-bold">{initials}</span>
              </div>
              <div className="hidden xl:block text-left pr-1">
                <p className="text-[12px] font-semibold text-[var(--admin-text-primary)] leading-tight">
                  {user?.name || "Administrator"}
                </p>
                <p className="text-[10px] text-[var(--admin-text-tertiary)] capitalize">
                  {user?.role || "Staff"}
                </p>
              </div>
              <span className="material-symbols-outlined text-[14px] text-[var(--admin-text-tertiary)] hidden xl:block">
                expand_more
              </span>
            </button>

            <AnimatePresence>
              {showProfile && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  className="admin-dropdown absolute right-0 top-full mt-2 w-[220px] z-[300] py-1"
                >
                  {/* User Info */}
                  <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--admin-border-subtle)" }}>
                    <p className="text-[12px] font-semibold text-[var(--admin-text-primary)]">
                      {user?.name || "Administrator"}
                    </p>
                    <p className="text-[11px] text-[var(--admin-text-tertiary)] truncate mt-0.5">
                      {user?.email || "admin@siriartsandcrafts.com"}
                    </p>
                  </div>

                  {/* Role Selector */}
                  <div className="px-4 py-2.5" style={{ borderBottom: "1px solid var(--admin-border-subtle)", background: "var(--admin-bg-subtle)" }}>
                    <label className="admin-label mb-1.5">Simulate Preview Role</label>
                    <select
                      value={activeRole}
                      onChange={(e) => changeActiveRole(e.target.value)}
                      className="admin-select py-1 text-[11px] min-h-0"
                    >
                      <option value="owner">♛ Owner (Full)</option>
                      <option value="manager">🛡️ Manager (Ops)</option>
                      <option value="editor">✍️ Editor (CMS)</option>
                      <option value="viewer">👁️ Viewer (Read)</option>
                    </select>
                  </div>

                  {/* Menu Items */}
                  {[
                    { icon: "person", label: "Profile", path: "/admin/settings" },
                    { icon: "settings", label: "Settings", path: "/admin/settings" },
                  ].map((item, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        navigate(item.path);
                        setShowProfile(false);
                      }}
                      className="admin-dropdown-item min-h-0 py-2"
                    >
                      <span className="material-symbols-outlined text-[16px] text-[var(--admin-text-tertiary)]">
                        {item.icon}
                      </span>
                      {item.label}
                    </button>
                  ))}

                  {/* Sign Out */}
                  <div style={{ borderTop: "1px solid var(--admin-border-subtle)" }} className="mt-1 pt-1">
                    <button
                      onClick={() => {
                        if (confirmSignOut) {
                          logout(true);
                          navigate("/auth");
                          setShowProfile(false);
                        } else {
                          setConfirmSignOut(true);
                          setTimeout(() => setConfirmSignOut(false), 3000);
                        }
                      }}
                      className={`w-full flex items-center gap-2 px-4 py-2 text-[12px] transition-all duration-200 cursor-pointer min-h-0 ${
                        confirmSignOut
                          ? "bg-[var(--admin-error)] text-white font-semibold"
                          : "text-[var(--admin-error)] hover:bg-[var(--admin-error-light)]"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        {confirmSignOut ? "priority_high" : "logout"}
                      </span>
                      {confirmSignOut ? "Confirm Sign Out?" : "Sign Out"}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
}
