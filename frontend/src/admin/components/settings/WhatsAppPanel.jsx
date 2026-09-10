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

      {/* Automations Toggles Section (Order Detail Card Architecture) */}
      <div className="bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-[4px] shadow-sm overflow-hidden mt-8">
        <div className="px-4 py-3 border-b border-[var(--admin-border-subtle)] bg-[var(--admin-bg-subtle)] flex items-center justify-between">
          <h3 className="text-[13.5px] font-bold text-[var(--admin-text-primary)] flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-[var(--admin-accent)]">
              offline_bolt
            </span>
            Active WhatsApp Automations
          </h3>
          <span className="text-[10px] bg-[var(--admin-surface)] text-[var(--admin-text-secondary)] px-2 py-0.5 rounded-[4px] font-bold uppercase tracking-wider border border-[var(--admin-border)] shadow-2xs">
            Meta Cloud API
          </span>
        </div>

        <div className="p-4 sm:p-5">
          <p className="text-[12px] text-[var(--admin-text-secondary)] mb-4">
            Toggle automated system messages dispatched through the Meta WhatsApp Business API.
          </p>

          {loading ? (
            <div className="p-4 text-center text-[13px] text-[var(--admin-text-secondary)]">
              Loading automations...
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {automations.map((auto) => (
                <div
                  key={auto.automationKey}
                  className="bg-[var(--admin-surface)] p-3.5 flex flex-col justify-between border border-[var(--admin-border-subtle)] hover:border-[var(--admin-border)] rounded-[4px] shadow-2xs transition-all"
                >
                  <div>
                    <div className="flex justify-between items-start mb-1.5">
                      <h4
                        className="font-bold text-[13px] text-[var(--admin-text-primary)] truncate"
                        title={auto.displayName}
                      >
                        {auto.displayName}
                      </h4>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-2">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={auto.enabled}
                          onChange={(e) => handleToggle(auto.automationKey, e.target.checked)}
                        />
                        <div className="w-8 h-4.5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-3.5 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-[var(--admin-accent)]"></div>
                      </label>
                    </div>
                    <p className="text-[11.5px] text-[var(--admin-text-secondary)] mb-2 line-clamp-2 min-h-[34px] leading-relaxed">
                      {auto.description}
                    </p>
                    <span className="text-[10px] font-bold text-[var(--admin-accent)] uppercase tracking-wide bg-[var(--admin-accent)]/10 px-1.5 py-0.5 rounded-[3px]">
                      {auto.category}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
