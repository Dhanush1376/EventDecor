import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ProductCard } from "../ui/ProductCard";
import { recommendationService } from "../../services/recommendationService";
import { userService } from "../../services/domainServices";
import { useAuth } from "../../context/AuthContext";

import logger from '../../utils/logger';

const isCanceledRequest = (err) =>
  err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED' || err?.message === 'canceled';

export function RecommendationSystem({ category, currentProductId, targetType = 'product', hideHeader = false }) {
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState("similar");
  const [similarList, setSimilarList] = useState([]);
  const [completeSetupList, setCompleteSetupList] = useState([]);
  const [alsoViewedList, setAlsoViewedList] = useState([]);
  const [recentlyViewedList, setRecentlyViewedList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    let isMounted = true;

    const fetchAll = async () => {
      setLoading(true);

      try {
        const promises = [];

        if (currentProductId) {
          promises.push(
            recommendationService.getSimilar(targetType, currentProductId, 8, { signal: controller.signal })
              .then((res) => {
                if (isMounted && res?.success && res.data?.items) {
                  setSimilarList(res.data.items);
                }
              })
              .catch((err) => {
                if (!isCanceledRequest(err)) logger.warn("Failed to fetch similar items", err);
              })
          );

          if (targetType === 'product') {
            promises.push(
              recommendationService.getCompleteSetup(currentProductId, 8, { signal: controller.signal })
                .then((res) => {
                  if (isMounted && res?.success && res.data?.items) {
                    setCompleteSetupList(res.data.items);
                  }
                })
                .catch((err) => {
                  if (!isCanceledRequest(err)) logger.warn("Failed to fetch complementary items", err);
                })
            );
          }

          promises.push(
            recommendationService.getAlsoViewed(currentProductId, targetType, 8, { signal: controller.signal })
              .then((res) => {
                if (isMounted && res?.success && res.data?.items) {
                  setAlsoViewedList(res.data.items);
                }
              })
              .catch((err) => {
                if (!isCanceledRequest(err)) logger.warn("Failed to fetch also-viewed items", err);
              })
          );
        }

        if (isAuthenticated) {
          promises.push(
            userService.getRecentlyViewed()
              .then((res) => {
                if (isMounted && res.success && res.data) {
                  const list = res.data.data || res.data.items || (Array.isArray(res.data) ? res.data : []);
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
                      slug: item.product.slug,
                    }))
                    .filter((p) => p.id !== currentProductId);
                  setRecentlyViewedList(formatted.slice(0, 8));
                }
              })
              .catch((err) => logger.warn("Failed to fetch recently viewed", err))
          );
        }

        await Promise.allSettled(promises);
      } catch (err) {
        logger.warn("Failed to fetch recommendations", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    setSimilarList([]);
    setCompleteSetupList([]);
    setAlsoViewedList([]);
    setRecentlyViewedList([]);
    fetchAll();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [category, currentProductId, isAuthenticated, targetType]);

  const tabs = [];

  if (similarList.length > 0) {
    tabs.push({ key: 'similar', label: 'Inspired By Your Style', icon: 'style', count: similarList.length });
  }
  if (completeSetupList.length > 0) {
    tabs.push({ key: 'complete', label: 'Complete the Setup', icon: 'add_circle', count: completeSetupList.length });
  }
  if (alsoViewedList.length > 0) {
    tabs.push({ key: 'alsoViewed', label: 'Other Designer Picks', icon: 'group', count: alsoViewedList.length });
  }
  if (recentlyViewedList.length > 0) {
    tabs.push({ key: 'recent', label: 'Recently Explored', icon: 'history', count: recentlyViewedList.length });
  }

  if (!loading && tabs.length === 0) {
    return null;
  }

  const validTab = tabs.find((t) => t.key === activeTab) ? activeTab : tabs[0]?.key || 'similar';

  const getActiveList = () => {
    switch (validTab) {
      case 'similar': return similarList;
      case 'complete': return completeSetupList;
      case 'alsoViewed': return alsoViewedList;
      case 'recent': return recentlyViewedList;
      default: return similarList;
    }
  };

  const activeList = getActiveList();

  return (
    <section className={`${hideHeader ? 'py-4' : 'pt-16 pb-0 md:pt-24 md:pb-8'} bg-transparent relative overflow-hidden`}>
      {/* Luxury Atmospheric Background */}
      {!hideHeader && (
        <>
          <div className="absolute top-1/2 left-0 w-[600px] h-[600px] bg-[#D0C5AF]/10 rounded-full blur-[140px] -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[100px] translate-x-1/3 -translate-y-1/3 pointer-events-none" />
        </>
      )}

      <div className="max-w-max-width mx-auto px-0 md:px-2 relative z-10">
        <div className={`flex flex-col items-center text-center ${hideHeader ? 'mb-4' : 'mb-12 md:mb-16'}`}>
          {!hideHeader && (
            <>
              <div className="inline-flex items-center gap-2 mb-6">
                <div className="w-12 h-[1px] bg-black/20" />
                <span className="font-label text-[10px] md:text-[11px] text-black/60 uppercase tracking-[0.3em] font-bold">
                  You May Also Like
                </span>
                <div className="w-12 h-[1px] bg-black/20" />
              </div>

              <h2 className="font-display text-[32px] sm:text-[42px] md:text-[56px] text-[#1A1C1A] mb-10 font-light tracking-tight leading-[1.1]">
                Handpicked For You
              </h2>
            </>
          )}

          {/* Editorial Tab Selector */}
          {tabs.length > 1 && (
            <div className="w-full border-b border-black/5 pb-px mb-10 flex items-center justify-start md:justify-center overflow-x-auto no-scrollbar whitespace-nowrap scroll-smooth">
              <div className="flex gap-8 md:gap-12 px-4 md:px-0 mx-auto md:mx-0">
                {tabs.map((tab) => {
                  const isActive = validTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`relative pb-4.5 text-[10px] md:text-[11px] font-body font-bold uppercase tracking-[0.25em] transition-all duration-300 cursor-pointer whitespace-nowrap ${
                        isActive
                          ? "text-stone-900 font-semibold"
                          : "text-stone-400/80 hover:text-stone-700 font-medium"
                      }`}
                    >
                      {tab.label}
                      {isActive && (
                        <motion.div
                          layoutId="activeRecommendationTab"
                          className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary"
                          transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
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
              className="flex overflow-x-auto gap-4 md:gap-6 pb-4 snap-x snap-mandatory no-scrollbar"
            >
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex-none w-[200px] md:w-[250px] lg:w-[280px] flex flex-col gap-4 animate-pulse opacity-50 snap-start" style={{ animationDelay: `${i * 100}ms` }}>
                  <div className="aspect-[3/4] w-full bg-surface-container rounded-[20px] md:rounded-[24px]" />
                  <div className="h-3 w-1/4 bg-surface-container rounded" />
                  <div className="h-5 w-3/4 bg-surface-container rounded" />
                </div>
              ))}
            </motion.div>
          ) : activeList.length > 0 ? (
            <motion.div
              key={validTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="flex overflow-x-auto gap-4 md:gap-6 pb-4 snap-x snap-mandatory no-scrollbar"
            >
              {activeList.slice(0, 8).map((product, idx) => (
                <motion.div
                  key={product.id || product._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05, duration: 0.5 }}
                  className="flex-none w-[160px] sm:w-[200px] md:w-[250px] snap-start"
                >
                  <ProductCard
                    {...product}
                    id={product.id || product._id}
                    imageSrc={product.imageSrc || product.image}
                    price={product.price || product.basePrice}
                  />
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="empty-state"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <span className="material-symbols-outlined text-[40px] text-black/20 mb-4 font-light">
                auto_awesome
              </span>
              <p className="font-body text-black/50 tracking-wide">
                We're learning your preferences. Check back for personalized selections.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
