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
    'aspect-[4/5]',
    'aspect-[3/4]',
  ];

  return (
    <div className="bg-[#fcfbf9] min-h-screen pt-20 lg:pt-28 pb-32 lg:pb-20">
      {/* Editorial Header Hero */}
      <section className="max-w-max-width mx-auto px-margin-mobile lg:px-margin-desktop pt-4 lg:pt-6 mb-12">
        <div className="hidden lg:flex items-center gap-2 mb-6">
          <Skeleton className="h-3 w-12 rounded-full" />
          <Skeleton className="h-3 w-3 rounded-full" />
          <Skeleton className="h-3 w-32 rounded-full" />
        </div>
        <div className="max-w-2xl">
          <Skeleton className="h-3 w-24 mb-4 rounded-full" />
          <Skeleton className="h-[40px] lg:h-[56px] w-[80%] max-w-[400px] mb-6 rounded-[12px]" />
          <Skeleton className="h-5 w-full max-w-[500px] mb-2 rounded-full" />
          <Skeleton className="h-5 w-[80%] max-w-[400px] rounded-full" />
        </div>
      </section>

      {/* Sticky Navigation Bar */}
      <nav className="mb-8 lg:mb-12 px-3 lg:px-margin-desktop max-w-max-width mx-auto">
        <div className="bg-transparent border-none shadow-none rounded-[2rem] py-3 lg:p-4 lg:p-2 w-full flex flex-col lg:flex-row gap-4 lg:gap-6">
          <div className="w-full lg:w-72 xl:w-80 flex items-center gap-1.5 shrink-0">
            <Skeleton className="h-[44px] w-full rounded-full" />
            <Skeleton className="h-11 w-11 rounded-full lg:hidden shrink-0" />
            <Skeleton className="h-11 w-11 rounded-full lg:hidden shrink-0" />
          </div>
          <div className="hidden lg:flex items-center justify-between gap-6 flex-1">
            <div className="flex gap-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-24 rounded-full" />
              ))}
            </div>
            <div className="flex gap-3">
              <Skeleton className="h-[44px] w-48 rounded-full" />
              <Skeleton className="h-[44px] w-40 rounded-full" />
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-max-width mx-auto px-margin-mobile lg:px-margin-desktop">
        <div className="flex flex-col lg:flex-row gap-8 xl:gap-12">
          {/* Sidebar */}
          <aside className="hidden lg:block w-full lg:w-64 xl:w-72 flex-shrink-0">
            <div className="space-y-8">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="space-y-4">
                  <Skeleton className="h-5 w-24 rounded-full mb-4" />
                  {[...Array(4)].map((_, j) => (
                    <div key={j} className="flex items-center gap-3">
                      <Skeleton className="w-5 h-5 rounded-[6px]" />
                      <Skeleton className="h-4 w-32 rounded-full" />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </aside>

          {/* Masonry Grid */}
          <div className="flex-1">
            {/* Mobile Tabs */}
            <div className="flex lg:hidden gap-3 mb-6 overflow-hidden">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-24 rounded-full shrink-0" />
              ))}
            </div>

            <div className="columns-2 lg:columns-2 lg:columns-4 xl:columns-4 gap-2 lg:gap-3 space-y-2 lg:space-y-3">
              {aspectPatterns.map((aspect, i) => (
                <div
                  key={i}
                  className={`break-inside-avoid relative w-full ${aspect} rounded-[16px] lg:rounded-[24px] overflow-hidden bg-surface border border-black/5`}
                >
                  <Skeleton className="absolute inset-0 w-full h-full !rounded-none" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
