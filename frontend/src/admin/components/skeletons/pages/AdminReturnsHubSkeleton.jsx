import React from 'react';
import { SkeletonBox, SkeletonTextLine, SkeletonBadge } from '../../ui/Skeletons';

export function AdminReturnsHubSkeleton() {
  return (
    <div className="space-y-6 pb-28 sm:pb-12 text-left admin-section-root">
      {/* 1. Header with Mode Switcher & Status Chips */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <SkeletonTextLine width="160px" height="26px" className="mb-2" />
          <div className="flex items-center gap-2">
            <SkeletonBadge width="110px" height="18px" />
            <SkeletonBadge width="120px" height="18px" />
          </div>
        </div>

        {/* Returns / Exchanges Switcher */}
        <div className="hidden sm:inline-flex items-center bg-[var(--admin-surface-muted)] p-1 rounded-[6px] border border-[var(--admin-border)] gap-1 shrink-0">
          <SkeletonBox width="70px" height="28px" rounded="sm" />
          <SkeletonBox width="75px" height="28px" rounded="sm" />
        </div>
      </div>

      {/* 2. Sticky 42px Search & Controls Bar */}
      <div className="space-y-2.5">
        <div className="flex flex-row items-center gap-2 w-full">
          {/* Search Box */}
          <div className="flex-1 min-w-0 bg-[var(--admin-surface-muted)] rounded-[4px] border border-[var(--admin-border)] flex items-center px-3 h-[42px]">
            <SkeletonBox width="18px" height="18px" rounded="full" className="shrink-0" />
            <SkeletonTextLine width="200px" height="14px" className="ml-2" />
          </div>

          {/* Filters Button */}
          <div className="h-[42px] px-3.5 flex items-center gap-1.5 rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-muted)] shrink-0">
            <SkeletonBox width="18px" height="18px" rounded="sm" />
            <SkeletonTextLine width="50px" height="14px" className="hidden sm:inline-block" />
          </div>

          {/* Export Button */}
          <div className="h-[42px] px-3.5 flex items-center gap-1.5 rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-muted)] shrink-0">
            <SkeletonBox width="18px" height="18px" rounded="sm" />
            <SkeletonTextLine width="45px" height="14px" className="hidden sm:inline-block" />
          </div>
        </div>
      </div>

      {/* 3. 4 Operational KPI Cards Strip */}
      <div className="admin-card overflow-hidden text-left relative p-0 !rounded-[4px] border border-[var(--admin-border)] shadow-xs">
        <div className="grid grid-cols-2 md:grid-cols-4 bg-[var(--admin-surface)]">
          <div className="p-4 sm:p-5 space-y-1.5 border-r border-b md:border-b-0 border-[var(--admin-border-subtle)]">
            <SkeletonTextLine width="95px" height="10px" />
            <SkeletonTextLine width="110px" height="20px" />
            <SkeletonTextLine width="80px" height="10px" />
          </div>
          <div className="p-4 sm:p-5 space-y-1.5 border-b md:border-b-0 md:border-r border-[var(--admin-border-subtle)]">
            <SkeletonTextLine width="105px" height="10px" />
            <SkeletonTextLine width="95px" height="20px" />
            <SkeletonTextLine width="85px" height="10px" />
          </div>
          <div className="p-4 sm:p-5 space-y-1.5 border-r border-[var(--admin-border-subtle)]">
            <SkeletonTextLine width="100px" height="10px" />
            <SkeletonTextLine width="90px" height="20px" />
            <SkeletonTextLine width="75px" height="10px" />
          </div>
          <div className="p-4 sm:p-5 space-y-1.5 bg-[var(--admin-surface-muted)]/30">
            <SkeletonTextLine width="95px" height="10px" />
            <SkeletonTextLine width="115px" height="20px" />
            <SkeletonTextLine width="80px" height="10px" />
          </div>
        </div>
      </div>

      {/* 4. Desktop Returns Table */}
      <div className="hidden md:block admin-card overflow-hidden p-0 !rounded-[4px] border border-[var(--admin-border)] shadow-xs">
        <table className="admin-table w-full text-left">
          <thead>
            <tr className="border-b border-[var(--admin-border-subtle)] bg-[var(--admin-surface-muted)]">
              <th className="py-3 px-4 pl-7">
                <SkeletonTextLine width="70px" height="12px" />
              </th>
              <th className="py-3 px-4">
                <SkeletonTextLine width="90px" height="12px" />
              </th>
              <th className="py-3 px-4">
                <SkeletonTextLine width="120px" height="12px" />
              </th>
              <th className="py-3 px-4">
                <SkeletonTextLine width="85px" height="12px" />
              </th>
              <th className="py-3 px-4">
                <SkeletonTextLine width="65px" height="12px" />
              </th>
              <th className="py-3 px-4 text-right pr-5">
                <SkeletonTextLine width="50px" height="12px" className="ml-auto" />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--admin-border-subtle)]">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <tr key={i}>
                <td className="py-3.5 px-4 pl-7">
                  <SkeletonTextLine width="90px" height="14px" className="mb-1" />
                  <SkeletonTextLine width="70px" height="11px" />
                </td>
                <td className="py-3.5 px-4">
                  <SkeletonTextLine width="100px" height="14px" className="mb-1" />
                  <SkeletonTextLine width="130px" height="11px" />
                </td>
                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-2.5">
                    <SkeletonBox width="36px" height="36px" rounded="sm" className="shrink-0" />
                    <div className="space-y-1">
                      <SkeletonTextLine width="160px" height="13px" />
                      <SkeletonTextLine width="70px" height="10px" />
                    </div>
                  </div>
                </td>
                <td className="py-3.5 px-4">
                  <SkeletonTextLine width="75px" height="14px" />
                </td>
                <td className="py-3.5 px-4">
                  <SkeletonBadge width="85px" height="22px" />
                </td>
                <td className="py-3.5 px-4 text-right pr-5">
                  <SkeletonBox width="28px" height="28px" rounded="sm" className="ml-auto" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 5. Mobile Cards */}
      <div className="md:hidden space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-[4px] p-3.5 shadow-xs border border-[var(--admin-border)] bg-[var(--admin-surface)] space-y-2.5"
          >
            <div className="flex items-center justify-between">
              <SkeletonTextLine width="90px" height="14px" />
              <SkeletonBadge width="75px" height="20px" />
            </div>
            <div className="flex items-center gap-2.5">
              <SkeletonBox width="40px" height="40px" rounded="sm" className="shrink-0" />
              <div className="space-y-1 flex-1 min-w-0">
                <SkeletonTextLine width="80%" height="13px" />
                <SkeletonTextLine width="50%" height="11px" />
              </div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-[var(--admin-border-subtle)]">
              <SkeletonTextLine width="80px" height="13px" />
              <SkeletonTextLine width="70px" height="11px" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
export default AdminReturnsHubSkeleton;
