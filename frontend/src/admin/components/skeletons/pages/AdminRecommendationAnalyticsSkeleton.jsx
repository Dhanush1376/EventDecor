import React from 'react';
import { SkeletonBox, SkeletonTextLine, SkeletonBadge } from '../../ui/Skeletons';

export function AdminRecommendationAnalyticsSkeleton() {
  return (
    <div className="space-y-6 text-left admin-section-root">
      {/* 1. Page Header with Title & Sync Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <SkeletonTextLine width="240px" height="26px" className="mb-2" />
          <div className="flex items-center gap-2">
            <SkeletonTextLine width="220px" height="13px" />
            <SkeletonBadge width="90px" height="18px" />
          </div>
        </div>

        <SkeletonBox width="110px" height="36px" rounded="sm" />
      </div>

      {/* 2. 4-Card Customer Telemetry Ledger */}
      <div className="admin-card overflow-hidden text-left relative p-0 !rounded-[4px] border border-[var(--admin-border)] shadow-xs">
        <div className="absolute top-0 left-0 w-full h-[3px] bg-[var(--admin-border-strong)] z-10" />
        <div className="grid grid-cols-2 lg:grid-cols-4 bg-[var(--admin-surface)]">
          {[
            { label: 'Total Interactions', sub: 'Clicks & touches' },
            { label: 'Active Profiles', sub: 'Identified shoppers' },
            { label: 'Avg Global CTR', sub: 'Discovery rate' },
            { label: 'Active Shoppers', sub: 'Engaged right now' },
          ].map((item, idx) => (
            <div
              key={idx}
              className="p-4 sm:p-5 space-y-1.5 border-r border-b lg:border-b-0 border-[var(--admin-border-subtle)]"
            >
              <SkeletonTextLine width="90px" height="11px" />
              <SkeletonTextLine width="75px" height="24px" />
              <SkeletonTextLine width="110px" height="11px" />
            </div>
          ))}
        </div>
      </div>

      {/* 3. Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="admin-card p-5 border border-[var(--admin-border)] rounded-xl space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-[var(--admin-border-subtle)]">
            <SkeletonTextLine width="160px" height="16px" />
            <SkeletonBadge width="65px" height="20px" />
          </div>
          <div className="h-[220px] w-full flex items-end justify-between gap-3 pt-4">
            {[35, 60, 45, 80, 50, 70].map((h, i) => (
              <SkeletonBox key={i} width="100%" height={`${h}%`} rounded="sm" />
            ))}
          </div>
        </div>

        <div className="admin-card p-5 border border-[var(--admin-border)] rounded-xl space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-[var(--admin-border-subtle)]">
            <SkeletonTextLine width="180px" height="16px" />
            <SkeletonBadge width="65px" height="20px" />
          </div>
          <div className="h-[220px] w-full flex items-center justify-center">
            <SkeletonBox width="140px" height="140px" rounded="full" />
          </div>
        </div>
      </div>

      {/* 4. Live Stream Activity Table */}
      <div className="admin-card p-0 overflow-hidden border border-[var(--admin-border)] rounded-xl shadow-xs">
        <div className="p-4 border-b border-[var(--admin-border-subtle)] flex items-center justify-between">
          <SkeletonTextLine width="180px" height="16px" />
          <SkeletonBadge width="90px" height="20px" />
        </div>

        <div className="divide-y divide-[var(--admin-border-subtle)]">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <SkeletonBox width="36px" height="36px" rounded="full" className="shrink-0" />
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <SkeletonTextLine width="130px" height="14px" />
                    <SkeletonBadge width="60px" height="16px" />
                  </div>
                  <SkeletonTextLine width="260px" height="12px" />
                </div>
              </div>
              <SkeletonTextLine width="75px" height="12px" className="shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
export default AdminRecommendationAnalyticsSkeleton;
