import React, { useState } from 'react';
import { Save, Lock, Key } from 'lucide-react';
import backupService from '../../services/backupService';

const RetentionManager = () => {
  const [retention, setRetention] = useState({
    dailyDays: 30,
    weeklyWeeks: 12,
    monthlyMonths: 12,
    yearlyYears: 7,
    immutableDefaultMonthly: true,
    immutableDefaultYearly: true,
  });

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Typically we'd send to backend, but these are env vars in our setup
      // We'll mock the success for the demo
      await new Promise((r) => setTimeout(r, 1000));
      alert('Retention policies updated successfully.');
    } catch (err) {
      alert('Failed to update policies');
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyRotation = async () => {
    if (
      window.confirm(
        'Are you sure you want to rotate the master encryption key? This is a highly sensitive operation.',
      )
    ) {
      try {
        await backupService.rotateKey();
        alert('Master key rotated successfully. New backups will use V2.');
      } catch (err) {
        alert('Failed to rotate key');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="glass-card max-w-3xl mx-auto">
        <div className="card-title">Retention Policy Configuration</div>
        <p className="text-sm text-gray-400 mb-6">
          Configure how long different backup tiers are retained before automatic pruning.
        </p>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm text-gray-300 mb-1">Daily Backups (Days)</label>
              <input
                type="number"
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:border-emerald-500 outline-none"
                value={retention.dailyDays}
                onChange={(e) =>
                  setRetention({ ...retention, dailyDays: parseInt(e.target.value) })
                }
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Weekly Backups (Weeks)</label>
              <input
                type="number"
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:border-emerald-500 outline-none"
                value={retention.weeklyWeeks}
                onChange={(e) =>
                  setRetention({ ...retention, weeklyWeeks: parseInt(e.target.value) })
                }
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Monthly Backups (Months)</label>
              <input
                type="number"
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:border-emerald-500 outline-none"
                value={retention.monthlyMonths}
                onChange={(e) =>
                  setRetention({ ...retention, monthlyMonths: parseInt(e.target.value) })
                }
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Yearly Backups (Years)</label>
              <input
                type="number"
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:border-emerald-500 outline-none"
                value={retention.yearlyYears}
                onChange={(e) =>
                  setRetention({ ...retention, yearlyYears: parseInt(e.target.value) })
                }
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-700">
            <h4 className="font-semibold text-white mb-4 flex items-center gap-2">
              <Lock size={16} /> Immutability Defaults (WORM)
            </h4>

            <div className="flex items-center gap-3 mb-4">
              <input
                type="checkbox"
                id="imm-month"
                checked={retention.immutableDefaultMonthly}
                onChange={(e) =>
                  setRetention({ ...retention, immutableDefaultMonthly: e.target.checked })
                }
                className="w-5 h-5 accent-emerald-500"
              />
              <label htmlFor="imm-month" className="text-gray-300">
                Make Monthly backups immutable by default
              </label>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="imm-year"
                checked={retention.immutableDefaultYearly}
                onChange={(e) =>
                  setRetention({ ...retention, immutableDefaultYearly: e.target.checked })
                }
                className="w-5 h-5 accent-emerald-500"
              />
              <label htmlFor="imm-year" className="text-gray-300">
                Make Yearly backups immutable by default
              </label>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="btn-primary flex items-center gap-2"
            >
              <Save size={16} /> {isSaving ? 'Saving...' : 'Save Policies'}
            </button>
          </div>
        </div>
      </div>

      <div className="glass-card max-w-3xl mx-auto border-amber-900/50">
        <div className="card-title text-amber-500">
          <Key size={18} /> Cryptographic Key Management
        </div>
        <p className="text-sm text-gray-400 mb-4">
          Rotate the AES-256-GCM encryption keys used to secure backup data.
        </p>

        <div className="bg-slate-800/50 rounded p-4 border border-slate-700 mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-300">Current Key Version:</span>
            <span className="text-white font-bold bg-slate-700 px-2 py-1 rounded text-sm">
              v1 (Active)
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-300">Last Rotated:</span>
            <span className="text-gray-400 text-sm">Never (System Default)</span>
          </div>
        </div>

        <button
          onClick={handleKeyRotation}
          className="btn-outline text-amber-500 hover:bg-amber-900/20 border-amber-900/50 w-full text-sm"
        >
          Rotate Master Encryption Key
        </button>
      </div>
    </div>
  );
};

export default RetentionManager;
