import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SectionWrapper } from '../layout';
import { RecommendationCarousel } from '../ui/RecommendationCarousel';
import { ProductCard } from '../ui/ProductCard';
import { RecommendationSkeleton } from '../ui/Skeleton';
import { useTrendingRecommendations } from '../../hooks/useRecommendationQueries';
import logger from '../../utils/logger';

const FEED_TABS = [
  { key: 'trendingNow', label: 'Trending Now', icon: 'local_fire_department' },
  { key: 'mostBooked', label: 'Most Booked', icon: 'check_circle' },
  { key: 'popularThisSeason', label: 'In Season', icon: 'wb_sunny' },
];

export function TrendingSection({ 
  title = "Trending Elegance", 
  subtitle = "Discover the masterpieces defining luxury celebrations right now.",
  badgeText = "Real-Time Insights",
  limit = 12
}) {
  const [activeTab, setActiveTab] = useState('trendingNow');

  const trendingQuery = useTrendingRecommendations({ limit });
  const bookedQuery = useTrendingRecommendations({ feed: 'mostBooked', limit: Math.max(10, limit - 2) });
  const seasonalQuery = useTrendingRecommendations({ feed: 'popularThisSeason', limit });

  const loading = trendingQuery.isLoading || bookedQuery.isLoading || seasonalQuery.isLoading;
  
  const feeds = {
    trendingNow: trendingQuery.data?.items || trendingQuery.data || [],
    mostBooked: bookedQuery.data?.items || bookedQuery.data || [],
    popularThisSeason: seasonalQuery.data?.items || seasonalQuery.data || [],
  };

  const currentItems = feeds[activeTab] || [];

  if (!loading && Object.values(feeds).every((f) => !f || f.length === 0)) return null;

  return (
    <SectionWrapper className="!py-20 md:!py-32 relative bg-surface overflow-hidden">
      {/* Subtle background layering */}
      <div className="absolute top-0 left-1/2 w-[800px] h-[600px] bg-[#D0C5AF]/10 rounded-full blur-[140px] -translate-x-1/2 -translate-y-1/2 pointer-events-none" />

      <div className="relative z-10 max-w-max-width mx-auto">
        {/* Luxury Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-12 md:mb-16 px-4"
        >
          {badgeText && (
            <div className="inline-flex items-center gap-2 mb-6">
              <div className="w-12 h-[1px] bg-black/20" />
              <span className="font-label text-[10px] md:text-[11px] text-black/60 uppercase tracking-[0.3em] font-bold">
                {badgeText}
              </span>
              <div className="w-12 h-[1px] bg-black/20" />
            </div>
          )}

          <h2 className="font-display text-[32px] sm:text-[42px] md:text-[56px] text-[#1A1C1A] leading-[1.1] tracking-tight font-light max-w-2xl mx-auto">
            {title}
          </h2>
          {subtitle && (
            <p className="font-body text-base md:text-lg text-on-surface-variant/70 mt-4 max-w-xl mx-auto font-light">
              {subtitle}
            </p>
          )}
        </motion.div>

        {/* Editorial Feed Tabs */}
        <div className="flex items-center justify-start md:justify-center gap-3 mb-10 md:mb-16 overflow-x-auto no-scrollbar pb-4 px-6 md:px-8 w-full">
          {FEED_TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`relative flex items-center gap-1.5 md:gap-2 px-5 md:px-6 py-2.5 md:py-3 rounded-full text-[10px] md:text-[11px] uppercase tracking-[0.15em] md:tracking-[0.2em] whitespace-nowrap transition-all duration-300 shrink-0 ${
                  isActive
                    ? 'text-white bg-[#1A1C1A] font-bold shadow-md md:shadow-xl border border-transparent'
                    : 'text-[#1A1C1A]/70 hover:text-[#1A1C1A] bg-black/5 md:bg-transparent hover:bg-black/10 font-medium border border-black/5 md:border-transparent'
                }`}
              >
                <span className="material-symbols-outlined text-[14px] md:text-[16px] font-light">{tab.icon}</span>
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Dynamic Carousel Content */}
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <RecommendationSkeleton horizontal={true} />
            </motion.div>
          ) : currentItems.length > 0 ? (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              <RecommendationCarousel
                items={currentItems}
                itemMinWidth="min(300px, 85vw)"
                gap="24px"
                renderItem={(item) => (
                  <ProductCard
                    {...item}
                    id={item.id || item._id}
                    imageSrc={item.imageSrc || item.image}
                    price={item.price || item.basePrice}
                  />
                )}
              />
            </motion.div>
          ) : (
            <motion.div 
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <span className="material-symbols-outlined text-[40px] text-black/20 mb-4 font-light">hourglass_empty</span>
              <p className="font-body text-black/50 tracking-wide">Gathering insights. Check back soon for trending decor.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </SectionWrapper>
  );
}

export default TrendingSection;
