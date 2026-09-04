import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { whatsappAutomationService } from '../../services/whatsappAutomationService';

export function WhatsAppPanel({
  settings,
  setSettings,
  handleGlobalSettingsSave,
  syncSettingsData,
  saving,
}) {
  const [automations, setAutomations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAutomations = async () => {
      try {
        const res = await whatsappAutomationService.getAutomations();
        if (res.data?.data) {
          setAutomations(res.data.data);
        }
      } catch (err) {
        toast.error('Failed to load WhatsApp automations');
      } finally {
        setLoading(false);
      }
    };
    fetchAutomations();
  }, []);

  const handleToggle = async (key, enabled) => {
    try {
      await whatsappAutomationService.toggleAutomation(key, enabled);
      setAutomations((prev) => prev.map((a) => (a.automationKey === key ? { ...a, enabled } : a)));
      toast.success(enabled ? 'Automation enabled' : 'Automation disabled');
    } catch (err) {
      toast.error('Failed to toggle automation');
    }
  };

  return (
    <div className="space-y-8">
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

        <div className="flex justify-end gap-3 pt-4 border-t border-[var(--admin-border-subtle)]">
          <button
            type="button"
            onClick={syncSettingsData}
            className="admin-btn admin-btn-outline h-10 border-transparent bg-transparent hover:bg-[var(--admin-surface-muted)]"
          >
            Discard
          </button>
          <button type="submit" disabled={saving} className="admin-btn h-10">
            {saving ? 'Saving...' : 'Save WhatsApp Settings'}
          </button>
        </div>
      </form>

      {/* Automations Toggles Section */}
      <div className="pt-8 border-t border-[var(--admin-border-subtle)] space-y-6">
        <div>
          <h3 className="text-[16px] font-bold mb-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-[var(--admin-accent)]">
              offline_bolt
            </span>
            Active WhatsApp Automations
          </h3>
          <p className="text-[12px] text-[var(--admin-text-secondary)]">
            Toggle the automated system messages sent via the Meta Cloud API.
          </p>
        </div>

        {loading ? (
          <div className="p-4 text-center text-[13px] text-[var(--admin-text-secondary)]">
            Loading...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {automations.map((auto) => (
              <div
                key={auto.automationKey}
                className="admin-card p-4 flex flex-col justify-between border border-[var(--admin-border-subtle)] rounded-lg"
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <h4
                      className="font-semibold text-[14px] text-[var(--admin-text-primary)] truncate"
                      title={auto.displayName}
                    >
                      {auto.displayName}
                    </h4>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={auto.enabled}
                        onChange={(e) => handleToggle(auto.automationKey, e.target.checked)}
                      />
                      <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--admin-accent)]"></div>
                    </label>
                  </div>
                  <p className="text-[12px] text-[var(--admin-text-secondary)] mb-2 line-clamp-2 min-h-[36px]">
                    {auto.description}
                  </p>
                  <span className="text-[11px] font-medium text-[var(--admin-text-tertiary)] uppercase tracking-wide">
                    {auto.category}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
