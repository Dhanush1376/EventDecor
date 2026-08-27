import React from 'react';
import { SectionHeader, AdminField, AdminInput, AdminTextarea } from '../AdminUIKit';
const DEFAULT_TITLE = 'Siri Arts & Crafts | Wedding Decor, Handmade Gifts & Event Decor';
const DEFAULT_DESC =
  'Premium handcrafted wedding decor, pooja essentials, floral decorations, event decor, and customized gifts.';
const DEFAULT_KEYWORDS =
  'wedding decor, pooja essentials, floral decorations, event decor, customized gifts';

export function SEOCenterEditor({ content, onUpdate }) {
  const seo = content.seo || {};

  const displayTitle = seo.globalTitle || DEFAULT_TITLE;
  const displayDesc = seo.globalDescription || DEFAULT_DESC;

  return (
    <div className="space-y-8">
      <SectionHeader
        icon="search"
        title="SEO Settings & Brand Metadata"
        description="Configure search engine title suffixes, global descriptions, indexing keys, and social thumbnails"
      />

      <div className="space-y-8">
        <div className="p-6 md:p-8 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-md shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none transition-transform duration-700 group-hover:scale-110 group-hover:rotate-6">
            <span className="material-symbols-outlined text-[150px]">search</span>
          </div>
          <div className="relative z-10 space-y-6">
            <span className="text-[12px] font-bold text-[var(--admin-text-primary)] uppercase tracking-[0.1em] block border-b border-[var(--admin-border-subtle)] pb-3 mb-6">
              Search Engine Optimization
            </span>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <AdminField
                label="Default Google Page Title Tag"
                description="Displayed on search results tabs (max 60 chars)"
              >
                <AdminInput
                  value={seo.globalTitle || ''}
                  onChange={(e) => onUpdate('seo', { globalTitle: e.target.value })}
                  className="w-full !py-3 !text-[13px] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface)] rounded-md shadow-[var(--admin-shadow-xs)] border border-[var(--admin-border)] focus:border-[var(--admin-accent)] transition-colors"
                  placeholder={DEFAULT_TITLE}
                />
              </AdminField>

              <AdminField
                label="Global Search Keywords Tag"
                description="Comma-separated crawling keywords"
              >
                <AdminInput
                  value={seo.globalKeywords || ''}
                  onChange={(e) => onUpdate('seo', { globalKeywords: e.target.value })}
                  className="w-full !py-3 !text-[13px] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface)] rounded-md shadow-[var(--admin-shadow-xs)] border border-[var(--admin-border)] focus:border-[var(--admin-accent)] transition-colors"
                  placeholder={DEFAULT_KEYWORDS}
                />
              </AdminField>
            </div>

            <AdminField
              label="Meta Description Block"
              description="Text block crawled by Google for list snippets (max 160 chars)"
            >
              <AdminTextarea
                value={seo.globalDescription || ''}
                onChange={(e) => onUpdate('seo', { globalDescription: e.target.value })}
                rows={3}
                className="w-full !py-3 !text-[13px] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface)] rounded-md shadow-[var(--admin-shadow-xs)] border border-[var(--admin-border)] focus:border-[var(--admin-accent)] transition-colors"
                placeholder={DEFAULT_DESC}
              />
            </AdminField>

            {/* Google Search Live Preview */}
            <div className="mt-10">
              <span className="text-[12px] font-bold text-[var(--admin-text-primary)] uppercase tracking-[0.1em] block border-b border-[var(--admin-border-subtle)] pb-3 mb-6">
                Live Search Preview
              </span>
              <div className="border border-[#dadce0] rounded-md bg-white p-5 max-w-2xl font-sans shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-2 text-[#4d5156]">
                  <div className="w-[28px] h-[28px] bg-[#f1f3f4] rounded-full flex items-center justify-center border border-[#dadce0] overflow-hidden">
                    <span className="text-[10px] font-bold text-gray-500">Siri</span>
                  </div>
                  <div className="flex flex-col leading-tight">
                    <span className="text-[14px] text-[#202124]">siriartsandcrafts.com</span>
                    <span className="text-[12px] text-[#4d5156] flex items-center gap-1">
                      https://siriartsandcrafts.com
                      <span className="material-symbols-outlined text-[14px]">more_vert</span>
                    </span>
                  </div>
                </div>
                <h3 className="text-[20px] text-[#1a0dab] hover:underline cursor-pointer mb-1 whitespace-nowrap overflow-hidden text-ellipsis leading-tight font-normal">
                  {displayTitle}
                </h3>
                <div className="text-[14px] text-[#4d5156] line-clamp-2 leading-snug">
                  {displayDesc}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
