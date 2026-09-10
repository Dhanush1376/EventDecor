import React from 'react';
import { AdminSkeleton, SkeletonHeader, SkeletonToolbar } from '../../ui/Skeletons';

export function AdminProductsSkeleton({ viewMode = 'table' }) {
  return (
    <div className="space-y-6 pb-8 admin-animate-in" aria-busy="true" aria-label="Loading products">
      {/* Products Page Header */}
      <SkeletonHeader titleWidth="w-52" subtitleWidth="w-64" actionWidth="w-36" />

      {/* Sticky 42px Filter Toolbar */}
      <SkeletonToolbar hasFilters={true} hasSecondary={true} />

      {/* Content Area: Table on Desktop, Cards on Mobile */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="admin-card overflow-hidden p-0 rounded-[4px] border border-[var(--admin-border)] flex flex-col"
            >
              <AdminSkeleton className="w-full aspect-[3/4] rounded-none" />
              <div className="p-3.5 space-y-2.5 flex-1 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <AdminSkeleton className="w-16 h-4 rounded-full" />
                    <AdminSkeleton className="w-12 h-3 rounded" />
                  </div>
                  <AdminSkeleton className="w-full h-4 rounded" />
                  <AdminSkeleton className="w-2/3 h-3.5 rounded" />
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-[var(--admin-border-subtle)]">
                  <AdminSkeleton className="w-16 h-5 rounded" />
                  <AdminSkeleton className="w-10 h-5 rounded-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block admin-card p-0 overflow-hidden rounded-[4px] border border-[var(--admin-border)]">
            <div className="p-3.5 border-b border-[var(--admin-border-subtle)] bg-[var(--admin-bg-subtle)] flex items-center justify-between">
              <div className="flex items-center gap-4 flex-1">
                <AdminSkeleton className="w-4 h-4 rounded" />
                <AdminSkeleton className="w-32 h-3.5 rounded" />
                <AdminSkeleton className="w-20 h-3.5 rounded" />
                <AdminSkeleton className="w-16 h-3.5 rounded" />
                <AdminSkeleton className="w-24 h-3.5 rounded" />
              </div>
              <AdminSkeleton className="w-16 h-3.5 rounded" />
            </div>
            <div className="divide-y divide-[var(--admin-border-subtle)]">
              {Array.from({ length: 7 }).map((_, r) => (
                <div key={r} className="p-3.5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5 flex-1 min-w-0">
                    <AdminSkeleton className="w-4 h-4 rounded shrink-0" />
                    <AdminSkeleton className="w-12 h-12 rounded-[4px] shrink-0" />
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <AdminSkeleton className="w-48 h-4 rounded" />
                      <div className="flex items-center gap-2">
                        <AdminSkeleton className="w-16 h-3 rounded" />
                        <AdminSkeleton className="w-12 h-3 rounded" />
                      </div>
                    </div>
                  </div>
                  <AdminSkeleton className="w-16 h-5 rounded-full" />
                  <AdminSkeleton className="w-20 h-4 rounded" />
                  <div className="flex items-center gap-2">
                    <AdminSkeleton className="w-7 h-7 rounded" />
                    <AdminSkeleton className="w-8 h-4 rounded" />
                    <AdminSkeleton className="w-7 h-7 rounded" />
                  </div>
                  <AdminSkeleton className="w-10 h-5 rounded-full" />
                  <div className="flex items-center gap-2">
                    <AdminSkeleton className="w-7 h-7 rounded" />
                    <AdminSkeleton className="w-7 h-7 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="admin-card p-3.5 rounded-[4px] border border-[var(--admin-border)] flex items-center gap-3"
              >
                <AdminSkeleton className="w-14 h-14 rounded-[4px] shrink-0" />
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center justify-between">
                    <AdminSkeleton className="w-3/5 h-4 rounded" />
                    <AdminSkeleton className="w-12 h-4 rounded-full" />
                  </div>
                  <div className="flex items-center justify-between">
                    <AdminSkeleton className="w-16 h-3.5 rounded" />
                    <AdminSkeleton className="w-20 h-4 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
