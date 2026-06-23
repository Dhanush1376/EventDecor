import React from 'react';
import { Skeleton } from '../SkeletonBase';
import { ProductCardSkeleton } from './ProductSkeletons';
import { AddressBarSkeleton } from './CommonSkeletons';

export function BlogPostSkeleton() {
  return (
    <div className="min-h-screen bg-background pt-20 pb-20">
      <Skeleton className="w-full h-[50vh] md:h-[60vh] lg:h-[70vh] !rounded-none" />
      <div className="max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop mt-8 md:mt-12">
        <div className="flex flex-col lg:flex-row gap-12">
          <div className="flex-1 max-w-3xl w-full space-y-6">
            <Skeleton className="h-4 w-32 mb-8" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <div className="my-8">
              <Skeleton className="h-64 w-full rounded-2xl" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
          <div className="w-full lg:w-80 shrink-0">
            <div className="sticky top-24 space-y-8">
              <Skeleton className="h-64 w-full rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
