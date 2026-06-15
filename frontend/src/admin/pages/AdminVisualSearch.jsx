import { m as motion } from 'framer-motion';
import { fadeUp, stagger, PageHeader, SkeletonDashboard } from '../components/AdminUIKit';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { useState, useEffect } from 'react';
import { useAdmin } from '../context/AdminContext';
import visualSearchService from '../../services/visualSearchService';
import toast from 'react-hot-toast';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
);

export function AdminVisualSearch() {
  const { activeRole, logAdminAction } = useAdmin();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('settings');

  // Config State
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
    },
    analyticsEnabled: true,
    saveSearchedImages: false,
  });

  // Validation State
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState(null);

  // Analytics State
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsDays, setAnalyticsDays] = useState(30);

  // Bulk Tags State
  const [taggingStatus, setTaggingStatus] = useState(null);
  const [isTagging, setIsTagging] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  useEffect(() => {
    if (activeTab === 'analytics' && !analytics) {
      loadAnalytics();
    }
  }, [activeTab, analyticsDays]);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const res = await visualSearchService.getAdminConfig();
      if (res.success && res.data) {
        setConfig(res.data);
      }
    } catch (err) {
      toast.error('Failed to load visual search configuration');
    } finally {
      setLoading(false);
    }
  };

  const loadAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      const res = await visualSearchService.getAnalytics(analyticsDays);
      if (res.success && res.data) {
        setAnalytics(res.data);
      }
    } catch (err) {
      toast.error('Failed to load analytics data');
    } finally {
      setAnalyticsLoading(false);
    }
  };

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

  const handleGenerateTags = async () => {
    setIsTagging(true);
    const tagToast = toast.loading('Generating tags...');
    try {
      const res = await visualSearchService.generateTags(5);
      if (res.success) {
        setTaggingStatus(res.data);
        toast.success(`Processed ${res.data.processed} products`, { id: tagToast });
        logAdminAction(
          'VISUAL_SEARCH_TAGS_GENERATED',
          `Bulk tagged ${res.data.processed} products`,
        );
      } else {
        throw new Error(res.message);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to generate tags', { id: tagToast });
    } finally {
      setIsTagging(false);
    }
  };

  if (loading) return <SkeletonDashboard />;

  const tabs = [
    { id: 'settings', label: 'Feature Settings', icon: 'toggle_on' },
    { id: 'provider', label: 'AI Provider Config', icon: 'smart_toy' },
    { id: 'analytics', label: 'Analytics Dashboard', icon: 'monitoring' },
    { id: 'tools', label: 'Admin Tools', icon: 'build' },
  ];

  return (
    <motion.div initial="hidden" animate="show" variants={stagger} className="space-y-6">
      <PageHeader
        title="AI Visual Search"
        subtitle="Manage the AI-powered image recognition and similarity search engine"
      />

      <div className="flex border-b border-[var(--admin-border-subtle)] overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-6 py-3 border-b-2 font-bold text-[13px] uppercase tracking-wider transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-[var(--admin-accent)] text-[var(--admin-text-primary)] bg-[var(--admin-accent-subtle)]'
                : 'border-transparent text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)]'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="pt-2">
        {/* ─── SETTINGS TAB ─── */}
        {activeTab === 'settings' && (
          <form onSubmit={handleSaveConfig} className="space-y-8">
            <motion.div variants={fadeUp} className="admin-card p-6 md:p-8">
              <h3 className="text-[16px] font-bold mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-[var(--admin-accent)]">
                  visibility
                </span>
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
                      onChange={(e) =>
                        setConfig({ ...config, cameraSearchEnabled: e.target.checked })
                      }
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
                      onChange={(e) =>
                        setConfig({ ...config, similarProductsEnabled: e.target.checked })
                      }
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
                    Controls how aggressively the engine matches keywords. Higher = more matches,
                    lower = stricter matches.
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
        )}

        {/* ─── PROVIDER TAB ─── */}
        {activeTab === 'provider' && (
          <form onSubmit={handleSaveConfig} className="space-y-8">
            <motion.div variants={fadeUp} className="admin-card p-6 md:p-8">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-[16px] font-bold flex items-center gap-2">
                    <span className="material-symbols-outlined text-[var(--admin-accent)]">
                      memory
                    </span>
                    AI Vision Provider
                  </h3>
                  <p className="text-[12px] text-stone-500 mt-1">
                    Select the foundational AI model that powers the visual recognition engine.
                  </p>
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
                    The engine automatically selects the fastest vision model for the chosen
                    provider (e.g.,
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
                      <span className="animate-spin material-symbols-outlined text-[18px]">
                        sync
                      </span>
                    ) : (
                      <span className="material-symbols-outlined text-[18px]">verified_user</span>
                    )}
                    Test Connection
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="admin-btn admin-btn-primary flex-1"
                  >
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
                        {validationResult.suggestions &&
                          validationResult.suggestions.length > 0 && (
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
        )}

        {/* ─── ANALYTICS TAB ─── */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="flex justify-end">
              <select
                value={analyticsDays}
                onChange={(e) => setAnalyticsDays(parseInt(e.target.value))}
                className="admin-input py-1.5 text-[12px] w-auto bg-white"
              >
                <option value={7}>Last 7 Days</option>
                <option value={30}>Last 30 Days</option>
                <option value={90}>Last 90 Days</option>
              </select>
            </div>

            {analyticsLoading ? (
              <div className="flex justify-center py-20">
                <span className="animate-spin material-symbols-outlined text-4xl text-primary/30">
                  sync
                </span>
              </div>
            ) : analytics ? (
              <>
                {/* Key Metrics */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="admin-card p-5">
                    <p className="text-[11px] text-stone-500 font-bold uppercase tracking-wider mb-1">
                      Total Searches
                    </p>
                    <p className="text-[28px] font-bold">
                      {analytics.totalSearches.toLocaleString()}
                    </p>
                    <div className="mt-2 text-[11px] text-stone-400">Past {analyticsDays} days</div>
                  </div>
                  <div className="admin-card p-5">
                    <p className="text-[11px] text-stone-500 font-bold uppercase tracking-wider mb-1">
                      Success Rate
                    </p>
                    <div className="flex items-end gap-2">
                      <p className="text-[28px] font-bold text-green-600">
                        {analytics.successRate}%
                      </p>
                    </div>
                    <div className="mt-2 text-[11px] text-stone-400">
                      {analytics.failedSearches} failed searches
                    </div>
                  </div>
                  <div className="admin-card p-5">
                    <p className="text-[11px] text-stone-500 font-bold uppercase tracking-wider mb-1">
                      Avg Confidence
                    </p>
                    <p className="text-[28px] font-bold text-[var(--admin-accent)]">
                      {analytics.averageConfidence}%
                    </p>
                    <div className="mt-2 text-[11px] text-stone-400">AI prediction accuracy</div>
                  </div>
                  <div className="admin-card p-5">
                    <p className="text-[11px] text-stone-500 font-bold uppercase tracking-wider mb-1">
                      Avg Latency
                    </p>
                    <p className="text-[28px] font-bold font-mono text-blue-600">
                      {analytics.averageDurationMs}ms
                    </p>
                    <div className="mt-2 text-[11px] text-stone-400">Processing time per image</div>
                  </div>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="admin-card p-6">
                    <h3 className="text-[14px] font-bold mb-4 uppercase tracking-wider">
                      Search Volume Trend
                    </h3>
                    <div className="h-64">
                      {analytics.dailyUsage.length > 0 ? (
                        <Line
                          data={{
                            labels: analytics.dailyUsage.map((d) => d.date),
                            datasets: [
                              {
                                label: 'Searches',
                                data: analytics.dailyUsage.map((d) => d.count),
                                borderColor: '#334155',
                                backgroundColor: 'rgba(51, 65, 85, 0.1)',
                                fill: true,
                                tension: 0.4,
                              },
                            ],
                          }}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: { legend: { display: false } },
                            scales: { y: { beginAtZero: true } },
                          }}
                        />
                      ) : (
                        <div className="h-full flex items-center justify-center text-stone-400 text-[12px]">
                          No data available
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="admin-card p-6">
                    <h3 className="text-[14px] font-bold mb-4 uppercase tracking-wider">
                      Top Detected Categories
                    </h3>
                    <div className="h-64">
                      {analytics.topCategories.length > 0 ? (
                        <Bar
                          data={{
                            labels: analytics.topCategories.map((c) => c.category),
                            datasets: [
                              {
                                label: 'Count',
                                data: analytics.topCategories.map((c) => c.count),
                                backgroundColor: '#334155',
                                borderRadius: 4,
                              },
                            ],
                          }}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: { legend: { display: false } },
                          }}
                        />
                      ) : (
                        <div className="h-full flex items-center justify-center text-stone-400 text-[12px]">
                          No data available
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        )}

        {/* ─── TOOLS TAB ─── */}
        {activeTab === 'tools' && (
          <motion.div variants={fadeUp} className="space-y-6">
            <div className="admin-card p-6 md:p-8">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-[var(--admin-accent-muted)] flex items-center justify-center flex-shrink-0 text-[var(--admin-accent)]">
                  <span className="material-symbols-outlined text-[24px]">label_important</span>
                </div>
                <div>
                  <h3 className="text-[16px] font-bold">Bulk Generate AI Tags</h3>
                  <p className="text-[13px] text-stone-500 mt-2 max-w-2xl leading-relaxed">
                    Automatically process existing products through the AI vision engine to generate
                    semantic search tags, categories, and attributes. This dramatically improves
                    visual search accuracy without requiring users to upload images.
                  </p>

                  <div className="mt-6 flex flex-col sm:flex-row items-center gap-4">
                    <button
                      onClick={handleGenerateTags}
                      disabled={isTagging || !config.enabled}
                      className="admin-btn admin-btn-primary w-full sm:w-auto"
                    >
                      {isTagging ? 'Processing Batch...' : 'Generate Tags (Batch of 5)'}
                    </button>
                    {!config.enabled && (
                      <span className="text-[12px] text-red-500 font-bold">
                        Visual search must be enabled first.
                      </span>
                    )}
                  </div>

                  {taggingStatus && (
                    <div className="mt-4 p-4 bg-stone-50 border border-stone-200 rounded-lg text-[12px]">
                      <p>
                        <strong>Last Batch Result:</strong> Processed {taggingStatus.processed}{' '}
                        products. Failed: {taggingStatus.failed}. Total remaining:{' '}
                        {taggingStatus.total - taggingStatus.processed}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

export default AdminVisualSearch;
