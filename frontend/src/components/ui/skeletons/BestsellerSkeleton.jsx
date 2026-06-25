import React from 'react';
import { Skeleton } from '../SkeletonBase';
import { ProductCardSkeleton } from './ProductSkeletons';

export function BestsellerSkeleton() {
  return (
    <div className="py-16 md:py-29 relative overflow-hidden bg-surface-bright">
      <div className="max-w-[1440px] mx-auto px-[clamp(22px,4.5vw,72px)]">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-7 mb-14 md:mb-22 relative z-10">
          <div className="max-w-2xl flex flex-col items-center md:items-start text-center md:text-left w-full">
            <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full border border-outline-variant/30 bg-surface/50 mb-5">
              <Skeleton className="h-[10px] w-28" />
            </div>
            <div className="space-y-4 w-full flex flex-col items-center md:items-start">
              <Skeleton className="h-[42px] md:h-[65px] w-3/4" />
              <Skeleton className="h-[42px] md:h-[65px] w-1/2" />
            </div>
          </div>

          {/* Desktop Nav Buttons */}
          <div className="hidden md:flex items-center gap-3.5">
            <Skeleton variant="circle" className="w-13 h-13" />
            <Skeleton variant="circle" className="w-13 h-13" />
          </div>
        </div>

        {/* Mobile Layout */}
        <div className="md:hidden">
          <div className="relative h-[520px] w-full flex items-center justify-center overflow-visible mt-4 mb-10 z-20">
            {/* Background overlapping cards (simulated) */}
            <div className="absolute w-[75vw] sm:w-[65vw] h-full translate-x-[70%] scale-[0.80] opacity-30 z-10">
              <div className="w-full h-full bg-surface-bright rounded-[24px] p-2 border border-outline-variant/10 shadow-sm" />
            </div>
            <div className="absolute w-[75vw] sm:w-[65vw] h-full -translate-x-[70%] scale-[0.80] opacity-30 z-10">
              <div className="w-full h-full bg-surface-bright rounded-[24px] p-2 border border-outline-variant/10 shadow-sm" />
            </div>

            {/* Center active card */}
            <div className="absolute w-[75vw] sm:w-[65vw] z-30">
              <div className="w-full h-full relative bg-surface-bright rounded-[24px] p-2 flex flex-col shadow-sm border border-outline-variant/20">
                <ProductCardSkeleton />
              </div>
            </div>
          </div>

          {/* Mobile indicators & button */}
          <div className="mt-4 flex flex-col items-center gap-6 relative z-20">
            <div className="flex justify-center gap-2">
              <Skeleton className="h-1 w-6 rounded-full !bg-primary/40" />
              <Skeleton className="h-1 w-1.5 rounded-full !bg-primary/10" />
              <Skeleton className="h-1 w-1.5 rounded-full !bg-primary/10" />
            </div>
            <Skeleton className="h-[52px] w-[240px] rounded-full" />
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden md:flex gap-9 overflow-x-hidden pb-11 -mx-8 px-8 relative z-10">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="min-w-[360px] xl:min-w-[405px]">
              <ProductCardSkeleton />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
