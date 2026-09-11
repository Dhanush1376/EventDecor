import { isWithinPeriod } from '../../../utils/dateFilters';

/**
 * rentalFilterConfig.js
 * Declarative filter configuration for Rental Orders & Logistics.
 */

export const rentalFilterConfig = {
  itemName: 'rentals',

  searchPredicate: (r, query) => {
    if (!query) return true;
    const q = query.toLowerCase().trim();
    const id = (r._id || r.rentalOrderId || '').toLowerCase();
    const customer = (
      r.userId?.name ||
      r.user?.name ||
      r.shippingAddress?.name ||
      ''
    ).toLowerCase();
    const phone = r.userId?.phone || r.user?.phone || r.shippingAddress?.phone || '';
    const product = (r.productTitle || '').toLowerCase();
    return id.includes(q) || customer.includes(q) || phone.includes(q) || product.includes(q);
  },

  fields: {
    // 1. Rental Status
    status: {
      label: 'Rental Status',
      defaultValue: 'All',
      isDefault: (val) => val === 'All' || !val,
      predicate: (r, val) => {
        const stat = (r.status || '').toLowerCase();
        return stat === val.toLowerCase();
      },
      getChipLabel: (val) => `Rental: ${val.replace(/_/g, ' ')}`,
    },

    // 2. Event / Rental Date
    timing: {
      label: 'Rental Event Date',
      defaultValue: 'All Time',
      isDefault: (val) => val === 'All Time' || !val,
      predicate: (r, val, state) => {
        const eventDate = r.rentalStartDate || r.startDate || r.createdAt;
        if (!eventDate) return false;
        return isWithinPeriod(eventDate, val, state?.customDateRange);
      },
      getChipLabel: (val) => `Event Date: ${val}`,
    },

    // 3. Security Deposit Status
    depositStatus: {
      label: 'Security Deposit',
      defaultValue: 'All',
      isDefault: (val) => val === 'All' || !val,
      predicate: (r, val) => {
        const dep = (r.depositStatus || '').toLowerCase();
        if (val === 'refunded') return dep === 'refunded';
        if (val === 'held') return dep !== 'refunded' && r.status !== 'cancelled';
        if (val === 'forfeited') return dep === 'forfeited';
        return true;
      },
      getChipLabel: (val) => {
        const labels = {
          held: 'Deposit: Held / Active',
          refunded: 'Deposit: Refunded',
          forfeited: 'Deposit: Forfeited',
        };
        return labels[val] || `Deposit: ${val}`;
      },
    },

    // 4. Rental Amount Range
    amountRange: {
      label: 'Rental Charge',
      defaultValue: { min: '', max: '' },
      isDefault: (val) => !val || (val.min === '' && val.max === ''),
      predicate: (r, val) => {
        const total = Number(r.totalAmount || r.rentalCharge || 0);
        if (val.min !== '' && total < Number(val.min)) return false;
        if (val.max !== '' && total > Number(val.max)) return false;
        return true;
      },
      getChipLabel: (val) => {
        if (val.min !== '' && val.max !== '')
          return `Rent: ₹${Number(val.min).toLocaleString('en-IN')} – ₹${Number(val.max).toLocaleString('en-IN')}`;
        if (val.min !== '') return `Rent: ≥ ₹${Number(val.min).toLocaleString('en-IN')}`;
        if (val.max !== '') return `Rent: ≤ ₹${Number(val.max).toLocaleString('en-IN')}`;
        return null;
      },
    },
  },
};
