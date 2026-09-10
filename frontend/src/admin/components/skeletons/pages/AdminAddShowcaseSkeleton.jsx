import React from 'react';
import { AdminSkeleton } from '../../ui/Skeletons';

export function AdminAddShowcaseSkeleton() {
  const steps = ['Basics', 'Media', 'Pricing', 'Specs', 'SEO', 'Review'];

  return (
    <div
      className="max-w-[1280px] mx-auto space-y-6 pb-20 p-4 sm:p-0 admin-animate-in"
      aria-busy="true"
      aria-label="Loading showcase wizard"
    >
      {/* Top Header Card */}
      <div className="bg-[var(--admin-surface)] p-4 rounded-[4px] border border-[var(--admin-border)] flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <AdminSkeleton className="w-8 h-8 rounded-[4px] shrink-0" />
          <div className="space-y-1">
            <AdminSkeleton className="w-40 h-5 rounded" />
            <AdminSkeleton className="w-24 h-3 rounded" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <AdminSkeleton className="w-20 h-5 rounded hidden sm:block" />
          <AdminSkeleton className="w-28 h-9 rounded-[4px]" />
        </div>
      </div>

      {/* Progress Bar */}
      <div className="admin-card p-3.5 hidden lg:block overflow-x-auto rounded-[4px] border border-[var(--admin-border)]">
        <div className="flex items-center justify-between min-w-[700px] px-3">
          {steps.map((label, i) => (
            <React.Fragment key={i}>
              <div className="flex items-center gap-2.5">
                <AdminSkeleton className="w-7 h-7 rounded-[4px] shrink-0" />
                <AdminSkeleton className="w-16 h-3 rounded" />
              </div>
              {i < steps.length - 1 && (
                <AdminSkeleton className="flex-1 h-[2px] mx-3 rounded-full" />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* 2-Column Split: Form and Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 admin-card p-5 sm:p-6 space-y-5 rounded-[4px] border border-[var(--admin-border)]">
          <div className="space-y-1.5 pb-3 border-b border-[var(--admin-border-subtle)]">
            <AdminSkeleton className="w-36 h-5 rounded" />
            <AdminSkeleton className="w-60 h-3 rounded" />
          </div>
          <div className="space-y-2">
            <AdminSkeleton className="w-28 h-3.5 rounded" />
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
            <AdminSkeleton className="w-32 h-3.5 rounded" />
            <AdminSkeleton className="w-full h-24 rounded-[4px]" />
          </div>
          <div className="flex items-center justify-between pt-4 border-t border-[var(--admin-border-subtle)]">
            <AdminSkeleton className="w-24 h-10 rounded-[4px]" />
            <AdminSkeleton className="w-28 h-10 rounded-[4px]" />
          </div>
        </div>

        <div className="hidden lg:block lg:col-span-5 admin-card p-4 space-y-4 rounded-[4px] border border-[var(--admin-border)] sticky top-24">
          <AdminSkeleton className="w-28 h-4 rounded" />
          <AdminSkeleton className="w-full aspect-[16/10] rounded-[4px]" />
          <div className="space-y-2">
            <AdminSkeleton className="w-3/4 h-5 rounded" />
            <AdminSkeleton className="w-1/2 h-3.5 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}
