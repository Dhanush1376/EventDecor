import { isWithinPeriod } from '../../../utils/dateFilters';

/**
 * recycleBinFilterConfig.js
 * Declarative filter configuration for Recycle Bin soft-deleted records.
 */

export const recycleBinFilterConfig = {
  itemName: 'deleted records',

  searchPredicate: (item, query) => {
    if (!query) return true;
    const q = query.toLowerCase().trim();
    const name = (item.name || item.title || item.entityId || '').toLowerCase();
    const id = (item._id || item.id || '').toLowerCase();
    const type = (item.entityType || '').toLowerCase();
    const deletedBy = (item.deletedBy?.name || item.deletedBy?.email || '').toLowerCase();
    return name.includes(q) || id.includes(q) || type.includes(q) || deletedBy.includes(q);
  },

  fields: {
    // 1. Entity Type
    entityType: {
      label: 'Record Type',
      defaultValue: 'all',
      isDefault: (val) => val === 'all' || !val,
      predicate: (item, val) => (item.entityType || '').toLowerCase() === val.toLowerCase(),
      getChipLabel: (val) => `Type: ${val}`,
    },

    // 2. Retention / Time Range
    timeRange: {
      label: 'Retention / Expiry',
      defaultValue: '',
      isDefault: (val) => !val,
      predicate: (item, val) => {
        const deletedAt = item.deletedAt || item.createdAt;
        if (val === 'today') return isWithinPeriod(deletedAt, 'Today');
        if (val === '7days') return isWithinPeriod(deletedAt, 'Last 7 Days');
        if (val === 'expiring_soon') {
          // Expiring in <= 3 days (expiresAt or 30 days - deletedAt)
          const expiry = item.expiresAt ? new Date(item.expiresAt) : null;
          if (!expiry && deletedAt) {
            const d = new Date(deletedAt);
            d.setDate(d.getDate() + 30);
            const now = new Date();
            const daysLeft = (d - now) / (1000 * 60 * 60 * 24);
            return daysLeft >= 0 && daysLeft <= 3;
          }
          if (expiry) {
            const daysLeft = (expiry - new Date()) / (1000 * 60 * 60 * 24);
            return daysLeft >= 0 && daysLeft <= 3;
          }
        }
        if (val === 'expired') {
          const expiry = item.expiresAt ? new Date(item.expiresAt) : null;
          if (expiry) return expiry < new Date();
        }
        return true;
      },
      getChipLabel: (val) => {
        const labels = {
          today: 'Deleted: Today',
          '7days': 'Deleted: Last 7 Days',
          expiring_soon: 'Retention: Expiring Soon (≤3d)',
          expired: 'Retention: Expired',
        };
        return labels[val] || `Retention: ${val}`;
      },
    },
  },
};
