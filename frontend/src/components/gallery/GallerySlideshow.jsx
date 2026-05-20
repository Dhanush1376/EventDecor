import React, { useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CloudinaryImage } from "../ui/CloudinaryImage";
import { handleImageError } from "../../utils/imageUtils";

export function GallerySlideshow({
  items,
  currentIndex,
  onClose,
  onPrev,
  onNext,
}) {
  const currentItem = items[currentIndex];

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "ArrowLeft") onPrev();
      if (e.key === "ArrowRight") onNext();
      if (e.key === "Escape") onClose();
    },
    [onPrev, onNext, onClose],
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

  if (!currentItem) return null;

  const displayImage = currentItem.image || currentItem.imageSrc;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[1000] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center cursor-zoom-out"
    >
      {/* Header Controls */}
      <div className="absolute top-0 left-0 right-0 p-6 md:p-10 flex justify-between items-start z-[1001]">
        <div className="flex flex-col" onClick={(e) => e.stopPropagation()}>
          <span className="text-white/40 font-label-sm text-[10px] md:text-[12px] uppercase tracking-[0.4em] font-bold">
            {currentIndex + 1} <span className="mx-2 opacity-20">/</span>{" "}
            {items.length}
          </span>
        </div>

        <button
          onClick={onClose}
          className="w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      {/* Main Image Container */}
      <div className="relative w-full h-full flex items-center justify-center p-4 md:p-12 lg:p-20">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentItem.id + currentItem.type}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={(e, { offset, velocity }) => {
              const swipe = offset.x;
              if (swipe < -100) {
                onNext();
              } else if (swipe > 100) {
                onPrev();
              }
            }}
            className="relative max-w-full max-h-full flex items-center justify-center cursor-grab active:cursor-grabbing"
            onClick={(e) => e.stopPropagation()}
          >
            {currentItem.video ? (
              <video
                src={currentItem.video}
                controls
                autoPlay
                playsInline
                className="max-w-full max-h-[70vh] md:max-h-[80vh] object-contain shadow-2xl rounded-lg cursor-default"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <CloudinaryImage
                src={displayImage}
                alt={currentItem.title}
                className="max-w-full max-h-[70vh] md:max-h-[80vh] object-contain shadow-2xl rounded-lg cursor-default pointer-events-none"
                containerClassName="max-w-full max-h-full flex items-center justify-center"
                loading="eager"
                fetchPriority="high"
                width={1600}
                height={1200}
                sizes="100vw"
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation Arrows - Tablet/Desktop only (Swipe used for mobile) */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 hidden md:flex justify-between px-4 md:px-10 pointer-events-none">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPrev();
            }}
            className="w-14 h-14 rounded-full bg-black/40 border border-white/10 text-white flex items-center justify-center hover:bg-white/10 transition-all pointer-events-auto backdrop-blur-md group"
          >
            <span className="material-symbols-outlined group-hover:-translate-x-1 transition-transform">
              arrow_back_ios_new
            </span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onNext();
            }}
            className="w-14 h-14 rounded-full bg-black/40 border border-white/10 text-white flex items-center justify-center hover:bg-white/10 transition-all pointer-events-auto backdrop-blur-md group"
          >
            <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">
              arrow_forward_ios
            </span>
          </button>
        </div>
      </div>

      {/* Bottom Information & Mobile Controls */}
      <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12 bg-gradient-to-t from-black to-transparent">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div
            className="flex-1 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-wrap items-center gap-3">
              <span className="px-3 py-1 rounded-full bg-primary/20 border border-primary/30 text-primary text-[9px] uppercase tracking-[0.2em] font-bold shadow-sm">
                {currentItem.category}
              </span>
              <span className="text-white/50 font-label text-[10px] uppercase tracking-[0.2em] font-bold">
                {currentItem.event}
              </span>
            </div>

            <div className="space-y-2">
              <h2 className="text-white font-display text-2xl md:text-4xl font-bold tracking-tight">
                {currentItem.title}
              </h2>
              <p className="text-white/60 font-body text-sm md:text-base leading-relaxed max-w-2xl font-light">
                {currentItem.description}
              </p>
            </div>
          </div>

          <div
            className="flex items-center gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Removed mobile arrows to favor swipe gesture */}

            <a
              href={
                currentItem.type === "product"
                  ? `/gallery/product/${currentItem.id}`
                  : `/gallery/inspiration/${currentItem.id}`
              }
              className="px-8 md:px-10 py-4 md:py-5 bg-white text-black rounded-full font-bold text-[11px] md:text-[12px] uppercase tracking-[0.2em] hover:bg-primary hover:text-white transition-all shadow-2xl flex-shrink-0"
            >
              View Details
            </a>

            {/* Removed mobile arrows to favor swipe gesture */}
          </div>
        </div>
      </div>

      {/* Background Marble Overlay */}
      <div className="absolute inset-0 bg-marble opacity-[0.03] pointer-events-none mix-blend-overlay" />
    </motion.div>
  );
}
