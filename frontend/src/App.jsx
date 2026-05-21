import React, { lazy, Suspense, useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "react-hot-toast";

import { SplashScreen } from "./components/ui/SplashScreen";
import { CartProvider } from "./context/CartContext";
import { WishlistProvider } from "./context/WishlistContext";
import { AuthProvider } from "./context/AuthContext";
import { MainLayout, MinimalLayout } from "./layouts/MainLayout";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { ErrorBoundary } from "./components/ui/ErrorBoundary";
import { NetworkProvider } from "./context/NetworkContext";
import { NoInternetOverlay } from "./components/ui/NoInternetOverlay";
import { safeSessionStorage } from "./utils/storage";

// Lazy load heavy auth modal to remove it from initial load bundle
const AuthModal = lazy(() => import("./components/auth/AuthModal").then((m) => ({ default: m.AuthModal })));

// Lazy load pages for performance optimization
const Home = lazy(() => import("./pages/Home").then((m) => ({ default: m.Home })));
const ProductListing = lazy(() => import("./pages/ProductListing").then((m) => ({ default: m.ProductListing })));
const ProductDetails = lazy(() => import("./pages/ProductDetails").then((m) => ({ default: m.ProductDetails })));
const Cart = lazy(() => import("./pages/Cart").then((m) => ({ default: m.Cart })));
const Checkout = lazy(() => import("./pages/Checkout").then((m) => ({ default: m.Checkout })));
const OrderSuccess = lazy(() => import("./pages/OrderSuccess").then((m) => ({ default: m.OrderSuccess })));
const About = lazy(() => import("./pages/About").then((m) => ({ default: m.About })));
const CustomOrders = lazy(() => import("./pages/CustomOrders").then((m) => ({ default: m.CustomOrders })));
const Gallery = lazy(() => import("./pages/Gallery").then((m) => ({ default: m.Gallery })));
const GalleryDetail = lazy(() => import("./pages/GalleryDetail").then((m) => ({ default: m.GalleryDetail })));
const Contact = lazy(() => import("./pages/Contact").then((m) => ({ default: m.Contact })));
const Wishlist = lazy(() => import("./pages/Wishlist").then((m) => ({ default: m.Wishlist })));
const CollectionDetail = lazy(() => import("./pages/CollectionDetail").then((m) => ({ default: m.CollectionDetail })));
const Dashboard = lazy(() => import("./pages/Dashboard").then((m) => ({ default: m.Dashboard })));
const OrderTrackingPublic = lazy(() => import("./pages/OrderTrackingPublic").then((m) => ({ default: m.OrderTrackingPublic })));
const EventCollections = lazy(() => import("./pages/EventCollections").then((m) => ({ default: m.EventCollections })));
const EventDetail = lazy(() => import("./pages/EventDetail").then((m) => ({ default: m.EventDetail })));
const EventBookingWizard = lazy(() => import("./pages/EventBookingWizard").then((m) => ({ default: m.EventBookingWizard })));
const EventCustomerDashboard = lazy(() => import("./pages/EventCustomerDashboard").then((m) => ({ default: m.EventCustomerDashboard })));
const EventShowcases = lazy(() => import("./pages/EventShowcases").then((m) => ({ default: m.EventShowcases })));
const Shipping = lazy(() => import("./pages/Shipping").then((m) => ({ default: m.Shipping })));
const Returns = lazy(() => import("./pages/Returns").then((m) => ({ default: m.Returns })));
const Privacy = lazy(() => import("./pages/Privacy").then((m) => ({ default: m.Privacy })));
const Terms = lazy(() => import("./pages/Terms").then((m) => ({ default: m.Terms })));
const Auth = lazy(() => import("./pages/Auth").then((m) => ({ default: m.Auth })));
const AcceptInvite = lazy(() => import("./pages/AcceptInvite").then((m) => ({ default: m.AcceptInvite })));
const NotFound = lazy(() => import("./pages/NotFound").then((m) => ({ default: m.NotFound })));

// ─── Admin Portal (Lazy Loaded) ───
const AdminLayout = lazy(() => import("./admin/layouts/AdminLayout").then((m) => ({ default: m.AdminLayout })));
const AdminDashboard = lazy(() => import("./admin/pages/AdminDashboard").then((m) => ({ default: m.AdminDashboard })));
const AdminProducts = lazy(() => import("./admin/pages/AdminProducts").then((m) => ({ default: m.AdminProducts })));
const AdminAddProduct = lazy(() => import("./admin/pages/AdminAddProduct").then((m) => ({ default: m.AdminAddProduct })));
const AdminOrders = lazy(() => import("./admin/pages/AdminOrders").then((m) => ({ default: m.AdminOrders })));
const AdminOrderDetail = lazy(() => import("./admin/pages/AdminOrderDetail").then((m) => ({ default: m.AdminOrderDetail })));
const AdminInquiries = lazy(() => import("./admin/pages/AdminInquiries").then((m) => ({ default: m.AdminInquiries })));
const AdminCustomers = lazy(() => import("./admin/pages/AdminCustomers").then((m) => ({ default: m.AdminCustomers })));
const AdminCustomerProfile = lazy(() => import("./admin/pages/AdminCustomerProfile").then((m) => ({ default: m.AdminCustomerProfile })));
const AdminGallery = lazy(() => import("./admin/pages/AdminGallery").then((m) => ({ default: m.AdminGallery })));
const AdminEvents = lazy(() => import("./admin/pages/AdminEvents").then((m) => ({ default: m.AdminEvents })));
const AdminBookingDetail = lazy(() => import("./admin/pages/AdminBookingDetail").then((m) => ({ default: m.AdminBookingDetail })));
const AdminReviews = lazy(() => import("./admin/pages/AdminReviews").then((m) => ({ default: m.AdminReviews })));
const AdminAnalytics = lazy(() => import("./admin/pages/AdminAnalytics").then((m) => ({ default: m.AdminAnalytics })));
const AdminInventory = lazy(() => import("./admin/pages/AdminInventory").then((m) => ({ default: m.AdminInventory })));
const AdminCoupons = lazy(() => import("./admin/pages/AdminCoupons").then((m) => ({ default: m.AdminCoupons })));
const AdminCreateCoupon = lazy(() => import("./admin/pages/AdminCreateCoupon").then((m) => ({ default: m.AdminCreateCoupon })));
const AdminPayments = lazy(() => import("./admin/pages/AdminPayments").then((m) => ({ default: m.AdminPayments })));
const AdminNotifications = lazy(() => import("./admin/pages/AdminNotifications").then((m) => ({ default: m.AdminNotifications })));
const AdminCampaigns = lazy(() => import("./admin/pages/AdminCampaigns").then((m) => ({ default: m.AdminCampaigns })));
const AdminContent = lazy(() => import("./admin/pages/AdminContent").then((m) => ({ default: m.AdminContent })));
const AdminTeam = lazy(() => import("./admin/pages/AdminTeam").then((m) => ({ default: m.AdminTeam })));
const AdminSettings = lazy(() => import("./admin/pages/AdminSettings").then((m) => ({ default: m.AdminSettings })));

const PageLoader = () => (
  <div className="fixed inset-0 z-[9999] bg-white/10 backdrop-blur-xl flex flex-col items-center justify-center">
    <div className="relative flex items-center justify-center w-24 h-24 mb-6">
      <div className="absolute inset-0 border border-primary/20 rounded-full animate-[spin_4s_linear_infinite]" />
      <div className="absolute inset-2 bg-primary/5 rounded-full animate-pulse blur-xl" />
      <div className="absolute inset-3 border border-primary/40 border-t-transparent border-b-transparent rounded-full animate-[spin_2s_linear_infinite]" />
      <span className="font-display text-3xl text-primary font-light tracking-[0.2em]">S</span>
    </div>
    <div className="space-y-2 text-center">
      <span className="font-label-sm text-[10px] uppercase tracking-[0.4em] text-primary font-bold block animate-pulse">Loading Studio</span>
      <div className="w-12 h-[1px] bg-primary/20 mx-auto" />
    </div>
  </div>
);

const AdminLoader = () => (
  <div className="min-h-screen bg-stone-50 flex items-center justify-center">
    <div className="flex flex-col items-center gap-3">
      <div className="w-10 h-10 border-2 border-black/10 border-t-black rounded-full animate-spin" />
      <span className="text-[10px] text-stone-500 font-label uppercase tracking-widest font-bold">Loading Admin</span>
    </div>
  </div>
);

function App() {
  const [showSplash, setShowSplash] = useState(() => {
    return !safeSessionStorage.getItem("siri_splash_shown");
  });

  const handleSplashComplete = () => {
    setShowSplash(false);
    safeSessionStorage.setItem("siri_splash_shown", "true");
  };

  return (
    <NetworkProvider>
      <div style={{
        position: "fixed",
        top: 10,
        left: 10,
        zIndex: 999999,
        background: "red",
        color: "white",
        padding: "10px"
      }}>
        VERSION 9
      </div>
      <HelmetProvider>
        <AuthProvider>
          <CartProvider>
            <WishlistProvider>
              <Toaster position="bottom-right" toastOptions={{ duration: 4000, style: { background: '#333', color: '#fff', fontSize: '14px' } }} />
              <NoInternetOverlay />
              <AnimatePresence>
                {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
              </AnimatePresence>
              <Suspense fallback={null}>
                <AuthModal />
              </Suspense>
              <Router>
                <ErrorBoundary>
                  <Suspense fallback={<PageLoader />}>
                    <Routes>
                      <Route element={<MainLayout />}>
                        <Route path="/" element={<Home />} />
                        <Route path="/collections" element={<ProductListing />} />
                        <Route path="/product/:id" element={<ProductDetails />} />
                        <Route path="/cart" element={<Cart />} />
                        <Route path="/order-success" element={<OrderSuccess />} />
                        <Route path="/about" element={<About />} />
                        <Route path="/custom-orders" element={<CustomOrders />} />
                        <Route path="/gallery" element={<Gallery />} />
                        <Route path="/gallery/:id" element={<GalleryDetail />} />
                        <Route path="/contact" element={<Contact />} />
                        <Route path="/wishlist" element={<Wishlist />} />
                        <Route path="/collection/:id" element={<CollectionDetail />} />
                        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                        <Route path="/track/:orderId" element={<OrderTrackingPublic />} />
                        <Route path="/events" element={<EventShowcases />} />
                        <Route path="/events/collections" element={<EventCollections />} />
                        <Route path="/events/:id" element={<EventDetail />} />
                        <Route path="/events/book" element={<EventBookingWizard />} />
                        <Route path="/events/dashboard" element={<ProtectedRoute><EventCustomerDashboard /></ProtectedRoute>} />
                        <Route path="/showcases" element={<EventShowcases />} />
                         <Route path="/shipping" element={<Shipping />} />
                        <Route path="/returns" element={<Returns />} />
                        <Route path="/privacy" element={<Privacy />} />
                        <Route path="/terms" element={<Terms />} />
                        <Route path="/auth" element={<Auth />} />
                        <Route path="/accept-invite" element={<AcceptInvite />} />
                        <Route path="*" element={<NotFound />} />
                      </Route>
                      <Route element={<MinimalLayout />}>
                        <Route path="/checkout" element={<Checkout />} />
                      </Route>
                      <Route path="/admin" element={<ProtectedRoute adminOnly><Suspense fallback={<AdminLoader />}><AdminLayout /></Suspense></ProtectedRoute>}>
                        <Route index element={<AdminDashboard />} />
                        <Route path="homepage" element={<AdminContent />} />
                        <Route path="products" element={<AdminProducts />} />
                        <Route path="products/add" element={<AdminAddProduct />} />
                        <Route path="products/edit/:id" element={<AdminAddProduct />} />
                        <Route path="orders" element={<AdminOrders />} />
                        <Route path="orders/:orderId" element={<AdminOrderDetail />} />
                        <Route path="custom-orders" element={<AdminInquiries />} />
                        <Route path="customers" element={<AdminCustomers />} />
                        <Route path="customers/:customerId" element={<AdminCustomerProfile />} />
                        <Route path="gallery" element={<AdminGallery />} />
                        <Route path="events" element={<AdminEvents />} />
                        <Route path="events/:bookingId" element={<AdminBookingDetail />} />
                        <Route path="reviews" element={<AdminReviews />} />
                        <Route path="analytics" element={<AdminAnalytics />} />
                        <Route path="inventory" element={<AdminInventory />} />
                        <Route path="coupons" element={<AdminCoupons />} />
                        <Route path="coupons/create" element={<AdminCreateCoupon />} />
                        <Route path="coupons/edit/:id" element={<AdminCreateCoupon />} />
                        <Route path="payments" element={<AdminPayments />} />
                        <Route path="notifications" element={<AdminNotifications />} />
                        <Route path="campaigns" element={<AdminCampaigns />} />
                        <Route path="content" element={<AdminContent />} />
                        <Route path="team" element={<AdminTeam />} />
                        <Route path="settings" element={<AdminSettings />} />
                      </Route>
                    </Routes>
                  </Suspense>
                </ErrorBoundary>
              </Router>
            </WishlistProvider>
          </CartProvider>
        </AuthProvider>
      </HelmetProvider>
    </NetworkProvider>
  );
}

export default App;
