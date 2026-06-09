import React, { Suspense, useState, useEffect } from 'react';
import { lazyWithRetry as lazy } from './utils/lazyWithRetry';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { logRouteDiagnostic } from './utils/diagnostics';
import { HelmetProvider } from 'react-helmet-async';
import { Toaster, ToastBar } from 'react-hot-toast';
import { ensureCsrfToken } from './services/api';
import { perfMonitor } from './utils/performanceMonitor';

import { RouteSkeleton } from './components/ui/RouteSkeleton';
import { CartProvider } from './context/CartProvider';
import { WishlistProvider } from './context/WishlistProvider';
import { AuthProvider } from './context/AuthProvider';
import { UserSocketProvider } from './context/UserSocketProvider';
import { MainLayout, MinimalLayout } from './layouts/MainLayout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { AdminInviteModal } from './components/auth/AdminInviteModal';
import { NetworkProvider } from './context/NetworkProvider';
import { ConfigProvider } from './context/ConfigContext';
import { PwaUpdatePrompt } from './components/ui/PwaUpdatePrompt';
import { SlowConnectionBanner } from './components/ui/SlowConnectionBanner';
import { GlobalTracker } from './components/ui/GlobalTracker';
import { NavigationOrchestrator } from './components/ui/NavigationOrchestrator';
import { ScrollManager } from './components/ui/ScrollManager';
import { prefetchManager } from './utils/prefetchManager';
import { getRouteSkeletonVariant } from './components/ui/RouteSkeleton';

function AppRouteFallback() {
  const location = useLocation();
  const variant = getRouteSkeletonVariant(location.pathname);
  return <RouteSkeleton variant={variant} />;
}

import { useParams } from 'react-router-dom';
function RedirectToCustomOrder() {
  const { productId } = useParams();
  return <Navigate to={`/custom-orders?product=${productId}`} replace />;
}

// Lazy load heavy auth modal to remove it from initial load bundle
const AuthModal = lazy(() =>
  import('./components/auth/AuthModal').then((m) => ({ default: m.AuthModal })),
);

// Lazy load pages for performance optimization
const Home = lazy(() => import('./pages/Home/Home').then((m) => ({ default: m.Home })));
const ProductListing = lazy(() =>
  import('./pages/ProductListing').then((m) => ({ default: m.ProductListing })),
);
const ProductDetails = lazy(() =>
  import('./pages/ProductDetails').then((m) => ({ default: m.ProductDetails })),
);
const Cart = lazy(() => import('./pages/Cart').then((m) => ({ default: m.Cart })));
const Checkout = lazy(() => import('./pages/Checkout').then((m) => ({ default: m.Checkout })));
const OrderSuccess = lazy(() =>
  import('./pages/OrderSuccess').then((m) => ({ default: m.OrderSuccess })),
);
const About = lazy(() => import('./pages/About').then((m) => ({ default: m.About })));
const CustomOrders = lazy(() =>
  import('./pages/CustomOrders').then((m) => ({ default: m.CustomOrders })),
);

const MyCustomOrders = lazy(() =>
  import('./pages/MyCustomOrders').then((m) => ({ default: m.MyCustomOrders })),
);
const Gallery = lazy(() => import('./pages/Gallery').then((m) => ({ default: m.Gallery })));
const GalleryDetail = lazy(() =>
  import('./pages/GalleryDetail').then((m) => ({ default: m.GalleryDetail })),
);
const Contact = lazy(() => import('./pages/Contact').then((m) => ({ default: m.Contact })));
const Wishlist = lazy(() => import('./pages/Wishlist').then((m) => ({ default: m.Wishlist })));
const CollectionDetail = lazy(() =>
  import('./pages/CollectionDetail').then((m) => ({ default: m.CollectionDetail })),
);
const Dashboard = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })));
const OrderTrackingPublic = lazy(() =>
  import('./pages/OrderTrackingPublic').then((m) => ({ default: m.OrderTrackingPublic })),
);
const EventCollections = lazy(() =>
  import('./pages/EventCollections').then((m) => ({ default: m.EventCollections })),
);
const EventDetail = lazy(() =>
  import('./pages/EventDetail').then((m) => ({ default: m.EventDetail })),
);
const EventBookingWizard = lazy(() =>
  import('./pages/EventBookingWizard').then((m) => ({ default: m.EventBookingWizard })),
);
const EventBookingSuccess = lazy(() =>
  import('./pages/EventBookingSuccess').then((m) => ({ default: m.EventBookingSuccess })),
);
const EventCustomerDashboard = lazy(() =>
  import('./pages/EventCustomerDashboard').then((m) => ({ default: m.EventCustomerDashboard })),
);
const EventShowcases = lazy(() =>
  import('./pages/EventShowcases').then((m) => ({ default: m.EventShowcases })),
);
const Shipping = lazy(() => import('./pages/Shipping').then((m) => ({ default: m.Shipping })));
const Returns = lazy(() => import('./pages/Returns').then((m) => ({ default: m.Returns })));
const Privacy = lazy(() => import('./pages/Privacy').then((m) => ({ default: m.Privacy })));
const Terms = lazy(() => import('./pages/Terms').then((m) => ({ default: m.Terms })));
const AcceptInvite = lazy(() =>
  import('./pages/AcceptInvite').then((m) => ({ default: m.AcceptInvite })),
);
const NotFound = lazy(() => import('./pages/NotFound').then((m) => ({ default: m.NotFound })));
const BlogListing = lazy(() =>
  import('./pages/BlogListing').then((m) => ({ default: m.BlogListing })),
);
const BlogPost = lazy(() => import('./pages/BlogPost').then((m) => ({ default: m.BlogPost })));
const LocationLanding = lazy(() =>
  import('./pages/LocationLanding').then((m) => ({ default: m.LocationLanding })),
);
const Coupons = lazy(() => import('./pages/Coupons').then((m) => ({ default: m.Coupons })));

// ─── Admin Portal (Lazy Loaded) ───
const AdminLayout = lazy(() =>
  import('./admin/layouts/AdminLayout').then((m) => ({ default: m.AdminLayout })),
);
const AdminDrafts = lazy(() =>
  import('./admin/pages/AdminDrafts').then((m) => ({ default: m.AdminDrafts })),
);
const AdminDashboard = lazy(() =>
  import('./admin/pages/AdminDashboard').then((m) => ({ default: m.AdminDashboard })),
);
const AdminProducts = lazy(() =>
  import('./admin/pages/AdminProducts').then((m) => ({ default: m.AdminProducts })),
);
const AdminAddProduct = lazy(() =>
  import('./admin/pages/AdminAddProduct').then((m) => ({ default: m.AdminAddProduct })),
);
const AdminOrders = lazy(() =>
  import('./admin/pages/AdminOrders').then((m) => ({ default: m.AdminOrders })),
);
const AdminOrderDetail = lazy(() =>
  import('./admin/pages/AdminOrderDetail').then((m) => ({ default: m.AdminOrderDetail })),
);
const AdminAddEvent = lazy(() =>
  import('./admin/pages/AdminAddEvent').then((m) => ({ default: m.AdminAddEvent })),
);
const AdminAddShowcase = lazy(() =>
  import('./admin/pages/AdminAddShowcase').then((m) => ({ default: m.AdminAddShowcase })),
);
const AdminInquiries = lazy(() =>
  import('./admin/pages/AdminInquiries').then((m) => ({ default: m.AdminInquiries })),
);
const AdminCustomers = lazy(() =>
  import('./admin/pages/AdminCustomers').then((m) => ({ default: m.AdminCustomers })),
);
const AdminCustomerProfile = lazy(() =>
  import('./admin/pages/AdminCustomerProfile').then((m) => ({ default: m.AdminCustomerProfile })),
);
const AdminGallery = lazy(() =>
  import('./admin/pages/AdminGallery').then((m) => ({ default: m.AdminGallery })),
);
const AdminAddGalleryItem = lazy(() =>
  import('./admin/pages/AdminAddGalleryItem').then((m) => ({ default: m.AdminAddGalleryItem })),
);
const AdminEvents = lazy(() =>
  import('./admin/pages/AdminEvents').then((m) => ({ default: m.AdminEvents })),
);
const AdminBookingDetail = lazy(() =>
  import('./admin/pages/AdminBookingDetail').then((m) => ({ default: m.AdminBookingDetail })),
);
const AdminPolicies = lazy(() =>
  import('./admin/pages/AdminPolicies').then((m) => ({ default: m.AdminPolicies })),
);
const AdminPolicyEditor = lazy(() =>
  import('./admin/pages/AdminPolicyEditor').then((m) => ({ default: m.AdminPolicyEditor })),
);
const AdminRecommendationAnalytics = lazy(() =>
  import('./admin/pages/AdminRecommendationAnalytics').then((m) => ({
    default: m.AdminRecommendationAnalytics,
  })),
);
const AdminAnalytics = lazy(() =>
  import('./admin/pages/AdminAnalytics').then((m) => ({ default: m.AdminAnalytics })),
);
const AdminInventory = lazy(() =>
  import('./admin/pages/AdminInventory').then((m) => ({ default: m.AdminInventory })),
);
const AdminCoupons = lazy(() =>
  import('./admin/pages/AdminCoupons').then((m) => ({ default: m.AdminCoupons })),
);
const AdminRentalOrders = lazy(() =>
  import('./admin/pages/AdminRentalOrders').then((m) => ({ default: m.AdminRentalOrders })),
);
const AdminRentalCalendar = lazy(() =>
  import('./admin/pages/AdminRentalCalendar').then((m) => ({ default: m.AdminRentalCalendar })),
);
const AdminRentalPolicies = lazy(() =>
  import('./admin/pages/AdminRentalPolicies').then((m) => ({ default: m.AdminRentalPolicies })),
);
const AdminCreateCoupon = lazy(() =>
  import('./admin/pages/AdminCreateCoupon').then((m) => ({ default: m.AdminCreateCoupon })),
);
const AdminPayments = lazy(() =>
  import('./admin/pages/AdminPayments').then((m) => ({ default: m.AdminPayments })),
);
const AdminNotifications = lazy(() =>
  import('./admin/pages/AdminNotifications').then((m) => ({ default: m.AdminNotifications })),
);
const AdminCampaigns = lazy(() =>
  import('./admin/pages/AdminCampaigns').then((m) => ({ default: m.AdminCampaigns })),
);
const AdminContent = lazy(() =>
  import('./admin/pages/AdminContent').then((m) => ({ default: m.AdminContent })),
);
const AdminTeam = lazy(() =>
  import('./admin/pages/AdminTeam').then((m) => ({ default: m.AdminTeam })),
);
const AdminSettings = lazy(() =>
  import('./admin/pages/AdminSettings').then((m) => ({ default: m.AdminSettings })),
);
const AdminSystemUsers = lazy(() =>
  import('./admin/pages/AdminSystemUsers').then((m) => ({ default: m.AdminSystemUsers })),
);
const AdminCategories = lazy(() =>
  import('./admin/pages/AdminCategories').then((m) => ({ default: m.AdminCategories })),
);
const AdminAddCategory = lazy(() =>
  import('./admin/pages/AdminAddCategory').then((m) => ({ default: m.AdminAddCategory })),
);
const AdminCampaignCreate = lazy(() =>
  import('./admin/pages/AdminCampaignCreate').then((m) => ({ default: m.AdminCampaignCreate })),
);
const AdminTemplateCreate = lazy(() =>
  import('./admin/pages/AdminTemplateCreate').then((m) => ({ default: m.AdminTemplateCreate })),
);
const AdminConfig = lazy(() =>
  import('./admin/pages/AdminConfig').then((m) => ({ default: m.AdminConfig })),
);
const AdminLayouts = lazy(() =>
  import('./admin/pages/AdminLayouts').then((m) => ({ default: m.AdminLayouts })),
);
const AdminReviews = lazy(() =>
  import('./admin/pages/AdminReviews').then((m) => ({ default: m.AdminReviews })),
);
const AdminServiceAreas = lazy(() => import('./admin/pages/AdminServiceAreas'));

// All /admin/* pages are React.lazy() — not in the storefront initial JS bundle (see npm run build:report).

import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query';
import { hydrateQueryClientCache, subscribeToQueryCache } from './utils/queryPersister';
import toast from 'react-hot-toast';

function RouteDiagnostics() {
  const location = useLocation();
  React.useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    logRouteDiagnostic(location.pathname);
  }, [location.pathname]);
  return null;
}

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      // Intentionally do not show a global toast for background refetch failures
      // The user already has cached data, so background failures shouldn't interrupt them
      logger.warn(
        `[QueryCache] Background update failed for query ${query.queryKey.join('-')}:`,
        error,
      );
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      // Intentionally ignore mutations that were successfully queued offline
      // as NetworkProvider already shows a success toast for them
      if (error.offlineQueued) return;

      // Only show global toast if the mutation didn't define its own custom onError handler
      if (!mutation.options.onError) {
        toast.error(
          error.response?.data?.message ||
            error.message ||
            'An error occurred while processing your request.',
        );
      }
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
      networkMode: 'offlineFirst',
      refetchOnMount: true,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      retry: (failureCount, error) => {
        if (failureCount >= 3) return false;
        const status = error?.response?.status || error?.normalized?.status;
        if (status && [400, 401, 403, 404, 422].includes(status)) {
          return false;
        }
        return true;
      },
    },
  },
});

queryClient.setQueryDefaults(['product'], { staleTime: 1000 * 60 * 5, gcTime: 1000 * 60 * 30 });
queryClient.setQueryDefaults(['products'], {
  staleTime: 1000 * 60 * 10,
  gcTime: 1000 * 60 * 60,
  refetchOnMount: false,
  refetchOnReconnect: false,
});
queryClient.setQueryDefaults(['cart'], { staleTime: 1000 * 30, gcTime: 1000 * 60 * 5 });
queryClient.setQueryDefaults(['profile'], { staleTime: 1000 * 60 * 2, gcTime: 1000 * 60 * 10 });
queryClient.setQueryDefaults(['cms'], {
  staleTime: 1000 * 60 * 15,
  gcTime: 1000 * 60 * 60,
  refetchOnMount: false,
  refetchOnReconnect: false,
});
queryClient.setQueryDefaults(['recommendations'], {
  staleTime: 1000 * 60 * 10,
  gcTime: 1000 * 60 * 30,
  refetchOnMount: false,
});

hydrateQueryClientCache(queryClient);

function App() {
  const [isMounted, setIsMounted] = useState(false);
  const [toastPosition, setToastPosition] = useState('bottom-right');

  React.useEffect(() => {
    setIsMounted(true);
    // Pre-fetch CSRF token so it's ready before any user interaction
    ensureCsrfToken().catch(() => {});
  }, []);

  React.useEffect(() => {
    const handleResize = () => {
      setToastPosition(window.innerWidth < 768 ? 'top-center' : 'bottom-right');
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  React.useEffect(() => {
    prefetchManager.setQueryClient(queryClient);
  }, []);

  React.useEffect(() => {
    const unsubscribe = subscribeToQueryCache(queryClient);
    return () => unsubscribe();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <NetworkProvider>
        <ConfigProvider>
          {isMounted && (
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-surface focus:text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
            >
              Skip to main content
            </a>
          )}
          <SlowConnectionBanner />
          <HelmetProvider>
            <AuthProvider>
              <CartProvider>
                <WishlistProvider>
                  <UserSocketProvider>
                    {isMounted && (
                      <Toaster
                        position={toastPosition}
                        toastOptions={{
                          duration: 2500,
                          style: {
                            background: 'rgba(255, 255, 255, 0.4)',
                            backdropFilter: 'blur(20px)',
                            WebkitBackdropFilter: 'blur(20px)',
                            border: '1px solid rgba(255, 255, 255, 0.6)',
                            color: '#000000',
                            fontSize: '12px',
                            fontFamily: 'var(--font-body)',
                            fontWeight: '700',
                            borderRadius: 'var(--radius-full)',
                            padding: '12px 24px',
                            boxShadow:
                              '0 20px 40px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.4)',
                          },
                          success: {
                            iconTheme: {
                              primary: '#16a34a',
                              secondary: '#ffffff',
                            },
                          },
                        }}
                      >
                        {(t) => (
                          <div
                            onClick={() => toast.dismiss(t.id)}
                            className="cursor-pointer active:scale-95 transition-transform"
                          >
                            <ToastBar toast={t} />
                          </div>
                        )}
                      </Toaster>
                    )}

                    {isMounted && (
                      <Suspense fallback={null}>
                        <AuthModal />
                      </Suspense>
                    )}
                    {isMounted && <AdminInviteModal />}
                    <Router>
                      <RouteDiagnostics />
                      <NavigationOrchestrator />
                      <ScrollManager />
                      <GlobalTracker />
                      <PwaUpdatePrompt />
                      <ErrorBoundary>
                        <Suspense fallback={<AppRouteFallback />}>
                          <Routes>
                            <Route element={<MainLayout />}>
                              <Route path="/" element={<Home />} />
                              <Route path="/blog" element={<BlogListing />} />
                              <Route path="/blog/:slug" element={<BlogPost />} />
                              <Route
                                path="/:city(wedding-decorations-hyderabad|event-decorators-telangana|event-decorators-secunderabad|event-decorators-ongole|wedding-decorations-ongole|handmade-gifts-ongole|event-decorators-vijayawada|event-decorators-guntur|wedding-decorations-bangalore|event-decorators-chennai)"
                                element={<LocationLanding />}
                              />
                              <Route path="/collections" element={<ProductListing />} />
                              <Route path="/product/:id" element={<ProductDetails />} />
                              <Route path="/cart" element={<Cart />} />
                              <Route path="/order-success" element={<OrderSuccess />} />
                              <Route path="/about" element={<About />} />
                              <Route path="/custom-orders" element={<CustomOrders />} />
                              <Route
                                path="/customize/:productId"
                                element={<RedirectToCustomOrder />}
                              />
                              <Route
                                path="/my-custom-orders"
                                element={
                                  <ProtectedRoute>
                                    <MyCustomOrders />
                                  </ProtectedRoute>
                                }
                              />
                              <Route path="/gallery" element={<Gallery />} />
                              <Route path="/gallery/:id" element={<GalleryDetail />} />
                              <Route path="/contact" element={<Contact />} />
                              <Route path="/wishlist" element={<Wishlist />} />
                              <Route path="/collection/:id" element={<CollectionDetail />} />
                              <Route
                                path="/dashboard"
                                element={
                                  <ProtectedRoute>
                                    <Dashboard />
                                  </ProtectedRoute>
                                }
                              />
                              <Route path="/track/:orderId" element={<OrderTrackingPublic />} />
                              <Route path="/events" element={<EventShowcases />} />
                              <Route path="/events/collections" element={<EventCollections />} />
                              <Route path="/events/:id" element={<EventDetail />} />
                              <Route path="/events/book" element={<EventBookingWizard />} />
                              <Route
                                path="/booking-success/:id"
                                element={<EventBookingSuccess />}
                              />
                              <Route
                                path="/events/dashboard"
                                element={
                                  <ProtectedRoute>
                                    <EventCustomerDashboard />
                                  </ProtectedRoute>
                                }
                              />
                              <Route path="/showcases" element={<EventShowcases />} />
                              <Route path="/shipping" element={<Shipping />} />
                              <Route path="/returns" element={<Returns />} />
                              <Route path="/privacy" element={<Privacy />} />
                              <Route path="/terms" element={<Terms />} />
                              <Route path="/accept-invite" element={<AcceptInvite />} />
                              <Route path="/coupons" element={<Coupons />} />
                              <Route path="*" element={<NotFound />} />
                            </Route>
                            <Route element={<MinimalLayout />}>
                              <Route path="/checkout" element={<Checkout />} />
                            </Route>
                            <Route
                              path="/admin"
                              element={
                                <ProtectedRoute adminOnly>
                                  <AdminLayout />
                                </ProtectedRoute>
                              }
                            >
                              <Route index element={<AdminDashboard />} />
                              <Route path="drafts" element={<AdminDrafts />} />
                              <Route path="homepage" element={<AdminContent />} />
                              <Route path="products" element={<AdminProducts />} />
                              <Route path="settings" element={<AdminSettings />} />
                              <Route path="config" element={<AdminConfig />} />
                              <Route path="layouts" element={<AdminLayouts />} />
                              <Route path="policies" element={<AdminPolicies />} />
                              <Route path="policies/add" element={<AdminPolicyEditor />} />
                              <Route path="policies/edit/:id" element={<AdminPolicyEditor />} />
                              <Route
                                path="recommendations"
                                element={<AdminRecommendationAnalytics />}
                              />
                              <Route path="products/add" element={<AdminAddProduct />} />
                              <Route path="products/edit/:id" element={<AdminAddProduct />} />
                              <Route path="orders" element={<AdminOrders />} />
                              <Route path="orders/:orderId" element={<AdminOrderDetail />} />
                              <Route path="rentals" element={<AdminRentalOrders />} />
                              <Route path="rental-calendar" element={<AdminRentalCalendar />} />
                              <Route path="rental-policies" element={<AdminRentalPolicies />} />
                              <Route path="service-areas" element={<AdminServiceAreas />} />
                              <Route path="custom-orders" element={<AdminInquiries />} />
                              <Route path="customers" element={<AdminCustomers />} />
                              <Route
                                path="customers/:customerId"
                                element={<AdminCustomerProfile />}
                              />
                              <Route path="gallery" element={<AdminGallery />} />
                              <Route path="gallery/add" element={<AdminAddGalleryItem />} />
                              <Route path="gallery/edit/:id" element={<AdminAddGalleryItem />} />
                              <Route path="categories" element={<AdminCategories />} />
                              <Route path="categories/add" element={<AdminAddCategory />} />
                              <Route path="categories/edit/:id" element={<AdminAddCategory />} />
                              <Route path="events" element={<AdminEvents />} />
                              <Route path="events/add" element={<AdminAddEvent />} />
                              <Route path="events/edit/:id" element={<AdminAddEvent />} />
                              <Route path="showcases/add" element={<AdminAddShowcase />} />
                              <Route path="showcases/edit/:id" element={<AdminAddShowcase />} />
                              <Route path="events/:bookingId" element={<AdminBookingDetail />} />
                              <Route path="analytics" element={<AdminAnalytics />} />
                              <Route path="inventory" element={<AdminInventory />} />
                              <Route path="coupons" element={<AdminCoupons />} />
                              <Route path="coupons/create" element={<AdminCreateCoupon />} />
                              <Route path="coupons/edit/:id" element={<AdminCreateCoupon />} />
                              <Route path="payments" element={<AdminPayments />} />
                              <Route path="notifications" element={<AdminNotifications />} />
                              <Route path="campaigns" element={<AdminCampaigns />} />
                              <Route path="campaigns/add" element={<AdminCampaignCreate />} />
                              <Route
                                path="campaigns/templates/add"
                                element={<AdminTemplateCreate />}
                              />
                              <Route
                                path="campaigns/templates/edit/:id"
                                element={<AdminTemplateCreate />}
                              />
                              <Route path="content" element={<AdminContent />} />
                              <Route path="team" element={<AdminTeam />} />
                              <Route path="system-users" element={<AdminSystemUsers />} />
                              <Route path="reviews" element={<AdminReviews />} />
                            </Route>
                          </Routes>
                        </Suspense>
                      </ErrorBoundary>
                    </Router>
                  </UserSocketProvider>
                </WishlistProvider>
              </CartProvider>
            </AuthProvider>
          </HelmetProvider>
        </ConfigProvider>
      </NetworkProvider>
    </QueryClientProvider>
  );
}

export default App;
