import React, { useState, useEffect } from 'react';
import { aiService } from '../../../../services/api/aiService';

const AiGlobalConfig = ({ settings, providers, onRefresh }) => {
  const [formData, setFormData] = useState({
    selectedProviderId: '',
    fallbackProviderIds: [],
    temperature: 0.2,
    maxTokens: 4000,
    requestTimeout: 60000,
    retryCount: 2,
    autoSelectModel: true,
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (settings) {
      setFormData({
        selectedProviderId: settings.selectedProviderId?._id || settings.selectedProviderId || '',
        fallbackProviderIds: settings.fallbackProviderIds?.map((p) => p._id || p) || [],
        temperature: settings.temperature ?? 0.2,
        maxTokens: settings.maxTokens ?? 4000,
        requestTimeout: settings.requestTimeout ?? 60000,
        retryCount: settings.retryCount ?? 2,
        autoSelectModel: settings.autoSelectModel ?? true,
      });
    }
  }, [settings]);

  const handleChange = (e) => {
    const { name, value, checked, type, options } = e.target;

    if (type === 'select-multiple') {
      const selectedValues = Array.from(options)
        .filter((option) => option.selected)
        .map((option) => option.value);

      setFormData((prev) => ({
        ...prev,
        [name]: selectedValues,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      }));
    }
  };

  const handleSliderChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: parseFloat(value) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.selectedProviderId) {
      return setError('Please select a Primary AI Provider');
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      await aiService.updateSettings(formData);
      setSuccess('Global AI Settings updated successfully');
      onRefresh();

      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  // Only show verified providers
  const activeProviders = providers.filter((p) => p.isValidated && p.enabled);

  if (!providers.length) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-4 rounded-xl flex items-start gap-3">
        <span className="material-symbols-outlined mt-0.5">warning</span>
        <div>
          <h4 className="text-sm font-bold">No Providers Available</h4>
          <p className="text-sm mt-1">
            Please add and validate at least one AI Provider in the "Providers" tab before
            configuring global routing.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-md border border-[var(--admin-border-subtle)] p-6 md:p-8">
      <div className="mb-8">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px] text-gray-400">route</span>
          Global Routing & Defaults
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Configure which AI provider handles platform-wide tasks (e.g. Product generation,
          Autofill). Visual Search operates entirely independently.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">error</span>
          <span className="text-sm">{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          <span className="text-sm">{success}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* Column 1: Routing */}
          <div className="space-y-6">
            <h3 className="text-sm font-semibold text-gray-900 border-b border-gray-100 pb-2">
              Provider Routing
            </h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Primary Provider <span className="text-red-500">*</span>
              </label>
              <select
                name="selectedProviderId"
                value={formData.selectedProviderId}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
              >
                <option value="" disabled>
                  Select Primary Provider...
                </option>
                {activeProviders.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name} ({p.provider})
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                All requests will go to this provider first.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fallback Providers (Multi-select)
              </label>
              <select
                name="fallbackProviderIds"
                value={formData.fallbackProviderIds}
                onChange={handleChange}
                multiple
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent min-h-[100px]"
              >
                {activeProviders
                  .filter((p) => p._id !== formData.selectedProviderId)
                  .map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name}
                    </option>
                  ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Hold Ctrl/Cmd to select multiple. If the primary provider fails, requests will
                cascade through these.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Retries per Provider
              </label>
              <input
                type="number"
                name="retryCount"
                min="0"
                max="5"
                value={formData.retryCount}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
              />
              <p className="mt-1 text-xs text-gray-500">
                Number of immediate retries on transient errors before falling back.
              </p>
            </div>
          </div>

          {/* Column 2: Parameters */}
          <div className="space-y-6">
            <h3 className="text-sm font-semibold text-gray-900 border-b border-gray-100 pb-2">
              Default Generation Parameters
            </h3>

            <div>
              <div className="flex justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">Temperature</label>
                <span className="text-sm font-bold text-gray-900">{formData.temperature}</span>
              </div>
              <input
                type="range"
                name="temperature"
                min="0"
                max="2"
                step="0.1"
                value={formData.temperature}
                onChange={handleSliderChange}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"
              />
              <p className="mt-1 text-xs text-gray-500 flex justify-between">
                <span>More Deterministic (0)</span>
                <span>More Creative (2)</span>
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Tokens</label>
              <input
                type="number"
                name="maxTokens"
                value={formData.maxTokens}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
              />
              <p className="mt-1 text-xs text-gray-500">
                Maximum length of the generated response.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Request Timeout (ms)
              </label>
              <input
                type="number"
                name="requestTimeout"
                value={formData.requestTimeout}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
              />
              <p className="mt-1 text-xs text-gray-500">
                Milliseconds before aborting the request.
              </p>
            </div>

            <div className="pt-2">
              <label className="flex items-start gap-3 cursor-pointer group p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="relative mt-0.5 shrink-0">
                  <input
                    type="checkbox"
                    name="autoSelectModel"
                    checked={formData.autoSelectModel}
                    onChange={handleChange}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--admin-accent)]"></div>
                </div>
                <div>
                  <span className="text-sm font-bold text-gray-900 block mb-0.5">
                    Auto-select Best Model
                  </span>
                  <p className="text-xs text-gray-500 leading-snug">
                    If enabled, dynamically picks the best model from the provider's registry for
                    the requested capability. Overrides manually set "Model Overrides" on the
                    provider.
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>

        <div className="mt-10 flex justify-end border-t border-gray-100 pt-6">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-[var(--admin-accent)] text-white px-6 py-2.5 rounded-md text-[13px] font-bold hover:brightness-110 transition-all active:scale-95 shadow-sm disabled:opacity-50"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Saving...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">save</span>
                Save Global Settings
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AiGlobalConfig;
