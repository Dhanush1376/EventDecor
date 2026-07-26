import CatalogValue from '../models/CatalogValue';
import logger from '../config/logger';

export class AiPromptContextBuilder {
  /**
   * Build a dynamic, focused context for AI prompt generation.
   * Only sends relevant approved attributes to reduce AI hallucinations.
   * Optionally takes a category array (e.g., ["Ring Tray", "Wedding"]) to apply business rules.
   */
  static async buildContext(_categories: string[] = []): Promise<{
    allowedColors: string[];
    allowedMaterials: string[];
    allowedSizes: string[];
    existingTags: string[];
  }> {
    try {
      // Future integration point: AdminBusinessRules could filter these lists based on categories
      // For now, return top approved values, prioritizing by usageCount

      const [colors, materials, sizes, tags] = await Promise.all([
        CatalogValue.find({ attributeSlug: 'color', status: 'approved' })
          .sort({ usageCount: -1, sortOrder: 1 })
          .limit(30)
          .select('value')
          .lean(),
        CatalogValue.find({ attributeSlug: 'material', status: 'approved' })
          .sort({ usageCount: -1, sortOrder: 1 })
          .limit(30)
          .select('value')
          .lean(),
        CatalogValue.find({ attributeSlug: 'size', status: 'approved' })
          .sort({ sortOrder: 1 })
          .limit(10)
          .select('value')
          .lean(),
        CatalogValue.find({ attributeSlug: 'tag', status: 'approved' })
          .sort({ usageCount: -1 })
          .limit(50)
          .select('value')
          .lean(),
      ]);

      return {
        allowedColors: colors.map((c) => c.value),
        allowedMaterials: materials.map((m) => m.value),
        allowedSizes: sizes.map((s) => s.value),
        existingTags: tags.map((t) => t.value),
      };
    } catch (err: any) {
      logger.error(`[AiPromptContextBuilder] Error building context: ${err.message}`);
      // Return safe empty fallbacks if DB query fails
      return {
        allowedColors: [],
        allowedMaterials: [],
        allowedSizes: [],
        existingTags: [],
      };
    }
  }
}
