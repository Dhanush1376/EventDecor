import React, { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { handleImageError } from "../utils/imageUtils";
import {
  ProductCard,
  Skeleton,
  QuickViewModal,
  Pagination,
  CustomDropdown,
  SearchBar,
  CategoryTabs,
  PromoBanner,
} from "../components/ui";
import { useCart } from "../context/CartContext";

import { productService, userService, couponService } from "../services/domainServices";
import toast from "react-hot-toast";
import { useApi } from "../hooks/useApi";
import { useWebsiteContent } from "../hooks/useWebsiteContent";
import { FilterPanel } from "../components/ui/FilterPanel";
import { MandalaElement } from "../components/ui/MandalaElement";
import { MandalaArtDecor } from "../components/ui/MandalaArtDecor";
import { SEO } from "../components/seo/SEO";

export function ProductListing() {
  const { setClaimedCoupon } = useCart();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [sortBy, setSortBy] = useState("Popularity");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSticky, setIsSticky] = useState(false);
  const [activeProduct, setActiveProduct] = useState(null);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

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
      console.warn("Failed to fetch coupons for promo banner", err);
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

  const websiteContent = useWebsiteContent();
  const shopContent = websiteContent?.shopPage || {
    hero: {
      title: "Heritage Collection",
      subtitle: "Handcrafted Decor",
      description: "Discover masterfully crafted decor pieces that honor ancient traditions with contemporary luxury sensibilities.",
      backgroundImage: "https://lh3.googleusercontent.com/aida-public/AB6AXuC6Cy1TlK9jjSUwKlKlXEL_AKlV3Ff5c2VdyViS7GGN3dgR1UB3SgmAto5fKc__pxujkfieY8wFl8MLAhbv7fZHW-oIWdXX0Xqg7SaMj5Szj9w6aGsuChZguzRLBppvcE_7OyVd9N7Ldchm0izPUhXOQGyYaQUsd43cUxBLr5ift2YUa0I_rr4_34hldd6L-V9MeNbxa-BUn2gvZq7JQypKg2Wl6-8TPta6D_ZooOmuUfcwSJJUjNe8-voUHsu7mBKM_CeD9YFd204",
    },
    promo: {
      title: "Seasonal Decor —",
      highlightText: "Up to 40% Off",
      description: "Bring home heritage-inspired elegance with our exclusive handcrafted seasonal collections. Limited stock available for high-fidelity pieces.",
      backgroundImage: "https://lh3.googleusercontent.com/aida-public/AB6AXuArmLX9xra0m1GxmrjS8xH0pXUpTrKa18fhO9gW8NY160WAZ5MfXc157OoFlIivj6H_WT6aMZVWNjLvqixrhrBG2ryiAU15p_ZC42em1Dzj1w8ukwUFzndsHouARkcvS5wRRDyDVaOaIHwbiV5vUgkbNfc6zFl8XAYOQBERj5JYLZZOPpjaoiUd4B_6zT7iQQYhbyHU5Q5geiCAvvn2hga0_UsahQbwxSy3eLhHFEKPHc897yWc_fLyCPjkZ0wcfIcXDcMrPumI35w",
      badgeText: "Limited Time Offer",
      statusText: "Ends Soon",
      ctaText: "Claim Offer",
      ctaLink: "Festive Decor",
    }
  };

  const [filters, setFilters] = useState({
    price: [],
    material: [],
    collection: [],
  });

  const { data: productsData, loading, request: fetchProducts } = useApi(productService.getAll);

  // Fetch categories dynamically from API
  const [categories, setCategories] = useState(["All"]);
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await userService.getCategories();
        if (res.success && res.data) {
          setCategories(res.data);
        }
      } catch (err) {
        console.warn("Failed to fetch categories", err);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    const handleScroll = () => setIsSticky(window.scrollY > 400);
    window.addEventListener("scroll", handleScroll, { passive: true });
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

  // Debounced search to prevent API calls on every keystroke
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const sortMap = {
      Popularity: "rating",
      "Price: Low to High": "price_asc",
      "Price: High to Low": "price_desc",
      "New Arrivals": "newest",
    };

    const params = {
      page: currentPage,
      limit: 12,
      search: debouncedSearch,
      category: activeCategory !== "All" ? activeCategory : undefined,
      sort: sortMap[sortBy] || "newest",
    };
    fetchProducts(params).then(res => {
      if (res) {
        setTotalPages(res.totalPages || 1);
        setTotalCount(res.totalCount || 0);
      }
    });
  }, [currentPage, debouncedSearch, activeCategory, sortBy, filters, fetchProducts]);

  const products = productsData?.data || productsData?.products || [];

  const openQuickView = (e, product) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveProduct(product);
    setIsQuickViewOpen(true);
  };

  const handleCategorySelect = (cat) => {
    setActiveCategory(cat);
    setTimeout(() => {
      const element = document.getElementById("artisan-collection");
      if (element) {
        const yOffset = -80;
        const y = element.getBoundingClientRect().top + window.scrollY + yOffset;
        window.scrollTo({ top: y, behavior: "smooth" });
      }
    }, 50);
  };

  const toggleFilter = (type, value) => {
    setFilters((prev) => {
      const current = prev[type];
      const next = current.includes(value)
        ? current.filter((i) => i !== value)
        : [...current, value];
      return { ...prev, [type]: next };
    });
  };

  const clearAllFilters = () => {
    setFilters({ price: [], material: [], collection: [] });
    setActiveCategory("All");
    setSearchQuery("");
  };

  const { cartCount, setIsCartOpen } = useCart();

  return (
    <div className="bg-surface min-h-screen">
      <SEO
        title="Heritage Collection | Premium Handcrafted Indian Decor"
        description="Explore Siri Arts & Crafts' exclusive e-commerce boutique of traditional Telugu wedding presentation trays, custom pooja accessories, and handcrafted decors."
      />
      {/* Editorial Hero */}
      <section className="relative min-h-[320px] md:h-[70vh] flex items-center overflow-hidden bg-on-surface-variant">
        <motion.div
          initial={{ scale: 1.1, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.6 }}
          transition={{ duration: 1.5 }}
          className="absolute inset-0"
        >
          <img
            onError={handleImageError}
            src={shopContent.hero.backgroundImage}
            className="w-full h-full object-cover"
            alt="Hero Background"
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
            {shopContent.hero.subtitle}
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="font-headline-xl text-[32px] sm:text-[42px] md:text-[56px] lg:text-[72px] text-surface mb-4 md:mb-8 text-gold leading-tight"
          >
            {shopContent.hero.title}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="font-body-lg text-[13px] md:text-[16px] lg:text-[18px] text-surface/80 max-w-xl mx-auto font-light leading-relaxed px-4"
          >
            {shopContent.hero.description}
          </motion.p>
        </div>
      </section>

      <nav
        className={`z-40 transition-all duration-500 ${isSticky ? "fixed top-[53px] md:top-[57px] left-0 w-full glass py-2 shadow-xl" : "relative -mt-8 md:-mt-12 mb-10 md:mb-12"}`}
      >
        <div
          className={`max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop flex flex-col lg:flex-row lg:items-center gap-4 md:gap-4 lg:gap-6 ${isSticky ? "" : "transition-all duration-500"}`}
        >
          {/* Search Bar & Mobile Filter Toggle */}
          <div className="w-full lg:w-72 xl:w-80 flex items-center gap-2 shrink-0">
            <div className="flex-1 h-11">
              <SearchBar
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search masterworks..."
                className="w-full !h-full !rounded-full bg-surface-bright/90 backdrop-blur-md shadow-sm !px-5 text-[13px] flex items-center border border-outline-variant/30 outline-none focus:outline-none"
              />
            </div>
            {/* Mobile/Tablet Filter Toggle */}
            <button
              onClick={() => setIsFilterOpen(true)}
              aria-label="Open filters"
              className="lg:hidden flex items-center justify-center w-11 h-11 rounded-full bg-on-surface text-surface shadow-md transition-all active:scale-95 shrink-0 outline-none focus:outline-none focus-visible:outline-none"
            >
              <span className="material-symbols-outlined text-[20px]">
                tune
              </span>
            </button>
          </div>

          {/* Desktop-Only Layout Integration (Tabs + Sort) */}
          <div className="hidden lg:flex items-center justify-between gap-6 flex-1 min-w-0">
            {/* Category Tabs Area - Fluid scrollable area */}
            <div className="flex-1 overflow-hidden flex justify-start lg:justify-center">
              <CategoryTabs
                categories={categories}
                activeCategory={activeCategory}
                onCategoryChange={handleCategorySelect}
              />
            </div>

            {/* Actions Group: Sort (Right-aligned) */}
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
                    { value: "New Arrivals", label: "New Arrivals" },
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

      {/* Flash Sale Banner - Cinematic Luxury Redesign */}
      {promoCoupon && (
        <PromoBanner
          backgroundImage={shopContent.promo.backgroundImage}
          badgeText={`Active Promo: ${promoCoupon.code}`}
          statusText={shopContent.promo.statusText}
          title="Limited Time Offer — "
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
        id="artisan-collection"
        className="max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop relative pb-8 md:pb-24"
      >
        <MandalaElement
          className="absolute top-[20%] -right-[10%] opacity-[0.03]"
          size={600}
          variant={2}
        />
        <div className="flex flex-col lg:flex-row gap-8 xl:gap-12">
          {/* Sidebar Filter - Handles both Desktop Sidebar and Mobile Drawer */}
          <aside className="w-full lg:w-64 xl:w-72 flex-shrink-0 lg:sticky lg:top-32 h-fit">
            <FilterPanel
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
            <div className="flex items-center justify-between mb-10">
              <div className="flex flex-col gap-1">
                <h2 className="font-headline-md text-on-surface font-bold text-[24px] md:text-[32px]">
                  The Artisan Collection
                </h2>
                <p className="font-body-md text-on-surface-variant/60 font-medium">
                  {totalCount} unique pieces designed for you
                </p>
              </div>
            </div>

            {/* Mobile/Tablet inline category tabs (hidden on desktop where they appear in sticky nav) */}
            <div className="mb-10 overflow-x-auto no-scrollbar lg:hidden">
              <CategoryTabs
                categories={categories}
                activeCategory={activeCategory}
                onCategoryChange={handleCategorySelect}
              />
            </div>

            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-3 gap-x-4 md:gap-x-8 gap-y-8 md:gap-y-12">
                {[...Array(6)].map((_, i) => (
                  <ProductCard key={i} loading={true} />
                ))}
              </div>
            ) : products.length > 0 ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-3 gap-x-4 md:gap-x-8 gap-y-8 md:gap-y-12">
                  {products.map((product) => (
                    <ProductCard
                      key={product.id || product._id}
                      {...product}
                      onQuickView={(e) => openQuickView(e, product)}
                    />
                  ))}
                </div>

                {/* Interactive Numbered Pagination */}
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
                          const el =
                            document.getElementById("artisan-collection");
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
                    filter_list_off
                  </span>
                </div>
                <h3 className="font-headline-sm text-on-surface mb-3">
                  No masterworks found
                </h3>
                <p className="font-body-md text-on-surface-variant/50 font-light mb-10 max-w-md mx-auto">
                  Our artisans are constantly creating. Try adjusting your
                  filters or search terms to discover other unique pieces in our
                  collection.
                </p>
                <button onClick={clearAllFilters} className="btn-primary">
                  Clear All Filters
                </button>
              </div>
            )}
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

      <QuickViewModal
        isOpen={isQuickViewOpen}
        onClose={() => setIsQuickViewOpen(false)}
        product={activeProduct}
      />
    </div>
  );
}
