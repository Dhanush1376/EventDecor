import React, { useState, useEffect } from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';

export function ScrollToTopButton() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > 500) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility, { passive: true });
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          layout
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          transition={{
            layout: { type: 'spring', damping: 25, stiffness: 300 },
            opacity: { duration: 0.3, ease: 'easeOut' },
            scale: { duration: 0.3, ease: 'easeOut' },
            y: { duration: 0.3, ease: 'easeOut' },
          }}
          onClick={scrollToTop}
          className="relative pointer-events-auto shrink-0 z-50 w-11 h-11 lg:w-12 lg:h-12 bg-white/90 backdrop-blur-md border border-outline-variant/30 text-on-surface shadow-lg hover:shadow-xl rounded-full flex items-center justify-center cursor-pointer transition-all hover:bg-white active:scale-95 group"
          aria-label="Scroll to top"
        >
          <span className="material-symbols-outlined text-[20px] lg:text-[24px] text-on-surface group-hover:-translate-y-0.5 transition-transform">
            arrow_upward
          </span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
