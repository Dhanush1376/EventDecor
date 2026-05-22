import { useCallback } from 'react';
import toast from 'react-hot-toast';
import { orderService } from '../services/domainServices';

import logger from '../utils/logger';
export const useRazorpay = () => {
  const loadScript = (src) => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const processPayment = useCallback(async (orderData, onSuccess, onError) => {
    const res = await loadScript('https://checkout.razorpay.com/v1/checkout.js');

    if (!res) {
      toast.error('Razorpay SDK failed to load. Are you online?');
      return;
    }

    try {
      // 1. Create order on backend
      const response = await orderService.create(orderData);
      
      if (!response.success) {
        toast.error(response.message || 'Failed to create order');
        return;
      }

      const { razorpayOrder, orderId } = response.data;

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        name: 'Siri Arts & Crafts',
        description: 'Luxury Event Decor Order',
        image: '/SiriLogo.png',
        order_id: razorpayOrder.id,
        handler: async (response) => {
          try {
            // 2. Verify payment on backend
            const verifyRes = await orderService.verifyPayment({
              orderId: orderId,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });

            if (verifyRes.success) {
              toast.success('Payment successful!');
              onSuccess(verifyRes.data);
            } else {
              toast.error('Payment verification failed');
              onError(verifyRes);
            }
          } catch (err) {
            toast.error('Error verifying payment');
            onError(err);
          }
        },
        prefill: {
          name: orderData.shippingAddress.name,
          contact: orderData.shippingAddress.phone,
        },
        theme: {
          color: '#d4af37',
        },
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.open();
    } catch (err) {
      logger.error('Payment error:', err);
      toast.error(err.response?.data?.message || 'Payment initiation failed');
      onError(err);
    }
  }, []);

  return { processPayment };
};
