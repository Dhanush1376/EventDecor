import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { persistentStorage } from '../../utils/storage/persistentStorage';
import { orderService } from '../../services/domainServices';
import rentalService from '../../services/api/rentalService';
import toast from 'react-hot-toast';
import logger from '../../utils/core/logger';
import { EXTERNAL_URLS } from '../../config/constants';
import { BRAND } from '../../config/brand';

const createIdempotencyKey = () => {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `checkout_${Date.now()}_${Math.random().toString(36).slice(2)}`;
};

export function useCheckoutFlow({
  isAuthenticated,
  user,
  activeItems,
  orderType,
  checkoutMode,
  customOrder,
  removeItem,
  clearCart,
  navigate,
  processPayment,
  shipping,
  rentals,
  totals,
  activeStep,
  setActiveStep,
  isProcessing,
  setIsProcessing,
  paymentOption,
  setPaymentOption,
  settings,
}) {
  const orderCompleteRef = useRef(false);

  const getInitialStep = () =>
    persistentStorage.getItem('siri_checkout_step', { session: true, fallback: 1 });

  useEffect(() => {
    persistentStorage.setItem('siri_checkout_step', activeStep, { session: true });
  }, [activeStep]);

  const hasCustomizableItems = useMemo(() => {
    return activeItems.some(
      (item) => item.product?.customizationConfig?.enabled || item.customizationConfig?.enabled,
    );
  }, [activeItems]);

  const checkoutSteps = useMemo(() => {
    const steps =
      orderType === 'rental'
        ? ['BAG', 'DURATION', 'ADDRESS', 'VERIFY', 'PAYMENT']
        : ['BAG', 'ADDRESS', 'PAYMENT'];

    if (hasCustomizableItems) {
      const paymentIndex = steps.indexOf('PAYMENT');
      steps.splice(paymentIndex, 0, 'CUSTOMIZATION');
    }
    return steps;
  }, [orderType, hasCustomizableItems]);

  const [customizationNotes, setCustomizationNotes] = useState(() => {
    return persistentStorage.getItem('siri_checkout_customization_notes', {
      session: true,
      fallback: {},
    });
  });

  useEffect(() => {
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
  const [needByDate, setNeedByDate] = useState(() => {
    const raw = persistentStorage.getItem('siri_checkout_need_by_date', {
      session: true,
      fallback: '',
    });
    if (!raw || typeof raw !== 'string') return '';
    if (raw.includes('T')) return raw.split('T')[0];
    return raw.trim();
  });

  useEffect(() => {
    persistentStorage.setItem('siri_checkout_whatsapp_updates', sendUpdatesToWhatsApp, {
      session: true,
    });
    persistentStorage.setItem('siri_checkout_need_by_date', needByDate || '', { session: true });
  }, [sendUpdatesToWhatsApp, needByDate]);

  const [upiId, setUpiId] = useState('');
  const [upiVerified, setUpiVerified] = useState(false);
  const [cardDetails, setCardDetails] = useState({ number: '', expiry: '', cvv: '', name: '' });
  const [selectedBank, setSelectedBank] = useState('HDFC');
  const [codConfirmed, setCodConfirmed] = useState(false);
  const [codOtpSent, setCodOtpSent] = useState(false);
  const [codOtpCode, setCodOtpCode] = useState('');
  const [codVerified, setCodVerified] = useState(false);
  const [codVerificationToken, setCodVerificationToken] = useState(null);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  const configuredCodChannel = settings?.payments?.codOtpChannel || 'phone';
  const [selectedCodChannel, setSelectedCodChannel] = useState(() => {
    return configuredCodChannel === 'email' ? 'email' : 'phone';
  });

  useEffect(() => {
    if (configuredCodChannel === 'email') {
      setSelectedCodChannel('email');
    } else if (configuredCodChannel === 'phone') {
      setSelectedCodChannel('phone');
    }
  }, [configuredCodChannel]);

  const effectiveCodChannel =
    configuredCodChannel === 'both' ? selectedCodChannel : configuredCodChannel;

  // Enforce address binding: changing address/phone resets prior COD verification!
  const activeAddrId = shipping.activeSelectedAddress?._id || shipping.activeSelectedAddress?.id;
  const activeAddrPhone = shipping.activeSelectedAddress?.phone;
  const activeAddrEmail = shipping.activeSelectedAddress?.email;

  useEffect(() => {
    setCodVerified(false);
    setCodVerificationToken(null);
    setCodOtpSent(false);
    setCodOtpCode('');
  }, [activeAddrId, activeAddrPhone, activeAddrEmail, effectiveCodChannel]);

  const buildShippingAddress = useCallback(
    () => ({
      name: shipping.activeSelectedAddress.name,
      phone: shipping.activeSelectedAddress.phone,
      alternatePhone: shipping.activeSelectedAddress.alternatePhone || undefined,
      email: shipping.activeSelectedAddress.email || user?.email,
      pincode: shipping.activeSelectedAddress.pincode,
      locality: shipping.activeSelectedAddress.locality,
      address:
        shipping.activeSelectedAddress.addressString || shipping.activeSelectedAddress.address,
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
    }),
    [shipping.activeSelectedAddress, user],
  );

  const handleSendCodOtp = async () => {
    const targetPhone = shipping.activeSelectedAddress?.phone || user?.phone;
    const targetEmail = shipping.activeSelectedAddress?.email || user?.email;

    if (effectiveCodChannel === 'email') {
      if (!targetEmail || !targetEmail.trim()) {
        toast.error('A valid email address is required for COD email verification.');
        return;
      }
    } else {
      if (!targetPhone || !targetPhone.trim()) {
        toast.error('Please add a phone number to this delivery address to place a COD order.');
        return;
      }
    }

    setIsSendingOtp(true);
    try {
      const payload =
        effectiveCodChannel === 'email'
          ? { email: targetEmail.trim(), channel: 'email' }
          : { phone: targetPhone.trim(), channel: 'phone' };

      const res = await orderService.sendCodOtp(payload);
      if (res.success) {
        setCodOtpSent(true);
        if (effectiveCodChannel === 'email') {
          toast.success(
            `Verification OTP sent to ${res.data?.email || res.data?.deliveryTarget || targetEmail}. Please check your email inbox.`,
          );
        } else {
          toast.success(
            `Verification OTP sent via SMS to ${res.data?.phone || res.data?.deliveryTarget || targetPhone}.`,
          );
        }
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
    const targetPhone = shipping.activeSelectedAddress?.phone || user?.phone;
    const targetEmail = shipping.activeSelectedAddress?.email || user?.email;

    if (effectiveCodChannel === 'email') {
      if (!targetEmail || !targetEmail.trim()) {
        toast.error('A valid email address is required for COD verification');
        return false;
      }
    } else {
      if (!targetPhone || !targetPhone.trim()) {
        toast.error('A delivery address phone number is required for COD verification');
        return false;
      }
    }

    const otpToVerify = overrideOtp || codOtpCode;
    if (!otpToVerify || !otpToVerify.trim()) {
      toast.error('Please enter the verification code');
      return false;
    }
    setIsProcessing(true);
    try {
      const payload =
        effectiveCodChannel === 'email'
          ? { email: targetEmail.trim(), channel: 'email', otp: otpToVerify }
          : { phone: targetPhone.trim(), channel: 'phone', otp: otpToVerify };

      const res = await orderService.verifyCodOtp(payload);
      if (res.success && res.data?.codVerificationToken) {
        setCodVerified(true);
        setCodVerificationToken(res.data.codVerificationToken);
        const successMsg =
          res.data?.channel === 'email'
            ? 'Email verified successfully! Secure Cash on Delivery activated.'
            : 'Delivery phone verified successfully! Secure Cash on Delivery activated.';
        toast.success(successMsg);
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

  const clearCheckoutSessionStorage = useCallback(() => {
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
  }, []);

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
    const grossRentalAmount = rentals.rentalCostBreakdown?.totalAmount || 0;
    const availableWalletBalance =
      (totals.backendTotals?.walletBalance ?? user?.walletBalance) || 0;
    const rentalWalletDeduction =
      totals.useWallet && availableWalletBalance > 0
        ? Math.min(grossRentalAmount, availableWalletBalance)
        : 0;
    const netRentalPayable = Math.max(0, grossRentalAmount - rentalWalletDeduction);
    const isRentalFullyPaid = netRentalPayable === 0;

    if (!isRentalFullyPaid && paymentOption === 'cod') {
      const codMinOrder = settings?.payments?.codMinOrder ?? 500;
      const codMaxOrder = settings?.payments?.codMaxOrder ?? 50000;
      const isCodEnabled = settings?.payments?.enableCOD ?? true;

      if (!isCodEnabled) {
        toast.error('Cash on Delivery is currently disabled.');
        return;
      }
      if (netRentalPayable < codMinOrder || netRentalPayable > codMaxOrder) {
        toast.error(
          `Cash on Delivery (COD) is only serviceable for order totals between ₹${codMinOrder} and ₹${codMaxOrder}.`,
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
        quantity: rentalItem.quantity || 1,
        rentalStartDate: rentals.rentalStartDate,
        rentalEndDate: rentals.rentalEndDate,
        shippingAddress: buildShippingAddress(),
        identityDocuments: rentals.identityDocuments.length > 0 ? rentals.identityDocuments : [],
        aadhaarNumber: rentals.aadhaarNumber,
        agreementAccepted: true,
        paymentMethod: isRentalFullyPaid
          ? 'wallet'
          : paymentOption === 'razorpay'
            ? 'razorpay'
            : 'cod',
        useWallet: Boolean(totals.useWallet),
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

      if (isRentalFullyPaid || paymentOption === 'cod' || !razorpayOrderId) {
        toast.success(
          isRentalFullyPaid
            ? 'Rental order placed successfully with wallet payment!'
            : paymentOption === 'cod'
              ? 'Rental Cash on Delivery order placed successfully!'
              : 'Rental order placed successfully!',
        );
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
        script.src = EXTERNAL_URLS.RAZORPAY_CHECKOUT;
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
        name: settings?.general?.storeName || BRAND.name || 'Siri Arts & Crafts',
        description: `Rental: ${rentalOrder.productTitle}`,
        image:
          import.meta.env.VITE_LOGO_URL ||
          'https://res.cloudinary.com/drxgnnzeb/image/upload/v1785779448/siri-arts-crafts/zqqwwbsrjpb7bqcrl24l.png',
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

    const isFullyPaid = (totals.backendTotals?.total ?? 0) === 0;

    if (!isFullyPaid && paymentOption === 'cod') {
      const codMinOrder = settings?.payments?.codMinOrder ?? 500;
      const codMaxOrder = settings?.payments?.codMaxOrder ?? 50000;
      const isCodEnabled = settings?.payments?.enableCOD ?? true;

      if (!isCodEnabled) {
        toast.error('Cash on Delivery is currently disabled.');
        return;
      }
      if (totals.backendTotals.total < codMinOrder || totals.backendTotals.total > codMaxOrder) {
        toast.error(
          `Cash on Delivery (COD) is only serviceable for order totals between ₹${codMinOrder} and ₹${codMaxOrder}.`,
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

    const effectivePaymentMethod = isFullyPaid
      ? 'wallet'
      : paymentOption === 'razorpay'
        ? 'razorpay'
        : 'cod';

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
      paymentMethod: effectivePaymentMethod,
      useWallet: totals.useWallet,
      needByDate: needByDate || undefined,
      idempotencyKey: createIdempotencyKey(),
      isCustomOrder: checkoutMode === 'custom',
      customOrderId:
        checkoutMode === 'custom'
          ? customOrder?._id || activeItems[0]?.id || activeItems[0]?._id
          : undefined,
      codVerificationToken:
        !isFullyPaid && paymentOption === 'cod' ? codVerificationToken : undefined,
    };

    if (isFullyPaid) {
      try {
        const response = await orderService.create(orderData, {
          idempotencyKey: orderData.idempotencyKey,
        });
        if (response && response.success) {
          orderCompleteRef.current = true;
          const orderObj = response.data?.order || response.data || response;
          activeItems.forEach((item) => removeItem(item.id || item._id, item.variant));
          clearCheckoutSessionStorage();
          toast.success(
            totals.useWallet
              ? 'Order successfully placed and fully paid using wallet balance!'
              : 'Order successfully placed!',
          );
          navigate('/order-success', { state: { orderDetails: orderObj }, replace: true });
        } else {
          toast.error(response?.message || 'Failed to place order');
        }
      } catch (err) {
        logger.error('Failed to place fully paid order:', err);
        toast.error(err.response?.data?.message || err.message || 'Failed to place order');
      } finally {
        setIsProcessing(false);
      }
      return;
    }

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

  return {
    isProcessing,
    setIsProcessing,
    orderCompleteRef,
    activeStep,
    setActiveStep,
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
    codVerificationToken,
    isSendingOtp,
    paymentError,
    setPaymentError,
    configuredCodChannel,
    effectiveCodChannel,
    selectedCodChannel,
    setSelectedCodChannel,
    handleSendCodOtp,
    handleVerifyCodOtp,
    handleConfirmOrder,
    checkoutSteps,
    hasCustomizableItems,
    customizationNotes,
    setCustomizationNotes,
  };
}
