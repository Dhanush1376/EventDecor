import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import logger from '../src/config/logger';

// Load env variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const ProductSchema = new mongoose.Schema(
  {
    title: String,
    rentalEnabled: Boolean,
    rentalPricing: {
      rentalPrice: Number,
      rentalDurationDays: Number,
      daily: Number,
      weekly: Number,
      monthly: Number,
      customDurationEnabled: Boolean,
      customPricePerDay: Number,
    },
    isRentalPricingAmbiguous: Boolean,
  },
  { strict: false },
);

const MigrationProduct =
  mongoose.models.MigrationProduct || mongoose.model('MigrationProduct', ProductSchema, 'products');

export async function migrateRentalPricing() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI is not defined in the environment variables');
  }

  await mongoose.connect(mongoUri);
  logger.info('Connected to MongoDB for rental pricing migration');

  let totalInspected = 0;
  let migratedCount = 0;
  let alreadyMigratedCount = 0;
  let ambiguousCount = 0;
  let noPricingCount = 0;

  const ambiguousProducts: { id: string; title: string; rates: Record<string, number> }[] = [];

  const cursor = MigrationProduct.find({
    $or: [
      { rentalEnabled: true },
      { 'rentalPricing.daily': { $gt: 0 } },
      { 'rentalPricing.weekly': { $gt: 0 } },
      { 'rentalPricing.monthly': { $gt: 0 } },
      { 'rentalPricing.rentalPrice': { $gt: 0 } },
    ],
  }).cursor();

  for await (const product of cursor) {
    totalInspected++;
    const pricing = product.rentalPricing || {};

    // Check if already migrated
    if (
      pricing.rentalPrice &&
      pricing.rentalPrice > 0 &&
      pricing.rentalDurationDays &&
      pricing.rentalDurationDays > 0
    ) {
      alreadyMigratedCount++;
      continue;
    }

    const hasDaily = Boolean(pricing.daily && pricing.daily > 0);
    const hasWeekly = Boolean(pricing.weekly && pricing.weekly > 0);
    const hasMonthly = Boolean(pricing.monthly && pricing.monthly > 0);

    const activeRatesCount = (hasDaily ? 1 : 0) + (hasWeekly ? 1 : 0) + (hasMonthly ? 1 : 0);

    if (activeRatesCount === 1) {
      let rentalPrice = 0;
      let rentalDurationDays = 1;

      if (hasDaily) {
        rentalPrice = Number(pricing.daily);
        rentalDurationDays = 1;
      } else if (hasWeekly) {
        rentalPrice = Number(pricing.weekly);
        rentalDurationDays = 7;
      } else if (hasMonthly) {
        rentalPrice = Number(pricing.monthly);
        rentalDurationDays = 30;
      }

      await MigrationProduct.updateOne(
        { _id: product._id },
        {
          $set: {
            'rentalPricing.rentalPrice': rentalPrice,
            'rentalPricing.rentalDurationDays': rentalDurationDays,
            isRentalPricingAmbiguous: false,
          },
        },
      );
      migratedCount++;
      logger.info(
        `Migrated product ${product._id} ("${product.title}") -> rentalPrice: ₹${rentalPrice}, rentalDurationDays: ${rentalDurationDays}`,
      );
    } else if (activeRatesCount > 1) {
      ambiguousCount++;
      ambiguousProducts.push({
        id: String(product._id),
        title: product.title || 'Untitled',
        rates: {
          daily: pricing.daily || 0,
          weekly: pricing.weekly || 0,
          monthly: pricing.monthly || 0,
        },
      });

      await MigrationProduct.updateOne(
        { _id: product._id },
        {
          $set: {
            isRentalPricingAmbiguous: true,
          },
        },
      );
      logger.warn(
        `AMBIGUOUS: Product ${product._id} ("${product.title}") has multiple legacy rental rates. Flagged as ambiguous without guessing.`,
      );
    } else {
      // Check customDuration
      if (
        pricing.customDurationEnabled &&
        pricing.customPricePerDay &&
        pricing.customPricePerDay > 0
      ) {
        await MigrationProduct.updateOne(
          { _id: product._id },
          {
            $set: {
              'rentalPricing.rentalPrice': Number(pricing.customPricePerDay),
              'rentalPricing.rentalDurationDays': 1,
              isRentalPricingAmbiguous: false,
            },
          },
        );
        migratedCount++;
      } else {
        noPricingCount++;
      }
    }
  }

  logger.info('===== RENTAL PRICING MIGRATION SUMMARY =====');
  logger.info(`Total Inspected: ${totalInspected}`);
  logger.info(`Migrated: ${migratedCount}`);
  logger.info(`Already Migrated: ${alreadyMigratedCount}`);
  logger.info(`Ambiguous (Flagged, Not Guessed): ${ambiguousCount}`);
  logger.info(`No Pricing Configured: ${noPricingCount}`);
  if (ambiguousProducts.length > 0) {
    logger.warn('Ambiguous Products Details:', JSON.stringify(ambiguousProducts, null, 2));
  }

  await mongoose.disconnect();
}

// Rollback function
export async function rollbackRentalPricing() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI is not defined');
  }
  await mongoose.connect(mongoUri);
  logger.info('Connected to MongoDB for rental pricing migration rollback');

  const result = await MigrationProduct.updateMany(
    {},
    {
      $unset: {
        'rentalPricing.rentalPrice': '',
        'rentalPricing.rentalDurationDays': '',
        isRentalPricingAmbiguous: '',
      },
    },
  );

  logger.info(`Rollback complete. Modified: ${result.modifiedCount} documents.`);
  await mongoose.disconnect();
}

if (require.main === module) {
  const isRollback = process.argv.includes('--rollback') || process.argv.includes('down');
  const runner = isRollback ? rollbackRentalPricing : migrateRentalPricing;
  runner()
    .then(() => {
      logger.info('Migration task completed successfully.');
      process.exit(0);
    })
    .catch((err) => {
      logger.error('Migration task failed:', err);
      process.exit(1);
    });
}
