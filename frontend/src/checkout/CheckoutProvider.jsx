import React, { useState, createContext, useContext, Profiler } from 'react';
import { logRenderMetrics } from '../utils/profilerLogger';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useRazorpay } from '../hooks/useRazorpay';
import { orderService, cmsService } from '../services/domainServices';
import rentalService from '../services/rentalService';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import logger from '../utils/logger';
import { PINCODE_MAP, UPI_REGEX } from './checkoutConstants';
import { persistentStorage } from '../utils/persistentStorage';

import { useCheckoutShipping } from './hooks/useCheckoutShipping';
import { useCheckoutRentals } from './hooks/useCheckoutRentals';
import { useCheckoutTotals } from './hooks/useCheckoutTotals';

const CheckoutContext = createContext(null);

const createIdempotencyKey = () => {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `checkout_${Date.now()}_${Math.random().toString(36).slice(2)}`;
};

export function useCheckout() {
  const ctx = useContext(CheckoutContext);
  if (!ctx) throw new Error('useCheckout must be used within CheckoutProvider');
  return ctx;
}

export function CheckoutProvider({ children }) {
  const { purchaseCart, rentalCart, clearCart, removeItem, claimedCoupon, setClaimedCoupon } =
    useCart();
  const { user, isAuthenticated, openAuthModal } = useAuth();
  const { processPayment } = useRazorpay();
  const navigate = useNavigate();
  const location = useLocation();
  const checkoutMode = location.state?.checkoutMode || 'purchase';
  const hasRentalItems = checkoutMode === 'rental';

  React.useEffect(() => {
    if (!isAuthenticated) {
      navigate('/cart');
      setTimeout(() => {
        openAuthModal();
      }, 300);
    }
  }, [isAuthenticated, navigate, openAuthModal]);

  const { data: settingsData } = useQuery({
    queryKey: ['cms', 'section', 'storeSettings'],
    queryFn: async () => {
      const res = await cmsService.getSection('storeSettings');
      return res.success ? res.data : res;
    },
    staleTime: 10 * 60 * 1000,
  });
  const settings = settingsData || {};

  const [isProcessing, setIsProcessing] = useState(false);
  const orderCompleteRef = React.useRef(false);

  const activeItems = React.useMemo(() => {
    return (checkoutMode === 'rental' ? rentalCart?.items || [] : purchaseCart?.items || []).filter(
      (item) => (checkoutMode === 'rental' ? item.type === 'rental' : item.type !== 'rental'),
    );
  }, [checkoutMode, rentalCart?.items, purchaseCart?.items]);
  const items = activeItems;
  const subtotal =
    checkoutMode === 'rental'
      ? rentalCart?.summary?.subtotal || 0
      : purchaseCart?.summary?.subtotal || 0;

  React.useEffect(() => {
    if (!activeItems || activeItems.length === 0) {
      if (!orderCompleteRef.current) {
        navigate('/cart', { replace: true });
      }
    }
  }, [activeItems, navigate]);

  const getInitialStep = () =>
    persistentStorage.getItem('siri_checkout_step', { session: true, fallback: 1 });
  const [activeStep, setActiveStep] = useState(getInitialStep);

  React.useEffect(() => {
    persistentStorage.setItem('siri_checkout_step', activeStep, { session: true });
  }, [activeStep]);

  const hasCustomizableItems = React.useMemo(() => {
    return activeItems.some(
      (item) => item.product?.customizationConfig?.enabled || item.customizationConfig?.enabled,
    );
  }, [activeItems]);

  const orderType = checkoutMode;
  let checkoutSteps =
    orderType === 'rental'
      ? ['BAG', 'DURATION', 'ADDRESS', 'VERIFY', 'PAYMENT']
      : ['BAG', 'ADDRESS', 'PAYMENT'];

  if (hasCustomizableItems) {
    const paymentIndex = checkoutSteps.indexOf('PAYMENT');
    checkoutSteps.splice(paymentIndex, 0, 'CUSTOMIZATION');
  }

  const [customizationNotes, setCustomizationNotes] = useState(() => {
    return persistentStorage.getItem('siri_checkout_customization_notes', {
      session: true,
      fallback: {},
    });
  });

  React.useEffect(() => {
    persistentStorage.setItem('siri_checkout_customization_notes', customizationNotes, {
      session: true,
    });
  }, [customizationNotes]);

  // Payment Options
  const [sendUpdatesToWhatsApp, setSendUpdatesToWhatsApp] = useState(() => {
    return persistentStorage.getItem('siri_checkout_whatsapp_updates', {
      session: true,
      fallback: true,
    });
  });
  const [paymentOption, setPaymentOption] = useState(() => {
    return persistentStorage.getItem('siri_checkout_payment_option', {
      session: true,
      fallback: 'razorpay',
    });
  });
  const [needByDate, setNeedByDate] = useState(() => {
    return persistentStorage.getItem('siri_checkout_need_by_date', { session: true, fallback: '' });
  });

  React.useEffect(() => {
    persistentStorage.setItem('siri_checkout_whatsapp_updates', sendUpdatesToWhatsApp, {
      session: true,
    });
    persistentStorage.setItem('siri_checkout_payment_option', paymentOption, { session: true });
    persistentStorage.setItem('siri_checkout_need_by_date', needByDate, { session: true });
  }, [sendUpdatesToWhatsApp, paymentOption, needByDate]);

  const [upiId, setUpiId] = useState('');
  const [upiVerified, setUpiVerified] = useState(false);
  const [cardDetails, setCardDetails] = useState({ number: '', expiry: '', cvv: '', name: '' });
  const [selectedBank, setSelectedBank] = useState('HDFC');
  const [codConfirmed, setCodConfirmed] = useState(false);
  const [codOtpSent, setCodOtpSent] = useState(false);
  const [codOtpCode, setCodOtpCode] = useState('');
  const [codVerified, setCodVerified] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  // Domain specific Hooks
  const shipping = useCheckoutShipping({ isAuthenticated, user, setActiveStep, setIsProcessing });
  const rentals = useCheckoutRentals();
  const totals = useCheckoutTotals({
    isAuthenticated,
    activeItems,
    paymentOption,
    location,
    claimedCoupon,
    setClaimedCoupon,
  });

  const buildShippingAddress = () => ({
    name: shipping.activeSelectedAddress.name,
    phone: shipping.activeSelectedAddress.phone,
    alternatePhone: shipping.activeSelectedAddress.alternatePhone || undefined,
    email: shipping.activeSelectedAddress.email || user?.email,
    pincode: shipping.activeSelectedAddress.pincode,
    locality: shipping.activeSelectedAddress.locality,
    address: shipping.activeSelectedAddress.addressString || shipping.activeSelectedAddress.address,
    landmark: shipping.activeSelectedAddress.landmark || '',
    city: shipping.activeSelectedAddress.city,
    state: shipping.activeSelectedAddress.state,
    country: shipping.activeSelectedAddress.country || 'India',
    type: (() => {
      const rawType = (
        shipping.activeSelectedAddress.tag ||
        shipping.activeSelectedAddress.type ||
        'home'
      ).toLowerCase();
      if (rawType === 'office') return 'work';
      if (rawType === 'home' || rawType === 'work' || rawType === 'other') return rawType;
      return 'other';
    })(),
    deliveryInstructions: shipping.activeSelectedAddress.deliveryInstructions || undefined,
  });

  const handleSendCodOtp = async () => {
    const targetEmail = shipping.activeSelectedAddress?.email || user?.email;
    if (!targetEmail) {
      toast.error('An email address is required to receive verification OTP');
      return;
    }
    setIsSendingOtp(true);
    try {
      const res = await orderService.sendCodOtp(targetEmail);
      if (res.success) {
        setCodOtpSent(true);
        toast.success(
          `Verification OTP sent successfully to ${targetEmail}. Please check your inbox or spam folder.`,
        );
      } else {
        toast.error(res.message || 'Failed to send verification OTP');
      }
    } catch (err) {
      logger.error('Failed to send COD OTP:', err);
      toast.error(
        err.response?.data?.message || 'Failed to send verification OTP. Please try again.',
      );
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyCodOtp = async (overrideOtp) => {
    const targetEmail = shipping.activeSelectedAddress?.email || user?.email;
    if (!targetEmail) {
      toast.error('An email address is required for verification');
      return false;
    }
    const otpToVerify = overrideOtp;
    if (!otpToVerify.trim()) {
      toast.error('Please enter the verification code');
      return false;
    }
    setIsProcessing(true);
    try {
      const res = await orderService.verifyCodOtp(targetEmail, otpToVerify);
      if (res.success) {
        setCodVerified(true);
        toast.success('Email verified successfully! Secure Cash on Delivery activated.');
        return true;
      } else {
        toast.error(res.message || 'Invalid verification code');
        return false;
      }
    } catch (err) {
      logger.error('Failed to verify COD OTP:', err);
      toast.error(err.response?.data?.message || 'Invalid verification code. Please try again.');
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  const clearCheckoutSessionStorage = () => {
    persistentStorage.removeItem('siri_checkout_step', { session: true });
    persistentStorage.removeItem('siri_checkout_new_address', { session: true });
    persistentStorage.removeItem('siri_checkout_payment_option', { session: true });
    persistentStorage.removeItem('siri_checkout_need_by_date', { session: true });
    persistentStorage.removeItem('siri_checkout_whatsapp_updates', { session: true });
    persistentStorage.removeItem('siri_checkout_use_wallet', { session: true });
    persistentStorage.removeItem('siri_checkout_selected_address_id', { session: true });
    persistentStorage.removeItem('siri_checkout_is_adding_address', { session: true });
    persistentStorage.removeItem('siri_checkout_coupon_input', { session: true });
    persistentStorage.removeItem('siri_checkout_applied_coupon', { session: true });
    persistentStorage.removeItem('siri_checkout_rental_start', { session: true });
    persistentStorage.removeItem('siri_checkout_rental_end', { session: true });
    persistentStorage.removeItem('siri_checkout_customization_notes', { session: true });
  };

  const handleConfirmRentalOrder = async () => {
    if (isProcessing) return;
    if (!shipping.activeSelectedAddress) {
      toast.error('Please select a delivery address');
      setActiveStep(2);
      return;
    }
    if (!rentals.rentalStartDate || !rentals.rentalEndDate) {
      toast.error('Please select rental dates');
      setActiveStep(1);
      return;
    }
    if (!rentals.agreementAccepted) {
      toast.error('Please accept the rental agreement to proceed');
      return;
    }
    if (paymentOption === 'cod') {
      if (totals.backendTotals.total < 500) {
        toast.error(
          'Cash on Delivery (COD) is only serviceable for order totals between ₹500 and ₹50,000.',
        );
        return;
      }
      if (!codConfirmed) {
        toast.error('Please confirm Cash on Delivery');
        return;
      }
      if (!codVerified) {
        toast.error('Please verify your mobile number with OTP to place a Cash on Delivery order.');
        return;
      }
    }

    const rentalItem = activeItems.find((item) => item.type === 'rental');
    if (!rentalItem) {
      toast.error('No rental items found in checkout');
      return;
    }

    setIsProcessing(true);
    try {
      const rentalPayload = {
        productId: rentalItem.id || rentalItem._id,
        rentalStartDate: rentals.rentalStartDate,
        rentalEndDate: rentals.rentalEndDate,
        shippingAddress: buildShippingAddress(),
        identityDocuments: rentals.identityDocuments.length > 0 ? rentals.identityDocuments : [],
        aadhaarNumber: rentals.aadhaarNumber,
        agreementAccepted: true,
        paymentMethod: paymentOption === 'razorpay' ? 'razorpay' : 'cod',
        customizationNote:
          customizationNotes[
            `${rentalItem.id || rentalItem._id}-${rentalItem.variant || 'default'}`
          ] || undefined,
      };

      const createRes = await rentalService.createOrder(rentalPayload);

      if (!createRes.success) {
        toast.error(createRes.message || 'Failed to create rental order');
        setIsProcessing(false);
        return;
      }

      const { rentalOrder, razorpayOrderId, razorpayKeyId, amount } = createRes.data;

      if (paymentOption === 'cod') {
        toast.success('Rental Cash on Delivery order placed successfully!');
        orderCompleteRef.current = true;
        activeItems
          .filter((i) => i.type === 'rental')
          .forEach((item) => removeItem(item.id || item._id, item.variant));
        clearCheckoutSessionStorage();
        setIsProcessing(false);
        navigate('/order-success', { state: { orderDetails: rentalOrder }, replace: true });
        return;
      }

      const scriptLoaded = await new Promise((resolve) => {
        if (window.Razorpay) return resolve(true);
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
      });

      if (!scriptLoaded) {
        toast.error('Razorpay SDK failed to load. Are you online?');
        setIsProcessing(false);
        return;
      }

      const options = {
        key: razorpayKeyId || import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: amount,
        currency: 'INR',
        name: 'Siri Arts & Crafts',
        description: `Rental: ${rentalOrder.productTitle}`,
        image:
          import.meta.env.VITE_LOGO_URL ||
          'https://res.cloudinary.com/siriartscrafts/image/upload/v1/SiriLogo.webp',
        order_id: razorpayOrderId,
        handler: async (response) => {
          try {
            const verifyRes = await rentalService.verifyPayment({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });

            if (verifyRes.success) {
              toast.success('Rental payment successful!');
              orderCompleteRef.current = true;
              activeItems
                .filter((i) => i.type === 'rental')
                .forEach((item) => removeItem(item.id || item._id, item.variant));
              clearCheckoutSessionStorage();
              navigate('/order-success', {
                state: { orderDetails: verifyRes.data },
                replace: true,
              });
            } else {
              toast.error('Rental payment verification failed');
            }
          } catch (err) {
            logger.error('Rental payment verification error:', err);
            toast.error(err.response?.data?.message || 'Error verifying rental payment');
          } finally {
            setIsProcessing(false);
          }
        },
        modal: { ondismiss: () => setIsProcessing(false) },
        prefill: {
          name: shipping.activeSelectedAddress.name,
          contact: shipping.activeSelectedAddress.phone,
        },
        theme: { color: '#d4af37' },
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.on('payment.failed', (response) => {
        logger.error('Rental payment failed:', response.error);
        setIsProcessing(false);
      });
      paymentObject.open();
    } catch (err) {
      logger.error('Rental order creation failed:', err);
      let msg = err.response?.data?.message || err.message || 'Failed to create rental order';
      if (err.message === 'Network Error') {
        msg =
          'Network Error: Please check your connection. If on iPhone/Safari, disable Tracking Protection/Adblockers.';
      }
      toast.error(msg);
      setIsProcessing(false);
    }
  };

  const handleConfirmPurchaseOrder = async () => {
    if (isProcessing) return;

    if (!shipping.activeSelectedAddress) {
      toast.error('Please select a delivery address');
      setActiveStep(1);
      return;
    }

    if (paymentOption === 'cod') {
      if (totals.backendTotals.total < 500) {
        toast.error(
          'Cash on Delivery (COD) is only serviceable for order totals between ₹500 and ₹50,000.',
        );
        return;
      }
      if (!codConfirmed) {
        toast.error('Please confirm Cash on Delivery');
        return;
      }
      if (!codVerified) {
        toast.error('Please verify your mobile number with OTP to place a Cash on Delivery order.');
        return;
      }
    }

    setIsProcessing(true);

    const orderData = {
      items: activeItems.map((item) => {
        const key = `${item.id || item._id}-${item.variant || 'default'}`;
        return {
          productId: item.id || item._id,
          quantity: item.quantity,
          variant: item.variant || 'Default',
          customizationNote: customizationNotes[key] || undefined,
        };
      }),
      shippingAddress: buildShippingAddress(),
      couponCode: totals.appliedCoupon || undefined,
      paymentMethod: paymentOption === 'razorpay' ? 'razorpay' : 'cod',
      useWallet: totals.useWallet,
      needByDate: needByDate || undefined,
      idempotencyKey: createIdempotencyKey(),
    };

    if (paymentOption === 'razorpay') {
      processPayment(
        orderData,
        (order) => {
          orderCompleteRef.current = true;
          setIsProcessing(false);
          activeItems.forEach((item) => removeItem(item.id || item._id, item.variant));
          clearCheckoutSessionStorage();
          navigate('/order-success', { state: { orderDetails: order }, replace: true });
        },
        (_error) => {
          setIsProcessing(false);
        },
      );
    } else {
      try {
        const response = await orderService.create(orderData, {
          idempotencyKey: orderData.idempotencyKey,
        });
        if (response && response.success) {
          orderCompleteRef.current = true;
          const orderObj = response.data?.order || response.data || response;
          activeItems.forEach((item) => removeItem(item.id || item._id, item.variant));
          clearCheckoutSessionStorage();
          navigate('/order-success', { state: { orderDetails: orderObj }, replace: true });
        }
      } catch (err) {
        logger.error('Failed to place COD order:', err);
        toast.error(err.response?.data?.message || err.message || 'Failed to place COD order');
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleConfirmOrder = async () => {
    if (orderType === 'rental') {
      return handleConfirmRentalOrder();
    }
    return handleConfirmPurchaseOrder();
  };

  const value = {
    items,
    subtotal,
    clearCart,
    claimedCoupon,
    setClaimedCoupon,
    user,
    isAuthenticated,
    openAuthModal,
    navigate,
    settings,
    isProcessing,
    setIsProcessing,
    orderCompleteRef,
    activeStep,
    setActiveStep,
    activeItems,
    sendUpdatesToWhatsApp,
    setSendUpdatesToWhatsApp,
    paymentOption,
    setPaymentOption,
    needByDate,
    setNeedByDate,
    upiId,
    setUpiId,
    upiVerified,
    setUpiVerified,
    cardDetails,
    setCardDetails,
    selectedBank,
    setSelectedBank,
    codConfirmed,
    setCodConfirmed,
    codOtpSent,
    setCodOtpSent,
    codOtpCode,
    setCodOtpCode,
    codVerified,
    setCodVerified,
    isSendingOtp,
    paymentError,
    setPaymentError,
    handleSendCodOtp,
    handleVerifyCodOtp,
    handleConfirmOrder,
    PINCODE_MAP,
    UPI_REGEX,
    hasRentalItems,
    orderType,
    checkoutSteps,
    hasCustomizableItems,
    customizationNotes,
    setCustomizationNotes,

    // Decomposed Hooks Spread
    ...shipping,
    ...rentals,
    ...totals,
  };

  return (
    <Profiler id="CheckoutProvider" onRender={logRenderMetrics}>
      <CheckoutContext.Provider value={value}>{children}</CheckoutContext.Provider>
    </Profiler>
  );
}
