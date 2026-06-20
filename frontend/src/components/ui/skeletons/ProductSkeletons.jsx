import React from 'react';
import { Skeleton } from '../SkeletonBase';

// ─── Product Listing Skeleton ───
export function ProductListSkeleton() {
  return (
    <div className="bg-surface min-h-screen">
      <Skeleton className="w-full min-h-[320px] md:h-[70vh] !rounded-none" />
      <div className="max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop mt-8 mb-12">
        <Skeleton className="h-16 w-full rounded-[2rem]" />
      </div>
      <div className="max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop relative pb-8 md:pb-24">
        <div className="flex flex-col lg:flex-row gap-8 xl:gap-12">
          <div className="w-full lg:w-64 xl:w-72 flex-shrink-0">
            <Skeleton className="h-[600px] w-full rounded-[2rem]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="mb-10 space-y-2">
              <Skeleton className="h-10 w-64" />
              <Skeleton className="h-4 w-40" />
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-x-4 md:gap-x-8 gap-y-8 md:gap-y-12">
              {[...Array(6)].map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="aspect-[4/5] w-full" />
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <Skeleton className="h-3 w-1/4" />
          <Skeleton className="h-3 w-1/6" />
        </div>
        <Skeleton className="h-6 w-3/4" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-8 w-1/4" />
        </div>
      </div>
    </div>
  );
}

// ─── Product Detail Skeleton ───
export function ProductDetailSkeleton() {
  return (
    <div className="bg-surface min-h-screen">
      {/* Desktop Breadcrumbs Skeleton */}
      <div className="hidden md:block pt-32 pb-10 max-w-max-width mx-auto px-margin-desktop">
        <div className="flex gap-2 items-center">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-4" />
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-3 w-4" />
          <Skeleton className="h-3 w-40" />
        </div>
      </div>

      <section className="pt-[68px] md:pt-0 pb-12 md:pb-20 lg:pb-24 max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 xl:gap-20">
          {/* Image Gallery Skeleton */}
          <div className="space-y-4">
            <Skeleton className="w-full aspect-[4/5] md:aspect-square rounded-[32px] md:rounded-[40px]" />
            <div className="flex gap-4 overflow-x-hidden">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="w-20 h-20 md:w-24 md:h-24 rounded-2xl flex-shrink-0" />
              ))}
            </div>
          </div>
          {/* Product Info Skeleton */}
          <div className="space-y-8 mt-4 md:mt-0">
            <div className="space-y-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-[48px] w-full" />
              <Skeleton className="h-[48px] w-3/4" />
            </div>
            <Skeleton className="h-[1px] w-full bg-outline-variant/20" />
            <div className="flex items-center gap-6">
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-6 w-24" />
            </div>
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-[85%]" />
              <Skeleton className="h-4 w-[90%]" />
            </div>
            <div className="space-y-4 pt-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-12 w-full rounded-full" />
            </div>
            <div className="flex gap-4 pt-6">
              <Skeleton className="h-14 w-14 rounded-full flex-shrink-0" />
              <Skeleton className="h-14 flex-1 rounded-full" />
            </div>
            <div className="grid grid-cols-2 gap-4 pt-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex gap-3 items-center">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-2 w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export function CategorySkeleton() {
  return (
    <div className="flex flex-col items-center gap-3">
      <Skeleton variant="circle" className="w-16 h-16 md:w-20 md:h-20" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

export function RecommendationSkeleton({ horizontal = false }) {
  return (
    <div
      className={
        horizontal ? 'flex gap-6 overflow-x-hidden' : 'grid grid-cols-2 md:grid-cols-4 gap-6'
      }
    >
      {[...Array(4)].map((_, i) => (
        <div key={i} className={horizontal ? 'min-w-[240px] md:min-w-[280px]' : ''}>
          <ProductCardSkeleton />
        </div>
      ))}
    </div>
  );
}

export function RecommendationGridSkeleton({ cards = 4 }) {
  return (
    <div
      className="grid grid-cols-2 gap-3 pb-2 pt-1"
      aria-busy="true"
      aria-label="Loading recommendations"
    >
      {Array.from({ length: cards }).map((_, i) => (
        <div key={i} className="w-full flex flex-col gap-2">
          <Skeleton className="aspect-square w-full rounded-xl" delay={i * 90} />
          <Skeleton className="h-3 w-1/3 rounded" delay={i * 90 + 70} />
          <Skeleton className="h-4 w-3/4 rounded" delay={i * 90 + 130} />
          <Skeleton className="h-4 w-1/2 rounded" delay={i * 90 + 170} />
        </div>
      ))}
    </div>
  );
}
