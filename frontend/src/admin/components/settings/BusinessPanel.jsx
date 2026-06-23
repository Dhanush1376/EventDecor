import React from 'react';

export function BusinessPanel({
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
          <label className="admin-label">Business Name</label>
          <input
            type="text"
            required
            value={settings.businessName}
            onChange={(e) => setSettings({ ...settings, businessName: e.target.value })}
            className="admin-input"
          />
        </div>
        <div className="space-y-2">
          <label className="admin-label">Brand Tagline</label>
          <input
            type="text"
            value={settings.tagline}
            onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
            className="admin-input"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="space-y-2">
          <label className="admin-label">Store Support Email</label>
          <input
            type="email"
            value={settings.businessEmail}
            onChange={(e) =>
              setSettings({
                ...settings,
                businessEmail: e.target.value,
              })
            }
            className="admin-input"
          />
        </div>
        <div className="space-y-2">
          <label className="admin-label">Merchant GST Number</label>
          <input
            type="text"
            value={settings.gstNumber}
            onChange={(e) => setSettings({ ...settings, gstNumber: e.target.value })}
            className="admin-input uppercase"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="admin-label">Corporate HQ / Workshop Address</label>
        <textarea
          rows={2}
          value={settings.address}
          onChange={(e) => setSettings({ ...settings, address: e.target.value })}
          className="admin-textarea"
        />
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
          {saving ? 'Saving...' : 'Save Business Info'}
        </button>
      </div>
    </form>
  );
}
