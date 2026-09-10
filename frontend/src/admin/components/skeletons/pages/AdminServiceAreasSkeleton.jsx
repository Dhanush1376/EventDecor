import React from 'react';
import { SkeletonBox, SkeletonTextLine, SkeletonBadge } from '../../ui/Skeletons';

export function AdminServiceAreasSkeleton() {
  return (
    <div className="max-w-[900px] mx-auto space-y-6 text-left admin-section-root">
      {/* 1. Header with Back Button and Add Area Action */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <SkeletonBox width="40px" height="40px" rounded="full" className="shrink-0" />
          <div className="space-y-1">
            <SkeletonTextLine width="150px" height="20px" />
            <SkeletonTextLine width="200px" height="12px" />
          </div>
        </div>
        <SkeletonBox width="110px" height="38px" rounded="xl" />
      </div>

      {/* 2. Interactive Map Preview Card */}
      <div className="admin-card border border-[var(--admin-border)] rounded-2xl overflow-hidden p-0">
        <div className="h-[300px] bg-[var(--admin-surface-muted)] flex items-center justify-center relative">
          <div className="flex flex-col items-center gap-3">
            <SkeletonBox width="56px" height="56px" rounded="xl" />
            <SkeletonTextLine width="130px" height="14px" />
            <SkeletonTextLine width="240px" height="11px" />
          </div>
        </div>
      </div>

      {/* 3. Service Areas List Cards */}
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="admin-card p-4 rounded-xl border border-[var(--admin-border)] shadow-xs flex items-center justify-between"
          >
            <div className="space-y-1.5 min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <SkeletonTextLine width="140px" height="16px" />
                <SkeletonBadge width="60px" height="18px" />
              </div>
              <SkeletonTextLine width="260px" height="12px" />
              <SkeletonTextLine width="160px" height="11px" />
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <SkeletonBox width="38px" height="20px" rounded="full" />
              <SkeletonBox width="32px" height="32px" rounded="sm" />
              <SkeletonBox width="32px" height="32px" rounded="sm" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
export default AdminServiceAreasSkeleton;
