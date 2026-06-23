import React from 'react';
import { m as motion } from 'framer-motion';
import { fadeUp } from '../../components/AdminUIKit';

export function VisualSearchSettings({ config, setConfig, handleSaveConfig, saving }) {
  return (
    <form onSubmit={handleSaveConfig} className="space-y-8">
      <motion.div variants={fadeUp} className="admin-card p-6 md:p-8">
        <h3 className="text-[16px] font-bold mb-6 flex items-center gap-2">
          <span className="material-symbols-outlined text-[var(--admin-accent)]">visibility</span>
          Global Feature Controls
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
          <div className="flex items-center justify-between p-4 bg-[var(--admin-surface-muted)] rounded-xl border border-[var(--admin-border-subtle)]">
            <div>
              <h4 className="font-bold text-[14px]">Enable Visual Search</h4>
              <p className="text-[11px] text-[var(--admin-text-secondary)] mt-1">
                Turn the entire feature on or off globally.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={config.enabled}
                onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
              />
              <div className="w-11 h-6 bg-[var(--admin-border)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--admin-accent)]"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 bg-[var(--admin-surface-muted)] rounded-xl border border-[var(--admin-border-subtle)]">
            <div>
              <h4 className="font-bold text-[14px]">Enable Camera Search</h4>
              <p className="text-[11px] text-[var(--admin-text-secondary)] mt-1">
                Allow users to take live photos.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={config.cameraSearchEnabled}
                onChange={(e) => setConfig({ ...config, cameraSearchEnabled: e.target.checked })}
              />
              <div className="w-11 h-6 bg-[var(--admin-border)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--admin-accent)]"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 bg-[var(--admin-surface-muted)] rounded-xl border border-[var(--admin-border-subtle)]">
            <div>
              <h4 className="font-bold text-[14px]">Enable Analytics Logging</h4>
              <p className="text-[11px] text-[var(--admin-text-secondary)] mt-1">
                Log search usage and accuracy data.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={config.analyticsEnabled}
                onChange={(e) => setConfig({ ...config, analyticsEnabled: e.target.checked })}
              />
              <div className="w-11 h-6 bg-[var(--admin-border)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--admin-accent)]"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 bg-[var(--admin-surface-muted)] rounded-xl border border-[var(--admin-border-subtle)]">
            <div>
              <h4 className="font-bold text-[14px]">Show Similar Products</h4>
              <p className="text-[11px] text-[var(--admin-text-secondary)] mt-1">
                Display grid of related items below Best Match.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={config.similarProductsEnabled}
                onChange={(e) => setConfig({ ...config, similarProductsEnabled: e.target.checked })}
              />
              <div className="w-11 h-6 bg-[var(--admin-border)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--admin-accent)]"></div>
            </label>
          </div>
        </div>
      </motion.div>

      <motion.div variants={fadeUp} className="admin-card p-6 md:p-8">
        <h3 className="text-[16px] font-bold mb-6 flex items-center gap-2">
          <span className="material-symbols-outlined text-[var(--admin-accent)]">tune</span>
          Search Tuning
        </h3>

        <div className="space-y-8 max-w-3xl">
          <div>
            <div className="flex justify-between mb-2">
              <label className="admin-label">
                Search Sensitivity ({(config.searchSensitivity * 100).toFixed(0)}%)
              </label>
              <span className="text-[12px] text-stone-500 font-mono">
                {config.searchSensitivity}
              </span>
            </div>
            <p className="text-[11px] text-stone-500 mb-3">
              Controls how aggressively the engine matches keywords. Higher = more matches, lower =
              stricter matches.
            </p>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              value={config.searchSensitivity}
              onChange={(e) =>
                setConfig({ ...config, searchSensitivity: parseFloat(e.target.value) })
              }
              className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-[var(--admin-accent)]"
            />
            <div className="flex justify-between text-[10px] text-stone-400 mt-2 font-bold uppercase tracking-wider">
              <span>Strict (0.1)</span>
              <span>Broad (1.0)</span>
            </div>
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <label className="admin-label">
                Similarity Threshold ({(config.similarityThreshold * 100).toFixed(0)}%)
              </label>
              <span className="text-[12px] text-stone-500 font-mono">
                {config.similarityThreshold}
              </span>
            </div>
            <p className="text-[11px] text-stone-500 mb-3">
              Minimum score required for a product to be considered a "match".
            </p>
            <input
              type="range"
              min="0.1"
              max="0.9"
              step="0.05"
              value={config.similarityThreshold}
              onChange={(e) =>
                setConfig({ ...config, similarityThreshold: parseFloat(e.target.value) })
              }
              className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-[var(--admin-accent)]"
            />
            <div className="flex justify-between text-[10px] text-stone-400 mt-2 font-bold uppercase tracking-wider">
              <span>Show Everything (0.1)</span>
              <span>Exact Matches Only (0.9)</span>
            </div>
          </div>

          <div>
            <label className="admin-label mb-2 block">Maximum Results</label>
            <input
              type="number"
              min="1"
              max="50"
              value={config.resultCount}
              onChange={(e) =>
                setConfig({ ...config, resultCount: parseInt(e.target.value) || 20 })
              }
              className="admin-input max-w-[200px]"
            />
          </div>
        </div>
      </motion.div>

      <div className="flex justify-end pt-4">
        <button type="submit" disabled={saving} className="admin-btn admin-btn-primary px-8">
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>
    </form>
  );
}
