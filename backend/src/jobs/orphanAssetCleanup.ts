import logger from '../config/logger';
import Product from '../models/Product';
import { AlertingService } from '../services/AlertingService';

/**
 * OrphanAssetCleanup — Detects Cloudinary URLs in the database that reference
 * deleted/orphaned products, and generates a report for admin review.
 *
 * NOTE: We intentionally do NOT auto-delete Cloudinary assets because:
 * 1. Assets may be referenced by external caches (CDN, browser cache)
 * 2. False positives could delete active product images
 * 3. Cloudinary cost for storage is minimal vs cost of data loss
 *
 * Instead, we generate a report of potentially orphaned assets for manual review.
 */
export const detectOrphanedAssets = async (): Promise<{
  checkedProducts: number;
  orphanedUrls: string[];
  brokenReferences: string[];
}> => {
  logger.info('[ORPHAN CLEANUP] Starting orphaned asset detection...');

  const orphanedUrls: string[] = [];
  const brokenReferences: string[] = [];

  try {
    // 1. Find products with image URLs that are empty/null (broken references)
    const brokenProducts = await Product.find({
      isActive: true,
      $or: [{ imageSrc: { $exists: false } }, { imageSrc: null }, { imageSrc: '' }],
    })
      .select('_id title isActive')
      .lean();

    for (const product of brokenProducts) {
      brokenReferences.push(
        `Product ${product._id} ("${product.title || 'Untitled'}") — missing imageSrc`,
      );
    }

    // 2. Find inactive products with Cloudinary URLs (potential candidates for cleanup)
    const inactiveWithImages = await Product.find({
      isActive: false,
      imageSrc: { $regex: /cloudinary/, $options: 'i' },
    })
      .select('_id title imageSrc')
      .lean();

    for (const product of inactiveWithImages) {
      if (product.imageSrc) {
        orphanedUrls.push(product.imageSrc);
      }
    }

    // 3. Check for Gallery orphans (galleries referencing deleted items)
    try {
      const Gallery = require('../models/Gallery').default;
      const allGalleryItems = await Gallery.find({}).select('items').lean();

      for (const gallery of allGalleryItems) {
        if (gallery.items) {
          for (const item of gallery.items) {
            if (item.src && typeof item.src === 'string' && item.src.includes('cloudinary')) {
              // Verify the URL is still reachable (HEAD request)
              try {
                const response = await fetch(item.src, {
                  method: 'HEAD',
                  signal: AbortSignal.timeout(5000),
                });
                if (response.status === 404) {
                  brokenReferences.push(
                    `Gallery item with broken Cloudinary URL: ${item.src.substring(0, 80)}...`,
                  );
                }
              } catch {
                // Network error — don't flag as broken, could be transient
              }
            }
          }
        }
      }
    } catch (err: any) {
      logger.warn(`[ORPHAN CLEANUP] Gallery check skipped: ${err.message}`);
    }

    const totalChecked = brokenProducts.length + inactiveWithImages.length;

    if (orphanedUrls.length > 0 || brokenReferences.length > 0) {
      logger.warn(
        `[ORPHAN CLEANUP] Found ${orphanedUrls.length} potentially orphaned URLs, ${brokenReferences.length} broken references`,
      );

      await AlertingService.fire({
        title: 'Orphaned Asset Detection Report',
        message: `Found ${orphanedUrls.length} potentially orphaned Cloudinary URLs and ${brokenReferences.length} broken image references.`,
        severity: 'medium',
        category: 'system',
        metadata: {
          orphanedCount: orphanedUrls.length,
          brokenCount: brokenReferences.length,
          sampleOrphaned: orphanedUrls.slice(0, 5),
          sampleBroken: brokenReferences.slice(0, 5),
        },
      });
    } else {
      logger.info('[ORPHAN CLEANUP] No orphaned assets detected.');
    }

    return {
      checkedProducts: totalChecked,
      orphanedUrls,
      brokenReferences,
    };
  } catch (err: any) {
    logger.error(`[ORPHAN CLEANUP] Detection failed: ${err.message}`);
    return { checkedProducts: 0, orphanedUrls: [], brokenReferences: [] };
  }
};
