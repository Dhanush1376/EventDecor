import React from 'react';
import { SkeletonBox, SkeletonTextLine, SkeletonBadge } from '../../ui/Skeletons';

export function AdminProductionSkeleton() {
  return (
    <div className="flex flex-col flex-1 space-y-6 text-left admin-section-root">
      {/* 1. Page Header */}
      <div>
        <SkeletonTextLine width="180px" height="26px" className="mb-2" />
        <SkeletonTextLine width="380px" height="13px" />

        {/* Filter Tabs */}
        <div className="flex border-b border-[var(--admin-border-subtle)] gap-4 mt-4 pb-2">
          {['Production', 'Quality Check', 'Ready for Packing'].map((tab, idx) => (
            <div key={idx} className="flex items-center gap-2 px-4 py-2">
              <SkeletonBox width="18px" height="18px" rounded="sm" />
              <SkeletonTextLine width="80px" height="14px" />
            </div>
          ))}
        </div>
      </div>

      {/* 2. 4-Column Kanban Board */}
      <div className="flex-1 flex overflow-x-auto gap-6 pb-4 pt-2 snap-x">
        {['Sourcing Materials', 'Assembly', 'Quality Assurance', 'Ready for Dispatch'].map(
          (stage, idx) => (
            <div
              key={idx}
              className="flex-1 min-w-[300px] max-w-[340px] flex flex-col bg-[var(--admin-surface-muted)]/50 rounded-xl p-4 border border-[var(--admin-border-subtle)] space-y-4"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-2 border-b border-[var(--admin-border-subtle)]">
                <div className="flex items-center gap-2">
                  <SkeletonBox width="20px" height="20px" rounded="sm" />
                  <SkeletonTextLine width="120px" height="15px" />
                </div>
                <SkeletonBadge width="24px" height="20px" />
              </div>

              {/* Task Cards Stack */}
              <div className="space-y-3 flex-1">
                {[1, 2, 3].map((task) => (
                  <div
                    key={task}
                    className="bg-[var(--admin-surface)] p-4 rounded-lg border border-[var(--admin-border)] shadow-xs space-y-3"
                  >
                    {/* Task ID & SKU */}
                    <div className="flex justify-between items-center">
                      <SkeletonTextLine width="80px" height="12px" />
                      <SkeletonBadge width="55px" height="16px" />
                    </div>

                    {/* Item Title */}
                    <SkeletonTextLine width="90%" height="14px" />

                    {/* Artisan & Due Date */}
                    <div className="flex items-center justify-between text-[11px] pt-1 border-t border-[var(--admin-border-subtle)]">
                      <div className="flex items-center gap-1.5">
                        <SkeletonBox width="14px" height="14px" rounded="full" />
                        <SkeletonTextLine width="65px" height="10px" />
                      </div>
                      <SkeletonTextLine width="55px" height="10px" />
                    </div>

                    {/* Progress Bar & Transition Action */}
                    <div className="space-y-2 pt-1">
                      <SkeletonBox width="100%" height="6px" rounded="full" />
                      <SkeletonBox width="100%" height="28px" rounded="sm" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ),
        )}
      </div>
    </div>
  );
}
export default AdminProductionSkeleton;
