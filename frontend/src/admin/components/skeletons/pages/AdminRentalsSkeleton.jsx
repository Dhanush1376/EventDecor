import React from 'react';
import { AdminSkeleton, SkeletonHeader, SkeletonToolbar } from '../../ui/Skeletons';

export function AdminRentalsSkeleton() {
  return (
    <div className="space-y-6 pb-8 admin-animate-in" aria-busy="true" aria-label="Loading rentals">
      {/* Header */}
      <SkeletonHeader titleWidth="w-44" subtitleWidth="w-60" hasAction={false} />

      {/* 4 Rental KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="admin-card p-4 sm:p-5 space-y-2.5 rounded-[4px] border border-[var(--admin-border)]"
          >
            <div className="flex items-center justify-between">
              <AdminSkeleton className="w-24 h-3 rounded" />
              <AdminSkeleton className="w-6 h-6 rounded" />
            </div>
            <AdminSkeleton className="w-20 h-6 rounded" />
            <AdminSkeleton className="w-16 h-2.5 rounded" />
          </div>
        ))}
      </div>

      {/* Sticky 42px Toolbar */}
      <SkeletonToolbar hasFilters={true} hasExport={true} />

      {/* Desktop Table View */}
      <div className="hidden md:block admin-card p-0 overflow-hidden rounded-[4px] border border-[var(--admin-border)]">
        <div className="p-3.5 border-b border-[var(--admin-border-subtle)] bg-[var(--admin-bg-subtle)] flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <AdminSkeleton className="w-20 h-3.5 rounded" />
            <AdminSkeleton className="w-28 h-3.5 rounded" />
            <AdminSkeleton className="w-32 h-3.5 rounded" />
            <AdminSkeleton className="w-24 h-3.5 rounded" />
            <AdminSkeleton className="w-20 h-3.5 rounded" />
          </div>
          <AdminSkeleton className="w-16 h-3.5 rounded" />
        </div>
        <div className="divide-y divide-[var(--admin-border-subtle)]">
          {Array.from({ length: 7 }).map((_, r) => (
            <div key={r} className="p-3.5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-1">
                <AdminSkeleton className="w-20 h-4 rounded font-mono" />
                <div className="space-y-1">
                  <AdminSkeleton className="w-28 h-3.5 rounded" />
                  <AdminSkeleton className="w-20 h-2.5 rounded" />
                </div>
                <div className="flex items-center gap-2">
                  <AdminSkeleton className="w-10 h-10 rounded shrink-0" />
                  <AdminSkeleton className="w-32 h-3.5 rounded" />
                </div>
                <AdminSkeleton className="w-24 h-3.5 rounded" />
                <div className="space-y-1">
                  <AdminSkeleton className="w-16 h-3.5 rounded" />
                  <AdminSkeleton className="w-12 h-2.5 rounded" />
                </div>
                <AdminSkeleton className="w-16 h-5 rounded-full" />
              </div>
              <AdminSkeleton className="w-8 h-8 rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Mobile Cards View */}
      <div className="md:hidden space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="admin-card p-4 rounded-[4px] border border-[var(--admin-border)] space-y-3"
          >
            <div className="flex items-center justify-between">
              <AdminSkeleton className="w-24 h-4 rounded font-mono" />
              <AdminSkeleton className="w-16 h-5 rounded-full" />
            </div>
            <div className="flex items-center gap-3">
              <AdminSkeleton className="w-12 h-12 rounded shrink-0" />
              <div className="space-y-1 flex-1">
                <AdminSkeleton className="w-3/4 h-3.5 rounded" />
                <AdminSkeleton className="w-1/2 h-3 rounded" />
              </div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-[var(--admin-border-subtle)]">
              <AdminSkeleton className="w-20 h-3.5 rounded" />
              <AdminSkeleton className="w-16 h-3.5 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
