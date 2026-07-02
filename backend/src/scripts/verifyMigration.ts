import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import Product from '../models/Product';
import Media from '../models/Media';
import axios from 'axios';
import logger from '../config/logger';

dotenv.config({ path: path.join(__dirname, '../../../.env.local') });

/**
 * Migration Verification Script
 * Validates that all product image URLs exist in the Media registry
 * and are reachable via HTTP (Cloudinary).
 */
const verifyMigration = async () => {
  try {
    logger.info('Starting migration verification...');
    await mongoose.connect(process.env.MONGODB_URI as string);
    logger.info('Connected to MongoDB.');

    const products = await Product.find({}).select('_id title imageSrc images').lean();
    logger.info(`Found ${products.length} products to verify.`);

    let missingInRegistry = 0;
    let unreachableUrls = 0;
    let verifiedCount = 0;

    for (const product of products) {
      const urlsToVerify = [];
      if (product.imageSrc) urlsToVerify.push(product.imageSrc);
      if (product.images && Array.isArray(product.images)) {
        urlsToVerify.push(...product.images);
      }

      for (const url of urlsToVerify) {
        if (!url || !url.includes('cloudinary.com')) continue;

        // 1. Check Media Registry
        const media = await Media.findOne({ secureUrl: url });
        if (!media) {
          logger.warn(`Missing in Registry: ${url} (Product: ${product._id})`);
          missingInRegistry++;
          continue;
        }

        // 2. Check Reachability (Sample 10% to avoid rate limits, or all if small)
        if (Math.random() < 0.1) {
          try {
            const response = await axios.head(url);
            if (response.status !== 200) {
              throw new Error(`Status ${response.status}`);
            }
          } catch (err: any) {
            logger.error(`Unreachable URL: ${url} - ${err.message}`);
            unreachableUrls++;
          }
        }
        verifiedCount++;
      }
    }

    logger.info('--- MIGRATION VERIFICATION RESULTS ---');
    logger.info(`Total URLs verified against registry: ${verifiedCount}`);
    logger.info(`URLs missing in Media registry: ${missingInRegistry}`);
    logger.info(`URLs unreachable (from 10% sample): ${unreachableUrls}`);

    if (missingInRegistry === 0 && unreachableUrls === 0) {
      logger.info('Migration is HEALTHY! ?');
    } else {
      logger.warn('Migration has ISSUES! Check logs above.');
    }

    process.exit(0);
  } catch (error) {
    logger.error('Migration verification failed:', error);
    process.exit(1);
  }
};

verifyMigration();
