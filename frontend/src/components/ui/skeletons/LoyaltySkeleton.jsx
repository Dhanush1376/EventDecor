import React from 'react';
import { Skeleton } from '../SkeletonBase';

export function LoyaltySkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* 1. GAMIFIED TIER CARD SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Luxury Member Pass Card Placeholder */}
        <div className="lg:col-span-7 rounded-xl border border-outline-variant/30 p-6 bg-surface-container-low min-h-[180px] flex flex-col justify-between relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-6 w-48" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <div className="flex gap-4 items-center my-4">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-8 w-24" />
            </div>
            <div className="w-[1px] h-10 bg-outline-variant/20 shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-8 w-24" />
            </div>
          </div>
          <div className="border-t border-outline-variant/20 pt-4 flex justify-between items-center">
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>

        {/* Loyalty Progression metrics panel Placeholder */}
        <div className="lg:col-span-5 flex flex-col justify-between pt-4 lg:pt-0 lg:pl-6 lg:border-l border-outline-variant/30 space-y-4">
          <div>
            <Skeleton className="h-4 w-36 mb-2" />
            <Skeleton className="h-3 w-56" />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-baseline">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-3 w-8" />
            </div>
            <Skeleton className="w-full h-2 rounded-full" />
            <Skeleton className="h-3 w-40 mx-auto" />
          </div>

          <div className="bg-surface-container-low rounded-lg p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-3 w-12" />
            </div>
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-3 w-6" />
            </div>
          </div>
        </div>
      </div>

      {/* 3. COUPONS CENTER */}
      <div className="space-y-4 pt-2 border-t border-outline-variant/30">
        <div className="flex justify-between items-center pb-2">
          <div className="space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-64" />
          </div>
          <Skeleton className="w-8 h-4" />
        </div>
        <div className="bg-surface-container-low border border-outline-variant/20 rounded-xl p-5 flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <Skeleton className="w-12 h-12 rounded-full shrink-0" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-3.5 w-48" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          </div>
          <Skeleton className="w-32 h-10 rounded-lg" />
        </div>
      </div>

      {/* 4. WALLET AUDIT TRANSACTION HISTORY */}
      <div className="space-y-4 pt-4 border-t border-outline-variant/30">
        <div className="space-y-2">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-3 w-56" />
        </div>
        <div className="space-y-4 py-2 pl-3">
          {[1, 2].map((i) => (
            <div key={i} className="flex justify-between items-start gap-4">
              <div className="flex items-start gap-3 flex-1">
                <Skeleton className="w-4 h-4 rounded-full shrink-0" />
                <div className="space-y-2 flex-1">
                  <div className="flex gap-2 items-center">
                    <Skeleton className="h-3.5 w-32" />
                    <Skeleton className="h-4 w-16 rounded-full" />
                  </div>
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
