import React, { useCallback } from 'react';
import toast from 'react-hot-toast';
import { orderService } from '../services/domainServices';

import logger from '../utils/logger';
let razorpayPromise = null;

const loadScript = async (src, retries = 2) => {
  if (razorpayPromise) return razorpayPromise;

  razorpayPromise = new Promise((resolve) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      if (window.Razorpay) return resolve(true);
    }
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve(true);
    script.onerror = () => {
      razorpayPromise = null;
      resolve(false);
    };
    document.body.appendChild(script);
  });

  let result = await razorpayPromise;
  
  if (!result && retries > 0) {
    logger.warn(`Retrying Razorpay SDK load. Retries left: ${retries}`);
    await new Promise(r => setTimeout(r, 1000));
    return loadScript(src, retries - 1);
  }

  return result;
};

export const preloadRazorpay = () => {
  loadScript('https://checkout.razorpay.com/v1/checkout.js').catch(() => {});
};

const createIdempotencyKey = () => {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `order_${Date.now()}_${Math.random().toString(36).slice(2)}`;
};

export const useRazorpay = () => {
  const paymentInProgress = React.useRef(false);

  const processPayment = useCallback(async (orderData, onSuccess, onError) => {
    if (paymentInProgress.current) {
      logger.warn('Payment already in progress, ignoring duplicate request');
      return;
    }
    
    paymentInProgress.current = true;
    
    const finalize = () => {
      paymentInProgress.current = false;
    };

    try {
      const res = await loadScript('https://checkout.razorpay.com/v1/checkout.js');

      if (!res) {
        toast.error('Razorpay SDK failed to load. Are you online?');
        onError?.(new Error('Razorpay SDK failed to load'));
        return finalize();
      }
      // 1. Create order on backend
      const response = await orderService.create(orderData, {
        idempotencyKey: orderData.idempotencyKey || createIdempotencyKey(),
      });
      
      if (!response.success) {
        toast.error(response.message || 'Failed to create order');
        onError?.(response);
        return;
      }

      const { razorpayOrder } = response.data;
      if (!razorpayOrder?.id || !razorpayOrder?.amount || !razorpayOrder?.currency) {
        throw new Error('Payment gateway returned an invalid order payload');
      }

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        name: 'Siri Arts & Crafts',
        description: 'Luxury Event Decor Order',
        image: import.meta.env.VITE_LOGO_URL || 'https://res.cloudinary.com/siriartscrafts/image/upload/v1/SiriLogo.webp',
        order_id: razorpayOrder.id,
        handler: async (response) => {
          try {
            // 2. Verify payment on backend
            const verifyRes = await orderService.verifyPayment({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });

            if (verifyRes.success) {
              toast.success('Payment successful!');
              onSuccess?.(verifyRes.data);
            } else {
              toast.error('Payment verification failed');
              onError?.(verifyRes);
            }
          } catch (err) {
            logger.error('Payment verification error:', err);
            toast.error(err.response?.data?.message || 'Error verifying payment');
            onError?.(err);
          }
        },
        modal: {
          ondismiss: () => {
            onError?.(new Error('Payment modal dismissed'));
          },
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
      
      paymentObject.on('payment.failed', function (response){
        logger.error('Payment failed event:', response.error);
        finalize();
      });
      
      paymentObject.open();
    } catch (err) {
      logger.error('Payment error:', err);
      toast.error(err.response?.data?.message || 'Payment initiation failed');
      onError?.(err);
      finalize();
    }
  }, []);

  return { processPayment };
};
