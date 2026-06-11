import { useEffect, useCallback, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { m as motion, AnimatePresence } from 'framer-motion';
import { CloudinaryImage } from '../ui/CloudinaryImage';
import { SearchBar } from '../ui/SearchBar';
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

  const handleThumbnailScroll = useCallback(
    (e) => {
      if (isProgrammaticScroll.current) return;

      const container = e.target;
      // Calculate the exact center pixel of the scroll container
      const scrollCenter = container.scrollLeft + container.clientWidth / 2;

      let closestIndex = currentIndex;
      let minDistance = Infinity;

      // Find the thumbnail that is closest to the center
      Array.from(container.children).forEach((child) => {
        const index = parseInt(child.dataset.index, 10);
        if (isNaN(index)) return;

        const containerRect = container.getBoundingClientRect();
        const childRect = child.getBoundingClientRect();

        const childCenter =
          childRect.left - containerRect.left + childRect.width / 2 + container.scrollLeft;
        const distance = Math.abs(childCenter - scrollCenter);

        if (distance < minDistance) {
          minDistance = distance;
          closestIndex = index;
        }
      });

      const childWidthEstimate = 64;
      if (closestIndex !== currentIndex && minDistance < childWidthEstimate) {
        actionSource.current = 'thumbnail';
        setDirection(closestIndex > currentIndex ? 1 : -1);
        if (onSelect) onSelect(closestIndex);
      }
    },
    [currentIndex, onSelect],
  );

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
            className="w-full h-full flex flex-col items-center justify-between p-4 md:p-6 cursor-default relative overflow-hidden"
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
              <span className="text-black/40 font-label-sm text-[10px] md:text-[12px] uppercase tracking-[0.4em] font-bold whitespace-nowrap">
                {items.length > 0 ? `${currentIndex + 1} / ${items.length}` : '0 / 0'}
              </span>

              <div className="flex-1 max-w-md h-10">
                <SearchBar
                  value={searchQuery}
                  onChange={onSearchChange}
                  placeholder="Search themes, colors..."
                  className="w-full !h-full !rounded-full bg-[#fcfbf9]/90 backdrop-blur-md shadow-sm !px-5 text-[12px] flex items-center border border-black/10 outline-none focus:outline-none"
                />
              </div>

              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-black/5 text-black flex items-center justify-center hover:bg-black/10 transition-colors shrink-0"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Main Image Container */}
            <div className="relative w-full flex-1 flex items-center justify-center overflow-hidden my-3 min-h-0">
              {items.length === 0 ? (
                <div className="text-center py-20 px-6 max-w-md">
                  <span className="material-symbols-outlined text-[48px] text-[#C4A87C] mb-4 block">
                    search_off
                  </span>
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
                      if (swipe < -80) {
                        handleNext();
                      } else if (swipe > 80) {
                        handlePrev();
                      }
                    }}
                    className="w-full h-full flex items-center justify-center px-4 cursor-grab active:cursor-grabbing"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {currentItem?.video ? (
                      <video
                        src={currentItem.video}
                        controls
                        playsInline
                        preload="none"
                        className="max-w-full max-h-full object-contain rounded-none shadow-md"
                      />
                    ) : (
                      <CloudinaryImage
                        src={displayImage}
                        alt={currentItem?.title || ''}
                        className="max-w-full max-h-full object-contain rounded-none shadow-[0_6px_25px_rgba(0,0,0,0.06)]"
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
                <div className="absolute inset-x-2 top-1/2 -translate-y-1/2 hidden md:flex justify-between pointer-events-none z-10">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePrev();
                    }}
                    className="w-10 h-10 rounded-full bg-white/90 border border-black/5 text-black flex items-center justify-center hover:bg-white shadow-md transition-all pointer-events-auto backdrop-blur-md group"
                  >
                    <span className="material-symbols-outlined text-[18px] group-hover:-translate-x-0.5 transition-transform">
                      arrow_back_ios_new
                    </span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNext();
                    }}
                    className="w-10 h-10 rounded-full bg-white/90 border border-black/5 text-black flex items-center justify-center hover:bg-white shadow-md transition-all pointer-events-auto backdrop-blur-md group"
                  >
                    <span className="material-symbols-outlined text-[18px] group-hover:translate-x-0.5 transition-transform">
                      arrow_forward_ios
                    </span>
                  </button>
                </div>
              )}
            </div>

            {/* Bottom Information & Thumbnails Strip */}
            {items.length > 0 && currentItem && (
              <div
                className="w-full flex flex-col items-center gap-4 px-4 pb-2 shrink-0 z-10"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex flex-col items-center gap-3 w-full">
                  <div className="flex flex-col items-center text-center gap-1.5">
                    <span className="px-3 py-0.5 rounded-full bg-[#FAF6F0] border border-[#C4A87C]/30 text-[#C4A87C] text-[9px] uppercase tracking-[0.2em] font-bold">
                      {currentItem.category}
                    </span>
                    <h2 className="text-black font-display text-xl md:text-2xl font-normal tracking-tight">
                      {currentItem.title}
                    </h2>
                  </div>

                  <div className="flex items-center justify-center gap-3">
                    <button
                      onClick={() => toggleItem(currentItem)}
                      aria-label="Toggle wishlist"
                      className="w-9 h-9 rounded-full border border-black/10 flex items-center justify-center hover:bg-black/5 transition-all shadow-sm active:scale-95 bg-white"
                    >
                      <span
                        className={`material-symbols-outlined text-[16px] transition-colors ${isWishlisted(currentId) ? 'text-red-500 font-fill' : 'text-black/60'}`}
                      >
                        favorite
                      </span>
                    </button>

                    {currentItem.type === 'product' && (
                      <button
                        onClick={() => addItem(currentItem, 1, currentItem.variants?.[0] || null)}
                        className="h-9 px-5 rounded-full bg-black text-white text-[9px] font-bold tracking-widest uppercase hover:bg-black/80 transition-all shadow-sm active:scale-95 flex items-center gap-2"
                      >
                        <span className="material-symbols-outlined text-[14px]">local_mall</span>
                        Shop
                      </button>
                    )}

                    <Link
                      to={`/gallery/${currentId}`}
                      onClick={onClose}
                      className="h-9 px-5 rounded-full border border-black/10 bg-white text-black text-[9px] font-bold tracking-[0.15em] uppercase hover:border-primary transition-all shadow-sm group flex items-center gap-2 active:scale-95"
                    >
                      Details
                      <span className="material-symbols-outlined text-[12px] group-hover:translate-x-0.5 transition-transform">
                        east
                      </span>
                    </Link>
                  </div>
                </div>

                {/* Thumbnails Container */}
                <div
                  ref={thumbnailContainerRef}
                  onScroll={handleThumbnailScroll}
                  className="w-full flex items-center gap-2.5 overflow-x-auto no-scrollbar py-2 snap-x snap-mandatory px-[calc(50vw-24px)] md:px-[calc(50%-20px)] border-t border-black/5 mt-1"
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
                          setDirection(idx > currentIndex ? 1 : -1);
                          if (onSelect) onSelect(idx);
                        }}
                        className={`relative shrink-0 w-11 h-11 rounded-lg overflow-hidden border-2 transition-all duration-300 snap-center ${
                          isSelected
                            ? 'border-[#C4A87C] scale-105 shadow-sm'
                            : 'border-transparent opacity-50 hover:opacity-100'
                        }`}
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
