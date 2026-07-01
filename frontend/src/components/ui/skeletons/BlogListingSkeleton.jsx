import React from 'react';
import { Skeleton } from '../SkeletonBase';

export function BlogListingSkeleton() {
  return (
    <div className="min-h-screen bg-background pt-24 pb-20">
      <div className="max-w-max-width mx-auto px-margin-mobile lg:px-margin-desktop">
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-6">
          <Skeleton className="h-16 w-3/4 mx-auto" />
          <Skeleton className="h-6 w-full mx-auto" />
          <Skeleton className="h-6 w-2/3 mx-auto" />
        </div>
        <div className="mb-16">
          <Skeleton className="w-full h-[400px] rounded-3xl" />
        </div>
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6 mb-12">
          <div className="flex gap-2">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-24 rounded-full" />
            ))}
          </div>
          <Skeleton className="h-12 w-full lg:w-72 rounded-full" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="space-y-4">
              <Skeleton className="w-full h-[240px] rounded-2xl" />
              <div className="flex gap-4">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-3/4" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
