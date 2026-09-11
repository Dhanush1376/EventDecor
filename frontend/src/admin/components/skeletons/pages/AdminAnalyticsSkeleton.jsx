import React from 'react';
import { AdminSkeleton, SkeletonButton } from '../../ui/Skeletons';

export function AdminAnalyticsSkeleton() {
  return (
    <div
      className="space-y-6 pb-12 admin-animate-in"
      aria-busy="true"
      aria-label="Loading analytics"
    >
      {/* Header with Period Switcher and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <AdminSkeleton className="w-48 h-7 rounded-[4px]" />
          <div className="flex items-center gap-2">
            <AdminSkeleton className="w-32 h-4 rounded" />
            <AdminSkeleton className="w-2 h-2 rounded-full" />
            <AdminSkeleton className="w-24 h-4 rounded" />
          </div>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto">
          <div className="bg-[var(--admin-surface-muted)] p-1 rounded-[4px] border border-[var(--admin-border)] flex items-center gap-1 h-[42px]">
            {['7D', '30D', '12M', 'YTD', 'ALL'].map((p) => (
              <AdminSkeleton key={p} className="w-10 h-7 rounded-[3px]" />
            ))}
          </div>
          <SkeletonButton width="w-12 sm:w-16" />
          <SkeletonButton width="w-28 sm:w-32" />
        </div>
      </div>

      {/* 5-Column Connected Financial Reconciliation Ledger */}
      <div className="admin-card overflow-hidden p-0 rounded-[4px] border border-[var(--admin-border)] shadow-xs">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 bg-[var(--admin-surface)] divide-y sm:divide-y-0 divide-x divide-[var(--admin-border-subtle)]">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="p-4 sm:p-5 space-y-2">
              <AdminSkeleton className="w-24 h-3 rounded" />
              <AdminSkeleton className="w-28 h-6 rounded" />
              <div className="flex items-center justify-between pt-1">
                <AdminSkeleton className="w-14 h-2.5 rounded" />
                <AdminSkeleton className="w-10 h-2.5 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Charts Section: 2:1 Area Trend Chart + Payment Donut Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 admin-card p-5 space-y-4 rounded-[4px] border border-[var(--admin-border)]">
          <div className="flex items-center justify-between pb-2 border-b border-[var(--admin-border-subtle)]">
            <div className="space-y-1">
              <AdminSkeleton className="w-40 h-5 rounded" />
              <AdminSkeleton className="w-56 h-3 rounded" />
            </div>
            <AdminSkeleton className="w-24 h-6 rounded" />
          </div>
          <AdminSkeleton className="w-full h-[280px] rounded-[4px]" />
        </div>

        <div className="admin-card p-5 space-y-4 rounded-[4px] border border-[var(--admin-border)]">
          <div className="space-y-1 pb-2 border-b border-[var(--admin-border-subtle)]">
            <AdminSkeleton className="w-36 h-5 rounded" />
            <AdminSkeleton className="w-44 h-3 rounded" />
          </div>
          <div className="flex items-center justify-center py-4">
            <AdminSkeleton className="w-40 h-40 rounded-full" />
          </div>
          <div className="space-y-2 pt-2">
            {[1, 2, 3].map((m) => (
              <div key={m} className="flex items-center justify-between">
                <AdminSkeleton className="w-20 h-3 rounded" />
                <AdminSkeleton className="w-12 h-3 rounded font-bold" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Daily Settlement Tracker Table */}
      <div className="admin-card p-0 overflow-hidden rounded-[4px] border border-[var(--admin-border)]">
        <div className="p-3.5 border-b border-[var(--admin-border-subtle)] bg-[var(--admin-bg-subtle)] flex items-center justify-between">
          <AdminSkeleton className="w-36 h-4 rounded" />
          <AdminSkeleton className="w-20 h-3 rounded" />
        </div>
        <div className="divide-y divide-[var(--admin-border-subtle)]">
          {[1, 2, 3, 4, 5].map((r) => (
            <div key={r} className="p-3.5 flex items-center justify-between gap-4">
              <AdminSkeleton className="w-24 h-4 rounded font-mono" />
              <AdminSkeleton className="w-28 h-4 rounded" />
              <AdminSkeleton className="w-20 h-4 rounded font-bold" />
              <AdminSkeleton className="w-16 h-5 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
