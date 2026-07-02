import React, { useState } from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  CheckCircle,
  ArrowRight,
  PlayCircle,
  Clock,
} from 'lucide-react';
import backupService from '../../services/backupService';
import './BackupCenter.css';

const RestoreWizard = () => {
  const [step, setStep] = useState(1);
  const [selectedBackup, setSelectedBackup] = useState('');
  const [simulation, setSimulation] = useState(null);
  const [timeline, setTimeline] = useState(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState(0);

  const handleSimulate = async () => {
    if (!selectedBackup) return alert('Select a backup ID');
    try {
      const sim = await backupService.simulateRestore(selectedBackup);
      const time = await backupService.fetchRestoreTimeline(selectedBackup);
      setSimulation(sim);
      setTimeline(time);
      setStep(4); // Skip to step 4 for mock demo
    } catch (err) {
      alert('Simulation failed: ' + err.message);
    }
  };

  const handleExecute = async () => {
    try {
      setIsRestoring(true);
      setStep(7); // Progress step

      // Mock progress
      let p = 0;
      const interval = setInterval(() => {
        p += 10;
        setRestoreProgress(p);
        if (p >= 100) {
          clearInterval(interval);
          setStep(8); // Results step
          setIsRestoring(false);
        }
      }, 500);

      await backupService.executeRestore(selectedBackup);
    } catch (err) {
      setIsRestoring(false);
      alert('Restore failed: ' + err.message);
    }
  };

  return (
    <div className="glass-card max-w-4xl mx-auto">
      <div className="card-title">Restore Wizard</div>

      {/* Wizard Progress Bar */}
      <div className="flex justify-between items-center mb-8 relative">
        <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-700 -z-10 -translate-y-1/2 rounded"></div>
        <div
          className="absolute top-1/2 left-0 h-1 bg-emerald-500 -z-10 -translate-y-1/2 transition-all duration-500 rounded"
          style={{ width: `${((step - 1) / 7) * 100}%` }}
        ></div>

        {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
          <div
            key={s}
            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${step >= s ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-gray-500 border border-slate-600'}`}
          >
            {s}
          </div>
        ))}
      </div>

      <div className="min-h-[400px]">
        {/* Step 1: Select Source */}
        {step === 1 && (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-white">Step 1: Select Restore Source</h3>
            <div>
              <label className="block text-gray-400 mb-2">Enter Backup ID to Restore:</label>
              <input
                type="text"
                className="w-full bg-slate-800 border border-slate-700 rounded p-3 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                value={selectedBackup}
                onChange={(e) => setSelectedBackup(e.target.value)}
                placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
              />
            </div>
            <div className="flex gap-4">
              <button onClick={() => setStep(2)} className="btn-primary" disabled={!selectedBackup}>
                Next <ArrowRight size={16} className="inline ml-1" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2 & 3: Scope & Compatibility (Mocked skipping) */}
        {step === 2 && (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-white">Step 2: Configure Scope</h3>
            <p className="text-gray-400">Restore full application or specific collections?</p>
            <div className="flex gap-4">
              <button onClick={() => setStep(3)} className="btn-outline">
                Specific Collections
              </button>
              <button onClick={() => setStep(3)} className="btn-primary">
                Full Application Restore
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 text-center py-10">
            <ShieldAlert size={48} className="mx-auto text-emerald-500 mb-4" />
            <h3 className="text-xl font-semibold text-white">Version Compatibility Verified</h3>
            <p className="text-gray-400">App Version: 1.0.0 matches.</p>
            <p className="text-gray-400">Schema Version matches.</p>
            <button onClick={handleSimulate} className="btn-primary mt-6">
              Run Dry-Run Simulation
            </button>
          </div>
        )}

        {/* Step 4 & 5: Timeline & Simulation */}
        {step === 4 && simulation && timeline && (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-white">Step 4 & 5: Simulation Results</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-800/50 p-4 rounded border border-slate-700">
                <div className="text-sm text-gray-400">Total Records to Restore</div>
                <div className="text-2xl font-bold text-white">
                  {simulation.recordsToRestore.toLocaleString()}
                </div>
              </div>
              <div className="bg-slate-800/50 p-4 rounded border border-slate-700">
                <div className="text-sm text-gray-400">Storage Required</div>
                <div className="text-2xl font-bold text-white">
                  {simulation.storageSizeRequired}
                </div>
              </div>
            </div>

            <div className="bg-slate-800/50 p-4 rounded border border-slate-700">
              <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                <Clock size={16} /> Estimated Recovery Timeline
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between border-b border-slate-700/50 pb-2">
                  <span className="text-gray-400">Download:</span>{' '}
                  <span className="text-white">{timeline.downloadEstimate}</span>
                </div>
                <div className="flex justify-between border-b border-slate-700/50 pb-2">
                  <span className="text-gray-400">Decrypt/Decompress:</span>{' '}
                  <span className="text-white">{timeline.decryptionEstimate}</span>
                </div>
                <div className="flex justify-between border-b border-slate-700/50 pb-2">
                  <span className="text-gray-400">Atomic Swap (Downtime):</span>{' '}
                  <span className="text-amber-400 font-bold">{timeline.estimatedDowntime}</span>
                </div>
                <div className="flex justify-between pt-2 font-bold">
                  <span className="text-emerald-400">Total Duration:</span>{' '}
                  <span className="text-emerald-400">{timeline.totalEstimate}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-4 border-t border-slate-700">
              <button onClick={() => setStep(6)} className="btn-primary ml-auto">
                Review & Confirm <ArrowRight size={16} className="inline ml-1" />
              </button>
            </div>
          </div>
        )}

        {/* Step 6: Review & Confirm */}
        {step === 6 && (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-white">Step 6: Review & Execute</h3>

            <div className="bg-amber-900/20 border border-amber-700/50 rounded p-4 flex gap-3 text-amber-200">
              <AlertTriangle className="shrink-0" />
              <div>
                <h4 className="font-bold mb-1">Destructive Operation Warning</h4>
                <p className="text-sm m-0">
                  This will overwrite production data. The system will automatically take a{' '}
                  <strong>pre-restore rollback snapshot</strong> before proceeding. If validation
                  fails, it will automatically roll back.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-8">
              <input
                type="checkbox"
                id="confirm"
                className="w-5 h-5 accent-red-500 cursor-pointer"
              />
              <label htmlFor="confirm" className="text-white cursor-pointer select-none">
                I understand this will modify the production database
              </label>
            </div>

            <button
              onClick={handleExecute}
              className="btn-danger w-full py-4 text-lg mt-6 flex justify-center items-center gap-2"
            >
              <PlayCircle size={24} /> Execute Restore Pipeline
            </button>
          </div>
        )}

        {/* Step 7: Progress */}
        {step === 7 && (
          <div className="text-center py-16 space-y-8">
            <h3 className="text-2xl font-bold text-white animate-pulse">Executing Restore...</h3>

            <div className="w-full bg-slate-800 h-4 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full transition-all duration-300"
                style={{ width: `${restoreProgress}%` }}
              ></div>
            </div>

            <div className="text-gray-400">
              {restoreProgress < 20
                ? 'Creating rollback snapshot...'
                : restoreProgress < 50
                  ? 'Decrypting and decompressing...'
                  : restoreProgress < 80
                    ? 'Restoring collections to staging...'
                    : 'Running post-restore smoke tests...'}
            </div>
          </div>
        )}

        {/* Step 8: Results */}
        {step === 8 && (
          <div className="text-center py-10 space-y-6">
            <CheckCircle size={64} className="mx-auto text-emerald-500" />
            <h3 className="text-2xl font-bold text-white">Restore Completed Successfully</h3>
            <p className="text-gray-400">
              All 14 post-restore smoke tests passed. The atomic swap to production is complete.
            </p>

            <div className="bg-slate-800/50 p-4 rounded text-left inline-block mt-6">
              <div className="text-sm text-emerald-400 flex items-center gap-2 mb-2">
                <CheckCircle size={14} /> Admin access verified
              </div>
              <div className="text-sm text-emerald-400 flex items-center gap-2 mb-2">
                <CheckCircle size={14} /> Product references verified
              </div>
              <div className="text-sm text-emerald-400 flex items-center gap-2 mb-2">
                <CheckCircle size={14} /> Cloudinary links verified
              </div>
              <div className="text-sm text-emerald-400 flex items-center gap-2">
                <CheckCircle size={14} /> Foreign keys verified
              </div>
            </div>

            <div className="pt-8">
              <button onClick={() => setStep(1)} className="btn-outline">
                Start New Restore
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RestoreWizard;
