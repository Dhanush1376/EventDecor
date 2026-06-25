import React from 'react';
import { Skeleton } from '../SkeletonBase';

export function NavigationHubSkeleton() {
  return (
    <section className="pt-2 pb-10 md:py-36 bg-[#FDFBF7] relative overflow-hidden">
      <div className="max-w-[1440px] mx-auto px-6 md:px-12 lg:px-16">
        {/* Header */}
        <div className="text-center max-w-4xl mx-auto mb-8 md:mb-28 relative z-10">
          <div className="inline-flex items-center justify-center px-5 py-2 rounded-full border border-outline-variant/30 bg-white/50 mb-4 md:mb-8">
            <Skeleton variant="circle" className="w-1.5 h-1.5 shrink-0" />
            <Skeleton className="h-[10px] w-32 mx-3" />
            <Skeleton variant="circle" className="w-1.5 h-1.5 shrink-0" />
          </div>

          <div className="space-y-4 mb-4 md:mb-8">
            <Skeleton className="h-[48px] md:h-[84px] w-[80%] mx-auto" />
            <Skeleton className="h-[48px] md:h-[84px] w-[60%] mx-auto" />
          </div>

          <div className="space-y-2 max-w-2xl mx-auto">
            <Skeleton className="h-[20px] w-full mx-auto" />
            <Skeleton className="h-[20px] w-[80%] mx-auto" />
          </div>
        </div>

        {/* ─────────── MOBILE: Shuffling Card Stack ─────────── */}
        <div className="md:hidden relative w-full flex flex-col items-center justify-center min-h-[490px] z-20 mt-2">
          <div className="relative w-[88vw] max-w-[340px] h-[440px] flex items-center justify-center">
            {/* Background stacked cards */}
            <div className="absolute w-[85vw] max-w-[330px] h-[430px] rounded-[32px] bg-black/5 border border-black/5 translate-y-[28px] scale-[0.86] origin-bottom -rotate-4" />
            <div className="absolute w-[85vw] max-w-[330px] h-[430px] rounded-[32px] bg-black/10 border border-black/5 translate-y-[14px] scale-[0.93] origin-bottom rotate-4" />

            {/* Top Card */}
            <div className="absolute w-[85vw] max-w-[330px] h-[430px] rounded-[32px] overflow-hidden border border-black/5 bg-white z-10">
              <Skeleton className="absolute inset-0 w-full h-full !rounded-none" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

              <div className="absolute inset-0 p-6 flex flex-col justify-between z-10">
                {/* Top row */}
                <div className="flex items-center justify-between">
                  <Skeleton className="h-[12px] w-4 !bg-white/30 !border-transparent" />
                  <div className="w-10 h-[1px] bg-white/20" />
                </div>

                {/* Bottom row */}
                <div className="flex flex-col text-left">
                  <Skeleton className="h-[25px] w-3/4 mb-2.5 !bg-white/20 !border-transparent" />
                  <div className="space-y-1.5 mb-3.5">
                    <Skeleton className="h-[12px] w-full !bg-white/10 !border-transparent" />
                    <Skeleton className="h-[12px] w-[80%] !bg-white/10 !border-transparent" />
                  </div>
                  <div className="flex items-center gap-3">
                    <Skeleton
                      variant="circle"
                      className="w-9 h-9 !bg-white/20 !border-transparent shrink-0"
                    />
                    <Skeleton className="h-[9px] w-12 !bg-white/20 !border-transparent" />
                  </div>
                </div>
              </div>
              {/* Swipe Hint */}
              <div className="absolute top-4 right-4 w-7 h-7 rounded-full bg-white/10 backdrop-blur-md border border-white/20" />
            </div>
          </div>
        </div>

        {/* ─────────── DESKTOP: Elegant Grid ─────────── */}
        <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-8 xl:gap-10 relative z-20">
          {[...Array(4)].map((_, index) => (
            <div
              key={index}
              className="relative w-full aspect-[4/5] rounded-[32px] overflow-hidden bg-white border border-black/5"
            >
              <Skeleton className="absolute inset-0 w-full h-full !rounded-none" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/5" />
              <div className="absolute inset-0 border-[1.5px] border-white/10 rounded-[32px]" />

              <div className="absolute inset-0 p-6 md:p-8 flex flex-col justify-between z-10">
                {/* Top: Category Number & Decorative Divider */}
                <div className="flex items-center justify-between">
                  <Skeleton className="h-[14px] w-5 !bg-white/30 !border-transparent" />
                  <div className="w-12 h-[1px] bg-white/20" />
                </div>

                {/* Bottom: Title, Description, and CTA */}
                <div className="flex flex-col">
                  <Skeleton className="h-[28px] w-[85%] mb-3 !bg-white/20 !border-transparent" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-[13px] w-full !bg-white/10 !border-transparent" />
                    <Skeleton className="h-[13px] w-[90%] !bg-white/10 !border-transparent" />
                  </div>
                  <div className="mt-4 flex items-center gap-4">
                    <Skeleton
                      variant="circle"
                      className="w-10 h-10 !bg-white/20 !border-transparent shrink-0"
                    />
                    <Skeleton className="h-[9px] w-16 !bg-white/20 !border-transparent" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
