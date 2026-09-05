import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { SEO } from '../../components/seo/SEO';
import { MandalaArtDecor } from '../../components/ui/MandalaArtDecor';
import { PromoBanner, EventFilterPanel, CategoryTabs, QuickViewModal } from '../../components/ui';
import { eventService, productService, couponService } from '../../services/domainServices';
import toast from 'react-hot-toast';
import { useWebsiteContent } from '../../hooks/useWebsiteContent';
import { useScrollDirection } from '../../hooks/useScrollDirection';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import logger from '../../utils/core/logger';

import { EventHero } from './EventHero';
import { EventStickyNav } from './EventStickyNav';
import { EventGrid } from './EventGrid';
import { ComplementaryProducts } from './ComplementaryProducts';

export function EventCollections() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryParam = searchParams.get('category') || 'All Occasions';
  const searchParam = searchParams.get('search') || '';
  const pageParam = parseInt(searchParams.get('page') || '1', 10);

  const [searchQuery, setSearchQuery] = useState(searchParam);
  const [activeCategory, setActiveCategory] = useState(categoryParam);
  const [sortBy, setSortBy] = useState('Popularity');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSticky, setIsSticky] = useState(false);
  const [navbarHeight, setNavbarHeight] = useState(0);
  const navRef = React.useRef(null);
  const [currentPage, setCurrentPage] = useState(pageParam);

  const isMobile = useMediaQuery('(max-width: 1023px)');
  const { scrollDirection, isAtTop } = useScrollDirection();
  const isNavbarHidden = !isAtTop && scrollDirection === 'down';

  // Advanced Filter State
  const [filters, setFilters] = useState({
    price: [],
    occasion: [],
    style: [],
  });

  // Quick View product tracking
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);

  const [masterEvents, setMasterEvents] = useState([]);
  const [matchingProducts, setMatchingProducts] = useState([]);
  const [categories, setCategories] = useState(['All Occasions']);
  const [styles, setStyles] = useState(['All Styles']);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setActiveCategory(searchParams.get('category') || 'All Occasions');
    setSearchQuery(searchParams.get('search') || '');
    setCurrentPage(parseInt(searchParams.get('page') || '1', 10));
  }, [searchParams]);

  // Debounced search to prevent url param clutter on typing
  const [debouncedSearch, setDebouncedSearch] = useState(searchParam);
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Sync debounced search to URL search query param
  useEffect(() => {
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev);
        if (debouncedSearch) {
          params.set('search', debouncedSearch);
        } else {
          params.delete('search');
        }
        return params;
      },
      { replace: true },
    );
  }, [debouncedSearch, setSearchParams]);

  const websiteContent = useWebsiteContent();
  const eventsPageContent = websiteContent?.eventsPage || {
    hero: {
      title: 'Luxury Event Scapes',
      subtitle: 'Cinematic Environments',
      description:
        'Immersive architectural curations designed to transform your milestone celebrations into living masterpieces.',
      backgroundImage:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuA7F3ck_1VBGtclja4rFpblASLZWmGyrrSeXc-D7PYlO1RJFSwwrZdHFE80h72hY1_kcwRRwjHuqfhG4Zlouur0m6jrXSLrhifw9vDKzna2lQ-ju5fdSEXiP7YRFTwnqlKsqohXveyKFObF5Wlx3w4eHE_H8k0Y1_l5DTr3WtpRbeEK40rGPLPe9CzEazxPBk_dKXe0G4hYrk0NZhhWEsdpFvGFb0pGyqjB5La45C5zfJ87FPCec_D1_Au1Z-IJca6gythEhj_rF4g',
    },
    promo: {
      backgroundImage:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuArmLX9xra0m1GxmrjS8xH0pXUpTrKa18fhO9gW8NY160WAZ5MfXc157OoFlIivj6H_WT6aMZVWNjLvqixrhrBG2ryiAU15p_ZC42em1Dzj1w8ukwUFzndsHouARkcvS5wRRDyDVaOaIHwbiV5vUgkbNfc6zFl8XAYOQBERj5JYLZZOPpjaoiUd4B_6zT7iQQYhbyHU5Q5geiCAvvn2hga0_UsahQbwxSy3eLhHFEKPHc897yWc_fLyCPjkZ0wcfIcXDcMrPumI35w',
    },
  };

  const [promoCoupon, setPromoCoupon] = useState(null);
  const [countdown, setCountdown] = useState({ D: '02', H: '14', M: '42', S: '00' });

  useEffect(() => {
    couponService
      .getAll()
      .then((res) => {
        if (res.success && res.data) {
          const list = res.data.data || res.data.items || (Array.isArray(res.data) ? res.data : []);
          const activeList = list.filter(
            (c) =>
              c.isActive &&
              new Date() <= new Date(c.expiryDate) &&
              c.displayLocations &&
              c.displayLocations.includes('banner'),
          );
          if (activeList.length > 0) {
            activeList.sort((a, b) => b.discountValue - a.discountValue);
            setPromoCoupon(activeList[0]);
          } else {
            setPromoCoupon(null);
          }
        }
      })
      .catch((err) => {
        logger.warn('Failed to fetch coupons for promo banner in EventCollections', err);
      });
  }, []);

  useEffect(() => {
    const targetDate = promoCoupon
      ? new Date(promoCoupon.expiryDate)
      : (() => {
          const tomorrow = new Date();
          tomorrow.setHours(23, 59, 59, 999);
          return tomorrow;
        })();

    const interval = setInterval(() => {
      const now = new Date();
      const diff = targetDate - now;

      if (diff <= 0) {
        setCountdown({ D: '00', H: '00', M: '00', S: '00' });
        clearInterval(interval);
      } else {
        const d = Math.floor(diff / (1000 * 60 * 60 * 24));
        const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);

        setCountdown({
          D: String(d).padStart(2, '0'),
          H: String(h).padStart(2, '0'),
          M: String(m).padStart(2, '0'),
          S: String(s).padStart(2, '0'),
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [promoCoupon]);

  const handleClaimOffer = () => {
    const code = promoCoupon ? promoCoupon.code : 'SIRI40';
    navigator.clipboard.writeText(code);
    toast.success(
      (_t) => (
        <div className="flex flex-col gap-1 p-1">
          <span className="font-bold text-xs text-on-surface flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-green-700">
              local_activity
            </span>
            Coupon claimed successfully!
          </span>
          <span className="text-[10px] text-on-surface-variant font-mono">
            Code "<strong className="text-primary font-bold">{code}</strong>" copied to clipboard.
          </span>
        </div>
      ),
      { duration: 5000, position: 'bottom-right' },
    );

    if (promoCoupon) {
      const params = new URLSearchParams();
      if (promoCoupon.targetType === 'categories' && promoCoupon.targetCategories?.length) {
        params.append('collection', promoCoupon.targetCategories.join(','));
      } else if (promoCoupon.targetType === 'products' && promoCoupon.targetProductIds?.length) {
        params.append('ids', promoCoupon.targetProductIds.join(','));
      }
      params.append('coupon', promoCoupon.code);
      navigate(`/collections?${params.toString()}`);
    }
  };

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [eventsRes, productsRes] = await Promise.all([
          eventService.getAll(),
          productService.getAll({ featured: true, limit: 4 }),
        ]);

        if (eventsRes.success) {
          const events =
            eventsRes.data.items ||
            eventsRes.data.data ||
            (Array.isArray(eventsRes.data) ? eventsRes.data : []);
          setMasterEvents(events);

          // Extract unique categories and styles
          const uniqueCats = ['All Occasions', ...new Set(events.map((e) => e.category))];
          const uniqueStyles = ['All Styles', ...new Set(events.map((e) => e.style))];
          setCategories(uniqueCats);
          setStyles(uniqueStyles);
        }

        if (productsRes.success) {
          const products =
            productsRes.data.data ||
            productsRes.data.items ||
            (Array.isArray(productsRes.data) ? productsRes.data : []);
          setMatchingProducts(products);
        }
      } catch (err) {
        logger.error('Event fetch failed:', err);
        toast.error('Failed to load events');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

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
        // Use the maximum sticky top value as a stable threshold to prevent background flashing during navbar transitions
        const maxThreshold = currentNavHeight + 2;
        setIsSticky(rect.top <= maxThreshold);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });
    handleScroll();
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [navbarHeight, isNavbarHidden]);

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
      const current = prev[type];
      const next = current.includes(value)
        ? current.filter((i) => i !== value)
        : [...current, value];
      return { ...prev, [type]: next };
    });
    setCurrentPage(1);
  }, []);

  const clearAllFilters = React.useCallback(() => {
    setFilters({ price: [], occasion: [], style: [] });
    setActiveCategory('All Occasions');
    setSearchQuery('');
    setSearchParams({});
    setCurrentPage(1);
  }, [setSearchParams]);

  const filteredEvents = useMemo(() => {
    let result = [...masterEvents];

    // Top-level Category Filter (Tabs)
    if (activeCategory !== 'All Occasions') {
      result = result.filter((e) => e.category.startsWith(activeCategory));
    }

    // Search Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.category.toLowerCase().includes(q) ||
          e.style.toLowerCase().includes(q),
      );
    }

    // Sidebar Price Filters
    if (filters.price.length > 0) {
      result = result.filter((e) => {
        // Extract number from "Starting at Rs. 3,50,000"
        const priceNum = e.pricing ? parseInt(e.pricing.replace(/[^0-9]/g, '')) : 0;
        return filters.price.some((range) => {
          if (range === 'Under ₹1,00,000') return priceNum < 100000;
          if (range === '₹1,00,000 - ₹3,00,000') return priceNum >= 100000 && priceNum <= 300000;
          if (range === '₹3,00,000 - ₹5,00,000') return priceNum >= 300000 && priceNum <= 500000;
          if (range === 'Over ₹5,00,000') return priceNum > 500000;
          return false;
        });
      });
    }

    // Sidebar Occasion Filters
    if (filters.occasion.length > 0) {
      result = result.filter((e) => filters.occasion.includes(e.category));
    }

    // Sidebar Style Filters
    if (filters.style.length > 0) {
      result = result.filter((e) => filters.style.includes(e.style));
    }

    // Sorting
    if (sortBy === 'Price: Low to High') {
      result.sort((a, b) => {
        const pa = a.pricing ? parseInt(a.pricing.replace(/[^0-9]/g, '')) : 0;
        const pb = b.pricing ? parseInt(b.pricing.replace(/[^0-9]/g, '')) : 0;
        return pa - pb;
      });
    } else if (sortBy === 'Price: High to Low') {
      result.sort((a, b) => {
        const pa = a.pricing ? parseInt(a.pricing.replace(/[^0-9]/g, '')) : 0;
        const pb = b.pricing ? parseInt(b.pricing.replace(/[^0-9]/g, '')) : 0;
        return pb - pa;
      });
    } else {
      result.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        if (dateB !== dateA) return dateB - dateA;
        return String(b._id || b.id).localeCompare(String(a._id || a.id));
      });
    }

    return result;
  }, [activeCategory, searchQuery, sortBy, filters, masterEvents]);

  const ITEMS_PER_PAGE = 12;
  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / ITEMS_PER_PAGE));
  const paginatedEvents = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredEvents.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredEvents, currentPage]);

  const handleOpenQuickView = React.useCallback((e, product) => {
    if (e && e.preventDefault) {
      e.preventDefault();
      e.stopPropagation();
    }
    setQuickViewProduct(product);
    setIsQuickViewOpen(true);
  }, []);

  const handleCategorySelect = (cat) => {
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev);
        if (cat === 'All Occasions') {
          params.delete('category');
        } else {
          params.set('category', cat);
        }
        params.delete('page');
        return params;
      },
      { replace: true },
    );
    setActiveCategory(cat);
    setCurrentPage(1);
    setTimeout(() => {
      const isMobileView = window.innerWidth < 1024;
      if (isMobileView) {
        const mobileCategoriesEl = document.getElementById('event-mobile-sticky-categories');
        const sortBar = document.getElementById('event-sticky-nav');
        if (mobileCategoriesEl) {
          const sortBarHeight = sortBar ? sortBar.getBoundingClientRect().height : 68;
          const currentAbsoluteTop =
            mobileCategoriesEl.getBoundingClientRect().top + window.scrollY;
          const targetY = currentAbsoluteTop - sortBarHeight;
          window.scrollTo({ top: Math.max(0, targetY), behavior: 'smooth' });
          return;
        }
      }

      const sortBar = document.getElementById('event-sticky-nav');
      if (sortBar) {
        const topNav = document.querySelector('.top-navbar');
        const navHeight = topNav ? topNav.getBoundingClientRect().height : 0;
        const currentAbsoluteTop = sortBar.getBoundingClientRect().top + window.scrollY;
        const targetY = currentAbsoluteTop - navHeight;
        window.scrollTo({ top: Math.max(0, targetY), behavior: 'smooth' });
        return;
      }

      const element = document.getElementById('event-collection');
      if (element) {
        const yOffset = -80;
        const y = element.getBoundingClientRect().top + window.scrollY + yOffset;
        window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
      }
    }, 50);
  };

  return (
    <div className="bg-surface min-h-screen text-on-surface">
      <SEO
        title={`${eventsPageContent.hero.title} | Siri Arts & Crafts`}
        description={eventsPageContent.hero.description}
      />

      {/* Editorial Hero */}
      <EventHero eventsPageContent={eventsPageContent} />

      {/* Sticky Discovery Bar */}
      <EventStickyNav
        ref={navRef}
        isSticky={isSticky}
        isNavbarHidden={isNavbarHidden}
        navbarHeight={navbarHeight}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        setCurrentPage={setCurrentPage}
        setIsFilterOpen={setIsFilterOpen}
        categories={categories}
        activeCategory={activeCategory}
        handleCategorySelect={handleCategorySelect}
        sortBy={sortBy}
        setSortBy={setSortBy}
      />

      {/* Promo Banner - Cinematic Luxury Redesign */}
      {eventsPageContent?.promo?.isActive !== false && (
        <PromoBanner
          backgroundImage={eventsPageContent.promo.backgroundImage}
          badgeText={
            promoCoupon ? `Active Promo: ${promoCoupon.code}` : eventsPageContent.promo.badgeText
          }
          statusText={eventsPageContent.promo.statusText}
          title={eventsPageContent.promo.title}
          highlightText={
            promoCoupon
              ? promoCoupon.discountType === 'percentage'
                ? `${promoCoupon.discountValue}% Off`
                : `₹${promoCoupon.discountValue} Off`
              : eventsPageContent.promo.highlightText
          }
          description={
            promoCoupon
              ? `Claim coupon code ${promoCoupon.code} for immediate savings on your checkout selections.`
              : eventsPageContent.promo.description
          }
          ctaText={eventsPageContent.promo.ctaText}
          onCtaClick={() => {
            if (promoCoupon) {
              handleClaimOffer();
            } else {
              const link = eventsPageContent.promo.ctaLink;
              if (link && link.startsWith('/')) {
                navigate(link);
              } else if (link && !link.includes(' ')) {
                const el = document.getElementById(link);
                if (el) el.scrollIntoView({ behavior: 'smooth' });
                else navigate('/coupons');
              } else {
                const el = document.getElementById('event-collection');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }
            }
          }}
          timer={
            promoCoupon
              ? [
                  { l: 'D', v: countdown.D },
                  { l: 'H', v: countdown.H },
                  { l: 'M', v: countdown.M },
                  { l: 'S', v: countdown.S },
                ]
              : null
          }
        />
      )}

      {/* Main Grid Section */}
      <main
        id="event-collection"
        className="max-w-max-width mx-auto px-margin-mobile lg:px-margin-desktop relative pb-12 lg:pb-16"
      >
        <MandalaArtDecor
          className="absolute -top-12 -right-10 lg:-top-16 lg:-right-12 pointer-events-none z-0"
          size={400}
          variant={1}
          opacity={0.15}
          spinDuration={120}
        />
        <div className="flex flex-col lg:flex-row gap-8 xl:gap-12">
          {/* Sidebar Filter */}
          <aside className="w-full lg:w-64 xl:w-72 flex-shrink-0 lg:sticky lg:top-32 lg:max-h-[calc(100vh-140px)] lg:overflow-y-auto no-scrollbar pb-4">
            <EventFilterPanel
              currentFilters={filters}
              onToggleFilter={toggleFilter}
              onClearAll={clearAllFilters}
              isOpen={isFilterOpen}
              onClose={() => setIsFilterOpen(false)}
              sortBy={sortBy}
              onSortChange={setSortBy}
              categories={categories}
              styles={styles}
            />
          </aside>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-10">
              <div className="flex flex-col gap-1">
                <h2 className="font-headline-md text-on-surface font-normal text-[24px] lg:text-[32px]">
                  Luxury Scapes
                </h2>
                <p className="font-body-md text-on-surface-variant/60 font-medium">
                  {filteredEvents.length} cinematic curations available
                </p>
              </div>
            </div>

            <MobileStickyCategories
              categories={categories}
              activeCategory={activeCategory}
              handleCategorySelect={handleCategorySelect}
              isNavbarHidden={isNavbarHidden}
              navbarHeight={navbarHeight}
            />

            <EventGrid
              isLoading={isLoading}
              filteredEvents={filteredEvents}
              paginatedEvents={paginatedEvents}
              currentPage={currentPage}
              totalPages={totalPages}
              setCurrentPage={setCurrentPage}
              setSearchParams={setSearchParams}
              clearAllFilters={clearAllFilters}
              activeCategory={activeCategory}
              searchQuery={searchQuery}
              filters={filters}
            />
          </div>
        </div>

        {/* Subtle background art anchor at the bottom */}
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

      {/* Complementary Products Section */}
      <ComplementaryProducts
        matchingProducts={matchingProducts}
        handleOpenQuickView={handleOpenQuickView}
      />

      {/* Quick View Modal */}
      <QuickViewModal
        isOpen={isQuickViewOpen}
        onClose={() => setIsQuickViewOpen(false)}
        product={quickViewProduct}
      />
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
      id="event-mobile-sticky-categories"
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
