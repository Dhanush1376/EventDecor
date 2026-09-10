import React from 'react';
import { SkeletonBox, SkeletonTextLine, SkeletonBadge } from '../../ui/Skeletons';

export function AdminCreateCouponSkeleton() {
  return (
    <div className="flex flex-col gap-4 sm:gap-6 max-w-7xl mx-auto pb-16 sm:pb-0 text-left admin-section-root">
      {/* 1. Header with Back Button and Progress Indicator */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <SkeletonBox width="32px" height="32px" rounded="sm" className="shrink-0" />
          <div>
            <SkeletonTextLine width="130px" height="20px" className="mb-1" />
            <SkeletonTextLine width="260px" height="12px" />
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-3">
          <SkeletonBadge width="110px" height="24px" />
        </div>
      </div>

      {/* 2. 4-Step Guided Progress Stepper */}
      <div className="bg-[var(--admin-surface)] p-3.5 rounded-[4px] border border-[var(--admin-border)] shadow-xs">
        <div className="grid grid-cols-4 gap-2">
          {['Basic Info', 'Targeting', 'Limits', 'Review'].map((_, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <SkeletonBox width="24px" height="24px" rounded="full" className="shrink-0" />
              <div className="hidden md:block space-y-1 flex-1">
                <SkeletonTextLine width="50px" height="10px" />
                <SkeletonTextLine width="70px" height="12px" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Main Grid: Form wizard on left, real-time ticket preview on right */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 items-start">
        {/* Form Container */}
        <div className="bg-[var(--admin-surface)] rounded-[4px] border border-[var(--admin-border)] shadow-xs p-4 sm:p-6 space-y-6">
          <div className="space-y-4">
            <SkeletonTextLine width="160px" height="16px" className="mb-3" />

            <div className="space-y-2">
              <SkeletonTextLine width="90px" height="12px" />
              <SkeletonBox width="100%" height="40px" rounded="sm" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <SkeletonTextLine width="110px" height="12px" />
                <SkeletonBox width="100%" height="40px" rounded="sm" />
              </div>
              <div className="space-y-2">
                <SkeletonTextLine width="100px" height="12px" />
                <SkeletonBox width="100%" height="40px" rounded="sm" />
              </div>
            </div>

            <div className="space-y-2">
              <SkeletonTextLine width="120px" height="12px" />
              <SkeletonBox width="100%" height="70px" rounded="sm" />
            </div>
          </div>

          {/* Stepper Footer Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-[var(--admin-border-subtle)]">
            <SkeletonBox width="80px" height="38px" rounded="sm" />
            <SkeletonBox width="100px" height="38px" rounded="sm" />
          </div>
        </div>

        {/* Sticky Live Preview Ticket Card on Right */}
        <div className="hidden lg:block space-y-3">
          <SkeletonTextLine width="110px" height="14px" />
          <div className="relative overflow-hidden rounded-[8px] p-5 shadow-xs border border-[var(--admin-border)] bg-[var(--admin-surface)] space-y-4">
            <div className="flex items-center justify-between">
              <SkeletonTextLine width="120px" height="22px" />
              <SkeletonBadge width="75px" height="26px" />
            </div>
            <SkeletonTextLine width="90%" height="13px" />
            <div className="space-y-2 pt-2 border-t border-[var(--admin-border-subtle)]">
              <div className="flex justify-between">
                <SkeletonTextLine width="80px" height="11px" />
                <SkeletonTextLine width="60px" height="11px" />
              </div>
              <SkeletonBox width="100%" height="6px" rounded="full" />
            </div>
            <div className="pt-2 border-t border-[var(--admin-border-subtle)] flex items-center justify-between">
              <SkeletonTextLine width="100px" height="11px" />
              <SkeletonBadge width="60px" height="18px" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
export default AdminCreateCouponSkeleton;
