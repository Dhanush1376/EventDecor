import mongoose from 'mongoose';
import Product from '../models/Product';
import ProductService from './productService';
import AppConfig from '../models/AppConfig';

export class FilterService {
  static async getDynamicFilters(queryParams: any) {
    // 1. Build the exact match filter for the current search/category context
    // This allows facet counts to be relative to what's currently being viewed.
    const { filter } = await ProductService.buildProductFilterQuery(queryParams, false);

    // 2. Load Admin configurations for filters
    let config: { hidden: string[]; priority: string[] } = { hidden: [], priority: [] };
    try {
      const appConfig = await AppConfig.findOne({ key: 'dynamic_filters_config' }).lean();
      if (appConfig && appConfig.value) {
        config = appConfig.value;
      }
    } catch (e) {}

    // 3. Construct MongoDB $facet pipeline to compute all dynamic attributes simultaneously
    const facetPipeline: any = {
      categories: [{ $sortByCount: '$category' }],
      materials: [
        { $match: { material: { $exists: true, $ne: '' } } },
        { $sortByCount: '$material' },
      ],
      tags: [{ $unwind: '$tags' }, { $sortByCount: '$tags' }],
      priceRanges: [
        {
          $bucket: {
            groupBy: '$price',
            boundaries: [0, 2000, 5000, 10000, 25000, 50000, 100000],
            default: 'Over 100000',
          },
        },
      ],
      variants: [
        { $unwind: '$variants' },
        {
          $group: {
            _id: { name: '$variants.name', value: '$variants.value' },
            count: { $sum: 1 },
          },
        },
      ],
    };

    const aggregation = await Product.aggregate([{ $match: filter }, { $facet: facetPipeline }]);

    const result = aggregation[0];
    const filterGroups: any[] = [];

    // Process Categories
    if (result.categories?.length > 1) {
      filterGroups.push({
        id: 'category',
        label: 'Category',
        type: 'checkbox',
        options: result.categories.map((c: any) => ({
          value: c._id,
          label: c._id,
          count: c.count,
        })),
      });
    }

    // Process Price Ranges
    if (result.priceRanges?.length > 0) {
      const priceMapping: Record<string, { label: string; val: string }> = {
        '0': { label: 'Under ₹2,000', val: '0-2000' },
        '2000': { label: '₹2,000 - ₹5,000', val: '2000-5000' },
        '5000': { label: '₹5,000 - ₹10,000', val: '5000-10000' },
        '10000': { label: '₹10,000 - ₹25,000', val: '10000-25000' },
        '25000': { label: '₹25,000 - ₹50,000', val: '25000-50000' },
        '50000': { label: '₹50,000 - ₹100,000', val: '50000-100000' },
        'Over 100000': { label: 'Over ₹100,000', val: '100000-' },
      };

      const priceOptions = result.priceRanges.map((b: any) => {
        const mapped = priceMapping[b._id.toString()];
        return {
          value: mapped ? mapped.val : b._id.toString(),
          label: mapped ? mapped.label : b._id.toString(),
          count: b.count,
        };
      });

      if (priceOptions.length > 1) {
        filterGroups.push({
          id: 'priceRange',
          label: 'Price Range',
          type: 'checkbox',
          options: priceOptions,
        });
      }
    }

    // Process Materials
    if (result.materials?.length > 1) {
      filterGroups.push({
        id: 'material',
        label: 'Material',
        type: 'checkbox',
        options: result.materials.map((m: any) => ({
          value: m._id,
          label: m._id,
          count: m.count,
        })),
      });
    }

    // Process Dynamic Variants (e.g., Color, Size)
    if (result.variants?.length > 0) {
      const variantMap = new Map<string, any[]>();
      result.variants.forEach((v: any) => {
        const name = v._id.name;
        if (!variantMap.has(name)) variantMap.set(name, []);
        variantMap.get(name)!.push({
          value: v._id.value,
          label: v._id.value,
          count: v.count,
        });
      });

      variantMap.forEach((options, name) => {
        if (options.length > 1) {
          filterGroups.push({
            id: name,
            label: name, // Uses variant name from DB directly
            type: 'checkbox',
            options: options.sort((a, b) => b.count - a.count),
          });
        }
      });
    }

    // Process Tags
    if (result.tags?.length > 1) {
      filterGroups.push({
        id: 'tags',
        label: 'Product Tags',
        type: 'checkbox',
        options: result.tags.slice(0, 12).map((t: any) => ({
          value: t._id,
          label: t._id,
          count: t.count,
        })),
      });
    }

    // Apply Admin Config
    let finalGroups = filterGroups.filter(
      (g: any) => !(config.hidden || []).includes(g.id.toLowerCase()),
    );

    if (config.priority && config.priority.length > 0) {
      finalGroups.sort((a: any, b: any) => {
        const indexA = config.priority.findIndex(
          (p: string) => p.toLowerCase() === a.id.toLowerCase(),
        );
        const indexB = config.priority.findIndex(
          (p: string) => p.toLowerCase() === b.id.toLowerCase(),
        );
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return 0;
      });
    }

    return finalGroups;
  }
}
export default FilterService;
