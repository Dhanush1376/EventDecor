import React from 'react';
import { PageHeader } from '../../ui/Layout';
import { AdminSkeleton } from '../../ui/Skeletons';

export function AdminDashboardSkeleton() {
  return (
    <div
      className="space-y-6 pb-8 admin-animate-in"
      aria-busy="true"
      aria-label="Loading dashboard"
    >
      {/* ─── PageHeader Skeleton ─── */}
      <PageHeader
        title={<AdminSkeleton className="w-32 sm:w-40 h-7 sm:h-8 rounded-[4px]" />}
        subtitle={
          <div className="flex flex-wrap items-center gap-2 mt-0.5">
            <AdminSkeleton className="w-28 h-3.5 rounded" />
            <span className="text-[var(--admin-border-strong)]">•</span>
            <AdminSkeleton className="w-24 h-3.5 rounded" />
            <span className="text-[var(--admin-border-strong)]">•</span>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/40" />
              <AdminSkeleton className="w-28 h-3.5 rounded" />
            </div>
          </div>
        }
        headerAction={
          <div className="flex items-center justify-end gap-1.5 sm:gap-2 w-full sm:w-auto shrink-0 ml-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {/* Period Switcher Skeleton (Matching h-9 sm:h-10) */}
            <div className="bg-[var(--admin-surface-muted)] p-1 rounded-[6px] border border-[var(--admin-border)] flex items-center gap-1 h-9 sm:h-10 box-border shadow-2xs shrink-0">
              <AdminSkeleton className="w-11 sm:w-13 h-full rounded-[4px]" />
              <AdminSkeleton className="w-8 sm:w-10 h-full rounded-[4px]" />
              <AdminSkeleton className="w-12 sm:w-14 h-full rounded-[4px]" />
              <AdminSkeleton className="w-8 sm:w-10 h-full rounded-[4px]" />
            </div>

            {/* Sync Button Skeleton (Matching square on mobile / pill on desktop) */}
            <AdminSkeleton className="h-9 w-9 sm:h-10 sm:w-[94px] rounded-[6px] shrink-0 border border-[var(--admin-border)]" />
          </div>
        }
      />

      {/* ─── 4-Column Connected Financial & Operational Telemetry Ledger ─── */}
      <div className="admin-card overflow-hidden text-left relative p-0 !rounded-[4px] border border-[var(--admin-border)] shadow-xs">
        {/* Top Accent Stripe */}
        <div className="absolute top-0 left-0 w-full h-[3px] bg-[var(--admin-border-strong)] z-10" />

        <div className="grid grid-cols-2 lg:grid-cols-4 bg-[var(--admin-surface)] divide-y sm:divide-y-0 divide-x divide-[var(--admin-border-subtle)]">
          {/* Metric 1: Total Revenue */}
          <div className="p-3 sm:p-5 space-y-1 sm:space-y-1.5 border-r border-b lg:border-b-0 border-[var(--admin-border-subtle)]">
            <div className="flex items-center justify-between gap-1 min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <AdminSkeleton className="w-3.5 h-3.5 rounded-[2px] shrink-0" />
                <AdminSkeleton className="w-20 sm:w-24 h-3 rounded" />
              </div>
            </div>
            <AdminSkeleton className="w-20 sm:w-24 h-6 sm:h-7 rounded-[4px]" />
            <div className="flex items-center justify-between mt-0.5 sm:mt-1">
              <AdminSkeleton className="w-16 sm:w-20 h-3 rounded" />
              <AdminSkeleton className="w-10 sm:w-12 h-3 rounded" />
            </div>
          </div>

          {/* Metric 2: Pending Orders */}
          <div className="p-3 sm:p-5 space-y-1 sm:space-y-1.5 border-r border-b lg:border-b-0 border-[var(--admin-border-subtle)]">
            <div className="flex items-center justify-between gap-1 min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <AdminSkeleton className="w-3.5 h-3.5 rounded-[2px] shrink-0" />
                <AdminSkeleton className="w-24 sm:w-28 h-3 rounded" />
              </div>
            </div>
            <AdminSkeleton className="w-10 sm:w-14 h-6 sm:h-7 rounded-[4px]" />
            <div className="flex items-center justify-between mt-0.5 sm:mt-1">
              <AdminSkeleton className="w-14 sm:w-16 h-3 rounded" />
              <AdminSkeleton className="w-20 sm:w-24 h-4 rounded-full" />
            </div>
          </div>

          {/* Metric 3: Active Bookings */}
          <div className="p-3 sm:p-5 space-y-1 sm:space-y-1.5 border-r border-b lg:border-b-0 border-[var(--admin-border-subtle)]">
            <div className="flex items-center justify-between gap-1 min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <AdminSkeleton className="w-3.5 h-3.5 rounded-[2px] shrink-0" />
                <AdminSkeleton className="w-24 sm:w-28 h-3 rounded" />
              </div>
            </div>
            <AdminSkeleton className="w-10 sm:w-14 h-6 sm:h-7 rounded-[4px]" />
            <div className="flex items-center justify-between mt-0.5 sm:mt-1">
              <AdminSkeleton className="w-16 sm:w-20 h-3 rounded" />
              <AdminSkeleton className="w-10 sm:w-12 h-3 rounded" />
            </div>
          </div>

          {/* Metric 4: Total Customers */}
          <div className="p-3 sm:p-5 space-y-1 sm:space-y-1.5">
            <div className="flex items-center justify-between gap-1 min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <AdminSkeleton className="w-3.5 h-3.5 rounded-[2px] shrink-0" />
                <AdminSkeleton className="w-24 sm:w-28 h-3 rounded" />
              </div>
            </div>
            <AdminSkeleton className="w-12 sm:w-16 h-6 sm:h-7 rounded-[4px]" />
            <div className="flex items-center justify-between mt-0.5 sm:mt-1">
              <AdminSkeleton className="w-16 sm:w-20 h-3 rounded" />
              <AdminSkeleton className="w-10 sm:w-12 h-3 rounded" />
            </div>
          </div>
        </div>
      </div>

      {/* ─── Charts & Trends Row (2:1 ratio) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Overview (2 Cols on Desktop) */}
        <div className="lg:col-span-2 admin-card p-4 sm:p-5 !rounded-[4px] border border-[var(--admin-border)] shadow-xs flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-[var(--admin-border-subtle)]">
            <div className="space-y-1">
              <AdminSkeleton className="w-32 sm:w-36 h-4.5 rounded" />
              <AdminSkeleton className="w-48 sm:w-56 h-3 rounded" />
            </div>
            <div className="flex items-center gap-3">
              <AdminSkeleton className="w-14 h-3.5 rounded" />
              <AdminSkeleton className="w-14 h-3.5 rounded" />
            </div>
          </div>
          <AdminSkeleton className="w-full h-[260px] sm:h-[280px] rounded-[4px]" />
        </div>

        {/* Category Performance (1 Col on Desktop) */}
        <div className="admin-card p-4 sm:p-5 !rounded-[4px] border border-[var(--admin-border)] shadow-xs flex flex-col justify-between">
          <div className="mb-4 pb-3 border-b border-[var(--admin-border-subtle)] space-y-1">
            <AdminSkeleton className="w-28 sm:w-32 h-4.5 rounded" />
            <AdminSkeleton className="w-40 sm:w-44 h-3 rounded" />
          </div>
          <div className="flex items-center justify-center py-2">
            <AdminSkeleton className="w-36 h-36 rounded-full" />
          </div>
          <div className="space-y-2 mt-3 pt-3 border-t border-[var(--admin-border-subtle)]">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AdminSkeleton className="w-2.5 h-2.5 rounded-[2px]" />
                  <AdminSkeleton className="w-24 h-3 rounded" />
                </div>
                <AdminSkeleton className="w-8 h-3 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Weekly Order Velocity Chart ─── */}
      <div className="admin-card p-4 sm:p-5 !rounded-[4px] border border-[var(--admin-border)] shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-[var(--admin-border-subtle)]">
          <div className="space-y-1">
            <AdminSkeleton className="w-36 sm:w-44 h-4.5 rounded" />
            <AdminSkeleton className="w-64 sm:w-72 h-3 rounded" />
          </div>
          <div className="flex items-center gap-3">
            <AdminSkeleton className="w-14 h-3.5 rounded" />
            <AdminSkeleton className="w-14 h-3.5 rounded" />
          </div>
        </div>
        <AdminSkeleton className="w-full h-[180px] sm:h-[220px] rounded-[4px]" />
      </div>

      {/* ─── Operations & Activity Row (3 columns) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Operations */}
        <div className="admin-card p-4 sm:p-5 !rounded-[4px] border border-[var(--admin-border)] shadow-xs flex flex-col justify-between">
          <div className="mb-4 pb-3 border-b border-[var(--admin-border-subtle)] flex items-center justify-between">
            <div className="space-y-1">
              <AdminSkeleton className="w-32 h-4.5 rounded" />
              <AdminSkeleton className="w-44 h-3 rounded" />
            </div>
            <AdminSkeleton className="w-4 h-4 rounded" />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {[1, 2, 3, 4].map((i) => (
              <AdminSkeleton key={i} className="h-14 rounded-[4px]" />
            ))}
          </div>
        </div>

        {/* Recent Stream */}
        <div className="admin-card p-4 sm:p-5 !rounded-[4px] border border-[var(--admin-border)] shadow-xs flex flex-col">
          <div className="mb-4 pb-3 border-b border-[var(--admin-border-subtle)] flex items-center justify-between">
            <div className="space-y-1">
              <AdminSkeleton className="w-28 h-4.5 rounded" />
              <AdminSkeleton className="w-40 h-3 rounded" />
            </div>
            <AdminSkeleton className="w-14 h-3 rounded" />
          </div>
          <div className="space-y-3.5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-start gap-2.5">
                <AdminSkeleton className="w-7 h-7 rounded-[4px] shrink-0 mt-0.5" />
                <div className="flex-1 space-y-1">
                  <AdminSkeleton className="w-3/4 h-3 rounded" />
                  <AdminSkeleton className="w-1/2 h-2.5 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Inventory Status */}
        <div className="admin-card p-4 sm:p-5 !rounded-[4px] border border-[var(--admin-border)] shadow-xs flex flex-col">
          <div className="mb-4 pb-3 border-b border-[var(--admin-border-subtle)] flex items-center justify-between">
            <div className="space-y-1">
              <AdminSkeleton className="w-32 h-4.5 rounded" />
              <AdminSkeleton className="w-44 h-3 rounded" />
            </div>
            <AdminSkeleton className="w-14 h-3 rounded" />
          </div>
          <div className="flex-1 flex flex-col items-center justify-center p-5 space-y-2">
            <AdminSkeleton className="w-10 h-10 rounded-full" />
            <AdminSkeleton className="w-32 h-4 rounded" />
            <AdminSkeleton className="w-48 h-3 rounded" />
          </div>
        </div>
      </div>

      {/* ─── Recents & Catalog Row (3 columns) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <div className="admin-card p-4 sm:p-5 !rounded-[4px] border border-[var(--admin-border)] shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[var(--admin-border-subtle)]">
            <div className="space-y-1">
              <AdminSkeleton className="w-28 h-4.5 rounded" />
              <AdminSkeleton className="w-44 h-3 rounded" />
            </div>
            <AdminSkeleton className="w-14 h-3 rounded" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="flex items-center justify-between p-2 rounded bg-[var(--admin-surface-muted)]"
              >
                <div className="flex items-center gap-2.5">
                  <AdminSkeleton className="w-8 h-8 rounded-full shrink-0" />
                  <div className="space-y-1">
                    <AdminSkeleton className="w-20 h-3.5 rounded" />
                    <AdminSkeleton className="w-28 h-2.5 rounded" />
                  </div>
                </div>
                <AdminSkeleton className="w-14 h-5 rounded-[4px]" />
              </div>
            ))}
          </div>
        </div>

        {/* Active Bookings */}
        <div className="admin-card p-4 sm:p-5 !rounded-[4px] border border-[var(--admin-border)] shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[var(--admin-border-subtle)]">
            <div className="space-y-1">
              <AdminSkeleton className="w-32 h-4.5 rounded" />
              <AdminSkeleton className="w-44 h-3 rounded" />
            </div>
            <AdminSkeleton className="w-14 h-3 rounded" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="flex items-center justify-between p-2 rounded bg-[var(--admin-surface-muted)]"
              >
                <div className="flex items-center gap-2.5">
                  <AdminSkeleton className="w-8 h-8 rounded-[4px] shrink-0" />
                  <div className="space-y-1">
                    <AdminSkeleton className="w-24 h-3.5 rounded" />
                    <AdminSkeleton className="w-28 h-2.5 rounded" />
                  </div>
                </div>
                <AdminSkeleton className="w-14 h-5 rounded-[4px]" />
              </div>
            ))}
          </div>
        </div>

        {/* Trending Decor */}
        <div className="admin-card p-4 sm:p-5 !rounded-[4px] border border-[var(--admin-border)] shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[var(--admin-border-subtle)]">
            <div className="space-y-1">
              <AdminSkeleton className="w-36 h-4.5 rounded" />
              <AdminSkeleton className="w-44 h-3 rounded" />
            </div>
            <AdminSkeleton className="w-14 h-3 rounded" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="flex items-center justify-between p-2 rounded bg-[var(--admin-surface-muted)]"
              >
                <div className="flex items-center gap-2.5">
                  <AdminSkeleton className="w-9 h-9 rounded-[4px] shrink-0" />
                  <div className="space-y-1">
                    <AdminSkeleton className="w-28 h-3.5 rounded" />
                    <AdminSkeleton className="w-16 h-2.5 rounded" />
                  </div>
                </div>
                <AdminSkeleton className="w-12 h-4 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
