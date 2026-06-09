import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { GalleryCard } from '../components/gallery/GalleryCard';
import { VirtualizedMasonry } from '../components/gallery/VirtualizedMasonry';
import { galleryService, productService } from '../services/domainServices';
import { SearchBar, CategoryTabs, CustomDropdown } from '../components/ui';
import { SEO } from '../components/seo/SEO';
import { MandalaElement } from '../components/ui/MandalaElement';
import { GallerySlideshow } from '../components/gallery/GallerySlideshow';
import { GallerySkeleton } from '../components/ui/Skeleton';
import { FilterPanel } from '../components/ui/FilterPanel';
import { useQuery } from '@tanstack/react-query';
import { useInfiniteGallery, useGalleryDynamicFilters } from '../hooks/useInfiniteGallery';
import { useScrollDirection } from '../hooks/useScrollDirection';
import { useMediaQuery } from '../hooks/useMediaQuery';
import toast from 'react-hot-toast';

export function GalleryInner() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('All');
  const [filters, setFilters] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [filterType, setFilterType] = useState('all'); // all, inspiration, product
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isGalleryMode, setIsGalleryMode] = useState(false);
  const [slideshowIndex, setSlideshowIndex] = useState(-1);
  const [showFloatingExit, setShowFloatingExit] = useState(false);
  const [isSticky, setIsSticky] = useState(false);
  const [navbarHeight, setNavbarHeight] = useState(0);
  const navRef = React.useRef(null);

  const isMobile = useMediaQuery('(max-width: 1023px)');
  const { scrollDirection, isAtTop } = useScrollDirection();
  const isNavbarHidden = !isAtTop && scrollDirection === 'down' && !isMobile;

  // Debounce search input to match product and events pages behavior
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const queryParams = {
    category: activeCategory,
    type: filterType,
    search: debouncedSearch,
  };

  Object.keys(filters).forEach((key) => {
    if (filters[key]?.length > 0) {
      queryParams[key] = filters[key].join(',');
    }
  });

  const {
    items: filteredItems,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    isLoading: isGalleryLoading,
    isError: isGalleryError,
  } = useInfiniteGallery(queryParams);

  const { data: filterGroups = [] } = useGalleryDynamicFilters(queryParams);

  const {
    data: categories = ['All'],
    isLoading: isCategoriesLoading,
    isError: isCategoriesError,
  } = useQuery({
    queryKey: ['galleryCategories'],
    queryFn: async () => {
      const res = await galleryService.getCategories();
      return res.success ? ['All', ...(res.data || [])] : ['All'];
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (isGalleryError || isCategoriesError) {
      toast.error('Failed to load some gallery resources.');
    }
  }, [isGalleryError, isCategoriesError]);

  // Keep slideshow index within bounds of filtered items list (e.g. during search query updates)
  useEffect(() => {
    if (
      slideshowIndex !== -1 &&
      filteredItems.length > 0 &&
      slideshowIndex >= filteredItems.length
    ) {
      setSlideshowIndex(0);
    }
  }, [filteredItems.length, slideshowIndex]);

  const isLoading = isGalleryLoading || isCategoriesLoading;

  const handleCategorySelect = (cat) => {
    setActiveCategory(cat);
    setTimeout(() => {
      const element = document.getElementById('gallery-collection');
      if (element) {
        const yOffset = -80;
        const y = element.getBoundingClientRect().top + window.scrollY + yOffset;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    }, 50);
  };

  useEffect(() => {
    const handleScroll = () => {
      const topNav = document.querySelector('.top-navbar');
      let currentNavHeight = navbarHeight;
      if (topNav) {
        currentNavHeight = topNav.getBoundingClientRect().height;
        setNavbarHeight(currentNavHeight);
      }
      if (navRef.current) {
        const rect = navRef.current.getBoundingClientRect();
        setIsSticky(rect.top <= currentNavHeight + 1);
      }
    };

    let resizeTimer;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(handleScroll, 100);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize, { passive: true });
    handleScroll();
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimer);
    };
  }, [navbarHeight]);

  // Handle immersive gallery mode UI
  useEffect(() => {
    if (isGalleryMode) {
      document.body.classList.add('gallery-mode-active');

      const handleScroll = () => {
        setShowFloatingExit(window.scrollY > 300);
      };
      window.addEventListener('scroll', handleScroll);
      return () => {
        document.body.classList.remove('gallery-mode-active');
        window.removeEventListener('scroll', handleScroll);
      };
    } else {
      document.body.classList.remove('gallery-mode-active');

      setShowFloatingExit(false);
    }
  }, [isGalleryMode]);

  useEffect(() => {
    if (isFilterOpen) {
      document.body.classList.add('filters-open');
    } else {
      document.body.classList.remove('filters-open');
    }
    return () => document.body.classList.remove('filters-open');
  }, [isFilterOpen]);

  const toggleFilter = React.useCallback((type, value) => {
    setFilters((prev) => {
      const current = prev[type] || [];
      const next = current.includes(value)
        ? current.filter((i) => i !== value)
        : [...current, value];

      if (next.length === 0) {
        const newFilters = { ...prev };
        delete newFilters[type];
        return newFilters;
      }
      return { ...prev, [type]: next };
    });
  }, []);

  const clearAllFilters = React.useCallback(() => {
    setFilters({});
    setActiveCategory('All');
    setSearchQuery('');
  }, []);

  const isGalleryModeRef = React.useRef(isGalleryMode);
  useEffect(() => {
    isGalleryModeRef.current = isGalleryMode;
  }, [isGalleryMode]);

  // filteredItems is now directly sourced from useInfiniteGallery which handles both remote querying and local mapping

  const renderGalleryItem = React.useCallback(
    (item, index) => (
      <GalleryCard
        item={item}
        eager={index < 4}
        onImageClick={isGalleryModeRef.current ? () => setSlideshowIndex(index) : undefined}
        navigate={navigate}
      />
    ),
    [navigate],
  );

  return (
    <div className="bg-[#fcfbf9] min-h-screen selection:bg-primary/20 relative pt-20 md:pt-28 pb-32 md:pb-20 transition-all duration-300">
      <SEO
        title="Inspiration Gallery"
        description="Explore our curated collection of artisanal event transformations and heritage decor inspirations."
      />

      <MandalaElement className="absolute -top-40 -left-40 opacity-[0.06]" size={800} />
      <MandalaElement
        className="absolute -bottom-[350px] -right-[350px] opacity-[0.04]"
        size={1000}
        variant={2}
      />

      {/* Editorial Header Hero */}
      <section className="max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop pt-4 md:pt-6 relative z-10">
        <nav className="hidden md:flex items-center gap-2 font-label-sm text-[11px] uppercase tracking-[0.3em] mb-6 text-black/30">
          <Link to="/" className="hover:text-primary transition-colors">
            Home
          </Link>
          <span className="opacity-30">/</span>
          <span className="text-black font-bold">Inspiration Gallery</span>
        </nav>

        <div className="max-w-2xl mb-12">
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="font-label-sm text-[12px] text-primary uppercase tracking-[0.4em] mb-4 block font-bold"
          >
            Design Ideas
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-headline-md text-black mb-6 leading-tight"
          >
            Beautiful Designs & Themes.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="font-body-md text-black/60 font-light leading-relaxed max-w-xl"
          >
            Explore our gallery of beautiful decorations, where traditional items meet modern
            celebrations.
          </motion.p>
        </div>
      </section>

      {/* Sticky Navigation Bar */}
      <nav
        ref={navRef}
        className={`sticky z-[49] -mt-6 md:-mt-8 mb-8 md:mb-12 transition-all duration-300 ${
          isSticky ? 'px-0' : 'px-margin-mobile md:px-margin-desktop max-w-max-width mx-auto'
        }`}
        style={{ top: isNavbarHidden ? '0px' : `${navbarHeight}px` }}
      >
        <div
          className={`transition-all duration-300 flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6 pointer-events-auto mx-auto ${
            isSticky
              ? 'bg-white/90 backdrop-blur-xl rounded-none border-b border-black/5 shadow-sm py-3 md:py-4 lg:py-2 px-margin-mobile md:px-margin-desktop w-full max-w-none'
              : 'bg-transparent border-none shadow-none rounded-[2rem] p-3 md:p-4 lg:p-2 w-full max-w-max-width'
          }`}
        >
          {/* Search Bar & Mobile / Tablet Actions */}
          <div className="w-full lg:w-72 xl:w-80 flex items-center gap-1.5 shrink-0">
            <div className="flex-1 h-11 lg:h-9">
              <SearchBar
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                }}
                placeholder="Search themes, colors..."
                className="w-full !h-full !rounded-full bg-surface-bright/90 backdrop-blur-md shadow-sm !px-5 lg:!px-4 text-[13px] lg:text-[12px] flex items-center border border-outline-variant/30 outline-none focus:outline-none"
              />
            </div>

            {/* Mobile Filter Toggle */}
            <button
              onClick={() => setIsFilterOpen(true)}
              aria-label="Open filters"
              className="lg:hidden flex items-center justify-center w-11 h-11 rounded-full bg-on-surface text-surface shadow-md transition-all active:scale-[0.98] active:opacity-90 shrink-0 outline-none focus:outline-none focus-visible:outline-none"
            >
              <span className="material-symbols-outlined text-[20px]">tune</span>
            </button>

            {/* Mobile Gallery Mode Toggle */}
            <button
              onClick={() => {
                const newMode = !isGalleryMode;
                setIsGalleryMode(newMode);
                if (newMode && filteredItems.length > 0) {
                  setSlideshowIndex(0);
                }
              }}
              aria-label="Toggle gallery mode"
              className={`lg:hidden flex items-center justify-center w-11 h-11 rounded-full shadow-md transition-all active:scale-[0.98] active:opacity-90 shrink-0 outline-none focus:outline-none focus-visible:outline-none ${
                isGalleryMode
                  ? 'bg-primary text-white text-surface'
                  : 'bg-white text-black/50 border border-black/10'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">
                {isGalleryMode ? 'grid_view' : 'photo_library'}
              </span>
            </button>
          </div>

          {/* Desktop Category Tabs & Sort/Format Dropdown */}
          <div className="hidden lg:flex items-center justify-between gap-6 flex-1 min-w-0">
            <div className="flex-1 overflow-hidden flex justify-start lg:justify-center">
              <CategoryTabs
                categories={categories}
                activeCategory={activeCategory}
                onCategoryChange={handleCategorySelect}
              />
            </div>

            <div className="flex items-center gap-3 shrink-0 lg:-mt-[6px]">
              {/* Type Switcher Dropdown */}
              <div className="w-48 xl:w-52 h-11 lg:h-9">
                <CustomDropdown
                  options={[
                    { value: 'all', label: 'All Formats' },
                    { value: 'inspiration', label: 'Design Inspirations' },
                    { value: 'real-event', label: 'Real Celebrations' },
                  ]}
                  value={filterType}
                  onChange={setFilterType}
                  className="w-full h-full"
                  buttonClassName="w-full h-full !rounded-full border !border-outline-variant/30 shadow-sm !bg-surface-bright/90 backdrop-blur-md !py-0 !px-5 lg:!px-4 text-[12px] lg:text-[11px]"
                />
              </div>

              {/* Gallery Mode Toggle */}
              <button
                onClick={() => {
                  const newMode = !isGalleryMode;
                  setIsGalleryMode(newMode);
                  if (newMode && filteredItems.length > 0) {
                    setSlideshowIndex(0);
                  }
                }}
                className={`flex shrink-0 items-center gap-2 h-11 lg:h-9 px-5 rounded-full border transition-all duration-300 font-bold text-[10px] uppercase tracking-widest outline-none focus:outline-none focus-visible:outline-none ${
                  isGalleryMode
                    ? 'bg-primary text-white border-primary shadow-md shadow-primary/20'
                    : 'bg-white text-black/60 border-black/10 hover:border-black/30 shadow-sm'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {isGalleryMode ? 'grid_view' : 'photo_library'}
                </span>
                {isGalleryMode ? 'Exit Gallery' : 'Gallery Mode'}
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main
        id="gallery-collection"
        className="max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop py-4 md:py-6 relative z-10"
      >
        {/* Mobile/Tablet inline category tabs (hidden on desktop where they appear in sticky nav) */}
        <div className="mb-6 md:mb-8 overflow-x-auto no-scrollbar lg:hidden">
          <CategoryTabs
            categories={categories}
            activeCategory={activeCategory}
            onCategoryChange={handleCategorySelect}
          />
        </div>

        <div className="flex flex-col lg:flex-row gap-0 lg:gap-8 xl:gap-12">
          {/* Sidebar Filter - Handles both Desktop Sidebar and Mobile Drawer */}
          <aside className="w-full lg:w-64 xl:w-72 flex-shrink-0 lg:sticky lg:top-32 h-fit">
            <FilterPanel
              filterGroups={filterGroups.filter((group) => group.id !== 'category')} // Category is already in tabs!
              currentFilters={filters}
              onToggleFilter={toggleFilter}
              onClearAll={clearAllFilters}
              isOpen={isFilterOpen}
              onClose={() => setIsFilterOpen(false)}
            />
          </aside>

          <div className="flex-1 min-w-0">
            {isLoading ? (
              <GallerySkeleton />
            ) : (
              <>
                <VirtualizedMasonry
                  items={filteredItems}
                  loadMore={fetchNextPage}
                  hasMore={hasNextPage}
                  isLoading={isFetchingNextPage}
                  renderItem={renderGalleryItem}
                  columns={{ sm: 2, md: 2, lg: 4, xl: 4 }}
                  gap="gap-2 sm:gap-3"
                  batchSize={20}
                />

                {filteredItems.length === 0 && (
                  <div className="py-32 text-center">
                    <h3 className="font-headline-sm text-black/40">
                      No moments found matching your criteria.
                    </h3>
                    <button
                      onClick={() => {
                        setActiveCategory('All');
                        setSearchQuery('');
                      }}
                      className="mt-4 font-label-sm text-primary underline uppercase tracking-widest text-[10px] font-bold"
                    >
                      Clear all filters
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      <AnimatePresence>
        {slideshowIndex !== -1 && (
          <GallerySlideshow
            items={filteredItems}
            currentIndex={slideshowIndex}
            onClose={() => setSlideshowIndex(-1)}
            onPrev={() =>
              setSlideshowIndex((prev) => (prev > 0 ? prev - 1 : filteredItems.length - 1))
            }
            onNext={() =>
              setSlideshowIndex((prev) => (prev < filteredItems.length - 1 ? prev + 1 : 0))
            }
            onSelect={setSlideshowIndex}
            searchQuery={searchQuery}
            onSearchChange={(e) => setSearchQuery(e.target.value)}
          />
        )}
      </AnimatePresence>

      <div className="fixed inset-0 pointer-events-none opacity-[0.02] mix-blend-overlay z-[400] bg-marble" />
    </div>
  );
}

export function Gallery() {
  return <GalleryInner />;
}
