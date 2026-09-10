import React from 'react';
import { SkeletonBox, SkeletonTextLine, SkeletonBadge } from '../../ui/Skeletons';

export function AdminReviewCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="relative overflow-hidden rounded-[8px] p-4 shadow-xs border border-[var(--admin-border)] bg-[var(--admin-surface)] flex flex-col gap-3.5"
        >
          {/* Header: ID, Customer & Stars */}
          <div className="flex justify-between items-start gap-2 pl-4">
            <div className="min-w-0 flex-1 space-y-1">
              <SkeletonTextLine width="90px" height="14px" />
              <SkeletonTextLine width="160px" height="12px" />
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {[1, 2, 3, 4, 5].map((s) => (
                <SkeletonBox key={s} width="14px" height="14px" rounded="full" />
              ))}
            </div>
          </div>

          {/* Product Link Banner */}
          <div className="flex items-center gap-2.5 p-2 bg-[var(--admin-surface-muted)] rounded border border-[var(--admin-border-subtle)]">
            <SkeletonBox width="36px" height="36px" rounded="sm" className="shrink-0" />
            <div className="space-y-1 flex-1 min-w-0">
              <SkeletonTextLine width="180px" height="13px" />
              <SkeletonTextLine width="100px" height="10px" />
            </div>
          </div>

          {/* Comment Text */}
          <div className="space-y-1.5">
            <SkeletonTextLine width="100%" height="13px" />
            <SkeletonTextLine width="85%" height="13px" />
          </div>

          {/* Photo Thumbnails Row */}
          <div className="flex items-center gap-2 pt-1">
            {[1, 2, 3].map((img) => (
              <SkeletonBox key={img} width="52px" height="52px" rounded="sm" />
            ))}
          </div>

          {/* Actions Bar */}
          <div className="flex items-center justify-between pt-3 border-t border-[var(--admin-border-subtle)]">
            <SkeletonTextLine width="80px" height="11px" />
            <div className="flex items-center gap-2">
              <SkeletonBox width="70px" height="28px" rounded="sm" />
              <SkeletonBox width="70px" height="28px" rounded="sm" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function AdminReviewsSkeleton() {
  return (
    <div className="space-y-6 pb-12 sm:pb-8 text-left admin-section-root">
      {/* 1. Page Header with Title & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <SkeletonTextLine width="240px" height="26px" className="mb-2" />
          <div className="flex items-center gap-2">
            <SkeletonBadge width="110px" height="18px" />
            <SkeletonBadge width="120px" height="18px" />
            <SkeletonBadge width="90px" height="18px" />
          </div>
        </div>
      </div>

      {/* 2. Sticky 42px Controls Bar */}
      <div className="space-y-2.5">
        <div className="flex flex-row items-center gap-2 w-full">
          {/* Search Input */}
          <div className="flex-1 min-w-0 bg-[var(--admin-surface-muted)] rounded-[4px] border border-[var(--admin-border)] flex items-center px-3 h-[42px]">
            <SkeletonBox width="18px" height="18px" rounded="full" className="shrink-0" />
            <SkeletonTextLine width="180px" height="14px" className="ml-2" />
          </div>

          {/* Tab Filter Switcher */}
          <div className="hidden sm:flex items-center gap-1 p-1 bg-[var(--admin-surface-muted)] rounded-[4px] border border-[var(--admin-border)] h-[42px]">
            {['All', 'Pending', 'Approved', 'Rejected'].map((_, idx) => (
              <SkeletonBox key={idx} width="75px" height="32px" rounded="sm" />
            ))}
          </div>
        </div>
      </div>

      {/* 3. 2-Column Review Cards Grid */}
      <AdminReviewCardsSkeleton />
    </div>
  );
}
export default AdminReviewsSkeleton;
