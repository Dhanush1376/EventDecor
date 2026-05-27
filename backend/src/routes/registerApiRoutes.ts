import express, { Application } from 'express';
import { attachApiVersion, ApiVersionTag } from '../middleware/apiVersion';
import { noCacheMiddleware } from '../middleware/noCacheMiddleware';
import productRoutes from './productRoutes';
import uploadRoutes from './uploadRoutes';
import authRoutes from './authRoutes';
import eventRoutes from './eventRoutes';
import orderRoutes from '../features/orders/orderRoutes';
import cmsRoutes from './cmsRoutes';
import analyticsRoutes from './analyticsRoutes';
import galleryRoutes from './galleryRoutes';
import reviewRoutes from './reviewRoutes';
import couponRoutes from './couponRoutes';
import userRoutes from './userRoutes';
import inquiryRoutes from './inquiryRoutes';
import notificationRoutes from './notificationRoutes';
import customOrderRoutes from './customOrderRoutes';
import loyaltyRoutes from './loyaltyRoutes';
import eventBookingRoutes from './eventBookingRoutes';
import showcaseRoutes from './showcaseRoutes';
import adminSystemRoutes from './adminSystemRoutes';
import adminInviteRoutes from './adminInviteRoutes';
import recommendationRoutes from './recommendationRoutes';
import trackingRoutes from './trackingRoutes';
import recommendationAnalyticsRoutes from './recommendationAnalyticsRoutes';
import appConfigRoutes from './appConfigRoutes';
import categoryRoutes from './categoryRoutes';
import pageLayoutRoutes from './pageLayoutRoutes';
import searchRoutes from './searchRoutes';

/**
 * Mount all API routers under a prefix.
 * @param apiVersion — `v1` for `/api/v1` (stable contract); `legacy` for deprecated `/api` alias.
 */
export const registerApiRoutes = (
  app: Application,
  prefix: string,
  apiVersion: ApiVersionTag = 'v1'
): void => {
  const apiRouter = express.Router();
  apiRouter.use(attachApiVersion(apiVersion));

  apiRouter.use('/products', productRoutes);
  apiRouter.use('/upload', uploadRoutes);
  apiRouter.use('/auth', noCacheMiddleware, authRoutes);
  apiRouter.use('/events', eventRoutes);
  apiRouter.use('/orders', noCacheMiddleware, orderRoutes);
  apiRouter.use('/cms', cmsRoutes);
  apiRouter.use('/analytics', noCacheMiddleware, analyticsRoutes);
  apiRouter.use('/gallery', galleryRoutes);
  apiRouter.use('/reviews', reviewRoutes);
  apiRouter.use('/coupons', couponRoutes);
  apiRouter.use('/users', noCacheMiddleware, userRoutes);
  apiRouter.use('/inquiries', inquiryRoutes);
  apiRouter.use('/notifications', notificationRoutes);
  apiRouter.use('/custom-orders', customOrderRoutes);
  apiRouter.use('/loyalty', loyaltyRoutes);
  apiRouter.use('/event-bookings', eventBookingRoutes);
  apiRouter.use('/showcases', showcaseRoutes);
  apiRouter.use('/admin', noCacheMiddleware, adminSystemRoutes);
  apiRouter.use('/admin/invites', noCacheMiddleware, adminInviteRoutes);
  apiRouter.use('/recommendations', recommendationRoutes);
  apiRouter.use('/tracking', trackingRoutes);
  apiRouter.use('/analytics/recommendations', noCacheMiddleware, recommendationAnalyticsRoutes);
  
  // Dynamic Configuration & Architecture Routes
  apiRouter.use('/config', appConfigRoutes);
  apiRouter.use('/categories', categoryRoutes);
  apiRouter.use('/layouts', pageLayoutRoutes);
  apiRouter.use('/search', searchRoutes);

  app.use(prefix, apiRouter);
};
