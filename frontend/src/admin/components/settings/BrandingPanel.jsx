import React from 'react';

export function BrandingPanel({
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
          <label className="admin-label">Primary Brand Color</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={settings.primaryColor}
              onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
              className="w-12 h-12 rounded-[var(--admin-radius-md)] cursor-pointer border border-[var(--admin-border-subtle)] p-1 bg-[var(--admin-surface)]"
            />
            <input
              type="text"
              value={settings.primaryColor}
              onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
              className="admin-input flex-1"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="admin-label">Secondary Color Accent</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={settings.secondaryColor}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  secondaryColor: e.target.value,
                })
              }
              className="w-12 h-12 rounded-[var(--admin-radius-md)] cursor-pointer border border-[var(--admin-border-subtle)] p-1 bg-[var(--admin-surface)]"
            />
            <input
              type="text"
              value={settings.secondaryColor}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  secondaryColor: e.target.value,
                })
              }
              className="admin-input flex-1"
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <label className="admin-label">System Font Family Settings</label>
        <input
          type="text"
          value={settings.fontFamily}
          onChange={(e) => setSettings({ ...settings, fontFamily: e.target.value })}
          className="admin-input"
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
          {saving ? 'Saving...' : 'Save Brand Setup'}
        </button>
      </div>
    </form>
  );
}
