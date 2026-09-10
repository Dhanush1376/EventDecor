import React from 'react';
import { AdminSkeleton, SkeletonHeader, SkeletonToolbar } from '../../ui/Skeletons';

export function AdminOrdersSkeleton({ viewMode = 'table' }) {
  return (
    <div className="space-y-6 pb-8 admin-animate-in" aria-busy="true" aria-label="Loading orders">
      {/* Header */}
      <SkeletonHeader titleWidth="w-48" subtitleWidth="w-72" hasAction={false} />

      {/* Sticky 42px Toolbar */}
      <SkeletonToolbar hasFilters={true} hasExport={true} hasSecondary={true} />

      {/* 4 Connected COD / Telemetry Summary Cards */}
      <div className="admin-card overflow-hidden p-0 rounded-[4px] border border-[var(--admin-border)] shadow-xs">
        <div className="grid grid-cols-2 md:grid-cols-4 bg-[var(--admin-surface)] divide-y md:divide-y-0 md:divide-x divide-[var(--admin-border-subtle)]">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-4 sm:p-5 space-y-2">
              <AdminSkeleton className="w-28 h-3 rounded" />
              <AdminSkeleton className="w-32 h-6 rounded" />
              <AdminSkeleton className="w-20 h-2.5 rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      {viewMode === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 items-start">
          {['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'].map((col, i) => (
            <div
              key={i}
              className="bg-[var(--admin-bg-subtle)] rounded-[4px] p-3 border border-[var(--admin-border)] flex flex-col space-y-3 min-h-[450px]"
            >
              <div className="flex items-center justify-between pb-2 border-b border-[var(--admin-border-subtle)]">
                <AdminSkeleton className="w-20 h-4 rounded" />
                <AdminSkeleton className="w-6 h-5 rounded-full" />
              </div>
              {[1, 2, 3].map((card) => (
                <div
                  key={card}
                  className="admin-card p-3 rounded-[4px] border border-[var(--admin-border)] space-y-2 bg-[var(--admin-surface)]"
                >
                  <div className="flex items-center justify-between">
                    <AdminSkeleton className="w-16 h-3.5 rounded" />
                    <AdminSkeleton className="w-14 h-4 rounded-full" />
                  </div>
                  <AdminSkeleton className="w-28 h-4 rounded" />
                  <div className="flex items-center justify-between pt-1">
                    <AdminSkeleton className="w-16 h-3 rounded" />
                    <AdminSkeleton className="w-14 h-4 rounded" />
                  </div>
                </div>
              ))}
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
                <AdminSkeleton className="w-20 h-3.5 rounded" />
                <AdminSkeleton className="w-24 h-3.5 rounded" />
                <AdminSkeleton className="w-32 h-3.5 rounded" />
                <AdminSkeleton className="w-24 h-3.5 rounded" />
                <AdminSkeleton className="w-20 h-3.5 rounded" />
              </div>
              <AdminSkeleton className="w-16 h-3.5 rounded" />
            </div>
            <div className="divide-y divide-[var(--admin-border-subtle)]">
              {Array.from({ length: 8 }).map((_, r) => (
                <div key={r} className="p-3.5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1">
                    <AdminSkeleton className="w-4 h-4 rounded" />
                    <AdminSkeleton className="w-24 h-4 rounded font-mono" />
                    <AdminSkeleton className="w-20 h-3 rounded" />
                    <div className="space-y-1">
                      <AdminSkeleton className="w-32 h-3.5 rounded" />
                      <AdminSkeleton className="w-24 h-2.5 rounded" />
                    </div>
                    <AdminSkeleton className="w-20 h-3 rounded" />
                    <AdminSkeleton className="w-16 h-5 rounded-full" />
                    <AdminSkeleton className="w-20 h-4 rounded" />
                  </div>
                  <div className="flex items-center gap-2">
                    <AdminSkeleton className="w-16 h-5 rounded-full" />
                    <AdminSkeleton className="w-8 h-8 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile Order Cards View */}
          <div className="md:hidden space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="admin-card p-4 rounded-[4px] border border-[var(--admin-border)] space-y-3"
              >
                <div className="flex items-center justify-between">
                  <AdminSkeleton className="w-28 h-4 rounded" />
                  <AdminSkeleton className="w-16 h-5 rounded-full" />
                </div>
                <div className="flex items-center justify-between">
                  <AdminSkeleton className="w-36 h-3.5 rounded" />
                  <AdminSkeleton className="w-20 h-4 rounded" />
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-[var(--admin-border-subtle)]">
                  <AdminSkeleton className="w-24 h-3 rounded" />
                  <AdminSkeleton className="w-14 h-4 rounded" />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
