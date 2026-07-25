import Product from '../models/Product';
import ProductService from './productService';
import CatalogValue from '../models/CatalogValue';
import CatalogAttribute from '../models/CatalogAttribute';
import { MemoryCache } from '../utils/cache/MemoryCache';

const filterCache = new MemoryCache({
  defaultTtlMs: 5 * 60 * 1000, // 5 minutes
  maxKeys: 500,
  name: 'filterCache',
});

export class FilterService {
  static async getDynamicFilters(queryParams: any) {
    const cacheKey = JSON.stringify(queryParams || {});
    const cached = filterCache.get(cacheKey);
    if (cached) return cached;

    // 1. Build the exact match filter for the current search/category context
    const { filter } = await ProductService.buildProductFilterQuery(queryParams, false);

    // Fetch active filterable attributes to determine order
    const attributes = await CatalogAttribute.find({ isFilterable: true, isActive: true })
      .sort({ displayOrder: 1 })
      .lean();
    const attributeOrder = attributes.map((a) => a.name);

    // 2. Construct MongoDB $facet pipeline to compute all dynamic attributes simultaneously
    const facetPipeline: any = {
      categories: [{ $sortByCount: '$category' }],
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

    // Process Dynamic Variants (e.g., Color, Size, Material) with Canonical Registry
    if (result.variants?.length > 0) {
      const variantMap = new Map<string, any[]>();

      // Load canonical values for all variants found
      const variantSlugs = result.variants.map((v: any) =>
        v._id.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      );
      const canonicalValues = await CatalogValue.find({
        slug: { $in: variantSlugs },
        isVisible: true,
      }).lean();

      const canonicalMap = new Map();
      canonicalValues.forEach((cv) => canonicalMap.set(cv.slug, cv));

      result.variants.forEach((v: any) => {
        const name = v._id.name;
        const slug = v._id.value.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const canonical = canonicalMap.get(slug);

        // Hide minimum threshold (count < 2) unless we have a canonical override
        if (v.count < 2 && !canonical) return;

        if (!variantMap.has(name)) variantMap.set(name, []);
        variantMap.get(name)!.push({
          value: canonical ? canonical.value : v._id.value,
          label: canonical ? canonical.value : v._id.value,
          count: v.count,
          parentId: canonical?.parentId,
          sortOrder: canonical?.sortOrder || 999,
          slug: slug,
        });
      });

      variantMap.forEach((options, name) => {
        // Merge duplicates that resolved to the same canonical value
        const mergedOptions = Object.values(
          options.reduce((acc: any, curr: any) => {
            if (!acc[curr.value]) {
              acc[curr.value] = { ...curr };
            } else {
              acc[curr.value].count += curr.count;
            }
            return acc;
          }, {}),
        );

        // Handle Hierarchical Grouping (e.g., for Colors)
        const rootOptions: any[] = [];
        const childOptions: any[] = [];

        mergedOptions.forEach((opt: any) => {
          if (opt.parentId) childOptions.push(opt);
          else rootOptions.push(opt);
        });

        // Attach children to parents
        childOptions.forEach((child) => {
          const parent = canonicalValues.find(
            (cv) => cv._id.toString() === child.parentId.toString(),
          );
          if (parent) {
            let rootParent = rootOptions.find((r) => r.value === parent.value);
            if (!rootParent) {
              // Add parent even if it has count 0 to show hierarchy
              rootParent = {
                value: parent.value,
                label: parent.value,
                count: 0,
                sortOrder: parent.sortOrder,
                children: [],
              };
              rootOptions.push(rootParent);
            }
            if (!rootParent.children) rootParent.children = [];
            rootParent.children.push(child);
            rootParent.count += child.count; // Bubble up count
          }
        });

        if (rootOptions.length > 1) {
          filterGroups.push({
            id: name,
            label: name,
            type: 'checkbox',
            options: rootOptions.sort((a, b) => a.sortOrder - b.sortOrder || b.count - a.count), // Canonical order first, then popularity
          });
        }
      });
    }

    // Process Tags
    if (result.tags?.length > 1) {
      // Group tags by taxonomy if there are many
      const tagSlugs = result.tags.map((t: any) => t._id.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
      const canonicalTags = await CatalogValue.find({
        attributeSlug: 'tag',
        slug: { $in: tagSlugs },
        isVisible: true,
      }).lean();

      const tagOptions = result.tags
        .map((t: any) => {
          const slug = t._id.toLowerCase().replace(/[^a-z0-9]+/g, '-');
          const canonical = canonicalTags.find((ct) => ct.slug === slug);
          return {
            value: canonical ? canonical.value : t._id,
            label: canonical ? canonical.value : t._id,
            count: t.count,
            taxonomy: canonical?.taxonomy || 'Other',
            sortOrder: canonical?.usageCount || 0,
          };
        })
        .filter((t: any) => t.count >= 2); // Minimum threshold

      if (tagOptions.length > 15) {
        // Group by taxonomy
        const taxonomyGroups = tagOptions.reduce((acc: any, curr: any) => {
          if (!acc[curr.taxonomy]) acc[curr.taxonomy] = [];
          acc[curr.taxonomy].push(curr);
          return acc;
        }, {});

        Object.keys(taxonomyGroups).forEach((taxonomy) => {
          if (taxonomyGroups[taxonomy].length > 0) {
            filterGroups.push({
              id: `tags_${taxonomy}`,
              label: taxonomy === 'Other' ? 'Other Tags' : taxonomy,
              type: 'checkbox',
              options: taxonomyGroups[taxonomy]
                .sort((a: any, b: any) => b.sortOrder - a.sortOrder)
                .slice(0, 15),
            });
          }
        });
      } else {
        filterGroups.push({
          id: 'tags',
          label: 'Product Tags',
          type: 'checkbox',
          options: tagOptions.sort((a: any, b: any) => b.sortOrder - a.sortOrder).slice(0, 12),
        });
      }
    }

    // Apply CatalogAttribute display ordering
    if (attributeOrder.length > 0) {
      filterGroups.sort((a: any, b: any) => {
        const indexA = attributeOrder.findIndex(
          (p: string) => p.toLowerCase() === a.label.toLowerCase(),
        );
        const indexB = attributeOrder.findIndex(
          (p: string) => p.toLowerCase() === b.label.toLowerCase(),
        );
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return 0; // Keep current order if neither is in CatalogAttribute
      });
    }

    filterCache.set(cacheKey, filterGroups);
    return filterGroups;
  }

  static clearCache() {
    filterCache.clear();
  }
}

export default FilterService;
