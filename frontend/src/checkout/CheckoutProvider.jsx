import React, { useState, createContext, useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { useRazorpay } from "../hooks/useRazorpay";
import { orderService, cmsService, userService, couponService } from "../services/domainServices";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import logger from "../utils/logger";
import { PINCODE_MAP, UPI_REGEX } from "./checkoutConstants";
import { persistentStorage } from "../utils/persistentStorage";

const CheckoutContext = createContext(null);

const createIdempotencyKey = () => {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `checkout_${Date.now()}_${Math.random().toString(36).slice(2)}`;
};

export function useCheckout() {
  const ctx = useContext(CheckoutContext);
  if (!ctx) throw new Error("useCheckout must be used within CheckoutProvider");
  return ctx;
}

export function CheckoutProvider({ children }) {
  const { items, subtotal, clearCart, claimedCoupon, setClaimedCoupon } = useCart();
  const { user, isAuthenticated, openAuthModal } = useAuth();
  const { processPayment } = useRazorpay();
  const navigate = useNavigate();
  const location = useLocation();

  // Intercept direct unauthenticated access to checkout page
  React.useEffect(() => {
    if (!isAuthenticated) {
      navigate("/cart");
      setTimeout(() => {
        openAuthModal();
      }, 300);
    }
  }, [isAuthenticated, navigate, openAuthModal]);

  const { data: settingsData } = useQuery({
    queryKey: ["cms", "section", "storeSettings"],
    queryFn: async () => {
      const res = await cmsService.getSection("storeSettings");
      return res.success ? res.data : res;
    },
    staleTime: 10 * 60 * 1000,
  });
  const settings = settingsData || {};

  const [isProcessing, setIsProcessing] = useState(false);

  const orderCompleteRef = React.useRef(false);
  const totalsRequestRef = React.useRef(0);

  // Redirect to cart if empty - Bug Fix #4
  React.useEffect(() => {
    if (!items || items.length === 0) {
      if (!orderCompleteRef.current) {
        navigate("/cart", { replace: true });
      }
    }
  }, [items, navigate]);

  // Multi-step vertical accordion state tracking
  const getInitialStep = () => {
    return persistentStorage.getItem("siri_checkout_step", { session: true, fallback: 1 });
  };
  const [activeStep, setActiveStep] = useState(getInitialStep);

  React.useEffect(() => {
    persistentStorage.setItem("siri_checkout_step", activeStep, { session: true });
  }, [activeStep]);
  const activeItems = items || [];
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(() => {
    return persistentStorage.getItem("siri_checkout_selected_address_id", { session: true, fallback: null });
  });
  const [isAddingNewAddress, setIsAddingNewAddress] = useState(() => {
    return persistentStorage.getItem("siri_checkout_is_adding_address", { session: true, fallback: true });
  });

  React.useEffect(() => {
    if (selectedAddressId) {
      persistentStorage.setItem("siri_checkout_selected_address_id", selectedAddressId, { session: true });
    } else {
      persistentStorage.removeItem("siri_checkout_selected_address_id", { session: true });
    }
  }, [selectedAddressId]);

  React.useEffect(() => {
    persistentStorage.setItem("siri_checkout_is_adding_address", isAddingNewAddress, { session: true });
  }, [isAddingNewAddress]);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);

  // New Address Form State
  const [newAddress, setNewAddress] = useState(() => {
    return persistentStorage.getItem("siri_checkout_new_address", {
      session: true,
      fallback: {
        name: user?.name || "",
        phone: user?.phone || "",
        alternatePhone: "",
        email: user?.email || "",
        pincode: "",
        locality: "",
        address: "",
        landmark: "",
        city: "",
        state: "",
        country: "India",
        type: "Home",
        deliveryInstructions: "",
      }
    });
  });

  React.useEffect(() => {
    persistentStorage.setItem("siri_checkout_new_address", newAddress, { session: true });
  }, [newAddress]);

  React.useEffect(() => {
    if (user) {
      const timer = setTimeout(() => {
        setNewAddress(prev => ({
          ...prev,
          name: prev.name || user.name || "",
          phone: prev.phone || user.phone || "",
          email: prev.email || user.email || "",
        }));
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [user]);

  // Tracking notifications option
  const [sendUpdatesToWhatsApp, setSendUpdatesToWhatsApp] = useState(() => {
    return persistentStorage.getItem("siri_checkout_whatsapp_updates", { session: true, fallback: true });
  });
  const [paymentOption, setPaymentOption] = useState(() => {
    return persistentStorage.getItem("siri_checkout_payment_option", { session: true, fallback: "razorpay" });
  });
  const [needByDate, setNeedByDate] = useState(() => {
    return persistentStorage.getItem("siri_checkout_need_by_date", { session: true, fallback: "" });
  });

  React.useEffect(() => {
    persistentStorage.setItem("siri_checkout_whatsapp_updates", sendUpdatesToWhatsApp, { session: true });
  }, [sendUpdatesToWhatsApp]);

  React.useEffect(() => {
    persistentStorage.setItem("siri_checkout_payment_option", paymentOption, { session: true });
  }, [paymentOption]);

  React.useEffect(() => {
    persistentStorage.setItem("siri_checkout_need_by_date", needByDate, { session: true });
  }, [needByDate]);

  // specific inputs per payment method
  const [upiId, setUpiId] = useState("");
  const [upiVerified, setUpiVerified] = useState(false);
  const [cardDetails, setCardDetails] = useState({
    number: "",
    expiry: "",
    cvv: "",
    name: "",
  });
  const [selectedBank, setSelectedBank] = useState("HDFC");
  const [codConfirmed, setCodConfirmed] = useState(false);
  const [codOtpSent, setCodOtpSent] = useState(false);
  const [codOtpCode, setCodOtpCode] = useState("");
  const [codOtpInput, setCodOtpInput] = useState("");
  const [codVerified, setCodVerified] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [addressError, setAddressError] = useState("");

  // Coupon state
  const [couponInput, setCouponInput] = useState(() => {
    return persistentStorage.getItem("siri_checkout_coupon_input", { session: true, fallback: "" });
  });
  const [appliedCoupon, setAppliedCoupon] = useState(() => {
    return persistentStorage.getItem("siri_checkout_applied_coupon", { session: true, fallback: "" });
  });

  React.useEffect(() => {
    persistentStorage.setItem("siri_checkout_coupon_input", couponInput, { session: true });
  }, [couponInput]);

  React.useEffect(() => {
    persistentStorage.setItem("siri_checkout_applied_coupon", appliedCoupon, { session: true });
  }, [appliedCoupon]);
  const [couponValid, setCouponValid] = useState(false);
  const [couponMessage, setCouponMessage] = useState("");
  const [availableCoupons, setAvailableCoupons] = useState([]);
  const [loadingCoupons, setLoadingCoupons] = useState(false);
  const [backendTotals, setBackendTotals] = useState({
    subtotal: 0,
    discount: 0,
    shippingFee: 0,
    platformFee: 0,
    total: 0
  });
  const [useWallet, setUseWallet] = useState(() => {
    return persistentStorage.getItem("siri_checkout_use_wallet", { session: true, fallback: false });
  });

  React.useEffect(() => {
    persistentStorage.setItem("siri_checkout_use_wallet", useWallet, { session: true });
  }, [useWallet]);

  // Load addresses and active coupons from MongoDB on mount
  React.useEffect(() => {
    if (isAuthenticated) {
      userService.getAddresses().then((res) => {
        if (res.success && res.data) {
          setSavedAddresses(res.data);
          const savedAddrId = persistentStorage.getItem("siri_checkout_selected_address_id", { session: true });
          const savedIsAdding = persistentStorage.getItem("siri_checkout_is_adding_address", { session: true });

          if (savedAddrId && res.data.some(a => String(a._id || a.id) === String(savedAddrId))) {
            setSelectedAddressId(savedAddrId);
            setIsAddingNewAddress(savedIsAdding === true);
          } else {
            const defaultAddr = res.data.find(a => a.isDefault) || res.data[0];
            if (defaultAddr) {
              setSelectedAddressId(defaultAddr._id || defaultAddr.id);
              setIsAddingNewAddress(false);
            } else {
              setIsAddingNewAddress(true);
            }
          }
        }
      }).catch(err => {
        logger.error("Failed to load addresses:", err);
      });

      // Load active coupons
      const timer = setTimeout(() => {
        setLoadingCoupons(true);
      }, 0);
      couponService.getAll().then((res) => {
        if (res.success && res.data) {
          const list = res.data.data || res.data.items || (Array.isArray(res.data) ? res.data : []);
          const activeList = list.filter(c => {
            const isExpired = new Date() > new Date(c.expiryDate);
            return c.isActive && !isExpired && (!c.usageLimit || c.usedCount < c.usageLimit);
          });
          setAvailableCoupons(activeList);
        }
      }).catch(err => {
        logger.error("Failed to load active coupons:", err);
      }).finally(() => {
        setLoadingCoupons(false);
      });
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated]);

  // Bulletproof reactive coupon synchronization from Cart/Storefront
  React.useEffect(() => {
    if (isAuthenticated) {
      const couponCodeToApply = location.state?.couponCode || claimedCoupon;
      if (couponCodeToApply && couponCodeToApply !== appliedCoupon) {
        logger.info(`Auto-applying coupon: ${couponCodeToApply}`);
        setCouponInput(couponCodeToApply);
        setAppliedCoupon(couponCodeToApply);
        if (claimedCoupon) {
          setClaimedCoupon("");
        }
        toast.success(`Auto-applied coupon "${couponCodeToApply}"!`);
      }
    }
  }, [isAuthenticated, claimedCoupon, location.state, appliedCoupon]);

  // Securely calculate and validate order totals from backend
  async function fetchBackendTotals(couponToApply = "") {
    if (!activeItems || activeItems.length === 0) return;
    const requestId = totalsRequestRef.current + 1;
    totalsRequestRef.current = requestId;
    
    try {
      const itemsPayload = activeItems.map(item => ({
        productId: item.id || item._id,
        quantity: item.quantity
      }));

      const res = await orderService.validateTotals({
        items: itemsPayload,
        couponCode: couponToApply || undefined,
        paymentMethod: paymentOption,
        useWallet
      });

      if (res.success && res.data) {
        if (requestId !== totalsRequestRef.current) return;
        setBackendTotals(res.data);
        if (couponToApply) {
          setCouponValid(res.data.couponValid);
          setCouponMessage(res.data.couponMessage);
          if (res.data.couponValid) {
            setAppliedCoupon(couponToApply);
          } else {
            setAppliedCoupon("");
          }
        }
      }
    } catch (err) {
      logger.error("Failed to validate checkout totals:", err);
      toast.error(err.response?.data?.message || "Failed to validate order pricing details");
    }
  };

  React.useEffect(() => {
    fetchBackendTotals(appliedCoupon);
  }, [activeItems, appliedCoupon, paymentOption, useWallet]);

  const handleApplyCoupon = () => {
    if (!couponInput.trim()) {
      toast.error("Please enter a coupon code");
      return;
    }
    fetchBackendTotals(couponInput.trim());
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon("");
    setCouponInput("");
    setCouponMessage("");
    setCouponValid(false);
    fetchBackendTotals("");
  };

  const handleFetchCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    setIsDetectingLocation(true);
    const toastId = toast.loading("Accessing device GPS location...");

    const reverseGeocode = async (latitude, longitude) => {
      toast.loading("Resolving coordinates to address...", { id: toastId });

      // AbortController so the fetch doesn't hang forever
      const controller = new AbortController();
      const fetchTimeout = setTimeout(() => controller.abort(), 12000);

      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1&zoom=18`,
          {
            signal: controller.signal,
            headers: {
              "Accept": "application/json",
              "Accept-Language": "en",
              // Nominatim policy: must send a valid User-Agent and Referer
              "User-Agent": "SiriArtsAndCrafts/1.0 (checkout address autofill)",
            },
          }
        );
        clearTimeout(fetchTimeout);

        if (!res.ok) {
          throw new Error(`Geocoding API returned ${res.status}`);
        }

        const data = await res.json();

        if (data && data.address) {
          const addr = data.address;

          // Robustly extract pincode (Indian 6-digit postcode)
          const rawPincode = addr.postcode || "";
          const pincode = rawPincode.replace(/\D/g, "").slice(0, 6);

          // City: try multiple Indian address fields in order of specificity
          const city =
            addr.city ||
            addr.town ||
            addr.village ||
            addr.municipality ||
            addr.county ||
            addr.state_district ||
            "";

          const state = addr.state || "";
          const country = addr.country || "India";

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
              ? streetParts.join(", ")
              : data.display_name
                  ?.split(",")
                  .slice(0, 4)
                  .join(",")
                  .trim() || "";

          // Locality: area/suburb level
          const locality =
            addr.suburb ||
            addr.neighbourhood ||
            addr.subdistrict ||
            addr.locality ||
            addr.city_district ||
            city ||
            "";

          // Landmark: nearby notable place
          const landmark =
            addr.amenity ||
            addr.shop ||
            addr.office ||
            addr.tourism ||
            addr.leisure ||
            "";

          setNewAddress((prev) => ({
            ...prev,
            pincode,
            address: addressString,
            locality,
            landmark: landmark || prev.landmark || locality || city,
            city,
            state,
            country,
          }));

          toast.success("Address auto-filled from your location!", { id: toastId });
        } else {
          throw new Error("Geocoding API returned no address data for this coordinate");
        }
      } catch (err) {
        clearTimeout(fetchTimeout);
        if (err.name === "AbortError") {
          toast.error("Address lookup timed out. Please fill in manually.", { id: toastId });
        } else {
          logger.error("Reverse geocode failed:", err);
          toast.error("Could not resolve address. Check your connection or fill manually.", { id: toastId });
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
          if (highAccuracy && (error.code === error.TIMEOUT || error.code === error.POSITION_UNAVAILABLE)) {
            logger.warn("High accuracy GPS timed out. Retrying with standard accuracy...");
            toast.loading("Retrying with standard accuracy...", { id: toastId });
            getPosition(false);
          } else {
            setIsDetectingLocation(false);
            let errorMsg = "Failed to access your location. Please fill details manually.";
            if (error.code === error.PERMISSION_DENIED) {
              errorMsg = "Location permission denied. Please allow browser location access and try again.";
            } else if (error.code === error.POSITION_UNAVAILABLE) {
              errorMsg = "Location unavailable. Please check GPS/network and try again.";
            } else if (error.code === error.TIMEOUT) {
              errorMsg = "Location request timed out. Please try again or fill manually.";
            }
            logger.error("Geolocation error:", error.code, error.message);
            toast.error(errorMsg, { id: toastId });
          }
        },
        {
          enableHighAccuracy: highAccuracy,
          timeout: highAccuracy ? 10000 : 20000,
          maximumAge: highAccuracy ? 0 : 60000,
        }
      );
    };

    getPosition(true);
  };


  const handleSaveNewAddress = async (e) => {
    e.preventDefault();
    if (!newAddress.name || !newAddress.phone || !newAddress.email || !newAddress.address || !newAddress.landmark || !newAddress.pincode || !newAddress.city || !newAddress.state || !newAddress.country) {
      setAddressError("Please fill in all mandatory address parameters (Name, Phone, Email, Address, Pincode, Locality, Landmark, City, State, Country).");
      return;
    }
    if (!/^\d{10}$/.test(newAddress.phone)) {
      setAddressError("Please enter a valid 10-digit mobile number.");
      return;
    }
    if (newAddress.alternatePhone && !/^\d{10}$/.test(newAddress.alternatePhone)) {
      setAddressError("Please enter a valid 10-digit alternate mobile number.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newAddress.email)) {
      setAddressError("Please enter a valid email address.");
      return;
    }
    if (!/^\d{6}$/.test(newAddress.pincode)) {
      setAddressError("Please enter a valid 6-digit pincode.");
      return;
    }
    const payload = {
      name: newAddress.name,
      phone: newAddress.phone,
      alternatePhone: newAddress.alternatePhone || undefined,
      email: newAddress.email,
      pincode: newAddress.pincode,
      locality: newAddress.locality,
      addressString: newAddress.address,
      landmark: newAddress.landmark,
      city: newAddress.city,
      state: newAddress.state,
      country: newAddress.country,
      tag: newAddress.type,
      deliveryInstructions: newAddress.deliveryInstructions || undefined,
    };
    try {
      setIsProcessing(true);
      const res = await userService.addAddress(payload);
      if (res.success && res.data) {
        setSavedAddresses(res.data);
        const newlyCreated = res.data[res.data.length - 1];
        setSelectedAddressId(newlyCreated._id || newlyCreated.id);
        setIsAddingNewAddress(false);
        setAddressError("");
        setActiveStep(2);
        toast.success("Delivery address saved successfully!");
      }
    } catch (err) {
      setAddressError(err.response?.data?.message || "Failed to save address. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendCodOtp = async () => {
    const targetEmail = activeSelectedAddress?.email || user?.email;
    if (!targetEmail) {
      toast.error("An email address is required to receive verification OTP");
      return;
    }

    setIsSendingOtp(true);
    try {
      const res = await orderService.sendCodOtp(targetEmail);
      if (res.success) {
        setCodOtpSent(true);
        toast.success(`Verification OTP sent successfully to ${targetEmail}. Please check your inbox or spam folder.`);
      } else {
        toast.error(res.message || "Failed to send verification OTP");
      }
    } catch (err) {
      logger.error("Failed to send COD OTP:", err);
      toast.error(err.response?.data?.message || "Failed to send verification OTP. Please try again.");
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyCodOtp = async (overrideOtp) => {
    const targetEmail = activeSelectedAddress?.email || user?.email;
    if (!targetEmail) {
      toast.error("An email address is required for verification");
      return false;
    }
    const otpToVerify = typeof overrideOtp === "string" ? overrideOtp : codOtpInput;
    if (!otpToVerify.trim()) {
      toast.error("Please enter the verification code");
      return false;
    }

    setIsProcessing(true);
    try {
      const res = await orderService.verifyCodOtp(targetEmail, otpToVerify);
      if (res.success) {
        setCodVerified(true);
        toast.success("Email verified successfully! Secure Cash on Delivery activated.");
        return true;
      } else {
        toast.error(res.message || "Invalid verification code");
        return false;
      }
    } catch (err) {
      logger.error("Failed to verify COD OTP:", err);
      toast.error(err.response?.data?.message || "Invalid verification code. Please try again.");
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmOrder = async () => {
    if (isProcessing) return;

    if (!activeSelectedAddress) {
      toast.error("Please select a delivery address");
      setActiveStep(1);
      return;
    }

    if (paymentOption === "cod") {
      if (backendTotals.total < 500) {
        toast.error("Cash on Delivery (COD) is only serviceable for order totals between ₹500 and ₹50,000.");
        return;
      }
      if (!codConfirmed) {
        toast.error("Please confirm Cash on Delivery");
        return;
      }
      if (!codVerified) {
        toast.error("Please verify your mobile number with OTP to place a Cash on Delivery order.");
        return;
      }
    }

    setIsProcessing(true);

    const orderData = {
      items: activeItems.map((item) => ({
        productId: item.id || item._id,
        quantity: item.quantity,
        variant: item.variant || "Default",
      })),
      shippingAddress: {
        name: activeSelectedAddress.name,
        phone: activeSelectedAddress.phone,
        alternatePhone: activeSelectedAddress.alternatePhone || undefined,
        email: activeSelectedAddress.email || user?.email,
        pincode: activeSelectedAddress.pincode,
        locality: activeSelectedAddress.locality,
        address: activeSelectedAddress.addressString || activeSelectedAddress.address,
        landmark: activeSelectedAddress.landmark || "",
        city: activeSelectedAddress.city,
        state: activeSelectedAddress.state,
        country: activeSelectedAddress.country || "India",
        type: (() => {
          const rawType = (activeSelectedAddress.tag || activeSelectedAddress.type || "home").toLowerCase();
          if (rawType === "office") return "work";
          if (rawType === "home" || rawType === "work" || rawType === "other") return rawType;
          return "other";
        })(),
        deliveryInstructions: activeSelectedAddress.deliveryInstructions || undefined,
      },
      couponCode: appliedCoupon || undefined,
      paymentMethod: paymentOption === "razorpay" ? "razorpay" : "cod",
      useWallet,
      needByDate: needByDate || undefined,
      idempotencyKey: createIdempotencyKey(),
    };

    const clearCheckoutSessionStorage = () => {
      persistentStorage.removeItem("siri_checkout_step", { session: true });
      persistentStorage.removeItem("siri_checkout_new_address", { session: true });
      persistentStorage.removeItem("siri_checkout_payment_option", { session: true });
      persistentStorage.removeItem("siri_checkout_need_by_date", { session: true });
      persistentStorage.removeItem("siri_checkout_whatsapp_updates", { session: true });
      persistentStorage.removeItem("siri_checkout_use_wallet", { session: true });
      persistentStorage.removeItem("siri_checkout_selected_address_id", { session: true });
      persistentStorage.removeItem("siri_checkout_is_adding_address", { session: true });
      persistentStorage.removeItem("siri_checkout_coupon_input", { session: true });
      persistentStorage.removeItem("siri_checkout_applied_coupon", { session: true });
    };

    if (paymentOption === "razorpay") {
      processPayment(
        orderData,
        (order) => {
          orderCompleteRef.current = true;
          setIsProcessing(false);
          clearCart();
          clearCheckoutSessionStorage();
          navigate("/order-success", { state: { orderDetails: order }, replace: true });
        },
        (error) => {
          setIsProcessing(false);
        }
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
          clearCart();
          clearCheckoutSessionStorage();
          navigate("/order-success", { state: { orderDetails: orderObj }, replace: true });
        }
      } catch (err) {
        logger.error("Failed to place COD order:", err);
        toast.error(err.response?.data?.message || err.message || "Failed to place COD order");
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const activeSelectedAddress =
    savedAddresses.find((a) => String(a._id || a.id) === String(selectedAddressId)) || savedAddresses[0];


  const value = {
    items, subtotal, clearCart, claimedCoupon, setClaimedCoupon,
    user, isAuthenticated, openAuthModal, navigate, settings, isProcessing, setIsProcessing,
    orderCompleteRef, activeStep, setActiveStep, activeItems, savedAddresses, setSavedAddresses,
    selectedAddressId, setSelectedAddressId, isAddingNewAddress, setIsAddingNewAddress,
    isDetectingLocation, newAddress, setNewAddress, sendUpdatesToWhatsApp, setSendUpdatesToWhatsApp,
    paymentOption, setPaymentOption, needByDate, setNeedByDate, upiId, setUpiId, upiVerified, setUpiVerified,
    cardDetails, setCardDetails, selectedBank, setSelectedBank, codConfirmed, setCodConfirmed,
    codOtpSent, setCodOtpSent, codOtpCode, setCodOtpCode, codOtpInput, setCodOtpInput, codVerified, setCodVerified,
    isSendingOtp, paymentError, setPaymentError, addressError, setAddressError,
    couponInput, setCouponInput, appliedCoupon, setAppliedCoupon, couponValid, couponMessage,
    availableCoupons, loadingCoupons, backendTotals, useWallet, setUseWallet,
    fetchBackendTotals, handleApplyCoupon, handleRemoveCoupon, handleFetchCurrentLocation,
    handleSaveNewAddress, handleSendCodOtp, handleVerifyCodOtp, handleConfirmOrder,
    activeSelectedAddress, PINCODE_MAP, UPI_REGEX,
  };

  return <CheckoutContext.Provider value={value}>{children}</CheckoutContext.Provider>;
}
