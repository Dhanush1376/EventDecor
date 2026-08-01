import { SlidersHorizontal } from 'lucide-react';
import React from 'react';
import { SearchBar, CategoryTabs, CustomDropdown } from '../../components/ui';

export const EventStickyNav = React.forwardRef(
  (
    {
      isSticky,
      isNavbarHidden,
      navbarHeight,
      searchQuery,
      setSearchQuery,
      setCurrentPage,
      setIsFilterOpen,
      categories,
      activeCategory,
      handleCategorySelect,
      sortBy,
      setSortBy,
    },
    ref,
  ) => {
    return (
      <nav
        ref={ref}
        className={`sticky z-[49] -mt-6 lg:-mt-8 mb-8 lg:mb-12 transition-all duration-300 ease-out ${
          isSticky ? 'px-0' : 'px-3 lg:px-margin-desktop max-w-max-width mx-auto'
        }`}
        style={{ top: isNavbarHidden ? '0px' : `${navbarHeight}px` }}
      >
        <div
          className={`transition-all duration-300 ease-out flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6 pointer-events-auto mx-auto ${
            isSticky
              ? 'bg-white/90 backdrop-blur-xl rounded-none border-b border-black/5 shadow-sm py-3 lg:py-4 lg:py-2 px-3 lg:px-margin-desktop w-full max-w-none'
              : 'bg-transparent border-none shadow-none rounded-[2rem] px-2 py-3 lg:p-4 lg:p-2 w-full max-w-max-width'
          }`}
        >
          {/* Search Bar & Mobile Filter Toggle */}
          <div className="w-full lg:w-72 xl:w-80 flex items-center gap-2 shrink-0">
            <div className="flex-1 lg:p-1.5 lg:bg-surface-container/60 lg:backdrop-blur-xl lg:border lg:border-outline-variant/20 rounded-full lg:shadow-inner">
              <SearchBar
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                onCameraClick={() => {
                  window.dispatchEvent(
                    new CustomEvent('open-global-search', { detail: { mode: 'visual' } }),
                  );
                }}
                placeholder="Search masteries..."
                className="w-full h-[44px] lg:h-[44px] !rounded-full bg-surface-bright shadow-[0_2px_8px_rgba(115,92,0,0.08)] border border-outline-variant/15 !px-3 lg:!px-4 text-[13px] lg:text-[12px] flex items-center outline-none focus:outline-none"
              />
            </div>
            {/* Mobile/Tablet Filter Toggle */}
            <button
              onClick={() => setIsFilterOpen(true)}
              className="lg:hidden flex items-center justify-center w-11 h-11 rounded-full bg-on-surface text-surface shadow-md transition-all active:scale-95 shrink-0 outline-none focus:outline-none focus-visible:outline-none"
            >
              <SlidersHorizontal className="text-[20px]" strokeWidth={1.5} />
            </button>
          </div>

          {/* Desktop-Only Layout Integration (Tabs + Sort) */}
          <div className="hidden lg:flex items-center justify-between gap-6 flex-1 min-w-0">
            <div className="flex-1 overflow-hidden flex justify-start lg:justify-center">
              <CategoryTabs
                categories={categories}
                activeCategory={activeCategory}
                onCategoryChange={handleCategorySelect}
              />
            </div>

            <div className="flex items-center shrink-0">
              <div className="w-48 xl:w-52 p-1.5 bg-surface-container/60 backdrop-blur-xl border border-outline-variant/20 rounded-full shadow-inner">
                <CustomDropdown
                  options={[
                    { value: 'Popularity', label: 'Popularity' },
                    {
                      value: 'Price: Low to High',
                      label: 'Price: Low to High',
                    },
                    {
                      value: 'Price: High to Low',
                      label: 'Price: High to Low',
                    },
                  ]}
                  value={sortBy}
                  onChange={setSortBy}
                  className="w-full h-full"
                  buttonClassName="w-full h-[44px] lg:h-[44px] !rounded-full border !border-outline-variant/15 shadow-[0_2px_8px_rgba(115,92,0,0.08)] !bg-surface-bright !py-0 !px-5 lg:!px-4 text-[13px] lg:text-[12px]"
                />
              </div>
            </div>
          </div>
        </div>
      </nav>
    );
  },
);
