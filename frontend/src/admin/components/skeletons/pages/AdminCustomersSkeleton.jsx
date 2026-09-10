import React from 'react';
import { AdminSkeleton, SkeletonHeader, SkeletonToolbar } from '../../ui/Skeletons';

export function AdminCustomersSkeleton() {
  return (
    <div
      className="space-y-6 pb-8 admin-animate-in"
      aria-busy="true"
      aria-label="Loading customers"
    >
      {/* Header */}
      <SkeletonHeader titleWidth="w-48" subtitleWidth="w-72" actionWidth="w-32" />

      {/* Sticky 42px Toolbar */}
      <SkeletonToolbar hasFilters={true} />

      {/* 3-Column Customer Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="admin-card p-5 rounded-[4px] border border-[var(--admin-border)] space-y-4 bg-[var(--admin-surface)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <AdminSkeleton className="w-12 h-12 rounded-full shrink-0" />
                <div className="space-y-1 min-w-0">
                  <AdminSkeleton className="w-32 h-4 rounded" />
                  <AdminSkeleton className="w-40 h-3 rounded" />
                  <AdminSkeleton className="w-24 h-2.5 rounded" />
                </div>
              </div>
              <AdminSkeleton className="w-14 h-5 rounded-full shrink-0" />
            </div>

            <div className="grid grid-cols-3 gap-2 py-3 border-y border-[var(--admin-border-subtle)] text-center">
              <div className="space-y-1">
                <AdminSkeleton className="w-12 h-2.5 rounded mx-auto" />
                <AdminSkeleton className="w-10 h-4 rounded mx-auto" />
              </div>
              <div className="space-y-1">
                <AdminSkeleton className="w-12 h-2.5 rounded mx-auto" />
                <AdminSkeleton className="w-14 h-4 rounded mx-auto" />
              </div>
              <div className="space-y-1">
                <AdminSkeleton className="w-12 h-2.5 rounded mx-auto" />
                <AdminSkeleton className="w-14 h-4 rounded mx-auto" />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <AdminSkeleton className="w-28 h-8 rounded-[4px]" />
              <div className="flex items-center gap-1.5">
                <AdminSkeleton className="w-8 h-8 rounded" />
                <AdminSkeleton className="w-8 h-8 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
