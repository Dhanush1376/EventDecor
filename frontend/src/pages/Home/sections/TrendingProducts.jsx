import { SectionHeader } from '../../../components/shared/SectionHeader';
import { CarouselWrapper } from '../../../components/shared/CarouselWrapper';
import { ProductCard } from '../../../components/shared/ProductCard';
import { MandalaElement } from '../../../components/ui/MandalaElement';
import { MandalaArtDecor } from '../../../components/ui/MandalaArtDecor';
import { HomeSectionState } from '../../../components/homepage/HomeSectionState';
import { useTrendingRecommendations } from '../../../hooks/useRecommendationQueries';
import { useWebsiteContent } from '../../../hooks/useWebsiteContent';

import React from 'react';

/**
 * Trending products using real recommendation API.
 */
export const TrendingProducts = React.memo(function TrendingProducts() {
  const cms = useWebsiteContent({ includeDefaults: false });
  const loading = cms?.loading;
  const config = cms?.trendingProducts || {};
  const _productIds = config.productIds || [];

  const {
    data: trendingData,
    isLoading: isPending,
    isError,
    refetch,
  } = useTrendingRecommendations(
    {
      feed: 'trendingNow',
      limit: config.maxDisplay || 10,
    },
    { enabled: config.isVisible !== false },
  );

  if (config.isVisible === false) return null;

  const products = trendingData?.items || trendingData || [];

  if (isPending || loading) {
    return (
      <section className="h1-section relative overflow-hidden isolate" id="h1-trending">
        {/* Background glow gradient behind mandala */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-primary-container/20 rounded-full blur-[100px] pointer-events-none z-[-1]" />

        {/* Decorative Mandala */}
        <MandalaArtDecor
          className="absolute -top-6 -right-[500px] opacity-[0.03] z-[-1]"
          size={1000}
        />

        <div className="h1-container relative z-10 animate-pulse">
          <div className="flex justify-between items-end mb-8 md:mb-10">
            <div>
              <div className="h-3 w-20 md:w-24 bg-surface-container-high rounded-full mb-2"></div>
              <div className="h-8 md:h-10 w-48 md:w-64 bg-surface-container-high rounded-full"></div>
            </div>
            <div className="h-4 w-20 bg-surface-container-high rounded-full hidden md:block"></div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex flex-col gap-4">
                <div className="w-full aspect-[3/4] bg-surface-container-high rounded-[24px] md:rounded-[32px]"></div>
                <div className="px-1 md:px-2">
                  <div className="w-[80%] h-4 bg-surface-container-high rounded-full mb-2"></div>
                  <div className="w-[60%] h-3 bg-surface-container-high rounded-full mb-3"></div>
                  <div className="w-[40%] h-5 bg-surface-container-high rounded-full"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // const products = trendingProducts; // removed as products is already defined above
  if (isError) {
    return (
      <HomeSectionState
        title="Trending products could not be loaded"
        message="Retry the recommendation request or check the recommendation API."
        icon="error"
        onRetry={refetch}
      />
    );
  }
  if (!products || products.length === 0) {
    return null;
  }

  return (
    <section className="h1-section relative overflow-hidden isolate" id="h1-trending">
      {/* Background glow gradient behind mandala */}
      <div className="absolute top-0 -left-32 w-[250px] h-[250px] bg-primary-container/15 rounded-full blur-[70px] pointer-events-none z-[-1]" />
      <MandalaElement
        variant={1}
        size={400}
        className="absolute top-12 -left-20 z-[-1]"
        opacity={0.08}
        duration={120}
      />
      <div className="h1-container relative z-10">
        <SectionHeader
          kicker={config.kicker}
          title={config.sectionTitle}
          seeAllLink={config.seeAllLink}
        />
      </div>
      <div className="h1-container--full pl-4 md:pl-9 relative z-10">
        <CarouselWrapper gap="16px">
          {products.map((product) => (
            <div key={product.id || product._id} className="h1-scroll-item">
              <ProductCard
                {...product}
                id={product.id || product._id}
                imageSrc={product.imageSrc || product.image || product.thumbnail}
                price={product.price || product.basePrice}
              />
            </div>
          ))}
        </CarouselWrapper>
      </div>
    </section>
  );
});
