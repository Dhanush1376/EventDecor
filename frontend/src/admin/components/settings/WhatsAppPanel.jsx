import React from 'react';

export function WhatsAppPanel({
  settings,
  setSettings,
  handleGlobalSettingsSave,
  syncSettingsData,
  saving,
}) {
  return (
    <div className="space-y-8">
      <form onSubmit={handleGlobalSettingsSave} className="space-y-6">
        <div className="space-y-1.5">
          <label className="text-[12.5px] font-bold text-[var(--admin-text-primary)] block leading-tight">
            WhatsApp Business Number
          </label>
          <input
            type="tel"
            value={settings.whatsappNumber}
            onChange={(e) => setSettings({ ...settings, whatsappNumber: e.target.value })}
            placeholder="e.g. +91 98660 06648"
            className="admin-input h-9 !min-h-[36px] rounded-[4px] border-[var(--admin-border)] focus:border-[var(--admin-accent)] text-[13px]"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[12.5px] font-bold text-[var(--admin-text-primary)] block leading-tight">
            Default Click-to-Chat Message Template
          </label>
          <textarea
            rows={4}
            value={settings.whatsappMessage}
            onChange={(e) => setSettings({ ...settings, whatsappMessage: e.target.value })}
            className="admin-textarea rounded-[4px] border-[var(--admin-border)] focus:border-[var(--admin-accent)] text-[13px]"
          />
        </div>

        <div className="flex justify-end gap-2.5 pt-4 mt-6 border-t border-[var(--admin-border-subtle)]">
          <button
            type="button"
            onClick={syncSettingsData}
            className="h-9 px-4 rounded-[4px] border border-[var(--admin-border)] hover:bg-[var(--admin-surface-muted)] text-[var(--admin-text-secondary)] font-bold text-[12px] transition-colors cursor-pointer"
          >
            Discard
          </button>
          <button
            type="submit"
            disabled={saving}
            className="h-9 px-5 rounded-[4px] bg-[var(--admin-accent)] hover:opacity-95 text-white font-bold text-[12.5px] shadow-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[16px]">save</span>
            <span>{saving ? 'Saving...' : 'Save WhatsApp Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
