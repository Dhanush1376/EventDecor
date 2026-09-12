import { useState, useMemo, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useAdminFilters } from '../components/filters/useAdminFilters';
import { orderFilterConfig } from '../components/filters/configs/orderFilterConfig';
import { isWithinPeriod } from '../utils/dateFilters';

export const allStatuses = [
  'Pending',
  'Confirmed',
  'Processing',
  'Delivered',
  'Settled',
  'Cancelled',
];

export const statusIcons = {
  Pending: 'schedule',
  Confirmed: 'thumb_up',
  Processing: 'inventory_2',
  Delivered: 'local_shipping',
  Settled: 'verified',
  Cancelled: 'cancel',
};

export function useOrderFilters(orders = [], searchQuery = '') {
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'kanban'
  const [sortBy, setSortBy] = useState('Newest first');
  const [savedView, setSavedView] = useState('All Orders');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Unified Filter Engine
  const {
    filteredItems: rawFilteredOrders,
    filterState,
    setFilterValue,
    resetFilter,
    resetAllFilters,
    activeChips,
    activeCount,
    totalCount,
    matchCount,
  } = useAdminFilters(orders, orderFilterConfig, searchQuery);

  // Quick Saved Views Handler
  const handleSavedViewChange = useCallback(
    (view) => {
      setSavedView(view);
      resetAllFilters();

      if (view === "Today's Deliveries") {
        setFilterValue('deliveryEventTiming', 'Today');
        setFilterValue('fulfillmentStatus', 'Processing');
      } else if (view === "Tomorrow's Deliveries") {
        setFilterValue('deliveryEventTiming', 'Tomorrow');
        setFilterValue('fulfillmentStatus', 'Processing');
      } else if (view === "This Weekend's Events") {
        setFilterValue('deliveryEventTiming', 'This Weekend');
      } else if (view === 'Needs Attention') {
        setFilterValue('attention', 'Needs Attention');
      } else if (view === 'Processing') {
        setFilterValue('fulfillmentStatus', 'Processing');
      }
    },
    [resetAllFilters, setFilterValue],
  );

  // Separate Sorting Stage
  const filteredOrders = useMemo(() => {
    const list = [...rawFilteredOrders];

    list.sort((a, b) => {
      const dateA = new Date(a.rawOrder?.createdAt || a.date || 0).getTime();
      const dateB = new Date(b.rawOrder?.createdAt || b.date || 0).getTime();
      const valA = a.total || a.totalAmount || 0;
      const valB = b.total || b.totalAmount || 0;
      const delA = new Date(
        a.deliveryDate ||
          a.eventDate ||
          a.rawOrder?.needByDate ||
          a.rawOrder?.estimatedDeliveryDate ||
          a.date ||
          0,
      ).getTime();
      const delB = new Date(
        b.deliveryDate ||
          b.eventDate ||
          b.rawOrder?.needByDate ||
          b.rawOrder?.estimatedDeliveryDate ||
          b.date ||
          0,
      ).getTime();

      switch (sortBy) {
        case 'Oldest first':
          return dateA - dateB;
        case 'Delivery date ↑':
          return delA - delB;
        case 'Delivery date ↓':
          return delB - delA;
        case 'Order value ↑':
          return valA - valB;
        case 'Order value ↓':
          return valB - valA;
        case 'Newest first':
        default:
          return dateB - dateA;
      }
    });

    return list;
  }, [rawFilteredOrders, sortBy]);

  // Financial COD Settlement Ledger stats
  const codStats = useMemo(() => {
    let totalVolume = 0;
    let pendingRemittance = 0;
    let settledPayouts = 0;
    let courierDeductions = 0;

    orders.forEach((o) => {
      const orderDate = o.rawOrder?.createdAt || o.date;
      if (!isWithinPeriod(orderDate, filterState.placementDate)) return;

      if (o.rawOrder?.paymentMethod?.toLowerCase() === 'cod') {
        totalVolume += o.total || 0;
        if (o.status === 'Delivered' && o.rawOrder?.settlementStatus !== 'Settled') {
          pendingRemittance += o.total || 0;
        } else if (o.rawOrder?.settlementStatus === 'Settled' || o.status === 'Settled') {
          const charges = o.rawOrder?.courierCharges || 150;
          courierDeductions += charges;
          settledPayouts += o.rawOrder?.settledAmount || (o.total || 0) - charges;
        }
      }
    });

    return { totalVolume, pendingRemittance, settledPayouts, courierDeductions };
  }, [orders, filterState.placementDate]);

  const statusCounts = useMemo(() => {
    const counts = { All: orders.length };
    allStatuses.forEach(
      (s) =>
        (counts[s] = orders.filter(
          (o) => (o.status || '').toLowerCase() === s.toLowerCase(),
        ).length),
    );
    return counts;
  }, [orders]);

  const handleExportCSV = () => {
    if (!filteredOrders.length) {
      toast.error('No orders to export');
      return;
    }
    const headers =
      'Order ID,Customer,Phone,Items Summary,Total Amount,Payment Type,Status,Order Date\n';
    const rows = filteredOrders
      .map((o) => {
        const itemsList = (o.items || []).map((i) => `${i.name} (x${i.quantity || 1})`).join(' | ');
        return `"${o.id || o._id}","${o.customer}","${o.phone}","${itemsList}",${o.total},"${o.payment}","${o.status}","${o.date}"`;
      })
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `EventDecor_Orders_${new Date().toISOString().slice(0, 10)}.csv`);
    link.click();
    toast.success('Orders CSV Export ready');
  };

  const openOrderDrawer = (order) => {
    setSelectedOrder(order);
    setIsDrawerOpen(true);
  };

  return {
    viewMode,
    setViewMode,
    selectedOrder,
    setSelectedOrder,
    isDrawerOpen,
    setIsDrawerOpen,
    codStats,
    filteredOrders,
    statusCounts,
    handleExportCSV,
    openOrderDrawer,
    sortBy,
    setSortBy,
    savedView,
    setSavedView,
    handleSavedViewChange,
    // Unified Filter Engine Exports
    filterState,
    setFilterValue,
    resetFilter,
    resetAllFilters,
    activeChips,
    activeCount,
    totalCount,
    matchCount,
    hasActiveFilters: activeCount > 0 || !!(searchQuery && searchQuery.trim()),
  };
}
