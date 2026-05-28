import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import { SEO } from "../components/seo/SEO";
import { handleImageError } from "../utils/imageUtils";
import { couponService, cmsService } from "../services/domainServices";
import { useAuth } from "../context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { CartSkeleton, Skeleton } from "../components/ui/Skeleton";
import { useRecommendationTracker } from "../hooks/useRecommendationTracker";
import { CheckoutSteps } from "../components/ui/CheckoutSteps";

const RecommendationSystem = React.lazy(() =>
  import("../components/sections/RecommendationSystem").then((m) => ({ default: m.RecommendationSystem }))
);

export function Cart() {
  const { items, removeItem, updateQuantity, cartCount, addItem, summary, totalMRP, loading, claimedCoupon, setClaimedCoupon } = useCart();
  const { addItem: addToWishlist } = useWishlist();
  const { runProtectedAction, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Track cart page view
  useRecommendationTracker({
    targetType: 'page',
    targetId: 'cart',
    source: 'cart'
  });

  const { data: settingsData, isLoading: settingsLoading } = useQuery({
    queryKey: ["cms", "section", "storeSettings"],
    queryFn: async () => {
      const res = await cmsService.getSection("storeSettings");
      return res.success ? res.data : res;
    },
    staleTime: 10 * 60 * 1000,
  });
  const settings = settingsData || {};

  // Always reset checkout step state when viewing the cart to ensure fresh start on step 1 (Address)
  useEffect(() => {
    try {
      sessionStorage.removeItem("siri_checkout_step");
    } catch (e) {}
  }, []);

  // Standard eCommerce features: Coupon input
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null); // { code, discountPercent, calculatedDiscount }
  const [couponError, setCouponError] = useState("");
  const [notification, setNotification] = useState("");
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);

  const { data: couponsData } = useQuery({
    queryKey: ["coupons"],
    queryFn: async () => {
      const res = await couponService.getAll();
      return res.success ? res.data : res;
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

  const activeCouponsList = couponsData?.data || couponsData?.items || (Array.isArray(couponsData) ? couponsData : []);
  const activeCoupons = activeCouponsList.filter(c => {
    const isExpired = new Date() > new Date(c.expiryDate);
    return c.isActive && !isExpired && (!c.usageLimit || c.usedCount < c.usageLimit);
  });

  const triggerNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(""), 3000);
  };

  // Pricing Summary Calculations based on REAL backend state
  const actualSubtotal = summary?.subtotal || 0;
  const discountOnMRP = Math.max(0, (totalMRP || 0) - actualSubtotal);
  const couponDiscountAmount = appliedCoupon?.calculatedDiscount || 0;
  
  // Wait, backend summary handles subtotal, shippingFee, platformFee, total
  // BUT the backend returns discount=0 for now because coupons aren't passed to getCart yet.
  // We need to calculate finalPayableAmount properly on frontend.
  const shippingFee = summary?.shippingFee || 0;
  const platformFee = summary?.platformFee || 0; 
  const finalPayableAmount = items.length > 0 ? 
    actualSubtotal - couponDiscountAmount + platformFee + shippingFee : 0;

  // Coupon handling logic
  const handleApplyCoupon = async (e, codeParam = null) => {
    if (e) e.preventDefault();
    const code = (codeParam || couponInput).trim().toUpperCase();
    if (!code) return;

    if (actualSubtotal === 0) {
      setCouponError("Please add items to apply a coupon.");
      return;
    }

    try {
      const res = await couponService.apply(code, actualSubtotal);
      if (res.success) {
        setAppliedCoupon(res.data);
        setClaimedCoupon(code); // Carry over to checkout page automatically
        setCouponError("");
        triggerNotification(`Coupon "${code}" applied successfully!`);
        setIsCouponModalOpen(false); // Close selector modal if open
      } else {
        setCouponError(res.message || "Invalid coupon code.");
      }
    } catch (err) {
      setCouponError(err.response?.data?.message || "Failed to apply coupon.");
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput("");
    setClaimedCoupon(""); // Remove auto-apply on checkout
  };

  // Move active item directly to traditional Wishlist
  const handleMoveToWishlist = (item) => {
    addToWishlist({
      id: item.id || item._id,
      title: item.title,
      price: item.price,
      imageSrc: item.imageSrc,
    });
    removeItem(item.id || item._id, item.variant);
    triggerNotification(`Moved "${item.title}" to Wishlist`);
  };

  // Move all items to wishlist
  const handleMoveAllToWishlist = () => {
    items.forEach(item => {
      addToWishlist({
         id: item.id || item._id,
         title: item.title,
         price: item.price,
         imageSrc: item.imageSrc,
      });
      removeItem(item.id || item._id, item.variant);
    });
    triggerNotification(`Moved all items to Wishlist`);
  };

  // Clear all items
  const handleClearCart = () => {
     items.forEach(item => {
        removeItem(item.id || item._id, item.variant);
     });
     triggerNotification(`Bag cleared`);
  };

  const deliveryTimelineDays = settings.deliveryTimelineDays || 5;
  const deliveryDateObj = new Date();
  deliveryDateObj.setDate(deliveryDateObj.getDate() + deliveryTimelineDays);
  const deliveryDateStr = deliveryDateObj.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    weekday: "short",
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
        className="bg-surface-container-low min-h-screen pt-20 pb-40 font-body text-on-surface"
      >
      <SEO
        title="Your Bag"
        description="Review your selected items."
      />

      {/* Toast Notification with subtle enter */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed top-28 left-1/2 -translate-x-1/2 z-50 bg-on-surface-variant text-surface px-6 py-3 rounded-lg shadow-xl text-xs font-semibold tracking-wide flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-sm text-primary-container">
              check_circle
            </span>
            {notification}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Header Checkout Workflow Strip */}
      <CheckoutSteps 
        currentStep={0} 
        onStepClick={(stepIndex) => {
          if (stepIndex === 0) navigate("/cart");
          else if (stepIndex > 0) {
            sessionStorage.removeItem("siri_checkout_step");
            runProtectedAction(() => navigate("/checkout", { state: { couponCode: appliedCoupon?.code } }));
          }
        }}
      />

      <div className="max-w-[1240px] mx-auto px-2 sm:px-6">
        {items.length === 0 ? (
          /* Empty Bag State */
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-surface-bright rounded-lg p-16 text-center max-w-lg mx-auto my-12 shadow-sm"
          >
            <div className="w-16 h-16 rounded-full bg-[#c29b38]/5 flex items-center justify-center mb-6 mx-auto">
               <span className="material-symbols-outlined text-[#c29b38] text-[30px]">
                 shopping_bag
               </span>
            </div>
            <h2 className="font-display text-[22px] text-on-surface tracking-tight mb-2">
              Hey, it feels too light!
            </h2>
            <p className="font-body text-[13px] text-secondary/60 max-w-[220px] mx-auto leading-relaxed mb-8">
              There is nothing in your bag. Let's add some items.
            </p>
            <Link
              to="/collections"
              className="group inline-flex items-center gap-2 text-[#c29b38] font-bold text-[13px] uppercase tracking-wider hover:underline"
            >
              <span>Continue Shopping</span>
            </Link>
          </motion.div>
        ) : (
          /* Multi-column Classic Checkout Engine */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Content List: Cart Entities */}
            <div className="lg:col-span-7 xl:col-span-8 space-y-3">
              
              {/* Savings Banner at the top */}
              {(discountOnMRP + couponDiscountAmount) > 0 && (
                <div className="bg-[#c29b38]/10 border border-[#c29b38]/20 text-[#c29b38] text-[13px] font-bold rounded flex items-center justify-center p-3 gap-2 shadow-sm">
                   <span className="material-symbols-outlined text-[18px]">verified</span>
                   You're saving ₹{(discountOnMRP + couponDiscountAmount).toLocaleString()} on this order
                </div>
              )}

              {/* Special Offer Banner Placeholder */}
              <div className="bg-surface-bright border border-outline-variant/60 rounded-lg p-4 flex gap-4 shadow-sm relative overflow-hidden">
                 <div className="absolute -right-4 -top-4 w-24 h-24 bg-[#c29b38]/10 rounded-full opacity-50 blur-xl"></div>
                 <div className="flex-1 z-10">
                    <h3 className="text-on-surface font-bold text-[13px] mb-1">Shop for ₹101 more to unlock items at special price</h3>
                    <p className="text-secondary text-[11px]">Add more items from our special collection to avail the offer.</p>
                 </div>
                 <span className="material-symbols-outlined text-[#c29b38] text-3xl">redeem</span>
              </div>

              {/* Top Selection Bar (Modified for full cart checkout) */}
              <div className="bg-surface-bright rounded p-3 flex items-center justify-between font-bold text-xs shadow-sm sticky top-0 z-30 border border-outline-variant/40">
                 <div className="flex items-center gap-3">
                    <span>
                       <span className="text-on-surface font-extrabold">{cartCount}</span> Items in Bag <span className="text-secondary font-medium">(₹{actualSubtotal.toLocaleString()})</span>
                    </span>
                 </div>
                 <div className="flex items-center gap-4 text-secondary">
                    <button className="hover:text-[#c29b38] transition-colors cursor-pointer" title="Share"><span className="material-symbols-outlined text-[18px]">share</span></button>
                    <button 
                       onClick={handleClearCart}
                       className="hover:text-red-600 transition-colors cursor-pointer" title="Delete All"
                    ><span className="material-symbols-outlined text-[18px]">delete</span></button>
                    <button 
                       onClick={handleMoveAllToWishlist}
                       className="hover:text-[#c29b38] transition-colors cursor-pointer" title="Move All to Wishlist"
                    ><span className="material-symbols-outlined text-[18px]">favorite_border</span></button>
                 </div>
              </div>

              {/* Cart Line Items */}
              <motion.div layout className="space-y-3">
                <AnimatePresence>
                  {items.map((item) => {
                    const uniqueKey = `${item.id || item._id}-${item.variant}`;
                    const itemOldPrice = item.oldPrice || item.price;
                    const savingsPct = itemOldPrice > item.price ? Math.round(((itemOldPrice - item.price) / itemOldPrice) * 100) : 0;

                    return (
                      <motion.div
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, x: -50, scale: 0.9 }}
                        transition={{ duration: 0.25 }}
                        key={uniqueKey}
                        className={`bg-surface-bright rounded shadow-sm p-3 relative group overflow-hidden border ${item.stock === 0 ? 'border-red-200' : 'border-outline-variant/40 hover:border-outline-variant/80'}`}
                      >
                        {/* Top Right Close Icon */}
                        <button 
                           onClick={() => { removeItem(item.id || item._id, item.variant); triggerNotification(`Removed "${item.title}"`); }}
                           className="absolute top-2 right-2 text-secondary hover:text-red-600 transition-colors cursor-pointer w-6 h-6 flex items-center justify-center rounded-full hover:bg-surface-container z-10"
                        >
                           <span className="material-symbols-outlined text-[18px]">close</span>
                        </button>

                        <div className="flex gap-4">
                          {/* Left Column: Image */}
                          <div className="relative w-[110px] h-[140px] bg-surface-container rounded overflow-hidden flex-shrink-0 border border-outline-variant/20">
                            {item.stock === 0 && (
                               <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-10 flex items-center justify-center">
                                  <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">Out of Stock</span>
                               </div>
                            )}
                            <Link to={`/product/${item.id || item._id}`} className="w-full h-full block">
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
                          <div className="flex-1 min-w-0 pr-6 py-1">
                            <Link to={`/product/${item.id || item._id}`}>
                               <h3 className="font-bold text-[13px] text-on-surface line-clamp-1">{item.seller}</h3>
                               <span className="text-[12px] text-secondary block mt-0.5 font-normal line-clamp-1">{item.title}</span>
                            </Link>
                            
                            {/* Dropdown look for Size & Qty */}
                            <div className="flex items-center gap-2 mt-2">
                               {item.variant && item.variant !== "Default" && (
                                  <div className="bg-surface-bright hover:bg-surface-container-low border border-outline-variant/60 rounded px-2 py-0.5 text-[12px] font-bold text-on-surface flex items-center gap-1 cursor-pointer transition-colors">
                                     Size: {item.variant}
                                     <span className="material-symbols-outlined text-[14px] text-secondary">keyboard_arrow_down</span>
                                  </div>
                               )}
                               <div className={`bg-surface-bright hover:bg-surface-container-low border border-outline-variant/60 rounded px-2 py-0.5 text-[12px] font-bold text-on-surface flex items-center gap-1 cursor-pointer relative group/qty transition-colors ${item.stock === 0 ? 'opacity-50 pointer-events-none' : ''}`}>
                                  Qty: {item.quantity}
                                  <span className="material-symbols-outlined text-[14px] text-secondary">keyboard_arrow_down</span>
                                  
                                  {/* Hover popup for qty */}
                                  <div className="absolute top-full left-0 mt-1 bg-surface-bright border border-outline-variant/50 rounded shadow-lg hidden group-hover/qty:flex items-center p-1.5 z-20 gap-1">
                                     <button 
                                        onClick={(e) => { e.preventDefault(); updateQuantity(item.id || item._id, item.variant, item.quantity - 1); }} 
                                        className="w-6 h-6 flex items-center justify-center hover:bg-surface-container rounded-full text-secondary font-bold bg-surface-container-low border border-outline-variant/20"
                                     >-</button>
                                     <span className="px-1 font-bold text-sm min-w-[16px] text-center">{item.quantity}</span>
                                     <button 
                                        onClick={(e) => { e.preventDefault(); updateQuantity(item.id || item._id, item.variant, item.quantity + 1); }} 
                                        disabled={item.quantity >= item.stock}
                                        className={`w-6 h-6 flex items-center justify-center rounded-full font-bold border border-outline-variant/20 ${item.quantity >= item.stock ? 'bg-surface-container text-secondary/30 cursor-not-allowed' : 'hover:bg-surface-container bg-surface-container-low text-secondary'}`}
                                     >+</button>
                                  </div>
                               </div>
                            </div>
                            
                            {item.quantity >= item.stock && item.stock > 0 && (
                               <span className="text-[10px] text-red-500 font-medium block mt-1">Maximum stock reached</span>
                            )}

                            {/* Pricing Row */}
                            <div className="flex items-baseline gap-2 mt-3 flex-wrap">
                               <span className="text-[15px] font-extrabold text-on-surface">₹{item.price.toLocaleString()}</span>
                               {itemOldPrice > item.price && (
                                  <span className="text-[12px] text-secondary line-through">₹{itemOldPrice.toLocaleString()}</span>
                               )}
                               {savingsPct > 0 && (
                                  <span className="text-[12px] font-bold text-[#c29b38]">{savingsPct}% Off</span>
                               )}
                            </div>

                            {/* Return policy & delivery forecast strip */}
                            <div className="mt-2.5 text-[11px] text-secondary space-y-1">
                               <div className="flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[13px]">keyboard_return</span>
                                  <span className="font-bold text-on-surface">{settings.returnPolicyDays || 14} days</span> return available
                               </div>
                               <div className="flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[13px]">local_shipping</span>
                                  <span>Delivery by <span className="text-on-surface font-bold">{deliveryDateStr}</span></span>
                               </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Wishlist Button inside Card */}
                        <div className="border-t border-outline-variant/30 mt-3 pt-2 text-center">
                           <button 
                              onClick={() => handleMoveToWishlist(item)}
                              className="text-[11px] font-bold text-[#c29b38] uppercase tracking-widest hover:underline flex items-center justify-center w-full gap-1"
                           >
                              <span className="material-symbols-outlined text-[14px]">favorite_border</span>
                              Move to Wishlist
                           </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </motion.div>

              {/* Cross Selling Recommendations */}
              <div className="mt-8">
                <React.Suspense fallback={<Skeleton className="h-52 w-full rounded-2xl" />}>
                  <RecommendationSystem
                    category={items.length > 0 ? items[0].category : undefined}
                    currentProductId={items.length > 0 ? (items[0].id || items[0]._id) : undefined}
                    hideHeader={false}
                    horizontalScroll={true}
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
              {/* Coupons Block */}
              <div className="bg-surface-bright border border-outline-variant/40 rounded p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                   <span className="text-[13px] font-bold text-on-surface uppercase tracking-wide">
                     Coupons & Bank Offers
                   </span>
                   {!appliedCoupon && (
                     <button 
                       onClick={() => {
                         runProtectedAction(() => {
                           setIsCouponModalOpen(true);
                         });
                       }}
                       className="text-[11px] text-[#c29b38] border border-[#c29b38]/20 hover:border-[#c29b38]/50 hover:bg-[#c29b38]/5 transition-all duration-300 font-bold px-2.5 py-1 rounded cursor-pointer"
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
                        <span className="material-symbols-outlined text-green-600 text-[18px]">verified</span>
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
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <div 
                         onClick={() => {
                            runProtectedAction(() => {
                               setIsCouponModalOpen(true);
                            });
                         }}
                         className="flex items-center gap-3 bg-surface-container-low border border-outline-variant/40 rounded px-3 py-2 cursor-pointer hover:bg-surface-container transition-colors"
                      >
                         <span className="material-symbols-outlined text-[#c29b38] text-[20px]">local_activity</span>
                         <div className="flex-1">
                            <span className="text-[12px] font-bold text-on-surface block">Apply Coupon</span>
                            <span className="text-[10px] text-secondary">
                              {!isAuthenticated 
                                 ? "Login to see best offers" 
                                 : activeCoupons.length > 0 
                                    ? `${activeCoupons.length} elegant offer${activeCoupons.length !== 1 ? 's' : ''} available` 
                                    : "Enter code manually to redeem discounts"
                              }
                            </span>
                         </div>
                         <span className="material-symbols-outlined text-secondary text-[16px]">chevron_right</span>
                      </div>
                      
                      {/* Manual input form */}
                      <form onSubmit={(e) => handleApplyCoupon(e)} className="mt-3 flex gap-2">
                         <input
                           type="text"
                           placeholder="Enter coupon code"
                           value={couponInput}
                           onChange={(e) => {
                             setCouponInput(e.target.value.toUpperCase());
                             if (couponError) setCouponError("");
                           }}
                           className="bg-surface-bright border border-outline-variant/60 rounded px-3 py-1.5 text-xs outline-none focus:border-[#c29b38] text-on-surface font-bold uppercase flex-1 transition-colors h-[36px]"
                         />
                         <button
                           type="submit"
                           className="bg-surface-bright border border-[#c29b38] text-[#c29b38] hover:bg-[#c29b38] hover:text-surface px-4 py-1.5 rounded text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer h-[36px]"
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
              <div className="bg-surface-bright border border-outline-variant/40 rounded shadow-sm relative">
                {loading && (
                  <div className="absolute inset-0 bg-surface/70 backdrop-blur-[1px] z-10 rounded p-4">
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
                <div className="p-4">
                   <h3 className="text-[13px] font-bold text-on-surface uppercase tracking-wide pb-3 border-b border-outline-variant/40 mb-3">
                     Price Details ({cartCount} Items)
                   </h3>
                   <div className="space-y-3 text-[13px] text-on-surface">
                     <div className="flex justify-between">
                       <span className="text-secondary">Total MRP</span>
                       <span className="font-medium">₹{(totalMRP || actualSubtotal).toLocaleString()}</span>
                     </div>
                     <div className="flex justify-between">
                       <span className="text-secondary">Discount on MRP</span>
                       <span className="text-green-700 font-medium">
                         − ₹{discountOnMRP.toLocaleString()}
                       </span>
                     </div>
                     <AnimatePresence>
                       {appliedCoupon && (
                         <motion.div
                           initial={{ opacity: 0, height: 0 }}
                           animate={{ opacity: 1, height: "auto" }}
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
                            Platform Fee <span className="material-symbols-outlined text-[14px]">info</span>
                          </span>
                          <span className="font-medium">₹{platformFee}</span>
                        </div>
                     )}
                     <div className="flex justify-between">
                       <span className="text-secondary">Shipping Fee</span>
                       <span className={shippingFee === 0 ? "text-green-700 font-bold uppercase tracking-wider text-[11px]" : "font-medium"}>
                         {shippingFee === 0 ? "Free" : `₹${shippingFee}`}
                       </span>
                     </div>
                     <div className="h-[1px] bg-outline-variant/40 my-3" />
                     <div className="flex justify-between items-baseline font-bold text-[15px]">
                       <span>Total Amount</span>
                       <motion.span
                         key={finalPayableAmount}
                         initial={{ scale: 0.95 }}
                         animate={{ scale: 1 }}
                       >
                         ₹{finalPayableAmount.toLocaleString()}
                       </motion.span>
                     </div>

                     {/* Desktop Place Order Button */}
                     <button
                        onClick={() => runProtectedAction(() => {
                           sessionStorage.removeItem("siri_checkout_step");
                           navigate("/checkout", { state: { couponCode: appliedCoupon?.code } });
                        })}
                        className="w-full mt-5 bg-[#f26a10] hover:bg-[#d85d0d] text-white cursor-pointer py-3 rounded text-[13px] font-extrabold uppercase tracking-widest shadow-sm transition-colors text-center hidden lg:block"
                     >
                        Place Order
                     </button>
                   </div>
                </div>

                {/* Secure verification footer inside card (Myntra style) */}
                <div className="bg-surface-container-low px-4 py-3 border-t border-outline-variant/40 flex items-center justify-between text-[11px] text-secondary">
                   <div className="flex items-center gap-1"><span className="material-symbols-outlined text-[16px] text-[#c29b38]">verified_user</span> Genuine Products</div>
                   <div className="flex items-center gap-1"><span className="material-symbols-outlined text-[16px] text-[#c29b38]">security</span> Secure Payments</div>
                </div>
              </div>

              {/* Trust Badges and Policy */}
              <div className="pt-2 text-center text-[10px] text-secondary space-y-2">
                 <p>
                    By placing the order, you agree to EventDecor's 
                    <span className="text-[#c29b38] font-bold ml-1 cursor-pointer">Terms of Use</span> and 
                    <span className="text-[#c29b38] font-bold ml-1 cursor-pointer">Privacy Policy</span>
                 </p>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </motion.div>

      {/* Sticky Footer for Mobile - Place Order */}
      {items.length > 0 && createPortal(
        <motion.div 
           initial={{ y: 100 }}
           animate={{ y: 0 }}
           className="fixed bottom-0 left-0 right-0 bg-surface-bright border-t border-outline-variant/40 py-3 px-4 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] z-[9999] lg:hidden"
        >
          <div className="max-w-[1240px] mx-auto flex items-center justify-between sm:px-6">
            <div className="flex flex-col justify-center">
              <span className="text-[10px] text-secondary/90 font-extrabold uppercase tracking-widest mb-0.5">{cartCount} ITEM{cartCount !== 1 ? 'S' : ''} IN BAG</span>
              <span className="text-[18px] font-extrabold text-on-surface leading-tight">₹{finalPayableAmount.toLocaleString()}</span>
            </div>
            <button
              onClick={() => runProtectedAction(() => {
                sessionStorage.removeItem("siri_checkout_step");
                navigate("/checkout", { state: { couponCode: appliedCoupon?.code } });
              })}
              className="bg-[#f26a10] hover:bg-[#d85d0d] text-white cursor-pointer px-8 py-2.5 rounded-[4px] text-[12px] font-extrabold uppercase tracking-widest shadow-sm transition-colors text-center block"
            >
              Place Order
            </button>
          </div>
        </motion.div>,
        document.body
      )}

      {/* Premium Coupon Selector Modal */}
      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {isCouponModalOpen && (
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
              {/* Backdrop blur */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsCouponModalOpen(false)}
                className="absolute inset-0 bg-black/40 backdrop-blur-md"
              />

              {/* Modal Card */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="relative bg-[#faf9f6] w-full max-w-[460px] rounded-[32px] p-6 sm:p-8 border border-outline-variant/30 shadow-[0_30px_70px_rgba(115,92,0,0.06)] overflow-hidden max-h-[85vh] flex flex-col z-[1001]"
              >
                {/* Concentric rotating gold mandalas for luxury styling */}
                <div className="absolute inset-0 pointer-events-none select-none overflow-hidden opacity-[0.04] z-0">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] border-2 border-dashed border-[#c29b38] rounded-full animate-[spin_80s_linear_infinite]" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[180px] h-[180px] border border-dashed border-[#c29b38] rounded-full animate-[spin_40s_linear_infinite_reverse]" />
                </div>

                {/* Close Button */}
                <button
                  onClick={() => setIsCouponModalOpen(false)}
                  className="absolute top-6 right-6 w-9 h-9 rounded-full bg-white/50 backdrop-blur-md border border-outline-variant/20 flex items-center justify-center hover:bg-[#c29b38]/10 text-on-surface-variant/40 hover:text-[#c29b38] transition-all duration-300 z-50 cursor-pointer shadow-2xs"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>

                {/* Content Container */}
                <div className="relative z-10 flex flex-col h-full max-h-[75vh]">
                  {/* Header */}
                  <div className="mb-6 space-y-1">
                    <span className="font-label-sm text-[9px] text-[#c29b38] uppercase tracking-[0.4em] block font-bold">
                      Bespoke Offers
                    </span>
                    <h2 className="font-display text-[24px] text-on-surface font-light leading-tight">
                      Apply Coupon
                    </h2>
                    <p className="text-secondary/70 text-xs font-light">
                      Save on your event order with artisan discounts
                    </p>
                  </div>

                  {/* Manual Input Form inside Modal */}
                  <form 
                    onSubmit={(e) => handleApplyCoupon(e)}
                    className="bg-white/80 rounded-2xl p-4 border border-outline-variant/20 shadow-xs flex gap-2 mb-4"
                  >
                    <input
                      type="text"
                      placeholder="ENTER PROMO CODE"
                      value={couponInput}
                      onChange={(e) => {
                        setCouponInput(e.target.value.toUpperCase());
                        if (couponError) setCouponError("");
                      }}
                      className="bg-surface-bright border border-outline-variant/60 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-[#c29b38] text-on-surface font-bold uppercase flex-1 transition-all h-[42px] tracking-wider"
                    />
                    <button
                      type="submit"
                      disabled={!couponInput.trim()}
                      className="bg-[#c29b38] text-white hover:bg-[#a17e2b] disabled:opacity-30 disabled:cursor-not-allowed px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer h-[42px]"
                    >
                      Verify
                    </button>
                  </form>

                  {couponError && (
                    <div className="bg-red-50 text-red-700 text-xs font-medium px-3 py-2 rounded-lg border border-red-100 flex items-center gap-1.5 mb-4">
                      <span className="material-symbols-outlined text-[15px]">error</span>
                      {couponError}
                    </div>
                  )}

                  {/* Scrollable Coupons List */}
                  <div className="flex-1 overflow-y-auto pr-1 space-y-3 scrollbar-thin">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-secondary/70 block flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px] text-[#c29b38]">local_activity</span>
                      Available Store Offers ({activeCoupons.length})
                    </span>

                    {activeCoupons.length === 0 ? (
                      <div className="text-center py-10 space-y-2">
                        <span className="material-symbols-outlined text-secondary/40 text-4xl">local_activity</span>
                        <p className="text-xs font-semibold text-secondary/70">No coupons available right now.</p>
                        <p className="text-[10px] text-secondary/50 font-light">Keep exploring our event collection to unlock custom rewards!</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {activeCoupons.map((c) => {
                          const isUnlocked = actualSubtotal >= c.minOrderAmount;
                          const needMore = c.minOrderAmount - actualSubtotal;
                          
                          return (
                            <div
                              key={c._id || c.id}
                              className={`bg-white border rounded-2xl p-4 relative overflow-hidden transition-all duration-300 shadow-2xs group flex justify-between items-start gap-4 ${
                                isUnlocked 
                                  ? "border-dashed border-[#c29b38]/40 hover:border-[#c29b38] hover:shadow-xs" 
                                  : "border-dashed border-outline-variant/30 opacity-75"
                              }`}
                            >
                              <div className="flex-1 min-w-0 space-y-1.5">
                                {/* Code Badge */}
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold text-on-surface text-[11px] bg-surface-container-low px-2 py-0.5 rounded border border-outline-variant/30 tracking-wider">
                                    {c.code}
                                  </span>
                                  {!isUnlocked && (
                                    <span className="text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200/50 px-1.5 py-0.5 rounded flex items-center gap-0.5 animate-pulse">
                                      <span className="material-symbols-outlined text-[11px]">lock</span> LOCKED
                                    </span>
                                  )}
                                </div>

                                {/* Promo Description */}
                                <div className="space-y-0.5">
                                  <p className="text-xs font-extrabold text-on-surface">
                                    {c.discountType === "percentage"
                                      ? `${c.discountValue}% Off on order`
                                      : `Flat ₹${c.discountValue} Off on order`}
                                    {c.maxDiscount ? ` up to ₹${c.maxDiscount}` : ""}
                                  </p>
                                  <p className="text-[10px] text-secondary font-light">
                                    Min Purchase Required: ₹{c.minOrderAmount}
                                  </p>
                                </div>

                                {/* Need More Warning Badge */}
                                {!isUnlocked && (
                                  <p className="text-[10px] text-amber-700 font-bold bg-amber-50/70 border border-amber-200/30 px-2 py-1 rounded-lg flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[13px]">add_shopping_cart</span>
                                    Add ₹{needMore.toLocaleString()} more to unlock
                                  </p>
                                )}

                                {/* Expiry */}
                                <p className="text-[9px] text-secondary/50 font-light flex items-center gap-1 mt-1">
                                  <span className="material-symbols-outlined text-[11px]">calendar_today</span>
                                  Expires: {new Date(c.expiryDate).toLocaleDateString("en-IN", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric"
                                  })}
                                </p>
                              </div>

                              {/* Action Button */}
                              <button
                                type="button"
                                disabled={!isUnlocked}
                                onClick={(e) => handleApplyCoupon(e, c.code)}
                                className={`text-[10px] font-extrabold uppercase tracking-wider px-3.5 py-2 rounded-xl transition-all cursor-pointer ${
                                  isUnlocked
                                    ? "bg-[#c29b38] text-white hover:bg-[#a17e2b] shadow-sm hover:shadow-md"
                                    : "bg-surface-container text-secondary/30 border border-outline-variant/20 cursor-not-allowed"
                                }`}
                              >
                                Apply
                              </button>
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
        document.body
      )}
    </>
  );
}
