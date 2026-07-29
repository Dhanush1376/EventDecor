import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  FilterPanel,
  Pagination,
  CategoryTabs,
  CloudinaryImage,
  EmptyState,
  ErrorState,
} from '../../components/ui';
import { ProductCard } from '../../components/shared/ProductCard';
import { MandalaArtDecor } from '../../components/ui/MandalaArtDecor';

export const ProductListingGrid = React.memo(
  ({
    filterGroups,
    filters,
    toggleFilter,
    setFilterValue,
    clearAllFilters,
    isFilterOpen,
    setIsFilterOpen,
    sortBy,
    setSortBy,
    totalCount,
    categories,
    categoryParam,
    handleCategorySelect,
    productsData,
    searchParam,
    visualSearch,
    loading,
    products,
    isFetching,
    isError,
    totalPages,
    pageParam,
    setSearchParams,
    searchParams,
    openQuickView,
    isNavbarHidden,
    navbarHeight,
  }) => {
    return (
      <main
        id="artisan-collection"
        className="max-w-max-width mx-auto px-margin-mobile lg:px-margin-desktop relative pb-8 lg:pb-24"
      >
        <MandalaArtDecor
          className="absolute -top-12 -right-10 lg:-top-16 lg:-right-12 pointer-events-none z-0"
          size={400}
          variant={1}
          opacity={0.15}
          spinDuration={120}
        />
        <div className="flex flex-col lg:flex-row gap-0 lg:gap-8 xl:gap-12">
          <aside className="w-full lg:w-64 xl:w-72 flex-shrink-0 lg:sticky lg:top-32 lg:max-h-[calc(100vh-140px)] lg:overflow-y-auto no-scrollbar pb-4">
            <FilterPanel
              filterGroups={filterGroups}
              currentFilters={filters}
              onToggleFilter={toggleFilter}
              onSetFilterValue={setFilterValue}
              onClearAll={clearAllFilters}
              isOpen={isFilterOpen}
              onClose={() => setIsFilterOpen(false)}
              sortBy={sortBy}
              onSortChange={setSortBy}
            />
          </aside>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-6 lg:mb-10">
              <div className="flex flex-col gap-1">
                <h2 className="font-headline-md text-on-surface font-normal text-[24px] lg:text-[32px]">
                  The Artisan Collection
                </h2>
                <p className="font-body-md text-on-surface-variant/60 font-medium">
                  {totalCount} unique pieces designed for you
                </p>
              </div>
            </div>

            <MobileStickyCategories
              categories={categories}
              categoryParam={categoryParam}
              handleCategorySelect={handleCategorySelect}
              isNavbarHidden={isNavbarHidden}
              navbarHeight={navbarHeight}
            />

            {productsData?.correctedQuery && (
              <div className="mb-8 px-6 py-4 bg-primary/5 text-primary rounded-[20px] border border-primary/10 text-[14px] font-medium flex items-center gap-2.5 shadow-sm">
                <span className="material-symbols-outlined text-[20px] text-primary">
                  lightbulb
                </span>
                <span>
                  Showing results for{' '}
                  <Link
                    to={`/collections?search=${encodeURIComponent(productsData.correctedQuery)}`}
                    className="font-bold underline hover:text-primary-dark"
                  >
                    {productsData.correctedQuery}
                  </Link>
                  . Search instead for{' '}
                  <Link
                    to={`/collections?search=${encodeURIComponent(searchParam)}&spellcheck=false`}
                    className="underline text-on-surface-variant/80 hover:text-on-surface"
                  >
                    {searchParam}
                  </Link>
                </span>
              </div>
            )}

            {visualSearch.results && (
              <div className="mb-8 p-5 bg-primary/5 border border-primary/10 rounded-[24px] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm animate-fade-in">
                <div className="flex items-center gap-4">
                  {visualSearch.previewUrl && (
                    <div className="relative w-16 h-16 rounded-2xl overflow-hidden border border-outline-variant/30 shadow-inner shrink-0">
                      <CloudinaryImage
                        src={visualSearch.previewUrl}
                        alt="Scanned visual query"
                        className="w-full h-full object-cover"
                        width={200}
                        sizes="160px"
                      />
                    </div>
                  )}
                  <div>
                    <h3 className="font-bold text-on-surface text-[16px] flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[18px] text-primary">
                        image_search
                      </span>
                      Visual Search Results
                    </h3>
                    <p className="text-on-surface-variant/70 text-[13px] mt-1 font-light">
                      Showing best matches from our catalog for your uploaded inspiration image.
                    </p>
                  </div>
                </div>
                <button
                  onClick={visualSearch.reset}
                  className="px-5 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-full text-[13px] font-bold transition-all shadow-md active:scale-[0.98] cursor-pointer flex items-center gap-1.5 outline-none"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                  Clear Visual Search
                </button>
              </div>
            )}

            <AnimatePresence>
              {searchParams?.get('coupon') && (
                <motion.div
                  initial={{ opacity: 0, y: -20, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.98 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className="mb-8 px-5 py-3 sm:px-6 sm:py-4 bg-emerald-50 text-emerald-800 rounded-2xl border border-emerald-200 text-[13px] sm:text-[14px] font-medium flex items-center justify-between gap-4 shadow-sm"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[18px] sm:text-[20px] text-emerald-600">
                      local_offer
                    </span>
                    <span>
                      Showing eligible items for coupon:{' '}
                      <strong className="font-bold">{searchParams.get('coupon')}</strong>
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setSearchParams((prev) => {
                        const params = new URLSearchParams(prev);
                        params.delete('coupon');
                        params.delete('collection');
                        params.delete('ids');
                        return params;
                      });
                    }}
                    className="p-1.5 shrink-0 hover:bg-emerald-100 text-emerald-600 hover:text-emerald-800 rounded-full transition-colors flex items-center justify-center cursor-pointer outline-none"
                    title="Clear Filter"
                  >
                    <span className="material-symbols-outlined text-[18px] sm:text-[20px]">
                      close
                    </span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <div id="product-results-wrapper">
              {isError ? (
                <ErrorState
                  title="Failed to load products"
                  description="We encountered a network error while fetching products. If you use an adblocker or VPN, it might be blocking the request."
                  onRetry={() => window.location.reload()}
                />
              ) : loading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-3 gap-x-2 sm:gap-x-4 lg:gap-x-8 gap-y-6 sm:gap-y-8 lg:gap-y-12">
                  {[...Array(6)].map((_, i) => (
                    <ProductCard key={i} loading={true} />
                  ))}
                </div>
              ) : products.length > 0 ? (
                <>
                  <div
                    className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-3 gap-x-2 sm:gap-x-4 lg:gap-x-8 gap-y-6 sm:gap-y-8 lg:gap-y-12 transition-opacity duration-300 ${isFetching ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}
                  >
                    {products.map((product, index) => (
                      <ProductCard
                        key={product.id || product._id}
                        {...product}
                        eager={index < 4}
                        onQuickView={openQuickView}
                      />
                    ))}
                  </div>

                  {totalPages > 1 && (
                    <div className="mt-16 text-center">
                      <span className="font-label-sm text-[11px] text-on-surface uppercase tracking-[0.3em] font-bold block mb-4">
                        Showing Page {pageParam} of {totalPages}
                      </span>
                      <Pagination
                        currentPage={pageParam}
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
                          setTimeout(() => {
                            const el = document.getElementById('artisan-collection');
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
                <EmptyState
                  title="No products found"
                  description="We currently don't have any live pieces matching these filters or category."
                  icon="filter_list_off"
                  actionLabel="Clear All Filters"
                  onAction={clearAllFilters}
                />
              )}
            </div>
          </div>
        </div>

        <MandalaArtDecor
          variant={2}
          size={700}
          className="-bottom-40 -left-40 hidden lg:block z-0"
          opacity={0.2}
          spinDuration={180}
        />
        <MandalaArtDecor
          variant={2}
          size={350}
          className="-bottom-20 -left-20 lg:hidden z-0"
          opacity={0.25}
          spinDuration={180}
        />
      </main>
    );
  },
);

const MobileStickyCategories = ({
  categories,
  categoryParam,
  handleCategorySelect,
  isNavbarHidden,
  navbarHeight,
}) => {
  const [isStuck, setIsStuck] = React.useState(false);
  const ref = React.useRef(null);

  React.useEffect(() => {
    const onScroll = () => {
      if (!ref.current) return;
      const maxThreshold = (navbarHeight || 68) + 68 + 2;
      const rect = ref.current.getBoundingClientRect();
      setIsStuck(rect.top <= maxThreshold);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [navbarHeight, isNavbarHidden]);

  return (
    <div
      ref={ref}
      className={`mb-8 overflow-x-auto no-scrollbar lg:hidden sticky z-[48] py-2 -mx-[var(--spacing-margin-mobile)] px-[var(--spacing-margin-mobile)] transition-all duration-300 ease-out ${
        isStuck
          ? 'bg-surface/95 backdrop-blur-xl shadow-sm border-b border-black/5'
          : 'bg-transparent border-transparent'
      }`}
      style={{ top: isNavbarHidden ? '68px' : `${(navbarHeight || 0) + 68}px` }}
    >
      <CategoryTabs
        categories={categories}
        activeCategory={categoryParam}
        onCategoryChange={handleCategorySelect}
      />
    </div>
  );
};
