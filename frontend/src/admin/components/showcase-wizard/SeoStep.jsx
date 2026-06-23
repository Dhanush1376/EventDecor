import React from 'react';

export function SeoStep({ formData, setFormData, focusedField }) {
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
            value={formData.seoTitle}
            onChange={(e) => setFormData({ ...formData, seoTitle: e.target.value })}
            placeholder="e.g. Lotus Gifting Crate | Siri Arts"
            className={`w-full bg-[var(--admin-bg-subtle)] rounded-xl px-4 py-2.5 text-[12.5px] outline-none transition-all ${
              focusedField === 'seoTitle'
                ? 'border-2 border-[var(--admin-accent)] shadow-[0_0_15px_rgba(99,102,241,0.4)] scale-[1.01] bg-[var(--admin-surface)]'
                : 'border border-[var(--admin-border)] focus:border-[var(--admin-accent)] focus:bg-[var(--admin-surface)] focus:ring-2 focus:ring-[var(--admin-accent)]/20'
            }`}
          />
        </div>

        <div>
          <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-1.5 block">
            SEO Meta Description
          </label>
          <textarea
            rows={3}
            value={formData.seoDescription}
            onChange={(e) => setFormData({ ...formData, seoDescription: e.target.value })}
            placeholder="Describe the showcase item in 150-160 characters..."
            className={`w-full bg-[var(--admin-bg-subtle)] rounded-xl px-4 py-2.5 text-[12.5px] outline-none transition-all resize-none ${
              focusedField === 'seoDescription'
                ? 'border-2 border-[var(--admin-accent)] shadow-[0_0_15px_rgba(99,102,241,0.4)] scale-[1.01] bg-[var(--admin-surface)]'
                : 'border border-[var(--admin-border)] focus:border-[var(--admin-accent)] focus:bg-[var(--admin-surface)] focus:ring-2 focus:ring-[var(--admin-accent)]/20'
            }`}
          />
        </div>

        {/* Google Search Snippet Live Preview */}
        <div className="p-4 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-2xl shadow-sm space-y-1.5 text-left font-sans">
          <div className="flex items-center gap-1.5 text-[11px] sm:text-[11px] text-[#202124]">
            <span>siriartsandcrafts.com</span>
            <span className="text-[#5f6368]"> › events › {formData.category || 'showcase'}</span>
          </div>
          <h4 className="text-[#1a0dab] text-[18px] hover:underline cursor-pointer leading-tight font-medium font-sans">
            {formData.seoTitle ||
              formData.title ||
              'Buy Luxury Handcrafted Traditional Decor Items Online'}
          </h4>
          <p className="text-[#4d5156] text-[12.5px] leading-relaxed font-normal">
            <span className="text-[#70757a]">17 May 2026 — </span>
            {formData.seoDescription ||
              formData.description ||
              'Discover organic handcrafted Urli bowls, Rosewood Jharokha mirrors, traditional brass artifacts for wedding backdrops at Siri Arts.'}
          </p>
        </div>
      </div>
    </div>
  );
}
