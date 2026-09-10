import React from 'react';
import { SkeletonBox, SkeletonTextLine, SkeletonBadge } from '../../ui/Skeletons';

export function AdminReturnDrawerSkeleton() {
  return (
    <div className="p-5 space-y-6 text-left admin-section-root">
      {/* Drawer Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[var(--admin-border-subtle)]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <SkeletonTextLine width="110px" height="18px" />
            <SkeletonBadge width="75px" height="20px" />
          </div>
          <SkeletonTextLine width="140px" height="12px" />
        </div>
        <SkeletonBox width="28px" height="28px" rounded="sm" />
      </div>

      {/* Return Item & Evidence Photos */}
      <div className="p-3.5 rounded border border-[var(--admin-border-subtle)] bg-[var(--admin-surface)] space-y-3">
        <SkeletonTextLine width="120px" height="13px" />
        <div className="flex items-center gap-3">
          <SkeletonBox width="48px" height="48px" rounded="sm" className="shrink-0" />
          <div className="space-y-1 flex-1 min-w-0">
            <SkeletonTextLine width="150px" height="14px" />
            <SkeletonTextLine width="90px" height="11px" />
          </div>
        </div>
        <div className="flex items-center gap-2 pt-1">
          {[1, 2].map((img) => (
            <SkeletonBox key={img} width="48px" height="48px" rounded="sm" />
          ))}
        </div>
      </div>

      {/* Refund Breakdown */}
      <div className="p-3.5 rounded bg-[var(--admin-surface-muted)] space-y-2 text-xs">
        <SkeletonTextLine width="110px" height="13px" className="mb-1" />
        <div className="flex justify-between">
          <SkeletonTextLine width="80px" height="11px" />
          <SkeletonTextLine width="50px" height="11px" />
        </div>
        <div className="flex justify-between">
          <SkeletonTextLine width="90px" height="11px" />
          <SkeletonTextLine width="45px" height="11px" />
        </div>
        <div className="flex justify-between pt-2 border-t border-[var(--admin-border-subtle)]">
          <SkeletonTextLine width="75px" height="13px" />
          <SkeletonTextLine width="60px" height="14px" />
        </div>
      </div>

      {/* Customer Quick Info */}
      <div className="p-3.5 rounded bg-[var(--admin-surface-muted)] space-y-2">
        <div className="flex items-center gap-2.5">
          <SkeletonBox width="30px" height="30px" rounded="full" />
          <div className="space-y-1">
            <SkeletonTextLine width="120px" height="13px" />
            <SkeletonTextLine width="150px" height="11px" />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 pt-2">
        <SkeletonBox width="100%" height="38px" rounded="sm" />
        <SkeletonBox width="100%" height="38px" rounded="sm" />
      </div>
    </div>
  );
}
export default AdminReturnDrawerSkeleton;
