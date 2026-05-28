import React from "react";

export function Skeleton({ className = "", variant = "rect", delay = 0 }) {
  const variants = {
    rect: "rounded-2xl",
    circle: "rounded-full",
    text: "rounded-lg h-4 w-3/4",
  };

  return (
    <div
      className={`bg-surface-container border border-outline-variant/10 ${variants[variant]} ${className} relative overflow-hidden`}
      style={{ animationDelay: `${delay}ms` }}
      aria-hidden="true"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 dark:via-white/10 to-transparent animate-shimmer" />
    </div>
  );
}


export function HomeSkeleton() {
  return (
    <>
      <HeroSkeleton />
      <NavigationHubSkeleton />
      <BestsellerSkeleton />
      <StorySkeleton />
      <GallerySkeleton />
      <div className="bg-surface relative z-10 w-full pt-12 pb-24 rounded-b-[40px] shadow-[0_10px_30px_rgba(0,0,0,0.05)] border-x border-b border-outline-variant/10 max-w-[1920px] mx-auto">
        <FAQSkeleton />
      </div>
    </>
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
              <Skeleton variant="circle" className="w-[15px] h-[15px] !bg-white/20 !border-white/5 mt-0.5 shrink-0" />
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
             <Skeleton variant="circle" className="w-[52px] h-[52px] !bg-[#1c1a17] !border-[#d4af37]/30" />
          </div>

          {/* Gold-Stroked Wavy Bottom Mask SVG (simplified for skeleton) */}
          <div className="absolute bottom-0 left-0 w-full h-12 bg-[#FDFBF7]" style={{ clipPath: "polygon(0 100%, 100% 100%, 100% 0, 88% 20%, 50% 10%, 12% 20%, 0 0)" }} />
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
                     <Skeleton variant="circle" className="w-9 h-9 !bg-white/20 !border-transparent shrink-0" />
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
            <div key={index} className="relative w-full aspect-[4/5] rounded-[32px] overflow-hidden bg-white border border-black/5">
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
                    <Skeleton variant="circle" className="w-10 h-10 !bg-white/20 !border-transparent shrink-0" />
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

// ─── Gallery Preview Skeleton ───
export function GallerySkeleton() {
  const aspectPatterns = [
    "aspect-[2/3]",
    "aspect-square",
    "aspect-[4/5]",
    "aspect-[3/4]",
    "aspect-[2/3]",
    "aspect-square",
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
            <Skeleton variant="circle" className="w-14 h-14 mb-5.5 border border-primary/20 !bg-primary/10" />
            <Skeleton className="h-[22px] w-[140px] mb-2" />
            <Skeleton className="h-[9px] w-[80px]" />
          </div>
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

export function CheckoutStepSkeleton({ mode = "address" }) {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading checkout section">
      {mode === "payment" ? (
        <>
          <div className="bg-surface-bright border border-outline-variant/40 rounded-[4px] p-4 space-y-4">
            <Skeleton className="h-4 w-36" />
            {[0, 1].map((idx) => (
              <div key={idx} className="border border-outline-variant/30 rounded-[4px] p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton variant="circle" className="w-5 h-5" delay={idx * 120} />
                  <Skeleton className="h-4 w-56" delay={idx * 120 + 80} />
                </div>
                <Skeleton className="h-3 w-3/4" delay={idx * 120 + 140} />
              </div>
            ))}
          </div>
          <div className="fixed bottom-0 left-0 right-0 bg-surface-bright border-t border-outline-variant/20 p-3 z-40 max-w-[768px] mx-auto flex gap-3">
            <Skeleton className="h-12 flex-1 rounded" />
            <Skeleton className="h-12 flex-1 rounded" />
          </div>
        </>
      ) : (
        <>
          <div className="bg-surface-bright mb-2 p-4 pt-6 shadow-sm space-y-3">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <div className="bg-surface-bright p-4 shadow-sm border-t border-outline-variant/10 space-y-4">
            {[0, 1].map((idx) => (
              <div key={idx} className="flex items-center gap-4">
                <Skeleton className="w-12 h-14 rounded" delay={idx * 100} />
                <Skeleton className="h-4 w-56" delay={idx * 100 + 80} />
              </div>
            ))}
          </div>
          <div className="fixed bottom-0 left-0 right-0 bg-surface-bright border-t border-outline-variant/20 p-3 z-40 max-w-[768px] mx-auto">
            <Skeleton className="h-12 w-full rounded" />
          </div>
        </>
      )}
    </div>
  );
}

export function CheckoutSidebarSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading order summary">
      <div className="bg-surface-bright border border-outline-variant/40 rounded-lg p-4 space-y-3">
        <Skeleton className="h-4 w-40" />
        <div className="flex gap-2">
          <Skeleton className="h-9 flex-1 rounded" />
          <Skeleton className="h-9 w-24 rounded" />
        </div>
        <Skeleton className="h-20 w-full rounded-lg" />
      </div>
      <div className="bg-surface-bright border border-outline-variant/40 rounded-lg p-4 space-y-3 sticky top-28">
        <Skeleton className="h-4 w-44 mb-2" />
        {[0, 1, 2, 3].map((idx) => (
          <div className="flex justify-between" key={idx}>
            <Skeleton className="h-3 w-28" delay={idx * 80} />
            <Skeleton className="h-3 w-16" delay={idx * 80 + 60} />
          </div>
        ))}
        <Skeleton className="h-12 w-full rounded mt-2" />
      </div>
    </div>
  );
}

export function SearchSuggestionsSkeleton() {
  return (
    <div className="py-2" aria-busy="true" aria-label="Loading search results">
      {Array.from({ length: 4 }).map((_, idx) => (
        <div key={idx} className="w-full flex items-center gap-4.5 px-6 md:px-8.5 py-4 border-b border-stone-100/30">
          <Skeleton className="w-12 h-12 md:w-14 md:h-14 rounded-2xl" delay={idx * 70} />
          <div className="flex-1 min-w-0 space-y-2">
            <Skeleton className="h-4 w-3/4" delay={idx * 70 + 80} />
            <Skeleton className="h-3 w-1/3" delay={idx * 70 + 130} />
          </div>
          <Skeleton className="h-6 w-14 rounded-lg" delay={idx * 70 + 170} />
        </div>
      ))}
    </div>
  );
}

export function RecommendationGridSkeleton({ cards = 4 }) {
  return (
    <div className="grid grid-cols-2 gap-3 pb-2 pt-1" aria-busy="true" aria-label="Loading recommendations">
      {Array.from({ length: cards }).map((_, i) => (
        <div key={i} className="w-full flex flex-col gap-2">
          <Skeleton className="aspect-square w-full rounded-xl" delay={i * 90} />
          <Skeleton className="h-3 w-1/3 rounded" delay={i * 90 + 70} />
          <Skeleton className="h-4 w-3/4 rounded" delay={i * 90 + 130} />
          <Skeleton className="h-4 w-1/2 rounded" delay={i * 90 + 170} />
        </div>
      ))}
    </div>
  );
}

export function OrdersListSkeleton({ rows = 2 }) {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading orders">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="bg-surface-bright border border-outline-variant/40 rounded-lg p-5 space-y-4">
          <div className="flex justify-between items-center">
            <Skeleton className="h-4 w-44" delay={i * 100} />
            <Skeleton className="h-5 w-24 rounded-full" delay={i * 100 + 60} />
          </div>
          <Skeleton className="h-3 w-2/3" delay={i * 100 + 100} />
          <Skeleton className="h-16 w-full rounded" delay={i * 100 + 140} />
          <div className="flex justify-between">
            <Skeleton className="h-3 w-40" delay={i * 100 + 180} />
            <Skeleton className="h-3 w-28" delay={i * 100 + 220} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function WishlistPageSkeleton() {
  return (
    <div className="min-h-screen pt-24 md:pt-32 pb-20 bg-[#FDFBF7]">
      <div className="max-w-[1440px] mx-auto px-[18px] md:px-[clamp(22px,4.5vw,72px)]">
        <div className="flex flex-col items-center justify-center text-center mb-12">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex flex-col gap-3">
              <Skeleton className="aspect-[4/5] w-full rounded-[24px]" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function CategorySkeleton() {
  return (
    <div className="flex flex-col items-center gap-3">
      <Skeleton variant="circle" className="w-16 h-16 md:w-20 md:h-20" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

export function NavbarSkeleton() {
  return (
    <header className="sticky top-0 z-50 w-full bg-surface/80 backdrop-blur-md border-b border-outline-variant/20 h-[var(--navbar-height)] flex items-center">
      <div className="w-full max-w-[1440px] mx-auto px-4 flex justify-between items-center">
        <Skeleton className="h-6 w-32" />
        <div className="hidden md:flex gap-6">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="flex gap-4">
          <Skeleton variant="circle" className="w-8 h-8" />
          <Skeleton variant="circle" className="w-8 h-8" />
        </div>
      </div>
    </header>
  );
}

export function CartItemSkeleton() {
  return (
    <div className="flex gap-4 p-4 rounded-2xl bg-white border border-outline-variant/10">
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
  );
}

export function AddressSkeleton() {
  return (
    <div className="p-5 rounded-2xl bg-surface-container-low border border-outline-variant/20 space-y-3">
      <div className="flex justify-between items-start">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
      <div className="flex gap-3 pt-3">
        <Skeleton className="h-8 w-16 rounded-lg" />
        <Skeleton className="h-8 w-16 rounded-lg" />
      </div>
    </div>
  );
}

export function PaymentSkeleton() {
  return (
    <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/20 flex gap-4 items-center">
      <Skeleton className="w-12 h-8 rounded-md" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-20" />
      </div>
      <Skeleton variant="circle" className="w-5 h-5" />
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="p-6 rounded-[28px] bg-white border border-outline-variant/10 space-y-6">
      <div className="flex items-center gap-5">
        <Skeleton variant="circle" className="w-20 h-20" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <Skeleton className="h-[1px] w-full" />
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function OrderCardSkeleton() {
  return (
    <div className="bg-surface-bright border border-outline-variant/40 rounded-2xl p-5 space-y-4">
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>
      <Skeleton className="h-[1px] w-full" />
      <div className="flex gap-4">
        <Skeleton className="w-20 h-20 rounded-xl flex-shrink-0" />
        <div className="flex-1 space-y-2 py-1">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      <div className="flex justify-between items-center pt-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-9 w-28 rounded-full" />
      </div>
    </div>
  );
}

export function ChatSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex gap-3">
        <Skeleton variant="circle" className="w-8 h-8 flex-shrink-0" />
        <Skeleton className="h-12 w-2/3 rounded-2xl rounded-tl-none" />
      </div>
      <div className="flex gap-3 flex-row-reverse">
        <Skeleton variant="circle" className="w-8 h-8 flex-shrink-0" />
        <Skeleton className="h-16 w-3/4 rounded-2xl rounded-tr-none" />
      </div>
      <div className="flex gap-3">
        <Skeleton variant="circle" className="w-8 h-8 flex-shrink-0" />
        <Skeleton className="h-10 w-1/2 rounded-2xl rounded-tl-none" />
      </div>
    </div>
  );
}

export function GridSkeleton({ columns = 3, rows = 2, gap = "gap-6" }) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-${Math.min(2, columns)} lg:grid-cols-${columns} ${gap}`}>
      {[...Array(columns * rows)].map((_, i) => (
        <Skeleton key={i} className="aspect-[4/3] w-full rounded-2xl" />
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5, columns = 4 }) {
  return (
    <div className="w-full bg-white rounded-2xl border border-outline-variant/20 overflow-hidden">
      <div className="flex border-b border-outline-variant/20 bg-surface-container-low p-4 gap-4">
        {[...Array(columns)].map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {[...Array(rows)].map((_, r) => (
        <div key={r} className="flex border-b border-outline-variant/10 p-4 gap-4">
          {[...Array(columns)].map((_, c) => (
            <Skeleton key={`${r}-${c}`} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function ModalSkeleton() {
  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-4 w-3/4" />
      </div>
      <Skeleton className="h-[1px] w-full" />
      <div className="space-y-4">
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
      <div className="flex justify-end gap-3 pt-4">
        <Skeleton className="h-10 w-24 rounded-full" />
        <Skeleton className="h-10 w-32 rounded-full" />
      </div>
    </div>
  );
}

export function RecommendationSkeleton({ horizontal = false }) {
  return (
    <div className={horizontal ? "flex gap-6 overflow-x-hidden" : "grid grid-cols-2 md:grid-cols-4 gap-6"}>
      {[...Array(4)].map((_, i) => (
        <div key={i} className={horizontal ? "min-w-[240px] md:min-w-[280px]" : ""}>
          <ProductCardSkeleton />
        </div>
      ))}
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
        <div key={i} className="bg-surface/60 backdrop-blur-md border border-outline-variant/30 rounded-2xl overflow-hidden p-5 flex items-center justify-between">
          <Skeleton className="h-6 w-3/4 rounded-md" />
          <Skeleton className="h-5 w-5 rounded-full shrink-0" />
        </div>
      ))}
    </div>
  );
}

export function AboutSkeleton() {
  return (
    <div className="max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop py-12 md:py-24 space-y-24">
      <div className="grid lg:grid-cols-2 gap-12 lg:gap-24 items-center">
        <Skeleton className="w-full aspect-square md:aspect-[4/5] rounded-[40px] md:rounded-[80px]" />
        <div className="space-y-6">
          <Skeleton className="h-6 w-32 rounded-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-3/4" />
          <div className="space-y-3 pt-6">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-[90%]" />
            <Skeleton className="h-5 w-[95%]" />
            <Skeleton className="h-5 w-[85%]" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function BlogListingSkeleton() {
  return (
    <div className="max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop py-12 space-y-12">
      <div className="text-center space-y-4 mb-16">
        <Skeleton className="h-12 w-64 mx-auto rounded-full" />
        <Skeleton className="h-6 w-96 mx-auto rounded-full" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex flex-col gap-4">
            <Skeleton className="w-full aspect-[4/3] rounded-[24px]" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-24 rounded-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BlogPostSkeleton() {
  return (
    <div className="max-w-4xl mx-auto px-margin-mobile md:px-margin-desktop py-12 space-y-10">
      <div className="space-y-6 text-center">
        <Skeleton className="h-6 w-32 mx-auto rounded-full" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-4/5 mx-auto" />
        <div className="flex justify-center gap-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      <Skeleton className="w-full aspect-[21/9] rounded-[40px]" />
      <div className="space-y-6 pt-8 max-w-3xl mx-auto">
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-[90%]" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-[85%]" />
      </div>
    </div>
  );
}

export function CustomOrdersSkeleton() {
  return (
    <div className="max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop py-12 md:py-20">
      <div className="grid lg:grid-cols-2 gap-12 lg:gap-20">
        <div className="space-y-8">
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-12 w-1/2" />
          <div className="space-y-4">
            <Skeleton className="h-24 w-full rounded-[24px]" />
            <Skeleton className="h-24 w-full rounded-[24px]" />
          </div>
        </div>
        <div className="bg-surface-bright rounded-[40px] p-8 md:p-12 border border-outline-variant/30 space-y-8">
          <Skeleton className="h-8 w-1/3" />
          <div className="space-y-6">
            <Skeleton className="h-14 w-full rounded-full" />
            <Skeleton className="h-14 w-full rounded-full" />
            <Skeleton className="h-32 w-full rounded-2xl" />
            <Skeleton className="h-14 w-full rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function EventCollectionsSkeleton() {
  return (
    <div className="max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop py-12 space-y-12">
      <div className="text-center space-y-4 mb-12">
        <Skeleton className="h-12 w-64 mx-auto rounded-full" />
        <Skeleton className="h-6 w-96 mx-auto rounded-full" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="w-full aspect-video rounded-[32px]" />
        ))}
      </div>
    </div>
  );
}

export function EventShowcasesSkeleton() {
  return (
    <div className="max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop py-8 md:py-16 space-y-10">
      <Skeleton className="w-full h-[400px] md:h-[600px] rounded-[40px]" />
      <div className="flex justify-center gap-4 py-6">
        <Skeleton className="h-12 w-32 rounded-full" />
        <Skeleton className="h-12 w-32 rounded-full" />
        <Skeleton className="h-12 w-32 rounded-full" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="w-full aspect-[4/5] rounded-[24px]" />
        ))}
      </div>
    </div>
  );
}

export function LocationLandingSkeleton() {
  return (
    <div className="w-full space-y-16 pb-20">
      <Skeleton className="w-full h-[50vh] md:h-[70vh] rounded-b-[40px]" />
      <div className="max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop grid md:grid-cols-2 gap-12">
        <div className="space-y-6">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-[90%]" />
        </div>
        <Skeleton className="w-full aspect-square rounded-[40px]" />
      </div>
      <div className="bg-surface relative z-10 w-full pt-12 pb-24 border-y border-outline-variant/10 max-w-[1920px] mx-auto">
        <FAQSkeleton />
      </div>
    </div>
  );
}

export function OrderSuccessSkeleton() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-surface-bright border border-outline-variant/30 rounded-[40px] p-8 md:p-16 text-center space-y-8">
        <Skeleton className="w-24 h-24 rounded-full mx-auto" />
        <div className="space-y-4">
          <Skeleton className="h-10 w-3/4 mx-auto" />
          <Skeleton className="h-6 w-1/2 mx-auto" />
        </div>
        <div className="space-y-4 py-8 border-y border-outline-variant/20">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
        <div className="flex justify-center gap-4">
          <Skeleton className="h-14 w-48 rounded-full" />
          <Skeleton className="h-14 w-48 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function OrderTrackingSkeleton() {
  return (
    <div className="max-w-4xl mx-auto px-margin-mobile md:px-margin-desktop py-12 md:py-24">
      <div className="bg-surface-bright rounded-[40px] border border-outline-variant/30 p-8 md:p-12 space-y-10">
        <div className="space-y-4">
          <Skeleton className="h-10 w-1/2" />
          <Skeleton className="h-6 w-1/3" />
        </div>
        <div className="space-y-8 pl-4 border-l-2 border-outline-variant/20">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="relative space-y-2">
              <Skeleton className="absolute -left-[27px] top-0 w-5 h-5 rounded-full" />
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function PolicySkeleton() {
  return (
    <div className="max-w-3xl mx-auto px-margin-mobile md:px-margin-desktop py-12 md:py-24 space-y-10">
      <div className="space-y-4 text-center pb-8 border-b border-outline-variant/20">
        <Skeleton className="h-12 w-64 mx-auto" />
        <Skeleton className="h-4 w-48 mx-auto" />
      </div>
      <div className="space-y-6">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="space-y-4">
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-[90%]" />
            <Skeleton className="h-4 w-[95%]" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function AuthSkeleton() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-[480px] bg-surface-bright border border-outline-variant/30 rounded-[40px] p-8 md:p-12 space-y-8">
        <div className="text-center space-y-4">
          <Skeleton className="h-10 w-48 mx-auto" />
          <Skeleton className="h-4 w-64 mx-auto" />
        </div>
        <div className="space-y-5">
          <Skeleton className="h-14 w-full rounded-2xl" />
          <Skeleton className="h-14 w-full rounded-2xl" />
          <Skeleton className="h-14 w-full rounded-full mt-4" />
        </div>
        <Skeleton className="h-4 w-48 mx-auto mt-8" />
      </div>
    </div>
  );
}
