import { Request, Response } from 'express';
import PageLayout from '../models/PageLayout';
import logger from '../config/logger';
import { bumpPublicCacheVersion } from '../utils/cacheVersion';

export const getLayoutByPath = async (req: Request, res: Response) => {
  try {
    const path = req.query.path as string; // e.g. path=/
    if (!path) {
      return res.status(400).json({ success: false, message: 'Path is required' });
    }

    let layout = await PageLayout.findOne({ pagePath: path, status: 'published' });
    if (!layout) {
      if (path === '/') {
        const defaultSections = [
          { componentName: 'HeroSection', props: {}, order: 1, isActive: true },
          { componentName: 'NavigationHub', props: {}, order: 2, isActive: true },
          { componentName: 'PersonalizedFeed', props: {}, order: 3, isActive: true },
          { componentName: 'TrendingSection', props: {}, order: 4, isActive: true },
          { componentName: 'SeasonalHighlights', props: {}, order: 5, isActive: true },
          { componentName: 'StorySection', props: {}, order: 6, isActive: true },
          { componentName: 'GallerySection', props: {}, order: 7, isActive: true },
        ];
        layout = await PageLayout.create({
          pagePath: '/',
          name: 'Default Homepage',
          status: 'published',
          sections: defaultSections,
        });
      } else {
        return res.status(404).json({ success: false, message: 'Layout not found' });
      }
    }

    // Sort active sections by order, filtering out VerifiedReviews entirely
    const activeSections = layout.sections
      .filter((s) => s.isActive && s.componentName !== 'VerifiedReviews')
      .sort((a, b) => a.order - b.order);

    res
      .status(200)
      .json({ success: true, data: { ...layout.toObject(), sections: activeSections } });
  } catch (error: any) {
    logger.error('Error fetching layout', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const getAllLayouts = async (req: Request, res: Response) => {
  try {
    logger.info('[PAGE_LAYOUT] Fetching all layouts...');
    const layouts = await PageLayout.find();

    // Filter out VerifiedReviews from sections array safely
    const cleanedLayouts = layouts.map((layout) => {
      const obj = layout.toObject();
      obj.sections = (obj.sections || []).filter(
        (s: any) => s?.componentName !== 'VerifiedReviews',
      );
      return obj;
    });

    logger.info(`[PAGE_LAYOUT] Found ${cleanedLayouts.length} layouts`);
    res.status(200).json({ success: true, data: cleanedLayouts });
  } catch (error: any) {
    logger.error('[PAGE_LAYOUT] Error fetching all layouts:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

export const createOrUpdateLayout = async (req: Request, res: Response) => {
  try {
    const { pagePath, name, sections, status } = req.body;
    const layout = await PageLayout.findOneAndUpdate(
      { pagePath },
      { pagePath, name, sections, status, updatedBy: req.user?.id },
      { returnDocument: 'after', upsert: true },
    );
    try {
      await bumpPublicCacheVersion();
    } catch (cacheErr) {
      logger.warn('[PAGE_LAYOUT] Failed to bump cache version on layout update:', cacheErr);
    }
    res.status(200).json({ success: true, data: layout });
  } catch (error: any) {
    logger.error('Error updating layout', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
