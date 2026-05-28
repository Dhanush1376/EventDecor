import React, { useEffect, useState, Suspense } from "react";
import api from "../../services/api";
import { Outlet, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { AdminProvider, useAdmin } from "../context/AdminContext";
import { AdminSidebar } from "../components/AdminSidebar";
import { AdminTopBar } from "../components/AdminTopBar";
import { PublishToast } from "../components/AdminUIKit";
import { AdminErrorBoundary } from "../components/AdminErrorBoundary";
import { GlobalSearchPalette } from "../components/GlobalSearchPalette";
import { AdminLoader } from "../../components/ui/PageLoader";
import toast from "react-hot-toast";

import "../../styles/admin.css";

function AdminLayoutInner() {
  const {
    sidebarOpen,
    publishToast,
    searchPaletteOpen,
    setSearchPaletteOpen,

    safetyLock,
    maintenanceMode,
    showIdleWarning,
    setShowIdleWarning,
    idleSecondsLeft
  } = useAdmin();
  const { pathname } = useLocation();
  const [socketDegraded, setSocketDegraded] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);

  useEffect(() => {
    api
      .get("/health")
      .then((res) => {
        if (res.data?.realtime?.degraded) {
          setSocketDegraded(true);
        }
      })
      .catch(() => {});
  }, []);

  // Global search trigger (Ctrl+K / Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setSearchPaletteOpen]);

  return (
    <div className="min-h-screen relative overflow-x-clip selection:bg-[var(--admin-accent-muted)] admin-section-root" style={{ fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif" }}>
      {/* Status Banners */}
      <div className="relative z-[400] flex flex-col text-[10px] font-bold tracking-wider uppercase select-none">
        <AnimatePresence>
          {safetyLock && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-[var(--admin-error)] text-white px-4 py-2 flex items-center justify-center gap-1.5 shadow-sm text-center overflow-hidden"
            >
              <span className="material-symbols-outlined text-[13px]">lock</span>
              Global Portal Safety Lock Active — All Database Writes Restricted
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {maintenanceMode && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-[var(--admin-warning)] text-white px-4 py-2 flex items-center justify-center gap-1.5 shadow-sm text-center overflow-hidden"
            >
              <span className="material-symbols-outlined text-[13px]">construction</span>
              Storefront Shielded — Maintenance Mode Active
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {socketDegraded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-orange-600 text-white px-4 py-2 flex items-center justify-center gap-1.5 shadow-sm text-center overflow-hidden"
            >
              <span className="material-symbols-outlined text-[13px]">wifi_off</span>
              Real-Time Alerts Degraded — Redis Not Configured
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Layout Shell */}
      <div className="relative z-10 min-h-screen flex flex-col">
        <AdminSidebar />
        <div
          className={`flex flex-col min-h-screen flex-1 transition-all duration-300 ease-[var(--admin-ease)] ${
            sidebarOpen ? "lg:pl-[260px]" : "lg:pl-[72px]"
          } pl-0`}
        >
          <AdminTopBar />
          <main
            id="admin-main-content"
            tabIndex={-1}
            className="flex-1 p-4 sm:p-5 md:p-6 lg:p-8 pb-24 lg:pb-12 relative w-full min-w-0"
            style={{ maxWidth: "var(--admin-max-content-width)", margin: "0 auto" }}
          >
            <AdminErrorBoundary>
              <Suspense fallback={<AdminLoader />}>
                <Outlet />
              </Suspense>
            </AdminErrorBoundary>
          </main>
        </div>
      </div>

      {/* Global Publish Toast */}
      <PublishToast message={publishToast} />

      {/* Global Command & Search Palette */}
      <GlobalSearchPalette
        isOpen={searchPaletteOpen}
        onClose={() => setSearchPaletteOpen(false)}
      />

      {/* Inactivity Idle Alert Modal */}
      <AnimatePresence>
        {showIdleWarning && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="admin-card p-6 max-w-sm w-full text-center space-y-4"
            >
              <div className="w-12 h-12 rounded-full bg-[var(--admin-warning-light)] border border-[var(--admin-warning-border)] flex items-center justify-center mx-auto text-[var(--admin-warning)] animate-bounce">
                <span className="material-symbols-outlined text-[24px]">hourglass_empty</span>
              </div>
              <div>
                <h3 className="text-[15px] font-bold text-[var(--admin-text-primary)]">
                  Inactivity Timeout Warning
                </h3>
                <p className="text-[12px] text-[var(--admin-text-tertiary)] mt-1.5 leading-normal">
                  Your portal session has been idle. You will be automatically logged out for security in:
                </p>
                <div className="text-[28px] font-black text-[var(--admin-text-primary)] mt-2.5 font-mono tracking-tight animate-pulse">
                  {idleSecondsLeft}s
                </div>
              </div>
              <button
                onClick={() => {
                  setShowIdleWarning(false);
                  window.dispatchEvent(new Event("mousemove"));
                  toast.success("Session heartbeat renewed!");
                }}
                className="admin-btn admin-btn-primary w-full text-[12px] min-h-[42px]"
              >
                Extend Session
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function AdminLayout() {
  return (
    <AdminProvider>
      <AdminLayoutInner />
    </AdminProvider>
  );
}
