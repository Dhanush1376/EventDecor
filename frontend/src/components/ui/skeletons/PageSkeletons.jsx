import React from 'react';
import { Skeleton } from '../SkeletonBase';
import { ProductCardSkeleton } from './ProductSkeletons';
import { AddressBarSkeleton } from './CommonSkeletons';

export function HomeSkeleton() {
  return (
    <div className="h1-page relative bg-surface-bright overflow-hidden">
      {/* Hero Skeleton */}
      <div className="w-full h-[62.5vh] md:h-[80vh] bg-surface-container-high relative animate-pulse overflow-hidden">
        <div className="absolute bottom-[10%] left-[5%] md:bottom-[15%] md:left-[8%] flex flex-col w-[90%] max-w-[800px] z-10">
          <div className="h-3 w-20 md:w-28 bg-surface-container-highest/60 rounded-full mb-2"></div>
          <div className="h-8 md:h-16 w-[80%] bg-surface-container-highest/60 rounded-2xl md:rounded-3xl mb-3"></div>
          <div className="h-4 md:h-5 w-[60%] bg-surface-container-highest/60 rounded-full mb-5"></div>
          <div className="h-5 w-24 md:w-32 bg-surface-container-highest/60 rounded-none mb-2 border-b border-surface-container-highest/80"></div>
        </div>
        <div className="absolute bottom-3 md:bottom-6 left-1/2 -translate-x-1/2 flex gap-1.5 md:gap-2">
          <div className="w-1.5 h-1.5 bg-surface-container-highest/60 rounded-full"></div>
          <div className="w-4 h-1.5 bg-surface-container-highest/80 rounded-[2px]"></div>
          <div className="w-1.5 h-1.5 bg-surface-container-highest/60 rounded-full"></div>
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-surface-bright/80 via-surface-bright/10 to-transparent"></div>
      </div>

      {/* Promo Banner Skeleton */}
      <div className="w-full h-10 md:h-12 bg-surface-container animate-pulse flex items-center justify-center border-y border-surface-container-high">
        <div className="h-3 w-1/2 md:w-1/3 bg-surface-container-highest/50 rounded-full"></div>
      </div>

      {/* Category Grid Skeleton */}
      <div className="max-w-[1400px] mx-auto px-6 mt-16 md:mt-24 animate-pulse">
        <div className="flex flex-col items-center mb-8 md:mb-10">
          <div className="h-3 w-24 bg-surface-container-high rounded-full mb-2"></div>
          <div className="h-8 w-48 md:w-64 bg-surface-container-high rounded-full"></div>
        </div>

        {/* Mobile Grid */}
        <div className="grid grid-cols-2 gap-4 lg:hidden">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="flex flex-col items-center aspect-[4/5] bg-surface-container-high rounded-xl"
            ></div>
          ))}
        </div>

        {/* Desktop Circular Row */}
        <div className="hidden lg:flex justify-center gap-10 mt-8 w-full max-w-[1400px] mx-auto px-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-4 shrink-0">
              <div className="w-40 h-40 rounded-full bg-surface-container-high border-4 border-surface shadow-sm"></div>
              <div className="w-24 h-4 bg-surface-container-high rounded-full"></div>
            </div>
          ))}
        </div>
      </div>

      {/* Trending Products Skeleton */}
      <div className="max-w-[1400px] mx-auto px-6 mt-20 md:mt-32 animate-pulse">
        <div className="flex justify-between items-end mb-8 md:mb-10">
          <div>
            <div className="h-3 w-20 md:w-24 bg-surface-container-high rounded-full mb-2"></div>
            <div className="h-8 md:h-10 w-48 md:w-64 bg-surface-container-high rounded-full"></div>
          </div>
          <div className="h-4 w-20 bg-surface-container-high rounded-full hidden md:block"></div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex flex-col gap-4">
              <div className="w-full aspect-[3/4] bg-surface-container-high rounded-[24px] md:rounded-[32px]"></div>
              <div className="px-1 md:px-2">
                <div className="w-[80%] h-4 bg-surface-container-high rounded-full mb-2"></div>
                <div className="w-[60%] h-3 bg-surface-container-high rounded-full mb-3"></div>
                <div className="w-[40%] h-5 bg-surface-container-high rounded-full"></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Gallery Inspiration Skeleton */}
      <div className="max-w-[1400px] mx-auto px-6 mt-20 md:mt-32 animate-pulse">
        <div className="flex flex-col items-center mb-8 md:mb-10 text-center">
          <div className="h-3 w-24 bg-surface-container-high rounded-full mb-2 mx-auto"></div>
          <div className="h-8 md:h-10 w-48 md:w-64 bg-surface-container-high rounded-full mx-auto"></div>
        </div>
        <div className="columns-2 md:columns-3 lg:columns-5 gap-3 md:gap-5.5 space-y-3 md:space-y-5.5">
          {['aspect-[4/5]', 'aspect-square', 'aspect-[3/4]', 'aspect-[4/5]', 'aspect-square'].map(
            (aspect, i) => (
              <div
                key={i}
                className={`w-full ${aspect} bg-surface-container-high rounded-[24px]`}
              ></div>
            ),
          )}
        </div>
      </div>

      {/* Shop By Occasion Skeleton */}
      <div className="max-w-[1400px] mx-auto px-6 mt-20 md:mt-32 mb-24 animate-pulse">
        <div className="flex flex-col items-center text-center mb-8 md:mb-10">
          <div className="h-3 w-24 bg-surface-container-high rounded-full mb-2"></div>
          <div className="h-8 md:h-10 w-56 md:w-72 bg-surface-container-high rounded-full"></div>
        </div>

        {/* Mobile Swipe Carousel */}
        <div className="flex gap-6 justify-center overflow-hidden lg:hidden">
          <div className="w-[75vw] sm:w-[50vw] h-[400px] bg-surface-container-high rounded-[36px] shrink-0"></div>
          <div className="w-[75vw] sm:w-[50vw] h-[400px] bg-surface-container-high rounded-[36px] shrink-0 opacity-40"></div>
        </div>

        {/* Desktop Accordion */}
        <div className="hidden lg:flex w-full max-w-[1200px] mx-auto h-[600px] gap-4 px-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex-1 bg-surface-container-high rounded-[32px] h-full"></div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Hero Section Skeleton ───
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

// ─── Navigation Hub / Featured Collections Skeleton ───
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

// ─── Bestseller / Featured Products Skeleton ───
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

// ─── Story / About Teaser Skeleton ───
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

// ─── Collection Detail Skeleton ───
export function CollectionSkeleton() {
  return (
    <div className="pt-20 md:pt-28 bg-surface min-h-screen">
      <div className="max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop py-4 md:py-6">
        <div className="flex gap-2">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-4" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <Skeleton className="w-full h-[40vh] md:h-[58vh] !rounded-none" />
      <div className="max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop py-12 md:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          <div className="lg:col-span-3 hidden lg:block">
            <Skeleton className="h-[600px] w-full rounded-[2rem]" />
          </div>
          <div className="lg:col-span-9">
            <div className="flex justify-between mb-10">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              {[...Array(4)].map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Wishlist Page Skeleton ───
export function WishlistPageSkeleton() {
  return (
    <div className="w-full">
      {/* Address Bar Skeleton aligned flush */}
      <div className="-mt-6 mb-6">
        <AddressBarSkeleton />
      </div>

      <div className="max-w-[1440px] mx-auto px-4 sm:px-8">
        {/* Header Title & Count Skeleton */}
        <div className="flex items-baseline gap-1.5 pb-4 border-b border-outline-variant/30 mb-4">
          <Skeleton className="h-8 w-44 rounded-md" />
          <Skeleton className="h-4 w-16 rounded-md" />
        </div>

        {/* Centered Segmented Switcher Skeleton */}
        <div className="flex justify-center w-full mb-6 relative">
          <div className="w-full bg-surface-container/60 backdrop-blur-xl border border-outline-variant/20 p-1.5 rounded-full flex gap-1 items-center relative shadow-inner">
            <Skeleton className="h-10 flex-1 rounded-full" />
            <Skeleton className="h-10 flex-1 rounded-full" />
          </div>
        </div>

        {/* Categories Circular Carousel Skeleton */}
        <div className="mb-8 border-b border-black/5 pb-6">
          <div className="flex items-center gap-4 overflow-x-auto scrollbar-none py-2 px-1 select-none scroll-smooth">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex flex-col items-center shrink-0 w-[72px] md:w-[88px]">
                <Skeleton className="w-14 h-14 md:w-16 md:h-16 rounded-full" />
                <Skeleton className="h-3 w-10 rounded mt-2" />
              </div>
            ))}
          </div>
        </div>

        {/* Products Grid Skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {[...Array(8)].map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Blog Listing Skeleton ───
export function BlogListingSkeleton() {
  return (
    <div className="min-h-screen bg-background pt-24 pb-20">
      <div className="max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop">
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-6">
          <Skeleton className="h-16 w-3/4 mx-auto" />
          <Skeleton className="h-6 w-full mx-auto" />
          <Skeleton className="h-6 w-2/3 mx-auto" />
        </div>
        <div className="mb-16">
          <Skeleton className="w-full h-[400px] rounded-3xl" />
        </div>
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-12">
          <div className="flex gap-2">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-24 rounded-full" />
            ))}
          </div>
          <Skeleton className="h-12 w-full md:w-72 rounded-full" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="space-y-4">
              <Skeleton className="w-full h-[240px] rounded-2xl" />
              <div className="flex gap-4">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-3/4" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Blog Post Skeleton ───
export function BlogPostSkeleton() {
  return (
    <div className="min-h-screen bg-background pt-20 pb-20">
      <Skeleton className="w-full h-[50vh] md:h-[60vh] lg:h-[70vh] !rounded-none" />
      <div className="max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop mt-8 md:mt-12">
        <div className="flex flex-col lg:flex-row gap-12">
          <div className="flex-1 max-w-3xl w-full space-y-6">
            <Skeleton className="h-4 w-32 mb-8" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <div className="my-8">
              <Skeleton className="h-64 w-full rounded-2xl" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
          <div className="w-full lg:w-80 shrink-0">
            <div className="sticky top-24 space-y-8">
              <Skeleton className="h-64 w-full rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Location Landing Skeleton ───
export function LocationLandingSkeleton() {
  return (
    <div className="min-h-screen bg-background pt-20 pb-20">
      <Skeleton className="w-full h-[50vh] md:h-[60vh] lg:h-[70vh] !rounded-none" />
      <div className="max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop mt-16 md:mt-24">
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
          <div className="bg-surface/50 border border-outline-variant/30 rounded-[2rem] p-8 md:p-12 space-y-8">
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

// ─── About Skeleton ───
export function AboutSkeleton() {
  return (
    <div className="bg-surface min-h-screen">
      {/* Hero */}
      <Skeleton className="w-full h-[60vh] md:h-[80vh] !rounded-none" />
      <div className="max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop py-20">
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

// ─── Contact Skeleton ───
export function ContactSkeleton() {
  return (
    <div className="bg-surface min-h-screen pt-24 pb-20">
      <div className="max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop">
        <div className="text-center space-y-6 mb-16">
          <Skeleton className="h-12 w-1/2 mx-auto" />
          <Skeleton className="h-4 w-1/3 mx-auto" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-1 space-y-8">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="w-12 h-12 rounded-full flex-shrink-0" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </div>
            ))}
          </div>
          <div className="lg:col-span-2">
            <div className="bg-white rounded-3xl p-8 border border-outline-variant/30 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Skeleton className="h-14 w-full rounded-2xl" />
                <Skeleton className="h-14 w-full rounded-2xl" />
              </div>
              <Skeleton className="h-14 w-full rounded-2xl" />
              <Skeleton className="h-32 w-full rounded-2xl" />
              <Skeleton className="h-14 w-48 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Gallery Preview Skeleton ───
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

// ─── Gallery Detail Skeleton ───
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

// ─── Custom Orders Skeleton ───
export function CustomOrdersSkeleton() {
  return (
    <div className="min-h-screen bg-surface pt-24 pb-20">
      <div className="max-w-4xl mx-auto px-4 md:px-8">
        <div className="text-center space-y-6 mb-12">
          <Skeleton className="h-12 w-2/3 mx-auto" />
          <Skeleton className="h-4 w-1/2 mx-auto" />
        </div>
        <div className="bg-white rounded-3xl p-6 md:p-10 border border-outline-variant/30 shadow-sm space-y-8">
          <Skeleton className="h-10 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-14 w-full rounded-2xl" />
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-32 w-full rounded-2xl" />
          </div>
          <Skeleton className="h-14 w-full rounded-full" />
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard Skeleton ───
export function DashboardSkeleton() {
  return (
    <div className="min-h-screen pt-24 md:pt-28 pb-20">
      <div className="max-w-[1440px] mx-auto px-[18px] md:px-[clamp(22px,4.5vw,72px)]">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Skeleton variant="circle" className="w-16 h-16" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-3 w-36" />
          </div>
        </div>
        {/* Tab bar */}
        <div className="flex gap-2 mb-8 overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-10 w-28 rounded-full flex-shrink-0" />
          ))}
        </div>
        {/* Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="p-5 rounded-2xl bg-white border border-outline-variant/10 space-y-4"
            >
              <div className="flex justify-between items-center">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <div className="flex gap-2 pt-2">
                <Skeleton className="h-9 w-24 rounded-full" />
                <Skeleton className="h-9 w-20 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function FAQSkeleton() {
  return (
    <div className="w-full max-w-4xl mx-auto py-12 px-margin-mobile md:px-margin-desktop space-y-4">
      <div className="flex justify-center mb-8">
        <Skeleton className="h-10 w-64 md:w-96 rounded-full" />
      </div>
      {[...Array(3)].map((_, i) => (
        <div
          key={i}
          className="bg-surface/60 backdrop-blur-md border border-outline-variant/30 rounded-2xl overflow-hidden p-5 flex items-center justify-between"
        >
          <Skeleton className="h-6 w-3/4 rounded-md" />
          <Skeleton className="h-5 w-5 rounded-full shrink-0" />
        </div>
      ))}
    </div>
  );
}

// ─── Loyalty / Wallet Dashboard Skeleton ───
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

      {/* 2. REFERRAL & REWARD PROGRAM */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-outline-variant/30">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <Skeleton className="w-9 h-9 rounded-lg shrink-0" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-2.5 w-24" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        </div>

        <div className="space-y-4 md:border-l border-outline-variant/30 md:pl-8">
          <div className="flex items-start gap-3">
            <Skeleton className="w-9 h-9 rounded-lg shrink-0" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-2.5 w-24" />
            <Skeleton className="h-10 w-full rounded-lg" />
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

// ─── Auth Skeleton ───
export function AuthSkeleton() {
  return (
    <div className="min-h-screen bg-black flex overflow-hidden">
      <div className="hidden lg:block lg:w-1/2 relative bg-surface-container-highest">
        <div className="p-20 w-full min-h-screen flex flex-col justify-between">
          <Skeleton className="h-8 w-40" />
          <div className="space-y-6">
            <Skeleton className="h-16 w-3/4" />
            <Skeleton className="h-16 w-1/2" />
            <Skeleton className="h-4 w-2/3 mt-4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      </div>
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12 bg-surface">
        <div className="w-full max-w-[440px] space-y-10">
          <div className="space-y-3">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-12 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
          <div className="bg-white rounded-[32px] p-5 xs:p-8 md:p-10 border border-outline-variant/30 space-y-6">
            <Skeleton className="h-16 w-full rounded-2xl" />
            <Skeleton className="h-14 w-full rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
