import { OptimizedImage } from './OptimizedImage';
import { ShareButton } from './ShareButton';
import { m as motion, AnimatePresence } from 'framer-motion';
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useWishlist } from '../../context/WishlistContext';
import { MandalaElement } from './MandalaElement';

const RecommendationSystem = React.lazy(() =>
  import('../sections/RecommendationSystem').then((m) => ({ default: m.RecommendationSystem })),
);

export function ProductGallery({ images = [], product }) {
  const { toggleItem, isWishlisted } = useWishlist();
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isSimilarOpen, setIsSimilarOpen] = useState(false);
  const scrollRef = useRef(null);
  const lightboxScrollRef = useRef(null);
  const navigate = useNavigate();

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
    setSelectedIdx(idx);
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

  const handleBack = (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Animate the entire page sliding off to the right
    const rootEl = document.getElementById('root');
    if (rootEl) {
      rootEl.style.transition =
        'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.35s ease';
      rootEl.style.transform = 'translateX(100vw)';
      rootEl.style.opacity = '0';
    }

    // Wait for the slide out animation to finish before routing
    setTimeout(() => {
      // Clean up styles so the next page renders normally
      if (rootEl) {
        rootEl.style.transition = '';
        rootEl.style.transform = '';
        rootEl.style.opacity = '';
      }

      if (window.history.state && window.history.state.idx > 0) {
        navigate(-1);
      } else {
        navigate('/collections');
        // Force scroll reset on fallback
        window.scrollTo(0, 0);
      }
    }, 350);
  };

  const handleThumbnailClick = (idx) => {
    setSelectedIdx(idx);
    if (scrollRef.current) {
      const width = scrollRef.current.clientWidth;
      scrollRef.current.scrollTo({
        left: idx * width,
        behavior: 'smooth',
      });
    }
  };

  const handleScroll = (e) => {
    const scrollLeft = e.currentTarget.scrollLeft;
    const width = e.currentTarget.clientWidth;
    if (!width) return;
    const currentSlide = Math.round(scrollLeft / width);
    if (currentSlide !== selectedIdx && currentSlide >= 0 && currentSlide < images.length) {
      setSelectedIdx(currentSlide);
    }
  };

  return (
    <div className="flex flex-col-reverse lg:flex-row gap-4 lg:gap-6 items-start w-full select-none relative">
      {/* Sticky Mandala Art */}
      <MandalaElement
        className="hidden md:block absolute -top-16 -left-[120px] opacity-[0.05] pointer-events-none -z-10"
        size={550}
        duration={120}
      />
      {/* Thumbnail Strip */}
      <div
        className="w-full lg:w-[85px] flex lg:flex-col gap-3 sm:gap-4 overflow-x-auto lg:overflow-y-auto no-scrollbar py-3 px-2 lg:px-3 items-center"
        style={{ scrollbarWidth: 'none' }}
      >
        {images.map((img, idx) => (
          <button
            key={idx}
            onClick={() => handleThumbnailClick(idx)}
            className={`shrink-0 w-12 sm:w-14 lg:w-16 lg:w-[60px] aspect-square rounded-[16px] lg:rounded-[20px] overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] relative group cursor-pointer ${
              selectedIdx === idx
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

      {/* Main Image Viewport - Native continuous horizontal scroll enabled */}
      <div className="flex-1 w-full relative aspect-square max-h-[580px] rounded-2xl lg:rounded-3xl overflow-hidden bg-[#fafafa] group border border-black/[0.04]">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="w-full h-full flex overflow-x-auto snap-x snap-mandatory relative"
          style={{ scrollbarWidth: 'none' }}
        >
          {images.map((img, idx) => (
            <div
              key={idx}
              onClick={() => openLightbox(idx)}
              className="w-full h-full shrink-0 snap-center relative overflow-hidden bg-white flex items-center justify-center cursor-zoom-in"
            >
              <OptimizedImage
                src={img}
                alt={`Product Primary View ${idx + 1}`}
                containerClassName="w-full h-full"
                className="w-full h-full object-cover origin-center select-none transition-transform duration-500"
                width={800}
                height={800}
              />
            </div>
          ))}
        </div>

        {/* Gallery Interaction Overlays */}

        {/* Mobile Back Arrow Overlay */}
        <button
          onClick={handleBack}
          className="flex lg:hidden absolute top-4 left-4 z-20 items-center justify-center w-8 h-8 min-h-0 min-w-0 p-0 aspect-square rounded-full bg-[#fbfbf8]/90 backdrop-blur-xs shadow-lg border border-black/5 active:scale-90 transition-all text-black outline-none focus:outline-none"
          aria-label="Go back"
        >
          <span className="material-symbols-outlined text-[16px] text-black">arrow_back</span>
        </button>

        {/* Floating Action Buttons (Wishlist & Share) */}
        {product && (
          <div className="absolute top-4 right-4 z-20 flex items-center gap-2 pointer-events-auto">
            <button
              onClick={() =>
                toggleItem({
                  id: product._id || product.id,
                  title: product.title,
                  price: product.price,
                  imageSrc: product.imageSrc || product.image,
                })
              }
              className="flex items-center justify-center w-8 h-8 min-h-0 min-w-0 p-0 aspect-square rounded-full bg-[#fbfbf8] shadow-lg border border-black/5 active:scale-90 hover:scale-105 transition-all text-black hover:bg-white"
            >
              <motion.span
                animate={{
                  scale: isWishlisted(product._id || product.id) ? [1, 1.3, 1] : 1,
                  color: isWishlisted(product._id || product.id) ? '#ff2d55' : '#1a1817',
                  fontVariationSettings: isWishlisted(product._id || product.id)
                    ? "'FILL' 1, 'wght' 300"
                    : "'FILL' 0, 'wght' 300",
                }}
                className="material-symbols-outlined text-[16px]"
              >
                favorite
              </motion.span>
            </button>
            <ShareButton
              url={typeof window !== 'undefined' ? window.location.href : ''}
              title={`${product.title} - Siri Arts & Crafts`}
              description={product.description}
              variant="custom"
              size="custom"
              iconOnly={true}
              className="w-8 h-8 min-h-0 min-w-0 p-0 aspect-square rounded-full bg-[#fbfbf8] shadow-lg border border-black/5 flex items-center justify-center active:scale-90 hover:scale-105 transition-all text-black hover:bg-white"
            />
          </div>
        )}

        {/* View Similar Button */}
        {product && (
          <button
            onClick={() => setIsSimilarOpen(true)}
            className="absolute bottom-4 left-4 z-20 flex items-center justify-center w-8 h-8 min-h-0 min-w-0 p-0 aspect-square rounded-full bg-[#fbfbf8]/90 backdrop-blur-xs shadow-lg border border-black/5 active:scale-90 hover:scale-105 transition-all text-black hover:bg-white pointer-events-auto group"
            title="View Similar"
          >
            <span className="material-symbols-outlined text-[16px]">style</span>
          </button>
        )}

        {/* Shimmer Effect on hover */}
        <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-white/5 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
      </div>

      {/* Fullscreen Lightbox - Clean White Design */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {isLightboxOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="fixed inset-0 z-[99999] flex flex-col touch-none"
                style={{ background: 'linear-gradient(180deg, #f5f0ea 0%, #ece6dd 100%)' }}
                onClick={() => setIsLightboxOpen(false)}
              >
                {/* Top Controls Bar */}
                <div
                  className="flex justify-between items-center px-5 py-4 z-10 shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="text-[#8b7e6a]/70 font-label-sm text-[11px] lg:text-[13px] uppercase tracking-[0.4em] font-bold select-none">
                    {selectedIdx + 1} / {images.length}
                  </span>
                  <button
                    onClick={() => setIsLightboxOpen(false)}
                    className="w-10 h-10 rounded-full bg-[#1a1817]/8 text-[#1a1817]/70 flex items-center justify-center hover:bg-[#1a1817]/15 hover:text-[#1a1817] transition-all duration-200"
                    aria-label="Close lightbox"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>

                {/* Image Viewport - Centered with whitespace */}
                <div
                  ref={lightboxScrollRef}
                  onScroll={handleScroll}
                  className="flex-1 w-full flex overflow-x-auto snap-x snap-mandatory items-center min-h-0"
                  style={{ scrollbarWidth: 'none' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {images.map((img, idx) => (
                    <div
                      key={idx}
                      className="w-full h-full shrink-0 snap-center flex items-center justify-center p-2 sm:p-4 lg:p-6"
                    >
                      <OptimizedImage
                        src={img}
                        alt={`Lightbox view ${idx + 1}`}
                        className="max-w-full max-h-full object-contain rounded-none shadow-2xl"
                        containerClassName="w-full h-full flex items-center justify-center"
                        aspectRatio="auto"
                        width={1600}
                        height={1600}
                      />
                    </div>
                  ))}
                </div>

                {/* Bottom Thumbnail Strip */}
                <div
                  className="w-full pb-[max(16px,env(safe-area-inset-bottom))] pt-3 px-4 flex gap-3 overflow-x-auto no-scrollbar justify-center items-center shrink-0 z-10"
                  onClick={(e) => e.stopPropagation()}
                >
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setSelectedIdx(idx);
                        if (lightboxScrollRef.current) {
                          lightboxScrollRef.current.scrollTo({
                            left: idx * lightboxScrollRef.current.clientWidth,
                            behavior: 'smooth',
                          });
                        }
                      }}
                      className={`shrink-0 w-12 sm:w-14 lg:w-16 lg:w-[60px] aspect-square rounded-[16px] lg:rounded-[20px] overflow-hidden relative transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] snap-center outline-none group cursor-pointer ${
                        selectedIdx === idx
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
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}

      {/* Global Similar Items Bottom Drawer Overlay */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {isSimilarOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100000] pointer-events-auto overflow-hidden"
              >
                {/* Backdrop */}
                <div
                  className="absolute inset-0 bg-black/40 backdrop-blur-sm cursor-pointer"
                  onClick={() => setIsSimilarOpen(false)}
                />

                {/* Drawer Content */}
                <motion.div
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                  className="absolute bottom-0 left-0 w-full bg-surface shadow-2xl rounded-t-3xl border-t border-white/20 pb-6 pt-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Drag handle area (visual only) */}
                  <div
                    className="w-full flex justify-center pt-1 pb-2 cursor-pointer"
                    onClick={() => setIsSimilarOpen(false)}
                  >
                    <div className="w-12 h-1.5 rounded-full bg-outline-variant/30" />
                  </div>

                  <div className="px-4 pb-1 flex justify-between items-center">
                    <h3 className="!font-label text-[13px] font-bold uppercase tracking-widest text-on-surface">
                      Similar Pieces
                    </h3>
                    <button
                      onClick={() => setIsSimilarOpen(false)}
                      className="w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center hover:bg-surface-container-high transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                  </div>

                  <div className="px-4">
                    <React.Suspense
                      fallback={
                        <div className="h-44 flex items-center justify-center text-sm text-on-surface-variant">
                          Discovering...
                        </div>
                      }
                    >
                      <RecommendationSystem
                        category={product.category}
                        currentProductId={product._id || product.id}
                        compact={true}
                        horizontalScroll={true}
                        hideHeader={true}
                        hideMandala={true}
                      />
                    </React.Suspense>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </div>
  );
}
