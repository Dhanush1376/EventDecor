import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env.local') });

import Product from '../models/Product';
import Media from '../models/Media';
import { extractPublicId } from '../utils/cloudinary';
import { CloudinaryAdapter } from '../services/media/CloudinaryAdapter';
import logger from '../config/logger';

/**
 * Migration Script: Scans Products (and other entities later) to build the Central Media Registry.
 *
 * It takes existing imageUrls, fetches metadata from Cloudinary, and registers them in the Media collection
 * so that they become tracked assets. It also updates the referenceCount appropriately.
 */
const migrateMedia = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI as string);
    logger.info('[MigrateMedia] Connected to MongoDB');

    const products = await Product.find({}).lean();
    logger.info(`[MigrateMedia] Found ${products.length} products to scan`);

    let processedCount = 0;
    let newMediaCount = 0;

    for (const product of products) {
      const allUrls = new Set<string>();
      if (product.imageSrc) allUrls.add(product.imageSrc);
      if (Array.isArray(product.images)) {
        product.images.forEach((img) => allUrls.add(img));
      }

      for (const url of allUrls) {
        if (!url.includes('cloudinary')) continue;

        const publicId = extractPublicId(url);
        if (!publicId) continue;

        // Check if already registered
        let media = await Media.findOne({ publicId });

        if (!media) {
          try {
            // Fetch metadata from Cloudinary to populate Media doc
            logger.info(`[MigrateMedia] Fetching Cloudinary metadata for ${publicId}`);
            const cloudInfo = await CloudinaryAdapter.getAssetInfo(publicId);

            media = new Media({
              publicId,
              secureUrl: cloudInfo.secure_url,
              resourceType: cloudInfo.resource_type,
              folder: cloudInfo.folder,
              width: cloudInfo.width,
              height: cloudInfo.height,
              bytes: cloudInfo.bytes,
              format: cloudInfo.format,
              originalFilename: cloudInfo.original_filename || 'migrated-asset',
              hash: 'migrated-' + cloudInfo.etag, // Cannot compute sha256 hash without downloading, use etag as proxy
              tags: cloudInfo.tags || [],
              referenceCount: 0, // Will be incremented below
              referencedBy: [],
              status: 'active',
            });
            await media.save();
            newMediaCount++;
          } catch (err: any) {
            logger.error(
              `[MigrateMedia] Failed to fetch/create media for ${publicId}: ${err.message}`,
            );
            continue; // Skip reference tracking if we can't create it
          }
        }

        // Add reference if it doesn't already exist
        const fieldName = url === product.imageSrc ? 'imageSrc' : 'images';

        const exists = media.referencedBy.some(
          (r) =>
            r.model === 'Product' &&
            r.field === fieldName &&
            String(r.documentId) === String(product._id),
        );

        if (!exists) {
          media.referencedBy.push({
            model: 'Product',
            field: fieldName,
            documentId: product._id as any,
          });
          media.referenceCount = media.referencedBy.length;
          await media.save();
          logger.debug(
            `[MigrateMedia] Added reference for Product ${product._id} to Media ${media.publicId}`,
          );
        }
      }
      processedCount++;
      if (processedCount % 100 === 0)
        logger.info(`[MigrateMedia] Processed ${processedCount} products...`);
    }

    logger.info(`[MigrateMedia] Migration Complete. Created ${newMediaCount} new Media records.`);
  } catch (error) {
    logger.error('[MigrateMedia] Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

migrateMedia();
