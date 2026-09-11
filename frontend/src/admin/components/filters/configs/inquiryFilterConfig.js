/**
 * inquiryFilterConfig.js
 * Declarative filter configuration for Custom Order Inquiries & Leads.
 */

export const inquiryFilterConfig = {
  itemName: 'inquiries',

  searchPredicate: (i, query) => {
    if (!query) return true;
    const q = query.toLowerCase().trim();
    const id = (i._id || i.customOrderId || '').toLowerCase();
    const customer = (i.customerName || i.name || i.userId?.name || '').toLowerCase();
    const phone = i.customerPhone || i.phone || i.userId?.phone || '';
    const email = (i.customerEmail || i.email || '').toLowerCase();
    const occasion = (i.occasion || i.customOrderType || '').toLowerCase();
    return (
      id.includes(q) ||
      customer.includes(q) ||
      phone.includes(q) ||
      email.includes(q) ||
      occasion.includes(q)
    );
  },

  fields: {
    // 1. Pipeline Status
    status: {
      label: 'Pipeline Stage',
      defaultValue: 'All',
      isDefault: (val) => val === 'All' || !val,
      predicate: (i, val) => {
        const stat = (i.status || '').toLowerCase();
        return stat === val.toLowerCase();
      },
      getChipLabel: (val) => `Stage: ${val.replace(/_/g, ' ')}`,
    },

    // 2. Custom Order Type / Occasion
    type: {
      label: 'Decor Type',
      defaultValue: 'All',
      isDefault: (val) => val === 'All' || !val,
      predicate: (i, val) => {
        const t = (i.customOrderType || i.occasion || '').toLowerCase();
        return t === val.toLowerCase();
      },
      getChipLabel: (val) => `Type: ${val}`,
    },

    // 3. Priority
    priority: {
      label: 'Priority',
      defaultValue: 'All',
      isDefault: (val) => val === 'All' || !val,
      predicate: (i, val) => {
        const prio = (i.priority || 'low').toLowerCase();
        return prio === val.toLowerCase();
      },
      getChipLabel: (val) => `Priority: ${val}`,
    },

    // 4. Event Proximity
    proximity: {
      label: 'Event Proximity',
      defaultValue: 'All',
      isDefault: (val) => val === 'All' || !val,
      predicate: (i, val) => {
        if (!i.eventDate) return false;
        const event = new Date(i.eventDate);
        if (isNaN(event.getTime())) return false;
        const now = new Date();
        const diffDays = Math.ceil((event - now) / (1000 * 60 * 60 * 24));

        if (val === 'urgent') return diffDays >= 0 && diffDays <= 7;
        if (val === 'this_month') return diffDays > 7 && diffDays <= 30;
        if (val === 'future') return diffDays > 30;
        return true;
      },
      getChipLabel: (val) => {
        if (val === 'urgent') return 'Event: Imminent (<7 Days)';
        if (val === 'this_month') return 'Event: This Month (8–30 Days)';
        if (val === 'future') return 'Event: Future (>30 Days)';
        return `Proximity: ${val}`;
      },
    },

    // 5. Budget Range (Min & Max ₹)
    budgetRange: {
      label: 'Budget',
      defaultValue: { min: '', max: '' },
      isDefault: (val) => !val || (val.min === '' && val.max === ''),
      predicate: (i, val) => {
        const budget = Number(i.quotation?.total || i.estimatedBudget || i.budget || 0);
        if (val.min !== '' && budget < Number(val.min)) return false;
        if (val.max !== '' && budget > Number(val.max)) return false;
        return true;
      },
      getChipLabel: (val) => {
        if (val.min !== '' && val.max !== '')
          return `Budget: ₹${Number(val.min).toLocaleString('en-IN')} – ₹${Number(val.max).toLocaleString('en-IN')}`;
        if (val.min !== '') return `Budget: ≥ ₹${Number(val.min).toLocaleString('en-IN')}`;
        if (val.max !== '') return `Budget: ≤ ₹${Number(val.max).toLocaleString('en-IN')}`;
        return null;
      },
    },
  },
};
