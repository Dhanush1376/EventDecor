import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ProductCard } from "../ui/ProductCard";
import { recommendationService } from "../../services/recommendationService";
import { userService } from "../../services/domainServices";
import { useAuth } from "../../context/AuthContext";

import logger from '../../utils/logger';

const isCanceledRequest = (err) =>
  err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED' || err?.message === 'canceled';

export function RecommendationSystem({ category, currentProductId, targetType = 'product', hideHeader = false, compact = false, horizontalScroll = false }) {
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
    // Combine lists and remove duplicates, or just use the first non-empty list.
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
    return uniqueList.slice(0, 16); // Increased to 16 so "the rest" can show up below
  };

  const activeList = getActiveList();

  return (
    <section className={`py-8 bg-transparent relative overflow-hidden`}>
      <div className="max-w-max-width mx-auto px-4 md:px-6 lg:px-8 relative z-10">
        <div className="mb-6">
          <h3 className="font-body text-lg md:text-xl text-stone-800 font-bold tracking-tight">
            You May Also Like
          </h3>
        </div>
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading-skeleton"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={horizontalScroll ? "flex gap-4 md:gap-6 pb-4 overflow-x-auto overflow-y-hidden no-scrollbar" : "grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 pb-4"}
            >
              {[...Array(4)].map((_, i) => (
                <div key={i} className={`flex flex-col gap-4 animate-pulse opacity-50 ${horizontalScroll ? 'w-[170px] sm:w-[200px] md:w-[240px] flex-shrink-0' : 'w-full'}`} style={{ animationDelay: `${i * 100}ms` }}>
                  <div className={`aspect-[3/4] w-full bg-surface-container ${compact ? 'rounded' : 'rounded-[20px] md:rounded-[24px]'}`} />
                  <div className={`h-3 w-1/4 bg-surface-container ${compact ? 'rounded' : 'rounded'}`} />
                  <div className={`h-5 w-3/4 bg-surface-container ${compact ? 'rounded' : 'rounded'}`} />
                </div>
              ))}
            </motion.div>
          ) : activeList.length > 0 ? (
            <motion.div
              key="grid-list"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className={horizontalScroll ? "flex gap-4 md:gap-6 pb-6 overflow-x-auto overflow-y-hidden snap-x snap-mandatory scroll-smooth no-scrollbar" : "grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 pb-4"}
            >
              {activeList.map((product, idx) => (
                <motion.div
                  key={product.id || product._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05, duration: 0.5 }}
                  className={horizontalScroll ? "w-[170px] sm:w-[200px] md:w-[240px] flex-shrink-0 snap-start" : "w-full"}
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
