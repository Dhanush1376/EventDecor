import React from 'react';
import { Skeleton } from '../SkeletonBase';

export function ReturnExchangeSkeleton() {
  return (
    <div className="text-left font-body text-on-surface">
      <div className="max-w-2xl mx-auto">
        {/* Header Section */}
        <div className="py-4 mb-4">
          <div className="flex flex-col gap-2.5 mb-8">
            <div className="flex items-center gap-3">
              <Skeleton className="w-8 h-8 rounded shrink-0" />
              <Skeleton className="h-5 w-48" />
            </div>
            <Skeleton className="h-3 w-32 ml-11" />
          </div>

          {/* Simple Progress Bar Skeleton */}
          <div className="flex items-center mt-6 gap-3">
            <Skeleton className="flex-1 h-1.5 rounded-full" />
            <Skeleton className="flex-1 h-1.5 rounded-full" />
            <Skeleton className="flex-1 h-1.5 rounded-full" />
          </div>

          {/* Progress Labels Skeleton */}
          <div className="flex justify-between mt-3">
            <Skeleton className="h-2 w-20" />
            <Skeleton className="h-2 w-24" />
            <Skeleton className="h-2 w-24" />
          </div>
        </div>

        {/* Step 1 Content Skeleton */}
        <div className="space-y-4">
          <div className="bg-surface-bright border border-outline-variant/40 rounded-lg p-5 shadow-xs">
            {/* Step Header */}
            <div className="pb-4 mb-4 border-b border-outline-variant/20 flex items-center gap-2">
              <Skeleton className="w-4 h-4 rounded-sm" />
              <Skeleton className="h-3 w-40" />
            </div>

            {/* Item List */}
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="flex items-start gap-4 p-4 border border-outline-variant/30 rounded-lg"
                >
                  {/* Checkbox Skeleton */}
                  <Skeleton className="mt-2 w-4 h-4 rounded" />

                  {/* Image Skeleton */}
                  <Skeleton className="w-16 h-16 rounded shrink-0" />

                  {/* Details Skeleton */}
                  <div className="flex-1 min-w-0 pt-1">
                    <div className="flex justify-between items-start gap-2">
                      <Skeleton className="h-3 w-3/4" />
                      <Skeleton className="h-3 w-16 rounded-full" />
                    </div>
                    <Skeleton className="h-2 w-1/3 mt-3" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
