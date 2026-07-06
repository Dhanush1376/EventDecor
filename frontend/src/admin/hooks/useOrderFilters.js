import { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { isWithinPeriod } from '../utils/dateFilters';

export const allStatuses = [
  'Payment Pending',
  'Pending',
  'Confirmed',
  'Packed',
  'Ready to Ship',
  'Shipped',
  'Out for Delivery',
  'Delivered',
  'Cancelled',
  'Returned',
  'Refunded',
];

export const statusIcons = {
  'Payment Pending': 'hourglass_empty',
  Pending: 'schedule',
  Confirmed: 'thumb_up',
  Packed: 'inventory_2',
  'Ready to Ship': 'conveyor_belt',
  Shipped: 'local_shipping',
  'Out for Delivery': 'directions_run',
  Delivered: 'verified',
  Cancelled: 'cancel',
  Returned: 'keyboard_return',
  Refunded: 'payments',
};

export function useOrderFilters(orders, searchQuery) {
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'kanban'
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterOrderType, setFilterOrderType] = useState('All');
  const [dateFilter, setDateFilter] = useState('All Time');

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
    return orders.filter((o) => {
      const matchStatus = filterStatus === 'All' || o.status === filterStatus;
      const matchOrderType = filterOrderType === 'All' || o.orderType === filterOrderType;
      const matchSearch =
        !searchQuery ||
        o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.phone.toLowerCase().includes(searchQuery.toLowerCase());
      return matchStatus && matchOrderType && matchSearch;
    });
  }, [orders, filterStatus, filterOrderType, searchQuery]);

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
  };
}
