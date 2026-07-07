import { SectionHeader } from '../../../components/shared/SectionHeader';
import { CarouselWrapper } from '../../../components/shared/CarouselWrapper';
import { ProductCard } from '../../../components/shared/ProductCard';
import { MandalaElement } from '../../../components/ui/MandalaElement';
import { HomeSectionState } from '../../../components/homepage/HomeSectionState';
import { useProducts } from '../../../hooks/useProductQueries';
import { useWebsiteContent } from '../../../hooks/useWebsiteContent';

/**
 * Best sellers using real API data.
 */
export function BestSellers({ previewContent }) {
  const cms = useWebsiteContent({ includeDefaults: false });
  const activeCms = previewContent || cms;
  const loading = !previewContent && cms?.loading;
  const config = activeCms?.featuredProducts || {};
  const productIds = config.productIds || [];

  const { data, isPending, isError, refetch } = useProducts(
    {
      ...(productIds.length > 0 ? { ids: productIds.join(',') } : { sort: 'newest' }),
      limit: config.maxDisplay || 10,
    },
    { enabled: config.isVisible !== false },
  );

  if (config.isVisible === false) return null;

  if (isPending || loading) {
    return (
      <section className="h1-section relative overflow-hidden isolate" id="h1-new-arrivals">
        <div className="h1-container relative z-10 animate-pulse">
          <div className="flex justify-between items-end mb-8 lg:mb-10">
            <div>
              <div className="h-3 w-20 lg:w-24 bg-surface-container-high rounded-full mb-2"></div>
              <div className="h-8 lg:h-10 w-48 lg:w-64 bg-surface-container-high rounded-full"></div>
            </div>
            <div className="h-4 w-20 bg-surface-container-high rounded-full hidden lg:block"></div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-8">
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
        title="Featured products could not be loaded"
        message="Retry the product request or check the product API."
        icon="error"
        onRetry={refetch}
      />
    );
  }
  if (!products || products.length === 0) {
    return (
      <HomeSectionState
        title={`No products available for ${config.sectionTitle || 'Featured Products'}`}
        message="Check back soon for new arrivals."
        icon="inventory_2"
      />
    );
  }

  return (
    <section className="h1-section relative overflow-hidden isolate" id="h1-new-arrivals">
      {/* Background glow gradient behind mandala */}
      <div className="absolute -top-32 -right-32 w-[250px] h-[250px] bg-primary-container/15 rounded-full blur-[70px] pointer-events-none z-[-1]" />
      <MandalaElement
        className="absolute top-0 -right-32 opacity-[0.04] z-[-1]"
        size={500}
        duration={150}
        variant={1}
      />
      <div className="h1-container relative z-10">
        <SectionHeader
          kicker={config.kicker}
          title={config.sectionTitle}
          seeAllLink={config.seeAllLink || '/collections'}
        />
      </div>
      <div className="h1-container--full pl-4 lg:pl-9 relative z-10">
        <CarouselWrapper gap="16px">
          {products.slice(0, config.maxDisplay || 8).map((product) => {
            const customBadges = [];
            if (config.badgeText || config.badgeIcon) {
              customBadges.push({
                text: config.badgeText || '',
                icon: config.badgeIcon || '',
              });
            }

            return (
              <div key={product.id || product._id} className="h1-scroll-item">
                <ProductCard
                  key={product.id || product._id}
                  {...product}
                  id={product.id || product._id}
                  imageSrc={product.imageSrc || product.image || product.thumbnail}
                  price={product.price || product.basePrice}
                  oldPrice={product.strikingPrice || product.oldPrice || product.mrp}
                  badges={customBadges}
                />
              </div>
            );
          })}
        </CarouselWrapper>
      </div>
    </section>
  );
}
