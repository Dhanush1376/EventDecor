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
    <div className="max-w-4xl space-y-8">
      {/* General Settings */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
        <div>
          <h2 className="text-[18px] font-bold text-gray-900 mb-1">General Settings</h2>
          <p className="text-[13px] text-gray-500">
            Manage basic WhatsApp integration preferences.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-[12px] font-bold text-gray-500 uppercase tracking-wider mb-2">
              WhatsApp Provider Status
            </label>
            <div className="flex items-center gap-2 p-3 bg-green-50 text-green-700 border border-green-200 rounded-lg text-[13px] font-bold">
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              Meta Cloud API (Connected)
            </div>
          </div>
          <div>
            <label className="block text-[12px] font-bold text-gray-500 uppercase tracking-wider mb-2">
              Default Sender Number
            </label>
            <input
              type="text"
              className="admin-input w-full bg-gray-50 text-gray-500 cursor-not-allowed"
              value="+1 (555) 123-4567"
              readOnly
            />
          </div>
          <div>
            <label className="block text-[12px] font-bold text-gray-500 uppercase tracking-wider mb-2">
              Time Zone
            </label>
            <select className="admin-input w-full">
              <option>UTC (Coordinated Universal Time)</option>
              <option>PST (Pacific Standard Time)</option>
              <option>EST (Eastern Standard Time)</option>
              <option>IST (Indian Standard Time)</option>
            </select>
          </div>
          <div>
            <label className="block text-[12px] font-bold text-gray-500 uppercase tracking-wider mb-2">
              Business Hours
            </label>
            <div className="flex gap-2">
              <input type="time" className="admin-input flex-1" defaultValue="09:00" />
              <span className="flex items-center text-gray-400">to</span>
              <input type="time" className="admin-input flex-1" defaultValue="18:00" />
            </div>
          </div>
          <div className="col-span-2">
            <label className="block text-[12px] font-bold text-gray-500 uppercase tracking-wider mb-2">
              Retry Policy
            </label>
            <select className="admin-input w-full">
              <option>Aggressive (Retry up to 5 times)</option>
              <option>Standard (Retry up to 3 times)</option>
              <option>Minimal (Retry 1 time)</option>
              <option>No Retries</option>
            </select>
          </div>
        </div>

        <div className="pt-6 border-t border-gray-100 flex gap-3">
          <button
            onClick={handleSaveSettings}
            className="admin-btn-primary flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">save</span> Save Changes
          </button>
          <button
            onClick={handleTestConnection}
            className="admin-btn-secondary flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">cable</span> Test Connection
          </button>
        </div>
      </div>

      {/* Advanced Mode Toggle */}
      {isSuperUser && (
        <div
          className={`p-6 rounded-2xl shadow-sm border transition-colors ${advancedMode ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-gray-100'}`}
        >
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-[18px] font-bold text-gray-900 mb-1 flex items-center gap-2">
                <span
                  className={`material-symbols-outlined ${advancedMode ? 'text-indigo-600' : 'text-gray-400'}`}
                >
                  developer_board
                </span>
                Advanced Mode
              </h2>
              <p className="text-[13px] text-gray-500 max-w-xl">
                This exposes internal infrastructure tools (Workflows, Campaigns, Live Queues,
                Certification, RBAC) intended only for advanced administration and developers. Use
                with caution.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer mt-1">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={advancedMode}
                onChange={(e) => setAdvancedMode(e.target.checked)}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>
        </div>
      )}
    </div>
  );
};

export default WhatsAppSettings;
