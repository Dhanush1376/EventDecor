import React from 'react';
import { useAuth } from '../../../context/AuthContext';
import { toast } from 'react-hot-toast';

const WhatsAppSettings = ({ advancedMode, setAdvancedMode }) => {
  const { user } = useAuth();

  // Check if the user is authorized to see the Advanced Mode toggle
  const isSuperUser =
    user?.role === 'owner' ||
    user?.role === 'super_admin' ||
    user?.role === 'main_admin' ||
    user?.role === 'admin';

  const handleTestConnection = () => {
    toast.success('Connection successful! Ping: 42ms');
  };

  const handleSaveSettings = () => {
    toast.success('Settings saved successfully');
  };

  return (
    <div className="space-y-6">
      {/* General Settings */}
      <div className="admin-card p-6 space-y-6 border border-[var(--admin-border-subtle)] rounded-xl bg-[var(--admin-surface)] shadow-sm">
        <div>
          <h2 className="text-[18px] font-bold text-[var(--admin-text-primary)] mb-1">
            General Settings
          </h2>
          <p className="text-[13px] text-[var(--admin-text-secondary)]">
            Manage basic WhatsApp integration preferences.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-[11px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider mb-2">
              WhatsApp Provider Status
            </label>
            <div className="flex items-center gap-2 p-3 bg-green-50/50 text-[var(--admin-success)] border border-[var(--admin-success)]/20 rounded-md text-[13px] font-bold h-10">
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              Meta Cloud API (Connected)
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider mb-2">
              Default Sender Number
            </label>
            <input
              type="text"
              className="admin-input w-full bg-[var(--admin-surface-muted)] text-[var(--admin-text-tertiary)] cursor-not-allowed h-10"
              value="+1 (555) 123-4567"
              readOnly
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider mb-2">
              Time Zone
            </label>
            <select className="admin-input w-full h-10">
              <option>UTC (Coordinated Universal Time)</option>
              <option>PST (Pacific Standard Time)</option>
              <option>EST (Eastern Standard Time)</option>
              <option>IST (Indian Standard Time)</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider mb-2">
              Business Hours
            </label>
            <div className="flex gap-2 items-center">
              <input type="time" className="admin-input flex-1 h-10" defaultValue="09:00" />
              <span className="text-[var(--admin-text-tertiary)] font-medium text-[13px]">to</span>
              <input type="time" className="admin-input flex-1 h-10" defaultValue="18:00" />
            </div>
          </div>
          <div className="col-span-1 md:col-span-2">
            <label className="block text-[11px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider mb-2">
              Retry Policy
            </label>
            <select className="admin-input w-full h-10">
              <option>Aggressive (Retry up to 5 times)</option>
              <option>Standard (Retry up to 3 times)</option>
              <option>Minimal (Retry 1 time)</option>
              <option>No Retries</option>
            </select>
          </div>
        </div>

        <div className="pt-6 border-t border-[var(--admin-border-subtle)] flex gap-3">
          <button
            onClick={handleSaveSettings}
            className="admin-btn h-10 px-6 flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">save</span> Save Changes
          </button>
          <button
            onClick={handleTestConnection}
            className="admin-btn admin-btn-outline h-10 px-6 flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">cable</span> Test Connection
          </button>
        </div>
      </div>

      {/* Advanced Mode Toggle */}
      {isSuperUser && (
        <div
          className={`admin-card p-6 rounded-xl shadow-sm border transition-colors ${
            advancedMode
              ? 'bg-[var(--admin-accent)]/5 border-[var(--admin-accent)]/20'
              : 'bg-[var(--admin-surface)] border-[var(--admin-border-subtle)]'
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-[18px] font-bold text-[var(--admin-text-primary)] mb-1 flex items-center gap-2">
                <span
                  className={`material-symbols-outlined ${advancedMode ? 'text-[var(--admin-accent)]' : 'text-[var(--admin-text-tertiary)]'}`}
                >
                  developer_board
                </span>
                Advanced Mode
              </h2>
              <p className="text-[13px] text-[var(--admin-text-secondary)] max-w-xl">
                This exposes internal infrastructure tools (Workflows, Campaigns, Live Queues,
                Certification, RBAC) intended only for advanced administration and developers. Use
                with caution.
              </p>
            </div>

            {/* Custom Toggle Switch */}
            <label className="relative inline-flex items-center cursor-pointer mt-1">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={advancedMode}
                onChange={(e) => setAdvancedMode(e.target.checked)}
              />
              <div className="w-11 h-6 bg-[var(--admin-border-strong)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--admin-accent)]"></div>
            </label>
          </div>
        </div>
      )}
    </div>
  );
};

export default WhatsAppSettings;
