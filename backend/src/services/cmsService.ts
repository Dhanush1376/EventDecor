import WebsiteContent from '../models/WebsiteContent';
import { cmsCache } from '../utils/cache/MemoryCache';
import logger from '../config/logger';
import { bumpPublicCacheVersion } from '../utils/cache/cacheVersion';
import { extractAllCloudinaryUrls } from '../utils/cloudinary';
import { MediaService } from './media/MediaService';

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

    // Sync media references safely
    try {
      const allUrls = extractAllCloudinaryUrls(newContent);
      await MediaService.syncReferences('WebsiteContent', websiteContent._id, allUrls, 'content');
    } catch (err) {
      logger.error('Failed to sync CMS media references:', err);
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
