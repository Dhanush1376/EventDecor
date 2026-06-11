import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { m as motion, AnimatePresence } from 'framer-motion';
import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';
import { SEO } from '../components/seo/SEO';
import { useAuth } from '../context/AuthContext';
import { userService } from '../services/domainServices';
import { MandalaElement } from '../components/ui/MandalaElement';
import { WriteReviewModal } from '../components/sections/ProductReviews';
import toast from 'react-hot-toast';
import Barcode from 'react-barcode';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';
import { OptimizedImage } from '../components/ui/OptimizedImage';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default marker icon resolution in Vite builds
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const InvoiceTemplate = React.lazy(() =>
  import('../components/ui').then((m) => ({ default: m.InvoiceTemplate })),
);
const ProductCard = React.lazy(() =>
  import('../components/ui').then((m) => ({ default: m.ProductCard })),
);
const LoyaltyPanel = React.lazy(() =>
  import('../components/loyalty/LoyaltyPanel').then((m) => ({ default: m.LoyaltyPanel })),
);
const EventCustomerDashboard = React.lazy(() =>
  import('./EventCustomerDashboard').then((m) => ({ default: m.EventCustomerDashboard })),
);
const RecommendationSystem = React.lazy(() =>
  import('../components/sections/RecommendationSystem').then((m) => ({
    default: m.RecommendationSystem,
  })),
);

import { useWebsiteContent } from '../hooks/useWebsiteContent';
import { useDashboardData } from '../hooks/useDashboardData';
import { useTrendingRecommendations } from '../hooks/useRecommendationQueries';
import { OrdersListSkeleton, ProductCardSkeleton, Skeleton } from '../components/ui/Skeleton';

import logger from '../utils/logger';

const getStatusStyles = (status) => {
  const s = status?.toLowerCase() || '';
  if (['delivered', 'completed', 'returned'].includes(s)) {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  }
  if (['confirmed', 'processing', 'shipped', 'active rental'].includes(s)) {
    return 'bg-amber-50 text-amber-800 border border-amber-200';
  }
  if (['cancelled'].includes(s)) {
    return 'bg-rose-50 text-rose-700 border border-rose-200';
  }
  if (['return requested', 'pickup scheduled'].includes(s)) {
    return 'bg-purple-50 text-purple-700 border border-purple-200';
  }
  return 'bg-surface-container text-secondary border border-outline-variant/30';
};

// Dynamic GPS Map Component using Leaflet
const GPSMap = ({ address }) => {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [coords, setCoords] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    const resolveCoords = async () => {
      if (!address) {
        if (isMounted) {
          setCoords([31.224, 75.7708]); // Default to Phagwara
          setIsLoading(false);
        }
        return;
      }

      if (address.latitude && address.longitude) {
        const lat = parseFloat(address.latitude);
        const lng = parseFloat(address.longitude);
        if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
          if (isMounted) {
            setCoords([lat, lng]);
            setIsLoading(false);
          }
          return;
        }
      }

      // Try geocoding using Nominatim
      try {
        const queryParts = [];
        if (address.city) queryParts.push(address.city);
        if (address.state) queryParts.push(address.state);
        if (address.pincode) queryParts.push(address.pincode);
        queryParts.push('India');

        const query = encodeURIComponent(queryParts.join(', '));
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`,
        );
        if (res.ok) {
          const data = await res.json();
          if (data && data.length > 0) {
            const lat = parseFloat(data[0].lat);
            const lng = parseFloat(data[0].lon);
            if (!isNaN(lat) && !isNaN(lng)) {
              if (isMounted) {
                setCoords([lat, lng]);
                setIsLoading(false);
              }
              return;
            }
          }
        }
      } catch (err) {
        console.error('Error geocoding address:', err);
      }

      // Fallbacks
      if (isMounted) {
        const lowerCity = (address.city || '').toLowerCase();
        const lowerState = (address.state || '').toLowerCase();
        if (lowerCity.includes('phagwara') || lowerState.includes('punjab')) {
          setCoords([31.224, 75.7708]);
        } else if (lowerCity.includes('ongole') || lowerState.includes('andhra')) {
          setCoords([15.5057, 80.0499]);
        } else if (lowerCity.includes('delhi')) {
          setCoords([28.6139, 77.209]);
        } else if (lowerCity.includes('mumbai') || lowerState.includes('maharashtra')) {
          setCoords([19.076, 72.8777]);
        } else if (
          lowerCity.includes('bangalore') ||
          lowerCity.includes('bengaluru') ||
          lowerState.includes('karnataka')
        ) {
          setCoords([12.9716, 77.5946]);
        } else {
          setCoords([31.224, 75.7708]); // Default Phagwara
        }
        setIsLoading(false);
      }
    };

    resolveCoords();

    return () => {
      isMounted = false;
    };
  }, [address]);

  useEffect(() => {
    if (isLoading || !coords || !mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    try {
      const map = L.map(mapContainerRef.current, {
        center: coords,
        zoom: 13,
        zoomControl: false,
        attributionControl: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map);

      const goldMarkerIcon = L.divIcon({
        html: `
          <div class="flex flex-col items-center">
            <svg class="w-8 h-8 text-[#8c7335] drop-shadow-md filter drop-shadow-[0_4px_6px_rgba(140,115,53,0.4)]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
            </svg>
            <div class="w-2.5 h-1 bg-black/20 rounded-full blur-[1px] -mt-0.5" />
          </div>
        `,
        className: 'custom-gold-marker',
        iconSize: [32, 42],
        iconAnchor: [16, 42],
      });

      L.marker(coords, { icon: goldMarkerIcon }).addTo(map);

      mapInstanceRef.current = map;
    } catch (err) {
      console.error('Leaflet initialization failed:', err);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isLoading, coords]);

  if (isLoading) {
    return (
      <div className="w-full h-full bg-slate-50 flex items-center justify-center rounded-lg">
        <div className="flex flex-col items-center gap-2">
          <div className="w-6 h-6 border-2 border-[#8c7335] border-t-transparent rounded-full animate-spin" />
          <span className="text-[9px] text-[#8c7335] font-bold uppercase tracking-wider">
            Syncing GPS...
          </span>
        </div>
      </div>
    );
  }

  return <div ref={mapContainerRef} className="w-full h-full z-0 rounded-lg overflow-hidden" />;
};

export function Dashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, logout, checkAuth, openAuthModal } = useAuth();
  const { items: wishlistItems, removeItem: removeFromWishlist } = useWishlist();
  const { cartCount, items: cartItems, updateQuantity, removeItem } = useCart();
  const fileInputRef = useRef(null);

  const { contact } = useWebsiteContent();
  const addressText =
    contact?.address ||
    'Siri Arts & Crafts, #28-1-92, South Street, ONGOLE-523001, Prakasam District, Andhra Pradesh';
  const rawPhone = import.meta.env.VITE_CONTACT_PHONE || contact?.phone || '9866006648';
  const phoneText = rawPhone.replace(/^\+91/, '').replace(/^91/, '').trim();

  const whatsappNum = rawPhone.replace(/[^0-9]/g, '');
  const formattedWhatsappNum = whatsappNum.length === 10 ? `91${whatsappNum}` : whatsappNum;
  const whatsappUrl = `https://wa.me/${formattedWhatsappNum}`;

  const [activeTab, setActiveTab] = useState('profile');
  const [mobileShowContent, setMobileShowContent] = useState(false);

  // Sync tab from URL query params
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (
      tabParam &&
      [
        'profile',
        'orders',
        'rentals',
        'addresses',
        'wishlist',
        'preferences',
        'loyalty',
        'bookings',
      ].includes(tabParam)
    ) {
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
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [selectedOrderItemIndex, setSelectedOrderItemIndex] = useState(0);
  const [isPriceDetailsOpen, setIsPriceDetailsOpen] = useState(true);

  useEffect(() => {
    setSelectedOrderId(null);
  }, [activeTab]);

  const userId = user?._id || user?.id;

  const {
    orders,
    rentals,
    setOrders,
    addresses,
    setAddresses,
    recentlyViewed,
    setRecentlyViewed,
    isOrdersLoading,
    isRentalsLoading,
    isAddressesLoading,
    isLoadingRecentlyViewed,
    refetch: refetchDashboardData,
  } = useDashboardData(userId);

  // Profile forms
  const [profileForm, setProfileForm] = useState({
    name: '',
    phone: '',
    gender: '',
    dateOfBirth: '',
  });

  // Preference forms
  const [prefsForm, setPrefsForm] = useState({
    email: true,
    marketing: true,
    theme: 'light',
    language: 'en',
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
          name: user.name || '',
          phone: user.phone || '',
          gender: user.gender || '',
          dateOfBirth: user.dateOfBirth || '',
        });

        setPrefsForm({
          email: user.notificationPreferences?.email !== false,
          marketing: user.notificationPreferences?.marketing !== false,
          theme: user.accountPreferences?.theme || 'light',
          language: user.accountPreferences?.language || 'en',
        });
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [user]);

  const [orderFilter, setOrderFilter] = useState('ALL');

  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    if (orderFilter === 'DELIVERED') return orders.filter((o) => o.orderStatus === 'delivered');
    if (orderFilter === 'ON_THE_WAY')
      return orders.filter((o) =>
        ['confirmed', 'processing', 'shipped'].includes(o.orderStatus?.toLowerCase()),
      );
    if (orderFilter === 'RENTAL')
      return orders.filter(
        (o) => o.orderType === 'rental' || o.items?.some((i) => i.type === 'rental'),
      );
    if (orderFilter === 'PURCHASE')
      return orders.filter(
        (o) => o.orderType !== 'rental' && !o.items?.some((i) => i.type === 'rental'),
      );
    return orders;
  }, [orders, orderFilter]);

  // Dashboard counts
  const dashboardCounts = useMemo(() => {
    if (!orders) return { activeRentals: 0, upcomingReturns: 0, purchaseOrders: 0 };
    return {
      activeRentals: orders.filter(
        (o) =>
          (o.orderType === 'rental' || o.items?.some((i) => i.type === 'rental')) &&
          !['completed', 'cancelled', 'returned'].includes(o.orderStatus?.toLowerCase()),
      ).length,
      upcomingReturns: orders.filter(
        (o) =>
          (o.orderType === 'rental' || o.items?.some((i) => i.type === 'rental')) &&
          ['delivered', 'active rental', 'return requested'].includes(o.orderStatus?.toLowerCase()),
      ).length,
      purchaseOrders: orders.filter(
        (o) => o.orderType !== 'rental' && !o.items?.some((i) => i.type === 'rental'),
      ).length,
    };
  }, [orders]);

  const orderItems = useMemo(() => {
    const list = [];
    filteredOrders.forEach((order) => {
      order.items?.forEach((item, itemIdx) => {
        list.push({ order, item, itemIdx });
      });
    });
    return list;
  }, [filteredOrders]);

  const selectedOrder = useMemo(() => {
    return orders?.find((o) => (o._id || o.id) === selectedOrderId);
  }, [orders, selectedOrderId]);

  const selectedItem = useMemo(() => {
    if (!selectedOrder) return null;
    return selectedOrder.items?.[selectedOrderItemIndex];
  }, [selectedOrder, selectedOrderItemIndex]);

  useEffect(() => {
    if (selectedOrderId && orders && !selectedOrder) {
      setSelectedOrderId(null);
    }
  }, [orders, selectedOrderId, selectedOrder]);

  // Profile Save
  const handleProfileSave = async (e) => {
    e.preventDefault();
    if (!profileForm.name.trim()) {
      toast.error('Full name cannot be blank');
      return;
    }
    setIsUpdatingProfile(true);
    try {
      const res = await userService.updateProfile(profileForm);
      if (res.success) {
        toast.success('Profile information updated successfully!');
        await checkAuth(); // Reload global user state
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile details');
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
        toast.success('Preferences saved successfully!');
        await checkAuth();
      }
    } catch (err) {
      toast.error('Failed to save preference settings');
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

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file format');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image file size should not exceed 2MB');
      return;
    }

    const formData = new FormData();
    formData.append('avatar', file);

    setIsUploadingAvatar(true);
    const toastId = toast.loading('Uploading secure avatar image...');
    try {
      const res = await userService.uploadAvatar(formData);
      if (res.success) {
        toast.success('Profile avatar updated successfully!', { id: toastId });
        await checkAuth();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload avatar', { id: toastId });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // Address Handlers
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    setIsDetectingLocation(true);
    const toastId = toast.loading('Accessing device GPS coordinates...');

    const geoOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    };

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          toast.loading('Resolving coordinates to address details...', { id: toastId });
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
            {
              headers: {
                'Accept-Language': 'en',
              },
            },
          );

          if (!res.ok) throw new Error('Reverse lookup failed');

          const data = await res.json();
          if (data && data.address) {
            const addr = data.address;
            const road = addr.road || addr.suburb || addr.neighbourhood || '';
            const locality = addr.suburb || addr.neighbourhood || addr.city_district || '';
            const city = addr.city || addr.town || addr.village || addr.county || '';
            const state = addr.state || '';
            const pincode = addr.postcode || '';

            // Construct readable street details
            const streetParts = [addr.house_number, addr.building, addr.road].filter(Boolean);
            const addressString =
              streetParts.length > 0
                ? streetParts.join(', ')
                : data.display_name.split(',').slice(0, 3).join(',').trim();

            setAddressFormData((prev) => ({
              ...prev,
              pincode: pincode.replace(/\s/g, ''), // clean pincode spacing
              locality: locality || road || 'Local Area',
              addressString: addressString || data.display_name,
              city: city,
              state: state,
              latitude,
              longitude,
            }));

            toast.success('Location tracking successful! Parameters updated.', { id: toastId });
          } else {
            toast.error('Unable to parse address components from coordinates.', { id: toastId });
          }
        } catch (error) {
          logger.error('Reverse geocoding failure:', error);
          toast.error('Failed to map coordinates to a clean street address.', { id: toastId });
        } finally {
          setIsDetectingLocation(false);
        }
      },
      (error) => {
        setIsDetectingLocation(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            toast.error('Location access denied by your device.', { id: toastId });
            break;
          case error.POSITION_UNAVAILABLE:
            toast.error('GPS position parameters unavailable.', { id: toastId });
            break;
          case error.TIMEOUT:
            toast.error('Location tracking request timed out.', { id: toastId });
            break;
          default:
            toast.error('An unknown geotracking error occurred.', { id: toastId });
        }
      },
      geoOptions,
    );
  };

  const handleAddressEdit = (addr) => {
    setEditingAddressId(addr._id || addr.id);
    setAddressFormData({
      id: addr._id || addr.id,
      name: addr.name || '',
      phone: addr.phone || '',
      pincode: addr.pincode || '',
      locality: addr.locality || '',
      addressString: addr.addressString || '',
      city: addr.city || '',
      state: addr.state || '',
      tag: addr.tag || 'Home',
      latitude: addr.latitude || null,
      longitude: addr.longitude || null,
    });
    setIsAddressModalOpen(true);
  };

  const handleAddressSave = async (e) => {
    e.preventDefault();

    // Validations
    if (!addressFormData.phone || addressFormData.phone.length < 10) {
      toast.error('Please enter a valid 10-digit mobile number');
      return;
    }
    if (!addressFormData.pincode || addressFormData.pincode.length !== 6) {
      toast.error('Please enter a valid 6-digit postal pincode');
      return;
    }

    setIsAddressSaving(true);
    try {
      if (editingAddressId === 'new') {
        await userService.addAddress(addressFormData);
        toast.success('New address added successfully!');
      } else {
        await userService.updateAddress(editingAddressId, addressFormData);
        toast.success('Address modified successfully!');
      }
      await fetchAddressesList();
      setIsAddressModalOpen(false);
      setEditingAddressId(null);
      setAddressFormData(null);
    } catch (err) {
      toast.error('Failed to store address information');
    } finally {
      setIsAddressSaving(false);
    }
  };

  const handleDeleteAddress = async (id) => {
    if (!window.confirm('Are you sure you want to delete this address?')) return;
    const toastId = toast.loading('Removing address...');
    try {
      await userService.deleteAddress(id);
      toast.success('Address deleted successfully!', { id: toastId });
      await fetchAddressesList();
    } catch (err) {
      toast.error('Failed to delete address', { id: toastId });
    }
  };

  const handleSetDefaultAddress = async (id) => {
    const toastId = toast.loading('Setting default parameters...');
    try {
      await userService.setDefaultAddress(id);
      toast.success('Default delivery address set!', { id: toastId });
      await fetchAddressesList();
    } catch (err) {
      toast.error('Failed to set default address', { id: toastId });
    }
  };

  const downloadInvoice = (orderId) => {
    const targetOrder = orders.find((o) => (o._id || o.id) === orderId);
    if (targetOrder) {
      setSelectedInvoiceOrder(targetOrder);
    } else {
      toast.error('Invoice data currently unavailable. Refreshing feed.');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="bg-surface-container-low min-h-screen pt-24 pb-32 font-body text-on-surface modern-sans-headings"
    >
      <SEO
        title="Your Premium Studio Account"
        description="Manage your Siri Arts & Crafts profile parameters, live orders, dynamic shipping addresses, wishlist collections, and personalized newsletter configurations."
      />

      <div className="max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop">
        <div className="mb-6 border-b border-outline-variant/20 pb-3 flex justify-between items-center gap-4">
          {/* Mobile Back Button Navigation */}
          <div className="md:hidden flex-1 min-w-0">
            {mobileShowContent ? (
              selectedOrderId ? (
                <button
                  onClick={() => setSelectedOrderId(null)}
                  className="text-[11px] text-secondary hover:text-primary transition-colors cursor-pointer uppercase font-bold flex items-center gap-1 bg-transparent border-0 p-0"
                >
                  <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                  <span>My Order History</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    setSelectedOrderId(null);
                    setMobileShowContent(false);
                  }}
                  className="text-[11px] text-secondary hover:text-primary transition-colors cursor-pointer uppercase font-bold flex items-center gap-1 bg-transparent border-0 p-0"
                >
                  <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                  <span>My Account</span>
                </button>
              )
            ) : (
              <Link
                to="/"
                className="text-[11px] text-secondary hover:text-primary transition-colors cursor-pointer uppercase font-bold flex items-center gap-1 bg-transparent border-0 p-0"
              >
                <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                <span>Home</span>
              </Link>
            )}
          </div>

          {/* Desktop Breadcrumbs Navigation */}
          <nav className="hidden md:flex text-[11px] text-secondary flex-wrap items-center gap-2 tracking-wider uppercase font-bold flex-1 min-w-0">
            <Link to="/" className="hover:text-primary transition-colors">
              Home
            </Link>
            <span className="text-outline-variant/50">/</span>
            <button
              onClick={() => {
                setSelectedOrderId(null);
                setMobileShowContent(false);
              }}
              className={`hover:text-primary transition-colors cursor-pointer uppercase ${!mobileShowContent ? 'text-on-surface' : ''}`}
            >
              My Account
            </button>
            {mobileShowContent && (
              <>
                <span className="text-outline-variant/50">/</span>
                {activeTab === 'profile' && (
                  <span className="text-on-surface">Profile Settings</span>
                )}
                {activeTab === 'orders' &&
                  (selectedOrderId ? (
                    <>
                      <button
                        onClick={() => setSelectedOrderId(null)}
                        className="hover:text-primary transition-colors cursor-pointer uppercase text-secondary font-bold bg-transparent border-0 p-0"
                      >
                        My Order History
                      </button>
                      <span className="text-outline-variant/50">/</span>
                      <span className="text-on-surface">Order Details</span>
                    </>
                  ) : (
                    <span className="text-on-surface">My Order History</span>
                  ))}
                {activeTab === 'rentals' && <span className="text-on-surface">My Rentals</span>}
                {activeTab === 'bookings' && (
                  <span className="text-on-surface">My Event Bookings</span>
                )}
                {activeTab === 'addresses' && (
                  <span className="text-on-surface">Delivery Sites</span>
                )}
                {activeTab === 'wishlist' && (
                  <span className="text-on-surface">Curated Wishlist</span>
                )}
                {activeTab === 'cart' && <span className="text-on-surface">My Shopping Bag</span>}
                {activeTab === 'recently-viewed' && (
                  <span className="text-on-surface">Recently Viewed</span>
                )}
                {activeTab === 'preferences' && (
                  <span className="text-on-surface">Platform Preferences</span>
                )}
                {activeTab === 'loyalty' && <span className="text-on-surface">Loyalty Club</span>}
              </>
            )}
          </nav>

          <div className="flex-shrink-0 pt-0.5 ml-auto">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] font-bold uppercase tracking-wider text-primary hover:text-primary-dark transition-colors inline-flex items-center gap-1.5 cursor-pointer bg-transparent border-0 p-0"
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.003 5.324 5.328 0 11.94 0c3.205.001 6.216 1.248 8.48 3.515 2.264 2.268 3.51 5.282 3.508 8.491-.004 6.618-5.33 11.942-11.943 11.942-1.999-.001-3.963-.5-5.724-1.455L0 24zm6.59-4.846c1.66.986 3.298 1.448 5.28 1.449 5.4 0 9.794-4.397 9.797-9.798.001-2.615-1.015-5.074-2.862-6.924C16.96 1.983 14.502 1.002 11.94 1.002c-5.398 0-9.794 4.396-9.797 9.797-.001 2.083.548 4.12 1.588 5.922l-.993 3.623 3.71-.973zm11.233-5.267c-.287-.144-1.697-.838-1.958-.934-.26-.096-.45-.144-.64.144-.19.287-.736.934-.903 1.122-.167.188-.334.21-.62.067-.287-.144-1.21-.446-2.305-1.424-.853-.76-1.428-1.7-1.595-1.986-.167-.288-.018-.443.125-.585.13-.127.287-.335.43-.503.144-.167.19-.287.287-.479.096-.192.048-.36-.024-.503-.072-.144-.64-1.54-.877-2.115-.23-.553-.463-.478-.64-.488-.166-.008-.356-.01-.546-.01-.19 0-.501.071-.762.355-.26.287-1.002.979-1.002 2.39 0 1.411 1.026 2.776 1.17 2.968.143.192 2.019 3.083 4.89 4.323.683.296 1.217.473 1.633.606.688.218 1.314.187 1.81.113.553-.082 1.697-.694 1.937-1.365.24-.672.24-1.246.167-1.366-.073-.12-.26-.192-.547-.337z" />
              </svg>
              <span>Need Help?</span>
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-6">
          {/* LEFT SIDEBAR NAVIGATION PANEL */}
          <div
            className={`col-span-1 md:col-span-2 lg:col-span-3 space-y-4 ${mobileShowContent ? 'hidden md:block' : 'block'}`}
          >
            {/* Dynamic Avatar & Basic Info Card */}
            <div className="bg-surface-bright border border-outline-variant/40 rounded-lg p-5 flex flex-col items-center text-center shadow-xs relative group overflow-hidden">
              {/* Profile Image with Edit Overlay */}
              <div
                onClick={handleAvatarClick}
                className="w-20 h-20 rounded-full border border-outline-variant/50 relative overflow-hidden bg-surface-container flex items-center justify-center cursor-pointer shadow-sm group/avatar hover:border-primary transition-colors"
              >
                {isUploadingAvatar ? (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10">
                    <div className="skeleton-box inline-block w-6 h-6 rounded-md" />
                  </div>
                ) : null}

                {user?.avatar ? (
                  <OptimizedImage
                    src={user.avatar}
                    alt={user.name || 'Avatar'}
                    className="w-full h-full object-cover"
                    priority={true}
                  />
                ) : (
                  <span className="font-display text-[26px] text-primary font-light">
                    {user?.name ? user.name.substring(0, 2).toUpperCase() : 'AT'}
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
                    <button
                      onClick={openAuthModal}
                      className="text-xs font-bold text-primary hover:underline mt-1 block w-full text-center cursor-pointer bg-transparent border-none outline-none"
                    >
                      Login
                    </button>
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
                      <span
                        className={`text-[9px] px-2 py-0.5 rounded-full border tracking-wider font-semibold uppercase ${
                          user.isVerified
                            ? 'bg-green-50/70 text-green-700 border-green-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {user.isVerified ? '✔ Verified Session' : 'Pending Verification'}
                      </span>

                      {user.createdAt && (
                        <span className="text-[9px] text-secondary/50 font-medium">
                          Joined{' '}
                          {new Date(user.createdAt).toLocaleString('default', {
                            month: 'long',
                            year: 'numeric',
                          })}
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
                  Orders
                </div>

                <motion.button
                  role="tab"
                  aria-selected={activeTab === 'orders'}
                  whileHover={{ x: 3 }}
                  onClick={() => {
                    setActiveTab('orders');
                    setOrderFilter('ALL');
                    setMobileShowContent(true);
                  }}
                  className={`w-full text-left px-8 py-2.5 font-medium text-[12px] flex items-center justify-between transition-colors cursor-pointer outline-none ${
                    activeTab === 'orders'
                      ? 'text-primary font-bold bg-primary/5 border-l-2 border-primary'
                      : 'text-on-surface hover:bg-surface-container-low'
                  }`}
                >
                  <span>My Order History</span>
                  <span className="material-symbols-outlined text-xs">chevron_right</span>
                </motion.button>

                <motion.button
                  role="tab"
                  aria-selected={activeTab === 'rentals'}
                  whileHover={{ x: 3 }}
                  onClick={() => {
                    setActiveTab('rentals');
                    setOrderFilter('RENTAL');
                    setMobileShowContent(true);
                  }}
                  className={`w-full text-left px-8 py-2.5 font-medium text-[12px] flex items-center justify-between transition-colors cursor-pointer outline-none ${
                    activeTab === 'rentals'
                      ? 'text-primary font-bold bg-primary/5 border-l-2 border-primary'
                      : 'text-on-surface hover:bg-surface-container-low'
                  }`}
                >
                  <span>My Rentals</span>
                  <span className="material-symbols-outlined text-xs text-[#8c7335]">
                    inventory_2
                  </span>
                </motion.button>
              </div>

              <div className="border-b border-surface-container">
                <div className="px-4 py-3 bg-surface-container-low text-secondary font-bold text-[11px] uppercase tracking-wider flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-primary">person</span>
                  Profile
                </div>

                <motion.button
                  role="tab"
                  aria-selected={activeTab === 'profile'}
                  whileHover={{ x: 3 }}
                  onClick={() => {
                    setActiveTab('profile');
                    setMobileShowContent(true);
                  }}
                  className={`w-full text-left px-8 py-2.5 font-medium text-[12px] flex items-center justify-between transition-colors cursor-pointer outline-none ${
                    activeTab === 'profile'
                      ? 'text-primary font-bold bg-primary/5 border-l-2 border-primary'
                      : 'text-on-surface hover:bg-surface-container-low'
                  }`}
                >
                  <span>Profile Settings</span>
                  <span className="material-symbols-outlined text-xs">chevron_right</span>
                </motion.button>

                <motion.button
                  role="tab"
                  aria-selected={activeTab === 'bookings'}
                  whileHover={{ x: 3 }}
                  onClick={() => {
                    setActiveTab('bookings');
                    setMobileShowContent(true);
                  }}
                  className={`w-full text-left px-8 py-2.5 font-medium text-[12px] flex items-center justify-between transition-colors cursor-pointer outline-none ${
                    activeTab === 'bookings'
                      ? 'text-primary font-bold bg-primary/5 border-l-2 border-primary'
                      : 'text-on-surface hover:bg-surface-container-low'
                  }`}
                >
                  <span>My Event Bookings</span>
                  <span className="material-symbols-outlined text-xs text-[var(--color-gold-dark)]">
                    calendar_month
                  </span>
                </motion.button>

                <motion.button
                  role="tab"
                  aria-selected={activeTab === 'addresses'}
                  whileHover={{ x: 3 }}
                  onClick={() => {
                    setActiveTab('addresses');
                    setMobileShowContent(true);
                  }}
                  className={`w-full text-left px-8 py-2.5 font-medium text-[12px] flex items-center justify-between transition-colors cursor-pointer outline-none ${
                    activeTab === 'addresses'
                      ? 'text-primary font-bold bg-primary/5 border-l-2 border-primary'
                      : 'text-on-surface hover:bg-surface-container-low'
                  }`}
                >
                  <span>Addresses</span>
                  <span className="text-[11px] text-secondary font-bold">({addresses.length})</span>
                </motion.button>

                <motion.button
                  role="tab"
                  aria-selected={activeTab === 'preferences'}
                  whileHover={{ x: 3 }}
                  onClick={() => {
                    setActiveTab('preferences');
                    setMobileShowContent(true);
                  }}
                  className={`w-full text-left px-8 py-2.5 font-medium text-[12px] flex items-center justify-between transition-colors cursor-pointer outline-none ${
                    activeTab === 'preferences'
                      ? 'text-primary font-bold bg-primary/5 border-l-2 border-primary'
                      : 'text-on-surface hover:bg-surface-container-low'
                  }`}
                >
                  <span>Settings</span>
                  <span className="material-symbols-outlined text-xs">chevron_right</span>
                </motion.button>
              </div>

              <div className="border-b border-surface-container">
                <div className="px-4 py-3 bg-surface-container-low text-secondary font-bold text-[11px] uppercase tracking-wider flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-primary">
                    folder_special
                  </span>
                  Collections
                </div>

                <motion.button
                  role="tab"
                  aria-selected={activeTab === 'wishlist'}
                  whileHover={{ x: 3 }}
                  onClick={() => {
                    setActiveTab('wishlist');
                    setMobileShowContent(true);
                  }}
                  className={`w-full text-left px-8 py-2.5 font-medium text-[12px] flex items-center justify-between transition-colors cursor-pointer outline-none ${
                    activeTab === 'wishlist'
                      ? 'text-primary font-bold bg-primary/5 border-l-2 border-primary'
                      : 'text-on-surface hover:bg-surface-container-low'
                  }`}
                >
                  <span>Curated Wishlist</span>
                  <span className="text-[11px] font-bold text-primary">
                    ({wishlistItems ? wishlistItems.length : 0})
                  </span>
                </motion.button>

                <motion.button
                  role="tab"
                  aria-selected={activeTab === 'cart'}
                  whileHover={{ x: 3 }}
                  onClick={() => {
                    setActiveTab('cart');
                    setMobileShowContent(true);
                  }}
                  className={`w-full text-left px-8 py-2.5 font-medium text-[12px] flex items-center justify-between transition-colors cursor-pointer outline-none ${
                    activeTab === 'cart'
                      ? 'text-primary font-bold bg-primary/5 border-l-2 border-primary'
                      : 'text-on-surface hover:bg-surface-container-low'
                  }`}
                >
                  <span>My Shopping Bag</span>
                  <span className="text-[11px] font-bold text-primary">({cartCount})</span>
                </motion.button>

                <motion.button
                  role="tab"
                  aria-selected={activeTab === 'recently-viewed'}
                  whileHover={{ x: 3 }}
                  onClick={() => {
                    setActiveTab('recently-viewed');
                    fetchRecentlyViewedList();
                    setMobileShowContent(true);
                  }}
                  className={`w-full text-left px-8 py-2.5 font-medium text-[12px] flex items-center justify-between transition-colors cursor-pointer outline-none ${
                    activeTab === 'recently-viewed'
                      ? 'text-primary font-bold bg-primary/5 border-l-2 border-primary'
                      : 'text-on-surface hover:bg-surface-container-low'
                  }`}
                >
                  <span>Recently Viewed</span>
                  <span className="material-symbols-outlined text-xs">history</span>
                </motion.button>

                <motion.button
                  role="tab"
                  aria-selected={activeTab === 'loyalty'}
                  whileHover={{ x: 3 }}
                  onClick={() => {
                    setActiveTab('loyalty');
                    setMobileShowContent(true);
                  }}
                  className={`w-full text-left px-8 py-2.5 font-medium text-[12px] flex items-center justify-between transition-colors cursor-pointer outline-none ${
                    activeTab === 'loyalty'
                      ? 'text-primary font-bold bg-primary/5 border-l-2 border-primary'
                      : 'text-on-surface hover:bg-surface-container-low'
                  }`}
                >
                  <span>Siri Coins & Wallet</span>
                  <span className="material-symbols-outlined text-xs text-[var(--color-gold-dark)]">
                    stars
                  </span>
                </motion.button>
              </div>

              <motion.button
                whileHover={{
                  backgroundColor: 'var(--color-error-container)',
                  color: 'var(--color-on-error-container)',
                }}
                onClick={() => {
                  logout();
                  setTimeout(() => navigate('/'), 400);
                }}
                className="w-full text-left px-4 py-3.5 text-error font-bold text-[11px] uppercase tracking-wider flex items-center gap-2 transition-colors cursor-pointer outline-none"
              >
                <span className="material-symbols-outlined text-sm">logout</span>
                Logout
              </motion.button>

              <div className="flex flex-col gap-1.5 p-4 text-on-surface-variant/40 font-label-sm text-[10px] uppercase tracking-widest font-bold border-t border-surface-container">
                <span className="max-w-md">Address: {addressText}</span>
                <span>Phone: +91 {phoneText}</span>
              </div>
            </div>
          </div>

          {/* MAIN DYNAMIC CONTENT PORTAL PANELS */}
          <div
            className={`col-span-1 md:col-span-4 lg:col-span-9 space-y-4 ${mobileShowContent ? 'block' : 'hidden md:block'}`}
          >
            <>
              {/* TAB 0: RESERVED EVENT BOOKINGS */}
              {activeTab === 'bookings' && (
                <ErrorBoundary
                  key="bookings-error"
                  fallback={
                    <div className="p-6 text-center text-rose-500 font-bold bg-rose-50 rounded-lg">
                      Failed to load bookings tab.
                    </div>
                  }
                >
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
                        Track your reserved setups, theme boards, milestone deposits, and site lead
                        coordinates.
                      </span>
                    </div>
                    <React.Suspense
                      fallback={
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {[...Array(2)].map((_, i) => (
                            <div
                              key={i}
                              className="p-5 rounded-lg bg-white border border-outline-variant/10 space-y-4"
                            >
                              <div className="flex justify-between items-center">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-6 w-20 rounded-full" />
                              </div>
                              <Skeleton className="h-5 w-3/4" />
                              <Skeleton className="h-4 w-full" />
                              <Skeleton className="h-4 w-2/3" />
                            </div>
                          ))}
                        </div>
                      }
                    >
                      <EventCustomerDashboard isEmbedded={true} />
                    </React.Suspense>
                  </motion.div>
                </ErrorBoundary>
              )}

              {/* TAB 1: PROFILE EDITING & PARAMETERS */}
              {activeTab === 'profile' && (
                <ErrorBoundary
                  key="profile-error"
                  fallback={
                    <div className="p-6 text-center text-rose-500 font-bold bg-rose-50 rounded-lg">
                      Failed to load profile tab.
                    </div>
                  }
                >
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
                          <label
                            htmlFor="dashboard-profile-name"
                            className="block text-[10px] uppercase font-bold text-secondary tracking-widest mb-1.5"
                          >
                            Full Account Name
                          </label>
                          <input
                            id="dashboard-profile-name"
                            type="text"
                            required
                            autoComplete="name"
                            value={profileForm.name}
                            onChange={(e) =>
                              setProfileForm({ ...profileForm, name: e.target.value })
                            }
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
                            value={user?.email || ''}
                            className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg px-4 py-3 text-xs outline-none font-semibold text-secondary cursor-not-allowed"
                          />
                          <span className="text-[9px] text-secondary/50 block mt-1">
                            Security Note: Primary login email keys cannot be modified.
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                        <div>
                          <label
                            htmlFor="dashboard-profile-phone"
                            className="block text-[10px] uppercase font-bold text-secondary tracking-widest mb-1.5"
                          >
                            Mobile Number
                          </label>
                          <input
                            id="dashboard-profile-phone"
                            type="tel"
                            autoComplete="tel"
                            value={profileForm.phone}
                            onChange={(e) =>
                              setProfileForm({ ...profileForm, phone: e.target.value })
                            }
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
                            onChange={(e) =>
                              setProfileForm({ ...profileForm, gender: e.target.value })
                            }
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
                          <label
                            htmlFor="dashboard-profile-dob"
                            className="block text-[10px] uppercase font-bold text-secondary tracking-widest mb-1.5"
                          >
                            Date Of Birth (DOB)
                          </label>
                          <input
                            id="dashboard-profile-dob"
                            type="date"
                            autoComplete="bday"
                            value={profileForm.dateOfBirth}
                            onChange={(e) =>
                              setProfileForm({ ...profileForm, dateOfBirth: e.target.value })
                            }
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
                          className="btn-primary px-8 py-3 rounded-lg font-bold uppercase tracking-widest text-[10px] inline-flex items-center gap-2 cursor-pointer shadow-md"
                        >
                          {isUpdatingProfile ? (
                            <div className="skeleton-box inline-block w-3.5 h-3.5 rounded-md" />
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
                </ErrorBoundary>
              )}

              {/* TAB 2: ADDRESS MANAGEMENT */}
              {activeTab === 'addresses' && (
                <ErrorBoundary
                  key="addresses-error"
                  fallback={
                    <div className="p-6 text-center text-rose-500 font-bold bg-rose-50 rounded-lg">
                      Failed to load addresses tab.
                    </div>
                  }
                >
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
                    <div className="bg-surface-bright border border-outline-variant/30 rounded-lg p-5 flex flex-col gap-1.5 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <h2 className="font-semibold text-sm text-on-surface tracking-wide">
                          Delivery Sites
                        </h2>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            setEditingAddressId('new');
                            setAddressFormData({
                              id: 'new',
                              name: '',
                              phone: '',
                              pincode: '',
                              locality: '',
                              addressString: '',
                              city: '',
                              state: '',
                              tag: 'Home',
                              latitude: null,
                              longitude: null,
                            });
                            setIsAddressModalOpen(true);
                          }}
                          className="w-6 h-6 p-0 min-h-0 rounded-full border border-primary/50 text-primary bg-transparent flex items-center justify-center cursor-pointer hover:bg-primary hover:text-surface transition-all shrink-0"
                          title="Add New Delivery Destination"
                        >
                          <span className="material-symbols-outlined text-[12px] font-bold">
                            add
                          </span>
                        </motion.button>
                      </div>
                      <p className="text-[10px] text-on-surface/60 font-light">
                        Configure premium delivery, invoicing sites, and home destinations.
                      </p>
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
                                  ? 'border-primary/80 ring-1 ring-primary/20'
                                  : 'border-outline-variant/40 hover:border-outline-variant'
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
                                        <span className="material-symbols-outlined text-[10px]">
                                          check_circle
                                        </span>
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
                                    {addr.city}, {addr.state} -{' '}
                                    <strong className="text-on-surface font-semibold">
                                      {addr.pincode}
                                    </strong>
                                  </p>
                                  <span className="text-on-surface font-semibold block text-[11px]">
                                    Mobile Contact: {addr.phone}
                                  </span>
                                  {addr.latitude && addr.longitude && (
                                    <div className="mt-2 text-[9px] text-green-700 font-bold bg-green-50 px-2 py-0.5 border border-green-200 rounded-sm inline-flex items-center gap-1 uppercase tracking-wider">
                                      <span className="material-symbols-outlined text-[10px]">
                                        share_location
                                      </span>
                                      GPS Locked: {addr.latitude.toFixed(4)},{' '}
                                      {addr.longitude.toFixed(4)}
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
                        No delivery destination parameters logged yet. Click above to define your
                        first site!
                      </div>
                    )}
                  </motion.div>
                </ErrorBoundary>
              )}

              {/* TAB 3: ACCOUNT PREFERENCES */}
              {activeTab === 'preferences' && (
                <ErrorBoundary
                  key="preferences-error"
                  fallback={
                    <div className="p-6 text-center text-rose-500 font-bold bg-rose-50 rounded-lg">
                      Failed to load preferences tab.
                    </div>
                  }
                >
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
                        Customize how you interact with Siri Arts & Crafts. All changes sync
                        dynamically.
                      </span>
                    </div>

                    <form
                      onSubmit={handlePreferencesSave}
                      className="space-y-6 max-w-xl text-[11px]"
                    >
                      {/* Notification Preferences */}
                      <div className="space-y-3">
                        <h3 className="font-bold text-xs uppercase tracking-wider text-primary">
                          Notification Subscriptions
                        </h3>

                        <div className="flex items-start gap-3 p-3 bg-surface-container-low/40 rounded-lg border border-outline-variant/20">
                          <input
                            type="checkbox"
                            id="pref-email"
                            checked={prefsForm.email}
                            onChange={(e) =>
                              setPrefsForm({ ...prefsForm, email: e.target.checked })
                            }
                            className="mt-1 cursor-pointer w-4 h-4 shrink-0 rounded-full border border-outline-variant/60 checked:bg-primary checked:border-transparent appearance-none flex items-center justify-center after:content-[''] after:w-1.5 after:h-1.5 after:rounded-full after:bg-white after:opacity-0 checked:after:opacity-100 transition-all"
                          />
                          <div>
                            <label
                              htmlFor="pref-email"
                              className="font-bold text-on-surface cursor-pointer text-xs block"
                            >
                              Direct Order Invoicing & Transaction Updates
                            </label>
                            <span className="text-[10px] text-secondary font-light">
                              Receive real-time order logs, shipping statuses, verification keys,
                              and tracking parameters. (Highly Recommended)
                            </span>
                          </div>
                        </div>

                        <div className="flex items-start gap-3 p-3 bg-surface-container-low/40 rounded-lg border border-outline-variant/20">
                          <input
                            type="checkbox"
                            id="pref-marketing"
                            checked={prefsForm.marketing}
                            onChange={(e) =>
                              setPrefsForm({ ...prefsForm, marketing: e.target.checked })
                            }
                            className="mt-1 cursor-pointer w-4 h-4 shrink-0 rounded-full border border-outline-variant/60 checked:bg-primary checked:border-transparent appearance-none flex items-center justify-center after:content-[''] after:w-1.5 after:h-1.5 after:rounded-full after:bg-white after:opacity-0 checked:after:opacity-100 transition-all"
                          />
                          <div>
                            <label
                              htmlFor="pref-marketing"
                              className="font-bold text-on-surface cursor-pointer text-xs block"
                            >
                              Exclusive Curations & Launch Alerts
                            </label>
                            <span className="text-[10px] text-secondary font-light">
                              Access premium limited-edition collections, holiday discount
                              campaigns, and early-bird event details.
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
                          className="bg-primary text-surface px-5 py-2 rounded-lg font-bold uppercase tracking-widest text-[9px] inline-flex items-center gap-1.5 cursor-pointer shadow-sm hover:bg-on-surface transition-colors"
                        >
                          {isPreferencesSaving ? (
                            <div className="skeleton-box inline-block w-3.5 h-3.5 rounded-md" />
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
                </ErrorBoundary>
              )}

              {(activeTab === 'orders' || activeTab === 'rentals') && (
                <ErrorBoundary
                  key="orders-error"
                  fallback={
                    <div className="p-6 text-center text-rose-500 font-bold bg-rose-50 rounded-lg">
                      Failed to load orders tab.
                    </div>
                  }
                >
                  <motion.div
                    id="panel-orders"
                    role="tabpanel"
                    key="tab-orders"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-4 text-[11px]"
                  >
                    {selectedOrderId === null ? (
                      /* MAIN LIST VIEW */
                      <>
                        {/* MynCash Header (Loyalty Theme) */}
                        <div className="flex items-center justify-between mb-4 pb-4 border-b border-outline-variant/30 gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <button
                              onClick={() => setMobileShowContent(false)}
                              className="md:hidden p-1 -ml-1 text-secondary hover:text-primary transition-colors cursor-pointer shrink-0 flex items-center justify-center"
                            >
                              <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                                />
                              </svg>
                            </button>
                            <h2 className="font-bold text-xs sm:text-base text-on-surface uppercase tracking-wider truncate font-display">
                              My Order History
                            </h2>
                          </div>
                          <div className="bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1 flex items-center gap-1.5 shadow-2xs shrink-0">
                            <svg
                              className="w-3.5 h-3.5 text-amber-600 fill-amber-600 shrink-0"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                            >
                              <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                            </svg>
                            <span className="text-[9px] sm:text-[10px] text-amber-800 font-bold uppercase tracking-wider">
                              <span className="hidden sm:inline">Loyalty Coins: </span>
                              {user?.siriCoins ?? 0} Coins
                            </span>
                          </div>
                        </div>

                        {/* Metric Summary Cards */}
                        <div className="bg-surface-bright border border-outline-variant/35 rounded-lg p-3.5 sm:p-4 mb-6 shadow-2xs">
                          <div className="grid grid-cols-3 divide-x divide-outline-variant/30 text-center">
                            {/* Card 1: Active Rentals */}
                            <div className="flex items-center justify-center gap-3 px-2 sm:px-4 py-1">
                              <div className="text-center sm:text-left min-w-0 flex-1">
                                <span className="block text-[8px] sm:text-[10px] uppercase font-bold text-[#8c7335] tracking-wider sm:tracking-[0.15em] font-label truncate">
                                  Active Rentals
                                </span>
                                <strong className="text-base sm:text-2xl font-display text-[#5a481f] font-semibold mt-0.5 sm:mt-1 block leading-none">
                                  {dashboardCounts.activeRentals}
                                </strong>
                              </div>
                              <div className="bg-[#8c7335]/10 p-2 rounded-lg border border-[#8c7335]/20 hidden sm:flex shrink-0">
                                <svg
                                  className="w-5 h-5 text-[#8c7335]"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                                  />
                                </svg>
                              </div>
                            </div>

                            {/* Card 2: Upcoming Returns */}
                            <div className="flex items-center justify-center gap-3 px-2 sm:px-4 py-1">
                              <div className="text-center sm:text-left min-w-0 flex-1">
                                <span className="block text-[8px] sm:text-[10px] uppercase font-bold text-amber-700 tracking-wider sm:tracking-[0.15em] font-label truncate">
                                  Upcoming Returns
                                </span>
                                <strong className="text-base sm:text-2xl font-display text-amber-900 font-semibold mt-0.5 sm:mt-1 block leading-none">
                                  {dashboardCounts.upcomingReturns}
                                </strong>
                              </div>
                              <div className="bg-amber-50 p-2 rounded-lg border border-amber-200/50 hidden sm:flex shrink-0">
                                <svg
                                  className="w-5 h-5 text-amber-700"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                                  />
                                </svg>
                              </div>
                            </div>

                            {/* Card 3: Purchase Orders */}
                            <div className="flex items-center justify-center gap-3 px-2 sm:px-4 py-1">
                              <div className="text-center sm:text-left min-w-0 flex-1">
                                <span className="block text-[8px] sm:text-[10px] uppercase font-bold text-secondary tracking-wider sm:tracking-[0.15em] font-label truncate">
                                  Purchase Orders
                                </span>
                                <strong className="text-base sm:text-2xl font-display text-on-surface font-semibold mt-0.5 sm:mt-1 block leading-none">
                                  {dashboardCounts.purchaseOrders}
                                </strong>
                              </div>
                              <div className="bg-surface-container p-2 rounded-lg border border-outline-variant/20 hidden sm:flex shrink-0">
                                <svg
                                  className="w-5 h-5 text-secondary"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                                  />
                                </svg>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Filter Pill Tab Bar */}
                        <div className="overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0 flex justify-start sm:justify-center mb-6">
                          <div className="inline-flex gap-1 p-1.5 min-w-max items-center bg-surface-container/60 backdrop-blur-xl border border-outline-variant/20 rounded-lg shadow-inner mx-auto">
                            {[
                              { id: 'ALL', label: 'All Orders' },
                              { id: 'RENTAL', label: 'Rental Orders' },
                              { id: 'PURCHASE', label: 'Purchase Orders' },
                            ].map((f) => {
                              const isActive = orderFilter === f.id;
                              return (
                                <button
                                  key={f.id}
                                  onClick={() => setOrderFilter(f.id)}
                                  className={`relative px-5 sm:px-6 h-9 lg:h-8 flex items-center justify-center rounded-lg font-label text-[10px] sm:text-[11px] uppercase tracking-[0.15em] transition-colors duration-300 whitespace-nowrap z-10 outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer ${
                                    isActive
                                      ? 'text-primary font-bold'
                                      : 'text-on-surface-variant/70 hover:text-on-surface font-medium'
                                  }`}
                                >
                                  {isActive && (
                                    <motion.div
                                      layoutId="activeOrderFilterTab"
                                      className="absolute inset-0 bg-surface-bright rounded-lg shadow-[0_2px_8px_rgba(115,92,0,0.08)] border border-outline-variant/15 -z-10"
                                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                                    />
                                  )}
                                  <span className="relative z-10">{f.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Order Cards */}
                        {isOrdersLoading ? (
                          <OrdersListSkeleton rows={2} />
                        ) : (
                          <motion.div layout className="space-y-4">
                            <AnimatePresence>
                              {orderItems.map(({ order, item, itemIdx }, idx) => {
                                const prodTitle =
                                  item.title ||
                                  (typeof item.productId === 'object'
                                    ? item.productId?.title
                                    : null) ||
                                  'Artisanal Piece';
                                const prodPrice =
                                  item.price ||
                                  (typeof item.productId === 'object'
                                    ? item.productId?.price
                                    : 0) ||
                                  0;
                                const prodImage =
                                  item.imageSrc ||
                                  (typeof item.productId === 'object'
                                    ? item.productId?.imageSrc || item.productId?.images?.[0]
                                    : null) ||
                                  '';
                                const prodVariant = item.variant || 'Default';
                                const orderDate = new Date(order.createdAt);
                                const deliveryEntry = order.statusHistory?.find(
                                  (h) => h.status?.toLowerCase() === 'delivered',
                                );
                                const deliveryDate = deliveryEntry
                                  ? new Date(deliveryEntry.timestamp)
                                  : new Date(order.updatedAt || order.createdAt);
                                const returnExpiryDate = new Date(
                                  deliveryDate.getTime() + 14 * 24 * 60 * 60 * 1000,
                                );
                                const isReturnActive = new Date() < returnExpiryDate;
                                const expiryStr = returnExpiryDate.toLocaleDateString('en-IN', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                });

                                return (
                                  <motion.div
                                    layout
                                    initial={{ opacity: 0, scale: 0.98 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.98 }}
                                    transition={{ duration: 0.2, delay: idx * 0.02 }}
                                    key={`${order._id || idx}-${itemIdx}`}
                                    className="bg-surface-bright border border-outline-variant/30 rounded-lg overflow-hidden shadow-2xs hover:border-outline-variant hover:shadow-xs transition-all text-left"
                                  >
                                    {/* Card Header */}
                                    <div className="bg-surface-container-low px-4 py-3 flex items-center justify-between border-b border-outline-variant/15">
                                      <div className="flex items-center gap-2">
                                        {order.orderStatus?.toLowerCase() === 'delivered' ? (
                                          <svg
                                            className="w-4 h-4 text-primary shrink-0"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            viewBox="0 0 24 24"
                                          >
                                            <path
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                              d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125a1.125 1.125 0 001.125-1.125V9.75M8.25 18.75a1.5 1.5 0 01-3 0M21 12h-5.25m0 0V5.25A2.25 2.25 0 0013.5 3h-9A2.25 2.25 0 002.25 5.25v9a2.25 2.25 0 002.25 2.25m12-4.5V9.75A2.25 2.25 0 0014.25 7.5H12"
                                            />
                                          </svg>
                                        ) : (
                                          <svg
                                            className="w-4 h-4 text-primary shrink-0"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            viewBox="0 0 24 24"
                                          >
                                            <circle cx="12" cy="12" r="10" />
                                            <polyline points="12 6 12 12 16 14" />
                                          </svg>
                                        )}
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface">
                                          {order.orderStatus?.toLowerCase() === 'delivered'
                                            ? 'Delivered'
                                            : order.orderStatus || 'Confirmed'}
                                        </span>
                                        <span className="text-[9px] text-secondary font-light">
                                          on{' '}
                                          {new Date(
                                            order.updatedAt || order.createdAt,
                                          ).toLocaleDateString('en-IN', {
                                            day: 'numeric',
                                            month: 'short',
                                          })}
                                        </span>
                                      </div>
                                      <span className="text-[9px] bg-surface-container px-2 py-0.5 rounded font-bold uppercase tracking-wider text-secondary border border-outline-variant/10">
                                        {order.orderType === 'rental' || item.type === 'rental'
                                          ? 'Rental'
                                          : 'Purchase'}
                                      </span>
                                    </div>

                                    {/* Card Body - Item Container */}
                                    <div
                                      onClick={() => {
                                        setSelectedOrderId(order._id || order.id);
                                        setSelectedOrderItemIndex(itemIdx);
                                      }}
                                      className="p-4 flex gap-4 items-center cursor-pointer hover:bg-surface-container/10 transition-colors group"
                                    >
                                      <OptimizedImage
                                        src={prodImage}
                                        alt={prodTitle}
                                        containerClassName="w-16 h-20 rounded-lg bg-surface-container border border-outline-variant/20 flex-shrink-0 shadow-3xs"
                                        className="w-full h-full object-cover"
                                      />

                                      <div className="flex-1 min-w-0 space-y-1">
                                        <span className="text-[9px] uppercase font-bold text-primary tracking-widest block font-label">
                                          Siri Atelier Collection
                                        </span>
                                        <h4 className="font-display font-medium text-on-surface text-[12px] truncate">
                                          {prodTitle}
                                        </h4>
                                        <p className="text-secondary text-[10px] font-light font-body">
                                          Variant:{' '}
                                          <span className="font-medium text-on-surface">
                                            {prodVariant}
                                          </span>{' '}
                                          | Qty:{' '}
                                          <span className="font-medium text-on-surface">
                                            {item.quantity || 1}
                                          </span>
                                        </p>
                                        <div className="flex items-center gap-1.5 pt-0.5 font-body">
                                          <span className="text-xs font-bold text-primary">
                                            ₹{prodPrice.toLocaleString()}
                                          </span>
                                          {item.originalPrice && (
                                            <span className="text-[10px] text-secondary line-through font-light">
                                              ₹{item.originalPrice.toLocaleString()}
                                            </span>
                                          )}
                                        </div>
                                      </div>

                                      <svg
                                        className="w-4 h-4 text-secondary group-hover:text-primary transition-colors pr-1 shrink-0"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          d="M9 5l7 7-7 7"
                                        />
                                      </svg>
                                    </div>

                                    {/* Return/Exchange Window Status Block */}
                                    {order.orderStatus?.toLowerCase() === 'delivered' && (
                                      <div className="px-4 py-2 bg-surface-container-low/40 border-t border-outline-variant/15 flex items-center justify-between text-[10px] text-secondary font-body">
                                        <div className="flex items-center gap-1.5">
                                          {isReturnActive ? (
                                            <svg
                                              className="w-3.5 h-3.5 text-secondary/70 shrink-0"
                                              fill="none"
                                              stroke="currentColor"
                                              strokeWidth="2"
                                              viewBox="0 0 24 24"
                                            >
                                              <rect x="3" y="4" width="18" height="18" rx="2" />
                                              <line x1="16" y1="2" x2="16" y2="6" />
                                              <line x1="8" y1="2" x2="8" y2="6" />
                                              <line x1="3" y1="10" x2="21" y2="10" />
                                              <path d="M9 16l2 2 4-4" />
                                            </svg>
                                          ) : (
                                            <svg
                                              className="w-3.5 h-3.5 text-secondary/70 shrink-0"
                                              fill="none"
                                              stroke="currentColor"
                                              strokeWidth="2"
                                              viewBox="0 0 24 24"
                                            >
                                              <rect x="3" y="4" width="18" height="18" rx="2" />
                                              <line x1="16" y1="2" x2="16" y2="6" />
                                              <line x1="8" y1="2" x2="8" y2="6" />
                                              <line x1="3" y1="10" x2="21" y2="10" />
                                              <line x1="10" y1="14" x2="14" y2="18" />
                                              <line x1="14" y1="14" x2="10" y2="18" />
                                            </svg>
                                          )}
                                          <span>
                                            {isReturnActive
                                              ? `Exchange/Return window active till ${expiryStr}`
                                              : `Return window closed on ${expiryStr}`}
                                          </span>
                                        </div>
                                        {isReturnActive && (
                                          <span className="text-[#8c7335] font-bold uppercase tracking-wider text-[8px] border border-[#8c7335]/30 px-1.5 py-0.5 rounded bg-[#8c7335]/5">
                                            Active
                                          </span>
                                        )}
                                      </div>
                                    )}

                                    {/* Quick Review Prompt */}
                                    {order.orderStatus?.toLowerCase() === 'delivered' && (
                                      <div className="px-4 py-2.5 bg-amber-50/50 border-t border-dashed border-[#8c7335]/10 flex flex-wrap items-center justify-between gap-2 text-[10px]">
                                        <div className="flex items-center gap-1.5 text-[#8c7335] font-medium">
                                          <svg
                                            className="w-3 h-3 text-[#8c7335] fill-[#8c7335] shrink-0"
                                            viewBox="0 0 24 24"
                                            fill="currentColor"
                                          >
                                            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                                          </svg>
                                          <span>Review item & win 50 Loyalty Coins!</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          {[1, 2, 3, 4, 5].map((star) => (
                                            <button
                                              key={star}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setReviewingProduct({
                                                  productId: item.productId?._id || item.productId,
                                                  productTitle: prodTitle,
                                                });
                                              }}
                                              className="text-[#8c7335] hover:text-amber-500 transition-colors p-0.5 cursor-pointer bg-transparent border-0 outline-0 flex items-center justify-center"
                                            >
                                              <svg
                                                className="w-3 h-3 fill-current shrink-0"
                                                viewBox="0 0 24 24"
                                              >
                                                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                                              </svg>
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </motion.div>
                                );
                              })}
                            </AnimatePresence>
                          </motion.div>
                        )}

                        {orderItems.length === 0 && !isOrdersLoading && (
                          <div className="text-center py-16 bg-surface-bright rounded-lg border border-outline-variant/40 text-[11px] text-secondary italic shadow-xs">
                            No order records found matching the status filter.
                          </div>
                        )}
                      </>
                    ) : (
                      /* SUB-VIEW: ORDER DETAILS VIEW */
                      (() => {
                        const order = selectedOrder;
                        const item = selectedItem;
                        if (!order || !item) return null;

                        const prodTitle =
                          item.title ||
                          (typeof item.productId === 'object' ? item.productId?.title : null) ||
                          'Artisanal Piece';
                        const prodPrice =
                          item.price ||
                          (typeof item.productId === 'object' ? item.productId?.price : 0) ||
                          0;
                        const prodImage =
                          item.imageSrc ||
                          (typeof item.productId === 'object'
                            ? item.productId?.imageSrc || item.productId?.images?.[0]
                            : null) ||
                          '';
                        const prodVariant = item.variant || 'Default';
                        const discount =
                          order.discount ||
                          (item.originalPrice
                            ? Math.max(0, (item.originalPrice - item.price) * item.quantity)
                            : 0);
                        const status = order.orderStatus || 'Confirmed';
                        const isDelivered = status?.toLowerCase() === 'delivered';

                        return (
                          <div className="space-y-6 text-left">
                            {/* Product Summary Hero Card */}
                            <div className="bg-surface-bright border border-outline-variant/30 rounded-lg p-4 sm:p-6 shadow-2xs hover:shadow-xs transition-all duration-300">
                              <div className="flex flex-row items-start gap-4 sm:gap-6">
                                <div className="w-24 h-32 sm:w-40 sm:h-52 rounded-lg overflow-hidden bg-surface-container border border-outline-variant/25 shrink-0 shadow-sm relative group/image">
                                  <OptimizedImage
                                    src={prodImage}
                                    alt={prodTitle}
                                    containerClassName="w-full h-full"
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover/image:scale-105"
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent opacity-0 group-hover/image:opacity-100 transition-opacity duration-300" />
                                </div>
                                <div className="flex-1 text-left space-y-3 w-full min-w-0">
                                  <div className="space-y-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="text-[8px] sm:text-[9px] bg-primary/10 text-primary px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full font-bold uppercase tracking-widest border border-primary/20 inline-block">
                                        Siri Atelier Piece
                                      </span>
                                      <span className="text-[8px] sm:text-[9px] text-secondary font-mono tracking-wider">
                                        ID: {order._id}
                                      </span>
                                    </div>
                                    <h3 className="font-display font-medium text-base sm:text-2xl text-on-surface leading-tight">
                                      {prodTitle}
                                    </h3>
                                  </div>

                                  {/* Badges Row */}
                                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2.5">
                                    <div className="bg-surface-container/60 border border-outline-variant/30 text-secondary text-[9px] sm:text-[10px] px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-full font-medium">
                                      Variant:{' '}
                                      <strong className="text-on-surface font-semibold">
                                        {prodVariant}
                                      </strong>
                                    </div>
                                    <div className="bg-surface-container/60 border border-outline-variant/30 text-secondary text-[9px] sm:text-[10px] px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-full font-medium">
                                      Qty:{' '}
                                      <strong className="text-on-surface font-semibold">
                                        {item.quantity || 1}
                                      </strong>
                                    </div>
                                  </div>

                                  <div className="pt-2 border-t border-surface-container/60 flex flex-wrap items-baseline gap-3 sm:gap-6">
                                    <div className="space-y-0.5">
                                      <span className="block text-[8px] uppercase tracking-wider font-bold text-secondary">
                                        Purchase Price
                                      </span>
                                      <span className="text-base sm:text-xl font-bold text-primary font-body">
                                        ₹{(prodPrice * (item.quantity || 1)).toLocaleString()}
                                      </span>
                                    </div>
                                    {item.originalPrice && item.originalPrice > prodPrice && (
                                      <div className="space-y-0.5">
                                        <span className="block text-[8px] uppercase tracking-wider font-bold text-secondary">
                                          Original Value
                                        </span>
                                        <span className="text-xs sm:text-sm text-secondary line-through font-light font-body">
                                          ₹
                                          {(
                                            item.originalPrice * (item.quantity || 1)
                                          ).toLocaleString()}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Timeline Tracker & Stamp Seal */}
                            <div className="bg-surface-bright border border-outline-variant/30 rounded-lg p-6 shadow-2xs relative overflow-hidden">
                              {/* Left Tracker */}
                              <div className="w-full space-y-5 text-left pr-16 sm:pr-24">
                                <div className="flex items-center gap-3">
                                  <span
                                    className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ring-4 ${
                                      status?.toLowerCase() === 'delivered'
                                        ? 'bg-emerald-600 ring-emerald-100'
                                        : 'bg-amber-600 ring-amber-100'
                                    }`}
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full bg-white" />
                                  </span>
                                  <h4 className="font-bold text-xs sm:text-sm text-on-surface uppercase tracking-widest pr-4 sm:pr-0">
                                    {status?.toLowerCase() === 'delivered'
                                      ? 'Item Delivered Successfully'
                                      : `Order Journey Status: ${status}`}
                                  </h4>
                                </div>

                                <div className="relative pl-1">
                                  {/* Dotted Connection Line */}
                                  <div className="absolute left-3 top-2 bottom-2 w-0.5 border-l border-dashed border-outline-variant/60" />

                                  <div className="space-y-5 pl-7 text-xs">
                                    {/* Event 1 */}
                                    <div className="relative">
                                      <span className="absolute -left-7 top-1 w-2.5 h-2.5 rounded-full bg-primary ring-4 ring-primary-container/20" />
                                      <strong className="text-on-surface block font-bold">
                                        Order Confirmed
                                      </strong>
                                      <span className="text-[10px] text-secondary font-light">
                                        Dispatched into production ledger
                                      </span>
                                      <span className="block text-[9px] text-secondary/70 font-mono mt-0.5">
                                        {new Date(order.createdAt).toLocaleString('en-IN', {
                                          dateStyle: 'medium',
                                          timeStyle: 'short',
                                        })}
                                      </span>
                                    </div>

                                    {/* Event 2 */}
                                    <div className="relative">
                                      <span
                                        className={`absolute -left-7 top-1 w-2.5 h-2.5 rounded-full ${order.updatedAt ? 'bg-primary ring-4 ring-primary-container/20' : 'bg-outline-variant'}`}
                                      />
                                      <strong className="text-on-surface block font-bold">
                                        Processed & Shipped
                                      </strong>
                                      <span className="text-[10px] text-secondary font-light">
                                        In transit with Courier Logistics
                                      </span>
                                      {order.trackingNumber && (
                                        <span className="block text-[9px] text-[#8c7335] font-semibold uppercase mt-0.5">
                                          AWB: {order.trackingNumber}
                                        </span>
                                      )}
                                    </div>

                                    {/* Event 3 */}
                                    <div className="relative">
                                      <span
                                        className={`absolute -left-7 top-1 w-2.5 h-2.5 rounded-full ${status?.toLowerCase() === 'delivered' ? 'bg-emerald-600 ring-4 ring-emerald-100' : 'bg-outline-variant'}`}
                                      />
                                      <strong className="text-on-surface block font-bold">
                                        Delivery Completed
                                      </strong>
                                      <span className="text-[10px] text-secondary font-light">
                                        Signature check & hand-off validation active
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Overlapping Gold Seal Stamp (Wax Seal Style) */}
                              <div className="absolute top-3 right-3 sm:top-5 sm:right-5 z-10 origin-top-right">
                                <motion.div
                                  initial={{ rotate: -12, scale: 0.95 }}
                                  animate={{ rotate: 8 }}
                                  whileHover={{ rotate: 20, scale: 1.08 }}
                                  transition={{ type: 'spring', stiffness: 220, damping: 12 }}
                                  className="cursor-pointer select-none"
                                >
                                  <svg
                                    className="w-20 h-20 sm:w-26 sm:h-26 text-[#8c7335] drop-shadow-md"
                                    viewBox="0 0 100 100"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                  >
                                    <path
                                      d="M40 70 L30 95 L50 85 L70 95 L60 70"
                                      fill="#8c7335"
                                      opacity="0.8"
                                    />
                                    <path d="M45 70 L38 90 L50 82 L62 90 L55 70" fill="#8c7335" />
                                    <circle
                                      cx="50"
                                      cy="50"
                                      r="38"
                                      stroke="#8c7335"
                                      strokeWidth="2.5"
                                      fill="#fcfbf7"
                                    />
                                    <circle
                                      cx="50"
                                      cy="50"
                                      r="34"
                                      stroke="#8c7335"
                                      strokeWidth="1"
                                      strokeDasharray="3 2"
                                    />
                                    <circle cx="50" cy="50" r="28" fill="#8c7335" opacity="0.05" />
                                    <text
                                      x="50"
                                      y="46"
                                      textAnchor="middle"
                                      fill="#5a481f"
                                      fontSize="8"
                                      fontWeight="bold"
                                      letterSpacing="1.5"
                                    >
                                      {status?.toUpperCase() === 'DELIVERED'
                                        ? 'DELIVERED'
                                        : status?.toUpperCase() || 'CONFIRMED'}
                                    </text>
                                    <text
                                      x="50"
                                      y="58"
                                      textAnchor="middle"
                                      fill="#8c7335"
                                      fontSize="6"
                                      fontWeight="bold"
                                      letterSpacing="1"
                                    >
                                      SIRI ARTISAN
                                    </text>
                                    <polygon
                                      points="50,62 52,66 56,66 53,68 54,72 50,70 46,72 47,68 44,66 48,66"
                                      fill="#8c7335"
                                    />
                                  </svg>
                                </motion.div>
                              </div>
                            </div>

                            {/* Loyalty Review Callout */}
                            <div
                              className={`bg-gradient-to-br from-amber-500/8 to-amber-500/2 border border-[#8c7335]/20 rounded-lg p-5 shadow-2xs space-y-4 text-left transition-all ${!isDelivered ? 'opacity-85' : ''}`}
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={`p-2.5 rounded-lg border shadow-3xs shrink-0 flex items-center justify-center ${
                                    isDelivered
                                      ? 'bg-amber-50 border-amber-200 text-amber-600'
                                      : 'bg-stone-100 border-stone-200 text-stone-500'
                                  }`}
                                >
                                  {isDelivered ? (
                                    <svg
                                      className="w-4.5 h-4.5 fill-amber-600 text-amber-600 shrink-0"
                                      viewBox="0 0 24 24"
                                    >
                                      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                                    </svg>
                                  ) : (
                                    <svg
                                      className="w-4.5 h-4.5 fill-none stroke-current"
                                      strokeWidth="2.5"
                                      viewBox="0 0 24 24"
                                    >
                                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                      <path d="M7 11V7a5 5 0 0110 0v4" />
                                    </svg>
                                  )}
                                </div>
                                <div className="space-y-0.5">
                                  <h4 className="font-bold text-xs uppercase tracking-wider text-amber-900">
                                    Rate this Artisan Masterpiece
                                  </h4>
                                  <p className="text-[10px] text-amber-800 font-light font-body">
                                    {isDelivered
                                      ? 'Share your review to win 50 Loyalty Coins instantly on your account!'
                                      : 'This review panel unlocks once your item is successfully delivered.'}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center justify-between gap-4">
                                <div className="flex gap-1.5">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <motion.button
                                      key={star}
                                      whileHover={isDelivered ? { scale: 1.2 } : {}}
                                      whileTap={isDelivered ? { scale: 0.9 } : {}}
                                      onClick={() =>
                                        isDelivered &&
                                        setReviewingProduct({
                                          productId: item.productId?._id || item.productId,
                                          productTitle: prodTitle,
                                        })
                                      }
                                      disabled={!isDelivered}
                                      className={`p-1 flex items-center justify-center bg-transparent border-0 outline-0 ${
                                        isDelivered
                                          ? 'text-amber-500 hover:text-amber-600 cursor-pointer'
                                          : 'text-stone-300 cursor-not-allowed'
                                      }`}
                                    >
                                      <svg
                                        className="w-4.5 h-4.5 fill-current shrink-0"
                                        viewBox="0 0 24 24"
                                      >
                                        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                                      </svg>
                                    </motion.button>
                                  ))}
                                </div>
                                <button
                                  onClick={() =>
                                    isDelivered &&
                                    setReviewingProduct({
                                      productId: item.productId?._id || item.productId,
                                      productTitle: prodTitle,
                                    })
                                  }
                                  disabled={!isDelivered}
                                  className={`p-2.5 rounded-full border transition-all ${
                                    isDelivered
                                      ? 'text-orange-600 border-orange-400/40 hover:bg-orange-600 hover:text-white cursor-pointer hover:shadow-2xs active:scale-95 bg-transparent'
                                      : 'text-stone-400 border-stone-200 bg-stone-50 cursor-not-allowed'
                                  }`}
                                  title={
                                    isDelivered ? 'Write detailed review' : 'Unlocks after delivery'
                                  }
                                >
                                  <svg
                                    className="w-4.5 h-4.5 fill-none stroke-current shrink-0"
                                    strokeWidth="2.5"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.83 17.017a4.5 4.5 0 01-1.897 1.13L3 19l.852-2.934a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125"
                                    />
                                  </svg>
                                </button>
                              </div>
                            </div>

                            {/* Split Panels: Delivery Address & Map Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                              {/* Address Card */}
                              <div className="bg-surface-bright border border-outline-variant/30 rounded-lg p-6 shadow-2xs flex flex-col justify-between">
                                <div>
                                  <h4 className="font-bold text-xs uppercase tracking-wider text-on-surface mb-4 flex items-center gap-2 border-b border-surface-container pb-2">
                                    <svg
                                      className="w-4 h-4 text-primary"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                                      />
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                                      />
                                    </svg>
                                    <span>Shipping Destination</span>
                                  </h4>
                                  {order.shippingAddress ? (
                                    <div className="space-y-3 text-xs leading-relaxed">
                                      <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold border border-primary/20">
                                          {order.shippingAddress.name
                                            ? order.shippingAddress.name
                                                .substring(0, 2)
                                                .toUpperCase()
                                            : 'SI'}
                                        </div>
                                        <strong className="text-on-surface font-bold">
                                          {order.shippingAddress.name}
                                        </strong>
                                      </div>
                                      <p className="text-secondary font-light pl-9">
                                        {order.shippingAddress.addressString ||
                                          order.shippingAddress.address}
                                        , {order.shippingAddress.locality},<br />
                                        {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
                                        -{' '}
                                        <strong className="text-on-surface font-semibold">
                                          {order.shippingAddress.pincode}
                                        </strong>
                                      </p>
                                      <div className="pl-9 text-secondary font-medium text-[10px] flex items-center gap-1.5 uppercase tracking-wide">
                                        <svg
                                          className="w-3.5 h-3.5 text-secondary shrink-0"
                                          fill="none"
                                          stroke="currentColor"
                                          strokeWidth="2"
                                          viewBox="0 0 24 24"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-2.824-1.557-5.145-3.878-6.702-6.702l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"
                                          />
                                        </svg>
                                        <span>Phone: {order.shippingAddress.phone}</span>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="text-secondary italic text-xs font-light pl-2">
                                      Address details currently unavailable.
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Coordinate Map Panel */}
                              <div className="bg-surface-bright border border-outline-variant/30 rounded-lg p-4 shadow-2xs space-y-3">
                                <div className="flex items-center justify-between border-b border-surface-container pb-2">
                                  <span className="text-[10px] uppercase font-bold text-secondary tracking-widest block">
                                    Destination GPS Tracker
                                  </span>
                                  <span className="text-[9px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-bold uppercase tracking-wider border border-emerald-200">
                                    GPS Synced
                                  </span>
                                </div>
                                <div className="relative h-36 rounded-lg bg-slate-50 overflow-hidden border border-outline-variant/20 z-0">
                                  <GPSMap address={order.shippingAddress} />
                                </div>
                              </div>
                            </div>

                            {/* Discount Banner */}
                            {discount > 0 && (
                              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-5 py-4 rounded-lg text-xs font-medium flex items-center justify-between shadow-3xs text-left">
                                <div className="flex items-center gap-2">
                                  <svg
                                    className="w-4 h-4 text-emerald-600 fill-emerald-600 shrink-0"
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                  >
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                                  </svg>
                                  <span>Artisan Premium Discount Applied</span>
                                </div>
                                <strong className="text-emerald-950 font-body">
                                  Saved ₹{discount.toLocaleString()} on this order!
                                </strong>
                              </div>
                            )}

                            {/* Collapsible Payment Details Panel */}
                            <div className="bg-surface-bright border border-outline-variant/30 rounded-lg overflow-hidden shadow-2xs text-left">
                              <button
                                onClick={() => setIsPriceDetailsOpen(!isPriceDetailsOpen)}
                                className="w-full px-6 py-4 flex items-center justify-between hover:bg-surface-container/10 transition-colors font-bold text-xs uppercase tracking-wider text-on-surface border-b border-outline-variant/15 text-left cursor-pointer bg-transparent border-0 outline-0"
                              >
                                <span>Order Price Breakdown</span>
                                <svg
                                  className="w-4 h-4 text-secondary transition-transform duration-200 shrink-0"
                                  style={{
                                    transform: isPriceDetailsOpen ? 'rotate(180deg)' : 'none',
                                  }}
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2.5"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M19 9l-7 7-7-7"
                                  />
                                </svg>
                              </button>

                              <AnimatePresence initial={false}>
                                {isPriceDetailsOpen && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="overflow-hidden bg-surface-container/10"
                                  >
                                    <div className="p-6 space-y-4 text-xs border-b border-outline-variant/10">
                                      <div className="space-y-2.5">
                                        <div className="flex justify-between text-secondary">
                                          <span>Items Subtotal</span>
                                          <span className="font-body font-semibold text-on-surface">
                                            ₹
                                            {(
                                              order.total -
                                              (order.shippingFee || 0) +
                                              (order.discount || 0)
                                            ).toLocaleString()}
                                          </span>
                                        </div>
                                        <div className="flex justify-between text-secondary">
                                          <span>Delivery & Shipping Fee</span>
                                          <span className="font-body text-on-surface">
                                            {order.shippingFee ? `₹${order.shippingFee}` : 'FREE'}
                                          </span>
                                        </div>
                                        {order.discount > 0 && (
                                          <div className="flex justify-between text-emerald-700">
                                            <span>Premium Coupon Discount</span>
                                            <span className="font-body font-semibold">
                                              -₹{order.discount.toLocaleString()}
                                            </span>
                                          </div>
                                        )}
                                        {order.codFee > 0 && (
                                          <div className="flex justify-between text-secondary">
                                            <span>COD Transaction Fees</span>
                                            <span className="font-body text-on-surface">
                                              ₹{order.codFee}
                                            </span>
                                          </div>
                                        )}
                                        <div className="pt-3.5 border-t border-dashed border-outline-variant/25 flex justify-between font-bold text-on-surface text-sm">
                                          <span>Amount Paid</span>
                                          <span className="text-primary font-body text-base">
                                            ₹{(order.total || 0).toLocaleString()}
                                          </span>
                                        </div>
                                      </div>

                                      <div className="pt-3.5 border-t border-outline-variant/15 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                        <div className="flex items-center gap-2 text-secondary">
                                          <svg
                                            className="w-3.5 h-3.5 text-secondary shrink-0"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            viewBox="0 0 24 24"
                                          >
                                            <rect x="2" y="5" width="20" height="14" rx="2" />
                                            <line x1="2" y1="10" x2="22" y2="10" />
                                          </svg>
                                          <span className="font-semibold uppercase tracking-wider text-[9px]">
                                            Payment Method:{' '}
                                            {order.paymentMethod?.toUpperCase() ||
                                              'Razorpay Online'}
                                          </span>
                                        </div>
                                        <span className="text-[9px] text-secondary/60">
                                          Sold by: Siri Arts & Crafts Private Limited
                                        </span>
                                      </div>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>

                              {/* Download Invoice Action */}
                              <div className="bg-surface-container-low/40 px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4 border-t border-outline-variant/15">
                                <span className="text-[10px] text-secondary font-light font-body">
                                  Need an official copy? Click download to retrieve the tax invoice
                                  report.
                                </span>
                                <button
                                  onClick={() => downloadInvoice(order._id)}
                                  className="group flex items-center justify-center gap-2 px-6 py-3 bg-[#735c00] hover:bg-[#8c7335] text-white transition-all duration-300 rounded-lg font-bold uppercase tracking-widest text-[10px] shadow-sm hover:shadow-md cursor-pointer active:scale-[0.98] whitespace-nowrap border-0"
                                >
                                  <svg
                                    className="w-4 h-4 transition-transform duration-300 group-hover:translate-y-0.5"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                                    />
                                  </svg>
                                  <span>Download Tax Invoice</span>
                                </button>
                              </div>
                            </div>

                            {/* SMS Logs Update Callout */}
                            <div className="bg-surface-bright border border-outline-variant/30 rounded-lg p-5 shadow-2xs text-xs flex items-center gap-3 text-left">
                              <div className="bg-primary/5 p-2 rounded-lg border border-primary/10 flex items-center justify-center shrink-0">
                                <svg
                                  className="w-3.5 h-3.5 text-primary shrink-0"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                                  />
                                </svg>
                              </div>
                              <p className="text-secondary font-light font-body leading-relaxed">
                                Real-time dispatch and delivery status updates are forwarded
                                automatically to{' '}
                                <strong className="font-semibold text-on-surface">
                                  {user?.phone || 'your mobile contact'}
                                </strong>{' '}
                                and{' '}
                                <strong className="font-semibold text-on-surface">
                                  {user?.email}
                                </strong>
                                .
                              </p>
                            </div>

                            {/* Metadata Order Footer */}
                            <div className="text-[9px] text-secondary/60 font-medium space-y-1.5 pl-2 uppercase tracking-widest text-left">
                              <div>
                                Ordered on:{' '}
                                {new Date(order.createdAt).toLocaleDateString('en-IN', {
                                  day: 'numeric',
                                  month: 'long',
                                  year: 'numeric',
                                })}
                              </div>
                              <div>Unique ID: {order._id}</div>
                              {order.trackingNumber && (
                                <div>
                                  Courier Waybill: {order.trackingNumber} (
                                  {order.courierPartner || 'Delhivery Logistics'})
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()
                    )}
                  </motion.div>
                </ErrorBoundary>
              )}

              {/* TAB 5: WISHLIST COLLECTIONS */}
              {activeTab === 'wishlist' && (
                <ErrorBoundary
                  key="wishlist-error"
                  fallback={
                    <div className="p-6 text-center text-rose-500 font-bold bg-rose-50 rounded-lg">
                      Failed to load wishlist tab.
                    </div>
                  }
                >
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
                          <React.Suspense fallback={<ProductCardSkeleton />}>
                            {wishlistItems.map((item, idx) => (
                              <ProductCard
                                key={item._id || idx}
                                {...item}
                                id={item.id || item._id}
                                imageSrc={item.imageSrc || item.image || item.images?.[0]}
                              />
                            ))}
                          </React.Suspense>
                        </AnimatePresence>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-center py-20 bg-surface-bright rounded-lg border border-outline-variant/40 shadow-xs relative overflow-hidden">
                        <span
                          className="material-symbols-outlined text-[48px] text-primary/20 mb-4"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          favorite
                        </span>
                        <h3 className="font-display text-xl text-on-surface mb-2 font-medium">
                          Curated Gallery Empty
                        </h3>
                        <p className="text-[11px] text-secondary font-light max-w-sm mx-auto mb-6">
                          Your wishlist is completely empty. Explore the shop to save event
                          masterpieces!
                        </p>
                        <Link
                          to="/products"
                          className="bg-primary text-surface px-8 py-3 rounded-lg font-bold uppercase tracking-[0.2em] text-[9px] hover:bg-on-surface transition-colors shadow-md"
                        >
                          Explore Collection
                        </Link>
                      </div>
                    )}
                  </motion.div>
                </ErrorBoundary>
              )}

              {/* TAB 6: DYNAMIC SHOPPING BAG */}
              {activeTab === 'cart' && (
                <ErrorBoundary
                  key="cart-error"
                  fallback={
                    <div className="p-6 text-center text-rose-500 font-bold bg-rose-50 rounded-lg">
                      Failed to load cart tab.
                    </div>
                  }
                >
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
                          Items currently reserved for your signature verification and checkout
                          session.
                        </span>
                      </div>
                    </div>

                    {cartItems && cartItems.length > 0 ? (
                      <div className="space-y-6">
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                          {cartItems.map((item) => {
                            const prod = item.product || item;
                            return (
                              <ProductCard
                                key={prod._id || prod.id}
                                {...prod}
                                imageSrc={prod.imageSrc || prod.images?.[0]}
                              />
                            );
                          })}
                        </div>
                        <div className="pt-4 flex justify-end">
                          <Link
                            to="/cart"
                            className="btn-primary px-8 py-3 rounded-lg font-bold uppercase tracking-widest text-[10px] inline-flex items-center gap-2 cursor-pointer shadow-md"
                          >
                            <span>Secure Entire Bag</span>
                            <span className="material-symbols-outlined text-[13px]">
                              arrow_forward
                            </span>
                          </Link>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-center py-20 bg-surface-bright rounded-lg border border-outline-variant/40 shadow-xs relative overflow-hidden">
                        <span className="material-symbols-outlined text-[48px] text-primary/20 mb-4">
                          shopping_bag
                        </span>
                        <h3 className="font-display text-xl text-on-surface mb-2 font-medium">
                          Your Bag is Empty
                        </h3>
                        <p className="text-[11px] text-secondary font-light max-w-sm mx-auto mb-6">
                          Your shopping bag is completely empty. Start browsing our curated catalog
                          to reserve your event pieces.
                        </p>
                        <Link
                          to="/collections"
                          className="group inline-flex items-center gap-2 text-on-surface hover:text-primary transition-colors py-2 font-label text-[11px] uppercase tracking-[0.2em] font-bold border-b-2 border-on-surface hover:border-primary"
                        >
                          <span>Explore Collections</span>
                          <span className="material-symbols-outlined text-[14px] group-hover:translate-x-1 transition-transform">
                            arrow_forward
                          </span>
                        </Link>
                      </div>
                    )}
                  </motion.div>
                </ErrorBoundary>
              )}

              {/* TAB 7: RECENTLY VIEWED PRODUCTS */}
              {activeTab === 'recently-viewed' && (
                <ErrorBoundary
                  key="recently-viewed-error"
                  fallback={
                    <div className="p-6 text-center text-rose-500 font-bold bg-rose-50 rounded-lg">
                      Failed to load recently viewed tab.
                    </div>
                  }
                >
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
                        A list of the products and spec-sheets you opened in your active verified
                        session.
                      </span>
                    </div>

                    {isLoadingRecentlyViewed ? (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <ProductCardSkeleton />
                        <ProductCardSkeleton />
                      </div>
                    ) : recentlyViewed && recentlyViewed.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                        <AnimatePresence>
                          {recentlyViewed.map((item) => {
                            const prod = item.product;
                            if (!prod) return null;
                            return (
                              <ProductCard
                                key={prod._id || prod.id}
                                {...prod}
                                imageSrc={prod.imageSrc || prod.images?.[0]}
                              />
                            );
                          })}
                        </AnimatePresence>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-center py-20 bg-surface-bright rounded-lg border border-outline-variant/40 shadow-xs relative overflow-hidden">
                        <span className="material-symbols-outlined text-[48px] text-primary/20 mb-4">
                          history
                        </span>
                        <h3 className="font-display text-xl text-on-surface mb-2 font-medium">
                          No Session History
                        </h3>
                        <p className="text-[11px] text-secondary font-light max-w-sm mx-auto mb-6">
                          No recently viewed items tracked yet. Open any spec-sheet from the
                          boutique to build your session history!
                        </p>
                        <Link
                          to="/products"
                          className="bg-primary text-surface px-8 py-3 rounded-lg font-bold uppercase tracking-[0.2em] text-[9px] hover:bg-on-surface transition-colors shadow-md"
                        >
                          Discover Pieces
                        </Link>
                      </div>
                    )}
                  </motion.div>
                </ErrorBoundary>
              )}

              {activeTab === 'loyalty' && (
                <ErrorBoundary
                  key="loyalty-error"
                  fallback={
                    <div className="p-6 text-center text-rose-500 font-bold bg-rose-50 rounded-lg">
                      Failed to load loyalty tab.
                    </div>
                  }
                >
                  <motion.div
                    id="panel-loyalty"
                    role="tabpanel"
                    key="tab-loyalty"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.3 }}
                  >
                    <React.Suspense fallback={<Skeleton className="h-32 w-full rounded-lg" />}>
                      <LoyaltyPanel />
                    </React.Suspense>
                  </motion.div>
                </ErrorBoundary>
              )}
            </>
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
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 lg:top-1/2 lg:left-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:bottom-auto lg:max-w-lg w-full bg-white rounded-t-lg lg:rounded-lg shadow-2xl z-[101] overflow-hidden"
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
                    {editingAddressId === 'new'
                      ? 'Add New Site Parameters'
                      : 'Modify Site Parameters'}
                  </h3>
                  <button
                    onClick={() => setIsAddressModalOpen(false)}
                    className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-secondary hover:text-primary transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-base">close</span>
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
                      className="inline-flex items-center gap-1.5 text-[9px] text-primary font-bold uppercase tracking-widest bg-primary/5 hover:bg-primary/10 border border-primary/20 px-3.5 py-1.5 rounded-lg cursor-pointer transition-all disabled:opacity-50 shadow-xs"
                    >
                      {isDetectingLocation ? (
                        <>
                          <div className="skeleton-box inline-block w-3 h-3 rounded-md" />
                          <span>Locating...</span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-[12px] font-bold">
                            my_location
                          </span>
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
                      <span>
                        GPS Locked: {addressFormData.latitude.toFixed(6)},{' '}
                        {addressFormData.longitude.toFixed(6)}
                      </span>
                    </motion.div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="dashboard-address-name"
                        className="block text-[9px] uppercase font-bold text-secondary tracking-widest mb-1"
                      >
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
                      <label
                        htmlFor="dashboard-address-phone"
                        className="block text-[9px] uppercase font-bold text-secondary tracking-widest mb-1"
                      >
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
                      <label
                        htmlFor="dashboard-address-pincode"
                        className="block text-[9px] uppercase font-bold text-secondary tracking-widest mb-1"
                      >
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
                      <label
                        htmlFor="dashboard-address-locality"
                        className="block text-[9px] uppercase font-bold text-secondary tracking-widest mb-1"
                      >
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
                    <label
                      htmlFor="dashboard-address-street"
                      className="block text-[9px] uppercase font-bold text-secondary tracking-widest mb-1"
                    >
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
                      <label
                        htmlFor="dashboard-address-city"
                        className="block text-[9px] uppercase font-bold text-secondary tracking-widest mb-1"
                      >
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
                      <label
                        htmlFor="dashboard-address-state"
                        className="block text-[9px] uppercase font-bold text-secondary tracking-widest mb-1"
                      >
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
                      className="flex-1 btn-primary py-3 rounded-lg font-bold uppercase tracking-widest text-[10px] cursor-pointer inline-flex items-center justify-center gap-1.5"
                    >
                      {isAddressSaving ? (
                        <div className="skeleton-box inline-block w-3 h-3 rounded-md" />
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-xs">save</span>
                          <span>{editingAddressId === 'new' ? 'Add Address' : 'Save Changes'}</span>
                        </>
                      )}
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="button"
                      onClick={() => setIsAddressModalOpen(false)}
                      className="flex-1 btn-outline py-3 rounded-lg font-bold uppercase tracking-widest text-[10px] cursor-pointer"
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
              className="bg-surface w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-lg shadow-2xl"
            >
              <React.Suspense
                fallback={
                  <div className="p-8">
                    <Skeleton className="h-80 w-full rounded-lg" />
                  </div>
                }
              >
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
