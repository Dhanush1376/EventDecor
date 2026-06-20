import React, { useState, useEffect } from 'react';
import { SectionHeader, AdminInput, AdminToggle } from '../AdminUIKit';

export function AnnouncementBarEditor({ banners, onUpdate }) {
  return (
    <div className="admin-card p-6 space-y-6">
      <SectionHeader
        icon="campaign"
        title="Header Promotion Promos"
        description="Configure and display sliding text banners highlighting seasonal offers"
      />
      <div className="space-y-4">
        {banners?.map((b, idx) => (
          <div
            key={b.id}
            className={`p-4 rounded-2xl border flex items-center justify-between gap-3.5 transition-all duration-300 shadow-[var(--admin-shadow-xs)] hover:shadow-xs ${
              b.isActive
                ? 'bg-[var(--admin-surface)] border-[var(--admin-accent)]'
                : 'bg-[var(--admin-surface)]/80 border-[var(--admin-border)] opacity-70 hover:opacity-100'
            }`}
          >
            <div className="flex items-center gap-3 flex-1">
              <div className="w-7 h-7 rounded-lg bg-[var(--admin-surface-muted)] border border-[var(--admin-accent)]/20 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[14px] text-[var(--admin-accent)] font-semibold">
                  {b.icon || 'notifications'}
                </span>
              </div>
              <AdminInput
                value={b.text}
                onChange={(e) => {
                  const copy = [...banners];
                  copy[idx] = { ...copy[idx], text: e.target.value };
                  onUpdate('announcement', { banners: copy });
                }}
                className="!py-1.5 !text-[11px] sm:text-[11px] bg-transparent flex-1 border-none focus:bg-transparent shadow-none"
              />
            </div>
            <AdminToggle
              checked={b.isActive}
              onChange={() => {
                const copy = banners.map((item) =>
                  item.id === b.id
                    ? { ...item, isActive: !item.isActive }
                    : { ...item, isActive: false },
                );
                onUpdate('announcement', { banners: copy });
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
