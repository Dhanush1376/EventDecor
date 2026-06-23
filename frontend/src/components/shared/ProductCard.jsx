import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CloudinaryImage } from '../ui/CloudinaryImage';
import React, { useState } from 'react';
import { useWishlistState, useWishlistDispatch } from '../../context/WishlistContext';
import { useCartDispatch } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { prefetchManager } from '../../utils/performance/prefetchManager';
import { parseNumericPrice, formatPrice } from '../../utils/ecommerce/priceUtils';
import { getProductRoute } from '../../utils/ecommerce/productRouteUtils';

export const ProductCard = React.memo(function ProductCard({
  id,
  _id,
  title,
  teluguTitle,
  nameTE,
  teluguName,
  price,
  oldPrice,
  rating = 4.8,
  imageSrc,
  hoverImage,
  category,
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
  setupTimeHours,
  inclusions,
  securityDeposit,
  deposit,
  cartType = 'purchase',
  stock,
  rentalStock,
}) {
  const navigate = useNavigate();
  const { isWishlisted } = useWishlistState();
  const { toggleItem } = useWishlistDispatch();
  const { attemptAddToCart } = useCartDispatch();
  const { runProtectedAction } = useAuth();
  const [added, setAdded] = useState(false);
  const [isRippling, setIsRippling] = useState(false);

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

  const numericPrice = parseNumericPrice(price);
  const parsedOldPrice = oldPrice ? parseNumericPrice(oldPrice) : 0;
  const numericOldPrice =
    parsedOldPrice > numericPrice
      ? parsedOldPrice
      : numericPrice
        ? Math.round(numericPrice * 1.25)
        : 0;

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
    runProtectedAction(() => {
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
    });
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
      tabIndex={0}
      role="link"
      aria-label={`View details of ${title}`}
      className="group relative flex flex-col cursor-pointer focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4 focus-visible:ring-offset-surface rounded-2xl z-10"
    >
      {/* 1. VISUAL CANVAS */}
      <div className="relative aspect-[4/5] overflow-hidden bg-[#fafafa] rounded-2xl border border-black/5">
        <Link to={getProductRoute(itemType, productId)} className="block h-full">
          <CloudinaryImage
            src={imageSrc}
            alt={title}
            className="transition-all duration-[1.5s] ease-[cubic-bezier(0.2,1,0.2,1)] group-hover:scale-110"
            loading={eager ? 'eager' : 'lazy'}
            fetchPriority={eager ? 'high' : 'auto'}
            width={320}
            height={400}
            sizes={sizes}
          />
        </Link>
        {/* Floating Utility Actions */}
        <div className="absolute top-2 right-3 md:top-3 md:right-4 z-20 flex flex-col gap-2">
          <button
            onClick={handleWishlist}
            className={`${compact ? 'w-7 h-7 md:w-7 md:h-7' : 'w-8 h-8 md:w-8 md:h-8'} relative min-h-0 shrink-0 aspect-square p-0 bg-white/90 backdrop-blur-xl rounded-full flex items-center justify-center shadow-sm border border-black/5 transition-all duration-300 hover:scale-110 cursor-pointer active:scale-[0.96] overflow-hidden`}
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
                fontVariationSettings: wishlisted ? "'FILL' 1, 'wght' 300" : "'FILL' 0, 'wght' 300",
              }}
              whileTap={{ scale: 0.8 }}
              transition={{ duration: 0.3, type: 'spring', stiffness: 300 }}
              className={`material-symbols-outlined ${compact ? 'text-[11px]' : 'text-[13px] md:text-[14px]'}`}
            >
              favorite
            </motion.span>
          </button>
        </div>{' '}
        {/* Badges */}
        <div className="absolute top-2 left-3 md:top-3 md:left-4 flex flex-row items-center -space-x-2 md:-space-x-3 z-10">
          {itemType === 'event' ? (
            <>
              <div className="w-8 h-8 md:w-10 md:h-10 bg-primary text-white rounded-full flex flex-col items-center justify-center font-label text-[8px] md:text-[10px] uppercase font-bold shadow-lg border-2 border-white z-[6] hover:z-30 hover:scale-110 transition-all duration-300 select-none">
                <span className="leading-none">{setupTimeHours || 2}h</span>
                <span className="text-[5px] md:text-[7px] tracking-tight opacity-90 uppercase mt-0.5">
                  Setup
                </span>
              </div>
              {inclusions && inclusions.length > 0 && (
                <div className="w-8 h-8 md:w-10 md:h-10 bg-white/95 backdrop-blur-md text-[#1a1817] rounded-full flex flex-col items-center justify-center font-label uppercase font-bold shadow-md border-2 border-white z-[5] hover:z-30 hover:scale-110 transition-all duration-300 select-none">
                  <span className="leading-none text-[8px] md:text-[10px]">
                    {inclusions.length}
                  </span>
                  <span className="text-[5px] md:text-[6px] tracking-tight opacity-80 uppercase mt-0.5">
                    Props
                  </span>
                </div>
              )}
            </>
          ) : (
            <>
              {canRent && resolvedCartType === 'rental' && (
                <div className="w-8 h-8 md:w-10 md:h-10 bg-[#8c7335] text-white rounded-full flex flex-col items-center justify-center font-label uppercase font-bold shadow-lg border-2 border-white z-[6] hover:z-30 hover:scale-110 transition-all duration-300 select-none">
                  <span className="material-symbols-outlined text-[10px] md:text-[12px] leading-none mb-[1px]">
                    event_available
                  </span>
                  <span className="leading-none text-[6px] md:text-[8px] tracking-tight">RENT</span>
                </div>
              )}
              {discount && canPurchase && (
                <div className="w-8 h-8 md:w-10 md:h-10 bg-primary text-white rounded-full flex flex-col items-center justify-center font-label uppercase font-bold shadow-lg border-2 border-white z-[5] hover:z-30 hover:scale-110 transition-all duration-300 select-none">
                  <span className="leading-none text-[8px] md:text-[10px]">{discount}%</span>
                  <span className="text-[5px] md:text-[6px] tracking-tight opacity-90 uppercase mt-0.5">
                    OFF
                  </span>
                </div>
              )}
              {badges.slice(0, 2).map((badge, idx) => {
                const badgeText = typeof badge === 'object' && badge !== null ? badge.text : badge;
                const badgeIcon = typeof badge === 'object' && badge !== null ? badge.icon : null;

                if (!badgeText && !badgeIcon) return null;

                const words = String(badgeText || '')
                  .trim()
                  .split(/\s+/);
                const displayContent =
                  words.length > 1 ? (
                    <>
                      {badgeIcon && (
                        <span className="material-symbols-outlined text-[8px] md:text-[10px] mb-[1px]">
                          {badgeIcon}
                        </span>
                      )}
                      <span className="leading-none text-[6px] md:text-[8px]">{words[0]}</span>
                      <span className="text-[5px] md:text-[6px] tracking-tight opacity-80 uppercase mt-0.5">
                        {words.slice(1).join(' ')}
                      </span>
                    </>
                  ) : (
                    <>
                      {badgeIcon && (
                        <span className="material-symbols-outlined text-[8px] md:text-[10px] mb-[1px]">
                          {badgeIcon}
                        </span>
                      )}
                      {badgeText && (
                        <span className="leading-none text-[6px] md:text-[8px] truncate max-w-full px-1">
                          {badgeText}
                        </span>
                      )}
                    </>
                  );

                return (
                  <div
                    key={`badge-${idx}`}
                    style={{ zIndex: 4 - idx }}
                    className="w-8 h-8 md:w-10 md:h-10 bg-white/95 backdrop-blur-md text-black/80 rounded-full flex flex-col items-center justify-center font-label uppercase font-bold shadow-md border-2 border-white hover:z-30 hover:scale-110 transition-all duration-300 select-none"
                  >
                    {displayContent}
                  </div>
                );
              })}
              {badges.length > 2 && (
                <div
                  className="w-8 h-8 md:w-10 md:h-10 bg-white/90 backdrop-blur-md text-black/60 rounded-full flex items-center justify-center font-label text-[9px] md:text-[11px] font-bold shadow-md border-2 border-white select-none"
                  style={{ zIndex: 1 }}
                >
                  +{badges.length - 2}
                </div>
              )}
            </>
          )}
        </div>
        {/* Immersive Hover Actions (Desktop Only) */}
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
                    if (onQuickView) {
                      onQuickView(e, {
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
                        category,
                        badges,
                        itemType,
                        setupTimeHours,
                        inclusions,
                      });
                    } else {
                      e.preventDefault();
                      e.stopPropagation();
                      navigate(getProductRoute('event', productId));
                    }
                  }}
                  className="w-full bg-white/10 backdrop-blur-md text-white py-3 rounded-full font-label text-[10px] uppercase tracking-[0.2em] font-bold border border-white/20 hover:bg-white/20 transition-all cursor-pointer"
                >
                  Quick View
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={isOutOfStock ? undefined : handleAddToCart}
                  disabled={isOutOfStock}
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
                          transition={{ delay: 0.05, type: 'spring', stiffness: 400, damping: 15 }}
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
                    onQuickView(e, {
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
                      category,
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
        {/* Mobile & Tablet Quick Add Button */}
        <div className="xl:hidden absolute bottom-3 right-3 z-20">
          {itemType === 'event' ? (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                navigate(getProductRoute('event', productId));
              }}
              className={`${compact ? 'w-7 h-7 md:w-7 md:h-7' : 'w-8 h-8 md:w-8 md:h-8'} min-h-0 shrink-0 aspect-square p-0 rounded-full flex items-center justify-center shadow-lg bg-black text-white hover:bg-[#e0d6b8] hover:text-[#1a1c1a] transition-all duration-500 cursor-pointer`}
              aria-label="Book setup"
            >
              <span
                className={`material-symbols-outlined ${compact ? 'text-[11px]' : 'text-[13px] md:text-[14px]'}`}
              >
                event
              </span>
            </button>
          ) : (
            <button
              onClick={isOutOfStock ? undefined : handleAddToCart}
              disabled={isOutOfStock}
              className={`${compact ? 'w-7 h-7 md:w-7 md:h-7' : 'w-8 h-8 md:w-8 md:h-8'} min-h-0 shrink-0 aspect-square p-0 rounded-full flex items-center justify-center shadow-lg transition-all duration-500 ${
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
                    className={`material-symbols-outlined ${compact ? 'text-[11px]' : 'text-[13px] md:text-[14px]'}`}
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
                    className={`material-symbols-outlined ${compact ? 'text-[11px]' : 'text-[13px] md:text-[14px]'}`}
                  >
                    {isOutOfStock ? 'remove_shopping_cart' : 'add'}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          )}
        </div>
      </div>

      <div
        className={`${compact ? 'pt-1.5 pb-1 px-1.5' : 'pt-2.5 pb-2 px-3.5 md:px-4'} flex flex-col flex-1 transition-opacity duration-500 ${hideDetails ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
      >
        <div className={`flex items-center gap-1.5 ${compact ? 'mb-0.5' : 'mb-1.5 md:mb-2'}`}>
          <span
            className={`text-black/60 font-label uppercase ${compact ? 'text-[7px] tracking-[0.1em]' : 'text-[8px] md:text-[9px] tracking-[0.15em] md:tracking-[0.2em]'} font-bold truncate flex-1 min-w-0`}
          >
            {category}
          </span>

          <div className="w-0.5 h-0.5 rounded-full bg-black/10" />
          <div className="flex items-center gap-0.5">
            <span
              className={`material-symbols-outlined ${compact ? 'text-[8px] md:text-[9px]' : 'text-[9px] md:text-[10px]'} text-primary`}
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              star
            </span>
            <span
              className={`font-label ${compact ? 'text-[8px] md:text-[9px]' : 'text-[9px] md:text-[10px]'} text-black/60 font-bold`}
            >
              {rating}
            </span>
          </div>
        </div>

        <Link
          to={getProductRoute(itemType, productId)}
          className={`group/link block ${compact ? 'mb-0.5' : 'mb-1 md:mb-1.5'}`}
        >
          <h3
            className={`text-black group-hover/link:text-primary transition-colors leading-tight font-medium line-clamp-1 ${
              compact
                ? 'font-body text-[12px] md:text-[13px]'
                : 'font-display text-[13px] md:text-[15px]'
            }`}
            style={compact ? { fontFamily: 'var(--font-body)' } : undefined}
          >
            {title}
          </h3>
        </Link>

        <div className="mt-auto flex flex-col justify-end">
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span
              className={`font-display font-bold text-black leading-none ${compact ? 'text-[13px] md:text-[14px]' : 'text-[14px] md:text-[17px]'}`}
            >
              ₹
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
                  className={`font-label text-black/40 ml-0.5 normal-case font-bold ${compact ? 'text-[8px] md:text-[9px]' : 'text-[9px] md:text-[10px]'}`}
                >
                  / day
                </span>
              )}
            </span>
            {itemType !== 'event' && !isRental && numericOldPrice > numericPrice && canPurchase && (
              <span
                className={`font-display text-black/40 line-through ${compact ? 'text-[9px] md:text-[10px]' : 'text-[10px] md:text-[11px]'}`}
              >
                ₹{formatPrice(numericOldPrice)}
              </span>
            )}
          </div>
          {itemType !== 'event' && isRental && (
            <span
              className={`text-black/50 font-bold uppercase tracking-widest mt-0.5 ${compact ? 'text-[8px]' : 'text-[9px] md:text-[10px]'}`}
            >
              Rental Price (Deposit: ₹{formatPrice(resolvedDeposit)})
            </span>
          )}
          {itemType !== 'event' && !isRental && canRent && !canPurchase && (
            <span
              className={`text-black/50 font-bold uppercase tracking-widest mt-0.5 ${compact ? 'text-[8px]' : 'text-[9px] md:text-[10px]'}`}
            >
              Rental Price
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
});
