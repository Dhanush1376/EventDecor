import { useState, useCallback } from 'react';
import { orderService } from '../../services/domainServices';
import toast from 'react-hot-toast';
import logger from '../../utils/core/logger';

const mapDbOrderToFrontend = (o) => {
  if (!o) return null;
  if (o.id && o.customer && o.status) return o;

  const dateStr = o.createdAt ? new Date(o.createdAt).toISOString().split('T')[0] : '';

  // Use capitalized statuses strictly
  let fStatus = o.orderStatus || 'Pending';
  if (fStatus === 'placed') fStatus = 'Pending';
  else if (fStatus === 'Payment Pending') fStatus = 'Payment Pending';
  else if (fStatus === 'confirmed') fStatus = 'Confirmed';
  else if (fStatus === 'processing') fStatus = 'Packed';
  else if (fStatus === 'shipped') fStatus = 'Shipped';
  else if (fStatus === 'delivered') fStatus = 'Delivered';
  else if (fStatus === 'cancelled') fStatus = 'Cancelled';

  const mappedItems = Array.isArray(o.items)
    ? o.items.map((item) => ({
        name: item.title || item.name || 'Handcrafted Piece',
        qty: item.quantity || item.qty || 1,
        price: item.price || 0,
        type: item.type || 'purchase',
        rentalInfo: item.rentalInfo || null,
        deposit: item.deposit || 0,
      }))
    : [];

  return {
    id: o._id || o.id || 'ORD-UNKNOWN',
    customer: o.shippingAddress?.name || o.user?.name || 'Store Customer',
    email: o.shippingAddress?.email || o.user?.email || 'customer@email.com',
    phone: o.shippingAddress?.phone || o.user?.phone || '',
    items: mappedItems,
    total: o.total || o.subtotal || 0,
    status: fStatus,
    payment:
      o.paymentStatus === 'paid'
        ? 'Paid'
        : o.paymentStatus === 'COD Collected'
          ? 'COD Collected'
          : o.paymentMethod?.toLowerCase() === 'cod'
            ? 'COD Pending'
            : 'Pending',
    date: dateStr,
    address: o.shippingAddress
      ? `${o.shippingAddress.address}, ${o.shippingAddress.city}, ${o.shippingAddress.state} - ${o.shippingAddress.pincode}`
      : 'Ongole',
    rawOrder: o,
    invoiceNumber: o.invoiceNumber,
    trackingNumber: o.trackingNumber,
    courierPartner: o.courierPartner,
    weight: o.weight,
    dimensions: o.dimensions,
    packageType: o.packageType,
    barcodeData: o.barcodeData,
    qrCodeData: o.qrCodeData,
    shippingAddress: o.shippingAddress,
    needByDate: o.needByDate,
    orderType: o.orderType || 'purchase',
    rentalInfo: o.rentalInfo || null,
    depositTotal: o.depositTotal || 0,
  };
};

export function useAdminOrders({ activeRole, safetyLock, logAdminAction }) {
  const [orders, setOrders] = useState([]);

  const updateOrderStatus = useCallback(
    async (orderId, newStatus, note, courierCharges) => {
      if (activeRole === 'viewer') {
        toast.error('Viewer Role: Write operations are restricted!');
        return;
      }
      if (safetyLock) {
        toast.error('Safety Lock Active: Write operations are globally blocked!');
        return;
      }
      try {
        const res = await orderService.updateStatus(orderId, newStatus, note, courierCharges);
        if (res.success) {
          const mapped = res.data ? mapDbOrderToFrontend(res.data) : null;
          setOrders((prev) =>
            prev.map((o) => {
              if ((o.id || o._id) === orderId) {
                return mapped || { ...o, status: newStatus, orderStatus: newStatus };
              }
              return o;
            }),
          );
          logAdminAction('UPDATE_ORDER', `Updated Order ID ${orderId} to status: ${newStatus}`);
          toast.success(`Order status updated to ${newStatus}`);
        }
      } catch (_err) {
        toast.error('Failed to update order status');
      }
    },
    [activeRole, safetyLock, logAdminAction],
  );

  const updateOrderNotes = useCallback(
    async (orderId, notes) => {
      if (activeRole === 'viewer') {
        toast.error('Viewer Role: Write operations are restricted!');
        return;
      }
      if (safetyLock) {
        toast.error('Safety Lock Active: Write operations are globally blocked!');
        return;
      }
      try {
        const res = await orderService.updateNotes(orderId, notes);
        if (res.success) {
          setOrders((prev) =>
            prev.map((o) => {
              if ((o.id || o._id) === orderId) {
                return { ...o, notes };
              }
              return o;
            }),
          );
          logAdminAction('UPDATE_ORDER_NOTES', `Updated Order ID ${orderId} notes`);
          toast.success('Notes updated');
        }
      } catch (_err) {
        toast.error('Failed to update order notes');
      }
    },
    [activeRole, safetyLock, logAdminAction],
  );

  const refreshOrders = useCallback(async () => {
    try {
      const res = await orderService.getAll({ limit: 50 });
      if (res.success) {
        const list = res.data?.data || [];
        setOrders(list.map(mapDbOrderToFrontend));
      }
    } catch (err) {
      logger.warn('Orders refresh failed:', err);
    }
  }, []);

  return {
    orders,
    setOrders,
    updateOrderStatus,
    updateOrderNotes,
    refreshOrders,
    mapDbOrderToFrontend,
  };
}
