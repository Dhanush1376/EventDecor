import React, { Suspense } from 'react';
import { lazyWithRetry as lazy } from '../utils/performance/lazyWithRetry';
import { Routes, Route, useLocation, Navigate, useParams } from 'react-router-dom';
import { logRouteDiagnostic } from '../utils/core/diagnostics';
import { RouteSkeleton, getRouteSkeletonVariant } from '../components/ui/RouteSkeleton';
import { MainLayout, MinimalLayout } from '../layouts/MainLayout';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';
import { NavigationOrchestrator } from '../components/ui/NavigationOrchestrator';
import { ScrollManager } from '../components/ui/ScrollManager';
import { MaintenanceGate } from '../components/ui/MaintenanceGate';
import { MaintenanceBanner } from '../components/MaintenanceBanner';
import { GlobalToaster } from '../components/ui/GlobalToaster';

const GlobalTracker = lazy(() =>
  import('../components/ui/GlobalTracker').then((m) => ({ default: m.GlobalTracker })),
);
const PwaUpdatePrompt = lazy(() =>
  import('../components/ui/PwaUpdatePrompt').then((m) => ({ default: m.PwaUpdatePrompt })),
);

function AppRouteFallback() {
  const location = useLocation();
  const variant = getRouteSkeletonVariant(location.pathname);
  return <RouteSkeleton variant={variant} />;
}

function RedirectToCustomOrder() {
  const { productId } = useParams();
  return <Navigate to={`/custom-orders?product=${productId}`} replace />;
}

const RouteDiagnostics = React.memo(function RouteDiagnostics() {
  const location = useLocation();
  React.useEffect(() => {
    logRouteDiagnostic(location.pathname);
  }, [location.pathname]);
  return null;
});

// Lazy load pages for performance optimization
const Home = lazy(() => import('../pages/Home/Home').then((m) => ({ default: m.Home })));
const ProductListing = lazy(() =>
  import('../pages/ProductListing').then((m) => ({ default: m.ProductListing })),
);
const ProductDetails = lazy(() =>
  import('../pages/ProductDetails').then((m) => ({ default: m.ProductDetails })),
);
const ProductAllReviews = lazy(() =>
  import('../pages/ProductAllReviews').then((m) => ({ default: m.ProductAllReviews })),
);
const ProductReviewImages = lazy(() =>
  import('../pages/ProductReviewImages').then((m) => ({ default: m.ProductReviewImages })),
);
const Cart = lazy(() => import('../pages/Cart').then((m) => ({ default: m.Cart })));
const Checkout = lazy(() => import('../pages/Checkout').then((m) => ({ default: m.Checkout })));
const OrderSuccess = lazy(() =>
  import('../pages/OrderSuccess').then((m) => ({ default: m.OrderSuccess })),
);
const About = lazy(() => import('../pages/About').then((m) => ({ default: m.About })));
const CustomOrders = lazy(() =>
  import('../pages/CustomOrders').then((m) => ({ default: m.CustomOrders })),
);

const MyCustomOrders = lazy(() =>
  import('../pages/MyCustomOrders').then((m) => ({ default: m.MyCustomOrders })),
);
const Gallery = lazy(() => import('../pages/Gallery').then((m) => ({ default: m.Gallery })));
const GalleryDetail = lazy(() =>
  import('../pages/GalleryDetail').then((m) => ({ default: m.GalleryDetail })),
);
const Contact = lazy(() => import('../pages/Contact').then((m) => ({ default: m.Contact })));
const Wishlist = lazy(() => import('../pages/Wishlist').then((m) => ({ default: m.Wishlist })));
const CollectionDetail = lazy(() =>
  import('../pages/CollectionDetail').then((m) => ({ default: m.CollectionDetail })),
);
const Dashboard = lazy(() => import('../pages/Dashboard').then((m) => ({ default: m.Dashboard })));
const OrderTrackingPublic = lazy(() =>
  import('../pages/OrderTrackingPublic').then((m) => ({ default: m.OrderTrackingPublic })),
);
const EventCollections = lazy(() =>
  import('../pages/EventCollections').then((m) => ({ default: m.EventCollections })),
);
const EventDetail = lazy(() =>
  import('../pages/EventDetail').then((m) => ({ default: m.EventDetail })),
);
const EventBookingWizard = lazy(() =>
  import('../pages/EventBookingWizard').then((m) => ({ default: m.EventBookingWizard })),
);
const EventBookingSuccess = lazy(() =>
  import('../pages/EventBookingSuccess').then((m) => ({ default: m.EventBookingSuccess })),
);
const EventCustomerDashboard = lazy(() =>
  import('../pages/EventCustomerDashboard').then((m) => ({ default: m.EventCustomerDashboard })),
);
const EventShowcases = lazy(() =>
  import('../pages/EventShowcases').then((m) => ({ default: m.EventShowcases })),
);
const GenericPolicyPage = lazy(() =>
  import('../pages/GenericPolicyPage').then((m) => ({ default: m.GenericPolicyPage })),
);
const AcceptInvite = lazy(() =>
  import('../pages/AcceptInvite').then((m) => ({ default: m.AcceptInvite })),
);
const NotFound = lazy(() => import('../pages/NotFound').then((m) => ({ default: m.NotFound })));
const BlogListing = lazy(() =>
  import('../pages/BlogListing').then((m) => ({ default: m.BlogListing })),
);
const BlogPost = lazy(() => import('../pages/BlogPost').then((m) => ({ default: m.BlogPost })));
const LocationLanding = lazy(() =>
  import('../pages/LocationLanding').then((m) => ({ default: m.LocationLanding })),
);
const Coupons = lazy(() => import('../pages/Coupons').then((m) => ({ default: m.Coupons })));

// ─── Admin Portal (Lazy Loaded) ───
const AdminLayout = lazy(() =>
  import('../admin/layouts/AdminLayout').then((m) => ({ default: m.AdminLayout })),
);
const AdminDrafts = lazy(() =>
  import('../admin/pages/AdminDrafts').then((m) => ({ default: m.AdminDrafts })),
);
const AdminDashboard = lazy(() =>
  import('../admin/pages/AdminDashboard').then((m) => ({ default: m.AdminDashboard })),
);
const AdminEnterpriseSearch = lazy(() =>
  import('../admin/pages/AdminEnterpriseSearch').then((m) => ({ default: m.default })),
);
const AdminProducts = lazy(() =>
  import('../admin/pages/AdminProducts').then((m) => ({ default: m.AdminProducts })),
);
const AdminAddProduct = lazy(() =>
  import('../admin/pages/AdminAddProduct').then((m) => ({ default: m.AdminAddProduct })),
);
const AdminOrdersHub = lazy(() =>
  import('../admin/pages/AdminOrdersHub').then((m) => ({ default: m.default })),
);
const AdminOrders = lazy(() =>
  import('../admin/pages/AdminOrders').then((m) => ({ default: m.AdminOrders })),
);
const AdminOrderDetail = lazy(() =>
  import('../admin/pages/AdminOrderDetail').then((m) => ({ default: m.AdminOrderDetail })),
);
const AdminReturnsHub = lazy(() => import('../admin/pages/returns/AdminReturnsHub'));
const AdminReturnDetail = lazy(() =>
  import('../admin/pages/returns/AdminReturnDetail').then((m) => ({
    default: m.default || m.AdminReturnDetail,
  })),
);
const AdminExchangeHub = lazy(() =>
  import('../admin/pages/returns/AdminExchangeHub').then((m) => ({ default: m.AdminExchangeHub })),
);
const AdminAddEvent = lazy(() =>
  import('../admin/pages/AdminAddEvent').then((m) => ({ default: m.AdminAddEvent })),
);
const AdminAddShowcase = lazy(() =>
  import('../admin/pages/AdminAddShowcase').then((m) => ({ default: m.AdminAddShowcase })),
);
const AdminInquiries = lazy(() =>
  import('../admin/pages/AdminInquiries').then((m) => ({ default: m.AdminInquiries })),
);
const AdminCustomers = lazy(() =>
  import('../admin/pages/AdminCustomers').then((m) => ({ default: m.AdminCustomers })),
);

const AdminWarehouseHub = lazy(() => import('../admin/pages/AdminWarehouseHub'));
const AdminProductionHub = lazy(() => import('../admin/pages/AdminProductionHub'));
const AdminBusinessRules = lazy(() => import('../admin/pages/AdminBusinessRules'));
const AdminCatalogRegistry = lazy(() => import('../admin/pages/AdminCatalogRegistry'));

const AdminWhatsAppAutomations = lazy(() =>
  import('../admin/pages/AdminWhatsAppAutomations').then((m) => ({
    default: m.AdminWhatsAppAutomations,
  })),
);
const AdminApprovalsQueue = lazy(() => import('../admin/pages/AdminApprovalsQueue'));

const AdminExecutiveDashboard = lazy(() => import('../admin/pages/ExecutiveDashboard'));
// const CustomerProfile360 = lazy(() => import('../admin/pages/CustomerProfile360'));
const AdminGallery = lazy(() =>
  import('../admin/pages/AdminGallery').then((m) => ({ default: m.AdminGallery })),
);
const AdminAddGalleryItem = lazy(() =>
  import('../admin/pages/AdminAddGalleryItem').then((m) => ({ default: m.AdminAddGalleryItem })),
);
const AdminEvents = lazy(() =>
  import('../admin/pages/AdminEvents').then((m) => ({ default: m.AdminEvents })),
);
const AdminBookingDetail = lazy(() =>
  import('../admin/pages/AdminBookingDetail').then((m) => ({ default: m.AdminBookingDetail })),
);
const AdminPolicies = lazy(() =>
  import('../admin/pages/AdminPolicies').then((m) => ({ default: m.AdminPolicies })),
);
const AdminPolicyEditor = lazy(() =>
  import('../admin/pages/AdminPolicyEditor').then((m) => ({ default: m.AdminPolicyEditor })),
);
const AdminRecommendationAnalytics = lazy(() =>
  import('../admin/pages/AdminRecommendationAnalytics').then((m) => ({
    default: m.AdminRecommendationAnalytics,
  })),
);
const AdminAnalytics = lazy(() =>
  import('../admin/pages/AdminAnalytics').then((m) => ({ default: m.AdminAnalytics })),
);
const AdminInventory = lazy(() =>
  import('../admin/pages/AdminInventory').then((m) => ({ default: m.AdminInventory })),
);
const AdminCoupons = lazy(() =>
  import('../admin/pages/AdminCoupons').then((m) => ({ default: m.AdminCoupons })),
);
const AdminRentalsHub = lazy(() =>
  import('../admin/pages/AdminRentalsHub').then((m) => ({ default: m.default })),
);
const AdminRentalPolicies = lazy(() => import('../admin/pages/AdminRentalPolicies'));
const AdminCreateCoupon = lazy(() =>
  import('../admin/pages/AdminCreateCoupon').then((m) => ({ default: m.AdminCreateCoupon })),
);
const AdminPayments = lazy(() =>
  import('../admin/pages/AdminPayments').then((m) => ({ default: m.AdminPayments })),
);
const AdminNotifications = lazy(() =>
  import('../admin/pages/AdminNotifications').then((m) => ({ default: m.AdminNotifications })),
);
const AdminCampaigns = lazy(() =>
  import('../admin/pages/AdminCampaigns').then((m) => ({ default: m.AdminCampaigns })),
);
const CampaignManager = lazy(() => import('../admin/pages/Loyalty/CampaignManager'));
const RuleBuilder = lazy(() => import('../admin/pages/Loyalty/RuleBuilder'));
const AdminContent = lazy(() =>
  import('../admin/pages/AdminContent').then((m) => ({ default: m.AdminContent })),
);
const AdminTeam = lazy(() =>
  import('../admin/pages/AdminTeam').then((m) => ({ default: m.AdminTeam })),
);
const AdminSettings = lazy(() =>
  import('../admin/pages/AdminSettings').then((m) => ({ default: m.AdminSettings })),
);
const AdminCategories = lazy(() =>
  import('../admin/pages/AdminCategories').then((m) => ({ default: m.AdminCategories })),
);
const AdminAddCategory = lazy(() =>
  import('../admin/pages/AdminAddCategory').then((m) => ({ default: m.AdminAddCategory })),
);

const AdminCampaignCreate = lazy(() =>
  import('../admin/pages/AdminCampaignCreate').then((m) => ({ default: m.AdminCampaignCreate })),
);
const AdminTemplateCreate = lazy(() =>
  import('../admin/pages/AdminTemplateCreate').then((m) => ({ default: m.AdminTemplateCreate })),
);

const AdminReviews = lazy(() =>
  import('../admin/pages/AdminReviews').then((m) => ({ default: m.AdminReviews })),
);
const AdminVisualSearch = lazy(() =>
  import('../admin/pages/AdminVisualSearch').then((m) => ({ default: m.AdminVisualSearch })),
);
const AdminAiSettings = lazy(() => import('../admin/pages/AdminAiSettings'));
const AdminServiceAreas = lazy(() => import('../admin/pages/AdminServiceAreas'));
const AdminServiceability = lazy(() => import('../admin/pages/AdminServiceability'));

// Returns & Exchanges (Admin)

const AdminSystemHub = lazy(() =>
  import('../admin/pages/AdminSystemHub').then((m) => ({ default: m.default })),
);

const BackupCenter = lazy(() => import('../admin/pages/BackupCenter/BackupCenter'));

const MaintenanceGateway = lazy(() =>
  import('../admin/pages/MaintenanceGateway').then((m) => ({ default: m.MaintenanceGateway })),
);
const MaintenanceConsole = lazy(() =>
  import('../admin/pages/MaintenanceConsole').then((m) => ({ default: m.MaintenanceConsole })),
);

const AdminRecycleBin = lazy(() =>
  import('../admin/pages/AdminRecycleBin').then((m) => ({ default: m.default })),
);

export function AppRoutes() {
  return (
    <>
      <RouteDiagnostics />
      <NavigationOrchestrator />
      <ScrollManager />
      <MaintenanceBanner />
      <GlobalToaster />

      <Suspense fallback={null}>
        <GlobalTracker />
        <PwaUpdatePrompt />
      </Suspense>
      <ErrorBoundary>
        <Suspense fallback={<AppRouteFallback />}>
          <Routes>
            <Route element={<MaintenanceGate />}>
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
                <Route path="/product/:id/reviews" element={<ProductAllReviews />} />
                <Route path="/product/:id/reviews/images" element={<ProductReviewImages />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/order-success" element={<OrderSuccess />} />
                <Route path="/about" element={<About />} />
                <Route path="/custom-orders" element={<CustomOrders />} />
                <Route path="/customize/:productId" element={<RedirectToCustomOrder />} />
                <Route
                  path="/my-custom-orders"
                  element={<Navigate to="/dashboard/custom-orders" replace />}
                />
                <Route path="/gallery" element={<Gallery />} />
                <Route path="/gallery/:id" element={<GalleryDetail />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/wishlist" element={<Wishlist />} />
                <Route path="/collection/:id" element={<CollectionDetail />} />
                <Route
                  path="/dashboard/*"
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
                <Route path="/booking-success/:id" element={<EventBookingSuccess />} />
                <Route
                  path="/events/dashboard"
                  element={
                    <ProtectedRoute>
                      <EventCustomerDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route path="/showcases" element={<EventShowcases />} />
                <Route path="/policy/:slug" element={<GenericPolicyPage />} />
                {/* Legacy routes redirect to dynamic paths */}
                <Route
                  path="/shipping"
                  element={<Navigate to="/policy/shipping-policy" replace />}
                />
                <Route path="/returns" element={<Navigate to="/policy/return-policy" replace />} />
                <Route
                  path="/exchange"
                  element={<Navigate to="/policy/exchange-policy" replace />}
                />
                <Route path="/refund" element={<Navigate to="/policy/refund-policy" replace />} />
                <Route
                  path="/cancellation"
                  element={<Navigate to="/policy/cancellation-policy" replace />}
                />
                <Route path="/privacy" element={<Navigate to="/policy/privacy-policy" replace />} />
                <Route
                  path="/terms"
                  element={<Navigate to="/policy/terms-and-conditions" replace />}
                />
                <Route path="/accept-invite" element={<AcceptInvite />} />
                <Route path="/coupons" element={<Coupons />} />
                <Route path="*" element={<NotFound />} />
              </Route>
              <Route element={<MinimalLayout />}>
                <Route path="/checkout" element={<Checkout />} />
              </Route>
            </Route>

            {/* Maintenance Gateway / Console (Unprotected by normal JWT, protected by its own session logic) */}
            <Route path="/admin/maintenance-gateway" element={<MaintenanceGateway />} />
            <Route path="/admin/maintenance-console" element={<MaintenanceConsole />} />

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
              <Route path="catalog-registry" element={<AdminCatalogRegistry />} />
              <Route path="inventory" element={<AdminInventory />} />
              <Route path="settings" element={<AdminSettings />} />

              <Route path="policies" element={<AdminPolicies />} />
              <Route path="policies/add" element={<AdminPolicyEditor />} />
              <Route path="policies/edit/:id" element={<AdminPolicyEditor />} />
              <Route path="products/add" element={<AdminAddProduct />} />
              <Route path="products/edit/:id" element={<AdminAddProduct />} />
              <Route path="orders/*" element={<AdminOrdersHub />} />
              <Route path="orders/:orderId" element={<AdminOrderDetail />} />
              <Route path="rentals/*" element={<AdminRentalsHub />} />
              <Route path="rental-policies" element={<AdminRentalPolicies />} />
              <Route path="service-areas" element={<AdminServiceAreas />} />
              <Route path="serviceability" element={<AdminServiceability />} />
              <Route path="custom-orders" element={<AdminInquiries />} />
              <Route path="customers" element={<AdminCustomers />} />
              <Route path="executive" element={<AdminExecutiveDashboard />} />

              {/* <Route path="customers/:customerId" element={<CustomerProfile360 />} /> */}
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
              <Route path="search" element={<AdminEnterpriseSearch />} />
              <Route path="analytics" element={<AdminAnalytics />} />
              <Route path="analytics/operations" element={<AdminRecommendationAnalytics />} />
              <Route path="ai-settings" element={<AdminAiSettings />} />
              <Route
                path="maintenance"
                element={<Navigate to="/admin/maintenance-console" replace />}
              />
              <Route path="backup" element={<Navigate to="/admin/backup-center" replace />} />
              <Route path="whatsapp-automations" element={<AdminWhatsAppAutomations />} />
              <Route path="coupons" element={<AdminCoupons />} />
              <Route path="coupons/create" element={<AdminCreateCoupon />} />
              <Route path="coupons/edit/:id" element={<AdminCreateCoupon />} />
              <Route path="payments" element={<AdminPayments />} />

              <Route path="notifications" element={<AdminNotifications />} />
              <Route path="campaigns" element={<AdminCampaigns />} />
              <Route path="reward-campaigns" element={<CampaignManager />} />
              <Route path="reward-campaigns/:campaignId/rules" element={<RuleBuilder />} />
              <Route path="campaigns/add" element={<AdminCampaignCreate />} />
              <Route path="campaigns/templates/add" element={<AdminTemplateCreate />} />
              <Route path="campaigns/templates/edit/:id" element={<AdminTemplateCreate />} />
              <Route path="content" element={<AdminContent />} />
              <Route path="team" element={<AdminTeam />} />

              <Route path="reviews" element={<AdminReviews />} />
              <Route path="visual-search" element={<AdminVisualSearch />} />

              {/* Warehouse Routes */}
              <Route path="warehouse" element={<AdminWarehouseHub />} />
              <Route path="warehouse/receive" element={<AdminWarehouseHub />} />
              <Route path="warehouse/pick" element={<AdminWarehouseHub />} />
              <Route path="warehouse/pack" element={<AdminWarehouseHub />} />
              <Route path="warehouse/dispatch" element={<AdminWarehouseHub />} />
              <Route path="warehouse/count" element={<AdminWarehouseHub />} />

              {/* Production Routes */}
              <Route path="production" element={<AdminProductionHub />} />
              <Route path="production/qa" element={<AdminProductionHub />} />
              <Route path="production/ready" element={<AdminProductionHub />} />

              {/* Operations Routes */}
              <Route path="rules" element={<AdminBusinessRules />} />
              <Route path="approvals" element={<AdminApprovalsQueue />} />

              {/* System Routes */}
              <Route path="system" element={<AdminSystemHub />} />
              <Route path="system/users" element={<AdminSystemHub />} />
              <Route path="system/roles" element={<AdminSystemHub />} />
              <Route path="system/notifications" element={<AdminSystemHub />} />
              <Route path="system/settings" element={<AdminSystemHub />} />
              <Route path="system/audit" element={<AdminSystemHub />} />

              <Route path="recycle-bin" element={<AdminRecycleBin />} />

              <Route path="returns" element={<AdminReturnsHub />} />
              <Route path="returns/requests/:id" element={<AdminReturnDetail />} />
              <Route path="exchanges" element={<AdminExchangeHub />} />

              <Route path="enterprise-search" element={<AdminEnterpriseSearch />} />

              <Route path="backup-center/*" element={<BackupCenter />} />
            </Route>
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </>
  );
}
