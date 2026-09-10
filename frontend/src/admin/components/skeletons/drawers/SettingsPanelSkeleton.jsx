import React from 'react';
import { SkeletonBox, SkeletonTextLine } from '../../ui/Skeletons';

export function SettingsPanelSkeleton({ titleWidth = '180px' }) {
  return (
    <div className="bg-[var(--admin-surface)] rounded-[4px] border border-[var(--admin-border)] shadow-sm p-5 sm:p-6 space-y-6 text-left admin-section-root">
      {/* Panel Header */}
      <div className="border-b border-[var(--admin-border-subtle)] pb-4 flex items-center justify-between">
        <div className="space-y-1.5">
          <SkeletonTextLine width={titleWidth} height="18px" />
          <SkeletonTextLine width="280px" height="12px" />
        </div>
        <SkeletonBox width="90px" height="34px" rounded="sm" />
      </div>

      {/* Feature Control Toggles */}
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center justify-between p-3.5 bg-[var(--admin-surface-muted)] rounded-[4px] border border-[var(--admin-border)]"
          >
            <div className="space-y-1">
              <SkeletonTextLine width="150px" height="14px" />
              <SkeletonTextLine width="240px" height="11px" />
            </div>
            <SkeletonBox width="42px" height="22px" rounded="full" className="shrink-0" />
          </div>
        ))}
      </div>

      {/* Configuration Fields */}
      <div className="space-y-4 pt-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <SkeletonTextLine width="90px" height="12px" />
            <SkeletonBox width="100%" height="40px" rounded="sm" />
          </div>
          <div className="space-y-2">
            <SkeletonTextLine width="100px" height="12px" />
            <SkeletonBox width="100%" height="40px" rounded="sm" />
          </div>
        </div>

        <div className="space-y-2">
          <SkeletonTextLine width="120px" height="12px" />
          <SkeletonBox width="100%" height="40px" rounded="sm" />
        </div>
      </div>
    </div>
  );
}
export default SettingsPanelSkeleton;
