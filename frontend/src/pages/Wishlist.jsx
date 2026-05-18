import React, { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useWishlist } from "../context/WishlistContext";
import { useCart } from "../context/CartContext";
import { QuickViewModal, CustomDropdown, ProductCard, Skeleton } from "../components/ui";
import { SEO } from "../components/seo/SEO";
import { handleImageError } from "../utils/imageUtils";
import { productService } from "../services/domainServices";
import { useApi } from "../hooks/useApi";

export function Wishlist() {
  const { items, removeItem, toggleItem, loading: wishlistLoading } = useWishlist();
  const { addItem: addToCart } = useCart();

  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("latest");
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const [notification, setNotification] = useState("");

  const { data: trendingData, loading: trendingLoading, request: fetchTrending } = useApi(productService.getAll);

  useEffect(() => {
    fetchTrending({ limit: 4, sort: "Popularity" });
  }, [fetchTrending]);

  const trendingProducts = trendingData?.data || [];

  const sortOptions = [
    { value: "latest", label: "Latest Added" },
    { value: "price-low", label: "Price: Low to High" },
    { value: "price-high", label: "Price: High to Low" },
  ];

  const triggerNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(""), 3000);
  };

  // Provide realistic eCommerce values for products if minimal data is saved
  const enhancedItems = useMemo(() => {
    return items.map((item) => ({
      ...item,
      price: item.price || 12000,
      oldPrice:
        item.oldPrice || (item.price ? Math.round(item.price * 1.3) : 15600),
      rating: item.rating || 4.8,
      reviews: item.reviews || 124,
      category: item.category || "Event Decor",
      imageSrc:
        item.imageSrc ||
        item.image ||
        "https://images.unsplash.com/photo-1519225336808-ebd752395a12?auto=format&fit=crop&w=600&q=80",
    }));
  }, [items]);

  // Search & Sort logic
  const filteredItems = useMemo(() => {
    let result = [...enhancedItems];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q),
      );
    }
    if (sortBy === "price-low") {
      result.sort((a, b) => a.price - b.price);
    } else if (sortBy === "price-high") {
      result.sort((a, b) => b.price - a.price);
    }
    return result;
  }, [enhancedItems, searchQuery, sortBy]);

  const handleMoveToBag = (item) => {
    addToCart({
      id: item.id,
      title: item.title,
      price: item.price,
      imageSrc: item.imageSrc,
      variant: item.variant || "Default",
      quantity: 1,
    });
    removeItem(item.id, item.variant);
    triggerNotification(`Moved "${item.title}" to your Bag`);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="bg-surface min-h-screen pt-24 pb-32 font-body text-on-surface"
    >
      <SEO
        title="My Wishlist"
        description="A private gallery of your favorite Siri Arts & Crafts masterpieces. Artisanal decor saved for your future heritage celebrations."
      />

      {/* Toast Notification with smooth framer entrance */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed top-28 left-1/2 -translate-x-1/2 z-50 bg-on-surface text-surface px-6 py-3 rounded-lg shadow-xl text-xs font-semibold tracking-wide flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-sm text-primary-container">
              check_circle
            </span>
            {notification}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-[1440px] mx-auto px-4 sm:px-8">
        {/* Breadcrumb & Header - Hidden when empty to clean up the interface */}
        {enhancedItems.length > 0 && (
          <>
            <nav className="text-[11px] text-secondary mb-6 flex items-center gap-2 tracking-wider uppercase font-bold">
              <Link to="/" className="hover:text-primary transition-colors">
                Home
              </Link>
              <span>/</span>
              <span className="text-on-surface">My Wishlist</span>
            </nav>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-outline-variant/50 mb-8">
              <div>
                <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight text-[#1a1c1a]">
                  My Wishlist
                  <span className="font-body text-lg font-normal text-[#685c57]">
                    {" "}
                    ({enhancedItems.length} items)
                  </span>
                </h1>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3">
                {/* Editorial Search Bar */}
                <div className="relative flex items-center w-full sm:w-80 group">
                  <div className="absolute inset-0 bg-surface-container-low rounded-full border border-outline-variant/30 group-focus-within:border-primary group-focus-within:bg-surface transition-all duration-300 shadow-luxury/2 pointer-events-none" />
                  <span className="material-symbols-outlined absolute left-4 text-[20px] text-on-surface/30 group-focus-within:text-primary transition-colors">
                    search
                  </span>
                  <input
                    type="text"
                    placeholder="Search my wishlist..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-12 py-3 bg-transparent text-[13px] outline-none text-on-surface placeholder:text-on-surface/20 font-medium relative z-10"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center hover:bg-primary/10 transition-colors z-20 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px] text-on-surface/40">
                        close
                      </span>
                    </button>
                  )}
                </div>

                {/* Refined Sort Selector */}
                <div className="w-full sm:w-52 h-[46px]">
                  <CustomDropdown
                    options={sortOptions}
                    value={sortBy}
                    onChange={setSortBy}
                    className="w-full h-full"
                    buttonClassName="!rounded-full border !border-black/5 shadow-sm !bg-white/50 backdrop-blur-xl !py-0 !px-6 text-[12px] font-bold tracking-wider !h-full"
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {/* Empty State */}
        {enhancedItems.length === 0 ? (
          <div className="space-y-20">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center max-w-2xl mx-auto py-16 md:py-24"
            >
              <div className="relative inline-block mb-8">
                <div className="w-24 h-24 bg-surface-container rounded-full flex items-center justify-center mx-auto mb-2 border border-outline-variant/10">
                  <span className="material-symbols-outlined text-4xl text-secondary">
                    favorite_border
                  </span>
                </div>
                <motion.div
                  animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.1, 0.3] }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="absolute -inset-4 bg-primary/5 rounded-full blur-2xl -z-10"
                />
              </div>

              <h2 className="font-display text-3xl md:text-4xl font-bold text-on-surface mb-4">
                You haven't saved anything yet.
              </h2>
              <p className="text-[15px] md:text-base text-secondary max-w-md mx-auto mb-10 leading-relaxed font-light">
                Explore what our artisans have crafted for your special
                occasions and save your favorites here.
              </p>

              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Link
                  to="/collections"
                  className="btn-primary px-10 py-4 inline-flex items-center gap-3 text-[12px] uppercase tracking-[0.2em] font-bold"
                >
                  Explore Collections
                  <span className="material-symbols-outlined text-sm">
                    arrow_forward
                  </span>
                </Link>
              </motion.div>
            </motion.div>

            {/* Recommendations */}
            <div className="pt-12 border-t border-outline-variant/20">
              <div className="flex items-center justify-between mb-8">
                <h3 className="font-display text-xl md:text-2xl font-bold text-on-surface">
                  Trending Masterpieces
                </h3>
                <Link
                  to="/collections"
                  className="text-[11px] font-bold text-primary uppercase tracking-widest hover:underline"
                >
                  View All
                </Link>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {trendingLoading ? (
                  [...Array(4)].map((_, i) => (
                    <ProductCard key={i} loading={true} />
                  ))
                ) : (
                  trendingProducts.map((prod) => (
                    <ProductCard
                      key={prod._id || prod.id}
                      {...prod}
                      onQuickView={(e) => {
                        e.preventDefault();
                        setQuickViewProduct(prod);
                      }}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Grid Layout matching retail platforms with smooth staggered micro-animations */
          <motion.div
            layout
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6"
          >
            <AnimatePresence>
              {filteredItems.map((item, index) => (
                <ProductCard
                  key={`wishlist-item-${item.id}`}
                  {...item}
                  onQuickView={(e) => {
                    if (window.innerWidth >= 768) {
                      e.preventDefault();
                      setQuickViewProduct(item);
                    }
                  }}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {filteredItems.length === 0 && searchQuery && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12 text-[#685c57] text-sm"
          >
            No saved items match your search query "{searchQuery}".
          </motion.div>
        )}
      </div>

      {/* Quick View Modal */}
      <QuickViewModal
        isOpen={!!quickViewProduct}
        onClose={() => setQuickViewProduct(null)}
        product={quickViewProduct}
      />
    </motion.div>
  );
}
