import { useParams, Link } from 'react-router-dom';
import { ProductGallery } from '../components/ui/ProductGallery';
import { ProductInfo, CustomThemeCard } from '../components/ui/ProductInfo';
import { ProductCoupons } from '../components/ui/ProductCoupons';
import { Skeleton, ProductDetailSkeleton } from '../components/ui/Skeleton';
import { SEO } from '../components/seo/SEO';
import { MandalaElement } from '../components/ui/MandalaElement';
import { StickyMobileATC } from '../components/ui/StickyMobileATC';
import React, { useEffect, useMemo, useRef, Suspense, useState } from 'react';
import { userService } from '../services/domainServices';
import { useProduct } from '../hooks/useProductQueries';
import { useAuth } from '../context/AuthContext';
import { useRecommendationTracker } from '../hooks/useRecommendationTracker';
import { useQueryClient } from '@tanstack/react-query';
import recommendationService from '../services/api/recommendationService';
import logger from '../utils/core/logger';

const RecommendationSystem = React.lazy(() =>
  import('../components/sections/RecommendationSystem').then((m) => ({
    default: m.RecommendationSystem,
  })),
);

const LazyProductReviews = React.lazy(() =>
  import('../components/sections/ProductReviews').then((m) => ({
    default: m.ProductReviews,
  })),
);

export function ProductDetails() {
  const { id } = useParams();
  const atcRef = useRef(null);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [localAppliedCoupon, setLocalAppliedCoupon] = useState(null);

  const { data: product, isLoading: loading, error } = useProduct(id);

  // Track product view, dwell time, and scroll depth
  useRecommendationTracker({
    targetType: 'product',
    targetId: product?._id || product?.id || id,
    category: product?.primaryCategory?.name || product?.category,
    price: product?.price || product?.basePrice,
    tags: product?.tags,
  });

  // Prefetch recommendations to prevent waterfalls
  useEffect(() => {
    if (product) {
      const productId = product._id || product.id || id;
      // Similar
      queryClient
        .prefetchQuery({
          queryKey: ['recommendations', 'similar', 'product', productId, 8],
          queryFn: async () => {
            const res = await recommendationService.getSimilar('product', productId, 8);
            return res.success ? res.data : res;
          },
        })
        .catch(() => {});
      // Also viewed
      queryClient
        .prefetchQuery({
          queryKey: ['recommendations', 'alsoViewed', productId, 'product', 8],
          queryFn: async () => {
            const res = await recommendationService.getAlsoViewed(productId, 'product', 8);
            return res.success ? res.data : res;
          },
        })
        .catch(() => {});
    }
  }, [product, queryClient, id]);

  useEffect(() => {
    if (product && user) {
      userService.trackRecentlyViewed(product._id || product.id || id).catch((err) => {
        logger.error('Failed to track recently viewed masterpiece:', err);
      });
    }
  }, [product, user, id]);

  useEffect(() => {
    // Immediate scroll to top on mount and ID change
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  }, [id]);

  const galleryImages = useMemo(() => {
    if (!product) return [];
    return Array.from(new Set([product.imageSrc, ...(product.images || [])].filter(Boolean)));
  }, [product]);

  const productSchema = useMemo(
    () => ({
      '@context': 'https://schema.org/',
      '@type': 'Product',
      name: product?.title || 'Artisanal Piece',
      image: galleryImages,
      description: product?.description || '',
      sku: `SIRI-${product?.id || product?._id}`,
      brand: {
        '@type': 'Brand',
        name: 'Siri Arts & Crafts',
      },
      offers: {
        '@type': 'Offer',
        url: typeof window !== 'undefined' ? window.location.href : '',
        priceCurrency: 'INR',
        price: product?.price || 0,
        availability: 'https://schema.org/InStock',
      },
    }),
    [product, galleryImages],
  );

  if (loading) {
    return <ProductDetailSkeleton />;
  }

  if (error || !product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface p-6">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold mb-4">Product Not Found</h2>
          <p className="text-on-surface-variant mb-8">
            The product you are looking for may have been moved or is currently unavailable.
          </p>
          <Link
            to="/collections"
            className="bg-primary text-white px-8 py-3 rounded-full font-bold uppercase tracking-wider shadow-xl hover:bg-primary-dark transition-all"
          >
            Return to Collections
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface relative min-h-screen">
      <SEO title={product.title} description={product.description} schema={productSchema} />

      {/* Decorative Mandalas */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0">
        <MandalaElement
          className="absolute top-[35%] -right-[25%]"
          size={700}
          opacity={0.65}
          duration={180}
          variant={2}
        />
      </div>

      {/* Desktop Breadcrumbs */}
      <div className="hidden lg:block pt-32 pb-10 max-w-max-width mx-auto px-margin-desktop relative z-10">
        <nav className="flex items-center gap-3 font-label text-[12px] uppercase tracking-[0.3em] text-on-surface-variant/40 font-bold overflow-x-auto no-scrollbar whitespace-nowrap pb-2">
          <Link to="/" className="hover:text-primary transition-colors">
            Studio
          </Link>
          <span className="opacity-30">/</span>
          <Link to="/collections" className="hover:text-primary transition-colors">
            Heritage Collections
          </Link>
          <span className="opacity-30">/</span>
          <span className="text-on-surface font-bold truncate">{product.title}</span>
        </nav>
      </div>

      <section className="pt-[68px] lg:pt-0 pb-12 lg:pb-20 lg:pb-24 max-w-max-width mx-auto px-margin-mobile lg:px-margin-desktop relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4 md:gap-8 lg:gap-12 xl:gap-20">
          <div className="flex flex-col gap-6 lg:gap-10">
            <ProductGallery images={galleryImages} product={product} />

            <div className="flex flex-col gap-6 lg:gap-8">
              <ProductCoupons
                product={product}
                localAppliedCoupon={localAppliedCoupon}
                setLocalAppliedCoupon={setLocalAppliedCoupon}
              />
            </div>

            {/* Show in left column ONLY on lg and above (Laptop) */}
            <div className="hidden lg:flex flex-col gap-8 pt-4">
              <CustomThemeCard product={product} />
            </div>
          </div>
          <ProductInfo
            product={product}
            atcRef={atcRef}
            localAppliedCoupon={localAppliedCoupon}
            setLocalAppliedCoupon={setLocalAppliedCoupon}
          />
        </div>

        {/* Show full width ONLY on md and below lg (Tablet) */}
        <div className="hidden md:block lg:hidden mt-10 w-full">
          <CustomThemeCard product={product} />
        </div>
      </section>

      {/* Verified Purchaser Reviews */}
      <Suspense
        fallback={
          <div className="max-w-max-width mx-auto px-margin-mobile lg:px-margin-desktop py-8">
            <Skeleton className="h-64 w-full rounded-2xl" />
          </div>
        }
      >
        <LazyProductReviews
          productId={product._id || product.id || id}
          productTitle={product.title}
        />
      </Suspense>

      <React.Suspense
        fallback={
          <div className="max-w-max-width mx-auto px-margin-mobile lg:px-margin-desktop py-8">
            <Skeleton className="h-44 w-full rounded-2xl" />
          </div>
        }
      >
        <RecommendationSystem
          category={product.primaryCategory?.name || product.category}
          currentProductId={product._id || product.id || id}
        />
      </React.Suspense>

      {/* ─── Mobile Floating Bottom Bar — Actually adds to cart ─── */}
      <StickyMobileATC product={product} triggerRef={atcRef} />
    </div>
  );
}
