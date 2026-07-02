import mongoose from 'mongoose';
import logger from '../config/logger';
import Media from '../models/Media';
import Product from '../models/Product';
import Gallery from '../models/Gallery';
import ShowcaseCollection from '../models/ShowcaseCollection';
import WebsiteContent from '../models/WebsiteContent';
import User from '../models/User';
import Review from '../models/Review';
import { extractAllCloudinaryUrls } from '../utils/cloudinary';

/**
 * Runs a full scan of all entities holding media references and compares them
 * to the `Media.referencedBy` array and `referenceCount`. Automatically repairs discrepancies.
 */
export const runMediaIntegrityCheck = async () => {
  logger.info('[MEDIA_INTEGRITY] Starting full reference integrity check...');

  const allMediaMap = new Map<string, { expected: number; actualRefs: Set<string> }>();

  // Helper to process document fields
  const processEntity = (docId: string, model: string, urls: string[], field: string) => {
    urls.forEach((url) => {
      if (!url || !url.includes('cloudinary')) return;
      if (!allMediaMap.has(url)) {
        allMediaMap.set(url, { expected: 0, actualRefs: new Set() });
      }
      const state = allMediaMap.get(url)!;
      state.expected += 1;
      state.actualRefs.add(`${model}:${docId}:${field}`);
    });
  };

  // 1. Scan Products
  const products = await Product.find({}).select('imageSrc images').lean();
  products.forEach((p) => {
    if (p.imageSrc) processEntity(String(p._id), 'Product', [p.imageSrc], 'imageSrc');
    if (p.images && Array.isArray(p.images))
      processEntity(String(p._id), 'Product', p.images as string[], 'images');
  });

  // 2. Scan Gallery
  const galleries = await Gallery.find({}).select('image video').lean();
  galleries.forEach((g) => {
    if (g.image) processEntity(String(g._id), 'Gallery', [g.image], 'image');
    if (g.video) processEntity(String(g._id), 'Gallery', [g.video], 'video');
  });

  // 3. Scan Showcases
  const showcases = await ShowcaseCollection.find({}).select('image gallery').lean();
  showcases.forEach((s) => {
    if (s.image) processEntity(String(s._id), 'ShowcaseCollection', [s.image], 'image');
    if (s.gallery && Array.isArray(s.gallery))
      processEntity(String(s._id), 'ShowcaseCollection', s.gallery as string[], 'gallery');
  });

  // 4. Scan Users
  const users = await User.find({}).select('avatar').lean();
  users.forEach((u) => {
    if (u.avatar) processEntity(String(u._id), 'User', [u.avatar], 'avatar');
  });

  // 5. Scan Reviews
  const reviews = await Review.find({}).select('images').lean();
  reviews.forEach((r) => {
    if (r.images && Array.isArray(r.images))
      processEntity(String(r._id), 'Review', r.images as string[], 'images');
  });

  // 6. Scan CMS Content
  const cmsPages = await WebsiteContent.find({}).select('content').lean();
  cmsPages.forEach((c) => {
    const urls = extractAllCloudinaryUrls(c.content);
    if (urls && urls.length > 0) {
      processEntity(String(c._id), 'WebsiteContent', urls, 'content');
    }
  });

  // 7. Verify and Repair
  logger.info(
    `[MEDIA_INTEGRITY] Scanned ${allMediaMap.size} unique referenced media URLs across all collections.`,
  );

  const allMedia = await Media.find({}).exec();
  let repairedCount = 0;

  for (const media of allMedia) {
    const expectedData = allMediaMap.get(media.secureUrl);
    const expectedCount = expectedData ? expectedData.expected : 0;

    if (media.referenceCount !== expectedCount) {
      logger.warn(
        `[MEDIA_INTEGRITY] Discrepancy found for Media ${media._id} (${media.secureUrl}). DB says: ${media.referenceCount}, Actual: ${expectedCount}`,
      );

      // Auto-repair
      if (expectedCount > 0) {
        media.referenceCount = expectedCount;

        // Rebuild the referencedBy array based on actualRefs
        const rebuiltRefs: any[] = [];
        Array.from(expectedData!.actualRefs).forEach((refStr) => {
          const [model, docId, field] = refStr.split(':');
          rebuiltRefs.push({ model, documentId: new mongoose.Types.ObjectId(docId), field });
        });
        media.referencedBy = rebuiltRefs;

        if (media.status === 'pending_delete') {
          media.status = 'active';
          if (media.restore) await media.restore();
        }
        await media.save();
        repairedCount++;
        logger.info(`[MEDIA_INTEGRITY] Auto-repaired Media ${media._id}`);
      } else {
        // Expected is 0
        if (media.status === 'active') {
          media.referenceCount = 0;
          media.referencedBy = [];
          media.status = 'pending_delete';
          if (media.softDelete)
            await media.softDelete(null, 'Integrity check: 0 actual references found');
          await media.save();
          repairedCount++;
          logger.info(`[MEDIA_INTEGRITY] Marked Media ${media._id} as pending_delete`);
        }
      }
    }
  }

  logger.info(
    `[MEDIA_INTEGRITY] Integrity check complete. Repaired ${repairedCount} media documents.`,
  );
};
