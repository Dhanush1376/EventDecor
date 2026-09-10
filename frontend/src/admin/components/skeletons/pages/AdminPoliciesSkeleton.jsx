import React from 'react';
import { AdminSkeleton, SkeletonHeader, SkeletonToolbar } from '../../ui/Skeletons';

export function AdminPoliciesSkeleton() {
  return (
    <div className="space-y-6 pb-8 admin-animate-in" aria-busy="true" aria-label="Loading policies">
      {/* Header */}
      <SkeletonHeader titleWidth="w-52" subtitleWidth="w-64" actionWidth="w-32" />

      {/* Sticky 42px Toolbar */}
      <SkeletonToolbar hasFilters={false} />

      {/* Policies Table */}
      <div className="admin-card p-0 overflow-hidden rounded-[4px] border border-[var(--admin-border)]">
        <div className="p-3.5 border-b border-[var(--admin-border-subtle)] bg-[var(--admin-bg-subtle)] flex items-center justify-between">
          <div className="flex items-center gap-6 flex-1">
            <AdminSkeleton className="w-32 h-3.5 rounded" />
            <AdminSkeleton className="w-24 h-3.5 rounded" />
            <AdminSkeleton className="w-24 h-3.5 rounded" />
            <AdminSkeleton className="w-16 h-3.5 rounded" />
          </div>
          <AdminSkeleton className="w-16 h-3.5 rounded" />
        </div>
        <div className="divide-y divide-[var(--admin-border-subtle)]">
          {Array.from({ length: 6 }).map((_, r) => (
            <div key={r} className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-6 flex-1">
                <div className="space-y-1">
                  <AdminSkeleton className="w-40 h-4 rounded font-bold" />
                  <AdminSkeleton className="w-28 h-2.5 rounded font-mono" />
                </div>
                <AdminSkeleton className="w-28 h-3.5 rounded" />
                <AdminSkeleton className="w-24 h-3 rounded" />
                <AdminSkeleton className="w-10 h-5 rounded-full" />
              </div>
              <div className="flex items-center gap-2">
                <AdminSkeleton className="w-8 h-8 rounded" />
                <AdminSkeleton className="w-8 h-8 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
