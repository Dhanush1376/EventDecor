import React from 'react';

export function AestheticsStep({
  formData,
  setFormData,
  focusedField,
  newInclusion = { name: '', defaultQty: 1, condition: 'excellent' },
  setNewInclusion = () => {},
  handleAddInclusion = () => {},
  handleRemoveInclusion = () => {},
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[11px] font-bold text-[var(--admin-text-primary)]">
          Commercials & Aesthetics
        </h2>
        <p className="text-[11px] text-[var(--admin-text-secondary)]">
          Define rental rates, colors, setup time, and prop lists.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 sm:col-span-1">
          <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-1.5 block">
            Rental Price (₹) <span className="text-error">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--admin-text-secondary)] text-[13px] font-bold">
              ₹
            </span>
            <input
              type="number"
              required
              min="1"
              inputMode="decimal"
              value={formData.rentalPrice}
              onChange={(e) => setFormData({ ...formData, rentalPrice: Number(e.target.value) })}
              className="w-full bg-[var(--admin-surface)] rounded-xl pl-7 pr-3 py-2.5 text-[12.5px] outline-none border border-[var(--admin-border)] focus:border-[var(--admin-accent)]/40"
            />
          </div>
        </div>

        <div className="col-span-2 sm:col-span-1">
          <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-1.5 block">
            Estimated Setup (Hours)
          </label>
          <input
            type="number"
            value={formData.setupTimeHours}
            onChange={(e) => setFormData({ ...formData, setupTimeHours: Number(e.target.value) })}
            className={`w-full bg-[var(--admin-bg-subtle)] rounded-xl px-4 py-2.5 text-[12.5px] outline-none transition-all ${
              focusedField === 'setupTimeHours'
                ? 'border-2 border-[var(--admin-accent)] shadow-[0_0_15px_rgba(99,102,241,0.4)] scale-[1.01] bg-[var(--admin-surface)]'
                : 'border border-[var(--admin-border)] focus:border-[var(--admin-accent)] focus:bg-[var(--admin-surface)] focus:ring-2 focus:ring-[var(--admin-accent)]/20'
            }`}
          />
        </div>

        <div className="col-span-2">
          <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-1.5 block">
            Color Palette (comma-separated)
          </label>
          <input
            type="text"
            value={formData.colorPalette}
            onChange={(e) => setFormData({ ...formData, colorPalette: e.target.value })}
            placeholder="#8B0000, #FFD700"
            className={`w-full bg-[var(--admin-bg-subtle)] rounded-xl px-4 py-2.5 text-[12.5px] font-mono outline-none transition-all ${
              focusedField === 'colorPalette'
                ? 'border-2 border-[var(--admin-accent)] shadow-[0_0_15px_rgba(99,102,241,0.4)] scale-[1.01] bg-[var(--admin-surface)]'
                : 'border border-[var(--admin-border)] focus:border-[var(--admin-accent)] focus:bg-[var(--admin-surface)] focus:ring-2 focus:ring-[var(--admin-accent)]/20'
            }`}
          />
        </div>

        {/* Dynamic Inclusions Constructor */}
        <div className="col-span-2 p-4 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-2xl space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--admin-text-primary)]">
            Included Items & Props
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
            <input
              type="text"
              placeholder="Item Name (e.g. Lotus brass urli)"
              value={newInclusion.name}
              onChange={(e) => setNewInclusion({ ...newInclusion, name: e.target.value })}
              className="bg-[var(--admin-surface)] rounded-lg px-2.5 py-2.5 text-[12px] border border-[var(--admin-border)] outline-none w-full col-span-1 sm:col-span-2"
            />
            <input
              type="number"
              placeholder="Qty (e.g. 1)"
              value={newInclusion.defaultQty}
              onChange={(e) =>
                setNewInclusion({ ...newInclusion, defaultQty: Number(e.target.value) })
              }
              className="bg-[var(--admin-surface)] rounded-lg px-2.5 py-2.5 text-[12px] border border-[var(--admin-border)] outline-none w-full"
            />
            <button
              type="button"
              onClick={handleAddInclusion}
              className="bg-[var(--admin-accent)] text-white text-[11px] sm:text-[11px] font-bold uppercase py-2.5 rounded-lg hover:brightness-110 cursor-pointer w-full transition-transform active:scale-95 shadow-sm"
            >
              Add Item
            </button>
          </div>

          {/* Rendered inclusions list */}
          {(formData.inclusions || []).length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {formData.inclusions.map((i) => (
                <span
                  key={i.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-[var(--admin-surface)] border border-[var(--admin-border)] text-[11px] sm:text-[11px] rounded-lg text-[var(--admin-text-primary)] font-medium"
                >
                  <span className="text-[var(--admin-text-secondary)]">{i.name}</span>
                  <span className="text-[var(--admin-accent)] font-bold">(x{i.defaultQty})</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveInclusion(i.id)}
                    className="text-[var(--admin-error)] hover:text-[var(--admin-error)] ml-1 flex items-center justify-center cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[14px]">close</span>
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="col-span-2 sm:col-span-1">
          <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-1.5 block">
            Suggested Add-on Props
          </label>
          <textarea
            rows={3}
            value={formData.suggestedProps}
            onChange={(e) => setFormData({ ...formData, suggestedProps: e.target.value })}
            placeholder="Beaded shagun boxes, Mogra garland drops..."
            className={`w-full bg-[var(--admin-bg-subtle)] rounded-xl px-4 py-2.5 text-[12.5px] outline-none transition-all resize-none ${
              focusedField === 'suggestedProps'
                ? 'border-2 border-[var(--admin-accent)] shadow-[0_0_15px_rgba(99,102,241,0.4)] scale-[1.01] bg-[var(--admin-surface)]'
                : 'border border-[var(--admin-border)] focus:border-[var(--admin-accent)] focus:bg-[var(--admin-surface)] focus:ring-2 focus:ring-[var(--admin-accent)]/20'
            }`}
          />
        </div>
      </div>
    </div>
  );
}
