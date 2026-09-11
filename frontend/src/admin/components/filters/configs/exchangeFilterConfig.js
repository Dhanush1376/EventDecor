import { isWithinPeriod } from '../../../utils/dateFilters';

const isExchangeUnderReview = (ex) => {
  if (!ex) return false;
  const returnStatus = ex.returnRequestId?.status || ex.status;
  if (!returnStatus || ['submitted', 'under_review', 'pending'].includes(returnStatus)) {
    return true;
  }
  const activeApprovedStatuses = [
    'approved',
    'return_courier_assigned',
    'return_picked_up',
    'return_in_transit',
    'return_received',
    'inspection_started',
    'inspection_completed',
    'refund_initiated',
    'refund_completed',
    'completed',
  ];
  return !activeApprovedStatuses.includes(returnStatus);
};

/**
 * exchangeFilterConfig.js
 * Declarative filter configuration for Exchanges hub.
 */

export const exchangeFilterConfig = {
  itemName: 'exchanges',

  searchPredicate: (ex, query) => {
    if (!query) return true;
    const search = query.toLowerCase().trim();
    const idMatch = (ex.exchangeId || ex._id || '').toLowerCase().includes(search);
    const orderMatch = (
      ex.orderId?.orderCode ||
      ex.orderId?.orderId ||
      (ex.orderId?._id || ex.orderId)?.toString() ||
      ''
    )
      .toLowerCase()
      .includes(search);
    const customerMatch = (
      ex.returnRequestId?.userId?.name ||
      ex.userId?.name ||
      ex.customerName ||
      ''
    )
      .toLowerCase()
      .includes(search);
    const phoneMatch = (ex.returnRequestId?.userId?.phone || ex.userId?.phone || '')
      .toLowerCase()
      .includes(search);
    const origTitleMatch = (ex.originalItem?.title || '').toLowerCase().includes(search);
    const replTitleMatch = (ex.replacementItem?.title || '').toLowerCase().includes(search);

    return idMatch || orderMatch || customerMatch || phoneMatch || origTitleMatch || replTitleMatch;
  },

  fields: {
    // 1. Saved Views
    savedView: {
      label: 'Saved View',
      defaultValue: 'All Exchanges',
      isDefault: (val) => val === 'All Exchanges' || !val,
      predicate: (ex, val) => {
        if (val === 'Needs Attention') {
          return isExchangeUnderReview(ex);
        }
        if (val === 'Pending Pickups') {
          return [
            'approved',
            'return_courier_assigned',
            'return_picked_up',
            'return_in_transit',
          ].includes(ex.returnRequestId?.status || ex.status);
        }
        if (val === 'Replacement Dispatched') {
          return ['shipped', 'out_for_delivery'].includes(ex.replacementStatus);
        }
        if (val === 'Payment Required') {
          return (
            ex.differenceAction === 'collect_payment' &&
            Number(ex.priceDifference) > 0 &&
            ex.paymentStatus !== 'payment_paid'
          );
        }
        if (val === 'Completed') {
          return (
            ex.replacementStatus === 'delivered' ||
            ['completed', 'refund_completed'].includes(ex.returnRequestId?.status || ex.status)
          );
        }
        return true;
      },
      getChipLabel: (val) => `View: ${val}`,
    },

    // 2. Lifecycle Status
    status: {
      label: 'Lifecycle Status',
      defaultValue: 'All',
      isDefault: (val) => val === 'All' || !val,
      predicate: (ex, val) => {
        if (val === 'under_review') return isExchangeUnderReview(ex);
        if (val === 'pickups') {
          return [
            'approved',
            'return_courier_assigned',
            'return_picked_up',
            'return_in_transit',
          ].includes(ex.returnRequestId?.status || ex.status);
        }
        if (val === 'qc') {
          return ['return_received', 'inspection_started', 'inspection_completed'].includes(
            ex.returnRequestId?.status || ex.status,
          );
        }
        if (val === 'dispatched') {
          return ['shipped', 'out_for_delivery'].includes(ex.replacementStatus);
        }
        if (val === 'completed') {
          return (
            ex.replacementStatus === 'delivered' ||
            ['completed', 'refund_completed'].includes(ex.returnRequestId?.status || ex.status)
          );
        }
        if (val === 'rejected') {
          return (ex.returnRequestId?.status || ex.status) === 'rejected';
        }
        return (ex.returnRequestId?.status || ex.status) === val;
      },
      getChipLabel: (val) => {
        const labels = {
          under_review: 'Status: Under Review',
          pickups: 'Status: Pickups Pending',
          qc: 'Status: Quality Check',
          dispatched: 'Status: Dispatched',
          completed: 'Status: Completed',
          rejected: 'Status: Rejected',
        };
        return labels[val] || `Status: ${val.replace(/_/g, ' ')}`;
      },
    },

    // 3. Price Difference Action
    diff: {
      label: 'Price Difference',
      defaultValue: 'All',
      isDefault: (val) => val === 'All' || !val,
      predicate: (ex, val) => {
        const diff = Number(ex.priceDifference || 0);
        if (val === 'zero') return diff === 0;
        if (val === 'collect') return ex.differenceAction === 'collect_payment' || diff > 0;
        if (val === 'refund') return ex.differenceAction === 'refund_difference' || diff < 0;
        return true;
      },
      getChipLabel: (val) => {
        if (val === 'zero') return 'Difference: Even Exchange (₹0)';
        if (val === 'collect') return 'Difference: Payment Required (Due)';
        if (val === 'refund') return 'Difference: Refund Customer';
        return `Difference: ${val}`;
      },
    },

    // 4. Date Filter
    date: {
      label: 'Date Range',
      defaultValue: 'All Time',
      isDefault: (val) => val === 'All Time' || !val,
      predicate: (ex, val, allFilters) => {
        return isWithinPeriod(ex.createdAt, val, allFilters?.customDateRange);
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

    // 5. Custom Date Range Helper
    customDateRange: {
      label: 'Custom Date Range',
      defaultValue: { from: '', to: '' },
      isDefault: (val) => !val || (!val.from && !val.to),
      predicate: () => true,
      getChipLabel: () => null,
    },
  },
};
