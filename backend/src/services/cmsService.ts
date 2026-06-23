import WebsiteContent from '../models/WebsiteContent';
import { cmsCache } from '../utils/cache/MemoryCache';
import logger from '../config/logger';
import { bumpPublicCacheVersion } from '../utils/cache/cacheVersion';
import {
  deleteFromCloudinary,
  extractPublicId,
  extractAllCloudinaryUrls,
} from '../utils/cloudinary';

class CMSService {
  static async getContent(key: string) {
    const cacheKey = `cms:content:${key}`;
    const cached = cmsCache.get(cacheKey);
    if (cached !== null) {
      logger.info(`[CMS CACHE] Cache Hit for content key: ${key}`);
      return cached;
    }

    logger.info(`[CMS CACHE] Cache Miss. Fetching fresh content key from database: ${key}`);
    const content = await WebsiteContent.findOne({ key, status: 'published' });
    const result = content ? content.content : null;
    cmsCache.set(cacheKey, result);
    return result;
  }

  static async updateContent(key: string, newContent: any, userId: string) {
    let websiteContent = await WebsiteContent.findOne({ key });

    if (websiteContent) {
      try {
        const oldUrls = extractAllCloudinaryUrls(websiteContent.content);
        const newUrls = new Set(extractAllCloudinaryUrls(newContent));
        const removedUrls = oldUrls.filter((url) => !newUrls.has(url));
        for (const url of removedUrls) {
          const publicId = extractPublicId(url);
          if (publicId) {
            deleteFromCloudinary(publicId).catch((err) =>
              logger.error(`Failed to clean up old CMS image: ${err}`),
            );
          }
        }
      } catch (err) {
        logger.error('Error parsing old CMS content for image cleanup:', err);
      }

      websiteContent.content = newContent;
      websiteContent.lastUpdatedBy = userId as any;
      await websiteContent.save();
    } else {
      websiteContent = new WebsiteContent({
        key,
        content: newContent,
        lastUpdatedBy: userId,
      });
      await websiteContent.save();
    }

    // Invalidate CMS caches to maintain content consistency
    logger.info(`[CMS CACHE] Invalidation triggered. Purging cached keys due to update on: ${key}`);
    cmsCache.delete(`cms:content:${key}`);
    cmsCache.delete('cms:all_sections');
    await bumpPublicCacheVersion();

    return websiteContent;
  }

  static async getAllSections() {
    const cacheKey = 'cms:all_sections';
    const cached = cmsCache.get(cacheKey);
    if (cached !== null) {
      logger.info('[CMS CACHE] Cache Hit for all sections');
      return cached;
    }

    logger.info('[CMS CACHE] Cache Miss. Fetching all sections from database');
    const sections = await WebsiteContent.find();
    cmsCache.set(cacheKey, sections);
    return sections;
  }
}

export default CMSService;
