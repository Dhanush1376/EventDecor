import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CloudinaryImage } from '../ui/CloudinaryImage';
import { useLongPress } from '../../hooks/useLongPress';
import React, { useState } from 'react';
import { useWishlistState, useWishlistDispatch } from '../../context/WishlistContext';
import { useCartDispatch } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { prefetchManager } from '../../utils/performance/prefetchManager';
import { parseNumericPrice, formatPrice } from '../../utils/ecommerce/priceUtils';
import { getProductRoute } from '../../utils/ecommerce/productRouteUtils';
import { DynamicRatingBadge } from '../ui/DynamicRatingBadge';
import { useQuickView } from '../../context/QuickViewContext';

export const ProductCard = React.memo(function ProductCard({
  id,
  _id,
  title,
  teluguTitle,
  nameTE,
  teluguName,
  price,
  oldPrice,
  rating = 0,
  reviews = 0,
  imageSrc,
  hoverImage,
  gallery,
  images, // Backend returns 'images', fallback to gallery
  category,
  primaryCategory,
  secondaryCategories,
  badges = [],
  onQuickView,
  hideDetails = false,
  loading = false,
  eager = false,
  sizes = '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 320px',
  rentalEnabled = false,
  availabilityMode,
  rentalPricing,
  compact = false,
  isNonRefundable = false,
  itemType = 'product', // 'product' or 'event'
  rentalPrice,
  strikingPrice,
  setupTimeHours,
  inclusions,
  securityDeposit,
  deposit,
  cartType = 'purchase',
  stock,
  rentalStock,
  selectionMode = false,
  isSelected = false,
}) {
  const navigate = useNavigate();
  const { isWishlisted } = useWishlistState();
  const { toggleItem } = useWishlistDispatch();
  const { attemptAddToCart } = useCartDispatch();
  const { runProtectedAction } = useAuth();
  const { openQuickView } = useQuickView();

  const handleQuickViewAction = (e, data) => {
    if (onQuickView) {
      onQuickView(e, data);
    } else {
      openQuickView(e, data);
    }
  };
  const [added, setAdded] = useState(false);
  const [isRippling, setIsRippling] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollContainerRef = React.useRef(null);

  const handleScroll = (e) => {
    if (!e.target) return;
    const scrollLeft = e.target.scrollLeft;
    const width = e.target.offsetWidth;
    if (width > 0) {
      const newIndex = Math.round(scrollLeft / width);
      if (newIndex !== activeIndex) {
        setActiveIndex(newIndex);
      }
    }
  };

  const availableImages = React.useMemo(() => {
    const imgs = [imageSrc];
    const imageList = images || gallery || [];
    if (imageList.length > 0) {
      imageList.forEach((img) => {
        if (!imgs.includes(img)) imgs.push(img);
      });
    } else if (hoverImage && hoverImage !== imageSrc) {
      imgs.push(hoverImage);
    }
    return imgs;
  }, [imageSrc, hoverImage, gallery, images]);

  const { longPressTriggered, handlers: longPressHandlers } = useLongPress(
    (e) => {
      if (navigator.vibrate) navigator.vibrate(50);
      handleQuickViewAction(e, {
        id,
        _id,
        title,
        teluguTitle,
        nameTE,
        teluguName,
        price,
        rentalPrice,
        oldPrice,
        rating,
        imageSrc,
        hoverImage,
        images: availableImages,
        category: primaryCategory?.name || category,
        primaryCategory,
        secondaryCategories,
        badges,
        itemType,
        setupTimeHours,
        inclusions,
      });
    },
    { delay: 500 },
  );

  if (loading) {
    return (
      <div className="flex flex-col gap-4 animate-pulse">
        <div className="aspect-[4/5] w-full bg-surface-container-high rounded-2xl overflow-hidden" />
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <div className="h-3 w-1/4 bg-surface-container rounded-full" />
            <div className="h-3 w-1/6 bg-surface-container rounded-full" />
          </div>
          <div className="h-6 w-3/4 bg-surface-container rounded-lg" />
          <div className="flex gap-2">
            <div className="h-8 w-1/3 bg-surface-container rounded-lg" />
            <div className="h-8 w-1/4 bg-surface-container rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  const productId = id || _id;
  const wishlisted = isWishlisted(productId);

  const numericPrice = parseNumericPrice(itemType === 'event' ? rentalPrice || price : price);
  const parsedOldPrice = oldPrice
    ? parseNumericPrice(oldPrice)
    : strikingPrice
      ? parseNumericPrice(strikingPrice)
      : 0;
  const numericOldPrice = parsedOldPrice > numericPrice ? parsedOldPrice : 0;

  const discount =
    numericOldPrice > numericPrice
      ? Math.round(((numericOldPrice - numericPrice) / numericOldPrice) * 100)
      : null;

  const canRent =
    rentalEnabled && (availabilityMode === 'rent_only' || availabilityMode === 'both');
  const canPurchase = !availabilityMode || availabilityMode !== 'rent_only';

  const isRental = cartType === 'rental' || (!canPurchase && canRent);
  const resolvedCartType = isRental ? 'rental' : 'purchase';
  const resolvedPrice = isRental
    ? rentalPricing?.daily || rentalPricing?.weekly || rentalPricing?.monthly || price
    : price;
  const resolvedDeposit = isRental ? securityDeposit || deposit || 0 : 0;
  const isOutOfStock = isRental ? rentalStock <= 0 : stock <= 0;

  const handleCardClick = (e) => {
    if (longPressTriggered) return;
    // If the user clicked a button or any interactive element inside a button, don't trigger the card link
    if (e.target.closest('button')) return;
    navigate(getProductRoute(itemType, productId));
  };

  const handleWishlist = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsRippling(true);
    setTimeout(() => setIsRippling(false), 500);
    runProtectedAction(() => {
      toggleItem({
        id: productId,
        title,
        price: itemType === 'event' ? rentalPrice : price,
        imageSrc,
      });
    });
  };

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    attemptAddToCart({
      id: productId,
      title,
      price: resolvedPrice,
      imageSrc,
      quantity: 1,
      variant: 'Default',
      type: resolvedCartType,
      deposit: resolvedDeposit,
      isNonRefundable,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      navigate(getProductRoute(itemType, productId));
    }
  };

  return (
    <motion.div
      onMouseEnter={() => {
        const route = getProductRoute(itemType, productId);
        prefetchManager.prefetchRoute(route, { kind: 'hover', productId });
      }}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      {...longPressHandlers}
      tabIndex={0}
      role="link"
      aria-label={`View details of ${title}`}
      className="group relative flex flex-col cursor-pointer focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4 focus-visible:ring-offset-surface rounded-2xl z-10 hover:z-[60]"
    >
      {/* 1. VISUAL CANVAS */}
      <div className="relative aspect-[4/5] overflow-hidden bg-[#fafafa] rounded-2xl border border-black/5 group/canvas">
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex w-full h-full overflow-x-auto snap-x snap-mandatory no-scrollbar scroll-smooth"
        >
          {availableImages.map((img, idx) => (
            <div key={idx} className="w-full h-full flex-shrink-0 snap-center relative">
              <Link
                to={getProductRoute(itemType, productId)}
                className="block h-full w-full"
                draggable="false"
              >
                <CloudinaryImage
                  src={img}
                  alt={`${title} - view ${idx + 1}`}
                  className="transition-all duration-[1.5s] ease-[cubic-bezier(0.2,1,0.2,1)] group-hover/canvas:scale-110 object-cover w-full h-full"
                  loading={eager && idx === 0 ? 'eager' : 'lazy'}
                  fetchPriority={eager && idx === 0 ? 'high' : 'auto'}
                  width={320}
                  height={400}
                  sizes={sizes}
                />
              </Link>
            </div>
          ))}
        </div>

        {availableImages.length > 1 && (
          <>
            {/* Dots Indicator */}
            <div className="absolute bottom-3 left-3 lg:bottom-4 lg:left-4 flex items-center gap-1.5 z-20 bg-black/20 backdrop-blur-md px-2 py-1.5 rounded-full border border-white/10 shadow-sm pointer-events-auto">
              {availableImages.map((_, i) => (
                <div
                  key={i}
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (scrollContainerRef.current) {
                      scrollContainerRef.current.scrollTo({
                        left: i * scrollContainerRef.current.clientWidth,
                        behavior: 'smooth',
                      });
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      e.stopPropagation();
                      if (scrollContainerRef.current) {
                        scrollContainerRef.current.scrollTo({
                          left: i * scrollContainerRef.current.clientWidth,
                          behavior: 'smooth',
                        });
                      }
                    }
                  }}
                  className={`transition-all duration-300 rounded-full shadow-md border border-black/10 outline-none cursor-pointer hover:scale-125 flex-shrink-0 p-0 m-0 ${
                    i === activeIndex
                      ? 'w-2 h-2 lg:w-2.5 lg:h-2.5 bg-white'
                      : 'w-1.5 h-1.5 lg:w-2 lg:h-2 bg-white/60 hover:bg-white/80'
                  }`}
                  style={{ minHeight: 'auto', minWidth: 'auto' }}
                  aria-label={`Go to image ${i + 1}`}
                />
              ))}
            </div>
          </>
        )}
        {/* Floating Utility Actions */}
        {!selectionMode && (
          <div className="absolute top-2 right-3 lg:top-3 lg:right-4 z-20 flex flex-col gap-2">
            <button
              onClick={handleWishlist}
              className={`${compact ? 'w-7 h-7 lg:w-7 lg:h-7' : 'w-8 h-8 lg:w-8 lg:h-8'} relative min-h-0 shrink-0 aspect-square p-0 bg-white/90 backdrop-blur-xl rounded-full flex items-center justify-center shadow-sm border border-black/5 transition-all duration-300 hover:scale-110 cursor-pointer active:scale-[0.96] overflow-hidden`}
              aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
            >
              <AnimatePresence>
                {isRippling && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0.5 }}
                    animate={{ scale: 2.5, opacity: 0 }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                    className={`absolute inset-0 rounded-full origin-center pointer-events-none ${wishlisted ? 'bg-black/10' : 'bg-[#ff2d55]/20'}`}
                  />
                )}
              </AnimatePresence>
              <motion.span
                animate={{
                  scale: wishlisted ? [1, 1.4, 1] : 1,
                  color: wishlisted ? '#ff2d55' : '#1a1817',
                  fontVariationSettings: wishlisted
                    ? "'FILL' 1, 'wght' 300"
                    : "'FILL' 0, 'wght' 300",
                }}
                whileTap={{ scale: 0.8 }}
                transition={{ duration: 0.3, type: 'spring', stiffness: 300 }}
                className={`material-symbols-outlined ${compact ? 'text-[11px]' : 'text-[13px] lg:text-[14px]'}`}
              >
                favorite
              </motion.span>
            </button>
          </div>
        )}
        {/* Badges */}
        <div className="absolute top-2 left-2 lg:top-3 lg:left-3 z-20 pointer-events-none group/badges">
          <div className="flex flex-row -space-x-3 lg:-space-x-4 py-1 px-1 pointer-events-auto hover:space-x-1 transition-all duration-300">
            {itemType === 'event' ? (
              <>
                <div className="relative z-[30] w-8 h-8 lg:w-10 lg:h-10 shrink-0 bg-primary text-white rounded-full flex flex-col items-center justify-center font-label text-[8px] lg:text-[10px] uppercase font-bold shadow-lg border-2 border-white hover:scale-110 transition-transform duration-300 select-none">
                  <span className="leading-none">{setupTimeHours || 2}h</span>
                  <span className="text-[5px] lg:text-[7px] tracking-tight opacity-90 uppercase mt-0.5">
                    Setup
                  </span>
                </div>
                {inclusions && inclusions.length > 0 && (
                  <div className="relative z-[20] w-8 h-8 lg:w-10 lg:h-10 shrink-0 bg-white/95 backdrop-blur-md text-[#1a1817] rounded-full flex flex-col items-center justify-center font-label uppercase font-bold shadow-md border-2 border-white hover:scale-110 transition-transform duration-300 select-none">
                    <span className="leading-none text-[8px] lg:text-[10px]">
                      {inclusions.length}
                    </span>
                    <span className="text-[5px] lg:text-[6px] tracking-tight opacity-80 uppercase mt-0.5">
                      Props
                    </span>
                  </div>
                )}
              </>
            ) : (
              <>
                {canRent && resolvedCartType === 'rental' && (
                  <div className="relative z-[40] w-8 h-8 lg:w-10 lg:h-10 shrink-0 bg-[#8c7335] text-white rounded-full flex flex-col items-center justify-center font-label uppercase font-bold shadow-lg border-2 border-white hover:scale-110 transition-transform duration-300 select-none">
                    <span className="material-symbols-outlined text-[10px] lg:text-[12px] leading-none mb-[1px]">
                      event_available
                    </span>
                    <span className="leading-none text-[6px] lg:text-[8px] tracking-tight">
                      RENT
                    </span>
                  </div>
                )}
                {discount && (canPurchase || itemType === 'event') && (
                  <div className="relative z-[30] w-8 h-8 lg:w-10 lg:h-10 shrink-0 bg-[#7a5e00] text-white rounded-full flex flex-col items-center justify-center font-label uppercase font-bold shadow-lg border-2 border-white hover:scale-110 transition-transform duration-300 select-none">
                    <span className="leading-none text-[8px] lg:text-[10px]">{discount}%</span>
                    <span className="text-[5px] lg:text-[6px] tracking-tight opacity-90 uppercase mt-0.5">
                      OFF
                    </span>
                  </div>
                )}
                {badges.map((badge, idx) => {
                  const rawBadgeText =
                    typeof badge === 'object' && badge !== null ? badge.text : badge;
                  const badgeIcon = typeof badge === 'object' && badge !== null ? badge.icon : null;

                  if (!rawBadgeText && !badgeIcon) return null;

                  const couponMatch = rawBadgeText
                    ? String(rawBadgeText).match(/:([A-Za-z0-9_-]+)/)
                    : null;
                  const couponCode = couponMatch ? couponMatch[1] : null;
                  let badgeText = couponMatch
                    ? String(rawBadgeText).replace(couponMatch[0], '').trim()
                    : rawBadgeText;

                  // If the badge ONLY contained the coupon code (e.g. ":siri40"),
                  // badgeText would be empty. Fall back to showing the code itself.
                  if (couponCode && !badgeText) {
                    badgeText = couponCode;
                  }

                  const words = String(badgeText || '')
                    .trim()
                    .split(/\s+/);
                  const displayContent =
                    words.length > 1 ? (
                      <>
                        {badgeIcon && (
                          <span className="material-symbols-outlined text-[8px] lg:text-[10px] mb-[1px]">
                            {badgeIcon}
                          </span>
                        )}
                        <span className="leading-none text-[6px] lg:text-[8px]">{words[0]}</span>
                        <span className="text-[5px] lg:text-[6px] tracking-tight opacity-80 uppercase mt-0.5">
                          {words.slice(1).join(' ')}
                        </span>
                      </>
                    ) : (
                      <>
                        {badgeIcon && (
                          <span className="material-symbols-outlined text-[8px] lg:text-[10px] mb-[1px]">
                            {badgeIcon}
                          </span>
                        )}
                        {badgeText && (
                          <span className="leading-none text-[6px] lg:text-[8px] truncate max-w-full px-1">
                            {badgeText}
                          </span>
                        )}
                      </>
                    );

                  const Component = couponCode ? 'button' : 'div';
                  const extraProps = couponCode
                    ? {
                        onClick: (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          navigate(`/collections?coupon=${couponCode}`);
                        },
                        title: `Click to view all products for coupon ${couponCode}`,
                      }
                    : {};

                  return (
                    <Component
                      key={`badge-${idx}`}
                      {...extraProps}
                      className={`relative w-8 h-8 lg:w-10 lg:h-10 shrink-0 bg-white/95 backdrop-blur-md text-black/80 rounded-full flex flex-col items-center justify-center font-label uppercase font-bold shadow-md border-2 border-white transition-transform duration-300 select-none ${couponCode ? 'hover:scale-110 cursor-pointer hover:bg-[#e0d6b8] hover:text-[#1a1c1a] active:scale-95 z-50' : 'hover:scale-110 z-[20]'}`}
                      style={{ zIndex: 20 - idx }}
                    >
                      {displayContent}
                    </Component>
                  );
                })}
              </>
            )}
          </div>
        </div>
        {/* Immersive Hover Actions (Desktop Only) */}
        {!selectionMode && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] opacity-0 lg:group-hover:opacity-100 transition-all duration-500 flex flex-col justify-end p-6 pointer-events-none lg:group-hover:pointer-events-auto">
            <div className="space-y-2 transform translate-y-4 lg:group-hover:translate-y-0 transition-transform duration-500">
              {itemType === 'event' ? (
                <>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      navigate(getProductRoute('event', productId));
                    }}
                    className="w-full py-3 bg-[#e0d6b8] hover:bg-white text-[#1a1c1a] rounded-full font-label text-[10px] uppercase tracking-[0.2em] font-bold shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-[0.98]"
                  >
                    <span className="material-symbols-outlined text-[14px]">event</span>
                    Book Setup
                  </button>
                  <button
                    onClick={(e) => {
                      handleQuickViewAction(e, {
                        id,
                        _id,
                        title,
                        teluguTitle,
                        nameTE,
                        teluguName,
                        price,
                        rentalPrice,
                        oldPrice,
                        rating,
                        imageSrc,
                        hoverImage,
                        category: primaryCategory?.name || category,
                        primaryCategory,
                        secondaryCategories,
                        badges,
                        itemType,
                        setupTimeHours,
                        inclusions,
                      });
                    }}
                    className="w-full bg-white/10 backdrop-blur-md text-white py-3 rounded-full font-label text-[10px] uppercase tracking-[0.2em] font-bold border border-white/20 hover:bg-white/20 transition-all cursor-pointer"
                  >
                    Quick View
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={isOutOfStock || added ? undefined : handleAddToCart}
                    disabled={isOutOfStock || added}
                    className={`w-full py-3 rounded-full font-label text-[10px] uppercase tracking-[0.2em] font-bold shadow-xl transition-all duration-500 cursor-pointer flex items-center justify-center ${
                      isOutOfStock
                        ? 'bg-stone-300 text-stone-500 cursor-not-allowed'
                        : added
                          ? 'bg-[#e0d6b8] text-[#1a1c1a]'
                          : 'bg-white text-black hover:bg-[#e0d6b8] hover:text-[#1a1c1a]'
                    }`}
                  >
                    <AnimatePresence mode="wait">
                      {added ? (
                        <motion.span
                          key="added"
                          initial={{ opacity: 0, scale: 0.85 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.85 }}
                          transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                          className="flex items-center justify-center gap-1.5"
                        >
                          <motion.span
                            initial={{ scale: 0.5, rotate: -30 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{
                              delay: 0.05,
                              type: 'spring',
                              stiffness: 400,
                              damping: 15,
                            }}
                            className="material-symbols-outlined text-[14px]"
                          >
                            check
                          </motion.span>
                          <span>Added</span>
                        </motion.span>
                      ) : (
                        <motion.span
                          key="add"
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.2 }}
                        >
                          {isOutOfStock ? 'Out of Stock' : 'Add to Bag'}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </button>
                  <button
                    onClick={(e) =>
                      handleQuickViewAction(e, {
                        id,
                        _id,
                        title,
                        teluguTitle,
                        nameTE,
                        teluguName,
                        price,
                        oldPrice,
                        rating,
                        imageSrc,
                        hoverImage,
                        category: primaryCategory?.name || category,
                        primaryCategory,
                        secondaryCategories,
                        badges,
                      })
                    }
                    className="w-full bg-white/10 backdrop-blur-md text-white py-3 rounded-full font-label text-[10px] uppercase tracking-[0.2em] font-bold border border-white/20 hover:bg-white/20 transition-all cursor-pointer"
                  >
                    Quick View
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Mobile & Tablet Quick Add Button */}
        {!selectionMode && (
          <div className="xl:hidden absolute bottom-3 right-3 z-20">
            {itemType === 'event' ? (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  navigate(getProductRoute('event', productId));
                }}
                className={`${compact ? 'w-7 h-7 lg:w-7 lg:h-7' : 'w-8 h-8 lg:w-8 lg:h-8'} min-h-0 shrink-0 aspect-square p-0 rounded-full flex items-center justify-center shadow-lg bg-black text-white hover:bg-[#e0d6b8] hover:text-[#1a1c1a] transition-all duration-500 cursor-pointer`}
                aria-label="Book setup"
              >
                <span
                  className={`material-symbols-outlined ${compact ? 'text-[11px]' : 'text-[13px] lg:text-[14px]'}`}
                >
                  event
                </span>
              </button>
            ) : (
              <button
                onClick={isOutOfStock || added ? undefined : handleAddToCart}
                disabled={isOutOfStock || added}
                className={`${compact ? 'w-7 h-7 lg:w-7 lg:h-7' : 'w-8 h-8 lg:w-8 lg:h-8'} min-h-0 shrink-0 aspect-square p-0 rounded-full flex items-center justify-center shadow-lg transition-all duration-500 ${
                  isOutOfStock
                    ? 'bg-stone-300 text-stone-500 cursor-not-allowed'
                    : added
                      ? 'bg-[#e0d6b8] text-[#1a1c1a] cursor-pointer'
                      : 'bg-black text-white hover:bg-[#e0d6b8] hover:text-[#1a1c1a] cursor-pointer'
                }`}
                aria-label="Add to bag"
              >
                <AnimatePresence mode="wait">
                  {added ? (
                    <motion.span
                      key="check"
                      initial={{ opacity: 0, scale: 0.5, rotate: -30 }}
                      animate={{ opacity: 1, scale: 1, rotate: 0 }}
                      exit={{ opacity: 0, scale: 0.5, rotate: 30 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                      className={`material-symbols-outlined ${compact ? 'text-[11px]' : 'text-[13px] lg:text-[14px]'}`}
                    >
                      check
                    </motion.span>
                  ) : (
                    <motion.span
                      key="add"
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.5 }}
                      transition={{ duration: 0.2 }}
                      className={`material-symbols-outlined ${compact ? 'text-[11px]' : 'text-[13px] lg:text-[14px]'}`}
                    >
                      {isOutOfStock ? 'remove_shopping_cart' : 'add'}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            )}
          </div>
        )}

        {/* Selection Overlay */}
        {selectionMode && isSelected && (
          <div className="absolute inset-0 bg-black/5 ring-4 ring-inset ring-black rounded-2xl z-30 pointer-events-none flex items-center justify-center transition-all">
            <div className="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center shadow-lg animate-scale-in">
              <span className="material-symbols-outlined text-[24px]">check</span>
            </div>
          </div>
        )}
      </div>

      <div
        className={`${compact ? 'pt-1.5 pb-1 px-1.5' : 'pt-2.5 pb-2 px-3.5 lg:px-4'} flex flex-col flex-1 transition-opacity duration-500 ${hideDetails ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
      >
        <div className={`flex items-center gap-1.5 ${compact ? 'mb-0.5' : 'mb-1.5 lg:mb-2'}`}>
          <span
            className={`text-black/60 font-label uppercase ${compact ? 'text-[7px] tracking-[0.1em]' : 'text-[8px] lg:text-[9px] tracking-[0.15em] lg:tracking-[0.2em]'} font-bold truncate flex-1 min-w-0`}
          >
            {primaryCategory?.name || category || 'Uncategorized'}
          </span>

          <div className="w-0.5 h-0.5 rounded-full bg-black/10" />
          <div className="flex items-center gap-0.5">
            <DynamicRatingBadge
              itemId={productId}
              itemType={itemType}
              initialRating={rating}
              initialReviews={reviews}
              compact={compact}
            />
          </div>
        </div>

        <Link
          to={getProductRoute(itemType, productId)}
          className={`group/link block ${compact ? 'mb-0.5' : 'mb-1 lg:mb-1.5'}`}
        >
          <h3
            className={`text-black group-hover/link:text-primary transition-colors leading-tight font-medium line-clamp-1 ${
              compact
                ? 'font-body text-[12px] lg:text-[13px]'
                : 'font-display text-[13px] lg:text-[15px]'
            }`}
            style={compact ? { fontFamily: 'var(--font-body)' } : undefined}
          >
            {title}
          </h3>
        </Link>

        <div className="mt-auto flex flex-col justify-end">
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span
              className={`font-display lining-nums font-bold text-black leading-none ${compact ? 'text-[13px] lg:text-[14px]' : 'text-[14px] lg:text-[17px]'}`}
            >
              {'Rs. '}
              {formatPrice(
                itemType === 'event'
                  ? rentalPrice || price
                  : isRental
                    ? rentalPricing?.daily ||
                      rentalPricing?.weekly ||
                      rentalPricing?.monthly ||
                      price
                    : canPurchase
                      ? price
                      : rentalPricing?.daily ||
                        rentalPricing?.weekly ||
                        rentalPricing?.monthly ||
                        price,
              )}
              {(isRental || itemType === 'event') && (
                <span
                  className={`font-label text-black/40 ml-0.5 normal-case font-bold ${compact ? 'text-[8px] lg:text-[9px]' : 'text-[9px] lg:text-[10px]'}`}
                >
                  / day
                </span>
              )}
            </span>
            {numericOldPrice > numericPrice && (
              <span
                className={`font-display lining-nums text-black/40 line-through ${compact ? 'text-[9px] lg:text-[10px]' : 'text-[10px] lg:text-[11px]'}`}
              >
                Rs. {formatPrice(numericOldPrice)}
              </span>
            )}
          </div>
          {itemType !== 'event' && isRental && (
            <span
              className={`text-black/50 font-bold uppercase tracking-widest mt-0.5 ${compact ? 'text-[8px]' : 'text-[9px] lg:text-[10px]'}`}
            >
              Rental Price (Deposit: Rs. {formatPrice(resolvedDeposit)})
            </span>
          )}
          {itemType !== 'event' && !isRental && canRent && !canPurchase && (
            <span
              className={`text-black/50 font-bold uppercase tracking-widest mt-0.5 ${compact ? 'text-[8px]' : 'text-[9px] lg:text-[10px]'}`}
            >
              Rental Price
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
});
