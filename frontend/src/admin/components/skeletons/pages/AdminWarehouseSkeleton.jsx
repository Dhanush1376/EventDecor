import React from 'react';
import { SkeletonBox, SkeletonTextLine, SkeletonBadge } from '../../ui/Skeletons';

export function AdminWarehouseSkeleton() {
  return (
    <div className="space-y-6 text-left admin-section-root">
      {/* 1. Page Header */}
      <div>
        <SkeletonTextLine width="180px" height="26px" className="mb-2" />
        <SkeletonTextLine width="320px" height="13px" />
      </div>

      {/* 2. Smart Filter Tabs */}
      <div className="flex border-b border-[var(--admin-border-subtle)] overflow-x-auto gap-4 pb-2">
        {['Scan Item', 'Receive', 'Pick', 'Pack', 'Dispatch', 'Stock Count'].map((tab, idx) => (
          <div key={idx} className="flex items-center gap-2 px-4 py-2 shrink-0">
            <SkeletonBox width="18px" height="18px" rounded="sm" />
            <SkeletonTextLine width="65px" height="14px" />
          </div>
        ))}
      </div>

      {/* 3. Scanner View Grid (2 cols left, 1 col right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Rapid Barcode Scanner Card */}
          <div className="admin-card p-6 shadow-md border border-[var(--admin-border-strong)] space-y-4">
            <div className="flex items-center gap-2">
              <SkeletonBox width="20px" height="20px" rounded="sm" />
              <SkeletonTextLine width="170px" height="16px" />
            </div>

            <div className="relative">
              <SkeletonBox width="100%" height="56px" rounded="xl" />
            </div>
          </div>

          {/* Quick Operations Table / Inventory List */}
          <div className="admin-card p-5 border border-[var(--admin-border)] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <SkeletonTextLine width="140px" height="15px" />
              <SkeletonBadge width="60px" height="20px" />
            </div>

            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 rounded bg-[var(--admin-surface-muted)] border border-[var(--admin-border-subtle)]"
                >
                  <div className="flex items-center gap-3">
                    <SkeletonBox width="36px" height="36px" rounded="sm" />
                    <div className="space-y-1">
                      <SkeletonTextLine width="140px" height="13px" />
                      <SkeletonTextLine width="80px" height="11px" />
                    </div>
                  </div>
                  <SkeletonBadge width="70px" height="22px" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Live Scan Feed Activity Card */}
        <div className="space-y-4">
          <div className="admin-card p-5 border border-[var(--admin-border)] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SkeletonBox width="16px" height="16px" rounded="full" />
                <SkeletonTextLine width="110px" height="15px" />
              </div>
              <SkeletonBadge width="40px" height="18px" />
            </div>

            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="flex items-start gap-2.5 pb-2.5 border-b border-[var(--admin-border-subtle)]"
                >
                  <SkeletonBox width="8px" height="8px" rounded="full" className="mt-1 shrink-0" />
                  <div className="space-y-1 flex-1 min-w-0">
                    <SkeletonTextLine width="85%" height="12px" />
                    <div className="flex justify-between">
                      <SkeletonTextLine width="40px" height="10px" />
                      <SkeletonTextLine width="50px" height="10px" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
export default AdminWarehouseSkeleton;
