import React from 'react';

export function DetailsStep({ formData, setFormData, focusedField, categories, handleAiAutofill }) {
  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-[11px] font-bold text-[var(--admin-text-primary)]">
            Showcase Specifications
          </h2>
          <p className="text-[11px] text-[var(--admin-text-secondary)]">
            Give your arrangement a title, short subtitle, and catalog category.
          </p>
        </div>
        <button
          type="button"
          onClick={handleAiAutofill}
          className="bg-[var(--admin-accent)] text-white px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-md hover:brightness-110 transition-all active:scale-95 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
          Auto-Fill with AI
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 sm:col-span-1">
          <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-1.5 block">
            Showcase Title <span className="text-error">*</span>
          </label>
          <input
            type="text"
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g. Lotus Gifting Crate"
            className={`w-full bg-[var(--admin-bg-subtle)] rounded-xl px-4 py-2.5 text-[12.5px] outline-none transition-all ${
              focusedField === 'title'
                ? 'border-2 border-[var(--admin-accent)] shadow-[0_0_15px_rgba(99,102,241,0.4)] scale-[1.01] bg-[var(--admin-surface)]'
                : 'border border-[var(--admin-border)] focus:border-[var(--admin-accent)] focus:bg-[var(--admin-surface)] focus:ring-2 focus:ring-[var(--admin-accent)]/20'
            }`}
          />
        </div>

        <div className="col-span-2 sm:col-span-1">
          <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-1.5 block">
            Subtitle / Occasion Context
          </label>
          <input
            type="text"
            value={formData.subtitle}
            onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
            placeholder="e.g. Carved coconuts with jasmine garlands"
            className={`w-full bg-[var(--admin-bg-subtle)] rounded-xl px-4 py-2.5 text-[12.5px] outline-none transition-all ${
              focusedField === 'subtitle'
                ? 'border-2 border-[var(--admin-accent)] shadow-[0_0_15px_rgba(99,102,241,0.4)] scale-[1.01] bg-[var(--admin-surface)]'
                : 'border border-[var(--admin-border)] focus:border-[var(--admin-accent)] focus:bg-[var(--admin-surface)] focus:ring-2 focus:ring-[var(--admin-accent)]/20'
            }`}
          />
        </div>

        <div className="col-span-2 sm:col-span-1">
          <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-1.5 block">
            Theme Category <span className="text-error">*</span>
          </label>
          <select
            required
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className={`w-full bg-[var(--admin-bg-subtle)] rounded-xl px-4 py-2.5 text-[12.5px] outline-none transition-all ${
              focusedField === 'category'
                ? 'border-2 border-[var(--admin-accent)] shadow-[0_0_15px_rgba(99,102,241,0.4)] scale-[1.01] bg-[var(--admin-surface)]'
                : 'border border-[var(--admin-border)] focus:border-[var(--admin-accent)] focus:bg-[var(--admin-surface)] focus:ring-2 focus:ring-[var(--admin-accent)]/20'
            }`}
          >
            <option value="">Select a Category</option>
            {categories.map((cat) => (
              <option key={cat.slug || cat.id} value={cat.slug || cat.name}>
                {cat.name}
              </option>
            ))}
            {categories.length === 0 && (
              <>
                <option value="engagement_gift">Engagement Gifts</option>
                <option value="telugu_heritage">Telugu Heritage</option>
                <option value="wedding_rituals">Wedding Rituals</option>
              </>
            )}
          </select>
        </div>
      </div>
    </div>
  );
}
