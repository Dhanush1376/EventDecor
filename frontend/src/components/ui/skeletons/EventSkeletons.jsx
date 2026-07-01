import React from 'react';
import { Skeleton } from '../SkeletonBase';

// ─── Event Collections Skeleton ───
export function EventCollectionsSkeleton() {
  return (
    <div className="bg-surface min-h-screen text-on-surface">
      {/* Hero Section */}
      <section className="relative h-[60vh] lg:h-[75vh] min-h-[400px] flex items-center justify-center overflow-hidden bg-stone-100">
        <div className="text-center space-y-6 relative z-10 w-full max-w-4xl px-4">
          <Skeleton className="h-4 w-32 mx-auto rounded-full" />
          <Skeleton className="h-[48px] lg:h-[80px] w-[80%] lg:w-[60%] mx-auto rounded-[16px]" />
          <Skeleton className="h-4 w-[70%] lg:w-[50%] mx-auto rounded-full" />
          <Skeleton className="h-12 w-40 mx-auto rounded-full mt-8" />
        </div>
      </section>

      {/* Nav */}
      <div className="max-w-max-width mx-auto px-margin-mobile lg:px-margin-desktop -mt-8 mb-12 relative z-50">
        <div className="bg-white/90 backdrop-blur-xl rounded-[2rem] p-3 lg:p-4 shadow-sm flex flex-col lg:flex-row items-center gap-4 lg:gap-6 border border-black/5">
          <Skeleton className="h-12 lg:h-11 w-full lg:w-72 xl:w-80 rounded-full flex-shrink-0" />
          <div className="hidden lg:flex items-center gap-4 flex-1 justify-center overflow-hidden">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-28 rounded-full flex-shrink-0" />
            ))}
          </div>
          <Skeleton className="h-11 w-48 rounded-full hidden lg:block flex-shrink-0" />
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-max-width mx-auto px-margin-mobile lg:px-margin-desktop relative pb-12 lg:pb-16">
        <div className="flex flex-col lg:flex-row gap-8 xl:gap-12">
          {/* Sidebar */}
          <aside className="hidden lg:block w-full lg:w-64 xl:w-72 flex-shrink-0 pt-2">
            <div className="space-y-8">
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
            </div>
          </aside>

          {/* Grid */}
          <div className="flex-1 min-w-0">
            <div className="mb-8 lg:mb-10 space-y-3 flex flex-col">
              <Skeleton className="h-8 lg:h-10 w-48 lg:w-64 rounded-full mb-1" />
              <Skeleton className="h-4 lg:h-5 w-40 lg:w-48 rounded-full" />
            </div>

            {/* Inline Tabs Mobile */}
            <div className="flex lg:hidden gap-3 mb-8 overflow-x-hidden">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-28 rounded-full flex-shrink-0" />
              ))}
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-4 lg:gap-x-8 gap-y-8 lg:gap-y-12">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex flex-col group">
                  <div className="relative aspect-[4/3] lg:aspect-[3/2] w-full mb-3 lg:mb-4 bg-surface rounded-[16px] lg:rounded-[32px] border border-black/5 overflow-hidden shadow-sm">
                    <Skeleton className="absolute inset-0 w-full h-full !rounded-none" />
                  </div>
                  <div className="flex flex-col flex-1 py-1">
                    <div className="mb-2 lg:mb-4 space-y-2">
                      <Skeleton className="h-2 lg:h-2.5 w-16 lg:w-24 rounded-full" />
                      <Skeleton className="h-4 lg:h-6 w-[80%] rounded-full" />
                    </div>
                    <div className="flex items-center justify-between pt-2 lg:pt-4 border-t border-black/5 mt-auto">
                      <Skeleton className="h-2.5 lg:h-3 w-16 lg:w-20 rounded-full" />
                      <Skeleton className="h-2.5 lg:h-3 w-12 lg:w-16 rounded-full" />
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
      <div className="hidden lg:block pt-32 pb-4 max-w-max-width mx-auto px-margin-desktop">
        <div className="flex gap-3 items-center">
          <Skeleton className="h-[12px] w-28 rounded-full" />
          <Skeleton className="h-[10px] w-3 rounded-full" />
          <Skeleton className="h-[12px] w-40 rounded-full" />
        </div>
      </div>

      <section className="pt-[72px] lg:pt-4 pb-20 max-w-max-width mx-auto px-margin-mobile lg:px-margin-desktop relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-12 lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Left Column */}
          <div className="md:col-span-7 lg:col-span-7 space-y-8">
            <div className="relative">
              <Skeleton className="w-full aspect-[4/3] lg:aspect-[16/10] rounded-[32px] lg:rounded-[48px] overflow-hidden shadow-2xl" />
              <div className="absolute top-4 right-4 flex gap-2">
                <Skeleton className="w-8 h-8 rounded-full !bg-white border border-black/5 shadow-lg" />
                <Skeleton className="w-8 h-8 rounded-full !bg-white border border-black/5 shadow-lg" />
              </div>
            </div>

            <div className="flex gap-4 overflow-x-hidden pb-2">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="w-20 h-20 lg:w-24 lg:h-24 rounded-2xl flex-shrink-0" />
              ))}
            </div>

            <div className="space-y-4 py-6 border-t border-b border-black/5 mt-4">
              <Skeleton className="h-[10px] lg:h-[12px] w-48 rounded-full" />
              <Skeleton className="h-[32px] lg:h-[44px] w-[90%] rounded-full" />
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
          <div className="md:col-span-5 lg:col-span-5 flex flex-col gap-6">
            <div className="bg-white/80 backdrop-blur-md rounded-[2rem] border border-[#C4A87C]/20 p-6 lg:p-8 space-y-6 shadow-sm">
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
    <div className="min-h-screen pt-24 lg:pt-28 pb-20">
      <div className="max-w-3xl mx-auto px-[18px] lg:px-[clamp(22px,4.5vw,72px)]">
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
        <div className="p-6 lg:p-10 rounded-[28px] bg-white border border-outline-variant/10 space-y-6">
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
