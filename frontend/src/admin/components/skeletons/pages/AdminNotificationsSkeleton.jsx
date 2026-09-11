import React from 'react';
import { SkeletonBox, SkeletonTextLine, SkeletonBadge } from '../../ui/Skeletons';

export function AdminNotificationsSkeleton({ hideHeader = false } = {}) {
  return (
    <div className="space-y-6 pb-12 sm:pb-8 text-left admin-section-root">
      {/* 1. Header Block */}
      {!hideHeader && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <SkeletonTextLine width="170px" height="26px" className="mb-2" />
            <div className="flex items-center gap-2">
              <SkeletonBadge width="110px" height="18px" />
              <SkeletonBadge width="75px" height="18px" />
            </div>
          </div>
        </div>
      )}

      {/* 2. Sticky 42px Search & Controls Bar */}
      <div className="space-y-2.5">
        <div className="flex flex-row items-center gap-2 w-full">
          {/* Search Bar */}
          <div className="flex-1 min-w-0 bg-[var(--admin-surface-muted)] rounded-[4px] border border-[var(--admin-border)] flex items-center px-3 h-[42px]">
            <SkeletonBox width="18px" height="18px" rounded="full" className="shrink-0" />
            <SkeletonTextLine width="220px" height="14px" className="ml-2" />
          </div>

          {/* Segmented Category Pills (Desktop & Tablet) */}
          <div className="hidden lg:flex items-center gap-1 p-1 bg-[var(--admin-surface-muted)] rounded-[4px] border border-[var(--admin-border)] h-[42px]">
            {['All', 'Unread', 'Orders', 'Bookings', 'Payments', 'System'].map((_, idx) => (
              <SkeletonBox key={idx} width="65px" height="32px" rounded="sm" />
            ))}
          </div>

          {/* Mark All Read Button */}
          <div className="h-[42px] px-3.5 bg-[var(--admin-surface-muted)] rounded-[4px] border border-[var(--admin-border)] flex items-center gap-1.5 shrink-0">
            <SkeletonBox width="16px" height="16px" rounded="sm" />
            <SkeletonTextLine width="90px" height="14px" className="hidden sm:inline-block" />
          </div>
        </div>
      </div>

      {/* 3. Desktop Table View */}
      <div className="hidden md:block admin-card p-0 overflow-hidden border border-[var(--admin-border)] shadow-xs rounded-[4px]">
        <table className="admin-table admin-table-compact w-full text-left">
          <thead>
            <tr className="border-b border-[var(--admin-border-subtle)] bg-[var(--admin-surface-muted)]">
              <th className="py-3 px-4 w-[46px]"></th>
              <th className="py-3 px-4 w-[120px]">
                <SkeletonTextLine width="40px" height="12px" />
              </th>
              <th className="py-3 px-4">
                <SkeletonTextLine width="140px" height="12px" />
              </th>
              <th className="py-3 px-4 w-[160px]">
                <SkeletonTextLine width="70px" height="12px" />
              </th>
              <th className="py-3 px-4 w-[130px] text-right">
                <SkeletonTextLine width="50px" height="12px" className="ml-auto" />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--admin-border-subtle)]">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <tr key={i}>
                <td className="py-3.5 px-4 text-center align-middle">
                  <SkeletonBox width="10px" height="10px" rounded="full" className="mx-auto" />
                </td>
                <td className="py-3.5 px-4 align-middle">
                  <SkeletonBadge width="80px" height="22px" />
                </td>
                <td className="py-3.5 px-4 align-middle">
                  <SkeletonTextLine width="260px" height="14px" className="mb-1.5" />
                  <SkeletonTextLine width="420px" height="12px" />
                </td>
                <td className="py-3.5 px-4 align-middle">
                  <SkeletonTextLine width="110px" height="12px" />
                </td>
                <td className="py-3.5 px-4 text-right align-middle">
                  <div className="flex items-center justify-end gap-2">
                    <SkeletonBox width="28px" height="28px" rounded="sm" />
                    <SkeletonBox width="28px" height="28px" rounded="sm" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 4. Mobile Card View */}
      <div className="md:hidden space-y-2.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="rounded-[4px] p-3.5 shadow-xs border border-[var(--admin-border)] bg-[var(--admin-surface)] space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <SkeletonBox width="8px" height="8px" rounded="full" />
                <SkeletonBadge width="70px" height="20px" />
                <SkeletonBadge width="40px" height="16px" />
              </div>
              <SkeletonTextLine width="60px" height="10px" />
            </div>
            <SkeletonTextLine width="200px" height="14px" />
            <SkeletonTextLine width="280px" height="12px" />
          </div>
        ))}
      </div>
    </div>
  );
}
export default AdminNotificationsSkeleton;
