import { AnimatePresence } from 'framer-motion';
import { SEO } from '../../components/seo/SEO';
import { MandalaArtDecor } from '../../components/ui/MandalaArtDecor';
import {
  ShowcaseCard,
  Pagination,
  Skeleton,
  EventShowcaseFilterPanel,
  CategoryTabs,
  EmptyState,
} from '../../components/ui';
import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useWebsiteContent } from '../../hooks/useWebsiteContent';

import { useShowcasesData } from './hooks/useShowcasesData';
import { ShowcaseHero } from './components/ShowcaseHero';
import { ShowcaseNav } from './components/ShowcaseNav';
import { CustomizerDrawer } from './components/CustomizerDrawer';

export function EventShowcases() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const searchParam = searchParams.get('search') || '';

  const websiteContent = useWebsiteContent();
  const eventsPageContent = websiteContent?.eventsPage || {
    hero: {
      title: 'Luxury Event Scapes',
      subtitle: 'Cinematic Environments',
      description:
        'Stunning handcrafted designs to transform your milestone celebrations into living masterpieces.',
      backgroundImage:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuA7F3ck_1VBGtclja4rFpblASLZWmGyrrSeXc-D7PYlO1RJFSwwrZdHFE80h72hY1_kcwRRwjHuqfhG4Zlouur0m6jrXSLrhifw9vDKzna2lQ-ju5fdSEXiP7YRFTwnqlKsqohXveyKFObF5Wlx3w4eHE_H8k0Y1_l5DTr3WtpRbeEK40rGPLPe9CzEazxPBk_dKXe0G4hYrk0NZhhWEsdpFvGFb0pGyqjB5La45C5zfJ87FPCec_D1_Au1Z-IJca6gythEhj_rF4g',
    },
    promo: {
      backgroundImage:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuArmLX9xra0m1GxmrjS8xH0pXUpTrKa18fhO9gW8NY160WAZ5MfXc157OoFlIivj6H_WT6aMZVWNjLvqixrhrBG2ryiAU15p_ZC42em1Dzj1w8ukwUFzndsHouARkcvS5wRRDyDVaOaIHwbiV5vUgkbNfc6zFl8XAYOQBERj5JYLZZOPpjaoiUd4B_6zT7iQQYhbyHU5Q5geiCAvvn2hga0_UsahQbwxSy3eLhHFEKPHc897yWc_fLyCPjkZ0wcfIcXDcMrPumI35w',
    },
  };

  const {
    loading,
    searchQuery,
    setSearchQuery,
    activeCategory,
    setActiveCategory,
    sortBy,
    setSortBy,
    isFilterOpen,
    setIsFilterOpen,
    isSticky,
    navbarHeight,
    navRef,
    currentPage,
    setCurrentPage,
    isMobile,
    isNavbarHidden,
    filters,
    toggleFilter,
    availableCategories,
    clearAllFilters,
    totalCount,
    totalPages,
    paginatedShowcases,
    selectedShowcase,
    setSelectedShowcase,
    customInclusions,
    setCustomInclusions,
    selectedPaletteColor,
    setSelectedPaletteColor,
    placementPreference,
    setPlacementPreference,
    uploadedReferenceUrl,
    setUploadedReferenceUrl,
    customNote,
    setCustomNote,
    bookingDate,
    setBookingDate,
    aiSuggestions,
    calculateLivePrice,
    handleBookRental,
  } = useShowcasesData();

  const handleOpenShowcase = (sc) => navigate(`/events/${sc._id || sc.id}`);

  return (
    <div className="bg-surface min-h-screen font-body">
      <SEO
        title="Event Decorations | Siri Arts & Crafts"
        description="Explore our stunning handcrafted event decorations, wedding mandaps, pooja setups, and floral styling."
      />

      <ShowcaseHero eventsPageContent={eventsPageContent} />

      <ShowcaseNav
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        activeCategory={activeCategory}
        setActiveCategory={setActiveCategory}
        setCurrentPage={setCurrentPage}
        sortBy={sortBy}
        setSortBy={setSortBy}
        isFilterOpen={isFilterOpen}
        setIsFilterOpen={setIsFilterOpen}
        isSticky={isSticky}
        navbarHeight={navbarHeight}
        navRef={navRef}
        isMobile={isMobile}
        isNavbarHidden={isNavbarHidden}
        searchParam={searchParam}
        availableCategories={availableCategories}
      />

      <main
        id="showcase-collection"
        className="max-w-max-width mx-auto px-margin-mobile lg:px-margin-desktop relative pb-8 lg:pb-24"
      >
        <MandalaArtDecor
          className="absolute -top-12 -right-10 lg:-top-16 lg:-right-12 pointer-events-none z-0"
          size={400}
          variant={2}
          opacity={0.15}
          spinDuration={120}
        />

        <div className="flex flex-col lg:flex-row gap-0 lg:gap-8 xl:gap-12">
          <aside className="w-full lg:w-64 xl:w-72 flex-shrink-0 lg:sticky lg:top-32 lg:max-h-[calc(100vh-140px)] lg:overflow-y-auto no-scrollbar pb-4">
            <EventShowcaseFilterPanel
              currentFilters={filters}
              onToggleFilter={toggleFilter}
              onClearAll={clearAllFilters}
              isOpen={isFilterOpen}
              onClose={() => setIsFilterOpen(false)}
              sortBy={sortBy}
              onSortChange={setSortBy}
              totalCount={totalCount}
            />
          </aside>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-6 lg:mb-10">
              <div className="flex flex-col gap-1">
                <h2 className="font-headline-md text-on-surface font-normal text-[24px] lg:text-[32px]">
                  Event Design Packages
                </h2>
                <p className="font-body-md text-on-surface-variant/60 font-medium">
                  {totalCount} unique pieces designed for you
                </p>
              </div>
            </div>

            <MobileStickyCategories
              categories={availableCategories}
              activeCategory={activeCategory}
              handleCategorySelect={(cat) => {
                setActiveCategory(cat);
                setCurrentPage(1);
                setTimeout(() => {
                  const isMobileView = window.innerWidth < 1024;
                  if (isMobileView) {
                    const mobileCategoriesEl = document.getElementById(
                      'showcase-mobile-sticky-categories',
                    );
                    const sortBar = document.getElementById('showcase-sticky-nav');
                    if (mobileCategoriesEl) {
                      const sortBarHeight = sortBar ? sortBar.getBoundingClientRect().height : 68;
                      const currentAbsoluteTop =
                        mobileCategoriesEl.getBoundingClientRect().top + window.scrollY;
                      const targetY = currentAbsoluteTop - sortBarHeight;
                      window.scrollTo({ top: Math.max(0, targetY), behavior: 'smooth' });
                      return;
                    }
                  }

                  const sortBar = document.getElementById('showcase-sticky-nav');
                  if (sortBar) {
                    const topNav = document.querySelector('.top-navbar');
                    const navHeight = topNav ? topNav.getBoundingClientRect().height : 0;
                    const currentAbsoluteTop = sortBar.getBoundingClientRect().top + window.scrollY;
                    const targetY = currentAbsoluteTop - navHeight;
                    window.scrollTo({ top: Math.max(0, targetY), behavior: 'smooth' });
                  }
                }, 50);
              }}
              isNavbarHidden={isNavbarHidden}
              navbarHeight={navbarHeight}
            />

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3 sm:gap-6 lg:gap-8 gap-y-8 sm:gap-y-12">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="flex flex-col z-10">
                    <div className="relative aspect-[16/9] w-full mb-2.5 sm:mb-3 lg:mb-4 bg-[#fafafa] rounded-2xl lg:rounded-[32px] border border-black/5 shadow-2xs overflow-hidden">
                      <Skeleton className="w-full h-full rounded-none" />
                      <div className="absolute top-2 left-2 lg:top-4 lg:left-4 flex flex-row items-center -space-x-2 lg:-space-x-3 z-10">
                        <Skeleton className="w-7 h-7 sm:w-8 sm:h-8 lg:w-10 lg:h-10 rounded-full border-2 border-white shadow-lg" />
                        <Skeleton className="w-7 h-7 sm:w-8 sm:h-8 lg:w-10 lg:h-10 rounded-full border-2 border-white shadow-md" />
                      </div>
                      <div className="absolute top-2 right-2 lg:top-4 lg:right-4 z-20">
                        <Skeleton className="w-7 h-7 sm:w-8 sm:h-8 lg:w-10 lg:h-10 rounded-full border border-black/5 shadow-sm" />
                      </div>
                    </div>
                    <div className="py-1 flex flex-col flex-1">
                      <div className="flex items-center gap-1 mb-1.5 sm:mb-2">
                        <Skeleton className="h-2 lg:h-2.5 w-1/3 rounded-full" />
                        <Skeleton className="h-2 lg:h-2.5 w-8 rounded-full ml-auto" />
                      </div>
                      <Skeleton className="h-3 lg:h-4 w-4/5 rounded-full mb-1.5 sm:mb-2 lg:mb-3" />
                      <Skeleton className="h-4 lg:h-5 w-1/2 rounded-full mt-auto" />
                    </div>
                  </div>
                ))}
              </div>
            ) : paginatedShowcases.length > 0 ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3 sm:gap-6 lg:gap-8 gap-y-8 sm:gap-y-12">
                  {paginatedShowcases.map((sc) => (
                    <ShowcaseCard
                      key={sc._id || sc.id}
                      id={sc.id || sc._id}
                      _id={sc._id || sc.id}
                      title={sc.title}
                      subtitle={sc.subtitle}
                      description={sc.description}
                      rentalPrice={sc.rentalPrice}
                      setupTimeHours={sc.setupTimeHours || 2}
                      image={sc.image}
                      images={sc.images || sc.gallery}
                      category={sc.category}
                      inclusions={sc.inclusions}
                      rating={sc.rating || 0}
                      reviews={sc.reviewCount || 0}
                      onOpenShowcase={() => handleOpenShowcase(sc)}
                    />
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="mt-16 text-center">
                    <span className="font-label-sm text-[11px] text-on-surface uppercase tracking-[0.3em] font-bold block mb-4">
                      Showing Page {currentPage} of {totalPages}
                    </span>
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={(page) => {
                        setCurrentPage(page);
                        setTimeout(() => {
                          const el = document.getElementById('showcase-collection');
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
                title="No traditional showcases found"
                description="Try adjusting your filters, category tabs, or search terms to discover other event designs."
                icon="filter_list_off"
                actionLabel="Clear All Filters"
                onAction={clearAllFilters}
              />
            )}
          </div>
        </div>
      </main>

      <AnimatePresence>
        <CustomizerDrawer
          selectedShowcase={selectedShowcase}
          setSelectedShowcase={setSelectedShowcase}
          customInclusions={customInclusions}
          setCustomInclusions={setCustomInclusions}
          selectedPaletteColor={selectedPaletteColor}
          setSelectedPaletteColor={setSelectedPaletteColor}
          placementPreference={placementPreference}
          setPlacementPreference={setPlacementPreference}
          uploadedReferenceUrl={uploadedReferenceUrl}
          setUploadedReferenceUrl={setUploadedReferenceUrl}
          customNote={customNote}
          setCustomNote={setCustomNote}
          bookingDate={bookingDate}
          setBookingDate={setBookingDate}
          aiSuggestions={aiSuggestions}
          calculateLivePrice={calculateLivePrice}
          handleBookRental={handleBookRental}
          handleOpenShowcase={handleOpenShowcase}
        />
      </AnimatePresence>
    </div>
  );
}

const MobileStickyCategories = ({
  categories,
  activeCategory,
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
      id="showcase-mobile-sticky-categories"
      className={`mb-8 overflow-x-auto no-scrollbar lg:hidden sticky z-[48] py-2 -mx-[var(--spacing-margin-mobile)] px-[var(--spacing-margin-mobile)] transition-all duration-300 ease-out ${
        isStuck
          ? 'bg-surface/95 backdrop-blur-xl shadow-sm border-b border-black/5'
          : 'bg-transparent border-transparent'
      }`}
      style={{ top: isNavbarHidden ? '68px' : `${(navbarHeight || 0) + 68}px` }}
    >
      <CategoryTabs
        categories={categories}
        activeCategory={activeCategory}
        onCategoryChange={handleCategorySelect}
      />
    </div>
  );
};

export default EventShowcases;
