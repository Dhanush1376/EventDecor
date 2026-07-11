import logger from './logger';

export const seedDefaultEmailTemplates = async (): Promise<void> => {
  try {
    const EmailTemplate = require('../models/EmailTemplate').default;
    const {
      getWelcomeEmailTemplate,
      getSuspiciousLoginEmailTemplate,
    } = require('../utils/email/emailTemplates');

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
      logger.info(`[DATABASE] [SEED] Seeding/Updating default email template: "${t.name}"`);
      await EmailTemplate.findOneAndUpdate(
        { name: t.name },
        { $set: t },
        { upsert: true, returnDocument: 'after' },
      );
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
    '../domains/event_operations/models/EventJob',
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
    '../models/PaymentWebhookEvent',
    '../models/RefundRecord',
    '../models/InventoryReservation',
    '../models/InventoryLog',
    '../models/InventoryLedger',
    '../models/RentalOrder',
    '../models/PaymentAudit',
    '../models/OutboxEvent',
    '../models/AdminAuditLog',
  ];

  for (const path of modelPaths) {
    try {
      const modelModule = require(path);
      const model = (modelModule.default || modelModule) as any;
      if (model && typeof model.createIndexes === 'function') {
        logger.info(`[DATABASE] Ensuring indexes for ${model.modelName}...`);
        try {
          await model.createIndexes();
        } catch (err: any) {
          const errMsg = err.message || '';
          if (
            errMsg.includes('Index already exists') ||
            errMsg.includes('different name and options') ||
            errMsg.includes('already exists with different') ||
            errMsg.includes('An existing index has the same name as the requested index') ||
            errMsg.includes('An equivalent index already exists')
          ) {
            logger.warn(
              `[DATABASE] Index conflict detected for ${model.modelName}: ${err.message}. Attempting self-healing...`,
            );
            const indexes = await model.collection.listIndexes().toArray();
            let droppedCount = 0;
            for (const index of indexes) {
              if (index.name === '_id_') continue;
              // Drop legacy text indexes that aren't the expected FullTextIndex
              if (
                (index.key &&
                  Object.values(index.key).includes('text') &&
                  index.name !== 'FullTextIndex') ||
                index.name === 'bookingDateStr_1_venue.address_1'
              ) {
                logger.info(
                  `[DATABASE] Dropping conflicting text/legacy index "${index.name}" on ${model.modelName}...`,
                );
                await model.collection.dropIndex(index.name);
                droppedCount++;
              }
            }

            // If no text indexes were dropped, try extracting the conflicting index name from the error
            // and drop it directly (handles TTL and option mismatches)
            if (droppedCount === 0) {
              const nameMatch = errMsg.match(/name:\s*"([^"]+)"/);
              const conflictName = nameMatch ? nameMatch[1] : null;
              if (conflictName && conflictName !== '_id_') {
                logger.info(
                  `[DATABASE] Dropping conflicting index "${conflictName}" on ${model.modelName} (TTL/option mismatch)...`,
                );
                try {
                  await model.collection.dropIndex(conflictName);
                  droppedCount++;
                } catch (dropErr: any) {
                  logger.error(
                    `[DATABASE] Failed to drop index "${conflictName}": ${dropErr.message}`,
                  );
                }
              }
            }

            if (droppedCount > 0) {
              logger.info(
                `[DATABASE] Retrying createIndexes for ${model.modelName} after dropping ${droppedCount} conflicting index(es)...`,
              );
              await model.createIndexes();
            } else {
              // Non-fatal: log the error but don't crash the server over an index conflict
              logger.error(
                `[DATABASE] Could not self-heal index conflict for ${model.modelName}. Manual intervention required: ${err.message}`,
              );
            }
          } else {
            throw err;
          }
        }
      }
    } catch (err: any) {
      logger.error(`[DATABASE] Failed to build index for model at ${path}: ${err.message}`);
    }
  }

  logger.info('[DATABASE] MongoDB compound indexes verified');

  // Seed default email templates once the indexes are built
  await seedDefaultEmailTemplates();
};
