import React from 'react';
import { SkeletonBox, SkeletonTextLine, SkeletonBadge } from '../../ui/Skeletons';

export function AdminReturnDetailSkeleton() {
  return (
    <div className="space-y-6 text-left admin-section-root">
      {/* 1. Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 sm:p-4 rounded-[4px] border border-[var(--admin-border-subtle)] bg-[var(--admin-surface)] shadow-xs">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <SkeletonTextLine width="160px" height="22px" />
            <SkeletonBadge width="90px" height="20px" />
            <SkeletonBadge width="80px" height="20px" />
          </div>
          <div className="flex items-center gap-3">
            <SkeletonTextLine width="110px" height="13px" />
            <SkeletonTextLine width="140px" height="12px" />
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <SkeletonBox width="110px" height="38px" rounded="sm" />
          <SkeletonBox width="100px" height="38px" rounded="sm" />
        </div>
      </div>

      {/* 2. Main 2/3 + 1/3 Grid */}
      <div className="max-w-[1400px] mx-auto w-auto">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
          {/* Left Column: 2/3 Width */}
          <div className="xl:col-span-2 space-y-6">
            {/* Card 1: Lifecycle Progression Stepper */}
            <div className="bg-[var(--admin-surface)] rounded-[4px] shadow-sm border border-[var(--admin-border-subtle)] p-5 space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--admin-border-subtle)]">
                <div className="space-y-1">
                  <SkeletonTextLine width="150px" height="16px" />
                  <SkeletonTextLine width="260px" height="12px" />
                </div>
                <SkeletonBox width="140px" height="32px" rounded="sm" />
              </div>

              {/* Stepper Milestones */}
              <div className="flex items-center justify-between py-4 px-2">
                {['Submitted', 'Approved', 'Picked Up', 'QC Passed', 'Completed'].map(
                  (step, idx) => (
                    <div key={idx} className="flex flex-col items-center gap-2">
                      <SkeletonBox width="36px" height="36px" rounded="full" />
                      <SkeletonTextLine width="65px" height="11px" />
                    </div>
                  ),
                )}
              </div>
            </div>

            {/* Card 2: Returned Items & Inspection Dossier */}
            <div className="bg-[var(--admin-surface)] rounded-[4px] shadow-sm border border-[var(--admin-border-subtle)] p-5 space-y-5">
              <div className="pb-3 border-b border-[var(--admin-border-subtle)] flex items-center justify-between">
                <SkeletonTextLine width="180px" height="16px" />
                <SkeletonBadge width="60px" height="20px" />
              </div>

              {/* Item Row */}
              <div className="flex items-start gap-4 p-4 rounded bg-[var(--admin-surface-muted)] border border-[var(--admin-border-subtle)]">
                <SkeletonBox width="64px" height="64px" rounded="sm" className="shrink-0" />
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex justify-between">
                    <SkeletonTextLine width="180px" height="15px" />
                    <SkeletonTextLine width="70px" height="15px" />
                  </div>
                  <SkeletonTextLine width="120px" height="12px" />
                  <SkeletonTextLine width="90%" height="12px" />
                </div>
              </div>

              {/* Evidence Photos Row */}
              <div className="space-y-2 pt-2">
                <SkeletonTextLine width="130px" height="12px" />
                <div className="flex items-center gap-3">
                  {[1, 2, 3].map((img) => (
                    <SkeletonBox key={img} width="70px" height="70px" rounded="sm" />
                  ))}
                </div>
              </div>

              {/* QC Inspection Checklist */}
              <div className="p-4 rounded bg-[var(--admin-surface-muted)] border border-[var(--admin-border-subtle)] space-y-3">
                <SkeletonTextLine width="160px" height="14px" />
                <div className="space-y-2.5">
                  {[1, 2, 3].map((chk) => (
                    <div key={chk} className="flex justify-between items-center">
                      <SkeletonTextLine width="130px" height="12px" />
                      <div className="flex gap-2">
                        <SkeletonBox width="45px" height="24px" rounded="sm" />
                        <SkeletonBox width="45px" height="24px" rounded="sm" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Card 3: Action Console */}
            <div className="bg-[var(--admin-surface)] rounded-[4px] shadow-sm border border-[var(--admin-border-subtle)] p-4 flex items-center justify-between">
              <SkeletonTextLine width="130px" height="14px" />
              <div className="flex items-center gap-2">
                <SkeletonBox width="85px" height="36px" rounded="sm" />
                <SkeletonBox width="95px" height="36px" rounded="sm" />
              </div>
            </div>
          </div>

          {/* Right Column: 1/3 Width */}
          <div className="space-y-6">
            {/* Card 1: Financial Settlement & Refund Breakdown */}
            <div className="bg-[var(--admin-surface)] rounded-[4px] shadow-sm border border-[var(--admin-border-subtle)] p-5 space-y-4">
              <div className="pb-3 border-b border-[var(--admin-border-subtle)] flex items-center justify-between">
                <SkeletonTextLine width="140px" height="15px" />
                <SkeletonBadge width="60px" height="18px" />
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between">
                  <SkeletonTextLine width="90px" height="12px" />
                  <SkeletonTextLine width="60px" height="12px" />
                </div>
                <div className="flex justify-between">
                  <SkeletonTextLine width="100px" height="12px" />
                  <SkeletonTextLine width="50px" height="12px" />
                </div>
                <div className="flex justify-between">
                  <SkeletonTextLine width="110px" height="12px" />
                  <SkeletonTextLine width="55px" height="12px" />
                </div>
                <div className="flex justify-between pt-2 border-t border-[var(--admin-border-subtle)]">
                  <SkeletonTextLine width="100px" height="14px" />
                  <SkeletonTextLine width="75px" height="16px" />
                </div>
              </div>
            </div>

            {/* Card 2: Customer & Pickup Dossier */}
            <div className="bg-[var(--admin-surface)] rounded-[4px] shadow-sm border border-[var(--admin-border-subtle)] p-5 space-y-4">
              <div className="pb-3 border-b border-[var(--admin-border-subtle)]">
                <SkeletonTextLine width="160px" height="15px" />
              </div>

              <div className="flex items-center gap-3">
                <SkeletonBox width="44px" height="44px" rounded="full" className="shrink-0" />
                <div className="space-y-1 flex-1 min-w-0">
                  <SkeletonTextLine width="130px" height="14px" />
                  <SkeletonTextLine width="160px" height="11px" />
                  <SkeletonTextLine width="100px" height="11px" />
                </div>
              </div>

              {/* Fraud Risk Stats */}
              <div className="grid grid-cols-3 gap-2 p-2.5 rounded bg-[var(--admin-surface-muted)] text-center">
                <div className="space-y-1">
                  <SkeletonTextLine width="35px" height="10px" className="mx-auto" />
                  <SkeletonTextLine width="20px" height="14px" className="mx-auto" />
                </div>
                <div className="space-y-1 border-x border-[var(--admin-border-subtle)]">
                  <SkeletonTextLine width="40px" height="10px" className="mx-auto" />
                  <SkeletonTextLine width="20px" height="14px" className="mx-auto" />
                </div>
                <div className="space-y-1">
                  <SkeletonTextLine width="30px" height="10px" className="mx-auto" />
                  <SkeletonTextLine width="25px" height="14px" className="mx-auto" />
                </div>
              </div>

              {/* Pickup Address Strip */}
              <div className="space-y-1.5 pt-2 border-t border-[var(--admin-border-subtle)]">
                <SkeletonTextLine width="120px" height="11px" />
                <SkeletonTextLine width="90%" height="12px" />
                <SkeletonTextLine width="75%" height="12px" />
              </div>
            </div>

            {/* Card 3: Reverse Logistics */}
            <div className="bg-[var(--admin-surface)] rounded-[4px] shadow-sm border border-[var(--admin-border-subtle)] p-5 space-y-3">
              <SkeletonTextLine width="130px" height="14px" />
              <div className="flex justify-between text-xs">
                <SkeletonTextLine width="70px" height="12px" />
                <SkeletonTextLine width="90px" height="12px" />
              </div>
              <div className="flex justify-between text-xs">
                <SkeletonTextLine width="60px" height="12px" />
                <SkeletonTextLine width="110px" height="12px" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
export default AdminReturnDetailSkeleton;
