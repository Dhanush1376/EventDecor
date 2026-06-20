import React from 'react';
import { AdminToggle } from '../../components/AdminUIKit';

export function ProductInfoStep({
  formData,
  setFormData,
  categoriesList,
  isAIGenerating,
  isCustomCategory,
  setIsCustomCategory,
  focusedField,
  handleAIFill,
}) {
  return (
    <>
      {/* STEP 2: CORE DETAILS */}
      {currentStep === 1 && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h2 className="text-[11px] font-bold text-[var(--admin-text-primary)]">
                Product Info
              </h2>
              <p className="text-[11px] text-[var(--admin-text-secondary)]">
                Detail product info, category, and materials.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAIFill}
              disabled={isAIGenerating}
              className="bg-[var(--admin-accent)] text-white px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-md hover:brightness-110 transition-all active:scale-95 disabled:opacity-70 cursor-pointer"
            >
              {isAIGenerating ? (
                <div className="skeleton-box inline-block w-3.5 h-3.5 rounded-md" />
              ) : (
                <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
              )}
              {isAIGenerating ? 'Analyzing Image & Title...' : 'Auto-Fill with AI'}
            </button>
          </div>

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
                Slug (auto-fills if empty)
              </label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="vintage-teak-mirror"
                className="w-full bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] focus:border-[var(--admin-accent)] focus:bg-[var(--admin-surface)] rounded-xl px-4 py-2.5 text-[12.5px] outline-none transition-all focus:ring-2 focus:ring-[var(--admin-accent)]/20"
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
                  Category <span className="text-error">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsCustomCategory(!isCustomCategory);
                    setFormData({ ...formData, category: '' });
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
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="Traditional Urlis, Brass Lamps"
                  className="w-full bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] focus:border-[var(--admin-accent)] focus:bg-[var(--admin-surface)] rounded-xl px-4 py-2.5 text-[12.5px] outline-none transition-all focus:ring-2 focus:ring-[var(--admin-accent)]/20"
                />
              ) : (
                <select
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
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
                  Allow customers to add custom text (e.g. names, engravings) for this product
                  during checkout.
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
        </div>
      )}
    </>
  );
}
