import React, { useState, useEffect } from 'react';
import { aiService } from '../../../services/api/aiService';

const PLATFORMS = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'gemini', label: 'Google Gemini' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'groq', label: 'Groq' },
  { value: 'deepseek', label: 'DeepSeek' },
  { value: 'mistral', label: 'Mistral' },
  { value: 'together', label: 'Together AI' },
  { value: 'fireworks', label: 'Fireworks AI' },
  { value: 'perplexity', label: 'Perplexity' },
  { value: 'openrouter', label: 'OpenRouter' },
  { value: 'ollama', label: 'Ollama (Local)' },
  { value: 'azure_openai', label: 'Azure OpenAI' },
  { value: 'custom', label: 'Custom (OpenAI Compatible)' },
];

const AiProviderForm = ({ provider, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    provider: '',
    apiKey: '',
    endpointUrl: '',
    modelOverride: '',
    enabled: true,
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (provider) {
      setFormData({
        name: provider.name || '',
        provider: provider.provider || '',
        apiKey: provider.apiKey === '****' ? '' : provider.apiKey,
        endpointUrl: provider.endpointUrl || '',
        modelOverride: provider.modelOverride || '',
        enabled: provider.enabled !== false,
      });
    } else {
      setFormData({
        name: '',
        provider: '',
        apiKey: '',
        endpointUrl: '',
        modelOverride: '',
        enabled: true,
      });
    }
    setError('');
  }, [provider]);

  const handleChange = (e) => {
    const { name, value, checked, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) return setError('Name is required');
    if (!provider && !formData.apiKey) return setError('API Key is required for new providers');

    try {
      setSaving(true);
      setError('');

      const payload = { ...formData };
      if (provider && !payload.apiKey) {
        delete payload.apiKey; // Don't send empty key if editing and not changed
      }

      if (provider) {
        await aiService.updateProvider(provider._id, payload);
      } else {
        await aiService.createProvider(payload);
      }

      onSave();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to save provider');
    } finally {
      setSaving(false);
    }
  };

  const showEndpoint = ['custom', 'azure_openai', 'ollama'].includes(formData.provider);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full animate-fade-in-up flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-xl">
          <h3 className="text-lg font-bold text-gray-900">
            {provider ? 'Edit AI Provider' : 'Add AI Provider'}
          </h3>
          <button
            onClick={() => !saving && onClose()}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span className="text-sm">{error}</span>
            </div>
          )}

          <form id="ai-provider-form" onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Display Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="e.g. Production Groq"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Platform / Provider
              </label>
              <select
                name="provider"
                value={formData.provider}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
              >
                <option value="">Auto-detect from API Key</option>
                {PLATFORMS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API Key {provider ? '' : <span className="text-red-500">*</span>}
              </label>
              <input
                type="password"
                name="apiKey"
                value={formData.apiKey}
                onChange={handleChange}
                required={!provider}
                placeholder={provider ? 'Leave blank to keep existing key' : 'sk-...'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                autoComplete="new-password"
              />
              <p className="mt-1 text-xs text-gray-500 flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px]">lock</span>
                Keys are encrypted at rest using AES-256-GCM
              </p>
            </div>

            {showEndpoint && (
              <div className="animate-fade-in">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Base URL / Endpoint
                </label>
                <input
                  type="url"
                  name="endpointUrl"
                  value={formData.endpointUrl}
                  onChange={handleChange}
                  placeholder={
                    formData.provider === 'azure_openai'
                      ? 'https://your-resource.openai.azure.com'
                      : 'http://localhost:11434/v1'
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                />
                <p className="mt-1 text-xs text-gray-500">
                  {formData.provider === 'azure_openai'
                    ? 'Include the resource base URL only (no /deployments)'
                    : 'API base URL'}
                </p>
              </div>
            )}

            <div className="pt-4 mt-2 border-t border-gray-100">
              <h4 className="text-sm font-semibold text-gray-900 mb-4">Advanced (Optional)</h4>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Model Override
                </label>
                <input
                  type="text"
                  name="modelOverride"
                  value={formData.modelOverride}
                  onChange={handleChange}
                  placeholder="e.g. gpt-4o"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Forces this specific model for ALL requests using this provider. Bypasses
                  automatic model registry.
                </p>
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    name="enabled"
                    checked={formData.enabled}
                    onChange={handleChange}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
                </div>
                <span className="text-sm font-medium text-gray-900">Enabled</span>
              </label>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 bg-gray-50 rounded-b-xl">
          <button
            type="button"
            onClick={() => !saving && onClose()}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="ai-provider-form"
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-black rounded-lg hover:bg-gray-800 disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Saving...
              </>
            ) : (
              'Save Provider'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AiProviderForm;
