import { BadgeCheck, ArrowRight, X, ChevronLeft, ChevronRight } from 'lucide-react';
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { reviewService } from '../../services/domainServices';
import { getProductRoute } from '../../utils/ecommerce/productRouteUtils';

// Helper Star Component for the popover
function StarRating({ value = 0, size = 12 }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => {
        const filled = i < Math.round(value);
        return (
          <svg
            key={i}
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill={filled ? '#D4A853' : 'none'}
            stroke={filled ? '#D4A853' : '#d1c4a8'}
            strokeWidth="1.5"
          >
            <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
          </svg>
        );
      })}
    </div>
  );
}

export function DynamicRatingBadge({
  itemId,
  itemType = 'product', // 'product' or 'event' (showcase)
  initialRating = 0,
  initialReviews = 0,
  compact = false,
  className = '',
}) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [reviewsData, setReviewsData] = useState([]);
  const [hasFetched, setHasFetched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const wrapperRef = useRef(null);
  const popoverRef = useRef(null);
  const reviewsScrollRef = useRef(null);
  const [activeReviewIdx, setActiveReviewIdx] = useState(0);
  const [placement, setPlacement] = useState('above');
  const [popoverStyle, setPopoverStyle] = useState({
    position: 'fixed',
    left: '16px',
    top: '16px',
    width: '295px',
    zIndex: 999999,
  });
  const [arrowStyle, setArrowStyle] = useState({ left: '50%', transform: 'translateX(-50%)' });

  const calculatePosition = useCallback(() => {
    if (!wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    const popoverWidth = window.innerWidth < 640 ? Math.min(window.innerWidth - 32, 290) : 295;
    const padding = 16;

    // Ideal center position (relative to viewport)
    const idealCenter = rect.left + rect.width / 2;

    // Calculate left position of the popover (relative to viewport)
    let popoverLeft = idealCenter - popoverWidth / 2;

    // Constrain to viewport edges
    if (popoverLeft < padding) {
      popoverLeft = padding;
    } else if (popoverLeft + popoverWidth > window.innerWidth - padding) {
      popoverLeft = window.innerWidth - padding - popoverWidth;
    }

    // Determine vertical placement:
    // Estimated popover height is ~270px.
    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom;
    const placeAbove = spaceAbove >= 260 || spaceBelow < 270;
    setPlacement(placeAbove ? 'above' : 'below');

    const style = {
      position: 'fixed',
      left: `${Math.round(popoverLeft)}px`,
      width: `${popoverWidth}px`,
      zIndex: 999999,
    };

    if (placeAbove) {
      style.bottom = `${Math.max(8, Math.round(window.innerHeight - rect.top + 8))}px`;
      style.top = 'auto';
    } else {
      style.top = `${Math.max(8, Math.round(rect.bottom + 8))}px`;
      style.bottom = 'auto';
    }

    setPopoverStyle(style);

    // Arrow pointing to the center of the badge
    const arrowLeft = idealCenter - popoverLeft;
    const clampedArrowLeft = Math.max(16, Math.min(arrowLeft, popoverWidth - 16));
    setArrowStyle({
      left: `${Math.round(clampedArrowLeft)}px`,
      transform: 'translateX(-50%)',
    });
  }, []);

  // Recalculate on resize and handle window scroll / escape key
  useEffect(() => {
    if (!isOpen) return;

    calculatePosition();

    const handleResize = () => {
      calculatePosition();
    };

    const handleScroll = (e) => {
      if (popoverRef.current && popoverRef.current.contains(e.target)) {
        return;
      }
      setIsOpen(false);
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, { passive: true });
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, calculatePosition]);

  // Get reviews that have content (comment or photos)
  const visibleReviews = useMemo(() => {
    const list = reviewsData.filter(
      (r) =>
        (r.comment && r.comment.trim().length > 0) ||
        (r.images && r.images.length > 0) ||
        (r.reviewImages && r.reviewImages.length > 0),
    );
    return list.length > 0 ? list : reviewsData;
  }, [reviewsData]);

  // Fetch reviews exactly like the PDP does
  const fetchReviews = async () => {
    if (hasFetched || isLoading) return;
    setIsLoading(true);
    try {
      let res;
      if (itemType === 'event') {
        res = await reviewService.getShowcaseReviews(itemId, { page: 1, limit: 10 });
      } else {
        res = await reviewService.getProductReviews(itemId, { page: 1, limit: 10 });
      }

      if (res && res.success) {
        const data = res.data;
        setReviewsData(data.items || data.data || data || []);
      }
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
    } finally {
      setIsLoading(false);
      setHasFetched(true);
    }
  };

  const handleNavigateToReviews = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(false);
    const route = getProductRoute(itemType, itemId);
    navigate(`${route}#reviews-section`);
  };

  const handleBadgeClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOpen) {
      setIsOpen(false);
    } else {
      calculatePosition();
      setIsOpen(true);
      if (!hasFetched) fetchReviews();
    }
  };

  // Calculate distribution exactly like PDP
  const avgRating = reviewsData.length
    ? reviewsData.reduce((s, r) => s + r.rating, 0) / reviewsData.length
    : initialRating;
  const ratingCounts = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviewsData.filter((r) => Math.round(r.rating) === star).length,
  }));

  const handleReviewsScroll = (direction) => {
    if (reviewsScrollRef.current) {
      const container = reviewsScrollRef.current;
      const scrollAmount = container.clientWidth;
      container.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  const onReviewsContainerScroll = () => {
    if (reviewsScrollRef.current) {
      const container = reviewsScrollRef.current;
      if (container.clientWidth > 0) {
        const idx = Math.round(container.scrollLeft / container.clientWidth);
        setActiveReviewIdx(idx);
      }
    }
  };

  if (!initialReviews || initialReviews === 0) {
    return null;
  }

  return (
    <>
      <div ref={wrapperRef} className={`relative inline-flex items-center ${className}`}>
        {/* The visible Badge Trigger */}
        <button
          type="button"
          onClick={handleBadgeClick}
          className="min-h-0 h-auto p-0 m-0 border-0 bg-transparent flex items-center gap-0.5 shrink-0 cursor-pointer group text-left focus:outline-none leading-none"
          style={{ minHeight: 'unset', height: 'auto' }}
          aria-label={`Rating: ${Number(initialRating).toFixed(1)} out of 5 stars from ${initialReviews} reviews. Click to see details.`}
          aria-expanded={isOpen}
        >
          <span
            className={`material-symbols-outlined ${compact ? 'text-[9px]' : 'text-[10px] lg:text-[11px]'} text-primary group-hover:scale-110 transition-transform`}
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            star
          </span>
          <span
            className={`font-label ${compact ? 'text-[9px]' : 'text-[10px] lg:text-[11px]'} text-black/60 font-bold group-hover:text-primary transition-colors inline-flex items-center gap-0.5`}
          >
            {initialReviews === 0 ? (
              'New'
            ) : (
              <>
                <span>{Number(initialRating).toFixed(1)}</span>
                <span className="text-black/30 font-normal mx-0.5">·</span>
                <span className="text-black/40 font-medium">{initialReviews}</span>
              </>
            )}
          </span>
        </button>
      </div>

      {/* Popover rendered into document.body to overlay solidly on front of everything */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {isOpen && initialReviews > 0 && (
              <>
                {/* Fullscreen Backdrop to catch outside clicks and prevent card click-through */}
                <motion.div
                  key="rating-backdrop"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="fixed inset-0 z-[999998] bg-black/25 backdrop-blur-[1px]"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsOpen(false);
                  }}
                />

                <motion.div
                  ref={popoverRef}
                  key="rating-popover"
                  initial={{ opacity: 0, y: placement === 'above' ? 8 : -8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: placement === 'above' ? 8 : -8, scale: 0.96 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  style={popoverStyle}
                  className="fixed bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.25)] border border-black/10 p-4 cursor-default pointer-events-auto z-[999999] max-h-[calc(100vh-32px)] overflow-y-auto no-scrollbar"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                >
                  {/* Popover Arrow */}
                  <div
                    style={arrowStyle}
                    className={`absolute border-4 border-transparent ${
                      placement === 'above'
                        ? 'top-full -mt-0.5 border-t-white'
                        : 'bottom-full -mb-0.5 border-b-white'
                    }`}
                  />

                  {isLoading ? (
                    <div className="flex flex-col gap-2 animate-pulse">
                      <div className="h-4 bg-neutral-100 rounded w-1/2 mx-auto" />
                      <div className="h-16 bg-neutral-100 rounded w-full" />
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {/* Header Stats */}
                      <div className="flex items-start justify-between">
                        <div className="flex flex-col">
                          <span className="font-display text-2xl font-bold text-black leading-none">
                            {avgRating.toFixed(1)}
                          </span>
                          <div className="mt-1">
                            <StarRating value={avgRating} />
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-label text-[10px] uppercase tracking-wider text-black/40 font-bold">
                            {initialReviews} Review{initialReviews !== 1 ? 's' : ''}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setIsOpen(false);
                            }}
                            className="w-5 h-5 rounded-full flex items-center justify-center text-black/40 hover:text-black hover:bg-black/5 transition-colors cursor-pointer"
                            aria-label="Close review details"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Distribution Bars */}
                      <div className="flex flex-col gap-1 w-full">
                        {ratingCounts.map(({ star, count }) => {
                          const pct = reviewsData.length
                            ? Math.round((count / reviewsData.length) * 100)
                            : 0;
                          return (
                            <div key={star} className="flex items-center gap-1.5 w-full">
                              <span className="font-label text-[9px] font-bold text-black/50 w-2 shrink-0">
                                {star}
                              </span>
                              <div className="flex-1 h-1 bg-neutral-100 rounded-full overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${pct}%` }}
                                  transition={{ duration: 0.4 }}
                                  className="h-full bg-[#D4A853] rounded-full"
                                />
                              </div>
                              <span className="font-label text-[8px] text-black/30 w-5 text-right">
                                {pct}%
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Scrollable Reviews Section */}
                      {visibleReviews.length > 0 && (
                        <div className="space-y-1.5">
                          {visibleReviews.length > 1 && (
                            <div className="flex items-center justify-between px-0.5 text-[9px] uppercase tracking-wider text-black/50 font-bold">
                              <span>
                                Reviews ({Math.min(activeReviewIdx + 1, visibleReviews.length)} of{' '}
                                {visibleReviews.length})
                              </span>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleReviewsScroll('left')}
                                  disabled={activeReviewIdx === 0}
                                  className="w-5 h-5 rounded-full border border-black/10 flex items-center justify-center hover:bg-black/5 disabled:opacity-25 disabled:pointer-events-none transition-all cursor-pointer text-black/70"
                                  aria-label="Previous review"
                                >
                                  <ChevronLeft size={11} strokeWidth={2} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleReviewsScroll('right')}
                                  disabled={activeReviewIdx >= visibleReviews.length - 1}
                                  className="w-5 h-5 rounded-full border border-black/10 flex items-center justify-center hover:bg-black/5 disabled:opacity-25 disabled:pointer-events-none transition-all cursor-pointer text-black/70"
                                  aria-label="Next review"
                                >
                                  <ChevronRight size={11} strokeWidth={2} />
                                </button>
                              </div>
                            </div>
                          )}

                          <div
                            ref={reviewsScrollRef}
                            onScroll={onReviewsContainerScroll}
                            className="flex gap-2 overflow-x-auto snap-x snap-mandatory no-scrollbar w-full"
                          >
                            {visibleReviews.map((rev, idx) => {
                              const rImages = rev.images || rev.reviewImages || [];
                              const reviewerName =
                                rev.customer?.name || rev.customerName || 'Customer';
                              return (
                                <div
                                  key={rev._id || idx}
                                  className="w-full shrink-0 snap-start bg-neutral-50 rounded-xl p-2.5 border border-black/5 flex flex-col justify-between"
                                >
                                  <div>
                                    <div className="flex items-center justify-between gap-1.5 mb-1">
                                      <div className="flex items-center gap-1.5 min-w-0">
                                        <span className="font-body text-[11px] font-semibold text-black truncate">
                                          {reviewerName}
                                        </span>
                                        {rev.verified && (
                                          <span className="inline-flex items-center gap-0.5 text-[7px] font-semibold text-emerald-700 uppercase tracking-wider bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200/50 shrink-0">
                                            <BadgeCheck
                                              className="w-2.5 h-2.5 text-emerald-600"
                                              strokeWidth={2}
                                            />
                                          </span>
                                        )}
                                      </div>
                                      {rev.rating > 0 && <StarRating value={rev.rating} size={9} />}
                                    </div>

                                    {rev.comment && (
                                      <p className="font-body text-[10px] text-black/75 leading-relaxed line-clamp-2 italic">
                                        "{rev.comment}"
                                      </p>
                                    )}
                                  </div>

                                  {/* Review Images */}
                                  {rImages.length > 0 && (
                                    <div className="flex items-center gap-1.5 mt-2 pt-1.5 border-t border-black/5">
                                      {rImages.slice(0, 3).map((imgItem, imgIdx) => {
                                        const url =
                                          typeof imgItem === 'string'
                                            ? imgItem
                                            : imgItem.secureUrl || imgItem.url;
                                        if (!url) return null;
                                        return (
                                          <div
                                            key={imgIdx}
                                            className="w-9 h-9 rounded-lg overflow-hidden border border-black/5 bg-white shadow-3xs shrink-0"
                                          >
                                            <img
                                              src={url}
                                              alt=""
                                              className="w-full h-full object-cover"
                                              loading="lazy"
                                            />
                                          </div>
                                        );
                                      })}
                                      {rImages.length > 3 && (
                                        <span className="text-[8px] font-bold text-black/50 bg-black/5 px-1.5 py-1 rounded-md">
                                          +{rImages.length - 3}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Action */}
                      <button
                        type="button"
                        onClick={handleNavigateToReviews}
                        className="w-full py-2 bg-black hover:bg-neutral-800 text-white font-label text-[9px] uppercase tracking-widest font-bold rounded-lg transition-colors mt-1 flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        Read All Reviews
                        <ArrowRight className="text-[12px]" strokeWidth={1.5} />
                      </button>
                    </div>
                  )}
                </motion.div>
              </>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}
