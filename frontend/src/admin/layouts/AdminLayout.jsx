import React, { useEffect, Suspense } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { AdminProvider, useAdmin } from "../context/AdminContext";
import { AdminSidebar } from "../components/AdminSidebar";
import { AdminTopBar } from "../components/AdminTopBar";
import { PublishToast } from "../components/AdminUIKit";
import { AdminErrorBoundary } from "../components/AdminErrorBoundary";
import { GlobalSearchPalette } from "../components/GlobalSearchPalette";
import { MandalaElement } from "../../components/ui/MandalaElement";
import { AdminLoader } from "../../components/ui/PageLoader";
import toast from "react-hot-toast";

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

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);

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
    <div className="min-h-screen font-[Inter] relative overflow-x-clip selection:bg-slate-900/20 admin-section-root">
      {/* Visual Banners block */}
      <div className="relative z-[400] flex flex-col divide-y divide-white/10 text-white text-[10px] font-bold tracking-wider uppercase select-none">
        {safetyLock && (
          <div className="bg-rose-600 px-4 py-2 flex items-center justify-center gap-1.5 shadow-sm text-center">
            <span className="material-symbols-outlined text-[13px]">lock</span>
            GLOBAL PORTAL SAFETY LOCK ACTIVE &mdash; ALL DATABASE WRITES RESTRICTED TO READ-ONLY PREVIEWS
          </div>
        )}
        {maintenanceMode && (
          <div className="bg-amber-500 text-black px-4 py-2 flex items-center justify-center gap-1.5 shadow-sm text-center">
            <span className="material-symbols-outlined text-[13px]">construction</span>
            STOREFRONT SHIELDED &mdash; MAINTENANCE MODE ACTIVE IN PUBLIC VIEW
          </div>
        )}
      </div>

      {/* Decorative Brand Mandala Backgrounds */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0">
        <MandalaElement
          className="absolute -top-32 -right-32 opacity-[0.025] hidden lg:block"
          size={700}
          variant={1}
          rotate={true}
          duration={180}
        />
        <MandalaElement
          className="absolute -bottom-48 -left-48 opacity-[0.025] hidden lg:block"
          size={900}
          variant={2}
          rotate={true}
          duration={240}
        />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col font-sans">
        <AdminSidebar />
        <div
          className={`flex flex-col min-h-screen flex-1 transition-all duration-300 ease-in-out ${
            sidebarOpen ? "lg:pl-[260px]" : "lg:pl-[72px]"
          } pl-0`}
        >
          <AdminTopBar />
          <main
            id="admin-main-content"
            tabIndex={-1}
            className="flex-1 p-4 sm:p-5 md:p-6 lg:p-8 pb-24 lg:pb-12 relative max-w-[1920px] mx-auto w-full min-w-0"
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

      {/* Global Inactivity Idle Alert Modal Overlay */}
      {showIdleWarning && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[9999] p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl border border-slate-200 p-6 max-w-sm w-full text-center shadow-2xl space-y-4"
          >
            <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center mx-auto text-amber-500 animate-bounce">
              <span className="material-symbols-outlined text-[24px]">hourglass_empty</span>
            </div>
            <div>
              <h3 className="text-[14.5px] font-bold text-slate-800">Inactivity Timeout Warning</h3>
              <p className="text-[11.5px] text-slate-500 mt-1.5 leading-normal">
                Your portal session has been idle for some time. You will be automatically logged out for security in:
              </p>
              <div className="text-[28px] font-black text-slate-900 mt-2.5 font-mono tracking-tight animate-pulse">
                {idleSecondsLeft}s
              </div>
            </div>
            <button
              onClick={() => {
                setShowIdleWarning(false);
                window.dispatchEvent(new Event("mousemove"));
                toast.success("Session heartbeat renewed!");
              }}
              className="w-full py-2.5 bg-slate-950 hover:bg-black text-white text-[12px] font-semibold rounded-xl cursor-pointer transition-all shadow-xs"
            >
              Extend Session
            </button>
          </motion.div>
        </div>
      )}
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
