import React, { useState, useEffect } from 'react';
import { SectionHeader, AdminField, AdminInput, AdminTextarea } from '../AdminUIKit';
import { ImageUpload } from '../ImageUpload';

export function SEOCenterEditor({ content, onUpdate }) {
  const seo = content || {};

  return (
    <div className="admin-card p-6 space-y-6">
      <SectionHeader
        icon="search"
        title="SEO Settings & Brand Metadata"
        description="Configure search engine title suffixes, global descriptions, indexing keys, and social thumbnails"
      />

      <div className="space-y-5">
        {/* Title & Desc */}
        <AdminField
          label="Default Google Page Title Tag"
          description="Displayed on search results tabs (max 60 chars)"
        >
          <AdminInput
            value={seo.globalTitle || ''}
            onChange={(e) => onUpdate('seo', { globalTitle: e.target.value })}
            className="!py-2.5 !text-[12px] border-[var(--admin-border)] focus:border-[var(--admin-accent)] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface)]"
          />
        </AdminField>

        <AdminField
          label="Meta Description Block"
          description="Text block crawled by Google for list snippets (max 160 chars)"
        >
          <AdminTextarea
            value={seo.globalDescription || ''}
            onChange={(e) => onUpdate('seo', { globalDescription: e.target.value })}
            rows={3}
            className="!py-2.5 !text-[12px] border-[var(--admin-border)] focus:border-[var(--admin-accent)] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface)]"
          />
        </AdminField>

        {/* Social Meta */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-4 border-t border-[var(--admin-border-subtle)]">
          <AdminField
            label="Global Search Keywords Tag"
            description="Comma-separated crawling keywords"
          >
            <AdminInput
              value={seo.globalKeywords || ''}
              onChange={(e) => onUpdate('seo', { globalKeywords: e.target.value })}
              className="!py-2.5 !text-[11px] sm:text-[11px] border-[var(--admin-border)] focus:border-[var(--admin-accent)] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface)]"
            />
          </AdminField>
          <ImageUpload
            label="OpenGraph Social Share Thumbnail URL"
            value={seo.ogImage || ''}
            onChange={(val) => onUpdate('seo', { ogImage: val })}
            folder="cms"
          />
        </div>
      </div>
    </div>
  );
}
