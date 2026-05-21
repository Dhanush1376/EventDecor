import logger from './logger';
import User from '../models/User';
import Product from '../models/Product';
import Order from '../models/Order';
import EventBooking from '../models/EventBooking';
import Event from '../models/Event';
import Gallery from '../models/Gallery';
import ContentSection from '../models/ContentSection';
import Review from '../models/Review';
import Coupon from '../models/Coupon';
import WalletTransaction from '../models/WalletTransaction';
import EmailCampaign from '../models/EmailCampaign';
import NotificationLog from '../models/NotificationLog';
import OtpVerification from '../models/OtpVerification';

const INDEX_MODELS = [
  User,
  Product,
  Order,
  EventBooking,
  Event,
  Gallery,
  ContentSection,
  Review,
  Coupon,
  WalletTransaction,
  EmailCampaign,
  NotificationLog,
  OtpVerification,
];

/**
 * Idempotent index build (safe to run on every startup; createIndexes is a no-op when unchanged).
 */
export const ensureIndexes = async (): Promise<void> => {
  if (process.env.SKIP_INDEX_BUILD === 'true') {
    logger.warn('[DATABASE] SKIP_INDEX_BUILD=true — skipping index creation');
    return;
  }

  for (const model of INDEX_MODELS) {
    if (model && typeof model.createIndexes === 'function') {
      logger.info(`[DATABASE] Ensuring indexes for ${model.modelName}...`);
      await model.createIndexes();
    }
  }

  logger.info('[DATABASE] MongoDB compound indexes verified');
};
