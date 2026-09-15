import React from 'react';
import { useConfig } from '../../../context/ConfigContext';

export function ProductSeoStep({ formData }) {
  const { storeName } = useConfig();
  const displayName = storeName || 'Siri Arts & Crafts';

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[11px] font-bold text-[var(--admin-text-primary)]">
          SEO Meta Configuration
        </h2>
        <p className="text-[11px] text-[var(--admin-text-secondary)]">
          Configure title and description for search engines.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-1.5 block">
            SEO Page Title
          </label>
          <input
            type="text"
            readOnly
            value={formData.title ? `${formData.title} | ${displayName}` : ''}
            placeholder="SEO Page Title"
            className="w-full bg-[var(--admin-bg-subtle)] rounded-[4px] px-3 h-9 text-[12.5px] outline-none transition-all border border-[var(--admin-border)] opacity-70 cursor-not-allowed text-[var(--admin-text-primary)] font-medium"
          />
        </div>

        <div>
          <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-1.5 block">
            SEO Meta Description
          </label>
          <textarea
            rows={3}
            readOnly
            value={formData.description || ''}
            placeholder="SEO Meta Description"
            className="w-full bg-[var(--admin-bg-subtle)] rounded-[4px] p-3 text-[12.5px] outline-none transition-all resize-none border border-[var(--admin-border)] opacity-70 cursor-not-allowed text-[var(--admin-text-primary)] font-medium"
          />
        </div>

        {/* Google Search Snippet Live Preview */}
        <div className="p-4 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-[4px] shadow-xs space-y-1.5 text-left font-sans">
          <div className="flex items-center gap-1.5 text-[11px] text-[#202124]">
            <span>siriartsandcrafts.com</span>
            <span className="text-[#5f6368]"> › products › {formData.slug || 'jharokha'}</span>
          </div>
          <h4 className="text-[#1a0dab] text-[16px] hover:underline cursor-pointer leading-tight font-medium font-sans">
            {formData.title
              ? `${formData.title} | ${displayName}`
              : 'Buy Luxury Handcrafted Traditional Decor Items Online'}
          </h4>
          <p className="text-[#4d5156] text-[12px] leading-relaxed font-normal">
            <span className="text-[#70757a]">17 May 2026 — </span>
            {formData.description ||
              `Discover organic handcrafted Urli bowls, Rosewood Jharokha mirrors, traditional brass artifacts for wedding backdrops at ${displayName}.`}
          </p>
        </div>
      </div>
    </div>
  );
}
