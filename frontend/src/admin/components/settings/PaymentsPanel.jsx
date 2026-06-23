import React from 'react';

export function PaymentsPanel({
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
          <label className="admin-label">Razorpay Key ID</label>
          <input
            type="text"
            value={settings.razorpayKeyId}
            onChange={(e) => setSettings({ ...settings, razorpayKeyId: e.target.value })}
            placeholder="e.g. rzp_live_xxxxxxxxxxxx"
            className="admin-input"
          />
        </div>
      </div>
      <div className="p-4 bg-[var(--admin-surface-muted)] border border-[var(--admin-border-subtle)] rounded-[var(--admin-radius-lg)]">
        <p className="text-[12px] text-[var(--admin-text-secondary)] font-medium leading-relaxed">
          Razorpay secret keys are configured only via server environment variables (
          <code className="bg-[var(--admin-bg-subtle)] px-1.5 py-0.5 rounded text-[11px] font-mono text-[var(--admin-text-primary)] mx-1">
            RAZORPAY_KEY_SECRET
          </code>
          ,
          <code className="bg-[var(--admin-bg-subtle)] px-1.5 py-0.5 rounded text-[11px] font-mono text-[var(--admin-text-primary)] mx-1">
            RAZORPAY_WEBHOOK_SECRET
          </code>
          ). Use
          <code className="bg-[var(--admin-bg-subtle)] px-1.5 py-0.5 rounded text-[11px] font-mono text-[var(--admin-text-primary)] mx-1">
            VITE_RAZORPAY_KEY_ID
          </code>{' '}
          for the public checkout key.
        </p>
      </div>

      <div className="space-y-2">
        <label className="admin-label">Merchant UPI Settlement ID</label>
        <input
          type="text"
          value={settings.upiId}
          onChange={(e) => setSettings({ ...settings, upiId: e.target.value })}
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
          {saving ? 'Saving...' : 'Save Keys'}
        </button>
      </div>
    </form>
  );
}
