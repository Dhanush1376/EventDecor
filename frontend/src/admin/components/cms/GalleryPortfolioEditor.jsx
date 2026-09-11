import React from 'react';
import { AdminField, AdminInput } from '../AdminUIKit';

export function GalleryPortfolioEditor({ content, onUpdate }) {
  const gp = content.galleryPreview || {};

  return (
    <div className="space-y-8">
      <div className="p-6 md:p-8 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-md shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none transition-transform duration-700 group-hover:scale-110 group-hover:rotate-6">
          <span className="material-symbols-outlined text-[150px]">photo_library</span>
        </div>
        <div className="relative z-10 space-y-6">
          <span className="text-[14px] sm:text-[15px] font-semibold text-[var(--admin-text-primary)] tracking-tight block border-b border-[var(--admin-border-subtle)] pb-3 mb-6">
            1. Gallery & Portfolio Header Setup
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <AdminField
              label="Gallery Headline Tag"
              description="Primary bold title for inspiration portfolio"
            >
              <AdminInput
                value={gp.sectionTitle || 'Inspiration Gallery'}
                onChange={(e) => onUpdate('galleryPreview', { sectionTitle: e.target.value })}
                className="w-full !py-3 !text-[13px] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface)] rounded-md shadow-[var(--admin-shadow-xs)] border border-[var(--admin-border)] focus:border-[var(--admin-accent)] transition-colors"
              />
            </AdminField>
            <AdminField
              label="Gallery Subtitle Tag"
              description="Gold elegant narrative label showing below heading"
            >
              <AdminInput
                value={gp.sectionSubtitle || 'A visual journey through our finest installations'}
                onChange={(e) => onUpdate('galleryPreview', { sectionSubtitle: e.target.value })}
                className="w-full !py-3 !text-[13px] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface)] rounded-md shadow-[var(--admin-shadow-xs)] border border-[var(--admin-border)] focus:border-[var(--admin-accent)] transition-colors"
              />
            </AdminField>
          </div>
        </div>
      </div>
    </div>
  );
}
