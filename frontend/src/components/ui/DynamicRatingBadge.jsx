import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  const [isHovered, setIsHovered] = useState(false);
  const [reviewsData, setReviewsData] = useState([]);
  const [hasFetched, setHasFetched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const hideTimeoutRef = useRef(null);
  const wrapperRef = useRef(null);
  const [popoverStyle, setPopoverStyle] = useState({ left: '50%', transform: 'translateX(-50%)' });
  const [arrowStyle, setArrowStyle] = useState({ left: '50%', transform: 'translateX(-50%)' });

  const calculatePosition = () => {
    if (!wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    const popoverWidth = window.innerWidth < 640 ? 250 : 256; // roughly w-64
    const padding = 16;

    // Ideal center position (relative to viewport)
    let idealCenter = rect.left + rect.width / 2;

    // Calculate the left position of the popover (relative to viewport)
    let popoverLeft = idealCenter - popoverWidth / 2;

    // Constrain to viewport
    if (popoverLeft < padding) {
      popoverLeft = padding;
    } else if (popoverLeft + popoverWidth > window.innerWidth - padding) {
      popoverLeft = window.innerWidth - padding - popoverWidth;
    }

    // Relative offset from wrapper
    const relativeLeft = popoverLeft - rect.left;

    setPopoverStyle({
      left: `${relativeLeft}px`,
      transform: 'none',
      width: `${popoverWidth}px`,
    });

    // Arrow should point to the center of the badge
    const arrowLeft = idealCenter - popoverLeft;
    setArrowStyle({
      left: `${arrowLeft}px`,
      transform: 'translateX(-50%)',
    });
  };

  if (!initialReviews || initialReviews === 0) {
    return null;
  }

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

      if (res.success) {
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

  const handleMouseEnter = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }
    calculatePosition();
    setIsHovered(true);
    if (!hasFetched) {
      fetchReviews();
    }
  };

  const handleMouseLeave = () => {
    hideTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 150);
  };

  const handleNavigateToReviews = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const route = getProductRoute(itemType, itemId);
    navigate(`${route}#reviews-section`);
  };

  const handleBadgeClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.innerWidth < 1024) {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
      calculatePosition();
      setIsHovered(true);
      if (!hasFetched) fetchReviews();
    } else {
      handleNavigateToReviews(e);
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

  // Find the most helpful or first comment
  const topReview = [...reviewsData]
    .sort((a, b) => (b.helpfulCount || 0) - (a.helpfulCount || 0))
    .find((r) => r.comment && r.comment.length > 10);

  return (
    <div
      ref={wrapperRef}
      className={`relative inline-flex ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* The visible Badge */}
      <div
        onClick={handleBadgeClick}
        className="flex items-center gap-0.5 shrink-0 cursor-pointer group"
      >
        <span
          className={`material-symbols-outlined ${compact ? 'text-[9px]' : 'text-[10px] lg:text-[11px]'} text-primary group-hover:scale-110 transition-transform`}
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          star
        </span>
        <span
          className={`font-label ${compact ? 'text-[9px]' : 'text-[10px] lg:text-[11px]'} text-black/60 font-bold group-hover:text-primary transition-colors`}
        >
          {initialReviews === 0 ? 'New' : `${Number(initialRating).toFixed(1)} (${initialReviews})`}
        </span>
      </div>

      {/* Popover */}
      <AnimatePresence>
        {isHovered && initialReviews > 0 && (
          <>
            {/* Mobile Backdrop */}
            <div
              className="fixed inset-0 z-[90] lg:hidden"
              onClick={(e) => {
                e.stopPropagation();
                setIsHovered(false);
              }}
            />
            <motion.div
              initial={{ opacity: 0, y: 5, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 5, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              style={popoverStyle}
              className="absolute bottom-full mb-2 bg-white rounded-2xl shadow-luxury border border-black/5 p-4 cursor-default pointer-events-auto z-[100]"
              onClick={(e) => e.stopPropagation()} // prevent clicking through to card
            >
              {/* Popover Arrow */}
              <div
                style={arrowStyle}
                className="absolute top-full -mt-1 border-4 border-transparent border-t-white"
              />

              {isLoading ? (
                <div className="flex flex-col gap-2 animate-pulse">
                  <div className="h-4 bg-neutral-100 rounded w-1/2 mx-auto" />
                  <div className="h-16 bg-neutral-100 rounded w-full" />
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {/* Header Stats */}
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="font-display text-2xl font-bold text-black leading-none">
                        {avgRating.toFixed(1)}
                      </span>
                      <StarRating value={avgRating} />
                    </div>
                    <div className="text-right flex flex-col">
                      <span className="font-label text-[10px] uppercase tracking-wider text-black/40 font-bold">
                        {initialReviews} Review{initialReviews !== 1 ? 's' : ''}
                      </span>
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

                  {/* Top Review Snippet */}
                  {topReview && (
                    <div className="bg-neutral-50 rounded-lg p-2.5 border border-black/5">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="font-body text-[10px] font-semibold text-black">
                          {topReview.customer?.name || topReview.customerName || 'Customer'}
                        </span>
                        {topReview.verified && (
                          <span className="material-symbols-outlined text-[10px] text-green-600">
                            verified
                          </span>
                        )}
                      </div>
                      <p className="font-body text-[10px] text-black/70 leading-relaxed line-clamp-2 italic">
                        "{topReview.comment}"
                      </p>
                    </div>
                  )}

                  {/* Action */}
                  <button
                    onClick={handleNavigateToReviews}
                    className="w-full py-2 bg-black hover:bg-neutral-800 text-white font-label text-[9px] uppercase tracking-widest font-bold rounded-lg transition-colors mt-1 flex items-center justify-center gap-1.5"
                  >
                    Read All Reviews
                    <span className="material-symbols-outlined text-[12px]">arrow_forward</span>
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
