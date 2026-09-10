import React from 'react';
import { SkeletonBox, SkeletonTextLine, SkeletonBadge } from '../../ui/Skeletons';

export function AdminDraftsSkeleton() {
  return (
    <div className="admin-section-root space-y-6 text-left">
      {/* 1. Header with Title & Storage Used */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <SkeletonTextLine width="160px" height="26px" />
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right hidden sm:block space-y-1">
            <SkeletonTextLine width="75px" height="10px" />
            <SkeletonTextLine width="55px" height="13px" />
          </div>
          <SkeletonBox width="85px" height="32px" rounded="sm" />
        </div>
      </div>

      {/* 2. Main Card Container */}
      <div className="admin-card overflow-hidden min-h-[400px] p-0 border border-[var(--admin-border)] shadow-xs">
        {/* Filter Bar */}
        <div className="p-4 border-b border-[var(--admin-border-subtle)] flex flex-col sm:flex-row gap-3 items-center justify-between bg-[var(--admin-surface-muted)]">
          <div className="w-full sm:w-72 bg-[var(--admin-surface)] rounded border border-[var(--admin-border)] flex items-center px-3 h-9">
            <SkeletonBox width="16px" height="16px" rounded="full" className="shrink-0" />
            <SkeletonTextLine width="140px" height="12px" className="ml-2" />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
            {['All', 'Products', 'Events', 'Categories', 'Coupons', 'Settings'].map((_, idx) => (
              <SkeletonBox key={idx} width="65px" height="28px" rounded="sm" />
            ))}
          </div>
        </div>

        {/* Drafts Table */}
        <table className="admin-table w-full text-left">
          <thead>
            <tr className="border-b border-[var(--admin-border-subtle)] bg-[var(--admin-surface)]">
              <th className="py-3 px-4">
                <SkeletonTextLine width="90px" height="11px" />
              </th>
              <th className="py-3 px-4">
                <SkeletonTextLine width="60px" height="11px" />
              </th>
              <th className="py-3 px-4">
                <SkeletonTextLine width="100px" height="11px" />
              </th>
              <th className="py-3 px-4 text-right pr-4">
                <SkeletonTextLine width="50px" height="11px" className="ml-auto" />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--admin-border-subtle)]">
            {[1, 2, 3, 4, 5].map((i) => (
              <tr key={i}>
                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-3">
                    <SkeletonBox width="32px" height="32px" rounded="sm" className="shrink-0" />
                    <div className="space-y-1">
                      <SkeletonTextLine width="170px" height="14px" />
                      <SkeletonTextLine width="120px" height="11px" />
                    </div>
                  </div>
                </td>
                <td className="py-3.5 px-4">
                  <SkeletonBadge width="75px" height="20px" />
                </td>
                <td className="py-3.5 px-4">
                  <SkeletonTextLine width="110px" height="12px" />
                </td>
                <td className="py-3.5 px-4 text-right pr-4">
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
export default AdminDraftsSkeleton;
