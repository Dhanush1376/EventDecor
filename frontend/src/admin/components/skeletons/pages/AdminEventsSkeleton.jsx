import React from 'react';
import { AdminSkeleton, SkeletonHeader, SkeletonToolbar } from '../../ui/Skeletons';

export function AdminEventsBookingsTabSkeleton() {
  return (
    <div className="space-y-6 admin-animate-in" aria-busy="true" aria-label="Loading bookings">
      {/* Sticky 42px Toolbar */}
      <SkeletonToolbar hasFilters={true} hasSecondary={true} />

      {/* 4 Connected Operational Telemetry Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="admin-card p-4 sm:p-5 space-y-2.5 rounded-[4px] border border-[var(--admin-border)]"
          >
            <div className="flex items-center justify-between">
              <AdminSkeleton className="w-24 h-3 rounded" />
              <AdminSkeleton className="w-7 h-7 rounded" />
            </div>
            <AdminSkeleton className="w-24 h-6 rounded" />
            <AdminSkeleton className="w-16 h-2.5 rounded" />
          </div>
        ))}
      </div>

      {/* Bookings Table (Desktop) */}
      <div className="hidden md:block admin-card p-0 overflow-hidden rounded-[4px] border border-[var(--admin-border)]">
        <div className="p-3.5 border-b border-[var(--admin-border-subtle)] bg-[var(--admin-bg-subtle)] flex items-center justify-between">
          <div className="flex items-center gap-6 flex-1">
            <AdminSkeleton className="w-24 h-3.5 rounded" />
            <AdminSkeleton className="w-32 h-3.5 rounded" />
            <AdminSkeleton className="w-36 h-3.5 rounded" />
            <AdminSkeleton className="w-28 h-3.5 rounded" />
            <AdminSkeleton className="w-24 h-3.5 rounded" />
            <AdminSkeleton className="w-20 h-3.5 rounded" />
          </div>
          <AdminSkeleton className="w-16 h-3.5 rounded" />
        </div>
        <div className="divide-y divide-[var(--admin-border-subtle)]">
          {Array.from({ length: 7 }).map((_, r) => (
            <div key={r} className="p-3.5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-6 flex-1">
                <AdminSkeleton className="w-20 h-4 rounded font-mono" />
                <div className="space-y-1">
                  <AdminSkeleton className="w-32 h-3.5 rounded" />
                  <AdminSkeleton className="w-20 h-2.5 rounded" />
                </div>
                <div className="space-y-1">
                  <AdminSkeleton className="w-40 h-3.5 rounded" />
                  <AdminSkeleton className="w-24 h-2.5 rounded" />
                </div>
                <AdminSkeleton className="w-28 h-3.5 rounded" />
                <div className="space-y-1">
                  <AdminSkeleton className="w-20 h-3.5 rounded" />
                  <AdminSkeleton className="w-16 h-2.5 rounded" />
                </div>
                <AdminSkeleton className="w-20 h-5 rounded-full" />
              </div>
              <AdminSkeleton className="w-8 h-8 rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Bookings Cards (Mobile) */}
      <div className="md:hidden space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="admin-card p-4 rounded-[4px] border border-[var(--admin-border)] space-y-3"
          >
            <div className="flex items-center justify-between">
              <AdminSkeleton className="w-20 h-4 rounded font-mono" />
              <AdminSkeleton className="w-16 h-5 rounded-full" />
            </div>
            <div className="space-y-1">
              <AdminSkeleton className="w-3/4 h-4 rounded font-bold" />
              <AdminSkeleton className="w-1/2 h-3 rounded" />
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-[var(--admin-border-subtle)]">
              <AdminSkeleton className="w-24 h-3.5 rounded" />
              <AdminSkeleton className="w-16 h-4 rounded font-bold" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdminEventsShowcasesTabSkeleton() {
  return (
    <div className="space-y-6 admin-animate-in" aria-busy="true" aria-label="Loading showcases">
      {/* 4-Column Showcase Gift Grid Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="admin-card overflow-hidden p-0 rounded-[4px] border border-[var(--admin-border)] flex flex-col justify-between"
          >
            <AdminSkeleton className="w-full aspect-[16/10] rounded-none" />
            <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <AdminSkeleton className="w-16 h-4 rounded-full" />
                  <AdminSkeleton className="w-12 h-3 rounded" />
                </div>
                <AdminSkeleton className="w-full h-4 rounded" />
                <AdminSkeleton className="w-2/3 h-3.5 rounded" />
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-[var(--admin-border-subtle)]">
                <AdminSkeleton className="w-20 h-5 rounded" />
                <AdminSkeleton className="w-14 h-4 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdminEventsPackagesTabSkeleton() {
  return (
    <div className="space-y-6 admin-animate-in" aria-busy="true" aria-label="Loading packages">
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <AdminSkeleton className="w-48 h-5 rounded" />
          <AdminSkeleton className="w-72 h-3.5 rounded" />
        </div>
        <AdminSkeleton className="w-44 h-9 rounded-[4px]" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="admin-card overflow-hidden p-0 rounded-[4px] border border-[var(--admin-border)] flex flex-col"
          >
            <AdminSkeleton className="w-full aspect-[16/10] rounded-none" />
            <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <AdminSkeleton className="w-3/4 h-5 rounded" />
                  <AdminSkeleton className="w-16 h-4 rounded font-bold" />
                </div>
                <AdminSkeleton className="w-full h-3.5 rounded" />
                <AdminSkeleton className="w-2/3 h-3.5 rounded" />
              </div>
              <div className="flex gap-2 pt-2 border-t border-[var(--admin-border-subtle)]">
                <AdminSkeleton className="w-16 h-6 rounded-full" />
                <AdminSkeleton className="w-16 h-6 rounded-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdminEventsCalendarTabSkeleton() {
  return (
    <div className="space-y-6 admin-animate-in" aria-busy="true" aria-label="Loading calendar">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Month Calendar Grid (8 cols) */}
        <div className="lg:col-span-8 admin-card p-5 rounded-[4px] border border-[var(--admin-border)] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--admin-border-subtle)]">
            <AdminSkeleton className="w-36 h-6 rounded" />
            <div className="flex gap-2">
              <AdminSkeleton className="w-8 h-8 rounded" />
              <AdminSkeleton className="w-8 h-8 rounded" />
            </div>
          </div>
          <div className="grid grid-cols-7 gap-2 text-center pb-2">
            {[1, 2, 3, 4, 5, 6, 7].map((d) => (
              <AdminSkeleton key={d} className="w-8 h-3 rounded mx-auto" />
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 35 }).map((_, day) => (
              <div
                key={day}
                className="h-16 p-1.5 rounded border border-[var(--admin-border-subtle)] space-y-1 bg-[var(--admin-surface)]"
              >
                <AdminSkeleton className="w-4 h-3 rounded" />
                {day % 4 === 0 && (
                  <AdminSkeleton className="w-full h-3 rounded bg-[var(--admin-accent)]/20" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Day Schedule Sidebar (4 cols) */}
        <div className="lg:col-span-4 admin-card p-5 rounded-[4px] border border-[var(--admin-border)] space-y-4">
          <AdminSkeleton className="w-32 h-5 rounded" />
          <div className="space-y-3">
            {[1, 2, 3].map((ev) => (
              <div key={ev} className="p-3 bg-[var(--admin-bg-subtle)] rounded space-y-1.5">
                <AdminSkeleton className="w-20 h-3 rounded" />
                <AdminSkeleton className="w-3/4 h-4 rounded font-bold" />
                <AdminSkeleton className="w-1/2 h-3 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AdminEventsSkeleton({ activeTab = 'bookings' }) {
  return (
    <div className="space-y-6 pb-8 admin-animate-in" aria-busy="true" aria-label="Loading events">
      {/* Header */}
      <SkeletonHeader titleWidth="w-48" subtitleWidth="w-80" actionWidth="w-36" />

      {/* Tabs Switcher Bar */}
      <div className="flex items-center gap-2 border-b border-[var(--admin-border-subtle)] pb-2 overflow-x-auto">
        <AdminSkeleton className="w-24 h-9 rounded-[4px]" />
        <AdminSkeleton className="w-24 h-9 rounded-[4px]" />
        <AdminSkeleton className="w-24 h-9 rounded-[4px]" />
        <AdminSkeleton className="w-24 h-9 rounded-[4px]" />
      </div>

      {/* Tab-Specific Content */}
      {activeTab === 'calendar' ? (
        <AdminEventsCalendarTabSkeleton />
      ) : activeTab === 'showcases' ? (
        <AdminEventsShowcasesTabSkeleton />
      ) : activeTab === 'packages' ? (
        <AdminEventsPackagesTabSkeleton />
      ) : (
        <AdminEventsBookingsTabSkeleton />
      )}
    </div>
  );
}
