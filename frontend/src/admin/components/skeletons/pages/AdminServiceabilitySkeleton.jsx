import React from 'react';
import { SkeletonBox, SkeletonTextLine, SkeletonBadge } from '../../ui/Skeletons';

export function AdminServiceabilitySkeleton() {
  return (
    <div className="bg-[var(--admin-surface)] rounded-[4px] border border-[var(--admin-border)] shadow-xs overflow-hidden flex flex-col h-full text-left admin-section-root">
      {/* 1. Header with Title, Counts & Search */}
      <div className="p-4 sm:p-5 border-b border-[var(--admin-border-subtle)] space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <SkeletonTextLine width="220px" height="18px" />
            <SkeletonTextLine width="150px" height="12px" />
          </div>
          <SkeletonBadge width="80px" height="22px" />
        </div>

        {/* Search Bar */}
        <div className="w-full bg-[var(--admin-surface-muted)] rounded-[4px] border border-[var(--admin-border)] flex items-center px-3 h-[38px]">
          <SkeletonBox width="16px" height="16px" rounded="full" className="shrink-0" />
          <SkeletonTextLine width="180px" height="13px" className="ml-2" />
        </div>
      </div>

      {/* 2. Table Content */}
      <div className="overflow-x-auto flex-1">
        <table className="w-full min-w-[480px] text-left border-collapse">
          <thead>
            <tr className="border-b border-[var(--admin-border)] bg-[var(--admin-bg-subtle)]">
              <th className="px-3.5 py-2.5">
                <SkeletonTextLine width="100px" height="11px" />
              </th>
              <th className="px-3.5 py-2.5">
                <SkeletonTextLine width="110px" height="11px" />
              </th>
              <th className="px-3.5 py-2.5 text-center">
                <SkeletonTextLine width="45px" height="11px" className="mx-auto" />
              </th>
              <th className="px-3.5 py-2.5 text-right">
                <SkeletonTextLine width="45px" height="11px" className="ml-auto" />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--admin-border-subtle)]">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <tr key={i}>
                <td className="px-3.5 py-3">
                  <SkeletonTextLine width="130px" height="14px" className="mb-1" />
                  <SkeletonTextLine width="60px" height="10px" />
                </td>
                <td className="px-3.5 py-3 space-y-1">
                  <SkeletonTextLine width="140px" height="12px" />
                  <SkeletonTextLine width="110px" height="11px" />
                </td>
                <td className="px-3.5 py-3 text-center">
                  <SkeletonBadge width="55px" height="20px" className="mx-auto" />
                </td>
                <td className="px-3.5 py-3 text-right">
                  <SkeletonBox width="28px" height="28px" rounded="sm" className="ml-auto" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
export default AdminServiceabilitySkeleton;
