import React from 'react';
import { Skeleton } from '../SkeletonBase';
import { ProductCardSkeleton } from './ProductSkeletons';
import { AddressBarSkeleton } from './CommonSkeletons';

export function WishlistPageSkeleton() {
  return (
    <div className="w-full">
      {/* Address Bar Skeleton aligned flush */}
      <div className="-mt-6 mb-6">
        <AddressBarSkeleton />
      </div>

      <div className="max-w-[1440px] mx-auto px-4 sm:px-8">
        {/* Header Title & Count Skeleton */}
        <div className="flex items-baseline gap-1.5 pb-4 border-b border-outline-variant/30 mb-4">
          <Skeleton className="h-8 w-44 rounded-md" />
          <Skeleton className="h-4 w-16 rounded-md" />
        </div>

        {/* Centered Segmented Switcher Skeleton */}
        <div className="flex justify-center w-full mb-6 relative">
          <div className="w-full bg-surface-container/60 backdrop-blur-xl border border-outline-variant/20 p-1.5 rounded-full flex gap-1 items-center relative shadow-inner">
            <Skeleton className="h-10 flex-1 rounded-full" />
            <Skeleton className="h-10 flex-1 rounded-full" />
          </div>
        </div>

        {/* Categories Circular Carousel Skeleton */}
        <div className="mb-8 border-b border-black/5 pb-6">
          <div className="flex items-center gap-4 overflow-x-auto scrollbar-none py-2 px-1 select-none scroll-smooth">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex flex-col items-center shrink-0 w-[72px] lg:w-[88px]">
                <Skeleton className="w-14 h-14 lg:w-16 lg:h-16 rounded-full" />
                <Skeleton className="h-3 w-10 rounded mt-2" />
              </div>
            ))}
          </div>
        </div>

        {/* Products Grid Skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {[...Array(8)].map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
