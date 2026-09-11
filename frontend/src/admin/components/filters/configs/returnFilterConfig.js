import { isWithinPeriod } from '../../../utils/dateFilters';

/**
 * returnFilterConfig.js
 * Declarative filter configuration for Returns & Reverse Logistics hub.
 */

export const returnFilterConfig = {
  itemName: 'returns',

  searchPredicate: (r, query) => {
    if (!query) return true;
    const q = query.toLowerCase().trim();
    const id = (r._id || r.returnId || '').toLowerCase();
    const orderId = (
      typeof r.orderId === 'object'
        ? r.orderId?._id || r.orderId?.orderId || r.orderId?.orderNumber || ''
        : r.orderId || ''
    ).toLowerCase();
    const customer = (
      r.userId?.name ||
      r.user?.name ||
      r.customer?.name ||
      r.customerName ||
      r.orderId?.shippingAddress?.name ||
      ''
    ).toLowerCase();
    const phone =
      r.pickup?.address?.phone ||
      r.userId?.phone ||
      r.user?.phone ||
      r.customer?.phone ||
      r.orderId?.shippingAddress?.phone ||
      '';
    const email = (r.userId?.email || r.user?.email || r.customer?.email || '').toLowerCase();
    const itemsMatch = r.items?.some((item) =>
      (item.title || item.name || item.product?.title || '').toLowerCase().includes(q),
    );
    const trackingMatch = (r.pickup?.trackingId || '').toLowerCase().includes(q);

    return (
      id.includes(q) ||
      orderId.includes(q) ||
      customer.includes(q) ||
      phone.includes(q) ||
      email.includes(q) ||
      itemsMatch ||
      trackingMatch
    );
  },

  fields: {
    // 1. Saved View (Quick Filter Preset)
    savedView: {
      label: 'Saved View',
      defaultValue: 'All Returns',
      isDefault: (val) => val === 'All Returns' || !val,
      predicate: (r, val) => {
        if (val === 'Needs Attention') return r.status === 'submitted';
        if (val === 'Pending Pickup') {
          return ['approved', 'return_courier_assigned', 'return_picked_up'].includes(r.status);
        }
        if (val === 'Pending Inspection') {
          return ['return_received', 'inspection_started'].includes(r.status);
        }
        if (val === 'Refund Ready') {
          return ['inspection_completed', 'refund_initiated'].includes(r.status);
        }
        if (val === 'Completed & Settled') {
          return ['completed', 'refund_completed'].includes(r.status);
        }
        if (val === 'High Fraud Risk') {
          return Number(r.fraudScore || 0) >= 50 || Boolean(r.isHighFraudRisk);
        }
        return true;
      },
      getChipLabel: (val) => `View: ${val}`,
    },

    // 2. Request Type
    returnType: {
      label: 'Request Type',
      defaultValue: 'All',
      isDefault: (val) => val === 'All' || !val,
      predicate: (r, val) => {
        if (val === 'exchange') {
          return r.returnType === 'exchange' || Boolean(r.exchangeId) || Boolean(r.exchangeDetails);
        }
        if (val === 'return') {
          return r.returnType === 'return' || (!r.exchangeId && !r.exchangeDetails);
        }
        return true;
      },
      getChipLabel: (val) => `Type: ${val === 'exchange' ? 'Exchanges Only' : 'Returns Only'}`,
    },

    // 3. Return Status
    status: {
      label: 'Status',
      defaultValue: 'All',
      isDefault: (val) => val === 'All' || !val,
      predicate: (r, val) => {
        const stat = (r.status || '').toLowerCase();
        return stat === val.toLowerCase();
      },
      getChipLabel: (val) => `Status: ${val.replace(/_/g, ' ')}`,
    },

    // 4. Return Reason
    reason: {
      label: 'Reason',
      defaultValue: 'All',
      isDefault: (val) => val === 'All' || !val,
      predicate: (r, val) => {
        const reason = (r.reason || r.returnReason || '').toLowerCase();
        return reason.includes(val.toLowerCase());
      },
      getChipLabel: (val) => `Reason: ${val}`,
    },

    // 5. Urgency & SLA (>48h pending action)
    sla: {
      label: 'SLA Urgency',
      defaultValue: 'All',
      isDefault: (val) => val === 'All' || !val,
      predicate: (r, val) => {
        const created = new Date(r.createdAt || r.requestDate);
        if (isNaN(created.getTime())) return true;
        const now = new Date();
        const hoursAgo = (now - created) / (1000 * 60 * 60);

        if (val === 'overdue') {
          const isPending = ['submitted', 'requested', 'pending', 'approved'].includes(
            (r.status || '').toLowerCase(),
          );
          return isPending && hoursAgo > 48;
        }
        if (val === 'today') {
          return isWithinPeriod(created, 'Today');
        }
        if (val === '7days') {
          return isWithinPeriod(created, 'Last 7 Days');
        }
        return true;
      },
      getChipLabel: (val) => {
        if (val === 'overdue') return 'SLA: Overdue (>48h Pending)';
        if (val === 'today') return 'Requested: Today';
        if (val === '7days') return 'Requested: Last 7 Days';
        return `SLA: ${val}`;
      },
    },

    // 6. Date Filter
    date: {
      label: 'Date Range',
      defaultValue: 'All Time',
      isDefault: (val) => val === 'All Time' || !val,
      predicate: (r, val, allFilters) => {
        return isWithinPeriod(r.createdAt || r.requestDate, val, allFilters?.customDateRange);
      },
      getChipLabel: (val, allFilters) => {
        if (val === 'Custom') {
          const { from, to } = allFilters?.customDateRange || {};
          if (from && to) return `Date: ${from} to ${to}`;
          if (from) return `Date: From ${from}`;
          if (to) return `Date: Until ${to}`;
          return 'Date: Custom';
        }
        return `Date: ${val}`;
      },
    },

    // 7. Custom Date Range Helper
    customDateRange: {
      label: 'Custom Date Range',
      defaultValue: { from: '', to: '' },
      isDefault: (val) => !val || (!val.from && !val.to),
      predicate: () => true, // Evaluated by date filter
      getChipLabel: () => null,
    },

    // 8. Refund Amount Range (₹)
    refundRange: {
      label: 'Refund Amount',
      defaultValue: { min: '', max: '' },
      isDefault: (val) => !val || (val.min === '' && val.max === ''),
      predicate: (r, val) => {
        const amount = Number(
          r.refundBreakdown?.grandTotal ?? r.totalRefundAmount ?? r.refundAmount ?? 0,
        );
        if (val.min !== '' && amount < Number(val.min)) return false;
        if (val.max !== '' && amount > Number(val.max)) return false;
        return true;
      },
      getChipLabel: (val) => {
        if (val.min !== '' && val.max !== '') {
          return `Refund: ₹${Number(val.min).toLocaleString('en-IN')} – ₹${Number(val.max).toLocaleString('en-IN')}`;
        }
        if (val.min !== '') return `Refund: ≥ ₹${Number(val.min).toLocaleString('en-IN')}`;
        if (val.max !== '') return `Refund: ≤ ₹${Number(val.max).toLocaleString('en-IN')}`;
        return null;
      },
    },
  },
};
