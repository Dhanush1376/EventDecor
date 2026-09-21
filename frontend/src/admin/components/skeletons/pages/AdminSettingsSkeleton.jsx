import React from 'react';
import { SkeletonBox, SkeletonTextLine, SkeletonBadge } from '../../ui/Skeletons';

export function AdminSettingsSkeleton({ hideHeader = false } = {}) {
  return (
    <div className="space-y-6 text-left admin-section-root">
      {/* 1. Page Header with Title and Search Input */}
      {!hideHeader && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <SkeletonTextLine width="130px" height="26px" className="mb-2" />
            <SkeletonTextLine width="200px" height="13px" />
          </div>

          <div className="w-full sm:w-[320px] bg-[var(--admin-surface-muted)] rounded-[4px] border border-[var(--admin-border)] flex items-center px-3 h-[38px]">
            <SkeletonBox width="16px" height="16px" rounded="full" className="shrink-0" />
            <SkeletonTextLine width="160px" height="13px" className="ml-2" />
          </div>
        </div>
      )}

      {/* 2. 2-Column Split: Settings Menu on Left, Panel on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 items-start">
        {/* Left Navigation Card (Desktop Sidebar) */}
        <div className="bg-[var(--admin-surface)] rounded-[4px] border border-[var(--admin-border)] shadow-sm overflow-hidden h-fit">
          {/* Card Header */}
          <div className="px-3.5 py-3 border-b border-[var(--admin-border-subtle)] bg-[var(--admin-bg-subtle)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SkeletonBox width="18px" height="18px" rounded="sm" />
              <SkeletonTextLine width="90px" height="14px" />
            </div>
            <SkeletonBadge width="28px" height="18px" />
          </div>

          {/* Settings Menu Items List */}
          <div className="p-2 space-y-1">
            {[
              'Profile & Account',
              'Store Details & Legal',
              'Shipping & Orders',
              'Payments & Taxes',
              'Returns & Exchanges',
              'Loyalty & Rewards',
              'Storefront & Customer Auth',
              'AI & Visual Search',
              'Security & Operations',
            ].map((name, idx) => (
              <div
                key={idx}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-[4px] ${
                  idx === 0
                    ? 'bg-[var(--admin-accent)]/10 border-l-2 border-[var(--admin-accent)]'
                    : ''
                }`}
              >
                <SkeletonBox width="18px" height="18px" rounded="sm" className="shrink-0" />
                <SkeletonTextLine width={`${85 + (idx % 4) * 15}px`} height="13px" />
              </div>
            ))}
          </div>
        </div>

        {/* Right Content Panel Skeleton */}
        <div className="bg-[var(--admin-surface)] rounded-[4px] border border-[var(--admin-border)] shadow-sm p-5 sm:p-6 space-y-6">
          {/* Panel Header */}
          <div className="border-b border-[var(--admin-border-subtle)] pb-4 flex items-center justify-between">
            <div className="space-y-1.5">
              <SkeletonTextLine width="180px" height="18px" />
              <SkeletonTextLine width="260px" height="12px" />
            </div>
            <SkeletonBox width="90px" height="34px" rounded="sm" />
          </div>

          {/* Form Fields & Toggles */}
          <div className="space-y-5">
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
              <SkeletonTextLine width="110px" height="12px" />
              <SkeletonBox width="100%" height="40px" rounded="sm" />
            </div>

            {/* Feature Toggle Rows */}
            <div className="space-y-3 pt-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3.5 bg-[var(--admin-surface-muted)] rounded-[4px] border border-[var(--admin-border)]"
                >
                  <div className="space-y-1">
                    <SkeletonTextLine width="140px" height="14px" />
                    <SkeletonTextLine width="240px" height="11px" />
                  </div>
                  <SkeletonBox width="42px" height="22px" rounded="full" className="shrink-0" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
export default AdminSettingsSkeleton;
