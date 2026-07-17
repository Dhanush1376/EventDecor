import { m as motion } from 'framer-motion';
import React, { useRef, useState, useEffect, useMemo } from 'react';

export function CategoryTabs({ categories = [], activeCategory, onCategoryChange }) {
  const scrollRef = useRef(null);
  const activeTabRef = useRef(null);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [canScrollLeft, setCanScrollLeft] = useState(false);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(Math.ceil(scrollLeft + clientWidth) < scrollWidth);
    }
  };

  const sortedCategories = useMemo(() => {
    if (!categories || !categories.length) return [];

    // Priority keywords (in order of priority)
    const PRIORITY_KEYWORDS = [
      'trending',
      'best seller',
      'popular',
      'new arrival',
      'coconut',
      'wedding',
      'haldi',
      'mandap',
      'telugu heritage',
      'tambulam',
    ];

    const allCat = categories.filter((c) => c.toLowerCase() === 'all');
    const others = categories.filter((c) => c.toLowerCase() !== 'all');

    others.sort((a, b) => {
      const aLower = a.toLowerCase();
      const bLower = b.toLowerCase();

      const aIndex = PRIORITY_KEYWORDS.findIndex((k) => aLower.includes(k));
      const bIndex = PRIORITY_KEYWORDS.findIndex((k) => bLower.includes(k));

      const aScore = aIndex !== -1 ? aIndex : 999;
      const bScore = bIndex !== -1 ? bIndex : 999;

      if (aScore !== bScore) {
        return aScore - bScore;
      }
      return a.localeCompare(b);
    });

    return [...allCat, ...others];
  }, [categories]);

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [categories]);

  useEffect(() => {
    if (activeTabRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const tab = activeTabRef.current;

      // Scroll the container so that the active tab is at the left edge
      const scrollPos = tab.offsetLeft - 8; // 8px for slight breathing room

      if (typeof container.scrollTo === 'function') {
        container.scrollTo({
          left: scrollPos,
          behavior: 'smooth',
        });
      } else {
        container.scrollLeft = scrollPos;
      }
    }
  }, [activeCategory]);

  if (!categories.length) return null;

  let maskImage = 'none';
  if (canScrollLeft && canScrollRight) {
    maskImage = 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)';
  } else if (canScrollLeft) {
    maskImage = 'linear-gradient(to right, transparent, black 10%, black 100%)';
  } else if (canScrollRight) {
    maskImage = 'linear-gradient(to right, black 0%, black 90%, transparent)';
  }

  return (
    <div className="relative w-full">
      <div
        ref={scrollRef}
        onScroll={checkScroll}
        className="overflow-x-auto no-scrollbar -mx-4 px-4 lg:mx-0 lg:px-0 flex justify-start transition-[mask-image] duration-300"
        role="tablist"
        aria-label="Product categories"
        style={
          maskImage !== 'none'
            ? {
                WebkitMaskImage: maskImage,
                maskImage: maskImage,
              }
            : undefined
        }
      >
        <div className="inline-flex gap-1 p-1.5 min-w-max items-center mx-auto bg-surface-container border border-outline-variant/20 rounded-full shadow-inner">
          {sortedCategories.map((cat) => {
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                ref={isActive ? activeTabRef : null}
                onClick={() => onCategoryChange?.(cat)}
                role="tab"
                aria-selected={isActive}
                className={`relative px-5 sm:px-6 h-9 lg:h-8 flex items-center justify-center rounded-full font-label text-[10px] sm:text-[11px] uppercase tracking-[0.15em] transition-colors duration-300 whitespace-nowrap z-10 outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  isActive
                    ? 'text-primary font-bold'
                    : 'text-on-surface-variant/70 hover:text-on-surface font-medium'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeCategoryTab"
                    className="absolute inset-0 bg-surface-bright rounded-full shadow-[0_2px_8px_rgba(115,92,0,0.08)] border border-outline-variant/15 -z-10"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
                <span className="relative z-10">{cat}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
