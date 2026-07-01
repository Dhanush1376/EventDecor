import React from 'react';
import { Skeleton } from '../SkeletonBase';

export function LocationLandingSkeleton() {
  return (
    <div className="min-h-screen bg-background pt-20 pb-20">
      <Skeleton className="w-full h-[50vh] lg:h-[60vh] lg:h-[70vh] !rounded-none" />
      <div className="max-w-max-width mx-auto px-margin-mobile lg:px-margin-desktop mt-16 lg:mt-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-6">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-3/4" />
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
            <div className="pt-6">
              <Skeleton className="h-6 w-48" />
            </div>
          </div>
          <div className="bg-surface/50 border border-outline-variant/30 rounded-[2rem] p-8 lg:p-12 space-y-8">
            <Skeleton className="h-8 w-2/3" />
            <div className="space-y-6">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex gap-4 items-center">
                  <Skeleton className="w-6 h-6 rounded-full" />
                  <Skeleton className="h-5 w-3/4" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
