import { useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { Helmet } from 'react-helmet-async';

import { HeroCarousel } from './sections/HeroCarousel';
import { LazySection } from '../../components/ui/LazySection';

const CategoryGrid = lazy(() =>
  import('./sections/CategoryGrid').then((m) => ({ default: m.CategoryGrid })),
);
const TrendingProducts = lazy(() =>
  import('./sections/TrendingProducts').then((m) => ({ default: m.TrendingProducts })),
);
const BestSellers = lazy(() =>
  import('./sections/BestSellers').then((m) => ({ default: m.BestSellers })),
);
const PromoBanner = lazy(() =>
  import('./sections/PromoBanner').then((m) => ({ default: m.PromoBanner })),
);
const RecommendedGrid = lazy(() =>
  import('./sections/RecommendedGrid').then((m) => ({ default: m.RecommendedGrid })),
);
const ShopByOccasion = lazy(() =>
  import('./sections/ShopByOccasion').then((m) => ({ default: m.ShopByOccasion })),
);
const GalleryInspiration = lazy(() =>
  import('./sections/GalleryInspiration').then((m) => ({ default: m.GalleryInspiration })),
);

import './home.css';
import { useWebsiteContent } from '../../hooks/useWebsiteContent';

export function Home() {
  const cms = useWebsiteContent({ includeDefaults: false });
  const loading = cms.loading;

  if (loading) {
    return <HomeSkeleton />;
  }

  const isSectionVisible = (id) => {
    const orderSection = cms?.homepageSections?.find((s) => s.id === id);
    if (orderSection && orderSection.isVisible !== undefined) {
      return orderSection.isVisible;
    }
    if (cms?.[id] && cms[id].isVisible !== undefined) {
      return cms[id].isVisible;
    }
    return true;
  };

  const sections = cms?.homepageSections || [];

  return (
    <>
      <Helmet>
        <title>{cms?.seo?.homeTitle || cms?.siteName || 'Siri Arts & Crafts'}</title>
        {cms?.seo?.homeDescription && <meta name="description" content={cms.seo.homeDescription} />}
      </Helmet>

      <div className="h1-page relative bg-surface-bright overflow-hidden">
        {/* Global Background Art - Performance Optimized Gradients & Mandalas */}
        <div className="absolute inset-0 bg-marble opacity-[0.03] pointer-events-none mix-blend-multiply fixed"></div>
        <div className="absolute top-0 right-0 w-[600px] md:w-[1000px] h-[600px] md:h-[1000px] bg-primary-container/10 rounded-full blur-[160px] translate-x-1/3 -translate-y-1/3 pointer-events-none fixed z-0"></div>

        <div className="relative z-10">
          {sections.length === 0 && <HomepageEmptyState />}
          {sections.map((section) => {
            if (!isSectionVisible(section.id)) return null;
            const baseId = section.id.split('_')[0];

            switch (baseId) {
              case 'hero':
                return (
                  <div key={section.id}>
                    <HeroCarousel />
                  </div>
                );
              case 'promoBanner':
                return (
                  <RevealSection key={section.id}>
                    <Suspense fallback={<SectionFallback />}>
                      <PromoBanner />
                    </Suspense>
                  </RevealSection>
                );
              case 'categoryGrid':
                return (
                  <RevealSection key={section.id}>
                    <Suspense fallback={<SectionFallback />}>
                      <CategoryGrid />
                    </Suspense>
                  </RevealSection>
                );
              case 'trendingProducts':
                return (
                  <LazySection key={section.id} fallback={<SectionFallback />}>
                    <RevealSection>
                      <TrendingProducts />
                    </RevealSection>
                  </LazySection>
                );
              case 'shopByOccasion':
                return (
                  <LazySection key={section.id} fallback={<SectionFallback />}>
                    <RevealSection>
                      <ShopByOccasion />
                    </RevealSection>
                  </LazySection>
                );
              case 'featuredProducts':
                return (
                  <LazySection key={section.id} fallback={<SectionFallback />}>
                    <RevealSection>
                      <BestSellers />
                    </RevealSection>
                  </LazySection>
                );
              case 'recommendedProducts':
                return (
                  <LazySection key={section.id} fallback={<SectionFallback />}>
                    <RevealSection>
                      <RecommendedGrid />
                    </RevealSection>
                  </LazySection>
                );
              case 'galleryInspiration':
                return (
                  <LazySection key={section.id} fallback={<SectionFallback />}>
                    <RevealSection>
                      <GalleryInspiration />
                    </RevealSection>
                  </LazySection>
                );
              default:
                return null;
            }
          })}
        </div>
      </div>
    </>
  );
}

function HomeSkeleton() {
  return (
    <div className="h1-page relative bg-surface-bright overflow-hidden">
      {/* Hero Skeleton */}
      <div className="w-full h-[62.5vh] md:h-[80vh] bg-surface-container-high relative animate-pulse overflow-hidden">
        <div className="absolute bottom-[10%] left-[5%] md:bottom-[15%] md:left-[8%] flex flex-col w-[90%] max-w-[800px] z-10">
          <div className="h-3 w-20 md:w-28 bg-surface-container-highest/60 rounded-full mb-2"></div>
          <div className="h-8 md:h-16 w-[80%] bg-surface-container-highest/60 rounded-2xl md:rounded-3xl mb-3"></div>
          <div className="h-4 md:h-5 w-[60%] bg-surface-container-highest/60 rounded-full mb-5"></div>
          <div className="h-5 w-24 md:w-32 bg-surface-container-highest/60 rounded-none mb-2 border-b border-surface-container-highest/80"></div>
        </div>
        <div className="absolute bottom-3 md:bottom-6 left-1/2 -translate-x-1/2 flex gap-1.5 md:gap-2">
          <div className="w-1.5 h-1.5 bg-surface-container-highest/60 rounded-full"></div>
          <div className="w-4 h-1.5 bg-surface-container-highest/80 rounded-[2px]"></div>
          <div className="w-1.5 h-1.5 bg-surface-container-highest/60 rounded-full"></div>
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-surface-bright/80 via-surface-bright/10 to-transparent"></div>
      </div>

      {/* Promo Banner Skeleton */}
      <div className="w-full h-10 md:h-12 bg-surface-container animate-pulse flex items-center justify-center border-y border-surface-container-high">
        <div className="h-3 w-1/2 md:w-1/3 bg-surface-container-highest/50 rounded-full"></div>
      </div>

      {/* Category Grid Skeleton */}
      <div className="max-w-[1400px] mx-auto px-6 mt-16 md:mt-24 animate-pulse">
        <div className="flex flex-col items-center mb-8 md:mb-10">
          <div className="h-3 w-24 bg-surface-container-high rounded-full mb-2"></div>
          <div className="h-8 w-48 md:w-64 bg-surface-container-high rounded-full"></div>
        </div>

        {/* Mobile Grid */}
        <div className="grid grid-cols-2 gap-4 lg:hidden">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="flex flex-col items-center aspect-[4/5] bg-surface-container-high rounded-xl"
            ></div>
          ))}
        </div>

        {/* Desktop Circular Row */}
        <div className="hidden lg:flex justify-center gap-10 mt-8 w-full max-w-[1400px] mx-auto px-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-4 shrink-0">
              <div className="w-40 h-40 rounded-full bg-surface-container-high border-4 border-surface shadow-sm"></div>
              <div className="w-24 h-4 bg-surface-container-high rounded-full"></div>
            </div>
          ))}
        </div>
      </div>

      {/* Trending Products Skeleton */}
      <div className="max-w-[1400px] mx-auto px-6 mt-20 md:mt-32 animate-pulse">
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

      {/* Gallery Inspiration Skeleton */}
      <div className="max-w-[1400px] mx-auto px-6 mt-20 md:mt-32 animate-pulse">
        <div className="flex flex-col items-center mb-8 md:mb-10 text-center">
          <div className="h-3 w-24 bg-surface-container-high rounded-full mb-2 mx-auto"></div>
          <div className="h-8 md:h-10 w-48 md:w-64 bg-surface-container-high rounded-full mx-auto"></div>
        </div>
        <div className="columns-2 md:columns-3 lg:columns-5 gap-3 md:gap-5.5 space-y-3 md:space-y-5.5">
          {['aspect-[4/5]', 'aspect-square', 'aspect-[3/4]', 'aspect-[4/5]', 'aspect-square'].map(
            (aspect, i) => (
              <div
                key={i}
                className={`w-full ${aspect} bg-surface-container-high rounded-[24px]`}
              ></div>
            ),
          )}
        </div>
      </div>

      {/* Shop By Occasion Skeleton */}
      <div className="max-w-[1400px] mx-auto px-6 mt-20 md:mt-32 mb-24 animate-pulse">
        <div className="flex flex-col items-center text-center mb-8 md:mb-10">
          <div className="h-3 w-24 bg-surface-container-high rounded-full mb-2"></div>
          <div className="h-8 md:h-10 w-56 md:w-72 bg-surface-container-high rounded-full"></div>
        </div>

        {/* Mobile Swipe Carousel */}
        <div className="flex gap-6 justify-center overflow-hidden lg:hidden">
          <div className="w-[75vw] sm:w-[50vw] h-[400px] bg-surface-container-high rounded-[36px] shrink-0"></div>
          <div className="w-[75vw] sm:w-[50vw] h-[400px] bg-surface-container-high rounded-[36px] shrink-0 opacity-40"></div>
        </div>

        {/* Desktop Accordion */}
        <div className="hidden lg:flex w-full max-w-[1200px] mx-auto h-[600px] gap-4 px-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex-1 bg-surface-container-high rounded-[32px] h-full"></div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SectionFallback() {
  return (
    <div className="w-full max-w-[1400px] mx-auto px-6 py-20 animate-pulse">
      <div className="h-8 w-56 bg-surface-container-high rounded-full mb-10"></div>
      <div className="w-full h-64 bg-surface-container-high rounded-[32px]"></div>
    </div>
  );
}

function HomepageEmptyState() {
  return (
    <section className="min-h-[60vh] flex items-center justify-center px-6 text-center">
      <div className="max-w-xl rounded-2xl border border-outline-variant/30 bg-surface/80 p-8">
        <span className="material-symbols-outlined text-[40px] text-on-surface-variant/50 mb-4">
          dashboard_customize
        </span>
        <h1 className="font-display text-2xl text-on-surface mb-3">
          Homepage content is not published
        </h1>
        <p className="text-on-surface-variant text-sm leading-6">
          Publish the homepage layout and visible sections from Admin to render the storefront
          homepage.
        </p>
      </div>
    </section>
  );
}

/**
 * IntersectionObserver-based fade-in-up reveal wrapper.
 */
function RevealSection({ children, threshold = 0.1 }) {
  const ref = useRef(null);

  const handleIntersect = useCallback((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('h1-reveal--visible');
        observer.unobserve(entry.target);
      }
    });
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      el.classList.add('h1-reveal--visible');
      return;
    }

    const observer = new IntersectionObserver(handleIntersect, {
      rootMargin: '0px 0px -60px 0px',
      threshold,
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, [handleIntersect, threshold]);

  return (
    <div ref={ref} className="h1-reveal relative z-10">
      {children}
    </div>
  );
}
