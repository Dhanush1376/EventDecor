import React, { useState } from 'react';
import { AiProviderDropdown } from '../AiProviderDropdown';

export function DetailsStep({
  formData,
  setFormData,
  focusedField,
  categories,
  handleAiAutofill,
  isAIGenerating,
  aiError,
}) {
  const [selectedProviderId, setSelectedProviderId] = useState(null);

  return (
    <div className="space-y-5">
      <div className="flex flex-row justify-between items-start gap-3">
        <div className="flex-1 pr-2">
          <h2 className="text-[11px] font-bold text-[var(--admin-text-primary)]">
            Showcase Specifications
          </h2>
          <p className="text-[10px] sm:text-[11px] text-[var(--admin-text-secondary)] mt-0.5">
            Give your arrangement a title, short subtitle, and catalog category.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AiProviderDropdown
            selectedProviderId={selectedProviderId}
            onChange={setSelectedProviderId}
            disabled={isAIGenerating}
          />
          <button
            type="button"
            onClick={() => handleAiAutofill(selectedProviderId)}
            disabled={isAIGenerating}
            className="bg-[var(--admin-accent)] text-white px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-md hover:brightness-110 transition-all active:scale-95 disabled:opacity-70 cursor-pointer shrink-0"
            title="Auto-Fill with AI"
          >
            {isAIGenerating ? (
              <div className="skeleton-box inline-block w-3.5 h-3.5 rounded-md" />
            ) : (
              <span className="material-symbols-outlined text-[15px] sm:text-[14px]">
                smart_toy
              </span>
            )}
            <span className="hidden sm:inline">
              {isAIGenerating ? 'Analyzing Image...' : 'Auto-Fill with AI'}
            </span>
            <span className="sm:hidden">{isAIGenerating ? 'AI...' : 'AI Fill'}</span>
          </button>
        </div>
      </div>

      {aiError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-start gap-3 mt-4 mb-2 shadow-sm animate-in fade-in slide-in-from-top-2">
          <span className="material-symbols-outlined text-red-500 shrink-0 mt-0.5">error</span>
          <div className="flex-1">
            <h3 className="text-red-800 dark:text-red-400 font-bold text-[13px] mb-1">
              AI Vision Analysis Failed
            </h3>
            <p className="text-red-600 dark:text-red-300 text-[12px] leading-relaxed">{aiError}</p>
          </div>
        </div>
      )}

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
