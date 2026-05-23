import React, { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import { SEO } from "../components/seo/SEO";
import { handleImageError } from "../utils/imageUtils";
import { RecommendationSystem } from "../components/sections/RecommendationSystem";
import { MandalaArtDecor } from "../components/ui/MandalaArtDecor";
import { couponService, cmsService } from "../services/domainServices";
import { useAuth } from "../context/AuthContext";
import { useApi } from "../hooks/useApi";

export function Cart() {
  const { items, removeItem, updateQuantity, subtotal, cartCount, addItem } =
    useCart();
  const { addItem: addToWishlist } = useWishlist();
  const { runProtectedAction } = useAuth();
  const navigate = useNavigate();

  const { data: settingsData, loading: settingsLoading } = useApi(cmsService.getSection, "storeSettings");
  const settings = settingsData?.data || {};

  // Standard eCommerce features: Coupon input, Gift packaging toggle, Saved for Later array
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null); // { code, discountPercent, calculatedDiscount }
  const [couponError, setCouponError] = useState("");
  const [isGiftWrapped, setIsGiftWrapped] = useState(false);
  const [savedForLater, setSavedForLater] = useState([]);
  const [notification, setNotification] = useState("");

  const { data: couponsData, request: fetchCoupons } = useApi(couponService.getAll);

  React.useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  const activeCoupons = couponsData?.data?.filter(c => c.isActive) || [];

  const triggerNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(""), 3000);
  };

  // Enhance items with safe standard retail parameters
  const enhancedItems = useMemo(() => {
    return items.map((item) => {
      const price = item.price || 15000;
      const oldPrice = item.oldPrice || Math.round(price * 1.3);

      // Calculate dynamic delivery date
      const date = new Date();
      date.setDate(date.getDate() + (settings.deliveryTimelineDays || 5));
      const formattedDate = date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        weekday: "short",
      });

      return {
        ...item,
        price,
        oldPrice,
        imageSrc:
          item.imageSrc ||
          item.image ||
          "",
        seller: item.seller || settings.sellerName || "Siri Arts Artisans",
        deliveryDate: `Delivery by ${formattedDate}`,
      };
    });
  }, [items, settings]);

  // Pricing Summary Calculations
  const totalMRP = useMemo(() => {
    return enhancedItems.reduce(
      (acc, item) => acc + item.oldPrice * item.quantity,
      0,
    );
  }, [enhancedItems]);

  const actualSubtotal = useMemo(() => {
    return enhancedItems.reduce(
      (acc, item) => acc + item.price * item.quantity,
      0,
    );
  }, [enhancedItems]);

  const discountOnMRP = totalMRP - actualSubtotal;

  const couponDiscountAmount = appliedCoupon?.calculatedDiscount || 0;

  const giftWrapFee = isGiftWrapped ? (settings.giftWrapFee || 350) : 0;
  const platformFee = settings.platformFee || 0;
  const finalPayableAmount =
    actualSubtotal - couponDiscountAmount + giftWrapFee + platformFee;

  // Coupon handling logic
  const handleApplyCoupon = async (e) => {
    e.preventDefault();
    const code = couponInput.trim().toUpperCase();
    if (!code) return;

    try {
      const res = await couponService.apply(code, actualSubtotal);
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

  // Move active cart item to Saved for Later
  const handleSaveForLater = (item) => {
    setSavedForLater((prev) => [...prev, item]);
    removeItem(item.id, item.variant);
    triggerNotification(`Moved "${item.title}" to Saved for Later`);
  };

  // Move saved item back to Active Bag
  const handleMoveToBagFromSaved = (savedItem) => {
    addItem({
      id: savedItem.id,
      title: savedItem.title,
      price: savedItem.price,
      imageSrc: savedItem.imageSrc,
      variant: savedItem.variant || "Default",
      quantity: savedItem.quantity || 1,
    });
    setSavedForLater((prev) =>
      prev.filter(
        (i) => !(i.id === savedItem.id && i.variant === savedItem.variant),
      ),
    );
    triggerNotification(`Moved "${savedItem.title}" back to Bag`);
  };

  // Move active item directly to traditional Wishlist
  const handleMoveToWishlist = (item) => {
    addToWishlist({
      id: item.id,
      title: item.title,
      price: item.price,
      imageSrc: item.imageSrc,
    });
    removeItem(item.id, item.variant);
    triggerNotification(`Moved "${item.title}" to Wishlist`);
  };

  // Saved for Later items are kept in-memory only to comply with database-only source of truth

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="bg-surface-container-low min-h-screen pt-20 pb-32 font-body text-on-surface"
    >
      <SEO
        title="Your Artisanal Bag"
        description="Review your selected Siri Arts & Crafts masterpieces. Hand-picked heritage decor waiting for your final verification before our artisans begin preparation."
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
      <div className="bg-surface-bright border-b border-outline-variant/40 py-4 px-4 mb-6">
        <div className="max-w-xl mx-auto flex items-center justify-between text-[12px] font-semibold tracking-wider text-secondary uppercase">
          <div className="flex items-center gap-1.5 text-primary">
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-5 h-5 rounded-full bg-primary text-surface flex items-center justify-center text-[10px]"
            >
              1
            </motion.span>
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

      <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
        {enhancedItems.length === 0 ? (
          /* Empty Bag State with subtle bounce-in */
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-surface-bright border border-outline-variant/40 rounded-lg p-16 text-center max-w-lg mx-auto my-12 shadow-xs relative overflow-hidden"
          >
            <MandalaArtDecor
              variant={1}
              size={400}
              className="-bottom-20 -right-20 opacity-[0.03]"
            />
            <MandalaArtDecor
              variant={2}
              size={300}
              className="-top-20 -left-20 opacity-[0.02]"
            />

            {/* Minimalist Premium Icon Container */}
            <div className="w-16 h-16 rounded-full bg-primary/5 flex items-center justify-center mb-6 mx-auto relative">
              <div className="absolute inset-0 bg-primary/15 rounded-full blur-xl" />
              <span className="material-symbols-outlined text-primary text-[30px] relative z-10">
                shopping_bag
              </span>
            </div>

            <h2 className="font-display text-[22px] text-on-surface tracking-tight mb-2">
              Hey, it feels too light!
            </h2>
            <p className="font-body text-[13px] text-secondary/60 font-light max-w-[220px] mx-auto leading-relaxed mb-8">
              There is nothing in your bag. Let's add some custom crafted items.
            </p>

            <div className="flex justify-center">
              <Link
                to="/collections"
                className="group inline-flex items-center gap-2 text-on-surface hover:text-primary transition-colors py-2 font-label text-[11px] uppercase tracking-[0.2em] font-bold border-b-2 border-on-surface hover:border-primary"
              >
                <span>Continue Shopping</span>
                <span className="material-symbols-outlined text-[14px] group-hover:translate-x-1 transition-transform">
                  arrow_forward
                </span>
              </Link>
            </div>
          </motion.div>
        ) : (
          /* Multi-column Classic Checkout Engine */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Content List: Cart Entities */}
            <div className="lg:col-span-7 xl:col-span-8 space-y-4">
              {/* Available Offers Ribbon */}
              <AnimatePresence>
                {activeCoupons.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-surface-bright border border-outline-variant/40 rounded-lg p-3 sm:p-4 flex items-start gap-3 shadow-xs"
                  >
                    <span className="material-symbols-outlined text-base text-primary mt-0.5 animate-bounce">
                      local_offer
                    </span>
                    <div className="text-xs">
                      <span className="font-bold text-on-surface">
                        Available Offers
                      </span>
                      <ul className="list-disc pl-4 mt-1 space-y-1 text-secondary">
                        {activeCoupons.map((coupon) => (
                          <li key={coupon._id}>
                            Use code <span className="font-bold text-primary">{coupon.code}</span> to get {coupon.discountType === 'percentage' ? `${coupon.discountValue}%` : `₹${coupon.discountValue}`} off on orders above ₹{coupon.minOrderAmount}.
                          </li>
                        ))}
                      </ul>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Main Items Roster Header */}
              <div className="bg-surface-bright border border-outline-variant/40 rounded-lg p-4 flex items-center justify-between font-bold text-xs shadow-xs">
                <span>My Bag ({cartCount} Items)</span>
                <span className="text-primary font-medium">
                  Safe & Secure Shipment Guaranteed
                </span>
              </div>

              {/* Cart Line Items with fluid motion exit/enter presence */}
              <motion.div layout className="space-y-4">
                <AnimatePresence>
                  {enhancedItems.map((item) => {
                    const uniqueKey = `${item.id}-${item.variant}`;
                    const savingsPct = Math.round(
                      ((item.oldPrice - item.price) / item.oldPrice) * 100,
                    );

                    return (
                      <motion.div
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, x: -50, scale: 0.9 }}
                        transition={{ duration: 0.25 }}
                        key={uniqueKey}
                        className="bg-surface-bright border border-outline-variant/40 rounded-lg p-4 shadow-xs flex flex-col justify-between hover:border-outline transition-colors relative group overflow-hidden"
                      >
                        <MandalaArtDecor
                          variant={1}
                          size={200}
                          className="absolute -top-10 -left-10 opacity-0 group-hover:opacity-[0.03] transition-opacity pointer-events-none"
                        />
                        <div className="flex flex-col sm:flex-row gap-4">
                          {/* Left Thumbnail */}
                          <Link
                            to={`/product/${item.id}`}
                            className="w-full sm:w-24 h-48 sm:h-32 bg-surface-container rounded overflow-hidden flex-shrink-0 border border-outline-variant/20 block"
                          >
                            <motion.img
                              onError={handleImageError}
                              whileHover={{ scale: 1.05 }}
                              src={item.imageSrc}
                              alt={item.title}
                              className="w-full h-full object-cover transition-transform"
                            />
                          </Link>

                          {/* Right Details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start gap-2">
                              <div>
                                <h3 className="font-bold text-xs text-on-surface line-clamp-1">
                                  {item.title}
                                </h3>
                                <span className="text-[11px] text-secondary block mt-0.5 font-medium">
                                  Sold by: {item.seller}
                                </span>
                              </div>
                              <span className="text-[11px] bg-surface-container-low text-secondary px-2 py-0.5 rounded font-bold uppercase tracking-wider flex-shrink-0">
                                Assured
                              </span>
                            </div>

                            {/* Variant Pill */}
                            {item.variant && item.variant !== "Default" && (
                              <div className="mt-2 inline-block bg-surface-container text-on-surface text-[11px] px-2.5 py-0.5 rounded font-medium">
                                Style:{" "}
                                <span className="font-bold">
                                  {item.variant}
                                </span>
                              </div>
                            )}

                            {/* Pricing Row */}
                            <div className="flex items-baseline gap-2 mt-3 flex-wrap">
                              <span className="text-base font-bold text-on-surface">
                                ₹{item.price.toLocaleString()}
                              </span>
                              {item.oldPrice > item.price && (
                                <span className="text-xs text-secondary line-through">
                                  ₹{item.oldPrice.toLocaleString()}
                                </span>
                              )}
                              {savingsPct > 0 && (
                                <span className="text-xs font-bold text-primary">
                                  {savingsPct}% OFF
                                </span>
                              )}
                            </div>

                            {/* Return policy & delivery forecast strip */}
                            <div className="mt-2 text-[11px] text-secondary">
                              <span className="font-bold text-on-surface">
                                {settings.returnPolicyDays || 7} days
                              </span>{" "}
                              return available
                              <span className="mx-1.5 text-outline-variant">
                                |
                              </span>
                              <span className="text-primary font-medium">
                                {item.deliveryDate}
                              </span>
                            </div>

                            {/* Classic Inline Quantity Controls */}
                            <div className="mt-3 flex items-center gap-2">
                              <span className="text-[11px] text-secondary font-semibold">
                                Qty:
                              </span>
                              <div className="inline-flex items-center border border-outline-variant rounded bg-surface-bright">
                                <motion.button
                                  whileTap={{
                                    backgroundColor:
                                      "var(--color-surface-container)",
                                  }}
                                  onClick={() =>
                                    updateQuantity(
                                      item.id,
                                      item.variant,
                                      item.quantity - 1,
                                    )
                                  }
                                  className="px-2 py-0.5 text-xs font-bold text-secondary hover:bg-surface-container transition-colors"
                                >
                                  −
                                </motion.button>
                                <motion.span
                                  key={item.quantity}
                                  initial={{ scale: 0.8 }}
                                  animate={{ scale: 1 }}
                                  className="px-3 py-0.5 text-xs font-bold text-on-surface border-x border-outline-variant/50 min-w-[28px] text-center block"
                                >
                                  {item.quantity}
                                </motion.span>
                                <motion.button
                                  whileTap={{
                                    backgroundColor:
                                      "var(--color-surface-container)",
                                  }}
                                  onClick={() =>
                                    updateQuantity(
                                      item.id,
                                      item.variant,
                                      item.quantity + 1,
                                    )
                                  }
                                  className="px-2 py-0.5 text-xs font-bold text-secondary hover:bg-surface-container transition-colors"
                                >
                                  +
                                </motion.button>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Bottom Edge Actions */}
                        <div className="mt-4 pt-3 border-t border-surface-container flex items-center justify-start gap-6 text-[11px] font-bold uppercase tracking-wider">
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                              removeItem(item.id, item.variant);
                              triggerNotification(`Removed "${item.title}"`);
                            }}
                            className="text-secondary hover:text-red-600 transition-colors cursor-pointer"
                          >
                            Remove
                          </motion.button>
                          <span className="text-outline-variant">|</span>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleSaveForLater(item)}
                            className="text-primary hover:underline transition-all cursor-pointer"
                          >
                            Save for Later
                          </motion.button>
                          <span className="text-outline-variant">|</span>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleMoveToWishlist(item)}
                            className="text-secondary hover:text-primary transition-colors cursor-pointer"
                          >
                            Move to Wishlist
                          </motion.button>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </motion.div>

              {/* Saved for Later Section */}
              <AnimatePresence>
                {savedForLater.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-8 pt-4 overflow-hidden"
                  >
                    <div className="bg-surface-bright border border-outline-variant/40 rounded-lg p-4 font-bold text-xs shadow-xs mb-4">
                      Saved for Later ({savedForLater.length} Items)
                    </div>

                    <div className="space-y-4">
                      {savedForLater.map((savedItem, index) => (
                        <motion.div
                          layout
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 0.85, scale: 1 }}
                          whileHover={{ opacity: 1 }}
                          key={`saved-${index}`}
                          className="bg-surface-bright border border-outline-variant/40 rounded-lg p-4 shadow-xs flex flex-col justify-between transition-opacity"
                        >
                          <div className="flex flex-col sm:flex-row gap-4">
                            <img
                              onError={handleImageError}
                              src={savedItem.imageSrc}
                              alt="Traditional wedding event decoration"
                              className="w-full sm:w-16 h-40 sm:h-20 bg-surface-container rounded object-cover flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-xs text-on-surface truncate">
                                {savedItem.title}
                              </h4>
                              <span className="text-[11px] text-secondary block mt-0.5">
                                Style: {savedItem.variant || "Default"}
                              </span>
                              <span className="text-xs font-bold text-on-surface block mt-2">
                                ₹{savedItem.price?.toLocaleString()}
                              </span>
                            </div>
                          </div>

                          <div className="mt-3 pt-2 border-t border-surface-container flex items-center gap-6 text-[11px] font-bold uppercase tracking-wider">
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              onClick={() =>
                                handleMoveToBagFromSaved(savedItem)
                              }
                              className="text-primary hover:underline cursor-pointer"
                            >
                              Move to Bag
                            </motion.button>
                            <span className="text-outline-variant">|</span>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              onClick={() => {
                                setSavedForLater((prev) =>
                                  prev.filter((_, idx) => idx !== index),
                                );
                                triggerNotification("Deleted from saved space");
                              }}
                              className="text-[#685c57] hover:text-red-600 cursor-pointer"
                            >
                              Delete
                            </motion.button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Right Column Pane: Price Details Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="lg:col-span-5 xl:col-span-4 space-y-4"
            >
              {/* Coupons Block */}
              <div className="bg-surface-bright border border-outline-variant/40 rounded-lg p-4 shadow-xs">
                <span className="text-xs font-bold text-secondary uppercase tracking-wider block mb-2">
                  Coupons
                </span>

                <AnimatePresence mode="wait">
                  {appliedCoupon ? (
                    <motion.div
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.95, opacity: 0 }}
                      className="bg-green-50 border border-green-200 rounded p-3 flex items-center justify-between"
                    >
                      <div>
                        <span className="text-xs font-bold text-green-800 uppercase block">
                          {appliedCoupon.code} APPLIED
                        </span>
                        <span className="text-[11px] text-green-700">
                          You saved ₹{couponDiscountAmount.toLocaleString()}{" "}
                          with this code
                        </span>
                      </div>
                      <button
                        onClick={handleRemoveCoupon}
                        className="text-xs font-bold text-red-600 hover:underline cursor-pointer"
                      >
                        Remove
                      </button>
                    </motion.div>
                  ) : (
                    <motion.form
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      onSubmit={handleApplyCoupon}
                    >
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          placeholder="Enter coupon code"
                          value={couponInput}
                          onChange={(e) => {
                            setCouponInput(e.target.value);
                            if (couponError) setCouponError("");
                          }}
                          className="bg-surface-bright border border-outline-variant rounded px-3 py-2.5 text-xs outline-none focus:border-primary text-on-surface font-semibold uppercase flex-1 transition-colors min-h-[44px]"
                        />
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          type="submit"
                          className="bg-surface-bright border border-primary text-primary hover:bg-primary hover:text-surface px-4 py-2.5 rounded text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer w-full sm:w-auto min-h-[44px]"
                        >
                          Apply
                        </motion.button>
                      </div>
                      {couponError && (
                        <motion.span
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="text-[11px] text-red-600 block mt-1.5 font-medium"
                        >
                          {couponError}
                        </motion.span>
                      )}
                    </motion.form>
                  )}
                </AnimatePresence>
              </div>

              {/* Gift wrapping block */}
              <div className="bg-surface-bright border border-outline-variant/40 rounded-lg p-4 shadow-xs">
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isGiftWrapped}
                    onChange={(e) => setIsGiftWrapped(e.target.checked)}
                    className="mt-0.5 rounded text-primary focus:ring-0 w-4 h-4 cursor-pointer transition-all"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-on-surface block">
                      Add gift wrapping (+ ₹350)
                    </span>
                    <span className="text-[11px] text-secondary">
                      Includes bespoke message tags directly inside package.
                    </span>
                  </div>
                </label>
              </div>

              {/* Price Details Summary Card */}
              <div className="bg-surface-bright border border-outline-variant/40 rounded-lg p-4 shadow-xs relative overflow-hidden">
                <MandalaArtDecor
                  variant={2}
                  size={250}
                  className="-bottom-10 -right-10 opacity-[0.03]"
                />
                <h3 className="text-xs font-bold text-secondary uppercase tracking-wider pb-3 border-b border-outline-variant/40 mb-4 relative z-10">
                  Price Details ({cartCount} Items)
                </h3>
                <div className="space-y-3 text-xs text-on-surface relative z-10">
                  <div className="flex justify-between">
                    <span>Total MRP</span>
                    <span>₹{totalMRP.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Discount on MRP</span>
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
                        <span>Coupon Discount</span>
                        <span className="text-green-700 font-medium">
                          − ₹{couponDiscountAmount.toLocaleString()}
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <AnimatePresence>
                    {isGiftWrapped && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex justify-between overflow-hidden"
                      >
                        <span>Gift Wrapping Charges</span>
                        <span>₹{giftWrapFee.toLocaleString()}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <div className="flex justify-between">
                    <span>Shipping Fee</span>
                    <span className="text-green-700 font-bold uppercase tracking-wider text-[11px]">
                      Free
                    </span>
                  </div>
                  <div className="h-[1px] bg-outline-variant/40 my-3" />
                  <div className="flex justify-between items-baseline font-bold text-sm">
                    <span>Total Amount</span>
                    <motion.span
                      key={finalPayableAmount}
                      initial={{ scale: 0.95 }}
                      animate={{ scale: 1 }}
                      className="text-base text-primary"
                    >
                      ₹{finalPayableAmount.toLocaleString()}
                    </motion.span>
                  </div>
                </div>
                <motion.div
                  key={discountOnMRP + couponDiscountAmount}
                  initial={{ scale: 0.98 }}
                  animate={{ scale: 1 }}
                  className="bg-green-50 text-green-800 text-xs font-bold rounded p-2.5 mt-4 text-center border border-green-200/50 relative z-10"
                >
                  You will save ₹
                  {(discountOnMRP + couponDiscountAmount).toLocaleString()} on
                  this order
                </motion.div>
              </div>

              {/* Persistent Main Checkout Button */}
              <motion.div
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
              >
                <button
                  onClick={() => runProtectedAction(() => navigate("/checkout"))}
                  className="w-full bg-primary hover:bg-primary/90 text-surface py-3.5 rounded text-xs font-bold uppercase tracking-widest shadow-md transition-colors cursor-pointer text-center block"
                >
                  Proceed to Checkout
                </button>
              </motion.div>

              <div className="text-center">
                <Link
                  to="/collections"
                  className="text-[11px] font-bold text-secondary uppercase tracking-widest hover:text-primary transition-colors"
                >
                  Continue Shopping
                </Link>
              </div>

              {/* Secure verification badges footer */}
              <div className="pt-2 text-center text-[12px] text-secondary flex items-center justify-center gap-4 border-t border-outline-variant/20 flex-wrap">
                {settings.badges ? (
                  settings.badges.map((badge, idx) => (
                    <React.Fragment key={badge.id}>
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px] text-primary font-bold">
                          {badge.icon}
                        </span>
                        {badge.text}
                      </span>
                      {idx < settings.badges.length - 1 && <span>•</span>}
                    </React.Fragment>
                  ))
                ) : (
                  <>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px] text-green-700 font-bold">
                        verified_user
                      </span>
                      Safe Payments
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px] text-primary font-bold">
                        published_with_changes
                      </span>
                      Easy Returns
                    </span>
                    <span>•</span>
                    <span>100% Authentic</span>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </div>

      <div className="mt-16">
        <RecommendationSystem
          category={enhancedItems.length > 0 ? enhancedItems[0].category : undefined}
          currentProductId={enhancedItems.length > 0 ? enhancedItems[0].id : undefined}
        />
      </div>
    </motion.div>
  );
}
