import { isWithinPeriod } from '../../../utils/dateFilters';

/**
 * orderFilterConfig.js
 * Declarative filter configuration for 1,000+ Orders & Fulfillment operations.
 * Separates fulfillment status from order type, and separates delivery/event dates from placement dates.
 */

export const orderFilterConfig = {
  itemName: 'orders',

  // Search across order number, customer name, phone, email, tracking ID
  searchPredicate: (o, query) => {
    if (!query) return true;
    const q = query.toLowerCase().trim();
    const id = (o.id || o._id || o.orderNumber || '').toLowerCase();
    const customer = (
      o.customer ||
      o.shippingAddress?.name ||
      o.rawOrder?.userId?.name ||
      ''
    ).toLowerCase();
    const phone = o.phone || o.shippingAddress?.phone || o.rawOrder?.userId?.phone || '';
    const email = (
      o.email ||
      o.shippingAddress?.email ||
      o.rawOrder?.userId?.email ||
      ''
    ).toLowerCase();
    return id.includes(q) || customer.includes(q) || phone.includes(q) || email.includes(q);
  },

  fields: {
    // 1. Order Fulfillment Lifecycle Status
    fulfillmentStatus: {
      label: 'Fulfillment Status',
      defaultValue: 'All Statuses',
      isDefault: (val) => val === 'All Statuses' || !val,
      predicate: (o, val) => {
        const status = o.status || o.orderStatus || 'Pending';
        return status.toLowerCase() === val.toLowerCase();
      },
      getChipLabel: (val) => `Status: ${val}`,
    },

    // 2. Event / Delivery Schedule (Evaluated on Delivery Date, NOT Placement Date)
    deliveryEventTiming: {
      label: 'Delivery Date',
      defaultValue: 'All Time',
      isDefault: (val) => val === 'All Time' || !val,
      predicate: (o, val, state) => {
        const deliveryDate =
          o.deliveryDate ||
          o.eventDate ||
          o.rawOrder?.deliveryDate ||
          o.rawOrder?.eventDate ||
          o.rawOrder?.rentalStartDate;
        if (!deliveryDate) return false;
        return isWithinPeriod(deliveryDate, val, state?.customDeliveryRange);
      },
      getChipLabel: (val, state) => {
        if (val === 'Custom' && state?.customDeliveryRange?.from) {
          return `Delivery: ${state.customDeliveryRange.from} to ${state.customDeliveryRange.to || 'now'}`;
        }
        return `Delivery: ${val}`;
      },
    },

    // 4. Order Placement Date (Evaluated on Created Date)
    placementDate: {
      label: 'Date Placed',
      defaultValue: 'All Time',
      isDefault: (val) => val === 'All Time' || !val,
      predicate: (o, val, state) => {
        const placedDate = o.rawOrder?.createdAt || o.date || o.createdAt;
        if (!placedDate) return false;
        return isWithinPeriod(placedDate, val, state?.customPlacementRange);
      },
      getChipLabel: (val, state) => {
        if (val === 'Custom' && state?.customPlacementRange?.from) {
          return `Placed: ${state.customPlacementRange.from} to ${state.customPlacementRange.to || 'now'}`;
        }
        return `Placed: ${val}`;
      },
    },

    // 5. Payment Status
    paymentStatus: {
      label: 'Payment Status',
      defaultValue: 'All',
      isDefault: (val) => val === 'All' || !val,
      predicate: (o, val) => {
        const paymentStat = (
          o.rawOrder?.paymentStatus ||
          o.paymentStatus ||
          'pending'
        ).toLowerCase();
        if (val.toLowerCase() === 'paid') {
          return paymentStat === 'paid' || paymentStat === 'captured';
        }
        return paymentStat === val.toLowerCase();
      },
      getChipLabel: (val) => `Payment: ${val}`,
    },

    // 6. Payment Method (COD vs Prepaid Online)
    paymentMethod: {
      label: 'Payment Method',
      defaultValue: 'All',
      isDefault: (val) => val === 'All' || !val,
      predicate: (o, val) => {
        const method = (o.rawOrder?.paymentMethod || o.paymentMethod || '').toLowerCase();
        if (val === 'cod') return method === 'cod' || method === 'cash';
        if (val === 'online') return method !== 'cod' && method !== 'cash';
        return true;
      },
      getChipLabel: (val) =>
        val === 'cod' ? 'Method: Cash on Delivery (COD)' : 'Method: Online Prepaid',
    },

    // 7. Order Value Range (₹)
    orderValue: {
      label: 'Order Value',
      defaultValue: { min: '', max: '' },
      isDefault: (val) => !val || (val.min === '' && val.max === ''),
      predicate: (o, val) => {
        const amount = Number(o.total || o.totalAmount || o.rawOrder?.totalAmount || 0);
        if (val.min !== '' && amount < Number(val.min)) return false;
        if (val.max !== '' && amount > Number(val.max)) return false;
        return true;
      },
      getChipLabel: (val) => {
        if (val.min !== '' && val.max !== '')
          return `Value: ₹${Number(val.min).toLocaleString('en-IN')} – ₹${Number(val.max).toLocaleString('en-IN')}`;
        if (val.min !== '') return `Value: ≥ ₹${Number(val.min).toLocaleString('en-IN')}`;
        if (val.max !== '') return `Value: ≤ ₹${Number(val.max).toLocaleString('en-IN')}`;
        return null;
      },
    },

    // 8. Attention & Operational Warning Flags
    attention: {
      label: 'Attention Needed',
      defaultValue: 'All',
      isDefault: (val) => val === 'All' || !val,
      predicate: (o, val) => {
        if (val === 'Needs Attention') {
          return (
            o.rawOrder?.delayWarning === true ||
            o.rawOrder?.isOnHold === true ||
            o.needsAttention === true
          );
        }
        if (val === 'On Hold') {
          return o.rawOrder?.isOnHold === true;
        }
        return true;
      },
      getChipLabel: (val) => `Flag: ${val}`,
    },
  },
};
