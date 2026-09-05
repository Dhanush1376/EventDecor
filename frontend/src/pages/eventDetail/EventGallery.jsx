import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { m as motion } from 'framer-motion';
import { OptimizedImage } from '../../components/ui/OptimizedImage';
import { ShareButton } from '../../components/ui/ShareButton';
import { useScrollLock } from '../../hooks/useScrollLock';

export function EventGallery({ event, toggleItem, isWishlisted }) {
  const [activeGalleryIndex, setActiveGalleryIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const lightboxScrollRef = useRef(null);

  const allImages = React.useMemo(() => {
    return Array.from(new Set([event.image, ...(event.gallery || [])].filter(Boolean)));
  }, [event.image, event.gallery]);

  useScrollLock(isLightboxOpen);

  useEffect(() => {
    if (isLightboxOpen) {
      document.body.classList.add('slideshow-active');
    } else {
      document.body.classList.remove('slideshow-active');
    }
    return () => {
      document.body.classList.remove('slideshow-active');
    };
  }, [isLightboxOpen]);

  const openLightbox = (idx) => {
    setActiveGalleryIndex(idx);
    setIsLightboxOpen(true);
    setTimeout(() => {
      if (lightboxScrollRef.current) {
        lightboxScrollRef.current.scrollTo({
          left: idx * lightboxScrollRef.current.clientWidth,
          behavior: 'instant',
        });
      }
    }, 10);
  };

  return (
    <div className="space-y-3 lg:space-y-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative aspect-[4/3] lg:aspect-[16/10] rounded-[32px] lg:rounded-[48px] overflow-hidden shadow-2xl group"
      >
        <button
          onClick={() => window.history.back()}
          className="flex lg:hidden absolute top-4 left-4 z-20 items-center justify-center w-8 h-8 min-h-0 min-w-0 p-0 aspect-square rounded-full bg-[#fbfbf8]/90 backdrop-blur-xs shadow-lg border border-black/5 active:scale-90 transition-all text-black outline-none focus:outline-none"
        >
          <span className="material-symbols-outlined text-[16px] text-black">arrow_back</span>
        </button>

        <div className="absolute top-4 right-4 z-20 flex flex-row gap-2 pointer-events-auto">
          <button
            onClick={() => toggleItem({ ...event, image: event.image })}
            className="flex items-center justify-center w-8 h-8 min-h-0 min-w-0 p-0 aspect-square rounded-full bg-[#fbfbf8] shadow-lg border border-black/5 active:scale-90 hover:scale-105 transition-all text-black hover:bg-white"
          >
            <motion.span
              animate={{
                scale: isWishlisted(event.id || event._id) ? [1, 1.3, 1] : 1,
                color: isWishlisted(event.id || event._id) ? '#ff2d55' : '#1a1817',
                fontVariationSettings: isWishlisted(event.id || event._id)
                  ? "'FILL' 1"
                  : "'FILL' 0",
              }}
              className="material-symbols-outlined text-[16px]"
            >
              favorite
            </motion.span>
          </button>
          <ShareButton
            url={window.location.href}
            title={`Siri Arts & Crafts: ${event.title}`}
            variant="custom"
            size="custom"
            className="flex items-center justify-center w-8 h-8 min-h-0 min-w-0 p-0 aspect-square rounded-full bg-[#fbfbf8] shadow-lg border border-black/5 active:scale-90 hover:scale-105 transition-all text-black hover:bg-white text-[16px]"
            iconOnly={true}
          />
        </div>

        {/* Mobile Horizontal Scroll Gallery */}
        <div className="lg:hidden flex overflow-x-auto snap-x snap-mandatory no-scrollbar h-full w-full">
          {allImages.map((img, i) => (
            <div
              key={i}
              onClick={() => openLightbox(i)}
              className="flex-shrink-0 w-full h-full snap-center cursor-zoom-in"
            >
              <OptimizedImage
                src={img}
                containerClassName="w-full h-full"
                className="w-full h-full object-cover"
                alt={`${event.title} perspective ${i + 1}`}
                quality="auto:best"
              />
            </div>
          ))}
        </div>

        {/* Desktop-Only Fade Gallery */}
        <div className="hidden lg:block h-full w-full relative">
          <motion.div
            key={activeGalleryIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            onClick={() => openLightbox(activeGalleryIndex)}
            className="w-full h-full cursor-zoom-in"
          >
            <OptimizedImage
              src={allImages[activeGalleryIndex]}
              containerClassName="w-full h-full"
              className="w-full h-full object-cover"
              alt={event.title}
              priority={true}
              quality="auto:best"
            />
          </motion.div>
        </div>

        {/* Pagination dots removed as per request */}
      </motion.div>

      {allImages.length > 1 && (
        <div
          className="w-full flex gap-3 sm:gap-4 overflow-x-auto no-scrollbar py-1 px-2 lg:px-3 items-center justify-start"
          style={{ scrollbarWidth: 'none' }}
        >
          {allImages.map((img, i) => (
            <button
              key={i}
              onClick={() => {
                setActiveGalleryIndex(i);
                if (window.innerWidth < 1024) {
                  const container = document.querySelector('.snap-x');
                  if (container) {
                    container.scrollTo({ left: i * container.offsetWidth, behavior: 'smooth' });
                  }
                }
              }}
              className={`shrink-0 w-12 sm:w-14 lg:w-16 lg:w-[60px] aspect-square rounded-[16px] lg:rounded-[20px] overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] relative group cursor-pointer ${
                activeGalleryIndex === i
                  ? 'scale-[1.15] shadow-[0_8px_20px_-6px_rgba(196,168,124,0.4)] z-10 opacity-100'
                  : 'scale-[0.9] opacity-40 hover:opacity-80 hover:scale-100'
              }`}
            >
              <OptimizedImage
                src={img}
                containerClassName="w-full h-full"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 pointer-events-none rounded-[16px] lg:rounded-[20px]"
                alt={`Thumb ${i}`}
              />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox Overlay */}
      {isLightboxOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[99999] bg-white/95 backdrop-blur-lg flex flex-col">
            <div className="flex justify-between items-center p-4 lg:p-6 text-black absolute top-0 w-full z-10">
              <div className="font-label-sm tracking-widest text-xs uppercase opacity-60">
                {activeGalleryIndex + 1} / {allImages.length}
              </div>
              <button
                onClick={() => setIsLightboxOpen(false)}
                className="hover:opacity-70 transition-opacity"
              >
                <span className="material-symbols-outlined text-3xl">close</span>
              </button>
            </div>
            <div
              ref={lightboxScrollRef}
              className="flex-1 flex overflow-x-auto snap-x snap-mandatory no-scrollbar"
              onScroll={(e) => {
                const idx = Math.round(e.target.scrollLeft / e.target.clientWidth);
                if (idx !== activeGalleryIndex) setActiveGalleryIndex(idx);
              }}
            >
              {allImages.map((img, i) => (
                <div
                  key={i}
                  className="w-full h-full flex-shrink-0 snap-center flex items-center justify-center p-2 sm:p-4 lg:p-6"
                >
                  <OptimizedImage
                    src={img}
                    alt={`Gallery ${i}`}
                    className="max-w-full max-h-full object-contain shadow-2xl"
                    width={1280}
                    quality="auto:best"
                  />
                </div>
              ))}
            </div>

            {/* Bottom Thumbnail Strip for Lightbox */}
            {allImages.length > 1 && (
              <div
                className="w-full pb-[max(16px,var(--safe-area-bottom,_env(safe-area-inset-bottom)))] pt-3 px-4 flex gap-3 overflow-x-auto no-scrollbar justify-center items-center shrink-0 z-10"
                onClick={(e) => e.stopPropagation()}
              >
                {allImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setActiveGalleryIndex(idx);
                      if (lightboxScrollRef.current) {
                        lightboxScrollRef.current.scrollTo({
                          left: idx * lightboxScrollRef.current.clientWidth,
                          behavior: 'smooth',
                        });
                      }
                    }}
                    className={`shrink-0 w-12 sm:w-14 lg:w-16 lg:w-[60px] aspect-square rounded-[16px] lg:rounded-[20px] overflow-hidden relative transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] snap-center outline-none group cursor-pointer ${
                      activeGalleryIndex === idx
                        ? 'scale-[1.15] shadow-[0_8px_20px_-6px_rgba(196,168,124,0.4)] z-10 opacity-100'
                        : 'scale-[0.9] opacity-40 hover:opacity-80 hover:scale-100'
                    }`}
                  >
                    <OptimizedImage
                      src={img}
                      alt={`Thumbnail ${idx + 1}`}
                      containerClassName="w-full h-full"
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 pointer-events-none rounded-[16px] lg:rounded-[20px]"
                      width={100}
                      height={100}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}
