import React, { useState, useEffect, useMemo, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useWishlist } from "../context/WishlistContext";
import { useCart } from "../context/CartContext";
import { SEO } from "../components/seo/SEO";
import { handleImageError } from "../utils/imageUtils";
import { useAuth } from "../context/AuthContext";
import { orderService, userService } from "../services/domainServices";
import { MandalaElement } from "../components/ui/MandalaElement";
import { WriteReviewModal } from "../components/sections/ProductReviews";
import toast from "react-hot-toast";
import Barcode from "react-barcode";

const InvoiceTemplate = React.lazy(() => import("../components/ui").then(m => ({ default: m.InvoiceTemplate })));
const ProductCard = React.lazy(() => import("../components/ui").then(m => ({ default: m.ProductCard })));
const LoyaltyPanel = React.lazy(() => import("../components/loyalty/LoyaltyPanel").then(m => ({ default: m.LoyaltyPanel })));
const EventCustomerDashboard = React.lazy(() => import("./EventCustomerDashboard").then(m => ({ default: m.EventCustomerDashboard })));

import { useWebsiteContent } from "../hooks/useWebsiteContent";
import { useDashboardData } from "../hooks/useDashboardData";

import logger from '../utils/logger';
export function Dashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, logout, checkAuth } = useAuth();
  const { items: wishlistItems, removeItem: removeFromWishlist } = useWishlist();
  const { cartCount, items: cartItems, updateQuantity, removeItem } = useCart();
  const fileInputRef = useRef(null);

  const { contact } = useWebsiteContent();
  const addressText = contact?.address || "Siri Arts & Crafts, #28-1-92, South Street, ONGOLE-523001, Prakasam District, Andhra Pradesh";
  const phoneText = contact?.phone || "9866006648";

  const [activeTab, setActiveTab] = useState("profile");
  const [mobileShowContent, setMobileShowContent] = useState(false);

  // Sync tab from URL query params
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam && ["profile", "orders", "addresses", "wishlist", "preferences", "loyalty", "bookings"].includes(tabParam)) {
      const timer = setTimeout(() => {
        setActiveTab(tabParam);
        setMobileShowContent(true);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isPreferencesSaving, setIsPreferencesSaving] = useState(false);
  const userId = user?._id || user?.id;

  const {
    orders,
    setOrders,
    addresses,
    setAddresses,
    recentlyViewed,
    setRecentlyViewed,
    isOrdersLoading,
    isAddressesLoading,
    isLoadingRecentlyViewed,
    refetch: refetchDashboardData,
  } = useDashboardData(userId);

  // Profile forms
  const [profileForm, setProfileForm] = useState({
    name: "",
    phone: "",
    gender: "",
    dateOfBirth: "",
  });

  // Preference forms
  const [prefsForm, setPrefsForm] = useState({
    email: true,
    marketing: true,
    theme: "light",
    language: "en",
  });

  // Address forms
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [addressFormData, setAddressFormData] = useState(null);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState(null);
  const [reviewingProduct, setReviewingProduct] = useState(null);
  const [isAddressSaving, setIsAddressSaving] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);

  const fetchOrdersList = () => refetchDashboardData();
  const fetchAddressesList = () => refetchDashboardData();
  const fetchRecentlyViewedList = () => refetchDashboardData();

  // Sync profile data on mount and user change
  useEffect(() => {
    if (user) {
      const timer = setTimeout(() => {
        setProfileForm({
          name: user.name || "",
          phone: user.phone || "",
          gender: user.gender || "",
          dateOfBirth: user.dateOfBirth || "",
        });

        setPrefsForm({
          email: user.notificationPreferences?.email !== false,
          marketing: user.notificationPreferences?.marketing !== false,
          theme: user.accountPreferences?.theme || "light",
          language: user.accountPreferences?.language || "en",
        });
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [user]);

  const [orderFilter, setOrderFilter] = useState("ALL");

  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    if (orderFilter === "DELIVERED")
      return orders.filter((o) => o.orderStatus === "delivered");
    if (orderFilter === "ON_THE_WAY")
      return orders.filter((o) =>
        ["confirmed", "processing", "shipped"].includes(o.orderStatus),
      );
    return orders;
  }, [orders, orderFilter]);

  // Profile Save
  const handleProfileSave = async (e) => {
    e.preventDefault();
    if (!profileForm.name.trim()) {
      toast.error("Full name cannot be blank");
      return;
    }
    setIsUpdatingProfile(true);
    try {
      const res = await userService.updateProfile(profileForm);
      if (res.success) {
        toast.success("Profile information updated successfully!");
        await checkAuth(); // Reload global user state
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update profile details");
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  // Profile Preferences Save
  const handlePreferencesSave = async (e) => {
    e.preventDefault();
    setIsPreferencesSaving(true);
    try {
      const payload = {
        notificationPreferences: {
          email: prefsForm.email,
          marketing: prefsForm.marketing,
        },
        accountPreferences: {
          theme: prefsForm.theme,
          language: prefsForm.language,
        },
      };
      const res = await userService.updatePreferences(payload);
      if (res.success) {
        toast.success("Preferences saved successfully!");
        await checkAuth();
      }
    } catch (err) {
      toast.error("Failed to save preference settings");
    } finally {
      setIsPreferencesSaving(false);
    }
  };

  // Avatar Upload
  const handleAvatarClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file format");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image file size should not exceed 2MB");
      return;
    }

    const formData = new FormData();
    formData.append("avatar", file);

    setIsUploadingAvatar(true);
    const toastId = toast.loading("Uploading secure avatar image...");
    try {
      const res = await userService.uploadAvatar(formData);
      if (res.success) {
        toast.success("Profile avatar updated successfully!", { id: toastId });
        await checkAuth();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to upload avatar", { id: toastId });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // Address Handlers
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    setIsDetectingLocation(true);
    const toastId = toast.loading("Accessing device GPS coordinates...");

    const geoOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    };

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          toast.loading("Resolving coordinates to address details...", { id: toastId });
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
            {
              headers: {
                "Accept-Language": "en",
              },
            }
          );

          if (!res.ok) throw new Error("Reverse lookup failed");

          const data = await res.json();
          if (data && data.address) {
            const addr = data.address;
            const road = addr.road || addr.suburb || addr.neighbourhood || "";
            const locality = addr.suburb || addr.neighbourhood || addr.city_district || "";
            const city = addr.city || addr.town || addr.village || addr.county || "";
            const state = addr.state || "";
            const pincode = addr.postcode || "";

            // Construct readable street details
            const streetParts = [
              addr.house_number,
              addr.building,
              addr.road,
            ].filter(Boolean);
            const addressString =
              streetParts.length > 0
                ? streetParts.join(", ")
                : data.display_name.split(",").slice(0, 3).join(",").trim();

            setAddressFormData((prev) => ({
              ...prev,
              pincode: pincode.replace(/\s/g, ""), // clean pincode spacing
              locality: locality || road || "Local Area",
              addressString: addressString || data.display_name,
              city: city,
              state: state,
              latitude,
              longitude,
            }));

            toast.success("Location tracking successful! Parameters updated.", { id: toastId });
          } else {
            toast.error("Unable to parse address components from coordinates.", { id: toastId });
          }
        } catch (error) {
          logger.error("Reverse geocoding failure:", error);
          toast.error("Failed to map coordinates to a clean street address.", { id: toastId });
        } finally {
          setIsDetectingLocation(false);
        }
      },
      (error) => {
        setIsDetectingLocation(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            toast.error("Location access denied by your device.", { id: toastId });
            break;
          case error.POSITION_UNAVAILABLE:
            toast.error("GPS position parameters unavailable.", { id: toastId });
            break;
          case error.TIMEOUT:
            toast.error("Location tracking request timed out.", { id: toastId });
            break;
          default:
            toast.error("An unknown geotracking error occurred.", { id: toastId });
        }
      },
      geoOptions
    );
  };

  const handleAddressEdit = (addr) => {
    setEditingAddressId(addr._id || addr.id);
    setAddressFormData({
      id: addr._id || addr.id,
      name: addr.name || "",
      phone: addr.phone || "",
      pincode: addr.pincode || "",
      locality: addr.locality || "",
      addressString: addr.addressString || "",
      city: addr.city || "",
      state: addr.state || "",
      tag: addr.tag || "Home",
      latitude: addr.latitude || null,
      longitude: addr.longitude || null,
    });
    setIsAddressModalOpen(true);
  };

  const handleAddressSave = async (e) => {
    e.preventDefault();
    
    // Validations
    if (!addressFormData.phone || addressFormData.phone.length < 10) {
      toast.error("Please enter a valid 10-digit mobile number");
      return;
    }
    if (!addressFormData.pincode || addressFormData.pincode.length !== 6) {
      toast.error("Please enter a valid 6-digit postal pincode");
      return;
    }

    setIsAddressSaving(true);
    try {
      if (editingAddressId === "new") {
        await userService.addAddress(addressFormData);
        toast.success("New address added successfully!");
      } else {
        await userService.updateAddress(editingAddressId, addressFormData);
        toast.success("Address modified successfully!");
      }
      await fetchAddressesList();
      setIsAddressModalOpen(false);
      setEditingAddressId(null);
      setAddressFormData(null);
    } catch (err) {
      toast.error("Failed to store address information");
    } finally {
      setIsAddressSaving(false);
    }
  };

  const handleDeleteAddress = async (id) => {
    if (!window.confirm("Are you sure you want to delete this address?")) return;
    const toastId = toast.loading("Removing address...");
    try {
      await userService.deleteAddress(id);
      toast.success("Address deleted successfully!", { id: toastId });
      await fetchAddressesList();
    } catch (err) {
      toast.error("Failed to delete address", { id: toastId });
    }
  };

  const handleSetDefaultAddress = async (id) => {
    const toastId = toast.loading("Setting default parameters...");
    try {
      await userService.setDefaultAddress(id);
      toast.success("Default delivery address set!", { id: toastId });
      await fetchAddressesList();
    } catch (err) {
      toast.error("Failed to set default address", { id: toastId });
    }
  };

  const downloadInvoice = (orderId) => {
    const targetOrder = orders.find((o) => (o._id || o.id) === orderId);
    if (targetOrder) {
      setSelectedInvoiceOrder(targetOrder);
    } else {
      toast.error("Invoice data currently unavailable. Refreshing feed.");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="bg-surface-container-low min-h-screen pt-24 pb-32 font-body text-on-surface"
    >
      <SEO
        title="Your Premium Studio Account"
        description="Manage your Siri Arts & Crafts profile parameters, live orders, dynamic shipping addresses, wishlist collections, and personalized newsletter configurations."
      />

      <div className="max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop">
        <nav className="text-[11px] text-secondary mb-6 flex flex-wrap items-center gap-2 tracking-wider uppercase font-bold">
          <Link to="/" className="hover:text-primary transition-colors">
            Home
          </Link>
          <span>/</span>
          <button 
            onClick={() => setMobileShowContent(false)}
            className={`hover:text-primary transition-colors cursor-pointer uppercase ${!mobileShowContent ? "text-on-surface" : ""}`}
          >
            My Account
          </button>
          {mobileShowContent && (
            <>
              <span className="hidden md:inline">/</span>
              <span className="md:hidden text-primary">/</span>
              <span className="text-on-surface">
                {activeTab === "profile" && "Profile Settings"}
                {activeTab === "orders" && "My Order History"}
                {activeTab === "bookings" && "My Event Bookings"}
                {activeTab === "addresses" && "Delivery Sites"}
                {activeTab === "wishlist" && "Curated Wishlist"}
                {activeTab === "cart" && "My Shopping Bag"}
                {activeTab === "recently-viewed" && "Recently Viewed"}
                {activeTab === "preferences" && "Platform Preferences"}
                {activeTab === "loyalty" && "Loyalty Club"}
              </span>
            </>
          )}
        </nav>

        <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-6">
          
          {/* LEFT SIDEBAR NAVIGATION PANEL */}
          <div className={`col-span-1 md:col-span-2 lg:col-span-3 space-y-4 ${mobileShowContent ? "hidden md:block" : "block"}`}>
            
            {/* Dynamic Avatar & Basic Info Card */}
            <div className="bg-surface-bright border border-outline-variant/40 rounded-lg p-5 flex flex-col items-center text-center shadow-xs relative group overflow-hidden">
              
              {/* Profile Image with Edit Overlay */}
              <div 
                onClick={handleAvatarClick}
                className="w-20 h-20 rounded-full border border-outline-variant/50 relative overflow-hidden bg-surface-container flex items-center justify-center cursor-pointer shadow-sm group/avatar hover:border-primary transition-colors"
              >
                {isUploadingAvatar ? (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10">
                    <div className="w-6 h-6 border-2 border-surface/20 border-t-surface rounded-full animate-spin" />
                  </div>
                ) : null}

                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name || "Avatar"}
                    className="w-full h-full object-cover"
                    onError={handleImageError}
                  />
                ) : (
                  <span className="font-display text-[26px] text-primary font-light">
                    {user?.name ? user.name.substring(0, 2).toUpperCase() : "AT"}
                  </span>
                )}

                {/* Edit Camera Overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/avatar:opacity-100 flex items-center justify-center text-white transition-opacity duration-300">
                  <span className="material-symbols-outlined text-[18px]">photo_camera</span>
                </div>
              </div>

              {/* Secret input for upload */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleAvatarChange}
                accept="image/*"
                className="hidden"
              />

              <div className="mt-3 w-full">
                {!user ? (
                  <>
                    <span className="font-label-sm text-[11px] text-secondary font-bold tracking-widest uppercase block">
                      Welcome, Guest
                    </span>
                    <Link
                      to="/auth"
                      className="text-xs font-bold text-primary hover:underline mt-1 block"
                    >
                      Access Bespoke Studio
                    </Link>
                  </>
                ) : (
                  <>
                    <strong className="text-sm text-on-surface block truncate font-bold">
                      {user.name}
                    </strong>
                    <span className="text-[11px] text-secondary block truncate font-light mb-2">
                      {user.email}
                    </span>
                    
                    <div className="flex flex-col gap-1 items-center">
                      <span className={`text-[9px] px-2 py-0.5 rounded-full border tracking-wider font-semibold uppercase ${
                        user.isVerified 
                          ? "bg-green-50/70 text-green-700 border-green-200" 
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}>
                        {user.isVerified ? "✔ Verified Session" : "Pending Verification"}
                      </span>
                      
                      {user.createdAt && (
                        <span className="text-[9px] text-secondary/50 font-medium">
                          Joined {new Date(user.createdAt).toLocaleString('default', { month: 'long', year: 'numeric' })}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Account Suite Selector tabs */}
            <div
              role="tablist"
              aria-label="Artisan Navigation Hub"
              className="bg-surface-bright border border-outline-variant/40 rounded-lg shadow-xs overflow-hidden"
            >
              <div className="border-b border-surface-container">
                <div className="px-4 py-3 bg-surface-container-low text-secondary font-bold text-[11px] uppercase tracking-wider flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-primary">
                    shopping_bag
                  </span>
                  Orders Suite
                </div>

                <motion.button
                  role="tab"
                  aria-selected={activeTab === "orders"}
                  whileHover={{ x: 3 }}
                  onClick={() => {
                    setActiveTab("orders");
                    setOrderFilter("ALL");
                    setMobileShowContent(true);
                  }}
                  className={`w-full text-left px-8 py-2.5 font-medium text-[12px] flex items-center justify-between transition-colors cursor-pointer outline-none ${
                    activeTab === "orders"
                      ? "text-primary font-bold bg-primary/5 border-l-2 border-primary"
                      : "text-on-surface hover:bg-surface-container-low"
                  }`}
                >
                  <span>My Order History</span>
                  <span className="material-symbols-outlined text-xs">
                    chevron_right
                  </span>
                </motion.button>
              </div>

              <div className="border-b border-surface-container">
                <div className="px-4 py-3 bg-surface-container-low text-secondary font-bold text-[11px] uppercase tracking-wider flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-primary">
                    person
                  </span>
                  Profile Suite
                </div>

                <motion.button
                  role="tab"
                  aria-selected={activeTab === "profile"}
                  whileHover={{ x: 3 }}
                  onClick={() => {
                    setActiveTab("profile");
                    setMobileShowContent(true);
                  }}
                  className={`w-full text-left px-8 py-2.5 font-medium text-[12px] flex items-center justify-between transition-colors cursor-pointer outline-none ${
                    activeTab === "profile"
                      ? "text-primary font-bold bg-primary/5 border-l-2 border-primary"
                      : "text-on-surface hover:bg-surface-container-low"
                  }`}
                >
                  <span>Profile Settings</span>
                  <span className="material-symbols-outlined text-xs">
                    chevron_right
                  </span>
                </motion.button>

                <motion.button
                  role="tab"
                  aria-selected={activeTab === "bookings"}
                  whileHover={{ x: 3 }}
                  onClick={() => {
                    setActiveTab("bookings");
                    setMobileShowContent(true);
                  }}
                  className={`w-full text-left px-8 py-2.5 font-medium text-[12px] flex items-center justify-between transition-colors cursor-pointer outline-none ${
                    activeTab === "bookings"
                      ? "text-primary font-bold bg-primary/5 border-l-2 border-primary"
                      : "text-on-surface hover:bg-surface-container-low"
                  }`}
                >
                  <span>My Event Bookings</span>
                  <span className="material-symbols-outlined text-xs text-[#735c00]">
                    calendar_month
                  </span>
                </motion.button>

                <motion.button
                  role="tab"
                  aria-selected={activeTab === "addresses"}
                  whileHover={{ x: 3 }}
                  onClick={() => {
                    setActiveTab("addresses");
                    setMobileShowContent(true);
                  }}
                  className={`w-full text-left px-8 py-2.5 font-medium text-[12px] flex items-center justify-between transition-colors cursor-pointer outline-none ${
                    activeTab === "addresses"
                      ? "text-primary font-bold bg-primary/5 border-l-2 border-primary"
                      : "text-on-surface hover:bg-surface-container-low"
                  }`}
                >
                  <span>Manage Delivery Sites</span>
                  <span className="text-[11px] text-secondary font-bold">
                    ({addresses.length})
                  </span>
                </motion.button>

                <motion.button
                  role="tab"
                  aria-selected={activeTab === "preferences"}
                  whileHover={{ x: 3 }}
                  onClick={() => {
                    setActiveTab("preferences");
                    setMobileShowContent(true);
                  }}
                  className={`w-full text-left px-8 py-2.5 font-medium text-[12px] flex items-center justify-between transition-colors cursor-pointer outline-none ${
                    activeTab === "preferences"
                      ? "text-primary font-bold bg-primary/5 border-l-2 border-primary"
                      : "text-on-surface hover:bg-surface-container-low"
                  }`}
                >
                  <span>Notifications & Settings</span>
                  <span className="material-symbols-outlined text-xs">
                    chevron_right
                  </span>
                </motion.button>
              </div>

              <div className="border-b border-surface-container">
                <div className="px-4 py-3 bg-surface-container-low text-secondary font-bold text-[11px] uppercase tracking-wider flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-primary">
                    folder_special
                  </span>
                  My Collections & Stuff
                </div>

                <motion.button
                  role="tab"
                  aria-selected={activeTab === "wishlist"}
                  whileHover={{ x: 3 }}
                  onClick={() => {
                    setActiveTab("wishlist");
                    setMobileShowContent(true);
                  }}
                  className={`w-full text-left px-8 py-2.5 font-medium text-[12px] flex items-center justify-between transition-colors cursor-pointer outline-none ${
                    activeTab === "wishlist"
                      ? "text-primary font-bold bg-primary/5 border-l-2 border-primary"
                      : "text-on-surface hover:bg-surface-container-low"
                  }`}
                >
                  <span>Curated Wishlist</span>
                  <span className="text-[11px] font-bold text-primary">
                    ({wishlistItems ? wishlistItems.length : 0})
                  </span>
                </motion.button>

                <motion.button
                  role="tab"
                  aria-selected={activeTab === "cart"}
                  whileHover={{ x: 3 }}
                  onClick={() => {
                    setActiveTab("cart");
                    setMobileShowContent(true);
                  }}
                  className={`w-full text-left px-8 py-2.5 font-medium text-[12px] flex items-center justify-between transition-colors cursor-pointer outline-none ${
                    activeTab === "cart"
                      ? "text-primary font-bold bg-primary/5 border-l-2 border-primary"
                      : "text-on-surface hover:bg-surface-container-low"
                  }`}
                >
                  <span>My Shopping Bag</span>
                  <span className="text-[11px] font-bold text-primary">
                    ({cartCount})
                  </span>
                </motion.button>

                <motion.button
                  role="tab"
                  aria-selected={activeTab === "recently-viewed"}
                  whileHover={{ x: 3 }}
                  onClick={() => {
                    setActiveTab("recently-viewed");
                    fetchRecentlyViewedList();
                    setMobileShowContent(true);
                  }}
                  className={`w-full text-left px-8 py-2.5 font-medium text-[12px] flex items-center justify-between transition-colors cursor-pointer outline-none ${
                    activeTab === "recently-viewed"
                      ? "text-primary font-bold bg-primary/5 border-l-2 border-primary"
                      : "text-on-surface hover:bg-surface-container-low"
                  }`}
                >
                  <span>Recently Viewed</span>
                  <span className="material-symbols-outlined text-xs">
                    history
                  </span>
                </motion.button>

                <motion.button
                  role="tab"
                  aria-selected={activeTab === "loyalty"}
                  whileHover={{ x: 3 }}
                  onClick={() => {
                    setActiveTab("loyalty");
                    setMobileShowContent(true);
                  }}
                  className={`w-full text-left px-8 py-2.5 font-medium text-[12px] flex items-center justify-between transition-colors cursor-pointer outline-none ${
                    activeTab === "loyalty"
                      ? "text-primary font-bold bg-primary/5 border-l-2 border-primary"
                      : "text-on-surface hover:bg-surface-container-low"
                  }`}
                >
                  <span>Siri Coins & Wallet</span>
                  <span className="material-symbols-outlined text-xs text-[#735c00]">
                    stars
                  </span>
                </motion.button>
              </div>

              <motion.button
                whileHover={{
                  backgroundColor: "var(--color-error-container)",
                  color: "var(--color-on-error-container)",
                }}
                onClick={() => {
                  logout();
                  setTimeout(() => navigate("/"), 400);
                }}
                className="w-full text-left px-4 py-3.5 text-error font-bold text-[11px] uppercase tracking-wider flex items-center gap-2 transition-colors cursor-pointer outline-none"
              >
                <span className="material-symbols-outlined text-sm">
                  logout
                </span>
                Terminate Secure Session
              </motion.button>

              <div className="flex flex-col gap-1.5 p-4 text-on-surface-variant/40 font-label-sm text-[10px] uppercase tracking-widest font-bold border-t border-surface-container">
                <span className="max-w-md">
                  Studio Headquarters: {addressText}
                </span>
                <span>Inquiry Line: +91 {phoneText}</span>
              </div>
            </div>
          </div>

          {/* MAIN DYNAMIC CONTENT PORTAL PANELS */}
          <div className={`col-span-1 md:col-span-4 lg:col-span-9 space-y-4 ${mobileShowContent ? "block" : "hidden md:block"}`}>
            <AnimatePresence mode="wait">
              
              {/* TAB 0: RESERVED EVENT BOOKINGS */}
              {activeTab === "bookings" && (
                <motion.div
                  id="panel-bookings"
                  role="tabpanel"
                  key="tab-bookings"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.3 }}
                  className="bg-surface-bright border border-outline-variant/40 rounded-lg p-3 md:p-6 shadow-xs space-y-6 overflow-hidden"
                >
                  <div className="pb-4 border-b border-outline-variant/40">
                    <h2 className="font-bold text-base text-on-surface uppercase tracking-wider">
                      My Event Bookings
                    </h2>
                    <span className="text-[11px] text-secondary font-light">
                      Track your reserved setups, theme boards, milestone deposits, and site lead coordinates.
                    </span>
                  </div>
                  <React.Suspense fallback={<div className="p-8 text-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div></div>}>
                    <EventCustomerDashboard isEmbedded={true} />
                  </React.Suspense>
                </motion.div>
              )}

              {/* TAB 1: PROFILE EDITING & PARAMETERS */}
              {activeTab === "profile" && (
                <motion.div
                  id="panel-profile"
                  role="tabpanel"
                  key="tab-profile"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.3 }}
                  className="bg-surface-bright border border-outline-variant/40 rounded-lg p-6 shadow-xs space-y-6"
                >
                  <div className="pb-4 border-b border-outline-variant/40">
                    <h2 className="font-bold text-base text-on-surface uppercase tracking-wider">
                      Profile Settings
                    </h2>
                    <span className="text-[11px] text-secondary font-light">
                      Update your account profiles, contact parameters, and identity settings.
                    </span>
                  </div>

                  <form onSubmit={handleProfileSave} className="space-y-5 max-w-2xl text-[11px]">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label htmlFor="dashboard-profile-name" className="block text-[10px] uppercase font-bold text-secondary tracking-widest mb-1.5">
                          Full Account Name
                        </label>
                        <input
                          id="dashboard-profile-name"
                          type="text"
                          required
                          autoComplete="name"
                          value={profileForm.name}
                          onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                          className="w-full bg-white border border-outline-variant/30 rounded-lg px-4 py-3 text-xs outline-none focus:border-primary transition-all font-semibold"
                          placeholder="Enter your full name"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase font-bold text-secondary tracking-widest mb-1.5">
                          Registered Email Address
                        </label>
                        <input
                          type="email"
                          disabled
                          value={user?.email || ""}
                          className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg px-4 py-3 text-xs outline-none font-semibold text-secondary cursor-not-allowed"
                        />
                        <span className="text-[9px] text-secondary/50 block mt-1">
                          Security Note: Primary login email keys cannot be modified.
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                      <div>
                        <label htmlFor="dashboard-profile-phone" className="block text-[10px] uppercase font-bold text-secondary tracking-widest mb-1.5">
                          Mobile Number
                        </label>
                        <input
                          id="dashboard-profile-phone"
                          type="tel"
                          autoComplete="tel"
                          value={profileForm.phone}
                          onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                          className="w-full bg-white border border-outline-variant/30 rounded-lg px-4 py-3 text-xs outline-none focus:border-primary transition-all font-semibold"
                          placeholder="e.g. 9876543210"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase font-bold text-secondary tracking-widest mb-1.5">
                          Gender Option
                        </label>
                        <select
                          value={profileForm.gender}
                          onChange={(e) => setProfileForm({ ...profileForm, gender: e.target.value })}
                          className="w-full bg-white border border-outline-variant/30 rounded-lg px-4 py-3 text-xs outline-none focus:border-primary transition-all font-semibold cursor-pointer"
                        >
                          <option value="">Select Gender</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other / Custom</option>
                          <option value="prefer-not-to-say">Prefer Not To Disclose</option>
                        </select>
                      </div>

                      <div className="min-w-0">
                        <label htmlFor="dashboard-profile-dob" className="block text-[10px] uppercase font-bold text-secondary tracking-widest mb-1.5">
                          Date Of Birth (DOB)
                        </label>
                        <input
                          id="dashboard-profile-dob"
                          type="date"
                          autoComplete="bday"
                          value={profileForm.dateOfBirth}
                          onChange={(e) => setProfileForm({ ...profileForm, dateOfBirth: e.target.value })}
                          className="w-full min-w-0 max-w-full bg-white border border-outline-variant/30 rounded-lg px-2 md:px-4 py-3 text-xs outline-none focus:border-primary transition-all font-semibold cursor-pointer"
                        />
                      </div>
                    </div>

                    <div className="pt-4 flex justify-end">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        disabled={isUpdatingProfile}
                        type="submit"
                        className="btn-primary px-8 py-3 rounded-full font-bold uppercase tracking-widest text-[10px] inline-flex items-center gap-2 cursor-pointer shadow-md"
                      >
                        {isUpdatingProfile ? (
                          <div className="w-3.5 h-3.5 border-2 border-surface/20 border-t-surface rounded-full animate-spin" />
                        ) : (
                          <>
                            <span className="material-symbols-outlined text-[13px]">save</span>
                            <span>Commit Profile Updates</span>
                          </>
                        )}
                      </motion.button>
                    </div>
                  </form>
                </motion.div>
              )}

              {/* TAB 2: ADDRESS MANAGEMENT */}
              {activeTab === "addresses" && (
                <motion.div
                  id="panel-addresses"
                  role="tabpanel"
                  key="tab-addresses"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  <div className="bg-surface-bright border border-outline-variant/40 rounded-lg p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
                    <div>
                      <h2 className="font-bold text-base text-on-surface uppercase tracking-wider">
                        Delivery Sites
                      </h2>
                      <span className="text-[11px] text-secondary font-light">
                        Configure premium delivery, invoicing sites, and home destinations.
                      </span>
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setEditingAddressId("new");
                        setAddressFormData({
                          id: "new",
                          name: "",
                          phone: "",
                          pincode: "",
                          locality: "",
                          addressString: "",
                          city: "",
                          state: "",
                          tag: "Home",
                          latitude: null,
                          longitude: null,
                        });
                        setIsAddressModalOpen(true);
                      }}
                      className="bg-primary text-surface rounded-full px-4 md:px-5 py-2 md:py-2.5 font-bold text-[9px] md:text-[10px] uppercase tracking-widest hover:bg-on-surface transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-md whitespace-nowrap shrink-0 self-start sm:self-auto"
                    >
                      <span className="material-symbols-outlined text-[14px]">add</span>
                      <span className="hidden sm:inline">Add Delivery Destination</span>
                      <span className="sm:hidden">Add New</span>
                    </motion.button>
                  </div>

                  {isAddressesLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="h-40 bg-white border border-outline-variant/20 rounded-lg animate-pulse" />
                      <div className="h-40 bg-white border border-outline-variant/20 rounded-lg animate-pulse" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <AnimatePresence>
                        {addresses.map((addr) => (
                          <motion.div
                            layout
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            key={addr._id || addr.id}
                            className={`bg-surface-bright border rounded-lg p-5 shadow-xs flex flex-col justify-between text-[11px] relative transition-colors ${
                              addr.isDefault 
                                ? "border-primary/80 ring-1 ring-primary/20" 
                                : "border-outline-variant/40 hover:border-outline-variant"
                            }`}
                          >
                            <div className="flex flex-col h-full justify-between">
                              <div>
                                <div className="flex items-center justify-between mb-3">
                                  <span className="bg-surface-container text-secondary text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-widest">
                                    {addr.tag}
                                  </span>

                                  {addr.isDefault ? (
                                    <span className="text-[10px] text-green-700 font-bold bg-green-50 px-2 py-0.5 border border-green-200 rounded flex items-center gap-1">
                                      <span className="material-symbols-outlined text-[10px]">check_circle</span>
                                      Default Destination
                                    </span>
                                  ) : (
                                    <button
                                      onClick={() => handleSetDefaultAddress(addr._id || addr.id)}
                                      className="text-[9px] text-primary uppercase font-bold hover:underline cursor-pointer active:scale-[0.98]"
                                    >
                                      Set as Default
                                    </button>
                                  )}
                                </div>

                                <strong className="text-xs text-on-surface block mb-1 font-bold">
                                  {addr.name}
                                </strong>
                                <p className="text-secondary leading-relaxed mb-3 text-[11px]">
                                  {addr.addressString}, {addr.locality},<br />
                                  {addr.city}, {addr.state} -{" "}
                                  <strong className="text-on-surface font-semibold">
                                    {addr.pincode}
                                  </strong>
                                </p>
                                <span className="text-on-surface font-semibold block text-[11px]">
                                  Mobile Contact: {addr.phone}
                                </span>
                                {addr.latitude && addr.longitude && (
                                  <div className="mt-2 text-[9px] text-green-700 font-bold bg-green-50 px-2 py-0.5 border border-green-200 rounded-sm inline-flex items-center gap-1 uppercase tracking-wider">
                                    <span className="material-symbols-outlined text-[10px]">share_location</span>
                                    GPS Locked: {addr.latitude.toFixed(4)}, {addr.longitude.toFixed(4)}
                                  </div>
                                )}
                              </div>

                              <div className="mt-4 pt-3 border-t border-surface-container flex items-center justify-end gap-3.5 font-bold text-[11px] uppercase tracking-wider">
                                <button
                                  onClick={() => handleAddressEdit(addr)}
                                  className="text-primary hover:underline cursor-pointer active:scale-[0.98]"
                                >
                                  Modify
                                </button>
                                <span className="text-outline-variant">|</span>
                                <button
                                  onClick={() => handleDeleteAddress(addr._id || addr.id)}
                                  className="text-secondary hover:text-red-600 transition-colors cursor-pointer active:scale-[0.98]"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  )}

                  {addresses.length === 0 && !isAddressesLoading && (
                    <div className="text-center py-16 bg-surface-bright rounded-lg border border-outline-variant/40 text-[11px] text-secondary italic">
                      No delivery destination parameters logged yet. Click above to define your first site!
                    </div>
                  )}
                </motion.div>
              )}

              {/* TAB 3: ACCOUNT PREFERENCES */}
              {activeTab === "preferences" && (
                <motion.div
                  id="panel-preferences"
                  role="tabpanel"
                  key="tab-preferences"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.3 }}
                  className="bg-surface-bright border border-outline-variant/40 rounded-lg p-6 shadow-xs space-y-6"
                >
                  <div className="pb-4 border-b border-outline-variant/40">
                    <h2 className="font-bold text-base text-on-surface uppercase tracking-wider">
                      Preferences & Setting Variables
                    </h2>
                    <span className="text-[11px] text-secondary font-light">
                      Customize how you interact with Siri Arts & Crafts. All changes sync dynamically.
                    </span>
                  </div>

                  <form onSubmit={handlePreferencesSave} className="space-y-6 max-w-xl text-[11px]">
                    
                    {/* Notification Preferences */}
                    <div className="space-y-3">
                      <h3 className="font-bold text-xs uppercase tracking-wider text-primary">Notification Subscriptions</h3>
                      
                      <div className="flex items-start gap-3 p-3 bg-surface-container-low/40 rounded-lg border border-outline-variant/20">
                        <input
                          type="checkbox"
                          id="pref-email"
                          checked={prefsForm.email}
                          onChange={(e) => setPrefsForm({ ...prefsForm, email: e.target.checked })}
                          className="mt-1 cursor-pointer w-4 h-4 accent-primary"
                        />
                        <div>
                          <label htmlFor="pref-email" className="font-bold text-on-surface cursor-pointer text-xs block">
                            Direct Order Invoicing & Transaction Updates
                          </label>
                          <span className="text-[10px] text-secondary font-light">
                            Receive real-time order logs, shipping statuses, verification keys, and tracking parameters. (Highly Recommended)
                          </span>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 p-3 bg-surface-container-low/40 rounded-lg border border-outline-variant/20">
                        <input
                          type="checkbox"
                          id="pref-marketing"
                          checked={prefsForm.marketing}
                          onChange={(e) => setPrefsForm({ ...prefsForm, marketing: e.target.checked })}
                          className="mt-1 cursor-pointer w-4 h-4 accent-primary"
                        />
                        <div>
                          <label htmlFor="pref-marketing" className="font-bold text-on-surface cursor-pointer text-xs block">
                            Exclusive Curations & Launch Alerts
                          </label>
                          <span className="text-[10px] text-secondary font-light">
                            Access premium limited-edition collections, holiday discount campaigns, and early-bird event details.
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-6 flex justify-end">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        disabled={isPreferencesSaving}
                        type="submit"
                        className="bg-primary text-surface px-5 py-2 rounded-full font-bold uppercase tracking-widest text-[9px] inline-flex items-center gap-1.5 cursor-pointer shadow-sm hover:bg-on-surface transition-colors"
                      >
                        {isPreferencesSaving ? (
                          <div className="w-3.5 h-3.5 border-2 border-surface/20 border-t-surface rounded-full animate-spin" />
                        ) : (
                          <>
                            <span className="material-symbols-outlined text-[13px]">tune</span>
                            <span>Save Preferences</span>
                          </>
                        )}
                      </motion.button>
                    </div>
                  </form>
                </motion.div>
              )}

              {/* TAB 4: REAL-TIME ORDER HISTORY */}
              {activeTab === "orders" && (
                <motion.div
                  id="panel-orders"
                  role="tabpanel"
                  key="tab-orders"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  <div className="bg-surface-bright border border-outline-variant/40 rounded-lg p-3.5 flex items-center gap-2 overflow-x-auto shadow-xs">
                    <span className="text-[10px] uppercase font-bold text-secondary tracking-widest mr-2 flex-shrink-0">
                      Sort Parameters:
                    </span>
                    {[
                      { id: "ALL", label: "Show All Orders" },
                      { id: "ON_THE_WAY", label: "In Transit" },
                      { id: "DELIVERED", label: "Delivered Masterpieces" },
                    ].map((f) => (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        key={f.id}
                        onClick={() => setOrderFilter(f.id)}
                        className={`px-3 py-1.5 rounded-full text-[9px] uppercase tracking-wider font-bold transition-all flex-shrink-0 cursor-pointer ${
                          orderFilter === f.id
                            ? "bg-primary text-surface shadow-xs"
                            : "bg-surface-container text-secondary hover:bg-outline-variant/20"
                        }`}
                      >
                        {f.label}
                      </motion.button>
                    ))}
                  </div>

                  {isOrdersLoading ? (
                    <div className="space-y-4">
                      <div className="h-32 bg-white border border-outline-variant/20 rounded-lg animate-pulse" />
                      <div className="h-32 bg-white border border-outline-variant/20 rounded-lg animate-pulse" />
                    </div>
                  ) : (
                    <motion.div layout className="space-y-4">
                      <AnimatePresence>
                        {filteredOrders.map((order, idx) => (
                          <motion.div
                            layout
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.25, delay: idx * 0.05 }}
                            key={order._id || idx}
                            className="bg-surface-bright border border-outline-variant/40 rounded-lg p-5 shadow-xs hover:border-outline-variant transition-colors"
                          >
                            <div className="flex flex-col sm:flex-row justify-between gap-4 pb-3 border-b border-surface-container">
                              <div>
                                <span className="text-[9px] uppercase font-bold text-secondary tracking-widest block mb-0.5">
                                  Unique Order ID
                                </span>
                                <div className="flex items-center gap-2">
                                  <strong className="text-xs font-mono text-on-surface truncate max-w-[130px] sm:max-w-none">
                                    {order._id}
                                  </strong>
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(order._id);
                                      toast.success("Order ID copied!");
                                    }}
                                    className="material-symbols-outlined text-[13px] text-secondary hover:text-primary transition-colors cursor-pointer active:scale-[0.95]"
                                    title="Copy ID Key"
                                  >
                                    content_copy
                                  </button>
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                <span
                                  className={`px-2.5 py-0.5 rounded text-[9px] uppercase tracking-wider font-bold ${
                                    order.orderStatus === "delivered"
                                      ? "bg-green-50 text-green-700 border border-green-200"
                                      : "bg-amber-50 text-amber-800 border border-amber-200 animate-pulse"
                                  }`}
                                >
                                  {order.orderStatus}
                                </span>

                                <span className="text-[9px] bg-surface-container px-2 py-0.5 rounded font-bold uppercase tracking-wider border border-outline-variant/10">
                                  {order.paymentStatus || "Paid"}
                                </span>
                              </div>
                            </div>

                             <div className="pt-3 space-y-4">
                              {order.items?.map((item, itemIdx) => {
                                const prodTitle = item.title || (typeof item.productId === "object" ? item.productId?.title : null) || "Artisanal Piece";
                                const prodPrice = item.price || (typeof item.productId === "object" ? item.productId?.price : 0) || 0;
                                const prodImage = item.imageSrc || (typeof item.productId === "object" ? item.productId?.imageSrc || item.productId?.images?.[0] : null) || "";
                                const prodVariant = item.variant || "Default";
                                return (
                                  <div key={itemIdx} className="flex gap-4 items-start pb-2 border-b border-dashed border-outline-variant/10 last:border-0 last:pb-0">
                                    <img
                                      onError={handleImageError}
                                      src={prodImage}
                                      alt="Traditional wedding event decoration"
                                      className="w-14 h-16 bg-surface-container rounded object-cover flex-shrink-0 border border-outline-variant/20 shadow-2xs"
                                    />

                                    <div className="flex-1 min-w-0 text-[12px]">
                                      <h4 className="font-bold text-on-surface line-clamp-1">
                                        {prodTitle}
                                      </h4>
                                      <span className="text-[11px] text-secondary block mt-0.5">
                                        Quantity: {item.quantity || 1} • Unit Price: ₹{prodPrice.toLocaleString()} {prodVariant !== 'Default' && `• Style: ${prodVariant}`}
                                      </span>
                                      <strong className="text-xs text-primary block mt-1">
                                        ₹{(prodPrice * (item.quantity || 1)).toLocaleString()}
                                      </strong>
                                      {order.orderStatus === "Delivered" && (
                                        <button
                                          onClick={() => setReviewingProduct({
                                            productId: item.productId?._id || item.productId,
                                            productTitle: prodTitle
                                          })}
                                          className="mt-2 text-[10px] text-primary hover:text-primary-dark font-bold uppercase tracking-widest flex items-center gap-1 transition-colors active:scale-[0.98]"
                                        >
                                          <span className="material-symbols-outlined text-[13px]">rate_review</span>
                                          Write a Review
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Enterprise Logistics Details */}
                            {order.trackingNumber && (
                              <div className="mt-3 pt-3 border-t border-dashed border-outline-variant/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-surface-container/30 p-3 rounded-lg">
                                <div>
                                  <span className="text-[9px] uppercase font-bold text-secondary tracking-widest block mb-0.5">Tracking AWB</span>
                                  <strong className="text-on-surface text-xs font-mono">{order.trackingNumber}</strong>
                                </div>
                                <div>
                                  <span className="text-[9px] uppercase font-bold text-secondary tracking-widest block mb-0.5">Courier</span>
                                  <strong className="text-primary text-xs">{order.courierPartner || "Delhivery Logistics"}</strong>
                                </div>
                                {order.barcodeData && (
                                  <div className="bg-white px-2 py-1 rounded shadow-sm">
                                    <Barcode value={order.barcodeData} height={20} width={1} displayValue={false} background="transparent" margin={0} />
                                  </div>
                                )}
                              </div>
                            )}

                            <div className="pt-3 mt-3 border-t border-surface-container flex flex-wrap justify-between items-center gap-3 text-[11px]">
                              <p className="text-secondary flex items-center gap-1 font-medium">
                                <span className="material-symbols-outlined text-xs text-green-700">
                                  calendar_today
                                </span>
                                Ordered on {new Date(order.createdAt).toLocaleDateString("en-US", { day: 'numeric', month: 'long', year: 'numeric' })}
                              </p>
                              
                              <div className="flex items-center gap-4 font-bold uppercase tracking-wider text-[10px]">
                                {order.invoiceNumber ? (
                                  <button
                                    onClick={() => downloadInvoice(order._id)}
                                    className="text-primary hover:underline cursor-pointer flex items-center gap-1 active:scale-[0.98]"
                                  >
                                    <span className="material-symbols-outlined text-[13px]">receipt_long</span>
                                    <span>Invoice: {order.invoiceNumber}</span>
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => downloadInvoice(order._id)}
                                    className="text-primary hover:underline cursor-pointer flex items-center gap-1 active:scale-[0.98]"
                                  >
                                    <span className="material-symbols-outlined text-[13px]">download</span>
                                    <span>Get PDF Invoice</span>
                                  </button>
                                )}
                                <span className="text-outline-variant">|</span>
                                <button
                                  onClick={() => {
                                    if(order.trackingNumber) window.open(`https://www.delhivery.com/tracking?id=${order.trackingNumber}`, "_blank");
                                    else toast.success("Opening live courier query feed...");
                                  }}
                                  className="text-secondary hover:text-primary transition-colors cursor-pointer flex items-center gap-1 active:scale-[0.98]"
                                >
                                  <span className="material-symbols-outlined text-[13px]">local_shipping</span>
                                  <span>Track Dispatch</span>
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>

                      {filteredOrders.length === 0 && !isOrdersLoading && (
                        <div className="text-center py-16 bg-surface-bright rounded-lg border border-outline-variant/40 text-[11px] text-secondary italic">
                          No order records found matching the status filter.
                        </div>
                      )}
                    </motion.div>
                  )}
                </motion.div>
              )}

              {/* TAB 5: WISHLIST COLLECTIONS */}
              {activeTab === "wishlist" && (
                <motion.div
                  id="panel-wishlist"
                  role="tabpanel"
                  key="tab-wishlist"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  <div className="bg-surface-bright border border-outline-variant/40 rounded-lg p-5 shadow-xs">
                    <h2 className="font-bold text-base text-on-surface uppercase tracking-wider">
                      Curated Wishlist
                    </h2>
                    <span className="text-[11px] text-secondary font-light">
                      Your saved masterpieces, wedding collections, and event elements.
                    </span>
                  </div>

                  {wishlistItems && wishlistItems.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                      <AnimatePresence>
                        <React.Suspense fallback={<div className="animate-pulse h-32 bg-surface-bright rounded-lg"></div>}>
                          {wishlistItems.map((item, idx) => (
                            <ProductCard
                              key={item._id || idx}
                              product={item}
                              isWishlistRoute={true}
                              onRemove={() => removeFromWishlist(item._id)}
                            />
                          ))}
                        </React.Suspense>
                      </AnimatePresence>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center py-20 bg-surface-bright rounded-xl border border-outline-variant/40 shadow-xs relative overflow-hidden">
                      <span className="material-symbols-outlined text-[48px] text-primary/20 mb-4" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
                      <h3 className="font-display text-xl text-on-surface mb-2 font-medium">Curated Gallery Empty</h3>
                      <p className="text-[11px] text-secondary font-light max-w-sm mx-auto mb-6">
                        Your wishlist is completely empty. Explore the shop to save event masterpieces!
                      </p>
                      <Link to="/products" className="bg-primary text-surface px-8 py-3 rounded-full font-bold uppercase tracking-[0.2em] text-[9px] hover:bg-on-surface transition-colors shadow-md">
                        Explore Collection
                      </Link>
                    </div>
                  )}
                </motion.div>
              )}

              {/* TAB 6: DYNAMIC SHOPPING BAG */}
              {activeTab === "cart" && (
                <motion.div
                  id="panel-cart"
                  role="tabpanel"
                  key="tab-cart"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  <div className="bg-surface-bright border border-outline-variant/40 rounded-lg p-5 shadow-xs">
                    <div>
                      <h2 className="font-bold text-base text-on-surface uppercase tracking-wider">
                        My Shopping Bag
                      </h2>
                      <span className="text-[11px] text-secondary font-light">
                        Items currently reserved for your signature verification and checkout session.
                      </span>
                    </div>
                  </div>

                  {cartItems && cartItems.length > 0 ? (
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                        {cartItems.map((item) => {
                          const prod = item.product || item;
                          return <ProductCard key={prod._id || prod.id} {...prod} imageSrc={prod.imageSrc || prod.images?.[0]} />;
                        })}
                      </div>
                      <div className="pt-4 flex justify-end">
                        <Link
                          to="/cart"
                          className="btn-primary px-8 py-3 rounded-full font-bold uppercase tracking-widest text-[10px] inline-flex items-center gap-2 cursor-pointer shadow-md"
                        >
                          <span>Secure Entire Bag</span>
                          <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center py-20 bg-surface-bright rounded-xl border border-outline-variant/40 shadow-xs relative overflow-hidden">
                      <span className="material-symbols-outlined text-[48px] text-primary/20 mb-4">shopping_bag</span>
                      <h3 className="font-display text-xl text-on-surface mb-2 font-medium">Your Bag is Empty</h3>
                      <p className="text-[11px] text-secondary font-light max-w-sm mx-auto mb-6">
                        Your shopping bag is completely empty. Start browsing our curated catalog to reserve your event pieces.
                      </p>
                      <Link to="/products" className="bg-primary text-surface px-8 py-3 rounded-full font-bold uppercase tracking-[0.2em] text-[9px] hover:bg-on-surface transition-colors shadow-md">
                        Browse Boutique
                      </Link>
                    </div>
                  )}
                </motion.div>
              )}

              {/* TAB 7: RECENTLY VIEWED PRODUCTS */}
              {activeTab === "recently-viewed" && (
                <motion.div
                  id="panel-recently-viewed"
                  role="tabpanel"
                  key="tab-recently-viewed"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  <div className="bg-surface-bright border border-outline-variant/40 rounded-lg p-5 shadow-xs">
                    <h2 className="font-bold text-base text-on-surface uppercase tracking-wider">
                      Recently Viewed Masterpieces
                    </h2>
                    <span className="text-[11px] text-secondary font-light">
                      A list of the products and spec-sheets you opened in your active verified session.
                    </span>
                  </div>

                  {isLoadingRecentlyViewed ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="h-44 bg-white border border-outline-variant/20 rounded-lg animate-pulse" />
                      <div className="h-44 bg-white border border-outline-variant/20 rounded-lg animate-pulse" />
                    </div>
                  ) : recentlyViewed && recentlyViewed.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                      <AnimatePresence>
                        {recentlyViewed.map((item) => {
                          const prod = item.product;
                          if (!prod) return null;
                          return <ProductCard key={prod._id || prod.id} {...prod} imageSrc={prod.imageSrc || prod.images?.[0]} />;
                        })}
                      </AnimatePresence>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center py-20 bg-surface-bright rounded-xl border border-outline-variant/40 shadow-xs relative overflow-hidden">
                      <span className="material-symbols-outlined text-[48px] text-primary/20 mb-4">history</span>
                      <h3 className="font-display text-xl text-on-surface mb-2 font-medium">No Session History</h3>
                      <p className="text-[11px] text-secondary font-light max-w-sm mx-auto mb-6">
                        No recently viewed items tracked yet. Open any spec-sheet from the boutique to build your session history!
                      </p>
                      <Link to="/products" className="bg-primary text-surface px-8 py-3 rounded-full font-bold uppercase tracking-[0.2em] text-[9px] hover:bg-on-surface transition-colors shadow-md">
                        Discover Pieces
                      </Link>
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === "loyalty" && (
                <motion.div
                  id="panel-loyalty"
                  role="tabpanel"
                  key="tab-loyalty"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.3 }}
                >
                  <React.Suspense fallback={<div className="animate-pulse h-32 bg-surface-bright rounded-lg"></div>}>
                    <LoyaltyPanel />
                  </React.Suspense>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* RETAINED ROTATING MANDALA FORM BACKDROP MODAL CONTAINER */}
      <AnimatePresence>
        {isAddressModalOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddressModalOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            />

            {/* Modal Container */}
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 lg:top-1/2 lg:left-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:bottom-auto lg:max-w-lg w-full bg-white rounded-t-3xl lg:rounded-2xl shadow-2xl z-[101] overflow-hidden"
            >
              
              {/* Rotating Gold Mandala Overlay */}
              <div className="absolute inset-0 pointer-events-none select-none overflow-hidden opacity-[0.04] z-0">
                <MandalaElement
                  size={320}
                  duration={60}
                  variant={3}
                  opacity={1}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary"
                />
              </div>

              <div className="p-6 relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-display text-lg text-on-surface uppercase tracking-wider">
                    {editingAddressId === "new"
                      ? "Add New Site Parameters"
                      : "Modify Site Parameters"}
                  </h3>
                  <button
                    onClick={() => setIsAddressModalOpen(false)}
                    className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-secondary hover:text-primary transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-base">
                      close
                    </span>
                  </button>
                </div>

                <form onSubmit={handleAddressSave} className="space-y-4">
                  {/* Premium GPS Geotargeting Action */}
                  <div className="flex items-center justify-between pb-2 border-b border-outline-variant/15">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-secondary flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-xs">pin_drop</span>
                      Location Coordinates
                    </span>
                    <button
                      type="button"
                      onClick={handleUseCurrentLocation}
                      disabled={isDetectingLocation}
                      className="inline-flex items-center gap-1.5 text-[9px] text-primary font-bold uppercase tracking-widest bg-primary/5 hover:bg-primary/10 border border-primary/20 px-3.5 py-1.5 rounded-full cursor-pointer transition-all disabled:opacity-50 shadow-xs"
                    >
                      {isDetectingLocation ? (
                        <>
                          <div className="w-3 h-3 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                          <span>Locating...</span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-[12px] font-bold">my_location</span>
                          <span>Use Current Location</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Render Geolocation Pill Badge */}
                  {addressFormData.latitude && addressFormData.longitude && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 text-[10px] text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-lg font-bold uppercase tracking-wider"
                    >
                      <span className="material-symbols-outlined text-xs">share_location</span>
                      <span>GPS Locked: {addressFormData.latitude.toFixed(6)}, {addressFormData.longitude.toFixed(6)}</span>
                    </motion.div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="dashboard-address-name" className="block text-[9px] uppercase font-bold text-secondary tracking-widest mb-1">
                        Receiver Full Name
                      </label>
                      <input
                        id="dashboard-address-name"
                        type="text"
                        required
                        autoComplete="name"
                        placeholder="John Doe"
                        className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg px-4 py-2.5 text-xs outline-none focus:border-primary transition-all font-semibold"
                        value={addressFormData.name}
                        onChange={(e) =>
                          setAddressFormData({
                            ...addressFormData,
                            name: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label htmlFor="dashboard-address-phone" className="block text-[9px] uppercase font-bold text-secondary tracking-widest mb-1">
                        Contact Phone Number
                      </label>
                      <input
                        id="dashboard-address-phone"
                        type="tel"
                        required
                        autoComplete="tel"
                        placeholder="10-digit number"
                        className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg px-4 py-2.5 text-xs outline-none focus:border-primary transition-all font-semibold"
                        value={addressFormData.phone}
                        onChange={(e) =>
                          setAddressFormData({
                            ...addressFormData,
                            phone: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="dashboard-address-pincode" className="block text-[9px] uppercase font-bold text-secondary tracking-widest mb-1">
                        6-Digit Pincode
                      </label>
                      <input
                        id="dashboard-address-pincode"
                        type="text"
                        required
                        autoComplete="postal-code"
                        placeholder="e.g. 560041"
                        className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg px-4 py-2.5 text-xs outline-none focus:border-primary transition-all font-semibold"
                        value={addressFormData.pincode}
                        onChange={(e) =>
                          setAddressFormData({
                            ...addressFormData,
                            pincode: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label htmlFor="dashboard-address-locality" className="block text-[9px] uppercase font-bold text-secondary tracking-widest mb-1">
                        Locality / Sector
                      </label>
                      <input
                        id="dashboard-address-locality"
                        type="text"
                        required
                        autoComplete="address-level3"
                        placeholder="e.g. Sector 4 / Jayanagar"
                        className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg px-4 py-2.5 text-xs outline-none focus:border-primary transition-all font-semibold"
                        value={addressFormData.locality}
                        onChange={(e) =>
                          setAddressFormData({
                            ...addressFormData,
                            locality: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="dashboard-address-street" className="block text-[9px] uppercase font-bold text-secondary tracking-widest mb-1">
                      Street Address & Building Details
                    </label>
                    <textarea
                      id="dashboard-address-street"
                      required
                      autoComplete="street-address"
                      placeholder="Flat, House no., Building, Apartment details"
                      className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg px-4 py-2.5 text-xs outline-none focus:border-primary transition-all min-h-[70px] font-semibold"
                      value={addressFormData.addressString}
                      onChange={(e) =>
                        setAddressFormData({
                          ...addressFormData,
                          addressString: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-1">
                      <label htmlFor="dashboard-address-city" className="block text-[9px] uppercase font-bold text-secondary tracking-widest mb-1">
                        City / District
                      </label>
                      <input
                        id="dashboard-address-city"
                        type="text"
                        required
                        autoComplete="address-level2"
                        placeholder="City"
                        className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg px-4 py-2.5 text-xs outline-none focus:border-primary transition-all font-semibold"
                        value={addressFormData.city}
                        onChange={(e) =>
                          setAddressFormData({
                            ...addressFormData,
                            city: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="col-span-1">
                      <label htmlFor="dashboard-address-state" className="block text-[9px] uppercase font-bold text-secondary tracking-widest mb-1">
                        State
                      </label>
                      <input
                        id="dashboard-address-state"
                        type="text"
                        required
                        autoComplete="address-level1"
                        placeholder="State"
                        className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg px-4 py-2.5 text-xs outline-none focus:border-primary transition-all font-semibold"
                        value={addressFormData.state}
                        onChange={(e) =>
                          setAddressFormData({
                            ...addressFormData,
                            state: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="col-span-1">
                      <label className="block text-[9px] uppercase font-bold text-secondary tracking-widest mb-1">
                        Destination Type
                      </label>
                      <select
                        value={addressFormData.tag}
                        onChange={(e) =>
                          setAddressFormData({
                            ...addressFormData,
                            tag: e.target.value,
                          })
                        }
                        className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg px-2 py-2.5 text-xs outline-none focus:border-primary transition-all font-semibold cursor-pointer"
                      >
                        <option value="Home">Home</option>
                        <option value="Work">Work</option>
                        <option value="Venue">Venue</option>
                        <option value="Warehouse">Warehouse</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 pt-4">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      disabled={isAddressSaving}
                      type="submit"
                      className="flex-1 btn-primary py-3 rounded-full font-bold uppercase tracking-widest text-[10px] cursor-pointer inline-flex items-center justify-center gap-1.5"
                    >
                      {isAddressSaving ? (
                        <div className="w-3 h-3 border-2 border-surface/20 border-t-surface rounded-full animate-spin" />
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-xs">save</span>
                          <span>{editingAddressId === "new" ? "Add Address" : "Save Changes"}</span>
                        </>
                      )}
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="button"
                      onClick={() => setIsAddressModalOpen(false)}
                      className="flex-1 btn-outline py-3 rounded-full font-bold uppercase tracking-widest text-[10px] cursor-pointer"
                    >
                      Cancel
                    </motion.button>
                  </div>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {reviewingProduct && (
          <WriteReviewModal
            productId={reviewingProduct.productId}
            productTitle={reviewingProduct.productTitle}
            onClose={() => setReviewingProduct(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedInvoiceOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-on-surface/40 backdrop-blur-sm"
            onClick={() => setSelectedInvoiceOrder(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-surface w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl"
            >
              <React.Suspense fallback={<div className="p-8 text-center">Loading Invoice Template...</div>}>
                <InvoiceTemplate 
                  order={selectedInvoiceOrder} 
                  user={user} 
                  onClose={() => setSelectedInvoiceOrder(null)} 
                />
              </React.Suspense>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
