import React, { useState, useEffect, useCallback } from 'react';
import { m as motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { visualSearchService } from '../../../services/domainServices';
import { useAdmin } from '../../context/AdminContext';
import { SettingsPanelSkeleton, fadeUp } from '../AdminUIKit';

export function VisualSearchPanel() {
  const { activeRole, logAdminAction } = useAdmin();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState(null);

  const [config, setConfig] = useState({
    enabled: false,
    cameraSearchEnabled: true,
    imageUploadEnabled: true,
    similarProductsEnabled: true,
    searchSensitivity: 0.7,
    resultCount: 20,
    similarityThreshold: 0.3,
    provider: {
      name: 'groq',
      apiKey: '',
      endpointUrl: '',
      isValidated: false,
    },
    analyticsEnabled: true,
    saveSearchedImages: false,
  });

  const loadConfig = useCallback(async () => {
    setLoading(true);
    try {
      const res = await visualSearchService.getAdminConfig();
      if (res.success && res.data) {
        setConfig(res.data);
      }
    } catch (_err) {
      toast.error('Failed to load visual search configuration');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    if (activeRole === 'viewer') {
      toast.error('Viewer role cannot modify settings');
      return;
    }

    setSaving(true);
    const saveToast = toast.loading('Saving configuration...');

    try {
      const payload = { ...config };
      // Don't send masked passwords back if they weren't changed
      if (
        payload.provider?.apiKey &&
        (payload.provider.apiKey === '****' || payload.provider.apiKey.includes('*'))
      ) {
        delete payload.provider.apiKey;
      }

      const res = await visualSearchService.updateConfig(payload);
      if (res.success) {
        toast.success('Configuration saved successfully', { id: saveToast });
        setConfig(res.data);
        logAdminAction('VISUAL_SEARCH_CONFIG_UPDATED', 'Updated visual search settings');
      } else {
        throw new Error(res.message);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to save configuration', { id: saveToast });
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (key, val) => {
    const updated = { ...config, [key]: val };
    setConfig(updated);

    if (activeRole === 'viewer') {
      toast.error('Viewer role cannot modify settings');
      return;
    }

    try {
      const payload = { ...updated };
      if (
        payload.provider?.apiKey &&
        (payload.provider.apiKey === '****' || payload.provider.apiKey.includes('*'))
      ) {
        delete payload.provider.apiKey;
      }

      const res = await visualSearchService.updateConfig(payload);
      if (res.success) {
        setConfig(res.data);
        if (key === 'enabled') {
          toast.success(
            val
              ? 'Visual search enabled globally across storefront'
              : 'Visual search disabled globally (camera icon hidden across storefront searchbars)',
            { id: 'vs-toggle-toast' },
          );
        } else if (key === 'cameraSearchEnabled') {
          toast.success(
            val
              ? 'Camera search enabled'
              : 'Camera search disabled (camera icon hidden across storefront searchbars)',
            { id: 'vs-toggle-toast' },
          );
        } else {
          toast.success('Setting updated successfully', { id: 'vs-toggle-toast' });
        }
        logAdminAction('VISUAL_SEARCH_CONFIG_UPDATED', `Toggled ${key} to ${val}`);
      } else {
        throw new Error(res.message);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update setting', { id: 'vs-toggle-toast' });
      setConfig(config);
    }
  };

  const handleValidateProvider = async () => {
    if (
      !config.provider.apiKey ||
      config.provider.apiKey === '****' ||
      config.provider.apiKey.includes('*')
    ) {
      toast.error('Please enter a new API key to validate');
      return;
    }

    setIsValidating(true);
    setValidationResult(null);

    try {
      const res = await visualSearchService.validateProvider(
        config.provider.name,
        config.provider.apiKey,
        config.provider.endpointUrl,
      );

      setValidationResult(res.data);
      if (res.success) {
        toast.success(`Connected to ${config.provider.name} successfully!`);
      } else {
        toast.error('Validation failed. Check your API key.');
      }
    } catch (err) {
      setValidationResult({ valid: false, error: err.message });
      toast.error('Validation request failed');
    } finally {
      setIsValidating(false);
    }
  };

  if (loading) return <SettingsPanelSkeleton />;

  return (
    <form onSubmit={handleSaveConfig} className="space-y-6">
      <motion.div
        variants={fadeUp}
        className="admin-card p-6 border border-[var(--admin-border-subtle)] rounded-xl"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[16px] font-bold flex items-center gap-2 text-[var(--admin-text-primary)]">
            <span className="material-symbols-outlined text-[var(--admin-accent)]">toggle_on</span>
            Global Feature Controls
          </h3>
          <span
            className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-[4px] border ${
              config.enabled
                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                : 'bg-stone-500/10 text-stone-500 border-stone-500/20'
            }`}
          >
            {config.enabled ? 'Visual Search Active' : 'Visual Search Disabled'}
          </span>
        </div>

        {/* 1. Main Master Toggle */}
        <div
          className={`p-4 rounded-lg border transition-all flex items-center justify-between mb-4 ${
            config.enabled
              ? 'bg-[var(--admin-accent)]/8 border-[var(--admin-accent)]/30 shadow-2xs'
              : 'bg-[var(--admin-surface-muted)] border-[var(--admin-border-subtle)]'
          }`}
        >
          <div className="pr-4">
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-[14px] text-[var(--admin-text-primary)]">
                Enable Visual Search
              </h4>
              <span className="text-[9.5px] font-extrabold uppercase px-2 py-0.5 rounded-[4px] bg-[var(--admin-accent)] text-white tracking-wider">
                Main Toggle
              </span>
            </div>
            <p className="text-[11.5px] text-[var(--admin-text-secondary)] mt-1">
              Master switch: turning this off completely hides the camera icon across all storefront
              searchbars and disables image-based search.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={config.enabled}
              onChange={(e) => handleToggle('enabled', e.target.checked)}
            />
            <div className="w-11 h-6 bg-[var(--admin-border)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--admin-accent)]"></div>
          </label>
        </div>

        {/* Sub-controls side-by-side */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div
            className={`flex items-center justify-between p-3.5 bg-[var(--admin-surface-muted)] rounded-lg border border-[var(--admin-border-subtle)] transition-opacity ${
              !config.enabled ? 'opacity-50 pointer-events-none' : ''
            }`}
          >
            <div className="pr-2">
              <h4 className="font-bold text-[13px] text-[var(--admin-text-primary)]">
                Enable Camera Search
              </h4>
              <p className="text-[11px] text-[var(--admin-text-secondary)] mt-0.5">
                Allow users to take live photos.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={config.cameraSearchEnabled}
                onChange={(e) => handleToggle('cameraSearchEnabled', e.target.checked)}
                disabled={!config.enabled}
              />
              <div className="w-11 h-6 bg-[var(--admin-border)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--admin-accent)]"></div>
            </label>
          </div>

          <div
            className={`flex items-center justify-between p-3.5 bg-[var(--admin-surface-muted)] rounded-lg border border-[var(--admin-border-subtle)] transition-opacity ${
              !config.enabled ? 'opacity-50 pointer-events-none' : ''
            }`}
          >
            <div className="pr-2">
              <h4 className="font-bold text-[13px] text-[var(--admin-text-primary)]">
                Enable Analytics Logging
              </h4>
              <p className="text-[11px] text-[var(--admin-text-secondary)] mt-0.5">
                Log search usage and accuracy.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={config.analyticsEnabled}
                onChange={(e) => handleToggle('analyticsEnabled', e.target.checked)}
                disabled={!config.enabled}
              />
              <div className="w-11 h-6 bg-[var(--admin-border)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--admin-accent)]"></div>
            </label>
          </div>

          <div
            className={`flex items-center justify-between p-3.5 bg-[var(--admin-surface-muted)] rounded-lg border border-[var(--admin-border-subtle)] transition-opacity ${
              !config.enabled ? 'opacity-50 pointer-events-none' : ''
            }`}
          >
            <div className="pr-2">
              <h4 className="font-bold text-[13px] text-[var(--admin-text-primary)]">
                Show Similar Products
              </h4>
              <p className="text-[11px] text-[var(--admin-text-secondary)] mt-0.5">
                Display grid below Best Match.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={config.similarProductsEnabled}
                onChange={(e) => handleToggle('similarProductsEnabled', e.target.checked)}
                disabled={!config.enabled}
              />
              <div className="w-11 h-6 bg-[var(--admin-border)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--admin-accent)]"></div>
            </label>
          </div>
        </div>
      </motion.div>

      <motion.div
        variants={fadeUp}
        className="admin-card p-6 border border-[var(--admin-border-subtle)] rounded-xl"
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-[16px] font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-[var(--admin-accent)]">
                smart_toy
              </span>
              AI Vision Provider
            </h3>
            <p className="text-[12px] text-stone-500 mt-1">
              Select the foundational AI model that powers the visual recognition engine.
            </p>
          </div>
          {config.provider?.isValidated ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-50 text-green-600 text-[11px] font-bold uppercase tracking-wider border border-green-200">
              <span className="material-symbols-outlined text-[14px]">check_circle</span>
              Validated
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 text-red-600 text-[11px] font-bold uppercase tracking-wider border border-red-200">
              <span className="material-symbols-outlined text-[14px]">error</span>
              Not Validated
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div>
            <label className="admin-label">Provider Platform</label>
            <select
              value={config.provider?.name || 'groq'}
              onChange={(e) =>
                setConfig({
                  ...config,
                  provider: { ...config.provider, name: e.target.value, isValidated: false },
                })
              }
              className="admin-input mt-1"
            >
              <option value="groq">Groq (Llama Vision)</option>
              <option value="openai">OpenAI (GPT-4o)</option>
              <option value="gemini">Google Gemini (Flash)</option>
              <option value="anthropic">Anthropic (Claude 3.5)</option>
              <option value="openrouter">OpenRouter</option>
              <option value="mistral">Mistral / Pixtral</option>
              <option value="together">Together AI</option>
              <option value="fireworks">Fireworks AI</option>
              <option value="deepseek">DeepSeek (Text only)</option>
              <option value="perplexity">Perplexity (Text only)</option>
              <option value="custom">Custom Endpoint (OpenAI format)</option>
            </select>
          </div>

          <div>
            <label className="admin-label">API Key</label>
            <div className="relative mt-1">
              <input
                type="password"
                value={config.provider?.apiKey || ''}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    provider: {
                      ...config.provider,
                      apiKey: e.target.value,
                      isValidated: false,
                    },
                  })
                }
                placeholder={
                  config.provider?.apiKey === '****' ? '••••••••••••••••' : 'Enter API Key'
                }
                className="admin-input font-mono text-[12px]"
                autoComplete="off"
              />
            </div>
          </div>

          {config.provider?.name === 'custom' && (
            <div>
              <label className="admin-label">Custom Endpoint URL</label>
              <input
                type="url"
                value={config.provider?.endpointUrl || ''}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    provider: {
                      ...config.provider,
                      endpointUrl: e.target.value,
                      isValidated: false,
                    },
                  })
                }
                placeholder="https://api.your-provider.com/v1/chat/completions"
                className="admin-input mt-1"
              />
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleValidateProvider}
              disabled={isValidating}
              className="h-9 px-4 rounded-[4px] border border-[var(--admin-border)] hover:bg-[var(--admin-bg-subtle)] text-[var(--admin-text-primary)] font-bold text-[12px] flex-1 flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
            >
              {isValidating ? (
                <span className="animate-spin material-symbols-outlined text-[16px]">sync</span>
              ) : (
                <span className="material-symbols-outlined text-[16px]">verified_user</span>
              )}
              Test Connection
            </button>
            <button
              type="submit"
              disabled={saving}
              className="h-9 px-4 rounded-[4px] bg-[var(--admin-accent)] hover:opacity-95 text-white font-bold text-[12px] flex-1 flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition-all disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[16px]">save</span>
              <span>{saving ? 'Saving...' : 'Save & Apply'}</span>
            </button>
          </div>

          {validationResult && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-3 rounded-lg border mt-2 text-[12px] ${
                validationResult.valid
                  ? 'bg-green-50 border-green-200 text-green-800'
                  : validationResult.status === 'rate_limited' ||
                      validationResult.status === 'quota_exceeded'
                    ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
                    : 'bg-red-50 border-red-200 text-red-800'
              }`}
            >
              {validationResult.valid ? (
                <div>
                  <strong>Connection Successful!</strong>
                  <p className="mt-1">
                    Verified model: <code>{validationResult.model}</code>
                  </p>
                </div>
              ) : (
                <div>
                  <strong>Connection Failed ({validationResult.status})</strong>
                  <p className="mt-1 font-mono bg-white/50 p-2 rounded border border-red-100">
                    {validationResult.error}
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </motion.div>
    </form>
  );
}
