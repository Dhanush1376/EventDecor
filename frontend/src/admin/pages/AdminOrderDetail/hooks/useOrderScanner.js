import { useEffect } from 'react';
import toast from 'react-hot-toast';
import { playSuccessBeep, playErrorBeep } from '../../../../utils/media/audioUtils';
import { allStatuses } from '../OrderStatusTimeline';

export function useOrderScanner(order, updateOrderStatus) {
  useEffect(() => {
    if (!order) return;
    let buffer = '';
    let lastKeyTime = Date.now();

    const handleKeyPress = (e) => {
      const currentTime = Date.now();

      // Scanners input extremely quickly (< 50ms)
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

          const cleanOrderId = order.id.toUpperCase();
          const cleanAWB = (order.trackingNumber || '').toUpperCase();
          const customBarcode = `SR-${order.id.substring(order.id.length - 8).toUpperCase()}-IN`;
          const invoiceNum = (order.invoiceNumber || '').toUpperCase();

          if (
            scannedCode === cleanOrderId ||
            scannedCode === cleanAWB ||
            scannedCode === customBarcode ||
            scannedCode === invoiceNum ||
            scannedCode.includes(cleanOrderId.substring(0, 8))
          ) {
            playSuccessBeep();

            const currentIdx = allStatuses.indexOf(order.status);
            if (currentIdx !== -1 && currentIdx < allStatuses.length - 1) {
              const nextStatus = allStatuses[currentIdx + 1];
              if (['Cancelled', 'Returned', 'Refunded'].includes(nextStatus)) {
                toast.success(`Package is already at final state: ${order.status}`);
              } else {
                updateOrderStatus(
                  order.id,
                  nextStatus,
                  `Physical scan verification transition to ${nextStatus}`,
                );
                toast.success(
                  `Package Verified! Status transitioned from ${order.status} to ${nextStatus}`,
                );
              }
            }
          } else {
            playErrorBeep();
            toast.error(`Scan mismatch! Code "${scannedCode}" does not match this order.`);
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
  }, [order, updateOrderStatus]);
}
