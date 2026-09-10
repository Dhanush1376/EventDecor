import React from 'react';
import { AdminSkeleton, SkeletonButton } from '../../ui/Skeletons';

export function AdminDashboardSkeleton() {
  return (
    <div
      className="space-y-6 pb-8 admin-animate-in"
      aria-busy="true"
      aria-label="Loading dashboard"
    >
      {/* Real Dashboard Header with Period Switcher & Sync Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <AdminSkeleton className="w-48 h-7 rounded-[4px]" />
          <div className="flex items-center gap-2">
            <AdminSkeleton className="w-24 h-4 rounded" />
            <AdminSkeleton className="w-2 h-2 rounded-full" />
            <AdminSkeleton className="w-32 h-4 rounded" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* 42px Period switcher */}
          <div className="bg-[var(--admin-surface-muted)] p-1 rounded-[4px] border border-[var(--admin-border)] flex items-center gap-1 h-[42px]">
            <AdminSkeleton className="w-12 h-7 rounded-[3px]" />
            <AdminSkeleton className="w-10 h-7 rounded-[3px]" />
            <AdminSkeleton className="w-12 h-7 rounded-[3px]" />
            <AdminSkeleton className="w-10 h-7 rounded-[3px]" />
          </div>
          <SkeletonButton width="w-24 sm:w-28" />
        </div>
      </div>

      {/* 4-Column Connected Telemetry Ledger */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="admin-card p-4 sm:p-5 space-y-3 relative overflow-hidden rounded-[4px] border border-[var(--admin-border)]"
          >
            <div className="flex items-center justify-between">
              <AdminSkeleton className="w-24 h-3.5 rounded" />
              <AdminSkeleton className="w-8 h-8 rounded-[4px]" />
            </div>
            <AdminSkeleton className="w-32 h-7 rounded-[4px]" />
            <div className="flex items-center gap-2 pt-1">
              <AdminSkeleton className="w-16 h-3 rounded" />
              <AdminSkeleton className="w-20 h-3 rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* Charts & Trends Row: 2:1 ratio */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 admin-card p-5 space-y-4 rounded-[4px] border border-[var(--admin-border)]">
          <div className="flex items-center justify-between">
            <div className="space-y-1.5">
              <AdminSkeleton className="w-36 h-5 rounded" />
              <AdminSkeleton className="w-52 h-3 rounded" />
            </div>
            <AdminSkeleton className="w-20 h-6 rounded" />
          </div>
          <AdminSkeleton className="w-full h-[260px] rounded-[4px]" />
        </div>
        <div className="admin-card p-5 space-y-4 rounded-[4px] border border-[var(--admin-border)]">
          <div className="space-y-1.5">
            <AdminSkeleton className="w-32 h-5 rounded" />
            <AdminSkeleton className="w-40 h-3 rounded" />
          </div>
          <div className="flex items-center justify-center py-4">
            <AdminSkeleton className="w-44 h-44 rounded-full" />
          </div>
          <div className="space-y-2 pt-2">
            <AdminSkeleton className="w-full h-3 rounded" />
            <AdminSkeleton className="w-3/4 h-3 rounded" />
          </div>
        </div>
      </div>

      {/* Operations & Activity Row: 3 columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <div className="admin-card p-5 space-y-4 rounded-[4px] border border-[var(--admin-border)]">
          <AdminSkeleton className="w-32 h-5 rounded" />
          <div className="grid grid-cols-2 gap-2.5">
            {[1, 2, 3, 4].map((i) => (
              <AdminSkeleton key={i} className="h-16 rounded-[4px]" />
            ))}
          </div>
        </div>
        <div className="admin-card p-5 space-y-3 rounded-[4px] border border-[var(--admin-border)]">
          <AdminSkeleton className="w-28 h-5 rounded" />
          <div className="space-y-2.5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <AdminSkeleton className="w-8 h-8 rounded-full shrink-0" />
                <div className="flex-1 space-y-1">
                  <AdminSkeleton className="w-3/4 h-3.5 rounded" />
                  <AdminSkeleton className="w-1/2 h-2.5 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="admin-card p-5 space-y-3 rounded-[4px] border border-[var(--admin-border)]">
          <AdminSkeleton className="w-36 h-5 rounded" />
          <div className="space-y-2.5">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="flex items-center justify-between p-2 rounded bg-[var(--admin-bg-subtle)]"
              >
                <AdminSkeleton className="w-28 h-3.5 rounded" />
                <AdminSkeleton className="w-12 h-5 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
