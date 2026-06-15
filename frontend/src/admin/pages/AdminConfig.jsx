import { m as motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../../utils/errorHelpers';
import { fadeUp, stagger } from '../components/AdminUIKit';

export function AdminConfig() {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchConfigs = async () => {
    try {
      const res = await api.get('/config');
      if (res.data?.success) setConfigs(res.data.data);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load global config'));
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
      toast.error(getErrorMessage(err, 'Failed to save config'));
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
      toast.error(getErrorMessage(err, 'Failed to create config'));
    }
  };

  return (
    <motion.div initial="hidden" animate="show" variants={stagger} className="space-y-6">
      <PageHeader
        title="Global System Config"
        subtitle="Manage application variables, feature flags, and frontend bootstrapping rules."
      >
        <button onClick={handleCreate} className="admin-btn admin-btn-primary">
          <span className="material-symbols-outlined text-[16px]">add</span>
          Add Variable
        </button>
      </PageHeader>

      {loading ? (
        <SkeletonTable rows={4} cols={4} />
      ) : configs.length === 0 ? (
        <EmptyState
          icon="settings_suggest"
          title="No Configurations"
          description="Add your first config variable to manage feature flags and application settings."
          action={
            <button onClick={handleCreate} className="admin-btn admin-btn-primary admin-btn-sm">
              <span className="material-symbols-outlined text-[14px]">add</span>
              Add Variable
            </button>
          }
        />
      ) : (
        <motion.div
          variants={fadeUp}
          className="admin-card divide-y divide-[var(--admin-border-subtle)]"
        >
          {configs.map((conf) => (
            <div
              key={conf._id}
              className="p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1 w-full">
                <div className="space-y-1.5">
                  <label className="admin-label">Key</label>
                  <div className="admin-card-inset px-3 py-2.5 font-mono text-[12px] text-[var(--admin-text-primary)] tracking-wide">
                    {conf.key}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="admin-label">Value</label>
                  {conf.type === 'boolean' ? (
                    <select
                      className="admin-select"
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
                <div className="space-y-1.5">
                  <label className="admin-label">Description</label>
                  <AdminInput
                    value={conf.description || ''}
                    onChange={(e) => handleUpdate({ ...conf, description: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <AdminToggle
                  label="Public"
                  checked={conf.isPublic}
                  onChange={() => handleUpdate({ ...conf, isPublic: !conf.isPublic })}
                />
              </div>
            </div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}

export default AdminConfig;
