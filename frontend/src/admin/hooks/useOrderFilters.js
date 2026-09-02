import { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import Fuse from 'fuse.js';
import { isWithinPeriod } from '../utils/dateFilters';

export const allStatuses = ['Pending', 'Confirmed', 'Processing', 'Delivered', 'Cancelled'];

export const statusIcons = {
  Pending: 'schedule',
  Confirmed: 'thumb_up',
  Processing: 'inventory_2',
  Delivered: 'verified',
  Cancelled: 'cancel',
};

export function useOrderFilters(orders, searchQuery) {
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'kanban'
  const [filterStatus, setFilterStatus] = useState('All Statuses');
  const [filterOrderType, setFilterOrderType] = useState('All');

  const [dateFilter, setDateFilter] = useState('All Time');
  const [customDateRange, setCustomDateRange] = useState({ from: '', to: '' });

  const [paymentFilter, setPaymentFilter] = useState('All');
  const [deliveryDateFilter, setDeliveryDateFilter] = useState('All Time');
  const [customDeliveryRange, setCustomDeliveryRange] = useState({ from: '', to: '' });

  const [orderValueRange, setOrderValueRange] = useState({ min: '', max: '' });
  const [attentionFilter, setAttentionFilter] = useState('All');
  const [sortBy, setSortBy] = useState('Newest first');

  const [savedView, setSavedView] = useState('All Orders');

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const codStats = useMemo(() => {
    let totalVolume = 0;
    let pendingRemittance = 0;
    let settledPayouts = 0;
    let courierDeductions = 0;

    orders.forEach((o) => {
      const orderDate = o.rawOrder?.createdAt || o.date;
      if (!isWithinPeriod(orderDate, dateFilter)) return;

      if (o.rawOrder?.paymentMethod?.toLowerCase() === 'cod') {
        totalVolume += o.total;
        if (o.status === 'Delivered' && o.rawOrder?.settlementStatus !== 'Settled') {
          pendingRemittance += o.total;
        } else if (o.rawOrder?.settlementStatus === 'Settled' || o.status === 'Settled') {
          const charges = o.rawOrder?.courierCharges || 150;
          courierDeductions += charges;
          settledPayouts += o.rawOrder?.settledAmount || o.total - charges;
        }
      }
    });

    return { totalVolume, pendingRemittance, settledPayouts, courierDeductions };
  }, [orders, dateFilter]);

  const filteredOrders = useMemo(() => {
    let result = orders.filter((o) => {
      // 1. Status Filter
      const matchStatus = filterStatus === 'All Statuses' || o.status === filterStatus;

      // 2. Order Type
      const matchOrderType = filterOrderType === 'All' || o.orderType === filterOrderType;

      // 3. Date Filter (Order placement date)
      const orderDate = o.rawOrder?.createdAt || o.date;
      const matchDate = isWithinPeriod(orderDate, dateFilter, customDateRange);

      // 4. Payment Filter
      const paymentStat = o.rawOrder?.paymentStatus || 'pending';
      let matchPayment = true;
      if (paymentFilter !== 'All') {
        const lowerPaymentFilter = paymentFilter.toLowerCase();
        if (lowerPaymentFilter === 'paid') {
          matchPayment = paymentStat === 'paid' || paymentStat === 'captured';
        } else {
          matchPayment = paymentStat === lowerPaymentFilter;
        }
      }

      // 5. Order Value Filter
      let matchValue = true;
      if (orderValueRange.min !== '') {
        matchValue = matchValue && o.total >= Number(orderValueRange.min);
      }
      if (orderValueRange.max !== '') {
        matchValue = matchValue && o.total <= Number(orderValueRange.max);
      }

      // 6. Attention Filter
      let matchAttention = true;
      if (attentionFilter === 'Needs Attention') {
        matchAttention = o.rawOrder?.delayWarning === true || o.rawOrder?.isOnHold === true;
      } else if (attentionFilter === 'On Hold') {
        matchAttention = o.rawOrder?.isOnHold === true;
      } else if (attentionFilter === 'No Issues') {
        matchAttention = o.rawOrder?.isOnHold !== true && o.rawOrder?.delayWarning !== true;
      }

      // 7. Delivery Date Filter
      const deliveryDate = o.rawOrder?.needByDate || o.rawOrder?.estimatedDeliveryDate;
      let matchDeliveryDate = true;
      if (deliveryDateFilter !== 'All Time') {
        matchDeliveryDate = isWithinPeriod(deliveryDate, deliveryDateFilter, customDeliveryRange);
      }

      return (
        matchStatus &&
        matchOrderType &&
        matchDate &&
        matchPayment &&
        matchValue &&
        matchAttention &&
        matchDeliveryDate
      );
    });

    if (searchQuery && searchQuery.trim() !== '') {
      // fuse.js for advanced fuzzy searching
      const fuse = new Fuse(result, {
        keys: [
          'id',
          'customer',
          'phone',
          'rawOrder.customerEmail',
          'items.name',
          'items.category',
          'items.productId',
          'rawOrder.shippingAddress.city',
          'total',
        ],
        threshold: 0.3,
        ignoreLocation: true,
      });
      result = fuse.search(searchQuery).map((res) => res.item);
    }

    // 8. Sorting
    result.sort((a, b) => {
      const dateA = new Date(a.rawOrder?.createdAt || a.date).getTime();
      const dateB = new Date(b.rawOrder?.createdAt || b.date).getTime();
      const valA = a.total;
      const valB = b.total;
      const delA = new Date(
        a.rawOrder?.needByDate || a.rawOrder?.estimatedDeliveryDate || a.date,
      ).getTime();
      const delB = new Date(
        b.rawOrder?.needByDate || b.rawOrder?.estimatedDeliveryDate || b.date,
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

    return result;
  }, [
    orders,
    filterStatus,
    filterOrderType,
    dateFilter,
    customDateRange,
    paymentFilter,
    orderValueRange,
    attentionFilter,
    deliveryDateFilter,
    customDeliveryRange,
    sortBy,
    searchQuery,
  ]);

  const statusCounts = useMemo(() => {
    const counts = { All: orders.length };
    allStatuses.forEach((s) => (counts[s] = orders.filter((o) => o.status === s).length));
    return counts;
  }, [orders]);

  const handleExportCSV = () => {
    if (filteredOrders.length === 0) {
      return toast.error('No orders found to export');
    }

    const headers =
      'Order ID,Customer,Phone,Items Summary,Total Amount,Payment Type,Status,Order Date\n';
    const rows = filteredOrders
      .map((o) => {
        const itemsList = o.items.map((i) => `${i.name} (x${i.quantity || 1})`).join(' | ');
        return `"${o.id}","${o.customer}","${o.phone}","${itemsList}",${o.total},"${o.payment}","${o.status}","${o.date}"`;
      })
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `Siri Arts & Crafts_Orders_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    link.click();
    toast.success('Export ready');
  };

  const openOrderDrawer = (order) => {
    setSelectedOrder(order);
    setIsDrawerOpen(true);
  };

  return {
    viewMode,
    setViewMode,
    filterStatus,
    setFilterStatus,
    filterOrderType,
    setFilterOrderType,
    selectedOrder,
    setSelectedOrder,
    isDrawerOpen,
    setIsDrawerOpen,
    codStats,
    filteredOrders,
    statusCounts,
    handleExportCSV,
    openOrderDrawer,
    dateFilter,
    setDateFilter,
    customDateRange,
    setCustomDateRange,
    paymentFilter,
    setPaymentFilter,
    deliveryDateFilter,
    setDeliveryDateFilter,
    customDeliveryRange,
    setCustomDeliveryRange,
    orderValueRange,
    setOrderValueRange,
    attentionFilter,
    setAttentionFilter,
    sortBy,
    setSortBy,
    savedView,
    setSavedView,
  };
}
