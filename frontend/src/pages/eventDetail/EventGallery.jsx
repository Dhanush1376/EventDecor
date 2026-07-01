import React, { useState, useRef, useEffect } from 'react';
import { m as motion } from 'framer-motion';
import { OptimizedImage } from '../../components/ui/OptimizedImage';
import { ShareButton } from '../../components/ui/ShareButton';

export function EventGallery({ event, toggleItem, isWishlisted }) {
  const [activeGalleryIndex, setActiveGalleryIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const lightboxScrollRef = useRef(null);

  useEffect(() => {
    if (isLightboxOpen) {
      document.body.style.overflow = 'hidden';
      document.body.classList.add('slideshow-active');
    } else {
      document.body.style.overflow = '';
      document.body.classList.remove('slideshow-active');
    }
    return () => {
      document.body.style.overflow = '';
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
    <div className="space-y-8 md:self-start md:sticky md:top-24 lg:top-32">
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
          {(event.gallery && event.gallery.length > 0 ? event.gallery : [event.image]).map(
            (img, i) => (
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
                />
              </div>
            ),
          )}
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
              src={event.gallery?.[activeGalleryIndex] || event.image}
              containerClassName="w-full h-full"
              className="w-full h-full object-cover"
              alt={event.title}
              priority={true}
            />
          </motion.div>
        </div>

        {event.gallery && event.gallery.length > 1 && (
          <div className="absolute bottom-6 left-6 lg:bottom-8 lg:left-8 flex gap-2.5 z-10">
            {event.gallery.map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  if (window.innerWidth >= 768) {
                    setActiveGalleryIndex(i);
                  } else {
                    const container = document.querySelector('.snap-x');
                    if (container) {
                      container.scrollTo({ left: i * container.offsetWidth, behavior: 'smooth' });
                    }
                    setActiveGalleryIndex(i);
                  }
                }}
                className={`w-8 h-8 lg:w-9 lg:h-9 rounded-full backdrop-blur-md border transition-all duration-500 flex items-center justify-center font-body text-[13px] lg:text-[14px] ${activeGalleryIndex === i ? 'bg-white border-white text-black shadow-lg scale-110' : 'bg-black/20 border-white/30 text-white/80 hover:bg-black/40 hover:border-white/50'}`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </motion.div>

      {event.gallery && event.gallery.length > 1 && (
        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
          {event.gallery.map((img, i) => (
            <button
              key={i}
              onClick={() => setActiveGalleryIndex(i)}
              className={`relative w-20 h-20 lg:w-24 lg:h-24 rounded-2xl overflow-hidden shrink-0 transition-all duration-500 ${activeGalleryIndex === i ? 'ring-2 ring-primary ring-offset-2 scale-95' : 'opacity-45 grayscale-[70%] hover:opacity-100 hover:grayscale-0'}`}
            >
              <OptimizedImage
                src={img}
                containerClassName="w-full h-full"
                className="w-full h-full object-cover"
                alt={`Thumb ${i}`}
              />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox Overlay */}
      {isLightboxOpen && (
        <div className="fixed inset-0 z-[9999] bg-white/95 backdrop-blur-lg flex flex-col">
          <div className="flex justify-between items-center p-4 lg:p-6 text-black absolute top-0 w-full z-10">
            <div className="font-label-sm tracking-widest text-xs uppercase opacity-60">
              {activeGalleryIndex + 1} / {event.gallery?.length || 1}
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
            {(event.gallery && event.gallery.length > 0 ? event.gallery : [event.image]).map(
              (img, i) => (
                <div
                  key={i}
                  className="w-full h-full flex-shrink-0 snap-center flex items-center justify-center p-4"
                >
                  <img
                    src={img}
                    alt={`Gallery ${i}`}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              ),
            )}
          </div>
        </div>
      )}
    </div>
  );
}
