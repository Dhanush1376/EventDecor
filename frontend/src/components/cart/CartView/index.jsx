import { motion, AnimatePresence } from 'framer-motion';
import React, { useState, useEffect, Profiler } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { logRenderMetrics } from '../../../utils/performance/profilerLogger';
import { useCart } from '../../../context/CartContext';
import { useWishlist } from '../../../context/WishlistContext';
import { couponService, cmsService } from '../../../services/domainServices';
import { useAuth } from '../../../context/AuthContext';
import { useRecommendationTracker } from '../../../hooks/useRecommendationTracker';
import { persistentStorage } from '../../../utils/storage/persistentStorage';
import { useUserAddresses, useAddressMutations } from '../../../hooks/useUserQueries';

import { Skeleton, CartSkeleton } from '../../ui';
import { SEO } from '../../seo/SEO';
import { CheckoutSteps } from '../../ui/CheckoutSteps';
import { CartItemRow } from '../CartItemRow';

// Subcomponents
import { CartEmptyState } from './CartEmptyState';
import { CartModeSelector } from './CartModeSelector';
import { CartSummary } from './CartSummary';
import { CartCouponSection } from './CartCouponSection';
import { CartAddressBar } from './CartAddressBar';
import { CouponModal } from './CouponModal';

const RecommendationSystem = React.lazy(() =>
  import('../../sections/RecommendationSystem').then((m) => ({
    default: m.RecommendationSystem,
  })),
);

export function CartView({ isEmbedded = false }) {
  const {
    items,
    removeItem,
    updateQuantity,
    cartCount,
    summary,
    totalMRP,
    loading,
    claimedCoupon,
    setClaimedCoupon,
    appliedCoupon,
    setAppliedCoupon,
    activeCartMode,
    setActiveCartMode,
    purchaseCartCount,
    rentalCartCount,
    customCartCount,
  } = useCart();
  const { addItem: addToWishlist } = useWishlist();
  const { runProtectedAction, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  const { data: addresses = [] } = useUserAddresses();
  const { setDefaultAddress } = useAddressMutations();
  const [isAddressDropdownOpen, setIsAddressDropdownOpen] = useState(false);
  const [isClearCartDialogOpen, setIsClearCartDialogOpen] = useState(false);

  const activeAddress = React.useMemo(() => {
    if (!addresses || addresses.length === 0) return null;
    return addresses.find((a) => a.isDefault) || addresses[0];
  }, [addresses]);

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

  useEffect(() => {
    try {
      sessionStorage.removeItem('siri_checkout_step');
    } catch (_e) {}
  }, []);

  const [couponInput, setCouponInput] = useState('');
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

  const actualSubtotal = summary?.subtotal || 0;
  const discountOnMRP = Math.max(0, (totalMRP || 0) - actualSubtotal);
  const couponDiscountAmount = appliedCoupon?.calculatedDiscount || 0;

  const depositTotal =
    activeCartMode === 'rental'
      ? items.reduce((acc, item) => acc + (item.deposit || 0) * item.quantity, 0)
      : 0;

  const shippingFee = summary?.shippingFee || 0;
  const platformFee = summary?.platformFee || 0;

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

  const nextAvailableCoupon = React.useMemo(() => {
    return activeCoupons
      .filter((c) => c.minPurchaseAmount && c.minPurchaseAmount > actualSubtotal)
      .sort((a, b) => a.minPurchaseAmount - b.minPurchaseAmount)[0];
  }, [activeCoupons, actualSubtotal]);

  const couponGap = nextAvailableCoupon
    ? nextAvailableCoupon.minPurchaseAmount - actualSubtotal
    : 0;

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
        setClaimedCoupon(code);
        setCouponError('');
        triggerNotification('Applied coupon successfully');
        setIsCouponModalOpen(false);
      } else {
        setCouponError(res.message || 'Invalid coupon code.');
        if (codeParam) setClaimedCoupon('');
      }
    } catch (err) {
      setCouponError(err.response?.data?.message || 'Failed to apply coupon.');
      if (codeParam) setClaimedCoupon('');
    }
  };

  useEffect(() => {
    if (claimedCoupon && !appliedCoupon && actualSubtotal > 0) {
      handleApplyCoupon(null, claimedCoupon);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claimedCoupon, appliedCoupon, actualSubtotal]);

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput('');
    setClaimedCoupon('');
  };

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

  const handleClearCart = () => {
    setIsClearCartDialogOpen(true);
  };

  const confirmClearCart = () => {
    items.forEach((item) => {
      removeItem(item.id || item._id, item.variant, item.type);
    });
    triggerNotification(`Bag cleared`);
    setIsClearCartDialogOpen(false);
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

  const innerContent = (
    <>
      {!isEmbedded && <SEO title="Your Bag" description="Review your selected items." />}

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

        {isClearCartDialogOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-surface-bright rounded-2xl p-6 max-w-[320px] w-full shadow-2xl border border-outline-variant/20 text-center"
            >
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
                <span className="material-symbols-outlined text-[24px]">delete</span>
              </div>
              <h3 className="text-[18px] font-bold text-on-surface mb-2 font-display">
                Clear entire bag?
              </h3>
              <p className="text-[13px] text-secondary/80 mb-6">
                Are you sure you want to remove all items from your bag? This action cannot be
                undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setIsClearCartDialogOpen(false)}
                  className="flex-1 py-2.5 rounded-full border border-outline-variant/40 text-secondary font-bold text-[12px] uppercase tracking-wider hover:bg-surface-container-low transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmClearCart}
                  className="flex-1 py-2.5 rounded-full bg-red-600 text-white font-bold text-[12px] uppercase tracking-wider hover:bg-red-700 transition-colors shadow-sm"
                >
                  Clear Bag
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Address Bar */}
      {!isEmbedded && (
        <CartAddressBar
          isAddressDropdownOpen={isAddressDropdownOpen}
          setIsAddressDropdownOpen={setIsAddressDropdownOpen}
          activeAddress={activeAddress}
          addresses={addresses}
          setDefaultAddress={setDefaultAddress}
        />
      )}

      <CartModeSelector
        activeCartMode={activeCartMode}
        setActiveCartMode={setActiveCartMode}
        purchaseCartCount={purchaseCartCount}
        rentalCartCount={rentalCartCount}
        customCartCount={customCartCount}
      />

      <div className="mb-4 lg:mb-5">
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
          <CartEmptyState activeCartMode={activeCartMode} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-6">
            {/* Left Content List: Cart Entities */}
            <div className="lg:col-span-7 xl:col-span-8 space-y-3">
              {discountOnMRP + couponDiscountAmount > 0 && (
                <div className="bg-primary/10 border border-primary/20 text-primary text-[13px] font-bold rounded-lg flex items-center justify-center p-3 gap-2 shadow-xs">
                  <span className="material-symbols-outlined text-[18px]">verified</span>
                  You're saving ₹{(discountOnMRP + couponDiscountAmount).toLocaleString()} on this
                  order
                </div>
              )}

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

              <div className="bg-surface-bright rounded-lg p-4 flex items-center justify-between font-bold text-[11px] uppercase tracking-widest shadow-xs border border-outline-variant/40">
                <div className="flex items-center gap-2">
                  <span>
                    <span className="text-on-surface font-extrabold">{cartCount}</span> Items in Bag{' '}
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

              <motion.div layout className="space-y-3">
                <AnimatePresence>
                  {items.map((item) => {
                    const uniqueKey = `${item.id || item._id}-${item.variant}`;
                    return (
                      <CartItemRow
                        key={uniqueKey}
                        item={item}
                        activeCartMode={activeCartMode}
                        settings={settings}
                        deliveryDateStr={deliveryDateStr}
                        removeItem={removeItem}
                        updateQuantity={updateQuantity}
                        handleMoveToWishlist={handleMoveToWishlist}
                        triggerNotification={triggerNotification}
                      />
                    );
                  })}
                </AnimatePresence>
              </motion.div>

              <div className="mt-2 lg:mt-6">
                <React.Suspense fallback={<Skeleton className="h-52 w-full rounded-2xl" />}>
                  <RecommendationSystem
                    category={items.length > 0 ? items[0].category : undefined}
                    currentProductId={items.length > 0 ? items[0].id || items[0]._id : undefined}
                    hideHeader={false}
                    horizontalScroll={true}
                    compact={true}
                    rentalOnly={false}
                    hideMandala={true}
                  />
                </React.Suspense>
              </div>
            </div>

            {/* Right Column Pane */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="lg:col-span-5 xl:col-span-4 space-y-3"
            >
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

              <CartCouponSection
                appliedCoupon={appliedCoupon}
                couponDiscountAmount={couponDiscountAmount}
                handleRemoveCoupon={handleRemoveCoupon}
                runProtectedAction={runProtectedAction}
                setIsCouponModalOpen={setIsCouponModalOpen}
                isAuthenticated={isAuthenticated}
                activeCoupons={activeCoupons}
                handleApplyCoupon={handleApplyCoupon}
                couponInput={couponInput}
                setCouponInput={setCouponInput}
                couponError={couponError}
                setCouponError={setCouponError}
              />

              <CartSummary
                loading={loading}
                activeCartMode={activeCartMode}
                cartCount={cartCount}
                totalMRP={totalMRP}
                actualSubtotal={actualSubtotal}
                discountOnMRP={discountOnMRP}
                couponDiscountAmount={couponDiscountAmount}
                appliedCoupon={appliedCoupon}
                platformFee={platformFee}
                shippingFee={shippingFee}
                useWallet={useWallet}
                walletDeduction={walletDeduction}
                finalPayableAmount={finalPayableAmount}
                depositTotal={depositTotal}
                runProtectedAction={runProtectedAction}
                navigate={navigate}
              />
            </motion.div>
          </div>
        )}
      </div>
    </>
  );

  return (
    <Profiler id="CartView" onRender={logRenderMetrics}>
      <>
        {isEmbedded ? (
          <div className="w-full text-on-surface">{innerContent}</div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="bg-surface-container-low min-h-screen pt-[56px] lg:pt-[64px] pb-[160px] lg:pb-28 font-body text-on-surface"
          >
            {innerContent}
          </motion.div>
        )}

        {/* Sticky Footer for Mobile */}
        {items.length > 0 &&
          createPortal(
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              className="fixed bottom-0 left-0 w-full h-[calc(72px+env(safe-area-inset-bottom,0px))] lg:h-[80px] z-[100] lg:hidden bg-white/95 backdrop-blur-xl border-t border-outline-variant/15 px-6 pb-[env(safe-area-inset-bottom,0px)] flex items-center justify-between gap-3 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] select-none"
            >
              <div className="flex flex-col justify-center truncate">
                <span className="font-label text-[8px] uppercase tracking-[0.25em] text-stone-500 font-bold leading-none">
                  {cartCount} ITEM{cartCount !== 1 ? 'S' : ''} IN BAG
                </span>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className="font-sans text-[15px] text-black font-bold leading-none">
                    ₹{finalPayableAmount.toLocaleString('en-IN')}
                  </span>
                  {appliedCoupon && (
                    <span className="bg-green-100 text-green-800 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase border border-green-200 tracking-wider">
                      {appliedCoupon.code}
                    </span>
                  )}
                </div>
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
                className="bg-black text-white h-10 px-5 rounded-full font-label text-[10px] uppercase tracking-widest font-bold shadow-lg active:scale-[0.96] transition-all flex items-center justify-center border-none cursor-pointer shrink-0"
              >
                {activeCartMode === 'rental' ? 'Rent Now' : 'Checkout'}
              </button>
            </motion.div>,
            document.body,
          )}

        {/* Premium Coupon Selector Modal */}
        <CouponModal
          isCouponModalOpen={isCouponModalOpen}
          setIsCouponModalOpen={setIsCouponModalOpen}
          handleApplyCoupon={handleApplyCoupon}
          couponInput={couponInput}
          setCouponInput={setCouponInput}
          couponError={couponError}
          setCouponError={setCouponError}
          activeCoupons={activeCoupons}
          actualSubtotal={actualSubtotal}
        />
      </>
    </Profiler>
  );
}
