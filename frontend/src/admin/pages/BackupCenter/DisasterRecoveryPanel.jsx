import React, { useState } from 'react';
import Shield from 'lucide-react/dist/esm/icons/shield';
import Zap from 'lucide-react/dist/esm/icons/zap';
import AlertOctagon from 'lucide-react/dist/esm/icons/alert-octagon';
import Activity from 'lucide-react/dist/esm/icons/activity';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import toast from 'react-hot-toast';
import Settings from 'lucide-react/dist/esm/icons/settings';
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle';
import backupService from '../../services/backupService';

const DisasterRecoveryPanel = () => {
  const [chaosScenario, setChaosScenario] = useState('corrupted_backup');

  const handleRunChaosTest = async () => {
    if (
      await confirm({
        title: 'Run Chaos Test',
        message: `Run chaos scenario: ${chaosScenario}? This will simulate a failure but will not affect production.`,
        type: 'warning',
      })
    ) {
      try {
        await backupService.runChaosTest(chaosScenario);
        toast.success('Chaos test initiated. Check audit logs for results.');
      } catch (e) {
        toast.error('Failed to initiate chaos test');
      }
    }
  };

  return (
    <div className="dashboard-grid">
      {/* DR Readiness Score */}
      <div className="glass-card col-span-4 flex flex-col justify-center items-center text-center">
        <div className="card-title w-full text-left mb-6">
          <Shield size={18} /> DR Readiness Posture
        </div>
        <div className="relative w-32 h-32 mb-4">
          <svg viewBox="0 0 36 36" className="w-full h-full text-emerald-500">
            <path
              className="text-gray-700"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeDasharray="100, 100"
            />
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeDasharray="92, 100"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="font-bold text-3xl text-white">92%</div>
            <div className="text-xs font-bold text-emerald-400 bg-emerald-900/30 px-2 py-0.5 rounded mt-1 border border-emerald-500/30">
              Grade A
            </div>
          </div>
        </div>
        <p className="text-sm text-gray-400 m-0">
          RTO Target: &lt;15 mins (Meeting)
          <br />
          RPO Target: &lt;6 hours (Meeting)
        </p>
      </div>

      {/* 1-Click Guided DR Workflow */}
      <div className="glass-card col-span-8">
        <div className="card-title">
          <Zap size={18} className="text-amber-400" /> Guided Disaster Recovery Workflow
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-4 p-3 bg-slate-800/50 border border-slate-700 rounded cursor-pointer hover:border-emerald-500 transition-colors">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center font-bold">
              1
            </div>
            <div className="flex-1">
              <div className="font-semibold text-white">Detect & Classify Incident</div>
              <div className="text-xs text-gray-400">
                Select failure type (Ransomware, Hardware Failure, etc.) to load runbook.
              </div>
            </div>
            <ChevronRight size={20} className="text-gray-500" />
          </div>

          <div className="flex items-center gap-4 p-3 bg-slate-800/50 border border-slate-700 rounded opacity-50">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center font-bold">
              2
            </div>
            <div className="flex-1">
              <div className="font-semibold text-white">Select Pre-Verified Backup</div>
              <div className="text-xs text-gray-400">
                System recommends best backup based on incident type.
              </div>
            </div>
            <ChevronRight size={20} className="text-gray-500" />
          </div>

          <div className="flex items-center gap-4 p-3 bg-slate-800/50 border border-slate-700 rounded opacity-50">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center font-bold">
              3
            </div>
            <div className="flex-1">
              <div className="font-semibold text-white">Automated Restore Pipeline</div>
              <div className="text-xs text-gray-400">
                Rollback snapshot → Decrypt → Staging → Smoke tests → Atomic swap.
              </div>
            </div>
            <ChevronRight size={20} className="text-gray-500" />
          </div>
        </div>
      </div>

      {/* Chaos Testing Framework */}
      <div className="glass-card col-span-6">
        <div className="card-title">
          <AlertOctagon size={18} className="text-red-400" /> Chaos Testing Engine
        </div>
        <p className="text-sm text-gray-400 mb-4">
          Simulate failure conditions to verify system resilience.
        </p>

        <div className="flex gap-2">
          <select
            value={chaosScenario}
            onChange={(e) => setChaosScenario(e.target.value)}
            className="flex-1 bg-slate-800 border border-slate-700 text-white rounded px-3 py-2 outline-none focus:border-red-500"
          >
            <option value="corrupted_backup">Corrupted Backup File</option>
            <option value="failed_upload">Failed S3 Chunk Upload</option>
            <option value="missing_files">Missing Manifest File</option>
            <option value="expired_credentials">Expired Cloud Credentials</option>
            <option value="signature_forgery">Signature Forgery Attempt</option>
          </select>
          <button onClick={handleRunChaosTest} className="btn-danger whitespace-nowrap">
            Run Scenario
          </button>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-700/50">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Recent Test Results
          </div>
          <div className="flex justify-between items-center text-sm py-1 border-b border-slate-800">
            <span className="text-gray-300">corrupted_backup</span>
            <span className="text-emerald-400 flex items-center gap-1">
              <CheckCircle size={14} /> Passed (2d ago)
            </span>
          </div>
          <div className="flex justify-between items-center text-sm py-1">
            <span className="text-gray-300">signature_forgery</span>
            <span className="text-emerald-400 flex items-center gap-1">
              <CheckCircle size={14} /> Passed (1w ago)
            </span>
          </div>
        </div>
      </div>

      {/* Recovery Drills */}
      <div className="glass-card col-span-6">
        <div className="card-title">
          <Activity size={18} className="text-blue-400" /> Recovery Drills
        </div>
        <p className="text-sm text-gray-400 mb-4">
          Automated or manual restore testing to guarantee RTO/RPO.
        </p>

        <div className="bg-slate-800/50 rounded p-4 border border-slate-700">
          <div className="flex justify-between mb-2">
            <span className="text-sm text-gray-300">Last Drill:</span>
            <span className="text-sm font-semibold text-white">Jul 01, 2026</span>
          </div>
          <div className="flex justify-between mb-4">
            <span className="text-sm text-gray-300">Next Scheduled Drill:</span>
            <span className="text-sm font-semibold text-white">Aug 01, 2026</span>
          </div>

          <button className="btn-outline w-full flex justify-center items-center gap-2 text-sm">
            <Settings size={16} /> Initiate Manual Drill Now
          </button>
        </div>
      </div>
    </div>
  );
};

export default DisasterRecoveryPanel;
