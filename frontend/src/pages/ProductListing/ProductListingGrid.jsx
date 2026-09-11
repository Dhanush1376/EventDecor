import { X, Tag } from 'lucide-react';
import React from 'react';
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
import { scrollToShopAnchor } from './shopScrollAnchor';

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
    commitSearch,
    setLocalSearch,
    openQuickView,
    isNavbarHidden,
    navbarHeight,
  }) => {
    const handleClearCoupon = () => {
      setSearchParams((prev) => {
        const params = new URLSearchParams(prev);
        params.delete('coupon');
        params.delete('collection');
        params.delete('ids');
        return params;
      });
    };

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
            <div className="hidden lg:flex items-center justify-between mb-6 pb-4 border-b border-outline-variant/15">
              <div>
                <h1 className="font-heading text-[26px] xl:text-[30px] font-bold text-on-surface">
                  {searchParam ? (
                    <>
                      Results for <span className="text-primary italic">"{searchParam}"</span>
                    </>
                  ) : categoryParam === 'All' ? (
                    'Shop'
                  ) : (
                    categoryParam
                  )}
                </h1>
                <div className="flex items-center gap-2 mt-0.5 text-on-surface-variant/70 font-medium text-body-sm flex-wrap">
                  <span>
                    <span className="font-semibold text-on-surface">{totalCount}</span>{' '}
                    {totalCount === 1 ? 'piece' : 'pieces'}{' '}
                    {categoryParam !== 'All' && !searchParam
                      ? `in ${categoryParam}`
                      : searchParam
                        ? categoryParam !== 'All'
                          ? `found in ${categoryParam}`
                          : 'found'
                        : searchParams?.get('coupon')
                          ? 'eligible for coupon'
                          : 'designed for you'}
                  </span>
                  {searchParams?.get('coupon') && (
                    <span className="inline-flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2.5 h-[22px] rounded-full text-[11px] leading-none border border-emerald-500/25 shrink-0">
                      <Tag
                        className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400 shrink-0"
                        strokeWidth={2.2}
                      />
                      <span className="leading-none">Coupon: {searchParams.get('coupon')}</span>
                      <button
                        type="button"
                        onClick={handleClearCoupon}
                        className="hover:opacity-75 transition-opacity cursor-pointer flex items-center justify-center p-0 ml-0.5 leading-none text-emerald-700 dark:text-emerald-400"
                        title="Clear coupon filter"
                      >
                        <X className="w-2.5 h-2.5 shrink-0" strokeWidth={2.2} />
                      </button>
                    </span>
                  )}
                </div>
              </div>
              {searchParam && (
                <button
                  type="button"
                  onClick={() => {
                    if (commitSearch) commitSearch('');
                    else if (setLocalSearch) setLocalSearch('');
                  }}
                  className="text-[12px] text-primary hover:underline font-semibold cursor-pointer"
                >
                  Clear search
                </button>
              )}
            </div>

            <div
              id="mobile-categories-anchor"
              className="h-0 w-full pointer-events-none"
              aria-hidden="true"
            />
            <MobileStickyCategories
              categories={categories}
              categoryParam={categoryParam}
              handleCategorySelect={handleCategorySelect}
              isNavbarHidden={isNavbarHidden}
              navbarHeight={navbarHeight}
            />

            {/* Unified Results & Search State Indicator */}
            <div className="lg:hidden mb-4 px-1 flex items-center justify-between text-[12px] font-medium text-on-surface-variant/80 animate-fade-in gap-2">
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                <span className="inline-flex items-center justify-center font-bold text-primary bg-primary/10 px-2.5 h-[22px] rounded-full text-[11px] leading-none border border-primary/15 shrink-0">
                  {totalCount} {totalCount === 1 ? 'piece' : 'pieces'}
                </span>

                {searchParams?.get('coupon') && (
                  <span className="inline-flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2.5 h-[22px] rounded-full text-[11px] leading-none border border-emerald-500/25 shrink-0">
                    <Tag
                      className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400 shrink-0"
                      strokeWidth={2.2}
                    />
                    <span className="leading-none">Coupon: {searchParams.get('coupon')}</span>
                    <button
                      type="button"
                      onClick={handleClearCoupon}
                      className="hover:opacity-75 transition-opacity cursor-pointer flex items-center justify-center p-0 ml-0.5 leading-none text-emerald-700 dark:text-emerald-400"
                      title="Clear coupon filter"
                    >
                      <X className="w-2.5 h-2.5 shrink-0" strokeWidth={2.2} />
                    </button>
                  </span>
                )}

                {searchParam ? (
                  <span className="truncate max-w-[210px]">
                    for <strong className="text-on-surface font-semibold">"{searchParam}"</strong>
                    {categoryParam !== 'All' && (
                      <>
                        {' '}
                        in <strong className="text-primary font-semibold">{categoryParam}</strong>
                      </>
                    )}
                  </span>
                ) : categoryParam !== 'All' ? (
                  <span>
                    in <strong className="text-on-surface font-semibold">{categoryParam}</strong>
                  </span>
                ) : !searchParams?.get('coupon') ? (
                  <span>handcrafted collection</span>
                ) : null}
              </div>

              {(searchParam || searchParams?.get('coupon')) && (
                <button
                  type="button"
                  onClick={() => {
                    if (searchParam) {
                      if (commitSearch) commitSearch('');
                      else if (setLocalSearch) setLocalSearch('');
                    } else {
                      handleClearCoupon();
                    }
                  }}
                  className="text-[11px] text-primary underline font-semibold cursor-pointer shrink-0 ml-auto"
                >
                  {searchParam ? 'Clear search' : 'Clear coupon'}
                </button>
              )}
            </div>

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
                  <X className="text-[16px]" strokeWidth={1.5} />
                  Clear Visual Search
                </button>
              </div>
            )}

            <div id="product-results-wrapper" className="min-h-[60vh]">
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
                            scrollToShopAnchor({ smooth: true });
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
      id="mobile-sticky-categories"
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
