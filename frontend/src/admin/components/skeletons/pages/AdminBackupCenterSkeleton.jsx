import React from 'react';
import { SkeletonBox, SkeletonTextLine, SkeletonBadge } from '../../ui/Skeletons';

export function AdminBackupCenterSkeleton() {
  return (
    <div className="space-y-6 text-left admin-section-root">
      {/* 1. Page Header with Trigger Backup Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--admin-border-subtle)]">
        <div className="space-y-1">
          <SkeletonTextLine width="220px" height="26px" />
          <SkeletonTextLine width="340px" height="13px" />
        </div>

        <div className="flex items-center gap-2">
          <SkeletonBox width="110px" height="38px" rounded="sm" />
          <SkeletonBox width="120px" height="38px" rounded="sm" />
        </div>
      </div>

      {/* 2. Nav Tabs Bar */}
      <div className="flex border-b border-[var(--admin-border-subtle)] gap-4 overflow-x-auto pb-2">
        {[
          'Overview',
          'Backup History',
          'Restore Wizard',
          'Disaster Recovery',
          'Retention',
          'Audit Trail',
        ].map((tab, idx) => (
          <SkeletonBox key={idx} width="100px" height="32px" rounded="sm" className="shrink-0" />
        ))}
      </div>

      {/* 3. 4 Top Metric Cards (including Circular Health Gauge) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* System Health with Circular Gauge */}
        <div className="admin-card p-5 border border-[var(--admin-border)] rounded-xl space-y-3">
          <div className="flex items-center gap-2">
            <SkeletonBox width="18px" height="18px" rounded="sm" />
            <SkeletonTextLine width="100px" height="13px" />
          </div>
          <div className="flex items-center gap-4">
            <SkeletonBox width="64px" height="64px" rounded="full" className="shrink-0" />
            <div className="space-y-1.5">
              <SkeletonTextLine width="80px" height="14px" />
              <SkeletonTextLine width="110px" height="11px" />
            </div>
          </div>
        </div>

        {/* Total Protected Data */}
        <div className="admin-card p-5 border border-[var(--admin-border)] rounded-xl space-y-2">
          <div className="flex items-center gap-2">
            <SkeletonBox width="18px" height="18px" rounded="sm" />
            <SkeletonTextLine width="130px" height="13px" />
          </div>
          <SkeletonTextLine width="90px" height="26px" />
          <SkeletonTextLine width="100px" height="11px" />
        </div>

        {/* Backup Success Rate */}
        <div className="admin-card p-5 border border-[var(--admin-border)] rounded-xl space-y-2">
          <div className="flex items-center gap-2">
            <SkeletonBox width="18px" height="18px" rounded="sm" />
            <SkeletonTextLine width="125px" height="13px" />
          </div>
          <SkeletonTextLine width="80px" height="26px" />
          <SkeletonTextLine width="90px" height="11px" />
        </div>

        {/* Active Schedules */}
        <div className="admin-card p-5 border border-[var(--admin-border)] rounded-xl space-y-2">
          <div className="flex items-center gap-2">
            <SkeletonBox width="18px" height="18px" rounded="sm" />
            <SkeletonTextLine width="120px" height="13px" />
          </div>
          <SkeletonTextLine width="60px" height="26px" />
          <SkeletonTextLine width="110px" height="11px" />
        </div>
      </div>

      {/* 4. Backup History Table Wireframe */}
      <div className="admin-card p-0 overflow-hidden border border-[var(--admin-border)] rounded-xl shadow-xs">
        <div className="p-4 border-b border-[var(--admin-border-subtle)] flex items-center justify-between">
          <SkeletonTextLine width="140px" height="16px" />
          <SkeletonBadge width="65px" height="20px" />
        </div>

        <table className="admin-table w-full text-left">
          <thead>
            <tr className="border-b border-[var(--admin-border-subtle)] bg-[var(--admin-surface-muted)]">
              <th className="py-3 px-4">
                <SkeletonTextLine width="90px" height="11px" />
              </th>
              <th className="py-3 px-4">
                <SkeletonTextLine width="60px" height="11px" />
              </th>
              <th className="py-3 px-4">
                <SkeletonTextLine width="75px" height="11px" />
              </th>
              <th className="py-3 px-4">
                <SkeletonTextLine width="80px" height="11px" />
              </th>
              <th className="py-3 px-4 text-right">
                <SkeletonTextLine width="50px" height="11px" className="ml-auto" />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--admin-border-subtle)]">
            {[1, 2, 3, 4].map((i) => (
              <tr key={i}>
                <td className="py-3.5 px-4">
                  <SkeletonTextLine width="140px" height="13px" />
                </td>
                <td className="py-3.5 px-4">
                  <SkeletonBadge width="60px" height="18px" />
                </td>
                <td className="py-3.5 px-4">
                  <SkeletonTextLine width="70px" height="13px" />
                </td>
                <td className="py-3.5 px-4">
                  <SkeletonBadge width="75px" height="20px" />
                </td>
                <td className="py-3.5 px-4 text-right">
                  <SkeletonBox width="65px" height="26px" rounded="sm" className="ml-auto" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
export default AdminBackupCenterSkeleton;
