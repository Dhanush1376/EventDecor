import React, { useState, useEffect } from 'react';
import { aiService } from '../../../services/api/aiService';
import AiProviderList from './AiProviderList';
import AiGlobalConfig from './AiGlobalConfig';
import AiProviderForm from './AiProviderForm';
import AiUsageDashboard from './AiUsageDashboard';

const AdminAiSettings = () => {
  const [tab, setTab] = useState('dashboard');
  const [providers, setProviders] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal state for add/edit provider
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [provRes, setRes] = await Promise.all([
        aiService.getProviders(),
        aiService.getSettings(),
      ]);
      setProviders(provRes.data || []);
      setSettings(setRes.data || null);
      setError('');
    } catch (err) {
      console.error(err);
      setError('Failed to load AI platform data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddForm = () => {
    setEditingProvider(null);
    setIsFormOpen(true);
  };

  const openEditForm = (provider) => {
    setEditingProvider(provider);
    setIsFormOpen(true);
  };

  if (loading && !providers.length) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Global AI Platform</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage AI providers, global routing, and usage analytics.
          </p>
        </div>
        {tab === 'providers' && (
          <button
            onClick={openAddForm}
            className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Add Provider
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">error</span>
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-8 overflow-x-auto">
        <button
          onClick={() => setTab('dashboard')}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            tab === 'dashboard'
              ? 'border-black text-black'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">dashboard</span>
          Dashboard
        </button>
        <button
          onClick={() => setTab('providers')}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            tab === 'providers'
              ? 'border-black text-black'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">storage</span>
          Providers
        </button>
        <button
          onClick={() => setTab('global')}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            tab === 'global'
              ? 'border-black text-black'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">settings</span>
          Global Routing
        </button>
      </div>

      {/* Tab Content */}
      <div className="animate-fade-in">
        {tab === 'dashboard' && <AiUsageDashboard />}
        {tab === 'providers' && (
          <AiProviderList providers={providers} onEdit={openEditForm} onRefresh={loadData} />
        )}
        {tab === 'global' && (
          <AiGlobalConfig settings={settings} providers={providers} onRefresh={loadData} />
        )}
      </div>

      {/* Provider Modal */}
      {isFormOpen && (
        <AiProviderForm
          provider={editingProvider}
          onClose={() => setIsFormOpen(false)}
          onSave={() => {
            setIsFormOpen(false);
            loadData();
          }}
        />
      )}
    </div>
  );
};

export default AdminAiSettings;
