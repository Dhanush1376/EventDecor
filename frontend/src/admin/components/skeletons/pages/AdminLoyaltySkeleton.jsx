import React from 'react';
import { SkeletonBox, SkeletonTextLine, SkeletonBadge } from '../../ui/Skeletons';

export function AdminLoyaltySkeleton({ isRuleBuilder = false }) {
  if (isRuleBuilder) {
    return (
      <div className="p-6 max-w-5xl mx-auto pb-20 text-left admin-section-root space-y-6">
        {/* Header with Back Button */}
        <div className="flex items-center gap-4 mb-6">
          <SkeletonBox width="36px" height="36px" rounded="full" />
          <div className="space-y-1">
            <SkeletonTextLine width="200px" height="22px" />
            <SkeletonTextLine width="280px" height="12px" />
          </div>
        </div>

        {/* 2-Column Split: Rule Form on Left, Outcomes on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-[var(--admin-surface)] p-6 rounded-lg border border-[var(--admin-border)] shadow-sm space-y-4">
            <SkeletonTextLine width="140px" height="16px" className="mb-2" />
            <div className="space-y-2">
              <SkeletonTextLine width="80px" height="11px" />
              <SkeletonBox width="100%" height="38px" rounded="sm" />
            </div>
            <div className="space-y-2">
              <SkeletonTextLine width="90px" height="11px" />
              <SkeletonBox width="100%" height="60px" rounded="sm" />
            </div>
            <div className="pt-2">
              <SkeletonBox width="100%" height="36px" rounded="sm" />
            </div>
          </div>

          <div className="bg-[var(--admin-surface)] p-6 rounded-lg border border-[var(--admin-border)] shadow-sm space-y-4">
            <SkeletonTextLine width="150px" height="16px" className="mb-2" />
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="p-3 bg-[var(--admin-surface-muted)] rounded border border-[var(--admin-border-subtle)] space-y-2"
                >
                  <div className="flex justify-between">
                    <SkeletonTextLine width="100px" height="13px" />
                    <SkeletonBox width="20px" height="20px" rounded="xs" />
                  </div>
                  <SkeletonTextLine width="140px" height="11px" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 text-left admin-section-root">
      {/* 1. Header with Create Campaign Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <SkeletonTextLine width="180px" height="26px" />
          <SkeletonTextLine width="280px" height="13px" />
        </div>
        <SkeletonBox width="140px" height="38px" rounded="sm" />
      </div>

      {/* 2. Campaign Manager List Cards */}
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="admin-card p-5 flex flex-col sm:flex-row justify-between sm:items-center gap-4 border border-[var(--admin-border)] shadow-xs rounded-[4px]"
          >
            <div className="space-y-2 flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <SkeletonTextLine width="160px" height="18px" />
                <SkeletonBadge width="65px" height="20px" />
              </div>
              <div className="flex items-center gap-4 text-xs">
                <SkeletonTextLine width="70px" height="12px" />
                <SkeletonTextLine width="100px" height="12px" />
                <SkeletonTextLine width="120px" height="12px" />
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <SkeletonBox width="85px" height="32px" rounded="sm" />
              <SkeletonBox width="32px" height="32px" rounded="sm" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
export default AdminLoyaltySkeleton;
