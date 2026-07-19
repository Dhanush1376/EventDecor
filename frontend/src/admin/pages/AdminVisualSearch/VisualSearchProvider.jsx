import React from 'react';
import { m as motion } from 'framer-motion';
import { fadeUp } from '../../components/AdminUIKit';

export function VisualSearchProvider({
  config,
  setConfig,
  handleSaveConfig,
  saving,
  handleValidateProvider,
  isValidating,
  validationResult,
}) {
  return (
    <form onSubmit={handleSaveConfig} className="space-y-8">
      <motion.div variants={fadeUp} className="admin-card p-6 md:p-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-[16px] font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-[var(--admin-accent)]">memory</span>
              AI Vision Provider
            </h3>
            <p className="text-[12px] text-stone-500 mt-1">
              Select the foundational AI model that powers the visual recognition engine.
            </p>
            <div className="mt-3 inline-flex items-center gap-2 bg-blue-50/50 border border-blue-100 rounded-lg p-2.5 px-3">
              <span className="material-symbols-outlined text-[16px] text-blue-500">info</span>
              <p className="text-[11px] text-blue-700 leading-snug font-medium">
                Visual Search operates completely independently from the{' '}
                <span className="font-bold">Global AI Platform</span> routing rules to ensure lowest
                possible latency for storefront searches.
              </p>
            </div>
          </div>
          {config.provider.isValidated ? (
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

        <div className="space-y-6 max-w-3xl">
          <div>
            <label className="admin-label">Provider Platform</label>
            <select
              value={config.provider.name}
              onChange={(e) =>
                setConfig({
                  ...config,
                  provider: { ...config.provider, name: e.target.value, isValidated: false },
                })
              }
              className="admin-input"
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
            <div className="relative">
              <input
                type="password"
                value={config.provider.apiKey}
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
                  config.provider.apiKey === '****' ? '••••••••••••••••' : 'Enter API Key'
                }
                className="admin-input font-mono text-[12px]"
                autoComplete="off"
              />
            </div>
            <p className="text-[11px] text-stone-400 mt-1.5">
              Credentials are encrypted at rest using AES-256-GCM.
            </p>
          </div>

          {config.provider.name === 'custom' && (
            <div>
              <label className="admin-label">Custom Endpoint URL</label>
              <input
                type="url"
                value={config.provider.endpointUrl || ''}
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
                className="admin-input"
              />
            </div>
          )}

          <div className="p-4 bg-[var(--admin-info-light)] border border-[var(--admin-info-border)] rounded-xl">
            <h4 className="text-[13px] font-bold text-[var(--admin-info)] flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-[16px]">info</span>
              Model Auto-Selection
            </h4>
            <p className="text-[12px] text-[var(--admin-text-secondary)] leading-relaxed">
              The engine automatically selects the fastest vision model for the chosen provider
              (e.g.,
              <code className="mx-1 px-1 py-0.5 bg-[var(--admin-surface-muted)] rounded">
                llama-4-scout-17b-16e-instruct
              </code>{' '}
              for Groq,
              <code className="mx-1 px-1 py-0.5 bg-[var(--admin-surface-muted)] rounded">
                gpt-4o-mini
              </code>{' '}
              for OpenAI). This ensures low latency (&lt;2s) for user uploads.
            </p>
          </div>

          <div className="flex gap-3 pt-4 border-t border-[var(--admin-border-subtle)]">
            <button
              type="button"
              onClick={handleValidateProvider}
              disabled={isValidating}
              className="admin-btn admin-btn-outline flex-1 flex items-center justify-center gap-2"
            >
              {isValidating ? (
                <span className="animate-spin material-symbols-outlined text-[18px]">sync</span>
              ) : (
                <span className="material-symbols-outlined text-[18px]">verified_user</span>
              )}
              Test Connection
            </button>
            <button type="submit" disabled={saving} className="admin-btn admin-btn-primary flex-1">
              {saving ? 'Saving...' : 'Save & Apply'}
            </button>
          </div>

          {validationResult && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 rounded-xl border mt-4 text-[12px] ${
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
                  <div className="flex items-center justify-between">
                    <strong>Connection Successful!</strong>
                    {validationResult.latencyMs && (
                      <span className="text-[10px] font-mono bg-green-100 px-2 py-0.5 rounded">
                        Latency: {validationResult.latencyMs}ms
                      </span>
                    )}
                  </div>
                  <p className="mt-1">
                    Verified model: <code>{validationResult.model}</code>
                  </p>
                  {validationResult.providerMismatch && validationResult.detectedProvider && (
                    <p className="mt-1 text-[11px] text-yellow-700 bg-yellow-100 p-1.5 rounded">
                      <span className="material-symbols-outlined text-[14px] align-middle mr-1">
                        warning
                      </span>
                      Note: The API key looks like it belongs to{' '}
                      <b>{validationResult.detectedProvider}</b>, but you selected{' '}
                      <b>{config.provider.name}</b>.
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between">
                    <strong>Connection Failed ({validationResult.status})</strong>
                    {validationResult.latencyMs && (
                      <span className="text-[10px] font-mono bg-red-100 px-2 py-0.5 rounded text-red-700">
                        Latency: {validationResult.latencyMs}ms
                      </span>
                    )}
                  </div>
                  <p className="mt-1 font-mono text-[11px] bg-white/50 p-2 rounded border border-red-100">
                    {validationResult.error}
                  </p>
                  {validationResult.suggestions && validationResult.suggestions.length > 0 && (
                    <div className="mt-2 text-[11px]">
                      <span className="font-bold">Suggested Models:</span>
                      <ul className="list-disc pl-4 mt-1">
                        {validationResult.suggestions.map((s, i) => (
                          <li key={i}>
                            <code>{s}</code>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </div>
      </motion.div>
    </form>
  );
}
