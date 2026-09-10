import React from 'react';
import { AdminSkeleton, SkeletonHeader } from '../../ui/Skeletons';

export function AdminApprovalsQueueSkeleton() {
  return (
    <div
      className="space-y-6 max-w-7xl mx-auto admin-animate-in"
      aria-busy="true"
      aria-label="Loading approvals queue"
    >
      {/* Header */}
      <SkeletonHeader titleWidth="w-48" subtitleWidth="w-80" hasAction={false} />

      {/* 3 Approvals Queue Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="admin-card p-5 space-y-2.5 rounded-[4px] border border-[var(--admin-border)]"
          >
            <div className="flex items-center justify-between">
              <AdminSkeleton className="w-28 h-3.5 rounded" />
              <AdminSkeleton className="w-7 h-7 rounded" />
            </div>
            <AdminSkeleton className="w-16 h-7 rounded" />
            <AdminSkeleton className="w-20 h-2.5 rounded" />
          </div>
        ))}
      </div>

      {/* Approvals List Cards */}
      <div className="space-y-3.5">
        {[1, 2, 3, 4].map((a) => (
          <div
            key={a}
            className="admin-card p-5 rounded-[4px] border border-[var(--admin-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="flex items-start gap-3.5 flex-1">
              <AdminSkeleton className="w-10 h-10 rounded-full shrink-0" />
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2.5">
                  <AdminSkeleton className="w-36 h-4 rounded font-bold" />
                  <AdminSkeleton className="w-16 h-5 rounded-full" />
                </div>
                <AdminSkeleton className="w-3/4 h-3 rounded" />
                <AdminSkeleton className="w-40 h-2.5 rounded" />
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <AdminSkeleton className="w-24 h-9 rounded-[4px]" />
              <AdminSkeleton className="w-24 h-9 rounded-[4px]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
