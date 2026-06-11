import { useState } from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';

export function WhatsAppWidget() {
  const { pathname } = useLocation();
  const [isVisible, setIsVisible] = useState(true);

  // Hide on checkout for a distraction-free experience or if dismissed
  if (pathname === '/checkout' || !isVisible) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          drag
          dragMomentum={false}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0, x: 100 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="whatsapp-widget fixed bottom-28 right-6 md:bottom-10 md:right-10 z-[40]"
        >
          {/* Symmetrical Close Button */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsVisible(false);
            }}
            aria-label="Dismiss chat widget"
            className="absolute -top-1.5 -right-1.5 w-5.5 h-5.5 min-h-0 aspect-square p-0 bg-black text-white rounded-full flex items-center justify-center text-[9px] font-bold shadow-md cursor-pointer hover:bg-red-500 transition-all z-50 border-2 border-white select-none shrink-0"
          >
            ✕
          </button>

          <a
            href="https://wa.me/919866006648"
            target="_blank"
            rel="noopener noreferrer"
            className="w-14 h-14 bg-white/95 backdrop-blur-md rounded-full shadow-[0_12px_40px_rgba(0,0,0,0.15)] border border-black/5 hover:border-primary/30 flex items-center justify-center cursor-grab active:cursor-grabbing transition-all duration-500 ease-out group"
            aria-label="Chat with us on WhatsApp"
            onDragStart={(e) => e.preventDefault()} // prevent browser image drag
          >
            <div className="w-10 h-10 rounded-full bg-[#25D366]/10 shrink-0 flex items-center justify-center group-hover:bg-[#25D366] transition-colors duration-300">
              <svg
                viewBox="0 0 448 512"
                width="20"
                height="20"
                className="fill-[#25D366] group-hover:fill-white transition-colors duration-300"
              >
                <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7 .9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3s19.9 53.7 22.7 57.4c2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z" />
              </svg>
            </div>
          </a>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
