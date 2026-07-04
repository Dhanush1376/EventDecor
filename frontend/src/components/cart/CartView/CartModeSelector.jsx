import React from 'react';
import { motion } from 'framer-motion';

export const CartModeSelector = ({
  activeCartMode,
  setActiveCartMode,
  purchaseCartCount,
  rentalCartCount,
  customCartCount,
}) => {
  return (
    <div className="w-full bg-surface-bright border-b border-outline-variant/30 py-2 lg:py-2.5 flex justify-center px-4">
      <div className="w-full bg-surface-container/60 backdrop-blur-xl border border-outline-variant/20 p-1.5 rounded-full flex gap-1 items-center relative z-0 shadow-inner">
        {/* Purchase Cart Tab */}
        <button
          onClick={() => setActiveCartMode('purchase')}
          className={`relative flex flex-1 items-center justify-center py-2.5 min-h-0 rounded-full font-sans text-[10px] sm:text-[11px] uppercase tracking-wider sm:tracking-widest transition-colors duration-300 cursor-pointer z-10 outline-none focus-visible:ring-2 focus-visible:ring-primary ${
            activeCartMode === 'purchase'
              ? 'text-primary font-bold'
              : 'text-on-surface-variant/70 hover:text-on-surface font-medium'
          }`}
        >
          {activeCartMode === 'purchase' && (
            <motion.div
              layoutId="activeCartTabBg"
              className="absolute inset-0 bg-surface-bright rounded-full shadow-[0_2px_8px_rgba(115,92,0,0.08)] border border-outline-variant/15 -z-10"
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            />
          )}
          <span
            className={`absolute -top-1 right-1 sm:-top-1.5 sm:right-1.5 w-[16px] h-[16px] sm:w-[18px] sm:h-[18px] rounded-full text-[8px] font-bold flex items-center justify-center border shadow-sm transition-all duration-300 z-20 ${
              activeCartMode === 'purchase'
                ? 'bg-primary text-white border-white'
                : 'bg-outline-variant/60 text-on-surface-variant/80 border-surface-bright'
            }`}
          >
            {purchaseCartCount}
          </span>
          <div className="flex items-center gap-1 sm:gap-1.5">
            <span className="material-symbols-outlined text-[15px] sm:text-[17px]">
              shopping_cart
            </span>
            <span>Purchase</span>
          </div>
        </button>

        {/* Rental Cart Tab */}
        <button
          onClick={() => setActiveCartMode('rental')}
          className={`relative flex flex-1 items-center justify-center py-2.5 min-h-0 rounded-full font-sans text-[10px] sm:text-[11px] uppercase tracking-wider sm:tracking-widest transition-colors duration-300 cursor-pointer z-10 outline-none focus-visible:ring-2 focus-visible:ring-primary ${
            activeCartMode === 'rental'
              ? 'text-primary font-bold'
              : 'text-on-surface-variant/70 hover:text-on-surface font-medium'
          }`}
        >
          {activeCartMode === 'rental' && (
            <motion.div
              layoutId="activeCartTabBg"
              className="absolute inset-0 bg-surface-bright rounded-full shadow-[0_2px_8px_rgba(115,92,0,0.08)] border border-outline-variant/15 -z-10"
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            />
          )}
          <span
            className={`absolute -top-1 right-1 sm:-top-1.5 sm:right-1.5 w-[16px] h-[16px] sm:w-[18px] sm:h-[18px] rounded-full text-[8px] font-bold flex items-center justify-center border shadow-sm transition-all duration-300 z-20 ${
              activeCartMode === 'rental'
                ? 'bg-primary text-white border-white'
                : 'bg-outline-variant/60 text-on-surface-variant/80 border-surface-bright'
            }`}
          >
            {rentalCartCount}
          </span>
          <div className="flex items-center gap-1 sm:gap-1.5">
            <span className="material-symbols-outlined text-[15px] sm:text-[17px]">sell</span>
            <span>Rental</span>
          </div>
        </button>

        {/* Custom Cart Tab */}
        <button
          onClick={() => setActiveCartMode('custom')}
          className={`relative flex flex-1 items-center justify-center py-2.5 min-h-0 rounded-full font-sans text-[10px] sm:text-[11px] uppercase tracking-wider sm:tracking-widest transition-colors duration-300 cursor-pointer z-10 outline-none focus-visible:ring-2 focus-visible:ring-primary ${
            activeCartMode === 'custom'
              ? 'text-primary font-bold'
              : 'text-on-surface-variant/70 hover:text-on-surface font-medium'
          }`}
        >
          {activeCartMode === 'custom' && (
            <motion.div
              layoutId="activeCartTabBg"
              className="absolute inset-0 bg-surface-bright rounded-full shadow-[0_2px_8px_rgba(115,92,0,0.08)] border border-outline-variant/15 -z-10"
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            />
          )}
          <span
            className={`absolute -top-1 right-1 sm:-top-1.5 sm:right-1.5 w-[16px] h-[16px] sm:w-[18px] sm:h-[18px] rounded-full text-[8px] font-bold flex items-center justify-center border shadow-sm transition-all duration-300 z-20 ${
              activeCartMode === 'custom'
                ? 'bg-primary text-white border-white'
                : 'bg-outline-variant/60 text-on-surface-variant/80 border-surface-bright'
            }`}
          >
            {customCartCount}
          </span>
          <div className="flex items-center gap-1 sm:gap-1.5">
            <span className="material-symbols-outlined text-[15px] sm:text-[17px]">palette</span>
            <span>Custom</span>
          </div>
        </button>
      </div>
    </div>
  );
};
