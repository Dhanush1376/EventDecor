import React from 'react';
import { SkeletonBox, SkeletonTextLine, SkeletonBadge } from '../../ui/Skeletons';

export function AdminTeamSkeleton({ hideHeader = false } = {}) {
  return (
    <div className="space-y-6 pb-12 sm:pb-8 text-left admin-section-root">
      {/* 1. Header with Member Counts */}
      {!hideHeader && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <SkeletonTextLine width="260px" height="26px" className="mb-2" />
            <div className="flex items-center gap-2">
              <SkeletonBadge width="140px" height="18px" />
              <SkeletonBadge width="110px" height="18px" />
            </div>
          </div>
        </div>
      )}

      {/* 2. Sticky 42px Controls Bar */}
      <div className="space-y-2.5">
        <div className="flex flex-row items-center gap-2 w-full">
          {/* Tab Segmented Pill Switcher */}
          <div className="flex items-center gap-1 p-1 bg-[var(--admin-surface-muted)] rounded-[4px] border border-[var(--admin-border)] h-[42px]">
            {['Active', 'Pending', 'History'].map((_, idx) => (
              <SkeletonBox key={idx} width="70px" height="32px" rounded="sm" />
            ))}
          </div>

          {/* Search Input */}
          <div className="flex-1 min-w-0 bg-[var(--admin-surface-muted)] rounded-[4px] border border-[var(--admin-border)] flex items-center px-3 h-[42px]">
            <SkeletonBox width="18px" height="18px" rounded="full" className="shrink-0" />
            <SkeletonTextLine width="200px" height="14px" className="ml-2" />
          </div>

          {/* Invite Member Button */}
          <div className="h-[42px] px-3.5 rounded-[4px] bg-[var(--admin-accent)]/30 flex items-center gap-1.5 shrink-0">
            <SkeletonBox width="16px" height="16px" rounded="sm" />
            <SkeletonTextLine width="80px" height="14px" className="hidden sm:inline-block" />
          </div>
        </div>
      </div>

      {/* 3. 3-Column Team Members Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="admin-card p-6 flex flex-col justify-between gap-6 border border-[var(--admin-border)] shadow-xs rounded-[4px]"
          >
            <div className="flex items-start gap-4">
              {/* Avatar Box with Status Dot */}
              <div className="relative shrink-0">
                <SkeletonBox width="56px" height="56px" rounded="lg" />
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-[var(--admin-surface)] rounded-full flex items-center justify-center shadow-xs">
                  <SkeletonBox width="10px" height="10px" rounded="full" />
                </div>
              </div>

              {/* Identity Details */}
              <div className="min-w-0 flex-1 space-y-1.5">
                <SkeletonTextLine width="130px" height="16px" />
                <SkeletonBadge width="65px" height="18px" />
                <SkeletonTextLine width="160px" height="12px" />
              </div>
            </div>

            {/* Controls Area */}
            <div className="pt-4 border-t border-[var(--admin-border-subtle)] space-y-2.5">
              <div className="flex items-center justify-between">
                <SkeletonTextLine width="80px" height="10px" />
                <SkeletonTextLine width="40px" height="10px" />
              </div>
              <div className="flex items-center gap-2">
                <SkeletonBox width="100%" height="34px" rounded="sm" />
                <SkeletonBox width="34px" height="34px" rounded="sm" className="shrink-0" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
export default AdminTeamSkeleton;
