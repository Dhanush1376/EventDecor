import React, { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "../context/CartContext";
import { SEO } from "../components/seo/SEO";
import { handleImageError } from "../utils/imageUtils";
import { MandalaArtDecor } from "../components/ui/MandalaArtDecor";

const PINCODE_MAP = {
  "110001": { city: "New Delhi", state: "Delhi" },
  "400001": { city: "Mumbai", state: "Maharashtra" },
  "560001": { city: "Bengaluru", state: "Karnataka" },
  "600001": { city: "Chennai", state: "Tamil Nadu" },
  "700001": { city: "Kolkata", state: "West Bengal" },
  "500001": { city: "Hyderabad", state: "Telangana" },
  "380001": { city: "Ahmedabad", state: "Gujarat" },
  "411001": { city: "Pune", state: "Maharashtra" },
  "302001": { city: "Jaipur", state: "Rajasthan" },
  "226001": { city: "Lucknow", state: "Uttar Pradesh" },
};

const UPI_REGEX = /^[a-zA-Z0-9._-]+@[a-zA-Z]{3,}$/;

import { useAuth } from "../context/AuthContext";
import { useRazorpay } from "../hooks/useRazorpay";
import { orderService, cmsService, userService, couponService } from "../services/domainServices";
import { useApi } from "../hooks/useApi";
import toast from "react-hot-toast";

export function Checkout() {
  const { items, subtotal, clearCart, claimedCoupon, setClaimedCoupon } = useCart();
  const { user, isAuthenticated, openAuthModal } = useAuth();
  const { processPayment } = useRazorpay();
  const navigate = useNavigate();

  // Intercept direct unauthenticated access to checkout page
  React.useEffect(() => {
    if (!isAuthenticated) {
      navigate("/cart");
      setTimeout(() => {
        openAuthModal();
      }, 300);
    }
  }, [isAuthenticated, navigate, openAuthModal]);

  const { data: settingsData } = useApi(cmsService.getSection, "storeSettings");
  const settings = settingsData?.data || {};

  const [isProcessing, setIsProcessing] = useState(false);

  // Redirect to cart if empty - Bug Fix #4
  React.useEffect(() => {
    if (!items || items.length === 0) {
      navigate("/cart");
    }
  }, [items, navigate]);

  // Multi-step vertical accordion state tracking
  const [activeStep, setActiveStep] = useState(1);
  const activeItems = items || [];
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [isAddingNewAddress, setIsAddingNewAddress] = useState(true);

  // New Address Form State
  const [newAddress, setNewAddress] = useState({
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
  });

  React.useEffect(() => {
    if (user) {
      const timer = setTimeout(() => {
        setNewAddress(prev => ({
          ...prev,
          name: user.name || prev.name,
          phone: user.phone || prev.phone,
          email: user.email || prev.email,
        }));
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [user]);

  // Tracking notifications option
  const [sendUpdatesToWhatsApp, setSendUpdatesToWhatsApp] = useState(true);
  const [paymentOption, setPaymentOption] = useState("razorpay"); // Default to Razorpay
  const [needByDate, setNeedByDate] = useState("");

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
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState("");
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
  const [useWallet, setUseWallet] = useState(false);

  // Load addresses and active coupons from MongoDB on mount
  React.useEffect(() => {
    if (isAuthenticated) {
      userService.getAddresses().then((res) => {
        if (res.success && res.data) {
          setSavedAddresses(res.data);
          const defaultAddr = res.data.find(a => a.isDefault) || res.data[0];
          if (defaultAddr) {
            setSelectedAddressId(defaultAddr._id || defaultAddr.id);
            setIsAddingNewAddress(false);
          } else {
            setIsAddingNewAddress(true);
          }
        }
      }).catch(err => {
        console.error("Failed to load addresses:", err);
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

          // Check if a coupon was claimed from the storefront promo banner
          const claimed = claimedCoupon;
          if (claimed) {
            setCouponInput(claimed);
            setClaimedCoupon("");
            fetchBackendTotals(claimed);
            toast.success(`🎟️ Auto-applied claimed coupon "${claimed}"!`);
          }
        }
      }).catch(err => {
        console.error("Failed to load active coupons:", err);
      }).finally(() => {
        setLoadingCoupons(false);
      });
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated]);

  // Securely calculate and validate order totals from backend
  async function fetchBackendTotals(couponToApply = "") {
    if (!activeItems || activeItems.length === 0) return;
    
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
      console.error("Failed to validate checkout totals:", err);
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
        toast.success(`🔐 Verification OTP sent successfully to ${targetEmail}! Please check your inbox or spam folder.`);
      } else {
        toast.error(res.message || "Failed to send verification OTP");
      }
    } catch (err) {
      console.error("Failed to send COD OTP:", err);
      toast.error(err.response?.data?.message || "Failed to send verification OTP. Please try again.");
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyCodOtp = async () => {
    const targetEmail = activeSelectedAddress?.email || user?.email;
    if (!targetEmail) {
      toast.error("An email address is required for verification");
      return;
    }
    if (!codOtpInput.trim()) {
      toast.error("Please enter the verification code");
      return;
    }

    setIsProcessing(true);
    try {
      const res = await orderService.verifyCodOtp(targetEmail, codOtpInput);
      if (res.success) {
        setCodVerified(true);
        toast.success("Email verified successfully! Secure Cash on Delivery activated.");
      } else {
        toast.error(res.message || "Invalid verification code");
      }
    } catch (err) {
      console.error("Failed to verify COD OTP:", err);
      toast.error(err.response?.data?.message || "Invalid verification code. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmOrder = async () => {
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
        title: item.title,
        price: item.price,
        quantity: item.quantity,
        variant: item.variant || "Default",
        imageSrc: item.imageSrc,
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
        type: (activeSelectedAddress.tag || activeSelectedAddress.type || "Home").toLowerCase(),
        deliveryInstructions: activeSelectedAddress.deliveryInstructions || undefined,
      },
      couponCode: appliedCoupon || undefined,
      paymentMethod: paymentOption === "razorpay" ? "razorpay" : "cod",
      useWallet,
      needByDate: needByDate || undefined,
      subtotal: backendTotals.subtotal,
      shippingFee: backendTotals.shippingFee,
      total: backendTotals.total,
    };

    if (paymentOption === "razorpay") {
      processPayment(
        orderData,
        (order) => {
          setIsProcessing(false);
          clearCart();
          navigate("/order-success", { state: { orderDetails: order } });
        },
        (error) => {
          setIsProcessing(false);
        }
      );
    } else {
      // Handle COD
      try {
        const response = await orderService.create(orderData);
        if (response && response.success) {
          const orderObj = response.data?.order || response.data || response;
          clearCart();
          navigate("/order-success", { state: { orderDetails: orderObj } });
        }
      } catch (err) {
        console.error("Failed to place COD order:", err);
        toast.error(err.response?.data?.message || err.message || "Failed to place COD order");
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const activeSelectedAddress =
    savedAddresses.find((a) => String(a._id || a.id) === String(selectedAddressId)) || savedAddresses[0];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="bg-surface-container-low min-h-screen pb-32 font-body text-on-surface"
    >
      <SEO
        title="Secure Checkout"
        description="Finalize your Siri Arts & Crafts order through our secure checkout portal."
      />

      <div className="max-w-max-width mx-auto px-4 sm:px-6 pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column Stack: Multi-step Vertical Accordion Flow */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-4">
            {/* Accordion Block 1: LOGIN (Pre-authenticated state) */}
            <motion.div
              layout
              className="bg-surface-bright border border-outline-variant/40 rounded-lg overflow-hidden shadow-xs"
            >
              <div className="p-4 bg-surface-bright flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-5 h-5 bg-surface-container-low text-secondary font-bold text-[10px] sm:text-xs rounded flex items-center justify-center">
                    1
                  </span>
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-secondary">
                    Login
                  </span>
                  <span className="material-symbols-outlined text-base text-green-700 font-bold">
                    check
                  </span>
                </div>
                {isAuthenticated && (
                  <button
                    onClick={() => navigate("/dashboard")}
                    className="text-[10px] sm:text-xs font-bold text-primary hover:underline cursor-pointer"
                  >
                    Change
                  </button>
                )}
              </div>
              <div className="px-12 py-3 text-[10px] sm:text-xs text-on-surface border-t border-surface-container-low">
                <span className="font-bold">{user?.name || "Guest User"}</span>{" "}
                <span className="text-secondary mx-2">{user?.phone || "Verification Pending"}</span>
              </div>
            </motion.div>

            {/* Accordion Block 2: DELIVERY ADDRESS */}
            <motion.div
              layout
              className="bg-surface-bright border border-outline-variant/40 rounded-lg overflow-hidden shadow-xs relative group"
            >
              <MandalaArtDecor
                variant={2}
                size={250}
                className="absolute -bottom-10 -right-10 opacity-[0.02] group-hover:opacity-[0.04] transition-opacity pointer-events-none"
              />

              {/* Accordion Header */}
              <motion.button
                whileTap={{
                  backgroundColor:
                    activeStep === 1
                      ? "var(--color-primary)"
                      : "var(--color-surface-container-low)",
                }}
                onClick={() => setActiveStep(1)}
                aria-expanded={activeStep === 1}
                className={`w-full p-4 flex items-center justify-between cursor-pointer transition-colors ${
                  activeStep === 1
                    ? "bg-primary text-surface"
                    : "bg-surface-bright text-on-surface hover:bg-surface-container-low"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-5 h-5 font-bold text-xs rounded flex items-center justify-center transition-colors ${
                      activeStep === 1
                        ? "bg-surface text-primary"
                        : "bg-surface-container-low text-secondary"
                    }`}
                  >
                    2
                  </span>
                  <span
                    className={`text-xs font-bold uppercase tracking-wider transition-colors ${activeStep === 1 ? "text-surface" : "text-secondary"}`}
                  >
                    Delivery Address
                  </span>
                  {activeStep > 1 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="material-symbols-outlined text-base text-green-700 font-bold"
                    >
                      check
                    </motion.span>
                  )}
                </div>

                {activeStep > 1 && (
                  <span className="text-xs font-bold text-primary hover:underline">
                    Change
                  </span>
                )}
              </motion.button>

              {/* Accordion Content with liquid layout motion */}
              <AnimatePresence mode="wait">
                {activeStep === 1 ? (
                  <motion.div
                    key="expanded-addr"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="p-4 sm:p-6 space-y-4 overflow-hidden relative"
                  >
                    <MandalaArtDecor
                      variant={1}
                      size={300}
                      className="-bottom-10 -left-10 opacity-[0.02]"
                    />

                    {/* Render Saved Address Selection Radio stack */}
                    <div className="space-y-3">
                      {savedAddresses.map((addr) => {
                        const addrId = addr._id || addr.id;
                        return (
                          <motion.label
                            layout
                            whileHover={{
                              scale: selectedAddressId === addrId ? 1 : 1.005,
                            }}
                            key={addrId}
                            className={`block p-4 rounded-lg border cursor-pointer transition-all relative ${
                              selectedAddressId === addrId
                                ? "bg-surface-bright border-primary ring-1 ring-primary"
                                : "bg-white border-outline-variant/50 hover:border-outline-variant"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <input
                                type="radio"
                                name="delivery-address-radio"
                                checked={selectedAddressId === addrId}
                                onChange={() => {
                                  setSelectedAddressId(addrId);
                                  setIsAddingNewAddress(false);
                                }}
                                className="mt-1 text-primary focus:ring-0 cursor-pointer transition-all"
                              />
                              <div className="flex-1 min-w-0 text-xs">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-bold text-on-surface text-[10px] sm:text-xs">
                                    {addr.name}
                                  </span>
                                  <span className="bg-surface-container-low text-secondary text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                                    {addr.type}
                                  </span>
                                  <span className="font-bold text-on-surface ml-2 text-[10px] sm:text-xs">
                                    {addr.phone}
                                  </span>
                                </div>
                                <p className="text-secondary leading-relaxed">
                                  {addr.address}, {addr.locality}, {addr.city},{" "}
                                  {addr.state} -{" "}
                                  <span className="font-bold text-on-surface">
                                    {addr.pincode}
                                  </span>
                                </p>

                                {/* Active CTA inside active radial item */}
                                <AnimatePresence>
                                  {selectedAddressId === addrId &&
                                    !isAddingNewAddress && (
                                      <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="mt-4 pt-3 border-t border-surface-container-low overflow-hidden"
                                      >
                                        <motion.button
                                          whileHover={{ scale: 1.02 }}
                                          whileTap={{ scale: 0.98 }}
                                          type="button"
                                          onClick={() => {
                                            if (!selectedAddressId) {
                                              toast.error("Please select a delivery address first.");
                                              return;
                                            }
                                            if (isAddingNewAddress) {
                                              toast.error("Please save your new address or click cancel to proceed.");
                                              return;
                                            }
                                            setActiveStep(2);
                                          }}
                                          className="bg-primary hover:bg-primary-hover text-surface font-bold text-xs uppercase tracking-wider px-6 py-2.5 rounded shadow-xs transition-colors cursor-pointer"
                                        >
                                          Deliver Here
                                        </motion.button>
                                      </motion.div>
                                    )}
                                </AnimatePresence>
                              </div>
                            </div>
                          </motion.label>
                        );
                      })}
                    </div>

                    {/* Add New Address Form Expansion toggle */}
                    <AnimatePresence mode="wait">
                      {!isAddingNewAddress ? (
                        <motion.button
                          key="btn-add-new"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          whileHover={{ scale: 1.005 }}
                          whileTap={{ scale: 0.995 }}
                          type="button"
                          onClick={() => setIsAddingNewAddress(true)}
                          className="w-full py-3 border border-dashed border-outline-variant text-primary font-bold text-xs uppercase tracking-wider rounded-lg hover:bg-surface-bright transition-colors text-left px-4 flex items-center gap-2 cursor-pointer block"
                        >
                          <span className="material-symbols-outlined text-base">
                            add
                          </span>
                          Add a new address
                        </motion.button>
                      ) : (
                        <motion.form
                          key="form-add-new"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.25 }}
                          onSubmit={handleSaveNewAddress}
                          className="mt-6 pt-4 border-t border-outline-variant/40 space-y-4 overflow-hidden block"
                        >
                          <span className="text-xs font-bold uppercase tracking-wider text-primary block mb-3">
                            Enter New Address Information
                          </span>
                          {addressError && (
                            <div className="p-3 bg-red-50 text-red-600 rounded text-[11px] font-semibold mb-4">
                              ⚠️ {addressError}
                            </div>
                          )}

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label
                                htmlFor="checkout-name"
                                className="block text-[10px] uppercase font-bold text-secondary mb-1"
                              >
                                Name
                              </label>
                              <input
                                id="checkout-name"
                                type="text"
                                required
                                autoComplete="name"
                                placeholder="Your full name"
                                value={newAddress.name}
                                onChange={(e) =>
                                  setNewAddress({
                                    ...newAddress,
                                    name: e.target.value,
                                  })
                                }
                                className="w-full bg-white border border-outline-variant rounded p-2 text-xs outline-none focus:border-primary transition-colors"
                              />
                            </div>
                            <div>
                              <label
                                htmlFor="checkout-phone"
                                className="block text-[10px] uppercase font-bold text-secondary mb-1"
                              >
                                10-digit Mobile Number
                              </label>
                              <input
                                id="checkout-phone"
                                type="tel"
                                required
                                autoComplete="tel"
                                placeholder="9876543210"
                                pattern="[0-9]{10}"
                                value={newAddress.phone}
                                onChange={(e) =>
                                  setNewAddress({
                                    ...newAddress,
                                    phone: e.target.value,
                                  })
                                }
                                className="w-full bg-white border border-outline-variant rounded p-2 text-xs outline-none focus:border-primary transition-colors"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label
                                htmlFor="checkout-alternate-phone"
                                className="block text-[10px] uppercase font-bold text-secondary mb-1"
                              >
                                Alternate Mobile Number (Optional)
                              </label>
                              <input
                                id="checkout-alternate-phone"
                                type="tel"
                                autoComplete="tel"
                                placeholder="Alternate mobile"
                                pattern="[0-9]{10}"
                                value={newAddress.alternatePhone}
                                onChange={(e) =>
                                  setNewAddress({
                                    ...newAddress,
                                    alternatePhone: e.target.value,
                                  })
                                }
                                className="w-full bg-white border border-outline-variant rounded p-2 text-xs outline-none focus:border-primary transition-colors"
                              />
                            </div>
                            <div>
                              <label
                                htmlFor="checkout-email"
                                className="block text-[10px] uppercase font-bold text-secondary mb-1"
                              >
                                Email Address *
                              </label>
                              <input
                                id="checkout-email"
                                type="email"
                                required
                                autoComplete="email"
                                placeholder="Email address"
                                value={newAddress.email}
                                onChange={(e) =>
                                  setNewAddress({
                                    ...newAddress,
                                    email: e.target.value,
                                  })
                                }
                                className="w-full bg-white border border-outline-variant rounded p-2 text-xs outline-none focus:border-primary transition-colors"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label
                                htmlFor="checkout-pincode"
                                className="block text-[10px] uppercase font-bold text-secondary mb-1"
                              >
                                Pincode
                              </label>
                              <input
                                id="checkout-pincode"
                                type="tel"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                required
                                autoComplete="postal-code"
                                placeholder="6-digit Pincode"
                                value={newAddress.pincode}
                                onChange={(e) => {
                                  const val = e.target.value
                                    .replace(/\D/g, "")
                                    .slice(0, 6);
                                  const updated = {
                                    ...newAddress,
                                    pincode: val,
                                  };
                                  // Auto-fill logic
                                  if (val.length === 6) {
                                    if (PINCODE_MAP[val]) {
                                      updated.city = PINCODE_MAP[val].city;
                                      updated.state = PINCODE_MAP[val].state;
                                    } else {
                                      // Real API Lookup with a 3-second timeout safeguard
                                      const controller = new AbortController();
                                      const timeoutId = setTimeout(() => controller.abort(), 3000);
                                      
                                      fetch(
                                        `https://api.postalpincode.in/pincode/${val}`,
                                        { signal: controller.signal }
                                      )
                                        .then((res) => res.json())
                                        .then((data) => {
                                          clearTimeout(timeoutId);
                                          if (
                                            data &&
                                            data[0] &&
                                            data[0].Status === "Success" &&
                                            data[0].PostOffice
                                          ) {
                                            const po = data[0].PostOffice[0];
                                            setNewAddress((prev) => ({
                                              ...prev,
                                              city: po.District,
                                              state: po.State,
                                            }));
                                          }
                                        })
                                        .catch((err) => {
                                          clearTimeout(timeoutId);
                                          console.warn(
                                            "Pincode API Safeguard Triggered (Using manual entry fallback):",
                                            err
                                          );
                                        });
                                    }
                                  }
                                  setNewAddress(updated);
                                }}
                                className="w-full bg-white border border-outline-variant rounded p-2 text-xs outline-none focus:border-primary transition-colors"
                              />
                            </div>
                            <div>
                              <label
                                htmlFor="checkout-locality"
                                className="block text-[10px] uppercase font-bold text-secondary mb-1"
                              >
                                Locality / Town
                              </label>
                              <input
                                id="checkout-locality"
                                type="text"
                                required
                                autoComplete="address-level3"
                                placeholder="Locality"
                                value={newAddress.locality}
                                onChange={(e) =>
                                  setNewAddress({
                                    ...newAddress,
                                    locality: e.target.value,
                                  })
                                }
                                className="w-full bg-white border border-outline-variant rounded p-2 text-xs outline-none focus:border-primary transition-colors"
                              />
                            </div>
                          </div>

                          <div>
                            <label
                              htmlFor="checkout-address"
                              className="block text-[10px] uppercase font-bold text-secondary mb-1"
                            >
                              Address (Area and Street) *
                            </label>
                            <textarea
                              id="checkout-address"
                              rows="2"
                              required
                              autoComplete="street-address"
                              placeholder="House No, Building, Street, Area"
                              value={newAddress.address}
                              onChange={(e) =>
                                setNewAddress({
                                  ...newAddress,
                                  address: e.target.value,
                                })
                              }
                              className="w-full bg-white border border-outline-variant rounded p-2 text-xs outline-none focus:border-primary transition-colors"
                            />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label
                                htmlFor="checkout-landmark"
                                className="block text-[10px] uppercase font-bold text-secondary mb-1"
                              >
                                Landmark *
                              </label>
                              <input
                                id="checkout-landmark"
                                type="text"
                                required
                                autoComplete="address-line2"
                                placeholder="E.g., near Appollo hospital"
                                value={newAddress.landmark}
                                onChange={(e) =>
                                  setNewAddress({
                                    ...newAddress,
                                    landmark: e.target.value,
                                  })
                                }
                                className="w-full bg-white border border-outline-variant rounded p-2 text-xs outline-none focus:border-primary transition-colors"
                              />
                            </div>
                            <div>
                              <label
                                htmlFor="checkout-country"
                                className="block text-[10px] uppercase font-bold text-secondary mb-1"
                              >
                                Country *
                              </label>
                              <input
                                id="checkout-country"
                                type="text"
                                required
                                autoComplete="country-name"
                                placeholder="Country name"
                                value={newAddress.country}
                                onChange={(e) =>
                                  setNewAddress({
                                    ...newAddress,
                                    country: e.target.value,
                                  })
                                }
                                className="w-full bg-white border border-outline-variant rounded p-2 text-xs outline-none focus:border-primary transition-colors"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label
                                htmlFor="checkout-city"
                                className="block text-[10px] uppercase font-bold text-secondary mb-1"
                              >
                                City / District
                              </label>
                              <input
                                id="checkout-city"
                                type="text"
                                required
                                autoComplete="address-level2"
                                placeholder="City"
                                value={newAddress.city}
                                onChange={(e) =>
                                  setNewAddress({
                                    ...newAddress,
                                    city: e.target.value,
                                  })
                                }
                                className="w-full bg-white border border-outline-variant rounded p-2 text-xs outline-none focus:border-primary transition-colors"
                              />
                            </div>
                            <div>
                              <label
                                htmlFor="checkout-state"
                                className="block text-[10px] uppercase font-bold text-secondary mb-1"
                              >
                                State
                              </label>
                              <input
                                id="checkout-state"
                                type="text"
                                required
                                autoComplete="address-level1"
                                placeholder="State"
                                value={newAddress.state}
                                onChange={(e) =>
                                  setNewAddress({
                                    ...newAddress,
                                    state: e.target.value,
                                  })
                                }
                                className="w-full bg-white border border-outline-variant rounded p-2 text-xs outline-none focus:border-primary transition-colors"
                              />
                            </div>
                          </div>

                          <div>
                            <label
                              htmlFor="checkout-instructions"
                              className="block text-[10px] uppercase font-bold text-secondary mb-1"
                            >
                              Delivery Instructions / Gate Codes (Optional)
                            </label>
                            <textarea
                              id="checkout-instructions"
                              rows="1"
                              placeholder="E.g. drop at security desk, call before coming"
                              value={newAddress.deliveryInstructions}
                              onChange={(e) =>
                                setNewAddress({
                                  ...newAddress,
                                  deliveryInstructions: e.target.value,
                                })
                              }
                              className="w-full bg-white border border-outline-variant rounded p-2 text-xs outline-none focus:border-primary transition-colors"
                            />
                          </div>

                          {/* Address Type configuration selectors */}
                          <div>
                            <label className="block text-[10px] uppercase font-bold text-secondary mb-1">
                              Address Type *
                            </label>
                            <div className="flex items-center gap-4 mt-1">
                              <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
                                <input
                                  type="radio"
                                  name="addr-type-tag"
                                  checked={newAddress.type === "Home"}
                                  onChange={() =>
                                    setNewAddress({
                                      ...newAddress,
                                      type: "Home",
                                    })
                                  }
                                  className="text-primary focus:ring-0 cursor-pointer transition-all"
                                />
                                <span>Home (All day delivery)</span>
                              </label>
                              <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
                                <input
                                  type="radio"
                                  name="addr-type-tag"
                                  checked={newAddress.type === "Work"}
                                  onChange={() =>
                                    setNewAddress({
                                      ...newAddress,
                                      type: "Work",
                                    })
                                  }
                                  className="text-primary focus:ring-0 cursor-pointer transition-all"
                                />
                                <span>
                                  Work (Delivery between 10 AM - 5 PM)
                                </span>
                              </label>
                            </div>
                          </div>

                          <div className="flex gap-3 pt-3">
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              type="submit"
                              className="bg-primary hover:bg-primary-hover text-surface font-bold text-xs uppercase tracking-wider px-6 py-2.5 rounded shadow-xs transition-colors cursor-pointer"
                            >
                              Save and Deliver Here
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              type="button"
                              onClick={() => setIsAddingNewAddress(false)}
                              className="text-[#685c57] font-bold text-xs uppercase tracking-wider px-4 py-2.5 hover:underline cursor-pointer"
                            >
                              Cancel
                            </motion.button>
                          </div>
                        </motion.form>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ) : (
                  /* Completed summary banner snippet */
                  <motion.div
                    key="collapsed-addr"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="px-12 py-3 text-xs text-[#1a1c1a] border-t border-[#f4f3f1] flex justify-between items-center"
                  >
                    <div className="line-clamp-1">
                      <span className="font-bold">
                        {activeSelectedAddress.name}
                      </span>{" "}
                      — {activeSelectedAddress.address},{" "}
                      {activeSelectedAddress.locality},{" "}
                      {activeSelectedAddress.city} -{" "}
                      <span className="font-bold">
                        {activeSelectedAddress.pincode}
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Accordion Block 3: ORDER SUMMARY */}
            <motion.div
              layout
              className="bg-white border border-[#d0c5af]/40 rounded-lg overflow-hidden shadow-xs relative group"
            >
              <MandalaArtDecor
                variant={1}
                size={300}
                className="absolute -top-10 -left-10 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity pointer-events-none"
              />

              {/* Header */}
              <motion.button
                whileTap={{
                  backgroundColor:
                    activeStep === 2
                      ? "var(--color-primary)"
                      : "var(--color-surface-container-low)",
                }}
                onClick={() => {
                  if (activeStep > 1) {
                    if (!activeSelectedAddress) {
                      toast.error("Please configure and select a delivery address first.");
                      return;
                    }
                    if (isAddingNewAddress) {
                      toast.error("Please save your new address or click cancel to proceed.");
                      return;
                    }
                    setActiveStep(2);
                  }
                }}
                aria-expanded={activeStep === 2}
                className={`w-full p-4 flex items-center justify-between cursor-pointer transition-colors ${
                  activeStep === 2
                    ? "bg-primary text-surface"
                    : "bg-surface-bright text-on-surface hover:bg-surface-container-low"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-5 h-5 font-bold text-xs rounded flex items-center justify-center transition-colors ${
                      activeStep === 2
                        ? "bg-surface text-primary"
                        : "bg-surface-container-low text-secondary"
                    }`}
                  >
                    3
                  </span>
                  <span
                    className={`text-xs font-bold uppercase tracking-wider transition-colors ${activeStep === 2 ? "text-surface" : "text-secondary"}`}
                  >
                    Order Summary
                  </span>
                  {activeStep > 2 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="material-symbols-outlined text-base text-green-700 font-bold"
                    >
                      check
                    </motion.span>
                  )}
                </div>

                {activeStep > 2 && (
                  <span className="text-xs font-bold text-[#735c00] hover:underline">
                    Change
                  </span>
                )}
              </motion.button>

              {/* Body */}
              <AnimatePresence mode="wait">
                {activeStep === 2 ? (
                  <motion.div
                    key="expanded-summary"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="p-4 sm:p-6 space-y-4 border-t border-[#f4f3f1] overflow-hidden relative"
                  >


                    {/* Line Items List */}
                    <div className="space-y-4 divide-y divide-[#f4f3f1]">
                      {activeItems.map((item) => (
                        <div
                          key={`summary-item-${item.id}`}
                          className="pt-4 first:pt-0 flex gap-4"
                        >
                          <img
                            onError={handleImageError}
                            src={item.imageSrc}
                            alt=""
                            className="w-16 h-20 bg-[#f4f3f1] rounded object-cover flex-shrink-0"
                            loading="lazy"
                            width={64}
                            height={80}
                          />

                          <div className="flex-1 min-w-0 text-xs">
                            <h4 className="font-bold text-[#1a1c1a] line-clamp-1">
                              {item.title}
                            </h4>
                            <span className="text-[11px] text-[#685c57] block mt-0.5">
                              Seller: {item.seller || "Assured Craft Teams"}
                            </span>

                            <div className="flex items-baseline gap-2 mt-2">
                              <span className="font-bold text-sm text-[#1a1c1a]">
                                ₹{item.price.toLocaleString()}
                              </span>
                              {item.oldPrice > item.price && (
                                <span className="text-[11px] text-[#685c57] line-through">
                                  ₹{item.oldPrice.toLocaleString()}
                                </span>
                              )}
                              <span className="text-[10px] text-green-700 font-bold">
                                2 Offer Applied
                              </span>
                            </div>

                            <div className="mt-1 text-[11px] text-[#685c57]">
                              Quantity setup allocation:{" "}
                              <strong className="text-[#1a1c1a]">
                                {item.quantity}
                              </strong>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Order Tracking notification trigger checkbox */}
                    <div className="pt-4 border-t border-[#f4f3f1] flex flex-col gap-4">
                      <label className="flex items-start gap-2.5 text-xs select-none cursor-pointer">
                        <input
                          type="checkbox"
                          checked={sendUpdatesToWhatsApp}
                          onChange={(e) =>
                            setSendUpdatesToWhatsApp(e.target.checked)
                          }
                          className="mt-0.5 rounded text-[#735c00] focus:ring-0 cursor-pointer transition-all"
                        />
                        <span className="text-secondary leading-normal">
                          Send dispatch alerts and scaper live credentials to
                          WhatsApp
                        </span>
                      </label>

                      <motion.button
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        type="button"
                        onClick={() => setActiveStep(3)}
                        className="w-full bg-[#fb641b] hover:bg-[#f2550a] text-white font-bold text-xs uppercase tracking-wider py-3.5 rounded shadow-xs transition-colors cursor-pointer text-center block"
                      >
                        Continue
                      </motion.button>
                    </div>
                  </motion.div>
                ) : (
                  /* Completed state snippet */
                  <motion.div
                    key="collapsed-summary"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="px-12 py-3 text-xs text-[#1a1c1a] border-t border-[#f4f3f1]"
                  >
                    <span>
                      {activeItems.length} handcrafted master decor selections
                      configured.
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Accordion Block 4: PAYMENT OPTIONS */}
            <motion.div
              layout
              className="bg-white border border-[#d0c5af]/40 rounded-lg overflow-hidden shadow-xs relative group"
            >
              <MandalaArtDecor
                variant={1}
                size={300}
                className="absolute -bottom-10 -right-10 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity pointer-events-none"
              />

              {/* Header */}
              <motion.button
                whileTap={{
                  backgroundColor:
                    activeStep === 3
                      ? "var(--color-primary)"
                      : "var(--color-surface-container-low)",
                }}
                onClick={() => {
                  if (activeStep > 2) {
                    if (!activeSelectedAddress) {
                      toast.error("Please configure and select a delivery address first.");
                      return;
                    }
                    if (isAddingNewAddress) {
                      toast.error("Please save your new address or click cancel to proceed.");
                      return;
                    }
                    setActiveStep(3);
                  }
                }}
                aria-expanded={activeStep === 3}
                className={`w-full p-4 flex items-center justify-between cursor-pointer transition-colors ${
                  activeStep === 3
                    ? "bg-primary text-surface"
                    : "bg-surface-bright text-on-surface hover:bg-surface-container-low"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-5 h-5 font-bold text-xs rounded flex items-center justify-center transition-colors ${
                      activeStep === 3
                        ? "bg-surface text-primary"
                        : "bg-surface-container-low text-secondary"
                    }`}
                  >
                    4
                  </span>
                  <span
                    className={`text-xs font-bold uppercase tracking-wider transition-colors ${activeStep === 3 ? "text-surface" : "text-secondary"}`}
                  >
                    Payment Options
                  </span>
                </div>
              </motion.button>

              {/* Body */}
              <AnimatePresence>
                {activeStep === 3 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="p-4 sm:p-6 space-y-4 border-t border-[#f4f3f1] overflow-hidden"
                  >
                    {/* Payment selection list */}
                    <div className="space-y-4">
                      {/* Option: Razorpay (Secure Online Payment) */}
                      <motion.div
                        layout
                        className={`border rounded-lg p-3 sm:p-4 transition-all ${
                          paymentOption === "razorpay"
                            ? "bg-primary/5 border-primary shadow-sm"
                            : "border-outline-variant/40"
                        }`}
                      >
                        <label className="flex items-start gap-4 cursor-pointer select-none">
                          <input
                            type="radio"
                            name="payment-option-radio"
                            checked={paymentOption === "razorpay"}
                            onChange={() => setPaymentOption("razorpay")}
                            className="mt-1 text-primary focus:ring-0 cursor-pointer transition-all"
                          />
                          <div className="flex-1">
                            <span className="text-sm font-bold text-on-surface flex items-center gap-2">
                              Secure Online Payment (Razorpay)
                              <span className="bg-green-100 text-green-700 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Recommended</span>
                            </span>
                            <p className="text-[11px] text-on-surface-variant/60 mt-1">
                              Pay securely using UPI, Credit/Debit Card, or Netbanking via Razorpay.
                            </p>
                          </div>
                        </label>
                      </motion.div>

                      {/* Option: Cash on Delivery */}
                      <motion.div
                        layout
                        className={`border rounded-lg p-3 sm:p-4 transition-all ${
                          paymentOption === "cod"
                            ? "bg-primary/5 border-primary shadow-sm"
                            : "border-outline-variant/40"
                        }`}
                      >
                        <label className={`flex items-start gap-4 select-none ${backendTotals.total > 50000 ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}>
                          <input
                            type="radio"
                            name="payment-option-radio"
                            checked={paymentOption === "cod"}
                            disabled={backendTotals.total > 50000}
                            onChange={() => setPaymentOption("cod")}
                            className={`mt-1 text-primary focus:ring-0 transition-all ${backendTotals.total > 50000 ? "cursor-not-allowed" : "cursor-pointer"}`}
                          />
                          <div className="flex-1">
                            <span className="text-sm font-bold text-on-surface">Cash on Delivery (COD)</span>
                            {backendTotals.total > 50000 ? (
                              <p className="text-[10px] text-error font-bold mt-1 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[12px]">info</span>
                                COD unavailable for orders above ₹50,000
                              </p>
                            ) : (
                              <p className="text-[11px] text-on-surface-variant/60 mt-1">
                                Pay with cash or UPI when your item arrives.
                              </p>
                            )}
                          </div>
                        </label>

                        <AnimatePresence>
                          {paymentOption === "cod" && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className="mt-3 pl-8 pt-3 border-t border-outline-variant/30 space-y-3 overflow-hidden text-xs"
                            >
                              {/* Order Limit Check */}
                              {backendTotals.total < 500 ? (
                                <div className="p-2.5 bg-amber-50 text-amber-800 rounded-lg font-semibold text-[10px] uppercase tracking-wider flex items-center gap-1.5 border border-amber-200">
                                  <span className="material-symbols-outlined text-[13px]">warning</span>
                                  <span>COD requires minimum order of ₹500. Please choose secure online payment.</span>
                                </div>
                              ) : (
                                <>
                                  {/* Pincode eligibility check */}
                                  <div className="flex items-center gap-2 text-[10px] text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-lg font-bold uppercase tracking-wider">
                                    <span className="material-symbols-outlined text-xs">local_shipping</span>
                                    <span>COD Serviceable by Delhivery at {activeSelectedAddress?.pincode || "Your Pincode"}</span>
                                  </div>

                                  <label className="flex items-center gap-3 cursor-pointer select-none">
                                    <input
                                      type="checkbox"
                                      checked={codConfirmed}
                                      onChange={(e) => {
                                        const isChecked = e.target.checked;
                                        setCodConfirmed(isChecked);
                                        if (isChecked && !codOtpSent && !codVerified) {
                                          handleSendCodOtp();
                                        }
                                      }}
                                      className="rounded text-primary focus:ring-0 cursor-pointer"
                                    />
                                    <span className="text-[11px] text-on-surface-variant font-medium">
                                      I confirm this is a real order request.
                                    </span>
                                  </label>

                                  {/* OTP Section */}
                                  <div className="mt-2.5 bg-surface-container-low p-3 rounded-lg border border-outline-variant/20">
                                    <div className="flex items-center justify-between gap-2 mb-2">
                                      <span className="text-[10px] font-bold uppercase tracking-widest text-secondary flex items-center gap-1">
                                        <span className="material-symbols-outlined text-xs">lock</span>
                                        Security OTP Verification
                                      </span>
                                      {codVerified && (
                                        <span className="text-[9px] font-bold uppercase tracking-widest text-green-700 bg-green-50 px-2 py-0.5 rounded-full flex items-center gap-0.5 border border-green-200">
                                          <span className="material-symbols-outlined text-[10px] font-bold">check</span>
                                          Verified
                                        </span>
                                      )}
                                    </div>

                                    {!codVerified ? (
                                      <div className="space-y-2">
                                        {!codOtpSent ? (
                                          <button
                                            type="button"
                                            onClick={handleSendCodOtp}
                                            disabled={isSendingOtp}
                                            className="w-full bg-primary/5 hover:bg-primary/10 border border-primary/20 text-primary font-bold text-[9px] uppercase tracking-widest py-2 rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-2xs"
                                          >
                                            {isSendingOtp ? (
                                              <>
                                                <div className="w-3 h-3 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                                                <span>Sending Code...</span>
                                              </>
                                            ) : (
                                              <>
                                                <span className="material-symbols-outlined text-xs">mail</span>
                                                <span>Send Verification OTP to {activeSelectedAddress?.email || user?.email || "Email"}</span>
                                              </>
                                            )}
                                          </button>
                                        ) : (
                                          <div className="space-y-2">
                                            <p className="text-[10px] text-secondary leading-normal">
                                              We sent a 4-digit code to <strong className="text-on-surface">{activeSelectedAddress?.email || user?.email}</strong>. Enter it below:
                                            </p>
                                            <div className="flex gap-2 items-stretch">
                                              <input
                                                type="text"
                                                maxLength={4}
                                                placeholder="Enter OTP"
                                                value={codOtpInput}
                                                onChange={(e) => setCodOtpInput(e.target.value.replace(/\D/g, ""))}
                                                className="flex-1 h-9 bg-white border border-outline-variant rounded px-3 text-xs outline-none focus:border-primary transition-colors text-center font-mono font-bold tracking-widest"
                                              />
                                              <button
                                                type="button"
                                                onClick={handleVerifyCodOtp}
                                                className="h-9 bg-primary text-white font-bold text-[9px] uppercase tracking-widest px-4 rounded cursor-pointer hover:brightness-110 shadow-xs flex items-center justify-center transition-all"
                                              >
                                                Verify
                                              </button>
                                              <button
                                                type="button"
                                                onClick={handleSendCodOtp}
                                                className="h-9 bg-gray-100 text-gray-600 font-bold text-[9px] uppercase tracking-widest px-3 rounded cursor-pointer hover:bg-gray-200 flex items-center justify-center transition-all"
                                              >
                                                Resend
                                              </button>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <p className="text-[10px] text-green-700 font-semibold flex items-center gap-1">
                                        <span className="material-symbols-outlined text-xs">verified</span>
                                        OTP Verification completed! Ready to confirm your cash delivery.
                                      </p>
                                    )}
                                  </div>
                                </>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    </div>

                    {paymentError && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="p-3 bg-red-50 text-red-600 rounded text-xs font-semibold"
                      >
                        ⚠️ {paymentError}
                      </motion.div>
                    )}

                    {/* Need By Date Selector */}
                    <div className="bg-surface-container-low p-4 rounded-lg border border-outline-variant/20 mb-4 text-xs">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="material-symbols-outlined text-[#735c00] text-sm">calendar_today</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#735c00]">
                          Required Timeline Request
                        </span>
                      </div>
                      <label htmlFor="need-by-date-input" className="block text-[11px] text-secondary leading-normal mb-2">
                        By when do you need this product? We recommend setting a date at least 5-7 days from today to ensure handcrafted perfection and smooth shipping delivery.
                      </label>
                      <input
                        id="need-by-date-input"
                        type="date"
                        min={new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]} // minimum tomorrow
                        value={needByDate}
                        onChange={(e) => setNeedByDate(e.target.value)}
                        className="w-full bg-white border border-outline-variant rounded p-2.5 text-xs outline-none focus:border-primary transition-colors font-sans text-on-surface"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>

          {/* Right Column: PRICE DETAILS & promo code side card */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="lg:col-span-5 xl:col-span-4 space-y-4"
          >
            {/* Wallet Balance Card */}
            {user && (user.walletBalance > 0 || (backendTotals && backendTotals.walletBalance > 0)) && (
              <div className="bg-surface-bright border border-outline-variant/40 rounded-lg p-4 shadow-xs relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="checkout-use-wallet-checkbox"
                      checked={useWallet}
                      onChange={(e) => setUseWallet(e.target.checked)}
                      className="mt-1 rounded text-[#735c00] focus:ring-0 cursor-pointer h-4 w-4"
                    />
                    <label htmlFor="checkout-use-wallet-checkbox" className="cursor-pointer select-none">
                      <span className="text-xs font-bold text-on-surface block uppercase tracking-wider">
                        Use Siri Pay Wallet
                      </span>
                      <span className="text-[10px] text-secondary font-light">
                        Available Balance: <strong className="text-on-surface font-semibold">₹{((backendTotals && backendTotals.walletBalance) !== undefined ? backendTotals.walletBalance : user.walletBalance).toLocaleString('en-IN')}</strong>
                      </span>
                    </label>
                  </div>
                  <span className="material-symbols-outlined text-[#735c00] text-sm animate-pulse">stars</span>
                </div>

                {useWallet && backendTotals && backendTotals.walletDeduction > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="mt-3 pt-3 border-t border-[#f4f3f1] text-[11px] text-green-700 font-bold flex justify-between"
                  >
                    <span>Wallet Deducted:</span>
                    <span>− ₹{backendTotals.walletDeduction.toLocaleString('en-IN')}</span>
                  </motion.div>
                )}
              </div>
            )}

            {/* Promo Coupon Card */}
            <div className="bg-surface-bright border border-outline-variant/40 rounded-lg p-4 shadow-xs relative">
              <h4 className="text-xs font-bold text-secondary uppercase tracking-wider pb-2 border-b border-outline-variant/40 mb-3 flex items-center justify-between">
                <span>Apply Promo Coupon</span>
                <span className="material-symbols-outlined text-[15px] text-primary">sell</span>
              </h4>
              
              {!appliedCoupon || !couponValid ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="COUPON CODE"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    className="flex-1 bg-white border border-outline-variant rounded px-3 py-1.5 text-xs outline-none uppercase font-bold focus:border-primary transition-colors"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    className="bg-primary hover:bg-primary-dark text-white font-bold text-[10px] sm:text-xs uppercase tracking-wider px-4 py-1.5 rounded transition-colors cursor-pointer"
                  >
                    Apply
                  </button>
                </div>
              ) : (
                <div className="p-3 bg-green-50/70 border border-green-200/50 rounded-lg flex items-center justify-between text-xs text-green-800">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-green-700">check_circle</span>
                    <span>Applied <strong className="font-mono text-green-950 font-bold">{appliedCoupon}</strong> successfully!</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="text-red-600 font-extrabold hover:text-red-800 transition-colors uppercase text-[9px] tracking-wider cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              )}

              {couponMessage && (!appliedCoupon || !couponValid) && (
                <div className={`mt-2 text-[11px] font-semibold ${couponValid ? 'text-green-700' : 'text-red-600'}`}>
                  {couponValid ? '✓' : '⚠️'} {couponMessage}
                </div>
              )}

              {/* Dynamic Available Store Coupons List */}
              {availableCoupons.length > 0 && (
                <div className="mt-4 pt-3 border-t border-outline-variant/35 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-secondary/70 block flex items-center gap-1">
                    <span className="material-symbols-outlined text-[11px]">local_activity</span>
                    Available Offers ({availableCoupons.length})
                  </span>
                  
                  <div className="max-h-[160px] overflow-y-auto space-y-2 pr-1 no-scrollbar">
                    {availableCoupons.map((c) => {
                      const isCurrent = appliedCoupon === c.code;
                      return (
                        <div
                          key={c._id || c.id}
                          className={`p-2.5 rounded-lg border text-xs flex justify-between items-center transition-all ${
                            isCurrent
                              ? "bg-green-50/30 border-green-500/30"
                              : "bg-surface-bright border-outline-variant/30 hover:border-primary/20"
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <span className="font-mono font-bold text-on-surface text-[10px] bg-surface px-1.5 py-0.5 rounded border border-outline-variant/30 tracking-wider">
                              {c.code}
                            </span>
                            <p className="text-[10px] text-on-surface font-semibold mt-1">
                              {c.discountType === "percentage"
                                ? `${c.discountValue}% Off`
                                : `Flat ₹${c.discountValue} Off`}
                              {c.maxDiscount ? ` up to ₹${c.maxDiscount}` : ""}
                            </p>
                            <p className="text-[9px] text-outline mt-0.5 font-light">
                              Min purchase: ₹{c.minOrderAmount || 0}
                            </p>
                          </div>
                          
                          <button
                            type="button"
                            onClick={() => {
                              if (isCurrent) {
                                handleRemoveCoupon();
                              } else {
                                setCouponInput(c.code);
                                fetchBackendTotals(c.code);
                              }
                            }}
                            className={`text-[9px] font-extrabold uppercase tracking-wider px-2.5 py-1.5 rounded transition-colors cursor-pointer shrink-0 ${
                              isCurrent
                                ? "bg-red-50 text-red-600 hover:bg-red-100"
                                : "bg-primary text-white hover:brightness-110"
                            }`}
                          >
                            {isCurrent ? "Remove" : "Apply"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Price Details Card */}
            <div className="bg-surface-bright border border-outline-variant/40 rounded-lg p-4 shadow-xs sticky top-28 relative overflow-hidden">
              <MandalaArtDecor
                variant={2}
                size={250}
                className="-bottom-10 -right-10 opacity-[0.03]"
              />
              <h3 className="text-xs font-bold text-secondary uppercase tracking-wider pb-3 border-b border-outline-variant/40 mb-4 relative z-10">
                Price Details ({activeItems.length} Items)
              </h3>

              <div className="space-y-3 text-xs text-on-surface">
                <div className="flex justify-between">
                  <span>Price ({activeItems.length} items)</span>
                  <span>₹{backendTotals.subtotal.toLocaleString()}</span>
                </div>

                <div className="flex justify-between">
                  <span>Promo Discount</span>
                  <span className="text-green-700 font-medium">
                    − ₹{backendTotals.discount.toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span>Delivery Charges</span>
                  <span className="text-green-700 font-bold uppercase tracking-wider text-[12px]">
                    {backendTotals.shippingFee === 0 ? "Free" : `₹${backendTotals.shippingFee}`}
                  </span>
                </div>

                {paymentOption === "cod" && backendTotals.codFee > 0 && (
                  <div className="flex justify-between items-center bg-amber-50/50 text-amber-800 rounded px-2 py-1.5 border border-amber-100/50">
                    <span className="flex items-center gap-1 font-medium">
                      <span className="material-symbols-outlined text-[14px]">account_balance_wallet</span>
                      COD Handling Fee
                    </span>
                    <span className="font-bold">
                      ₹{backendTotals.codFee.toLocaleString()}
                    </span>
                  </div>
                )}

                {useWallet && backendTotals.walletDeduction > 0 && (
                  <div className="flex justify-between items-center bg-green-50/60 text-green-800 rounded px-2 py-1.5 border border-green-100/50 font-semibold">
                    <span className="flex items-center gap-1 font-medium">
                      <span className="material-symbols-outlined text-[14px] text-green-700">stars</span>
                      Siri Pay Wallet applied
                    </span>
                    <span>
                      − ₹{backendTotals.walletDeduction.toLocaleString()}
                    </span>
                  </div>
                )}

                <div className="h-[1px] bg-outline-variant/40 my-3" />

                {/* Highlighted Payable Total Row */}
                <div className="flex justify-between items-baseline font-bold text-sm">
                  <span>Total Payable</span>
                  <span className="text-base text-primary">
                    ₹{backendTotals.total.toLocaleString()}
                  </span>
                </div>

                {/* Instant Gamified Incentives Banner */}
                {backendTotals.coinsEarned > 0 && (
                  <div className="bg-gradient-to-tr from-[#1e1d1b] to-[#121110] text-[#f4e6d4] rounded-lg p-3 text-[10px] sm:text-[11px] border border-[#d4af37]/35 flex items-center justify-between shadow-sm relative overflow-hidden group mt-3">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#ffdf79] text-xs">stars</span>
                      <span>
                        Earn <strong className="text-[#ffdf79] font-bold">{backendTotals.coinsEarned} Siri Coins</strong> & <strong className="text-white font-bold">₹{backendTotals.cashbackEarned} Cashback</strong> on delivery!
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Instant calculation validation bottom message */}
              {backendTotals.discount > 0 && (
                <div className="bg-green-50 text-green-800 text-[12px] font-bold rounded p-2.5 mt-4 text-center border border-green-200/50">
                  Your Total Savings on this order sequence is ₹{backendTotals.discount.toLocaleString()}
                </div>
              )}

              {/* Bottom return policy tags */}
              <div className="mt-4 pt-3 border-t border-surface-container-low text-[11px] text-secondary space-y-1.5">
                <p className="flex items-center gap-1.5 font-medium">
                  <span className="material-symbols-outlined text-sm text-green-700">
                    verified
                  </span>
                  Safe and protected order transit
                </p>
                <p className="flex items-center gap-1.5 font-medium">
                  <span className="material-symbols-outlined text-sm text-primary">
                    change_circle
                  </span>
                  Easy 7-day money back arrival check
                </p>
              </div>

              {/* Integrated Payment Button at the bottom of the Price Details Card */}
              {activeStep === 3 && (
                <div className="mt-4 pt-4 border-t border-outline-variant/30">
                  <motion.button
                    whileHover={!isProcessing ? { scale: 1.01 } : {}}
                    whileTap={!isProcessing ? { scale: 0.99 } : {}}
                    type="button"
                    disabled={isProcessing}
                    onClick={handleConfirmOrder}
                    className="w-full bg-[#fb641b] hover:bg-[#f2550a] text-white font-bold text-xs uppercase tracking-wider py-3.5 rounded shadow-lg transition-all flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed group relative overflow-hidden"
                  >
                    {isProcessing ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <span>{paymentOption === "razorpay" ? "Pay & Place Order" : "Place Order"}</span>
                        <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
                      </>
                    )}
                  </motion.button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
