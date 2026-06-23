import React from 'react';

export function WhatsAppPanel({
  settings,
  setSettings,
  handleGlobalSettingsSave,
  syncSettingsData,
  saving,
}) {
  return (
    <form onSubmit={handleGlobalSettingsSave} className="space-y-6">
      <div className="space-y-2">
        <label className="admin-label">WhatsApp Business Number</label>
        <input
          type="tel"
          value={settings.whatsappNumber}
          onChange={(e) => setSettings({ ...settings, whatsappNumber: e.target.value })}
          placeholder="e.g. +91 98660 06648"
          className="admin-input"
        />
      </div>

      <div className="space-y-2">
        <label className="admin-label">Default Click-to-Chat Message Template</label>
        <textarea
          rows={4}
          value={settings.whatsappMessage}
          onChange={(e) => setSettings({ ...settings, whatsappMessage: e.target.value })}
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
          {saving ? 'Saving...' : 'Save WhatsApp Rules'}
        </button>
      </div>
    </form>
  );
}
