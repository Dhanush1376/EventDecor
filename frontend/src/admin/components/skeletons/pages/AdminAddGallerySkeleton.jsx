import React from 'react';
import { AdminSkeleton } from '../../ui/Skeletons';

export function AdminAddGallerySkeleton() {
  return (
    <div
      className="max-w-[1280px] mx-auto space-y-6 pb-20 p-4 sm:p-0 admin-animate-in"
      aria-busy="true"
      aria-label="Loading gallery item form"
    >
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <AdminSkeleton className="w-10 h-10 rounded-[4px] shrink-0" />
          <div className="space-y-1.5">
            <AdminSkeleton className="w-48 h-6 rounded" />
            <AdminSkeleton className="w-32 h-3.5 rounded" />
          </div>
        </div>
        <AdminSkeleton className="w-32 h-10 rounded-[4px]" />
      </div>

      {/* 2-Column Content Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Media Dropzone & Preview (5 cols) */}
        <div className="lg:col-span-5 admin-card p-5 space-y-4 rounded-[4px] border border-[var(--admin-border)]">
          <AdminSkeleton className="w-32 h-4 rounded" />
          <AdminSkeleton className="w-full aspect-[4/3] rounded-[6px]" />
          <div className="space-y-2 pt-2">
            <AdminSkeleton className="w-24 h-3.5 rounded" />
            <AdminSkeleton className="w-full h-10 rounded-[4px]" />
          </div>
        </div>

        {/* Right Column: Metadata Form (7 cols) */}
        <div className="lg:col-span-7 admin-card p-5 sm:p-6 space-y-5 rounded-[4px] border border-[var(--admin-border)]">
          <div className="space-y-1 pb-3 border-b border-[var(--admin-border-subtle)]">
            <AdminSkeleton className="w-36 h-5 rounded" />
            <AdminSkeleton className="w-64 h-3.5 rounded" />
          </div>

          <div className="space-y-2">
            <AdminSkeleton className="w-20 h-3.5 rounded" />
            <AdminSkeleton className="w-full h-10 rounded-[4px]" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <AdminSkeleton className="w-24 h-3.5 rounded" />
              <AdminSkeleton className="w-full h-10 rounded-[4px]" />
            </div>
            <div className="space-y-2">
              <AdminSkeleton className="w-24 h-3.5 rounded" />
              <AdminSkeleton className="w-full h-10 rounded-[4px]" />
            </div>
          </div>

          <div className="space-y-2">
            <AdminSkeleton className="w-28 h-3.5 rounded" />
            <AdminSkeleton className="w-full h-24 rounded-[4px]" />
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-[var(--admin-border-subtle)]">
            <AdminSkeleton className="w-24 h-10 rounded-[4px]" />
            <AdminSkeleton className="w-28 h-10 rounded-[4px]" />
          </div>
        </div>
      </div>
    </div>
  );
}
