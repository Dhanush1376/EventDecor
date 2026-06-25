import React from 'react';
import { Skeleton } from '../SkeletonBase';

export function GallerySkeleton() {
  const aspectPatterns = [
    'aspect-[2/3]',
    'aspect-square',
    'aspect-[4/5]',
    'aspect-[3/4]',
    'aspect-[2/3]',
    'aspect-square',
  ];

  return (
    <div className="py-16 md:py-29 relative overflow-hidden bg-surface">
      <div className="max-w-[1440px] mx-auto px-[clamp(22px,4.5vw,72px)]">
        {/* Header */}
        <div className="text-center mb-14 md:mb-22 relative z-10">
          <div className="inline-flex items-center gap-3 px-3.5 py-1.5 rounded-full border border-primary/10 bg-primary/5 mb-5.5">
            <Skeleton className="h-[9px] w-28 rounded-full" />
          </div>
          <Skeleton className="h-[32px] sm:h-[42px] md:h-[58px] w-[60%] max-w-[400px] mx-auto" />
        </div>

        {/* Masonry grid */}
        <div className="columns-2 md:columns-3 lg:columns-4 gap-3 md:gap-5.5 space-y-3 md:space-y-5.5 relative z-10 px-0 md:px-4">
          {aspectPatterns.map((aspect, i) => (
            <div
              key={i}
              className={`break-inside-avoid relative w-full ${aspect} rounded-[22px] md:rounded-[28px] overflow-hidden bg-surface border border-black/5`}
            >
              <Skeleton className="absolute inset-0 w-full h-full !rounded-none" />
            </div>
          ))}

          {/* Cinematic View All CTA Skeleton */}
          <div className="break-inside-avoid relative rounded-[22px] md:rounded-[28px] overflow-hidden shadow-ambient border border-primary/10 bg-primary/5 flex flex-col items-center justify-center p-7 aspect-[4/5] w-full">
            <Skeleton
              variant="circle"
              className="w-14 h-14 mb-5.5 border border-primary/20 !bg-primary/10"
            />
            <Skeleton className="h-[22px] w-[140px] mb-2" />
            <Skeleton className="h-[9px] w-[80px]" />
          </div>
        </div>
      </div>
    </div>
  );
}
