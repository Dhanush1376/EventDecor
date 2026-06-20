import React from 'react';
import { Skeleton } from '../SkeletonBase';

// ─── Event Collections Skeleton ───
export function EventCollectionsSkeleton() {
  return (
    <div className="bg-surface min-h-screen text-on-surface">
      {/* Hero Section */}
      <section className="relative min-h-[320px] md:h-[70vh] flex items-center overflow-hidden bg-on-surface-variant">
        <Skeleton className="w-full h-full absolute inset-0 !rounded-none opacity-50" />
        <div className="max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop w-full relative z-10 text-center space-y-4 md:space-y-6">
          <Skeleton className="h-4 w-40 mx-auto rounded-full" />
          <Skeleton className="h-[42px] md:h-[72px] w-[80%] md:w-[60%] mx-auto rounded-[12px]" />
          <Skeleton className="h-4 w-[90%] md:w-[50%] mx-auto rounded-full" />
          <Skeleton className="h-4 w-[70%] md:w-[40%] mx-auto rounded-full" />
        </div>
      </section>

      {/* Nav */}
      <div className="max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop -mt-8 md:-mt-12 mb-8 md:mb-12 relative z-50">
        <div className="bg-white/90 backdrop-blur-xl rounded-[2rem] p-3 md:p-4 shadow-sm flex flex-col lg:flex-row items-center gap-4 lg:gap-6 border border-black/5">
          <Skeleton className="h-11 lg:h-9 w-full lg:w-72 xl:w-80 rounded-full flex-shrink-0" />
          <div className="hidden lg:flex items-center gap-4 flex-1 justify-center">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-8 w-24 rounded-full" />
            ))}
          </div>
          <Skeleton className="h-11 lg:h-9 w-48 xl:w-52 rounded-full hidden lg:block flex-shrink-0" />
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop relative pb-12 md:pb-16">
        <div className="flex flex-col lg:flex-row gap-8 xl:gap-12">
          {/* Sidebar */}
          <aside className="hidden lg:block w-full lg:w-64 xl:w-72 flex-shrink-0 space-y-8 pt-2">
            <Skeleton className="h-6 w-32 mb-6 rounded-full" />
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="h-4 w-24 rounded-full mb-2" />
                {[...Array(4)].map((_, j) => (
                  <div key={j} className="flex items-center gap-3">
                    <Skeleton className="w-5 h-5 rounded-[6px]" />
                    <Skeleton className="h-3 w-32 rounded-full" />
                  </div>
                ))}
              </div>
            ))}
          </aside>

          {/* Grid */}
          <div className="flex-1 min-w-0">
            <div className="mb-8 md:mb-10 space-y-3">
              <Skeleton className="h-8 md:h-10 w-48 md:w-64 rounded-full" />
              <Skeleton className="h-4 md:h-5 w-40 md:w-48 rounded-full" />
            </div>

            {/* Inline Tabs Mobile */}
            <div className="flex lg:hidden gap-3 mb-8 overflow-x-hidden">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-28 rounded-full flex-shrink-0" />
              ))}
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 lg:gap-8 gap-y-8 sm:gap-y-12">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex flex-col group">
                  <div className="relative aspect-[4/3] md:aspect-[3/2] w-full mb-3 md:mb-4 bg-[#fafafa] rounded-[16px] md:rounded-[32px] border border-black/5 shadow-2xs overflow-hidden">
                    <Skeleton className="absolute inset-0 w-full h-full !rounded-none" />
                  </div>
                  <div className="flex flex-col flex-1 py-1">
                    <div className="mb-2 md:mb-4 space-y-2 md:space-y-3">
                      <Skeleton className="h-2.5 md:h-3 w-16 md:w-24 rounded-full" />
                      <Skeleton className="h-4 md:h-5 w-[85%] rounded-full" />
                    </div>
                    <div className="flex items-center justify-between pt-3 md:pt-4 border-t border-black/5 mt-auto">
                      <Skeleton className="h-3 md:h-3.5 w-16 md:w-20 rounded-full" />
                      <Skeleton className="h-3 md:h-3.5 w-12 md:w-16 rounded-full" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// ─── Event Showcases Skeleton ───
export function EventShowcasesSkeleton() {
  return <EventCollectionsSkeleton />;
}

// ─── Event Detail Skeleton ───
export function EventDetailSkeleton() {
  return (
    <div className="bg-[#fbf9f6] min-h-screen font-body">
      {/* Desktop Breadcrumbs Skeleton */}
      <div className="hidden md:block pt-32 pb-4 max-w-max-width mx-auto px-margin-desktop">
        <div className="flex gap-3 items-center">
          <Skeleton className="h-[12px] w-28 rounded-full" />
          <Skeleton className="h-[10px] w-3 rounded-full" />
          <Skeleton className="h-[12px] w-40 rounded-full" />
        </div>
      </div>

      <section className="pt-[72px] md:pt-4 pb-20 max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12">
          {/* Left Column */}
          <div className="lg:col-span-7 space-y-8">
            <div className="relative">
              <Skeleton className="w-full aspect-[4/3] md:aspect-[16/10] rounded-[32px] md:rounded-[48px] overflow-hidden shadow-2xl" />
              <div className="absolute top-4 right-4 flex gap-2">
                <Skeleton className="w-8 h-8 rounded-full !bg-white border border-black/5 shadow-lg" />
                <Skeleton className="w-8 h-8 rounded-full !bg-white border border-black/5 shadow-lg" />
              </div>
            </div>

            <div className="flex gap-4 overflow-x-hidden pb-2">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="w-20 h-20 md:w-24 md:h-24 rounded-2xl flex-shrink-0" />
              ))}
            </div>

            <div className="space-y-4 py-6 border-t border-b border-black/5 mt-4">
              <Skeleton className="h-[10px] md:h-[12px] w-48 rounded-full" />
              <Skeleton className="h-[32px] md:h-[44px] w-[90%] rounded-full" />
              <div className="space-y-2 pt-4">
                <Skeleton className="h-[14px] w-full rounded-full" />
                <Skeleton className="h-[14px] w-[85%] rounded-full" />
                <Skeleton className="h-[14px] w-[60%] rounded-full" />
              </div>
            </div>

            {/* Features Highlight */}
            <div className="p-6 rounded-[2rem] border border-[#C4A87C]/20 bg-[#FAF6F0] space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Skeleton className="w-4 h-4 rounded-full" />
                <Skeleton className="h-[10px] w-56 rounded-full" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1.5">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex gap-2.5 items-center">
                    <Skeleton className="h-4 w-4 rounded-full flex-shrink-0" />
                    <Skeleton className="h-3 w-[80%] rounded-full" />
                  </div>
                ))}
              </div>
            </div>

            {/* Stats Grid */}
            <div className="pt-6">
              <Skeleton className="h-[10px] w-40 mb-6 rounded-full" />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="bg-white border border-stone-200/50 p-4 rounded-2xl space-y-2.5 shadow-2xs"
                  >
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-4 w-4 rounded-full" />
                      <Skeleton className="h-2 w-16 rounded-full" />
                    </div>
                    <Skeleton className="h-[13px] w-24 rounded-full" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column (Customizer Form) */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="bg-white/80 backdrop-blur-md rounded-[2rem] border border-[#C4A87C]/20 p-6 md:p-8 space-y-6 shadow-sm">
              <div className="flex justify-between pb-4 border-b border-black/5">
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-[14px] w-24 rounded-full" />
                  <Skeleton className="h-[28px] w-40 rounded-full" />
                </div>
                <Skeleton className="h-10 w-28 rounded-full" />
              </div>

              {/* Stepper */}
              <div className="flex justify-between items-center px-2 py-2">
                {[...Array(4)].map((_, i) => (
                  <React.Fragment key={i}>
                    <div className="flex flex-col items-center gap-2">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <Skeleton className="h-[10px] w-16 rounded-full" />
                    </div>
                    {i < 3 && <Skeleton className="flex-1 h-0.5 mx-2 rounded-full" />}
                  </React.Fragment>
                ))}
              </div>

              {/* Form Content */}
              <div className="space-y-6 pt-4 bg-stone-50/50 p-5 rounded-3xl border border-stone-200/50">
                <div className="space-y-2">
                  <Skeleton className="h-[10px] w-32 rounded-full" />
                  <Skeleton className="h-[52px] w-full rounded-2xl" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-[10px] w-24 rounded-full" />
                  <Skeleton className="h-[52px] w-full rounded-2xl" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Skeleton className="h-2 w-16" />
                    <Skeleton className="h-12 w-full rounded-full" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-2 w-16" />
                    <Skeleton className="h-12 w-full rounded-full" />
                  </div>
                </div>
              </div>
              <div className="pt-6 mt-4 border-t border-black/5 flex justify-between items-center">
                <div className="space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-8 w-32" />
                </div>
                <Skeleton className="h-12 w-32 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </section>
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
