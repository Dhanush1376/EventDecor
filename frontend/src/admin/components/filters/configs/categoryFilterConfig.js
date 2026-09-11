/**
 * categoryFilterConfig.js
 * Declarative filter configuration for Categories management.
 */

export const categoryFilterConfig = {
  itemName: 'categories',

  searchPredicate: (c, query) => {
    if (!query) return true;
    const q = query.toLowerCase().trim();
    const name = (c.name || '').toLowerCase();
    const slug = (c.slug || '').toLowerCase();
    const type = (c.type || '').toLowerCase();
    const desc = (c.description || '').toLowerCase();
    return name.includes(q) || slug.includes(q) || type.includes(q) || desc.includes(q);
  },

  fields: {
    // 1. Scope / Type Filter
    type: {
      label: 'Scope / Type',
      defaultValue: 'All',
      isDefault: (val) => val === 'All' || !val,
      predicate: (c, val) => {
        return (c.type || '').toLowerCase() === val.toLowerCase();
      },
      getChipLabel: (val) => `Scope: ${val.charAt(0).toUpperCase() + val.slice(1)}`,
    },

    // 2. Status (Active vs Inactive)
    status: {
      label: 'Status',
      defaultValue: 'All',
      isDefault: (val) => val === 'All' || !val,
      predicate: (c, val) => {
        if (val === 'active') return c.isActive !== false;
        if (val === 'inactive') return c.isActive === false;
        return true;
      },
      getChipLabel: (val) => (val === 'active' ? 'Status: Active' : 'Status: Inactive'),
    },

    // 3. Inventory Coverage (Prune empty categories or find populated categories)
    inventoryCoverage: {
      label: 'Products Count',
      defaultValue: 'All',
      isDefault: (val) => val === 'All' || !val,
      predicate: (c, val) => {
        const count = Number(c.productCount ?? c.itemCount ?? 0);
        if (val === 'has_products') return count > 0;
        if (val === 'empty') return count === 0;
        if (val === 'heavy') return count >= 20;
        return true;
      },
      getChipLabel: (val) => {
        if (val === 'has_products') return 'Catalog: Has Products (>0)';
        if (val === 'empty') return 'Catalog: Empty (0 Products)';
        if (val === 'heavy') return 'Catalog: 20+ Products';
        return `Products: ${val}`;
      },
    },

    // 4. Storefront Visibility / Featured
    featured: {
      label: 'Navbar / Homepage',
      defaultValue: 'All',
      isDefault: (val) => val === 'All' || !val,
      predicate: (c, val) => {
        if (val === 'featured') return c.isFeatured === true || c.showOnNav === true;
        if (val === 'standard') return !c.isFeatured && !c.showOnNav;
        return true;
      },
      getChipLabel: (val) => (val === 'featured' ? 'Storefront: Featured' : 'Storefront: Standard'),
    },
  },
};
