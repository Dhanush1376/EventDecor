import React from 'react';
import { Skeleton } from '../SkeletonBase';
import { ProductCardSkeleton } from './ProductSkeletons';
import { AddressBarSkeleton } from './CommonSkeletons';

export function HeroSkeleton() {
  return (
    <>
      {/* ─────────── MOBILE HERO SKELETON ─────────── */}
      <section className="relative w-full overflow-hidden bg-[#0f0e0c] lg:hidden">
        <div className="relative text-white pt-32 pb-24 px-7 flex flex-col z-10 min-h-[100dvh] justify-center overflow-hidden">
          {/* Background Skeleton Image Block */}
          <div className="absolute inset-0 z-0 bg-[#1c1a17]">
            <div className="absolute inset-0 bg-gradient-to-t from-[#0F0E0C] via-[#0F0E0C]/60 to-transparent" />
          </div>

          <div className="relative z-10 flex flex-col items-start max-w-[300px]">
            {/* Eyebrow */}
            <div className="flex items-start gap-2 mb-4">
              <Skeleton
                variant="circle"
                className="w-[15px] h-[15px] !bg-white/20 !border-white/5 mt-0.5 shrink-0"
              />
              <div className="flex flex-col gap-1.5 mt-1">
                <Skeleton className="h-2 w-24 !bg-white/20 !border-white/5" />
                <Skeleton className="h-2 w-20 !bg-[#d4af37]/40 !border-transparent" />
              </div>
            </div>

            {/* Title */}
            <div className="space-y-2 mb-5 w-full">
              <Skeleton className="h-[38px] w-full !bg-white/10 !border-white/5" />
              <Skeleton className="h-[38px] w-3/4 !bg-[#d4af37]/30 !border-transparent" />
            </div>

            {/* Thin Gold Divider */}
            <Skeleton className="w-12 h-[1px] mb-5 !bg-[#d4af37]/60 !border-transparent rounded-none" />

            {/* Subtext */}
            <div className="space-y-2 mb-6 max-w-[270px] w-full">
              <Skeleton className="h-[12px] w-full !bg-white/10 !border-white/5" />
              <Skeleton className="h-[12px] w-[90%] !bg-white/10 !border-white/5" />
              <Skeleton className="h-[12px] w-[80%] !bg-white/10 !border-white/5" />
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col gap-4 items-start w-full mt-2">
              <Skeleton className="h-[52px] w-[240px] rounded-full !bg-[#d4af37]/40 !border-transparent" />
              <div className="flex items-center gap-3.5 py-3">
                <Skeleton variant="circle" className="w-10 h-10 !bg-white/10 !border-white/20" />
                <Skeleton className="h-[11px] w-[140px] !bg-white/20 !border-white/5" />
              </div>
            </div>
          </div>

          {/* Bottom-Right Rotating Mandala Seal */}
          <div className="absolute right-4 bottom-20 w-24 h-24 z-20 flex items-center justify-center">
            <Skeleton
              variant="circle"
              className="w-[52px] h-[52px] !bg-[#1c1a17] !border-[#d4af37]/30"
            />
          </div>

          {/* Gold-Stroked Wavy Bottom Mask SVG (simplified for skeleton) */}
          <div
            className="absolute bottom-0 left-0 w-full h-12 bg-[#FDFBF7]"
            style={{
              clipPath: 'polygon(0 100%, 100% 100%, 100% 0, 88% 20%, 50% 10%, 12% 20%, 0 0)',
            }}
          />
        </div>
      </section>

      {/* ─────────── DESKTOP HERO SKELETON ─────────── */}
      <section className="relative min-h-[720px] hidden lg:flex flex-col justify-center overflow-hidden bg-surface-bright py-0">
        <div className="max-w-[1440px] mx-auto px-[clamp(22px,4.5vw,72px)] w-full grid grid-cols-12 gap-20 items-center relative z-10 flex-1">
          {/* Hero Content */}
          <div className="col-span-7 flex flex-col items-start text-left space-y-6 z-20">
            {/* Badge */}
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full border border-outline-variant/50 bg-surface/50">
              <Skeleton variant="circle" className="w-1.5 h-1.5" />
              <Skeleton className="h-[9px] w-32" />
            </div>

            {/* Title */}
            <div className="space-y-3 w-full">
              <Skeleton className="h-[65px] w-full" />
              <Skeleton className="h-[65px] w-[85%]" />
            </div>

            {/* Subtitle */}
            <div className="space-y-2 w-full max-w-lg mt-2">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-[90%]" />
              <Skeleton className="h-5 w-[75%]" />
            </div>

            {/* Buttons */}
            <div className="flex flex-row space-x-3 pt-4">
              <Skeleton className="h-[46px] w-[200px] rounded-[100px]" />
              <Skeleton className="h-[46px] w-[180px] rounded-[100px]" />
            </div>
          </div>

          {/* Hero Imagery */}
          <div className="col-span-5 relative w-full h-[580px]">
            <Skeleton className="absolute right-0 top-0 w-full h-full rounded-[43px]" />

            {/* Floating Glass Card */}
            <div className="absolute -left-10 bottom-10 w-[230px] bg-white border border-black/5 p-7 rounded-[28px] shadow-2xl">
              <Skeleton className="h-[18px] w-[120px] mb-2.5" />
              <div className="space-y-1.5 mb-6">
                <Skeleton className="h-[11px] w-full" />
                <Skeleton className="h-[11px] w-[90%]" />
                <Skeleton className="h-[11px] w-[70%]" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-[11px] w-[110px]" />
                <Skeleton className="h-[12px] w-[12px]" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
