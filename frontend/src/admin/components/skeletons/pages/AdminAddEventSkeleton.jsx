import React from 'react';
import { AdminSkeleton } from '../../ui/Skeletons';

export function AdminAddEventSkeleton() {
  return (
    <div
      className="max-w-[1280px] mx-auto space-y-6 pb-20 p-4 sm:p-0 admin-animate-in"
      aria-busy="true"
      aria-label="Loading event form"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <AdminSkeleton className="w-10 h-10 rounded-[4px] shrink-0" />
          <div className="space-y-1.5">
            <AdminSkeleton className="w-48 h-6 rounded" />
            <AdminSkeleton className="w-28 h-4 rounded" />
          </div>
        </div>
        <AdminSkeleton className="w-32 h-10 rounded-[4px]" />
      </div>

      {/* 2-Column Form Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Event Information (7 cols) */}
        <div className="lg:col-span-7 admin-card p-5 sm:p-6 space-y-5 rounded-[4px] border border-[var(--admin-border)]">
          <div className="space-y-1 pb-3 border-b border-[var(--admin-border-subtle)]">
            <AdminSkeleton className="w-36 h-5 rounded" />
            <AdminSkeleton className="w-64 h-3.5 rounded" />
          </div>

          <div className="space-y-2">
            <AdminSkeleton className="w-28 h-3.5 rounded" />
            <AdminSkeleton className="w-full h-10 rounded-[4px]" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <AdminSkeleton className="w-20 h-3.5 rounded" />
              <AdminSkeleton className="w-full h-10 rounded-[4px]" />
            </div>
            <div className="space-y-2">
              <AdminSkeleton className="w-24 h-3.5 rounded" />
              <AdminSkeleton className="w-full h-10 rounded-[4px]" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <AdminSkeleton className="w-24 h-3.5 rounded" />
              <AdminSkeleton className="w-full h-10 rounded-[4px]" />
            </div>
            <div className="space-y-2">
              <AdminSkeleton className="w-20 h-3.5 rounded" />
              <AdminSkeleton className="w-full h-10 rounded-[4px]" />
            </div>
          </div>

          <div className="space-y-2">
            <AdminSkeleton className="w-32 h-3.5 rounded" />
            <AdminSkeleton className="w-full h-28 rounded-[4px]" />
          </div>
        </div>

        {/* Right Column: Media Assets & SEO (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Cover Photo Upload Card */}
          <div className="admin-card p-5 space-y-3.5 rounded-[4px] border border-[var(--admin-border)]">
            <AdminSkeleton className="w-32 h-5 rounded" />
            <AdminSkeleton className="w-full aspect-[16/10] rounded-[6px]" />
          </div>

          {/* Gallery Assets Card */}
          <div className="admin-card p-5 space-y-3 rounded-[4px] border border-[var(--admin-border)]">
            <AdminSkeleton className="w-36 h-4 rounded" />
            <div className="grid grid-cols-2 gap-3">
              <AdminSkeleton className="w-full aspect-[4/3] rounded-[4px]" />
              <AdminSkeleton className="w-full aspect-[4/3] rounded-[4px]" />
            </div>
          </div>

          {/* SEO Meta Card */}
          <div className="admin-card p-5 space-y-3.5 rounded-[4px] border border-[var(--admin-border)]">
            <AdminSkeleton className="w-28 h-4 rounded" />
            <div className="space-y-2">
              <AdminSkeleton className="w-20 h-3 rounded" />
              <AdminSkeleton className="w-full h-9 rounded-[4px]" />
            </div>
            <div className="space-y-2">
              <AdminSkeleton className="w-24 h-3 rounded" />
              <AdminSkeleton className="w-full h-16 rounded-[4px]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
