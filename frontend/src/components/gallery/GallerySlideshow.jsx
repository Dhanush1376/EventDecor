import React, { useEffect, useCallback, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { CloudinaryImage } from "../ui/CloudinaryImage";
import { handleImageError } from "../../utils/imageUtils";
import { useWishlist } from "../../context/WishlistContext";
import { useCart } from "../../context/CartContext";

const slideVariants = {
  enter: (direction) => {
    return {
      x: direction > 0 ? 1000 : -1000,
      opacity: 0
    };
  },
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1
  },
  exit: (direction) => {
    return {
      zIndex: 0,
      x: direction < 0 ? 1000 : -1000,
      opacity: 0
    };
  }
};

export function GallerySlideshow({
  items,
  currentIndex,
  onClose,
  onPrev,
  onNext,
  onSelect,
}) {
  const currentItem = items[currentIndex];
  const thumbnailContainerRef = useRef(null);
  const [direction, setDirection] = useState(0);

  const { toggleItem, isWishlisted } = useWishlist();
  const { addItem } = useCart();

  const actionSource = useRef('external');

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
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "Escape") onClose();
    },
    [handlePrev, handleNext, onClose],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    document.body.classList.add("slideshow-active");
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "auto";
      document.body.classList.remove("slideshow-active");
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
          behavior: "smooth",
          block: "nearest",
          inline: "center",
        });
        
        // Reset programmatic scroll flag after animation completes
        clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = setTimeout(() => {
          isProgrammaticScroll.current = false;
        }, 500); // 500ms should be enough for smooth scroll to finish
      }
    }
  }, [currentIndex]);

  const handleThumbnailScroll = useCallback((e) => {
    if (isProgrammaticScroll.current) return;

    const container = e.target;
    // Calculate the exact center pixel of the scroll container
    const scrollCenter = container.scrollLeft + container.clientWidth / 2;
    
    let closestIndex = currentIndex;
    let minDistance = Infinity;

    // Find the thumbnail that is closest to the center
    Array.from(container.children).forEach((child, index) => {
      const containerRect = container.getBoundingClientRect();
      const childRect = child.getBoundingClientRect();
      
      const childCenter = childRect.left - containerRect.left + childRect.width / 2 + container.scrollLeft;
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
  }, [currentIndex, onSelect]);

  if (!currentItem) return null;

  const displayImage = currentItem.image || currentItem.imageSrc;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[1000] bg-white/95 backdrop-blur-3xl flex flex-col items-center justify-between cursor-zoom-out pb-6 md:pb-10 pt-4"
    >
      {/* Header Controls */}
      <div className="absolute top-0 left-0 right-0 p-4 md:p-6 lg:p-8 flex justify-between items-start z-[1001]">
        <div className="flex flex-col" onClick={(e) => e.stopPropagation()}>
          <span className="text-black/40 font-label-sm text-[10px] md:text-[12px] uppercase tracking-[0.4em] font-bold">
            {currentIndex + 1} <span className="mx-2 opacity-20">/</span>{" "}
            {items.length}
          </span>
        </div>

        <button
          onClick={onClose}
          className="w-12 h-12 rounded-full bg-black/5 text-black flex items-center justify-center hover:bg-black/10 transition-colors"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      {/* Main Image Container */}
      <div className="relative w-full flex-1 flex items-center justify-center mt-12 md:mt-8 mb-2 md:mb-2 overflow-hidden min-h-0">
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={currentItem.id + currentItem.type}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 280, damping: 28 },
              opacity: { duration: 0.2 }
            }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={1}
            onDragEnd={(e, { offset, velocity }) => {
              const swipe = offset.x;
              const swipeConfidenceThreshold = 10000;
              const swipePower = Math.abs(offset.x) * velocity.x;
              
              if (swipe < -100 || swipePower < -swipeConfidenceThreshold) {
                handleNext();
              } else if (swipe > 100 || swipePower > swipeConfidenceThreshold) {
                handlePrev();
              }
            }}
            className="absolute inset-0 px-4 md:px-8 lg:px-12 py-4 md:py-0 flex items-center justify-center cursor-grab active:cursor-grabbing"
            onClick={(e) => e.stopPropagation()}
          >
            {currentItem.video ? (
              <video
                src={currentItem.video}
                controls
                autoPlay
                playsInline
                className="w-full h-full object-contain shadow-2xl rounded-lg cursor-default"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <img
                src={displayImage.includes('cloudinary.com') ? displayImage.replace('/upload/', '/upload/f_auto,q_auto,dpr_auto,w_1600/') : displayImage}
                alt={currentItem.title}
                className="w-full h-full object-contain shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] rounded-lg cursor-default pointer-events-none"
                loading="eager"
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation Arrows - Tablet/Desktop only */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 hidden md:flex justify-between px-4 md:px-8 pointer-events-none z-[1001]">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            className="w-12 h-12 lg:w-14 lg:h-14 rounded-full bg-white/80 border border-black/5 text-black flex items-center justify-center hover:bg-white shadow-xl transition-all pointer-events-auto backdrop-blur-md group"
          >
            <span className="material-symbols-outlined group-hover:-translate-x-1 transition-transform">
              arrow_back_ios_new
            </span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            className="w-12 h-12 lg:w-14 lg:h-14 rounded-full bg-white/80 border border-black/5 text-black flex items-center justify-center hover:bg-white shadow-xl transition-all pointer-events-auto backdrop-blur-md group"
          >
            <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">
              arrow_forward_ios
            </span>
          </button>
        </div>
      </div>

      {/* Bottom Information & Thumbnails Strip */}
      <div 
        className="w-full md:w-[700px] md:max-w-[95vw] flex flex-col items-center gap-6 md:gap-3 z-[1001] bg-gradient-to-t from-white via-white/90 to-transparent md:bg-white/80 md:backdrop-blur-2xl md:shadow-[0_20px_60px_-10px_rgba(0,0,0,0.15)] md:border md:border-white/50 pt-12 md:pt-4 pb-4 md:pb-4 px-4 md:px-8 md:rounded-[2rem] shrink-0 md:mb-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col md:flex-row items-center md:items-end justify-between w-full gap-2 md:gap-8">
          <div className="flex flex-col items-center md:items-start text-center md:text-left gap-2 md:gap-1">
            <span className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[9px] uppercase tracking-[0.2em] font-bold shadow-sm">
              {currentItem.category}
            </span>
            <h2 className="text-black font-display text-2xl md:text-3xl font-light tracking-tight md:mt-1">
              {currentItem.title}
            </h2>
          </div>
          
          <div className="flex items-center justify-center gap-3 mt-3 md:mt-0 md:pb-1 shrink-0">
            <button
              onClick={() => toggleItem(currentItem)}
              aria-label="Toggle wishlist"
              className="w-9 h-9 md:w-10 md:h-10 rounded-full border border-black/10 flex items-center justify-center hover:bg-black/5 transition-all shadow-sm active:scale-95 bg-white"
            >
              <span className={`material-symbols-outlined text-[16px] md:text-[18px] transition-colors ${isWishlisted(currentItem.id) ? 'text-red-500 font-fill' : 'text-black/60'}`}>
                favorite
              </span>
            </button>
            
            {currentItem.type === "product" && (
              <button
                onClick={() => addItem(currentItem, 1, currentItem.variants?.[0] || null)}
                className="h-9 md:h-10 px-5 md:px-6 rounded-full bg-black text-white text-[9px] md:text-[10px] font-bold tracking-widest uppercase hover:bg-black/80 transition-all shadow-sm active:scale-95 flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[14px] md:text-[16px]">local_mall</span>
                Shop
              </button>
            )}

            <Link
              to={`/gallery/${currentItem.id}`}
              onClick={onClose}
              className="h-9 md:h-10 px-5 md:px-6 rounded-full border border-black/10 bg-white text-black text-[9px] md:text-[10px] font-bold tracking-[0.15em] md:tracking-[0.2em] uppercase hover:border-primary transition-all shadow-sm group flex items-center gap-2 active:scale-95"
            >
              Details 
              <span className="material-symbols-outlined text-[14px] group-hover:translate-x-1 transition-transform">east</span>
            </Link>
          </div>
        </div>

        {/* Thumbnails Container */}
        <div 
          ref={thumbnailContainerRef}
          onScroll={handleThumbnailScroll}
          className="w-full flex items-center gap-3 overflow-x-auto no-scrollbar py-4 md:py-2 snap-x snap-mandatory px-[calc(50vw-32px)] md:px-[calc(50%-28px)]"
        >
          {items.map((item, idx) => {
            const isSelected = idx === currentIndex;
            const thumbImage = item.image || item.imageSrc;
            return (
              <button
                key={idx}
                onClick={() => {
                  setDirection(idx > currentIndex ? 1 : -1);
                  if (onSelect) onSelect(idx);
                }}
                className={`relative shrink-0 w-16 h-16 md:w-10 md:h-10 lg:w-9 lg:h-9 rounded-lg overflow-hidden border-2 transition-all duration-300 snap-center ${
                  isSelected ? "border-primary scale-[1.15] shadow-lg" : "border-transparent opacity-60 hover:opacity-100"
                }`}
              >
                {item.video ? (
                  <video 
                    src={item.video} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <CloudinaryImage
                    src={thumbImage}
                    alt={item.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    width={150}
                    height={150}
                  />
                )}
                {isSelected && (
                  <div className="absolute inset-0 bg-black/10" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
