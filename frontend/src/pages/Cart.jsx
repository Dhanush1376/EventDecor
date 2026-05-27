import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import { SEO } from "../components/seo/SEO";
import { handleImageError } from "../utils/imageUtils";
import { RecommendationSystem } from "../components/sections/RecommendationSystem";
import { couponService, cmsService } from "../services/domainServices";
import { useAuth } from "../context/AuthContext";
import { useApi } from "../hooks/useApi";
import { CartSkeleton } from "../components/ui/Skeleton";
import { useRecommendationTracker } from "../hooks/useRecommendationTracker";

export function Cart() {
  const { items, removeItem, updateQuantity, cartCount, totalMRP, summary, loading, appliedCoupon, setAppliedCoupon } = useCart();
  const { addItem: addToWishlist } = useWishlist();
  const { runProtectedAction } = useAuth();
  const navigate = useNavigate();

  // Track cart page view
  useRecommendationTracker({
    targetType: 'page',
    targetId: 'cart',
    source: 'cart'
  });

  const { data: settingsData, loading: settingsLoading } = useApi(cmsService.getSection, "storeSettings");
  const settings = settingsData?.data || {};

  const [couponInput, setCouponInput] = useState("");
  const [couponError, setCouponError] = useState("");
  const [notification, setNotification] = useState("");

  const { data: couponsData, request: fetchCoupons } = useApi(couponService.getAll);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  const activeCoupons = couponsData?.data?.filter(c => c.isActive) || [];

  const triggerNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(""), 3000);
  };

  const discountOnMRP = totalMRP - summary.subtotal;
  const couponDiscountAmount = appliedCoupon?.calculatedDiscount || 0;
  
  // Platform fee has been removed per backend requirements
  const finalPayableAmount = items.length > 0 ? 
    summary.subtotal - couponDiscountAmount : 0;

  // Coupon handling logic
  const handleApplyCoupon = async (e) => {
    if (e) e.preventDefault();
    const code = couponInput.trim().toUpperCase();
    if (!code) return;

    if (summary.subtotal === 0) {
      setCouponError("Please add items to apply a coupon.");
      return;
    }

    try {
      const res = await couponService.apply(code, summary.subtotal);
      if (res.success) {
        setAppliedCoupon(res.data);
        setCouponError("");
        triggerNotification(`Coupon "${code}" applied successfully!`);
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
  };

  // Move active item directly to Wishlist
  const handleMoveToWishlist = (item) => {
    addToWishlist({
      id: item.id || item._id,
      title: item.title,
      price: item.price,
      imageSrc: item.imageSrc,
    });
    removeItem(item.id, item.variant);
    triggerNotification(`Moved "${item.title}" to Wishlist`);
  };
  
  if (settingsLoading || loading) {
    return <CartSkeleton />;
  }

  return (
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
      <div className="bg-surface-bright border-b border-outline-variant/40 py-4 px-4 mb-4">
        <div className="max-w-xl mx-auto flex items-center justify-between text-[12px] font-semibold tracking-wider text-secondary uppercase">
          <div className="flex items-center gap-1.5 text-primary">
            <span className="w-5 h-5 rounded-full bg-primary text-surface flex items-center justify-center text-[10px]">
              1
            </span>
            <span>BAG</span>
          </div>
          <div className="flex-1 border-t-2 border-dashed border-outline-variant/50 mx-3" />
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-surface-container-low text-secondary flex items-center justify-center text-[10px]">
              2
            </span>
            <span>ADDRESS</span>
          </div>
          <div className="flex-1 border-t-2 border-dashed border-outline-variant/50 mx-3" />
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-surface-container-low text-secondary flex items-center justify-center text-[10px]">
              3
            </span>
            <span>PAYMENT</span>
          </div>
        </div>
      </div>

      <div className="max-w-[1240px] mx-auto px-2 sm:px-6">
        {items.length === 0 ? (
          /* Empty Bag State */
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-surface-bright rounded-lg p-16 text-center max-w-lg mx-auto my-12 shadow-sm"
          >
            <div className="w-16 h-16 rounded-full bg-primary/5 flex items-center justify-center mb-6 mx-auto">
              <span className="material-symbols-outlined text-primary text-[30px]">
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
              className="group inline-flex items-center gap-2 text-primary font-bold text-[13px] uppercase tracking-wider hover:underline"
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
                <div className="bg-primary/10 border border-primary/20 text-primary text-[13px] font-bold rounded flex items-center justify-center p-3 gap-2 shadow-sm">
                   <span className="material-symbols-outlined text-[18px]">verified</span>
                   You're saving ₹{(discountOnMRP + couponDiscountAmount).toLocaleString()} on this order
                </div>
              )}

              {/* Special Offer Banner Placeholder */}
              <div className="bg-surface-bright border border-outline-variant/60 rounded-lg p-4 flex gap-4 shadow-sm relative overflow-hidden">
                 <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/10 rounded-full opacity-50 blur-xl"></div>
                 <div className="flex-1 z-10">
                    <h3 className="text-on-surface font-bold text-[13px] mb-1">Shop for ₹101 more to unlock items at special price</h3>
                    <p className="text-secondary text-[11px]">Add more items from our special collection to avail the offer.</p>
                 </div>
                 <span className="material-symbols-outlined text-primary text-3xl">redeem</span>
              </div>

              {/* Top Selection Bar (Checkboxes Removed) */}
              <div className="bg-surface-bright rounded p-3 flex items-center justify-between font-bold text-xs shadow-sm sticky top-0 z-30 border border-outline-variant/40">
                 <div className="flex items-center gap-3">
                    <span>
                       <span className="text-on-surface font-extrabold">{cartCount}</span> Items in Cart <span className="text-secondary font-medium">(₹{summary.subtotal.toLocaleString()})</span>
                    </span>
                 </div>
                 <div className="flex items-center gap-4 text-secondary">
                    <button 
                       onClick={() => {
                          items.forEach(item => {
                             handleMoveToWishlist(item);
                          });
                       }}
                       className="hover:text-primary transition-colors cursor-pointer flex items-center gap-1" title="Move All to Wishlist"
                    ><span className="material-symbols-outlined text-[18px]">favorite_border</span> Move All to Wishlist</button>
                 </div>
              </div>

              {/* Cart Line Items */}
              <motion.div layout className="space-y-3">
                <AnimatePresence>
                  {items.map((item) => {
                    const uniqueKey = `${item.id}-${item.variant}`;
                    const savingsPct = Math.round(
                      ((item.oldPrice - item.price) / item.oldPrice) * 100,
                    );
                    
                    const date = new Date();
                    date.setDate(date.getDate() + (settings.deliveryTimelineDays || 5));
                    const deliveryDate = date.toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      weekday: "short",
                    });

                    return (
                      <motion.div
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, x: -50, scale: 0.9 }}
                        transition={{ duration: 0.25 }}
                        key={uniqueKey}
                        className="bg-surface-bright rounded shadow-sm p-3 relative group overflow-hidden border border-outline-variant/40 hover:border-outline-variant/80"
                      >
                        {/* Top Right Close Icon */}
                        <button 
                           onClick={() => { removeItem(item.id, item.variant); triggerNotification(`Removed "${item.title}"`); }}
                           className="absolute top-2 right-2 text-secondary hover:text-red-600 transition-colors cursor-pointer w-6 h-6 flex items-center justify-center rounded-full hover:bg-surface-container z-10"
                        >
                           <span className="material-symbols-outlined text-[18px]">close</span>
                        </button>

                        <div className="flex gap-4">
                          {/* Left Column: Image */}
                          <div className="relative w-[110px] h-[140px] bg-surface-container rounded overflow-hidden flex-shrink-0 border border-outline-variant/20">
                            <Link to={`/product/${item.id}`} className="w-full h-full block">
                              <motion.img
                                onError={handleImageError}
                                whileHover={{ scale: 1.05 }}
                                src={item.imageSrc}
                                alt={item.title}
                                className="w-full h-full object-cover transition-transform"
                              />
                            </Link>
                          </div>

                          {/* Right Details */}
                          <div className="flex-1 min-w-0 pr-6 py-1">
                            <Link to={`/product/${item.id}`}>
                               <h3 className="font-bold text-[13px] text-on-surface line-clamp-1">{item.seller}</h3>
                               <span className="text-[12px] text-secondary block mt-0.5 font-normal line-clamp-1">{item.title}</span>
                            </Link>
                            
                            {/* Dropdown look for Size & Qty */}
                            <div className="flex items-center gap-2 mt-2">
                               {item.variant && item.variant !== "Default" && (
                                  <div className="bg-surface-bright border border-outline-variant/60 rounded px-2 py-0.5 text-[12px] font-bold text-on-surface flex items-center gap-1 transition-colors">
                                     Size: {item.variant}
                                  </div>
                               )}
                               <div className="bg-surface-bright hover:bg-surface-container-low border border-outline-variant/60 rounded px-2 py-0.5 text-[12px] font-bold text-on-surface flex items-center gap-1 cursor-pointer relative group/qty transition-colors">
                                  Qty: {item.quantity}
                                  <span className="material-symbols-outlined text-[14px] text-secondary">keyboard_arrow_down</span>
                                  
                                  {/* Hover popup for qty */}
                                  <div className="absolute top-full left-0 mt-1 bg-surface-bright border border-outline-variant/50 rounded shadow-lg hidden group-hover/qty:flex items-center p-1.5 z-20 gap-1">
                                     <button onClick={(e) => { e.preventDefault(); updateQuantity(item.id, item.variant, item.quantity - 1); }} className="w-6 h-6 flex items-center justify-center hover:bg-surface-container rounded-full text-secondary font-bold bg-surface-container-low border border-outline-variant/20">-</button>
                                     <span className="px-1 font-bold text-sm min-w-[16px] text-center">{item.quantity}</span>
                                     <button 
                                       onClick={(e) => { 
                                          e.preventDefault(); 
                                          if (item.quantity >= item.stock) {
                                            toast.error(`Only ${item.stock} in stock!`);
                                          } else {
                                            updateQuantity(item.id, item.variant, item.quantity + 1); 
                                          }
                                       }} 
                                       disabled={item.quantity >= item.stock}
                                       className={`w-6 h-6 flex items-center justify-center rounded-full text-secondary font-bold bg-surface-container-low border border-outline-variant/20 ${item.quantity >= item.stock ? 'opacity-50 cursor-not-allowed' : 'hover:bg-surface-container'}`}
                                     >+</button>
                                  </div>
                               </div>
                            </div>
                            {item.quantity >= item.stock && (
                               <span className="text-[10px] text-red-600 font-bold block mt-1">Maximum stock reached</span>
                            )}

                            {/* Pricing Row */}
                            <div className="flex items-baseline gap-2 mt-3 flex-wrap">
                               <span className="text-[15px] font-extrabold text-on-surface">₹{item.price.toLocaleString()}</span>
                               {item.oldPrice > item.price && (
                                  <span className="text-[12px] text-secondary line-through">₹{item.oldPrice.toLocaleString()}</span>
                               )}
                               {savingsPct > 0 && (
                                  <span className="text-[12px] font-bold text-primary">{savingsPct}% Off</span>
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
                                  <span>Delivery by <span className="text-on-surface font-bold">{deliveryDate}</span></span>
                               </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </motion.div>

              {/* Get Summer Ready Placeholder (Cross Selling) */}
              <div className="mt-8">
                 <div className="text-[13px] font-bold text-on-surface uppercase tracking-wide mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[18px]">auto_awesome</span>
                    You might also like
                 </div>
                 <RecommendationSystem
                    category={items.length > 0 ? items[0].category : undefined}
                    currentProductId={items.length > 0 ? items[0].id : undefined}
                    hideHeader={true}
                 />
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
                   {activeCoupons.length > 0 && !appliedCoupon && (
                     <button className="text-[11px] text-secondary hover:underline cursor-pointer border border-outline-variant/50 px-2 py-1 rounded">
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
                      <div className="flex items-center gap-3 bg-surface-container-low border border-outline-variant/40 rounded px-3 py-2 cursor-pointer hover:bg-surface-container transition-colors" onClick={() => {
                          if (activeCoupons.length > 0) {
                              setCouponInput(activeCoupons[0].code);
                          }
                      }}>
                         <span className="material-symbols-outlined text-primary text-[20px]">local_activity</span>
                         <div className="flex-1">
                            <span className="text-[12px] font-bold text-on-surface block">Apply Coupon</span>
                            <span className="text-[10px] text-secondary">Login to see best offers</span>
                         </div>
                         <span className="material-symbols-outlined text-secondary text-[16px]">chevron_right</span>
                      </div>
                      
                      {/* Manual input form */}
                      <form onSubmit={handleApplyCoupon} className="mt-3 flex gap-2">
                         <input
                           type="text"
                           placeholder="Enter coupon code"
                           value={couponInput}
                           onChange={(e) => {
                             setCouponInput(e.target.value);
                             if (couponError) setCouponError("");
                           }}
                           className="bg-surface-bright border border-outline-variant/60 rounded px-3 py-1.5 text-xs outline-none focus:border-primary text-on-surface font-bold uppercase flex-1 transition-colors h-[36px]"
                         />
                         <button
                           type="submit"
                           className="bg-surface-bright border border-primary text-primary hover:bg-primary hover:text-surface px-4 py-1.5 rounded text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer h-[36px]"
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
              <div className="bg-surface-bright border border-outline-variant/40 rounded shadow-sm">
                <div className="p-4">
                   <h3 className="text-[13px] font-bold text-on-surface uppercase tracking-wide pb-3 border-b border-outline-variant/40 mb-3">
                     Price Details ({cartCount} Items)
                   </h3>
                   <div className="space-y-3 text-[13px] text-on-surface">
                     <div className="flex justify-between">
                       <span className="text-secondary">Total MRP</span>
                       <span className="font-medium">₹{totalMRP.toLocaleString()}</span>
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
                     <div className="flex justify-between">
                       <span className="text-secondary">Shipping Fee</span>
                       <span className="text-green-700 font-bold uppercase tracking-wider text-[11px]">
                         Free
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
                   </div>
                </div>

                {/* Secure verification footer inside card (Myntra style) */}
                <div className="bg-surface-container-low px-4 py-3 border-t border-outline-variant/40 flex items-center justify-between text-[11px] text-secondary">
                   <div className="flex items-center gap-1"><span className="material-symbols-outlined text-[16px] text-primary">verified_user</span> Genuine Products</div>
                   <div className="flex items-center gap-1"><span className="material-symbols-outlined text-[16px] text-primary">security</span> Secure Payments</div>
                </div>
              </div>

              {/* Trust Badges and Policy */}
              <div className="pt-2 text-center text-[10px] text-secondary space-y-2">
                 <p>
                    By placing the order, you agree to EventDecor's 
                    <span className="text-primary font-bold ml-1 cursor-pointer">Terms of Use</span> and 
                    <span className="text-primary font-bold ml-1 cursor-pointer">Privacy Policy</span>
                 </p>
              </div>
            </motion.div>
          </div>
        )}
      </div>

      {/* Sticky Footer for Mobile & Desktop - Place Order */}
      {items.length > 0 && (
        <motion.div 
           initial={{ y: 100 }}
           animate={{ y: 0 }}
           className="fixed bottom-0 left-0 right-0 bg-surface-bright border-t border-outline-variant/40 p-3 shadow-[0_-4px_12px_rgba(0,0,0,0.1)] z-40"
        >
          <div className="max-w-[1240px] mx-auto flex items-center justify-between px-2 sm:px-6">
            <div className="flex flex-col">
              <span className="text-[11px] text-secondary font-bold uppercase tracking-widest">{cartCount} Item{cartCount !== 1 ? 's' : ''} in Bag</span>
              <span className="text-[18px] font-extrabold text-on-surface">₹{finalPayableAmount.toLocaleString()}</span>
            </div>
            <button
              onClick={() => runProtectedAction(() => navigate("/checkout"))}
              className="px-10 py-3.5 rounded text-[13px] font-bold uppercase tracking-widest shadow-md transition-colors text-center block bg-primary hover:bg-primary/90 text-surface cursor-pointer"
            >
              Place Order
            </button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
