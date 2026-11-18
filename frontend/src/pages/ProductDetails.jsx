import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import { m as motion } from 'framer-motion';
import { ProductGallery } from '../components/ui/ProductGallery';
import { ProductInfo } from '../components/ui/ProductInfo';
import { ProductCoupons } from '../components/ui/ProductCoupons';
import { Skeleton, ProductDetailSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/FeedbackStates';
import { SEO } from '../components/seo/SEO';
import { categoryPath } from '../seo/seoConfig';
import { MandalaElement } from '../components/ui/MandalaElement';
import { StickyMobileATC } from '../components/ui/StickyMobileATC';
import React, { useEffect, useMemo, useRef, Suspense, useState } from 'react';
import { userService, showcaseService } from '../services/domainServices';
import { useProduct } from '../hooks/useProductQueries';
import { useAuth } from '../context/AuthContext';
import { useRecommendationTracker } from '../hooks/useRecommendationTracker';
import { useQueryClient } from '@tanstack/react-query';
import recommendationService from '../services/api/recommendationService';
import { ProductCard } from '../components/shared/ProductCard';
import logger from '../utils/core/logger';
import {
  getSharedPreviewSrc,
  pathnameMatchesKey,
  productTransitionKey,
} from '../utils/navigation/sharedElementTransition';

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
  const location = useLocation();
  const navigate = useNavigate();
  const atcRef = useRef(null);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [localAppliedCoupon, setLocalAppliedCoupon] = useState(null);
  const [relatedShowcases, setRelatedShowcases] = useState([]);

  // Use product passed from QuickView if available for instantaneous zero-flicker render
  const initialProduct = useMemo(() => {
    const p = location.state?.product;
    if (p && ((p._id && String(p._id) === String(id)) || (p.id && String(p.id) === String(id)))) {
      return p;
    }
    return undefined;
  }, [location.state, id]);

  const {
    data: product,
    isLoading: loading,
    error,
  } = useProduct(id, {
    initialData: initialProduct,
  });

  // The hero image keeps the identity it was opened with (a card may link by id or by slug),
  // so the image can travel back into the same card on Back.
  const enteredKey = location.state?.vt?.key;
  const heroKey =
    enteredKey && pathnameMatchesKey(location.pathname, enteredKey)
      ? enteredKey
      : productTransitionKey(product?._id || product?.id || id);
  const heroPreviewSrc = getSharedPreviewSrc(location.state, heroKey);

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

  // Fetch related showcases
  useEffect(() => {
    const fetchShowcases = async () => {
      try {
        const res = await showcaseService.getAll({ limit: 5 });
        if (res.success) {
          const list = Array.isArray(res.data) ? res.data : res.data?.docs || res.data?.items || [];
          setRelatedShowcases(list.filter((s) => s._id !== id && s.id !== id).slice(0, 4));
        }
      } catch (err) {
        logger.error('Failed to fetch related showcases for product page:', err);
      }
    };
    fetchShowcases();
  }, [id]);

  const galleryImages = useMemo(() => {
    if (!product) return [];
    return Array.from(new Set([product.imageSrc, ...(product.images || [])].filter(Boolean)));
  }, [product]);

  const productCategoryName =
    (typeof product?.primaryCategory?.name === 'string' && product.primaryCategory.name) ||
    (typeof product?.category === 'string' && !/^[a-f0-9]{24}$/i.test(product.category)
      ? product.category
      : '');

  if (loading) {
    // Arriving from a product image: paint that image in the hero slot right away so the
    // shared element transition has its destination before the product data arrives.
    return <ProductDetailSkeleton heroSrc={heroPreviewSrc} heroKey={heroKey} />;
  }

  if (error || !product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface p-6">
        <SEO title="Product Not Found" noindex />
        <EmptyState
          title="Product Not Found"
          description="The product you are looking for may have been moved or is currently unavailable."
          icon="inventory_2"
          actionLabel="Return to Shop"
          onAction={() => navigate('/collections')}
        />
      </div>
    );
  }

  return (
    <motion.div
      initial={location.state?.fromQuickView ? { opacity: 0.9, y: 14 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      className="bg-surface relative min-h-screen"
    >
      <SEO
        title={product.seoTitle || product.title}
        description={
          product.seoDescription ||
          product.description ||
          `${product.title} by Siri Arts & Crafts. Handcrafted${productCategoryName ? ` ${productCategoryName.toLowerCase()}` : ''} available to order online.`
        }
        ogImage={product.imageSrc || galleryImages[0]}
        ogType="product"
        product={product}
        breadcrumbs={[
          { name: 'Home', url: '/' },
          { name: 'Shop', url: '/collections' },
          ...(productCategoryName
            ? [{ name: productCategoryName, url: categoryPath(productCategoryName) }]
            : []),
          { name: product.title, url: `/product/${product._id || product.id || id}` },
        ]}
      />

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
            Home
          </Link>
          <span className="opacity-30">/</span>
          <Link to="/collections" className="hover:text-primary transition-colors">
            Shop
          </Link>
          <span className="opacity-30">/</span>
          {productCategoryName && (
            <>
              <Link
                to={categoryPath(productCategoryName)}
                className="hover:text-primary transition-colors"
              >
                {productCategoryName}
              </Link>
              <span className="opacity-30">/</span>
            </>
          )}
          <span className="text-on-surface font-bold truncate">{product.title}</span>
        </nav>
      </div>

      <section className="pt-[68px] lg:pt-0 pb-12 lg:pb-20 lg:pb-24 max-w-max-width mx-auto px-margin-mobile lg:px-margin-desktop relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4 md:gap-8 lg:gap-12 xl:gap-20">
          <div className="flex flex-col gap-6 lg:gap-10 md:sticky md:top-24 lg:static lg:top-auto md:self-start lg:self-auto">
            <ProductGallery
              images={galleryImages}
              product={product}
              previewSrc={heroPreviewSrc}
              transitionKey={heroKey}
            />

            <div className="hidden lg:flex flex-col gap-6 lg:gap-8">
              <ProductCoupons
                product={product}
                localAppliedCoupon={localAppliedCoupon}
                setLocalAppliedCoupon={setLocalAppliedCoupon}
              />
            </div>
          </div>
          <ProductInfo
            product={product}
            atcRef={atcRef}
            localAppliedCoupon={localAppliedCoupon}
            setLocalAppliedCoupon={setLocalAppliedCoupon}
          />
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

      {/* Explore More Showcases */}
      {relatedShowcases && relatedShowcases.length > 0 && (
        <section className="bg-surface py-8 lg:py-12">
          <div className="max-w-max-width mx-auto px-margin-mobile lg:px-margin-desktop">
            <div className="flex items-center justify-between mb-6 lg:mb-8 relative z-10">
              <h2 className="font-display text-xl lg:text-2xl text-black text-left lg:text-left m-0">
                Explore More Showcases
              </h2>
              <Link
                to="/events"
                className="text-[10px] lg:text-[12px] font-label uppercase tracking-widest font-bold text-primary hover:text-primary/80 transition-colors flex items-center gap-1 shrink-0"
              >
                View All
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </Link>
            </div>
            <div className="flex overflow-x-auto gap-4 lg:gap-6 no-scrollbar pb-6 snap-x snap-mandatory">
              {relatedShowcases.map((showcase) => (
                <div
                  key={showcase._id || showcase.id}
                  className="w-[200px] lg:w-[280px] shrink-0 snap-start"
                >
                  <ProductCard
                    id={showcase._id || showcase.id}
                    _id={showcase._id || showcase.id}
                    itemType="event"
                    title={showcase.title}
                    imageSrc={showcase.image || showcase.images?.[0]}
                    images={showcase.images}
                    category={
                      showcase.category?.name ||
                      (typeof showcase.category === 'string' && showcase.category.length === 24
                        ? showcase.eventType
                        : showcase.category) ||
                      'Showcase'
                    }
                    price={showcase.basePrice || showcase.rentalPrice}
                    oldPrice={showcase.originalPrice || showcase.strikingPrice || showcase.oldPrice}
                    rating={showcase.rating}
                    reviewCount={showcase.reviewCount}
                    tags={showcase.tags}
                    setupTimeHours={showcase.setupTimeHours}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

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
    </motion.div>
  );
}
