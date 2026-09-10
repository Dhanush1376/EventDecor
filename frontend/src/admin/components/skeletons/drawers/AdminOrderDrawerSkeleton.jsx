import React from 'react';
import { SkeletonBox, SkeletonTextLine, SkeletonBadge } from '../../ui/Skeletons';

export function AdminOrderDrawerSkeleton() {
  return (
    <div className="p-5 space-y-6 text-left admin-section-root">
      {/* Drawer Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[var(--admin-border-subtle)]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <SkeletonTextLine width="110px" height="18px" />
            <SkeletonBadge width="70px" height="20px" />
          </div>
          <SkeletonTextLine width="140px" height="12px" />
        </div>
        <SkeletonBox width="28px" height="28px" rounded="sm" />
      </div>

      {/* Customer Quick Dossier */}
      <div className="p-3.5 rounded bg-[var(--admin-surface-muted)] border border-[var(--admin-border-subtle)] space-y-3">
        <div className="flex items-center gap-3">
          <SkeletonBox width="36px" height="36px" rounded="full" className="shrink-0" />
          <div className="space-y-1 min-w-0 flex-1">
            <SkeletonTextLine width="120px" height="14px" />
            <SkeletonTextLine width="160px" height="11px" />
          </div>
        </div>
        <div className="space-y-1 pt-2 border-t border-[var(--admin-border-subtle)]">
          <SkeletonTextLine width="80px" height="10px" />
          <SkeletonTextLine width="90%" height="12px" />
        </div>
      </div>

      {/* Order Items Stack */}
      <div className="space-y-3">
        <SkeletonTextLine width="100px" height="13px" />
        {[1, 2].map((i) => (
          <div
            key={i}
            className="flex items-center gap-3 p-3 rounded border border-[var(--admin-border-subtle)] bg-[var(--admin-surface)]"
          >
            <SkeletonBox width="44px" height="44px" rounded="sm" className="shrink-0" />
            <div className="space-y-1 flex-1 min-w-0">
              <SkeletonTextLine width="140px" height="13px" />
              <div className="flex justify-between">
                <SkeletonTextLine width="50px" height="11px" />
                <SkeletonTextLine width="60px" height="12px" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Payment Summary */}
      <div className="p-3.5 rounded bg-[var(--admin-surface-muted)] space-y-2 text-xs">
        <div className="flex justify-between">
          <SkeletonTextLine width="60px" height="12px" />
          <SkeletonTextLine width="50px" height="12px" />
        </div>
        <div className="flex justify-between">
          <SkeletonTextLine width="50px" height="12px" />
          <SkeletonTextLine width="40px" height="12px" />
        </div>
        <div className="flex justify-between pt-2 border-t border-[var(--admin-border-subtle)]">
          <SkeletonTextLine width="70px" height="14px" />
          <SkeletonTextLine width="65px" height="15px" />
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
export default AdminOrderDrawerSkeleton;
