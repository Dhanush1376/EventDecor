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
  apiRouter.use('/upload', lazyRouter('./media/uploadRoutes'));
  apiRouter.use('/auth', noCacheMiddleware, lazyRouter('./auth/authRoutes'));
  apiRouter.use('/events', lazyRouter('./events/eventRoutes'));
  apiRouter.use('/orders', noCacheMiddleware, lazyRouter('./commerce/orderRoutes'));
  apiRouter.use('/cms', lazyRouter('./cms/cmsRoutes'));
  apiRouter.use('/analytics', noCacheMiddleware, lazyRouter('./system/analyticsRoutes'));
  apiRouter.use('/gallery', lazyRouter('./cms/galleryRoutes'));
  apiRouter.use('/reviews', lazyRouter('./products/reviewRoutes'));
  apiRouter.use('/coupons', lazyRouter('./commerce/couponRoutes'));
  apiRouter.use('/users', noCacheMiddleware, lazyRouter('./users/userRoutes'));
  apiRouter.use('/inquiries', lazyRouter('./customer/inquiryRoutes'));
  apiRouter.use('/notifications', lazyRouter('./notifications/notificationRoutes'));
  apiRouter.use('/notification-center', lazyRouter('./notifications/notificationCenterRoutes'));
  apiRouter.use('/policies', lazyRouter('./customer/policyRoutes'));
  apiRouter.use('/custom-orders', lazyRouter('./commerce/customOrderRoutes'));
  apiRouter.use('/loyalty', lazyRouter('./users/loyaltyRoutes'));
  apiRouter.use('/event-bookings', lazyRouter('./events/eventBookingRoutes'));
  apiRouter.use('/showcases', lazyRouter('./cms/showcaseRoutes'));
  apiRouter.use('/admin', noCacheMiddleware, lazyRouter('./system/adminSystemRoutes'));
  apiRouter.use('/admin/invites', noCacheMiddleware, lazyRouter('./auth/adminInviteRoutes'));
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

  apiRouter.use('/refunds', noCacheMiddleware, lazyRouter('./commerce/refundRoutes'));

  // Aggregated endpoints

  // Dynamic Configuration & Architecture Routes
  apiRouter.use('/config', lazyRouter('./system/appConfigRoutes'));
  apiRouter.use('/settings', lazyRouter('./system/storeSettingsRoutes'));
  apiRouter.use('/categories', lazyRouter('./products/categoryRoutes'));
  apiRouter.use('/layouts', lazyRouter('./cms/pageLayoutRoutes'));
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

  app.use(prefix, apiRouter);
};
