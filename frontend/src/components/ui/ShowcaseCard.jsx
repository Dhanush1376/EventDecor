import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { handleImageError } from '../../utils/imageUtils';
import { CloudinaryImage } from './CloudinaryImage';
import { useWishlistState, useWishlistDispatch } from '../../context/WishlistContext';
import { useAuth } from '../../context/AuthContext';
export function ShowcaseCard({
  id,
  _id,
  title,
  subtitle,
  description,
  rentalPrice = 15000,
  setupTimeHours = 2,
  image,
  category = 'Traditional',
  inclusions = [],
  rating = 4.9,
  onOpenShowcase,
}) {
  const { isWishlisted } = useWishlistState();
  const { toggleItem } = useWishlistDispatch();
  const { runProtectedAction } = useAuth();

  const [hovered, setHovered] = useState(false);

  const showcaseId = id || _id;
  const wishlisted = isWishlisted(showcaseId);

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

  const formattedCat = String(category).replace(/_/g, ' ');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      onClick={() => onOpenShowcase?.()}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="group relative flex flex-col transition-all duration-700 cursor-pointer"
    >
      {/* 1. VISUAL CANVAS */}
      <div className="relative h-44 sm:h-56 md:h-72 w-full overflow-hidden bg-[#fafafa] rounded-2xl md:rounded-[32px] border border-black/5 shadow-2xs">
        <CloudinaryImage
          src={image || ''}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-[1.5s] ease-[cubic-bezier(0.2,1,0.2,1)] group-hover:scale-110"
          containerClassName="w-full h-full"
          loading="lazy"
          width={400}
          height={300}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />

        {/* Floating Utility Actions */}
        <div className="absolute top-2 right-2 md:top-4 md:right-4 z-20 flex flex-col gap-2">
          <button
            onClick={handleWishlist}
            className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 min-h-0 min-w-0 p-0 aspect-square bg-white/90 backdrop-blur-xl rounded-full flex items-center justify-center shadow-sm border border-black/5 transition-all duration-300 hover:scale-110 cursor-pointer active:scale-[0.96]"
            aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            <motion.span
              animate={{
                scale: wishlisted ? [1, 1.4, 1] : 1,
                color: wishlisted ? '#ff2d55' : '#1a1817',
                fontVariationSettings: wishlisted ? "'FILL' 1, 'wght' 300" : "'FILL' 0, 'wght' 300",
              }}
              transition={{ duration: 0.3, type: 'spring', stiffness: 300 }}
              className="material-symbols-outlined text-[14px] md:text-[18px]"
            >
              favorite
            </motion.span>
          </button>
        </div>

        {/* Overlapping Circle Badges */}
        <div className="absolute top-2 left-2 md:top-4 md:left-4 flex flex-row items-center -space-x-2 md:-space-x-3 z-10">
          <div className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 bg-primary text-white rounded-full flex flex-col items-center justify-center font-label text-[7px] sm:text-[8px] md:text-[10px] uppercase font-bold shadow-lg border-2 border-white z-20 hover:z-30 hover:scale-110 transition-all duration-300 select-none">
            <span className="leading-none">{setupTimeHours}h</span>
            <span className="text-[5px] sm:text-[6px] md:text-[7px] tracking-tighter opacity-80 uppercase mt-0.5">
              Setup
            </span>
          </div>

          {inclusions && inclusions.length > 0 && (
            <div className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 bg-white/95 backdrop-blur-md text-stone-800 rounded-full flex flex-col items-center justify-center font-label uppercase font-bold shadow-md border-2 border-white z-10 hover:z-30 hover:scale-110 transition-all duration-300 select-none">
              <span className="leading-none text-[7px] sm:text-[8px] md:text-[10px]">
                {inclusions.length}
              </span>
              <span className="text-[4.5px] sm:text-[5px] md:text-[6px] tracking-tighter opacity-80 uppercase mt-0.5">
                Props
              </span>
            </div>
          )}
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
      <div className="py-2.5 sm:py-3 md:py-4 flex flex-col flex-1">
        <div className="flex items-center gap-1 mb-1 sm:mb-1.5 md:mb-2">
          <span className="text-black/60 font-label text-[7.5px] sm:text-[8px] md:text-[9px] uppercase tracking-[0.1em] sm:tracking-[0.15em] md:tracking-[0.2em] font-bold truncate flex-1 min-w-0">
            {formattedCat}
          </span>

          <div className="w-0.5 h-0.5 rounded-full bg-black/10" />
          <div className="flex items-center gap-0.5 shrink-0">
            <span
              className="material-symbols-outlined text-[8.5px] sm:text-[9px] md:text-[10px] text-primary"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              star
            </span>
            <span className="font-label text-[8.5px] sm:text-[9px] md:text-[10px] text-black/60 font-bold">
              {rating}
            </span>
          </div>
        </div>

        <div className="mb-1.5 sm:mb-2 md:mb-3 group/link">
          {subtitle && (
            <span className="block font-label text-[8px] sm:text-[9px] md:text-[11px] text-black/60 mb-0.5 tracking-wide truncate leading-snug">
              {subtitle}
            </span>
          )}
          <h3 className="font-display text-[13px] sm:text-[15px] md:text-[20px] text-black group-hover:text-primary transition-colors leading-tight font-medium line-clamp-1 sm:line-clamp-2 md:line-clamp-1">
            {title}
          </h3>
        </div>

        <div className="mt-auto flex items-baseline gap-1 sm:gap-2">
          <span className="font-display text-[14px] sm:text-[16px] md:text-[22px] text-black font-medium leading-none">
            ₹{formatPrice(rentalPrice)}
          </span>
          <span className="font-label text-[8px] sm:text-[9px] md:text-[10px] text-black/40">
            / day
          </span>
        </div>
      </div>
    </motion.div>
  );
}
