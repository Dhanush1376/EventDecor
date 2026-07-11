import React, { useState, useEffect } from 'react';
import whatsappAutomationService from '../../services/whatsappAutomationService';
import { toast } from 'react-hot-toast';
import AutomationCategoryGroup from './AutomationCategoryGroup';
import ConfigDrawer from './ConfigDrawer';

const AutomationToggleCenter = () => {
  const [automations, setAutomations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAutomation, setSelectedAutomation] = useState(null);

  useEffect(() => {
    const fetchAutomations = async () => {
      try {
        const res = await whatsappAutomationService.getAutomations();
        if (res.data?.data) {
          setAutomations(res.data.data);
        }
      } catch (err) {
        toast.error('Failed to load automations');
      } finally {
        setLoading(false);
      }
    };
    fetchAutomations();
  }, []);

  const handleToggle = async (key, enabled) => {
    try {
      await whatsappAutomationService.toggleAutomation(key, enabled);
      setAutomations((prev) => prev.map((a) => (a.automationKey === key ? { ...a, enabled } : a)));
      toast.success(enabled ? 'Automation enabled' : 'Automation disabled');
    } catch (err) {
      toast.error('Failed to toggle automation');
    }
  };

  if (loading)
    return (
      <div className="p-8 text-center text-[var(--admin-text-secondary)]">
        Loading automations...
      </div>
    );

  const categories = [...new Set(automations.map((a) => a.category))];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-[18px] font-semibold text-[var(--admin-text-primary)]">
          Automation Triggers
        </h2>
        <button className="admin-btn-secondary" onClick={() => toast.error('Config drawer stub')}>
          <span className="material-symbols-outlined text-[18px]">settings</span> Global Settings
        </button>
      </div>

      {categories.map((category) => (
        <AutomationCategoryGroup
          key={category}
          category={category}
          count={automations.filter((a) => a.category === category).length}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-[var(--admin-bg-subtle)] rounded-b-xl border border-t-0 border-[var(--admin-border-subtle)]">
            {automations
              .filter((a) => a.category === category)
              .map((auto) => (
                <div
                  key={auto.automationKey}
                  className="admin-card p-4 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <h3
                        className="font-semibold text-[15px] text-[var(--admin-text-primary)] truncate"
                        title={auto.displayName}
                      >
                        {auto.displayName}
                      </h3>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={auto.enabled}
                          onChange={(e) => handleToggle(auto.automationKey, e.target.checked)}
                        />
                        <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--admin-accent)]"></div>
                      </label>
                    </div>
                    <p className="text-[12px] text-[var(--admin-text-secondary)] mb-4 line-clamp-2 min-h-[36px]">
                      {auto.description}
                    </p>
                  </div>

                  <div className="flex justify-between items-center pt-3 border-t border-[var(--admin-border-subtle)]">
                    <div className="flex -space-x-2">
                      {/* Mock avatars for recipients */}
                      <div
                        className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-[10px] text-blue-600 border border-white z-10"
                        title="Owner"
                      >
                        O
                      </div>
                      <div
                        className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-[10px] text-green-600 border border-white z-0"
                        title="Warehouse"
                      >
                        W
                      </div>
                    </div>
                    <button
                      className="text-[var(--admin-accent)] hover:underline text-[12px] font-medium"
                      onClick={() => setSelectedAutomation(auto)}
                    >
                      Configure →
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </AutomationCategoryGroup>
      ))}

      <ConfigDrawer
        isOpen={!!selectedAutomation}
        onClose={() => setSelectedAutomation(null)}
        automation={selectedAutomation}
      />
    </div>
  );
};

export default AutomationToggleCenter;
