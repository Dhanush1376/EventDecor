import { Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useConfig } from '../context/ConfigContext';
import { TopNavbar } from '../components/layout/TopNavbar';
import { GlobalAnnouncementBanner } from '../components/layout/GlobalAnnouncementBanner';
import { Footer } from '../components/layout/Footer';
import { BottomNav } from '../components/layout/BottomNav';
import { CheckoutNavbar } from '../components/layout/CheckoutNavbar';
import { SEO } from '../components/seo/SEO';
import { MandalaElement } from '../components/ui/MandalaElement';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';
import { getRouteSkeletonVariant, RouteSkeleton } from '../components/ui/RouteSkeleton';
import { AuthGate } from '../components/auth/AuthGate';
// Direct import: the components/ui barrel would pull every UI module into the entry chunk.
import { ScrollToTopButton } from '../components/ui/ScrollToTopButton';
import { lazyWithRetry as lazy } from '../utils/performance/lazyWithRetry';

const CartDrawer = lazy(() =>
  import('../components/layout/CartDrawer').then((m) => ({ default: m.CartDrawer })),
);
const ConsentPopup = lazy(() =>
  import('../components/layout/ConsentPopup').then((m) => ({ default: m.ConsentPopup })),
);
const WhatsAppWidget = lazy(() =>
  import('../components/ui/WhatsAppWidget').then((m) => ({ default: m.WhatsAppWidget })),
);
const FloatingOfferCard = lazy(() =>
  import('../components/promotions/FloatingOfferCard').then((m) => ({
    default: m.FloatingOfferCard,
  })),
);
const AdminInviteModal = lazy(() =>
  import('../components/auth/AdminInviteModal').then((m) => ({ default: m.AdminInviteModal })),
);

export function MainLayout() {
  const { pathname } = useLocation();
  const { isStoreClosed } = useConfig();
  const {
    isCartOpen,
    setIsCartOpen,
    _purchaseCartCount = 0,
    _rentalCartCount = 0,
    _activeCartMode,
  } = useCart();

  // Scroll position on route changes is owned by ScrollManager (top for new pages, restored
  // position for Back/Forward). Scrolling here as well used to undo the restore on Back.

  const isHighDensityPage = pathname === '/auth' || pathname === '/checkout';

  const fallbackVariant = getRouteSkeletonVariant(pathname);

  return (
    <div className="bg-surface text-on-surface min-h-screen flex flex-col relative overflow-x-clip">
      <SEO routeDefault />
      {/* Global Background Art - Performance Optimized Gradients & Mandalas */}
      {!isHighDensityPage && (
        <div
          className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none"
          aria-hidden="true"
          style={{ contentVisibility: 'auto' }}
        >
          {/* Enhanced Global Cinematic Glows - Reduced intensity for clarity */}
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_0%_0%,rgba(212,175,55,0.06)_0%,transparent_70%),radial-gradient(circle_at_100%_100%,rgba(212,175,55,0.04)_0%,transparent_70%)]" />

          {/* Subtle Heritage Mandalas - Minimal presence to avoid clutter */}
          <div className="absolute -top-[10%] -right-[10%] w-[300px] sm:w-[500px] lg:w-[800px] h-[300px] sm:h-[500px] lg:h-[800px] will-change-transform">
            <MandalaElement size={800} opacity={0.03} rotate={false} skipFade={true} />
          </div>
          <div className="absolute -bottom-[15%] -left-[10%] w-[400px] sm:w-[600px] lg:w-[1000px] h-[400px] sm:h-[600px] lg:h-[1000px] will-change-transform">
            <MandalaElement size={1000} opacity={0.02} rotate={false} variant={2} skipFade={true} />
          </div>
        </div>
      )}

      <GlobalAnnouncementBanner />
      <TopNavbar />
      {isCartOpen && pathname !== '/cart' && (
        <Suspense fallback={null}>
          <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
        </Suspense>
      )}
      {/* min-h keeps the footer below the first viewport while page data streams in,
          so it is never pushed down after content arrives (was CLS ~0.78 on mobile). */}
      <main id="main-content" className="flex-1 relative min-h-[100svh]" tabIndex={-1}>
        <ErrorBoundary>
          <AuthGate>
            <Suspense fallback={<RouteSkeleton variant={fallbackVariant} />}>
              {/* Page transition: animate-page-enter on route change */}
              <div className="animate-content-reveal">
                <Outlet />
              </div>
            </Suspense>
          </AuthGate>
        </ErrorBoundary>
      </main>
      {pathname !== '/cart' && !pathname.startsWith('/dashboard') && <Footer />}
      <BottomNav />
      <Suspense fallback={null}>
        <FloatingOfferCard />
      </Suspense>
      <div
        className={`fixed ${
          isStoreClosed
            ? 'bottom-[calc(118px+var(--safe-area-bottom,env(safe-area-inset-bottom,0px)))]'
            : 'bottom-[calc(80px+var(--safe-area-bottom,env(safe-area-inset-bottom,0px)))]'
        } lg:bottom-8 right-4 lg:right-10 z-[40] flex flex-col gap-4 items-center pointer-events-none transition-all duration-300`}
      >
        <ScrollToTopButton />
        <Suspense fallback={null}>
          <WhatsAppWidget />
        </Suspense>
      </div>
      <Suspense fallback={null}>
        <ConsentPopup />
      </Suspense>
      <Suspense fallback={null}>
        <AdminInviteModal />
      </Suspense>
    </div>
  );
}

/**
 * Minimal layout for checkout — no bottom nav, shared secure header
 */
export function MinimalLayout() {
  const { pathname } = useLocation();

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
        <ErrorBoundary>
          <Suspense fallback={<RouteSkeleton variant={getRouteSkeletonVariant(pathname)} />}>
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </main>
    </div>
  );
}
