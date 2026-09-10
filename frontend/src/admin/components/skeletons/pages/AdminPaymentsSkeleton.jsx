import React from 'react';
import { SkeletonBox, SkeletonTextLine, SkeletonBadge } from '../../ui/Skeletons';

export function AdminPaymentsSkeleton() {
  return (
    <div className="space-y-6 pb-12 sm:pb-8 text-left admin-section-root">
      {/* 1. Page Header with Title & Metrics Chips */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <SkeletonTextLine width="160px" height="26px" className="mb-2" />
          <div className="flex items-center gap-3">
            <SkeletonBadge width="80px" height="18px" />
            <SkeletonBadge width="110px" height="18px" />
            <SkeletonBadge width="100px" height="18px" />
          </div>
        </div>
      </div>

      {/* 2. Operational 4-Card Ledger Strip */}
      <div className="admin-card overflow-hidden text-left relative p-0 !rounded-[4px] border border-[var(--admin-border)] shadow-xs">
        <div className="absolute top-0 left-0 w-full h-[3px] bg-[var(--admin-border-strong)] z-10" />
        <div className="grid grid-cols-2 lg:grid-cols-4 bg-[var(--admin-surface)]">
          {/* Total Collected */}
          <div className="p-4 sm:p-5 space-y-2 border-r border-b lg:border-b-0 border-[var(--admin-border-subtle)]">
            <SkeletonTextLine width="90px" height="11px" />
            <SkeletonTextLine width="130px" height="24px" />
            <SkeletonTextLine width="120px" height="12px" />
          </div>

          {/* This Month */}
          <div className="p-4 sm:p-5 space-y-2 border-b lg:border-b-0 lg:border-r border-[var(--admin-border-subtle)]">
            <SkeletonTextLine width="80px" height="11px" />
            <SkeletonTextLine width="120px" height="24px" />
            <SkeletonTextLine width="110px" height="12px" />
          </div>

          {/* Pending Receivables */}
          <div className="p-4 sm:p-5 space-y-2 border-r border-[var(--admin-border-subtle)]">
            <SkeletonTextLine width="60px" height="11px" />
            <SkeletonTextLine width="100px" height="24px" />
            <SkeletonTextLine width="120px" height="12px" />
          </div>

          {/* Refunded */}
          <div className="p-4 sm:p-5 space-y-2 bg-[var(--admin-surface)]">
            <SkeletonTextLine width="70px" height="11px" />
            <SkeletonTextLine width="90px" height="24px" />
            <SkeletonTextLine width="130px" height="12px" />
          </div>
        </div>
      </div>

      {/* 3. Sticky 42px Search, Analytics Toggle & Status Filter Bar */}
      <div className="space-y-2.5">
        <div className="flex flex-row items-center gap-2 w-full">
          {/* Search Box */}
          <div className="flex-1 min-w-0 bg-[var(--admin-surface-muted)] rounded-[4px] border border-[var(--admin-border)] flex items-center px-3 h-[42px]">
            <SkeletonBox width="18px" height="18px" rounded="full" className="shrink-0" />
            <SkeletonTextLine width="200px" height="14px" className="ml-2" />
          </div>

          {/* Toggle Analytics Button */}
          <div className="h-[42px] px-3.5 flex items-center gap-1.5 rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface)] shrink-0">
            <SkeletonBox width="18px" height="18px" rounded="sm" />
            <SkeletonTextLine width="55px" height="14px" className="hidden md:inline-block" />
          </div>

          {/* Filters Button */}
          <div className="h-[42px] px-3 flex items-center gap-1.5 rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-muted)] shrink-0">
            <SkeletonBox width="18px" height="18px" rounded="sm" />
            <SkeletonTextLine width="45px" height="14px" className="hidden sm:inline-block" />
          </div>

          {/* Export Button */}
          <div className="h-[42px] w-[42px] sm:w-auto px-0 sm:px-3.5 flex items-center justify-center gap-1.5 rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-muted)] shrink-0">
            <SkeletonBox width="18px" height="18px" rounded="sm" />
            <SkeletonTextLine width="45px" height="14px" className="hidden sm:inline-block" />
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2">
          {['All', 'Completed', 'Pending', 'Refunded'].map((pill, idx) => (
            <SkeletonBox key={idx} width="80px" height="32px" rounded="sm" />
          ))}
        </div>
      </div>

      {/* 4. Collapsible Revenue Chart Skeleton */}
      <div className="admin-card !rounded-[4px] p-4 sm:p-5 border border-[var(--admin-border)] shadow-xs text-left space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <SkeletonTextLine width="180px" height="16px" />
            <SkeletonTextLine width="240px" height="12px" />
          </div>
          <SkeletonBadge width="70px" height="20px" />
        </div>
        <div className="h-[180px] w-full flex items-end justify-between gap-4 pt-4 border-b border-[var(--admin-border-subtle)] pb-2 px-2">
          {[40, 65, 30, 85, 55, 95].map((h, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-2">
              <SkeletonBox width="100%" height={`${h}%`} rounded="sm" className="max-w-[48px]" />
              <SkeletonTextLine width="28px" height="10px" />
            </div>
          ))}
        </div>
      </div>

      {/* 5. Desktop Transactions Table */}
      <div className="hidden md:block admin-card overflow-hidden p-0 !rounded-[4px] border border-[var(--admin-border)] shadow-xs">
        <table className="admin-table w-full text-left">
          <thead>
            <tr className="border-b border-[var(--admin-border)] bg-[var(--admin-surface-muted)]">
              <th className="py-3 px-4">
                <SkeletonTextLine width="65px" height="12px" />
              </th>
              <th className="py-3 px-4">
                <SkeletonTextLine width="120px" height="12px" />
              </th>
              <th className="py-3 px-4">
                <SkeletonTextLine width="90px" height="12px" />
              </th>
              <th className="py-3 px-4">
                <SkeletonTextLine width="60px" height="12px" />
              </th>
              <th className="py-3 px-4">
                <SkeletonTextLine width="60px" height="12px" />
              </th>
              <th className="py-3 px-4">
                <SkeletonTextLine width="60px" height="12px" />
              </th>
              <th className="py-3 px-4 text-right">
                <SkeletonTextLine width="50px" height="12px" className="ml-auto" />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--admin-border-subtle)]">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <tr key={i}>
                <td className="py-3.5 px-4">
                  <SkeletonTextLine width="75px" height="14px" />
                </td>
                <td className="py-3.5 px-4">
                  <SkeletonTextLine width="110px" height="13px" />
                </td>
                <td className="py-3.5 px-4">
                  <SkeletonTextLine width="100px" height="14px" className="mb-1" />
                  <SkeletonTextLine width="140px" height="11px" />
                </td>
                <td className="py-3.5 px-4">
                  <SkeletonTextLine width="70px" height="14px" />
                </td>
                <td className="py-3.5 px-4">
                  <SkeletonTextLine width="55px" height="13px" />
                </td>
                <td className="py-3.5 px-4">
                  <SkeletonBadge width="80px" height="20px" />
                </td>
                <td className="py-3.5 px-4 text-right">
                  <SkeletonTextLine width="80px" height="12px" className="ml-auto" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 6. Mobile Cards */}
      <div className="md:hidden space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-[4px] p-3.5 shadow-xs border border-[var(--admin-border)] bg-[var(--admin-surface)] space-y-2"
          >
            <div className="flex items-center justify-between">
              <SkeletonTextLine width="90px" height="14px" />
              <SkeletonTextLine width="65px" height="14px" />
            </div>
            <SkeletonTextLine width="120px" height="12px" />
            <div className="flex items-center justify-between pt-2 border-t border-[var(--admin-border-subtle)]">
              <SkeletonBadge width="70px" height="18px" />
              <SkeletonTextLine width="80px" height="11px" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
export default AdminPaymentsSkeleton;
