import React from 'react';
import { Skeleton } from '../SkeletonBase';
import { ProductCardSkeleton } from './ProductSkeletons';
import { AddressBarSkeleton } from './CommonSkeletons';

export function CustomOrdersSkeleton() {
  return (
    <div className="min-h-screen bg-surface pt-24 pb-20">
      <div className="max-w-4xl mx-auto px-4 md:px-8">
        <div className="text-center space-y-6 mb-12">
          <Skeleton className="h-12 w-2/3 mx-auto" />
          <Skeleton className="h-4 w-1/2 mx-auto" />
        </div>
        <div className="bg-white rounded-3xl p-6 md:p-10 border border-outline-variant/30 shadow-sm space-y-8">
          <Skeleton className="h-10 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-14 w-full rounded-2xl" />
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-32 w-full rounded-2xl" />
          </div>
          <Skeleton className="h-14 w-full rounded-full" />
        </div>
      </div>
    </div>
  );
}
