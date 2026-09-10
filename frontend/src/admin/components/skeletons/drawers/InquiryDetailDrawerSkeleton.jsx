import React from 'react';
import { SkeletonBox, SkeletonTextLine, SkeletonBadge } from '../../ui/Skeletons';

export function InquiryDetailDrawerSkeleton() {
  return (
    <div className="p-5 space-y-6 text-left admin-section-root">
      {/* Drawer Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[var(--admin-border-subtle)]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <SkeletonTextLine width="130px" height="18px" />
            <SkeletonBadge width="75px" height="20px" />
          </div>
          <SkeletonTextLine width="160px" height="12px" />
        </div>
        <SkeletonBox width="28px" height="28px" rounded="sm" />
      </div>

      {/* Inquiry Requirements Card */}
      <div className="p-4 rounded border border-[var(--admin-border-subtle)] bg-[var(--admin-surface)] space-y-3">
        <SkeletonTextLine width="140px" height="14px" />
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <SkeletonTextLine width="80px" height="12px" />
            <SkeletonTextLine width="90px" height="12px" />
          </div>
          <div className="flex justify-between text-xs">
            <SkeletonTextLine width="70px" height="12px" />
            <SkeletonTextLine width="110px" height="12px" />
          </div>
          <div className="flex justify-between text-xs">
            <SkeletonTextLine width="60px" height="12px" />
            <SkeletonBadge width="65px" height="18px" />
          </div>
        </div>
      </div>

      {/* Reference Images Grid */}
      <div className="space-y-2">
        <SkeletonTextLine width="120px" height="13px" />
        <div className="flex items-center gap-2">
          {[1, 2, 3].map((img) => (
            <SkeletonBox key={img} width="60px" height="60px" rounded="sm" />
          ))}
        </div>
      </div>

      {/* Customer Info */}
      <div className="p-3.5 rounded bg-[var(--admin-surface-muted)] space-y-2">
        <div className="flex items-center gap-3">
          <SkeletonBox width="36px" height="36px" rounded="full" />
          <div className="space-y-1 flex-1 min-w-0">
            <SkeletonTextLine width="130px" height="14px" />
            <SkeletonTextLine width="160px" height="11px" />
          </div>
        </div>
      </div>

      {/* Quotation Composer Box */}
      <div className="p-4 rounded border border-[var(--admin-border-subtle)] bg-[var(--admin-surface-muted)]/40 space-y-3">
        <SkeletonTextLine width="130px" height="14px" />
        <SkeletonBox width="100%" height="40px" rounded="sm" />
        <SkeletonBox width="100%" height="38px" rounded="sm" />
      </div>
    </div>
  );
}
export default InquiryDetailDrawerSkeleton;
