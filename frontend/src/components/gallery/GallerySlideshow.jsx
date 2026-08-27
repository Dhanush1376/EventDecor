import { X, SearchX, ChevronLeft, ChevronRight, ShoppingBag, ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { m as motion, AnimatePresence } from 'framer-motion';
import { CloudinaryImage } from '../ui/CloudinaryImage';
import { useEffect, useCallback, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useWishlist } from '../../context/WishlistContext';
import { useCart } from '../../context/CartContext';

const slideVariants = {
  enter: (direction) => ({
    x: direction > 0 ? 500 : -500,
  }),
  center: {
    zIndex: 1,
    x: 0,
  },
  exit: (direction) => ({
    zIndex: 0,
    x: direction < 0 ? 500 : -500,
  }),
};

export function GallerySlideshow({
  items,
  currentIndex,
  onClose,
  onPrev,
  onNext,
  onSelect,
  searchQuery = '',
  onSearchChange,
}) {
  const navigate = useNavigate();
  const currentItem = items[currentIndex];
  const currentId = currentItem ? currentItem._id || currentItem.id : null;
  const thumbnailContainerRef = useRef(null);
  const [direction, setDirection] = useState(0);

  const { toggleItem, isWishlisted } = useWishlist();
  const { addItem } = useCart();

  const actionSource = useRef('external');

  // Clamp active index dynamically when items length changes (e.g. during search/filtering)
  useEffect(() => {
    if (items.length > 0 && currentIndex >= items.length) {
      if (onSelect) onSelect(0);
    }
  }, [items.length, currentIndex, onSelect]);

  const handleNext = useCallback(() => {
    actionSource.current = 'external';
    setDirection(1);
    onNext();
  }, [onNext]);

  const handlePrev = useCallback(() => {
    actionSource.current = 'external';
    setDirection(-1);
    onPrev();
  }, [onPrev]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'Escape') onClose();
    },
    [handlePrev, handleNext, onClose],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    document.body.classList.add('slideshow-active');
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'auto';
      document.body.classList.remove('slideshow-active');
    };
  }, [handleKeyDown]);

  const isProgrammaticScroll = useRef(false);
  const scrollTimeoutRef = useRef(null);

  // Scroll active thumbnail into view
  useEffect(() => {
    if (thumbnailContainerRef.current && actionSource.current === 'external') {
      const activeThumbnail = thumbnailContainerRef.current.children[currentIndex];
      if (activeThumbnail) {
        isProgrammaticScroll.current = true;
        activeThumbnail.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center',
        });

        // Reset programmatic scroll flag after animation completes
        clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = setTimeout(() => {
          isProgrammaticScroll.current = false;
        }, 500); // 500ms should be enough for smooth scroll to finish
      }
    }
  }, [currentIndex]);

  if (!currentItem && items.length > 0) return null;

  const displayImage = currentItem ? currentItem.image || currentItem.imageSrc : '';
  const nextItem = items[currentIndex < items.length - 1 ? currentIndex + 1 : 0];
  const prevItem = items[currentIndex > 0 ? currentIndex - 1 : items.length - 1];

  const preloadNext = nextItem && !nextItem.video ? nextItem.image || nextItem.imageSrc : null;
  const preloadPrev = prevItem && !prevItem.video ? prevItem.image || prevItem.imageSrc : null;

  return typeof document !== 'undefined'
    ? createPortal(
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[1000] bg-white flex items-center justify-center cursor-default"
        >
          <div
            className="w-full h-[100dvh] flex flex-col items-center justify-between p-0 cursor-default relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Preload adjacent images */}
            <div className="hidden">
              {preloadNext && (
                <CloudinaryImage
                  src={preloadNext}
                  width={1200}
                  height={1200}
                  sizes="100vw"
                  skipObserver={true}
                />
              )}
              {preloadPrev && (
                <CloudinaryImage
                  src={preloadPrev}
                  width={1200}
                  height={1200}
                  sizes="100vw"
                  skipObserver={true}
                />
              )}
            </div>
            {/* Header Controls */}
            <div className="w-full flex justify-between items-center px-4 pt-2 shrink-0 z-10 gap-4">
              <span className="text-black/40 font-label-sm text-[10px] lg:text-[12px] uppercase tracking-[0.4em] font-bold whitespace-nowrap">
                {items.length > 0 ? `${currentIndex + 1} / ${items.length}` : '0 / 0'}
              </span>

              <button
                onClick={onClose}
                className="w-10 h-10 min-h-0 rounded-full bg-black/5 text-black flex items-center justify-center hover:bg-black/10 transition-colors shrink-0"
              >
                <X className="text-[20px]" strokeWidth={1.5} />
              </button>
            </div>

            {/* Main Image Container */}
            <div className="relative w-full flex-1 flex items-center justify-center overflow-hidden min-h-0">
              {items.length === 0 ? (
                <div className="text-center py-20 px-6 max-w-md">
                  <SearchX className="text-[48px] text-[#826237] mb-4 block" strokeWidth={1.5} />
                  <h3 className="font-headline-sm text-black mb-2 font-normal">
                    No designs found.
                  </h3>
                  <p className="text-black/50 font-body text-[13px] leading-relaxed mb-6 font-light">
                    Try searching for a different keyword or color to find event inspiration.
                  </p>
                  <button
                    onClick={() => onSearchChange?.({ target: { value: '' } })}
                    className="px-6 py-2.5 bg-black text-white rounded-full font-bold text-[10px] uppercase tracking-widest hover:bg-black/80 transition-all shadow-sm active:scale-95"
                  >
                    Clear Search
                  </button>
                </div>
              ) : (
                <AnimatePresence mode="popLayout">
                  <motion.div
                    key={currentId + (currentItem?.type || '')}
                    custom={direction}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{
                      x: { type: 'tween', ease: 'easeInOut', duration: 0.15 },
                    }}
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.2}
                    onDragEnd={(e, { offset, velocity }) => {
                      const swipe = offset.x;
                      const swipeVelocity = velocity.x;
                      if (swipe < -80 || swipeVelocity < -500) {
                        handleNext();
                      } else if (swipe > 80 || swipeVelocity > 500) {
                        handlePrev();
                      }
                    }}
                    className="w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {currentItem?.video ? (
                      <video
                        src={currentItem.video}
                        controls
                        playsInline
                        preload="none"
                        className="w-full h-full object-contain rounded-none shadow-md"
                      />
                    ) : (
                      <CloudinaryImage
                        src={displayImage}
                        alt={currentItem?.title || ''}
                        className="w-full h-full object-contain rounded-none drop-shadow-md"
                        containerClassName="w-full h-full flex items-center justify-center"
                        width={currentItem?.imageWidth || 1200}
                        height={currentItem?.imageHeight || 1200}
                        fetchPriority="high"
                        sizes="100vw"
                      />
                    )}
                  </motion.div>
                </AnimatePresence>
              )}

              {/* Navigation Arrows - Tablet/Desktop only */}
              {items.length > 1 && (
                <div className="absolute inset-x-2 top-1/2 -translate-y-1/2 hidden lg:flex justify-between pointer-events-none z-10">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePrev();
                    }}
                    className="w-10 h-10 min-h-0 rounded-full bg-white/90 border border-black/5 text-black flex items-center justify-center hover:bg-white shadow-md transition-all pointer-events-auto backdrop-blur-md group"
                  >
                    <ChevronLeft
                      className="text-[18px] group-hover:-translate-x-0.5 transition-transform"
                      strokeWidth={1.5}
                    />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNext();
                    }}
                    className="w-10 h-10 min-h-0 rounded-full bg-white/90 border border-black/5 text-black flex items-center justify-center hover:bg-white shadow-md transition-all pointer-events-auto backdrop-blur-md group"
                  >
                    <ChevronRight
                      className="text-[18px] group-hover:translate-x-0.5 transition-transform"
                      strokeWidth={1.5}
                    />
                  </button>
                </div>
              )}
            </div>

            {/* Bottom Information & Thumbnails Strip */}
            {items.length > 0 && currentItem && (
              <div
                className="w-full flex flex-col items-center gap-2 lg:gap-3 px-4 pb-1 lg:pb-2 shrink-0 z-10"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex flex-col items-center gap-1.5 lg:gap-2 w-full">
                  <div className="flex flex-col items-center text-center gap-1 lg:gap-1.5 pt-3 lg:pt-4">
                    {/* Category pill hidden per request */}
                    <h2 className="text-black font-display text-base lg:text-xl font-normal tracking-tight m-0">
                      {currentItem.title}
                    </h2>
                  </div>

                  <div className="flex items-center justify-center gap-2 lg:gap-3">
                    <button
                      onClick={() => toggleItem(currentItem)}
                      aria-label="Toggle wishlist"
                      className="w-8 h-8 lg:w-9 lg:h-9 min-h-0 rounded-full border border-black/10 flex items-center justify-center hover:bg-black/5 transition-all shadow-sm active:scale-95 bg-white"
                    >
                      <span
                        className={`material-symbols-outlined text-[16px] lg:text-[18px] transition-colors ${isWishlisted(currentId) ? 'text-red-500 font-fill' : 'text-black/60'}`}
                      >
                        favorite
                      </span>
                    </button>

                    {currentItem.type === 'product' && (
                      <button
                        onClick={() => addItem(currentItem, 1, currentItem.variants?.[0] || null)}
                        className="h-8 lg:h-9 px-4 lg:px-5 rounded-full bg-black text-white text-[9px] lg:text-[9.5px] font-bold tracking-widest uppercase hover:bg-black/80 transition-all shadow-sm active:scale-95 flex items-center gap-1.5"
                      >
                        <ShoppingBag className="text-[14px]" strokeWidth={1.5} />
                        Shop
                      </button>
                    )}

                    <Link
                      to={`/gallery/${currentId}`}
                      onClick={onClose}
                      className="h-8 lg:h-9 px-4 lg:px-5 rounded-full border border-black/10 bg-white text-black text-[9px] lg:text-[9.5px] font-bold tracking-[0.15em] uppercase hover:border-primary transition-all shadow-sm group flex items-center gap-1.5 active:scale-95"
                    >
                      Details
                      <ArrowRight
                        className="text-[14px] group-hover:translate-x-0.5 transition-transform"
                        strokeWidth={1.5}
                      />
                    </Link>
                  </div>
                </div>

                {/* Thumbnails Container */}
                <div
                  ref={thumbnailContainerRef}
                  className="w-full flex items-center gap-2 lg:gap-2.5 overflow-x-auto no-scrollbar py-1.5 lg:py-2 snap-x snap-mandatory px-[calc(50vw-20px)] lg:px-[calc(50%-20px)] border-t border-black/5 mt-0.5 lg:mt-1"
                >
                  {items.map((item, idx) => {
                    const isSelected = idx === currentIndex;
                    // Virtualization: only render actual images for nearby items (reduced range for performance)
                    const isNearby = Math.abs(idx - currentIndex) <= 5;
                    const thumbImage = item.image || item.imageSrc;
                    return (
                      <button
                        key={idx}
                        data-index={idx}
                        onClick={() => {
                          actionSource.current = 'external';
                          setDirection(idx > currentIndex ? 1 : -1);
                          if (onSelect) onSelect(idx);
                        }}
                        className={`w-12 h-12 lg:w-14 lg:h-14 shrink-0 rounded-[16px] lg:rounded-[20px] overflow-hidden relative transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] snap-center outline-none ${
                          isSelected
                            ? 'scale-[1.15] shadow-[0_8px_20px_-6px_rgba(196,168,124,0.4)] z-10 opacity-100'
                            : 'scale-[0.9] opacity-40 hover:opacity-80 hover:scale-100'
                        }`}
                        aria-label={`Go to slide ${idx + 1}`}
                      >
                        {isNearby ? (
                          item.video ? (
                            <video
                              src={item.video}
                              preload="none"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <CloudinaryImage
                              src={thumbImage}
                              alt={item.title}
                              className="w-full h-full object-cover"
                              loading="lazy"
                              width={100}
                              height={100}
                              sizes="44px"
                              skipObserver={true}
                            />
                          )
                        ) : null}
                        {isSelected && <div className="absolute inset-0 bg-black/5" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </motion.div>,
        document.body,
      )
    : null;
}
