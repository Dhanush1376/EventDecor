import { Request, Response } from 'express';
import CustomOrderConfig from '../../models/CustomOrderConfig';
import WebsiteContent from '../../models/WebsiteContent';
import asyncHandler from '../../utils/asyncHandler';
import ApiResponse from '../../utils/ApiResponse';

// DEFAULT CONFIG OPTIONS
const DEFAULT_CONFIG = {
  occasions: [
    { id: 'wedding', label: 'Wedding / Vivaham', enabled: true },
    { id: 'haldi', label: 'Haldi & Mehndi Ceremony', enabled: true },
    { id: 'reception', label: 'Reception Style Gala', enabled: true },
    { id: 'housewarming', label: 'Housewarming / Gruhapravesam', enabled: true },
    { id: 'baby_shower', label: 'Baby Shower / Seemantham', enabled: true },
    { id: 'corporate', label: 'Corporate & Banquet Decor', enabled: true },
    { id: 'other', label: 'Custom Festive Gathering', enabled: true },
  ],
  productTypes: [
    { id: 'mandapam', label: 'Full Mandapam Setup', enabled: true },
    { id: 'backdrop', label: 'Floral Backdrop Curations', enabled: true },
    { id: 'lounge', label: 'Luxury Reception Lounge', enabled: true },
    { id: 'table_scapes', label: 'Artisanal Table Centerpieces', enabled: true },
    { id: 'entrance', label: 'Grand Archways & Entrances', enabled: true },
    { id: 'brass_props', label: 'Handcrafted Brass Installations', enabled: true },
    { id: 'other', label: 'Bespoke Custom Artifacts', enabled: true },
  ],
  themes: [
    { id: 'traditional', label: 'Royal South Indian Heritage', enabled: true },
    { id: 'marigold_blast', label: 'Haldi Vibrant Yellows & Golds', enabled: true },
    { id: 'modern_gold', label: 'Contemporary Glassmorphism & Gold', enabled: true },
    { id: 'pastel_palace', label: 'Soft Pastel Florals & Ivory', enabled: true },
    { id: 'minimalist', label: 'Minimalist Wooden Craftsmanship', enabled: true },
  ],
  budgetRanges: [
    { id: 'low', label: '₹10,000 - ₹50,000', enabled: true },
    { id: 'medium', label: '₹50,000 - ₹1,500,000', enabled: true },
    { id: 'high', label: '₹1,500,000 - ₹5,000,000', enabled: true },
    { id: 'ultra', label: '₹5,000,000+', enabled: true },
  ],
  bookingTypes: [
    { id: 'video', label: 'Premium Video Consultation', enabled: true },
    { id: 'call', label: 'Direct Audio Conference', enabled: true },
    { id: 'in_person', label: 'In-Studio Creative Meeting', enabled: true },
  ],
};

export const getCustomOrderConfig = asyncHandler(async (req: Request, res: Response) => {
  // Try to find the active V2 configuration (MUST be published)
  const config = await CustomOrderConfig.findOne({ isActive: true, status: 'published' })
    .sort({ version: -1 })
    .lean();

  if (config) {
    res
      .status(200)
      .json(new ApiResponse(true, 'Dynamic custom order configuration fetched', config));
    return;
  }

  // Fallback to V1
  const v1Config = await WebsiteContent.findOne({ key: 'customOrderConfig' }).lean();
  if (v1Config) {
    res
      .status(200)
      .json(new ApiResponse(true, 'Legacy custom order configuration fetched', v1Config.content));
    return;
  }

  res
    .status(200)
    .json(new ApiResponse(true, 'Default custom order configuration fetched', DEFAULT_CONFIG));
});

export const adminGetCustomOrderConfig = asyncHandler(async (req: Request, res: Response) => {
  // Requires authentication. Finds the latest config (draft or published)
  const config = await CustomOrderConfig.findOne().sort({ version: -1 }).lean();

  if (config) {
    res.status(200).json(new ApiResponse(true, 'Admin config fetched', config));
    return;
  }

  res.status(200).json(new ApiResponse(true, 'No config found', null));
});

export const adminSaveCustomOrderConfigDraft = asyncHandler(async (req: Request, res: Response) => {
  const { content } = req.body;
  if (!content || !Array.isArray(content.types)) {
    res.status(400).json(new ApiResponse(false, 'Invalid config payload'));
    return;
  }

  const lastConfig = await CustomOrderConfig.findOne().sort({ version: -1 });

  let draftConfig;
  if (lastConfig && lastConfig.status === 'draft') {
    // Update existing draft
    lastConfig.types = content.types;
    lastConfig.updatedAt = new Date();
    await lastConfig.save();
    draftConfig = lastConfig;
  } else {
    // Create new draft version
    const nextVersion = lastConfig ? lastConfig.version + 1 : 1;
    draftConfig = await CustomOrderConfig.create({
      version: nextVersion,
      status: 'draft',
      types: content.types,
      isActive: false, // Drafts are never active storefronts
      createdBy: (req as any).user._id,
    });
  }

  res.status(200).json(new ApiResponse(true, 'Draft saved successfully', draftConfig));
});

export const adminUpdateCustomOrderConfig = asyncHandler(async (req: Request, res: Response) => {
  const { content } = req.body;

  // Save legacy V1 config for backwards compatibility
  await WebsiteContent.findOneAndUpdate(
    { key: 'customOrderConfig' },
    {
      content,
      lastUpdatedBy: (req as any).user._id,
    },
    { upsert: true },
  );

  if (content && Array.isArray(content.types)) {
    const lastConfig = await CustomOrderConfig.findOne().sort({ version: -1 });
    let publishedConfig;

    if (lastConfig && lastConfig.status === 'draft') {
      // Publish the current draft
      lastConfig.types = content.types;
      lastConfig.status = 'published';
      lastConfig.isActive = true;
      await lastConfig.save();
      publishedConfig = lastConfig;
    } else {
      // Create new published version
      const nextVersion = lastConfig ? lastConfig.version + 1 : 1;
      publishedConfig = await CustomOrderConfig.create({
        version: nextVersion,
        status: 'published',
        types: content.types,
        isActive: true,
        createdBy: (req as any).user._id,
      });
    }

    // Deactivate all others
    await CustomOrderConfig.updateMany(
      { _id: { $ne: publishedConfig._id }, isActive: true },
      { $set: { isActive: false } },
    );

    res
      .status(200)
      .json(
        new ApiResponse(
          true,
          'Custom order configuration V2 published successfully',
          publishedConfig,
        ),
      );
    return;
  }

  res
    .status(200)
    .json(
      new ApiResponse(true, 'Legacy custom order configuration published successfully', content),
    );
});
