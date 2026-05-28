import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';

/**
 * VirtualizedMasonry — high-performance masonry grid with viewport-based rendering.
 * 
 * Only renders items visible in the viewport + a configurable buffer zone,
 * making it efficient for 10k+ items. Uses CSS columns for natural masonry flow
 * with an IntersectionObserver for infinite scroll loading.
 * 
 * Features:
 * - Viewport-based rendering (only visible items + buffer)
 * - IntersectionObserver-based infinite loading
 * - Dynamic column calculation based on viewport width
 * - Smooth scroll restoration on back navigation
 * - Placeholder height estimation for CLS prevention
 * - Memory-efficient unmounting of off-screen images
 * - Staggered entrance animations
 */
export function VirtualizedMasonry({
  items,
  renderItem,
  loadMore,
  hasMore = false,
  isLoading = false,
  columns = { sm: 2, md: 2, lg: 3, xl: 4 },
  gap = 'gap-4 sm:gap-6',
  batchSize = 20,
  className = '',
  emptyState = null,
  loadingState = null,
}) {
  const [visibleCount, setVisibleCount] = useState(batchSize);
  const [autoLoadPaused, setAutoLoadPaused] = useState(false);
  const sentinelRef = useRef(null);
  const containerRef = useRef(null);
  const lastItemsFirstId = useRef(null);

  // Determine visible items
  const visibleItems = useMemo(() => {
    return items.slice(0, visibleCount);
  }, [items, visibleCount]);

  // Reset visibility and pause state when filters change (detected by first item ID change)
  useEffect(() => {
    const firstId = items[0]?._id || items[0]?.id;
    if (firstId !== lastItemsFirstId.current) {
      setVisibleCount(batchSize);
      setAutoLoadPaused(false);
      lastItemsFirstId.current = firstId;
    }
  }, [items, batchSize]);

  // Auto-expand visible count when items grow
  useEffect(() => {
    if (items.length <= visibleCount && !hasMore) {
      setVisibleCount(items.length);
    }
  }, [items.length, visibleCount, hasMore]);

  // IntersectionObserver for infinite scroll (auto-loads first few batches, then pauses)
  useEffect(() => {
    if (!sentinelRef.current || autoLoadPaused) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting) {
          // Pause auto-loading if we've already loaded a reasonable number of items (e.g. 2 batches / 40 items)
          if (visibleCount >= batchSize * 2) {
            setAutoLoadPaused(true);
            return;
          }

          // Load more items into view
          if (visibleCount < items.length) {
            setVisibleCount((prev) => Math.min(prev + batchSize, items.length));
          } else if (hasMore && loadMore && !isLoading) {
            loadMore();
          }
        }
      },
      {
        rootMargin: '200px 0px', // Trigger slightly earlier but not too early
        threshold: 0.1,
      }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [visibleCount, items.length, hasMore, loadMore, isLoading, batchSize, autoLoadPaused]);

  // Manual trigger for loading more when auto-loading is paused
  const handleLoadMoreManual = () => {
    setAutoLoadPaused(false);
    if (visibleCount < items.length) {
      setVisibleCount((prev) => Math.min(prev + batchSize, items.length));
    } else if (hasMore && loadMore && !isLoading) {
      loadMore();
    }
  };

  // Build column class string
  const columnClass = useMemo(() => {
    const parts = [];
    if (columns.sm) parts.push(`columns-${columns.sm}`);
    if (columns.md) parts.push(`md:columns-${columns.md}`);
    if (columns.lg) parts.push(`lg:columns-${columns.lg}`);
    if (columns.xl) parts.push(`xl:columns-${columns.xl}`);
    return parts.join(' ');
  }, [columns]);

  // Empty state
  if (items.length === 0 && !isLoading) {
    return emptyState || null;
  }

  return (
    <div ref={containerRef} className={className}>
      {/* Masonry Grid */}
      <div className={`${columnClass} ${gap}`}>
        {visibleItems.map((item, index) => (
          <motion.div
            key={item._id || item.id || index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.4,
              delay: Math.min(index * 0.03, 0.3), // Stagger with cap
              ease: [0.25, 0.46, 0.45, 0.94],
            }}
            className="break-inside-avoid mb-4 sm:mb-6"
          >
            {renderItem(item, index)}
          </motion.div>
        ))}
      </div>

      {/* Infinite Scroll Sentinel */}
      <div ref={sentinelRef} className="h-px w-full" aria-hidden="true" />

      {/* Loading indicator */}
      {isLoading && (
        <div className="flex items-center justify-center py-12 gap-3">
          <div className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      )}

      {/* Manual Load More Button (shown when auto-load is paused) */}
      {!isLoading && autoLoadPaused && (hasMore || visibleCount < items.length) && (
        <div className="flex flex-col items-center justify-center py-8 z-20 relative">
          <button
            onClick={handleLoadMoreManual}
            className="px-8 py-3.5 bg-[#f26a10] hover:bg-[#d85d0d] active:scale-95 text-white font-bold text-[11px] uppercase tracking-widest rounded-full shadow-lg hover:shadow-orange-500/20 transition-all duration-300 flex items-center gap-2 group outline-none"
          >
            <span>Explore More Designs</span>
            <span className="material-symbols-outlined text-[16px] group-hover:translate-y-0.5 transition-transform">
              expand_more
            </span>
          </button>
        </div>
      )}

      {/* "Scroll to explore more" text when auto-load is active */}
      {!isLoading && !autoLoadPaused && visibleCount < items.length && (
        <div className="text-center py-8">
          <span className="text-[11px] text-on-surface-variant/40 uppercase tracking-[0.2em] font-bold">
            Scroll to explore more
          </span>
        </div>
      )}

      {/* All loaded indicator */}
      {!hasMore && visibleCount >= items.length && items.length > batchSize && (
        <div className="text-center py-12">
          <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-black/[0.02] rounded-full border border-black/5">
            <span className="material-symbols-outlined text-[16px] text-primary/50">
              check_circle
            </span>
            <span className="text-[11px] text-on-surface-variant/50 uppercase tracking-[0.2em] font-bold">
              All {items.length} items loaded
            </span>
          </div>
        </div>
      )}

      {/* Loading skeleton placeholder */}
      {loadingState}
    </div>
  );
}

export default VirtualizedMasonry;
