import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { GalleryCard } from "../components/gallery/GalleryCard";
import { galleryService, productService } from "../services/domainServices";
import { ProductCard, QuickViewModal } from "../components/ui";
import { SEO } from "../components/seo/SEO";
import { MandalaElement } from "../components/ui/MandalaElement";
import { GallerySlideshow } from "../components/gallery/GallerySlideshow";
import toast from "react-hot-toast";

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

  const [galleryItems, setGalleryItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState(["All"]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch initial data
  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);
      try {
        const [galleryRes, categoriesRes, productsRes] = await Promise.all([
          galleryService.getAll(),
          galleryService.getCategories(),
          productService.getAll()
        ]);

        if (galleryRes.success) {
          setGalleryItems(galleryRes.data.data || galleryRes.data.items || galleryRes.data || []);
        }
        if (categoriesRes.success) {
          setCategories(["All", ...(categoriesRes.data || [])]);
        }
        if (productsRes.success) {
          setProducts(productsRes.data.data || productsRes.data.items || productsRes.data || []);
        }
      } catch (err) {
        console.error("Gallery fetch failed:", err);
        toast.error("Failed to load gallery content");
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();
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
          item.height ||
          (idx % 4 === 0
            ? "aspect-[2/3]"
            : idx % 4 === 1
              ? "aspect-square"
              : idx % 4 === 2
                ? "aspect-[4/5]"
                : "aspect-[3/4]"),
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

      <main className="max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop py-4 md:py-6 relative z-10">
        {/* Editorial Header */}
        <div className="mb-12">
          <nav className="hidden md:flex items-center gap-2 font-label-sm text-[11px] uppercase tracking-[0.3em] mb-6 text-black/30">
            <Link to="/" className="hover:text-primary transition-colors">
              Home
            </Link>
            <span className="opacity-30">/</span>
            <span className="text-black font-bold">Inspiration Gallery</span>
          </nav>

          <div className="flex flex-col lg:flex-row items-start justify-between gap-8 lg:gap-16">
            <div className="max-w-2xl">
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="font-label-sm text-[12px] text-primary uppercase tracking-[0.4em] mb-4 block font-bold"
              >
                Inspiration Sanctuary
              </motion.span>
              <motion.h1
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="font-headline-md text-black mb-6 leading-tight"
              >
                Curated Moments of Beauty.
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="font-body-md text-black/60 font-light leading-relaxed max-w-xl"
              >
                Explore our gallery of artisanal transformations, where heritage
                pieces meet contemporary celebrations.
              </motion.p>
            </div>

            <div className="w-full lg:flex-1 max-w-3xl space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-end gap-3 w-full">
                {/* Type Switcher Tabs */}
                <div className="flex h-11 p-1 bg-surface-container-low rounded-full border border-black/5 shrink-0 overflow-x-auto no-scrollbar max-w-full">
                  {[
                    { id: "all", label: "All Works" },
                    { id: "inspiration", label: "Design Inspirations" },
                    { id: "real-event", label: "Real Celebrations" },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setFilterType(t.id)}
                      className={`px-4 h-full rounded-full text-[10px] uppercase tracking-widest font-bold transition-all duration-300 whitespace-nowrap flex items-center justify-center ${
                        filterType === t.id
                          ? "bg-white text-primary shadow-sm"
                          : "text-black/40 hover:text-black/60"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* Search Bar */}
                <div className="flex-1 relative group hidden md:block min-w-[180px] max-w-sm shrink-0">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-black/30 text-[18px] group-focus-within:text-primary transition-colors">
                    search
                  </span>
                  <input
                    type="text"
                    placeholder="Search themes, colors..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-11 bg-white pl-11 pr-4 rounded-full border border-black/10 font-body text-[13px] text-black placeholder:text-black/30 focus:outline-none focus:ring-0 focus:border-primary transition-all shadow-sm"
                  />
                </div>

                {/* Slideshow Mode Toggle */}
                <button
                  onClick={() => setIsGalleryMode(!isGalleryMode)}
                  className={`hidden md:flex shrink-0 items-center gap-2 h-11 px-6 rounded-full border transition-all duration-300 font-bold text-[10px] uppercase tracking-widest ${
                    isGalleryMode
                      ? "bg-primary text-white border-primary shadow-md shadow-primary/20"
                      : "bg-white text-black/60 border-black/10 hover:border-black/30 shadow-sm"
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {isGalleryMode ? "grid_view" : "photo_library"}
                  </span>
                  {isGalleryMode ? "Exit Gallery Mode" : "Gallery Mode"}
                </button>
              </div>

              <div className="flex flex-col items-end gap-3">
                {/* Mobile Filter Button - only visible on mobile */}
                <div className="flex items-center gap-2 w-full md:hidden">
                  <div className="relative flex-1 group">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-black/30 text-[16px] group-focus-within:text-primary transition-colors">
                      search
                    </span>
                    <input
                      type="text"
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-white pl-10 pr-4 py-3 rounded-xl border border-black/10 font-body text-[13px] placeholder:text-black/30 focus:outline-none focus:ring-0 focus:border-primary transition-all shadow-sm"
                    />
                  </div>
                  <button
                    onClick={() => setIsFilterDrawerOpen(true)}
                    className="h-[46px] px-4 bg-white border border-black/10 rounded-xl flex items-center gap-2 font-bold text-[10px] uppercase tracking-widest"
                  >
                    <span className="material-symbols-outlined text-sm">
                      tune
                    </span>
                    Filter
                  </button>

                  <button
                    onClick={() => setIsGalleryMode(!isGalleryMode)}
                    className={`h-[46px] px-4 rounded-xl border flex items-center gap-2 font-bold text-[10px] uppercase tracking-widest transition-all ${
                      isGalleryMode
                        ? "bg-primary text-white border-primary shadow-lg"
                        : "bg-white text-black/40 border-black/10"
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">
                      {isGalleryMode ? "grid_view" : "photo_library"}
                    </span>
                  </button>
                </div>

                <div className="w-full hidden md:flex flex-wrap items-center justify-end gap-2">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={`px-5 py-2 rounded-full border font-label-sm text-[10px] uppercase tracking-[0.2em] transition-all duration-300 font-bold flex-shrink-0 ${
                        activeCategory === cat
                          ? "bg-black text-white border-black shadow-md"
                          : "bg-white text-black/40 border-black/5 hover:border-black/20"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

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
                  onImageClick={
                    isGalleryMode ? () => setSlideshowIndex(index) : undefined
                  }
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

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
            />
          )}
        </AnimatePresence>

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
      </main>

      {/* Floating Exit Button for Immersive Mode */}
      <AnimatePresence>
        {isGalleryMode && showFloatingExit && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            onClick={() => setIsGalleryMode(false)}
            className="fixed top-6 right-6 z-[200] bg-primary text-white px-6 py-3 rounded-full font-bold text-[10px] uppercase tracking-widest shadow-2xl flex items-center gap-2 hover:scale-105 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
            Exit Gallery Mode
          </motion.button>
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
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
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
