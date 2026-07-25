import React, { useState } from 'react';
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

  return (
    <div className="space-y-5">
      <div className="flex flex-row justify-between items-start gap-3">
        <div className="flex-1 pr-2">
          <h2 className="text-[11px] font-bold text-[var(--admin-text-primary)]">Product Info</h2>
          <p className="text-[10px] sm:text-[11px] text-[var(--admin-text-secondary)] mt-0.5">
            Detail product info, category, and materials.
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
            onClick={() => setShowAiInput(!showAiInput)}
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
              {isAIGenerating ? 'Generating...' : 'Auto-Fill with AI'}
            </span>
            <span className="sm:hidden">{isAIGenerating ? 'AI...' : 'AI Fill'}</span>
          </button>
        </div>
      </div>

      {showAiInput && (
        <div className="bg-[var(--admin-surface)] p-4 rounded-xl border border-[var(--admin-border)] mb-4 mt-4 animate-in fade-in slide-in-from-top-2">
          <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-2 block">
            Enter Title for AI Generation
          </label>
          <textarea
            value={aiPromptTitle}
            onChange={(e) => setAiPromptTitle(e.target.value)}
            className="w-full bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] focus:border-[var(--admin-accent)] focus:ring-1 focus:ring-[var(--admin-accent)] rounded-xl px-4 py-2.5 text-[12.5px] mb-3 outline-none transition-all resize-none"
            placeholder="e.g. Traditional Brass Diya..."
            rows={2}
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAiInput(false)}
              className="px-3 py-1.5 text-[11px] text-[var(--admin-text-secondary)] hover:bg-[var(--admin-bg-subtle)] rounded-lg font-bold transition-colors cursor-pointer"
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
              className="px-4 py-1.5 text-[11px] text-white bg-[var(--admin-accent)] rounded-lg font-bold disabled:opacity-50 hover:brightness-110 transition-all cursor-pointer"
            >
              Generate
            </button>
          </div>
        </div>
      )}

      {aiError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-start gap-3 mt-4 mb-2 shadow-sm animate-in fade-in slide-in-from-top-2">
          <span className="material-symbols-outlined text-red-500 shrink-0 mt-0.5">error</span>
          <div className="flex-1">
            <h3 className="text-red-800 dark:text-red-400 font-bold text-[13px] mb-1">
              AI Auto-Fill Failed
            </h3>
            <p className="text-red-600 dark:text-red-300 text-[12px] leading-relaxed">{aiError}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              // Usually the parent or hook exposes a way to clear the error, or we can just ignore it until the next run.
              // Since we don't have setAiError here, we can just leave it, or let the user try again which clears it.
            }}
            className="text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors pointer-events-none opacity-0" // Hidden but takes space, or we can just remove the close button for now since re-trying clears it.
          ></button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 sm:col-span-1">
          <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-1.5 block">
            English Title <span className="text-error">*</span>
          </label>
          <input
            type="text"
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Product title"
            className="w-full bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] focus:border-[var(--admin-accent)] focus:bg-[var(--admin-surface)] rounded-xl px-4 py-2.5 text-[12.5px] outline-none transition-all focus:ring-2 focus:ring-[var(--admin-accent)]/20"
          />
        </div>

        <div className="col-span-2 sm:col-span-1">
          <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-1.5 block">
            Telugu Title (optional)
          </label>
          <input
            type="text"
            value={formData.teluguTitle}
            onChange={(e) => setFormData({ ...formData, teluguTitle: e.target.value })}
            placeholder="సాంప్రదాయ పూజా పీఠం"
            className="w-full bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] focus:border-[var(--admin-accent)] focus:bg-[var(--admin-surface)] rounded-xl px-4 py-2.5 text-[12.5px] outline-none transition-all focus:ring-2 focus:ring-[var(--admin-accent)]/20"
          />
        </div>

        <div className="col-span-2 sm:col-span-1">
          <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-1.5 block">
            Slug (auto-generated from title)
          </label>
          <input
            type="text"
            readOnly
            value={
              formData.title
                ? formData.title
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/(^-|-$)/g, '')
                : ''
            }
            placeholder="vintage-teak-mirror"
            className="w-full bg-[var(--admin-bg-subtle)] rounded-xl px-4 py-2.5 text-[12.5px] outline-none transition-all border border-transparent opacity-70 cursor-not-allowed text-[var(--admin-text-primary)] font-medium"
          />
        </div>

        <div className="col-span-2 sm:col-span-1">
          <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-1.5 block">
            Material
          </label>
          <input
            type="text"
            value={formData.material}
            onChange={(e) => setFormData({ ...formData, material: e.target.value })}
            placeholder="e.g. Teak wood, Pure Brass"
            className="w-full bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] focus:border-[var(--admin-accent)] focus:bg-[var(--admin-surface)] rounded-xl px-4 py-2.5 text-[12.5px] outline-none transition-all focus:ring-2 focus:ring-[var(--admin-accent)]/20"
          />
        </div>

        <div className="col-span-2 sm:col-span-1">
          <div className="flex justify-between items-center h-5 mb-1.5">
            <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider block">
              Primary Category <span className="text-error">*</span>
            </label>
            <button
              type="button"
              onClick={() => {
                setIsCustomCategory(!isCustomCategory);
                setFormData({ ...formData, primaryCategory: '' });
              }}
              className="text-[11px] font-bold text-[var(--admin-accent)] hover:underline cursor-pointer flex items-center gap-0.5"
            >
              <span className="material-symbols-outlined text-[12px]">
                {isCustomCategory ? 'list' : 'add_circle'}
              </span>
              {isCustomCategory ? 'Select from list' : 'Add Custom'}
            </button>
          </div>
          {isCustomCategory ? (
            <input
              type="text"
              required
              value={formData.primaryCategory}
              onChange={(e) => setFormData({ ...formData, primaryCategory: e.target.value })}
              placeholder="Traditional Urlis, Brass Lamps"
              className="w-full bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] focus:border-[var(--admin-accent)] focus:bg-[var(--admin-surface)] rounded-xl px-4 py-2.5 text-[12.5px] outline-none transition-all focus:ring-2 focus:ring-[var(--admin-accent)]/20"
            />
          ) : (
            <select
              required
              value={formData.primaryCategory}
              onChange={(e) => setFormData({ ...formData, primaryCategory: e.target.value })}
              className="w-full bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] focus:border-[var(--admin-accent)] focus:bg-[var(--admin-surface)] rounded-xl px-4 py-2.5 text-[12.5px] outline-none transition-all focus:ring-2 focus:ring-[var(--admin-accent)]/20"
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

        <div className="col-span-2">
          <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-1.5 block">
            Secondary Categories (Optional)
          </label>
          <div className="flex flex-wrap gap-2 p-3 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-xl max-h-40 overflow-y-auto">
            {categoriesList
              .filter((c) => c !== formData.primaryCategory)
              .map((c) => {
                const isSelected = formData.secondaryCategories?.includes(c);
                return (
                  <button
                    type="button"
                    key={c}
                    onClick={() => {
                      const current = formData.secondaryCategories || [];
                      if (isSelected) {
                        setFormData({
                          ...formData,
                          secondaryCategories: current.filter((cat) => cat !== c),
                        });
                      } else {
                        setFormData({ ...formData, secondaryCategories: [...current, c] });
                      }
                    }}
                    className={`px-3 py-1 text-[11px] font-semibold rounded-full border transition-all ${
                      isSelected
                        ? 'bg-[var(--admin-accent)] text-white border-[var(--admin-accent)]'
                        : 'bg-white text-[var(--admin-text-secondary)] border-[var(--admin-border)] hover:border-[var(--admin-accent)]'
                    }`}
                  >
                    {c}
                  </button>
                );
              })}
            {categoriesList.length === 0 && (
              <p className="text-[11px] text-[var(--admin-text-tertiary)] italic py-1">
                No other categories available.
              </p>
            )}
          </div>
        </div>

        <div className="col-span-2 sm:col-span-1">
          <div className="flex items-center h-5 mb-1.5">
            <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider block">
              Dimensions (L x W x H)
            </label>
          </div>
          <input
            type="text"
            value={formData.dimensions}
            onChange={(e) => setFormData({ ...formData, dimensions: e.target.value })}
            placeholder='Dimensions (e.g. 18" x 4" x 24")'
            className="w-full bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] focus:border-[var(--admin-accent)] focus:bg-[var(--admin-surface)] rounded-xl px-4 py-2.5 text-[12.5px] outline-none transition-all focus:ring-2 focus:ring-[var(--admin-accent)]/20"
          />
        </div>

        <div className="col-span-2">
          <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-1.5 block">
            Product Description
          </label>
          <textarea
            rows={4}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Enter product description..."
            className="w-full bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] focus:border-[var(--admin-accent)] focus:bg-[var(--admin-surface)] rounded-xl px-4 py-2.5 text-[12.5px] outline-none transition-all focus:ring-2 focus:ring-[var(--admin-accent)]/20 resize-none"
          />
        </div>
      </div>

      {/* Product Personalization Settings */}
      <div
        className={`p-4 bg-[var(--admin-bg-subtle)] border rounded-2xl space-y-4 mt-6 transition-all duration-300 ${focusedField === 'isCustomizable' ? 'border-[var(--admin-accent)] ring-2 ring-[var(--admin-accent)]/50 scale-[1.01] shadow-lg' : 'border-[var(--admin-border)]'}`}
      >
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--admin-text-primary)]">
              Customer Personalization Notes
            </p>
            <p className="text-[11px] text-[var(--admin-text-secondary)] mt-1">
              Allow customers to add custom text (e.g. names, engravings) for this product during
              checkout.
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
          <div className="space-y-4 pt-2 border-t border-[var(--admin-border)]/50 mt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-1.5 block">
                  Input Label
                </label>
                <input
                  type="text"
                  placeholder="e.g. Name to Print"
                  value={formData.customizationConfig?.label || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      customizationConfig: {
                        ...prev.customizationConfig,
                        label: e.target.value,
                      },
                    }))
                  }
                  className={`w-full bg-[var(--admin-surface)] rounded-xl px-4 py-2 text-[12.5px] border outline-none transition-all duration-300 ${focusedField === 'customizationNote' ? 'border-[var(--admin-accent)] ring-2 ring-[var(--admin-accent)]/50 scale-[1.02] shadow-md' : 'border-[var(--admin-border)] focus:border-[var(--admin-accent)]/40'}`}
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-1.5 block">
                  Placeholder Text
                </label>
                <input
                  type="text"
                  placeholder="e.g. Enter name here..."
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
                  className="w-full bg-[var(--admin-surface)] rounded-xl px-4 py-2 text-[12.5px] border border-[var(--admin-border)] outline-none focus:border-[var(--admin-accent)]/40 transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-1.5 block">
                  Max Length (chars)
                </label>
                <input
                  type="number"
                  placeholder="500"
                  value={formData.customizationConfig?.maxLength || 500}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      customizationConfig: {
                        ...prev.customizationConfig,
                        maxLength: e.target.value,
                      },
                    }))
                  }
                  className="w-full bg-[var(--admin-surface)] rounded-xl px-4 py-2 text-[12.5px] border border-[var(--admin-border)] outline-none focus:border-[var(--admin-accent)]/40 transition-all"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-1.5 block">
                  Required Field?
                </label>
                <div className="flex items-center mt-2">
                  <AdminToggle
                    checked={formData.customizationConfig?.required || false}
                    onChange={() =>
                      setFormData((prev) => ({
                        ...prev,
                        customizationConfig: {
                          ...prev.customizationConfig,
                          required: !prev.customizationConfig?.required,
                        },
                      }))
                    }
                  />
                  <span className="ml-2 text-[11px] text-[var(--admin-text-secondary)]">
                    Customers must provide this note to checkout.
                  </span>
                </div>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-1.5 block">
                Helper Description (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Please double check spelling before submitting."
                value={formData.customizationConfig?.helperText || ''}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    customizationConfig: {
                      ...prev.customizationConfig,
                      helperText: e.target.value,
                    },
                  }))
                }
                className="w-full bg-[var(--admin-surface)] rounded-xl px-4 py-2 text-[12.5px] border border-[var(--admin-border)] outline-none focus:border-[var(--admin-accent)]/40 transition-all"
              />
            </div>
          </div>
        )}
      </div>

      {/* Product Notes & Complimentary Gift Information */}
      <div
        className={`p-4 bg-[var(--admin-bg-subtle)] border rounded-2xl space-y-4 mt-6 transition-all duration-300 ${focusedField === 'customerNote' ? 'border-[var(--admin-accent)] ring-2 ring-[var(--admin-accent)]/50 scale-[1.01] shadow-lg' : 'border-[var(--admin-border)]'}`}
      >
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--admin-text-primary)] mb-1">
            Customer Note / Important Information
          </p>
          <p className="text-[11px] text-[var(--admin-text-secondary)] mb-2">
            Displays on the storefront product detail page as a Designer's Note. Supports multi-line
            text.
          </p>
          <textarea
            rows={3}
            value={formData.customerNote || ''}
            onChange={(e) => setFormData({ ...formData, customerNote: e.target.value })}
            placeholder="e.g. Crafted with pure brass... Please note that slight color variations may occur."
            className="w-full bg-[var(--admin-surface)] border border-[var(--admin-border)] focus:border-[var(--admin-accent)] rounded-xl px-4 py-2.5 text-[12.5px] outline-none transition-all focus:ring-2 focus:ring-[var(--admin-accent)]/20 resize-none"
          />
        </div>

        <div className="pt-4 border-t border-[var(--admin-border)]/50">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--admin-text-primary)]">
                Complimentary Gift Included
              </p>
              <p className="text-[11px] text-[var(--admin-text-secondary)] mt-1">
                Offer a free gift with this product purchase.
              </p>
            </div>
            <AdminToggle
              checked={formData.complimentaryGift?.enabled || false}
              onChange={() =>
                setFormData((prev) => ({
                  ...prev,
                  complimentaryGift: {
                    ...prev.complimentaryGift,
                    enabled: !prev.complimentaryGift?.enabled,
                  },
                }))
              }
            />
          </div>

          {formData.complimentaryGift?.enabled && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-1.5 block">
                  Gift Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Welcome Chocolate Gift"
                  value={formData.complimentaryGift?.name || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      complimentaryGift: {
                        ...prev.complimentaryGift,
                        name: e.target.value,
                      },
                    }))
                  }
                  className="w-full bg-[var(--admin-surface)] border border-[var(--admin-border)] focus:border-[var(--admin-accent)] rounded-xl px-4 py-2 text-[12.5px] outline-none transition-all"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-1.5 block">
                  Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.complimentaryGift?.quantity || 1}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      complimentaryGift: {
                        ...prev.complimentaryGift,
                        quantity: parseInt(e.target.value, 10) || 1,
                      },
                    }))
                  }
                  className="w-full bg-[var(--admin-surface)] border border-[var(--admin-border)] focus:border-[var(--admin-accent)] rounded-xl px-4 py-2 text-[12.5px] outline-none transition-all"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-1.5 block">
                  Gift Description (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Premium assorted Belgian chocolates."
                  value={formData.complimentaryGift?.description || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      complimentaryGift: {
                        ...prev.complimentaryGift,
                        description: e.target.value,
                      },
                    }))
                  }
                  className="w-full bg-[var(--admin-surface)] border border-[var(--admin-border)] focus:border-[var(--admin-accent)] rounded-xl px-4 py-2 text-[12.5px] outline-none transition-all"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-1.5 block">
                  Display Badge (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. FREE GIFT"
                  value={formData.complimentaryGift?.displayBadge || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      complimentaryGift: {
                        ...prev.complimentaryGift,
                        displayBadge: e.target.value,
                      },
                    }))
                  }
                  className="w-full bg-[var(--admin-surface)] border border-[var(--admin-border)] focus:border-[var(--admin-accent)] rounded-xl px-4 py-2 text-[12.5px] outline-none transition-all"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
