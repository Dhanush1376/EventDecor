import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ProductCard,
  QuickViewModal,
  CustomDropdown,
  SearchBar,
  CategoryTabs,
  Pagination,
  EventFilterPanel,
  PromoBanner,
} from "../components/ui";
import { eventService, productService, couponService } from "../services/domainServices";
import { SEO } from "../components/seo/SEO";
import { MandalaElement } from "../components/ui/MandalaElement";
import { MandalaArtDecor } from "../components/ui/MandalaArtDecor";
import { handleImageError } from "../utils/imageUtils";
import toast from "react-hot-toast";
import { useCart } from "../context/CartContext";
import { useWebsiteContent } from "../hooks/useWebsiteContent";

import logger from '../utils/logger';
export function EventCollections() {
  const { setClaimedCoupon } = useCart();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryParam = searchParams.get("category") || "All Occasions";
  const searchParam = searchParams.get("search") || "";
  const pageParam = parseInt(searchParams.get("page") || "1", 10);

  const [searchQuery, setSearchQuery] = useState(searchParam);
  const [activeCategory, setActiveCategory] = useState(categoryParam);
  const [sortBy, setSortBy] = useState("Popularity");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSticky, setIsSticky] = useState(false);
  const sentinelRef = React.useRef(null);
  const [currentPage, setCurrentPage] = useState(pageParam);


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
  const [categories, setCategories] = useState(["All Occasions"]);
  const [styles, setStyles] = useState(["All Styles"]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setActiveCategory(searchParams.get("category") || "All Occasions");
    setSearchQuery(searchParams.get("search") || "");
    setCurrentPage(parseInt(searchParams.get("page") || "1", 10));
  }, [searchParams]);

  // Debounced search to prevent url param clutter on typing
  const [debouncedSearch, setDebouncedSearch] = useState(searchParam);
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const currentSearchInUrl = searchParams.get("search") || "";
    if (debouncedSearch !== currentSearchInUrl) {
      setSearchParams(prev => {
        const params = new URLSearchParams(prev);
        if (debouncedSearch) {
          params.set("search", debouncedSearch);
        } else {
          params.delete("search");
        }
        params.delete("page");
        return params;
      }, { replace: true });
    }
  }, [debouncedSearch, setSearchParams, searchParams]);

  const websiteContent = useWebsiteContent();
  const eventsPageContent = websiteContent?.eventsPage || {
    hero: {
      title: "Luxury Event Scapes",
      subtitle: "Cinematic Environments",
      description: "Immersive architectural curations designed to transform your milestone celebrations into living masterpieces.",
      backgroundImage: "https://lh3.googleusercontent.com/aida-public/AB6AXuA7F3ck_1VBGtclja4rFpblASLZWmGyrrSeXc-D7PYlO1RJFSwwrZdHFE80h72hY1_kcwRRwjHuqfhG4Zlouur0m6jrXSLrhifw9vDKzna2lQ-ju5fdSEXiP7YRFTwnqlKsqohXveyKFObF5Wlx3w4eHE_H8k0Y1_l5DTr3WtpRbeEK40rGPLPe9CzEazxPBk_dKXe0G4hYrk0NZhhWEsdpFvGFb0pGyqjB5La45C5zfJ87FPCec_D1_Au1Z-IJca6gythEhj_rF4g",
    },
    promo: {
      backgroundImage: "https://lh3.googleusercontent.com/aida-public/AB6AXuArmLX9xra0m1GxmrjS8xH0pXUpTrKa18fhO9gW8NY160WAZ5MfXc157OoFlIivj6H_WT6aMZVWNjLvqixrhrBG2ryiAU15p_ZC42em1Dzj1w8ukwUFzndsHouARkcvS5wRRDyDVaOaIHwbiV5vUgkbNfc6zFl8XAYOQBERj5JYLZZOPpjaoiUd4B_6zT7iQQYhbyHU5Q5geiCAvvn2hga0_UsahQbwxSy3eLhHFEKPHc897yWc_fLyCPjkZ0wcfIcXDcMrPumI35w",
    }
  };

  const [promoCoupon, setPromoCoupon] = useState(null);
  const [countdown, setCountdown] = useState({ D: "02", H: "14", M: "42", S: "00" });

  useEffect(() => {
    couponService.getAll().then((res) => {
      if (res.success && res.data) {
        const list = res.data.data || res.data.items || (Array.isArray(res.data) ? res.data : []);
        const activeList = list.filter(c => 
          c.isActive && 
          new Date() <= new Date(c.expiryDate) &&
          c.displayLocations && 
          c.displayLocations.includes("banner")
        );
        if (activeList.length > 0) {
          activeList.sort((a, b) => b.discountValue - a.discountValue);
          setPromoCoupon(activeList[0]);
        } else {
          setPromoCoupon(null);
        }
      }
    }).catch(err => {
      logger.warn("Failed to fetch coupons for promo banner in EventCollections", err);
    });
  }, []);

  useEffect(() => {
    const targetDate = promoCoupon ? new Date(promoCoupon.expiryDate) : (() => {
      const tomorrow = new Date();
      tomorrow.setHours(23, 59, 59, 999);
      return tomorrow;
    })();

    const interval = setInterval(() => {
      const now = new Date();
      const diff = targetDate - now;

      if (diff <= 0) {
        setCountdown({ D: "00", H: "00", M: "00", S: "00" });
        clearInterval(interval);
      } else {
        const d = Math.floor(diff / (1000 * 60 * 60 * 24));
        const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);

        setCountdown({
          D: String(d).padStart(2, "0"),
          H: String(h).padStart(2, "0"),
          M: String(m).padStart(2, "0"),
          S: String(s).padStart(2, "0")
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [promoCoupon]);

  const handleClaimOffer = () => {
    const code = promoCoupon ? promoCoupon.code : "SIRI40";
    navigator.clipboard.writeText(code);
    setClaimedCoupon(code);
    toast.success((t) => (
      <div className="flex flex-col gap-1 p-1">
        <span className="font-bold text-xs text-on-surface flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[16px] text-green-700">local_activity</span>
          Coupon claimed successfully!
        </span>
        <span className="text-[10px] text-on-surface-variant font-mono">Code "<strong className="text-primary font-bold">{code}</strong>" copied to clipboard.</span>
        <span className="text-[10px] text-green-800 font-semibold mt-1">🎟️ We will automatically apply this coupon at checkout!</span>
      </div>
    ), { duration: 5000, position: "bottom-right" });
  };

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [eventsRes, productsRes] = await Promise.all([
          eventService.getAll(),
          productService.getAll({ featured: true, limit: 4 })
        ]);

        if (eventsRes.success) {
          const events = eventsRes.data.items || eventsRes.data.data || (Array.isArray(eventsRes.data) ? eventsRes.data : []);
          setMasterEvents(events);
          
          // Extract unique categories and styles
          const uniqueCats = ["All Occasions", ...new Set(events.map(e => e.category))];
          const uniqueStyles = ["All Styles", ...new Set(events.map(e => e.style))];
          setCategories(uniqueCats);
          setStyles(uniqueStyles);
        }
        
        if (productsRes.success) {
          const products = productsRes.data.data || productsRes.data.items || (Array.isArray(productsRes.data) ? productsRes.data : []);
          setMatchingProducts(products);
        }
      } catch (err) {
        logger.error("Event fetch failed:", err);
        toast.error("Failed to load events");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (sentinelRef.current) {
        const rect = sentinelRef.current.getBoundingClientRect();
        const isMobile = window.innerWidth < 768;
        const negativeMargin = isMobile ? 24 : 32;
        setIsSticky(rect.top <= 60 + negativeMargin);
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (isFilterOpen) {
      document.body.classList.add("filters-open");
    } else {
      document.body.classList.remove("filters-open");
    }
    return () => document.body.classList.remove("filters-open");
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
    setActiveCategory("All Occasions");
    setSearchQuery("");
    setSearchParams({});
    setCurrentPage(1);
  }, [setSearchParams]);

  const filteredEvents = useMemo(() => {
    let result = [...masterEvents];

    // Top-level Category Filter (Tabs)
    if (activeCategory !== "All Occasions") {
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
        const priceNum = e.pricing ? parseInt(e.pricing.replace(/[^0-9]/g, "")) : 0;
        return filters.price.some((range) => {
          if (range === "Under ₹1,00,000") return priceNum < 100000;
          if (range === "₹1,00,000 - ₹3,00,000")
            return priceNum >= 100000 && priceNum <= 300000;
          if (range === "₹3,00,000 - ₹5,00,000")
            return priceNum >= 300000 && priceNum <= 500000;
          if (range === "Over ₹5,00,000") return priceNum > 500000;
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
    if (sortBy === "Price: Low to High") {
      result.sort((a, b) => {
        const pa = a.pricing ? parseInt(a.pricing.replace(/[^0-9]/g, "")) : 0;
        const pb = b.pricing ? parseInt(b.pricing.replace(/[^0-9]/g, "")) : 0;
        return pa - pb;
      });
    } else if (sortBy === "Price: High to Low") {
      result.sort((a, b) => {
        const pa = a.pricing ? parseInt(a.pricing.replace(/[^0-9]/g, "")) : 0;
        const pb = b.pricing ? parseInt(b.pricing.replace(/[^0-9]/g, "")) : 0;
        return pb - pa;
      });
    }

    return result;
  }, [activeCategory, searchQuery, sortBy, filters, masterEvents]);

  const ITEMS_PER_PAGE = 12;
  const totalPages = Math.max(
    1,
    Math.ceil(filteredEvents.length / ITEMS_PER_PAGE),
  );
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
    setSearchParams(prev => {
      const params = new URLSearchParams(prev);
      if (cat === "All Occasions") {
        params.delete("category");
      } else {
        params.set("category", cat);
      }
      params.delete("page");
      return params;
    });
    setActiveCategory(cat);
    setCurrentPage(1);
    setTimeout(() => {
      const element = document.getElementById("event-collection");
      if (element) {
        const yOffset = -80;
        const y =
          element.getBoundingClientRect().top + window.scrollY + yOffset;
        window.scrollTo({ top: y, behavior: "smooth" });
      }
    }, 50);
  };

  const styleOptions = useMemo(
    () => styles.map((s) => ({ value: s, label: s })),
    [styles],
  );

  return (
    <div className="bg-surface min-h-screen text-on-surface">
      <SEO
        title={`${eventsPageContent.hero.title} | Siri Arts & Crafts`}
        description={eventsPageContent.hero.description}
      />

      {/* Editorial Hero */}
      <section className="relative min-h-[320px] md:h-[70vh] flex items-center overflow-hidden bg-on-surface-variant">
        <motion.div
          initial={{ scale: 1.1, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.65 }}
          transition={{ duration: 1.5 }}
          className="absolute inset-0"
        >
          <img
            onError={handleImageError}
            src={eventsPageContent.hero.backgroundImage}
            className="w-full h-full object-cover"
            alt="Cinematic Events Background"
          />
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-surface" />

        {/* Top-right decorative art anchor */}
        <MandalaArtDecor
          variant={2}
          size={500}
          className="-top-20 -right-20 hidden lg:block"
          opacity={0.12}
          spinDuration={240}
        />
        <MandalaArtDecor
          variant={2}
          size={250}
          className="-top-10 -right-10 lg:hidden"
          opacity={0.15}
          spinDuration={240}
        />

        <div className="max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop w-full relative z-10 text-center">
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-label-sm text-surface tracking-[0.4em] uppercase mb-6 block"
          >
            {eventsPageContent.hero.subtitle}
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="font-headline-xl text-[32px] sm:text-[42px] md:text-[56px] lg:text-[72px] text-surface mb-4 md:mb-8 text-gold leading-tight"
          >
            {eventsPageContent.hero.title}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="font-body-lg text-[13px] md:text-[16px] lg:text-[18px] text-surface/80 max-w-2xl mx-auto font-light leading-relaxed px-4"
          >
            {eventsPageContent.hero.description}
          </motion.p>
        </div>
      </section>

      {/* Sticky Discovery Bar */}
      {/* Sentinel for sticky trigger */}
      <div ref={sentinelRef} />

      {/* Floating / Sticky Navigation Bar Wrapper to prevent layout shift and glitching */}
      <div className={isSticky ? "h-[68px] lg:h-[76px] mb-8 md:mb-12" : ""}>
        <nav
          className={`z-50 transition-all duration-500 ${
            isSticky 
              ? "fixed top-[60px] left-0 w-full bg-transparent border-transparent py-2 px-margin-mobile md:px-margin-desktop pointer-events-none" 
              : "border-transparent relative -mt-6 md:-mt-8 mb-8 md:mb-12 max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop"
          }`}
        >
          <div
            className="transition-all duration-500 border flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6 bg-white/90 backdrop-blur-xl border-black/5 shadow-md rounded-[2rem] p-3 md:p-4 w-full pointer-events-auto max-w-max-width mx-auto"
          >
            {/* Search Bar & Mobile Filter Toggle */}
            <div className="w-full lg:w-72 xl:w-80 flex items-center gap-2 shrink-0">
              <div className="flex-1 h-11">
                <SearchBar
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search masteries..."
                  className="w-full !h-full !rounded-full bg-surface-bright/90 backdrop-blur-md shadow-sm !px-5 text-[13px] flex items-center border border-outline-variant/30 outline-none focus:outline-none"
                />
              </div>
              {/* Mobile/Tablet Filter Toggle */}
              <button
                onClick={() => setIsFilterOpen(true)}
                className="lg:hidden flex items-center justify-center w-11 h-11 rounded-full bg-on-surface text-surface shadow-md transition-all active:scale-95 shrink-0 outline-none focus:outline-none focus-visible:outline-none"
              >
                <span className="material-symbols-outlined text-[20px]">
                  tune
                </span>
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
                <div className="w-48 xl:w-52 h-11">
                  <CustomDropdown
                    options={[
                      { value: "Popularity", label: "Popularity" },
                      {
                        value: "Price: Low to High",
                        label: "Price: Low to High",
                      },
                      {
                        value: "Price: High to Low",
                        label: "Price: High to Low",
                      },
                    ]}
                    value={sortBy}
                    onChange={setSortBy}
                    className="w-full h-full"
                    buttonClassName="w-full h-full !rounded-full border !border-outline-variant/30 shadow-sm !bg-surface-bright/90 backdrop-blur-md !py-0 !px-5 text-[12px]"
                  />
                </div>
              </div>
            </div>
          </div>
        </nav>
      </div>

      {/* Early Booking Banner - Cinematic Luxury Redesign */}
      {promoCoupon && (
        <PromoBanner
          backgroundImage={eventsPageContent.promo.backgroundImage}
          badgeText={`Active Promo: ${promoCoupon.code}`}
          statusText="Ends Soon"
          title="Limited Offer — "
          highlightText={promoCoupon.discountType === "percentage" ? `${promoCoupon.discountValue}% Off` : `₹${promoCoupon.discountValue} Off`}
          description={`Claim coupon code ${promoCoupon.code} for immediate savings on your checkout selections.`}
          ctaText="Claim Offer"
          onCtaClick={handleClaimOffer}
          timer={[
            { l: "D", v: countdown.D },
            { l: "H", v: countdown.H },
            { l: "M", v: countdown.M },
            { l: "S", v: countdown.S }
          ]}
        />
      )}

      {/* Main Grid Section */}
      <main
        id="event-collection"
        className="max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop relative pb-12 md:pb-16"
      >
        <MandalaElement
          className="absolute top-[20%] -right-[10%] opacity-[0.03]"
          size={600}
          variant={2}
        />
        <div className="flex flex-col lg:flex-row gap-8 xl:gap-12">
          {/* Sidebar Filter */}
          <aside className="w-full lg:w-64 xl:w-72 flex-shrink-0 lg:sticky lg:top-32 h-fit">
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
                <h2 className="font-headline-md text-on-surface font-bold text-[24px] md:text-[32px]">
                  Luxury Scapes
                </h2>
                <p className="font-body-md text-on-surface-variant/60 font-medium">
                  {filteredEvents.length} cinematic curations available
                </p>
              </div>
            </div>

            <div className="mb-10 overflow-x-auto no-scrollbar">
              <CategoryTabs
                categories={categories}
                activeCategory={activeCategory}
                onCategoryChange={handleCategorySelect}
              />
            </div>

            <AnimatePresence mode="wait">
              {filteredEvents.length > 0 ? (
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
                          <img
                            onError={handleImageError}
                            src={evItem.image}
                            alt={evItem.title}
                            className="w-full h-full object-cover transition-transform duration-[1.5s] ease-out group-hover:scale-105"
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
                                  {evItem.style || "Traditional"}
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
                          setSearchParams(prev => {
                            const params = new URLSearchParams(prev);
                            if (page === 1) {
                              params.delete("page");
                            } else {
                              params.set("page", String(page));
                            }
                            return params;
                          });
                          setCurrentPage(page);
                          setTimeout(() => {
                            const el =
                              document.getElementById("event-collection");
                            if (el) {
                              const y =
                                el.getBoundingClientRect().top +
                                window.scrollY -
                                80;
                              window.scrollTo({ top: y, behavior: "smooth" });
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
                  <h3 className="font-headline-sm text-on-surface mb-3">
                    No curations match.
                  </h3>
                  <button onClick={clearAllFilters} className="btn-primary">
                    Clear All Filters
                  </button>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Subtle background art anchor at the bottom */}
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

      {/* Complementary Products Section */}
      <section className="py-12 md:py-16 bg-surface border-t border-outline-variant/10 relative overflow-hidden">
        <div className="max-w-max-width mx-auto px-4 md:px-margin-desktop">
          <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 mb-12">
            <div className="space-y-1">
              <span className="font-label-sm text-[10px] text-primary uppercase tracking-[0.4em] font-bold block">
                COLLECTIVE HARMONY
              </span>
              <h2 className="font-display text-[32px] md:text-[42px] text-on-surface font-normal">
                Matching Decor
              </h2>
            </div>
            <Link
              to="/collections"
              className="text-[10px] md:text-xs text-primary font-bold uppercase tracking-widest underline decoration-primary/20"
            >
              Explore Inventory →
            </Link>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {matchingProducts.map((prod) => (
              <ProductCard
                key={prod._id || prod.id}
                {...prod}
                id={prod._id || prod.id}
                onQuickView={handleOpenQuickView}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Quick View Modal */}
      <QuickViewModal
        isOpen={isQuickViewOpen}
        onClose={() => setIsQuickViewOpen(false)}
        product={quickViewProduct}
      />
    </div>
  );
}
