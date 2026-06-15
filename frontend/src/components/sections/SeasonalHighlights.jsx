import { useState, useEffect } from 'react';
import { recommendationService } from '../../services/recommendationService';
import logger from '../../utils/logger';

const SEASONAL_THEMES = {
  diwali: {
    icon: 'celebration',
    gradient: 'from-[#C48C36]/10 to-[#8A5A19]/5',
    accent: 'text-[#8A5A19]',
    border: 'border-[#C48C36]/20',
    bg: 'bg-[#C48C36]/5',
  },
  wedding_season: {
    icon: 'favorite',
    gradient: 'from-[#D4B5B0]/15 to-[#B8868A]/5',
    accent: 'text-[#8C5A5E]',
    border: 'border-[#D4B5B0]/30',
    bg: 'bg-[#D4B5B0]/10',
  },
  christmas_newyear: {
    icon: 'park',
    gradient: 'from-[#8C9A86]/15 to-[#5A6E55]/5',
    accent: 'text-[#3E4F3A]',
    border: 'border-[#8C9A86]/30',
    bg: 'bg-[#8C9A86]/10',
  },
  sankranti: {
    icon: 'wb_sunny',
    gradient: 'from-[#E6C687]/15 to-[#D4A352]/5',
    accent: 'text-[#A67824]',
    border: 'border-[#E6C687]/30',
    bg: 'bg-[#E6C687]/10',
  },
  holi: {
    icon: 'palette',
    gradient: 'from-[#C19BCA]/15 to-[#9F72AC]/5',
    accent: 'text-[#6B407A]',
    border: 'border-[#C19BCA]/30',
    bg: 'bg-[#C19BCA]/10',
  },
  summer: {
    icon: 'sunny',
    gradient: 'from-[#9BB8C4]/15 to-[#6B93A6]/5',
    accent: 'text-[#3A5F70]',
    border: 'border-[#9BB8C4]/30',
    bg: 'bg-[#9BB8C4]/10',
  },
  monsoon_engagement: {
    icon: 'water_drop',
    gradient: 'from-[#8BA6A1]/15 to-[#5E7F79]/5',
    accent: 'text-[#36524D]',
    border: 'border-[#8BA6A1]/30',
    bg: 'bg-[#8BA6A1]/10',
  },
  navratri: {
    icon: 'temple_hindu',
    gradient: 'from-[#D29074]/15 to-[#B46241]/5',
    accent: 'text-[#853C1F]',
    border: 'border-[#D29074]/30',
    bg: 'bg-[#D29074]/10',
  },
};

const DEFAULT_THEME = {
  icon: 'auto_awesome',
  gradient: 'from-[#D0C5AF]/10 to-[#1A1C1A]/5',
  accent: 'text-[#1A1C1A]',
  border: 'border-[#D0C5AF]/30',
  bg: 'bg-[#D0C5AF]/10',
};

export function SeasonalHighlights({
  title = 'Seasonal Inspirations',
  subtitle = 'Curated masterpieces perfectly suited for the exquisite {season} celebrations.',
  limit = 12,
}) {
  const [items, setItems] = useState([]);
  const [seasonal, setSeasonal] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSeasonal = async () => {
      try {
        const res = await recommendationService.getSeasonal({ limit });
        if (res?.success && res.data) {
          setItems(res.data.items || []);
          setSeasonal(res.data.seasonal || null);
        }
      } catch (err) {
        logger.error('Failed to fetch seasonal highlights', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSeasonal();
  }, [limit]);

  if (!loading && (!seasonal?.isSeasonallyActive || items.length === 0)) return null;

  const activePeriod = seasonal?.activePeriods?.[0];
  const theme = activePeriod
    ? SEASONAL_THEMES[activePeriod.context] || DEFAULT_THEME
    : DEFAULT_THEME;

  const seasonName = activePeriod?.name || 'Seasonal Collection';
  const displaySubtitle = subtitle.replace('{season}', seasonName.toLowerCase());

  return (
    <SectionWrapper className="!py-20 md:!py-32 relative bg-[#FAF9F6] border-y border-black/5 overflow-hidden">
      {/* Immersive Seasonal Backdrop */}
      <div
        className={`absolute inset-0 bg-gradient-to-br ${theme.gradient} pointer-events-none transition-colors duration-1000`}
      />
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-white/40 rounded-full blur-[120px] translate-x-1/3 -translate-y-1/3 pointer-events-none" />

      <div className="relative z-10 max-w-max-width mx-auto">
        {/* Luxury Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-12 md:mb-16 px-4"
        >
          {/* Season badge */}
          <div
            className={`inline-flex items-center gap-3 px-5 py-2 rounded-full border ${theme.border} bg-white/60 backdrop-blur-md mb-6 shadow-sm`}
          >
            <span className={`material-symbols-outlined text-[16px] font-light ${theme.accent}`}>
              {theme.icon}
            </span>
            <span
              className={`font-label text-[10px] uppercase tracking-[0.3em] font-bold ${theme.accent}`}
            >
              {seasonName}
            </span>
          </div>

          <h2 className="font-display text-[32px] sm:text-[42px] md:text-[56px] text-[#1A1C1A] leading-[1.1] tracking-tight font-light max-w-2xl mx-auto">
            {title}
          </h2>
          <p className="font-body text-base md:text-lg text-on-surface-variant/70 mt-4 max-w-xl mx-auto font-light">
            {displaySubtitle}
          </p>

          {/* Elegant boosted categories */}
          {activePeriod?.boostedCategories && (
            <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
              {activePeriod.boostedCategories.slice(0, 5).map((cat) => (
                <Link
                  key={cat}
                  to={`/collections?category=${cat}`}
                  className={`px-5 py-2 rounded-full border border-black/10 text-[10px] font-bold uppercase tracking-[0.2em] text-[#1A1C1A]/70 hover:text-[#1A1C1A] hover:border-black/30 hover:bg-white/50 transition-all duration-300 backdrop-blur-sm`}
                >
                  {cat}
                </Link>
              ))}
            </div>
          )}
        </motion.div>

        {/* Carousel Content */}
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex gap-6 overflow-hidden px-4 md:px-12"
            >
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="min-w-[300px] animate-pulse opacity-50"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <div className="bg-surface-container rounded-[24px] aspect-[3/4] mb-5 shadow-sm" />
                  <div className="h-3 bg-surface-container rounded w-1/4 mb-3" />
                  <div className="h-5 bg-surface-container rounded w-3/4 mb-4" />
                </div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8 }}
            >
              <RecommendationCarousel
                items={items}
                viewAllLink="/collections"
                viewAllLabel={`Explore ${seasonName}`}
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
          )}
        </AnimatePresence>
      </div>
    </SectionWrapper>
  );
}

export default SeasonalHighlights;
