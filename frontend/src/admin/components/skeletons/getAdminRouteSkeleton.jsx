import React from 'react';
import {
  AdminDashboardSkeleton,
  AdminProductsSkeleton,
  AdminProductWizardSkeleton,
  AdminOrdersSkeleton,
  AdminOrderDetailSkeleton,
  AdminRentalsSkeleton,
  AdminRentalDetailSkeleton,
  AdminRentalPoliciesSkeleton,
  AdminCustomOrdersSkeleton,
  AdminCustomersSkeleton,
  AdminEventsSkeleton,
  AdminBookingDetailSkeleton,
  AdminAddEventSkeleton,
  AdminAddShowcaseSkeleton,
  AdminGallerySkeleton,
  AdminAddGallerySkeleton,
  AdminCategoriesSkeleton,
  AdminPoliciesSkeleton,
  AdminInventorySkeleton,
  AdminCatalogRegistrySkeleton,
  AdminAnalyticsSkeleton,
  AdminPaymentsSkeleton,
  AdminNotificationsSkeleton,
  AdminCouponsSkeleton,
  AdminCreateCouponSkeleton,
  AdminContentSkeleton,
  AdminTeamSkeleton,
  AdminSettingsSkeleton,
  AdminReviewsSkeleton,
  AdminReturnsHubSkeleton,
  AdminReturnDetailSkeleton,
  AdminRecycleBinSkeleton,
  AdminServiceAreasSkeleton,
  AdminServiceabilitySkeleton,
  AdminDraftsSkeleton,
  AdminEnterpriseSearchSkeleton,
  AdminExecutiveDashboardSkeleton,
  AdminMaintenanceConsoleSkeleton,
  AdminBackupCenterSkeleton,
  AdminRecommendationAnalyticsSkeleton,
} from './pages';

/**
 * Route-aware skeleton resolver for the admin panel.
 * Inspects any pathname and returns the exact matching wireframe skeleton
 * mirroring the page about to load.
 *
 * @param {string} pathname
 * @returns {React.ReactElement}
 */
export function getAdminRouteSkeleton(pathname = '') {
  const cleanPath = (pathname || '').split('?')[0].replace(/\/+$/, '');

  // 1. Dashboard & Root
  if (cleanPath === '/admin' || cleanPath === '') {
    return <AdminDashboardSkeleton />;
  }

  // 2. Drafts
  if (cleanPath === '/admin/drafts') {
    return <AdminDraftsSkeleton />;
  }

  // 3. Homepage & Content Management
  if (cleanPath === '/admin/homepage' || cleanPath === '/admin/content') {
    return <AdminContentSkeleton />;
  }

  // 4. Products & Catalog
  if (cleanPath === '/admin/products/add' || cleanPath.startsWith('/admin/products/edit/')) {
    return <AdminProductWizardSkeleton />;
  }
  if (cleanPath === '/admin/products') {
    return <AdminProductsSkeleton />;
  }
  if (cleanPath === '/admin/catalog-registry') {
    return <AdminCatalogRegistrySkeleton />;
  }
  if (cleanPath === '/admin/inventory') {
    return <AdminInventorySkeleton />;
  }

  // 5. Settings
  if (cleanPath === '/admin/settings') {
    return <AdminSettingsSkeleton />;
  }

  // 6. Policies
  if (cleanPath.startsWith('/admin/policies')) {
    return <AdminPoliciesSkeleton />;
  }

  // 7. Orders & Order Details
  if (cleanPath.match(/^\/admin\/orders\/[^/]+$/) && !cleanPath.endsWith('/all')) {
    return <AdminOrderDetailSkeleton />;
  }
  if (cleanPath.startsWith('/admin/orders')) {
    return <AdminOrdersSkeleton />;
  }

  // 8. Rentals
  if (cleanPath.startsWith('/admin/rentals/detail/')) {
    return <AdminRentalDetailSkeleton />;
  }
  if (cleanPath === '/admin/rental-policies') {
    return <AdminRentalPoliciesSkeleton />;
  }
  if (cleanPath.startsWith('/admin/rentals')) {
    return <AdminRentalsSkeleton />;
  }

  // 9. Service Areas & Serviceability
  if (cleanPath === '/admin/service-areas') {
    return <AdminServiceAreasSkeleton />;
  }
  if (cleanPath === '/admin/serviceability') {
    return <AdminServiceabilitySkeleton />;
  }

  // 10. Custom Orders & Inquiries
  if (cleanPath === '/admin/custom-orders') {
    return <AdminCustomOrdersSkeleton />;
  }

  // 11. Customers
  if (cleanPath === '/admin/customers') {
    return <AdminCustomersSkeleton />;
  }

  // 12. Executive Summary
  if (cleanPath === '/admin/executive') {
    return <AdminExecutiveDashboardSkeleton />;
  }

  // 13. Gallery
  if (cleanPath === '/admin/gallery/add' || cleanPath.startsWith('/admin/gallery/edit/')) {
    return <AdminAddGallerySkeleton />;
  }
  if (cleanPath === '/admin/gallery') {
    return <AdminGallerySkeleton />;
  }

  // 14. Categories
  if (cleanPath.startsWith('/admin/categories')) {
    return <AdminCategoriesSkeleton />;
  }

  // 15. Events, Showcases & Bookings
  if (cleanPath === '/admin/events/add' || cleanPath.startsWith('/admin/events/edit/')) {
    return <AdminAddEventSkeleton />;
  }
  if (cleanPath === '/admin/showcases/add' || cleanPath.startsWith('/admin/showcases/edit/')) {
    return <AdminAddShowcaseSkeleton />;
  }
  if (cleanPath.match(/^\/admin\/events\/[^/]+$/)) {
    return <AdminBookingDetailSkeleton />;
  }
  if (cleanPath.startsWith('/admin/events')) {
    return <AdminEventsSkeleton />;
  }

  // 16. Search
  if (cleanPath === '/admin/search' || cleanPath === '/admin/enterprise-search') {
    return <AdminEnterpriseSearchSkeleton />;
  }

  // 17. Analytics
  if (cleanPath === '/admin/analytics/operations') {
    return <AdminRecommendationAnalyticsSkeleton />;
  }
  if (cleanPath === '/admin/analytics') {
    return <AdminAnalyticsSkeleton />;
  }

  // 18. Coupons
  if (cleanPath === '/admin/coupons/create' || cleanPath.startsWith('/admin/coupons/edit/')) {
    return <AdminCreateCouponSkeleton />;
  }
  if (cleanPath === '/admin/coupons') {
    return <AdminCouponsSkeleton />;
  }

  // 19. Payments
  if (cleanPath === '/admin/payments') {
    return <AdminPaymentsSkeleton />;
  }

  // 20. Notifications
  if (cleanPath === '/admin/notifications') {
    return <AdminNotificationsSkeleton />;
  }

  // 22. Team
  if (cleanPath === '/admin/team') {
    return <AdminTeamSkeleton />;
  }

  // 23. Reviews
  if (cleanPath === '/admin/reviews') {
    return <AdminReviewsSkeleton />;
  }

  // 27. System Hub
  if (cleanPath.startsWith('/admin/system')) {
    return <AdminCatalogRegistrySkeleton />;
  }

  // 28. Recycle Bin & Trash
  if (
    cleanPath === '/admin/recycle-bin' ||
    cleanPath === '/admin/trash' ||
    cleanPath.endsWith('/trash') ||
    cleanPath.endsWith('/recycle-bin')
  ) {
    return <AdminRecycleBinSkeleton />;
  }

  // 29. Returns & Exchanges
  if (
    cleanPath.startsWith('/admin/returns/requests/') ||
    cleanPath.match(/^\/admin\/returns\/[^/]+$/) ||
    cleanPath.startsWith('/admin/exchanges/requests/') ||
    cleanPath.match(/^\/admin\/exchanges\/[^/]+$/)
  ) {
    return <AdminReturnDetailSkeleton />;
  }
  if (cleanPath === '/admin/returns' || cleanPath === '/admin/exchanges') {
    return <AdminReturnsHubSkeleton />;
  }

  // 30. Backup Center
  if (cleanPath.startsWith('/admin/backup-center') || cleanPath === '/admin/backup') {
    return <AdminBackupCenterSkeleton />;
  }

  // 31. Maintenance
  if (
    cleanPath === '/admin/maintenance' ||
    cleanPath === '/admin/maintenance-console' ||
    cleanPath === '/admin/maintenance-gateway'
  ) {
    return <AdminMaintenanceConsoleSkeleton />;
  }

  // Default fallback for any unspecified admin path
  return <AdminDashboardSkeleton />;
}

export default getAdminRouteSkeleton;
