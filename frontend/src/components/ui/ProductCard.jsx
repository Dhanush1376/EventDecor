import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useWishlistState, useWishlistDispatch } from '../../context/WishlistContext';
import { useCartDispatch } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { CloudinaryImage } from './CloudinaryImage';
import { prefetchManager } from '../../utils/prefetchManager';

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
  sizes = '(max-width: 768px) 100vw, (max-width: 1280px) 33vw, 25vw',
  rentalEnabled = false,
  availabilityMode,
  rentalPricing,
  compact = false,
  isNonRefundable = false,
  itemType = 'product', // 'product' or 'event'
}) {
  const navigate = useNavigate();
  const { isWishlisted } = useWishlistState();
  const { toggleItem } = useWishlistDispatch();
  const { attemptAddToCart } = useCartDispatch();
  const { runProtectedAction } = useAuth();
  const [added, setAdded] = useState(false);

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

  const parseNumericPrice = (val) => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const clean = String(val)
      .replace(/[₹\s,]/g, '')
      .replace(/[Rr][Ss].?/g, '');
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  };

  const formatPrice = (val) => {
    if (val === undefined || val === null) return '0';
    if (typeof val === 'number') {
      return val.toLocaleString('en-IN');
    }
    const str = String(val).trim();
    const cleanStr = str.replace(/[₹\s,]/g, '').replace(/[Rr][Ss].?/g, '');
    const num = parseFloat(cleanStr);
    return isNaN(num) ? str : num.toLocaleString('en-IN');
  };

  const numericPrice = parseNumericPrice(price);
  const numericOldPrice = parseNumericPrice(oldPrice);

  const discount =
    numericOldPrice > 0
      ? Math.round(((numericOldPrice - numericPrice) / numericOldPrice) * 100)
      : null;

  const canRent =
    rentalEnabled && (availabilityMode === 'rent_only' || availabilityMode === 'both');
  const canPurchase = !availabilityMode || availabilityMode !== 'rent_only';

  const handleCardClick = (e) => {
    // If the user clicked a button or any interactive element inside a button, don't trigger the card link
    if (e.target.closest('button')) return;
    navigate(itemType === 'event' ? `/events/${productId}` : `/product/${productId}`);
  };

  const handleWishlist = (e) => {
    e.preventDefault();
    e.stopPropagation();
    runProtectedAction(() => {
      toggleItem({ id: productId, title, price, imageSrc });
    });
  };

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    runProtectedAction(() => {
      attemptAddToCart({
        id: productId,
        title,
        price,
        imageSrc,
        quantity: 1,
        variant: 'Default',
        type: 'purchase',
        isNonRefundable,
      });
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      navigate(itemType === 'event' ? `/events/${productId}` : `/product/${productId}`);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ type: 'spring', stiffness: 70, damping: 15 }}
      onMouseEnter={() => {
        const route = itemType === 'event' ? `/events/${productId}` : `/product/${productId}`;
        prefetchManager.prefetchRoute(route, { kind: 'hover', productId });
      }}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="link"
      aria-label={`View details of ${title}`}
      className="group relative flex flex-col cursor-pointer focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4 focus-visible:ring-offset-surface rounded-2xl"
    >
      {/* 1. VISUAL CANVAS */}
      <div className="relative aspect-[4/5] overflow-hidden bg-[#fafafa] rounded-2xl border border-black/5">
        <Link
          to={itemType === 'event' ? `/events/${productId}` : `/product/${productId}`}
          className="block h-full"
        >
          <CloudinaryImage
            src={imageSrc}
            alt={title}
            className="transition-all duration-[1.5s] cubic-bezier(0.2, 1, 0.2, 1) group-hover:scale-110"
            loading={eager ? 'eager' : 'lazy'}
            fetchPriority={eager ? 'high' : 'auto'}
            width={400}
            height={500}
            sizes={sizes}
          />
        </Link>

        {/* Floating Utility Actions */}
        <div className="absolute top-3 right-3 md:top-4 md:right-4 z-20 flex flex-col gap-2">
          <button
            onClick={handleWishlist}
            className={`${compact ? 'w-8 h-8 md:w-9 md:h-9' : 'w-9 h-9 md:w-10 md:h-10'} min-h-0 shrink-0 aspect-square p-0 bg-white/90 backdrop-blur-xl rounded-full flex items-center justify-center shadow-sm border border-black/5 transition-all duration-300 hover:scale-110 cursor-pointer active:scale-[0.96]`}
            aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            <motion.span
              animate={{
                scale: wishlisted ? [1, 1.4, 1] : 1,
                color: wishlisted ? '#ff2d55' : '#1a1817',
                fontVariationSettings: wishlisted ? "'FILL' 1, 'wght' 300" : "'FILL' 0, 'wght' 300",
              }}
              whileTap={{ scale: 0.8 }}
              transition={{ duration: 0.3, type: 'spring', stiffness: 300 }}
              className={`material-symbols-outlined ${compact ? 'text-[10px] md:text-[12px]' : 'text-[12px] md:text-[14px]'}`}
            >
              favorite
            </motion.span>
          </button>
        </div>

        {/* Badges */}
        <div className="absolute top-3 left-3 md:top-4 md:left-4 flex flex-row items-center -space-x-2 md:-space-x-3 z-10">
          {canRent && (
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
            const words = String(badge).trim().split(/\s+/);
            const displayContent =
              words.length > 1 ? (
                <>
                  <span className="leading-none text-[6px] md:text-[8px]">{words[0]}</span>
                  <span className="text-[5px] md:text-[6px] tracking-tight opacity-80 uppercase mt-0.5">
                    {words.slice(1).join(' ')}
                  </span>
                </>
              ) : (
                <span className="leading-none text-[6px] md:text-[8px] truncate max-w-full px-1">
                  {badge}
                </span>
              );

            return (
              <div
                key={badge}
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
        </div>

        {/* Immersive Hover Actions (Desktop Only) */}
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] opacity-0 xl:group-hover:opacity-100 transition-all duration-500 flex flex-col justify-end p-6 pointer-events-none xl:group-hover:pointer-events-auto">
          <div className="space-y-2 transform translate-y-4 xl:group-hover:translate-y-0 transition-transform duration-500">
            <button
              onClick={handleAddToCart}
              className={`w-full py-3 rounded-full font-label text-[10px] uppercase tracking-[0.2em] font-bold shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
                added
                  ? 'bg-[#e0d6b8] text-[#1a1c1a]'
                  : 'bg-white text-black hover:bg-[#e0d6b8] hover:text-[#1a1c1a]'
              }`}
            >
              {added ? (
                <>
                  <span className="material-symbols-outlined text-[14px]">check</span>
                  Added
                </>
              ) : (
                'Add to Bag'
              )}
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
          </div>
        </div>

        {/* Mobile & Tablet Quick Add Button */}
        <div className="xl:hidden absolute bottom-3 right-3 z-20">
          <button
            onClick={handleAddToCart}
            className={`${compact ? 'w-8 h-8 md:w-9 md:h-9' : 'w-9 h-9 md:w-10 md:h-10'} min-h-0 shrink-0 aspect-square p-0 rounded-full flex items-center justify-center shadow-lg transition-all cursor-pointer ${
              added
                ? 'bg-[#e0d6b8] text-[#1a1c1a]'
                : 'bg-black text-white hover:bg-[#e0d6b8] hover:text-[#1a1c1a]'
            }`}
            aria-label="Add to bag"
          >
            <span
              className={`material-symbols-outlined ${compact ? 'text-[13px]' : 'text-[16px]'}`}
            >
              {added ? 'check' : 'add'}
            </span>
          </button>
        </div>
      </div>

      {/* 2. REFINED INFO SECTION */}
      <div
        className={`py-3 md:py-4 px-3.5 md:px-4 flex flex-col flex-1 transition-opacity duration-500 ${hideDetails ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
      >
        <div className="flex items-center gap-1.5 mb-1.5 md:mb-2">
          <span className="text-black/60 font-label text-[8px] md:text-[9px] uppercase tracking-[0.15em] md:tracking-[0.2em] font-bold truncate flex-1 min-w-0">
            {category}
          </span>

          <div className="w-0.5 h-0.5 rounded-full bg-black/10" />
          <div className="flex items-center gap-0.5">
            <span
              className="material-symbols-outlined text-[9px] md:text-[10px] text-primary"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              star
            </span>
            <span className="font-label text-[9px] md:text-[10px] text-black/60 font-bold">
              {rating}
            </span>
          </div>
        </div>

        <Link to={`/product/${productId}`} className="mb-2 md:mb-3 group/link block">
          {(teluguTitle || nameTE || teluguName) && (
            <div className="flex items-center gap-2 mb-1.5">
              <span className="block font-display text-[13px] md:text-[15px] text-black/85 font-medium tracking-wide truncate leading-none">
                {teluguTitle || nameTE || teluguName}
              </span>
              <span className="w-6 sm:w-8 h-[1px] bg-black/15 shrink-0"></span>
              <span
                className="material-symbols-outlined text-[10px] md:text-[12px] text-primary/80 shrink-0"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                favorite
              </span>
            </div>
          )}
          <h3 className="font-display text-[14px] md:text-[19px] text-black group-hover/link:text-primary transition-colors leading-tight font-medium line-clamp-1">
            {title}
          </h3>
        </Link>

        <div className="mt-auto flex flex-col justify-end">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-[16px] md:text-[22px] text-black leading-none">
              ₹
              {formatPrice(
                canPurchase
                  ? price
                  : rentalPricing?.daily ||
                      rentalPricing?.weekly ||
                      rentalPricing?.monthly ||
                      price,
              )}
            </span>
            {oldPrice && canPurchase && (
              <span className="font-label text-[9px] md:text-[10px] text-black/60 line-through">
                ₹{formatPrice(oldPrice)}
              </span>
            )}
          </div>
          {canRent && !canPurchase && (
            <span className="text-[9px] md:text-[10px] text-black/50 font-bold uppercase tracking-widest mt-1">
              Rental Price
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
});
