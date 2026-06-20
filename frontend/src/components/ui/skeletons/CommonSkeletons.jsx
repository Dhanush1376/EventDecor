import React from 'react';
import { Skeleton } from '../SkeletonBase';

// ─── Address Bar Skeleton ───
export function AddressBarSkeleton() {
  return (
    <div className="w-full bg-[#fbf9f6] border-b border-black/10 relative py-3.5 hover:bg-[#f6f2ea] transition-colors">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-8 flex items-center justify-between">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <span className="material-symbols-outlined text-[18px] text-[#8c7335]/30 animate-pulse">
            location_on
          </span>
          <Skeleton className="h-[12px] w-[50%] rounded-md" />
        </div>
        <span className="material-symbols-outlined text-[18px] text-black/10">expand_more</span>
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

export function SearchSuggestionsSkeleton() {
  return (
    <div className="py-2" aria-busy="true" aria-label="Loading search results">
      {Array.from({ length: 4 }).map((_, idx) => (
        <div
          key={idx}
          className="w-full flex items-center gap-4.5 px-6 md:px-8.5 py-4 border-b border-stone-100/30"
        >
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

export function GridSkeleton({ columns = 3, rows = 2, gap = 'gap-6' }) {
  return (
    <div
      className={`grid grid-cols-1 md:grid-cols-${Math.min(2, columns)} lg:grid-cols-${columns} ${gap}`}
    >
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
