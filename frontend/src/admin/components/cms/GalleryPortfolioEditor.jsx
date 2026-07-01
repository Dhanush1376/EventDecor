import React from 'react';
import { SectionHeader, AdminField, AdminInput } from '../AdminUIKit';

export function GalleryPortfolioEditor({ content, onUpdate }) {
  const gp = content.galleryPreview || {};

  return (
    <div className="admin-card p-6 space-y-6">
      <SectionHeader
        icon="photo_library"
        title="Gallery Curation Settings"
        description="Configure the primary Inspiration Gallery showcase, title tags, item caps, and layout formats"
      />
      <div className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <AdminField
            label="Gallery Headline Tag"
            description="Primary bold title for inspiration portfolio"
          >
            <AdminInput
              value={gp.sectionTitle || 'Inspiration Gallery'}
              onChange={(e) => onUpdate('galleryPreview', { sectionTitle: e.target.value })}
              className="!py-2.5 !text-[12px] border-[var(--admin-border)] focus:border-[var(--admin-accent)] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface)]"
            />
          </AdminField>
          <AdminField
            label="Gallery Subtitle Tag"
            description="Gold elegant narrative label showing below heading"
          >
            <AdminInput
              value={gp.sectionSubtitle || 'A visual journey through our finest installations'}
              onChange={(e) => onUpdate('galleryPreview', { sectionSubtitle: e.target.value })}
              className="!py-2.5 !text-[12px] border-[var(--admin-border)] focus:border-[var(--admin-accent)] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface)]"
            />
          </AdminField>
        </div>
      </div>
    </div>
  );
}
