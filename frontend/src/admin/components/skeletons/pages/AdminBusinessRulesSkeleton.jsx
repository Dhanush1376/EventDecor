import React from 'react';
import { AdminSkeleton, SkeletonHeader } from '../../ui/Skeletons';

export function AdminBusinessRulesSkeleton() {
  return (
    <div
      className="space-y-6 max-w-7xl mx-auto admin-animate-in"
      aria-busy="true"
      aria-label="Loading business rules"
    >
      {/* Header */}
      <SkeletonHeader titleWidth="w-48" subtitleWidth="w-80" actionWidth="w-32" />

      {/* 3 Automation KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="admin-card p-5 space-y-2.5 rounded-[4px] border border-[var(--admin-border)]"
          >
            <div className="flex items-center justify-between">
              <AdminSkeleton className="w-28 h-3.5 rounded" />
              <AdminSkeleton className="w-8 h-8 rounded-[4px]" />
            </div>
            <AdminSkeleton className="w-20 h-7 rounded" />
            <AdminSkeleton className="w-24 h-3 rounded" />
          </div>
        ))}
      </div>

      {/* Rules List Cards */}
      <div className="admin-card overflow-hidden p-0 rounded-[4px] border border-[var(--admin-border)] divide-y divide-[var(--admin-border-subtle)]">
        {[1, 2, 3, 4].map((r) => (
          <div
            key={r}
            className="p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6"
          >
            <div className="flex items-start gap-5 flex-1">
              <AdminSkeleton className="w-12 h-12 rounded-[var(--admin-radius-lg)] shrink-0" />
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-3">
                  <AdminSkeleton className="w-48 h-5 rounded" />
                  <AdminSkeleton className="w-16 h-5 rounded-full" />
                </div>
                <AdminSkeleton className="w-3/4 h-3.5 rounded" />
                <div className="flex items-center gap-2 pt-1">
                  <AdminSkeleton className="w-24 h-6 rounded" />
                  <AdminSkeleton className="w-20 h-6 rounded" />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <AdminSkeleton className="w-12 h-6 rounded-full" />
              <AdminSkeleton className="w-8 h-8 rounded" />
              <AdminSkeleton className="w-8 h-8 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
