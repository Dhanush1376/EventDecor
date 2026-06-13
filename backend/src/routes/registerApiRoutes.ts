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

  apiRouter.use('/products', lazyRouter('./productRoutes'));
  apiRouter.use('/upload', lazyRouter('./uploadRoutes'));
  apiRouter.use('/auth', noCacheMiddleware, lazyRouter('./authRoutes'));
  apiRouter.use('/events', lazyRouter('./eventRoutes'));
  apiRouter.use('/orders', noCacheMiddleware, lazyRouter('../routes/orderRoutes'));
  apiRouter.use('/cms', lazyRouter('./cmsRoutes'));
  apiRouter.use('/analytics', noCacheMiddleware, lazyRouter('./analyticsRoutes'));
  apiRouter.use('/gallery', lazyRouter('./galleryRoutes'));
  apiRouter.use('/reviews', lazyRouter('./reviewRoutes'));
  apiRouter.use('/coupons', lazyRouter('./couponRoutes'));
  apiRouter.use('/users', noCacheMiddleware, lazyRouter('./userRoutes'));
  apiRouter.use('/inquiries', lazyRouter('./inquiryRoutes'));
  apiRouter.use('/notifications', lazyRouter('./notificationRoutes'));
  apiRouter.use('/policies', lazyRouter('./policyRoutes'));
  apiRouter.use('/custom-orders', lazyRouter('./customOrderRoutes'));
  apiRouter.use('/loyalty', lazyRouter('./loyaltyRoutes'));
  apiRouter.use('/event-bookings', lazyRouter('./eventBookingRoutes'));
  apiRouter.use('/showcases', lazyRouter('./showcaseRoutes'));
  apiRouter.use('/admin', noCacheMiddleware, lazyRouter('./adminSystemRoutes'));
  apiRouter.use('/admin/invites', noCacheMiddleware, lazyRouter('./adminInviteRoutes'));
  apiRouter.use('/recommendations', lazyRouter('./recommendationRoutes'));
  apiRouter.use('/tracking', lazyRouter('./trackingRoutes'));
  apiRouter.use(
    '/analytics/recommendations',
    noCacheMiddleware,
    lazyRouter('./recommendationAnalyticsRoutes'),
  );

  apiRouter.use('/refunds', noCacheMiddleware, lazyRouter('./refundRoutes'));

  // Aggregated endpoints

  // Dynamic Configuration & Architecture Routes
  apiRouter.use('/config', lazyRouter('./appConfigRoutes'));
  apiRouter.use('/categories', lazyRouter('./categoryRoutes'));
  apiRouter.use('/layouts', lazyRouter('./pageLayoutRoutes'));
  apiRouter.use('/search', lazyRouter('./searchRoutes'));
  apiRouter.use('/media', lazyRouter('./mediaRoutes'));

  // AI Visual Search
  apiRouter.use('/visual-search', lazyRouter('./visualSearchRoutes'));

  // Rental System Routes
  apiRouter.use('/rentals', noCacheMiddleware, lazyRouter('./rentalRoutes'));
  apiRouter.use('/rental-policies', lazyRouter('./rentalPolicyRoutes'));
  apiRouter.use('/service-areas', lazyRouter('./serviceAreaRoutes'));

  // Social Preview Metadata
  apiRouter.use('/social', lazyRouter('./socialRoutes'));

  app.use(prefix, apiRouter);
};
