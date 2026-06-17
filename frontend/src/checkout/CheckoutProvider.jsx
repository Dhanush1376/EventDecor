import React, { useState, createContext, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useRazorpay } from '../hooks/useRazorpay';
import { orderService, cmsService, userService, couponService } from '../services/domainServices';
import rentalService from '../services/rentalService';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import logger from '../utils/logger';
import { PINCODE_MAP, UPI_REGEX } from './checkoutConstants';
import { persistentStorage } from '../utils/persistentStorage';

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

  // Intercept direct unauthenticated access to checkout page
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
  const totalsRequestRef = React.useRef(0);
  const autoApplyAttemptedRef = React.useRef(false);

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

  // Redirect to cart if empty - Bug Fix #4
  React.useEffect(() => {
    if (!activeItems || activeItems.length === 0) {
      if (!orderCompleteRef.current) {
        navigate('/cart', { replace: true });
      }
    }
  }, [activeItems, navigate]);

  // Multi-step vertical accordion state tracking
  const getInitialStep = () => {
    return persistentStorage.getItem('siri_checkout_step', { session: true, fallback: 1 });
  };
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

  const [rentalStartDate, setRentalStartDate] = useState(() => {
    return persistentStorage.getItem('siri_checkout_rental_start', {
      session: true,
      fallback: null,
    });
  });
  const [rentalEndDate, setRentalEndDate] = useState(() => {
    return persistentStorage.getItem('siri_checkout_rental_end', { session: true, fallback: null });
  });

  // ─── Rental-specific state ───
  const [rentalCostBreakdown, setRentalCostBreakdown] = useState(null);
  const [rentalAvailability, setRentalAvailability] = useState(null);
  const [identityDocuments, setIdentityDocuments] = useState([]);
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [agreementAccepted, setAgreementAccepted] = useState(false);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);

  React.useEffect(() => {
    persistentStorage.setItem('siri_checkout_rental_start', rentalStartDate, { session: true });
  }, [rentalStartDate]);

  React.useEffect(() => {
    persistentStorage.setItem('siri_checkout_rental_end', rentalEndDate, { session: true });
  }, [rentalEndDate]);

  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(() => {
    return persistentStorage.getItem('siri_checkout_selected_address_id', {
      session: true,
      fallback: null,
    });
  });
  const [isAddingNewAddress, setIsAddingNewAddress] = useState(() => {
    return persistentStorage.getItem('siri_checkout_is_adding_address', {
      session: true,
      fallback: false,
    });
  });

  React.useEffect(() => {
    if (selectedAddressId) {
      persistentStorage.setItem('siri_checkout_selected_address_id', selectedAddressId, {
        session: true,
      });
    } else {
      persistentStorage.removeItem('siri_checkout_selected_address_id', { session: true });
    }
  }, [selectedAddressId]);

  React.useEffect(() => {
    persistentStorage.setItem('siri_checkout_is_adding_address', isAddingNewAddress, {
      session: true,
    });
  }, [isAddingNewAddress]);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);

  // New Address Form State
  const [newAddress, setNewAddress] = useState(() => {
    return persistentStorage.getItem('siri_checkout_new_address', {
      session: true,
      fallback: {
        name: user?.name || '',
        phone: user?.phone || '',
        alternatePhone: '',
        email: user?.email || '',
        pincode: '',
        locality: '',
        address: '',
        landmark: '',
        city: '',
        state: '',
        country: 'India',
        tag: 'Home',
        deliveryInstructions: '',
        latitude: null,
        longitude: null,
      },
    });
  });

  React.useEffect(() => {
    persistentStorage.setItem('siri_checkout_new_address', newAddress, { session: true });
  }, [newAddress]);

  React.useEffect(() => {
    if (user) {
      const timer = setTimeout(() => {
        setNewAddress((prev) => ({
          ...prev,
          name: prev.name || user.name || '',
          phone: prev.phone || user.phone || '',
          email: prev.email || user.email || '',
        }));
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [user]);

  // Tracking notifications option
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
  }, [sendUpdatesToWhatsApp]);

  React.useEffect(() => {
    persistentStorage.setItem('siri_checkout_payment_option', paymentOption, { session: true });
  }, [paymentOption]);

  React.useEffect(() => {
    persistentStorage.setItem('siri_checkout_need_by_date', needByDate, { session: true });
  }, [needByDate]);

  // specific inputs per payment method
  const [upiId, setUpiId] = useState('');
  const [upiVerified, setUpiVerified] = useState(false);
  const [cardDetails, setCardDetails] = useState({
    number: '',
    expiry: '',
    cvv: '',
    name: '',
  });
  const [selectedBank, setSelectedBank] = useState('HDFC');
  const [codConfirmed, setCodConfirmed] = useState(false);
  const [codOtpSent, setCodOtpSent] = useState(false);
  const [codOtpCode, setCodOtpCode] = useState('');
  const [codOtpInput, setCodOtpInput] = useState('');
  const [codVerified, setCodVerified] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [addressError, setAddressError] = useState('');

  // Coupon state
  const [couponInput, setCouponInput] = useState(() => {
    return persistentStorage.getItem('siri_checkout_coupon_input', { session: true, fallback: '' });
  });
  const [appliedCoupon, setAppliedCoupon] = useState(() => {
    return persistentStorage.getItem('siri_checkout_applied_coupon', {
      session: true,
      fallback: '',
    });
  });

  React.useEffect(() => {
    persistentStorage.setItem('siri_checkout_coupon_input', couponInput, { session: true });
  }, [couponInput]);

  React.useEffect(() => {
    persistentStorage.setItem('siri_checkout_applied_coupon', appliedCoupon, { session: true });
  }, [appliedCoupon]);
  const [couponValid, setCouponValid] = useState(false);
  const [couponMessage, setCouponMessage] = useState('');
  const [availableCoupons, setAvailableCoupons] = useState([]);
  const [loadingCoupons, setLoadingCoupons] = useState(false);
  const [backendTotals, setBackendTotals] = useState({
    subtotal: 0,
    discount: 0,
    shippingFee: 0,
    platformFee: 0,
    total: 0,
  });
  const [isTotalsLoading, setIsTotalsLoading] = useState(false);
  const [totalsError, setTotalsError] = useState(null);
  const [useWallet, setUseWallet] = useState(() => {
    return persistentStorage.getItem('siri_checkout_use_wallet', {
      session: true,
      fallback: false,
    });
  });

  React.useEffect(() => {
    persistentStorage.setItem('siri_checkout_use_wallet', useWallet, { session: true });
  }, [useWallet]);

  // Load addresses and active coupons from MongoDB on mount
  React.useEffect(() => {
    if (isAuthenticated) {
      userService
        .getAddresses()
        .then((res) => {
          if (res.success && res.data) {
            setSavedAddresses(res.data);
            const savedAddrId = persistentStorage.getItem('siri_checkout_selected_address_id', {
              session: true,
            });
            const savedIsAdding = persistentStorage.getItem('siri_checkout_is_adding_address', {
              session: true,
            });

            if (
              savedAddrId &&
              res.data.some((a) => String(a._id || a.id) === String(savedAddrId))
            ) {
              setSelectedAddressId(savedAddrId);
              setIsAddingNewAddress(savedIsAdding === true);
            } else {
              const defaultAddr = res.data.find((a) => a.isDefault) || res.data[0];
              if (defaultAddr) {
                setSelectedAddressId(defaultAddr._id || defaultAddr.id);
                setIsAddingNewAddress(false);
              } else {
                setIsAddingNewAddress(false);
              }
            }
          }
        })
        .catch((err) => {
          logger.error('Failed to load addresses:', err);
        });

      // Load active coupons
      const timer = setTimeout(() => {
        setLoadingCoupons(true);
      }, 0);
      couponService
        .getAll()
        .then((res) => {
          if (res.success && res.data) {
            const list =
              res.data.data || res.data.items || (Array.isArray(res.data) ? res.data : []);
            const activeList = list.filter((c) => {
              const isExpired = new Date() > new Date(c.expiryDate);
              return c.isActive && !isExpired && (!c.usageLimit || c.usedCount < c.usageLimit);
            });
            setAvailableCoupons(activeList);
          }
        })
        .catch((err) => {
          logger.error('Failed to load active coupons:', err);
        })
        .finally(() => {
          setLoadingCoupons(false);
        });
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated]);

  // Bulletproof reactive coupon synchronization from Cart/Storefront
  React.useEffect(() => {
    if (isAuthenticated && !autoApplyAttemptedRef.current) {
      const couponCodeToApply = location.state?.couponCode || claimedCoupon;
      if (couponCodeToApply && couponCodeToApply !== appliedCoupon) {
        logger.info(`Auto-applying coupon: ${couponCodeToApply}`);
        setCouponInput(couponCodeToApply);
        setAppliedCoupon(couponCodeToApply);
        autoApplyAttemptedRef.current = true;
        if (claimedCoupon) {
          setClaimedCoupon('');
        }
        toast.success(`Auto-applied coupon "${couponCodeToApply}"!`);
      }
    }
  }, [isAuthenticated, claimedCoupon, location.state, appliedCoupon]);

  // Securely calculate and validate order totals from backend
  async function fetchBackendTotals(couponToApply = '') {
    if (!activeItems || activeItems.length === 0) return;
    const requestId = totalsRequestRef.current + 1;
    totalsRequestRef.current = requestId;

    setIsTotalsLoading(true);
    setTotalsError(null);
    try {
      const itemsPayload = activeItems.map((item) => ({
        productId: item.id || item._id,
        quantity: item.quantity,
      }));

      const res = await orderService.validateTotals({
        items: itemsPayload,
        couponCode: couponToApply || undefined,
        paymentMethod: paymentOption,
        useWallet,
      });

      if (res.success && res.data) {
        if (requestId !== totalsRequestRef.current) return;
        setBackendTotals(res.data);
        setTotalsError(null);
        if (couponToApply) {
          setCouponValid(res.data.couponValid);
          setCouponMessage(res.data.couponMessage);
          if (res.data.couponValid) {
            setAppliedCoupon(couponToApply);
          } else {
            setAppliedCoupon('');
          }
        }
      }
    } catch (err) {
      logger.error('Failed to validate checkout totals:', err);
      const errMsg =
        err.response?.data?.message ||
        'Failed to connect to backend server. Please verify your connection.';
      setTotalsError(errMsg);
      toast.error(errMsg);
    } finally {
      if (requestId === totalsRequestRef.current) {
        setIsTotalsLoading(false);
      }
    }
  }

  React.useEffect(() => {
    fetchBackendTotals(appliedCoupon);
  }, [activeItems, appliedCoupon, paymentOption, useWallet]);

  const handleApplyCoupon = () => {
    if (!couponInput.trim()) {
      toast.error('Please enter a coupon code');
      return;
    }
    fetchBackendTotals(couponInput.trim());
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon('');
    setCouponInput('');
    setCouponMessage('');
    setCouponValid(false);
    fetchBackendTotals('');
  };

  const handleFetchCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    setIsDetectingLocation(true);
    const toastId = toast.loading('Accessing device GPS location...');

    const reverseGeocode = async (latitude, longitude) => {
      toast.loading('Resolving coordinates to address...', { id: toastId });

      // AbortController so the fetch doesn't hang forever
      const controller = new AbortController();
      const fetchTimeout = setTimeout(() => controller.abort(), 12000);

      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1&zoom=18`,
          {
            signal: controller.signal,
            headers: {
              Accept: 'application/json',
              'Accept-Language': 'en',
              // Nominatim policy: must send a valid User-Agent and Referer
              'User-Agent': 'SiriArtsAndCrafts/1.0 (checkout address autofill)',
            },
          },
        );
        clearTimeout(fetchTimeout);

        if (!res.ok) {
          throw new Error(`Geocoding API returned ${res.status}`);
        }

        const data = await res.json();

        if (data && data.address) {
          const addr = data.address;

          // Robustly extract pincode (Indian 6-digit postcode)
          const rawPincode = addr.postcode || '';
          const pincode = rawPincode.replace(/\D/g, '').slice(0, 6);

          // City: try multiple Indian address fields in order of specificity
          const city =
            addr.city ||
            addr.town ||
            addr.village ||
            addr.municipality ||
            addr.county ||
            addr.state_district ||
            '';

          const state = addr.state || '';
          const country = addr.country || 'India';

          // Build street address string from available parts
          const streetParts = [];
          if (addr.house_number) streetParts.push(addr.house_number);
          if (addr.building) streetParts.push(addr.building);
          if (addr.road || addr.street) streetParts.push(addr.road || addr.street);
          if (addr.suburb) streetParts.push(addr.suburb);
          if (addr.neighbourhood) streetParts.push(addr.neighbourhood);
          // Fallback to display_name stripped of country/state suffix
          const addressString =
            streetParts.length > 0
              ? streetParts.join(', ')
              : data.display_name?.split(',').slice(0, 4).join(',').trim() || '';

          // Locality: area/suburb level
          const locality =
            addr.suburb ||
            addr.neighbourhood ||
            addr.subdistrict ||
            addr.locality ||
            addr.city_district ||
            city ||
            '';

          // Landmark: nearby notable place
          const landmark =
            addr.amenity || addr.shop || addr.office || addr.tourism || addr.leisure || '';

          setNewAddress((prev) => ({
            ...prev,
            pincode,
            address: addressString,
            locality,
            landmark: landmark || prev.landmark || locality || city,
            city,
            state,
            country,
            latitude,
            longitude,
          }));

          toast.success('Address auto-filled from your location!', { id: toastId });
        } else {
          throw new Error('Geocoding API returned no address data for this coordinate');
        }
      } catch (err) {
        clearTimeout(fetchTimeout);
        if (err.name === 'AbortError') {
          toast.error('Address lookup timed out. Please fill in manually.', { id: toastId });
        } else {
          logger.error('Reverse geocode failed:', err);
          toast.error('Could not resolve address. Check your connection or fill manually.', {
            id: toastId,
          });
        }
      } finally {
        setIsDetectingLocation(false);
      }
    };

    const getPosition = (highAccuracy = true) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          reverseGeocode(latitude, longitude);
        },
        (error) => {
          if (
            highAccuracy &&
            (error.code === error.TIMEOUT || error.code === error.POSITION_UNAVAILABLE)
          ) {
            logger.warn('High accuracy GPS timed out. Retrying with standard accuracy...');
            toast.loading('Retrying with standard accuracy...', { id: toastId });
            getPosition(false);
          } else {
            setIsDetectingLocation(false);
            let errorMsg = 'Failed to access your location. Please fill details manually.';
            if (error.code === error.PERMISSION_DENIED) {
              errorMsg =
                'Location permission denied. Please allow browser location access and try again.';
            } else if (error.code === error.POSITION_UNAVAILABLE) {
              errorMsg = 'Location unavailable. Please check GPS/network and try again.';
            } else if (error.code === error.TIMEOUT) {
              errorMsg = 'Location request timed out. Please try again or fill manually.';
            }
            logger.error('Geolocation error:', error.code, error.message);
            toast.error(errorMsg, { id: toastId });
          }
        },
        {
          enableHighAccuracy: highAccuracy,
          timeout: highAccuracy ? 10000 : 20000,
          maximumAge: highAccuracy ? 0 : 60000,
        },
      );
    };

    getPosition(true);
  };

  const handleSaveNewAddress = async (e) => {
    e.preventDefault();
    if (
      !newAddress.name ||
      !newAddress.phone ||
      !newAddress.address ||
      !newAddress.locality ||
      !newAddress.pincode ||
      !newAddress.city ||
      !newAddress.state
    ) {
      setAddressError(
        'Please fill in all mandatory address parameters (Name, Phone, Address, Locality, Pincode, City, State).',
      );
      return;
    }
    if (!/^\d{10}$/.test(newAddress.phone)) {
      setAddressError('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (newAddress.alternatePhone && !/^\d{10}$/.test(newAddress.alternatePhone)) {
      setAddressError('Please enter a valid 10-digit alternate mobile number.');
      return;
    }
    if (newAddress.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newAddress.email)) {
      setAddressError('Please enter a valid email address.');
      return;
    }
    if (!/^\d{6}$/.test(newAddress.pincode)) {
      setAddressError('Please enter a valid 6-digit pincode.');
      return;
    }
    const payload = {
      name: newAddress.name,
      phone: newAddress.phone,
      alternatePhone: newAddress.alternatePhone || undefined,
      email: newAddress.email || undefined,
      pincode: newAddress.pincode,
      locality: newAddress.locality,
      addressString: newAddress.address,
      landmark: newAddress.landmark || undefined,
      city: newAddress.city,
      state: newAddress.state,
      country: newAddress.country || 'India',
      tag: newAddress.tag || 'Home',
      deliveryInstructions: newAddress.deliveryInstructions || undefined,
      latitude: newAddress.latitude,
      longitude: newAddress.longitude,
    };
    try {
      setIsProcessing(true);
      let res;
      if (newAddress.id) {
        res = await userService.updateAddress(newAddress.id, payload);
      } else {
        res = await userService.addAddress(payload);
      }
      if (res.success && res.data) {
        setSavedAddresses(res.data);
        const newlyCreated = res.data[res.data.length - 1];
        setSelectedAddressId(newlyCreated._id || newlyCreated.id);
        setIsAddingNewAddress(false);
        setAddressError('');
        setActiveStep(2);
        toast.success('Delivery address saved successfully!');
      }
    } catch (err) {
      setAddressError(err.response?.data?.message || 'Failed to save address. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendCodOtp = async () => {
    const targetEmail = activeSelectedAddress?.email || user?.email;
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
    const targetEmail = activeSelectedAddress?.email || user?.email;
    if (!targetEmail) {
      toast.error('An email address is required for verification');
      return false;
    }
    const otpToVerify = typeof overrideOtp === 'string' ? overrideOtp : codOtpInput;
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

  // ─── Rental: calculate cost from backend ───
  const handleRentalCostCalculation = async (productId, startDate, endDate) => {
    if (!productId || !startDate || !endDate) return null;
    try {
      setIsCheckingAvailability(true);
      const [costRes, availRes] = await Promise.all([
        rentalService.calculateCost(productId, startDate, endDate),
        rentalService.checkAvailability(productId, startDate, endDate),
      ]);
      if (costRes.success) setRentalCostBreakdown(costRes.data);
      if (availRes.success) setRentalAvailability(availRes.data);
      return { cost: costRes.data, availability: availRes.data };
    } catch (err) {
      logger.error('Rental cost/availability check failed:', err);
      toast.error(err.response?.data?.message || 'Failed to check rental availability');
      return null;
    } finally {
      setIsCheckingAvailability(false);
    }
  };

  // ─── Shared: clear all session checkout state ───
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

  // ─── Build shared shipping address payload ───
  const buildShippingAddress = () => ({
    name: activeSelectedAddress.name,
    phone: activeSelectedAddress.phone,
    alternatePhone: activeSelectedAddress.alternatePhone || undefined,
    email: activeSelectedAddress.email || user?.email,
    pincode: activeSelectedAddress.pincode,
    locality: activeSelectedAddress.locality,
    address: activeSelectedAddress.addressString || activeSelectedAddress.address,
    landmark: activeSelectedAddress.landmark || '',
    city: activeSelectedAddress.city,
    state: activeSelectedAddress.state,
    country: activeSelectedAddress.country || 'India',
    type: (() => {
      const rawType = (
        activeSelectedAddress.tag ||
        activeSelectedAddress.type ||
        'home'
      ).toLowerCase();
      if (rawType === 'office') return 'work';
      if (rawType === 'home' || rawType === 'work' || rawType === 'other') return rawType;
      return 'other';
    })(),
    deliveryInstructions: activeSelectedAddress.deliveryInstructions || undefined,
  });

  // ═══════════════════════════════════════════════════════
  // RENTAL CHECKOUT — Completely separate from purchase flow
  // Uses: rentalService.createOrder → rentalService.verifyPayment
  // Creates: RentalOrder document (NOT Order)
  // ═══════════════════════════════════════════════════════
  const handleConfirmRentalOrder = async () => {
    if (isProcessing) return;

    if (!activeSelectedAddress) {
      toast.error('Please select a delivery address');
      setActiveStep(2);
      return;
    }

    if (!rentalStartDate || !rentalEndDate) {
      toast.error('Please select rental dates');
      setActiveStep(1);
      return;
    }

    if (!agreementAccepted) {
      toast.error('Please accept the rental agreement to proceed');
      return;
    }

    if (paymentOption === 'cod') {
      if (backendTotals.total < 500) {
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

    // Rental items can only be 1 product at a time for now (backend is single-product)
    // If multiple rental items exist, process the first one
    const rentalItem = activeItems.find((item) => item.type === 'rental');
    if (!rentalItem) {
      toast.error('No rental items found in checkout');
      return;
    }

    setIsProcessing(true);

    try {
      // 1. Create rental order via dedicated rental API
      const rentalPayload = {
        productId: rentalItem.id || rentalItem._id,
        rentalStartDate,
        rentalEndDate,
        shippingAddress: buildShippingAddress(),
        identityDocuments: identityDocuments.length > 0 ? identityDocuments : [],
        aadhaarNumber,
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
        navigate('/order-success', {
          state: { orderDetails: rentalOrder },
          replace: true,
        });
        return;
      }

      // 2. Load Razorpay SDK and open payment modal
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
            // 3. Verify payment via dedicated rental payment verification
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
        modal: {
          ondismiss: () => {
            setIsProcessing(false);
          },
        },
        prefill: {
          name: activeSelectedAddress.name,
          contact: activeSelectedAddress.phone,
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

  // ═══════════════════════════════════════════════════════
  // PURCHASE CHECKOUT — Original flow (unchanged)
  // Uses: orderService.create → orderService.verifyPayment
  // Creates: Order document
  // ═══════════════════════════════════════════════════════
  const handleConfirmPurchaseOrder = async () => {
    if (isProcessing) return;

    if (!activeSelectedAddress) {
      toast.error('Please select a delivery address');
      setActiveStep(1);
      return;
    }

    if (paymentOption === 'cod') {
      if (backendTotals.total < 500) {
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
      couponCode: appliedCoupon || undefined,
      paymentMethod: paymentOption === 'razorpay' ? 'razorpay' : 'cod',
      useWallet,
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
        (error) => {
          setIsProcessing(false);
        },
      );
    } else {
      // Handle COD
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

  // ─── Unified handler that delegates based on orderType ───
  const handleConfirmOrder = async () => {
    if (orderType === 'rental') {
      return handleConfirmRentalOrder();
    }
    return handleConfirmPurchaseOrder();
  };

  const activeSelectedAddress =
    savedAddresses.find((a) => String(a._id || a.id) === String(selectedAddressId)) ||
    savedAddresses[0];

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
    savedAddresses,
    setSavedAddresses,
    selectedAddressId,
    setSelectedAddressId,
    isAddingNewAddress,
    setIsAddingNewAddress,
    isDetectingLocation,
    newAddress,
    setNewAddress,
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
    codOtpInput,
    setCodOtpInput,
    codVerified,
    setCodVerified,
    isSendingOtp,
    paymentError,
    setPaymentError,
    addressError,
    setAddressError,
    couponInput,
    setCouponInput,
    appliedCoupon,
    setAppliedCoupon,
    couponValid,
    couponMessage,
    availableCoupons,
    loadingCoupons,
    backendTotals,
    isTotalsLoading,
    totalsError,
    useWallet,
    setUseWallet,
    fetchBackendTotals,
    handleApplyCoupon,
    handleRemoveCoupon,
    handleFetchCurrentLocation,
    handleSaveNewAddress,
    handleSendCodOtp,
    handleVerifyCodOtp,
    handleConfirmOrder,
    activeSelectedAddress,
    PINCODE_MAP,
    UPI_REGEX,
    hasRentalItems,
    rentalStartDate,
    setRentalStartDate,
    rentalEndDate,
    setRentalEndDate,
    orderType,
    checkoutSteps,
    hasCustomizableItems,
    customizationNotes,
    setCustomizationNotes,
    // Rental-specific
    rentalCostBreakdown,
    setRentalCostBreakdown,
    rentalAvailability,
    setRentalAvailability,
    identityDocuments,
    setIdentityDocuments,
    aadhaarNumber,
    setAadhaarNumber,
    agreementAccepted,
    setAgreementAccepted,
    isCheckingAvailability,
    handleRentalCostCalculation,
  };

  return <CheckoutContext.Provider value={value}>{children}</CheckoutContext.Provider>;
}
