import React, { useState, useEffect } from 'react';
import { m as motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAdmin } from '../../context/AdminContext';
import { visualSearchService } from '../../../services/domainServices';
import { PageHeader, SkeletonDashboard, stagger } from '../../components/AdminUIKit';

import { VisualSearchSettings } from './VisualSearchSettings';
import { VisualSearchProvider } from './VisualSearchProvider';
import { VisualSearchAnalytics } from './VisualSearchAnalytics';
import { VisualSearchTools } from './VisualSearchTools';

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

  const loadConfig = React.useCallback(async () => {
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

  const loadAnalytics = React.useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      const res = await visualSearchService.getAnalytics(analyticsDays);
      if (res.success && res.data) {
        setAnalytics(res.data);
      }
    } catch (_err) {
      toast.error('Failed to load analytics data');
    } finally {
      setAnalyticsLoading(false);
    }
  }, [analyticsDays]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  useEffect(() => {
    if (activeTab === 'analytics' && !analytics) {
      loadAnalytics();
    }
  }, [activeTab, analytics, loadAnalytics]);

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
        {activeTab === 'settings' && (
          <VisualSearchSettings
            config={config}
            setConfig={setConfig}
            handleSaveConfig={handleSaveConfig}
            saving={saving}
          />
        )}

        {activeTab === 'provider' && (
          <VisualSearchProvider
            config={config}
            setConfig={setConfig}
            handleSaveConfig={handleSaveConfig}
            saving={saving}
            handleValidateProvider={handleValidateProvider}
            isValidating={isValidating}
            validationResult={validationResult}
          />
        )}

        {activeTab === 'analytics' && (
          <VisualSearchAnalytics
            analyticsDays={analyticsDays}
            setAnalyticsDays={setAnalyticsDays}
            analyticsLoading={analyticsLoading}
            analytics={analytics}
          />
        )}

        {activeTab === 'tools' && (
          <VisualSearchTools
            config={config}
            isTagging={isTagging}
            taggingStatus={taggingStatus}
            handleGenerateTags={handleGenerateTags}
          />
        )}
      </div>
    </motion.div>
  );
}

export default AdminVisualSearch;
