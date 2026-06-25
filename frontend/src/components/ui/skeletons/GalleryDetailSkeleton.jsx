import React from 'react';
import { Skeleton } from '../SkeletonBase';

export function GalleryDetailSkeleton() {
  return (
    <div className="bg-[#fcfbf9] min-h-screen pt-[56px] md:pt-20 pb-32 md:pb-20 overflow-hidden">
      {/* Breadcrumbs */}
      <div className="hidden md:flex items-center gap-2 max-w-[1340px] mx-auto px-6 lg:px-10 mb-8">
        <Skeleton className="h-3 w-12" />
        <Skeleton className="h-3 w-4" />
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-4" />
        <Skeleton className="h-3 w-32" />
      </div>

      <main className="max-w-[1340px] mx-auto md:px-6 lg:px-10">
        {/* MOBILE Layout Skeleton */}
        <div className="md:hidden flex flex-col bg-white overflow-hidden border-b border-black/5 pb-8 mb-8">
          <Skeleton className="w-full h-[60vh] !rounded-none" />
          <div className="w-full p-6 bg-white">
            <div className="flex items-center justify-between gap-4 mb-8">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-3.5 w-16" />
                  <Skeleton className="h-3.5 w-20" />
                </div>
                <Skeleton className="h-6 w-3/4" />
              </div>
              <Skeleton className="h-11 w-24 rounded-full" />
            </div>

            <div className="space-y-6 pt-8 mt-6 border-t border-black/5">
              <Skeleton className="h-[120px] w-full rounded-[28px]" />
              <Skeleton className="h-[80px] w-full rounded-[24px]" />
            </div>
          </div>
        </div>

        {/* DESKTOP Layout Skeleton */}
        <div className="hidden md:grid gallery-detail-grid">
          {/* Left: Image Card */}
          <div className="gallery-detail-image z-0">
            <Skeleton className="w-full h-[75vh] md:rounded-[28px] !rounded-none" />
          </div>

          {/* Right: Info Panel */}
          <div className="px-5 md:px-0 py-6 md:py-0 space-y-7 md:space-y-8">
            {/* Tags */}
            <div className="flex gap-2.5">
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>

            {/* Title */}
            <div className="space-y-3">
              <Skeleton className="h-10 w-[85%]" />
              <Skeleton className="h-10 w-[60%]" />
              <Skeleton className="h-4 w-40 mt-2" />
            </div>

            {/* Description */}
            <div className="pl-5 border-l-[3px] border-black/5 space-y-3">
              <Skeleton className="h-4 w-[95%]" />
              <Skeleton className="h-4 w-[90%]" />
              <Skeleton className="h-4 w-[75%]" />
            </div>

            {/* Color Swatches */}
            <div className="space-y-3">
              <Skeleton className="h-3 w-24" />
              <div className="flex gap-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} variant="circle" className="w-6 h-6" />
                ))}
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-black/5" />

            {/* Shop This Look */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-16" />
              </div>
              <div className="flex gap-3 overflow-hidden pb-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex-shrink-0 space-y-2">
                    <Skeleton className="w-[140px] h-[140px] rounded-2xl" />
                    <Skeleton className="h-3 w-[120px]" />
                    <Skeleton className="h-3 w-[80px]" />
                  </div>
                ))}
              </div>
            </div>

            {/* CTA */}
            <Skeleton className="h-[180px] w-full rounded-[24px]" />

            {/* Metadata */}
            <div className="flex gap-5">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
        </div>

        {/* Discovery Feed Skeleton */}
        <section className="mt-16 md:mt-24">
          <div className="flex items-center justify-between mb-8 md:mb-10">
            <div className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-8 w-48" />
            </div>
            <Skeleton className="h-10 w-28 rounded-full hidden md:block" />
          </div>

          <div className="discovery-masonry">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="mb-4 space-y-3">
                <Skeleton className="w-full aspect-[3/4] rounded-[20px]" />
                <div className="space-y-2 lg:hidden">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-4 w-[80%]" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
