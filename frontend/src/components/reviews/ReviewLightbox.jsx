import { m as motion, AnimatePresence } from 'framer-motion';
import { OptimizedImage } from '../ui/OptimizedImage';
import { useState, useEffect } from 'react';

export function ReviewLightbox({ media = [], activeIndex = 0, isOpen, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(activeIndex);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentIndex(activeIndex);
    }, 0);
    return () => clearTimeout(timer);
  }, [activeIndex]);

  if (!isOpen || !media || media.length === 0) return null;

  const currentItem = media[currentIndex] || media[0];

  const handleNext = (e) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % media.length);
  };

  const handlePrev = (e) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + media.length) % media.length);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-lg flex items-center justify-center p-4 md:p-8 font-body selection:bg-[#D4AF37] selection:text-black"
    >
      {/* Top Bar with Close Button */}
      <div className="absolute top-6 right-6 z-50 flex items-center gap-4">
        <span className="text-white/60 text-xs font-mono font-bold px-3 py-1 bg-white/10 rounded-full backdrop-blur-md">
          {currentIndex + 1} / {media.length}
        </span>
        <button
          onClick={onClose}
          className="w-11 h-11 min-h-0 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer border border-white/20 backdrop-blur-md"
        >
          <span className="material-symbols-outlined text-xl">close</span>
        </button>
      </div>

      {/* Main Lightbox Frame */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-4xl h-[80vh] md:h-[85vh] rounded-[2.5rem] overflow-hidden border border-white/20 shadow-2xl bg-black/50 flex flex-col items-center justify-center group"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.25 }}
            className="w-full h-full flex items-center justify-center relative"
          >
            {currentItem.type === 'video' ? (
              <div className="relative w-full h-full flex items-center justify-center bg-black">
                <video
                  src={currentItem.url}
                  autoPlay
                  loop
                  muted={isMuted}
                  controls
                  className="max-w-full max-h-full rounded-2xl shadow-xl"
                />
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="absolute bottom-6 right-6 z-30 px-4 py-2 bg-black/70 hover:bg-black text-white text-xs rounded-full border border-white/20 flex items-center gap-1.5 transition-all cursor-pointer backdrop-blur-md font-bold"
                >
                  <span className="material-symbols-outlined text-sm">
                    {isMuted ? 'volume_off' : 'volume_up'}
                  </span>
                  {isMuted ? 'Unmute Audio' : 'Mute'}
                </button>
              </div>
            ) : (
              <OptimizedImage
                src={currentItem.url || currentItem}
                alt="Enlarged Customer View"
                className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl p-2 select-none"
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation Arrows */}
        {media.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              className="absolute left-6 top-1/2 -translate-y-1/2 w-14 h-14 min-h-0 rounded-full bg-black/60 hover:bg-black text-white border border-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer z-30 shadow-xl"
            >
              <span className="material-symbols-outlined text-2xl">chevron_left</span>
            </button>
            <button
              onClick={handleNext}
              className="absolute right-6 top-1/2 -translate-y-1/2 w-14 h-14 min-h-0 rounded-full bg-black/60 hover:bg-black text-white border border-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer z-30 shadow-xl"
            >
              <span className="material-symbols-outlined text-2xl">chevron_right</span>
            </button>
          </>
        )}

        {/* Caption Overlay */}
        {currentItem.caption && (
          <div className="absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-black/90 via-black/50 to-transparent text-white text-center">
            <p className="font-display text-sm md:text-base font-bold tracking-wide">
              {currentItem.caption}
            </p>
            {currentItem.author && (
              <p className="text-xs text-[#D4AF37] font-semibold mt-1">
                Story by {currentItem.author}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Thumbnail Bar */}
      {media.length > 1 && (
        <div className="absolute bottom-6 inset-x-0 flex justify-center gap-2 px-4 z-50 overflow-x-auto py-2">
          {media.map((itm, i) => (
            <div
              key={i}
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex(i);
              }}
              className={`w-14 h-14 rounded-xl overflow-hidden border-2 cursor-pointer transition-all ${
                currentIndex === i
                  ? 'border-[#D4AF37] scale-110 shadow-lg ring-2 ring-[var(--color-gold-dark)]'
                  : 'border-white/20 opacity-50 hover:opacity-100'
              }`}
            >
              {itm.type === 'video' ? (
                <div className="w-full h-full bg-[var(--color-gold-dark)] flex items-center justify-center text-white text-[10px] font-bold">
                  VID
                </div>
              ) : (
                <OptimizedImage
                  src={itm.url || itm}
                  className="w-full h-full object-cover"
                  alt="Thumb"
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
