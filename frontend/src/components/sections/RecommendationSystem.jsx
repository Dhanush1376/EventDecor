import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ProductCard } from "../ui/ProductCard";
import { RecommendationSkeleton } from "../ui/Skeleton";
import { 
  useSimilarRecommendations, 
  useCompleteSetup, 
  useAlsoViewed 
} from "../../hooks/useRecommendationQueries";
import { useRecentlyViewed } from "../../hooks/useUserQueries";
import { useAuth } from "../../context/AuthContext";

export function RecommendationSystem({ 
  category, 
  currentProductId, 
  targetType = 'product', 
  hideHeader = false, 
  compact = false, 
  horizontalScroll = false 
}) {
  const { isAuthenticated } = useAuth();
  const [shouldFetch, setShouldFetch] = useState(false);

  // Progressive rendering: defer execution slightly to allow main page content to render first
  useEffect(() => {
    const timer = setTimeout(() => {
      setShouldFetch(true);
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  const similarQuery = useSimilarRecommendations(targetType, currentProductId, 8, { enabled: shouldFetch });
  const completeQuery = useCompleteSetup(currentProductId, 8, { enabled: shouldFetch });
  const alsoViewedQuery = useAlsoViewed(currentProductId, targetType, 8, { enabled: shouldFetch });
  const recentlyViewedQuery = useRecentlyViewed();

  const similarList = similarQuery.data?.items || similarQuery.data || [];
  const completeSetupList = completeQuery.data?.items || completeQuery.data || [];
  const alsoViewedList = alsoViewedQuery.data?.items || alsoViewedQuery.data || [];

  const recentlyViewedList = useMemo(() => {
    if (!isAuthenticated || !recentlyViewedQuery.data) return [];
    const list = recentlyViewedQuery.data.data || recentlyViewedQuery.data.items || (Array.isArray(recentlyViewedQuery.data) ? recentlyViewedQuery.data : []);
    return list
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
        slug: item.product.slug,
      }))
      .filter((p) => p.id !== currentProductId)
      .slice(0, 8);
  }, [recentlyViewedQuery.data, isAuthenticated, currentProductId]);

  // Determine if we should show the loading skeleton
  // We only show loading if we have started fetching AND we don't have any cached placeholder data
  const loading = shouldFetch && (
    (similarQuery.isPending && similarList.length === 0) ||
    (completeQuery.isPending && completeSetupList.length === 0) ||
    (alsoViewedQuery.isPending && alsoViewedList.length === 0)
  );

  const getActiveList = () => {
    const combined = [...similarList, ...completeSetupList, ...alsoViewedList, ...recentlyViewedList];
    const uniqueIds = new Set();
    const uniqueList = [];
    for (const item of combined) {
      const id = item.id || item._id;
      if (!uniqueIds.has(id) && id !== currentProductId) {
        uniqueIds.add(id);
        uniqueList.push(item);
      }
    }
    return uniqueList.slice(0, 16);
  };

  const activeList = getActiveList();

  if (!shouldFetch) {
    // Return empty placeholder with correct height to prevent layout shifts
    return <div className="py-8 min-h-[300px] bg-transparent" />;
  }

  if (!loading && activeList.length === 0) {
    return null;
  }

  return (
    <section className="py-12 bg-transparent relative overflow-hidden">
      {/* Subtle Glow Accent */}
      <div className="absolute top-1/2 left-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] -translate-y-1/2 pointer-events-none" />

      <div className="max-w-max-width mx-auto px-4 md:px-6 lg:px-8 relative z-10">
        {!hideHeader && (
          <div className="mb-8 flex flex-col items-center md:items-start">
            <span className="font-label text-[10px] text-primary uppercase tracking-[0.3em] font-semibold mb-2">
              Artisan Curation
            </span>
            <h3 className="font-headline text-2xl md:text-3xl text-on-surface leading-tight tracking-tight">
              You May Also Like
            </h3>
          </div>
        )}

        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading-skeleton"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <RecommendationSkeleton horizontal={horizontalScroll} />
            </motion.div>
          ) : activeList.length > 0 ? (
            <motion.div
              key="grid-list"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className={horizontalScroll ? "flex gap-6 pb-6 overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar" : "grid grid-cols-2 md:grid-cols-4 gap-6 pb-6"}
            >
              {activeList.map((product, idx) => (
                <motion.div
                  key={product.id || product._id || `reco-item-${idx}`}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.04, duration: 0.4 }}
                  className={horizontalScroll ? "w-[200px] sm:w-[240px] md:w-[280px] flex-shrink-0 snap-start" : "w-full"}
                >
                  <ProductCard
                    {...product}
                    id={product.id || product._id}
                    imageSrc={product.imageSrc || product.image}
                    price={product.price || product.basePrice}
                    compact={compact}
                  />
                </motion.div>
              ))}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </section>
  );
}

export default RecommendationSystem;
