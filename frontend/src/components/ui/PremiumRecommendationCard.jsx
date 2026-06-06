import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useCartDispatch } from '../../context/CartContext';
import { useWishlistState, useWishlistDispatch } from '../../context/WishlistContext';
import { CloudinaryImage } from './CloudinaryImage';

export const PremiumRecommendationCard = React.memo(function PremiumRecommendationCard({
  item,
  loading = false,
  eager = false,
  onQuickView,
}) {
  const navigate = useNavigate();
  const { runProtectedAction } = useAuth();
  const { addItem } = useCartDispatch();
  const { isWishlisted } = useWishlistState();
  const { toggleItem } = useWishlistDispatch();
  const [isHovered, setIsHovered] = useState(false);
  const [added, setAdded] = useState(false);

  if (loading) {
    return (
      <div className="flex flex-col gap-5 animate-pulse w-full">
        <div className="aspect-[3/4] w-full bg-surface-container-high rounded-2xl overflow-hidden" />
        <div className="space-y-4 px-2">
          <div className="h-3 w-1/4 bg-surface-container rounded-full" />
          <div className="h-5 w-3/4 bg-surface-container rounded-lg" />
          <div className="h-5 w-1/3 bg-surface-container rounded-lg" />
        </div>
      </div>
    );
  }

  const id = item._id || item.id;
  const image = item.imageSrc || item.image;
  const title = item.title || 'Untitled Masterpiece';
  const category = item.category;
  const price = item.price || item.basePrice;
  const oldPrice = item.oldPrice;
  const score = item.score;
  const source = item.source;
  const targetType = item.targetType || 'product';

  const link =
    targetType === 'event'
      ? `/events/${item.slug || id}`
      : targetType === 'gallery'
        ? `/gallery/${id}`
        : `/product/${item.slug || id}`;

  const wishlisted = isWishlisted(id);

  const formatPrice = (val) => {
    if (val == null) return '0';
    const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^\d.-]/g, ''));
    return isNaN(num) ? '0' : num.toLocaleString('en-IN');
  };

  const numericPrice =
    typeof price === 'number' ? price : parseFloat(String(price).replace(/[^\d.-]/g, ''));
  const numericOldPrice =
    typeof oldPrice === 'number' ? oldPrice : parseFloat(String(oldPrice).replace(/[^\d.-]/g, ''));
  const discount =
    numericOldPrice > numericPrice
      ? Math.round(((numericOldPrice - numericPrice) / numericOldPrice) * 100)
      : null;

  const handleCardClick = (e) => {
    if (e.target.closest('button')) return;
    navigate(link);
  };

  const handleWishlist = (e) => {
    e.preventDefault();
    e.stopPropagation();
    runProtectedAction(() => {
      toggleItem({ id, title, price, imageSrc: image });
    });
  };

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (targetType === 'product') {
      runProtectedAction(() => {
        addItem({ id, title, price, imageSrc: image, quantity: 1, variant: 'Default' });
        setAdded(true);
        setTimeout(() => setAdded(false), 2000);
      });
    } else {
      navigate(link);
    }
  };

  return (
    <motion.div
      className="group relative flex flex-col cursor-pointer w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4 rounded-2xl z-10"
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={handleCardClick}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ type: 'spring', stiffness: 70, damping: 15 }}
    >
      {/* Visual Canvas */}
      <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-[#FAF9F6] border border-black/5 shadow-sm transition-all duration-700 ease-out group-hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)]">
        <Link to={link} className="block w-full h-full">
          {image ? (
            <CloudinaryImage
              src={image}
              alt={title}
              className="w-full h-full object-cover transition-transform duration-[2s] cubic-bezier(0.2, 1, 0.2, 1) group-hover:scale-110"
              containerClassName="w-full h-full"
              loading={eager ? 'eager' : 'lazy'}
              fetchPriority={eager ? 'high' : 'auto'}
              width={400}
              height={533}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-surface-container-high/50 text-on-surface-variant/30">
              <span className="material-symbols-outlined text-4xl">style</span>
            </div>
          )}
        </Link>

        {/* Dynamic Overlays & Gradients */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex justify-between items-start z-10 pointer-events-none">
          <div className="flex flex-col gap-2">
            {discount > 0 && (
              <div className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-white text-stone-900 flex flex-col items-center justify-center shadow-md transform -rotate-12 border border-black/10 ring-1 ring-black/5">
                <span className="text-[11px] md:text-[12px] font-extrabold leading-none">
                  {discount}%
                </span>
                <span className="text-[7px] md:text-[8px] tracking-widest uppercase mt-0.5 font-bold text-stone-500">
                  Off
                </span>
              </div>
            )}
          </div>

          <button
            onClick={handleWishlist}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 pointer-events-auto backdrop-blur-md border ${
              wishlisted
                ? 'bg-white/95 shadow-md border-transparent scale-105'
                : 'bg-black/10 hover:bg-white/90 border-white/20 hover:border-transparent text-white hover:text-black hover:shadow-md'
            }`}
          >
            <motion.span
              animate={{
                scale: wishlisted ? [1, 1.4, 1] : 1,
                color: wishlisted ? '#ff2d55' : 'currentColor',
                fontVariationSettings: wishlisted ? "'FILL' 1" : "'FILL' 0",
              }}
              transition={{ duration: 0.3, type: 'spring', stiffness: 300 }}
              className="material-symbols-outlined text-[18px]"
            >
              favorite
            </motion.span>
          </button>
        </div>

        {/* Hover Actions (Desktop) */}
        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="absolute bottom-4 left-4 right-4 z-20 flex gap-2 hidden md:flex"
            >
              <button
                onClick={handleAddToCart}
                className={`flex-1 py-3.5 rounded-xl font-label text-[10px] uppercase tracking-[0.2em] font-bold shadow-xl transition-all flex items-center justify-center gap-2 backdrop-blur-lg border ${
                  added
                    ? 'bg-[#D0C5AF] text-[#1a1c1a] border-[#D0C5AF]'
                    : 'bg-white/95 text-black hover:bg-[#1a1c1a] hover:text-white border-white/20'
                }`}
              >
                {added ? (
                  <>
                    <span className="material-symbols-outlined text-[16px]">check</span> Added
                  </>
                ) : targetType === 'event' ? (
                  'View Event'
                ) : targetType === 'gallery' ? (
                  'View Inspiration'
                ) : (
                  'Add to Bag'
                )}
              </button>

              {onQuickView && targetType === 'product' && (
                <button
                  onClick={(e) => onQuickView(e, item)}
                  className="w-12 h-12 flex items-center justify-center shrink-0 rounded-xl bg-white/20 backdrop-blur-xl text-white border border-white/30 hover:bg-white/30 transition-all"
                  aria-label="Quick View"
                >
                  <span className="material-symbols-outlined text-[18px]">visibility</span>
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile Quick Add */}
        <div className="md:hidden absolute bottom-3 right-3 z-20">
          <button
            onClick={handleAddToCart}
            className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all border ${
              added
                ? 'bg-[#D0C5AF] text-[#1a1c1a] border-[#D0C5AF]'
                : 'bg-white/95 text-black border-white/20'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">
              {added
                ? 'check'
                : targetType === 'event' || targetType === 'gallery'
                  ? 'arrow_forward'
                  : 'add'}
            </span>
          </button>
        </div>
      </div>

      {/* Info Section */}
      <div className="pt-5 pb-2 px-1 flex flex-col flex-1">
        {category && (
          <p className="font-label text-[9px] md:text-[10px] text-on-surface-variant/60 uppercase tracking-[0.25em] font-bold mb-2">
            {category}
          </p>
        )}

        <Link to={link} className="group/link block">
          <h3 className="font-display text-[16px] md:text-[20px] text-on-surface group-hover/link:text-primary transition-colors leading-tight font-medium line-clamp-2">
            {title}
          </h3>
        </Link>

        {score > 0 && (
          <div
            className="flex items-center gap-1.5 mt-2 transition-opacity duration-300"
            aria-label={`Match score: ${Math.round(score * 100)}%`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-primary/40" aria-hidden="true" />
            <span className="text-[10px] text-on-surface-variant italic font-serif opacity-0 group-hover:opacity-100 transition-opacity">
              {Math.round(score * 100)}% match
            </span>
          </div>
        )}

        {targetType !== 'gallery' && (
          <div className="mt-auto pt-3 flex items-baseline gap-2.5">
            <span className="font-display text-[18px] md:text-[24px] text-[#1A1C1A] leading-none">
              ₹{formatPrice(price)}
            </span>
            {oldPrice && (
              <span className="font-body text-[12px] md:text-[13px] text-on-surface-variant/50 line-through">
                ₹{formatPrice(oldPrice)}
              </span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
});

export default PremiumRecommendationCard;
