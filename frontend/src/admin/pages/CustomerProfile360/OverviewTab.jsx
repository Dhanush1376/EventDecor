import React from 'react';
import { formatCurrency } from '../../components/AdminUIKit';

export default function OverviewTab({ profile }) {
  const { overview } = profile;

  return (
    <div className="space-y-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="admin-card p-5 border-[var(--admin-border-subtle)] bg-[var(--admin-surface)] relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-[var(--admin-accent)] z-10" />
          <div className="flex items-center gap-2 text-[var(--admin-text-secondary)] mb-3 mt-1">
            <span className="material-symbols-outlined text-[18px]">shopping_bag</span>
            <span className="text-[12px] font-bold uppercase tracking-wider">Total Orders</span>
          </div>
          <p className="text-3xl font-display font-bold text-[var(--admin-text-primary)]">
            {overview?.totalOrders || 0}
          </p>
        </div>

        <div className="admin-card p-5 border-[var(--admin-border-subtle)] bg-[var(--admin-surface)] relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-[var(--admin-success)] z-10" />
          <div className="flex items-center gap-2 text-[var(--admin-text-secondary)] mb-3 mt-1">
            <span className="material-symbols-outlined text-[18px] text-[var(--admin-success)]">
              trending_up
            </span>
            <span className="text-[12px] font-bold uppercase tracking-wider">Engagement Score</span>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-display font-bold text-[var(--admin-text-primary)]">
              {profile.scores?.engagement?.score || 0}/100
            </p>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--admin-text-tertiary)]">
              ({profile.scores?.engagement?.rating || 'Low'})
            </span>
          </div>
        </div>

        <div className="admin-card p-5 border-[var(--admin-border-subtle)] bg-[var(--admin-surface)] relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-[var(--admin-warning)] z-10" />
          <div className="flex items-center gap-2 text-[var(--admin-text-secondary)] mb-3 mt-1">
            <span className="material-symbols-outlined text-[18px] text-[var(--admin-warning)]">
              payments
            </span>
            <span className="text-[12px] font-bold uppercase tracking-wider">Avg. Order Value</span>
          </div>
          <p className="text-3xl font-display font-bold text-[var(--admin-text-primary)]">
            {formatCurrency(overview?.aov || 0)}
          </p>
        </div>

        <div className="admin-card p-5 border-[var(--admin-border-subtle)] bg-[var(--admin-surface)] relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-[var(--admin-info)] z-10" />
          <div className="flex items-center gap-2 text-[var(--admin-text-secondary)] mb-3 mt-1">
            <span className="material-symbols-outlined text-[18px] text-[var(--admin-info)]">
              schedule
            </span>
            <span className="text-[12px] font-bold uppercase tracking-wider">Last Active</span>
          </div>
          <p className="text-xl mt-2 font-bold text-[var(--admin-text-primary)]">
            {overview?.lastActive ? new Date(overview.lastActive).toLocaleDateString() : 'N/A'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Preferred Categories / Tags */}
        <div className="admin-card p-6 border-[var(--admin-border-subtle)] bg-[var(--admin-surface)]">
          <h3 className="text-[14px] font-bold text-[var(--admin-text-primary)] mb-5 flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-[var(--admin-text-secondary)]">
              favorite
            </span>
            What They Like
          </h3>
          {overview?.topInterests?.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {overview.topInterests.map((interest, i) => (
                <span
                  key={i}
                  className="px-3 py-1.5 bg-[var(--admin-surface-muted)] text-[var(--admin-text-primary)] rounded-full text-[12px] font-semibold border border-[var(--admin-border)]"
                >
                  {interest}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-[var(--admin-text-tertiary)] text-[13px] font-medium">
              Not enough data to determine interests.
            </p>
          )}
        </div>

        {/* Marketing Attribution Snapshot */}
        <div className="admin-card p-6 border-[var(--admin-border-subtle)] bg-[var(--admin-surface)]">
          <h3 className="text-[14px] font-bold text-[var(--admin-text-primary)] mb-5 flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-[var(--admin-text-secondary)]">
              explore
            </span>
            How They Found Us
          </h3>
          <div className="bg-[var(--admin-surface-muted)] rounded-[var(--admin-radius-lg)] p-4 border border-[var(--admin-border-subtle)] space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[12px] uppercase font-bold tracking-wider text-[var(--admin-text-tertiary)]">
                Came From
              </span>
              <span className="text-[13px] font-bold text-[var(--admin-text-primary)] capitalize">
                {overview?.acquisition?.source || 'Direct'}
              </span>
            </div>
            <div className="flex justify-between items-center border-t border-[var(--admin-border-subtle)] pt-4">
              <span className="text-[12px] uppercase font-bold tracking-wider text-[var(--admin-text-tertiary)]">
                First Page Visited
              </span>
              <span
                className="text-[13px] font-bold text-[var(--admin-text-primary)] truncate max-w-[200px] text-right"
                title={overview?.acquisition?.firstTouch}
              >
                {overview?.acquisition?.firstTouch || 'Homepage'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
