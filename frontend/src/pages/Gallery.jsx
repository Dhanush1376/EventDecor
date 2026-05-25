import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { GalleryCard } from "../components/gallery/GalleryCard";
import { galleryService, productService } from "../services/domainServices";
import { ProductCard, QuickViewModal, SearchBar, CategoryTabs, CustomDropdown } from "../components/ui";
import { SEO } from "../components/seo/SEO";
import { MandalaElement } from "../components/ui/MandalaElement";
import { GallerySlideshow } from "../components/gallery/GallerySlideshow";
import { GallerySkeleton } from "../components/ui/Skeleton";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";

import logger from '../utils/logger';
export function Gallery() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [activeEvent, setActiveEvent] = useState("All");
  const [activeStyle, setActiveStyle] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [filterType, setFilterType] = useState("all"); // all, inspiration, product
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [isGalleryMode, setIsGalleryMode] = useState(false);
  const [slideshowIndex, setSlideshowIndex] = useState(-1);
  const [showFloatingExit, setShowFloatingExit] = useState(false);
  const [isSticky, setIsSticky] = useState(false);

  const { data: galleryItems = [], isLoading: isGalleryLoading, isError: isGalleryError } = useQuery({
    queryKey: ['gallery'],
    queryFn: async () => {
      const res = await galleryService.getAll();
      return res.success ? (res.data.data || res.data.items || res.data || []) : [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: categories = ["All"], isLoading: isCategoriesLoading, isError: isCategoriesError } = useQuery({
    queryKey: ['galleryCategories'],
    queryFn: async () => {
      const res = await galleryService.getCategories();
      return res.success ? ["All", ...(res.data || [])] : ["All"];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: products = [], isLoading: isProductsLoading, isError: isProductsError } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await productService.getAll();
      return res.success ? (res.data.data || res.data.items || res.data || []) : [];
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (isGalleryError || isCategoriesError || isProductsError) {
      toast.error("Failed to load some gallery resources.");
    }
  }, [isGalleryError, isCategoriesError, isProductsError]);

  const isLoading = isGalleryLoading || isCategoriesLoading || isProductsLoading;

  const handleCategorySelect = (cat) => {
    setActiveCategory(cat);
    setTimeout(() => {
      const element = document.getElementById("gallery-collection");
      if (element) {
        const yOffset = -80;
        const y =
          element.getBoundingClientRect().top + window.scrollY + yOffset;
        window.scrollTo({ top: y, behavior: "smooth" });
      }
    }, 50);
  };

  useEffect(() => {
    const handleScroll = () => setIsSticky(window.scrollY > 300);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Handle immersive gallery mode UI
  useEffect(() => {
    if (isGalleryMode) {
      document.body.classList.add("gallery-mode-active");

      const handleScroll = () => {
        setShowFloatingExit(window.scrollY > 300);
      };
      window.addEventListener("scroll", handleScroll);
      return () => {
        document.body.classList.remove("gallery-mode-active");
        window.removeEventListener("scroll", handleScroll);
      };
    } else {
      document.body.classList.remove("gallery-mode-active");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowFloatingExit(false);
    }
  }, [isGalleryMode]);

  const filteredItems = useMemo(() => {
    return galleryItems
      .filter((item) => {
        const matchType =
          filterType === "all" ||
          item.type === filterType ||
          (filterType === "inspiration" && !item.type);

        const matchCat =
          activeCategory === "All" ||
          item.category === activeCategory;
        const matchEvt =
          activeEvent === "All" || item.event === activeEvent;
        const matchStl = activeStyle === "All" || item.style === activeStyle;
        const matchSearch =
          searchQuery === "" ||
          item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (item.tags && item.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())));

        return matchType && matchCat && matchEvt && matchStl && matchSearch;
      })
      .map((item, idx) => ({
        ...item,
        id: item._id || item.id,
        height:
          (!item.height || item.height === "aspect-square")
            ? (idx % 4 === 0
              ? "aspect-[2/3]"
              : idx % 4 === 1
                ? "aspect-square"
                : idx % 4 === 2
                  ? "aspect-[4/5]"
                  : "aspect-[3/4]")
            : item.height,
      }));
  }, [galleryItems, activeCategory, activeEvent, activeStyle, searchQuery, filterType]);

  return (
    <div
      className={`bg-[#fcfbf9] min-h-screen selection:bg-primary/20 relative ${isGalleryMode ? "pt-8" : "pt-20 md:pt-28"} pb-32 md:pb-20 overflow-hidden transition-all duration-300`}
    >
      <SEO
        title="Inspiration Gallery"
        description="Explore our curated collection of artisanal event transformations and heritage decor inspirations."
      />

      <MandalaElement
        className="absolute -top-40 -left-40 opacity-[0.06]"
        size={800}
      />
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
            Explore our gallery of beautiful decorations, where traditional items
            meet modern celebrations.
          </motion.p>
        </div>
      </section>

      {/* Floating / Sticky Navigation Bar Wrapper to prevent layout shift and glitching */}
      <div className={isSticky ? "h-[68px] lg:h-[76px] mb-8 md:mb-12" : ""}>
        <nav
          className={`z-40 border-b transition-all duration-500 ${
            isSticky ? "fixed top-[53px] md:top-[57px] left-0 w-full bg-white/95 backdrop-blur-xl py-3 border-black/5 shadow-md" : "border-transparent relative -mt-6 md:-mt-8 mb-8 md:mb-12 max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop"
          }`}
        >
          <div
            className={`transition-all duration-500 border flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6 ${
              !isSticky ? "bg-white/80 backdrop-blur-lg border-black/5 shadow-luxury/5 rounded-[2rem] p-3 md:p-4" : "border-transparent max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop w-full"
            }`}
          >
            {/* Search Bar & Mobile / Tablet Actions */}
            <div className="w-full lg:w-72 xl:w-80 flex items-center gap-2 shrink-0">
              <div className="flex-1 h-11">
                <SearchBar
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                  }}
                  placeholder="Search themes, colors..."
                  className="w-full !h-full !rounded-full bg-surface-bright/90 backdrop-blur-md shadow-sm !px-5 text-[13px] flex items-center border border-outline-variant/30 outline-none focus:outline-none"
                />
              </div>
              
              {/* Mobile Filter Toggle */}
              <button
                onClick={() => setIsFilterDrawerOpen(true)}
                aria-label="Open filters"
                className="lg:hidden flex items-center justify-center w-11 h-11 rounded-full bg-on-surface text-surface shadow-md transition-all active:scale-95 shrink-0 outline-none focus:outline-none focus-visible:outline-none"
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
                className={`lg:hidden flex items-center justify-center w-11 h-11 rounded-full shadow-md transition-all active:scale-95 shrink-0 outline-none focus:outline-none focus-visible:outline-none ${
                  isGalleryMode ? "bg-primary text-white text-surface" : "bg-white text-black/50 border border-black/10"
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">
                  {isGalleryMode ? "grid_view" : "photo_library"}
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

              <div className="flex items-center gap-3 shrink-0">
                {/* Type Switcher Dropdown */}
                <div className="w-48 xl:w-52 h-11">
                  <CustomDropdown
                    options={[
                      { value: "all", label: "All Formats" },
                      { value: "inspiration", label: "Design Inspirations" },
                      { value: "real-event", label: "Real Celebrations" },
                    ]}
                    value={filterType}
                    onChange={setFilterType}
                    className="w-full h-full"
                    buttonClassName="w-full h-full !rounded-full border !border-outline-variant/30 shadow-sm !bg-surface-bright/90 backdrop-blur-md !py-0 !px-5 text-[12px]"
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
                  className={`flex shrink-0 items-center gap-2 h-11 px-5 rounded-full border transition-all duration-300 font-bold text-[10px] uppercase tracking-widest outline-none focus:outline-none focus-visible:outline-none ${
                    isGalleryMode
                      ? "bg-primary text-white border-primary shadow-md shadow-primary/20"
                      : "bg-white text-black/60 border-black/10 hover:border-black/30 shadow-sm"
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {isGalleryMode ? "grid_view" : "photo_library"}
                  </span>
                  {isGalleryMode ? "Exit Gallery" : "Gallery Mode"}
                </button>
              </div>
            </div>
          </div>
        </nav>
      </div>

      <main id="gallery-collection" className="max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop py-4 md:py-6 relative z-10">
        {isLoading ? (
          <GallerySkeleton />
        ) : (
          <>
            {/* Pinterest Masonry Grid */}
            <div className="columns-2 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 sm:gap-6">
              <AnimatePresence mode="popLayout">
                {filteredItems.map((item, index) => (
                  <motion.div
                    key={`${item.type}-${item.id}`}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.5 }}
                    className="break-inside-avoid mb-6"
                  >
                    <GalleryCard
                      item={item}
                      eager={index < 4}
                      onImageClick={
                        isGalleryMode ? () => setSlideshowIndex(index) : undefined
                      }
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {filteredItems.length === 0 && (
              <div className="py-32 text-center">
                <h3 className="font-headline-sm text-black/40">
                  No moments found matching your criteria.
                </h3>
                <button
                  onClick={() => {
                    setActiveCategory("All");
                    setSearchQuery("");
                  }}
                  className="mt-4 font-label-sm text-primary underline uppercase tracking-widest text-[10px] font-bold"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </>
        )}
      </main>



      <AnimatePresence>
        {slideshowIndex !== -1 && (
          <GallerySlideshow
            items={filteredItems}
            currentIndex={slideshowIndex}
            onClose={() => setSlideshowIndex(-1)}
            onPrev={() =>
              setSlideshowIndex((prev) =>
                prev > 0 ? prev - 1 : filteredItems.length - 1,
              )
            }
            onNext={() =>
              setSlideshowIndex((prev) =>
                prev < filteredItems.length - 1 ? prev + 1 : 0,
              )
            }
            onSelect={setSlideshowIndex}
          />
        )}
      </AnimatePresence>

      <div className="fixed inset-0 pointer-events-none opacity-[0.02] mix-blend-overlay z-[400] bg-marble" />

      {/* Filter Drawer for Mobile */}
      <AnimatePresence>
        {isFilterDrawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFilterDrawerOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200] md:hidden"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="fixed bottom-0 left-0 right-0 bg-[#fcfbf9] rounded-t-3xl z-[201] p-6 pb-12 md:hidden max-h-[80vh] overflow-y-auto shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="font-display text-xl text-black">
                  Refine Gallery
                </h3>
                <button
                  onClick={() => setIsFilterDrawerOpen(false)}
                  className="w-10 h-10 rounded-full bg-black/5 flex items-center justify-center text-black"
                >
                  <span className="material-symbols-outlined text-sm">
                    close
                  </span>
                </button>
              </div>

              <div className="space-y-8">
                <div>
                  <span className="font-label-sm text-[10px] uppercase tracking-widest text-black/40 font-bold block mb-4">
                    Categories
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        className={`px-4 py-2 rounded-xl border font-bold text-[10px] uppercase tracking-wider transition-all ${
                          activeCategory === cat
                            ? "bg-black text-white border-black"
                            : "bg-white text-black/40 border-black/10"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => setIsFilterDrawerOpen(false)}
                  className="w-full bg-black text-white py-4 rounded-2xl font-bold text-[12px] uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-transform"
                >
                  Apply Filters
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
