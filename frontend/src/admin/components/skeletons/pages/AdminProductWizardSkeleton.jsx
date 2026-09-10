import React from 'react';
import { AdminSkeleton } from '../../ui/Skeletons';

export function AdminProductWizardSkeleton() {
  const steps = ['Media', 'Basic Info', 'Variants', 'Pricing', 'Policies', 'SEO', 'Publish'];

  return (
    <div
      className="max-w-[1280px] mx-auto space-y-5 pb-16 sm:pb-8 px-2 sm:px-4 admin-animate-in"
      aria-busy="true"
      aria-label="Loading product wizard"
    >
      {/* Top Header Card */}
      <div className="bg-[var(--admin-surface)] p-3 sm:p-4 rounded-[4px] border border-[var(--admin-border)] flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <AdminSkeleton className="w-8 h-8 rounded-[4px] shrink-0" />
          <div className="space-y-1">
            <AdminSkeleton className="w-36 h-5 rounded" />
            <AdminSkeleton className="w-24 h-3 rounded" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <AdminSkeleton className="w-20 h-5 rounded-[3px] hidden sm:block" />
          <AdminSkeleton className="w-24 h-8 rounded-[4px]" />
        </div>
      </div>

      {/* Desktop 7-Step Progress Stepper */}
      <div className="admin-card p-3.5 hidden lg:block overflow-x-auto rounded-[4px] border border-[var(--admin-border)]">
        <div className="flex items-center justify-between min-w-[760px] px-3">
          {steps.map((label, i) => (
            <React.Fragment key={i}>
              <div className="flex items-center gap-2.5">
                <AdminSkeleton className="w-7 h-7 rounded-[4px] shrink-0" />
                <div className="space-y-1">
                  <AdminSkeleton className="w-10 h-2 rounded" />
                  <AdminSkeleton className="w-16 h-3 rounded" />
                </div>
              </div>
              {i < steps.length - 1 && (
                <AdminSkeleton className="flex-1 h-[2px] mx-3 rounded-full" />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Mobile Integrated Progress */}
      <div className="lg:hidden admin-card p-3 rounded-[4px] border border-[var(--admin-border)] space-y-2">
        <div className="flex items-center justify-between">
          <AdminSkeleton className="w-28 h-4 rounded" />
          <AdminSkeleton className="w-16 h-4 rounded" />
        </div>
        <AdminSkeleton className="w-full h-1.5 rounded-full" />
      </div>

      {/* 2-Column Split: Active Step Form on Left (60%), LivePreviewCard on Right (40%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Form Step (7 cols) */}
        <div className="lg:col-span-7 admin-card p-5 sm:p-6 space-y-6 rounded-[4px] border border-[var(--admin-border)]">
          <div className="space-y-1.5 pb-3 border-b border-[var(--admin-border-subtle)]">
            <AdminSkeleton className="w-40 h-5 rounded" />
            <AdminSkeleton className="w-64 h-3.5 rounded" />
          </div>

          <div className="space-y-2">
            <AdminSkeleton className="w-28 h-3.5 rounded" />
            <AdminSkeleton className="w-full h-36 rounded-[6px]" />
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

          <div className="space-y-2">
            <AdminSkeleton className="w-32 h-3.5 rounded" />
            <AdminSkeleton className="w-full h-24 rounded-[4px]" />
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-[var(--admin-border-subtle)]">
            <AdminSkeleton className="w-24 h-10 rounded-[4px]" />
            <AdminSkeleton className="w-28 h-10 rounded-[4px]" />
          </div>
        </div>

        {/* Right Column: Live Preview Card (5 cols) */}
        <div className="hidden lg:block lg:col-span-5 sticky top-24 admin-card p-4 space-y-4 rounded-[4px] border border-[var(--admin-border)]">
          <div className="flex items-center justify-between pb-2 border-b border-[var(--admin-border-subtle)]">
            <AdminSkeleton className="w-28 h-4 rounded" />
            <AdminSkeleton className="w-14 h-4 rounded-full" />
          </div>
          <AdminSkeleton className="w-full aspect-[4/3] rounded-[4px]" />
          <div className="space-y-2.5">
            <AdminSkeleton className="w-3/4 h-5 rounded" />
            <AdminSkeleton className="w-1/2 h-3.5 rounded" />
            <div className="flex items-center gap-2 pt-1">
              <AdminSkeleton className="w-20 h-6 rounded" />
              <AdminSkeleton className="w-16 h-5 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
