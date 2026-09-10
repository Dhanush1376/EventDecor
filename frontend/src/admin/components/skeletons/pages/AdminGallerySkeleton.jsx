import React from 'react';
import { AdminSkeleton, SkeletonHeader, SkeletonToolbar } from '../../ui/Skeletons';

export function AdminGallerySkeleton() {
  return (
    <div className="space-y-6 pb-8 admin-animate-in" aria-busy="true" aria-label="Loading gallery">
      {/* Header */}
      <SkeletonHeader titleWidth="w-44" subtitleWidth="w-64" actionWidth="w-32" />

      {/* Sticky 42px Toolbar */}
      <SkeletonToolbar hasFilters={true} />

      {/* 4:3 Gallery Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-5">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="admin-card overflow-hidden p-0 rounded-[4px] border border-[var(--admin-border)] flex flex-col"
          >
            <AdminSkeleton className="w-full aspect-[4/3] rounded-none" />
            <div className="p-3 sm:p-4 space-y-2.5 flex-1 flex flex-col justify-between">
              <div className="space-y-1.5">
                <AdminSkeleton className="w-16 h-4 rounded-full" />
                <AdminSkeleton className="w-full h-4 rounded" />
                <AdminSkeleton className="w-2/3 h-3 rounded" />
              </div>
              <div className="flex gap-2 pt-2 border-t border-[var(--admin-border-subtle)]">
                <AdminSkeleton className="w-12 h-6 rounded" />
                <AdminSkeleton className="w-12 h-6 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
