import React from 'react';
import { SkeletonBox, SkeletonTextLine, SkeletonBadge } from '../../ui/Skeletons';

export function AdminContentSkeleton() {
  return (
    <div className="space-y-6 relative font-sans text-left admin-section-root">
      {/* 1. Header with Live Sync badge & count */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <SkeletonTextLine width="160px" height="26px" className="mb-2" />
          <div className="flex items-center gap-2">
            <SkeletonBadge width="140px" height="18px" />
            <SkeletonBadge width="100px" height="18px" />
          </div>
        </div>
      </div>

      {/* 2. Sticky 42px Toolbar */}
      <div className="flex flex-row items-center gap-2 w-full">
        {/* Search Bar */}
        <div className="flex-1 min-w-0 bg-[var(--admin-surface-muted)] rounded-[4px] border border-[var(--admin-border)] flex items-center px-3 h-[42px]">
          <SkeletonBox width="18px" height="18px" rounded="full" className="shrink-0" />
          <SkeletonTextLine width="260px" height="14px" className="ml-2" />
        </div>

        {/* Preview Button */}
        <div className="h-[42px] px-3.5 rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface)] flex items-center gap-1.5 shrink-0">
          <SkeletonBox width="16px" height="16px" rounded="sm" />
          <SkeletonTextLine width="50px" height="13px" className="hidden sm:inline-block" />
        </div>

        {/* Publish Live Button */}
        <div className="h-[42px] px-4 rounded-[4px] bg-[var(--admin-accent)]/30 flex items-center gap-1.5 shrink-0">
          <SkeletonBox width="16px" height="16px" rounded="sm" />
          <SkeletonTextLine width="75px" height="13px" className="hidden sm:inline-block" />
        </div>
      </div>

      {/* 3. 2-Column Split Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] xl:grid-cols-[300px_1fr] gap-6 items-start">
        {/* Left Column: Storefront Navigation (Desktop) */}
        <div className="hidden lg:flex flex-col bg-[var(--admin-surface)] rounded-md border border-[var(--admin-border)] h-[600px] shadow-2xs overflow-hidden shrink-0">
          <div className="px-3.5 py-3 border-b border-[var(--admin-border-subtle)] flex items-center justify-between bg-[var(--admin-surface)]">
            <SkeletonTextLine width="120px" height="13px" />
            <SkeletonBadge width="55px" height="18px" />
          </div>

          <div className="p-3 space-y-4 flex-1 overflow-y-auto">
            {/* Category 1 */}
            <div className="space-y-1.5">
              <SkeletonTextLine width="90px" height="11px" className="px-1" />
              <div className="flex items-center gap-2 p-2 rounded bg-[var(--admin-accent)]/10 border-l-2 border-[var(--admin-accent)]">
                <SkeletonBox width="18px" height="18px" rounded="sm" />
                <SkeletonTextLine width="130px" height="13px" />
              </div>
            </div>

            {/* Category 2 */}
            <div className="space-y-1.5">
              <SkeletonTextLine width="60px" height="11px" className="px-1" />
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 p-2 rounded hover:bg-[var(--admin-surface-muted)]"
                >
                  <SkeletonBox width="18px" height="18px" rounded="sm" />
                  <SkeletonTextLine width="110px" height="13px" />
                </div>
              ))}
            </div>

            {/* Category 3 */}
            <div className="space-y-1.5">
              <SkeletonTextLine width="100px" height="11px" className="px-1" />
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 p-2 rounded hover:bg-[var(--admin-surface-muted)]"
                >
                  <SkeletonBox width="18px" height="18px" rounded="sm" />
                  <SkeletonTextLine width="120px" height="13px" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Section Editor Panel */}
        <div className="bg-[var(--admin-surface)] rounded-md border border-[var(--admin-border)] p-6 space-y-6 shadow-2xs">
          {/* Section Panel Header */}
          <div className="border-b border-[var(--admin-border-subtle)] pb-4 space-y-1.5">
            <SkeletonTextLine width="200px" height="18px" />
            <SkeletonTextLine width="320px" height="13px" />
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            <div className="space-y-2">
              <SkeletonTextLine width="100px" height="12px" />
              <SkeletonBox width="100%" height="40px" rounded="sm" />
            </div>

            <div className="space-y-2">
              <SkeletonTextLine width="130px" height="12px" />
              <SkeletonBox width="100%" height="70px" rounded="sm" />
            </div>

            {/* Banner Media Uploader Wireframe */}
            <div className="space-y-2 pt-2">
              <SkeletonTextLine width="140px" height="12px" />
              <div className="h-[140px] rounded border border-dashed border-[var(--admin-border-strong)] flex flex-col items-center justify-center gap-2 bg-[var(--admin-surface-muted)]">
                <SkeletonBox width="36px" height="36px" rounded="full" />
                <SkeletonTextLine width="160px" height="12px" />
              </div>
            </div>

            {/* Toggle Switch Row */}
            <div className="flex items-center justify-between p-3 rounded bg-[var(--admin-surface-muted)] border border-[var(--admin-border)]">
              <div className="space-y-1">
                <SkeletonTextLine width="150px" height="13px" />
                <SkeletonTextLine width="220px" height="11px" />
              </div>
              <SkeletonBox width="40px" height="22px" rounded="full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
export default AdminContentSkeleton;
