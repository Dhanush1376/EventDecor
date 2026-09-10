import React from 'react';
import { AdminSkeleton } from '../../ui/Skeletons';

export function AdminBookingDetailSkeleton() {
  return (
    <div
      className="space-y-6 max-w-[1400px] mx-auto admin-animate-in"
      aria-busy="true"
      aria-label="Loading booking details"
    >
      {/* Booking Top Header Card */}
      <div className="admin-card p-4 sm:p-5 rounded-[4px] border border-[var(--admin-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <AdminSkeleton className="w-9 h-9 rounded-[4px] shrink-0" />
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <AdminSkeleton className="w-36 h-6 rounded" />
              <AdminSkeleton className="w-20 h-5 rounded-full" />
              <AdminSkeleton className="w-16 h-5 rounded-full" />
            </div>
            <AdminSkeleton className="w-52 h-3.5 rounded" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <AdminSkeleton className="w-28 h-9 rounded-[4px]" />
          <AdminSkeleton className="w-32 h-9 rounded-[4px]" />
        </div>
      </div>

      {/* 2-Column Grid (2/3 Left, 1/3 Right Sticky) */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 items-start">
        {/* LEFT COLUMN: Timeline, Package, Venue (2/3 Width) */}
        <div className="xl:col-span-2 flex flex-col gap-4 sm:gap-6">
          {/* Status Timeline Stepper */}
          <div className="admin-card p-5 sm:p-6 rounded-[4px] border border-[var(--admin-border)] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--admin-border-subtle)]">
              <AdminSkeleton className="w-32 h-5 rounded" />
              <AdminSkeleton className="w-24 h-4 rounded" />
            </div>
            <div className="flex items-center justify-between overflow-x-auto py-2">
              {[1, 2, 3, 4, 5, 6].map((s, i) => (
                <React.Fragment key={s}>
                  <div className="flex flex-col items-center gap-2 min-w-[70px]">
                    <AdminSkeleton className="w-7 h-7 rounded-full" />
                    <AdminSkeleton className="w-16 h-3 rounded" />
                    <AdminSkeleton className="w-12 h-2 rounded" />
                  </div>
                  {i < 5 && <AdminSkeleton className="flex-1 h-[2px] mx-2" />}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Package Details Card */}
          <div className="admin-card p-5 sm:p-6 rounded-[4px] border border-[var(--admin-border)] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--admin-border-subtle)]">
              <AdminSkeleton className="w-36 h-5 rounded" />
              <AdminSkeleton className="w-20 h-5 rounded-full" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[1, 2, 3, 4].map((f) => (
                <div key={f} className="p-3 bg-[var(--admin-bg-subtle)] rounded space-y-1">
                  <AdminSkeleton className="w-14 h-2.5 rounded" />
                  <AdminSkeleton className="w-20 h-4 rounded font-bold" />
                </div>
              ))}
            </div>
            <div className="space-y-2 pt-2">
              <AdminSkeleton className="w-28 h-3.5 rounded" />
              <AdminSkeleton className="w-full h-16 rounded" />
            </div>
          </div>

          {/* Venue & Logistics Card */}
          <div className="admin-card p-5 sm:p-6 rounded-[4px] border border-[var(--admin-border)] space-y-4">
            <AdminSkeleton className="w-32 h-5 rounded" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <AdminSkeleton className="w-24 h-3 rounded" />
                <AdminSkeleton className="w-full h-8 rounded" />
              </div>
              <div className="space-y-2">
                <AdminSkeleton className="w-24 h-3 rounded" />
                <AdminSkeleton className="w-full h-8 rounded" />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Customer & Financials (1/3 Width Sticky Sidebar) */}
        <div className="xl:col-span-1 flex flex-col gap-4 sm:gap-6 sticky top-[88px]">
          {/* Customer Details Card */}
          <div className="admin-card p-5 rounded-[4px] border border-[var(--admin-border)] space-y-3.5">
            <AdminSkeleton className="w-36 h-4 rounded" />
            <div className="flex items-center gap-3 pt-1">
              <AdminSkeleton className="w-10 h-10 rounded-full shrink-0" />
              <div className="space-y-1 flex-1 min-w-0">
                <AdminSkeleton className="w-28 h-4 rounded" />
                <AdminSkeleton className="w-36 h-3 rounded" />
              </div>
            </div>
            <div className="space-y-2 pt-2 border-t border-[var(--admin-border-subtle)]">
              <AdminSkeleton className="w-20 h-3 rounded" />
              <AdminSkeleton className="w-full h-3 rounded" />
            </div>
          </div>

          {/* Financials Ledger Card */}
          <div className="admin-card p-5 rounded-[4px] border border-[var(--admin-border)] space-y-3.5">
            <AdminSkeleton className="w-36 h-4 rounded" />
            <div className="space-y-2.5 pt-1">
              <div className="flex justify-between">
                <AdminSkeleton className="w-24 h-3.5 rounded" />
                <AdminSkeleton className="w-20 h-3.5 rounded" />
              </div>
              <div className="flex justify-between">
                <AdminSkeleton className="w-20 h-3.5 rounded" />
                <AdminSkeleton className="w-16 h-3.5 rounded text-emerald-600" />
              </div>
              <div className="flex justify-between pt-2 border-t border-[var(--admin-border-subtle)] font-bold">
                <AdminSkeleton className="w-28 h-4 rounded" />
                <AdminSkeleton className="w-24 h-4 rounded font-mono" />
              </div>
            </div>
            <AdminSkeleton className="w-full h-10 rounded-[4px] mt-2" />
          </div>
        </div>
      </div>
    </div>
  );
}
