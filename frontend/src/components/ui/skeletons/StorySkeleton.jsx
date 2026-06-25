import React from 'react';
import { Skeleton } from '../SkeletonBase';

export function StorySkeleton() {
  return (
    <section className="relative pt-16 pb-28 lg:py-28 overflow-hidden bg-surface">
      <div className="max-w-[1440px] mx-auto px-6 md:px-12 lg:px-16 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 lg:gap-22 items-center">
          {/* Image side */}
          <div className="lg:col-span-5 relative h-full flex items-center px-4 lg:px-0">
            <Skeleton className="w-full aspect-[4/5] rounded-[28px] md:rounded-[43px] border border-black/5" />

            {/* Floating badge */}
            <div className="absolute top-6 lg:top-auto lg:-bottom-11 right-1 lg:right-auto lg:-left-11 z-20">
              <div className="bg-surface/90 lg:bg-surface p-4 lg:p-9 rounded-[20px] lg:rounded-[36px] flex flex-col items-center min-w-[100px] lg:min-w-[162px] shadow-2xl border border-black/5">
                <Skeleton className="h-[9px] w-12 lg:w-16 mb-1.5 lg:mb-2.5 rounded-full" />
                <Skeleton className="h-[20px] lg:h-[36px] w-16 lg:w-24 rounded-full" />
              </div>
            </div>
          </div>

          {/* Content side */}
          <div className="lg:col-span-7 relative z-20 -mt-16 lg:mt-0 px-1.5 sm:px-6 lg:px-0">
            <div className="max-w-2xl mx-auto lg:mx-0 bg-surface/95 lg:bg-transparent px-4.5 py-8 pb-12 sm:px-8 lg:p-0 rounded-[28px] lg:rounded-none shadow-2xl lg:shadow-none border border-outline-variant/20 lg:border-none">
              {/* Kicker */}
              <div className="flex items-center gap-3 md:gap-4 mb-5 md:mb-7">
                <Skeleton className="w-8 md:w-11 h-[1px]" />
                <Skeleton className="h-[10px] w-32 rounded-full" />
              </div>

              {/* Title */}
              <div className="space-y-4 mb-5 md:mb-7 w-full">
                <Skeleton className="h-[26px] sm:h-[38px] md:h-[65px] w-full" />
                <Skeleton className="h-[26px] sm:h-[38px] md:h-[65px] w-[85%]" />
              </div>

              {/* Paragraphs */}
              <div className="space-y-6 w-full">
                <div className="space-y-2.5">
                  <Skeleton className="h-[14px] md:h-[20px] w-full" />
                  <Skeleton className="h-[14px] md:h-[20px] w-full" />
                  <Skeleton className="h-[14px] md:h-[20px] w-[75%]" />
                </div>
                <div className="space-y-2.5">
                  <Skeleton className="h-[13px] md:h-[18px] w-full" />
                  <Skeleton className="h-[13px] md:h-[18px] w-[85%]" />
                </div>
              </div>

              {/* Stats grid */}
              <div className="mt-10 md:mt-14 grid grid-cols-2 gap-6 md:gap-11 pt-8 md:pt-11 border-t border-outline-variant/10">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="space-y-3">
                    <Skeleton className="h-[28px] md:h-[43px] w-20 md:w-32 rounded-full" />
                    <Skeleton className="h-[9px] md:h-[10px] w-16 md:w-24 rounded-full" />
                  </div>
                ))}
              </div>

              {/* CTA */}
              <div className="mt-14">
                <Skeleton className="h-[46px] w-[180px] rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
