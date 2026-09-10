import React from 'react';
import { AdminSkeleton } from '../../ui/Skeletons';

export function AdminRentalDetailSkeleton() {
  return (
    <div
      className="space-y-6 max-w-[1400px] mx-auto admin-animate-in"
      aria-busy="true"
      aria-label="Loading rental details"
    >
      {/* Rental Header */}
      <div className="admin-card p-4 sm:p-5 rounded-[4px] border border-[var(--admin-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <AdminSkeleton className="w-9 h-9 rounded-[4px] shrink-0" />
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <AdminSkeleton className="w-36 h-6 rounded" />
              <AdminSkeleton className="w-20 h-5 rounded-full" />
            </div>
            <AdminSkeleton className="w-48 h-3.5 rounded" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <AdminSkeleton className="w-28 h-9 rounded-[4px]" />
          <AdminSkeleton className="w-32 h-9 rounded-[4px]" />
        </div>
      </div>

      {/* 2-Column Responsive Grid (2/3 Left, 1/3 Right Sticky) */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 items-start">
        {/* LEFT COLUMN: Lifecycle Progression & Rented Product (2/3 Width) */}
        <div className="xl:col-span-2 flex flex-col gap-4 sm:gap-6">
          {/* Lifecycle Timeline Stepper */}
          <div className="admin-card p-5 sm:p-6 rounded-[4px] border border-[var(--admin-border)] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--admin-border-subtle)]">
              <AdminSkeleton className="w-32 h-5 rounded" />
              <AdminSkeleton className="w-20 h-4 rounded" />
            </div>
            <div className="flex items-center justify-between overflow-x-auto py-2">
              {[1, 2, 3, 4].map((s, i) => (
                <React.Fragment key={s}>
                  <div className="flex flex-col items-center gap-2 min-w-[70px]">
                    <AdminSkeleton className="w-7 h-7 rounded-full" />
                    <AdminSkeleton className="w-16 h-3 rounded" />
                    <AdminSkeleton className="w-12 h-2 rounded" />
                  </div>
                  {i < 3 && <AdminSkeleton className="flex-1 h-[2px] mx-2" />}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Rented Product Card */}
          <div className="admin-card p-5 sm:p-6 rounded-[4px] border border-[var(--admin-border)] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--admin-border-subtle)]">
              <AdminSkeleton className="w-36 h-5 rounded" />
              <AdminSkeleton className="w-14 h-4 rounded" />
            </div>
            <div className="flex flex-col sm:flex-row gap-5 items-start">
              <AdminSkeleton className="w-full sm:w-36 h-36 rounded-[6px] shrink-0" />
              <div className="flex-1 space-y-2.5">
                <AdminSkeleton className="w-3/4 h-5 rounded" />
                <AdminSkeleton className="w-1/3 h-4 rounded" />
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-3 bg-[var(--admin-bg-subtle)] rounded space-y-1">
                    <AdminSkeleton className="w-16 h-2.5 rounded" />
                    <AdminSkeleton className="w-24 h-4 rounded font-bold" />
                  </div>
                  <div className="p-3 bg-[var(--admin-bg-subtle)] rounded space-y-1">
                    <AdminSkeleton className="w-20 h-2.5 rounded" />
                    <AdminSkeleton className="w-20 h-4 rounded font-bold" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Customer ID Proofs & Financials (1/3 Width Sticky Sidebar) */}
        <div className="xl:col-span-1 flex flex-col gap-4 sm:gap-6 sticky top-[88px]">
          {/* Customer & ID Proof Card */}
          <div className="admin-card p-5 rounded-[4px] border border-[var(--admin-border)] space-y-3.5">
            <AdminSkeleton className="w-36 h-4 rounded" />
            <div className="flex items-center gap-3 pt-1">
              <AdminSkeleton className="w-10 h-10 rounded-full shrink-0" />
              <div className="space-y-1 flex-1 min-w-0">
                <AdminSkeleton className="w-28 h-4 rounded" />
                <AdminSkeleton className="w-32 h-3 rounded" />
              </div>
            </div>
            <div className="space-y-2 pt-2 border-t border-[var(--admin-border-subtle)]">
              <AdminSkeleton className="w-24 h-3 rounded" />
              <div className="flex gap-2">
                <AdminSkeleton className="w-20 h-14 rounded border border-[var(--admin-border-subtle)]" />
                <AdminSkeleton className="w-20 h-14 rounded border border-[var(--admin-border-subtle)]" />
              </div>
            </div>
          </div>

          {/* Deposit & Financial Settlement Card */}
          <div className="admin-card p-5 rounded-[4px] border border-[var(--admin-border)] space-y-3.5">
            <AdminSkeleton className="w-32 h-4 rounded" />
            <div className="space-y-2 pt-1">
              <div className="flex justify-between">
                <AdminSkeleton className="w-20 h-3.5 rounded" />
                <AdminSkeleton className="w-16 h-3.5 rounded" />
              </div>
              <div className="flex justify-between">
                <AdminSkeleton className="w-24 h-3.5 rounded" />
                <AdminSkeleton className="w-16 h-3.5 rounded" />
              </div>
              <div className="flex justify-between pt-2 border-t border-[var(--admin-border-subtle)] font-bold">
                <AdminSkeleton className="w-24 h-4 rounded" />
                <AdminSkeleton className="w-20 h-4 rounded" />
              </div>
            </div>
            <AdminSkeleton className="w-full h-10 rounded-[4px] mt-2" />
          </div>
        </div>
      </div>
    </div>
  );
}
