import React from 'react';

export function ShippingPanel({
  settings,
  setSettings,
  handleGlobalSettingsSave,
  syncSettingsData,
  saving,
}) {
  return (
    <form onSubmit={handleGlobalSettingsSave} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="space-y-2">
          <label className="admin-label">Free Shipping Threshold (₹)</label>
          <input
            type="number"
            value={settings.freeShippingThreshold}
            onChange={(e) =>
              setSettings({
                ...settings,
                freeShippingThreshold: e.target.value,
              })
            }
            className="admin-input"
          />
        </div>
        <div className="space-y-2">
          <label className="admin-label">Standard Shipping Fee (₹)</label>
          <input
            type="number"
            value={settings.standardShippingFee}
            onChange={(e) =>
              setSettings({
                ...settings,
                standardShippingFee: e.target.value,
              })
            }
            className="admin-input"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="space-y-2">
          <label className="admin-label">Express Shipping Premium (₹)</label>
          <input
            type="number"
            value={settings.expressShippingFee}
            onChange={(e) =>
              setSettings({
                ...settings,
                expressShippingFee: e.target.value,
              })
            }
            className="admin-input"
          />
        </div>
        <div className="space-y-2">
          <label className="admin-label flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[14px]">account_balance_wallet</span>
            COD Handling Fee (₹)
          </label>
          <input
            type="number"
            value={settings.codFee || '90'}
            onChange={(e) =>
              setSettings({
                ...settings,
                codFee: e.target.value,
              })
            }
            className="admin-input focus:border-black"
          />
        </div>
        <div className="space-y-2">
          <label className="admin-label">Delivery Estimate Label</label>
          <input
            type="text"
            value={settings.deliveryEstimate}
            onChange={(e) =>
              setSettings({
                ...settings,
                deliveryEstimate: e.target.value,
              })
            }
            placeholder="e.g. 5-7 Days"
            className="admin-input"
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-6 mt-8 border-t border-[var(--admin-border-subtle)]">
        <button
          type="button"
          onClick={syncSettingsData}
          className="admin-btn admin-btn-outline h-10 border-transparent bg-transparent hover:bg-[var(--admin-surface-muted)]"
        >
          Discard
        </button>
        <button type="submit" disabled={saving} className="admin-btn h-10">
          {saving ? 'Saving...' : 'Save Shipping Config'}
        </button>
      </div>
    </form>
  );
}
