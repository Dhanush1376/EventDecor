import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { SectionHeader, AdminInput, AdminToggle } from '../components/AdminUIKit';

export function AdminConfig() {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchConfigs = async () => {
    try {
      const res = await api.get('/config');
      if (res.data?.success) setConfigs(res.data.data);
    } catch (err) {
      toast.error('Failed to load global config');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const handleUpdate = async (config) => {
    try {
      await api.post('/config', config);
      toast.success('Configuration saved');
      fetchConfigs();
    } catch (err) {
      toast.error('Failed to save config');
    }
  };

  const handleCreate = async () => {
    const key = prompt('Enter a unique config key (e.g. MAINTENANCE_MODE):');
    if (!key) return;

    try {
      await api.post('/config', {
        key,
        value: 'true',
        type: 'boolean',
        isPublic: true,
      });
      toast.success('Config created');
      fetchConfigs();
    } catch (err) {
      toast.error('Failed to create config');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <SectionHeader
          icon="settings_suggest"
          title="Global System Config"
          description="Manage application variables, feature flags, and frontend bootstrapping rules."
        />
        <button
          onClick={handleCreate}
          className="btn-primary py-2 px-4 text-xs shadow-sm hover:shadow-md"
        >
          + Add Variable
        </button>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-16 bg-surface-container rounded-xl w-full" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-outline-variant/10 divide-y divide-outline-variant/10">
          {configs.map((conf) => (
            <div key={conf._id} className="p-4 flex items-center justify-between gap-4">
              <div className="grid grid-cols-3 gap-4 flex-1">
                <div>
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase mb-1 block">Key</span>
                  <div className="font-mono text-sm bg-stone-100 px-3 py-2 rounded-lg border border-stone-200">
                    {conf.key}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase mb-1 block">Value</span>
                  {conf.type === 'boolean' ? (
                    <select
                      className="w-full h-10 border border-outline-variant/30 rounded-lg px-3 text-sm focus:border-primary"
                      value={conf.value}
                      onChange={(e) => handleUpdate({ ...conf, value: e.target.value === 'true' })}
                    >
                      <option value="true">True</option>
                      <option value="false">False</option>
                    </select>
                  ) : (
                    <AdminInput
                      value={conf.value}
                      onChange={(e) => handleUpdate({ ...conf, value: e.target.value })}
                    />
                  )}
                </div>
                <div>
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase mb-1 block">Description</span>
                  <AdminInput
                    value={conf.description || ''}
                    onChange={(e) => handleUpdate({ ...conf, description: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-bold text-on-surface-variant uppercase mb-2 block">Public</span>
                <AdminToggle
                  checked={conf.isPublic}
                  onChange={() => handleUpdate({ ...conf, isPublic: !conf.isPublic })}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AdminConfig;
