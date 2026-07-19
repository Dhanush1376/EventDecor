import express, { Application, Router, Request, Response, NextFunction } from 'express';
import { attachApiVersion, ApiVersionTag } from '../middleware/apiVersion';
import { noCacheMiddleware } from '../middleware/noCacheMiddleware';

/**
 * Lazy Router wrapper that defers importing route files
 * until the first HTTP request hits the route prefix using CommonJS require.
 */
const lazyRouter = (modulePath: string) => {
  let routerInstance: Router | null = null;
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!routerInstance) {
        const module = require(modulePath);
        routerInstance = module.default || module;
      }
      if (routerInstance) {
        routerInstance(req, res, next);
      } else {
        next(new Error(`Failed to load route module at ${modulePath}`));
      }
    } catch (err) {
      next(err);
    }
  };
};

/**
 * Mount all API routers under a prefix.
 * @param apiVersion — `v1` for `/api/v1` (stable contract); `legacy` for deprecated `/api` alias.
 */
export const registerApiRoutes = (
  app: Application,
  prefix: string,
  apiVersion: ApiVersionTag = 'v1',
): void => {
  const apiRouter = express.Router();
  apiRouter.use(attachApiVersion(apiVersion));

  apiRouter.use('/products', lazyRouter('./products/productRoutes'));
  apiRouter.use('/ai', lazyRouter('./ai/aiRoutes'));
  apiRouter.use('/upload', lazyRouter('./media/uploadRoutes'));
  apiRouter.use('/auth', noCacheMiddleware, lazyRouter('./auth/authRoutes'));
  apiRouter.use('/events', lazyRouter('./events/eventRoutes'));
  apiRouter.use('/orders', noCacheMiddleware, lazyRouter('./commerce/orderRoutes'));
  apiRouter.use('/cms', lazyRouter('./cms/cmsRoutes'));
  apiRouter.use('/marketing', lazyRouter('./cms/marketingRoutes'));
  apiRouter.use('/campaigns', lazyRouter('./marketing/campaignRoutes'));
  apiRouter.use('/analytics', noCacheMiddleware, lazyRouter('./system/analyticsRoutes'));
  apiRouter.use('/gallery', lazyRouter('./cms/galleryRoutes'));
  apiRouter.use('/reviews', lazyRouter('./products/reviewRoutes'));
  apiRouter.use('/coupons', lazyRouter('./commerce/couponRoutes'));
  apiRouter.use('/users', noCacheMiddleware, lazyRouter('./users/userRoutes'));
  apiRouter.use('/inquiries', lazyRouter('./customer/inquiryRoutes'));
  apiRouter.use('/notifications', lazyRouter('./notifications/notificationRoutes'));
  apiRouter.use(
    '/notifications/whatsapp',
    noCacheMiddleware,
    lazyRouter('./notifications/whatsappAutomationRoutes'),
  );
  apiRouter.use(
    '/notifications/whatsapp-rbac',
    noCacheMiddleware,
    lazyRouter('./notifications/whatsappRBACRoutes'),
  );
  apiRouter.use('/webhooks', lazyRouter('./notifications/whatsappWebhookRoutes'));
  apiRouter.use('/notification-center', lazyRouter('./notifications/notificationCenterRoutes'));
  apiRouter.use('/policies', lazyRouter('./customer/policyRoutes'));
  apiRouter.use('/custom-orders', lazyRouter('./commerce/customOrderRoutes'));
  apiRouter.use('/loyalty', lazyRouter('./users/loyaltyRoutes'));
  apiRouter.use('/event-bookings', lazyRouter('./events/eventBookingRoutes'));
  apiRouter.use('/showcases', lazyRouter('./cms/showcaseRoutes'));
  apiRouter.use('/admin', noCacheMiddleware, lazyRouter('./system/adminSystemRoutes'));
  apiRouter.use('/admin/invites', noCacheMiddleware, lazyRouter('./auth/adminInviteRoutes'));
  apiRouter.use('/admin/approvals', noCacheMiddleware, lazyRouter('./system/approvalRoutes'));
  apiRouter.use('/admin/rules', noCacheMiddleware, lazyRouter('./system/businessRuleRoutes'));
  apiRouter.use('/admin/search', noCacheMiddleware, lazyRouter('./admin/synonymRoutes'));
  apiRouter.use(
    '/admin/operations-center',
    noCacheMiddleware,
    lazyRouter('./admin/operationsCenterRoutes'),
  );
  apiRouter.use('/returns', noCacheMiddleware, lazyRouter('./returns/returnRoutes'));
  apiRouter.use('/exchanges', noCacheMiddleware, lazyRouter('./returns/exchangeRoutes'));
  apiRouter.use('/recommendations', lazyRouter('./discovery/recommendationRoutes'));
  apiRouter.use('/tracking', lazyRouter('./system/trackingRoutes'));
  apiRouter.use(
    '/analytics/recommendations',
    noCacheMiddleware,
    lazyRouter('./discovery/recommendationAnalyticsRoutes'),
  );
  apiRouter.use(
    '/customer-intelligence',
    noCacheMiddleware,
    lazyRouter('./system/customerIntelligenceRoutes'),
  );

  apiRouter.use('/customer/tracking', noCacheMiddleware, lazyRouter('./customer/trackingRoutes'));

  apiRouter.use('/contact', noCacheMiddleware, lazyRouter('./commerce/contactRoutes'));
  apiRouter.use('/refunds', noCacheMiddleware, lazyRouter('./commerce/refundRoutes'));

  // Aggregated endpoints

  // Dynamic Configuration & Architecture Routes

  apiRouter.use('/settings', lazyRouter('./system/storeSettingsRoutes'));
  apiRouter.use('/categories', lazyRouter('./products/categoryRoutes'));

  apiRouter.use('/search/analytics', lazyRouter('./discovery/searchAnalyticsRoutes'));
  apiRouter.use('/search', lazyRouter('./discovery/searchRoutes'));
  apiRouter.use('/media', lazyRouter('./media/mediaRoutes'));

  // AI Visual Search
  apiRouter.use('/visual-search', lazyRouter('./discovery/visualSearchRoutes'));

  // Rental System Routes
  apiRouter.use('/rentals', noCacheMiddleware, lazyRouter('./rentals/rentalRoutes'));
  apiRouter.use('/rental-policies', lazyRouter('./rentals/rentalPolicyRoutes'));
  apiRouter.use('/service-areas', lazyRouter('./customer/serviceAreaRoutes'));

  // Social Preview Metadata
  apiRouter.use('/social', lazyRouter('./customer/socialRoutes'));

  // CMS/Content Routes
  apiRouter.use('/blogs', lazyRouter('./cms/blogRoutes'));
  apiRouter.use('/locations', lazyRouter('./customer/locationRoutes'));

  // Maintenance System Routes
  apiRouter.use('/maintenance', noCacheMiddleware, lazyRouter('./system/maintenanceRoutes'));

  // Enterprise Recycle Bin Routes
  apiRouter.use('/admin/recycle-bin', noCacheMiddleware, lazyRouter('./admin/recycleBinRoutes'));

  // Enterprise Backup & DR Routes
  apiRouter.use('/admin/backup', noCacheMiddleware, lazyRouter('./system/backupRoutes'));

  // Enterprise Domain Routes
  apiRouter.use('/warehouse', lazyRouter('./warehouse/warehouseRoutes'));
  apiRouter.use('/production', lazyRouter('./production/productionRoutes'));
  apiRouter.use('/shipping', lazyRouter('./shipping/shippingRoutes'));
  apiRouter.use('/documents', lazyRouter('./documents/documentRoutes'));

  app.use(prefix, apiRouter);
};
