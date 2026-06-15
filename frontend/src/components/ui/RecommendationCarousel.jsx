import { useRef, useState, useEffect } from 'react';

/**
 * RecommendationCarousel — luxury horizontal scroll carousel for recommendation sections.
 */
export function RecommendationCarousel({
  items = [],
  renderItem,
  title,
  subtitle,
  badge,
  viewAllLink,
  viewAllLabel = 'Explore Collection',
  className = '',
  itemMinWidth = '300px',
  gap = '24px',
}) {
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScrollState = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  };

  useEffect(() => {
    checkScrollState();
    window.addEventListener('resize', checkScrollState);
    return () => window.removeEventListener('resize', checkScrollState);
  }, [items]);

  const scroll = (direction) => {
    if (!scrollRef.current) return;
    const { clientWidth } = scrollRef.current;
    const scrollAmount = direction === 'right' ? clientWidth * 0.8 : -(clientWidth * 0.8);
    scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      scroll('left');
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      scroll('right');
    }
  };

  if (items.length === 0) return null;

  return (
    <div className={`relative ${className}`}>
      {/* Luxury Header */}
      {(title || subtitle || badge) && (
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 md:mb-16">
          <div className="flex flex-col items-start max-w-2xl">
            {badge && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="inline-flex items-center gap-2 mb-5"
              >
                <div className="w-8 h-[1px] bg-primary/40" />
                <span className="font-label text-[9px] md:text-[10px] text-primary uppercase tracking-[0.3em] font-bold">
                  {badge}
                </span>
                <div className="w-8 h-[1px] bg-primary/40" />
              </motion.div>
            )}
            {title && (
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="font-display text-[32px] sm:text-[40px] md:text-[54px] text-on-surface leading-[1.1] tracking-tight font-light"
              >
                {title}
              </motion.h2>
            )}
            {subtitle && (
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="font-body text-base md:text-lg text-on-surface-variant/70 mt-4 font-light"
              >
                {subtitle}
              </motion.p>
            )}
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="flex items-center gap-4 mt-2 md:mt-0"
          >
            {/* Elegant View All */}
            {viewAllLink && (
              <Link
                to={viewAllLink}
                className="hidden md:inline-flex items-center gap-3 pb-1 border-b border-black/20 text-on-surface font-label text-[10px] uppercase tracking-[0.2em] font-bold hover:border-black transition-colors group mr-4"
              >
                {viewAllLabel}
                <span className="material-symbols-outlined text-[14px] group-hover:translate-x-1 transition-transform">
                  east
                </span>
              </Link>
            )}

            {/* Cinematic Navigation Controls */}
            <div className="hidden md:flex items-center gap-3">
              <button
                onClick={() => scroll('left')}
                disabled={!canScrollLeft}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-500 backdrop-blur-md ${
                  canScrollLeft
                    ? 'bg-white/80 border border-black/10 hover:bg-[#1A1C1A] hover:border-[#1A1C1A] text-black hover:text-white shadow-sm hover:shadow-xl'
                    : 'bg-white/40 border border-black/5 text-black/20 cursor-not-allowed'
                }`}
                aria-label="Scroll left"
              >
                <span className="material-symbols-outlined font-light text-[24px]">
                  arrow_left_alt
                </span>
              </button>
              <button
                onClick={() => scroll('right')}
                disabled={!canScrollRight}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-500 backdrop-blur-md ${
                  canScrollRight
                    ? 'bg-white/80 border border-black/10 hover:bg-[#1A1C1A] hover:border-[#1A1C1A] text-black hover:text-white shadow-sm hover:shadow-xl'
                    : 'bg-white/40 border border-black/5 text-black/20 cursor-not-allowed'
                }`}
                aria-label="Scroll right"
              >
                <span className="material-symbols-outlined font-light text-[24px]">
                  arrow_right_alt
                </span>
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Carousel Track Container */}
      <div className="relative">
        {/* Cinematic Full-Bleed Track */}
        <div
          ref={scrollRef}
          onScroll={checkScrollState}
          onKeyDown={handleKeyDown}
          tabIndex={0}
          role="region"
          aria-label={title || 'Recommendations carousel'}
          aria-roledescription="carousel"
          className="flex overflow-x-auto no-scrollbar snap-x snap-mandatory pb-12 pt-4 -mx-4 px-4 md:-mx-12 md:px-12 scroll-smooth focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
          style={{ gap }}
        >
          {items.map((item, idx) => (
            <div
              key={item._id || item.id || idx}
              role="group"
              aria-roledescription="slide"
              aria-label={`${idx + 1} of ${items.length}`}
              className="snap-start flex-shrink-0"
              style={{ width: itemMinWidth }}
            >
              {renderItem ? (
                renderItem(item, idx)
              ) : (
                <ProductCard
                  {...item}
                  id={item.id || item._id}
                  imageSrc={item.imageSrc || item.image}
                  price={item.price || item.basePrice}
                />
              )}
            </div>
          ))}
          {/* Trailing space for smooth overscroll */}
          <div className="flex-shrink-0 w-4 md:w-12 snap-end" aria-hidden="true" />
        </div>
      </div>

      {/* Mobile View All CTA */}
      {viewAllLink && (
        <div className="md:hidden mt-2 flex justify-center px-4">
          <Link
            to={viewAllLink}
            className="w-full py-4 bg-transparent border border-black/15 text-on-surface rounded-full font-label text-[11px] uppercase tracking-[0.2em] font-bold hover:bg-black/5 flex items-center justify-center gap-3 transition-colors"
          >
            {viewAllLabel}
            <span className="material-symbols-outlined text-[16px]">east</span>
          </Link>
        </div>
      )}
    </div>
  );
}

export default RecommendationCarousel;
