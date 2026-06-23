import React from 'react';
import { SectionHeader, AdminField, AdminInput, AdminToggle } from '../AdminUIKit';

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
              value={gp.sectionTitle || ''}
              onChange={(e) => onUpdate('galleryPreview', { sectionTitle: e.target.value })}
              className="!py-2.5 !text-[12px] border-[var(--admin-border)] focus:border-[var(--admin-accent)] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface)]"
            />
          </AdminField>
          <AdminField
            label="Gallery Subtitle Tag"
            description="Gold elegant narrative label showing below heading"
          >
            <AdminInput
              value={gp.sectionSubtitle || ''}
              onChange={(e) => onUpdate('galleryPreview', { sectionSubtitle: e.target.value })}
              className="!py-2.5 !text-[12px] border-[var(--admin-border)] focus:border-[var(--admin-accent)] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface)]"
            />
          </AdminField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-4 border-t border-[var(--admin-border-subtle)]">
          <AdminField
            label="Maximum Display Count"
            description="Adjust limit of masonry cards shown on feed"
          >
            <AdminInput
              type="number"
              value={gp.maxDisplay || 6}
              onChange={(e) =>
                onUpdate('galleryPreview', { maxDisplay: parseInt(e.target.value) || 6 })
              }
              className="!py-2.5 !text-[11px] sm:text-[11px] border-[var(--admin-border)] focus:border-[var(--admin-accent)] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface)]"
            />
          </AdminField>
          <div className="flex items-center justify-between border border-[var(--admin-border)] px-4.5 py-3 rounded-2xl bg-[var(--admin-surface)] mt-5 h-[46px] shadow-[var(--admin-shadow-xs)]">
            <span className="text-[11px] font-semibold text-[var(--admin-text-secondary)] uppercase tracking-wider">
              Show Grid on Homepage
            </span>
            <AdminToggle
              checked={gp.isVisible !== false}
              onChange={() =>
                onUpdate('galleryPreview', { isVisible: gp.isVisible === false ? true : false })
              }
            />
          </div>
        </div>

        <div className="p-4.5 bg-[var(--admin-surface-muted)] rounded-2xl border border-[var(--admin-border)] space-y-2.5 mt-4 shadow-[var(--admin-shadow-xs)]">
          <span className="text-[11px] sm:text-[11px] font-semibold text-[var(--admin-accent)] uppercase tracking-[0.15em] block">
            Masonry Filter Options
          </span>
          <p className="text-[11px] sm:text-[11px] text-[var(--admin-text-tertiary)] font-light leading-relaxed">
            Storefront visitors can seamlessly filter using categories like{' '}
            <em>Traditional Wedding Decor</em>, <em>Pooja Decoration Sets</em>,{' '}
            <em>Customized Gift Hampers</em>, and <em>Bangle Trays</em> dynamically populated from
            your catalog.
          </p>
        </div>
      </div>
    </div>
  );
}
