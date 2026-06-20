import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { customOrderService } from '../services/domainServices';
import logger from '../utils/logger';

export function useCustomOrderWorkspace({
  user,
  setConfig,
  setMyOrders,
  selectedOrder,
  setSelectedOrder,
  chatMessage,
  setChatMessage,
  isSendingMessageRef,
  setIsSendingMessage,
}) {
  const [loading, setLoading] = useState(false);

  const loadWorkspaceData = async () => {
    setLoading(true);
    try {
      const configRes = await customOrderService.getConfig();
      if (configRes?.success) {
        setConfig(configRes.data);
      } else {
        setConfig(configRes);
      }

      if (user) {
        const ordersRes = await customOrderService.getMyOrders();
        if (ordersRes?.success) {
          setMyOrders(ordersRes.data || []);
        } else {
          setMyOrders(ordersRes || []);
        }
      }
    } catch (err) {
      logger.error('Failed to load workspace data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadWorkspaceData();
    }, 0);
    return () => clearTimeout(timer);
  }, [user]);

  const handleSendChatMessage = async (e) => {
    if (e) e.preventDefault();
    if (!chatMessage.trim() || !selectedOrder || isSendingMessageRef.current) return;

    isSendingMessageRef.current = true;
    setIsSendingMessage(true);
    try {
      const res = await customOrderService.postMessage(selectedOrder._id, chatMessage.trim());
      if (res.success) {
        setSelectedOrder(res.data);
        setChatMessage('');
        const reloadRes = await customOrderService.getMyOrders();
        if (reloadRes.success) setMyOrders(reloadRes.data || []);
      }
    } catch (err) {
      toast.error('Failed to send message');
    } finally {
      isSendingMessageRef.current = false;
      setIsSendingMessage(false);
    }
  };

  const handleQuotationDecision = async (decision) => {
    if (!selectedOrder) return;
    setLoading(true);
    try {
      const res = await customOrderService.respondQuotation(selectedOrder._id, decision);
      if (res.success) {
        setSelectedOrder(res.data);
        toast.success(`Quotation successfully marked as ${decision.toUpperCase()}!`);
        const reloadRes = await customOrderService.getMyOrders();
        if (reloadRes.success) setMyOrders(reloadRes.data || []);
      }
    } catch (err) {
      toast.error('Failed to submit your response');
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    loadWorkspaceData,
    handleSendChatMessage,
    handleQuotationDecision,
  };
}
