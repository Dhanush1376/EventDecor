import React from 'react';
import { AdminSkeleton, SkeletonButton } from '../../ui/Skeletons';

export function AdminOperationsAnalyticsSkeleton() {
  return (
    <div
      className="space-y-6 max-w-7xl mx-auto admin-animate-in"
      aria-busy="true"
      aria-label="Loading live activity"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <AdminSkeleton className="w-52 h-7 rounded-[4px]" />
          <div className="flex items-center gap-2">
            <AdminSkeleton className="w-48 h-3.5 rounded" />
            <AdminSkeleton className="w-2 h-2 rounded-full" />
            <AdminSkeleton className="w-24 h-3.5 rounded" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <AdminSkeleton className="w-32 h-10 rounded-[4px]" />
          <SkeletonButton width="w-20" />
        </div>
      </div>

      {/* 4 Telemetry Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="admin-card p-5 space-y-2.5 rounded-[4px] border border-[var(--admin-border)]"
          >
            <div className="flex items-center justify-between">
              <AdminSkeleton className="w-24 h-3 rounded" />
              <AdminSkeleton className="w-6 h-6 rounded" />
            </div>
            <AdminSkeleton className="w-20 h-7 rounded" />
            <AdminSkeleton className="w-16 h-2.5 rounded" />
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 admin-card p-5 space-y-4 rounded-[4px] border border-[var(--admin-border)]">
          <div className="flex items-center justify-between">
            <AdminSkeleton className="w-36 h-5 rounded" />
            <AdminSkeleton className="w-20 h-6 rounded" />
          </div>
          <AdminSkeleton className="w-full h-[260px] rounded-[4px]" />
        </div>
        <div className="admin-card p-5 space-y-4 rounded-[4px] border border-[var(--admin-border)]">
          <AdminSkeleton className="w-32 h-5 rounded" />
          <div className="space-y-4 pt-4">
            {[1, 2, 3, 4].map((f) => (
              <div key={f} className="space-y-1.5">
                <div className="flex justify-between">
                  <AdminSkeleton className="w-20 h-3 rounded" />
                  <AdminSkeleton className="w-10 h-3 rounded" />
                </div>
                <AdminSkeleton className="w-full h-3 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Real-time Activity Table */}
      <div className="admin-card p-0 overflow-hidden rounded-[4px] border border-[var(--admin-border)]">
        <div className="p-3.5 border-b border-[var(--admin-border-subtle)] bg-[var(--admin-bg-subtle)] flex items-center justify-between">
          <AdminSkeleton className="w-40 h-4 rounded" />
          <AdminSkeleton className="w-16 h-3 rounded" />
        </div>
        <div className="divide-y divide-[var(--admin-border-subtle)]">
          {[1, 2, 3, 4, 5].map((log) => (
            <div key={log} className="p-3.5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 flex-1">
                <AdminSkeleton className="w-8 h-8 rounded-full shrink-0" />
                <div className="space-y-1">
                  <AdminSkeleton className="w-48 h-3.5 rounded" />
                  <AdminSkeleton className="w-24 h-2.5 rounded font-mono" />
                </div>
              </div>
              <AdminSkeleton className="w-16 h-5 rounded-full" />
              <AdminSkeleton className="w-20 h-3 rounded font-mono" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
