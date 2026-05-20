import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAdmin } from "../context/AdminContext";
import { useAuth } from "../../context/AuthContext";

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
    ? user.name.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2)
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

  const notifStyle = {
    order: "text-black bg-slate-100 border-slate-200",
    booking: "text-black bg-slate-100 border-slate-200",
    stock: "text-rose-600 bg-rose-50 border-rose-100",
    review: "text-amber-600 bg-amber-50 border-amber-100",
    payment: "text-emerald-600 bg-emerald-50 border-emerald-100",
  };

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200/80">
      <div className="flex items-center justify-between h-14 px-4 sm:px-6 lg:px-8 gap-2 min-w-0">
        {/* Left */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            onClick={toggleMobileSidebar}
            className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">menu</span>
          </button>
          <button
            onClick={toggleSidebar}
            className="hidden lg:flex p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">
              {sidebarOpen ? "menu_open" : "menu"}
            </span>
          </button>

          {/* Search Trigger Button */}
          <button
            onClick={() => setSearchPaletteOpen(true)}
            className="hidden md:flex items-center bg-slate-50 rounded-lg px-3.5 py-1.5 flex-1 max-w-[260px] lg:max-w-[400px] border border-slate-200/60 hover:border-slate-300 hover:bg-slate-100/60 transition-all duration-150 text-left outline-none cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px] text-slate-400 mr-2 shrink-0">
              search
            </span>
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-[9px] uppercase tracking-wider text-black font-semibold leading-none mb-0.5 ml-0.5 truncate">
                Search Admin Database
              </span>
              <span className="text-[12px] text-slate-400 font-normal truncate">
                Search anything...
              </span>
            </div>
            <div className="flex items-center gap-1 ml-2 shrink-0 select-none">
              <kbd className="hidden lg:inline-flex items-center px-1.5 py-0.5 bg-white rounded border border-slate-200 text-[9px] font-semibold text-slate-400">
                ⌘
              </kbd>
              <kbd className="hidden lg:inline-flex items-center px-1.5 py-0.5 bg-white rounded border border-slate-200 text-[9px] font-semibold text-slate-400">
                K
              </kbd>
            </div>
          </button>

          {/* Mobile search trigger */}
          <button
            onClick={() => setSearchPaletteOpen(true)}
            className="md:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer transition-colors"
            title="Global Database Search"
          >
            <span className="material-symbols-outlined text-[18px]">
              search
            </span>
          </button>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Quick Actions */}
          <button
            onClick={() => navigate("/admin/products/add")}
            className="hidden sm:flex items-center gap-1 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider bg-slate-100 border border-slate-200 hover:bg-indigo-100/80 text-black rounded-lg transition-all"
          >
            <span className="material-symbols-outlined text-[14px] font-bold">
              add
            </span>
            Add Product
          </button>

          {/* Global Auto-Publish Switch */}
          <div className="hidden md:flex items-center gap-2 bg-slate-50 border border-slate-200/60 rounded-full px-3 py-1.5 hover:bg-slate-100/60 hover:border-slate-300 transition-all select-none">
            <span className="material-symbols-outlined text-[13px] text-slate-500 font-bold">
              {autoPublish ? "bolt" : "sync_disabled"}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700">
              Auto-Publish
            </span>
            <button
              onClick={toggleAutoPublish}
              className={`w-11 h-6 rounded-full transition-colors duration-200 relative focus:outline-none cursor-pointer min-h-0 p-0 ${
                autoPublish ? "bg-slate-900" : "bg-slate-300"
              }`}
              aria-label="Toggle Auto-Publish"
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform duration-200 shadow-sm ${
                  autoPublish ? "translate-x-5" : ""
                }`}
              />
            </button>
          </div>

          {/* Active Role Indicator Badge */}
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-amber-50/50 border border-amber-200/60 rounded-full select-none shrink-0" title="Simulating Portal Access Level">
            <span className="material-symbols-outlined text-[13px] text-amber-600 font-bold">
              {activeRole === "owner" ? "workspace_premium" : activeRole === "manager" ? "shield_person" : activeRole === "editor" ? "edit_square" : "visibility"}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
              {activeRole}
            </span>
          </div>



          {/* Notifications */}
          <div ref={notifRef} className="relative">
            <button
              onClick={() => setShowNotifs(!showNotifs)}
              className="relative p-2 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">
                notifications
              </span>
              {unreadNotifications > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center"
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
                  className="absolute right-0 top-full mt-2 w-[calc(100vw-32px)] sm:w-[340px] max-w-[340px] bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden z-[300]"
                >
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                    <h3 className="text-[12.5px] font-semibold text-slate-900">
                      Notifications
                    </h3>
                    {unreadNotifications > 0 && (
                      <button
                        onClick={markAllNotificationsRead}
                        className="text-[10px] text-black font-semibold hover:underline cursor-pointer"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                    {notifications.length === 0 ? (
                      <div className="py-8 text-center text-slate-400">
                        <span className="material-symbols-outlined text-[24px]">notifications_off</span>
                        <p className="text-[11px] mt-1">All caught up!</p>
                      </div>
                    ) : (
                      notifications.map((n) => {
                        const style = notifStyle[n.type] || "text-slate-600 bg-slate-50 border-slate-100";
                        return (
                          <button
                            key={n.id}
                            onClick={() => {
                              markNotificationRead(n.id);
                              setShowNotifs(false);
                            }}
                            className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors cursor-pointer text-left ${!n.read ? "bg-slate-100/20" : ""}`}
                          >
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 border ${style.split(" ").slice(1).join(" ")}`}>
                              <span className={`material-symbols-outlined text-[14px] ${style.split(" ")[0]}`}>
                                {notifIcon[n.type]}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-[12px] leading-snug ${!n.read ? "font-semibold text-slate-900" : "font-normal text-slate-600"}`}>
                                {n.title}
                              </p>
                              <p className="text-[11px] text-slate-400 mt-0.5 truncate font-normal">
                                {n.message}
                              </p>
                              <p className="text-[9.5px] text-slate-400 mt-1">
                                {n.time}
                              </p>
                            </div>
                            {!n.read && (
                              <div className="w-1.5 h-1.5 bg-slate-900 rounded-full mt-2 shrink-0 animate-pulse" />
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                  <div className="p-2.5 border-t border-slate-100 bg-slate-50/50">
                    <button
                      onClick={() => {
                        navigate("/admin/notifications");
                        setShowNotifs(false);
                      }}
                      className="w-full text-center text-[11px] font-semibold text-slate-700 hover:text-black py-1.5 rounded-lg hover:bg-slate-100 cursor-pointer transition-all"
                    >
                      View All Notifications
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Profile */}
          <div ref={profileRef} className="relative">
            <button
              onClick={() => setShowProfile(!showProfile)}
              className="flex items-center gap-2 p-1 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors"
            >
              <div className="w-7 h-7 rounded-lg bg-black flex items-center justify-center shadow-xs">
                <span className="text-white text-[11px] font-bold">
                  {initials}
                </span>
              </div>
              <div className="hidden lg:block text-left pr-1">
                <p className="text-[12px] font-semibold text-slate-800 leading-tight">
                  {user?.name || "Administrator"}
                </p>
                <p className="text-[10px] text-slate-400 capitalize">{user?.role || "Staff"}</p>
              </div>
              <span className="material-symbols-outlined text-[14px] text-slate-400 hidden lg:block">
                expand_more
              </span>
            </button>

            <AnimatePresence>
              {showProfile && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  className="absolute right-0 top-full mt-2 w-[200px] bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden z-[300] py-1.5"
                >
                  <div className="px-4 py-2.5 border-b border-slate-100">
                    <p className="text-[12px] font-semibold text-slate-800">
                      {user?.name || "Administrator"}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">
                      {user?.email || "admin@siriartsandcrafts.com"}
                    </p>
                  </div>
                  <div className="px-4 py-2 border-b border-slate-100 bg-slate-50/50">
                    <label className="block text-[8.5px] uppercase tracking-wider text-slate-400 font-bold mb-1">
                      Simulate Preview Role
                    </label>
                    <select
                      value={activeRole}
                      onChange={(e) => changeActiveRole(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-bold text-slate-800 focus:outline-none focus:border-black cursor-pointer"
                    >
                      <option value="owner">♛ Owner (Full)</option>
                      <option value="manager">🛡️ Manager (Ops)</option>
                      <option value="editor">✍️ Editor (CMS)</option>
                      <option value="viewer">👁️ Viewer (Read)</option>
                    </select>
                  </div>
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
                      className="w-full flex items-center gap-2 px-4 py-2 text-[12px] text-slate-600 hover:bg-slate-50 hover:text-black cursor-pointer transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px] text-slate-400">
                        {item.icon}
                      </span>
                      {item.label}
                    </button>
                  ))}
                  <div className="border-t border-slate-100 mt-1 pt-1.5">
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
                      className={`w-full flex items-center gap-2 px-4 py-2 text-[12px] transition-all duration-200 ${confirmSignOut ? "bg-rose-600 text-white font-semibold" : "text-rose-600 hover:bg-rose-50"} cursor-pointer`}
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
