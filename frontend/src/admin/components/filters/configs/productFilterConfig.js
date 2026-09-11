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

    // 3. Canonical Stock Health Status
    // out_of_stock (0), critical_low (1-5), low_warning (6-15), in_stock (>15)
    stockStatus: {
      label: 'Stock Status',
      defaultValue: 'all',
      isDefault: (val) => val === 'all' || !val,
      predicate: (p, val) => {
        const stock = Number(p.stock ?? p.countInStock ?? 0);
        if (val === 'out_of_stock') return stock === 0;
        if (val === 'critical_low') return stock >= 1 && stock <= 5;
        if (val === 'low_warning') return stock >= 6 && stock <= 15;
        if (val === 'in_stock') return stock > 15;
        return true;
      },
      getChipLabel: (val) => {
        const labels = {
          out_of_stock: 'Stock: Out of Stock (0)',
          critical_low: 'Stock: Critical Low (1–5)',
          low_warning: 'Stock: Low Warning (6–15)',
          in_stock: 'Stock: In Stock (>15)',
        };
        return labels[val] || `Stock: ${val}`;
      },
    },

    // 4. Custom Stock Range (Min & Max exact units)
    stockRange: {
      label: 'Stock Range',
      defaultValue: { min: '', max: '' },
      isDefault: (val) => !val || (val.min === '' && val.max === ''),
      predicate: (p, val) => {
        const stock = Number(p.stock ?? p.countInStock ?? 0);
        if (val.min !== '' && stock < Number(val.min)) return false;
        if (val.max !== '' && stock > Number(val.max)) return false;
        return true;
      },
      getChipLabel: (val) => {
        if (val.min !== '' && val.max !== '') return `Stock Units: ${val.min}–${val.max}`;
        if (val.min !== '') return `Stock Units: ≥ ${val.min}`;
        if (val.max !== '') return `Stock Units: ≤ ${val.max}`;
        return null;
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
