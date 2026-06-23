import React from 'react';
import { Link } from 'react-router-dom';
import { FilterPanel, Pagination, CategoryTabs } from '../../components/ui';
import { ProductCard } from '../../components/shared/ProductCard';
import { MandalaElement } from '../../components/ui/MandalaElement';
import { MandalaArtDecor } from '../../components/ui/MandalaArtDecor';

export const ProductListingGrid = ({
  filterGroups,
  filters,
  toggleFilter,
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
  totalPages,
  pageParam,
  setSearchParams,
  openQuickView,
}) => {
  return (
    <main
      id="artisan-collection"
      className="max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop relative pb-8 md:pb-24"
    >
      <MandalaElement
        className="absolute top-[20%] -right-[10%] opacity-[0.03]"
        size={600}
        variant={2}
      />
      <div className="flex flex-col lg:flex-row gap-0 lg:gap-8 xl:gap-12">
        <aside className="w-full lg:w-64 xl:w-72 flex-shrink-0 lg:sticky lg:top-32 h-fit">
          <FilterPanel
            filterGroups={filterGroups}
            currentFilters={filters}
            onToggleFilter={toggleFilter}
            onClearAll={clearAllFilters}
            isOpen={isFilterOpen}
            onClose={() => setIsFilterOpen(false)}
            sortBy={sortBy}
            onSortChange={setSortBy}
          />
        </aside>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-6 md:mb-10">
            <div className="flex flex-col gap-1">
              <h2 className="font-headline-md text-on-surface font-normal text-[24px] md:text-[32px]">
                The Artisan Collection
              </h2>
              <p className="font-body-md text-on-surface-variant/60 font-medium">
                {totalCount} unique pieces designed for you
              </p>
            </div>
          </div>

          <div className="mb-10 overflow-x-auto no-scrollbar lg:hidden">
            <CategoryTabs
              categories={categories}
              activeCategory={categoryParam}
              onCategoryChange={handleCategorySelect}
            />
          </div>

          {productsData?.correctedQuery && (
            <div className="mb-8 px-6 py-4 bg-primary/5 text-primary rounded-[20px] border border-primary/10 text-[14px] font-medium flex items-center gap-2.5 shadow-sm">
              <span className="material-symbols-outlined text-[20px] text-primary">lightbulb</span>
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
                    <img
                      src={visualSearch.previewUrl}
                      alt="Scanned visual query"
                      className="w-full h-full object-cover"
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

          <div id="product-results-wrapper">
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-3 gap-x-4 md:gap-x-8 gap-y-8 md:gap-y-12">
                {[...Array(6)].map((_, i) => (
                  <ProductCard key={i} loading={true} />
                ))}
              </div>
            ) : products.length > 0 ? (
              <>
                <div
                  className={`grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-3 gap-x-4 md:gap-x-8 gap-y-8 md:gap-y-12 transition-opacity duration-300 ${isFetching ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}
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
              <div className="text-center py-32 md:py-48 bg-surface-container-low/30 rounded-[40px] border border-dashed border-outline-variant/30 px-6 animate-fade-in">
                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-8 shadow-luxury/5 border border-black/5">
                  <span className="material-symbols-outlined text-[40px] text-on-surface-variant/20">
                    filter_list_off
                  </span>
                </div>
                <h3 className="font-headline-sm text-on-surface mb-3">
                  No search results available
                </h3>
                <p className="font-body-md text-on-surface-variant/50 font-light mb-10 max-w-md mx-auto">
                  Try adjusting your filters or search terms to find what you're looking for.
                </p>
                <button onClick={clearAllFilters} className="btn-primary">
                  Clear All Filters
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <MandalaArtDecor
        variant={1}
        size={700}
        className="-bottom-40 -left-40 hidden lg:block z-0"
        opacity={0.2}
        spinDuration={180}
      />
      <MandalaArtDecor
        variant={1}
        size={350}
        className="-bottom-20 -left-20 lg:hidden z-0"
        opacity={0.25}
        spinDuration={180}
      />
    </main>
  );
};
