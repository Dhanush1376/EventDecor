import React from 'react';
import { SkeletonBox, SkeletonTextLine, SkeletonBadge } from '../../ui/Skeletons';

export function AdminEnterpriseSearchSkeleton() {
  return (
    <div className="w-full space-y-6 text-left admin-section-root">
      {/* 1. Page Header with Tab Navigation */}
      <div className="space-y-3">
        <SkeletonTextLine width="200px" height="26px" />
        <div className="flex items-center gap-6 border-b border-[var(--admin-border-subtle)] pb-3">
          <SkeletonTextLine width="100px" height="15px" />
          <SkeletonTextLine width="180px" height="15px" />
        </div>
      </div>

      {/* 2. Central Search Console Card */}
      <div className="admin-card p-6 border border-[var(--admin-border-strong)] shadow-sm space-y-4">
        <div className="relative max-w-3xl mx-auto">
          <SkeletonBox width="100%" height="52px" rounded="xl" />
        </div>
        <div className="flex items-center justify-center gap-2 pt-1">
          {['All Entities', 'Products', 'Orders', 'Users', 'Shipments'].map((_, idx) => (
            <SkeletonBox key={idx} width="80px" height="26px" rounded="full" />
          ))}
        </div>
      </div>

      {/* 3. 4-Column Search Results Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {['Products', 'Orders', 'Customers', 'Shipments'].map((category, idx) => (
          <div
            key={idx}
            className="admin-card p-4 border border-[var(--admin-border)] rounded-xl space-y-3 flex flex-col h-[380px]"
          >
            {/* Column Header */}
            <div className="flex items-center justify-between pb-2 border-b border-[var(--admin-border-subtle)]">
              <div className="flex items-center gap-2">
                <SkeletonBox width="18px" height="18px" rounded="sm" />
                <SkeletonTextLine width="75px" height="14px" />
              </div>
              <SkeletonBadge width="24px" height="18px" />
            </div>

            {/* Result Items */}
            <div className="space-y-2.5 flex-1 overflow-hidden">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="p-2.5 rounded-lg bg-[var(--admin-surface-muted)] space-y-1.5"
                >
                  <SkeletonTextLine width="85%" height="13px" />
                  <SkeletonTextLine width="55%" height="11px" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
export default AdminEnterpriseSearchSkeleton;
