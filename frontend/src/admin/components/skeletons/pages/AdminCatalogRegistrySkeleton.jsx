import React from 'react';
import { AdminSkeleton, SkeletonHeader } from '../../ui/Skeletons';

export function AdminCatalogRegistrySkeleton() {
  return (
    <div
      className="p-6 max-w-7xl mx-auto space-y-6 admin-animate-in"
      aria-busy="true"
      aria-label="Loading catalog registry"
    >
      {/* Header */}
      <SkeletonHeader titleWidth="w-56" subtitleWidth="w-80" actionWidth="w-40" />

      {/* 4 Intelligence Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="admin-card p-5 space-y-3 rounded-[4px] border border-[var(--admin-border)]"
          >
            <div className="flex items-center justify-between">
              <AdminSkeleton className="w-24 h-3.5 rounded" />
              <AdminSkeleton className="w-8 h-8 rounded-[4px]" />
            </div>
            <AdminSkeleton className="w-20 h-7 rounded" />
            <AdminSkeleton className="w-28 h-3 rounded" />
          </div>
        ))}
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-[var(--admin-border-subtle)] pb-2 overflow-x-auto">
        <AdminSkeleton className="w-24 h-9 rounded-[4px]" />
        <AdminSkeleton className="w-28 h-9 rounded-[4px]" />
        <AdminSkeleton className="w-28 h-9 rounded-[4px]" />
        <AdminSkeleton className="w-32 h-9 rounded-[4px]" />
      </div>

      {/* Registry Table */}
      <div className="admin-card p-0 overflow-hidden rounded-[4px] border border-[var(--admin-border)]">
        <div className="p-4 border-b border-[var(--admin-border-subtle)] bg-[var(--admin-bg-subtle)] flex items-center justify-between">
          <div className="flex items-center gap-6 flex-1">
            <AdminSkeleton className="w-32 h-3.5 rounded" />
            <AdminSkeleton className="w-48 h-3.5 rounded" />
            <AdminSkeleton className="w-20 h-3.5 rounded" />
          </div>
          <AdminSkeleton className="w-24 h-3.5 rounded" />
        </div>
        <div className="divide-y divide-[var(--admin-border-subtle)]">
          {Array.from({ length: 6 }).map((_, r) => (
            <div key={r} className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-6 flex-1">
                <AdminSkeleton className="w-28 h-4 rounded font-mono" />
                <AdminSkeleton className="w-56 h-3.5 rounded" />
                <AdminSkeleton className="w-16 h-5 rounded-full" />
              </div>
              <div className="flex items-center gap-2">
                <AdminSkeleton className="w-20 h-8 rounded-[4px]" />
                <AdminSkeleton className="w-20 h-8 rounded-[4px]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
