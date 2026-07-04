import { m as motion, AnimatePresence } from 'framer-motion';
import { ProductCard } from '../shared/ProductCard';
import { RecommendationSkeleton } from '../ui/Skeleton';
import { MandalaArtDecor } from '../ui/MandalaArtDecor';
import { useState, useEffect, useMemo } from 'react';
import {
  useSimilarRecommendations,
  useCompleteSetup,
  useAlsoViewed,
  useTrendingRecommendations,
} from '../../hooks/useRecommendationQueries';
import { useRecentlyViewed } from '../../hooks/useUserQueries';
import { useAuth } from '../../context/AuthContext';

export function RecommendationSystem({
  _category,
  currentProductId,
  targetType = 'product',
  hideHeader = false,
  compact = false,
  horizontalScroll = false,
  rentalOnly = false,
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

  const similarQuery = useSimilarRecommendations(targetType, currentProductId, 8, {
    enabled: shouldFetch && !!currentProductId,
  });
  const completeQuery = useCompleteSetup(currentProductId, targetType, 8, {
    enabled: shouldFetch && !!currentProductId,
  });
  const alsoViewedQuery = useAlsoViewed(currentProductId, targetType, 8, {
    enabled: shouldFetch && !!currentProductId,
  });
  const recentlyViewedQuery = useRecentlyViewed();
  const trendingQuery = useTrendingRecommendations(
    { limit: 12 },
    { enabled: shouldFetch && !currentProductId },
  );

  const similarList = similarQuery.data?.items || similarQuery.data || [];
  const completeSetupList = completeQuery.data?.items || completeQuery.data || [];
  const alsoViewedList = alsoViewedQuery.data?.items || alsoViewedQuery.data || [];
  const trendingList = trendingQuery.data?.items || trendingQuery.data || [];

  const recentlyViewedList = useMemo(() => {
    if (!isAuthenticated || !recentlyViewedQuery.data) return [];
    const list =
      recentlyViewedQuery.data.data ||
      recentlyViewedQuery.data.items ||
      (Array.isArray(recentlyViewedQuery.data) ? recentlyViewedQuery.data : []);
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
        rating: item.product.rating || 0,
        slug: item.product.slug,
        isRentalAvailable: item.product.isRentalAvailable,
        rentalEnabled: item.product.rentalEnabled,
        availabilityMode: item.product.availabilityMode,
        rentalPricing: item.product.rentalPricing,
        securityDeposit: item.product.securityDeposit,
      }))
      .filter((p) => p.id !== currentProductId)
      .slice(0, 8);
  }, [recentlyViewedQuery.data, isAuthenticated, currentProductId]);

  // Determine if we should show the loading skeleton
  // We only show loading if we have started fetching AND we don't have any cached placeholder data
  const loading =
    shouldFetch &&
    (currentProductId
      ? (similarQuery.isPending && similarList.length === 0) ||
        (completeQuery.isPending && completeSetupList.length === 0) ||
        (alsoViewedQuery.isPending && alsoViewedList.length === 0)
      : trendingQuery.isPending && trendingList.length === 0);

  const getActiveList = () => {
    const combined = [
      ...similarList,
      ...completeSetupList,
      ...alsoViewedList,
      ...recentlyViewedList,
      ...trendingList,
    ];
    const uniqueIds = new Set();
    let uniqueList = [];
    const currentIdStr = currentProductId ? String(currentProductId) : '';

    for (const item of combined) {
      const rawId = item.id || item._id;
      if (!rawId) continue;
      const idStr = String(rawId);

      if (!uniqueIds.has(idStr) && idStr !== currentIdStr) {
        uniqueIds.add(idStr);
        uniqueList.push(item);
      }
    }

    if (rentalOnly) {
      uniqueList = uniqueList.filter(
        (item) =>
          item.isRentalAvailable ||
          item.rentalEnabled ||
          item.availabilityMode === 'both' ||
          item.availabilityMode === 'rental' ||
          item.availabilityMode === 'rent_only' ||
          item.rentalPricing,
      );
    } else {
      uniqueList = uniqueList.filter(
        (item) =>
          item.targetType !== 'event' &&
          item.availabilityMode !== 'rental' &&
          item.availabilityMode !== 'rent_only',
      );
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
    <section
      className={`${compact ? 'pt-1 pb-0 lg:py-2' : 'pt-6 pb-12 lg:pt-10 lg:pb-16'} bg-transparent relative overflow-hidden`}
    >
      {/* Subtle Glow Accent */}
      <div className="absolute top-1/2 left-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] -translate-y-1/2 pointer-events-none" />

      {/* Mandala Aesthetics */}
      {!compact && (
        <MandalaArtDecor
          variant={3}
          size={800}
          opacity={0.06}
          className="-bottom-[300px] -left-[20px] lg:left-0"
          spinDuration={180}
        />
      )}

      <div className="max-w-max-width mx-auto px-4 lg:px-6 lg:px-8 relative z-10">
        {!compact && !hideHeader && (
          <div className="w-full flex justify-center mb-10 lg:mb-14">
            <div className="w-full max-w-[180px] flex items-center justify-center gap-3 opacity-60">
              <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-[#C4A87C] to-[#C4A87C]" />
              <span
                className="material-symbols-outlined text-[16px] text-[#C4A87C]"
                style={{ fontVariationSettings: "'wght' 300" }}
              >
                local_florist
              </span>
              <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent via-[#C4A87C] to-[#C4A87C]" />
            </div>
          </div>
        )}

        {!hideHeader && (
          <div className={`${compact ? 'mb-3' : 'mb-6'} w-full text-left`}>
            <h2
              className={`${
                compact
                  ? 'text-[11px] uppercase tracking-widest font-bold text-on-surface/80 font-label'
                  : 'text-xl lg:text-2xl font-light tracking-tight text-on-surface font-display'
              } leading-tight`}
            >
              {rentalOnly ? 'Rental Masterpieces' : 'You May Also Like'}
            </h2>
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
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={
                horizontalScroll
                  ? `flex gap-4 lg:gap-6 ${compact ? 'pb-2' : 'pb-4'} overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar touch-pan-x`
                  : 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 pb-6'
              }
            >
              {activeList.map((product, idx) => {
                const motionProps = horizontalScroll
                  ? {}
                  : {
                      initial: { opacity: 0, scale: 0.96 },
                      animate: { opacity: 1, scale: 1 },
                      transition: { delay: idx * 0.04, duration: 0.4 },
                    };
                return (
                  <motion.div
                    key={product.id || product._id || `reco-item-${idx}`}
                    {...motionProps}
                    className={
                      horizontalScroll
                        ? `${compact ? 'w-[140px] sm:w-[160px]' : 'w-[200px] sm:w-[240px] lg:w-[280px]'} flex-shrink-0 snap-start`
                        : 'w-full'
                    }
                  >
                    <ProductCard
                      {...product}
                      id={product.id || product._id}
                      imageSrc={product.imageSrc || product.image}
                      price={product.price || product.basePrice}
                      compact={compact}
                      cartType={rentalOnly ? 'rental' : 'purchase'}
                    />
                  </motion.div>
                );
              })}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </section>
  );
}

export default RecommendationSystem;
