import React, { useRef, useEffect } from 'react';
import { SearchBar, CategoryTabs, CustomDropdown } from '../../components/ui';

export const ProductListingSortBar = ({
  isMobile,
  searchParam,
  localSearch,
  setLocalSearch,
  setIsFilterOpen,
  categories,
  categoryParam,
  handleCategorySelect,
  sortBy,
  setSortBy,
  isNavbarHidden,
  navbarHeight,
  setNavbarHeight,
  isStuck,
  setIsStuck,
}) => {
  const navRef = useRef(null);

  useEffect(() => {
    let ticking = false;
    const measure = () => {
      const topNav = document.querySelector('.top-navbar');
      if (topNav) {
        setNavbarHeight((prev) => {
          const current = topNav.getBoundingClientRect().height;
          return prev === current ? prev : current;
        });
      }

      if (navRef.current) {
        const rect = navRef.current.getBoundingClientRect();
        const topThreshold = parseFloat(navRef.current.style.top) || 0;
        setIsStuck((prev) => {
          const current = rect.top <= topThreshold + 1;
          return prev === current ? prev : current;
        });
      }
    };

    const onScrollOrResize = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          measure();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScrollOrResize, { passive: true });
    window.addEventListener('resize', onScrollOrResize, { passive: true });
    measure();
    return () => {
      window.removeEventListener('scroll', onScrollOrResize);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [setNavbarHeight, setIsStuck]);

  return (
    <nav
      ref={navRef}
      className={`sticky ${isMobile && searchParam ? 'mt-6' : '-mt-12 lg:-mt-16'} mb-4 lg:mb-6 transition-all duration-300 ${isStuck ? 'px-0' : 'px-3 lg:px-margin-desktop'}`}
      style={{ top: isNavbarHidden ? '0px' : `${navbarHeight}px`, zIndex: 49 }}
    >
      <div
        className={`transition-all duration-300 flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6 pointer-events-auto mx-auto ${
          isStuck
            ? 'bg-white/90 backdrop-blur-xl rounded-none border-b border-black/5 shadow-sm py-3 lg:py-4 lg:py-2 px-3 lg:px-margin-desktop w-full max-w-none'
            : 'bg-transparent border-none shadow-none rounded-[2rem] px-2 py-3 lg:p-4 lg:p-2 w-full max-w-max-width'
        }`}
      >
        <div className="w-full lg:w-72 xl:w-80 flex items-center gap-1.5 shrink-0">
          <div className="flex-1 lg:p-1.5 lg:bg-surface-container/60 lg:backdrop-blur-xl lg:border lg:border-outline-variant/20 rounded-full lg:shadow-inner">
            <SearchBar
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              onCameraClick={() => {
                window.dispatchEvent(
                  new CustomEvent('open-global-search', { detail: { mode: 'visual' } }),
                );
              }}
              placeholder="Search masterworks..."
              className="w-full h-[44px] lg:h-[44px] !rounded-full bg-surface-bright shadow-[0_2px_8px_rgba(115,92,0,0.08)] border border-outline-variant/15 !px-3 lg:!px-4 text-[13px] lg:text-[12px] flex items-center outline-none focus:outline-none"
            />
          </div>
          <button
            onClick={() => setIsFilterOpen(true)}
            aria-label="Open filters"
            className="lg:hidden flex items-center justify-center w-11 h-11 rounded-full bg-on-surface text-surface shadow-md transition-all active:scale-[0.98] active:opacity-90 shrink-0 outline-none focus:outline-none focus-visible:outline-none"
          >
            <span className="material-symbols-outlined text-[20px]">tune</span>
          </button>
        </div>

        <div className="hidden lg:flex items-center justify-between gap-6 flex-1 min-w-0">
          <div className="flex-1 overflow-hidden flex justify-start">
            <CategoryTabs
              categories={categories}
              activeCategory={categoryParam}
              onCategoryChange={handleCategorySelect}
            />
          </div>

          <div className="flex items-center shrink-0">
            <div className="w-48 xl:w-52 p-1.5 bg-surface-container/60 backdrop-blur-xl border border-outline-variant/20 rounded-full shadow-inner">
              <CustomDropdown
                options={[
                  { value: 'Popularity', label: 'Popularity' },
                  { value: 'Price: Low to High', label: 'Price: Low to High' },
                  { value: 'Price: High to Low', label: 'Price: High to Low' },
                  { value: 'New Arrivals', label: 'New Arrivals' },
                ]}
                value={sortBy}
                onChange={setSortBy}
                className="w-full"
                buttonClassName="w-full h-[44px] lg:h-[44px] !rounded-full border border-outline-variant/15 shadow-[0_2px_8px_rgba(115,92,0,0.08)] !bg-surface-bright !py-0 !px-5 lg:!px-4 text-[12px] lg:text-[11px]"
              />
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};
