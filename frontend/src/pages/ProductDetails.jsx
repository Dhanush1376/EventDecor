import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ProductGallery } from '../components/ui/ProductGallery';
import { ProductInfo } from '../components/ui/ProductInfo';
import { Skeleton, ProductDetailSkeleton } from '../components/ui/Skeleton';

import { ProductReviews } from '../components/sections/ProductReviews';
import { SEO } from '../components/seo/SEO';
import { MandalaElement } from '../components/ui/MandalaElement';
import { userService } from '../services/domainServices';
import { useProduct } from '../hooks/useProductQueries';
import { useAuth } from '../context/AuthContext';
import { useWishlist } from '../context/WishlistContext';
import { useRecommendationTracker } from '../hooks/useRecommendationTracker';
import { useQueryClient } from '@tanstack/react-query';
import recommendationService from '../services/recommendationService';

import logger from '../utils/logger';

const RecommendationSystem = React.lazy(() =>
  import('../components/sections/RecommendationSystem').then((m) => ({
    default: m.RecommendationSystem,
  })),
);
export function ProductDetails() {
  const { id } = useParams();
  const atcRef = useRef(null);
  const { user } = useAuth();
  const { toggleItem, isWishlisted } = useWishlist();
  const queryClient = useQueryClient();

  const [isScrollingDown, setIsScrollingDown] = useState(false);
  const lastScrollY = useRef(0);

  const { data: product, isLoading: loading, error } = useProduct(id);

  // Scroll direction for mobile bottom bar
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (Math.abs(currentScrollY - lastScrollY.current) > 10) {
        setIsScrollingDown(currentScrollY > lastScrollY.current && currentScrollY > 100);
      }
      lastScrollY.current = currentScrollY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Track product view, dwell time, and scroll depth
  useRecommendationTracker({
    targetType: 'product',
    targetId: product?._id || product?.id || id,
    category: product?.category,
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
  }, [product, queryClient]);

  useEffect(() => {
    if (product && user) {
      userService.trackRecentlyViewed(product._id || product.id || id).catch((err) => {
        logger.error('Failed to track recently viewed masterpiece:', err);
      });
    }
  }, [product, user]);

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
          className="absolute top-20 -left-20 opacity-[0.05]"
          size={500}
          duration={120}
        />
        <MandalaElement
          className="absolute top-[40%] -right-20 opacity-[0.03]"
          size={600}
          duration={180}
          variant={2}
        />
      </div>

      {/* Desktop Breadcrumbs */}
      <div className="hidden md:block pt-32 pb-10 max-w-max-width mx-auto px-margin-desktop relative z-10">
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

      <section className="pt-[68px] md:pt-0 pb-12 md:pb-20 lg:pb-24 max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 xl:gap-20">
          <ProductGallery images={galleryImages} product={product} />
          <ProductInfo product={product} atcRef={atcRef} />
        </div>
      </section>

      {/* Verified Purchaser Reviews */}
      <ProductReviews productId={product._id || product.id || id} productTitle={product.title} />

      <React.Suspense
        fallback={
          <div className="max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop py-8">
            <Skeleton className="h-44 w-full rounded-2xl" />
          </div>
        }
      >
        <RecommendationSystem
          category={product.category}
          currentProductId={product._id || product.id || id}
        />
      </React.Suspense>

      {/* ─── Mobile Floating Bottom Bar ─── */}
      <AnimatePresence>
        {!isScrollingDown && (
          <motion.div
            initial={{ y: 150, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 150, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 220 }}
            className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] bg-[#F5F5F7]/85 backdrop-blur-[32px] saturate-[180%] border-[0.5px] border-black/[0.08] shadow-[0_16px_40px_rgba(0,0,0,0.12),inset_0_1px_1px_rgba(255,255,255,0.8)] rounded-full h-[72px] px-2 flex items-center justify-between gap-2 select-none w-[calc(100%-2rem)] max-w-[340px]"
          >
            <button
              onClick={() => {
                if (!product) return;
                toggleItem({
                  id: product._id || product.id,
                  title: product.title,
                  price: product.price,
                  imageSrc: product.imageSrc || product.image,
                });
              }}
              className={`w-[60px] h-[60px] rounded-full flex items-center justify-center transition-all active:scale-95 shrink-0 ${
                isWishlisted(product?._id || product?.id) ? 'bg-white shadow-[0_4px_12px_rgba(0,0,0,0.06)] border-[0.5px] border-black/[0.04]' : 'bg-transparent text-[#8E8E93] hover:text-black/60'
              }`}
            >
              <motion.span
                animate={{
                  scale: isWishlisted(product?._id || product?.id) ? [1, 1.3, 1] : 1,
                  color: isWishlisted(product?._id || product?.id) ? '#ff2d55' : '#8E8E93',
                }}
                transition={{ duration: 0.3, type: 'spring', stiffness: 300 }}
                className="material-symbols-outlined text-[24px]"
                style={{ fontVariationSettings: isWishlisted(product?._id || product?.id) ? "'FILL' 1" : "'FILL' 0" }}
              >
                favorite
              </motion.span>
            </button>
            <button
              onClick={() => {
                if (atcRef.current) {
                  atcRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  setTimeout(() => {
                    atcRef.current.classList.add('ring-4', 'ring-primary/40');
                    setTimeout(() => atcRef.current.classList.remove('ring-4', 'ring-primary/40'), 1000);
                  }, 500);
                }
              }}
              className="flex-1 bg-black text-white h-[60px] rounded-full font-label-sm text-[10px] uppercase tracking-[0.2em] font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-[0_4px_12px_rgba(0,0,0,0.15)] mr-1"
            >
              <span className="material-symbols-outlined text-[18px]">shopping_bag</span>
              Add to Bag
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
