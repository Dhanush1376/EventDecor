import express, { Application } from 'express';
import { attachApiVersion, ApiVersionTag } from '../middleware/apiVersion';
import productRoutes from './productRoutes';
import uploadRoutes from './uploadRoutes';
import authRoutes from './authRoutes';
import eventRoutes from './eventRoutes';
import orderRoutes from './orderRoutes';
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
  apiRouter.use('/auth', authRoutes);
  apiRouter.use('/events', eventRoutes);
  apiRouter.use('/orders', orderRoutes);
  apiRouter.use('/cms', cmsRoutes);
  apiRouter.use('/analytics', analyticsRoutes);
  apiRouter.use('/gallery', galleryRoutes);
  apiRouter.use('/reviews', reviewRoutes);
  apiRouter.use('/coupons', couponRoutes);
  apiRouter.use('/users', userRoutes);
  apiRouter.use('/inquiries', inquiryRoutes);
  apiRouter.use('/notifications', notificationRoutes);
  apiRouter.use('/custom-orders', customOrderRoutes);
  apiRouter.use('/loyalty', loyaltyRoutes);
  apiRouter.use('/event-bookings', eventBookingRoutes);
  apiRouter.use('/showcases', showcaseRoutes);
  apiRouter.use('/admin', adminSystemRoutes);

  app.use(prefix, apiRouter);
};
