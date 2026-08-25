import React, { useState, useEffect } from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';
import { aiService } from '../../../services/api/aiService';
import AiProviderList from './AiProviderList';
import AiGlobalConfig from './AiGlobalConfig';
import AiProviderForm from './AiProviderForm';
import { FilterBar } from '../../components/AdminUIKit';

const AdminAiSettings = () => {
  const [tab, setTab] = useState('Providers');
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[20px] sm:text-[24px] font-bold text-[var(--admin-text-primary)]">
            Global AI Platform
          </h1>
        </div>
        <button
          onClick={openAddForm}
          className="flex justify-center items-center gap-2 bg-[var(--admin-accent)] text-white px-4 py-2 rounded-md text-[13px] font-bold hover:brightness-110 transition-all active:scale-95 shadow-sm w-full sm:w-auto"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Add Provider
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">error</span>
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 w-full overflow-hidden">
        <FilterBar
          filters={['Providers', 'Global Routing']}
          value={tab}
          onChange={setTab}
          className="w-full sm:w-auto"
        />
      </div>

      {/* Tab Content */}
      <div className="relative">
        <AnimatePresence mode="wait">
          {tab === 'Providers' && (
            <motion.div
              key="providers"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <AiProviderList providers={providers} onEdit={openEditForm} onRefresh={loadData} />
            </motion.div>
          )}
          {tab === 'Global Routing' && (
            <motion.div
              key="global"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <AiGlobalConfig settings={settings} providers={providers} onRefresh={loadData} />
            </motion.div>
          )}
        </AnimatePresence>
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
