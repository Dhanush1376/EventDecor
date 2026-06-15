import { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useWishlist } from './WishlistContext';
import { useCart } from './CartContext';
import { useWebsiteContent } from '../hooks/useWebsiteContent';
import { useDashboardData } from '../hooks/useDashboardData';
import { userService } from '../services/domainServices';
import toast from 'react-hot-toast';
import logger from '../utils/logger';

const DashboardContext = createContext(null);

export function DashboardProvider({ children }) {
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

  // Sync tab from URL query params (retained for backward compatibility)
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

  const [orderFilter, setOrderFilter] = useState('PURCHASE');

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

            const streetParts = [addr.house_number, addr.building, addr.road].filter(Boolean);
            const addressString =
              streetParts.length > 0
                ? streetParts.join(', ')
                : data.display_name.split(',').slice(0, 3).join(',').trim();

            setAddressFormData((prev) => ({
              ...prev,
              pincode: pincode.replace(/\s/g, ''),
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

  const contextValue = {
    user,
    logout,
    checkAuth,
    openAuthModal,
    wishlistItems,
    removeFromWishlist,
    cartCount,
    cartItems,
    updateQuantity,
    removeItem,
    fileInputRef,
    addressText,
    phoneText,
    whatsappUrl,
    activeTab,
    setActiveTab,
    mobileShowContent,
    setMobileShowContent,
    isUpdatingProfile,
    isUploadingAvatar,
    isPreferencesSaving,
    selectedOrderId,
    setSelectedOrderId,
    selectedOrderItemIndex,
    setSelectedOrderItemIndex,
    isPriceDetailsOpen,
    setIsPriceDetailsOpen,
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
    refetchDashboardData,
    profileForm,
    setProfileForm,
    prefsForm,
    setPrefsForm,
    editingAddressId,
    setEditingAddressId,
    addressFormData,
    setAddressFormData,
    isAddressModalOpen,
    setIsAddressModalOpen,
    selectedInvoiceOrder,
    setSelectedInvoiceOrder,
    reviewingProduct,
    setReviewingProduct,
    isAddressSaving,
    setIsAddressSaving,
    isDetectingLocation,
    setIsDetectingLocation,
    orderFilter,
    setOrderFilter,
    filteredOrders,
    dashboardCounts,
    orderItems,
    selectedOrder,
    selectedItem,
    handleProfileSave,
    handlePreferencesSave,
    handleAvatarClick,
    handleAvatarChange,
    handleUseCurrentLocation,
    handleAddressEdit,
    handleAddressSave,
    handleDeleteAddress,
    handleSetDefaultAddress,
    downloadInvoice,
  };

  return <DashboardContext.Provider value={contextValue}>{children}</DashboardContext.Provider>;
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
}
