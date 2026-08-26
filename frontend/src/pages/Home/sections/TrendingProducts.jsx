import { SectionHeader } from '../../../components/shared/SectionHeader';
import { CarouselWrapper } from '../../../components/shared/CarouselWrapper';
import { ProductCard } from '../../../components/shared/ProductCard';
import { MandalaElement } from '../../../components/ui/MandalaElement';
import { MandalaArtDecor } from '../../../components/ui/MandalaArtDecor';
import { useTrendingRecommendations } from '../../../hooks/useRecommendationQueries';
import { useProducts } from '../../../hooks/useProductQueries';
import { useWebsiteContent } from '../../../hooks/useWebsiteContent';

import React from 'react';

/**
 * Trending products using real recommendation API.
 */
export const TrendingProducts = React.memo(function TrendingProducts({ previewContent }) {
  const cms = useWebsiteContent({ includeDefaults: false });
  const activeCms = previewContent || cms;
  const loading = !previewContent && cms?.loading;
  const config = activeCms?.trendingProducts || {};
  const _productIds = config.productIds || [];
  const isManualMode = config.useAutoFeed === false && _productIds.length > 0;

  const {
    data: manualData,
    isPending: manualPending,
    isError: manualError,
    refetch: manualRefetch,
  } = useProducts(
    { ids: _productIds.join(','), limit: config.maxDisplay || 10 },
    { enabled: config.isVisible !== false && isManualMode },
  );

  const {
    data: trendingData,
    isLoading: trendingPending,
    isError: trendingError,
    refetch: trendingRefetch,
  } = useTrendingRecommendations(
    {
      feed: 'trendingNow',
      limit: config.maxDisplay || 10,
    },
    { enabled: config.isVisible !== false && !isManualMode },
  );

  if (config.isVisible === false) return null;

  const isPending = isManualMode ? manualPending : trendingPending;
  const isError = isManualMode ? manualError : trendingError;
  const refetch = isManualMode ? manualRefetch : trendingRefetch;

  const products = isManualMode
    ? manualData?.data ||
      manualData?.products ||
      manualData?.items ||
      (Array.isArray(manualData) ? manualData : [])
    : trendingData?.items || trendingData || [];

  if (isPending || loading) {
    return (
      <section className="h1-section !pt-4 lg:!pt-8 relative isolate" id="h1-trending">
        {/* Background glow gradient behind mandala */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-primary-container/20 rounded-full blur-[100px] pointer-events-none z-[-1]" />

        {/* Decorative Mandala */}
        <MandalaArtDecor
          className="absolute -top-6 -right-[500px] opacity-[0.03] z-[-1]"
          size={1000}
        />

        <div className="h1-container relative z-10 animate-pulse">
          <div className="flex justify-between items-end mb-8 lg:mb-10">
            <div>
              <div className="h-3 w-20 lg:w-24 bg-surface-container-high rounded-full mb-2"></div>
              <div className="h-8 lg:h-10 w-48 lg:w-64 bg-surface-container-high rounded-full"></div>
            </div>
            <div className="h-4 w-20 bg-surface-container-high rounded-full hidden lg:block"></div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 lg:gap-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex flex-col gap-4">
                <div className="w-full aspect-[3/4] bg-surface-container-high rounded-[24px] lg:rounded-[32px]"></div>
                <div className="px-1 lg:px-2">
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
  if (isError || !products || products.length === 0) {
    return null;
  }

  return (
    <section className="h1-section !pt-4 lg:!pt-8 !pb-4 lg:!pb-8 relative isolate" id="h1-trending">
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
          kicker={config.sectionSubtitle !== undefined ? config.sectionSubtitle : config.kicker}
          title={config.sectionTitle || 'Trending Now'}
          seeAllLink={config.seeAllLink || '/collections'}
        />
      </div>
      <div className="h1-container--full pl-4 lg:pl-9 relative z-10">
        <CarouselWrapper gap="16px">
          {products.map((product) => (
            <div key={product.id || product._id} className="h1-scroll-item">
              <ProductCard
                {...product}
                id={product.id || product._id}
                imageSrc={product.imageSrc || product.image || product.thumbnail}
                price={product.price || product.basePrice}
                oldPrice={product.strikingPrice || product.oldPrice || product.mrp}
              />
            </div>
          ))}
        </CarouselWrapper>
      </div>
    </section>
  );
});
