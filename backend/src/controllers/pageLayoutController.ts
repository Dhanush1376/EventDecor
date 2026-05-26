import { Request, Response } from 'express';
import PageLayout from '../models/PageLayout';
import logger from '../config/logger';

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
          { componentName: 'VerifiedReviews', props: {}, order: 8, isActive: true }
        ];
        layout = await PageLayout.create({
          pagePath: '/',
          name: 'Default Homepage',
          status: 'published',
          sections: defaultSections
        });
      } else {
        return res.status(404).json({ success: false, message: 'Layout not found' });
      }
    }

    // Sort active sections by order
    const activeSections = layout.sections
      .filter((s) => s.isActive)
      .sort((a, b) => a.order - b.order);

    res.status(200).json({ success: true, data: { ...layout.toObject(), sections: activeSections } });
  } catch (error: any) {
    logger.error('Error fetching layout', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const getAllLayouts = async (req: Request, res: Response) => {
  try {
    const layouts = await PageLayout.find();
    res.status(200).json({ success: true, data: layouts });
  } catch (error: any) {
    logger.error('Error fetching all layouts', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const createOrUpdateLayout = async (req: Request, res: Response) => {
  try {
    const { pagePath, name, sections, status } = req.body;
    const layout = await PageLayout.findOneAndUpdate(
      { pagePath },
      { pagePath, name, sections, status, updatedBy: req.user?.id },
      { new: true, upsert: true }
    );
    res.status(200).json({ success: true, data: layout });
  } catch (error: any) {
    logger.error('Error updating layout', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
