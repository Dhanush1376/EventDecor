import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  Profiler,
} from 'react';
import { logRenderMetrics } from '../utils/performance/profilerLogger';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useWishlist } from './WishlistContext';
import { useCart } from './CartContext';
import { useWebsiteContent } from '../hooks/useWebsiteContent';
import { useDashboardData } from '../hooks/useDashboardData';
import { userService } from '../services/domainServices';
import toast from 'react-hot-toast';

const DashboardContext = createContext(null);

export function DashboardProvider({ children }) {
  const _navigate = useNavigate();
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

  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
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

  // Address forms
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [addressFormData, setAddressFormData] = useState(null);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState(null);
  const [reviewingProduct, setReviewingProduct] = useState(null);

  const _fetchOrdersList = () => refetchDashboardData();
  const fetchAddressesList = () => refetchDashboardData();

  // Sync user data on mount if needed
  useEffect(() => {
    if (user) {
      // Any remaining global sync if needed
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
    if (orderFilter === 'RETURNS')
      return orders.filter(
        (o) => o.hasActiveReturn || o.returnRequestIds?.length > 0 || o.returnRequests?.length > 0,
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

  // Avatar Upload
  const handleAvatarClick = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, []);

  const handleAvatarChange = useCallback(
    async (e) => {
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
    },
    [checkAuth],
  );

  // Address Handlers
  const handleAddressEdit = useCallback((addr) => {
    setEditingAddressId(addr._id || addr.id);
    setIsAddressModalOpen(true);
  }, []);

  const handleDeleteAddress = useCallback(async (id) => {
    if (!window.confirm('Are you sure you want to delete this address?')) return;
    const toastId = toast.loading('Removing address...');
    try {
      await userService.deleteAddress(id);
      toast.success('Address deleted successfully!', { id: toastId });
      refetchDashboardData();
    } catch (_err) {
      toast.error('Failed to delete address', { id: toastId });
    }
  }, []);

  const handleSetDefaultAddress = useCallback(async (id) => {
    const toastId = toast.loading('Setting default parameters...');
    try {
      await userService.setDefaultAddress(id);
      toast.success('Default delivery address set!', { id: toastId });
      refetchDashboardData();
    } catch (_err) {
      toast.error('Failed to set default address', { id: toastId });
    }
  }, []);

  const downloadInvoice = useCallback(
    (orderId) => {
      const targetOrder = orders.find((o) => (o._id || o.id) === orderId);
      if (targetOrder) {
        setSelectedInvoiceOrder(targetOrder);
      } else {
        toast.error('Invoice data currently unavailable. Refreshing feed.');
      }
    },
    [orders],
  );

  const contextValue = useMemo(
    () => ({
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

      isUploadingAvatar,

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

      orderFilter,
      setOrderFilter,
      filteredOrders,
      dashboardCounts,
      orderItems,
      selectedOrder,
      selectedItem,

      handleAvatarClick,
      handleAvatarChange,

      handleAddressEdit,

      handleDeleteAddress,
      handleSetDefaultAddress,
      downloadInvoice,
    }),
    [
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
      addressText,
      phoneText,
      whatsappUrl,
      activeTab,
      mobileShowContent,
      isUploadingAvatar,
      selectedOrderId,
      selectedOrderItemIndex,
      isPriceDetailsOpen,
      orders,
      rentals,
      addresses,
      recentlyViewed,
      isOrdersLoading,
      isRentalsLoading,
      isAddressesLoading,
      isLoadingRecentlyViewed,
      refetchDashboardData,
      editingAddressId,
      addressFormData,
      isAddressModalOpen,
      selectedInvoiceOrder,
      reviewingProduct,
      orderFilter,
      filteredOrders,
      dashboardCounts,
      orderItems,
      selectedOrder,
      selectedItem,
      setOrders,
      setAddresses,
      setRecentlyViewed,
      handleAvatarClick,
      handleAvatarChange,
      handleAddressEdit,
      handleDeleteAddress,
      handleSetDefaultAddress,
      downloadInvoice,
    ],
  );

  return (
    <Profiler id="DashboardContext" onRender={logRenderMetrics}>
      <DashboardContext.Provider value={contextValue}>{children}</DashboardContext.Provider>
    </Profiler>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
}
