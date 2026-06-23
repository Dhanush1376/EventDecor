import React from 'react';
import { Skeleton } from '../SkeletonBase';
import { ProductCardSkeleton } from './ProductSkeletons';
import { AddressBarSkeleton } from './CommonSkeletons';

export function CollectionSkeleton() {
  return (
    <div className="pt-20 md:pt-28 bg-surface min-h-screen">
      <div className="max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop py-4 md:py-6">
        <div className="flex gap-2">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-4" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <Skeleton className="w-full h-[40vh] md:h-[58vh] !rounded-none" />
      <div className="max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop py-12 md:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          <div className="lg:col-span-3 hidden lg:block">
            <Skeleton className="h-[600px] w-full rounded-[2rem]" />
          </div>
          <div className="lg:col-span-9">
            <div className="flex justify-between mb-10">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              {[...Array(4)].map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
