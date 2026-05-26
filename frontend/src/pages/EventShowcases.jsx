import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { SEO } from "../components/seo/SEO";
import { showcaseService, bookingService } from "../services/domainServices";
import { MandalaArtDecor } from "../components/ui/MandalaArtDecor";
import { MandalaElement } from "../components/ui/MandalaElement";
import { SearchBar, CategoryTabs, CustomDropdown, Pagination, Skeleton, ShowcaseCard, EventShowcaseFilterPanel } from "../components/ui";
import { handleImageError } from "../utils/imageUtils";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { useWebsiteContent } from "../hooks/useWebsiteContent";
import { useQuery } from "@tanstack/react-query";
import logger from "../utils/logger";

const SHOWCASE_CATEGORIES = [
  "All",
  "Telugu Heritage",
  "Engagement Gift",
  "Ring Ceremony",
  "Tambulam Showcase",
  "Coconut Decor",
  "Jewelry Tray",
];

const CATEGORY_MAP = {
  "Telugu Heritage": "telugu_heritage",
  "Engagement Gift": "engagement_gift",
  "Ring Ceremony": "ring_ceremony",
  "Tambulam Showcase": "tambulam_showcase",
  "Coconut Decor": "coconut_decor",
  "Jewelry Tray": "jewelry_tray",
};

export function EventShowcases() {
  const navigate = useNavigate();
  const { isAuthenticated, runProtectedAction } = useAuth();

  const websiteContent = useWebsiteContent();
  const eventsPageContent = websiteContent?.eventsPage || {
    hero: {
      title: "Luxury Event Scapes",
      subtitle: "Cinematic Environments",
      description: "Stunning handcrafted designs to transform your milestone celebrations into living masterpieces.",
      backgroundImage: "https://lh3.googleusercontent.com/aida-public/AB6AXuA7F3ck_1VBGtclja4rFpblASLZWmGyrrSeXc-D7PYlO1RJFSwwrZdHFE80h72hY1_kcwRRwjHuqfhG4Zlouur0m6jrXSLrhifw9vDKzna2lQ-ju5fdSEXiP7YRFTwnqlKsqohXveyKFObF5Wlx3w4eHE_H8k0Y1_l5DTr3WtpRbeEK40rGPLPe9CzEazxPBk_dKXe0G4hYrk0NZhhWEsdpFvGFb0pGyqjB5La45C5zfJ87FPCec_D1_Au1Z-IJca6gythEhj_rF4g",
    },
    promo: {
      backgroundImage: "https://lh3.googleusercontent.com/aida-public/AB6AXuArmLX9xra0m1GxmrjS8xH0pXUpTrKa18fhO9gW8NY160WAZ5MfXc157OoFlIivj6H_WT6aMZVWNjLvqixrhrBG2ryiAU15p_ZC42em1Dzj1w8ukwUFzndsHouARkcvS5wRRDyDVaOaIHwbiV5vUgkbNfc6zFl8XAYOQBERj5JYLZZOPpjaoiUd4B_6zT7iQQYhbyHU5Q5geiCAvvn2hga0_UsahQbwxSy3eLhHFEKPHc897yWc_fLyCPjkZ0wcfIcXDcMrPumI35w",
    }
  };
  
  // Storefront Listing Filters & Controls (Matching Shop Design)
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [sortBy, setSortBy] = useState("Popularity");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSticky, setIsSticky] = useState(false);
  const sentinelRef = React.useRef(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  const [filters, setFilters] = useState({
    price: [],
    setupTime: [],
    accents: [],
  });

  // Customizer Drawer State
  const [selectedShowcase, setSelectedShowcase] = useState(null);
  const [customInclusions, setCustomInclusions] = useState([]);
  const [rentalDurationDays, setRentalDurationDays] = useState(1);
  const [selectedPaletteColor, setSelectedPaletteColor] = useState("");
  const [placementPreference, setPlacementPreference] = useState("Side-Stage Showcase Corner");
  const [uploadedReferenceName, setUploadedReferenceName] = useState("");
  const [customNote, setCustomNote] = useState("");
  const [bookingDate, setBookingDate] = useState("");
  const [aiSuggestions, setAiSuggestions] = useState([]);

  const { data: showcases = [], isLoading: loading, isError } = useQuery({
    queryKey: ['showcases'],
    queryFn: async () => {
      const res = await showcaseService.getAll();
      if (!res.success) throw new Error("Failed to load event design packages.");
      return res.data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (isError) {
      toast.error("Failed to load event design packages.");
    }
  }, [isError]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const handleScroll = () => {
      if (sentinelRef.current) {
        const rect = sentinelRef.current.getBoundingClientRect();
        const isMobile = window.innerWidth < 768;
        const negativeMargin = isMobile ? 32 : 48; // -mt-8 is 32px, -mt-12 is 48px
        setIsSticky(rect.top <= 60 + negativeMargin);
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (isFilterOpen) document.body.classList.add("filters-open");
    else document.body.classList.remove("filters-open");
    return () => document.body.classList.remove("filters-open");
  }, [isFilterOpen]);

  // Filter & Sort Logic
  const filteredAndSortedShowcases = useMemo(() => {
    let list = [...showcases];

    // Search Query filter
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase().trim();
      list = list.filter(
        s => s.title?.toLowerCase().includes(q) || 
             s.description?.toLowerCase().includes(q) ||
             s.subtitle?.toLowerCase().includes(q) ||
             s.inclusions?.some(inc => inc.name?.toLowerCase().includes(q))
      );
    }

    // Category Tab filter
    if (activeCategory !== "All") {
      const mappedKey = CATEGORY_MAP[activeCategory];
      if (mappedKey) {
        list = list.filter(s => s.category === mappedKey);
      }
    }

    // Price Checkbox filter
    if (filters.price.length > 0) {
      list = list.filter(s => {
        const p = s.rentalPrice || 15000;
        return filters.price.some(range => {
          if (range === "Under ₹10,000") return p < 10000;
          if (range === "₹10,000 - ₹20,000") return p >= 10000 && p <= 20000;
          if (range === "₹20,000 - ₹35,000") return p >= 20000 && p <= 35000;
          if (range === "Over ₹35,000") return p > 35000;
          return false;
        });
      });
    }

    // Setup Time Checkbox filter
    if (filters.setupTime.length > 0) {
      list = list.filter(s => {
        const t = s.setupTimeHours || 2;
        return filters.setupTime.some(range => {
          if (range === "Quick (< 2 Hours)") return t < 2;
          if (range === "Standard (2-4 Hours)") return t >= 2 && t <= 4;
          if (range === "Intricate (> 4 Hours)") return t > 4;
          return false;
        });
      });
    }

    // Accents Checkbox filter
    if (filters.accents.length > 0) {
      list = list.filter(s => {
        const txt = JSON.stringify(s.inclusions || []).toLowerCase();
        return filters.accents.some(acc => txt.includes(acc.toLowerCase()));
      });
    }

    // Sorting
    if (sortBy === "Price: Low to High") {
      list.sort((a, b) => (a.rentalPrice || 0) - (b.rentalPrice || 0));
    } else if (sortBy === "Price: High to Low") {
      list.sort((a, b) => (b.rentalPrice || 0) - (a.rentalPrice || 0));
    } else if (sortBy === "Fastest Setup") {
      list.sort((a, b) => (a.setupTimeHours || 2) - (b.setupTimeHours || 2));
    } else {
      // Default / Popularity (fallback ID/date sort)
      list.sort((a, b) => String(a._id || a.id).localeCompare(String(b._id || b.id)));
    }

    return list;
  }, [showcases, debouncedSearch, activeCategory, sortBy, filters]);

  // Pagination calculation
  const totalCount = filteredAndSortedShowcases.length;
  const totalPages = Math.ceil(totalCount / itemsPerPage) || 1;
  const paginatedShowcases = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedShowcases.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedShowcases, currentPage]);

  const toggleFilter = (type, value) => {
    setFilters(prev => {
      const current = prev[type] || [];
      const next = current.includes(value) ? current.filter(i => i !== value) : [...current, value];
      return { ...prev, [type]: next };
    });
    setCurrentPage(1);
  };

  const clearAllFilters = () => {
    setFilters({ price: [], setupTime: [], accents: [] });
    setActiveCategory("All");
    setSearchQuery("");
    setCurrentPage(1);
  };

  const handleOpenShowcase = (sc) => {
    navigate(`/events/${sc._id || sc.id}`);
  };

  const toggleInclusion = (name) => {
    setCustomInclusions(prev => prev.map(inc => 
      inc.name === name ? { ...inc, selected: !inc.selected } : inc
    ));
  };

  const updateInclusionQty = (name, delta) => {
    setCustomInclusions(prev => prev.map(inc => 
      inc.name === name ? { ...inc, qty: Math.max(1, inc.qty + delta) } : inc
    ));
  };

  const calculateLivePrice = () => {
    if (!selectedShowcase) return 0;
    const basePrice = selectedShowcase.rentalPrice || 15000;
    const itemsAdjustment = customInclusions.reduce((acc, item) => {
      if (!item.selected) return acc - (basePrice * 0.05);
      if (item.qty > item.defaultQty) return acc + ((item.qty - item.defaultQty) * (basePrice * 0.1));
      return acc;
    }, 0);
    const durationMultiplier = rentalDurationDays === 1 ? 1 : rentalDurationDays === 2 ? 1.5 : 1.5 + (rentalDurationDays - 2) * 0.4;
    return Math.round(Math.max(basePrice * 0.5, basePrice + itemsAdjustment) * durationMultiplier);
  };

  const handleBookRental = async () => {
    if (!isAuthenticated) {
      runProtectedAction(() => handleBookRental());
      return;
    }
    if (!bookingDate) {
      toast.error("Please select a target ceremony date!");
      return;
    }

    const loadId = toast.loading("Reserving showcase arrangement crates...");
    try {
      const finalAddons = customInclusions
        .filter(i => i.selected)
        .map(i => ({ name: `${i.name} (Qty: ${i.qty})`, price: 0 }));

      const bookingData = {
        title: `Rent: ${selectedShowcase.title}`,
        eventType: selectedShowcase.category || "Showcase Rental",
        date: bookingDate,
        timing: { start: "09:00 AM", end: "09:00 PM" },
        guestCount: 100,
        venue: {
          address: `Showcase Placement: ${placementPreference}. Notes: ${customNote}`,
          isOutdoor: false,
        },
        customization: {
          themeColor: `Color Profile: ${selectedPaletteColor}`,
          floralPreference: "Matching Traditional Silk-Thread Accents",
          additionalRequests: `Showcase Duration: ${rentalDurationDays} Days. Note: ${customNote}`,
        },
        selectedAddons: finalAddons,
      };

      const res = await bookingService.create(bookingData);
      toast.dismiss(loadId);
      if (res.success) {
        toast.success("Decor Showcase reserved! Track setup times in your dashboard.");
        setSelectedShowcase(null);
        navigate("/dashboard");
      }
    } catch (err) {
      toast.dismiss(loadId);
      toast.error("Failed to place rental inquiry.");
    }
  };



  return (
    <div className="bg-surface min-h-screen font-body">
      <SEO title={`${eventsPageContent.hero.title} | Siri Arts & Crafts`} description={eventsPageContent.hero.description} />

      {/* Editorial Hero (Unified with Shop Design) */}
      <section className="relative min-h-[320px] md:h-[70vh] flex items-center overflow-hidden bg-on-surface-variant">
        <motion.div
          initial={{ scale: 1.1, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.6 }}
          transition={{ duration: 1.5 }}
          className="absolute inset-0"
        >
          <img
            onError={handleImageError}
            src={eventsPageContent.hero.backgroundImage}
            className="w-full h-full object-cover"
            alt="Showcase Hero"
          />
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/20 to-surface" />

        <MandalaArtDecor variant={2} size={500} className="-top-20 -right-20 hidden lg:block absolute" opacity={0.12} spinDuration={240} />
        <MandalaArtDecor variant={2} size={250} className="-top-10 -right-10 lg:hidden absolute" opacity={0.15} spinDuration={240} />

        <div className="max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop w-full relative z-10 text-center">
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-label-sm text-surface tracking-[0.4em] uppercase mb-6 block text-[#ffe088]"
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
            className="font-body-lg text-[13px] md:text-[16px] lg:text-[18px] text-surface/80 max-w-xl mx-auto font-light leading-relaxed px-4"
          >
            {eventsPageContent.hero.description}
          </motion.p>
        </div>
      </section>

      {/* Sentinel for sticky trigger */}
      <div ref={sentinelRef} />

      {/* Floating / Sticky Navigation Bar Wrapper to prevent layout shift and glitching */}
      <div className={isSticky ? "h-[68px] lg:h-[76px] mb-10 md:mb-12" : ""}>
        <nav
          className={`z-50 transition-all duration-500 ${
            isSticky 
              ? "fixed top-[60px] left-0 w-full bg-transparent border-transparent py-2 px-margin-mobile md:px-margin-desktop pointer-events-none" 
              : "relative -mt-8 md:-mt-12 mb-10 md:mb-12 max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop"
          }`}
        >
          <div
            className="transition-all duration-500 border flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6 bg-white/90 backdrop-blur-xl border-black/5 shadow-md rounded-[2rem] p-3 md:p-4 w-full pointer-events-auto max-w-max-width mx-auto"
          >
          
          {/* Search Bar & Mobile Filter Toggle */}
          <div className="w-full lg:w-72 xl:w-80 flex items-center gap-1.5 shrink-0">
            <div className="flex-1 h-11">
              <SearchBar
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search event design packages..."
                className="w-full !h-full !rounded-full bg-surface-bright/90 backdrop-blur-md shadow-sm !px-5 text-[13px] flex items-center border border-outline-variant/30 outline-none focus:outline-none"
              />
            </div>
            <button
              onClick={() => setIsFilterOpen(true)}
              className="lg:hidden flex items-center justify-center w-11 h-11 rounded-full bg-on-surface text-surface shadow-md transition-all active:scale-[0.98] active:opacity-90 shrink-0 cursor-pointer outline-none focus:outline-none focus-visible:outline-none"
            >
              <span className="material-symbols-outlined text-[20px]">tune</span>
            </button>
          </div>

          {/* Desktop Category Tabs & Sort Dropdown */}
          <div className="hidden lg:flex items-center justify-between gap-6 flex-1 min-w-0">
            <div className="flex-1 overflow-hidden flex justify-start lg:justify-center">
              <CategoryTabs
                categories={SHOWCASE_CATEGORIES}
                activeCategory={activeCategory}
                onCategoryChange={(cat) => {
                  setActiveCategory(cat);
                  setCurrentPage(1);
                  setTimeout(() => {
                    const el = document.getElementById("showcase-collection");
                    if (el) {
                      const y = el.getBoundingClientRect().top + window.scrollY - 80;
                      window.scrollTo({ top: y, behavior: "smooth" });
                    }
                  }, 50);
                }}
              />
            </div>
            <div className="flex items-center shrink-0">
              <div className="w-48 xl:w-52 h-11">
                <CustomDropdown
                  options={[
                    { value: "Popularity", label: "Popularity" },
                    { value: "Price: Low to High", label: "Price: Low to High" },
                    { value: "Price: High to Low", label: "Price: High to Low" },
                    { value: "Fastest Setup", label: "Fastest Setup" },
                  ]}
                  value={sortBy}
                  onChange={(val) => { setSortBy(val); setCurrentPage(1); }}
                  className="w-full h-full"
                  buttonClassName="w-full h-full !rounded-full border !border-outline-variant/30 shadow-sm !bg-surface-bright/90 backdrop-blur-md !py-0 !px-5 text-[12px]"
                />
              </div>
            </div>
          </div>
        </div>
      </nav>
      </div>

      {/* Main Grid Section */}
      <main id="showcase-collection" className="max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop relative pb-24 md:pb-40">
        <MandalaElement className="absolute top-[20%] -right-[10%] opacity-[0.03] pointer-events-none" size={600} variant={2} />
        
        <div className="flex flex-col lg:flex-row gap-8 xl:gap-12">
          
          {/* Sidebar Filter - Handles both Desktop Sidebar and Mobile Drawer */}
          <aside className="w-full lg:w-64 xl:w-72 flex-shrink-0 lg:sticky lg:top-32 h-fit">
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
            <div className="flex items-center justify-between mb-10">
              <div className="flex flex-col gap-1">
                <h2 className="font-headline-md text-on-surface font-bold text-[24px] md:text-[32px]">
                  Event Design Packages
                </h2>
                <p className="font-body-md text-on-surface-variant/60 font-medium">
                  {totalCount} premium traditional arrangements available
                </p>
              </div>
            </div>

            {/* Mobile/Tablet Inline Category Tabs */}
            <div className="mb-10 overflow-x-auto no-scrollbar lg:hidden">
              <CategoryTabs
                categories={SHOWCASE_CATEGORIES}
                activeCategory={activeCategory}
                onCategoryChange={(cat) => {
                  setActiveCategory(cat);
                  setCurrentPage(1);
                }}
              />
            </div>

            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-48 md:h-72 w-full rounded-2xl md:rounded-[32px]" />
                ))}
              </div>
            ) : paginatedShowcases.length > 0 ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 lg:gap-8 gap-y-8 sm:gap-y-12">
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
                      category={sc.category}
                      inclusions={sc.inclusions}
                      rating={4.9}
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
                          const el = document.getElementById("showcase-collection");
                          if (el) {
                            const y = el.getBoundingClientRect().top + window.scrollY - 80;
                            window.scrollTo({ top: y, behavior: "smooth" });
                          }
                        }, 50);
                      }}
                    />
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-32 bg-surface-container-low/30 rounded-[40px] border border-dashed border-outline-variant/30 px-6">
                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-8 shadow-sm border border-black/5">
                  <span className="material-symbols-outlined text-[40px] text-on-surface-variant/20">filter_list_off</span>
                </div>
                <h3 className="font-headline-sm text-on-surface mb-3 font-bold text-xl">No traditional showcases found</h3>
                <p className="font-body-md text-on-surface-variant/60 font-light mb-10 max-w-md mx-auto text-sm">
                  Try adjusting your filters, category tabs, or search terms to discover other event designs.
                </p>
                <button onClick={clearAllFilters} className="px-8 py-3.5 bg-primary text-white rounded-full font-label text-xs uppercase tracking-widest font-bold shadow-lg hover:bg-stone-900 transition-all cursor-pointer">
                  Clear All Filters
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* LUXURY SLIDE-OUT CUSTOMIZER DRAWER */}
      <AnimatePresence>
        {selectedShowcase && (
          <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedShowcase(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="relative w-full max-w-[620px] h-full bg-white shadow-2xl flex flex-col z-10 overflow-y-auto"
            >
              <div className="relative h-64 md:h-72 w-full overflow-hidden shrink-0">
                <img src={selectedShowcase.image} className="w-full h-full object-cover" alt={selectedShowcase.title} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <button
                  onClick={() => setSelectedShowcase(null)}
                  className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
                <div className="absolute bottom-6 left-6 right-6 text-white space-y-1">
                  <span className="font-label text-[8px] tracking-[0.2em] text-[#ffe088] uppercase block font-bold">
                    RENTAL SHOWCASE THEME
                  </span>
                  <h2 className="font-display text-2xl font-light leading-tight">{selectedShowcase.title}</h2>
                  <p className="font-body text-white/70 text-[11px] font-light italic truncate">{selectedShowcase.subtitle}</p>
                </div>
              </div>

              <div className="p-6 md:p-8 space-y-8 flex-1">
                <div className="space-y-2">
                  <h4 className="font-label text-[9px] uppercase tracking-widest text-black/45 font-bold">Artisan Composition & Story</h4>
                  <p className="font-body text-xs text-black/60 leading-relaxed font-light">{selectedShowcase.description}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-stone-50 p-4 rounded-2xl border border-stone-200/50">
                  <div className="space-y-1">
                    <label className="font-label text-[8px] uppercase tracking-widest text-black/50 font-bold block">Ceremony Date *</label>
                    <input 
                      type="date"
                      value={bookingDate}
                      onChange={(e) => setBookingDate(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-full border border-black/10 bg-white text-xs outline-none focus:border-primary font-medium"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-label text-[8px] uppercase tracking-widest text-black/50 font-bold block">Rental Days</label>
                    <select
                      value={rentalDurationDays}
                      onChange={(e) => setRentalDurationDays(Number(e.target.value))}
                      className="w-full px-4 py-2.5 rounded-full border border-black/10 bg-white text-xs outline-none focus:border-primary font-medium"
                    >
                      <option value={1}>1 Day Setup (Standard)</option>
                      <option value={2}>2 Days Setup (Ceremony + Return)</option>
                      <option value={3}>3 Days Setup (Extensive)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="font-label text-[9px] uppercase tracking-widest text-black/45 font-bold">Configure Handcrafted Props</h4>
                    <span className="font-body text-[10px] text-primary italic font-semibold">Mix & Match Items</span>
                  </div>
                  <div className="space-y-2">
                    {customInclusions.map((item, idx) => (
                      <div 
                        key={idx} 
                        className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                          item.selected ? "bg-[#fdfbf7] border-primary/20 shadow-2xs" : "bg-neutral-50/50 border-neutral-200/50 opacity-60"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input 
                            type="checkbox"
                            checked={item.selected}
                            onChange={() => toggleInclusion(item.name)}
                            className="w-4 h-4 accent-primary cursor-pointer"
                          />
                          <span className="font-body text-xs text-black font-bold leading-tight">{item.name}</span>
                        </div>
                        {item.selected && (
                          <div className="flex items-center gap-2.5">
                            <button
                              type="button"
                              onClick={() => updateInclusionQty(item.name, -1)}
                              className="w-6 h-6 rounded-full bg-stone-100 flex items-center justify-center text-xs hover:bg-stone-200 font-bold cursor-pointer"
                            >
                              -
                            </button>
                            <span className="font-mono text-xs font-bold text-black w-5 text-center">{item.qty}</span>
                            <button
                              type="button"
                              onClick={() => updateInclusionQty(item.name, 1)}
                              className="w-6 h-6 rounded-full bg-stone-100 flex items-center justify-center text-xs hover:bg-stone-200 font-bold cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="font-label text-[9px] uppercase tracking-widest text-black/45 font-bold block">Silk Thread / Accent Palette</label>
                    <div className="flex gap-2">
                      {selectedShowcase.colorPalette?.map((color, idx) => (
                        <div
                          key={idx}
                          onClick={() => setSelectedPaletteColor(color)}
                          className={`w-8 h-8 rounded-full border cursor-pointer transition-all flex items-center justify-center shadow-xs ${
                            selectedPaletteColor === color ? "ring-2 ring-primary ring-offset-2 scale-110" : "border-black/10 hover:scale-105"
                          }`}
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="font-label text-[9px] uppercase tracking-widest text-black/45 font-bold block">Placement Destination</label>
                    <select
                      value={placementPreference}
                      onChange={(e) => setPlacementPreference(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-full border border-black/10 bg-white text-xs outline-none focus:border-primary font-medium"
                    >
                      <option value="Side-Stage Showcase Corner">Side-Stage Showcase Corner</option>
                      <option value="Entrance Presentation Desk">Entrance Presentation Desk</option>
                      <option value="Traditional Mandap Flanks">Traditional Mandap Flanks</option>
                      <option value="Groom/Bride Seating Podiums">Groom/Bride Seating Podiums</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="font-label text-[9px] uppercase tracking-widest text-black/45 font-bold block">Upload placement visual blueprint (Optional)</label>
                  <div className="border border-dashed border-black/10 rounded-2xl p-5 text-center bg-stone-50/50 hover:bg-stone-50 transition-colors relative cursor-pointer flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-primary">cloud_upload</span>
                    <span className="font-body text-xs text-black font-semibold">Upload Arrangement Reference</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setUploadedReferenceName(e.target.files[0]?.name || "")}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </div>
                  {uploadedReferenceName && (
                    <span className="font-mono text-[10px] text-[#8B0000] block font-semibold">✓ Linked: {uploadedReferenceName}</span>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="font-label text-[9px] uppercase tracking-widest text-black/45 font-bold block">Arrangement Instruction Notes</label>
                  <textarea
                    placeholder="Enter traditional naming preferences, gift tray custom wording, or placement dimensions..."
                    value={customNote}
                    onChange={(e) => setCustomNote(e.target.value)}
                    className="w-full p-4 rounded-2xl border border-black/10 bg-stone-50/20 text-xs h-24 resize-none focus:border-primary outline-none font-medium"
                  />
                </div>

                <div className="space-y-3 pt-6 border-t border-black/5">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[18px] text-primary">insights</span>
                    <h4 className="font-label text-[10px] uppercase tracking-widest text-primary font-bold">Artisan AI Recommended Pairings</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {aiSuggestions.map((sug) => (
                      <div
                        key={sug._id || sug.id}
                        onClick={() => handleOpenShowcase(sug)}
                        className="flex items-center gap-3 p-2.5 bg-stone-50/80 border border-stone-200/60 rounded-2xl cursor-pointer hover:bg-stone-50 hover:shadow-xs transition-all"
                      >
                        <img src={sug.image} className="w-14 h-14 object-cover rounded-xl shadow-2xs" alt={sug.title} />
                        <div className="min-w-0">
                          <h5 className="font-display text-xs text-black font-bold truncate">{sug.title}</h5>
                          <span className="font-body text-[10px] text-black/50 block font-semibold">Add to Setup (+₹{(sug.rentalPrice || 15000).toLocaleString("en-IN")})</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-8 border-t border-black/5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shrink-0">
                  <div className="space-y-0.5">
                    <span className="font-label text-[9px] uppercase tracking-widest text-black/40 block font-bold">Live Rental Valuation</span>
                    <span className="font-display text-3xl font-bold text-black italic">
                      ₹{calculateLivePrice().toLocaleString("en-IN")}*
                    </span>
                    <span className="font-body text-[10px] text-black/40 block font-light">*Includes stage-hand logistics clearance</span>
                  </div>

                  <button
                    type="button"
                    onClick={handleBookRental}
                    className="flex-1 md:flex-none bg-gradient-to-r from-[var(--color-gold)] to-[var(--color-gold-dark)] hover:opacity-95 text-white px-8 py-4 rounded-full font-label uppercase text-xs tracking-widest font-bold shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    Rent & Dispatch Showcase
                    <span className="material-symbols-outlined text-[18px]">featured_play_list</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
