import React, { useState, useEffect } from "react";

export function Skeleton({ className = "", variant = "rect" }) {
  const variants = {
    rect: "rounded-2xl",
    circle: "rounded-full",
    text: "rounded-lg h-4 w-3/4",
  };

  return (
    <div
      className={`bg-surface-container border border-outline-variant/10 ${variants[variant]} ${className} relative overflow-hidden`}
    >
      {/* Exquisite micro-shimmer overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
    </div>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="aspect-[4/5] w-full" />
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <Skeleton className="h-3 w-1/4" />
          <Skeleton className="h-3 w-1/6" />
        </div>
        <Skeleton className="h-6 w-3/4" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-8 w-1/4" />
        </div>
      </div>
    </div>
  );
}

// ─── Hero Section Skeleton ───
export function HeroSkeleton() {
  return (
    <>
      <section className="relative w-full overflow-hidden bg-[#faf9f6] lg:hidden">
        <div className="relative text-white pt-32 pb-28 px-7 flex flex-col z-10 min-h-[480px] justify-center overflow-hidden bg-[#0F0E0C]">
          <div className="relative z-10 flex flex-col items-start max-w-[300px] space-y-4">
            <Skeleton className="h-4 w-32 !bg-white/10 !border-white/5" />
            <div className="space-y-2 w-full">
              <Skeleton className="h-9 w-48 !bg-white/10 !border-white/5" />
              <Skeleton className="h-9 w-40 !bg-white/10 !border-white/5" />
              <Skeleton className="h-9 w-44 !bg-white/10 !border-white/5" />
              <Skeleton className="h-9 w-52 !bg-white/10 !border-white/5" />
            </div>
            <Skeleton className="h-[1px] w-12 !bg-[var(--color-gold)]/30 !border-transparent" />
            <Skeleton className="h-3 w-[270px] !bg-white/10 !border-white/5" />
            <div className="space-y-5 w-full pt-2">
              <Skeleton className="h-11 w-52 rounded-full !bg-[var(--color-gold)]/20 !border-[var(--color-gold)]/10" />
              <Skeleton className="h-9 w-44 rounded-full !bg-white/5 !border-white/5" />
            </div>
          </div>
          <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-[#faf9f6] to-transparent z-10" />
        </div>
        <div className="w-full bg-[#faf9f6] pt-10 pb-10 flex flex-col items-center">
          <div className="flex gap-8 justify-center">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex flex-col items-center" style={{ width: "100px" }}>
                <Skeleton variant="circle" className="w-20 h-20" />
                <Skeleton className="h-2.5 w-14 mt-3.5 rounded-md" />
              </div>
            ))}
          </div>
          <div className="mt-5">
            <Skeleton variant="circle" className="w-12 h-12" />
          </div>
        </div>
      </section>

      <section className="relative min-h-[720px] hidden lg:flex flex-col justify-center overflow-hidden bg-surface-bright py-0">
        <div className="max-w-[1440px] mx-auto px-[clamp(22px,4.5vw,72px)] w-full grid grid-cols-12 gap-20 items-center relative z-10 flex-1">
          <div className="col-span-7 flex flex-col items-start text-left space-y-6 z-20">
            <Skeleton className="h-7 w-48 rounded-full" />
            <div className="space-y-3 w-full">
              <Skeleton className="h-16 w-[90%]" />
              <Skeleton className="h-16 w-[75%]" />
            </div>
            <div className="space-y-2 w-full max-w-lg">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-3/4" />
            </div>
            <div className="flex gap-3 pt-4">
              <Skeleton className="h-13 w-48 rounded-full" />
              <Skeleton className="h-13 w-44 rounded-full" />
            </div>
          </div>
          <div className="col-span-5 relative w-full h-[580px]">
            <Skeleton className="absolute right-0 top-0 w-full h-full rounded-[43px]" />
            <div className="absolute -left-10 bottom-10 w-[230px] bg-white border border-black/5 p-7 rounded-[28px] shadow-2xl">
               <Skeleton className="h-6 w-3/4 mb-1.5" />
               <Skeleton className="h-3 w-full mb-1" />
               <Skeleton className="h-3 w-4/5 mb-5" />
               <Skeleton className="h-3 w-1/2" />
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
        <div className="text-center max-w-4xl mx-auto mb-8 md:mb-28">
          <Skeleton className="h-8 w-48 rounded-full mx-auto mb-4 md:mb-8" />
          <div className="space-y-3">
            <Skeleton className="h-12 md:h-20 w-3/4 mx-auto" />
            <Skeleton className="h-12 md:h-20 w-1/2 mx-auto" />
          </div>
          <Skeleton className="h-5 w-2/3 mx-auto mt-4 md:mt-8" />
        </div>
        <div className="flex md:hidden justify-center min-h-[440px] mt-2">
          <Skeleton className="w-[300px] h-[380px] rounded-[32px]" />
        </div>
        <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-8 xl:gap-10">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="aspect-[4/5] w-full rounded-[32px]" />
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
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-7 mb-14 md:mb-22">
          <div className="max-w-2xl flex flex-col items-center md:items-start text-center md:text-left w-full">
            <Skeleton className="h-7 w-40 rounded-full mb-5" />
            <div className="space-y-3 w-full">
              <Skeleton className="h-10 md:h-16 w-3/4" />
              <Skeleton className="h-10 md:h-16 w-1/2" />
            </div>
          </div>
          <div className="hidden md:flex items-center gap-3.5">
            <Skeleton variant="circle" className="w-13 h-13" />
            <Skeleton variant="circle" className="w-13 h-13" />
          </div>
        </div>
        <div className="flex md:hidden items-center justify-center h-[520px]">
          <div className="w-[75vw] sm:w-[65vw]">
            <ProductCardSkeleton />
          </div>
        </div>
        <div className="hidden md:flex gap-9 overflow-hidden pb-11">
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
      <div className="max-w-[1440px] mx-auto px-[18px] md:px-[clamp(22px,4.5vw,72px)]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 lg:gap-22 items-center">
          {/* Image */}
          <div className="lg:col-span-5 relative px-4 lg:px-0">
            <Skeleton className="w-full aspect-[4/5] rounded-[28px] md:rounded-[43px]" />
            {/* Floating badge */}
            <div className="absolute top-6 lg:top-auto lg:-bottom-11 right-1 lg:right-auto lg:-left-11 z-20">
              <div className="bg-surface p-4 lg:p-9 rounded-[20px] lg:rounded-[36px] flex flex-col items-center min-w-[100px] lg:min-w-[162px] shadow-2xl border border-black/5">
                <Skeleton className="h-2 w-12 lg:h-3 lg:w-16 mb-2 lg:mb-3" />
                <Skeleton className="h-5 w-16 lg:h-8 lg:w-24" />
              </div>
            </div>
          </div>
          {/* Content */}
          <div className="lg:col-span-7 relative z-20 -mt-16 lg:mt-0 px-1.5 sm:px-6 lg:px-0">
            <div className="max-w-2xl mx-auto lg:mx-0 bg-surface/95 lg:bg-transparent px-4.5 py-8 pb-12 sm:px-8 lg:p-0 rounded-[28px] lg:rounded-none shadow-2xl lg:shadow-none border border-outline-variant/20 lg:border-none space-y-6">
              {/* Kicker */}
              <div className="flex items-center gap-3 md:gap-4">
                <Skeleton className="w-8 md:w-11 h-[1px]" />
                <Skeleton className="h-3 w-32" />
              </div>
              {/* Title */}
              <div className="space-y-3">
                <Skeleton className="h-8 sm:h-10 md:h-16 w-full" />
                <Skeleton className="h-8 sm:h-10 md:h-16 w-3/4" />
              </div>
              {/* Paragraphs */}
              <div className="space-y-3">
                <Skeleton className="h-4 md:h-5 w-full" />
                <Skeleton className="h-4 md:h-5 w-full" />
                <Skeleton className="h-4 md:h-5 w-2/3" />
              </div>
              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-6 md:gap-11 pt-8 md:pt-11 border-t border-outline-variant/10">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-10 md:h-12 w-24" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                ))}
              </div>
              {/* CTA */}
              <Skeleton className="h-12 w-44 rounded-full mt-6" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Gallery Preview Skeleton ───
export function GallerySkeleton() {
  const aspectPatterns = [
    "aspect-[2/3]",
    "aspect-square",
    "aspect-[4/5]",
    "aspect-[3/4]",
    "aspect-[2/3]",
    "aspect-[4/5]",
  ];

  return (
    <div className="py-16 md:py-29 relative overflow-hidden bg-surface">
      <div className="max-w-[1440px] mx-auto px-[clamp(22px,4.5vw,72px)]">
        {/* Header */}
        <div className="text-center mb-14 md:mb-22">
          <Skeleton className="h-7 w-56 rounded-full mx-auto mb-5.5" />
          <Skeleton className="h-10 md:h-14 w-2/3 mx-auto" />
        </div>
        {/* Masonry grid */}
        <div className="columns-2 md:columns-3 lg:columns-4 gap-3 md:gap-5.5 space-y-3 md:space-y-5.5 px-0 md:px-4">
          {aspectPatterns.map((aspect, i) => (
            <Skeleton
              key={i}
              className={`break-inside-avoid w-full ${aspect} rounded-[22px] md:rounded-[28px]`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Verified Reviews Skeleton ───
export function ReviewsSkeleton() {
  return (
    <section className="relative py-16 md:py-20 bg-[#FCFBF9] overflow-hidden border-t border-[#E8E2D5]/30">
      <div className="max-w-[1440px] mx-auto px-[18px] md:px-[clamp(22px,4.5vw,72px)] space-y-12">
        {/* Header */}
        <div className="text-center max-w-xl mx-auto mb-6">
          <Skeleton className="h-3 w-20 mx-auto mb-2" />
          <Skeleton className="h-8 md:h-10 w-56 mx-auto" />
          <Skeleton className="h-[1px] w-8 mx-auto mt-3 !bg-[var(--color-gold)]/40 !border-transparent" />
        </div>
        {/* Review cards marquee */}
        <div className="relative w-full">
          <div className="flex gap-8 overflow-hidden py-6 px-4">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="flex-shrink-0 w-[290px] xs:w-[320px] sm:w-[400px] md:w-[450px] bg-white p-8 md:p-10 rounded-[32px] border border-[#EBE6DD] flex flex-col justify-between"
              >
                <div className="space-y-6">
                  {/* Stars */}
                  <div className="flex gap-1.5">
                    {[...Array(5)].map((_, j) => (
                      <Skeleton key={j} className="w-4 h-4 rounded-sm" />
                    ))}
                  </div>
                  {/* Quote text */}
                  <div className="space-y-2.5">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                </div>
                {/* Profile */}
                <div className="flex items-center gap-3.5 mt-8">
                  <Skeleton variant="circle" className="w-11 h-11" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-3 w-28" />
                    <Skeleton className="h-2 w-36" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Cart Page Skeleton ───
export function CartSkeleton() {
  return (
    <div className="min-h-screen pt-24 md:pt-32 pb-20">
      <div className="max-w-[1440px] mx-auto px-[18px] md:px-[clamp(22px,4.5vw,72px)]">
        {/* Header */}
        <div className="mb-10">
          <Skeleton className="h-8 w-48 mb-3" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex gap-4 p-4 rounded-2xl bg-white border border-outline-variant/10">
                <Skeleton className="w-24 h-24 md:w-32 md:h-32 rounded-xl flex-shrink-0" />
                <div className="flex-1 space-y-3">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-3 w-1/3" />
                  <div className="flex items-center gap-3 pt-2">
                    <Skeleton className="h-9 w-28 rounded-full" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                </div>
              </div>
            ))}
          </div>
          {/* Summary */}
          <div className="lg:col-span-1">
            <div className="p-6 rounded-2xl bg-white border border-outline-variant/10 space-y-5 sticky top-24">
              <Skeleton className="h-6 w-32 mb-4" />
              <div className="space-y-3">
                <div className="flex justify-between"><Skeleton className="h-4 w-20" /><Skeleton className="h-4 w-16" /></div>
                <div className="flex justify-between"><Skeleton className="h-4 w-24" /><Skeleton className="h-4 w-16" /></div>
                <div className="flex justify-between"><Skeleton className="h-4 w-20" /><Skeleton className="h-4 w-12" /></div>
              </div>
              <div className="border-t border-outline-variant/10 pt-4">
                <div className="flex justify-between"><Skeleton className="h-5 w-16" /><Skeleton className="h-5 w-20" /></div>
              </div>
              <Skeleton className="h-14 w-full rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Product Detail Skeleton ───
export function ProductDetailSkeleton() {
  return (
    <div className="min-h-screen pt-24 md:pt-28 pb-20">
      <div className="max-w-[1440px] mx-auto px-[18px] md:px-[clamp(22px,4.5vw,72px)]">
        {/* Breadcrumb */}
        <div className="flex gap-2 mb-6">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-4" />
          <Skeleton className="h-3 w-24" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">
          {/* Image Gallery */}
          <div className="space-y-3">
            <Skeleton className="w-full aspect-square rounded-[28px]" />
            <div className="flex gap-3">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="w-20 h-20 rounded-xl" />
              ))}
            </div>
          </div>
          {/* Product Info */}
          <div className="space-y-6">
            <div className="space-y-3">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-9 w-3/4" />
              <Skeleton className="h-9 w-1/2" />
            </div>
            <div className="flex items-center gap-4">
              <Skeleton className="h-8 w-28" />
              <Skeleton className="h-5 w-20" />
            </div>
            <Skeleton className="h-[1px] w-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
            <div className="flex gap-3 pt-4">
              <Skeleton className="h-14 flex-1 rounded-full" />
              <Skeleton className="h-14 w-14 rounded-full" />
            </div>
          </div>
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
            <div key={i} className="p-5 rounded-2xl bg-white border border-outline-variant/10 space-y-4">
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

// ─── Event Detail Skeleton ───
export function EventDetailSkeleton() {
  return (
    <div className="min-h-screen pt-20 md:pt-0 pb-20">
      {/* Hero Image */}
      <Skeleton className="w-full h-[50vh] md:h-[60vh] !rounded-none" />
      <div className="max-w-[1440px] mx-auto px-[18px] md:px-[clamp(22px,4.5vw,72px)] -mt-16 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
          {/* Event Info */}
          <div className="lg:col-span-2 p-6 md:p-8 rounded-[28px] bg-white border border-outline-variant/10 space-y-6">
            <div className="space-y-3">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-10 w-3/4" />
              <Skeleton className="h-10 w-1/2" />
            </div>
            <div className="flex flex-wrap gap-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-8 w-28 rounded-full" />
              ))}
            </div>
            <Skeleton className="h-[1px] w-full" />
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
            {/* Gallery Grid */}
            <div className="grid grid-cols-3 gap-3 pt-4">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-xl" />
              ))}
            </div>
          </div>
          {/* Booking Panel */}
          <div className="lg:col-span-1">
            <div className="p-6 rounded-[28px] bg-white border border-outline-variant/10 space-y-5 sticky top-24">
              <Skeleton className="h-6 w-36" />
              <div className="space-y-3">
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-12 w-full rounded-xl" />
              </div>
              <div className="border-t border-outline-variant/10 pt-4 space-y-2">
                <div className="flex justify-between"><Skeleton className="h-4 w-24" /><Skeleton className="h-4 w-20" /></div>
                <div className="flex justify-between"><Skeleton className="h-5 w-16" /><Skeleton className="h-5 w-24" /></div>
              </div>
              <Skeleton className="h-14 w-full rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Booking Wizard Skeleton ───
export function BookingWizardSkeleton() {
  return (
    <div className="min-h-screen pt-24 md:pt-28 pb-20">
      <div className="max-w-3xl mx-auto px-[18px] md:px-[clamp(22px,4.5vw,72px)]">
        {/* Header */}
        <div className="text-center mb-10 space-y-3">
          <Skeleton className="h-8 w-56 mx-auto" />
          <Skeleton className="h-4 w-80 mx-auto" />
        </div>
        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 mb-10">
          {[...Array(4)].map((_, i) => (
            <React.Fragment key={i}>
              <Skeleton variant="circle" className="w-10 h-10" />
              {i < 3 && <Skeleton className="h-[2px] w-16" />}
            </React.Fragment>
          ))}
        </div>
        {/* Form Content */}
        <div className="p-6 md:p-10 rounded-[28px] bg-white border border-outline-variant/10 space-y-6">
          <Skeleton className="h-6 w-48 mb-2" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-12 w-full rounded-xl" />
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-28 w-full rounded-xl" />
          </div>
          <div className="flex justify-between pt-4">
            <Skeleton className="h-12 w-32 rounded-full" />
            <Skeleton className="h-12 w-40 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Contact Page Skeleton ───
export function ContactSkeleton() {
  return (
    <div className="min-h-screen pt-24 md:pt-32 pb-20">
      <div className="max-w-[1440px] mx-auto px-[18px] md:px-[clamp(22px,4.5vw,72px)]">
        {/* Breadcrumbs */}
        <div className="flex gap-2 mb-12">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-4" />
          <Skeleton className="h-3 w-20" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24">
          {/* Left - Editorial */}
          <div className="space-y-8">
            <div className="space-y-4">
              <Skeleton className="h-3 w-48" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-2/3" />
              <Skeleton className="h-5 w-full mt-4" />
              <Skeleton className="h-5 w-3/4" />
            </div>
            <div className="grid grid-cols-2 gap-6 pt-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-6 w-36" />
                </div>
              ))}
            </div>
            <div className="p-6 rounded-2xl bg-surface-container-low border border-outline-variant/10">
              <Skeleton className="h-3 w-32 mb-4" />
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex justify-between">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* Right - Form */}
          <div className="p-8 md:p-12 rounded-[2.5rem] bg-white border border-outline-variant/10 space-y-6">
            <div className="grid grid-cols-2 gap-5">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-12 w-full rounded-xl" />
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-28 w-full rounded-xl" />
            </div>
            <Skeleton className="h-14 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
