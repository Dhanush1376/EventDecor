import React, { useState, createContext, useContext, Profiler } from 'react';
import { logRenderMetrics } from '../utils/performance/profilerLogger';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useRazorpay } from '../hooks/useRazorpay';
import { orderService, cmsService } from '../services/domainServices';
import rentalService from '../services/api/rentalService';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import logger from '../utils/core/logger';
import { PINCODE_MAP, UPI_REGEX } from './checkoutConstants';
import { persistentStorage } from '../utils/storage/persistentStorage';

import { useCheckoutShipping } from './hooks/useCheckoutShipping';
import { useCheckoutRentals } from './hooks/useCheckoutRentals';
import { useCheckoutTotals } from './hooks/useCheckoutTotals';
import { useCheckoutFlow } from './hooks/useCheckoutFlow';

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

  const activeItems = React.useMemo(() => {
    try {
      const rawItems =
        checkoutMode === 'rental' ? rentalCart?.items || [] : purchaseCart?.items || [];
      return rawItems.filter((item) =>
        checkoutMode === 'rental' ? item.type === 'rental' : item.type !== 'rental',
      );
    } catch (e) {
      logger.warn('Failed to parse activeItems in checkout', e);
      return [];
    }
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

  const [activeStep, setActiveStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentOption, setPaymentOption] = useState(() => {
    return persistentStorage.getItem('siri_checkout_payment_option', {
      session: true,
      fallback: 'razorpay',
    });
  });

  React.useEffect(() => {
    persistentStorage.setItem('siri_checkout_payment_option', paymentOption, { session: true });
  }, [paymentOption]);

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

  const {
    orderCompleteRef,
    sendUpdatesToWhatsApp,
    setSendUpdatesToWhatsApp,
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
    checkoutSteps,
    hasCustomizableItems,
    customizationNotes,
    setCustomizationNotes,
  } = useCheckoutFlow({
    isAuthenticated,
    user,
    activeItems,
    orderType: checkoutMode,
    checkoutMode,
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
  });

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
    orderType: checkoutMode,
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
