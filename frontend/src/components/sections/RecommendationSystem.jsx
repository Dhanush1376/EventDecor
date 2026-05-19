import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ProductCard } from "../ui/ProductCard";
import { productService, userService } from "../../services/domainServices";
import { useAuth } from "../../context/AuthContext";

export function RecommendationSystem({ category, currentProductId }) {
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState("recommendations"); // 'recommendations' | 'recent'
  const [recommendedList, setRecommendedList] = useState([]);
  const [recentlyViewedList, setRecentlyViewedList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch Recommended / Related products
  useEffect(() => {
    const fetchRecommendations = async () => {
      setLoading(true);
      try {
        // Fetch products in the same category
        const res = await productService.getAll({
          category: category && category !== "All" ? category : undefined,
          limit: 6,
        });

        if (res.success && res.data) {
          const list = res.data.data || res.data.products || [];
          // Filter out current product if inside detail page
          let filtered = list.filter(
            (p) => (p._id || p.id) !== currentProductId
          );

          // If not enough related products, fetch featured/bestsellers as fallback
          if (filtered.length < 3) {
            const fallbackRes = await productService.getAll({
              featured: true,
              limit: 6,
            });
            if (fallbackRes.success && fallbackRes.data) {
              const fallbackList = fallbackRes.data.data || fallbackRes.data.products || [];
              const uniqueFallback = fallbackList.filter(
                (p) =>
                  (p._id || p.id) !== currentProductId &&
                  !filtered.some((f) => (f._id || f.id) === (p._id || p.id))
              );
              filtered = [...filtered, ...uniqueFallback];
            }
          }

          setRecommendedList(filtered.slice(0, 3));
        }
      } catch (err) {
        console.warn("Failed to fetch dynamic recommendations", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [category, currentProductId]);

  // Fetch Recently Viewed products from DB/LocalStorage
  useEffect(() => {
    const fetchRecentlyViewed = async () => {
      if (isAuthenticated) {
        try {
          const res = await userService.getRecentlyViewed();
          if (res.success && res.data) {
            const list = res.data.data || res.data.items || (Array.isArray(res.data) ? res.data : []);
            // Map shape to match uniform ProductCard shape
            const formatted = list
              .filter((item) => item.product)
              .map((item) => ({
                id: item.product._id || item.product.id,
                _id: item.product._id || item.product.id,
                title: item.product.title,
                price: item.product.price,
                oldPrice: item.product.oldPrice,
                imageSrc: item.product.imageSrc,
                category: item.product.category,
                rating: item.product.rating || 4.8,
              }))
              .filter((p) => p.id !== currentProductId);

            setRecentlyViewedList(formatted.slice(0, 3));
          }
        } catch (err) {
          console.warn("Failed to fetch recently viewed list from API", err);
        }
      } else {
        setRecentlyViewedList([]);
      }
    };

    fetchRecentlyViewed();
  }, [isAuthenticated, currentProductId]);

  const activeList = activeTab === "recommendations" ? recommendedList : recentlyViewedList;
  const hasRecent = recentlyViewedList.length > 0;

  return (
    <section className="py-16 md:py-24 bg-[#FAF9F6] border-t border-black/5 relative overflow-hidden">
      {/* Subtle Background Elements */}
      <div className="absolute top-1/2 left-0 w-[500px] h-[500px] bg-primary-container/5 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2 pointer-events-none" />

      <div className="max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop relative z-10">
        <div className="flex flex-col items-center text-center mb-10 md:mb-14">
          <span className="font-label-sm text-primary tracking-[0.4em] uppercase mb-3 block text-[9px] sm:text-[10px] font-bold">
            More Options
          </span>
          <h2 className="font-headline text-[24px] sm:text-[32px] md:text-[45px] text-[#2D2B29] mb-4 font-light tracking-tight">
            You May Also Like
          </h2>
          <p className="font-body-sm sm:font-body-lg text-on-surface-variant/60 font-light max-w-lg mb-8 text-[13px] md:text-[15px]">
            Beautiful handmade items selected by our designers to match what you are looking for.
          </p>

          {/* Toggle Tab Actions */}
          {hasRecent && (
            <div className="inline-flex bg-[#f2efe9] p-1 rounded-full border border-black/5 shadow-inner">
              <button
                onClick={() => setActiveTab("recommendations")}
                className={`px-6 py-2.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                  activeTab === "recommendations"
                    ? "bg-[#2D2B29] text-white shadow-md"
                    : "text-[#685C57] hover:text-[#2D2B29]"
                }`}
              >
                Recommended For You
              </button>
              <button
                onClick={() => setActiveTab("recent")}
                className={`px-6 py-2.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                  activeTab === "recent"
                    ? "bg-[#2D2B29] text-white shadow-md"
                    : "text-[#685C57] hover:text-[#2D2B29]"
                }`}
              >
                Recently Viewed ({recentlyViewedList.length})
              </button>
            </div>
          )}
        </div>

        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading-skeleton"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6"
            >
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex flex-col gap-4 animate-pulse">
                  <div className="aspect-[4/5] w-full bg-surface-container-high rounded-[24px] md:rounded-[32px]" />
                  <div className="h-4 w-2/3 bg-surface-container rounded" />
                  <div className="h-3 w-1/3 bg-surface-container rounded" />
                </div>
              ))}
            </motion.div>
          ) : activeList.length > 0 ? (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.4 }}
              className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6"
            >
              {activeList.map((product, idx) => (
                <motion.div
                  key={product.id || product._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="w-full"
                >
                  <ProductCard {...product} />
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="empty-state"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-10"
            >
              <p className="text-[12px] text-on-surface-variant/40 italic">
                No matching handcrafted products found in this category.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
