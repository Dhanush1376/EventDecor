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
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          onClick={scrollToTop}
          className="fixed bottom-[calc(148px+env(safe-area-inset-bottom,0px))] md:bottom-[100px] right-[22px] md:right-[44px] z-50 w-11 h-11 md:w-12 md:h-12 bg-white/90 backdrop-blur-md border border-outline-variant/30 text-on-surface shadow-lg hover:shadow-xl rounded-full flex items-center justify-center cursor-pointer transition-all hover:bg-white active:scale-95 group"
          aria-label="Scroll to top"
        >
          <span className="material-symbols-outlined text-[20px] md:text-[24px] text-on-surface group-hover:-translate-y-0.5 transition-transform">
            arrow_upward
          </span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
