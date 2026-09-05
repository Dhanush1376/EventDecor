import { ShoppingCart, Tag, Palette } from 'lucide-react';
import React, { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';

const ALL_TABS = [
  {
    id: 'purchase',
    label: 'Purchase',
    icon: ShoppingCart,
  },
  {
    id: 'rental',
    label: 'Rental',
    icon: Tag,
  },
  {
    id: 'custom',
    label: 'Custom',
    icon: Palette,
  },
];

export const CartModeSelector = ({
  activeCartMode,
  setActiveCartMode,
  purchaseCartCount = 0,
  rentalCartCount = 0,
  customCartCount = 0,
}) => {
  const counts = useMemo(
    () => ({
      purchase: purchaseCartCount,
      rental: rentalCartCount,
      custom: customCartCount,
    }),
    [purchaseCartCount, rentalCartCount, customCartCount],
  );

  // Filter tabs that actually have items (> 0)
  const visibleTabs = useMemo(() => {
    return ALL_TABS.filter((tab) => (counts[tab.id] || 0) > 0);
  }, [counts]);

  // If user is currently on an inactive tab (or a tab with 0 items), auto-switch to the first active tab
  useEffect(() => {
    if (visibleTabs.length > 0 && !visibleTabs.some((t) => t.id === activeCartMode)) {
      setActiveCartMode(visibleTabs[0].id);
    }
  }, [visibleTabs, activeCartMode, setActiveCartMode]);

  // If there are 0 or only 1 cart types with items, do not show the selector at all!
  // Only show when there are 2 or 3 distinct carts with items.
  if (visibleTabs.length <= 1) {
    return null;
  }

  return (
    <div className="w-full bg-surface-bright border-b border-outline-variant/30 py-2 lg:py-2.5 flex justify-center px-4">
      <div
        className={`w-full ${
          visibleTabs.length === 2 ? 'max-w-md' : 'max-w-lg'
        } bg-surface-container/60 backdrop-blur-xl border border-outline-variant/20 p-1.5 rounded-full flex gap-1 items-center relative z-0 shadow-inner`}
      >
        {visibleTabs.map((tab) => {
          const Icon = tab.icon;
          const count = counts[tab.id] || 0;
          const isActive = activeCartMode === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveCartMode(tab.id)}
              className={`relative flex flex-1 items-center justify-center py-2.5 min-h-0 rounded-full font-sans text-[10px] sm:text-[11px] uppercase tracking-wider sm:tracking-widest transition-colors duration-300 cursor-pointer z-10 outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                isActive
                  ? 'text-primary font-bold'
                  : 'text-on-surface-variant/70 hover:text-on-surface font-medium'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeCartTabBg"
                  className="absolute inset-0 bg-surface-bright rounded-full shadow-[0_2px_8px_rgba(115,92,0,0.08)] border border-outline-variant/15 -z-10"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              {count > 0 && (
                <span
                  className={`absolute -top-1 right-1 sm:-top-1.5 sm:right-1.5 w-[16px] h-[16px] sm:w-[18px] sm:h-[18px] rounded-full text-[8px] font-bold flex items-center justify-center border shadow-sm transition-all duration-300 z-20 ${
                    isActive
                      ? 'bg-orange-500 text-white border-white'
                      : 'bg-outline-variant/60 text-on-surface-variant/80 border-surface-bright'
                  }`}
                >
                  {count}
                </span>
              )}
              <div className="flex items-center gap-1 sm:gap-1.5">
                <Icon className="text-[15px] sm:text-[17px]" strokeWidth={1.5} />
                <span>{tab.label}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
