import { useRef, useState, useEffect } from 'react';

/**
 * Horizontal scroll container with snap scrolling and fade-edge indicators.
 */
export function CarouselWrapper({ children, className = '', gap = '14px' }) {
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (el) {
      el.addEventListener('scroll', checkScroll, { passive: true });
      window.addEventListener('resize', checkScroll);
    }
    return () => {
      if (el) el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, []);

  const _scroll = (direction) => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.7;
    el.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' });
  };

  return (
    <div className={`h1-scroll-container ${className}`}>
      {/* Fade edges */}
      {canScrollLeft && (
        <div className="h1-scroll-container__fade h1-scroll-container__fade--left" />
      )}
      {canScrollRight && (
        <div className="h1-scroll-container__fade h1-scroll-container__fade--right" />
      )}

      <div ref={scrollRef} className="h1-scroll-container__track" style={{ gap }}>
        {children}
      </div>
    </div>
  );
}
