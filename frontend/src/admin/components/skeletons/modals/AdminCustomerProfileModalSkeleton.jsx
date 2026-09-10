import React from 'react';
import { SkeletonBox, SkeletonTextLine, SkeletonBadge } from '../../ui/Skeletons';

export function AdminCustomerProfileModalSkeleton() {
  return (
    <div className="space-y-5 text-left admin-section-root">
      {/* 1. Modal Header */}
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-[var(--admin-border-subtle)]">
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          <SkeletonBox width="44px" height="44px" rounded="full" className="shrink-0" />
          <div className="space-y-1.5 min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <SkeletonTextLine width="160px" height="18px" />
              <SkeletonBadge width="65px" height="18px" />
            </div>
            <div className="flex items-center gap-2">
              <SkeletonBadge width="70px" height="16px" />
              <SkeletonTextLine width="110px" height="11px" />
              <SkeletonBadge width="75px" height="16px" />
            </div>
          </div>
        </div>

        <SkeletonBox width="32px" height="32px" rounded="sm" />
      </div>

      {/* 2. 4 Top KPI Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Spent', width: '90px' },
          { label: 'Orders Placed', width: '40px' },
          { label: 'Wallet Balance', width: '70px' },
          { label: 'Siri Coins', width: '50px' },
        ].map((kpi, idx) => (
          <div
            key={idx}
            className="p-3.5 rounded-[4px] bg-[var(--admin-surface)] border border-[var(--admin-border)] shadow-xs space-y-1.5"
          >
            <SkeletonTextLine width="65px" height="10px" />
            <SkeletonTextLine width={kpi.width} height="20px" />
          </div>
        ))}
      </div>

      {/* 3. 2-Column Info Strip: Contact & Address */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 rounded-[4px] bg-[var(--admin-surface)] border border-[var(--admin-border)] shadow-xs space-y-2.5">
          <SkeletonTextLine width="100px" height="13px" />
          <SkeletonTextLine width="150px" height="12px" />
          <SkeletonTextLine width="120px" height="12px" />
        </div>

        <div className="p-4 rounded-[4px] bg-[var(--admin-surface)] border border-[var(--admin-border)] shadow-xs space-y-2.5">
          <SkeletonTextLine width="90px" height="13px" />
          <SkeletonTextLine width="85%" height="12px" />
          <SkeletonTextLine width="65%" height="12px" />
        </div>
      </div>

      {/* 4. Order History Table Preview */}
      <div className="rounded-[4px] bg-[var(--admin-surface)] border border-[var(--admin-border)] shadow-xs overflow-hidden">
        <div className="p-3.5 border-b border-[var(--admin-border-subtle)] flex items-center justify-between">
          <SkeletonTextLine width="130px" height="14px" />
          <SkeletonBadge width="50px" height="18px" />
        </div>
        <div className="divide-y divide-[var(--admin-border-subtle)]">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-3 flex items-center justify-between text-xs">
              <div className="space-y-1">
                <SkeletonTextLine width="90px" height="13px" />
                <SkeletonTextLine width="110px" height="10px" />
              </div>
              <SkeletonTextLine width="65px" height="13px" />
              <SkeletonBadge width="70px" height="18px" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
export default AdminCustomerProfileModalSkeleton;
