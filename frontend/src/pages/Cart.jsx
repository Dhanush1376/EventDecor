import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { m as motion, AnimatePresence } from 'framer-motion';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { SEO } from '../components/seo/SEO';
import { handleImageError } from '../utils/imageUtils';
import { couponService, cmsService } from '../services/domainServices';
import { useAuth } from '../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { CartSkeleton, Skeleton } from '../components/ui/Skeleton';
import { useRecommendationTracker } from '../hooks/useRecommendationTracker';
import { CheckoutSteps } from '../components/ui/CheckoutSteps';
import { persistentStorage } from '../utils/persistentStorage';

const RecommendationSystem = React.lazy(() =>
  import('../components/sections/RecommendationSystem').then((m) => ({
    default: m.RecommendationSystem,
  })),
);

export function Cart() {
  const {
    items,
    removeItem,
    updateQuantity,
    cartCount,
    addItem,
    summary,
    totalMRP,
    loading,
    claimedCoupon,
    setClaimedCoupon,
    activeCartMode,
    setActiveCartMode,
    purchaseCartCount,
    rentalCartCount,
  } = useCart();
  const { addItem: addToWishlist } = useWishlist();
  const { runProtectedAction, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  // Track cart page view
  useRecommendationTracker({
    targetType: 'page',
    targetId: 'cart',
    source: 'cart',
  });

  const { data: settingsData, isLoading: settingsLoading } = useQuery({
    queryKey: ['cms', 'section', 'storeSettings'],
    queryFn: async () => {
      const res = await cmsService.getSection('storeSettings');
      return res.success ? res.data : res;
    },
    staleTime: 10 * 60 * 1000,
  });
  const settings = settingsData || {};

  // Always reset checkout step state when viewing the cart to ensure fresh start on step 1 (Address)
  useEffect(() => {
    try {
      sessionStorage.removeItem('siri_checkout_step');
    } catch (e) {}
  }, []);

  // Standard eCommerce features: Coupon input
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null); // { code, discountPercent, calculatedDiscount }
  const [couponError, setCouponError] = useState('');
  const [notification, setNotification] = useState('');
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);

  const { data: couponsData } = useQuery({
    queryKey: ['coupons'],
    queryFn: async () => {
      const res = await couponService.getAll();
      return res.success ? res.data : res;
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

  const activeCoupons = React.useMemo(() => {
    const list =
      couponsData?.data || couponsData?.items || (Array.isArray(couponsData) ? couponsData : []);
    return list.filter((c) => {
      const isExpired = new Date() > new Date(c.expiryDate);
      return c.isActive && !isExpired && (!c.usageLimit || c.usedCount < c.usageLimit);
    });
  }, [couponsData]);

  const triggerNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 3000);
  };

  // Pricing Summary Calculations based on REAL backend state
  const actualSubtotal = summary?.subtotal || 0;
  const discountOnMRP = Math.max(0, (totalMRP || 0) - actualSubtotal);
  const couponDiscountAmount = appliedCoupon?.calculatedDiscount || 0;

  // Calculate total deposits for rental mode
  const depositTotal =
    activeCartMode === 'rental'
      ? items.reduce((acc, item) => acc + (item.deposit || 0) * item.quantity, 0)
      : 0;

  const shippingFee = summary?.shippingFee || 0;
  const platformFee = summary?.platformFee || 0;

  // Wallet state
  const [useWallet, setUseWallet] = useState(() => {
    return persistentStorage.getItem('siri_checkout_use_wallet', {
      session: true,
      fallback: false,
    });
  });

  useEffect(() => {
    persistentStorage.setItem('siri_checkout_use_wallet', useWallet, { session: true });
  }, [useWallet]);

  const basePayableAmount =
    actualSubtotal - couponDiscountAmount + platformFee + shippingFee + depositTotal;
  const walletDeduction =
    useWallet && user?.walletBalance > 0 ? Math.min(user.walletBalance, basePayableAmount) : 0;

  const finalPayableAmount = items.length > 0 ? basePayableAmount - walletDeduction : 0;

  // Find the closest coupon that the user is yet to unlock
  const nextAvailableCoupon = React.useMemo(() => {
    return activeCoupons
      .filter((c) => c.minPurchaseAmount && c.minPurchaseAmount > actualSubtotal)
      .sort((a, b) => a.minPurchaseAmount - b.minPurchaseAmount)[0];
  }, [activeCoupons, actualSubtotal]);

  const couponGap = nextAvailableCoupon
    ? nextAvailableCoupon.minPurchaseAmount - actualSubtotal
    : 0;

  // Coupon handling logic
  const handleApplyCoupon = async (e, codeParam = null) => {
    if (e) e.preventDefault();
    const code = (codeParam || couponInput).trim().toUpperCase();
    if (!code) return;

    if (actualSubtotal === 0) {
      setCouponError('Please add items to apply a coupon.');
      return;
    }

    try {
      const res = await couponService.apply(code, actualSubtotal);
      if (res.success) {
        setAppliedCoupon(res.data);
        setClaimedCoupon(code); // Carry over to checkout page automatically
        setCouponError('');
        triggerNotification('Applied coupon successfully');
        setIsCouponModalOpen(false); // Close selector modal if open
      } else {
        setCouponError(res.message || 'Invalid coupon code.');
      }
    } catch (err) {
      setCouponError(err.response?.data?.message || 'Failed to apply coupon.');
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput('');
    setClaimedCoupon(''); // Remove auto-apply on checkout
  };

  // Move active item directly to traditional Wishlist
  const handleMoveToWishlist = (item) => {
    addToWishlist({
      id: item.id || item._id,
      title: item.title,
      price: item.price,
      imageSrc: item.imageSrc,
    });
    removeItem(item.id || item._id, item.variant, item.type);
    triggerNotification(`Moved "${item.title}" to Wishlist`);
  };

  // Move all items to wishlist
  const handleMoveAllToWishlist = () => {
    items.forEach((item) => {
      addToWishlist({
        id: item.id || item._id,
        title: item.title,
        price: item.price,
        imageSrc: item.imageSrc,
      });
      removeItem(item.id || item._id, item.variant, item.type);
    });
    triggerNotification(`Moved all items to Wishlist`);
  };

  // Clear all items
  const handleClearCart = () => {
    items.forEach((item) => {
      removeItem(item.id || item._id, item.variant, item.type);
    });
    triggerNotification(`Bag cleared`);
  };

  const deliveryTimelineDays = settings.deliveryTimelineDays || 5;
  const deliveryDateObj = new Date();
  deliveryDateObj.setDate(deliveryDateObj.getDate() + deliveryTimelineDays);
  const deliveryDateStr = deliveryDateObj.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    weekday: 'short',
  });

  if (settingsLoading || (loading && items.length === 0)) {
    return <CartSkeleton />;
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="bg-surface-container-low min-h-screen pt-20 pb-40 font-body text-on-surface modern-sans-headings"
      >
        <SEO title="Your Bag" description="Review your selected items." />

        {/* Toast Notification with subtle enter */}
        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed top-28 left-1/2 -translate-x-1/2 z-[100] bg-white/40 backdrop-blur-2xl border border-white/60 text-black px-6 py-3 rounded-full shadow-[0_20px_40px_rgba(0,0,0,0.08),_inset_0_1px_0_rgba(255,255,255,0.4)] text-[12px] font-bold tracking-wide flex items-center gap-2.5 whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-[18px] text-green-600 font-fill">
                check_circle
              </span>
              {notification}
            </motion.div>
          )}
        </AnimatePresence>

        {/* CART TABS - Centered Premium Segmented Pill */}
        <div className="w-full bg-surface-bright border-b border-outline-variant/30 py-3 flex justify-center px-4">
          <div className="bg-surface-container/60 backdrop-blur-xl border border-outline-variant/20 p-1.5 rounded-full inline-flex gap-1 items-center relative z-0 shadow-inner">
            {/* Purchase Cart Tab */}
            <button
              onClick={() => setActiveCartMode('purchase')}
              className={`relative px-5 py-2.5 min-h-0 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 sm:gap-2 transition-colors duration-300 cursor-pointer z-10 outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                activeCartMode === 'purchase'
                  ? 'text-primary font-bold'
                  : 'text-on-surface-variant/70 hover:text-on-surface font-medium'
              }`}
            >
              {activeCartMode === 'purchase' && (
                <motion.div
                  layoutId="activeCartTabBg"
                  className="absolute inset-0 bg-surface-bright rounded-full shadow-[0_2px_8px_rgba(115,92,0,0.08)] border border-outline-variant/15 -z-10"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <span className="material-symbols-outlined text-[15px] sm:text-[17px]">
                shopping_cart
              </span>
              <span>Purchase ({purchaseCartCount})</span>
            </button>

            {/* Rental Cart Tab */}
            <button
              onClick={() => setActiveCartMode('rental')}
              className={`relative px-5 py-2.5 min-h-0 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 sm:gap-2 transition-colors duration-300 cursor-pointer z-10 outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                activeCartMode === 'rental'
                  ? 'text-primary font-bold'
                  : 'text-on-surface-variant/70 hover:text-on-surface font-medium'
              }`}
            >
              {activeCartMode === 'rental' && (
                <motion.div
                  layoutId="activeCartTabBg"
                  className="absolute inset-0 bg-surface-bright rounded-full shadow-[0_2px_8px_rgba(115,92,0,0.08)] border border-outline-variant/15 -z-10"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <span className="material-symbols-outlined text-[15px] sm:text-[17px]">sell</span>
              <span>Rental ({rentalCartCount})</span>
            </button>
          </div>
        </div>

        {/* Top Header Checkout Workflow Strip */}
        <div className="mb-8">
          <CheckoutSteps
            steps={
              activeCartMode === 'rental'
                ? ['BAG', 'DURATION', 'ADDRESS', 'VERIFY', 'PAYMENT']
                : ['BAG', 'ADDRESS', 'PAYMENT']
            }
            currentStep={0}
            orderType={activeCartMode}
          />
        </div>

        <div className="max-w-[1240px] mx-auto px-2 sm:px-6">
          {items.length === 0 ? (
            /* Empty Bag State */
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-surface-bright border border-outline-variant/40 rounded-lg p-16 text-center max-w-lg mx-auto my-12 shadow-xs"
            >
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6 mx-auto">
                <span className="material-symbols-outlined text-primary text-[30px]">
                  {activeCartMode === 'rental' ? 'sell' : 'shopping_bag'}
                </span>
              </div>
              <h2 className="font-display text-[22px] font-extrabold text-on-surface tracking-tight mb-2">
                {activeCartMode === 'rental' ? 'No Rental Items Yet' : 'Your bag is empty'}
              </h2>
              <p className="font-body text-[13px] text-secondary/70 max-w-[220px] mx-auto leading-relaxed mb-8">
                {activeCartMode === 'rental'
                  ? 'Browse rental products and reserve them for your event.'
                  : "Looks like you haven't added anything yet."}
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
            </motion.div>
          ) : (
            /* Multi-column Classic Checkout Engine */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Content List: Cart Entities */}
              <div className="lg:col-span-7 xl:col-span-8 space-y-3">
                {/* Savings Banner at the top */}
                {discountOnMRP + couponDiscountAmount > 0 && (
                  <div className="bg-primary/10 border border-primary/20 text-primary text-[13px] font-bold rounded-lg flex items-center justify-center p-3 gap-2 shadow-xs">
                    <span className="material-symbols-outlined text-[18px]">verified</span>
                    You're saving ₹{(discountOnMRP + couponDiscountAmount).toLocaleString()} on this
                    order
                  </div>
                )}

                {/* Dynamic Special Offer Banner */}
                {nextAvailableCoupon && !appliedCoupon && (
                  <div className="bg-surface-bright border border-outline-variant/40 rounded-lg p-5 flex gap-4 shadow-xs relative overflow-hidden">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/10 rounded-full opacity-50 blur-xl"></div>
                    <div className="flex-1 z-10">
                      <h3 className="text-on-surface font-extrabold text-[13px] mb-1 tracking-wide">
                        Add ₹{couponGap.toLocaleString()} to unlock special prices
                      </h3>
                      <p className="text-secondary text-[11px] leading-relaxed">
                        Add items worth ₹{couponGap.toLocaleString()} more to apply code{' '}
                        <span className="font-bold text-on-surface uppercase tracking-wide">
                          {nextAvailableCoupon.code}
                        </span>{' '}
                        for {nextAvailableCoupon.discountPercent}% OFF!
                      </p>
                    </div>
                    <span className="material-symbols-outlined text-primary text-3xl">redeem</span>
                  </div>
                )}

                {/* Top Selection Bar */}
                <div className="bg-surface-bright rounded-lg p-4 flex items-center justify-between font-bold text-[11px] uppercase tracking-widest shadow-xs border border-outline-variant/40">
                  <div className="flex items-center gap-2">
                    <span>
                      <span className="text-on-surface font-extrabold">{cartCount}</span> Items in
                      Bag{' '}
                      <span className="text-secondary font-medium ml-1">
                        (₹{actualSubtotal.toLocaleString()})
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-secondary">
                    <button
                      onClick={handleClearCart}
                      className="hover:text-red-600 transition-colors cursor-pointer"
                      title="Delete All"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                    <button
                      onClick={handleMoveAllToWishlist}
                      className="hover:text-primary transition-colors cursor-pointer"
                      title="Move All to Wishlist"
                    >
                      <span className="material-symbols-outlined text-[18px]">favorite_border</span>
                    </button>
                  </div>
                </div>

                {/* Cart Line Items */}
                <motion.div layout className="space-y-3">
                  <AnimatePresence>
                    {items.map((item) => {
                      const uniqueKey = `${item.id || item._id}-${item.variant}`;
                      const itemOldPrice = item.oldPrice || item.price;
                      const savingsPct =
                        itemOldPrice > item.price
                          ? Math.round(((itemOldPrice - item.price) / itemOldPrice) * 100)
                          : 0;

                      return (
                        <motion.div
                          layout
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, x: -50, scale: 0.9 }}
                          transition={{ duration: 0.25 }}
                          key={uniqueKey}
                          className={`bg-surface-bright rounded-lg shadow-xs p-3.5 relative group border transition-all duration-300 ${item.stock === 0 ? 'border-red-200' : 'border-outline-variant/40 hover:border-primary/20'}`}
                        >
                          {/* Top Right Close Icon */}
                          <button
                            onClick={() => {
                              removeItem(item.id || item._id, item.variant, item.type);
                              triggerNotification(`Removed "${item.title}"`);
                            }}
                            className="absolute top-3 right-3 text-secondary/60 hover:text-on-surface transition-colors cursor-pointer w-7 h-7 flex items-center justify-center rounded-full hover:bg-surface-container z-10"
                          >
                            <span className="material-symbols-outlined text-[20px]">close</span>
                          </button>

                          <div className="flex gap-3 sm:gap-4">
                            {/* Left Column: Image */}
                            <div className="relative w-[85px] h-[115px] sm:w-[100px] sm:h-[130px] bg-surface-container rounded-md overflow-hidden flex-shrink-0 border border-outline-variant/20">
                              {item.stock === 0 && (
                                <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-10 flex items-center justify-center">
                                  <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">
                                    Out of Stock
                                  </span>
                                </div>
                              )}
                              <Link
                                to={`/product/${item.id || item._id}`}
                                className="w-full h-full block"
                              >
                                <motion.img
                                  onError={handleImageError}
                                  whileHover={{ scale: 1.05 }}
                                  src={item.imageSrc}
                                  alt={item.title}
                                  className={`w-full h-full object-cover transition-transform ${item.stock === 0 ? 'grayscale' : ''}`}
                                />
                              </Link>
                            </div>

                            {/* Right Details */}
                            <div className="flex-1 min-w-0 pr-8 py-1">
                              {activeCartMode === 'rental' && (
                                <span className="inline-block bg-primary/10 text-primary text-[9px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-[3px] mb-2 border border-primary/20">
                                  🏷 Rental Item
                                </span>
                              )}
                              <Link to={`/product/${item.id || item._id}`}>
                                <h3 className="font-display font-medium text-[13px] sm:text-[14px] text-on-surface line-clamp-2 leading-tight">
                                  {item.title}
                                </h3>
                              </Link>

                              {/* Inline touch-friendly Size & Qty controls */}
                              <div className="flex items-center gap-3 mt-4">
                                {item.variant && item.variant !== 'Default' && (
                                  <div className="bg-surface-container-lowest border border-outline-variant/60 rounded px-2.5 py-1 text-[12px] font-bold text-on-surface flex items-center gap-1">
                                    <span className="text-secondary/70 font-medium">Size:</span>{' '}
                                    {item.variant}
                                  </div>
                                )}

                                <div
                                  className={`flex items-center border border-outline-variant/60 rounded overflow-hidden bg-surface-container-lowest h-[24px] mt-1 ${item.stock === 0 ? 'opacity-50 pointer-events-none' : ''}`}
                                >
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      updateQuantity(
                                        item.id || item._id,
                                        item.variant,
                                        item.quantity - 1,
                                      );
                                    }}
                                    className="w-7 h-full flex items-center justify-center text-secondary hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
                                    aria-label="Decrease quantity"
                                  >
                                    <span className="material-symbols-outlined text-[14px]">
                                      remove
                                    </span>
                                  </button>
                                  <div className="w-7 h-full flex items-center justify-center text-[11px] font-bold text-on-surface border-x border-outline-variant/30 bg-surface-bright">
                                    {item.quantity}
                                  </div>
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      updateQuantity(
                                        item.id || item._id,
                                        item.variant,
                                        item.quantity + 1,
                                      );
                                    }}
                                    disabled={item.quantity >= item.stock}
                                    className={`w-7 h-full flex items-center justify-center transition-colors ${item.quantity >= item.stock ? 'text-secondary/30 cursor-not-allowed bg-surface-container-low' : 'text-secondary hover:text-on-surface hover:bg-surface-container cursor-pointer'}`}
                                    aria-label="Increase quantity"
                                  >
                                    <span className="material-symbols-outlined text-[14px]">
                                      add
                                    </span>
                                  </button>
                                </div>
                              </div>

                              {item.quantity >= item.stock && item.stock > 0 && (
                                <span className="text-[10px] text-red-500 font-medium block mt-1">
                                  Maximum stock reached
                                </span>
                              )}

                              {/* Pricing & Policy below Quantity */}
                              <div className="mt-3 flex flex-col gap-2 w-full">
                                {/* Pricing Row */}
                                {activeCartMode === 'rental' ? (
                                  <div className="flex flex-col gap-0.5">
                                    <div className="flex items-baseline gap-1.5 flex-wrap">
                                      <span className="text-[13px] font-extrabold text-on-surface">
                                        ₹
                                        {(
                                          (item.price + (item.deposit || 0)) *
                                          item.quantity
                                        ).toLocaleString()}
                                      </span>
                                      <span className="text-[9px] font-bold text-secondary uppercase tracking-widest">
                                        Total Due
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[10px] text-secondary">
                                      <span>Fee: ₹{item.price.toLocaleString()}</span>
                                      <span className="w-1 h-1 rounded-full bg-outline-variant/50"></span>
                                      <span>Deposit: ₹{item.deposit?.toLocaleString() || 0}</span>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-baseline gap-1.5 flex-wrap">
                                    <span className="text-[13px] font-extrabold text-on-surface">
                                      ₹{item.price.toLocaleString()}
                                    </span>
                                    {itemOldPrice > item.price && (
                                      <span className="text-[10px] text-secondary line-through">
                                        ₹{itemOldPrice.toLocaleString()}
                                      </span>
                                    )}
                                    {savingsPct > 0 && (
                                      <span className="text-[10px] font-bold text-primary">
                                        {savingsPct}% Off
                                      </span>
                                    )}
                                  </div>
                                )}

                                {/* Return policy & delivery forecast strip */}
                                <div className="text-[11px] text-secondary w-full">
                                  {activeCartMode === 'rental' ? (
                                    <div className="flex flex-col gap-1.5 mt-1">
                                      <div className="flex items-center gap-1.5 whitespace-nowrap text-[10px]">
                                        <span className="material-symbols-outlined text-[13px]">
                                          calendar_month
                                        </span>
                                        <span>
                                          Duration:{' '}
                                          <span className="font-bold text-primary uppercase">
                                            Select at checkout ➝
                                          </span>
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-1.5 whitespace-nowrap text-[10px]">
                                        <span className="material-symbols-outlined text-[13px]">
                                          lock
                                        </span>
                                        <span>
                                          Fully Refundable Deposit:{' '}
                                          <span className="font-bold text-on-surface">
                                            ₹{item.deposit?.toLocaleString() || 0}
                                          </span>
                                        </span>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex flex-col gap-1.5 mt-1">
                                      {item.isNonRefundable ? (
                                        <div className="flex items-center gap-1.5 text-[#d97706] font-bold whitespace-nowrap text-[10px]">
                                          <span className="material-symbols-outlined text-[13px]">
                                            block
                                          </span>
                                          Non-Refundable
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-1.5 whitespace-nowrap text-[10px]">
                                          <span className="material-symbols-outlined text-[13px]">
                                            keyboard_return
                                          </span>
                                          <span>
                                            <span className="font-bold text-on-surface">
                                              {settings.returnPolicyDays || 14} days
                                            </span>{' '}
                                            return available
                                          </span>
                                        </div>
                                      )}
                                      <div className="flex items-center gap-1.5 whitespace-nowrap text-[10px]">
                                        <span className="material-symbols-outlined text-[13px]">
                                          local_shipping
                                        </span>
                                        <span>
                                          Delivery by{' '}
                                          <span className="text-on-surface font-bold">
                                            {deliveryDateStr}
                                          </span>
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Wishlist Button inside Card */}
                          <div className="border-t border-outline-variant/30 mt-2 pt-2 text-center">
                            <button
                              onClick={() => handleMoveToWishlist(item)}
                              className="text-[9px] font-bold text-primary uppercase tracking-widest hover:opacity-80 transition-opacity flex items-center justify-center w-full gap-1.5 cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[11px]">
                                favorite_border
                              </span>
                              Move to Wishlist
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </motion.div>

                {/* Cross Selling Recommendations */}
                <div className="mt-6">
                  <React.Suspense fallback={<Skeleton className="h-52 w-full rounded-2xl" />}>
                    <RecommendationSystem
                      category={items.length > 0 ? items[0].category : undefined}
                      currentProductId={items.length > 0 ? items[0].id || items[0]._id : undefined}
                      hideHeader={false}
                      horizontalScroll={true}
                      compact={true}
                      rentalOnly={activeCartMode === 'rental'}
                    />
                  </React.Suspense>
                </div>
              </div>

              {/* Right Column Pane: Coupons & Price Details */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="lg:col-span-5 xl:col-span-4 space-y-3"
              >
                {/* Wallet Balance Card */}
                {user && user.walletBalance > 0 && (
                  <div className="bg-surface-bright border border-outline-variant/40 rounded-lg p-4 shadow-xs relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          id="cart-use-wallet-checkbox"
                          checked={useWallet}
                          onChange={(e) => setUseWallet(e.target.checked)}
                          className="mt-1 rounded text-primary focus:ring-0 cursor-pointer h-4 w-4"
                        />
                        <label
                          htmlFor="cart-use-wallet-checkbox"
                          className="cursor-pointer select-none"
                        >
                          <span className="text-xs font-bold text-on-surface block uppercase tracking-wider">
                            Use Siri Pay Wallet
                          </span>
                          <span className="text-[10px] text-secondary font-light">
                            Available Balance:{' '}
                            <strong className="text-on-surface font-semibold">
                              ₹{user.walletBalance.toLocaleString('en-IN')}
                            </strong>
                          </span>
                        </label>
                      </div>
                      <span className="material-symbols-outlined text-primary text-sm animate-pulse">
                        stars
                      </span>
                    </div>

                    <AnimatePresence>
                      {useWallet && walletDeduction > 0 && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-3 pt-3 border-t border-outline-variant/30 text-[11px] text-primary font-bold flex justify-between"
                        >
                          <span>Wallet Deducted:</span>
                          <span>− ₹{walletDeduction.toLocaleString('en-IN')}</span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Coupons Block */}
                <div className="bg-surface-bright border border-outline-variant/40 rounded-lg p-5 shadow-xs">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-label font-bold text-on-surface uppercase tracking-widest">
                      Coupons & Offers
                    </span>
                    {!appliedCoupon && (
                      <button
                        onClick={() => {
                          runProtectedAction(() => {
                            setIsCouponModalOpen(true);
                          });
                        }}
                        className="text-[10px] text-primary border border-primary/20 hover:border-primary/50 hover:bg-primary/5 transition-all duration-300 font-bold px-3 py-1.5 rounded-full cursor-pointer uppercase tracking-wider"
                      >
                        View All
                      </button>
                    )}
                  </div>

                  <AnimatePresence mode="wait">
                    {appliedCoupon ? (
                      <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        className="bg-green-50 border border-green-200 rounded p-3 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-green-600 text-[18px]">
                            verified
                          </span>
                          <div>
                            <span className="text-xs font-bold text-green-800 uppercase block">
                              {appliedCoupon.code} APPLIED
                            </span>
                            <span className="text-[10px] text-green-700">
                              You saved ₹{couponDiscountAmount.toLocaleString()}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={handleRemoveCoupon}
                          className="text-xs font-bold text-red-600 hover:underline cursor-pointer"
                        >
                          Remove
                        </button>
                      </motion.div>
                    ) : (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <div
                          onClick={() => {
                            runProtectedAction(() => {
                              setIsCouponModalOpen(true);
                            });
                          }}
                          className="flex items-center gap-3 bg-surface-container-lowest border border-outline-variant/40 rounded-lg px-4 py-3 cursor-pointer hover:border-primary/30 transition-all shadow-xs"
                        >
                          <span className="material-symbols-outlined text-primary text-[20px]">
                            local_activity
                          </span>
                          <div className="flex-1">
                            <span className="text-[12px] font-bold text-on-surface block mb-0.5">
                              Apply Coupon
                            </span>
                            <span className="text-[10px] text-secondary">
                              {!isAuthenticated
                                ? 'Login to see best offers'
                                : activeCoupons.length > 0
                                  ? `${activeCoupons.length} elegant offer${activeCoupons.length !== 1 ? 's' : ''} available`
                                  : 'Enter code manually to redeem discounts'}
                            </span>
                          </div>
                          <span className="material-symbols-outlined text-secondary text-[16px]">
                            chevron_right
                          </span>
                        </div>

                        {/* Manual input form */}
                        <form onSubmit={(e) => handleApplyCoupon(e)} className="mt-4 flex gap-2">
                          <input
                            type="text"
                            placeholder="Enter coupon code"
                            value={couponInput}
                            onChange={(e) => {
                              setCouponInput(e.target.value.toUpperCase());
                              if (couponError) setCouponError('');
                            }}
                            className="bg-surface-bright border border-outline-variant/60 rounded-md px-3 py-1.5 text-xs outline-none focus:border-primary text-on-surface font-bold uppercase flex-1 transition-colors h-[38px]"
                          />
                          <button
                            type="submit"
                            className="btn-outline px-4 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer h-[38px]"
                          >
                            Apply
                          </button>
                        </form>
                        {couponError && (
                          <span className="text-[11px] text-red-600 block mt-1.5 font-medium">
                            {couponError}
                          </span>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Price Details Summary Card */}
                <div className="bg-surface-bright border border-outline-variant/40 rounded-lg shadow-xs relative overflow-hidden">
                  {loading && (
                    <div className="absolute inset-0 bg-surface/70 backdrop-blur-[1px] z-10 p-5">
                      <div className="space-y-3">
                        <Skeleton className="h-4 w-40" />
                        {[0, 1, 2].map((idx) => (
                          <div className="flex justify-between" key={idx}>
                            <Skeleton className="h-3 w-24" delay={idx * 90} />
                            <Skeleton className="h-3 w-16" delay={idx * 90 + 70} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="p-5">
                    <h3 className="text-[10px] font-label font-bold text-on-surface uppercase tracking-widest pb-4 border-b border-outline-variant/40 mb-4">
                      {activeCartMode === 'rental'
                        ? 'Rental Summary'
                        : `Price Details (${cartCount} Items)`}
                    </h3>
                    <div className="space-y-3.5 text-[13px] text-on-surface">
                      {activeCartMode === 'rental' ? (
                        <>
                          <div className="flex justify-between">
                            <span className="text-secondary">Rental Charges</span>
                            <span className="font-medium">
                              ₹{(totalMRP || actualSubtotal).toLocaleString()}
                            </span>
                          </div>
                          {depositTotal > 0 && (
                            <div className="flex justify-between">
                              <span className="text-secondary">Security Deposits</span>
                              <span className="font-medium">₹{depositTotal.toLocaleString()}</span>
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <div className="flex justify-between">
                            <span className="text-secondary">Total MRP</span>
                            <span className="font-medium">
                              ₹{(totalMRP || actualSubtotal).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-secondary">Discount on MRP</span>
                            <span className="text-green-700 font-medium">
                              − ₹{discountOnMRP.toLocaleString()}
                            </span>
                          </div>
                        </>
                      )}

                      <AnimatePresence>
                        {appliedCoupon && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="flex justify-between overflow-hidden"
                          >
                            <span className="text-secondary">Coupon Discount</span>
                            <span className="text-green-700 font-medium">
                              − ₹{couponDiscountAmount.toLocaleString()}
                            </span>
                          </motion.div>
                        )}
                      </AnimatePresence>
                      {platformFee > 0 && (
                        <div className="flex justify-between items-center group">
                          <span className="text-secondary flex items-center gap-1 cursor-pointer">
                            Platform Fee{' '}
                            <span className="material-symbols-outlined text-[14px]">info</span>
                          </span>
                          <span className="font-medium">₹{platformFee}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-secondary">Shipping Fee</span>
                        <span
                          className={
                            shippingFee === 0
                              ? 'text-green-700 font-bold uppercase tracking-wider text-[11px]'
                              : 'font-medium'
                          }
                        >
                          {shippingFee === 0 ? 'Free' : `₹${shippingFee}`}
                        </span>
                      </div>

                      <AnimatePresence>
                        {useWallet && walletDeduction > 0 && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="flex justify-between items-center bg-primary/10 text-primary rounded-lg px-3 py-2 border border-primary/20 font-semibold"
                          >
                            <span className="flex items-center gap-1 font-medium text-[11px]">
                              <span className="material-symbols-outlined text-[14px] text-primary">
                                stars
                              </span>
                              Siri Pay Wallet applied
                            </span>
                            <span>− ₹{walletDeduction.toLocaleString()}</span>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <div className="h-[1px] bg-outline-variant/40 my-3" />
                      <div className="flex justify-between items-baseline font-bold text-[15px]">
                        <span>
                          {activeCartMode === 'rental' ? 'Grand Total Due Today' : 'Total Amount'}
                        </span>
                        <motion.span
                          key={finalPayableAmount}
                          initial={{ scale: 0.95 }}
                          animate={{ scale: 1 }}
                        >
                          ₹{finalPayableAmount.toLocaleString()}
                        </motion.span>
                      </div>

                      {/* Expected Refund Block for Rentals */}
                      {activeCartMode === 'rental' && depositTotal > 0 && (
                        <div className="mt-3 bg-green-50 border border-green-200/60 p-2 rounded-md flex justify-between items-center text-[12px] text-green-800">
                          <div className="flex items-center gap-1 font-bold">
                            <span className="material-symbols-outlined text-[15px]">
                              verified_user
                            </span>
                            Expected Refund
                          </div>
                          <span className="font-extrabold">₹{depositTotal.toLocaleString()}</span>
                        </div>
                      )}

                      {/* Desktop Place Order Button */}
                      <button
                        onClick={() =>
                          runProtectedAction(() => {
                            sessionStorage.removeItem('siri_checkout_step');
                            navigate('/checkout', {
                              state: {
                                checkoutMode: activeCartMode,
                                couponCode: appliedCoupon?.code,
                              },
                            });
                          })
                        }
                        className="w-full mt-6 bg-black text-white hover:bg-orange-600 hover:text-white py-3.5 rounded-full text-[11px] font-bold uppercase tracking-widest shadow-md transition-all text-center hidden lg:block cursor-pointer active:scale-[0.98]"
                      >
                        {activeCartMode === 'rental' ? 'Continue Rental Booking' : 'Checkout'}
                      </button>
                    </div>
                  </div>

                  {/* Secure verification footer inside card */}
                  <div className="bg-surface-container-lowest px-5 py-3 border-t border-outline-variant/40 flex items-center justify-between text-[11px] text-secondary font-medium">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-primary">
                        verified_user
                      </span>{' '}
                      Genuine
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-primary">
                        security
                      </span>{' '}
                      Secure
                    </div>
                  </div>
                </div>

                {/* Trust Badges and Policy */}
                <div className="pt-2 text-center text-[10px] text-secondary space-y-2">
                  <p>
                    By placing the order, you agree to our
                    <span className="text-primary font-bold ml-1 cursor-pointer hover:underline">
                      Terms
                    </span>{' '}
                    and
                    <span className="text-primary font-bold ml-1 cursor-pointer hover:underline">
                      Privacy Policy
                    </span>
                  </p>
                </div>
              </motion.div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Sticky Footer for Mobile - Place Order */}
      {items.length > 0 &&
        createPortal(
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            className="fixed bottom-0 left-0 right-0 bg-surface-bright border-t border-outline-variant/40 pt-3 pb-[calc(12px+env(safe-area-inset-bottom,0px))] px-4 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] z-[90] lg:hidden"
          >
            <div className="max-w-[1240px] mx-auto flex items-center justify-between sm:px-6">
              <div className="flex flex-col justify-center">
                <span className="text-[10px] text-secondary/90 font-extrabold uppercase tracking-widest mb-0.5">
                  {cartCount} ITEM{cartCount !== 1 ? 'S' : ''} IN BAG
                </span>
                <span className="text-[18px] font-extrabold text-on-surface leading-tight">
                  ₹{finalPayableAmount.toLocaleString()}
                </span>
              </div>
              <button
                onClick={() =>
                  runProtectedAction(() => {
                    sessionStorage.removeItem('siri_checkout_step');
                    navigate('/checkout', {
                      state: { checkoutMode: activeCartMode, couponCode: appliedCoupon?.code },
                    });
                  })
                }
                className="bg-black text-white hover:bg-orange-600 hover:text-white px-8 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-md transition-all text-center block cursor-pointer active:scale-[0.98]"
              >
                {activeCartMode === 'rental' ? 'Rent Now' : 'Checkout'}
              </button>
            </div>
          </motion.div>,
          document.body,
        )}

      {/* Premium Coupon Selector Modal */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {isCouponModalOpen && (
              <div className="fixed inset-0 z-[1000] flex items-end justify-center sm:items-center sm:p-4">
                {/* Backdrop blur */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsCouponModalOpen(false)}
                  className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                />

                {/* Bottom Sheet Card */}
                <motion.div
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                  className="relative bg-surface-bright w-full max-w-[500px] rounded-t-[24px] sm:rounded-[24px] p-6 sm:p-8 shadow-2xl overflow-hidden max-h-[85vh] flex flex-col z-[1001]"
                >
                  {/* Pull Indicator for Mobile */}
                  <div className="w-12 h-1.5 bg-outline-variant/60 rounded-full mx-auto mb-6 sm:hidden" />

                  {/* Close Button (Desktop mainly) */}
                  <button
                    onClick={() => setIsCouponModalOpen(false)}
                    className="absolute top-6 right-6 w-8 h-8 rounded-full bg-surface-container-lowest border border-outline-variant/40 flex items-center justify-center hover:bg-surface-container transition-all z-50 cursor-pointer shadow-xs hidden sm:flex"
                  >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>

                  {/* Content Container */}
                  <div className="relative z-10 flex flex-col h-full max-h-[75vh]">
                    {/* Header */}
                    <div className="mb-6">
                      <h2 className="text-[20px] font-bold text-on-surface leading-tight mb-1">
                        Coupons & Offers
                      </h2>
                      <p className="text-secondary text-[12px]">
                        Enter a promo code or select an offer below
                      </p>
                    </div>

                    {/* Manual Input Form */}
                    <form onSubmit={(e) => handleApplyCoupon(e)} className="flex gap-2 mb-6">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          placeholder="ENTER PROMO CODE"
                          value={couponInput}
                          onChange={(e) => {
                            setCouponInput(e.target.value.toUpperCase());
                            if (couponError) setCouponError('');
                          }}
                          className="w-full bg-surface-container-lowest border border-outline-variant/60 rounded-xl px-4 py-3 text-[13px] outline-none focus:border-primary text-on-surface font-bold uppercase transition-all tracking-wider"
                        />
                        {couponError && (
                          <span className="absolute -bottom-5 left-1 text-red-500 text-[10px] font-medium">
                            {couponError}
                          </span>
                        )}
                      </div>
                      <button
                        type="submit"
                        disabled={!couponInput.trim()}
                        className="bg-on-surface text-surface disabled:opacity-30 disabled:cursor-not-allowed px-6 rounded-xl text-[12px] font-bold uppercase tracking-wider transition-all cursor-pointer hover:bg-on-surface/90"
                      >
                        Apply
                      </button>
                    </form>

                    {/* Scrollable Coupons List */}
                    <div className="flex-1 overflow-y-auto pr-2 space-y-4 scrollbar-thin">
                      <span className="text-[11px] font-bold uppercase tracking-widest text-secondary block">
                        Available Offers
                      </span>

                      {activeCoupons.length === 0 ? (
                        <div className="text-center py-10 space-y-2">
                          <span className="material-symbols-outlined text-secondary/40 text-4xl">
                            local_activity
                          </span>
                          <p className="text-xs font-semibold text-secondary/70">
                            No coupons available right now.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {activeCoupons.map((c) => {
                            const isUnlocked = actualSubtotal >= c.minOrderAmount;
                            const needMore = c.minOrderAmount - actualSubtotal;

                            return (
                              <div
                                key={c._id || c.id}
                                className={`bg-surface-container-lowest border rounded-2xl p-4 transition-all duration-300 flex flex-col gap-3 ${
                                  isUnlocked
                                    ? 'border-outline-variant/60 hover:border-on-surface/30'
                                    : 'border-outline-variant/30 opacity-70'
                                }`}
                              >
                                <div className="flex justify-between items-start gap-4">
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono font-bold text-on-surface text-[12px] uppercase tracking-wider">
                                        {c.code}
                                      </span>
                                    </div>
                                    <p className="text-[13px] font-bold text-on-surface leading-snug">
                                      {c.discountType === 'percentage'
                                        ? `${c.discountValue}% off`
                                        : `₹${c.discountValue} off`}
                                      {c.maxDiscount ? ` up to ₹${c.maxDiscount}` : ''}
                                    </p>
                                    <p className="text-[11px] text-secondary">
                                      On minimum purchase of ₹{c.minOrderAmount}
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    disabled={!isUnlocked}
                                    onClick={(e) => handleApplyCoupon(e, c.code)}
                                    className={`text-[11px] font-bold uppercase tracking-widest px-4 py-2 rounded-lg transition-all cursor-pointer ${
                                      isUnlocked
                                        ? 'text-primary bg-primary/10 hover:bg-primary/20'
                                        : 'text-secondary/50 bg-surface-container cursor-not-allowed'
                                    }`}
                                  >
                                    {isUnlocked ? 'Apply' : 'Locked'}
                                  </button>
                                </div>

                                {/* Progress / Expiry Footer */}
                                <div className="flex items-center justify-between border-t border-outline-variant/30 pt-3 mt-1">
                                  {!isUnlocked ? (
                                    <p className="text-[10px] text-red-500 font-medium">
                                      Add ₹{needMore.toLocaleString()} more to unlock
                                    </p>
                                  ) : (
                                    <p className="text-[10px] text-green-600 font-medium flex items-center gap-1">
                                      <span className="material-symbols-outlined text-[12px]">
                                        check_circle
                                      </span>
                                      Unlocked
                                    </p>
                                  )}
                                  <p className="text-[10px] text-secondary">
                                    Valid till{' '}
                                    {new Date(c.expiryDate).toLocaleDateString('en-IN', {
                                      day: 'numeric',
                                      month: 'short',
                                    })}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}
