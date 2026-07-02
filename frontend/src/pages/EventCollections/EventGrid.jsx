import React from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Skeleton, OptimizedImage, Pagination } from '../../components/ui';
import { handleImageError } from '../../utils/media/imageUtils';

export function EventGrid({
  isLoading,
  filteredEvents,
  paginatedEvents,
  currentPage,
  totalPages,
  setCurrentPage,
  setSearchParams,
  clearAllFilters,
  activeCategory,
  searchQuery,
  filters,
}) {
  return (
    <AnimatePresence mode="wait">
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-3 gap-x-4 lg:gap-x-8 gap-y-8 lg:gap-y-12">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex flex-col group">
              <div className="relative aspect-[4/3] lg:aspect-[3/2] w-full mb-3 lg:mb-4 bg-surface rounded-[16px] lg:rounded-[32px] border border-black/5 overflow-hidden shadow-sm">
                <Skeleton className="absolute inset-0 w-full h-full !rounded-none" />
              </div>
              <div className="flex flex-col flex-1 py-1">
                <div className="mb-2 lg:mb-4 space-y-2">
                  <Skeleton className="h-2 lg:h-2.5 w-16 lg:w-24 rounded-full" />
                  <Skeleton className="h-4 lg:h-6 w-[80%] rounded-full" />
                </div>
                <div className="flex items-center justify-between pt-2 lg:pt-4 border-t border-black/5 mt-auto">
                  <Skeleton className="h-2.5 lg:h-3 w-16 lg:w-20 rounded-full" />
                  <Skeleton className="h-2.5 lg:h-3 w-12 lg:w-16 rounded-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredEvents.length > 0 ? (
        <>
          <motion.div
            key={`${activeCategory}-${searchQuery}-${JSON.stringify(filters)}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-3 gap-x-4 lg:gap-x-8 gap-y-8 lg:gap-y-12"
          >
            {paginatedEvents.map((evItem, idx) => (
              <EventGridCard key={evItem.id} evItem={evItem} idx={idx} />
            ))}
          </motion.div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-16 text-center">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={(page) => {
                  setSearchParams((prev) => {
                    const params = new URLSearchParams(prev);
                    if (page === 1) {
                      params.delete('page');
                    } else {
                      params.set('page', String(page));
                    }
                    return params;
                  });
                  setCurrentPage(page);
                  setTimeout(() => {
                    const el = document.getElementById('event-collection');
                    if (el) {
                      const y = el.getBoundingClientRect().top + window.scrollY - 80;
                      window.scrollTo({ top: y, behavior: 'smooth' });
                    }
                  }, 50);
                }}
              />
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-32 lg:py-48 bg-surface-container-low/30 rounded-[40px] border border-dashed border-outline-variant/30 px-6">
          <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-8 shadow-luxury/5 border border-black/5">
            <span className="material-symbols-outlined text-[40px] text-on-surface-variant/20">
              search_off
            </span>
          </div>
          <h3 className="font-headline-sm text-on-surface mb-3">No curations match.</h3>
          <button onClick={clearAllFilters} className="btn-primary">
            Clear All Filters
          </button>
        </div>
      )}
    </AnimatePresence>
  );
}

function EventGridCard({ evItem, idx }) {
  const [activeIndex, setActiveIndex] = React.useState(0);
  const scrollContainerRef = React.useRef(null);

  const availableImages =
    evItem.images && evItem.images.length > 0 ? evItem.images : [evItem.image].filter(Boolean);

  const handleScroll = (e) => {
    if (!e.target) return;
    const scrollLeft = e.target.scrollLeft;
    const width = e.target.offsetWidth;
    if (width > 0) {
      const newIndex = Math.round(scrollLeft / width);
      if (newIndex !== activeIndex) {
        setActiveIndex(newIndex);
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.05 }}
      className="group transition-all duration-500 flex flex-col cursor-pointer"
    >
      {/* Visual Canvas */}
      <div className="relative aspect-[4/3] lg:aspect-[3/2] overflow-hidden rounded-[16px] lg:rounded-[32px] border border-black/5 group/canvas">
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex w-full h-full overflow-x-auto snap-x snap-mandatory no-scrollbar scroll-smooth"
        >
          {availableImages.map((img, i) => (
            <div key={i} className="w-full h-full flex-shrink-0 snap-center relative">
              <Link to={`/events/${evItem.id}`} className="block w-full h-full">
                <OptimizedImage
                  onError={handleImageError}
                  src={img || ''}
                  alt={`${evItem.title} - view ${i + 1}`}
                  width={360}
                  height={240}
                  className="w-full h-full object-cover transition-transform duration-[1.5s] ease-out group-hover/canvas:scale-105"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
              </Link>
            </div>
          ))}
        </div>

        <Link to={`/events/${evItem.id}`} className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-40 lg:group-hover/canvas:opacity-60 transition-opacity" />
        </Link>

        {availableImages.length > 1 && (
          <div className="absolute bottom-3 left-3 lg:bottom-4 lg:left-4 flex items-center gap-1.5 z-10 pointer-events-none">
            {availableImages.map((_, i) => (
              <div
                key={i}
                className={`transition-all duration-300 rounded-full shadow-md border border-black/10 ${
                  i === activeIndex
                    ? 'w-2 h-2 lg:w-2.5 lg:h-2.5 bg-white'
                    : 'w-1.5 h-1.5 lg:w-2 lg:h-2 bg-white/60'
                }`}
              />
            ))}
          </div>
        )}

        <div className="absolute top-2 lg:top-4 left-2 lg:left-4 z-10 pointer-events-none">
          <span className="bg-white/90 backdrop-blur-md text-black px-1.5 lg:px-3 py-0.5 lg:py-1 rounded-full font-label-sm text-[6px] lg:text-[9px] uppercase tracking-widest font-bold shadow-sm">
            {evItem.category}
          </span>
        </div>
      </div>

      {/* Content Section */}
      <Link to={`/events/${evItem.id}`} className="py-3 lg:py-4 flex flex-col flex-1 block">
        <div className="mb-2 lg:mb-4">
          <span className="font-label-sm text-[8px] lg:text-[9px] text-primary uppercase tracking-[0.2em] lg:tracking-[0.3em] font-bold mb-0.5 lg:mb-1 block">
            {evItem.subtitle}
          </span>
          <h3 className="font-display text-[14px] lg:text-[24px] text-black font-normal leading-tight lg:group-hover:text-primary transition-colors">
            {evItem.title}
          </h3>
        </div>

        <div className="flex items-center justify-between pt-2 lg:pt-4 border-t border-black/5 mt-auto">
          <div className="flex items-center gap-1.5 lg:gap-3">
            <div className="flex items-center gap-1 text-black/40 font-label-sm text-[8px] lg:text-[9px] uppercase tracking-widest font-bold">
              <span className="material-symbols-outlined text-[10px] lg:text-[14px]">palette</span>
              <span className="truncate max-w-[60px] lg:max-w-none">
                {evItem.style || 'Traditional'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 font-label-sm text-[8px] lg:text-[10px] uppercase tracking-widest font-bold text-black group-hover:text-primary transition-colors group/btn">
            <span className="hidden lg:inline">Details</span>
            <span className="material-symbols-outlined text-[12px] lg:text-[14px] group-hover/btn:translate-x-1 transition-transform">
              arrow_forward
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
