import { ArrowRight } from 'lucide-react';
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
  originalPrice,
  discountPercentage,
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

  const availableImages = React.useMemo(() => {
    const imgs = [];
    if (image) imgs.push(image);
    if (images && images.length > 0) {
      images.forEach((img) => {
        if (!imgs.includes(img)) imgs.push(img);
      });
    }
    return imgs;
  }, [image, images]);

  const displayOriginalPrice = originalPrice || Math.round(rentalPrice * 1.25);
  const displayDiscount =
    discountPercentage ||
    Math.round(((displayOriginalPrice - rentalPrice) / displayOriginalPrice) * 100);

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
      className="group relative flex flex-col transition-all duration-700 cursor-pointer z-10 rounded-2xl lg:rounded-3xl bg-surface border border-black/5 shadow-sm hover:shadow-md overflow-hidden"
      aria-label={
        reviews > 0
          ? `Rated ${Number(rating).toFixed(1)} out of 5 stars from ${reviews} reviews`
          : 'New Event Package, no reviews yet'
      }
    >
      {/* 1. VISUAL CANVAS */}
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#fafafa] group/canvas shrink-0 border-b border-black/5">
        {displayDiscount > 0 && (
          <div className="absolute top-2.5 left-2.5 lg:top-4 lg:left-4 z-20 pointer-events-none">
            <div className="w-9 h-9 sm:w-10 sm:h-10 lg:w-10 lg:h-10 bg-[#3e2723]/85 backdrop-blur-md text-[#fdfbf7] border border-[#e0d6b8]/70 rounded-full flex flex-col items-center justify-center shadow-md">
              <span className="font-display font-bold text-[10px] sm:text-[11px] lg:text-[11px] leading-none">
                {displayDiscount}%
              </span>
              <span className="font-label text-[5px] sm:text-[5.5px] lg:text-[6px] tracking-widest uppercase mt-0.5 text-[#e0d6b8]">
                OFF
              </span>
            </div>
          </div>
        )}
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
                width={1200}
                sizes="(max-width: 640px) 100vw, 50vw"
                quality="auto:best"
              />
            </div>
          ))}
        </div>

        {availableImages.length > 1 && (
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
        )}

        {/* Floating Utility Actions */}
        <div className="absolute top-2.5 right-2.5 lg:top-4 lg:right-4 z-20 flex flex-col gap-2">
          <button
            onClick={handleWishlist}
            className="w-9 h-9 sm:w-10 sm:h-10 lg:w-10 lg:h-10 min-h-0 min-w-0 p-0 aspect-square bg-white/90 backdrop-blur-xl rounded-full flex items-center justify-center shadow-sm border border-black/5 transition-all duration-300 hover:scale-110 cursor-pointer active:scale-[0.96]"
            aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            <motion.span
              animate={{
                scale: wishlisted ? [1, 1.4, 1] : 1,
                color: wishlisted ? '#ff2d55' : '#1a1817',
                fontVariationSettings: wishlisted ? "'FILL' 1, 'wght' 300" : "'FILL' 0, 'wght' 300",
              }}
              transition={{ duration: 0.3, type: 'spring', stiffness: 300 }}
              className="material-symbols-outlined text-[16px] lg:text-[18px]"
            >
              favorite
            </motion.span>
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
      <div className="p-3 sm:p-4 lg:p-4 flex flex-col flex-1">
        <div className="flex items-center justify-between gap-2 mb-1.5 sm:mb-2">
          <span className="text-primary font-label-sm text-[8px] lg:text-[10px] uppercase tracking-widest font-bold truncate">
            {formattedCat} • {setupTimeHours}H SETUP
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

        <div className="mb-1.5 sm:mb-2 group/link">
          <h3 className="font-display text-[15px] sm:text-[16px] lg:text-[20px] text-black group-hover:text-primary transition-colors leading-tight font-medium line-clamp-1">
            {title}
          </h3>
        </div>

        <div className="mt-auto flex items-end justify-between">
          <div className="flex flex-col gap-0.5">
            {displayOriginalPrice > rentalPrice && (
              <span className="font-label text-[9.5px] lg:text-[11px] text-black/40 line-through decoration-black/30">
                ₹{formatPrice(displayOriginalPrice)}
              </span>
            )}
            <div className="flex items-baseline gap-1 sm:gap-1.5">
              <span className="font-display text-[15px] sm:text-[18px] lg:text-[22px] text-black font-medium leading-none">
                ₹{formatPrice(rentalPrice)}
              </span>
              <span className="font-label text-[9px] lg:text-[10px] text-black/40">/ day</span>
            </div>
          </div>

          <div className="flex items-center gap-1 font-label-sm text-[9px] lg:text-[11px] uppercase tracking-widest font-bold text-black/60 group-hover:text-primary transition-colors mb-1">
            <span>Details</span>
            <ArrowRight className="text-[12px] lg:text-[14px]" strokeWidth={1.5} />
          </div>
        </div>
      </div>
    </motion.div>
  );
});
