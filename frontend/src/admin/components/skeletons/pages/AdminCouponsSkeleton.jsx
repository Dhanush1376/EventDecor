import React from 'react';
import { SkeletonBox, SkeletonTextLine, SkeletonBadge } from '../../ui/Skeletons';

export function AdminCouponCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div
          key={i}
          className="relative overflow-hidden rounded-[8px] p-3.5 shadow-xs border border-[var(--admin-border)] bg-[var(--admin-surface)] flex flex-col gap-3"
        >
          {/* Top Row: Coupon Code & Discount Badge */}
          <div className="flex items-center justify-between gap-2 pt-1 pl-6">
            <div className="space-y-1">
              <SkeletonTextLine width="110px" height="18px" />
              <SkeletonTextLine width="70px" height="11px" />
            </div>
            <SkeletonBadge width="65px" height="24px" />
          </div>

          {/* Description Text */}
          <SkeletonTextLine width="85%" height="12px" className="mt-1" />

          {/* Usage Limit Progress Bar */}
          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between items-center text-[11px]">
              <SkeletonTextLine width="50px" height="10px" />
              <SkeletonTextLine width="60px" height="10px" />
            </div>
            <SkeletonBox width="100%" height="6px" rounded="full" />
          </div>

          {/* Bottom Row: Validity Date & Toggle Active */}
          <div className="flex items-center justify-between pt-2 border-t border-[var(--admin-border-subtle)]">
            <div className="flex items-center gap-1.5">
              <SkeletonBox width="14px" height="14px" rounded="full" />
              <SkeletonTextLine width="90px" height="11px" />
            </div>
            <SkeletonBox width="36px" height="20px" rounded="full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function AdminCouponsSkeleton() {
  return (
    <div className="space-y-6 pb-12 sm:pb-8 text-left admin-section-root">
      {/* 1. Header with Title & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <SkeletonTextLine width="180px" height="26px" className="mb-2" />
          <div className="flex items-center gap-2">
            <SkeletonBadge width="90px" height="18px" />
            <SkeletonBadge width="70px" height="18px" />
            <SkeletonBadge width="80px" height="18px" />
          </div>
        </div>
      </div>

      {/* 2. Sticky 42px Search & Controls Bar */}
      <div className="space-y-2.5">
        <div className="flex flex-row items-center gap-2 w-full">
          {/* Search Bar */}
          <div className="flex-1 min-w-0 bg-[var(--admin-surface-muted)] rounded-[4px] border border-[var(--admin-border)] flex items-center px-3 h-[42px]">
            <SkeletonBox width="18px" height="18px" rounded="full" className="shrink-0" />
            <SkeletonTextLine width="240px" height="14px" className="ml-2" />
          </div>

          {/* Status Segmented Pill Switcher */}
          <div className="hidden sm:flex items-center gap-1 p-1 bg-[var(--admin-surface-muted)] rounded-[4px] border border-[var(--admin-border)] h-[42px]">
            {['All', 'Active', 'Inactive', 'Expired'].map((_, idx) => (
              <SkeletonBox key={idx} width="70px" height="32px" rounded="sm" />
            ))}
          </div>

          {/* Filters Button */}
          <div className="h-[42px] px-3.5 flex items-center gap-1.5 rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-muted)] shrink-0">
            <SkeletonBox width="18px" height="18px" rounded="sm" />
            <SkeletonTextLine width="50px" height="14px" className="hidden sm:inline-block" />
          </div>

          {/* Create Coupon Button */}
          <div className="h-[42px] px-3.5 flex items-center gap-1.5 rounded-[4px] bg-[var(--admin-accent)]/30 shrink-0">
            <SkeletonBox width="18px" height="18px" rounded="sm" />
            <SkeletonTextLine width="90px" height="14px" className="hidden sm:inline-block" />
          </div>
        </div>
      </div>

      {/* 3. Ticket-Style Coupon Cards Grid */}
      <AdminCouponCardsSkeleton />
    </div>
  );
}
export default AdminCouponsSkeleton;
