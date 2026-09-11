import React from 'react';
import { SkeletonBox, SkeletonTextLine, SkeletonBadge } from '../../ui/Skeletons';

export function AdminCampaignsSkeleton() {
  return (
    <div className="max-w-[1300px] mx-auto space-y-6 pb-20 text-left admin-section-root">
      {/* 1. Page Header with Tabs & Create Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-[var(--admin-border-subtle)] pb-5 gap-4">
        <div>
          <SkeletonTextLine width="280px" height="26px" className="mb-1" />
          <SkeletonTextLine width="380px" height="14px" />
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto w-full sm:w-auto justify-end">
          {/* Tabs: Campaigns / Templates */}
          <div className="flex gap-1.5 bg-[var(--admin-surface-muted)] p-1 rounded-full">
            <SkeletonBox width="100px" height="32px" rounded="full" />
            <SkeletonBox width="100px" height="32px" rounded="full" />
          </div>
          <SkeletonBox width="120px" height="36px" rounded="sm" />
        </div>
      </div>

      {/* 2. Analytics 4-Card Summary Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-[var(--admin-surface)] border border-[var(--admin-border-subtle)] p-4 sm:p-5 rounded-[var(--admin-radius-lg)] shadow-sm flex items-start gap-3 min-w-0"
          >
            <SkeletonBox width="36px" height="36px" rounded="lg" className="shrink-0" />
            <div className="space-y-1.5 flex-1 min-w-0">
              <SkeletonTextLine width="80px" height="10px" />
              <SkeletonTextLine width="60px" height="20px" />
              <SkeletonTextLine width="110px" height="10px" />
            </div>
          </div>
        ))}
      </div>

      {/* 3. Campaigns Table Skeleton (Desktop) */}
      <div className="hidden md:block bg-[var(--admin-surface)] border border-[var(--admin-border-subtle)] rounded-[var(--admin-radius-lg)] overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-[var(--admin-border-subtle)] bg-[var(--admin-surface-muted)]">
              <th className="p-4">
                <SkeletonTextLine width="100px" height="12px" />
              </th>
              <th className="p-4">
                <SkeletonTextLine width="80px" height="12px" />
              </th>
              <th className="p-4">
                <SkeletonTextLine width="60px" height="12px" />
              </th>
              <th className="p-4 text-center">
                <SkeletonTextLine width="100px" height="12px" className="mx-auto" />
              </th>
              <th className="p-4 text-right">
                <SkeletonTextLine width="50px" height="12px" className="ml-auto" />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--admin-border-subtle)]">
            {[1, 2, 3, 4, 5].map((i) => (
              <tr key={i}>
                <td className="p-4">
                  <SkeletonTextLine width="180px" height="14px" className="mb-1" />
                  <SkeletonTextLine width="140px" height="11px" />
                </td>
                <td className="p-4">
                  <SkeletonBadge width="85px" height="20px" />
                </td>
                <td className="p-4">
                  <SkeletonBadge width="70px" height="20px" />
                </td>
                <td className="p-4">
                  <div className="flex items-center justify-center gap-6">
                    <div className="text-center space-y-1">
                      <SkeletonTextLine width="30px" height="14px" className="mx-auto" />
                      <SkeletonTextLine width="25px" height="10px" className="mx-auto" />
                    </div>
                    <div className="text-center space-y-1">
                      <SkeletonTextLine width="30px" height="14px" className="mx-auto" />
                      <SkeletonTextLine width="25px" height="10px" className="mx-auto" />
                    </div>
                    <div className="text-center space-y-1">
                      <SkeletonTextLine width="30px" height="14px" className="mx-auto" />
                      <SkeletonTextLine width="25px" height="10px" className="mx-auto" />
                    </div>
                  </div>
                </td>
                <td className="p-4 text-right">
                  <SkeletonBox width="85px" height="28px" rounded="full" className="ml-auto" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Campaigns Cards */}
      <div className="md:hidden space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-[4px] p-3.5 shadow-xs border border-[var(--admin-border)] bg-[var(--admin-surface)] space-y-2.5"
          >
            <div className="flex items-center justify-between">
              <SkeletonTextLine width="140px" height="14px" />
              <SkeletonBadge width="75px" height="20px" />
            </div>
            <SkeletonTextLine width="100px" height="11px" />
            <div className="flex items-center justify-between pt-2 border-t border-[var(--admin-border-subtle)]">
              <SkeletonBadge width="65px" height="18px" />
              <SkeletonBox width="70px" height="26px" rounded="full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
export default AdminCampaignsSkeleton;
