/**
 * showcaseFilterConfig.js
 * Declarative filter configuration for Tambulam & Event Showcases.
 */

export const showcaseFilterConfig = {
  itemName: 'showcases',

  searchPredicate: (s, query) => {
    if (!query) return true;
    const q = query.toLowerCase().trim();
    const title = (s.title || '').toLowerCase();
    const category = (s.category || s.occasion || '').toLowerCase();
    const desc = (s.description || '').toLowerCase();
    return title.includes(q) || category.includes(q) || desc.includes(q);
  },

  fields: {
    // 1. Occasion / Category
    category: {
      label: 'Occasion',
      defaultValue: 'All',
      isDefault: (val) => val === 'All' || !val,
      predicate: (s, val) => {
        const cat = (s.category || s.occasion || '').toLowerCase();
        return cat === val.toLowerCase();
      },
      getChipLabel: (val) => `Occasion: ${val}`,
    },

    // 2. Status
    status: {
      label: 'Status',
      defaultValue: 'All',
      isDefault: (val) => val === 'All' || !val,
      predicate: (s, val) => {
        if (val === 'active') return s.isActive !== false;
        if (val === 'inactive') return s.isActive === false;
        return true;
      },
      getChipLabel: (val) => (val === 'active' ? 'Status: Active' : 'Status: Inactive'),
    },

    // 3. Price Range (₹)
    priceRange: {
      label: 'Price Range',
      defaultValue: { min: '', max: '' },
      isDefault: (val) => !val || (val.min === '' && val.max === ''),
      predicate: (s, val) => {
        const price = Number(s.price || s.startingPrice || 0);
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
  },
};
