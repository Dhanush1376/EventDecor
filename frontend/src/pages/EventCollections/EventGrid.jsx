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
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-3 gap-x-4 md:gap-x-8 gap-y-8 md:gap-y-12">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex flex-col group">
              <Skeleton className="aspect-[4/3] md:aspect-[3/2] w-full rounded-[16px] md:rounded-[32px] mb-3 md:mb-4 border border-black/5" />
              <div className="flex flex-col flex-1 py-1">
                <div className="mb-2 md:mb-4">
                  <Skeleton className="h-2 md:h-2.5 w-16 md:w-24 mb-1.5 md:mb-2.5 rounded-full" />
                  <Skeleton className="h-4 md:h-6 w-3/4 rounded-full" />
                </div>
                <div className="flex items-center justify-between pt-2 md:pt-4 border-t border-black/5 mt-auto">
                  <div className="flex items-center gap-1.5 md:gap-3">
                    <Skeleton className="h-2.5 md:h-3 w-16 md:w-20 rounded-full" />
                  </div>
                  <Skeleton className="h-2.5 md:h-3 w-12 md:w-16 rounded-full" />
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
            className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-3 gap-x-4 md:gap-x-8 gap-y-8 md:gap-y-12"
          >
            {paginatedEvents.map((evItem, idx) => (
              <motion.div
                key={evItem.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="group transition-all duration-500 flex flex-col cursor-pointer"
              >
                {/* Visual Canvas */}
                <Link
                  to={`/events/${evItem.id}`}
                  className="relative aspect-[4/3] md:aspect-[3/2] overflow-hidden block rounded-[16px] md:rounded-[32px] border border-black/5"
                >
                  <OptimizedImage
                    onError={handleImageError}
                    src={evItem.image}
                    alt={evItem.title}
                    width={360}
                    height={240}
                    className="w-full h-full object-cover transition-transform duration-[1.5s] ease-out group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-40 md:group-hover:opacity-60 transition-opacity" />

                  <div className="absolute top-2 md:top-4 left-2 md:left-4">
                    <span className="bg-white/90 backdrop-blur-md text-black px-1.5 md:px-3 py-0.5 md:py-1 rounded-full font-label-sm text-[6px] md:text-[9px] uppercase tracking-widest font-bold shadow-sm">
                      {evItem.category}
                    </span>
                  </div>
                </Link>

                {/* Content Section */}
                <div className="py-3 md:py-4 flex flex-col flex-1">
                  <div className="mb-2 md:mb-4">
                    <span className="font-label-sm text-[8px] md:text-[9px] text-primary uppercase tracking-[0.2em] md:tracking-[0.3em] font-bold mb-0.5 md:mb-1 block">
                      {evItem.subtitle}
                    </span>
                    <h3 className="font-display text-[14px] md:text-[24px] text-black font-normal leading-tight md:group-hover:text-primary transition-colors">
                      {evItem.title}
                    </h3>
                  </div>

                  <div className="flex items-center justify-between pt-2 md:pt-4 border-t border-black/5 mt-auto">
                    <div className="flex items-center gap-1.5 md:gap-3">
                      <div className="flex items-center gap-1 text-black/40 font-label-sm text-[8px] md:text-[9px] uppercase tracking-widest font-bold">
                        <span className="material-symbols-outlined text-[10px] md:text-[14px]">
                          palette
                        </span>
                        <span className="truncate max-w-[60px] md:max-w-none">
                          {evItem.style || 'Traditional'}
                        </span>
                      </div>
                    </div>

                    <Link
                      to={`/events/${evItem.id}`}
                      className="flex items-center gap-1 font-label-sm text-[8px] md:text-[10px] uppercase tracking-widest font-bold text-black hover:text-primary transition-colors group/btn"
                    >
                      <span className="hidden md:inline">Details</span>
                      <span className="material-symbols-outlined text-[12px] md:text-[14px] group-hover/btn:translate-x-1 transition-transform">
                        arrow_forward
                      </span>
                    </Link>
                  </div>
                </div>
              </motion.div>
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
        <div className="text-center py-32 md:py-48 bg-surface-container-low/30 rounded-[40px] border border-dashed border-outline-variant/30 px-6">
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
