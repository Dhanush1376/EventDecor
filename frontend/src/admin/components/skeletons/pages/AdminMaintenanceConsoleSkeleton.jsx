import React from 'react';
import { SkeletonBox, SkeletonTextLine, SkeletonBadge } from '../../ui/Skeletons';

export function AdminMaintenanceConsoleSkeleton() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-6 lg:p-10 admin-section-root text-left">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* 1. Dark Console Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#141414] p-6 rounded-2xl border border-white/5 shadow-xl">
          <div className="flex items-center gap-4">
            <SkeletonBox width="40px" height="40px" rounded="lg" />
            <div className="space-y-1.5">
              <SkeletonTextLine width="200px" height="22px" />
              <div className="flex items-center gap-2">
                <SkeletonBox width="8px" height="8px" rounded="full" />
                <SkeletonTextLine width="130px" height="12px" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <SkeletonBox width="85px" height="36px" rounded="lg" />
            <SkeletonBox width="130px" height="36px" rounded="lg" />
          </div>
        </div>

        {/* 2. Main 2/3 + 1/3 Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Main Controls (2/3 Width) */}
          <div className="lg:col-span-2 space-y-6">
            {/* System Status Card */}
            <div className="bg-[#141414] p-6 rounded-2xl border border-white/5 shadow-xl space-y-4">
              <div className="flex items-center gap-2 pb-2">
                <SkeletonBox width="20px" height="20px" rounded="sm" />
                <SkeletonTextLine width="130px" height="18px" />
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-black/30 rounded-xl border border-white/5 gap-4">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <SkeletonTextLine width="140px" height="16px" />
                    <SkeletonBadge width="60px" height="18px" />
                  </div>
                  <SkeletonTextLine width="260px" height="12px" />
                </div>
                <SkeletonBox width="160px" height="42px" rounded="lg" />
              </div>
            </div>

            {/* Security Audit Logs Table */}
            <div className="bg-[#141414] p-6 rounded-2xl border border-white/5 shadow-xl space-y-4">
              <div className="flex items-center gap-2 pb-2">
                <SkeletonBox width="20px" height="20px" rounded="sm" />
                <SkeletonTextLine width="160px" height="18px" />
              </div>

              <div className="space-y-2.5">
                {[1, 2, 3, 4].map((row) => (
                  <div
                    key={row}
                    className="flex items-center justify-between py-2 border-b border-white/5"
                  >
                    <SkeletonTextLine width="70px" height="12px" />
                    <SkeletonTextLine width="140px" height="12px" />
                    <SkeletonBadge width="55px" height="18px" />
                    <SkeletonTextLine width="90px" height="12px" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Session Info Sidebar (1/3 Width) */}
          <div className="space-y-6">
            <div className="bg-[#141414] p-6 rounded-2xl border border-white/5 shadow-xl space-y-5">
              <div className="flex items-center gap-2 pb-2">
                <SkeletonBox width="20px" height="20px" rounded="sm" />
                <SkeletonTextLine width="110px" height="18px" />
              </div>

              <div className="space-y-2">
                <SkeletonTextLine width="75px" height="11px" />
                <SkeletonTextLine width="100px" height="26px" />
              </div>

              <div className="space-y-2">
                <SkeletonTextLine width="90px" height="11px" />
                <SkeletonBox width="100%" height="36px" rounded="sm" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
export default AdminMaintenanceConsoleSkeleton;
