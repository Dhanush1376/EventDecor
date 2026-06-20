import { useEffect } from 'react';
import toast from 'react-hot-toast';
import { customOrderService } from '../services/domainServices';
import logger from '../utils/logger';

export function useOrderSocketTracker({
  socket,
  activeTab,
  selectedOrder,
  setSelectedOrder,
  loadWorkspaceData,
}) {
  useEffect(() => {
    if (!socket || activeTab !== 'tracker') return;

    const handleStatusChange = (payload) => {
      try {
        toast.success(`Order ${payload.orderId} status updated to ${payload.status}`);
        loadWorkspaceData();
        if (selectedOrder && selectedOrder.orderId === payload.orderId) {
          customOrderService.getById(selectedOrder._id).then((res) => {
            if (res.success) setSelectedOrder(res.data);
          });
        }
      } catch (err) {
        logger.error('Socket handleStatusChange error: ', err);
      }
    };

    const handleNewMessage = (payload) => {
      try {
        loadWorkspaceData();
        if (selectedOrder && selectedOrder.orderId === payload.orderId) {
          customOrderService.getById(selectedOrder._id).then((res) => {
            if (res.success) setSelectedOrder(res.data);
          });
        } else {
          toast.success(`New message from ${payload.senderName} regarding ${payload.orderId}`);
        }
      } catch (err) {
        logger.error('Socket handleNewMessage error: ', err);
      }
    };

    const handleQuoteCreated = (payload) => {
      try {
        loadWorkspaceData();
        toast.success(
          `New quotation received for ${payload.orderId} (₹${payload.total.toLocaleString()})`,
        );
        if (selectedOrder && selectedOrder.orderId === payload.orderId) {
          customOrderService.getById(selectedOrder._id).then((res) => {
            if (res.success) setSelectedOrder(res.data);
          });
        }
      } catch (err) {
        logger.error('Socket handleQuoteCreated error: ', err);
      }
    };

    socket.on('customOrder:statusChange', handleStatusChange);
    socket.on('customOrder:newMessage', handleNewMessage);
    socket.on('customOrder:quoteCreated', handleQuoteCreated);

    return () => {
      socket.off('customOrder:statusChange', handleStatusChange);
      socket.off('customOrder:newMessage', handleNewMessage);
      socket.off('customOrder:quoteCreated', handleQuoteCreated);
    };
  }, [socket, selectedOrder, activeTab]); // Kept EXACTLY identical to avoid stale closures
}
