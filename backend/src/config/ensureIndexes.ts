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
import EmailTemplate from '../models/EmailTemplate';
import UserInteraction from '../models/UserInteraction';
import UserPreferenceProfile from '../models/UserPreferenceProfile';
import TrendingSnapshot from '../models/TrendingSnapshot';
import CustomOrder from '../models/CustomOrder';

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
  EmailTemplate,
  UserInteraction,
  UserPreferenceProfile,
  TrendingSnapshot,
  CustomOrder,
];

export const seedDefaultEmailTemplates = async (): Promise<void> => {
  try {
    const EmailTemplate = require('../models/EmailTemplate').default;
    const { getWelcomeEmailTemplate, getSuspiciousLoginEmailTemplate } = require('../utils/emailTemplates');

    const defaultTemplates = [
      {
        name: 'Welcome Email',
        subjectLine: 'Welcome to Siri Arts & Crafts, {{name}} ✦ Discover Timeless Decor',
        htmlContent: getWelcomeEmailTemplate('{{name}}', '{{frontend_url}}'),
        type: 'marketing',
        isActive: true,
      },
      {
        name: 'Suspicious Login Alert',
        subjectLine: 'Security Alert: New Login Detected ✦ Siri Arts & Crafts',
        htmlContent: getSuspiciousLoginEmailTemplate('{{name}}', '{{loginTime}}', '{{deviceInfo}}'),
        type: 'system',
        isActive: true,
      },
    ];

    for (const t of defaultTemplates) {
      const exists = await EmailTemplate.findOne({ name: t.name });
      if (!exists) {
        logger.info(`[DATABASE] [SEED] Seeding default email template: "${t.name}"`);
        await EmailTemplate.create(t);
      }
    }
  } catch (err: any) {
    logger.error('[DATABASE] [SEED] Failed to seed default email templates:', err);
  }
};

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

  // Seed default email templates once the indexes are built
  await seedDefaultEmailTemplates();
};
