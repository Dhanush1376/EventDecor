import React from 'react';
import { SkeletonBox, SkeletonTextLine, SkeletonBadge } from '../../ui/Skeletons';

export function AdminRecycleBinSkeleton() {
  return (
    <div className="space-y-6 pb-12 sm:pb-8 text-left admin-section-root">
      {/* 1. Page Header (No Icon, Matches Orders Page) */}
      <div className="border-b border-[var(--admin-border-subtle)] pb-4">
        <SkeletonTextLine width="160px" height="26px" className="mb-2" />
        <SkeletonTextLine width="380px" height="13px" />
      </div>

      {/* 2. Sticky 42px Toolbar */}
      <div className="flex flex-row items-center gap-2 w-full">
        {/* Search */}
        <div className="flex-1 min-w-0 bg-[var(--admin-surface-muted)] rounded border border-[var(--admin-border)] flex items-center px-3 h-[42px]">
          <SkeletonBox width="18px" height="18px" rounded="full" className="shrink-0" />
          <SkeletonTextLine width="200px" height="13px" className="ml-2" />
          <div className="ml-auto flex items-center gap-1">
            <SkeletonBox width="28px" height="28px" rounded="sm" />
            <SkeletonBox width="28px" height="28px" rounded="sm" />
          </div>
        </div>

        {/* 2 Select Dropdowns */}
        <div className="flex items-center gap-2 shrink-0">
          <SkeletonBox width="130px" height="42px" rounded="sm" />
          <SkeletonBox width="135px" height="42px" rounded="sm" />
        </div>
      </div>

      {/* 3. Deleted Items Table */}
      <div className="admin-card p-0 overflow-hidden border border-[var(--admin-border)] shadow-xs rounded-[4px]">
        <table className="admin-table w-full text-left">
          <thead>
            <tr className="border-b border-[var(--admin-border-subtle)] bg-[var(--admin-surface-muted)]">
              <th className="py-3 px-4 w-10">
                <SkeletonBox width="16px" height="16px" rounded="xs" />
              </th>
              <th className="py-3 px-4">
                <SkeletonTextLine width="110px" height="12px" />
              </th>
              <th className="py-3 px-4">
                <SkeletonTextLine width="75px" height="12px" />
              </th>
              <th className="py-3 px-4">
                <SkeletonTextLine width="90px" height="12px" />
              </th>
              <th className="py-3 px-4">
                <SkeletonTextLine width="80px" height="12px" />
              </th>
              <th className="py-3 px-4 text-right">
                <SkeletonTextLine width="60px" height="12px" className="ml-auto" />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--admin-border-subtle)]">
            {[1, 2, 3, 4, 5].map((i) => (
              <tr key={i}>
                <td className="py-3.5 px-4">
                  <SkeletonBox width="16px" height="16px" rounded="xs" />
                </td>
                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-3">
                    <SkeletonBox width="42px" height="42px" rounded="sm" className="shrink-0" />
                    <div className="space-y-1">
                      <SkeletonTextLine width="160px" height="14px" />
                      <SkeletonTextLine width="100px" height="11px" />
                    </div>
                  </div>
                </td>
                <td className="py-3.5 px-4">
                  <SkeletonBadge width="65px" height="20px" />
                </td>
                <td className="py-3.5 px-4">
                  <SkeletonTextLine width="110px" height="12px" className="mb-1" />
                  <SkeletonTextLine width="80px" height="10px" />
                </td>
                <td className="py-3.5 px-4">
                  <SkeletonBadge width="80px" height="20px" />
                </td>
                <td className="py-3.5 px-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <SkeletonBox width="70px" height="30px" rounded="sm" />
                    <SkeletonBox width="30px" height="30px" rounded="sm" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
export default AdminRecycleBinSkeleton;
