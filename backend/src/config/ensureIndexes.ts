import logger from './logger';

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

  const modelPaths = [
    '../models/User',
    '../models/Product',
    '../models/Order',
    '../models/EventBooking',
    '../models/Event',
    '../models/Gallery',
    '../models/ContentSection',
    '../models/Review',
    '../models/Coupon',
    '../models/WalletTransaction',
    '../models/EmailCampaign',
    '../models/NotificationLog',
    '../models/OtpVerification',
    '../models/EmailTemplate',
    '../models/UserInteraction',
    '../models/UserPreferenceProfile',
    '../models/TrendingSnapshot',
    '../models/CustomOrder',
  ];

  for (const path of modelPaths) {
    try {
      const modelModule = require(path);
      const model = (modelModule.default || modelModule) as any;
      if (model && typeof model.createIndexes === 'function') {
        logger.info(`[DATABASE] Ensuring indexes for ${model.modelName}...`);
        await model.createIndexes();
      }
    } catch (err: any) {
      logger.error(`[DATABASE] Failed to build index for model at ${path}: ${err.message}`);
    }
  }

  logger.info('[DATABASE] MongoDB compound indexes verified');

  // Seed default email templates once the indexes are built
  await seedDefaultEmailTemplates();
};
