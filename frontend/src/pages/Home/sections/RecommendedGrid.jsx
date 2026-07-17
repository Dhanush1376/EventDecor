import { SectionHeader } from '../../../components/shared/SectionHeader';
import { ProductCard } from '../../../components/shared/ProductCard';
import { MandalaElement } from '../../../components/ui/MandalaElement';
import { HomeSectionState } from '../../../components/homepage/HomeSectionState';
import { useProducts } from '../../../hooks/useProductQueries';
import { useWebsiteContent } from '../../../hooks/useWebsiteContent';
import React from 'react';

/**
 * Recommended grid using real personalized feed API or manual curation.
 */
export function RecommendedGrid({ previewContent }) {
  const cms = useWebsiteContent({ includeDefaults: false });
  const activeCms = previewContent || cms;
  const loading = !previewContent && cms?.loading;
  const config = activeCms?.recommendedProducts || {};

  const productIds = config.productIds || [];
  const isManualMode = config.useAutoFeed === false && productIds.length > 0;

  const { data, isPending, isError, refetch } = useProducts(
    {
      ...(isManualMode ? { ids: productIds.join(',') } : { featured: true }),
      limit: config.maxDisplay || 10,
    },
    { enabled: config.isVisible !== false },
  );

  if (config.isVisible === false) return null;

  if (isPending || loading) {
    return (
      <section
        className="h1-section bg-surface-container-lowest relative overflow-hidden isolate"
        id="h1-recommended"
      >
        {/* Background glow gradients behind mandalas */}
        <div className="absolute -top-40 -left-40 w-[300px] h-[300px] bg-primary-container/15 rounded-full blur-[80px] pointer-events-none z-[-1]" />
        <div className="absolute -bottom-40 -right-40 w-[300px] h-[300px] bg-primary-container/15 rounded-full blur-[80px] pointer-events-none z-[-1]" />

        <MandalaElement
          className="absolute -top-32 -left-32 opacity-[0.05] z-[-1]"
          size={500}
          duration={170}
          variant={4}
        />
        <MandalaElement
          className="absolute -bottom-32 -right-32 opacity-[0.05] z-[-1]"
          size={500}
          duration={170}
          variant={4}
        />
        <div className="h1-container relative z-10 animate-pulse">
          <div className="flex justify-between items-end mb-8 lg:mb-10">
            <div>
              <div className="h-3 w-20 lg:w-24 bg-surface-container-high rounded-full mb-2"></div>
              <div className="h-8 lg:h-10 w-48 lg:w-64 bg-surface-container-high rounded-full"></div>
            </div>
            <div className="h-4 w-20 bg-surface-container-high rounded-full hidden lg:block"></div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-4 lg:gap-6 lg:gap-8">
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

  const products = data?.data || data?.products || data?.items || (Array.isArray(data) ? data : []);
  if (isError) {
    return (
      <HomeSectionState
        title="Recommendations could not be loaded"
        message="Retry the personalized recommendation request."
        icon="error"
        onRetry={refetch}
      />
    );
  }
  if (!products || products.length === 0) {
    return (
      <HomeSectionState
        title={`No products available for ${config.sectionTitle || 'Recommended For You'}`}
        message="Check back soon for new arrivals."
        icon="inventory_2"
      />
    );
  }

  return (
    <section
      className="h1-section bg-surface-container-lowest relative overflow-hidden isolate"
      id="h1-recommended"
    >
      {/* Background glow gradients behind mandalas */}
      <div className="absolute -top-40 -left-40 w-[300px] h-[300px] bg-primary-container/15 rounded-full blur-[80px] pointer-events-none z-[-1]" />
      <div className="absolute -bottom-40 -right-40 w-[300px] h-[300px] bg-primary-container/15 rounded-full blur-[80px] pointer-events-none z-[-1]" />
      <MandalaElement
        className="absolute -top-32 -left-32 opacity-[0.05] z-[-1]"
        size={500}
        duration={170}
        variant={4}
      />
      <MandalaElement
        className="absolute -bottom-32 -right-32 opacity-[0.05] z-[-1]"
        size={500}
        duration={170}
        variant={4}
      />
      <div className="h1-container relative z-10">
        <SectionHeader
          kicker={config.sectionSubtitle !== undefined ? config.sectionSubtitle : config.kicker}
          title={config.sectionTitle || 'Recommended For You'}
          seeAllLink={config.seeAllLink || '/collections'}
        />
      </div>
      <div className="h1-container relative z-10 mt-6">
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-4 lg:gap-6 lg:gap-8">
          {products.slice(0, config.maxDisplay || 8).map((product) => (
            <ProductCard
              key={product.id || product._id}
              {...product}
              id={product.id || product._id}
              imageSrc={product.imageSrc || product.image || product.thumbnail}
              price={product.price || product.basePrice}
              oldPrice={product.strikingPrice || product.oldPrice || product.mrp}
              badges={config.badgeText ? [config.badgeText] : []}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
