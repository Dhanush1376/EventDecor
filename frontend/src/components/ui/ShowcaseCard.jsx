import { m as motion } from 'framer-motion';
import { CloudinaryImage } from './CloudinaryImage';
import React, { useState, useRef } from 'react';
import { useWishlistState, useWishlistDispatch } from '../../context/WishlistContext';
import { useAuth } from '../../context/AuthContext';
import { DynamicRatingBadge } from './DynamicRatingBadge';
import { useLongPress } from '../../hooks/useLongPress';
import { useNavigate } from 'react-router-dom';
import { getProductRoute } from '../../utils/ecommerce/productRouteUtils';
export const ShowcaseCard = React.memo(function ShowcaseCard({
  id,
  _id,
  title,
  subtitle,
  _description,
  rentalPrice = 15000,
  setupTimeHours = 2,
  image,
  images = [],
  category = 'Traditional',
  inclusions = [],
  rating = 0,
  reviews = 0,
  onOpenShowcase,
}) {
  const { isWishlisted } = useWishlistState();
  const { toggleItem } = useWishlistDispatch();
  const { runProtectedAction } = useAuth();
  const navigate = useNavigate();

  const [_hovered, setHovered] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollContainerRef = useRef(null);

  const showcaseId = id || _id;
  const wishlisted = isWishlisted(showcaseId);

  const availableImages = images && images.length > 0 ? images : [image].filter(Boolean);

  const formatPrice = (val) => {
    if (!val) return '15,000';
    return Number(val).toLocaleString('en-IN');
  };

  const handleWishlist = (e) => {
    e.preventDefault();
    e.stopPropagation();
    runProtectedAction(() => {
      toggleItem({
        id: showcaseId,
        title,
        price: rentalPrice,
        imageSrc: image,
      });
    });
  };

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

  const formattedCat = String(category).replace(/_/g, ' ');

  const { longPressTriggered, handlers: longPressHandlers } = useLongPress(
    (e) => {
      if (onOpenShowcase) {
        if (navigator.vibrate) navigator.vibrate(50);
        onOpenShowcase(e);
      }
    },
    { delay: 1000 },
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      onClick={(e) => {
        if (longPressTriggered) return;
        if (e.target.closest('button')) return;
        navigate(getProductRoute('event', showcaseId));
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      {...longPressHandlers}
      className="group relative flex flex-col transition-all duration-700 cursor-pointer z-10 rounded-2xl lg:rounded-[32px]"
      aria-label={
        reviews > 0
          ? `Rated ${Number(rating).toFixed(1)} out of 5 stars from ${reviews} reviews`
          : 'New Event Package, no reviews yet'
      }
    >
      {/* 1. VISUAL CANVAS */}
      <div className="relative h-44 sm:h-56 lg:h-72 w-full overflow-hidden bg-[#fafafa] rounded-2xl lg:rounded-[32px] border border-black/5 shadow-2xs group/canvas">
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex w-full h-full overflow-x-auto snap-x snap-mandatory no-scrollbar scroll-smooth"
        >
          {availableImages.map((img, idx) => (
            <div key={idx} className="w-full h-full flex-shrink-0 snap-center relative">
              <CloudinaryImage
                src={img || ''}
                alt={`${title} - view ${idx + 1}`}
                className="w-full h-full object-cover transition-transform duration-[1.5s] ease-[cubic-bezier(0.2,1,0.2,1)] group-hover/canvas:scale-110"
                containerClassName="w-full h-full"
                loading={idx === 0 ? 'eager' : 'lazy'}
                width={400}
                height={300}
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              />
            </div>
          ))}
        </div>

        {availableImages.length > 1 && (
          <div className="absolute bottom-3 left-3 lg:bottom-4 lg:left-4 flex items-center gap-1.5 z-10 pointer-events-none">
            {availableImages.map((_, i) => (
              <div
                key={i}
                className={`transition-all duration-300 rounded-full shadow-md border border-black/10 ${
                  i === activeIndex
                    ? 'w-2 h-2 lg:w-2.5 lg:h-2.5 bg-white'
                    : 'w-1.5 h-1.5 lg:w-2 lg:h-2 bg-white/60'
                }`}
              />
            ))}
          </div>
        )}

        {/* Floating Utility Actions */}
        <div className="absolute top-2 right-2 lg:top-4 lg:right-4 z-20 flex flex-col gap-2">
          <button
            onClick={handleWishlist}
            className="w-7 h-7 sm:w-8 sm:h-8 lg:w-10 lg:h-10 min-h-0 min-w-0 p-0 aspect-square bg-white/90 backdrop-blur-xl rounded-full flex items-center justify-center shadow-sm border border-black/5 transition-all duration-300 hover:scale-110 cursor-pointer active:scale-[0.96]"
            aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            <motion.span
              animate={{
                scale: wishlisted ? [1, 1.4, 1] : 1,
                color: wishlisted ? '#ff2d55' : '#1a1817',
                fontVariationSettings: wishlisted ? "'FILL' 1, 'wght' 300" : "'FILL' 0, 'wght' 300",
              }}
              transition={{ duration: 0.3, type: 'spring', stiffness: 300 }}
              className="material-symbols-outlined text-[14px] lg:text-[18px]"
            >
              favorite
            </motion.span>
          </button>
        </div>

        {/* Overlapping Circle Badges */}
        <div className="absolute top-2 left-2 lg:top-4 lg:left-4 flex flex-row items-center -space-x-2 lg:-space-x-3 z-10">
          <div className="w-7 h-7 sm:w-8 sm:h-8 lg:w-10 lg:h-10 bg-primary text-white rounded-full flex flex-col items-center justify-center font-label text-[7px] sm:text-[8px] lg:text-[10px] uppercase font-bold shadow-lg border-2 border-white z-20 hover:z-30 hover:scale-110 transition-all duration-300 select-none">
            <span className="leading-none">{setupTimeHours}h</span>
            <span className="text-[5px] sm:text-[6px] lg:text-[7px] tracking-tighter opacity-80 uppercase mt-0.5">
              Setup
            </span>
          </div>

          {inclusions && inclusions.length > 0 && (
            <div className="w-7 h-7 sm:w-8 sm:h-8 lg:w-10 lg:h-10 bg-white/95 backdrop-blur-md text-stone-800 rounded-full flex flex-col items-center justify-center font-label uppercase font-bold shadow-md border-2 border-white z-10 hover:z-30 hover:scale-110 transition-all duration-300 select-none">
              <span className="leading-none text-[7px] sm:text-[8px] lg:text-[10px]">
                {inclusions.length}
              </span>
              <span className="text-[4.5px] sm:text-[5px] lg:text-[6px] tracking-tighter opacity-80 uppercase mt-0.5">
                Props
              </span>
            </div>
          )}
        </div>

        {/* Quick Book Button (Floating bottom-right) */}
        <div className="absolute bottom-3 right-3 z-20">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenShowcase?.();
            }}
            className="w-8 h-8 lg:w-9 lg:h-9 min-h-0 shrink-0 aspect-square p-0 rounded-full flex items-center justify-center shadow-lg bg-black text-white hover:bg-stone-800 hover:text-white transition-all duration-500 cursor-pointer"
            aria-label="Reserve setup"
            title="Reserve this setup"
          >
            <span className="material-symbols-outlined text-[13px] lg:text-[15px]">
              event_available
            </span>
          </button>
        </div>

        {/* Immersive Hover Actions overlay (Desktop Only) */}
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] opacity-0 xl:group-hover:opacity-100 transition-all duration-500 flex flex-col justify-end p-6 pointer-events-none xl:group-hover:pointer-events-auto">
          <div className="space-y-2 transform translate-y-4 xl:group-hover:translate-y-0 transition-transform duration-500">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenShowcase?.();
              }}
              className="w-full py-3 bg-[#e0d6b8] hover:bg-white text-[#1a1c1a] rounded-full font-label text-[10px] uppercase tracking-[0.2em] font-bold shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              <span className="material-symbols-outlined text-[14px]">featured_play_list</span>
              Reserve Crate
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenShowcase?.();
              }}
              className="w-full bg-white/10 backdrop-blur-md text-white py-3 rounded-full font-label text-[10px] uppercase tracking-[0.2em] font-bold border border-white/20 hover:bg-white/20 transition-all cursor-pointer"
            >
              Zoom Setup Specs
            </button>
          </div>
        </div>
      </div>

      {/* 2. REFINED INFO SECTION */}
      <div className="py-2.5 sm:py-3 lg:py-4 flex flex-col flex-1">
        <div className="flex items-center justify-between gap-2 mb-2 sm:mb-2.5 lg:mb-3">
          <span className="bg-surface-container-highest/40 border border-black/15 text-black/70 font-label uppercase text-[7.5px] sm:text-[8px] lg:text-[9px] tracking-[0.1em] sm:tracking-[0.15em] lg:tracking-[0.2em] px-2 py-[4px] rounded-md font-bold truncate min-w-0 max-w-max">
            {formattedCat}
          </span>

          <div className="flex items-center gap-0.5 shrink-0">
            <DynamicRatingBadge
              itemId={showcaseId}
              itemType="event"
              initialRating={rating}
              initialReviews={reviews}
            />
          </div>
        </div>

        <div className="mb-1.5 sm:mb-2 lg:mb-3 group/link">
          <h3 className="font-display text-[13px] sm:text-[15px] lg:text-[20px] text-black group-hover:text-primary transition-colors leading-tight font-medium line-clamp-1 sm:line-clamp-2 lg:line-clamp-1">
            {title}
          </h3>
        </div>

        <div className="mt-auto flex items-baseline gap-1 sm:gap-2">
          <span className="font-display text-[14px] sm:text-[16px] lg:text-[22px] text-black font-medium leading-none">
            ₹{formatPrice(rentalPrice)}
          </span>
          <span className="font-label text-[8px] sm:text-[9px] lg:text-[10px] text-black/40">
            / day
          </span>
        </div>
      </div>
    </motion.div>
  );
});
