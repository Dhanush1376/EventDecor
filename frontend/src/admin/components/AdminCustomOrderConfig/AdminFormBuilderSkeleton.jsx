import React from 'react';
import { AdminSkeleton } from '../ui/Skeletons';

export function AdminFormBuilderSkeleton() {
  return (
    <div
      className="space-y-6 admin-animate-in w-full"
      aria-busy="true"
      aria-label="Loading form builder configuration"
    >
      {/* 1. Header Bar Skeleton */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-[var(--admin-surface)] p-3.5 sm:p-4 rounded-[4px] border border-[var(--admin-border)] shadow-xs gap-3">
        <div className="w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <AdminSkeleton className="w-36 sm:w-44 h-5 rounded-[4px]" />
            <AdminSkeleton className="w-16 h-4 rounded-[4px]" />
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
          <AdminSkeleton className="h-8 w-24 rounded-[4px] flex-1 sm:flex-none" />
          <AdminSkeleton className="h-8 w-28 rounded-[4px] flex-1 sm:flex-none" />
        </div>
      </div>

      {/* 2. Type Tabs Skeleton */}
      <div className="inline-flex items-center gap-1 bg-[var(--admin-surface-muted)] rounded-[4px] border border-[var(--admin-border)] p-1 max-w-full overflow-x-auto">
        <AdminSkeleton className="w-32 sm:w-40 h-7 rounded-[4px]" />
        <AdminSkeleton className="w-32 sm:w-36 h-7 rounded-[4px]" />
        <AdminSkeleton className="w-28 sm:w-32 h-7 rounded-[4px]" />
      </div>

      {/* 3. Builder Workspace Grid (12 Columns) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left: Steps & Fields Builder (8 cols) */}
        <div className="xl:col-span-8 space-y-4">
          {/* Steps Header Bar */}
          <div className="flex justify-between items-center bg-[var(--admin-surface)] px-3.5 py-2.5 rounded-[4px] border border-[var(--admin-border)] shadow-xs gap-3">
            <div className="flex items-center gap-2">
              <AdminSkeleton className="w-5 h-5 rounded" />
              <AdminSkeleton className="w-24 h-4 rounded" />
              <AdminSkeleton className="w-28 h-3 rounded hidden sm:inline-block" />
            </div>
            <AdminSkeleton className="w-20 h-7.5 rounded-[4px]" />
          </div>

          {/* Step Card 1 */}
          <div className="bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-[4px] shadow-xs overflow-hidden">
            {/* Step Card Header */}
            <div className="bg-[var(--admin-surface-muted)] p-3 border-b border-[var(--admin-border-subtle)] flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <AdminSkeleton className="w-4 h-5 rounded shrink-0" />
                <AdminSkeleton className="w-5.5 h-5.5 rounded-[4px] shrink-0" />
                <AdminSkeleton className="w-36 sm:w-48 h-7 rounded-[4px]" />
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <AdminSkeleton className="w-7 h-7 rounded-[4px]" />
                <AdminSkeleton className="w-7 h-7 rounded-[4px]" />
                <AdminSkeleton className="w-7 h-7 rounded-[4px]" />
              </div>
            </div>

            {/* Step Card Body: Fields List */}
            <div className="p-3.5 sm:p-4 space-y-3">
              {/* Field 1 */}
              <div className="p-3 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border-subtle)] rounded-[4px] flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <AdminSkeleton className="w-3.5 h-4 rounded shrink-0" />
                  <AdminSkeleton className="w-32 sm:w-44 h-7 rounded-[4px]" />
                  <AdminSkeleton className="w-20 sm:w-24 h-6 rounded-[4px] hidden xs:block" />
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <AdminSkeleton className="w-6 h-6 rounded-[4px]" />
                  <AdminSkeleton className="w-6 h-6 rounded-[4px]" />
                </div>
              </div>

              {/* Field 2 */}
              <div className="p-3 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border-subtle)] rounded-[4px] flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <AdminSkeleton className="w-3.5 h-4 rounded shrink-0" />
                  <AdminSkeleton className="w-40 sm:w-52 h-7 rounded-[4px]" />
                  <AdminSkeleton className="w-20 sm:w-24 h-6 rounded-[4px] hidden xs:block" />
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <AdminSkeleton className="w-6 h-6 rounded-[4px]" />
                  <AdminSkeleton className="w-6 h-6 rounded-[4px]" />
                </div>
              </div>

              {/* Add Field Button */}
              <AdminSkeleton className="w-24 h-7 rounded-[4px] mt-2" />
            </div>
          </div>

          {/* Step Card 2 */}
          <div className="bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-[4px] shadow-xs overflow-hidden">
            <div className="bg-[var(--admin-surface-muted)] p-3 border-b border-[var(--admin-border-subtle)] flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <AdminSkeleton className="w-4 h-5 rounded shrink-0" />
                <AdminSkeleton className="w-5.5 h-5.5 rounded-[4px] shrink-0" />
                <AdminSkeleton className="w-32 sm:w-44 h-7 rounded-[4px]" />
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <AdminSkeleton className="w-7 h-7 rounded-[4px]" />
                <AdminSkeleton className="w-7 h-7 rounded-[4px]" />
                <AdminSkeleton className="w-7 h-7 rounded-[4px]" />
              </div>
            </div>

            <div className="p-3.5 sm:p-4 space-y-3">
              <div className="p-3 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border-subtle)] rounded-[4px] flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <AdminSkeleton className="w-3.5 h-4 rounded shrink-0" />
                  <AdminSkeleton className="w-36 sm:w-48 h-7 rounded-[4px]" />
                  <AdminSkeleton className="w-20 sm:w-24 h-6 rounded-[4px] hidden xs:block" />
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <AdminSkeleton className="w-6 h-6 rounded-[4px]" />
                  <AdminSkeleton className="w-6 h-6 rounded-[4px]" />
                </div>
              </div>

              <AdminSkeleton className="w-24 h-7 rounded-[4px] mt-2" />
            </div>
          </div>
        </div>

        {/* Right: Type Settings Sidebar (4 cols) */}
        <div className="xl:col-span-4 space-y-4">
          <div className="admin-card !rounded-[4px] p-5 space-y-4 text-left border border-[var(--admin-border)]">
            <div className="flex items-center gap-2 pb-3 border-b border-[var(--admin-border-subtle)]">
              <AdminSkeleton className="w-4 h-4 rounded" />
              <AdminSkeleton className="w-28 h-4 rounded" />
            </div>

            <div className="space-y-3.5">
              <div>
                <AdminSkeleton className="w-28 h-2.5 rounded mb-1.5" />
                <AdminSkeleton className="w-full h-8 rounded-[4px]" />
              </div>
              <div>
                <AdminSkeleton className="w-24 h-2.5 rounded mb-1.5" />
                <AdminSkeleton className="w-full h-8 rounded-[4px]" />
              </div>
              <div>
                <AdminSkeleton className="w-20 h-2.5 rounded mb-1.5" />
                <AdminSkeleton className="w-full h-20 rounded-[4px]" />
              </div>
            </div>

            <div className="pt-3 border-t border-[var(--admin-border-subtle)] space-y-2">
              <div className="flex justify-between items-center py-1">
                <AdminSkeleton className="w-20 h-3 rounded" />
                <AdminSkeleton className="w-8 h-3 rounded" />
              </div>
              <div className="flex justify-between items-center py-1">
                <AdminSkeleton className="w-24 h-3 rounded" />
                <AdminSkeleton className="w-8 h-3 rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
