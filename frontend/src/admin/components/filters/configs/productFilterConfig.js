/**
 * productFilterConfig.js
 * Declarative filter configuration for 5,000+ Products catalog.
 */

export const productFilterConfig = {
  itemName: 'products',

  // Search across product name, SKU / ID, and category name
  searchPredicate: (p, query) => {
    if (!query) return true;
    const q = query.toLowerCase().trim();
    const name = (p.name || '').toLowerCase();
    const id = (p.id || p._id || p.sku || '').toLowerCase();
    const category = (p.category || '').toLowerCase();
    return name.includes(q) || id.includes(q) || category.includes(q);
  },

  fields: {
    // 1. Category Filter
    category: {
      label: 'Category',
      defaultValue: 'All',
      isDefault: (val) => val === 'All' || !val,
      predicate: (p, val) => p.category === val,
      getChipLabel: (val) => `Category: ${val.replace(/_/g, ' ')}`,
    },

    // 2. Lifecycle Status (Active, Inactive, Draft)
    status: {
      label: 'Status',
      defaultValue: 'All',
      isDefault: (val) => val === 'All' || !val,
      predicate: (p, val) => {
        if (val === 'active') return p.status === 'active' || p.isActive !== false;
        if (val === 'inactive') return p.status === 'inactive' || p.isActive === false;
        if (val === 'draft') return p.status === 'draft';
        return p.status === val;
      },
      getChipLabel: (val) => {
        const labels = {
          active: 'Status: Active',
          inactive: 'Status: Inactive',
          draft: 'Status: Draft',
        };
        return labels[val] || `Status: ${val}`;
      },
    },

    // 5. Price Range (Min & Max ₹)
    priceRange: {
      label: 'Price Range',
      defaultValue: { min: '', max: '' },
      isDefault: (val) => !val || (val.min === '' && val.max === ''),
      predicate: (p, val) => {
        const price = Number(p.price ?? p.rentalPrice ?? 0);
        if (val.min !== '' && price < Number(val.min)) return false;
        if (val.max !== '' && price > Number(val.max)) return false;
        return true;
      },
      getChipLabel: (val) => {
        if (val.min !== '' && val.max !== '')
          return `Price: ₹${Number(val.min).toLocaleString('en-IN')} – ₹${Number(val.max).toLocaleString('en-IN')}`;
        if (val.min !== '') return `Price: ≥ ₹${Number(val.min).toLocaleString('en-IN')}`;
        if (val.max !== '') return `Price: ≤ ₹${Number(val.max).toLocaleString('en-IN')}`;
        return null;
      },
    },

    // 6. Catalog Hygiene / Media Audit (Missing images)
    media: {
      label: 'Photos',
      defaultValue: 'all',
      isDefault: (val) => val === 'all' || !val,
      predicate: (p, val) => {
        const images = p.images || p.rawProduct?.images || [];
        const hasImg = images.length > 0 && !!images[0];
        if (val === 'missing_images') return !hasImg;
        if (val === 'has_images') return hasImg;
        return true;
      },
      getChipLabel: (val) => {
        if (val === 'missing_images') return 'Media: Missing Photos';
        if (val === 'has_images') return 'Media: Has Photos';
        return null;
      },
    },

    // 7. Product Rental Availability (Rental vs Sale Only)
    type: {
      label: 'Rental Option',
      defaultValue: 'All',
      isDefault: (val) => val === 'All' || !val,
      predicate: (p, val) => {
        if (val === 'rental') return p.rawProduct?.rentalEnabled === true || p.isRental === true;
        if (val === 'sale_only' || val === 'non_rental')
          return !p.rawProduct?.rentalEnabled && !p.isRental;
        return true;
      },
      getChipLabel: (val) => {
        if (val === 'rental') return 'Rental Available';
        if (val === 'sale_only' || val === 'non_rental') return 'Sale Only (Non-Rental)';
        return `Type: ${val}`;
      },
    },
  },
};
