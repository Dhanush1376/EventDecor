import React, { useState, useEffect } from 'react';
import { AdminToggle } from '../../components/AdminUIKit';
import { AiProviderDropdown } from '../../components/AiProviderDropdown';

export function ProductInfoStep({
  formData,
  setFormData,
  categoriesList,
  isAIGenerating,
  isCustomCategory,
  setIsCustomCategory,
  focusedField,
  handleAIFill,
  aiError,
}) {
  const [selectedProviderId, setSelectedProviderId] = useState(null);
  const [showAiInput, setShowAiInput] = useState(false);
  const [aiPromptTitle, setAiPromptTitle] = useState('');
  const [hasCareNote, setHasCareNote] = useState(() => Boolean(formData.customerNote?.trim()));

  useEffect(() => {
    if (formData.customerNote?.trim() && !hasCareNote) {
      setHasCareNote(true);
    }
  }, [formData.customerNote]);

  return (
    <div className="space-y-4 max-w-4xl">
      {/* Header & AI Assistant */}
      <div className="flex flex-row justify-between items-center gap-2 sm:gap-3 pb-1 border-b border-[var(--admin-border)]">
        <div className="flex-1 min-w-0">
          <h2 className="text-[13px] font-bold text-[var(--admin-text-primary)]">Basic Details</h2>
          <p className="text-[11px] text-[var(--admin-text-secondary)] mt-0.5">
            Essential title, category, and description for your product.
          </p>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <AiProviderDropdown
            selectedProviderId={selectedProviderId}
            onChange={setSelectedProviderId}
            disabled={isAIGenerating}
          />
          <button
            type="button"
            onClick={() => setShowAiInput(!showAiInput)}
            disabled={isAIGenerating}
            className="bg-[var(--admin-accent)] text-white px-2.5 sm:px-3 h-8 min-h-[32px] box-border rounded-[4px] text-[10.5px] sm:text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 sm:gap-1.5 shadow-xs hover:opacity-95 transition-all active:scale-95 disabled:opacity-70 cursor-pointer shrink-0"
            title="Auto-Fill with AI"
          >
            {isAIGenerating ? (
              <div className="skeleton-box inline-block w-3.5 h-3.5 rounded-[2px]" />
            ) : (
              <span className="material-symbols-outlined text-[15px]">smart_toy</span>
            )}
            <span className="hidden sm:inline">
              {isAIGenerating ? 'Generating...' : 'Auto-Fill with AI'}
            </span>
            <span className="sm:hidden">{isAIGenerating ? 'AI...' : 'AI Fill'}</span>
          </button>
        </div>
      </div>

      {showAiInput && (
        <div className="bg-[var(--admin-surface)] p-3.5 rounded-[4px] border border-[var(--admin-border)] my-3 animate-in fade-in slide-in-from-top-2 shadow-xs">
          <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-1.5 block">
            Enter Prompt or Title for AI
          </label>
          <textarea
            value={aiPromptTitle}
            onChange={(e) => setAiPromptTitle(e.target.value)}
            className="w-full bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] focus:border-[var(--admin-accent)] focus:bg-[var(--admin-surface)] rounded-[4px] p-2.5 text-[12px] mb-2.5 outline-none transition-all resize-none"
            placeholder="e.g. Traditional Brass Diya with peacock design..."
            rows={2}
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAiInput(false)}
              className="h-7.5 px-3 text-[11px] text-[var(--admin-text-secondary)] hover:bg-[var(--admin-surface-muted)] rounded-[4px] font-bold border border-[var(--admin-border)] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAiInput(false);
                handleAIFill(aiPromptTitle, selectedProviderId);
              }}
              disabled={!aiPromptTitle.trim()}
              className="h-7.5 px-3.5 text-[11px] text-white bg-[var(--admin-accent)] rounded-[4px] font-bold disabled:opacity-50 hover:opacity-95 transition-all cursor-pointer shadow-xs"
            >
              Generate
            </button>
          </div>
        </div>
      )}

      {aiError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-[4px] p-3 flex items-start gap-2.5 my-2 shadow-xs animate-in fade-in slide-in-from-top-2">
          <span className="material-symbols-outlined text-red-500 shrink-0 text-[18px]">error</span>
          <div className="flex-1">
            <h3 className="text-red-800 dark:text-red-400 font-bold text-[12px] mb-0.5">
              AI Auto-Fill Error
            </h3>
            <p className="text-red-600 dark:text-red-300 text-[11.5px] leading-relaxed">
              {aiError}
            </p>
          </div>
        </div>
      )}

      {/* Main Form Fields */}
      <div className="grid grid-cols-2 gap-3.5 pt-1">
        {/* Title */}
        <div className="col-span-2 sm:col-span-1">
          <label className="text-[11.5px] font-semibold text-[var(--admin-text-primary)] mb-1 block">
            Product Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g. Red & Green Kalu Kadigey Set"
            className="w-full bg-[var(--admin-surface)] border border-[var(--admin-border)] focus:border-[var(--admin-accent)] rounded-[4px] px-3 h-9 text-[12.5px] outline-none transition-all shadow-xs"
          />
        </div>

        {/* Telugu Title */}
        <div className="col-span-2 sm:col-span-1">
          <label className="text-[11.5px] font-semibold text-[var(--admin-text-primary)] mb-1 block">
            Telugu Title{' '}
            <span className="text-[10px] text-[var(--admin-text-secondary)] font-normal">
              (optional)
            </span>
          </label>
          <input
            type="text"
            value={formData.teluguTitle}
            onChange={(e) => setFormData({ ...formData, teluguTitle: e.target.value })}
            placeholder="సాంప్రదాయ పూజా పీఠం"
            className="w-full bg-[var(--admin-surface)] border border-[var(--admin-border)] focus:border-[var(--admin-accent)] rounded-[4px] px-3 h-9 text-[12.5px] outline-none transition-all shadow-xs"
          />
        </div>

        {/* Category */}
        <div className="col-span-2 sm:col-span-1">
          <div className="flex justify-between items-center h-5 mb-1">
            <label className="text-[11.5px] font-semibold text-[var(--admin-text-primary)]">
              Category <span className="text-red-500">*</span>
            </label>
            <button
              type="button"
              onClick={() => {
                setIsCustomCategory(!isCustomCategory);
                setFormData({ ...formData, primaryCategory: '' });
              }}
              className="min-h-0 h-auto py-0 text-[11px] font-semibold text-[var(--admin-accent)] hover:underline cursor-pointer flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[13px]">
                {isCustomCategory ? 'list' : 'add_circle'}
              </span>
              <span>{isCustomCategory ? 'Select from list' : 'Add Custom'}</span>
            </button>
          </div>
          {isCustomCategory ? (
            <input
              type="text"
              required
              value={formData.primaryCategory}
              onChange={(e) => setFormData({ ...formData, primaryCategory: e.target.value })}
              placeholder="e.g. Urlis, Brass Lamps"
              className="w-full bg-[var(--admin-surface)] border border-[var(--admin-border)] focus:border-[var(--admin-accent)] rounded-[4px] px-3 h-9 text-[12.5px] outline-none transition-all shadow-xs"
            />
          ) : (
            <select
              required
              value={formData.primaryCategory}
              onChange={(e) => setFormData({ ...formData, primaryCategory: e.target.value })}
              className="w-full bg-[var(--admin-surface)] border border-[var(--admin-border)] focus:border-[var(--admin-accent)] rounded-[4px] px-3 h-9 text-[12.5px] outline-none transition-all shadow-xs cursor-pointer"
            >
              <option value="">Select Category</option>
              {categoriesList.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Dimensions */}
        <div className="col-span-2 sm:col-span-1">
          <div className="flex items-center h-5 mb-1">
            <label className="text-[11.5px] font-semibold text-[var(--admin-text-primary)]">
              Dimensions{' '}
              <span className="text-[10px] text-[var(--admin-text-secondary)] font-normal">
                (optional)
              </span>
            </label>
          </div>
          <input
            type="text"
            value={formData.dimensions}
            onChange={(e) => setFormData({ ...formData, dimensions: e.target.value })}
            placeholder='e.g. 12" x 12"'
            className="w-full bg-[var(--admin-surface)] border border-[var(--admin-border)] focus:border-[var(--admin-accent)] rounded-[4px] px-3 h-9 text-[12.5px] outline-none transition-all shadow-xs"
          />
        </div>

        {/* Description */}
        <div className="col-span-2">
          <div className="flex justify-between items-center mb-1">
            <label className="text-[11.5px] font-semibold text-[var(--admin-text-primary)]">
              Product Description
            </label>
            <span className="text-[10px] text-[var(--admin-text-tertiary)]">
              Brief summary for customers
            </span>
          </div>
          <textarea
            rows={2}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Write a short description..."
            className="w-full bg-[var(--admin-surface)] border border-[var(--admin-border)] focus:border-[var(--admin-accent)] rounded-[4px] px-3 py-2 text-[12px] outline-none transition-all resize-y min-h-[58px] shadow-xs"
          />
        </div>
      </div>

      {/* Additional Options (Streamlined & Lightweight) */}
      <div className="space-y-2.5 pt-2">
        {/* Custom Text / Personalization */}
        <div
          className={`p-3 bg-[var(--admin-bg-subtle)] border rounded-[4px] transition-all duration-200 ${
            formData.customizationConfig?.enabled
              ? 'border-[var(--admin-accent)]/50 bg-[var(--admin-surface)]'
              : 'border-[var(--admin-border)]'
          }`}
        >
          <div className="flex justify-between items-center">
            <div>
              <p className="text-[12px] font-bold text-[var(--admin-text-primary)]">
                Custom Text / Personalization
              </p>
              <p className="text-[10.5px] text-[var(--admin-text-secondary)]">
                Allow customers to enter names or custom notes at checkout
              </p>
            </div>
            <AdminToggle
              checked={formData.customizationConfig?.enabled || false}
              onChange={() =>
                setFormData((prev) => ({
                  ...prev,
                  customizationConfig: {
                    ...prev.customizationConfig,
                    enabled: !prev.customizationConfig?.enabled,
                  },
                }))
              }
            />
          </div>

          {formData.customizationConfig?.enabled && (
            <div className="pt-2.5 border-t border-[var(--admin-border)] mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="text-[10.5px] font-semibold text-[var(--admin-text-secondary)] mb-1 block">
                  Input Placeholder
                </label>
                <input
                  type="text"
                  placeholder="e.g. Enter name for engraving..."
                  value={formData.customizationConfig?.placeholder || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      customizationConfig: {
                        ...prev.customizationConfig,
                        placeholder: e.target.value,
                      },
                    }))
                  }
                  className="w-full bg-[var(--admin-surface)] rounded-[4px] px-3 h-8 text-[11.5px] border border-[var(--admin-border)] focus:border-[var(--admin-accent)] outline-none"
                />
              </div>

              <div className="flex items-center sm:pt-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.customizationConfig?.required || false}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        customizationConfig: {
                          ...prev.customizationConfig,
                          required: e.target.checked,
                        },
                      }))
                    }
                    className="accent-[var(--admin-accent)] rounded"
                  />
                  <span className="text-[11px] font-medium text-[var(--admin-text-secondary)]">
                    Required for checkout
                  </span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Care / Handcraft Note */}
        <div
          className={`p-3 bg-[var(--admin-bg-subtle)] border rounded-[4px] transition-all duration-200 ${
            hasCareNote
              ? 'border-[var(--admin-accent)]/50 bg-[var(--admin-surface)]'
              : 'border-[var(--admin-border)]'
          }`}
        >
          <div className="flex justify-between items-center">
            <div>
              <p className="text-[12px] font-bold text-[var(--admin-text-primary)]">
                Handcraft / Care Note
              </p>
              <p className="text-[10.5px] text-[var(--admin-text-secondary)]">
                Special instructions or disclaimers for handmade items
              </p>
            </div>
            <AdminToggle
              checked={hasCareNote}
              onChange={() => {
                const next = !hasCareNote;
                setHasCareNote(next);
                if (!next) {
                  setFormData((prev) => ({ ...prev, customerNote: '' }));
                }
              }}
            />
          </div>

          {hasCareNote && (
            <div className="pt-2.5 mt-2.5 border-t border-[var(--admin-border)]">
              <textarea
                rows={2}
                value={formData.customerNote || ''}
                onChange={(e) => setFormData({ ...formData, customerNote: e.target.value })}
                placeholder="e.g. • Handcrafted item • Minor variations in color are normal"
                className="w-full bg-[var(--admin-surface)] border border-[var(--admin-border)] focus:border-[var(--admin-accent)] rounded-[4px] p-2 text-[11.5px] outline-none transition-all resize-y min-h-[48px]"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
