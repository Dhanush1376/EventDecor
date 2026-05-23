import React, { useEffect, useMemo, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { SectionWrapper } from "../components/layout/SectionWrapper";
import { ProductGallery } from "../components/ui/ProductGallery";
import { ProductInfo } from "../components/ui/ProductInfo";
import { StickyMobileATC } from "../components/ui/StickyMobileATC";
import { Skeleton } from "../components/ui/Skeleton";

import { RecommendationSystem } from "../components/sections/RecommendationSystem";
import { ProductReviews } from "../components/sections/ProductReviews";
import { SEO } from "../components/seo/SEO";
import { MandalaElement } from "../components/ui/MandalaElement";
import { productService, userService } from "../services/domainServices";
import { useApi } from "../hooks/useApi";
import { useAuth } from "../context/AuthContext";

import logger from '../utils/logger';
export function ProductDetails() {
  const { id } = useParams();
  const atcRef = useRef(null);
  const { user } = useAuth();


  const { data: product, loading, error, request: fetchProduct } = useApi(productService.getById);

  useEffect(() => {
    if (id) {
      fetchProduct(id);
    }
  }, [id, fetchProduct]);

  useEffect(() => {
    if (product && user) {
      userService.trackRecentlyViewed(product._id || product.id).catch((err) => {
        logger.error("Failed to track recently viewed masterpiece:", err);
      });
    }
  }, [product, user]);

  useEffect(() => {
    // Immediate scroll to top on mount and ID change
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }
  }, [id]);

  const productSchema = useMemo(
    () => ({
      "@context": "https://schema.org/",
      "@type": "Product",
      name: product?.title || "Artisanal Piece",
      image: [product?.imageSrc || ""],
      description: product?.description || "",
      sku: `SIRI-${product?.id || product?._id}`,
      brand: {
        "@type": "Brand",
        name: "Siri Arts & Crafts",
      },
      offers: {
        "@type": "Offer",
        url: typeof window !== "undefined" ? window.location.href : "",
        priceCurrency: "INR",
        price: product?.price || 0,
        availability: "https://schema.org/InStock",
      },
    }),
    [product],
  );

  if (loading) {
    return (
      <div className="bg-surface min-h-screen pb-20 md:pt-32">
        {/* Desktop Breadcrumbs Skeleton */}
        <div className="hidden md:block pt-32 pb-10 max-w-max-width mx-auto px-margin-desktop">
          <div className="flex gap-2 items-center">
            <Skeleton className="h-3 w-16" />
            <span className="text-on-surface-variant/20 text-xs">/</span>
            <Skeleton className="h-3 w-28" />
            <span className="text-on-surface-variant/20 text-xs">/</span>
            <Skeleton className="h-3 w-24" />
          </div>
        </div>

        <div className="pt-[68px] md:pt-0 max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 xl:gap-20">
            {/* Gallery Skeleton */}
            <div className="flex flex-col gap-4">
              <Skeleton className="aspect-[4/5] w-full" />
              <div className="flex gap-3">
                <Skeleton className="w-16 h-16 rounded-xl" />
                <Skeleton className="w-16 h-16 rounded-xl" />
                <Skeleton className="w-16 h-16 rounded-xl" />
              </div>
            </div>

            {/* Product Details Info Skeleton */}
            <div className="flex flex-col gap-6">
              <div className="space-y-3">
                <Skeleton className="h-3.5 w-1/4" />
                <Skeleton className="h-10 w-3/4" />
                <Skeleton className="h-5 w-1/2" />
              </div>
              
              <Skeleton className="h-12 w-1/3" />
              
              <div className="border-t border-b border-outline-variant/30 py-6 my-2 space-y-4">
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-4 w-2/3" />
              </div>

              <div className="flex gap-4 items-center">
                <Skeleton className="h-14 flex-1 rounded-full" />
                <Skeleton className="w-14 h-14 rounded-full" />
              </div>

              <div className="space-y-3 mt-4">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }


  if (error || !product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface p-6">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold mb-4">Masterpiece Not Found</h2>
          <p className="text-on-surface-variant mb-8">
            The artisanal piece you are looking for may have been moved or is currently unavailable in our heritage collection.
          </p>
          <Link to="/collections" className="bg-primary text-white px-8 py-3 rounded-full font-bold uppercase tracking-wider shadow-xl hover:bg-primary-dark transition-all">
            Return to Collections
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface relative min-h-screen">
      <SEO
        title={product.title}
        description={product.description}
        schema={productSchema}
      />

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
          <Link
            to="/collections"
            className="hover:text-primary transition-colors"
          >
            Heritage Collections
          </Link>
          <span className="opacity-30">/</span>
          <span className="text-on-surface font-bold truncate">
            {product.title}
          </span>
        </nav>
      </div>

      <section className="pt-[68px] md:pt-0 pb-12 md:pb-20 lg:pb-24 max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 xl:gap-20">
          <ProductGallery
            images={product.images || [product.imageSrc].filter(Boolean)}
            product={product}
          />
          <ProductInfo product={product} atcRef={atcRef} />
        </div>
      </section>

      {/* Verified Purchaser Reviews */}
      <ProductReviews
        productId={product._id || product.id}
        productTitle={product.title}
      />

      <RecommendationSystem category={product.category} currentProductId={product._id || product.id} />

      <StickyMobileATC product={product} triggerRef={atcRef} />
    </div>
  );
}
