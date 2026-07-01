import React from 'react';
import { Skeleton } from '../SkeletonBase';

export function AboutSkeleton() {
  return (
    <div className="bg-surface min-h-screen">
      {/* Hero */}
      <Skeleton className="w-full h-[60vh] lg:h-[80vh] !rounded-none" />
      <div className="max-w-max-width mx-auto px-margin-mobile lg:px-margin-desktop py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div className="space-y-6">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
          <Skeleton className="w-full h-[500px] rounded-3xl" />
        </div>
      </div>
    </div>
  );
}
