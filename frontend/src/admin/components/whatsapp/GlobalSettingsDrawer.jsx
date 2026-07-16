import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import whatsappAutomationService from '../../services/whatsappAutomationService';
import toast from 'react-hot-toast';

const GlobalSettingsDrawer = ({ isOpen, onClose }) => {
  const [providers, setProviders] = useState([]);
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [provRes, ruleRes] = await Promise.all([
        whatsappAutomationService.getProviderConfigs(),
        whatsappAutomationService.getRoutingRules(),
      ]);
      setProviders(provRes.data?.data || []);
      setRules(ruleRes.data?.data || []);
    } catch (err) {
      toast.error('Failed to load global settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) fetchData();
  }, [isOpen]);

  const handleUpdateProvider = async (providerName, updates) => {
    try {
      await whatsappAutomationService.updateProviderConfig(providerName, updates);
      toast.success(`${providerName} config updated`);
      fetchData();
    } catch (err) {
      toast.error('Failed to update provider config');
    }
  };

  const handleUpdateRule = async (category, updates) => {
    try {
      await whatsappAutomationService.updateRoutingRule(category, updates);
      toast.success(`Routing rule for ${category} updated`);
      fetchData();
    } catch (err) {
      toast.error('Failed to update routing rule');
    }
  };

  const handleForceFailover = async (providerName) => {
    try {
      await whatsappAutomationService.forceCircuitOpen(providerName);
      toast.success(`Circuit for ${providerName} forced OPEN. Traffic will failover.`);
    } catch (err) {
      toast.error('Failed to trip circuit breaker');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-[90%] max-w-[800px] bg-[var(--admin-bg)] shadow-2xl z-50 flex flex-col border-l border-[var(--admin-border)] overflow-hidden"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-[var(--admin-border-subtle)] bg-white flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-[20px] font-bold text-[var(--admin-text-primary)]">
                  Global Settings & Smart Routing
                </h2>
                <p className="text-[13px] text-[var(--admin-text-secondary)]">
                  Manage WhatsApp providers, circuit breakers, and traffic failover rules.
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar bg-[var(--admin-bg-subtle)]">
              {loading ? (
                <div className="text-center text-gray-500 mt-10">Loading configurations...</div>
              ) : (
                <>
                  {/* Providers Section */}
                  <div className="bg-white rounded-xl shadow-sm border border-[var(--admin-border-subtle)] overflow-hidden">
                    <div className="bg-gray-50 px-6 py-4 border-b border-[var(--admin-border-subtle)] flex items-center gap-2">
                      <span className="material-symbols-outlined text-purple-600">dns</span>
                      <h3 className="text-[16px] font-bold text-gray-800">Messaging Providers</h3>
                    </div>
                    <div className="p-6 space-y-6">
                      {['meta_cloud', 'twilio', 'gupshup'].map((pName) => {
                        const prov = providers.find((p) => p.providerName === pName) || {
                          providerName: pName,
                          isEnabled: false,
                          priority: 99,
                          circuitBreaker: { failureThreshold: 3, resetTimeoutMs: 60000 },
                        };
                        return (
                          <div
                            key={pName}
                            className="p-4 border border-gray-200 rounded-lg relative"
                          >
                            <div className="flex justify-between items-start mb-4">
                              <div>
                                <h4 className="font-bold text-[15px] uppercase tracking-wider text-gray-800 flex items-center gap-2">
                                  {pName}
                                  {prov.isEnabled ? (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700">
                                      ACTIVE
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-500">
                                      DISABLED
                                    </span>
                                  )}
                                </h4>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleForceFailover(pName)}
                                  className="text-[11px] font-semibold px-2 py-1 bg-red-50 text-red-600 rounded border border-red-200 hover:bg-red-100"
                                >
                                  Trip Circuit Breaker
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">
                                  Status
                                </label>
                                <select
                                  className="admin-input w-full py-1 text-[13px]"
                                  value={prov.isEnabled}
                                  onChange={(e) =>
                                    handleUpdateProvider(pName, {
                                      isEnabled: e.target.value === 'true',
                                    })
                                  }
                                >
                                  <option value="true">Enabled</option>
                                  <option value="false">Disabled</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">
                                  Global Priority
                                </label>
                                <input
                                  type="number"
                                  className="admin-input w-full py-1 text-[13px]"
                                  value={prov.priority}
                                  onChange={(e) =>
                                    handleUpdateProvider(pName, {
                                      priority: parseInt(e.target.value),
                                    })
                                  }
                                />
                                <p className="text-[10px] text-gray-400 mt-1">
                                  Lower number = higher priority
                                </p>
                              </div>
                              <div>
                                <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">
                                  Failures to Trip
                                </label>
                                <input
                                  type="number"
                                  className="admin-input w-full py-1 text-[13px]"
                                  value={prov.circuitBreaker?.failureThreshold || 3}
                                  onChange={(e) =>
                                    handleUpdateProvider(pName, {
                                      circuitBreaker: {
                                        ...prov.circuitBreaker,
                                        failureThreshold: parseInt(e.target.value),
                                      },
                                    })
                                  }
                                />
                                <p className="text-[10px] text-gray-400 mt-1">
                                  Errors before auto-failover
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Routing Rules Section */}
                  <div className="bg-white rounded-xl shadow-sm border border-[var(--admin-border-subtle)] overflow-hidden">
                    <div className="bg-gray-50 px-6 py-4 border-b border-[var(--admin-border-subtle)] flex items-center gap-2">
                      <span className="material-symbols-outlined text-blue-600">route</span>
                      <h3 className="text-[16px] font-bold text-gray-800">
                        Category Routing Rules
                      </h3>
                    </div>
                    <div className="p-6 space-y-6">
                      {['utility', 'marketing', 'authentication'].map((category) => {
                        const rule = rules.find((r) => r.category === category) || {
                          category,
                          enabled: true,
                          preferredProvider: 'meta_cloud',
                          fallbackProviders: ['twilio'],
                        };
                        return (
                          <div key={category} className="p-4 border border-gray-200 rounded-lg">
                            <h4 className="font-bold text-[14px] uppercase tracking-wider text-gray-800 mb-4">
                              {category} Traffic
                            </h4>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">
                                  Preferred Provider
                                </label>
                                <select
                                  className="admin-input w-full py-1 text-[13px]"
                                  value={rule.preferredProvider}
                                  onChange={(e) =>
                                    handleUpdateRule(category, {
                                      preferredProvider: e.target.value,
                                    })
                                  }
                                >
                                  <option value="meta_cloud">Meta Cloud API</option>
                                  <option value="twilio">Twilio</option>
                                  <option value="gupshup">Gupshup</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">
                                  Fallback Provider(s)
                                </label>
                                <input
                                  type="text"
                                  className="admin-input w-full py-1 text-[13px]"
                                  value={rule.fallbackProviders?.join(', ') || ''}
                                  placeholder="e.g. twilio, gupshup"
                                  onChange={(e) =>
                                    handleUpdateRule(category, {
                                      fallbackProviders: e.target.value
                                        .split(',')
                                        .map((s) => s.trim())
                                        .filter(Boolean),
                                    })
                                  }
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default GlobalSettingsDrawer;
