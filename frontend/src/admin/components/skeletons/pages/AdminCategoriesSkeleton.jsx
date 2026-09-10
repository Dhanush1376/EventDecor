import React from 'react';
import { AdminSkeleton, SkeletonButton, SkeletonHeader } from '../../ui/Skeletons';

export function AdminCategoriesSkeleton() {
  return (
    <div
      className="space-y-6 pb-8 admin-animate-in"
      aria-busy="true"
      aria-label="Loading categories"
    >
      {/* Header */}
      <SkeletonHeader titleWidth="w-48" subtitleWidth="w-64" actionWidth="w-36" />

      {/* Sticky 42px Toolbar with Type Switcher */}
      <div className="sticky top-[var(--admin-topbar-height,56px)] z-20 -my-2 py-2.5 bg-[var(--admin-bg)]/95 backdrop-blur-md mb-6">
        <div className="flex flex-row items-center gap-2 w-full">
          <div className="relative flex-1 min-w-0 bg-[var(--admin-surface-muted)] rounded-[4px] border border-[var(--admin-border)] flex items-center px-3 h-[42px]">
            <AdminSkeleton className="w-5 h-5 rounded shrink-0 mr-2" />
            <AdminSkeleton className="w-1/3 h-3.5 rounded" />
          </div>
          <div className="hidden sm:flex items-center gap-1 p-1 bg-[var(--admin-surface-muted)] rounded-[4px] border border-[var(--admin-border)] h-[42px]">
            <AdminSkeleton className="w-16 h-7 rounded-[3px]" />
            <AdminSkeleton className="w-16 h-7 rounded-[3px]" />
            <AdminSkeleton className="w-16 h-7 rounded-[3px]" />
          </div>
          <SkeletonButton width="w-24 sm:w-28" />
        </div>
      </div>

      {/* Categories Table */}
      <div className="admin-card p-0 overflow-hidden rounded-[4px] border border-[var(--admin-border)]">
        <div className="p-3.5 border-b border-[var(--admin-border-subtle)] bg-[var(--admin-bg-subtle)] flex items-center justify-between">
          <div className="flex items-center gap-6 flex-1">
            <AdminSkeleton className="w-28 h-3.5 rounded" />
            <AdminSkeleton className="w-24 h-3.5 rounded" />
            <AdminSkeleton className="w-20 h-3.5 rounded" />
            <AdminSkeleton className="w-16 h-3.5 rounded" />
            <AdminSkeleton className="w-20 h-3.5 rounded" />
          </div>
          <AdminSkeleton className="w-16 h-3.5 rounded" />
        </div>
        <div className="divide-y divide-[var(--admin-border-subtle)]">
          {Array.from({ length: 7 }).map((_, r) => (
            <div key={r} className="p-3.5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-1">
                <AdminSkeleton className="w-10 h-10 rounded-[4px] shrink-0" />
                <div className="space-y-1">
                  <AdminSkeleton className="w-32 h-4 rounded font-bold" />
                  <AdminSkeleton className="w-24 h-2.5 rounded font-mono" />
                </div>
                <AdminSkeleton className="w-16 h-5 rounded-full" />
                <AdminSkeleton className="w-16 h-4 rounded" />
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
