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
    await new Promise((r) => setTimeout(r, 1000));
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

// Premium Toast Helpers
const showPremiumToast = (message, type = 'error') => {
  const isError = type === 'error';
  toast.custom(
    (t) => (
      <div
        className={`${
          t.visible ? 'animate-spring-up' : 'animate-fade-out'
        } flex items-center gap-3 px-5 py-3 rounded-full bg-white/80 dark:bg-black/80 backdrop-blur-xl border border-black/5 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.08)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] pointer-events-auto`}
      >
        <div
          className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full ${
            isError
              ? 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400'
              : 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400'
          }`}
        >
          {isError ? (
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          ) : (
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          )}
        </div>
        <p className="text-sm font-medium text-gray-900 dark:text-white">{message}</p>
      </div>
    ),
    { duration: 4000, position: 'bottom-center' },
  );
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
        showPremiumToast('Razorpay SDK failed to load. Are you online?', 'error');
        onError?.(new Error('Razorpay SDK failed to load'));
        return finalize();
      }
      // 1. Create order on backend
      const response = await orderService.create(orderData, {
        idempotencyKey: orderData.idempotencyKey || createIdempotencyKey(),
      });

      if (!response.success) {
        showPremiumToast(response.message || 'Failed to create order', 'error');
        onError?.(response);
        return finalize();
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
        image:
          import.meta.env.VITE_LOGO_URL ||
          'https://res.cloudinary.com/siriartscrafts/image/upload/v1/SiriLogo.webp',
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
              showPremiumToast('Payment successful!', 'success');
              onSuccess?.(verifyRes.data);
            } else {
              showPremiumToast('Payment verification failed', 'error');
              onError?.(verifyRes);
            }
          } catch (err) {
            logger.error('Payment verification error:', err);
            const errorMessage =
              err.response?.data?.message || err.message || 'Error verifying payment';
            showPremiumToast(errorMessage, 'error');
            onError?.(err);
          }
        },
        modal: {
          ondismiss: () => {
            onError?.(new Error('Payment modal dismissed'));
            finalize();
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

      paymentObject.on('payment.failed', function (response) {
        logger.error('Payment failed event:', response.error);
        finalize();
      });

      paymentObject.open();
    } catch (err) {
      logger.error('Payment error:', err);
      // We check for err.response.data.message from backend validation errors,
      // or err.message for frontend syntax/type errors like "Payment gateway returned an invalid order payload"
      let errorMessage = err.response?.data?.message || err.message || 'Payment initiation failed';
      if (err.message === 'Network Error') {
        errorMessage =
          'Network Error: Please check your connection. If on iPhone/Safari, disable Tracking Protection/Adblockers.';
      }
      showPremiumToast(errorMessage, 'error');
      onError?.(err);
      finalize();
    }
  }, []);

  return { processPayment };
};
