import React from 'react';
import { SkeletonBox, SkeletonTextLine } from '../../ui/Skeletons';

export function AdminExecutiveDashboardSkeleton() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-left admin-section-root">
      {/* 1. Page Title */}
      <div className="mb-8 space-y-1">
        <SkeletonTextLine width="240px" height="30px" />
        <SkeletonTextLine width="320px" height="14px" />
      </div>

      {/* 2. 4 Primary Financials Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-[var(--admin-surface)] p-6 rounded-xl border border-[var(--admin-border)] shadow-sm border-l-4 border-l-[var(--admin-accent)] space-y-2"
          >
            <SkeletonTextLine width="90px" height="13px" />
            <SkeletonTextLine width="130px" height="28px" />
          </div>
        ))}
      </div>

      {/* 3. 2/3 + 1/3 Conversion & AI Insights Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column: Funnel Health (2/3 Width) */}
        <div className="bg-[var(--admin-surface)] rounded-xl shadow-sm border border-[var(--admin-border)] p-6 lg:col-span-2 space-y-6">
          <div className="flex items-center gap-2 pb-2">
            <SkeletonBox width="20px" height="20px" rounded="sm" />
            <SkeletonTextLine width="130px" height="18px" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[1, 2, 3].map((t) => (
              <div
                key={t}
                className="text-center p-4 bg-[var(--admin-surface-muted)] rounded-lg space-y-2"
              >
                <SkeletonBox width="24px" height="24px" rounded="full" className="mx-auto" />
                <SkeletonTextLine width="80px" height="12px" className="mx-auto" />
                <SkeletonTextLine width="50px" height="22px" className="mx-auto" />
                <SkeletonTextLine width="100px" height="10px" className="mx-auto" />
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Executive AI Insights (1/3 Width) */}
        <div className="bg-gradient-to-br from-indigo-950 to-purple-950 rounded-xl shadow-sm border border-indigo-800/40 p-6 text-white space-y-4">
          <div className="flex items-center gap-2">
            <SkeletonBox width="20px" height="20px" rounded="sm" />
            <SkeletonTextLine width="160px" height="18px" />
          </div>

          <div className="space-y-3 pt-2">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="bg-white/10 p-3.5 rounded-lg border border-white/10 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <SkeletonBox width="14px" height="14px" rounded="full" />
                  <SkeletonTextLine width="60px" height="11px" />
                </div>
                <SkeletonTextLine width="90%" height="13px" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
export default AdminExecutiveDashboardSkeleton;
