import { useState, useEffect, useCallback } from 'react';
import { orderService } from '../services/domainServices';
import { playSuccessBeep, playErrorBeep } from '../utils/media/audioUtils';
import toast from 'react-hot-toast';

const trackingSteps = [
  'Pending',
  'Confirmed',
  'Packed',
  'Shipped',
  'Out for Delivery',
  'Delivered',
];

export function useOrderTracking({ orderId, trackingToken }) {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Courier Panel State
  const [showOperatorPanel, setShowOperatorPanel] = useState(false);
  const [operatorPin, setOperatorPin] = useState('');
  const [isPinVerified, setIsPinVerified] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [operatorNote, setOperatorNote] = useState('');

  const fetchTrackingDetails = useCallback(async () => {
    if (!trackingToken) {
      setError(
        'A valid tracking link with security token is required. Check your order confirmation email.',
      );
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await orderService.getPublicTrack(orderId, trackingToken);
      setOrder(res.data || res);
      setError(null);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Unable to fetch order tracking parameters. Please confirm the tracking ID.',
      );
    } finally {
      setLoading(false);
    }
  }, [orderId, trackingToken]);

  const getNextStatus = useCallback((current) => {
    const idx = trackingSteps.indexOf(current);
    if (idx !== -1 && idx < trackingSteps.length - 1) {
      return trackingSteps[idx + 1];
    }
    return null;
  }, []);

  const verifyCourierPin = (e) => {
    e.preventDefault();
    if (operatorPin.trim() === 'SIRI2026') {
      setIsPinVerified(true);
      toast.success('Logistics Operator Session Initialized!');
    } else {
      toast.error('Invalid Logistics Security Pin');
      setOperatorPin('');
    }
  };

  const handleStatusUpdate = useCallback(
    async (newStatus) => {
      setUpdatingStatus(true);
      try {
        await orderService.updatePublicStatus(
          orderId,
          newStatus,
          operatorNote || `Dispatch transit scan: ${newStatus}`,
          'SIRI2026',
        );
        toast.success(`Logistics status updated to ${newStatus}`);
        setOperatorNote('');
        await fetchTrackingDetails();
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to update logistics status.');
      } finally {
        setUpdatingStatus(false);
      }
    },
    [orderId, operatorNote, fetchTrackingDetails],
  );

  useEffect(() => {
    if (orderId) {
      const timer = setTimeout(() => {
        fetchTrackingDetails();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [orderId, fetchTrackingDetails]);

  // Capture physical barcode scanner keyboard inputs
  useEffect(() => {
    if (!order) return;
    let buffer = '';
    let lastKeyTime = Date.now();

    const handleKeyPress = (e) => {
      const currentTime = Date.now();

      if (currentTime - lastKeyTime > 50) {
        buffer = '';
      }
      lastKeyTime = currentTime;

      if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta') {
        return;
      }

      if (e.key === 'Enter') {
        if (buffer.length >= 3) {
          const scannedCode = buffer.trim().toUpperCase();
          buffer = '';

          const cleanOrderId = order._id.toUpperCase();
          const cleanAWB = (order.trackingNumber || '').toUpperCase();
          const customBarcode = `SR-${order._id.substring(order._id.length - 8).toUpperCase()}-IN`;

          if (
            scannedCode === cleanOrderId ||
            scannedCode === cleanAWB ||
            scannedCode === customBarcode ||
            scannedCode.includes(cleanOrderId.substring(0, 8))
          ) {
            playSuccessBeep();

            if (!isPinVerified) {
              setShowOperatorPanel(true);
              toast.success(
                'Package verified! Please enter Logistics PIN to authorize status updates.',
              );
            } else {
              const nextStatus = getNextStatus(order.orderStatus);
              if (nextStatus) {
                handleStatusUpdate(nextStatus);
                toast.success(`Package Verified! Advancing status to ${nextStatus}...`);
              } else {
                toast.success('Package is already delivered!');
              }
            }
          } else {
            playErrorBeep();
            toast.error(`Scan mismatch! Barcode "${scannedCode}" does not match this package.`);
          }
        }
        return;
      }

      if (e.key.length === 1) {
        buffer += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [order, isPinVerified, getNextStatus, handleStatusUpdate]);

  return {
    order,
    loading,
    error,
    showOperatorPanel,
    setShowOperatorPanel,
    operatorPin,
    setOperatorPin,
    isPinVerified,
    setIsPinVerified,
    updatingStatus,
    operatorNote,
    setOperatorNote,
    verifyCourierPin,
    handleStatusUpdate,
  };
}
