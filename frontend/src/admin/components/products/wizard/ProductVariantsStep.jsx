import React from 'react';

export function ProductVariantsStep(props) {
  const {
    formData,
    setFormData,
    _isCompressing,
    _setIsCompressing,
    _compressionProgress,
    _setCompressionProgress,
    _compressionStats,
    _setCompressionStats,
    _categoriesList,
    _setCategoriesList,
    _isCustomCategory,
    _setIsCustomCategory,
    focusedField,
    handleAIFill,
    isAIGenerating,
    newVariant,
    setNewVariant,
    handleAddVariant,
    handleRemoveVariant,
    _showRentalSettings,
    _setShowRentalSettings,
  } = props;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-[11px] font-bold text-[var(--admin-text-primary)]">
            Variants & Tags
          </h2>
          <p className="text-[11px] text-[var(--admin-text-secondary)]">
            Define attributes, variations, and storefront badges.
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
          {isAIGenerating ? 'Analyzing Curation...' : 'Auto-Fill with AI'}
        </button>
      </div>

      {/* Badge Pill Inputs */}
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 sm:col-span-1">
          <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-1.5 block">
            Storefront Badges (comma-separated)
          </label>
          <input
            type="text"
            value={formData.badges}
            onChange={(e) => setFormData({ ...formData, badges: e.target.value })}
            placeholder="Best Seller, Heritage Craft"
            className="w-full bg-[var(--admin-bg-subtle)] rounded-xl px-4 py-2.5 text-[12.5px] outline-none border border-transparent focus:border-[var(--admin-accent)]/40 focus:bg-white transition-all "
          />
        </div>

        <div className="col-span-2 sm:col-span-1">
          <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-1.5 block">
            Tags / Collections
          </label>
          <input
            type="text"
            value={formData.tags}
            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
            placeholder="e.g. brass, puja, diwali"
            className={`w-full bg-[var(--admin-bg-subtle)] rounded-xl px-4 py-2.5 text-[12.5px] outline-none transition-all  ${
              focusedField === 'tags'
                ? 'border-2 border-[var(--admin-accent)] shadow-[0_0_15px_rgba(99,102,241,0.4)] scale-[1.01] bg-[var(--admin-surface)]'
                : 'border border-transparent focus:border-[var(--admin-accent)]/40 focus:bg-white'
            }`}
          />
        </div>
      </div>

      {/* Dynamic Variant Constructor */}
      <div className="p-4 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-2xl space-y-3">
        <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--admin-text-primary)]">
          Add Variation Parameter
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
          <input
            type="text"
            placeholder="Attribute (e.g. Wood)"
            value={newVariant.name}
            onChange={(e) => setNewVariant({ ...newVariant, name: e.target.value })}
            className="bg-[var(--admin-surface)] rounded-lg px-2.5 py-2.5 text-[12px] border border-[var(--admin-border)] outline-none w-full"
          />
          <input
            type="text"
            placeholder="Value (e.g. Rosewood)"
            value={newVariant.value}
            onChange={(e) => setNewVariant({ ...newVariant, value: e.target.value })}
            className="bg-[var(--admin-surface)] rounded-lg px-2.5 py-2.5 text-[12px] border border-[var(--admin-border)] outline-none w-full"
          />
          <input
            type="number"
            inputMode="decimal"
            placeholder="+/- Price (₹)"
            value={newVariant.price}
            onChange={(e) => setNewVariant({ ...newVariant, price: e.target.value })}
            className="bg-[var(--admin-surface)] rounded-lg px-2.5 py-2.5 text-[12px] border border-[var(--admin-border)] outline-none w-full"
          />
          <button
            type="button"
            onClick={handleAddVariant}
            className="bg-[var(--admin-accent)] text-white text-[11px] sm:text-[11px] font-bold uppercase py-2.5 rounded-lg hover:brightness-110 cursor-pointer w-full transition-transform active:scale-95 shadow-sm"
          >
            Add Option
          </button>
        </div>

        {/* Rendered variants list */}
        {formData.variants.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {formData.variants.map((v) => (
              <span
                key={v.id}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-[var(--admin-surface)] border border-[var(--admin-border)] text-[11px] sm:text-[11px] rounded-lg text-[var(--admin-text-primary)] font-medium"
              >
                <span className="text-[var(--admin-text-secondary)]">{v.name}:</span> {v.value}
                {v.price && (
                  <span className="text-[var(--admin-accent)] font-bold">
                    ({Number(v.price) >= 0 ? `+₹${v.price}` : `-₹${Math.abs(v.price)}`})
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => handleRemoveVariant(v.id)}
                  className="text-[var(--admin-error)] hover:text-[var(--admin-error)] ml-1 flex items-center justify-center cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
