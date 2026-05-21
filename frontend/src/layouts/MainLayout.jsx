import React, { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { TopNavbar } from "../components/layout/TopNavbar";
import { Footer } from "../components/layout/Footer";
import { BottomNav } from "../components/layout/BottomNav";
import { CartDrawer } from "../components/layout/CartDrawer";
import { CheckoutNavbar } from "../components/layout/CheckoutNavbar";
import { ConsentPopup } from "../components/layout/ConsentPopup";
import { useCart } from "../context/CartContext";
import { SEO } from "../components/seo/SEO";
import { MandalaElement } from "../components/ui/MandalaElement";
import { ErrorBoundary } from "../components/ui/ErrorBoundary";
import { WhatsAppWidget } from "../components/ui/WhatsAppWidget";

export function MainLayout() {
  const { pathname } = useLocation();
  const { isCartOpen, setIsCartOpen } = useCart();

  // Scroll to top on route change with a slight delay to allow exit animations if any
  useEffect(() => {
    const originalScrollBehavior =
      document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = "auto";

    const timer = setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "instant" });
      // Restore after a short delay
      setTimeout(() => {
        document.documentElement.style.scrollBehavior = originalScrollBehavior;
      }, 50);
    }, 10);

    return () => {
      clearTimeout(timer);
      document.documentElement.style.scrollBehavior = originalScrollBehavior;
    };
  }, [pathname]);

  const isHighDensityPage = pathname === "/auth" || pathname === "/checkout";

  return (
    <div className="bg-surface text-on-surface min-h-screen flex flex-col relative">
      <SEO />
      {/* Global Background Art - Performance Optimized Gradients & Mandalas */}
      {!isHighDensityPage && (
        <div
          className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none"
          aria-hidden="true"
          style={{ contentVisibility: "auto" }}
        >
          {/* Enhanced Global Cinematic Glows - Reduced intensity for clarity */}
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_0%_0%,rgba(212,175,55,0.06)_0%,transparent_70%),radial-gradient(circle_at_100%_100%,rgba(212,175,55,0.04)_0%,transparent_70%)]" />

          {/* Subtle Heritage Mandalas - Minimal presence to avoid clutter */}
          <div className="absolute -top-[10%] -right-[10%] w-[300px] sm:w-[500px] lg:w-[800px] h-[300px] sm:h-[500px] lg:h-[800px] will-change-transform">
            <MandalaElement
              size={800}
              opacity={0.03}
              rotate={false}
              skipFade={true}
            />
          </div>
          <div className="absolute -bottom-[15%] -left-[10%] w-[400px] sm:w-[600px] lg:w-[1000px] h-[400px] sm:h-[600px] lg:h-[1000px] will-change-transform">
            <MandalaElement
              size={1000}
              opacity={0.02}
              rotate={false}
              variant={2}
              skipFade={true}
            />
          </div>
        </div>
      )}

      <TopNavbar />
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
      <main id="main-content" className="flex-1 relative pb-0" tabIndex={-1}>
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
      <Footer />
      <BottomNav />
      <WhatsAppWidget />
      <ConsentPopup />
    </div>
  );
}

/**
 * Minimal layout for checkout — no bottom nav, shared secure header
 */
export function MinimalLayout() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);

  return (
    <div className="bg-surface text-on-surface min-h-screen flex flex-col relative overflow-hidden">
      {/* Global Background Art */}
      <div
        className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none"
        aria-hidden="true"
      >
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_0%_0%,rgba(212,175,55,0.08)_0%,transparent_60%),radial-gradient(circle_at_100%_100%,rgba(212,175,55,0.08)_0%,transparent_60%)]" />
      </div>

      <CheckoutNavbar />
      <main id="main-content" className="flex-1" tabIndex={-1}>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
