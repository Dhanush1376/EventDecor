import React from 'react';
import { AdminSkeleton } from '../../ui/Skeletons';

export function AdminRentalPoliciesSkeleton() {
  return (
    <div
      className="max-w-[800px] mx-auto space-y-6 pb-12 admin-animate-in"
      aria-busy="true"
      aria-label="Loading rental policies"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <AdminSkeleton className="w-10 h-10 rounded-full shrink-0" />
          <div className="space-y-1.5">
            <AdminSkeleton className="w-36 h-6 rounded" />
            <AdminSkeleton className="w-64 h-3.5 rounded" />
          </div>
        </div>
        <AdminSkeleton className="w-28 h-10 rounded-xl" />
      </div>

      {/* Main Settings Card */}
      <div className="admin-card p-6 rounded-2xl border border-[var(--admin-border)] space-y-6">
        <div className="space-y-2 pb-3 border-b border-[var(--admin-border-subtle)]">
          <AdminSkeleton className="w-48 h-5 rounded" />
          <AdminSkeleton className="w-72 h-3.5 rounded" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <AdminSkeleton className="w-32 h-3.5 rounded" />
            <AdminSkeleton className="w-full h-11 rounded-xl" />
          </div>
          <div className="space-y-2">
            <AdminSkeleton className="w-32 h-3.5 rounded" />
            <AdminSkeleton className="w-full h-11 rounded-xl" />
          </div>
        </div>

        {/* Verification Checkboxes */}
        <div className="space-y-3 pt-2">
          <AdminSkeleton className="w-40 h-4 rounded" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((d) => (
              <div
                key={d}
                className="p-3 bg-[var(--admin-bg-subtle)] rounded-xl flex items-center gap-2"
              >
                <AdminSkeleton className="w-4 h-4 rounded" />
                <AdminSkeleton className="w-20 h-3 rounded" />
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <AdminSkeleton className="w-36 h-3.5 rounded" />
          <AdminSkeleton className="w-full h-28 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
